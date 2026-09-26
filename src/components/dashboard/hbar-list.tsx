export interface HBarItem {
  key: string;
  label: string;
  value: number;
  display: string;
  highlight?: boolean;
  muted?: boolean;
}

/** 가로 막대 목록. 강조 하나만 오렌지, 나머지 회색. 값은 막대 끝에 직접 표기. */
export function HBarList({ items, max }: { items: HBarItem[]; max?: number }) {
  const top = max ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li key={it.key} className="grid grid-cols-[5.5rem_1fr] items-center gap-3 text-sm">
          <span className={`truncate ${it.muted ? "text-muted" : "font-semibold text-ink"}`}>{it.label}</span>
          <div className="flex items-center gap-2" data-tip-title={it.label} data-tip-value={it.display}>
            <div
              className="h-3.5 rounded-r"
              style={{
                width: `${Math.max((it.value / top) * 82, it.value > 0 ? 1.5 : 0)}%`,
                background: it.highlight ? "var(--color-court)" : "var(--color-sub)",
              }}
            />
            <span className="tabular text-xs font-bold whitespace-nowrap text-ink">{it.display}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
