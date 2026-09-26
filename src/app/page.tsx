import Link from "next/link";
import { AGE_BANDS, AGE_UNKNOWN, ageBandLabel } from "@/lib/age";
import {
  buildSessions,
  filterSessions,
  MIN_SAMPLE,
  participationByCamp,
  sortCamps,
  summarizeProfile,
  summarizeRaw,
  type MetricSummaryRow,
} from "@/lib/analysis";
import { loadDataset } from "@/lib/data";
import { CATEGORIES, formatValue, statDecimals, unitSuffix, type Unit } from "@/lib/metrics";
import { histogram } from "@/lib/stats";
import { isAdmin } from "@/lib/session";
import { FilterBar } from "@/components/filter-bar";
import { HistogramChart, type HistogramDatum } from "@/components/charts/histogram-chart";
import { ParticipationChart } from "@/components/charts/participation-chart";
import { Badge, Card, CardTitle, Notice, PageTitle, SampleBadge, StatTile } from "@/components/ui";

function one(v: string | string[] | undefined, fallback: string): string {
  return typeof v === "string" && v ? v : fallback;
}

function fmtStat(v: number | null, unit: Unit): string {
  return formatValue(v, unit, statDecimals(unit));
}

/** 범위(최솟값~최댓값)는 정수면 소수점 없이 */
function fmtRange(v: number | null, unit: Unit): string {
  return v !== null && Number.isInteger(v) ? formatValue(v, unit, 0) : fmtStat(v, unit);
}

