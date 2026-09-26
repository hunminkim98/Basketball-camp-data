import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildReport, genderLabel } from "@/lib/analysis";
import { loadDataset } from "@/lib/data";
import { readReportParams } from "@/lib/lookup";
import { ReportView } from "@/components/report/report-view";
import { Badge, buttonClass, Card, CardTitle, inputClass, Notice } from "@/components/ui";
import { deletePlayer, mergePlayers, regenerateCode, updatePlayer } from "../../../actions";

export const metadata: Metadata = { title: "선수 상세" };

export default async function AdminPlayerPage(props: PageProps<"/admin/players/[id]">) {
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
  const ds = await loadDataset();
  const player = ds.players.find((p) => p.id === id);
  if (!player) notFound();
  const { campId, refMode } = readReportParams(sp);
  const report = buildReport(ds, player.id, { campId, refMode });

  const campCount = new Map<string, number>();
  const seen = new Set<string>();
  for (const m of ds.measurements) {
    const k = `${m.playerId}|${m.campId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    campCount.set(m.playerId, (campCount.get(m.playerId) ?? 0) + 1);
  }
  const others = ds.players
    .filter((p) => p.id !== player.id && p.gender === player.gender)
    .sort((a, b) => Number(b.name === player.name) - Number(a.name === player.name) || a.name.localeCompare(b.name, "ko"));

  return (
    <div className="space-y-5">
      {sp.saved && <Notice>저장했습니다.</Notice>}
      {sp.merged && <Notice>병합했습니다. 두 선수의 캠프 기록이 하나로 합쳐졌습니다.</Notice>}
      {sp.code && <Notice tone="warn">열람 코드를 새로 만들었습니다. 이전 링크는 더 이상 열리지 않습니다.</Notice>}

      <div className="no-print grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle sub="생년(또는 학년)을 넣으면 측정 당시 나이와 나이대 기준이 계산됩니다.">선수 정보</CardTitle>
          <form action={updatePlayer} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={player.id} />
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">이름</span>
              <input name="name" defaultValue={player.name} required className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">성별</span>
              <select name="gender" defaultValue={player.gender} className={inputClass}>
                <option value="M">남</option>
                <option value="F">여</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">생년 (예: 2014)</span>
              <input name="birthYear" type="number" min={1990} max={2030} defaultValue={player.birthYear ?? ""} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted">학년 (예: 초6, 중1)</span>
              <input name="grade" defaultValue={player.grade ?? ""} className={inputClass} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-muted">소속팀</span>
              <input name="team" defaultValue={player.team ?? ""} className={inputClass} />
            </label>
            <div className="sm:col-span-2">
              <button className={buttonClass.primary}>저장</button>
            </div>
          </form>
        </Card>

        <div className="space-y-5">
          <Card accent="court">
            <CardTitle>리포트 공유</CardTitle>
            <p className="text-sm text-muted">열람 코드</p>
            <p className="font-mono text-2xl font-bold tracking-wider text-ink">{player.accessCode}</p>
            <p className="mt-1 text-xs break-all text-muted">링크: /r/{player.accessCode}</p>
            <form action={regenerateCode} className="mt-3">
              <input type="hidden" name="id" value={player.id} />
              <button className={buttonClass.ghost}>코드 새로 만들기</button>
            </form>
          </Card>

          <Card accent="sub">
            <CardTitle sub="선택한 선수의 기록을 이 선수로 옮기고 그 선수는 삭제합니다. 같은 캠프 기록이 겹치면 이 선수 기록을 남깁니다.">
              선수 병합
            </CardTitle>
            <form action={mergePlayers} className="space-y-2">
              <input type="hidden" name="keepId" value={player.id} />
              <select name="removeId" required className={inputClass} defaultValue="">
                <option value="" disabled>
                  합칠 선수 선택 ({genderLabel(player.gender)})
                </option>
                {others.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name === player.name ? "★ " : ""}
                    {p.name} {p.birthYear ? `${p.birthYear}년생` : ""} {p.team ?? ""} · {campCount.get(p.id) ?? 0}회
                  </option>
                ))}
              </select>
              <button className={buttonClass.ghost}>이 선수로 병합</button>
            </form>
          </Card>

          <Card accent="sub">
            <form action={deletePlayer} className="flex items-center justify-between gap-2">
              <input type="hidden" name="id" value={player.id} />
              <span className="text-sm text-muted">선수와 모든 측정값 삭제</span>
              <button className={buttonClass.danger}>삭제</button>
            </form>
          </Card>
        </div>
      </div>

      {report ? (
        <ReportView report={report} admin basePath={`/admin/players/${player.id}`} refMode={refMode} />
      ) : (
        <Card>
          <Badge>측정 기록 없음</Badge>
        </Card>
      )}
    </div>
  );
}
