import type { ReactNode } from "react";

export function TooltipBox({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <div className="rounded-md border border-line bg-white px-3 py-2 text-sm shadow-sm">
      <div className="font-semibold text-ink">{title}</div>
      <div className="tabular text-body">{children}</div>
    </div>
  );
}
