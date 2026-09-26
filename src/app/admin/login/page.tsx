import type { Metadata } from "next";
import { usingDevCredentials } from "@/lib/auth";
import { Card, Notice } from "@/components/ui";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "관리자 로그인" };

export default async function LoginPage(props: PageProps<"/admin/login">) {
  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/admin";
  return (
    <div className="mx-auto max-w-sm pt-6">
      <Card>
        <h1 className="text-xl font-extrabold text-navy">관리자 로그인</h1>
        <p className="mt-1 text-sm text-muted">데이터 업로드, 선수·캠프 관리, 전체 리포트 열람</p>
        <LoginForm next={next} />
        {usingDevCredentials() && process.env.NODE_ENV !== "production" && (
          <div className="mt-4">
            <Notice tone="warn">
              개발 모드 기본 비밀번호 <b>admin</b> 사용 중 — 배포 전 <code>ADMIN_PASSWORD</code>, <code>SESSION_SECRET</code>을 설정하세요.
            </Notice>
          </div>
        )}
      </Card>
    </div>
  );
}
