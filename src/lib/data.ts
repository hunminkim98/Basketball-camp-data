import "server-only";
import { getStore } from "./store";
import type { Dataset } from "./types";

export async function loadDataset(): Promise<Dataset> {
  return getStore().load();
}
