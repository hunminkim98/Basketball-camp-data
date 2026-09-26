import { promises as fs } from "node:fs";
import path from "node:path";
import type { Dataset } from "../types";
import { DEFAULT_RULES } from "../validation";
import type { SessionWrite, Store } from "./types";

/**
 * 로컬 JSON 파일 저장소 (개발·현장 노트북용).
 * 파일 하나에 전체 데이터를 담는다. 동시 쓰기는 프로세스 내 큐로 직렬화한다.
 */
export class LocalStore implements Store {
  readonly kind = "local" as const;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly file: string) {}

  private async read(): Promise<Dataset> {
    try {
      const text = await fs.readFile(this.file, "utf8");
      const ds = JSON.parse(text) as Partial<Dataset>;
      return {
        players: ds.players ?? [],
        camps: ds.camps ?? [],
        measurements: ds.measurements ?? [],
        rules: ds.rules ?? structuredClone(DEFAULT_RULES),
      };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        return { players: [], camps: [], measurements: [], rules: structuredClone(DEFAULT_RULES) };
      }
      throw e;
    }
  }

  private async write(ds: Dataset): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(ds, null, 1), "utf8");
    await fs.rename(tmp, this.file);
  }

  private mutate(fn: (ds: Dataset) => void): Promise<void> {
    const next = this.queue.then(async () => {
      const ds = await this.read();
      fn(ds);
      await this.write(ds);
    });
    this.queue = next.catch(() => undefined);
    return next;
  }

  async load(): Promise<Dataset> {
    await this.queue;
    return this.read();
  }

  upsertCamp: Store["upsertCamp"] = (camp) =>
    this.mutate((ds) => {
      const i = ds.camps.findIndex((c) => c.id === camp.id);
      if (i >= 0) ds.camps[i] = camp;
      else ds.camps.push(camp);
    });

  deleteCamp: Store["deleteCamp"] = (id) =>
    this.mutate((ds) => {
      ds.camps = ds.camps.filter((c) => c.id !== id);
      ds.measurements = ds.measurements.filter((m) => m.campId !== id);
    });

  upsertPlayers: Store["upsertPlayers"] = (players) =>
    this.mutate((ds) => {
      for (const p of players) {
        const i = ds.players.findIndex((x) => x.id === p.id);
        if (i >= 0) ds.players[i] = p;
        else ds.players.push(p);
      }
    });

  deletePlayer: Store["deletePlayer"] = (id) =>
    this.mutate((ds) => {
      ds.players = ds.players.filter((p) => p.id !== id);
      ds.measurements = ds.measurements.filter((m) => m.playerId !== id);
    });

  replaceSessions = (writes: SessionWrite[]) =>
    this.mutate((ds) => {
      const keys = new Set(writes.map((w) => `${w.playerId}|${w.campId}`));
      ds.measurements = ds.measurements.filter((m) => !keys.has(`${m.playerId}|${m.campId}`));
      for (const w of writes) ds.measurements.push(...w.measurements);
    });

  reassignMeasurements: Store["reassignMeasurements"] = (fromId, toId) =>
    this.mutate((ds) => {
      const targetCamps = new Set(ds.measurements.filter((m) => m.playerId === toId).map((m) => m.campId));
      ds.measurements = ds.measurements
        .filter((m) => !(m.playerId === fromId && targetCamps.has(m.campId)))
        .map((m) => (m.playerId === fromId ? { ...m, playerId: toId } : m));
    });

  setAges: Store["setAges"] = (playerId, ages) =>
    this.mutate((ds) => {
      const byCamp = new Map(ages.map((a) => [a.campId, a.age]));
      for (const m of ds.measurements) {
        if (m.playerId === playerId && byCamp.has(m.campId)) m.ageAtMeasurement = byCamp.get(m.campId)!;
      }
    });

  saveRules: Store["saveRules"] = (rules) =>
    this.mutate((ds) => {
      ds.rules = rules;
    });
}
