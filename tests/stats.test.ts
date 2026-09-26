import { describe, expect, it } from "vitest";
import { maskName } from "../src/lib/mask";
import { ageAtCamp, ageBandKey, gradeToAge } from "../src/lib/age";
import { histogram, median, percentRank, stdev } from "../src/lib/stats";
import { formatDelta, formatValue } from "../src/lib/metrics";

describe("percentRank (PERCENTRANK.INC 방식)", () => {
  const ref = [10, 20, 30, 40, 50];
  it("높을수록 좋은 지표", () => {
    expect(percentRank(ref, 10, "higher")).toBe(0);
    expect(percentRank(ref, 30, "higher")).toBe(50);
    expect(percentRank(ref, 50, "higher")).toBe(100);
  });
  it("낮을수록 좋은 지표는 반전", () => {
    expect(percentRank(ref, 10, "lower")).toBe(100);
    expect(percentRank(ref, 50, "lower")).toBe(0);
  });
  it("동점은 같은 백분위", () => {
    expect(percentRank([1, 2, 2, 3], 2, "higher")).toBeCloseTo(33.33, 1);
  });
  it("기준에 본인 값이 없으면 추가해서 계산", () => {
    expect(percentRank([10, 20], 15, "higher")).toBe(50);
  });
  it("n<2면 null", () => {
    expect(percentRank([5], 5, "higher")).toBeNull();
  });
});

describe("기술통계", () => {
  it("중앙값·표본 표준편차", () => {
    expect(median([3, 1, 2, 4])).toBe(2.5);
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
  });
  it("히스토그램은 모든 값을 담는다", () => {
    const v = [31, 35, 38, 43, 44, 44, 47, 55];
    const bins = histogram(v);
    expect(bins.reduce((a, b) => a + b.count, 0)).toBe(v.length);
    expect(bins[0].x0).toBeLessThanOrEqual(31);
    expect(bins[bins.length - 1].x1).toBeGreaterThan(55);
  });
});

describe("표기·개인정보·나이", () => {
  it("단위를 값에 붙인다", () => {
    expect(formatValue(44, "cm", 0)).toBe("44cm");
    expect(formatValue(2.234, "s", 2)).toBe("2.23초");
    expect(formatValue(1098, "N/s", 0)).toBe("1,098N/s");
    expect(formatDelta(-0.05, "s", 2)).toBe("−0.05초");
    expect(formatDelta(2, "cm", 0)).toBe("+2cm");
  });
  it("이름 마스킹", () => {
    expect(maskName("홍길동")).toBe("홍OO");
    expect(maskName("이솔")).toBe("이OO");
    expect(maskName("남궁민수")).toBe("남궁OO");
  });
  it("나이 계산", () => {
    expect(ageAtCamp("2026-02-01", 2014, null)).toBe(12);
    expect(ageAtCamp("2026-02-01", null, "중1")).toBe(13);
    expect(ageAtCamp("2026-02-01", null, null)).toBeNull();
    expect(gradeToAge("초6")).toBe(12);
    expect(ageBandKey(null)).toBe("na");
    expect(ageBandKey(12)).toBe("11-12");
  });
});
