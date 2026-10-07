import { useCallback, useEffect, useRef, useState } from "react";
import { art, icons } from "./src/assets";
import { Button } from "./src/components/GameUI";
import { PlayerHeader } from "./src/components/PlayerHeader";
import { BottomNavItem } from "./src/components/BottomNavItem";
import { HomeScreen } from "./src/screens/HomeScreen";
import {
  AdventureScreen,
  RegionScreen,
  RegionDetailScreen,
  expeditions,
  type Expedition,
  type Region,
} from "./src/screens/AdventureScreen";
import { InventoryScreen } from "./src/screens/InventoryScreen";
import { GachaScreen } from "./src/screens/GachaScreen";
import { forgeRequest, gameRequest, type GameData } from "./src/gameApi";
import type { Screen } from "./src/types";
import { ui } from "./src/theme";
import { BattleScreen } from "./src/screens/BattleScreen";
import { playButtonSound } from "./src/components/gameAudio";
const navigation = [
  { screen: "Hub", icon: icons.hub },
  { screen: "Expedition", icon: icons.map },
  { screen: "Bazaar", icon: icons.bazaar },
  { screen: "Bag", icon: icons.armory },
] as const;
const shellAssets = [
  art.doorLeft,
  art.doorRight,
  art.navPlank,
  ...Object.values(icons),
  art.character,
];
function findExpedition(items: Expedition[], selected: Expedition) {
  return items.find((item) =>
    selected.id ? item.id === selected.id : item.file === selected.file,
  );
}
export default function App() {
  const [startingBattle, setStartingBattle] = useState(false);
  const [battleEntry, setBattleEntry] = useState(0);
  const startPending = useRef(false);
  const [summoning, setSummoning] = useState(false);
  const [screen, setScreen] = useState<Screen>("Hub");
  const [message, setMessage] = useState<string>();
  const [gameData, setGameData] = useState<GameData>();
  const [forgeNotice, setForgeNotice] = useState<string>();
  const [selectedExpedition, setSelectedExpedition] = useState<Expedition>(
    expeditions[0],
  );
  const [selectedRegion, setSelectedRegion] = useState<Region>(
    expeditions[0].regions[0],
  );
  const [lastAdventure, setLastAdventure] = useState({
    expedition: expeditions[0],
    region: expeditions[0].regions[0],
  });
  const [visited, setVisited] = useState(() => new Set<Screen>(["Hub"]));
  const pages = useRef<Partial<Record<Screen, HTMLDivElement | null>>>({});
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest("button:not(:disabled)")
      ) {
        playButtonSound();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  useEffect(() => {
    shellAssets.forEach((source) => {
      const image = new Image();
      image.src = source;
    });
    gameRequest()
      .then(setGameData)
      .catch((error) =>
        setMessage(
          error instanceof Error ? error.message : "Backend unavailable",
        ),
      );
  }, []);
  const navigate = useCallback((next: Screen) => {
    setVisited((current) =>
      current.has(next) ? current : new Set(current).add(next),
    );
    setScreen(next);
    requestAnimationFrame(() => {
      pages.current[next]?.scrollTo({ top: 0 });
      main.current?.focus({ preventScroll: true });
    });
  }, []);
  async function perform(action: Record<string, unknown>) {
    const data = await gameRequest(action);
    setGameData(data);
    return data;
  }
  const availableExpeditions = gameData?.expeditions ?? expeditions;
  const currentExpedition =
    findExpedition(availableExpeditions, selectedExpedition) ??
    selectedExpedition;
  const currentRegion =
    currentExpedition.regions.find(
      (item) => item.chapter === selectedRegion.chapter,
    ) ?? selectedRegion;
  const recentExpedition = availableExpeditions.find(
    (item) => item.id === gameData?.lastAdventure?.expeditionId,
  );
  const recentAdventure =
    recentExpedition && gameData?.lastAdventure
      ? {
          expedition: recentExpedition,
          region:
            recentExpedition.regions.find(
              (region) => region.chapter === gameData.lastAdventure!.chapter,
            ) ?? recentExpedition.regions[0],
        }
      : {
          expedition:
            findExpedition(availableExpeditions, lastAdventure.expedition) ??
            lastAdventure.expedition,
          region: lastAdventure.region,
        };
  const props = { navigate, notify: setMessage };
  const showShell = ["Hub", "Expedition", "Bazaar", "Bag"].includes(screen);
  return (
    <div className="app-shell">
      <div className="app" data-screen={screen} data-summoning={summoning}>
        {screen === "Bag" && (
          <div
            className="bag-backdrop"
            style={{ backgroundImage: `url("${art.floatingIsland}")` }}
            aria-hidden="true"
          />
        )}
        {screen === "Bazaar" && (
          <div className="bazaar-backdrop" aria-hidden="true">
            <div
              className="bazaar-room-art"
              style={{ backgroundImage: `url("${art.merlinsRoom}")` }}
            />
          </div>
        )}
        {showShell && (
          <PlayerHeader
            gold={gameData?.gold}
            gems={gameData?.gems}
            xp={gameData?.xp}
            onPressProfile={() =>
              setMessage(
                "Nerd Mage · Your progress is saved to this account.",
              )
            }
          />
        )}
        <main className="pages" ref={main} tabIndex={-1} aria-label={screen}>
          {visited.has("Hub") && (
            <div
              className="page-scroll page-reveal"
              hidden={screen !== "Hub"}
              ref={(node) => {
                pages.current.Hub = node;
              }}
            >
              <HomeScreen
                {...props}
                expeditions={availableExpeditions}
                lastAdventure={recentAdventure}
                onForge={async (file) => {
                  const data = await forgeRequest(file);
                  setGameData(data);
                  return data.expeditions[data.expeditions.length - 1];
                }}
                onForgeSettled={(result) => setForgeNotice(result === "ready" ? "Your adventure is ready" : "Your forge needs attention")}
                onReadForge={() => setForgeNotice(undefined)}
                onContinue={() => {
                  setSelectedExpedition(recentAdventure.expedition);
                  setSelectedRegion(recentAdventure.region);
                  navigate("RegionDetail");
                }}
                onSelectExpedition={(expedition) => {
                  setSelectedExpedition(expedition);
                  setSelectedRegion(expedition.regions[0]);
                  navigate("Region");
                }}
              />
            </div>
          )}
          {visited.has("Expedition") && (
            <div
              className="page-scroll page-reveal"
              hidden={screen !== "Expedition"}
              ref={(node) => {
                pages.current.Expedition = node;
              }}
            >
              <AdventureScreen
                expeditions={availableExpeditions}
                onInspect={() =>
                  requestAnimationFrame(() =>
                    pages.current.Expedition?.scrollTo({
                      top: pages.current.Expedition.scrollHeight,
                      behavior: matchMedia("(prefers-reduced-motion: reduce)")
                        .matches
                        ? "instant"
                        : "smooth",
                    }),
                  )
                }
                onSelect={(expedition, region) => {
                  setSelectedExpedition(expedition);
                  setSelectedRegion(region ?? expedition.regions[0]);
                  navigate(region ? "RegionDetail" : "Region");
                }}
              />
            </div>
          )}
          {visited.has("Bazaar") && (
            <div
              className="fixed-page bazaar-fixed-page"
              hidden={screen !== "Bazaar"}
              ref={(node) => {
                pages.current.Bazaar = node;
              }}
            >
              <GachaScreen
                {...props}
                pool={gameData?.summonPool}
                gems={gameData?.gems}
                onSummoningChange={setSummoning}
                onSummon={(count) => perform({ action: "summon", count })}
              />
            </div>
          )}
          {visited.has("Bag") && (
            <div className="fixed-page" hidden={screen !== "Bag"}>
              <InventoryScreen {...props} owned={gameData?.inventory} />
            </div>
          )}
          {screen === "Region" && (
            <RegionScreen
              expedition={currentExpedition}
              onBack={() => navigate("Expedition")}
              onSelect={(region) => {
                setSelectedRegion(region);
                navigate("RegionDetail");
              }}
            />
          )}
          {(screen === "RegionDetail" || screen === "Battle") && (
            <div
              className="fixed-page region-preview"
              inert={screen === "Battle"}
              aria-hidden={screen === "Battle"}
            >
              <RegionDetailScreen
                expedition={currentExpedition}
                region={currentRegion}
                onBack={() => navigate("Region")}
                onStart={async () => {
                  if (startPending.current) return;
                  startPending.current = true;
                  setStartingBattle(true);
                  setBattleEntry((value) => value + 1);
                  navigate("Battle");
                  try {
                    let expedition = currentExpedition;
                    if (!expedition.id) {
                      const data = await gameRequest();
                      setGameData(data);
                      expedition =
                        findExpedition(data.expeditions, expedition) ??
                        expedition;
                    }
                    if (!expedition.id)
                      throw new Error(
                        "Adventure not found. Choose an expedition from the current list.",
                      );
                    await perform({
                      action: "start",
                      expeditionId: expedition.id,
                      chapter: currentRegion.chapter,
                    });
                    setLastAdventure({
                      expedition,
                      region: currentRegion,
                    });
                  } catch (error) {
                    navigate("RegionDetail");
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : "Adventure failed to start",
                    );
                  } finally {
                    startPending.current = false;
                    setStartingBattle(false);
                  }
                }}
              />
            </div>
          )}
          {screen === "Battle" && (startingBattle || gameData?.battle) && (
            <BattleScreen
              key={battleEntry}
              {...props}
              battle={startingBattle ? null : gameData?.battle ?? null}
              title={currentExpedition.title}
              tutorial={currentExpedition.id === "tutorial"}
              onAnswer={(questionId, selectedIndex) => perform({ action: "answer", battleId: gameData!.battle!.id, questionId, selectedIndex }).then(() => {})}
              onExit={() => perform({ action: "exit", battleId: gameData!.battle!.id }).then(() => {})}
              onComplete={() => perform({ action: "complete", battleId: gameData!.battle!.id }).then(() => {})}
              onRestart={() => perform({ action: "restart", battleId: gameData!.battle!.id, expeditionId: currentExpedition.id, chapter: currentRegion.chapter }).then(() => setBattleEntry((value) => value + 1))}
            />
          )}
        </main>
        {showShell && (
          <nav className="navbar" aria-label="Main navigation" role="tablist">
            <img className="nav-plank" src={art.navPlank} alt="" />
            {navigation.map((item) => (
              <BottomNavItem
                key={item.screen}
                screen={item.screen}
                icon={item.icon}
                size={39}
                selected={screen === item.screen}
                notification={item.screen === "Hub" ? forgeNotice : undefined}
                onPress={() => {
                  navigate(item.screen);
                  if (item.screen === "Hub" && forgeNotice) {
                    setForgeNotice(undefined);
                    requestAnimationFrame(() => pages.current.Hub?.querySelector("[data-forge-status]")?.scrollIntoView({ block: "center" }));
                  }
                }}
              />
            ))}
          </nav>
        )}
        {message && (
          <Journal message={message} dismiss={() => setMessage(undefined)} />
        )}
      </div>
    </div>
  );
}
function Journal({
  message,
  dismiss,
}: {
  message: string;
  dismiss: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      className="journal"
      ref={dialog}
      aria-labelledby="journal-title"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
    >
      <div className="stack" style={{ ...ui.panel, padding: 22 }}>
        <h2 id="journal-title" style={ui.heading}>
          Adventurer’s Journal
        </h2>
        <p style={ui.body}>{message}</p>
        <Button label="Continue" tone="gold" onPress={dismiss} />
      </div>
    </dialog>
  );
}
