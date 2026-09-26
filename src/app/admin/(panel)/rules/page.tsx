import type { Metadata } from "next";
import Link from "next/link";
import { buildSessions } from "@/lib/analysis";
import { loadDataset } from "@/lib/data";
import { formatValue, RAW_BY_KEY, RAW_METRICS } from "@/lib/metrics";
import { Badge, buttonClass, Card, CardTitle, inputClass, Notice, PageTitle } from "@/components/ui";
import { saveRules } from "../../actions";

export const metadata: Metadata = { title: "측정오류 기준표" };

/** 좌·우 짝 지표는 한 규칙으로 묶어 고를 수 있게 */
const METRIC_CHOICES = (() => {
  const out: { value: string; label: string }[] = [];
  const used = new Set<string>();
  for (const m of RAW_METRICS) {
    if (used.has(m.key)) continue;
    const pairKey = m.key.endsWith("_l") ? m.key.replace(/_l$/, "_r") : null;
    if (pairKey && RAW_BY_KEY.has(pairKey)) {
      used.add(pairKey);
      out.push({ value: `${m.key},${pairKey}`, label: `${m.label.replace(/^좌 |좌$/g, "").trim()} (좌·우)` });
    } else out.push({ value: m.key, label: m.label });
    used.add(m.key);
  }
  return out;
})();

export default async function RulesPage(props: PageProps<"/admin/rules">) {
  const sp = await props.searchParams;
  const ds = await loadDataset();
  const flagged = buildSessions(ds).flatMap((s) =>
    Object.entries(s.flags).map(([key, rule]) => ({ s, key, rule })),
  );

  return (
    <>
      <PageTitle sub="물리적으로 불가능한 값을 자동 표시합니다. 표시된 값은 통계·백분위에서 빠지고 관리자 화면에만 보입니다.">
        측정오류 기준표
      </PageTitle>
      {sp.saved && <Notice>저장했습니다. 모든 통계가 새 기준으로 다시 계산됩니다.</Notice>}
      <Card accent="court">
        <form action={saveRules} className="space-y-3">
          {ds.rules.map((r) => (
            <div key={r.id} className="grid items-end gap-2 rounded-lg border border-line p-3 sm:grid-cols-[auto_2fr_1fr_1fr_2fr_auto]">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" name={`enabled:${r.id}`} defaultChecked={r.enabled} className="size-5 accent-[var(--color-navy)]" />
                사용
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">{r.metricKeys.map((k) => RAW_BY_KEY.get(k)?.label ?? k).join(" · ")}</span>
                <input name={`label:${r.id}`} defaultValue={r.label} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">조건</span>
                <select name={`op:${r.id}`} defaultValue={r.op} className={inputClass}>
                  <option value="lt">미만이면 오류 (&lt;)</option>
                  <option value="gt">초과하면 오류 (&gt;)</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">기준값 ({RAW_BY_KEY.get(r.metricKeys[0])?.unit})</span>
                <input name={`threshold:${r.id}`} type="number" step="any" defaultValue={r.threshold} className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted">메모</span>
                <input name={`note:${r.id}`} defaultValue={r.note ?? ""} className={inputClass} />
              </label>
              <label className="flex items-center gap-1 pb-3 text-xs text-danger">
                <input type="checkbox" name={`delete:${r.id}`} /> 삭제
              </label>
            </div>
          ))}
          <div className="grid items-end gap-2 rounded-lg border border-dashed border-line p-3 sm:grid-cols-[2fr_1fr_1fr_2fr]">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-navy">+ 새 기준 추가 — 지표</span>
              <select name="new:metric" defaultValue="" className={inputClass}>
                <option value="">선택 안 함</option>
                {METRIC_CHOICES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">조건</span>
              <select name="new:op" defaultValue="gt" className={inputClass}>
                <option value="lt">미만 (&lt;)</option>
                <option value="gt">초과 (&gt;)</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">기준값</span>
              <input name="new:threshold" type="number" step="any" className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">이름 (선택)</span>
              <input name="new:label" className={inputClass} />
            </label>
          </div>
          <button className={buttonClass.primary}>기준표 저장</button>
        </form>
      </Card>

      <Card>
        <CardTitle sub={`현재 기준으로 표시된 값 ${flagged.length}건`}>측정오류로 표시된 값</CardTitle>
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <table className="tabular w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="py-2 pl-4 font-semibold sm:pl-0">선수</th>
                <th className="py-2 font-semibold">캠프</th>
                <th className="py-2 font-semibold">지표</th>
                <th className="py-2 text-right font-semibold">값</th>
                <th className="py-2 pr-4 pl-4 font-semibold sm:pr-0">판정</th>
              </tr>
            </thead>
            <tbody>
              {flagged.map(({ s, key, rule }) => {
                const raw = RAW_BY_KEY.get(key)!;
                return (
                  <tr key={`${s.player.id}${s.camp.id}${key}`} className="border-b border-line/70">
                    <td className="py-2 pl-4 sm:pl-0">
                      <Link href={`/admin/players/${s.player.id}`} className="font-semibold text-navy hover:underline">
                        {s.player.name}
                      </Link>{" "}
                      <span className="text-muted">{s.player.gender === "M" ? "남" : "여"}</span>
                    </td>
                    <td>{s.camp.name}</td>
                    <td>{raw.label}</td>
                    <td className="text-right font-bold text-danger">{formatValue(s.raw[key], raw.unit, raw.unit === "s" ? 2 : 0)}</td>
                    <td className="pr-4 pl-4 sm:pr-0">
                      <Badge tone="danger">
                        {rule.op === "lt" ? "<" : ">"} {rule.threshold}
                      </Badge>{" "}
                      <span className="text-xs text-muted">{rule.label}</span>
                    </td>
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
