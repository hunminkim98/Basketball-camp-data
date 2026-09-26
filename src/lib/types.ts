export type Gender = "M" | "F";

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  /** 출생연도 (예: 2013). 없으면 null */
  birthYear: number | null;
  /** 학년 (예: "초6", "중1"). 생년이 없을 때 나이 추정에 사용 */
  grade: string | null;
  team: string | null;
  /** 선수·보호자용 리포트 열람 코드 (XXXX-XXXX) */
  accessCode: string;
  createdAt: string;
}

export interface Camp {
  id: string;
  name: string;
  /** YYYY-MM-DD */
  date: string;
  location: string | null;
}

export interface Measurement {
  playerId: string;
  campId: string;
  metricKey: string;
  value: number;
  /** 측정 당시 나이 (캠프 연도 − 생년, 또는 학년 환산). 없으면 null */
  ageAtMeasurement: number | null;
}

export type RuleOp = "lt" | "gt";

export interface ValidationRule {
  id: string;
  /** 규칙이 적용되는 원자료 지표 키 목록 */
  metricKeys: string[];
  label: string;
  op: RuleOp;
  threshold: number;
  note: string | null;
  enabled: boolean;
}

export interface Dataset {
  players: Player[];
  camps: Camp[];
  measurements: Measurement[];
  rules: ValidationRule[];
}
