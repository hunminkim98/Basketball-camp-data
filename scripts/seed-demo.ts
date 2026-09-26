/**
 * 변화 추적 화면 시연용 "가상 2회차 캠프"를 만든다. 실제 데이터(data/db.json)는 건드리지 않는다.
 *
 *   npm run seed             # 먼저 1회차 실데이터를 data/db.json에 넣고
 *   npm run seed:demo        # data/db.json을 data/demo.db.json으로 복사한 뒤 가상 2회차를 추가
 *   DATA_FILE=data/demo.db.json npm run dev
 *
 * 가상 값은 1회차 값에 작은 향상 + 무작위 변동을 준 것이다 (고정 시드 → 매번 같은 결과).
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { LocalStore } from "../src/lib/store/local";
import { newId } from "../src/lib/ids";

const SRC = path.join("data", "db.json");
const DEST = path.join("data", "demo.db.json");
const PARTICIPANTS = 24; // 1회차 참가자 중 재참가자 수

let seed = 20260810;
function rand(): number {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32;
  return seed / 2 ** 32;
}
const jitter = (scale: number) => (rand() * 2 - 1) * scale;

/** 지표별 6개월 뒤 기대 변화 (+ 좋아짐 방향 기준) */
const DRIFT: Record<string, (v: number) => number> = {
  height: (v) => v + 2 + jitter(1.5),
  weight: (v) => v + 1.5 + jitter(1.5),
  jump_height: (v) => v + 1.5 + jitter(3),
  peak_grf: (v) => v * (1.04 + jitter(0.06)),
  impulse: (v) => v * (1.04 + jitter(0.05)),
  rfd: (v) => v * (1.08 + jitter(0.15)),
};

function next(key: string, v: number): number {
  let out: number;
  if (DRIFT[key]) out = DRIFT[key](v);
  else if (/sprint10|total505|cod_[lr]$/.test(key)) out = v * (0.97 + jitter(0.03));
  else if (/cod_loss/.test(key)) out = v * (0.93 + jitter(0.1));
  else if (/time/.test(key)) out = v * (0.95 + jitter(0.1));
  else if (/contrib|decel/.test(key)) out = v + jitter(3);
  else if (/valgus/.test(key)) out = v + jitter(3);
  else out = v;
  const decimals = /time|sprint|total|cod_[lr]$/.test(key) ? 2 : /cod_loss/.test(key) ? 1 : 0;
  return Number(out.toFixed(decimals));
}

async function main() {
  await fs.copyFile(SRC, DEST);
  const store = new LocalStore(DEST);
  const ds = await store.load();
  if (!ds.camps.length) throw new Error("먼저 npm run seed로 1회차 데이터를 넣으세요.");
  const first = ds.camps[0];
  const camp = { id: newId(), name: "2026년 8월 캠프 (데모)", date: "2026-08-10", location: "가상 데이터" };
  const players = [...new Set(ds.measurements.filter((m) => m.campId === first.id).map((m) => m.playerId))];
  // 요구사항의 예시 선수(남, 점프 44cm, 힘생성비율 1,098N/s)는 항상 포함
  const valueOf = (id: string, key: string) => ds.measurements.find((m) => m.playerId === id && m.campId === first.id && m.metricKey === key)?.value;
  const pick = players.filter((id) => valueOf(id, "jump_height") === 44 && valueOf(id, "rfd") === 1098);
  for (const id of players) if (pick.length < PARTICIPANTS && !pick.includes(id) && rand() < 0.5) pick.push(id);

  const writes = pick.map((playerId) => ({
    playerId,
    campId: camp.id,
    measurements: ds.measurements
      .filter((m) => m.playerId === playerId && m.campId === first.id)
      .map((m) => ({ ...m, campId: camp.id, value: next(m.metricKey, m.value) })),
  }));
  await store.upsertCamp(camp);
  await store.replaceSessions(writes);
  console.log(`${DEST}: "${camp.name}" 추가 — 재참가 ${writes.length}명`);
  console.log(`실행: DATA_FILE=${DEST} npm run dev`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
