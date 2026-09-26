import type { Metadata } from "next";
import Link from "next/link";
import { buildReport } from "@/lib/analysis";
import { loadDataset } from "@/lib/data";
import { findByCode, readReportParams } from "@/lib/lookup";
import { isAdmin } from "@/lib/session";
import { ReportView } from "@/components/report/report-view";
import { Card, Notice } from "@/components/ui";

export const metadata: Metadata = { title: "개인 리포트", referrer: "no-referrer" };

/** 선수·보호자용 고유 링크: /r/열람코드 */
export default async function CodeReportPage(props: PageProps<"/r/[code]">) {
  const [{ code }, sp] = await Promise.all([props.params, props.searchParams]);
  const [ds, admin] = await Promise.all([loadDataset(), isAdmin()]);
  const player = findByCode(ds, code);
  const { campId, refMode } = readReportParams(sp);
  const report = player ? buildReport(ds, player.id, { campId, refMode }) : null;

  if (!player || !report) {
    return (
      <div className="mx-auto max-w-md pt-6">
        <Card>
          <h1 className="text-xl font-extrabold text-navy">리포트를 찾을 수 없습니다</h1>
          <div className="mt-3">
            <Notice tone="warn">열람 코드가 올바른지 확인하세요. 코드는 캠프에서 받은 안내문에 있습니다.</Notice>
          </div>
          <Link href="/players" className="mt-4 inline-block text-sm font-semibold text-court hover:underline">
            ← 코드 다시 입력
          </Link>
        </Card>
      </div>
    );
  }

  return <ReportView report={report} admin={admin} basePath={`/r/${player.accessCode}`} refMode={refMode} />;
}
