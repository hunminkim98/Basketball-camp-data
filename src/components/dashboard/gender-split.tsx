/** 남녀 구성 막대 (가로 누적). 남 = 네이비, 여 = 오렌지, 칸 안에 인원 직접 표기. */
export function GenderSplit({ male, female }: { male: number; female: number }) {
  const total = male + female;
  if (total === 0) return <div className="h-10 rounded-lg bg-track" />;
  const parts = [
    { key: "M", label: "남", n: male, cls: "bg-navy text-white" },
    { key: "F", label: "여", n: female, cls: "bg-court text-ink" },
  ].filter((p) => p.n > 0);
  return (
    <div className="flex h-10 gap-0.5 overflow-hidden rounded-lg">
      {parts.map((p) => (
        <div
          key={p.key}
          className={`flex min-w-[3.5rem] items-center justify-center text-sm font-bold ${p.cls}`}
          style={{ flexGrow: p.n, flexBasis: 0 }}
          data-tip-title={`${p.label}자부`}
          data-tip-value={`${p.n}명 (${Math.round((p.n / total) * 100)}%)`}
        >
          {p.label} {p.n}
        </div>
      ))}
    </div>
  );
}
