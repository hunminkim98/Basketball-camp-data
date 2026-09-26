"use client";

import { useRef, useState, type ReactNode } from "react";

interface Tip {
  x: number;
  y: number;
  title: string;
  value: string;
}

/**
 * 하위 SVG·HTML 요소 중 data-tip-title / data-tip-value 속성이 있는 것에 마우스를 올리면
 * 툴팁을 띄운다. 서버에서 그린 차트에 호버 레이어만 얹는 용도.
 * 값은 textContent로만 넣는다 (innerHTML 사용 안 함).
 */
export function TipLayer({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  function update(e: React.PointerEvent) {
    const target = (e.target as Element).closest("[data-tip-value]");
    const box = ref.current?.getBoundingClientRect();
    if (!target || !box) return setTip(null);
    setTip({
      x: e.clientX - box.left,
      y: e.clientY - box.top,
      title: target.getAttribute("data-tip-title") ?? "",
      value: target.getAttribute("data-tip-value") ?? "",
    });
  }

  return (
    <div ref={ref} className={`relative ${className}`} onPointerMove={update} onPointerLeave={() => setTip(null)}>
      {children}
      {tip && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-line bg-white px-2.5 py-1.5 text-xs whitespace-nowrap shadow-sm"
          style={{ left: tip.x, top: tip.y - 10 }}
        >
          <div className="tabular text-sm font-bold text-ink">{tip.value}</div>
          {tip.title && <div className="text-muted">{tip.title}</div>}
        </div>
      )}
    </div>
  );
}
