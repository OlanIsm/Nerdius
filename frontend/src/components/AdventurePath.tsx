import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { mapArt } from "../assets";
import { Icon } from "./GameUI";
type Chapter = {
  chapter: number;
  title: string;
  questions: number;
};
export function chapterState(progress: number, count: number, index: number) {
  const completed = Math.round((progress / 100) * count);
  return index < completed
    ? "Completed"
    : index === completed
      ? "Current"
      : "Available";
}
export function currentChapter(progress: number, count: number) {
  return Math.min(count - 1, Math.round((progress / 100) * count));
}
const regionArt = [mapArt.desert, mapArt.volcano, mapArt.kingdom];
export function AdventurePath({
  chapters,
  progress,
  selected,
  onSelect,
}: {
  chapters: Chapter[];
  progress: number;
  selected: number;
  onSelect: (chapter: Chapter) => void;
}) {
  const [width, setWidth] = useState(288);
  const map = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(map.current!);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={map}
      aria-label="Adventure path"
      style={{ ...s.map, ...{ minHeight: chapters.length * 108 + 20 } }}
      className="stack"
    >
      {chapters.slice(1).map((chapter, index) => (
        <div
          key={chapter.chapter}
          aria-hidden={true}
          style={{ position: "absolute", inset: 0 }}
          className="stack"
        >
          {Array.from({ length: 15 }, (_, dot) => {
            const t = (dot + 1) / 16;
            const bend = t * t * (3 - 2 * t);
            const x =
              index % 2 === 0
                ? 49 + (width - 98) * bend
                : width - 49 - (width - 98) * bend;
            return (
              <div
                key={dot}
                style={{
                  ...s.pathDot,
                  ...{ left: x - 3, top: 56 + index * 108 + t * 108 },
                }}
                className="stack"
              />
            );
          })}
        </div>
      ))}
      {chapters.map((chapter, index) => {
        const state = chapterState(progress, chapters.length, index);
        const active = selected === chapter.chapter;
        return (
          <button
            key={chapter.chapter}
            role="button"
            aria-label={`Open Chapter ${chapter.chapter}: ${chapter.title}`}
            title={`${state}. ${chapter.questions} questions.`}
            aria-pressed={active}
            onClick={() => onSelect(chapter)}
            style={{ top: index * 108 + 10 }}
            className={`chapter-stop pressable ${index % 2 ? "reverse" : ""}`}
            type="button"
          >
            <img
              src={regionArt[index % regionArt.length]}
              className="chapter-island"
              alt=""
              draggable={false}
            />
            <div
              className={`chapter-node ${state === "Completed" ? "completed" : state === "Current" ? "current" : "unfinished"} ${active ? "selected" : ""}`}
              aria-hidden="true"
            >
              {state === "Completed" ? (
                <Icon name="check" size={25} color="#5b350f" />
              ) : (
                <span>{chapter.chapter}</span>
              )}
            </div>
            <div className={`chapter-card ${state === "Current" ? "current" : ""} ${active ? "selected" : ""}`}>
              <div className="chapter-copy">
                <span className="chapter-meta">
                  Chapter {chapter.chapter} &middot; {chapter.questions} questions
                </span>
                <span className="chapter-title">{chapter.title}</span>
              </div>
              <span className={`chapter-status ${state.toLowerCase()}`}>
                {state}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
const s = {
  map: {
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: "#c88d47",
    backgroundImage: `url("${mapArt.background}")`,
    backgroundSize: "100% 100%",
    backgroundPosition: "center",
    borderWidth: 1,
    borderColor: "#976634",
  },
  pathDot: {
    position: "absolute",
    width: 7,
    height: 7,
    backgroundColor: "#80582f",
    borderRadius: 4,
  },
} satisfies Record<string, CSSProperties>;
