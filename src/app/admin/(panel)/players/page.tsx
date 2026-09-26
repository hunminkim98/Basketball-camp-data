import type { Metadata } from "next";
import Link from "next/link";
import { buildSessions, genderLabel, sortCamps } from "@/lib/analysis";
import { loadDataset } from "@/lib/data";
import { Badge, buttonClass, Card, inputClass, PageTitle } from "@/components/ui";

export const metadata: Metadata = { title: "선수 관리" };

export default async function AdminPlayers(props: PageProps<"/admin/players">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const gender = sp.gender === "M" || sp.gender === "F" ? sp.gender : "";
  const ds = await loadDataset();
  const sessions = buildSessions(ds);
  const order = new Map(sortCamps(ds.camps).map((c, i) => [c.id, i]));
  const byPlayer = new Map<string, typeof sessions>();
  for (const s of sessions) byPlayer.set(s.player.id, [...(byPlayer.get(s.player.id) ?? []), s]);

  // 이름·성별이 같은 선수 = 병합 후보
  const nameCount = new Map<string, number>();
  for (const p of ds.players) nameCount.set(`${p.name}|${p.gender}`, (nameCount.get(`${p.name}|${p.gender}`) ?? 0) + 1);

  const list = ds.players
    .filter((p) => (!q || p.name.includes(q) || p.accessCode.includes(q.toUpperCase()) || (p.team ?? "").includes(q)) && (!gender || p.gender === gender))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return (
    <>
      <PageTitle sub={`${ds.players.length}명 · 이름을 누르면 리포트·수정·병합`}>선수 관리</PageTitle>
      <Card accent="sub" className="!p-4">
        <form className="flex flex-wrap gap-2">
          <input name="q" defaultValue={q} placeholder="이름·팀·열람 코드" className={`${inputClass} max-w-xs`} />
          <select name="gender" defaultValue={gender} className={`${inputClass} w-auto`}>
            <option value="">남녀 전체</option>
            <option value="M">남자부</option>
            <option value="F">여자부</option>
          </select>
          <button className={buttonClass.primary}>검색</button>
        </form>
      </Card>
      <Card>
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="tabular w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pl-4 font-semibold sm:pl-0">이름</th>
                <th className="py-2 font-semibold">성별</th>
                <th className="py-2 font-semibold">생년·학년</th>
                <th className="py-2 font-semibold">소속팀</th>
                <th className="py-2 font-semibold">참가 캠프</th>
                <th className="py-2 pr-4 font-semibold sm:pr-0">열람 코드</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const ss = (byPlayer.get(p.id) ?? []).sort((a, b) => (order.get(a.camp.id) ?? 0) - (order.get(b.camp.id) ?? 0));
                const flags = ss.reduce((a, s) => a + Object.keys(s.flags).length, 0);
                return (
                  <tr key={p.id} className="border-b border-line/70 hover:bg-canvas">
                    <td className="py-2 pl-4 sm:pl-0">
                      <Link href={`/admin/players/${p.id}`} className="font-semibold text-navy hover:underline">
                        {p.name}
                      </Link>
                      {(nameCount.get(`${p.name}|${p.gender}`) ?? 0) > 1 && (
                        <span className="ml-1">
                          <Badge tone="warn">동명이인·병합 후보</Badge>
                        </span>
                      )}
                      {flags > 0 && (
                        <span className="ml-1">
                          <Badge tone="danger">측정오류 {flags}</Badge>
                        </span>
                      )}
                    </td>
                    <td>{genderLabel(p.gender)}</td>
                    <td>
                      {p.birthYear ?? p.grade ?? <span className="text-muted">나이 미입력</span>}
                    </td>
                    <td>{p.team ?? "–"}</td>
                    <td>{ss.length}회</td>
                    <td className="pr-4 font-mono text-xs sm:pr-0">{p.accessCode}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
