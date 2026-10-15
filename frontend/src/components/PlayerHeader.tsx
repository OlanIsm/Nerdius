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
      <div aria-hidden={true} style={s.highlight} className="stack" />
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
        <div style={s.level} className="stack">
          <span style={s.levelText} className="text">
            Lv. 5
          </span>
        </div>
      </button>
      <button type="button" aria-label="Open settings" onClick={onPressProfile} style={s.player} className="stack pressable">
        <span style={s.name} className="text">
          {displayName}
        </span>
        <span style={s.rank} className="text">
          Scholar · {xp.toLocaleString()} XP
        </span>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 94,
    marginLeft: 12,
    marginRight: 12,
    marginTop: 10,
    marginBottom: 4,
    padding: 10,
    backgroundColor: colors.parchment,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.edge,
    borderRadius: 22,
    borderBottomLeftRadius: 14,
  },
  highlight: {
    position: "absolute",
    top: 3,
    left: 18,
    right: 18,
    height: 3,
    backgroundColor: colors.white,
    borderRadius: 2,
  },
  portrait: {
    width: 54,
    height: 62,
    backgroundColor: colors.sage,
    borderWidth: 2,
    borderColor: colors.edge,
    borderRadius: 15,
    alignItems: "center",
  },
  character: { width: 52, height: 52 },
  level: {
    position: "absolute",
    bottom: -4,
    borderWidth: 1,
    borderColor: colors.edge,
    borderRadius: 6,
    backgroundColor: colors.gold,
    paddingLeft: 6,
    paddingRight: 6,
    paddingTop: 1,
    paddingBottom: 1,
  },
  levelText: { fontFamily: fonts.heading, fontSize: 11, color: colors.ink },
  player: { flex: "1 1 0%", minWidth: 0, gap: 5 },
  name: { fontFamily: fonts.heading, fontSize: 16, color: colors.ink },
  rank: { fontFamily: fonts.label, fontSize: 11, color: colors.muted },
  track: {
    height: 8,
    padding: 1,
    backgroundColor: colors.inset,
    borderWidth: 1,
    borderColor: "#ac9978",
    borderRadius: 5,
    overflow: "hidden",
  },
  fill: {
    width: "62.5%",
    height: "100%",
    borderRadius: 4,
    backgroundColor: colors.teal,
  },
  resources: { gap: 5 },
  resource: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 77,
    borderWidth: 1,
    borderColor: "#baa47d",
    backgroundColor: "#f5e8c6",
    borderRadius: 20,
    paddingRight: 8,
  },
  resourceImage: { width: 25, height: 25 },
  resourceValue: { fontFamily: fonts.heading, fontSize: 12, color: colors.ink },
} satisfies Record<string, CSSProperties>;
