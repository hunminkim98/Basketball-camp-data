import { CHART } from "./theme";

export interface TrendDatum {
  /** x축 약칭 (예: 26.02) */
  camp: string;
  /** 툴팁 제목 (캠프 전체 이름) */
  title: string;
  value: number | null;
  label: string;
}

const W = 300;
const H = 112;
const PAD = { top: 26, right: 34, bottom: 22, left: 34 };

/**
 * 한 지표의 캠프별 추이 (작은 배수 차트). 최근 측정 점만 오렌지 + 값 표기.
 * viewBox로 그려 화면·인쇄(PDF) 어디서든 폭에 맞춰 비율대로 늘고 준다.
 */
export function TrendChart({ data }: { data: TrendDatum[] }) {
  const valid = data.map((d, i) => ({ ...d, i })).filter((d) => d.value !== null) as (TrendDatum & { i: number; value: number })[];
  if (!valid.length) return <p className="py-6 text-center text-xs text-muted">기록 없음</p>;
  const min = Math.min(...valid.map((d) => d.value));
  const max = Math.max(...valid.map((d) => d.value));
  const span = max - min || Math.abs(max) || 1;
  const x = (i: number) => (data.length === 1 ? W / 2 : PAD.left + (i / (data.length - 1)) * (W - PAD.left - PAD.right));
  const y = (v: number) => (max === min ? (H - PAD.bottom + PAD.top) / 2 : PAD.top + (1 - (v - min) / span) * (H - PAD.top - PAD.bottom));
  const last = valid[valid.length - 1].i;
  const path = valid.map((d, k) => `${k ? "L" : "M"}${x(d.i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={valid.map((d) => `${d.title} ${d.label}`).join(", ")}>
      <line x1={PAD.left - 10} x2={W - PAD.right + 10} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke={CHART.grid} />
      <path d={path} fill="none" stroke={CHART.line} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <text key={`x${i}`} x={x(i)} y={H - 6} textAnchor="middle" fontSize={11} fill={CHART.axis}>
          {d.camp}
        </text>
      ))}
      {valid.map((d) => {
        const isLast = d.i === last;
        return (
          <g key={d.i}>
            <title>{`${d.title}: ${d.label}`}</title>
            <circle cx={x(d.i)} cy={y(d.value)} r={isLast ? 5 : 4} fill={isLast ? CHART.accent : CHART.line} stroke="#fff" strokeWidth={2} />
            <text
              x={x(d.i)}
              y={y(d.value) - 10}
              textAnchor="middle"
              fontSize={12}
              fontWeight={isLast ? 700 : 500}
              fill={isLast ? CHART.ink : CHART.axis}
            >
              {d.label}
            </text>
            {/* 호버 영역은 점보다 크게 */}
            <circle cx={x(d.i)} cy={y(d.value)} r={14} fill="transparent" />
          </g>
        );
      })}
    </svg>
  );
}
