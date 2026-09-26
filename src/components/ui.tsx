import type { ReactNode } from "react";

type Accent = "navy" | "court" | "sub";

export function Card({
  children,
  accent = "navy",
  className = "",
  id,
}: {
  children: ReactNode;
  accent?: Accent;
  className?: string;
  id?: string;
}) {
  const band = accent === "court" ? "card-court" : accent === "sub" ? "card-sub" : "";
  return (
    <section id={id} className={`card ${band} min-w-0 p-4 sm:p-5 ${className}`}>
      {children}
    </section>
  );
}

export function CardTitle({ children, sub, right }: { children: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="text-base font-bold text-ink sm:text-lg">{children}</h2>
        {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function PageTitle({ children, sub, right }: { children: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-navy sm:text-3xl">{children}</h1>
        {sub && <p className="mt-1 text-sm text-muted sm:text-base">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

type BadgeTone = "court" | "navy" | "muted" | "danger" | "warn";

const BADGE: Record<BadgeTone, string> = {
  court: "bg-court text-white",
  navy: "border border-navy text-navy bg-white",
  muted: "bg-track text-muted",
  danger: "bg-danger-soft text-danger",
  warn: "bg-court-soft text-[#a4410b]",
};

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-semibold ${BADGE[tone]}`}>
      {children}
    </span>
  );
}

export function SampleBadge({ n, min = 10 }: { n: number; min?: number }) {
  if (n >= min) return null;
  return <Badge tone="warn">표본 부족</Badge>;
}

export function StatTile({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="card card-sub px-4 py-3">
      <div className="text-sm text-muted">{label}</div>
      <div className="tabular mt-1 text-2xl font-bold text-ink sm:text-3xl">{value}</div>
      {note && <div className="mt-0.5 text-xs text-muted">{note}</div>}
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "warn" | "danger" }) {
  const cls =
    tone === "danger"
      ? "border-danger/30 bg-danger-soft text-danger"
      : tone === "warn"
        ? "border-court/30 bg-court-soft text-[#8a3608]"
        : "border-line bg-navy-soft text-navy";
  return <div className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

export const buttonClass = {
  primary:
    "inline-flex items-center justify-center gap-1.5 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0e2448] disabled:opacity-40 min-h-11",
  accent:
    "inline-flex items-center justify-center gap-1.5 rounded-lg bg-court px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#e85c10] disabled:opacity-40 min-h-11",
  ghost:
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-semibold text-navy hover:bg-navy-soft disabled:opacity-40 min-h-11",
  danger:
    "inline-flex items-center justify-center gap-1.5 rounded-lg border border-danger/40 bg-white px-4 py-2.5 text-sm font-semibold text-danger hover:bg-danger-soft disabled:opacity-40 min-h-11",
};

export const inputClass =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base text-ink outline-none focus:border-navy focus:ring-2 focus:ring-navy/15 min-h-11";
