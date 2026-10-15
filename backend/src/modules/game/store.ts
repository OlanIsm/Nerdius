import type { SupabaseClient } from "@supabase/supabase-js";
import { initialGame } from "./state.ts";
import type { GameData } from "./types.ts";
import { tutorialRegions } from "./tutorial.ts";

type Row = { state: GameData; version: number };

export async function readState(client: SupabaseClient, userId: string): Promise<Row> {
  const existing = await client.from("game_states").select("state,version").eq("user_id", userId).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    const row = existing.data as Row;
    const tutorial = row.state.expeditions.find((item) => item.id === "tutorial");
    if (tutorial?.regions.some((region) => region.questionBank?.length !== 10)) {
      tutorial.regions = tutorialRegions().map((region) => {
        const active = row.state.battle;
        const previous = tutorial.regions.find((item) => item.chapter === region.chapter);
        // Append tutorial questions without changing an unfinished attempt's accepted answer keys.
        if (active?.status === "active" && active.expeditionId === "tutorial" && active.chapter === region.chapter && previous?.questionBank?.length) {
          const old = previous.questionBank;
          return { ...region, questionBank: [...old, ...region.questionBank!.filter((question) => !old.some((item) => item.id === question.id))] };
        }
        return region;
      });
    }
    return row;
  }
  const created = await client.from("game_states").insert({ user_id: userId, state: initialGame() }).select("state,version").single();
  if (!created.error) return created.data as Row;
  if (created.error.code !== "23505") throw created.error;
  const raced = await client.from("game_states").select("state,version").eq("user_id", userId).single();
  if (raced.error) throw raced.error;
  return raced.data as Row;
}

export async function changeState<T>(client: SupabaseClient, userId: string, change: (game: GameData) => T): Promise<{ game: GameData; result: T }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await readState(client, userId);
    const game = structuredClone(row.state);
    const result = change(game);
    const updated = await client.from("game_states")
      .update({ state: game, version: row.version + 1 })
      .eq("user_id", userId).eq("version", row.version).select("version").maybeSingle();
    if (updated.error) throw updated.error;
    if (updated.data) return { game, result };
  }
  throw new Error("Concurrent update limit reached");
}
