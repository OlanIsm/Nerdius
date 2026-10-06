import { useEffect, useState, type CSSProperties } from "react";
import { colors, ui } from "../theme";
import { iconGlyphs } from "./iconGlyphs";
import { usePreference } from "../modules/settings/preferences";
export type IconName = keyof typeof iconGlyphs;
export function Icon({
  name,
  size = 22,
  color = colors.wood,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <span aria-hidden="true" className="icon" style={{ fontSize: size, color }}>
      {String.fromCodePoint(iconGlyphs[name])}
    </span>
  );
}
export function useReducedMotion() {
  const [preference] = usePreference("nerdungeon.reduceMotion", "off");
  const [reduced, setReduced] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced || preference === "on";
}
export function Button({
  label,
  icon,
  onPress,
  tone = "wood",
  disabled = false,
  style,
}: {
  label: string;
  icon?: IconName;
  onPress: () => void;
  tone?: "wood" | "gold" | "teal" | "quiet";
  disabled?: boolean;
  style?: CSSProperties;
}) {
  const color = tone === "wood" || tone === "teal" ? colors.white : colors.ink;
  return (
    <button
      type="button"
      className={`game-button ${tone}`}
      aria-label={label}
      disabled={disabled}
      onClick={onPress}
      style={{
        backgroundColor: {
          wood: colors.wood,
          gold: colors.gold,
          teal: colors.teal,
          quiet: colors.inset,
        }[tone],
        color,
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={20} color={color} />}
      <span>{label}</span>
    </button>
  );
}
export function Badge({
  text,
  color = colors.wood,
  icon,
}: {
  text: string;
  color?: string;
  icon?: IconName;
}) {
  return (
    <div className="badge" style={{ color }}>
      {icon && <Icon name={icon} color={color} size={14} />}
      <span style={{ ...ui.label, color }}>{text}</span>
    </div>
  );
}
export function Meter({
  value,
  color = colors.teal,
  label,
}: {
  value: number;
  color?: string;
  label?: string;
}) {
  const amount = Math.min(100, Math.max(0, value));
  return (
    <div className="stack" style={{ gap: 4 }}>
      {label && <span style={ui.label}>{label}</span>}
      <div
        className="meter"
        role="progressbar"
        aria-label={label ?? "Progress"}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={amount}
      >
        <div
          style={{
            width: `${amount}%`,
            backgroundColor: color,
            height: "100%",
            borderRadius: 6,
          }}
        />
      </div>
    </div>
  );
}
export function SectionTitle({ title }: { title: string }) {
  return <span style={ui.heading}>{title}</span>;
}
