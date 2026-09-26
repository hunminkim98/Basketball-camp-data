/** 농구공 로고 (파비콘 src/app/icon.svg와 같은 모양) */
export function BasketballLogo({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="15" fill="#FF6B1A" />
      <g fill="none" stroke="#14305E" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="16" cy="16" r="15" />
        <path d="M16 1v30M1 16h30" />
        <path d="M5.4 5.4c4.6 4.4 4.6 16.8 0 21.2M26.6 5.4c-4.6 4.4-4.6 16.8 0 21.2" />
      </g>
    </svg>
  );
}
