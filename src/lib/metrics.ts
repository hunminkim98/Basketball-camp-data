/**
 * 지표 정의.
 *
 * - RAW_METRICS: 엑셀 원자료의 26개 열 그대로 (좌·우 따로). DB `measurements.metric_key`에 저장되는 키.
 * - PROFILE_METRICS: 리포트·대시보드에서 쓰는 분석 지표. 좌우를 따로 잰 지표는 양측 평균으로 합친다.
 */

export type Unit = "cm" | "kg" | "%" | "°" | "N" | "N·s" | "N/s" | "s";

export interface RawMetric {
  key: string;
  label: string;
  unit: Unit;
  /** 엑셀 헤더 (공백 제거 후 비교) */
  header: string;
}

export const RAW_METRICS: RawMetric[] = [
  { key: "height", label: "신장", unit: "cm", header: "신장 (cm)" },
  { key: "weight", label: "체중", unit: "kg", header: "체중 (kg)" },
  { key: "hip_contrib", label: "엉덩이 기여도", unit: "%", header: "엉덩이 기여도 (%)" },
  { key: "knee_contrib", label: "무릎 기여도", unit: "%", header: "무릎 기여도 (%)" },
  { key: "valgus_l", label: "외반슬/내반슬 좌", unit: "°", header: "외반슬/내반슬 좌 (°)" },
  { key: "valgus_r", label: "외반슬/내반슬 우", unit: "°", header: "외반슬/내반슬 우 (°)" },
  { key: "jump_height", label: "점프 높이", unit: "cm", header: "점프 높이 (cm)" },
  { key: "peak_grf", label: "최대 지면반력", unit: "N", header: "최대 지면반력 (N)" },
  { key: "impulse", label: "충격량", unit: "N·s", header: "충격량 (N·s)" },
  { key: "rfd", label: "힘생성비율", unit: "N/s", header: "힘생성비율 (N/s)" },
  { key: "prep_decel_l", label: "좌 예비스텝 감속기여", unit: "%", header: "좌 예비스텝 감속기여 (%)" },
  { key: "last_decel_l", label: "좌 마지막스텝 감속기여", unit: "%", header: "좌 마지막스텝 감속기여 (%)" },
  { key: "prep_time_l", label: "좌 예비스텝 시간", unit: "s", header: "좌 예비스텝 시간 (s)" },
  { key: "last_time_l", label: "좌 마지막스텝 시간", unit: "s", header: "좌 마지막스텝 시간 (s)" },
  { key: "prep_decel_r", label: "우 예비스텝 감속기여", unit: "%", header: "우 예비스텝 감속기여 (%)" },
  { key: "last_decel_r", label: "우 마지막스텝 감속기여", unit: "%", header: "우 마지막스텝 감속기여 (%)" },
  { key: "prep_time_r", label: "우 예비스텝 시간", unit: "s", header: "우 예비스텝 시간 (s)" },
  { key: "last_time_r", label: "우 마지막스텝 시간", unit: "s", header: "우 마지막스텝 시간 (s)" },
  { key: "sprint10_l", label: "좌 10m 구간", unit: "s", header: "좌 10m 구간 (s)" },
  { key: "total505_l", label: "좌 505 전체 기록", unit: "s", header: "좌 전체 기록 (s)" },
  { key: "cod_l", label: "좌 방향전환 구간", unit: "s", header: "좌 방향전환 구간 (s)" },
  { key: "sprint10_r", label: "우 10m 구간", unit: "s", header: "우 10m 구간 (s)" },
  { key: "total505_r", label: "우 505 전체 기록", unit: "s", header: "우 전체 기록 (s)" },
  { key: "cod_r", label: "우 방향전환 구간", unit: "s", header: "우 방향전환 구간 (s)" },
  { key: "cod_loss_l", label: "방향전환 손실 좌", unit: "%", header: "방향전환 손실 좌 (%)" },
  { key: "cod_loss_r", label: "방향전환 손실 우", unit: "%", header: "방향전환 손실 우 (%)" },
];

export const RAW_BY_KEY = new Map(RAW_METRICS.map((m) => [m.key, m]));

/**
 * higher: 높을수록 좋음 → 백분위 그대로
 * lower: 낮을수록 좋음 → 백분위 반전
 * neutral: 방향성 없음 → 백분위 대신 "기준 대비 위치"
 */
export type Direction = "higher" | "lower" | "neutral";

export type Category = "체격" | "점프" | "착지·정렬" | "감속 스텝" | "505 민첩성";

export interface ProfileMetric {
  key: string;
  label: string;
  unit: Unit;
  direction: Direction;
  category: Category;
  /** 원자료 키. 2개면 [좌, 우] → 양측 평균 */
  sources: [string] | [string, string];
  /** 개인 값 표시 소수 자릿수 */
  decimals: number;
  /**
   * 강·약점 판정 대상인 핵심 지표인지.
   * false인 방향성 지표(방향전환 구간·스텝 시간)는 백분위 막대는 보여주되
   * "세부 지표"로 따로 묶고 강점/약점 라벨 후보에서는 뺀다.
   * (방향전환 구간은 505 기록·방향전환 손실과 겹치는 하위 구간, 스텝 시간은 기술 세부 지표)
   */
  core: boolean;
  description?: string;
}

