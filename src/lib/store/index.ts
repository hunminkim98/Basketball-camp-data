import path from "node:path";
import { LocalStore } from "./local";
import { SupabaseStore } from "./supabase";
import type { Store } from "./types";

export type { SessionWrite, Store } from "./types";

let store: Store | null = null;

/**
 * SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY가 있으면 Supabase,
 * 없으면 로컬 JSON 파일(DATA_FILE, 기본 data/db.json)을 쓴다.
 */
export function getStore(): Store {
  if (store) return store;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    store = new SupabaseStore(url, key);
  } else {
    const file = process.env.DATA_FILE ?? path.join(process.cwd(), "data", "db.json");
    store = new LocalStore(file);
  }
  return store;
}
