"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "개요" },
  { href: "/admin/import", label: "엑셀 업로드" },
  { href: "/admin/players", label: "선수 관리" },
  { href: "/admin/camps", label: "캠프 관리" },
  { href: "/admin/rules", label: "측정오류 기준표" },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="no-print -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {LINKS.map((l) => {
        const active = l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold ${
              active ? "bg-navy text-white" : "bg-white text-muted ring-1 ring-line hover:text-navy"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
