import { ageAtCamp } from "./age";
import { newAccessCode, newId } from "./ids";
import { RAW_BY_KEY } from "./metrics";
import type { Store } from "./store/types";
import type { Camp, Dataset, Gender, Measurement, Player } from "./types";
import { findViolation } from "./validation";

export interface ImportRow {
  name: string;
  gender: Gender | null;
  birthYear: number | null;
  grade: string | null;
  team: string | null;
  values: Record<string, number>;
  /** 표시용 출처 (시트·행) */
  source?: string;
}

export interface Candidate {
  playerId: string;
  name: string;
  gender: Gender;
  birthYear: number | null;
  team: string | null;
  campNames: string[];
  /** 이 선수가 이미 대상 캠프에 기록이 있는지 (연결하면 덮어씀) */
  hasTargetCamp: boolean;
}

export interface RowPlan {
  index: number;
  candidates: Candidate[];
  flags: { key: string; label: string; value: number; rule: string }[];
  errors: string[];
  warnings: string[];
}

export type Decision = { action: "new" } | { action: "link"; playerId: string } | { action: "skip" };

/** 이름·성별이 같고 생년이 같거나(한쪽이라도 미입력이면) 동일인 후보로 본다 */
export function isIdentityCandidate(p: Player, row: Pick<ImportRow, "name" | "gender" | "birthYear">): boolean {
  return (
    p.name.trim() === row.name.trim() &&
    p.gender === row.gender &&
    (p.birthYear === null || row.birthYear === null || p.birthYear === row.birthYear)
  );
}

export function planImport(ds: Dataset, rows: ImportRow[], targetCampId: string | null): RowPlan[] {
  const campName = new Map(ds.camps.map((c) => [c.id, c.name]));
  const campsByPlayer = new Map<string, Set<string>>();
  for (const m of ds.measurements) {
    if (!campsByPlayer.has(m.playerId)) campsByPlayer.set(m.playerId, new Set());
    campsByPlayer.get(m.playerId)!.add(m.campId);
  }
  const seen = new Map<string, number>();
  return rows.map((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!row.name.trim()) errors.push("이름 없음");
    if (!row.gender) errors.push("성별을 알 수 없음 (시트 이름에 남/여를 넣거나 '성별' 열 추가)");
    const idKey = `${row.name.trim()}|${row.gender}|${row.birthYear ?? ""}`;
    if (seen.has(idKey)) errors.push(`파일 안에서 중복 (${seen.get(idKey)! + 1}번째 행과 같은 선수)`);
    else seen.set(idKey, index);
    const missing = 26 - Object.keys(row.values).length;
    if (missing > 0) warnings.push(`빈 지표 ${missing}개`);
    if (row.birthYear === null && !row.grade) warnings.push("나이 미입력");

    const candidates: Candidate[] = row.gender
      ? ds.players
          .filter((p) => isIdentityCandidate(p, row))
          .map((p) => {
            const camps = campsByPlayer.get(p.id) ?? new Set<string>();
            return {
              playerId: p.id,
              name: p.name,
              gender: p.gender,
              birthYear: p.birthYear,
              team: p.team,
              campNames: [...camps].map((id) => campName.get(id) ?? id),
              hasTargetCamp: targetCampId !== null && camps.has(targetCampId),
            };
          })
      : [];

    const flags = Object.entries(row.values).flatMap(([key, value]) => {
      const rule = findViolation(ds.rules, key, value);
      return rule ? [{ key, label: RAW_BY_KEY.get(key)?.label ?? key, value, rule: rule.label }] : [];
    });
    return { index, candidates, flags, errors, warnings };
  });
}

export interface ImportResult {
  created: number;
  linked: number;
  skipped: number;
  measurements: number;
}

/** 확인된 결정대로 저장. rows와 decisions는 같은 순서. */
export async function applyImport(
  store: Store,
  ds: Dataset,
  camp: Camp,
  rows: ImportRow[],
  decisions: Decision[],
): Promise<ImportResult> {
  const players = new Map(ds.players.map((p) => [p.id, p]));
  const codes = new Set(ds.players.map((p) => p.accessCode));
  const touched: Player[] = [];
  const writes: { playerId: string; campId: string; measurements: Measurement[] }[] = [];
  const result: ImportResult = { created: 0, linked: 0, skipped: 0, measurements: 0 };

  rows.forEach((row, i) => {
    const d = decisions[i];
    if (!d || d.action === "skip" || !row.gender) {
      result.skipped++;
      return;
    }
    let player: Player;
    if (d.action === "link") {
      const existing = players.get(d.playerId);
      if (!existing) throw new Error(`연결할 선수를 찾을 수 없음: ${row.name}`);
      player = {
        ...existing,
        birthYear: existing.birthYear ?? row.birthYear,
        grade: row.grade ?? existing.grade,
        team: row.team ?? existing.team,
      };
      result.linked++;
    } else {
      let code = newAccessCode();
      while (codes.has(code)) code = newAccessCode();
      codes.add(code);
      player = {
        id: newId(),
        name: row.name.trim(),
        gender: row.gender,
        birthYear: row.birthYear,
        grade: row.grade,
        team: row.team,
        accessCode: code,
        createdAt: new Date().toISOString(),
      };
      result.created++;
    }
    touched.push(player);
    const age = ageAtCamp(camp.date, player.birthYear, row.grade ?? player.grade);
    const measurements = Object.entries(row.values).map(([metricKey, value]) => ({
      playerId: player.id,
      campId: camp.id,
      metricKey,
      value,
      ageAtMeasurement: age,
    }));
    result.measurements += measurements.length;
    writes.push({ playerId: player.id, campId: camp.id, measurements });
  });

  await store.upsertCamp(camp);
  await store.upsertPlayers(touched);
  await store.replaceSessions(writes);
  return result;
}

/** 후보가 없으면 신규, 있으면 결정 필요(null) */
export function defaultDecisions(plans: RowPlan[]): (Decision | null)[] {
  return plans.map((p) => (p.errors.length ? { action: "skip" } : p.candidates.length ? null : { action: "new" }));
}
