const COMPOUND_SURNAMES = ["남궁", "황보", "제갈", "선우", "독고", "사공", "서문", "동방", "어금", "망절"];

/** 공개 화면용 이름 마스킹: 홍길동 → 홍OO, 남궁민수 → 남궁OO */
export function maskName(name: string): string {
  const n = name.trim();
  if (!n) return "OO";
  const surname = n.length >= 4 && COMPOUND_SURNAMES.some((s) => n.startsWith(s)) ? n.slice(0, 2) : n.slice(0, 1);
  return `${surname}OO`;
}
