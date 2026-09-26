export interface DumbbellRow {
  key: string;
  label: string;
  male: number | null;
  female: number | null;
  min: number;
  max: number;
  maleText: string;
  femaleText: string;
  note?: string;
}

/**
 * 남녀 평균 비교. 지표마다 남녀 전체 기록의 최솟값~최댓값을 0–100%로 놓고
 * 두 평균의 위치를 점으로 찍는다 (지표끼리 단위가 달라도 한 화면에서 비교 가능).
 */
export function Dumbbell({ rows }: { rows: DumbbellRow[] }) {
  const pos = (v: number, r: DumbbellRow) => 4 + ((v - r.min) / (r.max - r.min || 1)) * 92;
  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-navy" /> 남자부 평균
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-court" /> 여자부 평균
        </span>
        <span className="ml-auto hidden sm:inline">왼쪽 끝 = 전체 최솟값, 오른쪽 끝 = 전체 최댓값</span>
      </div>
      <ul className="divide-y divide-line/60">
        {rows.map((r) => {
          const m = r.male === null ? null : pos(r.male, r);
          const f = r.female === null ? null : pos(r.female, r);
          return (
            <li key={r.key} className="grid grid-cols-[6.5rem_1fr] items-center gap-3 py-2 sm:grid-cols-[9rem_1fr]">
              <span className="truncate text-sm font-semibold text-ink" title={r.note}>
                {r.label}
              </span>
              <div className="relative h-5">
                <div className="absolute top-1/2 right-0 left-0 h-px bg-line" />
                {m !== null && f !== null && (
                  <div
                    className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-sub"
                    style={{ left: `${Math.min(m, f)}%`, width: `${Math.abs(m - f)}%` }}
                  />
                )}
                {m !== null && (
                  <span
                    className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-navy ring-2 ring-white"
                    style={{ left: `${m}%` }}
                    data-tip-title={`${r.label} · 남자부 평균`}
                    data-tip-value={r.maleText}
                  />
                )}
                {f !== null && (
                  <span
                    className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-court ring-2 ring-white"
                    style={{ left: `${f}%` }}
                    data-tip-title={`${r.label} · 여자부 평균`}
                    data-tip-value={r.femaleText}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
