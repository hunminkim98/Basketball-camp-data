import type { Metadata } from "next";
import Link from "next/link";
import { buildSessions, genderLabel, sortCamps } from "@/lib/analysis";
import { loadDataset } from "@/lib/data";
import { maskName } from "@/lib/mask";
import { isAdmin } from "@/lib/session";
import { Badge, buttonClass, Card, CardTitle, inputClass, Notice, PageTitle } from "@/components/ui";
import { openByCode } from "./actions";

export const metadata: Metadata = { title: "선수 리포트" };

export default async function PlayersPage(props: PageProps<"/players">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const [ds, admin] = await Promise.all([loadDataset(), isAdmin()]);
  const sessions = buildSessions(ds);
  const campsOf = new Map<string, string[]>();
  for (const s of sessions) campsOf.set(s.player.id, [...(campsOf.get(s.player.id) ?? []), s.camp.name]);
  const order = new Map(sortCamps(ds.camps).map((c, i) => [c.name, i]));

  // 공개 화면: 이름 검색은 되지만 결과는 마스킹. 리포트는 관리자 또는 열람 코드로만.
  const results = q
    ? ds.players.filter((p) => p.name.includes(q) || (admin && p.accessCode.includes(q.toUpperCase())))
    : admin
      ? ds.players
      : [];

  return (
    <div className="space-y-5">
      <PageTitle sub="개인 리포트는 선수별 열람 코드(또는 관리자 로그인)로만 볼 수 있습니다.">선수 리포트</PageTitle>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card accent="court">
          <CardTitle sub="캠프 안내문에 있는 8자리 코드 (예: ABCD-2345)">열람 코드로 보기</CardTitle>
          <form action={openByCode} className="flex gap-2">
            <input
              name="code"
              required
              placeholder="XXXX-XXXX"
              autoComplete="off"
              autoCapitalize="characters"
              className={`${inputClass} tabular uppercase tracking-widest`}
            />
            <button className={buttonClass.accent}>열기</button>
          </form>
          {sp.error && (
            <p className="mt-2 text-sm text-danger">코드를 입력하세요.</p>
          )}
        </Card>

        <Card>
          <CardTitle sub={admin ? "관리자: 실명 표시, 바로 열람" : "공개 화면에서는 이름이 김OO처럼 가려집니다."}>선수 검색</CardTitle>
          <form className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="이름" className={inputClass} />
            <button className={buttonClass.ghost}>검색</button>
          </form>
        </Card>
      </div>

      {(q || admin) && (
        <Card accent="sub">
          <CardTitle sub={`${results.length}명`}>{q ? `“${admin ? q : maskName(q)}” 검색 결과` : "전체 선수"}</CardTitle>
          {results.length === 0 ? (
            <p className="text-sm text-muted">일치하는 선수가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-line">
              {results
                .sort((a, b) => a.name.localeCompare(b.name, "ko"))
                .map((p) => {
                  const camps = (campsOf.get(p.id) ?? []).sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
                  return (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div>
                        <span className="font-semibold text-ink">{admin ? p.name : maskName(p.name)}</span>{" "}
                        <span className="text-sm text-muted">
                          {genderLabel(p.gender)}
                          {p.birthYear ? ` · ${p.birthYear}년생` : ""}
                          {p.team ? ` · ${p.team}` : ""}
                        </span>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {camps.map((c) => (
                            <Badge key={c}>{c}</Badge>
                          ))}
                        </div>
                      </div>
                      {admin ? (
                        <Link href={`/admin/players/${p.id}`} className={buttonClass.ghost}>
                          리포트
                        </Link>
                      ) : (
                        <span className="text-xs text-muted">열람 코드 필요</span>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}
        </Card>
      )}

      {!admin && (
        <Notice>
          코드를 잃어버렸다면 캠프 운영진에게 문의하세요. 운영진은 <Link href="/admin" className="font-semibold underline">관리자 로그인</Link> 후 모든 리포트를 볼 수 있습니다.
        </Notice>
      )}
    </div>
  );
}
