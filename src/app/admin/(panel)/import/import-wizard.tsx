"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { parseWorkbook, type ParsedSheet } from "@/lib/excel";
import type { Decision, ImportResult, ImportRow, RowPlan } from "@/lib/importer";
import { RAW_METRICS } from "@/lib/metrics";
import type { Camp } from "@/lib/types";
import { Badge, buttonClass, Card, CardTitle, inputClass, Notice } from "@/components/ui";
import { commitImport, previewImport } from "../../actions";

type CampChoice = { mode: "existing"; id: string } | { mode: "new"; name: string; date: string; location: string };

export function ImportWizard({ camps }: { camps: Camp[] }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [camp, setCamp] = useState<CampChoice>(
    camps.length ? { mode: "existing", id: camps[0].id } : { mode: "new", name: "", date: "", location: "" },
  );
  const [plans, setPlans] = useState<RowPlan[] | null>(null);
  const [decisions, setDecisions] = useState<(Decision | null)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ result: ImportResult; campId: string } | null>(null);
  const [pending, start] = useTransition();

  const rows: ImportRow[] = useMemo(
    () =>
      sheets
        .filter((s) => selected.has(s.name))
        .flatMap((s) =>
          s.rows.map((r) => ({
            name: r.name,
            gender: r.gender,
            birthYear: r.birthYear,
            grade: r.grade,
            team: r.team,
            values: r.values,
            source: `${r.sheet} ${r.rowNumber}행`,
          })),
        ),
    [sheets, selected],
  );

  async function onFile(file: File) {
    setError(null);
    setPlans(null);
    setDone(null);
    try {
      const parsed = parseWorkbook(new Uint8Array(await file.arrayBuffer()));
      if (!parsed.length) throw new Error("'이름' 열과 측정 지표 열이 있는 시트를 찾지 못했습니다.");
      setFileName(file.name);
      setSheets(parsed);
      setSelected(new Set(parsed.filter((s) => s.suggested).map((s) => s.name)));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function preview() {
    setError(null);
    start(async () => {
      try {
        const p = await previewImport(rows, camp.mode === "existing" ? camp.id : null);
        setPlans(p);
        setDecisions(p.map((x) => (x.errors.length ? { action: "skip" } : x.candidates.length ? null : { action: "new" })));
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await commitImport({
        camp: camp.mode === "existing" ? { id: camp.id } : camp,
        rows,
        decisions,
      });
      if (res.ok) setDone({ result: res.result, campId: res.campId });
      else setError(res.error);
    });
  }

  const undecided = decisions.filter((d) => d === null).length;
  const candidateRows = plans?.filter((p) => p.candidates.length) ?? [];
  const flagCount = plans?.reduce((a, p) => a + p.flags.length, 0) ?? 0;
  const campReady = camp.mode === "existing" || (camp.name.trim() && camp.date);

  if (done) {
    return (
      <Card accent="court">
        <CardTitle>저장 완료</CardTitle>
        <p className="text-body">
          신규 선수 <b>{done.result.created}명</b>, 기존 선수 연결 <b>{done.result.linked}명</b>, 건너뜀 {done.result.skipped}명 · 측정값{" "}
          {done.result.measurements}개
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/?camp=${done.campId}`} className={buttonClass.primary}>
            이 캠프 기준 데이터 보기
          </Link>
          <Link href="/admin/players" className={buttonClass.ghost}>
            선수 목록 · 열람 코드
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle sub="시트 한 행 = 선수 1명, 첫 열 = 이름. 시트 이름에 '남'/'여'가 있거나 '성별' 열이 있어야 합니다. 선택 열: 생년, 학년, 소속팀">
          1. 엑셀 파일
        </CardTitle>
        <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line bg-canvas px-4 py-6 text-center hover:border-navy">
          <span className="font-semibold text-navy">{fileName ?? "파일 선택 (.xlsx)"}</span>
          <span className="mt-1 text-xs text-muted">파일은 이 브라우저에서 읽고, 저장 버튼을 눌러야 서버에 기록됩니다.</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            className="sr-only"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </label>
        {sheets.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-semibold text-ink">가져올 시트</p>
            {sheets.map((s) => (
              <label key={s.name} className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-3 py-2">
                <input
                  type="checkbox"
                  className="size-5 accent-[var(--color-navy)]"
                  checked={selected.has(s.name)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(s.name);
                    else next.delete(s.name);
                    setSelected(next);
                    setPlans(null);
                  }}
                />
                <b className="text-ink">{s.name}</b>
                <span className="text-sm text-muted">
                  {s.rows.length}명 · 지표 {s.metricColumns}개 · {s.gender === "M" ? "남" : s.gender === "F" ? "여" : "성별 열 사용"}
                </span>
                {s.unknownColumns.length > 0 && <Badge tone="warn">인식 못 한 열 {s.unknownColumns.length}개</Badge>}
              </label>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>2. 캠프</CardTitle>
        <div className="mb-3 flex gap-2">
          {camps.length > 0 && (
            <button
              type="button"
              onClick={() => setCamp({ mode: "existing", id: camps[0].id })}
              className={camp.mode === "existing" ? buttonClass.primary : buttonClass.ghost}
            >
              기존 캠프
            </button>
          )}
          <button
            type="button"
            onClick={() => setCamp({ mode: "new", name: "", date: "", location: "" })}
            className={camp.mode === "new" ? buttonClass.primary : buttonClass.ghost}
          >
            새 캠프 만들기
          </button>
        </div>
        {camp.mode === "existing" ? (
          <>
            <select
              className={inputClass}
              value={camp.id}
              onChange={(e) => {
                setCamp({ mode: "existing", id: e.target.value });
                setPlans(null);
              }}
            >
              {camps.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.date})
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-muted">이미 이 캠프에 기록이 있는 선수에 연결하면 그 선수의 이 캠프 기록을 새 값으로 바꿉니다.</p>
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <input className={inputClass} placeholder="캠프명 (예: 2026년 8월 캠프)" value={camp.name} onChange={(e) => setCamp({ ...camp, name: e.target.value })} />
            <input className={inputClass} type="date" value={camp.date} onChange={(e) => setCamp({ ...camp, date: e.target.value })} />
            <input className={inputClass} placeholder="장소 (선택)" value={camp.location} onChange={(e) => setCamp({ ...camp, location: e.target.value })} />
          </div>
        )}
        <div className="mt-4">
          <button type="button" className={buttonClass.primary} disabled={!rows.length || !campReady || pending} onClick={preview}>
            {pending && !plans ? "확인 중…" : `3. 미리보기 (${rows.length}명)`}
          </button>
        </div>
      </Card>

      {error && <Notice tone="danger">{error}</Notice>}

      {plans && (
        <>
          <Card accent="court">
            <CardTitle sub={`${rows.length}명 · 측정오류 표시 ${flagCount}건 · 동일인 후보 ${candidateRows.length}명`}>3. 미리보기</CardTitle>

            {candidateRows.length > 0 && (
              <div className="mb-5 space-y-3">
                <Notice tone="warn">
                  이름·성별·생년이 같은 기존 선수가 있습니다. 같은 사람이면 <b>기존 선수에 연결</b>(변화 추적), 다른 사람이면 <b>신규 등록</b>을 고르세요.
                </Notice>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={buttonClass.ghost}
                    onClick={() =>
                      setDecisions(
                        decisions.map((d, i) =>
                          d === null && plans[i].candidates.length === 1 ? { action: "link", playerId: plans[i].candidates[0].playerId } : d,
                        ),
                      )
                    }
                  >
                    후보가 1명인 선수 모두 기존 선수에 연결
                  </button>
                  <button
                    type="button"
                    className={buttonClass.ghost}
                    onClick={() => setDecisions(decisions.map((d, i) => (d === null && plans[i].candidates.length ? { action: "new" } : d)))}
                  >
                    남은 선수 모두 신규 등록
                  </button>
                </div>
                {candidateRows.map((p) => {
                  const r = rows[p.index];
                  return (
                    <div key={p.index} className="rounded-lg border border-line p-3">
                      <div className="mb-2 text-sm">
                        <b className="text-ink">{r.name}</b> <span className="text-muted">{r.source}{r.birthYear ? ` · ${r.birthYear}년생` : ""}</span>
                      </div>
                      <select
                        className={inputClass}
                        value={JSON.stringify(decisions[p.index])}
                        onChange={(e) => {
                          const next = [...decisions];
                          next[p.index] = JSON.parse(e.target.value);
                          setDecisions(next);
                        }}
                      >
                        <option value="null">— 확인 필요 —</option>
                        {p.candidates.map((c) => (
                          <option key={c.playerId} value={JSON.stringify({ action: "link", playerId: c.playerId })}>
                            기존 선수에 연결: {c.name} {c.birthYear ? `${c.birthYear}년생` : "(생년 미입력)"}
                            {c.team ? ` · ${c.team}` : ""} · {c.campNames.join(", ") || "기록 없음"}
                            {c.hasTargetCamp ? " · ⚠ 이 캠프 기록 덮어씀" : ""}
                          </option>
                        ))}
                        <option value={JSON.stringify({ action: "new" })}>다른 사람 — 신규 선수로 등록</option>
                        <option value={JSON.stringify({ action: "skip" })}>이 행 건너뛰기</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="tabular w-max min-w-full text-xs">
                <thead>
                  <tr className="border-b border-line text-left text-muted">
                    <th className="sticky left-0 bg-white py-2 pr-3 pl-4 font-semibold sm:pl-0">이름</th>
                    <th className="px-2 py-2 font-semibold">성별</th>
                    <th className="px-2 py-2 font-semibold">처리</th>
                    {RAW_METRICS.map((m) => (
                      <th key={m.key} className="px-2 py-2 text-right font-semibold whitespace-nowrap">
                        {m.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => {
                    const r = rows[p.index];
                    const d = decisions[p.index];
                    const flagged = new Set(p.flags.map((f) => f.key));
                    return (
                      <tr key={p.index} className="border-b border-line/70">
                        <td className="sticky left-0 bg-white py-1.5 pr-3 pl-4 font-semibold whitespace-nowrap text-ink sm:pl-0">
                          {r.name}
                          {p.warnings.includes("나이 미입력") && <span className="ml-1 font-normal text-muted">· 나이 미입력</span>}
                        </td>
                        <td className="px-2">{r.gender === "M" ? "남" : r.gender === "F" ? "여" : "?"}</td>
                        <td className="px-2 whitespace-nowrap">
                          {p.errors.length ? (
                            <Badge tone="danger">{p.errors[0]}</Badge>
                          ) : d === null ? (
                            <Badge tone="warn">확인 필요</Badge>
                          ) : d.action === "link" ? (
                            <Badge tone="navy">기존 연결</Badge>
                          ) : d.action === "skip" ? (
                            <Badge>건너뜀</Badge>
                          ) : (
                            <Badge>신규</Badge>
                          )}
                        </td>
                        {RAW_METRICS.map((m) => (
                          <td
                            key={m.key}
                            className={`px-2 py-1.5 text-right ${flagged.has(m.key) ? "bg-danger-soft font-bold text-danger" : ""}`}
                            title={flagged.has(m.key) ? p.flags.find((f) => f.key === m.key)!.rule : undefined}
                          >
                            {r.values[m.key] ?? "–"}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-muted">
              <span className="inline-block h-3 w-5 rounded-sm bg-danger-soft ring-1 ring-danger/30" /> 측정오류 기준표에 걸린 값 — 저장은 되지만 통계에서 빠지고 관리자
              화면에만 표시됩니다.
            </p>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={buttonClass.accent} disabled={undecided > 0 || pending} onClick={save}>
              {pending ? "저장 중…" : "4. 저장"}
            </button>
            {undecided > 0 && <span className="text-sm text-[#a4410b]">동일인 확인이 필요한 선수 {undecided}명</span>}
          </div>
        </>
      )}
    </div>
  );
}
