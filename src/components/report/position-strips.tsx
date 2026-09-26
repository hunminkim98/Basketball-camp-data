import { formatValue } from "@/lib/metrics";
import type { ReportMetric } from "@/lib/analysis";

/**
 * 방향성 없는 지표: 백분위 대신 "기준 대비 위치".
 * 회색 띠 = 기준 집단 범위(최솟값~최댓값), 진한 띠 = 평균 ±1 표준편차, 세로선 = 평균, 오렌지 점 = 본인.
 */
export function PositionStrips({ rows }: { rows: ReportMetric[] }) {
  return (
    <ul className="space-y-4">
      {rows.map((r) => {
        const m = r.metric;
        const { min, max, mean, sd } = r.ref;
        const v = r.value.value;
        const ok = v !== null && min !== null && max !== null && mean !== null && max > min;
        const lo = ok ? Math.min(min!, v!) : 0;
        const hi = ok ? Math.max(max!, v!) : 1;
        const x = (n: number) => `${((n - lo) / (hi - lo)) * 100}%`;
        return (
          <li key={m.key}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-semibold text-ink">
                {m.label} <span className="tabular font-bold">{formatValue(v, m.unit, m.decimals)}</span>
              </span>
              <span className="tabular text-sm text-muted">
                {r.position ?? "–"} · 기준 평균 {formatValue(mean, m.unit, m.decimals)}
              </span>
            </div>
            {ok ? (
              <div className="relative mt-1.5 h-4" aria-hidden>
                <div className="absolute inset-y-1 rounded-full bg-track" style={{ left: x(min!), right: `calc(100% - ${x(max!)})` }} />
                {sd !== null && (
                  <div
                    className="absolute inset-y-1 bg-sub"
                    style={{ left: x(Math.max(lo, mean! - sd)), width: `calc(${x(Math.min(hi, mean! + sd))} - ${x(Math.max(lo, mean! - sd))})` }}
                  />
                )}
                <div className="absolute inset-y-0 border-l-2 border-navy" style={{ left: x(mean!) }} />
                <div
                  className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-court"
                  style={{ left: x(v!) }}
                />
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted">비교할 기준 데이터가 부족합니다.</p>
            )}
            {m.description && <p className="mt-0.5 text-xs text-muted">{m.description}</p>}
          </li>
        );
      })}
    </ul>
  );
}
