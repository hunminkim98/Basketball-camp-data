/**
 * 엑셀 1개를 캠프 1회분으로 저장소에 넣는다.
 *
 *   npm run seed                                  # data/private/camp-2026-02.xlsx → "2026년 2월 캠프"
 *   npm run seed -- 파일.xlsx --name "2026년 8월 캠프" --date 2026-08-10 --location 서울
 *   npm run seed -- --reset                       # 로컬 저장소(data/db.json)를 비우고 다시 넣기
 *
 * 로컬(JSON) 또는 Supabase — .env의 SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 유무로 결정.
 * 같은 이름·성별·생년 선수가 이미 있으면 그 선수에 연결한다 (후보가 2명 이상이면 건너뛰고 알린다).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { parseWorkbook } from "../src/lib/excel";
import { newId } from "../src/lib/ids";
import { applyImport, planImport, type Decision } from "../src/lib/importer";
import { getStore } from "../src/lib/store";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const positional = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && !all[i - 1]?.startsWith("--"));
  const file = positional[0] ?? path.join("data", "private", "camp-2026-02.xlsx");
  const campName = arg("name") ?? "2026년 2월 캠프";
  const campDate = arg("date") ?? "2026-02-01";
  const location = arg("location") ?? null;

  const store = getStore();
  if (process.argv.includes("--reset")) {
    if (store.kind !== "local") throw new Error("--reset은 로컬 저장소에서만 쓸 수 있습니다.");
    const dataFile = process.env.DATA_FILE ?? path.join("data", "db.json");
    await fs.rm(dataFile, { force: true });
    console.log(`초기화: ${dataFile}`);
  }

  const buf = await fs.readFile(file);
  const sheets = parseWorkbook(new Uint8Array(buf)).filter((s) => s.suggested);
  const rows = sheets.flatMap((s) => s.rows.map((r) => ({ ...r, source: `${r.sheet} ${r.rowNumber}행` })));
  console.log(`읽음: ${file} — ${sheets.map((s) => `${s.name} ${s.rows.length}명`).join(", ")}`);

  const ds = await store.load();
  const camp = ds.camps.find((c) => c.name === campName) ?? { id: newId(), name: campName, date: campDate, location };
  const plans = planImport(ds, rows, camp.id);
  const decisions: Decision[] = plans.map((p) => {
    if (p.errors.length) {
      console.warn(`  건너뜀 ${rows[p.index].name}: ${p.errors.join(", ")}`);
      return { action: "skip" };
    }
    if (p.candidates.length === 1) return { action: "link", playerId: p.candidates[0].playerId };
    if (p.candidates.length > 1) {
      console.warn(`  건너뜀 ${rows[p.index].name}: 동일인 후보 ${p.candidates.length}명 — 관리자 화면에서 업로드하세요.`);
      return { action: "skip" };
    }
    return { action: "new" };
  });
  const flagged = plans.flatMap((p) => p.flags.map((f) => `${rows[p.index].name} ${f.label} ${f.value} (${f.rule})`));

  const res = await applyImport(store, ds, camp, rows, decisions);
  console.log(`저장소: ${store.kind} / 캠프: ${camp.name} (${camp.date})`);
  console.log(`신규 ${res.created}명, 기존 연결 ${res.linked}명, 건너뜀 ${res.skipped}명, 측정값 ${res.measurements}개`);
  console.log(`측정오류 표시 ${flagged.length}건 (통계에서 제외):`);
  flagged.forEach((f) => console.log(`  - ${f}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
