/**
 * 나이 규칙
 * - 측정 당시 나이 = 캠프 연도 − 출생연도 (그해 도달하는 만 나이)
 * - 생년이 없고 학년만 있으면 학년으로 환산: 초n → 6+n세, 중n → 12+n세, 고n → 15+n세
 * - 둘 다 없으면 null → "나이 미입력"
 */

export function gradeToAge(grade: string | null | undefined): number | null {
  if (!grade) return null;
  const m = grade.replace(/\s+/g, "").match(/^(초|중|고)(?:등학교|등)?([1-6])(?:학년)?$/);
  if (!m) return null;
  const n = Number(m[2]);
  if (m[1] === "초") return 6 + n;
  if (n > 3) return null;
  return m[1] === "중" ? 12 + n : 15 + n;
}

export function ageAtCamp(campDate: string, birthYear: number | null, grade: string | null): number | null {
  if (birthYear) {
    const campYear = Number(campDate.slice(0, 4));
    const age = campYear - birthYear;
    return age > 0 && age < 40 ? age : null;
  }
  return gradeToAge(grade);
}

export interface AgeBand {
  key: string;
  label: string;
  min: number;
  max: number;
}

export const AGE_BANDS: AgeBand[] = [
  { key: "u10", label: "10세 이하", min: 0, max: 10 },
  { key: "11-12", label: "11–12세", min: 11, max: 12 },
  { key: "13-14", label: "13–14세", min: 13, max: 14 },
  { key: "15-16", label: "15–16세", min: 15, max: 16 },
  { key: "17+", label: "17세 이상", min: 17, max: 99 },
];

export const AGE_UNKNOWN = { key: "na", label: "나이 미입력" } as const;

export function ageBandKey(age: number | null): string {
  if (age === null) return AGE_UNKNOWN.key;
  return AGE_BANDS.find((b) => age >= b.min && age <= b.max)?.key ?? AGE_UNKNOWN.key;
}

export function ageBandLabel(key: string): string {
  if (key === AGE_UNKNOWN.key) return AGE_UNKNOWN.label;
  return AGE_BANDS.find((b) => b.key === key)?.label ?? key;
}
