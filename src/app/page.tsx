import type { Metadata } from "next";
import Link from "next/link";
import { AGE_BANDS, AGE_UNKNOWN, ageBandLabel } from "@/lib/age";
import {
  buildSessions,
  filterSessions,
  MIN_SAMPLE,
  participationByCamp,
  profileValues,
  sortCamps,
  summarizeProfile,
  summarizeRaw,
  type MetricSummaryRow,
} from "@/lib/analysis";
import { loadDataset } from "@/lib/data";
import { CATEGORIES, formatValue, PROFILE_BY_KEY, statDecimals, unitSuffix, type Unit } from "@/lib/metrics";
import { histogram, mean as avg, type Bin } from "@/lib/stats";
import { isAdmin } from "@/lib/session";
import { FilterBar } from "@/components/filter-bar";
import { HistogramChart, type HistogramDatum } from "@/components/charts/histogram-chart";
import { ParticipationChart } from "@/components/charts/participation-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { BoxStrip } from "@/components/dashboard/box-strip";
import { Dumbbell, type DumbbellRow } from "@/components/dashboard/dumbbell";
import { GenderSplit } from "@/components/dashboard/gender-split";
import { HBarList } from "@/components/dashboard/hbar-list";
import { MiniHistogram } from "@/components/dashboard/mini-histogram";
import { TipLayer } from "@/components/dashboard/tip-layer";
import { Badge, Card, CardTitle, Notice, PageTitle, SampleBadge } from "@/components/ui";

export const metadata: Metadata = { title: "대시보드" };

function one(v: string | string[] | undefined, fallback: string): string {
  return typeof v === "string" && v ? v : fallback;
}

function fmtStat(v: number | null, unit: Unit): string {
  return formatValue(v, unit, statDecimals(unit));
}

/** 정수면 소수점 없이, 아니면 통계 자릿수 */
function fmtAuto(v: number | null, unit: Unit): string {
  return v !== null && Number.isInteger(v) ? formatValue(v, unit, 0) : fmtStat(v, unit);
}

