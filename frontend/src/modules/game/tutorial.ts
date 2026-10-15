import type { Expedition, Region } from "./types";

const regions = (topics: string[]): Region[] =>
  topics.slice(0, 3).map((title, index) => ({
    chapter: index + 1,
    title,
    summary: `Kuasai konsep inti ${title.toLowerCase()} sebelum menghadapi encounter di akhir region.`,
    topics: [
      `Konsep dasar ${title}`,
      "Penerapan dan contoh penting",
      "Kesalahan umum yang harus dihindari",
    ],
    questions: 10,
    enemies: index + 1,
  }));
export const expeditions: Expedition[] = [
  {
    id: "tutorial",
    title: "Tutorial — Fotosintesis",
    file: "Tutorial",
    progress: 0,
    regions: regions(["Reaksi Terang", "Siklus Calvin", "Metabolisme"]),
  },
];