function binLabel(v: number, unit: Unit): string {
  const d = unit === "s" ? 2 : Number.isInteger(v) ? 0 : 1;
  return v.toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default async function DashboardPage(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const [ds, admin] = await Promise.all([loadDataset(), isAdmin()]);
  const all = buildSessions(ds);
  const camps = sortCamps(ds.camps);

  const campId = one(sp.camp, "all");
  const gender = one(sp.gender, "all");
  const ageBand = one(sp.age, "all");
  const view = one(sp.view, "profile");

  const sessions = filterSessions(all, { campId, gender, ageBand });
  const rows = view === "raw" ? summarizeRaw(sessions) : summarizeProfile(sessions);
  const selectedKey = one(sp.metric, view === "raw" ? "jump_height" : "jump_height");
  const selected = rows.find((r) => r.key === selectedKey) ?? rows[0];

  const participation = participationByCamp(camps, filterSessions(all, { gender, ageBand }));
  const uniquePlayers = new Set(sessions.map((s) => s.player.id)).size;
  const ageCounts = (key: string) => filterSessions(all, { campId, gender, ageBand: key }).length;

  const campLabel = campId === "all" ? "전체 누적" : (camps.find((c) => c.id === campId)?.name ?? "캠프");
  const genderLabel = gender === "M" ? "남자부" : gender === "F" ? "여자부" : "남녀 전체";
  const groupLabel = [campLabel, genderLabel, ageBand === "all" ? "전 연령" : ageBandLabel(ageBand)].join(" · ");

  const bins = histogram(selected.values);
  const mean = selected.summary.mean;
  const histData: HistogramDatum[] = bins.map((b, i) => ({
    label: `${binLabel(b.x0, selected.unit)}–${binLabel(b.x1, selected.unit)}`,
    range: `${binLabel(b.x0, selected.unit)}–${binLabel(b.x1, selected.unit)}${unitSuffix(selected.unit)}`,
    count: b.count,
    highlight: mean !== null && mean >= b.x0 && (mean < b.x1 || i === bins.length - 1),
  }));

  const hrefWith = (patch: Record<string, string>) => {
    const q = new URLSearchParams();
    const base: Record<string, string> = { camp: campId, gender, age: ageBand, view, metric: selected.key };
    for (const [k, v] of Object.entries({ ...base, ...patch })) if (v && v !== "all") q.set(k, v);
    return `/?${q.toString()}`;
  };

  const grouped: [string, MetricSummaryRow[]][] =
    view === "raw" ? [["원자료 (좌·우 개별)", rows]] : CATEGORIES.map((c) => [c, rows.filter((r) => r.category === c)]);

  return (
    <div className="space-y-5">
      <PageTitle
        sub="누적된 측정 데이터로 만든 나이대·성별 기준값 — 평균, 중앙값, 표준편차, 분포"
        right={
          admin ? (
            <Link href="/admin/import" className="text-sm font-semibold text-court hover:underline">
              + 새 캠프 데이터 업로드
            </Link>
          ) : null
        }
      >
        기준 데이터
      </PageTitle>

      <Card accent="sub" className="!p-4">
        <FilterBar
          filters={[
            {
              name: "camp",
              label: "캠프",
              value: campId,
              options: [{ value: "all", label: "전체 누적" }, ...camps.map((c) => ({ value: c.id, label: `${c.name}` }))],
            },
            {
              name: "gender",
              label: "성별",
              value: gender,
              options: [
                { value: "all", label: "남녀 전체" },
                { value: "M", label: "남자부" },
                { value: "F", label: "여자부" },
              ],
            },
            {
              name: "age",
              label: "나이대",
              value: ageBand,
              options: [
                { value: "all", label: "전 연령" },
                ...[...AGE_BANDS, AGE_UNKNOWN].map((b) => ({ value: b.key, label: `${b.label} (${ageCounts(b.key)}명)` })),
              ],
            },
          ]}
        />
      </Card>

      {ds.camps.length === 0 ? (
        <Notice>
          아직 데이터가 없습니다. {admin ? <Link href="/admin/import" className="font-semibold underline">엑셀 업로드</Link> : "관리자가 측정 엑셀을 업로드하면"} 기준 데이터가 만들어집니다.
        </Notice>
      ) : (
        <>
          {sessions.length < MIN_SAMPLE && (
            <Notice tone="warn">
              선택한 그룹의 측정 인원이 {sessions.length}명입니다. n이 {MIN_SAMPLE} 미만이면 기준값으로 쓰기에 표본이 부족합니다.
            </Notice>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="측정 인원" value={`${sessions.length}명`} note={groupLabel} />
            <StatTile label="선수 수" value={`${uniquePlayers}명`} note="같은 선수 재측정은 1명으로" />
            <StatTile label="캠프" value={`${campId === "all" ? camps.length : 1}회`} note={campId === "all" ? "누적" : campLabel} />
            <StatTile
              label="측정오류 제외"
              value={`${sessions.reduce((a, s) => a + Object.keys(s.flags).length, 0)}건`}
              note="기준표에 걸린 값은 통계에서 제외"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-5">
            <Card className="lg:col-span-3" accent="court" id="dist">
              <CardTitle
                sub={
                  <>
                    {groupLabel} · n={selected.summary.n} · 평균이 속한 구간을 강조
                  </>
                }
                right={<SampleBadge n={selected.summary.n} />}
              >
                {selected.label} 분포
              </CardTitle>
              {selected.values.length ? (
                <HistogramChart data={histData} />
              ) : (
                <p className="py-10 text-center text-sm text-muted">측정값이 없습니다.</p>
              )}
              <dl className="tabular mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-4">
                {[
                  ["평균", fmtStat(selected.summary.mean, selected.unit)],
                  ["중앙값", fmtStat(selected.summary.median, selected.unit)],
                  ["표준편차", fmtStat(selected.summary.sd, selected.unit)],
                  ["n", `${selected.summary.n}명`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-muted">{k}</dt>
                    <dd className="text-lg font-bold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="lg:col-span-2">
              <CardTitle sub={`캠프별 누적 선수 수 · ${genderLabel}`}>누적 참가자 추이</CardTitle>
              <ParticipationChart
                data={participation.map((p) => ({
                  camp: p.camp.name,
                  date: p.camp.date,
                  cumulative: p.cumulativePlayers,
                  participants: p.participants,
                  newPlayers: p.newPlayers,
                }))}
              />
              <ul className="tabular mt-3 space-y-1 border-t border-line pt-3 text-sm">
                {participation.map((p) => (
                  <li key={p.camp.id} className="flex justify-between gap-2">
                    <span className="text-muted">{p.camp.name}</span>
                    <span>
                      참가 <b className="text-ink">{p.participants}명</b> · 신규 {p.newPlayers}명
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <Card>
            <CardTitle
              sub="행을 누르면 위에 분포가 표시됩니다. 좌우를 따로 잰 지표는 양측 평균."
              right={
                <div className="no-print flex rounded-lg border border-line p-0.5 text-sm">
                  {[
                    ["profile", "분석 지표"],
                    ["raw", "좌·우 개별 (26개)"],
                  ].map(([v, l]) => (
                    <Link
                      key={v}
                      href={hrefWith({ view: v, metric: "jump_height" })}
                      className={`rounded-md px-3 py-1.5 font-semibold ${view === v ? "bg-navy text-white" : "text-muted hover:text-navy"}`}
                    >
                      {l}
                    </Link>
                  ))}
                </div>
              }
            >
              지표별 기준값
            </CardTitle>
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="tabular w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="py-2 pl-4 font-semibold sm:pl-0">지표</th>
                    <th className="py-2 text-right font-semibold">n</th>
                    <th className="py-2 text-right font-semibold">평균</th>
                    <th className="py-2 text-right font-semibold">중앙값</th>
                    <th className="py-2 text-right font-semibold">표준편차</th>
                    <th className="py-2 pr-4 text-right font-semibold sm:pr-0">범위</th>
                  </tr>
                </thead>
                {grouped.map(([cat, list]) => (
                  <tbody key={cat}>
                    <tr>
                      <td colSpan={6} className="pt-4 pb-1 pl-4 text-xs font-bold text-navy sm:pl-0">
                        {cat}
                      </td>
                    </tr>
                    {list.map((r) => {
                      const active = r.key === selected.key;
                      return (
                        <tr key={r.key} className={`border-b border-line/70 ${active ? "bg-court-soft" : "hover:bg-canvas"}`}>
                          <td className="py-2 pl-4 sm:pl-0">
                            <Link href={`${hrefWith({ metric: r.key })}#dist`} scroll={false} className="flex items-center gap-2 font-semibold text-ink">
                              {active && <span aria-hidden className="size-2 rounded-full bg-court" />}
                              {r.label}
                              <SampleBadge n={r.summary.n} />
                            </Link>
                          </td>
                          <td className="py-2 text-right">{r.summary.n}</td>
                          <td className="py-2 text-right font-semibold text-ink">{fmtStat(r.summary.mean, r.unit)}</td>
                          <td className="py-2 text-right">{fmtStat(r.summary.median, r.unit)}</td>
                          <td className="py-2 text-right">{fmtStat(r.summary.sd, r.unit)}</td>
                          <td className="py-2 pr-4 text-right text-muted sm:pr-0">
                            {r.summary.n ? `${fmtRange(r.summary.min, r.unit)} ~ ${fmtRange(r.summary.max, r.unit)}` : "–"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>
            <p className="mt-3 text-xs text-muted">
              <Badge tone="warn">표본 부족</Badge> n이 {MIN_SAMPLE} 미만인 그룹. 표준편차는 표본 표준편차(n−1). 측정오류 기준표에 걸린 값은 제외.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
