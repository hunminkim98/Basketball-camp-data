import "server-only";
import type { RefMode } from "./analysis";
import { normalizeAccessCode } from "./ids";
import type { Dataset, Player } from "./types";

export function findByCode(ds: Dataset, code: string): Player | undefined {
  const norm = normalizeAccessCode(decodeURIComponent(code));
  return ds.players.find((p) => p.accessCode === norm);
}

export function readReportParams(sp: Record<string, string | string[] | undefined>): { campId?: string; refMode: RefMode } {
  return {
    campId: typeof sp.camp === "string" ? sp.camp : undefined,
    refMode: sp.ref === "gender" ? "gender" : "auto",
  };
}
