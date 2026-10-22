import type { CSSProperties } from "react";
import { art, icons } from "../assets";
import { colors, fonts } from "../theme";
import { usePreference } from "../modules/settings/preferences";

function Resource({ kind, label }: { kind: "coins" | "gems"; label: string }) {
  return (
    <div
      aria-label={label + (kind === "coins" ? " Gold" : " Gems")}
      style={s.resource}
      className="stack"
    >
      <img
        src={icons[kind]}
        style={{ ...s.resourceImage, objectFit: "contain" }}
        className="art-image"
        alt=""
        draggable={false}
      />
      <span style={s.resourceValue} className="text">
        {label}
      </span>
    </div>
  );
}

export function PlayerHeader({
  onPressProfile,
  gold = 1450,
  gems = 320,
  xp = 1771,
}: {
  onPressProfile: () => void;
  gold?: number;
  gems?: number;
  xp?: number;
}) {
  const [displayName] = usePreference("nerdungeon.displayName", "Nerd Mage");
  return (
    <div style={s.header} className="stack player-header">
      <img
        src={art.headerPlank}
        alt=""
        aria-hidden="true"
        className="header-plank"
        draggable={false}
      />
      <button
        role="button"
        aria-label="Open player profile"
        onClick={onPressProfile}
        style={{ ...s.portrait }}
        className="stack pressable"
        type="button"
      >
        <img
          src={art.character}
          style={{ ...s.character, objectFit: "contain" }}
          className="art-image"
          alt=""
          draggable={false}
        />
      </button>
      <button type="button" aria-label="Open settings" onClick={onPressProfile} style={s.player} className="stack pressable">
        <span style={s.name} className="text">
          {displayName}
        </span>
        <div style={s.rankRow} className="stack">
          <span style={s.rank} className="text">
            Scholar · {xp.toLocaleString()} XP
          </span>
          <div style={s.level} className="stack">
            <span style={s.levelText} className="text">
              Lv.5
            </span>
          </div>
        </div>
        <div
          role="progressbar"
          aria-label="Player experience"
          aria-valuemin={0}
          aria-valuemax={2000}
          aria-valuenow={1250}
          style={s.track}
          className="stack"
        >
          <div style={s.fill} className="stack" />
        </div>
      </button>
      <div style={s.resources} className="stack">
        <Resource kind="coins" label={gold.toLocaleString()} />
        <Resource kind="gems" label={gems.toLocaleString()} />
      </div>
    </div>
  );
}

const s = {
  header: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 94,
    marginLeft: 12,
    marginRight: 12,
    marginTop: 10,
    marginBottom: 4,
    padding: "10px 14px",
    backgroundColor: "transparent",
    borderRadius: 18,
  },
  portrait: {
    position: "relative",
    zIndex: 1,
    width: 54,
    height: 62,
    backgroundColor: "#3a2211",
    borderWidth: 2,
    borderColor: "#744622",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 1px 4px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)",
  },
  character: { width: 52, height: 52 },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  level: {
    borderWidth: 1,
    borderColor: "#573514",
    borderRadius: 6,
    backgroundColor: colors.gold,
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 1,
    paddingBottom: 1,
    boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
  },
  levelText: { fontFamily: fonts.heading, fontSize: 11, color: "#3d2105" },
  player: { position: "relative", zIndex: 1, flex: "1 1 0%", minWidth: 0, gap: 5 },
  name: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: "#fff8ea",
    textShadow: "0 1px 3px rgba(0, 0, 0, 0.85)",
  },
  rank: {
    fontFamily: fonts.label,
    fontSize: 11,
    color: "#f3d8a5",
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.8)",
  },
  track: {
    height: 8,
    padding: 1,
    backgroundColor: "#271408",
    borderWidth: 1,
    borderColor: "#573514",
    borderRadius: 5,
    overflow: "hidden",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.7)",
  },
  fill: {
    width: "62.5%",
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.gold,
  },
  resources: { position: "relative", zIndex: 1, gap: 5 },
  resource: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 77,
    borderWidth: 1,
    borderColor: "#573514",
    backgroundColor: "#2e1808d9",
    borderRadius: 20,
    paddingRight: 8,
    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)",
  },
  resourceImage: { width: 25, height: 25 },
  resourceValue: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: "#fff4d4",
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.7)",
  },
} satisfies Record<string, CSSProperties>;
