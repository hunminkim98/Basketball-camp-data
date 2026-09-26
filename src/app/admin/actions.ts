"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ageAtCamp } from "@/lib/age";
import { newAccessCode, newId } from "@/lib/ids";
import { applyImport, planImport, type Decision, type ImportResult, type ImportRow, type RowPlan } from "@/lib/importer";
import { RAW_BY_KEY } from "@/lib/metrics";
import { requireAdmin } from "@/lib/session";
import { getStore } from "@/lib/store";
import type { Camp, Dataset, Gender, Player, ValidationRule } from "@/lib/types";

// ───────────── 입력 정리 (클라이언트에서 온 값은 믿지 않는다) ─────────────

function str(v: unknown, max = 100): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, max);
  return s || null;
}

function intOrNull(v: unknown, min: number, max: number): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

function isDate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

function cleanRows(input: unknown): ImportRow[] {
  if (!Array.isArray(input) || input.length > 3000) throw new Error("잘못된 업로드 데이터");
  return input.map((r) => {
    const o = (r ?? {}) as Record<string, unknown>;
    const values: Record<string, number> = {};
    for (const [k, v] of Object.entries((o.values ?? {}) as Record<string, unknown>)) {
      if (RAW_BY_KEY.has(k) && typeof v === "number" && Number.isFinite(v)) values[k] = v;
    }
    return {
      name: str(o.name, 50) ?? "",
      gender: o.gender === "M" || o.gender === "F" ? (o.gender as Gender) : null,
      birthYear: intOrNull(o.birthYear, 1990, 2030),
      grade: str(o.grade, 20),
      team: str(o.team, 60),
      values,
      source: str(o.source, 80) ?? undefined,
    };
  });
}

function cleanCamp(input: unknown, ds: Dataset): Camp {
  const o = (input ?? {}) as Record<string, unknown>;
  if (typeof o.id === "string" && ds.camps.some((c) => c.id === o.id)) return ds.camps.find((c) => c.id === o.id)!;
  const name = str(o.name, 80);
  if (!name) throw new Error("캠프 이름을 입력하세요.");
  if (!isDate(o.date)) throw new Error("캠프 날짜를 입력하세요.");
  return { id: newId(), name, date: o.date, location: str(o.location, 80) };
}

function refresh() {
  revalidatePath("/", "layout");
}

async function recomputeAges(player: Player, ds: Dataset) {
  const campIds = new Set(ds.measurements.filter((m) => m.playerId === player.id).map((m) => m.campId));
  const ages = ds.camps
    .filter((c) => campIds.has(c.id))
    .map((c) => ({ campId: c.id, age: ageAtCamp(c.date, player.birthYear, player.grade) }));
  if (ages.length) await getStore().setAges(player.id, ages);
}

// ───────────── 엑셀 업로드 ─────────────

export async function previewImport(rowsInput: unknown, campId: string | null): Promise<RowPlan[]> {
  await requireAdmin();
  const ds = await getStore().load();
  return planImport(ds, cleanRows(rowsInput), campId);
}

