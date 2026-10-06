import { useEffect, useState } from "react";
import { forgeRequest, gameRequest } from "./api";
import type { GameData } from "./types";

export function useGame(notify: (message: string) => void) {
  const [gameData, setGameData] = useState<GameData>();
  useEffect(() => {
    let active = true;
    gameRequest().then((data) => { if (active) setGameData(data); }).catch((error) => {
      if (active) notify(error instanceof Error ? error.message : "Backend unavailable");
    });
    return () => { active = false; };
  }, [notify]);

  async function refresh() {
    const data = await gameRequest();
    setGameData(data);
    return data;
  }
  async function perform(action: Record<string, unknown>) {
    const data = await gameRequest(action);
    setGameData(data);
    return data;
  }
  async function forge(file: File) {
    const data = await forgeRequest(file);
    setGameData(data);
    return data.expeditions[data.expeditions.length - 1];
  }
  return { gameData, refresh, perform, forge };
}
