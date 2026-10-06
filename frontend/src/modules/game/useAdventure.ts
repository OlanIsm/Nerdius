import { useRef, useState } from "react";
import type { Screen } from "../../types";
import { expeditions } from "./tutorial";
import type { Expedition, Region } from "./types";
import type { useGame } from "./useGame";

function findExpedition(items: Expedition[], selected: Expedition) {
  return items.find((item) => selected.id ? item.id === selected.id : item.file === selected.file);
}

export function useAdventure(
  game: ReturnType<typeof useGame>,
  navigate: (screen: Screen) => void,
  notify: (message: string) => void,
) {
  const { gameData, refresh, perform } = game;
  const [startingBattle, setStartingBattle] = useState(false);
  const [battleEntry, setBattleEntry] = useState(0);
  const startPending = useRef(false);
  const [selectedExpedition, setSelectedExpedition] = useState<Expedition>(expeditions[0]);
  const [selectedRegion, setSelectedRegion] = useState<Region>(expeditions[0].regions[0]);
  const [lastAdventure, setLastAdventure] = useState({ expedition: expeditions[0], region: expeditions[0].regions[0] });
  const availableExpeditions = gameData?.expeditions ?? expeditions;
  const currentExpedition = findExpedition(availableExpeditions, selectedExpedition) ?? selectedExpedition;
  const currentRegion = currentExpedition.regions.find((item) => item.chapter === selectedRegion.chapter) ?? selectedRegion;
  const recentExpedition = availableExpeditions.find((item) => item.id === gameData?.lastAdventure?.expeditionId);
  const recentAdventure = recentExpedition && gameData?.lastAdventure
    ? {
        expedition: recentExpedition,
        region: recentExpedition.regions.find((region) => region.chapter === gameData.lastAdventure!.chapter) ?? recentExpedition.regions[0],
      }
    : { expedition: findExpedition(availableExpeditions, lastAdventure.expedition) ?? lastAdventure.expedition, region: lastAdventure.region };

  async function startBattle() {
    if (startPending.current) return;
    startPending.current = true;
    setStartingBattle(true);
    setBattleEntry((value) => value + 1);
    navigate("Battle");
    try {
      let expedition = currentExpedition;
      if (!expedition.id) {
        const data = await refresh();
        expedition = findExpedition(data.expeditions, expedition) ?? expedition;
      }
      if (!expedition.id) throw new Error("Adventure not found. Choose an expedition from the current list.");
      await perform({ action: "start", expeditionId: expedition.id, chapter: currentRegion.chapter });
      setLastAdventure({ expedition, region: currentRegion });
    } catch (error) {
      navigate("RegionDetail");
      notify(error instanceof Error ? error.message : "Adventure failed to start");
    } finally {
      startPending.current = false;
      setStartingBattle(false);
    }
  }
  async function restartBattle() {
    await perform({ action: "restart", battleId: gameData!.battle!.id, expeditionId: currentExpedition.id, chapter: currentRegion.chapter });
    setBattleEntry((value) => value + 1);
  }
  return {
    startingBattle, battleEntry, availableExpeditions, currentExpedition, currentRegion, recentAdventure,
    setSelectedExpedition, setSelectedRegion, startBattle, restartBattle,
  };
}
