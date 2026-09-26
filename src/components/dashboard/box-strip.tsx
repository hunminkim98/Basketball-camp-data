import { quantile } from "@/lib/stats";

/**
 * 한 줄 분포: 점 하나 = 선수 1명, 상자 = 가운데 50%(Q1–Q3), 오렌지 세로선 = 중앙값.
 * 점은 겹치지 않게 결정적(매번 같은) 세로 흔들기를 준다.
 */
export function BoxStrip({ values, format }: { values: number[]; format: (v: number) => string }) {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (v: number) => 2 + ((v - min) / span) * 96; // % (양끝 2% 여백)
  const q1 = quantile(values, 0.25)!;
  const q3 = quantile(values, 0.75)!;
  const med = quantile(values, 0.5)!;
  const sorted = [...values].sort((a, b) => a - b);

  return (
    <div>
      <div className="relative h-20" aria-hidden>
        {/* 전체 범위 */}
        <div className="absolute top-1/2 h-px bg-line" style={{ left: `${x(min)}%`, right: `${100 - x(max)}%` }} />
        {/* 가운데 50% */}
        <div
          className="absolute top-1/2 h-12 -translate-y-1/2 rounded-md border border-navy/40 bg-navy/5"
          style={{ left: `${x(q1)}%`, width: `${Math.max(x(q3) - x(q1), 0.5)}%` }}
          data-tip-title="가운데 50% 선수"
          data-tip-value={`${format(q1)} ~ ${format(q3)}`}
        />
        {/* 선수 점 */}
        {sorted.map((v, i) => (
          <span
            key={i}
            className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8A96A8]/60 ring-2 ring-white"
            style={{ left: `${x(v)}%`, top: `${50 + jitter(i) * 34}%` }}
            data-tip-title="선수 기록"
            data-tip-value={format(v)}
          />
        ))}
        {/* 중앙값 */}
        <div
          className="absolute top-1/2 h-14 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-court"
          style={{ left: `${x(med)}%` }}
          data-tip-title="중앙값"
          data-tip-value={format(med)}
        />
      </div>
      <div className="tabular relative mt-1 h-5 text-xs text-muted">
        <span className="absolute left-0">{format(min)}</span>
        <span className="absolute -translate-x-1/2 font-bold text-ink" style={{ left: `${x(med)}%` }}>
          {format(med)}
        </span>
        <span className="absolute right-0">{format(max)}</span>
      </div>
    </div>
  );
}

/** −1 ~ 1 사이의 고정된 흔들림 (황금비 수열) */
function jitter(i: number): number {
  const f = (i * 0.618033988749895) % 1;
  return f * 2 - 1;
}
