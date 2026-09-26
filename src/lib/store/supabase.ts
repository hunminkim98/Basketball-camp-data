import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Camp, Dataset, Gender, Measurement, Player, RuleOp, ValidationRule } from "../types";
import { DEFAULT_RULES } from "../validation";
import type { SessionWrite, Store } from "./types";

/**
 * Supabase(Postgres) 저장소. 스키마는 supabase/schema.sql.
 * 서비스 롤 키로 서버에서만 접근한다 (RLS 켜고 공개 정책 없음 → 브라우저에서 직접 읽기 불가).
 */

interface PlayerRow {
  id: string;
  name: string;
  gender: Gender;
  birth_year: number | null;
  grade: string | null;
  team: string | null;
  access_code: string;
  created_at: string;
}
interface CampRow {
  id: string;
  name: string;
  date: string;
  location: string | null;
}
interface MeasurementRow {
  player_id: string;
  camp_id: string;
  metric_key: string;
  value: number;
  age_at_measurement: number | null;
}
interface RuleRow {
  id: string;
  metric_keys: string[];
  label: string;
  op: RuleOp;
  threshold: number;
  note: string | null;
  enabled: boolean;
  sort_order: number;
}

const PAGE = 1000;
const CHUNK = 500;

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase 오류: ${res.error.message}`);
  return res.data;
}

function chunks<T>(arr: T[], size = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const toPlayerRow = (p: Player): PlayerRow => ({
  id: p.id,
  name: p.name,
  gender: p.gender,
  birth_year: p.birthYear,
  grade: p.grade,
  team: p.team,
  access_code: p.accessCode,
  created_at: p.createdAt,
});

const toMeasurementRow = (m: Measurement): MeasurementRow => ({
  player_id: m.playerId,
  camp_id: m.campId,
  metric_key: m.metricKey,
  value: m.value,
  age_at_measurement: m.ageAtMeasurement,
});

export class SupabaseStore implements Store {
  readonly kind = "supabase" as const;
  private readonly db: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.db = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  }

  /**
   * 1,000행씩 나눠 읽는다. 정렬 열은 반드시 행을 고유하게 정해야 한다(기본키 전체).
   * 동점이 있으면 페이지마다 순서가 달라져 경계에서 행이 중복되거나 빠질 수 있다.
   */
  private async fetchAll<T>(table: string, order: string[]): Promise<T[]> {
    const out: T[] = [];
    for (let from = 0; ; from += PAGE) {
      let query = this.db.from(table).select("*");
      for (const col of order) query = query.order(col);
      const rows = check(await query.range(from, from + PAGE - 1)) as T[];
      out.push(...rows);
      if (rows.length < PAGE) return out;
    }
  }

  async load(): Promise<Dataset> {
    const [players, camps, measurements, rules] = await Promise.all([
      this.fetchAll<PlayerRow>("players", ["id"]),
      this.fetchAll<CampRow>("camps", ["date", "id"]),
      this.fetchAll<MeasurementRow>("measurements", ["player_id", "camp_id", "metric_key"]),
      this.fetchAll<RuleRow>("validation_rules", ["sort_order", "id"]),
    ]);
    return {
      players: players.map((r) => ({
        id: r.id,
        name: r.name,
        gender: r.gender,
        birthYear: r.birth_year,
        grade: r.grade,
        team: r.team,
        accessCode: r.access_code,
        createdAt: r.created_at,
      })),
      camps: camps.map((r) => ({ id: r.id, name: r.name, date: r.date, location: r.location })),
      measurements: measurements.map((r) => ({
        playerId: r.player_id,
        campId: r.camp_id,
        metricKey: r.metric_key,
        value: Number(r.value),
        ageAtMeasurement: r.age_at_measurement,
      })),
      rules: rules.length
        ? rules.map((r) => ({
            id: r.id,
            metricKeys: r.metric_keys,
            label: r.label,
            op: r.op,
            threshold: Number(r.threshold),
            note: r.note,
            enabled: r.enabled,
          }))
        : structuredClone(DEFAULT_RULES),
    };
  }

  async upsertCamp(camp: Camp): Promise<void> {
    check(await this.db.from("camps").upsert({ id: camp.id, name: camp.name, date: camp.date, location: camp.location }));
  }

  async deleteCamp(id: string): Promise<void> {
    // measurements는 FK on delete cascade
    check(await this.db.from("camps").delete().eq("id", id));
  }

  async upsertPlayers(players: Player[]): Promise<void> {
    for (const part of chunks(players.map(toPlayerRow))) {
      check(await this.db.from("players").upsert(part));
    }
  }

  async deletePlayer(id: string): Promise<void> {
    check(await this.db.from("players").delete().eq("id", id));
  }

  async replaceSessions(writes: SessionWrite[]): Promise<void> {
    const byCamp = new Map<string, string[]>();
    for (const w of writes) byCamp.set(w.campId, [...(byCamp.get(w.campId) ?? []), w.playerId]);
    for (const [campId, playerIds] of byCamp) {
      for (const ids of chunks(playerIds, 200)) {
        check(await this.db.from("measurements").delete().eq("camp_id", campId).in("player_id", ids));
      }
    }
    const rows = writes.flatMap((w) => w.measurements.map(toMeasurementRow));
    for (const part of chunks(rows)) check(await this.db.from("measurements").insert(part));
  }

  async reassignMeasurements(fromPlayerId: string, toPlayerId: string): Promise<void> {
    const target = check(
      await this.db.from("measurements").select("camp_id").eq("player_id", toPlayerId),
    ) as { camp_id: string }[];
    const conflictCamps = [...new Set(target.map((r) => r.camp_id))];
    if (conflictCamps.length) {
      check(await this.db.from("measurements").delete().eq("player_id", fromPlayerId).in("camp_id", conflictCamps));
    }
    check(await this.db.from("measurements").update({ player_id: toPlayerId }).eq("player_id", fromPlayerId));
  }

  async setAges(playerId: string, ages: { campId: string; age: number | null }[]): Promise<void> {
    for (const a of ages) {
      check(
        await this.db
          .from("measurements")
          .update({ age_at_measurement: a.age })
          .eq("player_id", playerId)
          .eq("camp_id", a.campId),
      );
    }
  }

  async saveRules(rules: ValidationRule[]): Promise<void> {
    const rows: RuleRow[] = rules.map((r, i) => ({
      id: r.id,
      metric_keys: r.metricKeys,
      label: r.label,
      op: r.op,
      threshold: r.threshold,
      note: r.note,
      enabled: r.enabled,
      sort_order: i,
    }));
    const existing = check(await this.db.from("validation_rules").select("id")) as { id: string }[];
    const keep = new Set(rows.map((r) => r.id));
    const remove = existing.map((r) => r.id).filter((id) => !keep.has(id));
    if (remove.length) check(await this.db.from("validation_rules").delete().in("id", remove));
    if (rows.length) check(await this.db.from("validation_rules").upsert(rows));
  }
}
