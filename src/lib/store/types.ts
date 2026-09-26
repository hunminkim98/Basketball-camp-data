import type { Camp, Dataset, Measurement, Player, ValidationRule } from "../types";

export interface SessionWrite {
  playerId: string;
  campId: string;
  measurements: Measurement[];
}

/** 저장소 인터페이스. 로컬 JSON 파일(개발·데모)과 Supabase(운영) 두 구현이 있다. */
export interface Store {
  readonly kind: "local" | "supabase";
  load(): Promise<Dataset>;
  upsertCamp(camp: Camp): Promise<void>;
  /** 캠프와 그 캠프의 측정값 삭제 */
  deleteCamp(id: string): Promise<void>;
  upsertPlayers(players: Player[]): Promise<void>;
  /** 선수와 그 선수의 측정값 삭제 */
  deletePlayer(id: string): Promise<void>;
  /** (선수, 캠프) 단위로 기존 측정값을 지우고 새 값으로 교체 */
  replaceSessions(writes: SessionWrite[]): Promise<void>;
  /**
   * from 선수의 측정값을 to 선수로 옮긴다.
   * 같은 캠프에 둘 다 기록이 있으면 to 선수의 기록을 남기고 from 쪽은 버린다.
   */
  reassignMeasurements(fromPlayerId: string, toPlayerId: string): Promise<void>;
  /** 선수의 캠프별 측정 당시 나이 갱신 */
  setAges(playerId: string, ages: { campId: string; age: number | null }[]): Promise<void>;
  saveRules(rules: ValidationRule[]): Promise<void>;
}