export async function commitImport(input: {
  camp: unknown;
  rows: unknown;
  decisions: unknown;
}): Promise<{ ok: true; result: ImportResult; campId: string } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    const store = getStore();
    const ds = await store.load();
    const rows = cleanRows(input.rows);
    const camp = cleanCamp(input.camp, ds);
    const decisions = Array.isArray(input.decisions) ? (input.decisions as Decision[]) : [];
    if (decisions.length !== rows.length) throw new Error("모든 행의 처리 방법을 정하세요.");
    const plans = planImport(ds, rows, camp.id);
    decisions.forEach((d, i) => {
      if (d?.action === "link") {
        if (!plans[i].candidates.some((c) => c.playerId === d.playerId)) throw new Error(`${rows[i].name}: 잘못된 연결 대상`);
      } else if (d?.action !== "new" && d?.action !== "skip") {
        throw new Error(`${rows[i].name}: 동일인 여부를 확인하세요.`);
      }
      if (plans[i].errors.length && d.action !== "skip") throw new Error(`${rows[i].name}: ${plans[i].errors.join(", ")}`);
    });
    const result = await applyImport(store, ds, camp, rows, decisions);
    refresh();
    return { ok: true, result, campId: camp.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ───────────── 선수 ─────────────

export async function updatePlayer(formData: FormData): Promise<void> {
  await requireAdmin();
  const store = getStore();
  const ds = await store.load();
  const id = String(formData.get("id"));
  const p = ds.players.find((x) => x.id === id);
  if (!p) throw new Error("선수를 찾을 수 없습니다.");
  const gender = formData.get("gender");
  const updated: Player = {
    ...p,
    name: str(formData.get("name"), 50) ?? p.name,
    gender: gender === "M" || gender === "F" ? gender : p.gender,
    birthYear: intOrNull(formData.get("birthYear"), 1990, 2030),
    grade: str(formData.get("grade"), 20),
    team: str(formData.get("team"), 60),
  };
  await store.upsertPlayers([updated]);
  await recomputeAges(updated, ds);
  refresh();
  redirect(`/admin/players/${id}?saved=1`);
}

export async function regenerateCode(formData: FormData): Promise<void> {
  await requireAdmin();
  const store = getStore();
  const ds = await store.load();
  const p = ds.players.find((x) => x.id === formData.get("id"));
  if (!p) throw new Error("선수를 찾을 수 없습니다.");
  const codes = new Set(ds.players.map((x) => x.accessCode));
  let code = newAccessCode();
  while (codes.has(code)) code = newAccessCode();
  await store.upsertPlayers([{ ...p, accessCode: code }]);
  refresh();
  redirect(`/admin/players/${p.id}?code=1`);
}

/** remove 선수를 keep 선수로 합친다. 같은 캠프 기록이 겹치면 keep 쪽을 남긴다. */
export async function mergePlayers(formData: FormData): Promise<void> {
  await requireAdmin();
  const store = getStore();
  const ds = await store.load();
  const keep = ds.players.find((x) => x.id === formData.get("keepId"));
  const remove = ds.players.find((x) => x.id === formData.get("removeId"));
  if (!keep || !remove || keep.id === remove.id) throw new Error("병합할 두 선수를 선택하세요.");
  const merged: Player = {
    ...keep,
    birthYear: keep.birthYear ?? remove.birthYear,
    grade: keep.grade ?? remove.grade,
    team: keep.team ?? remove.team,
  };
  await store.reassignMeasurements(remove.id, keep.id);
  await store.deletePlayer(remove.id);
  await store.upsertPlayers([merged]);
  await recomputeAges(merged, await store.load());
  refresh();
  redirect(`/admin/players/${keep.id}?merged=1`);
}

export async function deletePlayer(formData: FormData): Promise<void> {
  await requireAdmin();
  await getStore().deletePlayer(String(formData.get("id")));
  refresh();
  redirect("/admin/players");
}

// ───────────── 캠프 ─────────────

export async function saveCamp(formData: FormData): Promise<void> {
  await requireAdmin();
  const store = getStore();
  const ds = await store.load();
  const id = str(formData.get("id"));
  const name = str(formData.get("name"), 80);
  const date = formData.get("date");
  if (!name || !isDate(date)) throw new Error("캠프 이름과 날짜를 입력하세요.");
  const camp: Camp = { id: id ?? newId(), name, date, location: str(formData.get("location"), 80) };
  const before = ds.camps.find((c) => c.id === camp.id);
  await store.upsertCamp(camp);
  if (before && before.date !== camp.date) {
    // 날짜가 바뀌면 그 캠프 참가자의 측정 당시 나이를 다시 계산
    const playerIds = new Set(ds.measurements.filter((m) => m.campId === camp.id).map((m) => m.playerId));
    for (const p of ds.players.filter((x) => playerIds.has(x.id))) {
      await store.setAges(p.id, [{ campId: camp.id, age: ageAtCamp(camp.date, p.birthYear, p.grade) }]);
    }
  }
  refresh();
  redirect("/admin/camps");
}

export async function deleteCamp(formData: FormData): Promise<void> {
  await requireAdmin();
  if (formData.get("confirm") !== "삭제") redirect("/admin/camps?error=confirm");
  await getStore().deleteCamp(String(formData.get("id")));
  refresh();
  redirect("/admin/camps");
}

// ───────────── 측정오류 기준표 ─────────────

export async function saveRules(formData: FormData): Promise<void> {
  await requireAdmin();
  const store = getStore();
  const ds = await store.load();
  const rules: ValidationRule[] = [];
  for (const r of ds.rules) {
    if (formData.get(`delete:${r.id}`)) continue;
    const threshold = Number(formData.get(`threshold:${r.id}`));
    const op = formData.get(`op:${r.id}`);
    rules.push({
      ...r,
      label: str(formData.get(`label:${r.id}`), 60) ?? r.label,
      op: op === "lt" || op === "gt" ? op : r.op,
      threshold: Number.isFinite(threshold) ? threshold : r.threshold,
      note: str(formData.get(`note:${r.id}`), 120),
      enabled: formData.get(`enabled:${r.id}`) === "on",
    });
  }
  const newMetric = str(formData.get("new:metric"));
  const newThreshold = Number(formData.get("new:threshold"));
  if (newMetric && Number.isFinite(newThreshold) && formData.get("new:threshold") !== "") {
    const keys = newMetric.split(",").filter((k) => RAW_BY_KEY.has(k));
    const op = formData.get("new:op") === "lt" ? "lt" : "gt";
    if (keys.length) {
      rules.push({
        id: `rule-${newId().slice(0, 8)}`,
        metricKeys: keys,
        label: str(formData.get("new:label"), 60) ?? `${RAW_BY_KEY.get(keys[0])!.label} ${op === "lt" ? "하한" : "상한"}`,
        op,
        threshold: newThreshold,
        note: null,
        enabled: true,
      });
    }
  }
  await store.saveRules(rules);
  refresh();
  redirect("/admin/rules?saved=1");
}
