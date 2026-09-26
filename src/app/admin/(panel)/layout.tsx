import { requireAdmin } from "@/lib/session";
import { usingDevCredentials } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { Notice } from "@/components/ui";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const store = getStore();
  const readOnlyRisk = store.kind === "local" && process.env.VERCEL;
  return (
    <div className="space-y-5">
      <AdminNav />
      {usingDevCredentials() && (
        <Notice tone="warn">개발용 기본 관리자 비밀번호로 로그인했습니다. 배포 전 ADMIN_PASSWORD와 SESSION_SECRET을 설정하세요.</Notice>
      )}
      {readOnlyRisk && (
        <Notice tone="danger">Vercel에서는 로컬 파일 저장소를 쓸 수 없습니다. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 설정하세요.</Notice>
      )}
      {children}
    </div>
  );
}