export const PROFILE_METRICS: ProfileMetric[] = [
  { key: "height", label: "신장", unit: "cm", direction: "neutral", category: "체격", sources: ["height"], decimals: 0, core: false },
  { key: "weight", label: "체중", unit: "kg", direction: "neutral", category: "체격", sources: ["weight"], decimals: 0, core: false },

  { key: "jump_height", label: "점프 높이", unit: "cm", direction: "higher", category: "점프", sources: ["jump_height"], decimals: 0, core: true },
  { key: "peak_grf", label: "최대 지면반력", unit: "N", direction: "higher", category: "점프", sources: ["peak_grf"], decimals: 0, core: true },
  { key: "impulse", label: "충격량", unit: "N·s", direction: "higher", category: "점프", sources: ["impulse"], decimals: 0, core: true },
  { key: "rfd", label: "힘생성비율", unit: "N/s", direction: "higher", category: "점프", sources: ["rfd"], decimals: 0, core: true },
  { key: "hip_contrib", label: "엉덩이 기여도", unit: "%", direction: "higher", category: "점프", sources: ["hip_contrib"], decimals: 0, core: true },
  {
    key: "knee_contrib", label: "무릎 기여도", unit: "%", direction: "neutral", category: "점프", sources: ["knee_contrib"], decimals: 0, core: false,
    description: "엉덩이 기여도와 합이 100%인 보완 지표",
  },

  { key: "valgus", label: "외반슬/내반슬", unit: "°", direction: "neutral", category: "착지·정렬", sources: ["valgus_l", "valgus_r"], decimals: 1, core: false },

  { key: "prep_decel", label: "예비스텝 감속기여", unit: "%", direction: "neutral", category: "감속 스텝", sources: ["prep_decel_l", "prep_decel_r"], decimals: 1, core: false },
  { key: "last_decel", label: "마지막스텝 감속기여", unit: "%", direction: "neutral", category: "감속 스텝", sources: ["last_decel_l", "last_decel_r"], decimals: 1, core: false },
  { key: "prep_time", label: "예비스텝 시간", unit: "s", direction: "lower", category: "감속 스텝", sources: ["prep_time_l", "prep_time_r"], decimals: 2, core: false },
  { key: "last_time", label: "마지막스텝 시간", unit: "s", direction: "lower", category: "감속 스텝", sources: ["last_time_l", "last_time_r"], decimals: 2, core: false },

  { key: "sprint10", label: "10m 구간", unit: "s", direction: "lower", category: "505 민첩성", sources: ["sprint10_l", "sprint10_r"], decimals: 2, core: true },
  { key: "total505", label: "505 전체 기록", unit: "s", direction: "lower", category: "505 민첩성", sources: ["total505_l", "total505_r"], decimals: 2, core: true },
  { key: "cod_time", label: "방향전환 구간", unit: "s", direction: "lower", category: "505 민첩성", sources: ["cod_l", "cod_r"], decimals: 2, core: false },
  { key: "cod_loss", label: "방향전환 손실", unit: "%", direction: "lower", category: "505 민첩성", sources: ["cod_loss_l", "cod_loss_r"], decimals: 1, core: true },
];

export const PROFILE_BY_KEY = new Map(PROFILE_METRICS.map((m) => [m.key, m]));

export const CATEGORIES: Category[] = ["체격", "점프", "착지·정렬", "감속 스텝", "505 민첩성"];

const UNIT_SUFFIX: Record<Unit, string> = {
  cm: "cm",
  kg: "kg",
  "%": "%",
  "°": "°",
  N: "N",
  "N·s": "N·s",
  "N/s": "N/s",
  s: "초",
};

/** 단위를 값에 붙여 표기 (예: 44cm, 2.23초, 1,098N/s) */
export function formatValue(value: number | null | undefined, unit: Unit, decimals: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  const text = value.toLocaleString("ko-KR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${text}${UNIT_SUFFIX[unit]}`;
}

/** 부호 포함 변화량 표기 (예: +2cm, −0.05초) */
export function formatDelta(value: number | null | undefined, unit: Unit, decimals: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  const rounded = Number(value.toFixed(decimals));
  if (rounded === 0) return formatValue(0, unit, decimals);
  const sign = rounded > 0 ? "+" : "−";
  return sign + formatValue(Math.abs(rounded), unit, decimals);
}

/** 대시보드 통계(평균·중앙값·표준편차) 표시 자릿수 */
export function statDecimals(unit: Unit): number {
  if (unit === "s") return 2;
  if (unit === "N" || unit === "N/s") return 0;
  return 1;
}

export function unitSuffix(unit: Unit): string {
  return UNIT_SUFFIX[unit];
}

/** 엑셀 헤더 → 원자료 지표 키 */
export function headerToMetricKey(header: string): string | undefined {
  const norm = header.replace(/\s+/g, "");
  return RAW_METRICS.find((m) => m.header.replace(/\s+/g, "") === norm)?.key;
}