function num(v: number, unit: Unit): string {
  const d = unit === "s" ? 2 : Number.isInteger(v) ? 0 : 1;
  return v.toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function binRange(b: Bin, unit: Unit): string {
  return `${num(b.x0, unit)}–${num(b.x1, unit)}${unitSuffix(unit)}`;
}

/** 평균이 속한 구간 */
function meanBin(bins: Bin[], m: number | null): number {
  if (m === null) return -1;
  return bins.findIndex((b, i) => m >= b.x0 && (m < b.x1 || i === bins.length - 1));
}

const DIRECTION_HINT = { higher: "높을수록 좋음", lower: "낮을수록 좋음", neutral: "" } as const;

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
  const rows = summarizeProfile(sessions);
  const selected = rows.find((r) => r.key === one(sp.metric, "jump_height")) ?? rows[0];
  const selectedMetric = PROFILE_BY_KEY.get(selected.key)!;
  const tableRows = view === "raw" ? summarizeRaw(sessions) : rows;

  // 참가자 구성
  const composition = filterSessions(all, { campId, ageBand });
  const male = composition.filter((s) => s.player.gender === "M").length;
  const female = composition.length - male;
  const uniquePlayers = new Set(sessions.map((s) => s.player.id)).size;
  const bandItems = [...AGE_BANDS, AGE_UNKNOWN]
    .map((b) => ({ ...b, n: filterSessions(all, { campId, gender, ageBand: b.key }).length }))
    .filter((b) => b.n > 0);
  const participation = participationByCamp(camps, filterSessions(all, { gender, ageBand }));

  // 선택 지표 상세
  const bins = histogram(selected.values);
  const hi = meanBin(bins, selected.summary.mean);
  const histData: HistogramDatum[] = bins.map((b, i) => ({
    label: `${num(b.x0, selected.unit)}–${num(b.x1, selected.unit)}`,
    range: binRange(b, selected.unit),
    count: b.count,
    highlight: i === hi,
  }));
  const campTrend = camps
    .map((c) => {
      const v = avg(profileValues(filterSessions(all, { campId: c.id, gender, ageBand }), selectedMetric));
      return { camp: `${c.date.slice(2, 4)}.${c.date.slice(5, 7)}`, title: c.name, value: v, label: fmtStat(v, selected.unit) };
    })
    .filter((p) => p.value !== null);
  const bandMeans = [...AGE_BANDS, AGE_UNKNOWN]
    .map((b) => ({ b, values: profileValues(filterSessions(all, { campId, gender, ageBand: b.key }), selectedMetric) }))
    .filter((x) => x.values.length > 0 && x.b.key !== AGE_UNKNOWN.key);

  // 남녀 비교 (성별 필터가 "전체"일 때)
  const showGender = gender === "all" && male > 0 && female > 0;
  const dumbbellRows: DumbbellRow[] = showGender
    ? rows.map((r) => {
        const m = PROFILE_BY_KEY.get(r.key)!;
        const mv = profileValues(filterSessions(all, { campId, ageBand, gender: "M" }), m);
        const fv = profileValues(filterSessions(all, { campId, ageBand, gender: "F" }), m);
        const both = [...mv, ...fv];
        return {
          key: r.key,
          label: r.label,
          male: avg(mv),
          female: avg(fv),
          min: Math.min(...both),
          max: Math.max(...both),
          maleText: fmtStat(avg(mv), r.unit),
          femaleText: fmtStat(avg(fv), r.unit),
          note: DIRECTION_HINT[m.direction] || undefined,
        };
      })
    : [];

  const campLabel = campId === "all" ? "전체 누적" : (camps.find((c) => c.id === campId)?.name ?? "캠프");
  const genderLabel = gender === "M" ? "남자부" : gender === "F" ? "여자부" : "남녀 전체";
  const groupLabel = [campLabel, genderLabel, ageBand === "all" ? "전 연령" : ageBandLabel(ageBand)].join(" · ");

  const hrefWith = (patch: Record<string, string>) => {
    const q = new URLSearchParams();
    const base: Record<string, string> = { camp: campId, gender, age: ageBand, view, metric: selected.key };
    for (const [k, v] of Object.entries({ ...base, ...patch })) if (v && v !== "all") q.set(k, v);
    return `/?${q.toString()}`;
  };

  const grouped: [string, MetricSummaryRow[]][] =
    view === "raw" ? [["원자료 (좌·우 개별)", tableRows]] : CATEGORIES.map((c) => [c, tableRows.filter((r) => r.category === c)]);

  return (
    <div className="space-y-5">
      <PageTitle
        sub="누적 측정 데이터로 본 나이대·성별 기준값과 분포"
        right={
          admin ? (
            <Link href="/admin/import" className="text-sm font-semibold text-court hover:underline">
              + 새 캠프 데이터 업로드
            </Link>
          ) : null
        }
      >
        대시보드
      </PageTitle>

      <Card accent="sub" className="!p-4">
        <FilterBar
          filters={[
            {
              name: "camp",
              label: "캠프",
              value: campId,
              options: [{ value: "all", label: "전체 누적" }, ...camps.map((c) => ({ value: c.id, label: c.name }))],
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
              options: [{ value: "all", label: "전 연령" }, ...[...AGE_BANDS, AGE_UNKNOWN].map((b) => ({ value: b.key, label: b.label }))],
            },
          ]}
        />
      </Card>

      {ds.camps.length === 0 ? (
        <Notice>
          아직 데이터가 없습니다.{" "}
          {admin ? (
            <Link href="/admin/import" className="font-semibold underline">
              엑셀 업로드
            </Link>
          ) : (
            "관리자가 측정 엑셀을 업로드하면"
          )}{" "}
          대시보드가 채워집니다.
        </Notice>
      ) : (
        <TipLayer className="space-y-5">
          {sessions.length < MIN_SAMPLE && (
            <Notice tone="warn">
              선택한 그룹의 측정 인원이 {sessions.length}명입니다. 10명 미만이면 기준값으로 쓰기에 표본이 부족합니다.
            </Notice>
          )}

          {/* ── 1. 참가자 ── */}
          <div className="grid gap-5 md:grid-cols-3">
            <Card>
              <CardTitle sub={groupLabel}>참가자</CardTitle>
              <div className="flex items-baseline gap-2">
                <span className="tabular text-5xl font-extrabold tracking-tight text-navy">{sessions.length}</span>
                <span className="text-lg font-bold text-navy">명 측정</span>
              </div>
              <p className="mt-1 mb-4 text-sm text-muted">
                선수 {uniquePlayers}명 · 캠프 {campId === "all" ? camps.length : 1}회
              </p>
              <GenderSplit male={male} female={female} />
            </Card>

            <Card>
              <CardTitle sub="측정 당시 나이 기준">나이대 구성</CardTitle>
              <HBarList
                items={bandItems.map((b) => ({
                  key: b.key,
                  label: b.label,
                  value: b.n,
                  display: `${b.n}명`,
                  highlight: b.key === ageBand,
                  muted: b.key === AGE_UNKNOWN.key,
                }))}
              />
              {bandItems.length === 1 && bandItems[0].key === AGE_UNKNOWN.key && (
                <p className="mt-4 text-xs text-muted">관리자 화면에서 생년을 입력하면 나이대별로 나뉘어 표시됩니다.</p>
              )}
            </Card>

            <Card>
              <CardTitle sub={`캠프별 누적 선수 · ${genderLabel}`}>참가자 추이</CardTitle>
              <ParticipationChart
                data={participation.map((p) => ({
                  camp: p.camp.name,
                  date: p.camp.date,
                  cumulative: p.cumulativePlayers,
                  participants: p.participants,
                  newPlayers: p.newPlayers,
                }))}
              />
            </Card>
          </div>

          {/* ── 2. 지표 한눈에 ── */}
          <Card>
            <CardTitle sub="막대 = 인원 분포 · 오렌지 = 평균이 속한 구간 · 카드를 누르면 아래에 자세히 표시">
              지표 한눈에 보기
            </CardTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {rows.map((r) => {
                const m = PROFILE_BY_KEY.get(r.key)!;
                const b = histogram(r.values, 10);
                const active = r.key === selected.key;
                return (
                  <Link
                    key={r.key}
                    href={`${hrefWith({ metric: r.key })}#detail`}
                    scroll={false}
                    className={`group rounded-lg border bg-white p-3 transition-colors ${
                      active ? "border-court ring-2 ring-court/20" : "border-line hover:border-navy/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[11px] font-semibold text-muted">{m.category}</span>
                      <SampleBadge n={r.summary.n} />
                    </div>
                    <div className="text-sm font-semibold text-ink">{r.label}</div>
                    <div className="tabular mt-0.5 text-lg font-bold text-navy">{fmtStat(r.summary.mean, r.unit)}</div>
                    <div className="mt-2">
                      <MiniHistogram bins={b} highlight={meanBin(b, r.summary.mean)} label={(x) => binRange(x, r.unit)} />
                    </div>
                    <div className="mt-1 h-4 text-[11px] text-muted">
                      {m.direction === "higher" ? "↑ " : m.direction === "lower" ? "↓ " : ""}
                      {DIRECTION_HINT[m.direction]}
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          {/* ── 3. 선택 지표 상세 ── */}
          <Card accent="court" id="detail" className="scroll-mt-20">
            <CardTitle
              sub={
                <>
                  {groupLabel} · {selected.summary.n}명
                  {selectedMetric.direction !== "neutral" && ` · ${DIRECTION_HINT[selectedMetric.direction]}`}
                </>
              }
              right={<SampleBadge n={selected.summary.n} />}
            >
              {selected.label}
            </CardTitle>
            {selected.values.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted">측정값이 없습니다.</p>
            ) : (
              <div className="grid gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <h3 className="mb-1 text-sm font-bold text-ink">분포</h3>
                  <p className="mb-2 text-xs text-muted">막대 = 구간별 인원 · 오렌지 = 평균 {fmtStat(selected.summary.mean, selected.unit)}이 속한 구간</p>
                  <HistogramChart data={histData} />
                </div>
                <div className="space-y-6 lg:col-span-2">
                  <div>
                    <h3 className="mb-1 text-sm font-bold text-ink">선수별 위치</h3>
                    <p className="mb-1 text-xs text-muted">점 = 선수 1명 · 상자 = 가운데 50% · 오렌지 선 = 중앙값</p>
                    <BoxStrip values={selected.values} format={(v) => fmtAuto(v, selected.unit)} />
                  </div>
                  {campTrend.length >= 2 && (
                    <div>
                      <h3 className="mb-1 text-sm font-bold text-ink">캠프별 평균 추이</h3>
                      <TrendChart data={campTrend} />
                    </div>
                  )}
                  {bandMeans.length >= 2 && (
                    <div>
                      <h3 className="mb-2 text-sm font-bold text-ink">나이대별 평균</h3>
                      <HBarList
                        items={bandMeans.map(({ b, values }) => ({
                          key: b.key,
                          label: b.label,
                          value: avg(values)!,
                          display: `${fmtStat(avg(values), selected.unit)} · ${values.length}명`,
                          highlight: b.key === ageBand,
                        }))}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* ── 4. 남녀 비교 ── */}
          {showGender && (
            <Card>
              <CardTitle sub={`${campLabel} · ${ageBand === "all" ? "전 연령" : ageBandLabel(ageBand)} · 점에 마우스를 올리면 평균값`}>
                남녀 평균 비교
              </CardTitle>
              <Dumbbell rows={dumbbellRows} />
            </Card>
          )}

          {/* ── 5. 상세 수치 (접힘) ── */}
          <details className="card card-sub group" open={view === "raw" || undefined}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 sm:p-5">
              <span>
                <span className="text-base font-bold text-ink sm:text-lg">상세 수치 표</span>
                <span className="ml-2 text-sm text-muted">평균 · 중앙값 · 표준편차 · 범위</span>
              </span>
              <span aria-hidden className="text-muted transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="px-4 pb-4 sm:px-5 sm:pb-5">
              <div className="mb-3 flex justify-end">
                <div className="flex rounded-lg border border-line p-0.5 text-sm">
                  {[
                    ["profile", "분석 지표"],
                    ["raw", "좌·우 개별 (26개)"],
                  ].map(([v, l]) => (
                    <Link
                      key={v}
                      href={hrefWith({ view: v })}
                      scroll={false}
                      className={`rounded-md px-3 py-1.5 font-semibold ${view === v ? "bg-navy text-white" : "text-muted hover:text-navy"}`}
                    >
                      {l}
                    </Link>
                  ))}
                </div>
              </div>
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
                      {list.map((r) => (
                        <tr key={r.key} className="border-b border-line/70">
                          <td className="py-2 pl-4 font-semibold text-ink sm:pl-0">
                            {r.label} <SampleBadge n={r.summary.n} />
                          </td>
                          <td className="py-2 text-right">{r.summary.n}</td>
                          <td className="py-2 text-right font-semibold text-ink">{fmtStat(r.summary.mean, r.unit)}</td>
                          <td className="py-2 text-right">{fmtStat(r.summary.median, r.unit)}</td>
                          <td className="py-2 text-right">{fmtStat(r.summary.sd, r.unit)}</td>
                          <td className="py-2 pr-4 text-right text-muted sm:pr-0">
                            {r.summary.n ? `${fmtAuto(r.summary.min, r.unit)} ~ ${fmtAuto(r.summary.max, r.unit)}` : "–"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  ))}
                </table>
              </div>
              <p className="mt-3 text-xs text-muted">
                <Badge tone="warn">표본 부족</Badge> n이 {MIN_SAMPLE} 미만인 그룹. 표준편차는 표본 표준편차(n−1). 좌우를 따로 잰 지표는 양측 평균.
              </p>
            </div>
          </details>
        </TipLayer>
      )}
    </div>
  );
}
