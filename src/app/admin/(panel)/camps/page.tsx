import type { Metadata } from "next";
import Link from "next/link";
import { sortCamps } from "@/lib/analysis";
import { loadDataset } from "@/lib/data";
import { buttonClass, Card, CardTitle, inputClass, Notice, PageTitle } from "@/components/ui";
import { deleteCamp, saveCamp } from "../../actions";

export const metadata: Metadata = { title: "캠프 관리" };

export default async function CampsPage(props: PageProps<"/admin/camps">) {
  const sp = await props.searchParams;
  const ds = await loadDataset();
  const count = new Map<string, Set<string>>();
  for (const m of ds.measurements) {
    if (!count.has(m.campId)) count.set(m.campId, new Set());
    count.get(m.campId)!.add(m.playerId);
  }
  return (
    <>
      <PageTitle sub="캠프 날짜는 측정 당시 나이 계산에 쓰입니다.">캠프 관리</PageTitle>
      {sp.error === "confirm" && <Notice tone="danger">삭제하려면 확인란에 “삭제”를 입력하세요.</Notice>}
      <Card accent="court">
        <CardTitle>새 캠프</CardTitle>
        <form action={saveCamp} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <input name="name" required placeholder="캠프명 (예: 2026년 8월 캠프)" className={inputClass} />
          <input name="date" type="date" required className={inputClass} />
          <input name="location" placeholder="장소" className={inputClass} />
          <button className={buttonClass.primary}>추가</button>
        </form>
        <p className="mt-2 text-xs text-muted">
          측정 데이터는 <Link href="/admin/import" className="underline">엑셀 업로드</Link>에서 캠프를 선택하거나 새로 만들며 넣을 수 있습니다.
        </p>
      </Card>
      {sortCamps(ds.camps)
        .reverse()
        .map((c) => (
          <Card key={c.id}>
            <form action={saveCamp} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <input type="hidden" name="id" value={c.id} />
              <input name="name" defaultValue={c.name} required className={inputClass} />
              <input name="date" type="date" defaultValue={c.date} required className={inputClass} />
              <input name="location" defaultValue={c.location ?? ""} placeholder="장소" className={inputClass} />
              <button className={buttonClass.ghost}>저장</button>
            </form>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
              <span className="text-muted">참가 {count.get(c.id)?.size ?? 0}명</span>
              <form action={deleteCamp} className="flex items-center gap-2">
                <input type="hidden" name="id" value={c.id} />
                <input name="confirm" placeholder="“삭제” 입력" className={`${inputClass} w-32`} />
                <button className={buttonClass.danger}>캠프·측정값 삭제</button>
              </form>
            </div>
          </Card>
        ))}
    </>
  );
}
