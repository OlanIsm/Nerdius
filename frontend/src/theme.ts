import type { CSSProperties } from "react";
export const colors = {
  background: "#f5efdc",
  parchment: "#fff8e7",
  inset: "#eadfc1",
  ink: "#352d26",
  muted: "#6c604c",
  wood: "#745336",
  woodLight: "#a17b51",
  edge: "#574432",
  gold: "#f4c35b",
  teal: "#3c705f",
  mint: "#dcebdd",
  sage: "#dce7cc",
  sky: "#ddebf0",
  white: "#ffffff",
  red: "#a4443d",
};
export const rarity = {
  Common: { ink: "#595d50", fill: "#e9ebdf", edge: "#7b836d" },
  Rare: { ink: "#285c77", fill: "#deedf5", edge: "#4b86a6" },
  Epic: { ink: "#74538b", fill: "#eee3f2", edge: "#9370a8" },
  Legendary: { ink: "#875616", fill: "#faedc3", edge: "#bd892e" },
};
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radii = { slot: 12, panel: 20, banner: 10, pill: 99 };
export const outline = { fine: 1, standard: 2, strong: 3, base: 5 };
export const typeSize = {
  caption: 11,
  label: 12,
  body: 13,
  title: 18,
  display: 27,
};
export const shadows = {
  panel: {},
  raised: {},
};
export const fonts = {
  heading: "Rubik_700Bold",
  heavy: "Rubik_900Black",
  body: "Epilogue_500Medium",
  label: "SpaceGrotesk_700Bold",
};
export const ui = {
  column: { gap: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  flex: { flex: "1 1 0%" },
  center: { alignItems: "center", justifyContent: "center" },
  panel: {
    backgroundColor: colors.parchment,
    borderRadius: radii.panel,
    padding: space.lg,
    gap: 12,
    borderWidth: outline.standard,
    borderColor: colors.edge,
    borderBottomWidth: outline.base,
  },
  inset: {
    backgroundColor: colors.inset,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 20,
    color: colors.wood,
    lineHeight: 1.35,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.ink,
    lineHeight: 1.35,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 1.2,
  },
  label: {
    fontFamily: fonts.label,
    fontSize: typeSize.label,
    color: colors.muted,
    lineHeight: 1.35,
    letterSpacing: 0.3,
  },
  hero: {
    fontFamily: fonts.heavy,
    fontSize: 24,
    lineHeight: 1.2,
    color: colors.wood,
  },
} satisfies Record<string, CSSProperties>;
