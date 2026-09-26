"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const links = [
    { href: "/", label: "대시보드", active: pathname === "/" },
    { href: "/players", label: "선수 리포트", active: pathname.startsWith("/players") || pathname.startsWith("/r/") },
    { href: "/admin", label: admin ? "관리자" : "관리자 로그인", active: pathname.startsWith("/admin") },
  ];
  return (
    <nav className="-mx-2 flex overflow-x-auto">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`whitespace-nowrap border-b-2 px-2 py-3 text-sm font-semibold sm:px-3 ${
            l.active ? "border-court text-navy" : "border-transparent text-muted hover:text-navy"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
