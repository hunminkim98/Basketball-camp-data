"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export interface FilterOption {
  value: string;
  label: string;
}
export interface FilterDef {
  name: string;
  label: string;
  value: string;
  options: FilterOption[];
}

/** URL 쿼리를 바꾸는 필터 한 줄 (서버 컴포넌트가 다시 계산) */
export function FilterBar({ filters }: { filters: FilterDef[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function update(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all") next.delete(name);
    else next.set(name, value);
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  return (
    <div className={`no-print grid grid-cols-1 gap-3 sm:grid-cols-3 ${pending ? "opacity-60" : ""}`}>
      {filters.map((f) => (
        <label key={f.name} className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">{f.label}</span>
          <select
            value={f.value}
            onChange={(e) => update(f.name, e.target.value)}
            className="min-h-11 w-full rounded-lg border border-line bg-white px-3 py-2 text-base font-semibold text-ink outline-none focus:border-navy"
          >
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
