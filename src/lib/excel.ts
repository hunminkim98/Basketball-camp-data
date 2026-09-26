import * as XLSX from "xlsx";
import { headerToMetricKey } from "./metrics";
import type { Gender } from "./types";

/**
 * 측정 엑셀 파싱 (브라우저·Node 공용).
 * 한 행 = 선수 1명, 첫 열 = 이름. 헤더는 metrics.ts의 원자료 헤더와 공백 무시 비교.
 * 선택 열: 성별, 생년(출생연도·생년월일), 학년, 소속팀(소속·팀)
 */

export interface ParsedRow {
  sheet: string;
  /** 엑셀 행 번호 (1부터) */
  rowNumber: number;
  name: string;
  gender: Gender | null;
  birthYear: number | null;
  grade: string | null;
  team: string | null;
  values: Record<string, number>;
}

export interface ParsedSheet {
  name: string;
  /** 시트 이름에서 추정한 성별 */
  gender: Gender | null;
  metricColumns: number;
  unknownColumns: string[];
  rows: ParsedRow[];
  /** 원자료 시트로 보이는지 (기본 선택 여부) */
  suggested: boolean;
}

function genderFrom(text: unknown): Gender | null {
  if (typeof text !== "string") return null;
  const t = text.trim().toUpperCase();
  if (/남|^M$|MALE|BOY/.test(t)) return "M";
  if (/여|^F$|FEMALE|GIRL/.test(t)) return "F";
  return null;
}

const OPTIONAL_HEADERS: Record<string, "gender" | "birthYear" | "grade" | "team"> = {
  성별: "gender",
  생년: "birthYear",
  출생연도: "birthYear",
  출생년도: "birthYear",
  생년월일: "birthYear",
  학년: "grade",
  소속팀: "team",
  소속: "team",
  팀: "team",
};

function parseBirthYear(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) return v.getFullYear();
  if (typeof v === "number") {
    if (v >= 1990 && v <= 2030) return Math.trunc(v);
    if (v > 20000) return XLSX.SSF.parse_date_code(v)?.y ?? null; // 엑셀 날짜 일련번호
    return null;
  }
  const m = String(v).match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : null;
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

export function parseWorkbook(data: ArrayBuffer | Uint8Array): ParsedSheet[] {
  const wb = XLSX.read(data, { type: "array", cellDates: true });
  const sheets: ParsedSheet[] = [];
  for (const sheetName of wb.SheetNames) {
    const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1, raw: true, defval: null });
    const headerIdx = grid.findIndex((r) => Array.isArray(r) && String(r[0] ?? "").replace(/\s+/g, "") === "이름");
    if (headerIdx < 0) continue;
    const header = (grid[headerIdx] as unknown[]).map((h) => (h === null ? "" : String(h)));
    const metricCols = new Map<number, string>();
    const optionalCols = new Map<number, (typeof OPTIONAL_HEADERS)[string]>();
    const unknown: string[] = [];
    header.forEach((h, i) => {
      if (i === 0 || !h.trim()) return;
      const key = headerToMetricKey(h);
      const opt = OPTIONAL_HEADERS[h.replace(/\s+/g, "")];
      if (key) metricCols.set(i, key);
      else if (opt) optionalCols.set(i, opt);
      else unknown.push(h);
    });
    if (metricCols.size < 5) continue;

    const sheetGender = genderFrom(sheetName);
    const rows: ParsedRow[] = [];
    for (let r = headerIdx + 1; r < grid.length; r++) {
      const line = grid[r] as unknown[];
      const name = String(line?.[0] ?? "").trim();
      if (!name) continue;
      const row: ParsedRow = {
        sheet: sheetName,
        rowNumber: r + 1,
        name,
        gender: sheetGender,
        birthYear: null,
        grade: null,
        team: null,
        values: {},
      };
      for (const [i, key] of metricCols) {
        const n = toNumber(line[i]);
        if (n !== null) row.values[key] = n;
      }
      for (const [i, field] of optionalCols) {
        const v = line[i];
        if (field === "gender") row.gender = genderFrom(v) ?? row.gender;
        else if (field === "birthYear") row.birthYear = parseBirthYear(v);
        else if (v !== null && String(v).trim()) row[field] = String(v).trim();
      }
      if (Object.keys(row.values).length > 0) rows.push(row);
    }
    sheets.push({
      name: sheetName,
      gender: sheetGender,
      metricColumns: metricCols.size,
      unknownColumns: unknown,
      rows,
      suggested: sheetName.startsWith("원자료"),
    });
  }
  // "원자료" 시트가 하나도 없으면 인식된 시트를 모두 기본 선택
  if (!sheets.some((s) => s.suggested)) sheets.forEach((s) => (s.suggested = true));
  return sheets;
}
