import { useRef } from "react";
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
  const map = useRef<HTMLDivElement>(null);

  return (
    <div className="css-expedition-map-board">
      {/* Metal Corner Brackets */}
      <div className="corner-bracket top-left" aria-hidden="true"><span>•</span></div>
      <div className="corner-bracket top-right" aria-hidden="true"><span>•</span></div>
      <div className="corner-bracket bottom-left" aria-hidden="true">
        <span>•</span>
        <div className="corner-leaves" />
      </div>
      <div className="corner-bracket bottom-right" aria-hidden="true"><span>•</span></div>

      {/* Inner Weathered Parchment Map Surface */}
      <div
        ref={map}
        aria-label="Adventure path"
        className="css-expedition-parchment-map stack"
        style={{
          backgroundImage: `url("${mapArt.background}")`,
        }}
      >
        {/* Subtle Nautical Compass Rose Watermark */}
        <div className="compass-rose-watermark" aria-hidden="true">
          <svg viewBox="0 0 100 100" width="76" height="76">
            <polygon points="50,10 56,44 90,50 56,56 50,90 44,56 10,50 44,44" fill="#a47238" opacity="0.3" />
            <polygon points="50,22 54,46 78,50 54,54 50,78 46,54 22,50 46,46" fill="#805424" opacity="0.35" />
            <circle cx="50" cy="50" r="14" fill="none" stroke="#805424" strokeWidth="1.5" opacity="0.35" />
            <circle cx="50" cy="50" r="3" fill="#805424" opacity="0.45" />
          </svg>
        </div>

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
              className="chapter-stop pressable"
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
                  <Icon name="check" size={24} color="#5b350f" />
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
                <div className={`chapter-status ${state.toLowerCase()}`}>
                  {state === "Current" ? (
                    <>
                      <span className="status-glyph" aria-hidden="true">✓</span>
                      <span className="status-label">Current</span>
                    </>
                  ) : state === "Available" ? (
                    <>
                      <span className="status-glyph" aria-hidden="true">🔒</span>
                      <span className="status-label">Available</span>
                    </>
                  ) : (
                    <>
                      <span className="status-glyph" aria-hidden="true">✓</span>
                      <span className="status-label">Completed</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
