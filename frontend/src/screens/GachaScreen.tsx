import { useEffect, useRef, useState } from "react";
import { art, miniIcons } from "../assets";
import { inventory } from "../data/inventory";
import { Button } from "../components/GameUI";
import { rarity } from "../theme";
import type { ScreenProps } from "../types";
import { SummonRitual, type Ritual } from "../components/SummonRitual";
import { summonAudio } from "../components/summonAudio";
import type { GameData, SummonItem } from "../modules/game/types";
import { usePreference } from "../modules/settings/preferences";

export function GachaScreen({
  notify,
  onSummon,
  onSummoningChange,
  pool = [],
  gems,
}: ScreenProps & {
  onSummon: (count: 1 | 10) => Promise<GameData>;
  onSummoningChange: (active: boolean) => void;
  pool?: SummonItem[];
  gems?: number;
}) {
  const [ritual, setRitual] = useState<Ritual>();
  const [soundPreference, saveSound] = usePreference("nerdungeon.summonSound", "on");
  const sound = soundPreference !== "off";
  const [details, setDetails] = useState(false);
  const chest = useRef<HTMLImageElement>(null);
  const pending = useRef(false);
  const audio = useRef<ReturnType<typeof summonAudio> | undefined>(undefined);
  useEffect(() => { audio.current?.setEnabled(sound); }, [sound]);
  useEffect(() => {
    inventory.forEach(item => { const image = new Image(); image.src = item.image; });
    return () => audio.current?.close();
  }, []);
  function finish() {
    audio.current?.close(); audio.current = undefined;
    pending.current = false; setRitual(undefined); onSummoningChange(false);
  }
  async function summon(count: 1 | 10) {
    if (pending.current || !chest.current) return;
    if (gems === undefined) { notify("Game data is still loading. Try again."); return; }
    if (gems < (count === 10 ? 900 : 100)) { notify("Gems tidak cukup."); return; }
    pending.current = true;
    const effects = summonAudio(sound); audio.current = effects;
    const ceremony: Ritual = { count, origin: chest.current.getBoundingClientRect(), rewards: null, audio: effects };
    setRitual(ceremony); onSummoningChange(true);
    try {
      const data = await onSummon(count);
      if (data.rewards?.length !== count) throw new Error("Could not show summon results. Check your bag before summoning again.");
      setRitual({ ...ceremony, rewards: data.rewards.map(name => ({ name, rarity: pool.find(item => item.name === name)?.rarity ?? "Common" })) });
    } catch (error) {
      finish();
      notify(error instanceof Error ? error.message : "Summon failed. Check your bag before trying again.");
    }
  }
  return (
    <div className="bazaar-page">
      <div className="bazaar-showcase">
        <button
          type="button"
          className="chest-trigger"
          aria-label="View obtainable items and drop rates"
          aria-haspopup="dialog"
          onClick={() => setDetails(true)}
        >
          <div className="chest-aura" aria-hidden="true" />
          <img
            ref={chest}
            src={miniIcons.chest}
            alt="Scholar treasure chest"
            className="bazaar-chest"
            draggable={false}
          />
        </button>
      </div>
      <div className="summon-actions">
        <button
          type="button"
          className="summon-action single"
          aria-label="Summon 1x"
          aria-description="Costs 100 gems"
          title="Costs 100 gems"
          aria-busy={ritual?.count === 1}
          disabled={!!ritual}
          onClick={() => summon(1)}
        >
          <SingleSummonArt />
        </button>
        <button
          type="button"
          className="summon-action ten"
          aria-label="Summon 10x"
          aria-description="Costs 900 gems"
          title="Costs 900 gems"
          aria-busy={ritual?.count === 10}
          disabled={!!ritual}
          onClick={() => summon(10)}
        >
          <img className="summon-reference" src={art.summon10x} alt="" />
        </button>
      </div>
      {ritual && <SummonRitual ritual={ritual} dismiss={finish} sound={sound} toggleSound={() => {
        const next = !sound;
        try { saveSound(next ? "on" : "off"); audio.current?.setEnabled(next); }
        catch (error) { notify(error instanceof Error ? error.message : "Could not save sound preference."); }
      }} />}
      {details && <DropRates pool={pool} dismiss={() => setDetails(false)} />}
    </div>
  );
}

