import type { Direction } from "./metrics";

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** 표본 표준편차 (n−1, 엑셀 STDEV.S와 동일) */
export function stdev(values: number[]): number | null {
  if (values.length < 2) return null;
  const m = mean(values)!;
  const ss = values.reduce((acc, v) => acc + (v - m) ** 2, 0);
  return Math.sqrt(ss / (values.length - 1));
}

export interface Summary {
  n: number;
  mean: number | null;
  median: number | null;
  sd: number | null;
  min: number | null;
  max: number | null;
}

export function summarize(values: number[]): Summary {
  return {
    n: values.length,
    mean: mean(values),
    median: median(values),
    sd: stdev(values),
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
  };
}

/** 부동소수 오차 흡수용 비교 (0.1 + 0.2 ≠ 0.3 문제) */
const EPS = 1e-9;

/**
 * 백분위 (0–100). 엑셀 PERCENTRANK.INC와 같은 방식:
 *   백분위 = (기준 집단에서 나보다 "나쁜" 기록의 수) ÷ (n − 1) × 100
 *
 * - reference에는 본인 기록이 포함되어 있어야 한다. 포함되어 있지 않으면 본인 값을 추가해서 계산한다.
 * - higher: 나보다 낮은 값의 수, lower: 나보다 높은(느린) 값의 수를 센다 → "낮을수록 좋은" 지표는 자동 반전.
 * - 동점은 "나쁜 기록"으로 세지 않는다 (동점자끼리는 같은 백분위).
 * - n < 2 이면 null.
 */
export function percentRank(reference: number[], x: number, direction: Exclude<Direction, "neutral">): number | null {
  const values = reference.some((v) => Math.abs(v - x) < EPS) ? reference : [...reference, x];
  const n = values.length;
  if (n < 2) return null;
  const worse = values.filter((v) => (direction === "higher" ? v < x - EPS : v > x + EPS)).length;
  return (worse / (n - 1)) * 100;
}

export interface Bin {
  x0: number;
  x1: number;
  count: number;
}

function niceStep(range: number, targetBins: number): number {
  const raw = range / targetBins;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * pow;
}

/** 보기 좋은 경계값을 가진 히스토그램 구간 (6–10개 내외) */
export function histogram(values: number[], targetBins = 8): Bin[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ x0: min, x1: max, count: values.length }];
  const step = niceStep(max - min, targetBins);
  const start = Math.floor(min / step + EPS) * step;
  const bins: Bin[] = [];
  for (let x0 = start; x0 <= max + EPS; x0 += step) {
    bins.push({ x0: round(x0), x1: round(x0 + step), count: 0 });
  }
  for (const v of values) {
    let i = Math.floor((v - start) / step + EPS);
    if (i >= bins.length) i = bins.length - 1;
    bins[i].count++;
  }
  return bins;
}

function round(v: number): number {
  return Number(v.toFixed(6));
}

/** 분위수 (선형 보간, 엑셀 QUARTILE.INC·PERCENTILE.INC와 같음). p는 0–1 */
export function quantile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}
