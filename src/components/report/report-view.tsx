import Link from "next/link";
import { ageBandLabel } from "@/lib/age";
import { genderLabel, type PlayerReport, type RefMode } from "@/lib/analysis";
import { formatDelta, formatValue, RAW_BY_KEY, type Unit } from "@/lib/metrics";
import { Badge, Card, CardTitle, Notice } from "@/components/ui";
import { TrendChart } from "@/components/charts/trend-chart";
import { PercentileBars } from "./percentile-bars";
import { PositionStrips } from "./position-strips";
import { PrintButton } from "./print-button";

/** 좌·우 원자료 값: 시간은 소수 둘째 자리, 나머지는 정수면 그대로 */
function fmtSide(v: number | null, unit: Unit): string {
  return formatValue(v, unit, unit === "s" ? 2 : v !== null && Number.isInteger(v) ? 0 : 1);
}

interface Props {
  report: PlayerReport;
  admin: boolean;
  /** 캠프·기준 전환 링크의 기준 경로 (/r/코드 또는 /admin/players/id) */
  basePath: string;
  refMode: RefMode;
}

export function ReportView({ report, admin, basePath, refMode }: Props) {
  const { player, current, reference, metrics, trends, sessions } = report;
  const directional = metrics.filter((r) => r.metric.direction !== "neutral");
  const core = directional.filter((r) => r.metric.core);
  const detail = directional.filter((r) => !r.metric.core);
  const neutral = metrics.filter((r) => r.metric.direction === "neutral");
  const bilateral = metrics.filter((r) => r.metric.sources.length === 2);
  const strength = metrics.find((r) => r.tag === "강점");
  const weakness = metrics.find((r) => r.tag === "약점");
  const refN = reference.sessions.length;

  const link = (patch: { camp?: string; ref?: RefMode }) => {
    const q = new URLSearchParams();
    const camp = patch.camp ?? current.camp.id;
    const ref = patch.ref ?? refMode;
    if (camp !== sessions[sessions.length - 1].camp.id) q.set("camp", camp);
    if (ref !== "auto") q.set("ref", ref);
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const flaggedAll = Object.entries(current.flags);

  return (
    <div className="space-y-5">
      {/* 머리글 */}
      <Card accent="navy">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-court">개인 측정 리포트</p>
            <h1 className="mt-0.5 text-3xl font-extrabold tracking-tight text-navy">{player.name}</h1>
            <p className="tabular mt-1 text-sm text-body">
              {genderLabel(player.gender)}
              {" · "}
              {current.age !== null ? `${current.age}세 (${ageBandLabel(current.ageBand)})` : "나이 미입력"}
              {player.grade && ` · ${player.grade}`}
              {player.team && ` · ${player.team}`}
            </p>
            <p className="mt-1 text-sm text-muted">
              측정: <b className="text-ink">{current.camp.name}</b> ({current.camp.date}
              {current.camp.location ? ` · ${current.camp.location}` : ""}) · 참가 {sessions.length}회
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <PrintButton />
            {admin && (
              <p className="no-print text-right text-xs text-muted">
                열람 코드 <b className="tabular text-ink">{player.accessCode}</b>
                <br />
                공유 링크 <code>/r/{player.accessCode}</code>
              </p>
            )}
          </div>
        </div>

        {sessions.length > 1 && (
          <div className="no-print mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
            <span className="self-center text-xs font-semibold text-muted">캠프 선택</span>
            {sessions.map((s) => (
              <Link
                key={s.camp.id}
                href={link({ camp: s.camp.id })}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                  s.camp.id === current.camp.id ? "border-navy bg-navy text-white" : "border-line text-muted hover:text-navy"
                }`}
              >
                {s.camp.name}
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* 요약 */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card card-court px-4 py-3">
          <div className="text-sm text-muted">강점</div>
          <div className="mt-0.5 text-xl font-bold text-ink">
            {strength ? (
              <>
                {strength.metric.label} <span className="tabular text-court">{strength.percentile}점</span>
              </>
            ) : (
              "–"
            )}
          </div>
          {strength && (
            <div className="tabular text-sm text-muted">
              {formatValue(strength.value.value, strength.metric.unit, strength.metric.decimals)} · {reference.label} 100명 중 약{" "}
              {Math.max(1, 100 - (strength.percentile ?? 0))}번째
            </div>
          )}
        </div>
        <div className="card px-4 py-3">
          <div className="text-sm text-muted">보완할 점</div>
          <div className="mt-0.5 text-xl font-bold text-ink">
            {weakness ? (
              <>
                {weakness.metric.label} <span className="tabular text-navy">{weakness.percentile}점</span>
              </>
            ) : (
              "–"
            )}
          </div>
          {weakness && (
            <div className="tabular text-sm text-muted">
              {formatValue(weakness.value.value, weakness.metric.unit, weakness.metric.decimals)} · 기준 평균{" "}
              {formatValue(weakness.ref.mean, weakness.metric.unit, weakness.metric.decimals)}
            </div>
          )}
        </div>
      </div>

      {/* 강·약점 프로필 */}
      <Card accent="court">
        <CardTitle
          sub={
            <>
              {reference.label} 기준 백분위 (n={refN}) · 50점 = 기준 집단의 중간, 100점에 가까울수록 좋음
            </>
          }
          right={
            <div className="no-print flex rounded-lg border border-line p-0.5 text-xs">
              {(
                [
                  ["auto", "같은 나이대"],
                  ["gender", "성별 전체"],
                ] as const
              ).map(([v, l]) => (
                <Link
                  key={v}
                  href={link({ ref: v })}
                  className={`rounded-md px-2.5 py-1.5 font-semibold ${refMode === v ? "bg-navy text-white" : "text-muted hover:text-navy"}`}
                >
                  {l}
                </Link>
              ))}
            </div>
          }
        >
          강·약점 프로필
        </CardTitle>
        {reference.note && (
          <div className="mb-4">
            <Notice>{reference.note}</Notice>
          </div>
        )}
        {refN < 10 && (
          <div className="mb-4">
            <Notice tone="warn">기준 집단이 {refN}명으로 표본이 부족합니다. 백분위는 참고용으로만 보세요.</Notice>
          </div>
        )}
        <h3 className="mb-2 text-sm font-bold text-navy">핵심 지표</h3>
        <PercentileBars rows={core} admin={admin} />
        <h3 className="mt-6 mb-2 text-sm font-bold text-navy">
          세부 지표 <span className="font-normal text-muted">— 스텝·구간 시간 (강·약점 판정에서는 제외)</span>
        </h3>
        <PercentileBars rows={detail} admin={admin} />
        <p className="mt-4 text-xs text-muted">
          백분위 = 기준 집단에서 나보다 기록이 낮은(나쁜) 선수의 비율. 시간·손실처럼 낮을수록 좋은 지표는 뒤집어 계산합니다. 좌우를 따로 잰 지표는 양측 평균.
        </p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 기준 대비 위치 */}
        <Card>
          <CardTitle sub="좋고 나쁨이 없는 지표 — 기준 집단 안에서의 위치">기준 대비 위치</CardTitle>
          <PositionStrips rows={neutral} />
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="size-2.5 rounded-full bg-court" /> 본인
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-3 border-l-2 border-navy" /> 기준 평균
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-4 bg-sub" /> 평균 ±1 표준편차
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-4 rounded-full bg-track" /> 기준 범위
            </span>
          </p>
        </Card>

        {/* 좌우 비교 */}
        <Card>
          <CardTitle sub="양측 평균을 쓰는 지표의 좌·우 값과 차이 (좌 − 우)">좌우 비교</CardTitle>
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="tabular w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  <th className="py-2 pl-4 text-left font-semibold sm:pl-0">지표</th>
                  <th className="py-2 text-right font-semibold">좌</th>
                  <th className="py-2 text-right font-semibold">우</th>
                  <th className="py-2 pr-4 text-right font-semibold sm:pr-0">차이</th>
                </tr>
              </thead>
              <tbody>
                {bilateral.map((r) => {
                  const m = r.metric;
                  return (
                    <tr key={m.key} className="border-b border-line/70">
                      <td className="py-2 pl-4 font-semibold text-ink sm:pl-0">{m.label}</td>
                      <td className="py-2 text-right">{fmtSide(r.value.left, m.unit)}</td>
                      <td className="py-2 text-right">{fmtSide(r.value.right, m.unit)}</td>
                      <td className="py-2 pr-4 text-right font-semibold text-ink sm:pr-0">{formatDelta(r.value.diff, m.unit, m.decimals)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted">한쪽 값이 없거나 측정오류로 제외되면 차이는 표시하지 않고, 평균에는 남은 쪽 값을 씁니다.</p>
        </Card>
      </div>

      {/* 변화 추적 */}
      <Card className="print-break print-split">
        <CardTitle sub={sessions.length > 1 ? `${sessions.length}회 측정 · 첫 측정 대비 최근 변화` : undefined}>변화 추적</CardTitle>
        {sessions.length < 2 ? (
          <Notice>캠프에 2회 이상 참가하면 지표별 변화량과 추이 그래프가 표시됩니다. (현재 {sessions.length}회 측정)</Notice>
        ) : (
          <>
            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
              {trends
                .filter((t) => t.metric.direction !== "neutral" || ["height", "weight"].includes(t.metric.key))
                .map((t) => {
                  const m = t.metric;
                  return (
                    <div key={m.key} className="print-keep border-t border-line pt-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-ink">{m.label}</span>
                        <span className="tabular flex items-center gap-1.5 text-sm font-bold text-ink">
                          {formatDelta(t.deltaTotal, m.unit, m.decimals)}
                          {t.improved === true && <Badge tone="navy">향상</Badge>}
                          {t.improved === false && <Badge>저하</Badge>}
                        </span>
                      </div>
                      <TrendChart
                        data={t.points.map((p) => ({
                          camp: `${p.date.slice(2, 4)}.${p.date.slice(5, 7)}`,
                          title: p.campName,
                          value: p.value,
                          label: formatValue(p.value, m.unit, m.decimals),
                        }))}
                      />
                    </div>
                  );
                })}
            </div>
            <div className="-mx-4 mt-6 overflow-x-auto sm:mx-0">
              <table className="tabular w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th className="py-2 pl-4 text-left font-semibold sm:pl-0">지표</th>
                    {sessions.map((s) => (
                      <th key={s.camp.id} className="py-2 text-right font-semibold">
                        {s.camp.name}
                      </th>
                    ))}
                    <th className="py-2 text-right font-semibold">직전 대비</th>
                    <th className="py-2 pr-4 text-right font-semibold sm:pr-0">첫 측정 대비</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.map((t) => (
                    <tr key={t.metric.key} className="border-b border-line/70">
                      <td className="py-2 pl-4 font-semibold text-ink sm:pl-0">{t.metric.label}</td>
                      {t.points.map((p) => (
                        <td key={p.campId} className="py-2 text-right">
                          {formatValue(p.value, t.metric.unit, t.metric.decimals)}
                        </td>
                      ))}
                      <td className="py-2 text-right">{formatDelta(t.deltaLast, t.metric.unit, t.metric.decimals)}</td>
                      <td className="py-2 pr-4 text-right font-semibold text-ink sm:pr-0">
                        {formatDelta(t.deltaTotal, t.metric.unit, t.metric.decimals)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {admin && flaggedAll.length > 0 && (
        <Card accent="sub" className="no-print">
          <CardTitle sub="관리자에게만 보입니다. 기준표에 걸린 값은 통계와 백분위에서 빠집니다.">측정오류로 제외된 값</CardTitle>
          <ul className="tabular space-y-1 text-sm">
            {flaggedAll.map(([key, rule]) => {
              const raw = RAW_BY_KEY.get(key)!;
              return (
                <li key={key} className="flex flex-wrap items-center gap-2">
                  <Badge tone="danger">측정오류</Badge>
                  <b className="text-ink">{raw.label}</b> {fmtSide(current.raw[key], raw.unit)}
                  <span className="text-muted">— {rule.label} ({rule.op === "lt" ? "<" : ">"} {rule.threshold})</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <p className="text-center text-xs text-muted">
        넥스트레벨 유소년 농구캠프 · 기준 집단: {reference.label} {refN}명 (누적 캠프 데이터) · 출력일 {new Date().toISOString().slice(0, 10)}
      </p>
    </div>
  );
}