function SingleSummonArt() {
  // Reuse the reference lettering and gem so both variants match on every device.
  return (
    <svg className="summon-reference" viewBox="0 0 789 292" aria-hidden="true">
      <defs>
        <filter id="summon-brown-ink" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 .2902 0 0 0 0 .1412 0 0 0 0 .0392 -1.41 0 0 0 1.41"
          />
        </filter>
        <filter id="summon-white-ink" colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 -1.41 0 0 0 1.41"
          />
        </filter>
        <clipPath id="summon-word">
          <rect x="145" y="45" width="343" height="95" />
        </clipPath>
        <clipPath id="summon-one">
          <rect x="505" y="45" width="34" height="95" />
        </clipPath>
        <clipPath id="summon-times">
          <rect x="592" y="45" width="44" height="95" />
        </clipPath>
        <clipPath id="summon-price-pill">
          <rect x="210" y="149" width="352" height="86" rx="43" />
        </clipPath>
      </defs>
      <rect x="6" y="30" width="782" height="260" rx="56" fill="#345b95" />
      <rect x="6" y="6" width="782" height="259" rx="56" fill="#91cef5" />
      <g transform="translate(23 0)">
        <g clipPath="url(#summon-word)">
          <image
            href={art.summon10x}
            width="789"
            height="292"
            filter="url(#summon-brown-ink)"
          />
        </g>
        <g clipPath="url(#summon-one)">
          <image
            href={art.summon10x}
            width="789"
            height="292"
            filter="url(#summon-brown-ink)"
          />
        </g>
        <g transform="translate(-47 0)" clipPath="url(#summon-times)">
          <image
            href={art.summon10x}
            width="789"
            height="292"
            filter="url(#summon-brown-ink)"
          />
        </g>
      </g>
      <g clipPath="url(#summon-price-pill)">
        <image href={art.summon10x} width="789" height="292" />
      </g>
      <rect x="392" y="165" width="27" height="57" fill="#3d200a" />
      <svg
        x="398"
        y="170"
        width="18"
        height="45"
        viewBox="507 55 31 78"
        preserveAspectRatio="none"
      >
        <image
          href={art.summon10x}
          width="789"
          height="292"
          filter="url(#summon-white-ink)"
        />
      </svg>
    </svg>
  );
}

function DropRates({
  pool,
  dismiss,
}: {
  pool: SummonItem[];
  dismiss: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const totals = pool.reduce<Partial<Record<keyof typeof rarity, number>>>(
    (result, item) => {
      result[item.rarity] = (result[item.rarity] ?? 0) + item.chance;
      return result;
    },
    {},
  );
  return (
    <dialog
      ref={dialog}
      className="drop-rates"
      aria-labelledby="drop-rates-title"
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="drop-rates-content">
        <header className="drop-rates-heading">
          <div>
            <h2 id="drop-rates-title">Obtainable items</h2>
            <p>Chances per summon</p>
          </div>
          <button
            type="button"
            className="drop-rates-close"
            aria-label="Close drop rates"
            onClick={dismiss}
          >
            Close
          </button>
        </header>
        {pool.length ? (
          <>
            <div className="rarity-totals" aria-label="Rarity chances">
              {Object.entries(totals).map(([name, chance]) => (
                <span
                  key={name}
                  style={{
                    color: rarity[name as keyof typeof rarity].ink,
                    backgroundColor: rarity[name as keyof typeof rarity].fill,
                  }}
                >
                  {name} <strong>{chance}%</strong>
                </span>
              ))}
            </div>
            <ul className="drop-item-list">
              {pool.map((item) => (
                <li key={item.name}>
                  <img
                    src={
                      inventory.find((owned) => owned.name === item.name)?.image
                    }
                    alt=""
                  />
                  <div>
                    <strong>{item.name}</strong>
                    <span style={{ color: rarity[item.rarity].ink }}>
                      {item.rarity}
                    </span>
                  </div>
                  <b>{item.chance}%</b>
                </li>
              ))}
            </ul>
            <p className="drop-rates-note">
              Each of the 10 pulls is independent. Duplicate items are possible.
            </p>
          </>
        ) : (
          <p>Drop rates unavailable. Check the backend connection.</p>
        )}
        <Button label="Got it" tone="gold" onPress={dismiss} />
      </div>
    </dialog>
  );
}
