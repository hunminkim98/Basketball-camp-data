import type { Bin } from "@/lib/stats";

const W = 160;
const H = 44;
const GAP = 1.5;

/**
 * 작은 분포 그래프. 평균이 속한 구간 하나만 오렌지, 나머지는 회색.
 * 막대마다 data-tip-* 속성 → TipLayer가 툴팁을 띄운다.
 */
export function MiniHistogram({
  bins,
  highlight,
  label,
}: {
  bins: Bin[];
  highlight: number;
  label: (b: Bin) => string;
}) {
  if (bins.length === 0) return <div className="h-11 rounded bg-track" />;
  const max = Math.max(...bins.map((b) => b.count), 1);
  const bw = W / bins.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-11 w-full" preserveAspectRatio="none" aria-hidden>
      {bins.map((b, i) => {
        const h = b.count ? Math.max(2, (b.count / max) * (H - 2)) : 0;
        return (
          <g key={i} data-tip-title={label(b)} data-tip-value={`${b.count}명`}>
            <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
            {h > 0 && (
              <path
                d={roundedTop(i * bw + GAP / 2, H - h, bw - GAP, h, Math.min(2, (bw - GAP) / 2))}
                fill={i === highlight ? "var(--color-court)" : "var(--color-sub)"}
              />
            )}
          </g>
        );
      })}
      <line x1={0} x2={W} y1={H - 0.5} y2={H - 0.5} stroke="var(--color-line)" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** 위쪽 모서리만 둥근 막대 (바닥은 직각) */
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h);
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`;
}
