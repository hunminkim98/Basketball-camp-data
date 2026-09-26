"use client";

import { buttonClass } from "@/components/ui";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={`${buttonClass.accent} no-print`}>
      <svg aria-hidden viewBox="0 0 20 20" className="size-4" fill="currentColor">
        <path d="M5 2h10v4H5zM3 7h14a2 2 0 0 1 2 2v5h-3v4H4v-4H1V9a2 2 0 0 1 2-2zm3 6v3h8v-3z" />
      </svg>
      PDF 저장 · 인쇄
    </button>
  );
}
