import { useEffect, useRef, useState, type CSSProperties } from "react";
import { miniIcons } from "../assets";
import { inventory } from "../data/inventory";
import { Button, Icon, useReducedMotion } from "./GameUI";
import type { SummonItem } from "../modules/game/types";
import type { SummonAudio } from "./summonAudio";

type Reward = { name: string; rarity: SummonItem["rarity"] };
export type Ritual = { count: number; origin: DOMRect; rewards: Reward[] | null; audio: SummonAudio };
const glow = { Common: "#d0d5ad", Rare: "#73cfff", Epic: "#d9a0ff", Legendary: "#ffcf70" };

export function SummonRitual({ ritual, dismiss, sound, toggleSound }: {
  ritual: Ritual; dismiss: () => void; sound: boolean; toggleSound: () => void;
}) {
  const reduced = useReducedMotion();
  const dialog = useRef<HTMLDialogElement>(null);
  const card = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const locked = useRef(false);
  const [phase, setPhase] = useState<"gather" | "charge" | "open" | "cards" | "summary">("gather");
  const [charged, setCharged] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sliding, setSliding] = useState(false);
  const reward = ritual.rewards?.[index];
  useEffect(() => {
    dialog.current?.showModal();
    const visibility = () => { if (dialog.current) dialog.current.dataset.background = String(document.hidden); };
    document.addEventListener("visibilitychange", visibility);
    ritual.audio.play("gather");
    return () => { clearTimeout(timer.current); document.removeEventListener("visibilitychange", visibility); };
  }, [ritual.audio]);
  useEffect(() => {
    if (phase !== "gather") return;
    const wait = setTimeout(() => setPhase("charge"), reduced ? 120 : 750);
    return () => clearTimeout(wait);
  }, [phase, reduced]);
  useEffect(() => {
    if (phase !== "charge") return;
    ritual.audio.play("charge");
    const wait = setTimeout(() => setCharged(true), reduced ? 120 : 1000);
    return () => clearTimeout(wait);
  }, [phase, reduced, ritual.audio]);
  useEffect(() => {
    if (phase !== "charge" || !charged || !ritual.rewards) return;
    const wait = setTimeout(() => setPhase("open"), 0);
    return () => clearTimeout(wait);
  }, [phase, charged, ritual.rewards]);
  useEffect(() => {
    if (phase !== "open") return;
    ritual.audio.play("open");
    const wait = setTimeout(() => setPhase("cards"), reduced ? 180 : 1050);
    return () => clearTimeout(wait);
  }, [phase, reduced, ritual.audio]);
  useEffect(() => {
    if (phase === "cards") card.current?.focus({ preventScroll: true });
    if (phase === "summary") dialog.current?.querySelector<HTMLButtonElement>(".ritual-summary button")?.focus({ preventScroll: true });
  }, [phase, index]);
  function advance() {
    if (!reward || locked.current) return;
    locked.current = true;
    if (!revealed) {
      setRevealed(true);
      ritual.audio.play("reveal", reward.rarity === "Epic" || reward.rarity === "Legendary");
      timer.current = setTimeout(() => { locked.current = false; }, reduced ? 80 : 600);
    } else {
      ritual.audio.play("slide"); setSliding(true);
      timer.current = setTimeout(() => {
        if (index + 1 === ritual.count) setPhase("summary");
        else { setIndex(value => value + 1); setRevealed(false); }
        setSliding(false); locked.current = false;
      }, reduced ? 80 : 360);
    }
  }
  const origin = ritual.origin;
  const style = {
    "--start-x": `${origin.left + origin.width / 2 - innerWidth / 2}px`,
    "--start-y": `${origin.top + origin.height / 2 - innerHeight * .46}px`,
    "--start-scale": origin.width / Math.min(400, innerWidth * .82),
    "--loot-color": reward ? glow[reward.rarity] : "#e3b96e",
  } as CSSProperties;
  return <dialog ref={dialog} className="summon-ritual" data-phase={phase} style={style} aria-label="Summon treasure" onCancel={event => { event.preventDefault(); if (phase === "summary") dismiss(); }}>
    <div className="ritual-backdrop" />
    <button className="ritual-sound" aria-label={sound ? "Mute summon sound" : "Enable summon sound"} onClick={toggleSound}>{sound ? "Sound on" : "Sound off"}</button>
    <div className="ritual-stage" aria-hidden="true">
      <div className="ritual-ring ring-one" /><div className="ritual-ring ring-two" />
      <div className="ritual-chest-position"><div className="ritual-zoom"><div className="ritual-chest">
        <div className="chest-inner-light" />
        <img className="chest-body" src={miniIcons.chest} alt="" />
        <img className="chest-lid" src={miniIcons.chest} alt="" />
      </div></div></div>
      <div className="ritual-burst" />
      <div className="ritual-particles">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ "--angle": `${i * 20}deg`, "--travel": `${120 + i % 4 * 35}px`, "--delay": `${i % 3 * .04}s` } as CSSProperties} />)}</div>
    </div>
    {(phase === "gather" || phase === "charge" || phase === "open") && ritual.rewards && <div className="ritual-caption"><button className="ritual-skip" onClick={() => setPhase("cards")}>Skip animation</button></div>}
    {phase === "cards" && reward && <div className="ritual-reveal">
      <header><p>THE SCHOLAR'S VAULT</p><h2>{revealed ? "A treasure, uncovered." : "What did the chest find?"}</h2><span>{index + 1} / {ritual.count}</span></header>
      <div className="loot-stack">
        {[2, 1].filter(depth => index + depth < ritual.count).map(depth => <div key={depth} className="loot-card stack-shadow" aria-hidden="true" style={{ "--depth": depth } as CSSProperties}><CardBack /></div>)}
        <button key={index} ref={card} className={`loot-card active-card ${revealed ? "is-revealed" : ""} ${sliding ? "is-sliding" : ""}`} aria-label={revealed ? (index + 1 === ritual.count ? "View rewards" : "Next card") : `Reveal card ${index + 1} of ${ritual.count}`} onClick={advance}>
          <div className="card-turn"><div className="card-back"><CardBack /></div><div className="card-front">{revealed && <><span className="loot-rarity">{reward.rarity}</span><div className="loot-art-halo" /><img className="loot-art" src={inventory.find(item => item.name === reward.name)?.image ?? miniIcons.chest} alt="" /><div className="loot-name"><span>DISCOVERED</span><h3>{reward.name}</h3></div><span className="loot-seal"><Icon name="star-four-points" size={20} color="currentColor" /></span></>}</div></div>
        </button>
      </div>
      <div className="reveal-guidance" aria-live="polite"><p>{revealed ? reward.name : "Tap the card to reveal"}</p><span>{revealed ? (index + 1 === ritual.count ? "Tap again to view your treasures" : "Tap again to slide to the next card") : "One discovery at a time"}</span></div>
    </div>}
    {phase === "summary" && <div className="ritual-summary"><header><p>THE VAULT HAS SPOKEN</p><h2>Your treasures</h2><span>{ritual.count} {ritual.count === 1 ? "treasure" : "treasures"} revealed</span></header><div className="summary-items">{ritual.rewards?.map((item, i) => <div key={i} className="summary-item" style={{ "--loot-color": glow[item.rarity] } as CSSProperties}><img src={inventory.find(owned => owned.name === item.name)?.image ?? miniIcons.chest} alt="" /><strong>{item.name}</strong><span>{item.rarity}</span></div>)}</div><Button label="Return to Bazaar" tone="gold" onPress={dismiss} /></div>}
  </dialog>;
}
function CardBack() {
  return <div className="card-back-art"><div className="card-filigree" /><span className="card-corner top">&#10022;</span><span className="card-corner bottom">&#10022;</span><div className="card-emblem"><Icon name="treasure-chest" size={56} color="currentColor" /></div><span className="card-back-title">NERDUNGEON</span><span className="card-back-note">A treasure awaits</span></div>;
}
