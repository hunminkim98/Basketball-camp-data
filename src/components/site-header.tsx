import Link from "next/link";
import { isAdmin } from "@/lib/session";
import { logout } from "@/app/admin/login/actions";
import { NavLinks } from "./nav-links";

export async function SiteHeader() {
  const admin = await isAdmin();
  return (
    <header className="no-print sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 sm:px-6">
        <Link href="/" className="flex items-center gap-2 py-1.5">
          <span aria-hidden className="grid size-8 place-items-center rounded-full bg-court text-sm font-black text-white">
            NL
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-extrabold tracking-wide text-navy">NEXT LEVEL</span>
            <span className="block text-[11px] text-muted">유소년 농구캠프 데이터</span>
          </span>
        </Link>
        <NavLinks admin={admin} />
        {admin && (
          <form action={logout} className="ml-auto">
            <button className="rounded-md px-2 py-1.5 text-sm text-muted hover:text-navy">로그아웃</button>
          </form>
        )}
      </div>
    </header>
  );
}
