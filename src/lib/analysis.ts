import { ageBandKey, ageBandLabel } from "./age";
import { PROFILE_METRICS, RAW_METRICS, type ProfileMetric } from "./metrics";
import { percentRank, summarize, type Summary } from "./stats";
import type { Camp, Dataset, Gender, Player, ValidationRule } from "./types";
import { findViolation } from "./validation";

/** 선수 1명 × 캠프 1회 = 측정 세션 */
export interface Session {
  player: Player;
  camp: Camp;
  age: number | null;
  ageBand: string;
  /** 원자료 값 전부 (측정오류 포함) */
  raw: Record<string, number>;
  /** 측정오류로 판정된 원자료 키 → 걸린 규칙 */
  flags: Record<string, ValidationRule>;
}

export function sortCamps(camps: Camp[]): Camp[] {
  return [...camps].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

export function buildSessions(ds: Dataset): Session[] {
  const players = new Map(ds.players.map((p) => [p.id, p]));
  const camps = new Map(ds.camps.map((c) => [c.id, c]));
  const byKey = new Map<string, Session>();
  for (const m of ds.measurements) {
    const player = players.get(m.playerId);
    const camp = camps.get(m.campId);
    if (!player || !camp) continue;
    const k = `${m.playerId}|${m.campId}`;
    let s = byKey.get(k);
    if (!s) {
      s = { player, camp, age: m.ageAtMeasurement, ageBand: ageBandKey(m.ageAtMeasurement), raw: {}, flags: {} };
      byKey.set(k, s);
    }
    s.raw[m.metricKey] = m.value;
    const rule = findViolation(ds.rules, m.metricKey, m.value);
    if (rule) s.flags[m.metricKey] = rule;
  }
  return [...byKey.values()];
}

/** 통계에 쓸 수 있는 원자료 값 (없거나 측정오류면 null) */
export function validRaw(s: Session, key: string): number | null {
  if (s.flags[key]) return null;
  const v = s.raw[key];
  return v === undefined ? null : v;
}

export interface ProfileValue {
  value: number | null;
  left: number | null;
  right: number | null;
  /** 좌 − 우 (양쪽 모두 유효할 때만) */
  diff: number | null;
}

/** 분석 지표 값. 좌우 지표는 양측 평균, 한쪽이 측정오류·결측이면 남은 쪽 값을 쓴다. */
export function profileValue(s: Session, m: ProfileMetric): ProfileValue {
  if (m.sources.length === 1) {
    return { value: validRaw(s, m.sources[0]), left: null, right: null, diff: null };
  }
  const left = validRaw(s, m.sources[0]);
  const right = validRaw(s, m.sources[1]);
  if (left !== null && right !== null) {
    return { value: (left + right) / 2, left, right, diff: left - right };
  }
  return { value: left ?? right, left, right, diff: null };
}

export interface SessionFilter {
  campId?: string; // "all" | camp id
  gender?: string; // "all" | "M" | "F"
  ageBand?: string; // "all" | band key
}

export function filterSessions(sessions: Session[], f: SessionFilter): Session[] {
  return sessions.filter(
    (s) =>
      (!f.campId || f.campId === "all" || s.camp.id === f.campId) &&
      (!f.gender || f.gender === "all" || s.player.gender === f.gender) &&
      (!f.ageBand || f.ageBand === "all" || s.ageBand === f.ageBand),
  );
}

export function profileValues(sessions: Session[], m: ProfileMetric): number[] {
  const out: number[] = [];
  for (const s of sessions) {
    const v = profileValue(s, m).value;
    if (v !== null) out.push(v);
  }
  return out;
}

export function rawValues(sessions: Session[], key: string): number[] {
  const out: number[] = [];
  for (const s of sessions) {
    const v = validRaw(s, key);
    if (v !== null) out.push(v);
  }
  return out;
}

/** 이 값 미만이면 "표본 부족" */
export const MIN_SAMPLE = 10;

// ───────────────────────── 기준 데이터 대시보드 ─────────────────────────

export interface MetricSummaryRow {
  key: string;
  label: string;
  unit: ProfileMetric["unit"];
  category?: string;
  summary: Summary;
  values: number[];
}

export function summarizeProfile(sessions: Session[]): MetricSummaryRow[] {
  return PROFILE_METRICS.map((m) => {
    const values = profileValues(sessions, m);
    return { key: m.key, label: m.label, unit: m.unit, category: m.category, summary: summarize(values), values };
  });
}

export function summarizeRaw(sessions: Session[]): MetricSummaryRow[] {
  return RAW_METRICS.map((m) => {
    const values = rawValues(sessions, m.key);
    return { key: m.key, label: m.label, unit: m.unit, summary: summarize(values), values };
  });
}

export interface CampParticipation {
  camp: Camp;
  participants: number;
  newPlayers: number;
  cumulativePlayers: number;
}

export function participationByCamp(camps: Camp[], sessions: Session[]): CampParticipation[] {
  const seen = new Set<string>();
  return sortCamps(camps).map((camp) => {
    const inCamp = sessions.filter((s) => s.camp.id === camp.id);
    let newPlayers = 0;
    for (const s of inCamp) {
      if (!seen.has(s.player.id)) {
        seen.add(s.player.id);
        newPlayers++;
      }
    }
    return { camp, participants: inCamp.length, newPlayers, cumulativePlayers: seen.size };
  });
}

// ───────────────────────── 개인 리포트 ─────────────────────────

export type RefMode = "auto" | "gender";

export interface ReferenceGroup {
  gender: Gender;
  ageBand: string | null;
  label: string;
  sessions: Session[];
  /** 나이대 기준을 쓰지 못한 이유 (있으면 성별 전체 기준으로 대체) */
  note: string | null;
}

export function genderLabel(g: Gender): string {
  return g === "M" ? "남자부" : "여자부";
}

export function referenceGroup(all: Session[], current: Session, mode: RefMode): ReferenceGroup {
  const gender = current.player.gender;
  const sameGender = all.filter((s) => s.player.gender === gender);
  const genderOnly = (note: string | null): ReferenceGroup => ({
    gender,
    ageBand: null,
    label: `${genderLabel(gender)} 전체`,
    sessions: sameGender,
    note,
  });
  if (mode === "gender") return genderOnly(null);
  if (current.age === null) return genderOnly("나이 미입력 — 같은 성별 전체를 기준으로 비교했습니다.");
  const band = sameGender.filter((s) => s.ageBand === current.ageBand);
  if (band.length < MIN_SAMPLE) {
    return genderOnly(
      `${ageBandLabel(current.ageBand)} ${genderLabel(gender)} 표본이 ${band.length}명으로 부족해 같은 성별 전체를 기준으로 비교했습니다.`,
    );
  }
  return {
    gender,
    ageBand: current.ageBand,
    label: `${genderLabel(gender)} ${ageBandLabel(current.ageBand)}`,
    sessions: band,
    note: null,
  };
}

export type Position = "매우 낮음" | "낮은 편" | "평균 수준" | "높은 편" | "매우 높음";

export function positionLabel(z: number): Position {
  if (z <= -1.5) return "매우 낮음";
  if (z <= -0.5) return "낮은 편";
  if (z < 0.5) return "평균 수준";
  if (z < 1.5) return "높은 편";
  return "매우 높음";
}

export interface ReportMetric {
  metric: ProfileMetric;
  value: ProfileValue;
  /** 원자료 중 측정오류로 제외된 키 (관리자 화면에서만 표시) */
  flaggedKeys: string[];
  ref: Summary;
  /** 0–100 정수 (방향성 지표만) */
  percentile: number | null;
  /** 정렬·판정용 소수 백분위 */
  percentileExact: number | null;
  /** 방향성 없는 지표: 기준 평균 대비 표준점수 */
  z: number | null;
  position: Position | null;
  tag: "강점" | "약점" | null;
}

export interface TrendPoint {
  campId: string;
  campName: string;
  date: string;
  value: number | null;
}

export interface MetricTrend {
  metric: ProfileMetric;
  points: TrendPoint[];
  /** 첫 측정 → 최근 측정 */
  deltaTotal: number | null;
  /** 직전 측정 → 최근 측정 */
  deltaLast: number | null;
  /** 좋아진 방향인지 (방향성 없는 지표는 null) */
  improved: boolean | null;
}

export interface PlayerReport {
  player: Player;
  sessions: Session[];
  current: Session;
  reference: ReferenceGroup;
  metrics: ReportMetric[];
  trends: MetricTrend[];
}

export function buildReport(
  ds: Dataset,
  playerId: string,
  opts: { campId?: string; refMode?: RefMode } = {},
): PlayerReport | null {
  const all = buildSessions(ds);
  const mine = all
    .filter((s) => s.player.id === playerId)
    .sort((a, b) => a.camp.date.localeCompare(b.camp.date));
  if (mine.length === 0) return null;
  const current = mine.find((s) => s.camp.id === opts.campId) ?? mine[mine.length - 1];
  const reference = referenceGroup(all, current, opts.refMode ?? "auto");

  const metrics: ReportMetric[] = PROFILE_METRICS.map((m) => {
    const value = profileValue(current, m);
    const refValues = profileValues(reference.sessions, m);
    const ref = summarize(refValues);
    let percentileExact: number | null = null;
    let z: number | null = null;
    if (value.value !== null) {
      if (m.direction !== "neutral") percentileExact = percentRank(refValues, value.value, m.direction);
      else if (ref.mean !== null && ref.sd) z = (value.value - ref.mean) / ref.sd;
    }
    return {
      metric: m,
      value,
      flaggedKeys: m.sources.filter((k) => current.flags[k]),
      ref,
      percentileExact,
      percentile: percentileExact === null ? null : Math.round(percentileExact),
      z,
      position: z === null ? null : positionLabel(z),
      tag: null,
    };
  });

  // 강점·약점: 핵심 방향성 지표 중 백분위 최고/최저 (동점이면 지표 목록 순서상 앞의 것)
  const candidates = metrics.filter((r) => r.metric.core && r.percentileExact !== null);
  if (candidates.length >= 2) {
    const best = candidates.reduce((a, b) => (b.percentileExact! > a.percentileExact! ? b : a));
    const worst = candidates.reduce((a, b) => (b.percentileExact! < a.percentileExact! ? b : a));
    if (best !== worst) {
      best.tag = "강점";
      worst.tag = "약점";
    }
  }

  const trends: MetricTrend[] = PROFILE_METRICS.map((m) => {
    const points = mine.map((s) => ({
      campId: s.camp.id,
      campName: s.camp.name,
      date: s.camp.date,
      value: profileValue(s, m).value,
    }));
    const valid = points.filter((p) => p.value !== null);
    const first = valid[0]?.value ?? null;
    const last = valid[valid.length - 1]?.value ?? null;
    const prev = valid[valid.length - 2]?.value ?? null;
    const deltaTotal = valid.length >= 2 ? last! - first! : null;
    const deltaLast = valid.length >= 2 ? last! - prev! : null;
    const improved =
      deltaTotal === null || m.direction === "neutral" || Math.abs(deltaTotal) < 1e-9
        ? null
        : m.direction === "higher"
          ? deltaTotal > 0
          : deltaTotal < 0;
    return { metric: m, points, deltaTotal, deltaLast, improved };
  });

  return { player: mine[0].player, sessions: mine, current, reference, metrics, trends };
}
