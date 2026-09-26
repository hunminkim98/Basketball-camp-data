import type { Metadata } from "next";
import Link from "next/link";
import { buildSessions, sortCamps } from "@/lib/analysis";
import { loadDataset } from "@/lib/data";
import { getStore } from "@/lib/store";
import { buttonClass, Card, CardTitle, PageTitle, StatTile } from "@/components/ui";

export const metadata: Metadata = { title: "관리자" };

export default async function AdminHome() {
  const ds = await loadDataset();
  const sessions = buildSessions(ds);
  const flags = sessions.reduce((a, s) => a + Object.keys(s.flags).length, 0);
  const noAge = sessions.filter((s) => s.age === null).length;
  const repeat = new Map<string, number>();
  for (const s of sessions) repeat.set(s.player.id, (repeat.get(s.player.id) ?? 0) + 1);
  const repeaters = [...repeat.values()].filter((n) => n > 1).length;

  return (
    <>
      <PageTitle
        sub={`저장소: ${getStore().kind === "supabase" ? "Supabase (Postgres)" : "로컬 파일 (data/db.json)"}`}
        right={
          <Link href="/admin/import" className={buttonClass.accent}>
            + 새 캠프 데이터 업로드
          </Link>
        }
      >
        관리자
      </PageTitle>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="캠프" value={`${ds.camps.length}회`} />
        <StatTile label="선수" value={`${ds.players.length}명`} note={`2회 이상 참가 ${repeaters}명`} />
        <StatTile label="측정오류 표시" value={`${flags}건`} note={<Link href="/admin/rules" className="underline">기준표 보기</Link>} />
        <StatTile label="나이 미입력" value={`${noAge}건`} note={<Link href="/admin/players" className="underline">선수 정보 입력</Link>} />
      </div>
      <Card>
        <CardTitle sub="최근 캠프부터">캠프</CardTitle>
        <ul className="divide-y divide-line">
          {sortCamps(ds.camps)
            .reverse()
            .map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span>
                  <b className="text-ink">{c.name}</b> <span className="text-sm text-muted">{c.date}{c.location ? ` · ${c.location}` : ""}</span>
                </span>
                <Link href={`/?camp=${c.id}`} className="text-sm font-semibold text-navy hover:underline">
                  {sessions.filter((s) => s.camp.id === c.id).length}명 · 대시보드 보기 →
                </Link>
              </li>
            ))}
        </ul>
      </Card>
    </>
  );
}
