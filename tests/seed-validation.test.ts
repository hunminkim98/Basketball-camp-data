/**
 * 요구사항의 검증 기준을 실제 1회차 엑셀로 확인한다.
 * 엑셀은 개인정보라 저장소에 없다 → data/private/camp-2026-02.xlsx가 있을 때만 실행.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildReport, buildSessions, filterSessions, profileValues } from "../src/lib/analysis";
import { parseWorkbook } from "../src/lib/excel";
import { PROFILE_BY_KEY } from "../src/lib/metrics";
import { mean } from "../src/lib/stats";
import type { Dataset, Measurement, Player } from "../src/lib/types";
import { DEFAULT_RULES } from "../src/lib/validation";

const FILE = path.join(__dirname, "..", "data", "private", "camp-2026-02.xlsx");

function datasetFromExcel(): Dataset {
  const sheets = parseWorkbook(new Uint8Array(readFileSync(FILE))).filter((s) => s.suggested);
  const players: Player[] = [];
  const measurements: Measurement[] = [];
  for (const row of sheets.flatMap((s) => s.rows)) {
    const id = `${row.gender}-${row.name}`;
    players.push({ id, name: row.name, gender: row.gender!, birthYear: null, grade: null, team: null, accessCode: id, createdAt: "" });
    for (const [metricKey, value] of Object.entries(row.values)) {
      measurements.push({ playerId: id, campId: "c1", metricKey, value, ageAtMeasurement: null });
    }
  }
  return { players, camps: [{ id: "c1", name: "2026년 2월 캠프", date: "2026-02-01", location: null }], measurements, rules: DEFAULT_RULES };
}

describe.skipIf(!existsSync(FILE))("1회차 시드 데이터 검증", () => {
  const ds = existsSync(FILE) ? datasetFromExcel() : null!;
  const sessions = existsSync(FILE) ? buildSessions(ds) : [];

  it("남 28명, 여 29명", () => {
    expect(filterSessions(sessions, { gender: "M" })).toHaveLength(28);
    expect(filterSessions(sessions, { gender: "F" })).toHaveLength(29);
  });

  it("점프 높이 평균: 남자부 43.0cm, 여자부 40.1cm", () => {
    const jump = PROFILE_BY_KEY.get("jump_height")!;
    expect(mean(profileValues(filterSessions(sessions, { gender: "M" }), jump))!.toFixed(1)).toBe("43.0");
    expect(mean(profileValues(filterSessions(sessions, { gender: "F" }), jump))!.toFixed(1)).toBe("40.1");
  });

  it("측정오류 값은 통계에서 빠진다 (남자 최대 지면반력 n=26)", () => {
    const grf = PROFILE_BY_KEY.get("peak_grf")!;
    expect(profileValues(filterSessions(sessions, { gender: "M" }), grf)).toHaveLength(26);
  });

  it("예시 선수(남, 점프 44cm): 방향전환 손실 67점 강점, 힘생성비율 4점 약점", () => {
    // 실명을 코드에 남기지 않도록 조건으로 찾는다: 남자, 점프 44cm, 힘생성비율 1,098N/s
    const example = ds.players.filter(
      (p) =>
        p.gender === "M" &&
        ds.measurements.some((m) => m.playerId === p.id && m.metricKey === "jump_height" && m.value === 44) &&
        ds.measurements.some((m) => m.playerId === p.id && m.metricKey === "rfd" && m.value === 1098),
    );
    expect(example).toHaveLength(1);
    const report = buildReport(ds, example[0].id)!;
    const byKey = new Map(report.metrics.map((m) => [m.metric.key, m]));
    expect(byKey.get("jump_height")!.value.value).toBe(44);
    expect(report.reference.label).toBe("남자부 전체");
    expect(byKey.get("cod_loss")!.percentile).toBe(67);
    expect(byKey.get("cod_loss")!.tag).toBe("강점");
    expect(byKey.get("rfd")!.percentile).toBe(4);
    expect(byKey.get("rfd")!.tag).toBe("약점");
  });
});
