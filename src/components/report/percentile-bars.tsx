import { formatValue } from "@/lib/metrics";
import type { ReportMetric } from "@/lib/analysis";
import { Badge } from "@/components/ui";

/**
 * 백분위 가로 막대 (HTML로 그려 PDF에서도 선명하게).
 * 강점 하나만 오렌지, 나머지는 회색. 값은 막대 끝에 "67점"으로 직접 표기.
 */
export function PercentileBars({ rows, admin }: { rows: ReportMetric[]; admin: boolean }) {
  const sorted = [...rows].sort((a, b) => (b.percentileExact ?? -1) - (a.percentileExact ?? -1));
  return (
    <ul className="space-y-2.5">
      {sorted.map((r) => {
        const m = r.metric;
        const pct = r.percentile;
        const strong = r.tag === "강점";
        return (
          <li key={m.key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[200px_1fr_88px]">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-semibold text-ink">{m.label}</span>
                {r.tag && <Badge tone={strong ? "court" : "navy"}>{r.tag}</Badge>}
              </div>
              <div className="tabular text-xs text-muted">
                {formatValue(r.value.value, m.unit, m.decimals)}
                {m.direction === "lower" && " · 낮을수록 좋음"}
                {admin && r.flaggedKeys.length > 0 && <span className="ml-1 text-danger">· 일부 측정오류 제외</span>}
              </div>
            </div>
            <div className="relative order-3 col-span-2 h-5 sm:order-none sm:col-span-1" aria-hidden>
              <div className="absolute inset-y-0 left-0 w-full border-l border-line" />
              <div className="absolute inset-y-[-3px] left-1/2 border-l border-line" />
              {pct !== null && (
                <div
                  className="absolute inset-y-0 left-0 rounded-r"
                  style={{ width: `${Math.max(pct, 1)}%`, background: strong ? "var(--color-court)" : "var(--color-sub)" }}
                />
              )}
            </div>
            <div className="tabular text-right text-lg font-bold text-ink">{pct === null ? "–" : `${pct}점`}</div>
          </li>
        );
      })}
    </ul>
  );
}
