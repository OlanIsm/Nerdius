import { useEffect, useRef, useState } from "react";
import type { Screen } from "../../types";
import { expeditions } from "./tutorial";
import type { Expedition, GameData, Region } from "./types";
import type { useGame } from "./useGame";
import { hasBattleAnswerBank } from "./localBattle";

function findExpedition(items: Expedition[], selected: Expedition) {
  return items.find((item) => selected.id ? item.id === selected.id : item.file === selected.file);
}

function getContinueRegion(expedition: Expedition, gameData: GameData) {
  const activeBattle = gameData.battle?.status === "active" &&
    gameData.battle.expeditionId === expedition.id;
  const chapter = activeBattle
    ? gameData.battle!.chapter
    : Math.min(
        expedition.regions.length,
        Math.round(expedition.progress * expedition.regions.length / 100) + 1,
      );
  return expedition.regions.find((region) => region.chapter === chapter) ??
    expedition.regions[0];
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
  const manuallySelected = useRef(false);
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
        region: getContinueRegion(recentExpedition, gameData),
      }
    : { expedition: findExpedition(availableExpeditions, lastAdventure.expedition) ?? lastAdventure.expedition, region: lastAdventure.region };
  const continueExpedition = recentAdventure.expedition;
  const selectedContinueRegion = recentAdventure.region;
  useEffect(() => {
    if (manuallySelected.current || !gameData?.lastAdventure || !recentExpedition) return;
    setSelectedExpedition(continueExpedition);
    setSelectedRegion(selectedContinueRegion);
  }, [continueExpedition, selectedContinueRegion, gameData?.lastAdventure, recentExpedition]);

  function selectExpedition(expedition: Expedition) {
    manuallySelected.current = true;
    setSelectedExpedition(expedition);
  }
  function selectRegion(region: Region) {
    manuallySelected.current = true;
    setSelectedRegion(region);
  }

  async function startBattle(restartSaved = false) {
    if (startPending.current) return;
    startPending.current = true;
    setStartingBattle(true);
    setBattleEntry((value) => value + 1);
    navigate("Battle");
    try {
      let expedition = currentExpedition;
      let region = currentRegion;
      if (!gameData || !expedition.id) {
        const data = await refresh();
        if (!manuallySelected.current && data.lastAdventure) {
          const recent = data.expeditions.find(
            (item) => item.id === data.lastAdventure?.expeditionId,
          );
          if (recent) {
            expedition = recent;
            region = getContinueRegion(recent, data);
            setSelectedExpedition(expedition);
            setSelectedRegion(region);
          }
        }
        expedition = findExpedition(data.expeditions, expedition) ?? expedition;
      }
      if (!expedition.id || !region) throw new Error("Adventure not found. Choose an expedition from the current list.");
      const savedBattle = gameData?.battle;
      const started =
        restartSaved &&
        savedBattle?.status === "active" &&
        savedBattle.expeditionId === expedition.id &&
        savedBattle.chapter === region.chapter
          ? await perform({ action: "restart", battleId: savedBattle.id, expeditionId: expedition.id, chapter: region.chapter })
          : await perform({ action: "start", expeditionId: expedition.id, chapter: region.chapter });
      if (!hasBattleAnswerBank(started.battle)) {
        throw new Error(
          "The battle server is out of date. Restart the Nerdungeon backend, then try again.",
        );
      }
      setLastAdventure({ expedition, region });
    } catch (error) {
      navigate("RegionDetail");
      notify(error instanceof Error ? error.message : "Adventure failed to start");
    } finally {
      startPending.current = false;
      setStartingBattle(false);
    }
  }
  async function restartBattle() {
    const restarted = await perform({ action: "restart", battleId: gameData!.battle!.id, expeditionId: currentExpedition.id, chapter: currentRegion.chapter });
    if (!hasBattleAnswerBank(restarted.battle)) {
      throw new Error(
        "The battle server is out of date. Restart the Nerdungeon backend, then try again.",
      );
    }
    setBattleEntry((value) => value + 1);
  }
  return {
    startingBattle, battleEntry, availableExpeditions, currentExpedition, currentRegion, recentAdventure,
    hasSavedProgress: gameData?.battle?.status === "active" &&
      gameData.battle.expeditionId === currentExpedition.id &&
      gameData.battle.chapter === currentRegion.chapter &&
      gameData.battle.answers.length > 0,
    setSelectedExpedition: selectExpedition, setSelectedRegion: selectRegion, startBattle, restartBattle,
  };
}
