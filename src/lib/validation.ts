import type { ValidationRule } from "./types";

/** 기본 측정오류 기준표 (관리자 화면에서 수정 가능) */
export const DEFAULT_RULES: ValidationRule[] = [
  {
    id: "grf-min",
    metricKeys: ["peak_grf"],
    label: "최대 지면반력 하한",
    op: "lt",
    threshold: 300,
    note: "체중 대비 불가능한 값 (정상 700~1700N)",
    enabled: true,
  },
  {
    id: "prep-step-max",
    metricKeys: ["prep_time_l", "prep_time_r"],
    label: "예비스텝 시간 상한",
    op: "gt",
    threshold: 0.5,
    note: "스텝 검출 실패 (정상 범위 0.06~0.33s)",
    enabled: true,
  },
  {
    id: "last-step-max",
    metricKeys: ["last_time_l", "last_time_r"],
    label: "마지막스텝 시간 상한",
    op: "gt",
    threshold: 0.8,
    note: "스텝 검출 실패 (정상 범위 0.25~0.55s)",
    enabled: true,
  },
];

/** 값이 측정오류 기준에 걸리면 해당 규칙을 반환 */
export function findViolation(rules: ValidationRule[], metricKey: string, value: number): ValidationRule | null {
  for (const r of rules) {
    if (!r.enabled || !r.metricKeys.includes(metricKey)) continue;
    if (r.op === "lt" ? value < r.threshold : value > r.threshold) return r;
  }
  return null;
}

export function describeRule(r: Pick<ValidationRule, "op" | "threshold">, unit = ""): string {
  return `${r.op === "lt" ? "<" : ">"} ${r.threshold}${unit}`;
}
