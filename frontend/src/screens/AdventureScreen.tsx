import type { CSSProperties } from "react";
import { useState } from "react";
import { mapArt } from "../assets";
import { Button, Icon } from "../components/GameUI";
import type { IconName } from "../components/GameUI";
import {
  AdventurePath,
  chapterState,
  currentChapter,
} from "../components/AdventurePath";
import { RealmFrame, RealmButton } from "../components/FantasyUI";
import { colors, fonts, ui } from "../theme";
import type { Expedition, Region } from "../modules/game/types";
import { expeditions } from "../modules/game/tutorial";

export function AdventureScreen({
  onSelect,
  onInspect,
  expeditions: items = expeditions,
}: {
  onSelect: (expedition: Expedition, region?: Region) => void;
  onInspect: () => void;
  expeditions?: Expedition[];
}) {
  const [active, setActive] = useState(0);
  const [chapter, setChapter] = useState(
    currentChapter(expeditions[0].progress, expeditions[0].regions.length),
  );
  const expedition = items[Math.min(active, items.length - 1)];
  const selectedRegion =
    expedition.regions[Math.min(chapter, expedition.regions.length - 1)];
  const isTutorial =
    expedition.id === "tutorial" ||
    expedition.title.toLowerCase().includes("tutorial");
  const cleanTitle = expedition.title.replace(/^Tutorial\s*[—–-]\s*/i, "");

  return (
    <div className="expedition-page stack">
      {/* 1. "Your Expeditions" Parchment Banner */}
      <div className="css-expeditions-banner">
        <div className="banner-scroll-icon" aria-hidden="true">📜</div>
        <div className="banner-copy stack">
          <span className="banner-title text">Your Expeditions</span>
          <span className="banner-subtitle text">
            Complete quests, gain knowledge, and level up!
          </span>
        </div>
      </div>

      {/* 2. Current Expedition Dark Wood Selector Pill */}
      <button
        role="button"
        aria-label={`Open ${expedition.title}`}
        onClick={() => onSelect(expedition)}
        className="css-expedition-selector-pill pressable"
        type="button"
      >
        <div className="pill-tome-icon" aria-hidden="true">
          <Icon name="book-open-page-variant-outline" size={24} color="#ffd480" />
        </div>
        <div className="pill-copy stack">
          <span className="pill-category text">
            {isTutorial ? "Tutorial" : "Expedition"}
          </span>
          <span className="pill-title text">{isTutorial ? cleanTitle : expedition.title}</span>
        </div>
        <span className="pill-chevron text" aria-hidden="true">›</span>
      </button>

      {/* Multiple Expeditions Selector (when > 1 study material exists) */}
      {items.length > 1 && (
        <div aria-label="Choose study material" className="scroll horizontal">
          <div className="stack horizontal-content" style={s.scrollChoices}>
            {items.map((item, index) => (
              <button
                key={item.file}
                role="button"
                aria-label={`Select ${item.title}`}
                aria-pressed={active === index}
                onClick={() => {
                  setActive(index);
                  setChapter(currentChapter(item.progress, item.regions.length));
                }}
                className={`css-expedition-choice-btn pressable ${active === index ? "active" : ""}`}
                type="button"
              >
                <Icon
                  name="book-open-page-variant-outline"
                  size={18}
                  color={active === index ? "#fff4d4" : "#6c401c"}
                />
                <span className="choice-text text">{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Breadcrumb Row with Leaf Icon */}
      <div className="css-expedition-breadcrumb">
        <span className="breadcrumb-leaf" aria-hidden="true">🍃</span>
        <span className="breadcrumb-text text">
          {isTutorial ? `Tutorial — ${cleanTitle}` : `Expedition — ${expedition.title}`}
        </span>
      </div>

      {/* 4. Grand Wooden Board with Parchment Map Frame */}
      <AdventurePath
        chapters={expedition.regions}
        progress={expedition.progress}
        selected={selectedRegion.chapter}
        onSelect={(region) => {
          setChapter(
            expedition.regions.findIndex(
              (item) => item.chapter === region.chapter,
            ),
          );
          onInspect();
        }}
      />

      {/* 5. Chapter Detail / Briefing Card */}
      <div className="css-chapter-briefing-card stack">
        <div className="briefing-header-row">
          <div className="briefing-flag-pill">
            <span className="flag-icon" aria-hidden="true">🚩</span>
            <span className="chapter-label text">Chapter {selectedRegion.chapter}</span>
          </div>
          <div
            className={`briefing-status-badge ${chapterState(
              expedition.progress,
              expedition.regions.length,
              chapter,
            ).toLowerCase()}`}
          >
            <span className="text">
              {chapterState(
                expedition.progress,
                expedition.regions.length,
                chapter,
              )}
            </span>
          </div>
        </div>

        <div className="briefing-body-row">
          <div className="briefing-icon-box" aria-hidden="true">
            <span className="topic-sun">☀️</span>
            <span className="topic-sprout">🌱</span>
          </div>
          <div className="briefing-copy stack">
            <span className="briefing-title text">{selectedRegion.title}</span>
            <span className="briefing-summary text">{selectedRegion.summary}</span>
            <span className="briefing-meta text">
              {selectedRegion.questions} questions · Up to {selectedRegion.enemies} enemies
            </span>
          </div>
        </div>

        <Button
          label="View chapter"
          icon="arrow-right"
          tone="gold"
          onPress={() => onSelect(expedition, selectedRegion)}
        />
      </div>
    </div>
  );
}

export function ExpeditionCard({
  expedition,
  onPress,
}: {
  expedition: Expedition;
  onPress: () => void;
}) {
  return (
    <button
      role="button"
      aria-label={`Open ${expedition.title}`}
      onClick={onPress}
      style={{ ...s.material }}
      className="stack pressable"
      type="button"
    >
      <div aria-hidden={true} style={s.fold} className="stack" />
      <div style={s.document} className="stack">
        <Icon name="file-document-outline" size={26} color={colors.wood} />
      </div>
      <div style={s.materialCopy} className="stack">
        <span style={s.materialTitle} className="text">
          {expedition.title}
        </span>
        <span style={s.fileName} className="text">
          {expedition.file}
        </span>
        <div style={ui.row} className="stack">
          <span style={s.fileName} className="text">
            {expedition.regions.length} chapters
          </span>
        </div>
      </div>
      <Icon name="chevron-right" size={22} color={colors.wood} />
    </button>
  );
}

export function RegionScreen({
  expedition,
  onBack,
  onSelect,
}: {
  expedition: Expedition;
  onBack: () => void;
  onSelect: (region: Region) => void;
}) {
  const current = currentChapter(
    expedition.progress,
    expedition.regions.length,
  );
  return (
    <div className="scroll">
      <div className="stack" style={s.regionPage}>
        <div style={s.backHeading} className="stack">
          <BackButton onPress={onBack} />
          <div style={ui.flex} className="stack">
            <span style={s.regionTitle} className="text">
              {expedition.title}
            </span>
            <span style={ui.body} className="text">
              Choose your next chapter
            </span>
          </div>
        </div>
        <AdventurePath
          chapters={expedition.regions}
          progress={expedition.progress}
          selected={expedition.regions[current].chapter}
          onSelect={(chapter) => {
            const region = expedition.regions.find(
              (item) => item.chapter === chapter.chapter,
            );
            if (region) onSelect(region);
          }}
        />
        <div style={s.mapLegend} className="stack">
          <div style={ui.row} className="stack">
            <Icon name="check-circle" size={18} color="#af791d" />
            <span style={ui.label} className="text">
              Completed
            </span>
          </div>
          <div style={ui.row} className="stack">
            <Icon name="flag-variant" size={18} color={colors.wood} />
            <span style={ui.label} className="text">
              Current
            </span>
          </div>
          <div style={ui.row} className="stack">
            <Icon name="circle-outline" size={18} color={colors.muted} />
            <span style={ui.label} className="text">
              Available
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RegionDetailScreen({
  expedition,
  region,
  onBack,
  onStart,
}: {
  expedition: Expedition;
  region: Region;
  onBack: () => void;
  onStart: () => void;
}) {
  const index = expedition.regions.findIndex(
    (item) => item.chapter === region.chapter,
  );
  return (
    <div className="scroll">
      <div className="stack" style={s.regionPage}>
        <div style={s.backHeading} className="stack">
          <BackButton onPress={onBack} />
          <div style={ui.flex} className="stack">
            <span style={ui.body} className="text">
              {expedition.title}
            </span>
            <span style={s.detailTitle} className="text">
              Chapter {region.chapter}: {region.title}
            </span>
          </div>
        </div>
        <div style={s.regionShowcase} className="stack">
          <img
            src={[mapArt.desert, mapArt.volcano, mapArt.kingdom][index % 3]}
            style={{ ...s.regionImage, objectFit: "contain" }}
            className="art-image"
            alt=""
            draggable={false}
          />
        </div>
        <RealmFrame>
          <span style={ui.heading} className="text">
            Your quest
          </span>
          <span style={ui.body} className="text">
            {region.summary}
          </span>
          <span style={ui.body} className="text">
            Start with 500 HP. Each enemy has 100 HP. Correct answers deal 50 damage; wrong answers cost you 50 HP. Finish every question with HP remaining to win. Unfinished answers are saved.
          </span>
          {region.material && (
            <div style={s.topics} className="stack">
              <span style={ui.heading} className="text">Study material</span>
              {region.material.split(/\n\s*\n/).map((paragraph, pIdx) => (
                <p key={pIdx} style={{ ...ui.body, margin: 0, whiteSpace: "pre-wrap" }}>
                  {paragraph}
                </p>
              ))}
              {!!region.sourcePages?.length && (
                <span style={ui.body} className="text">
                  PDF pages: {region.sourcePages.join(", ")}
                </span>
              )}
            </div>
          )}
          <div style={s.topics} className="stack">
            {region.topics.map((topic, i) => (
              <div key={topic} style={s.topic} className="stack">
                <div style={s.topicNumber} className="stack">
                  <span style={s.topicNumberText} className="text">
                    {i + 1}
                  </span>
                </div>
                <span style={s.topicText} className="text">
                  {topic}
                </span>
              </div>
            ))}
          </div>
          <div style={s.encounterMeta} className="stack">
            <Badge
              text={`${region.questions} questions`}
              icon="help-circle-outline"
            />
            <Badge text={`Up to ${region.enemies} enemies`} icon="sword-cross" />
          </div>
        </RealmFrame>
        <div style={s.readyBlock} className="stack">
          <RealmButton
            label="Start Adventure"
            icon="sword-cross"
            onPress={onStart}
          />
        </div>
      </div>
    </div>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <button
      role="button"
      aria-label="Back"
      onClick={onPress}
      style={{ ...s.back }}
      className="stack pressable"
      type="button"
    >
      <Icon name="arrow-left" color={colors.ink} size={24} />
    </button>
  );
}

function Badge({ text, icon }: { text: string; icon: IconName }) {
  return (
    <div style={s.badge} className="stack">
      <Icon name={icon} size={16} color="#8a531f" />
      <span style={s.badgeText} className="text">
        {text}
      </span>
    </div>
  );
}

const s = {
  scrollChoices: { gap: 8, paddingTop: 3, paddingBottom: 3, paddingRight: 12 },
  material: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: "#b7a27b",
    backgroundColor: colors.parchment,
    borderRadius: 12,
    borderTopRightRadius: 3,
    overflow: "hidden",
  },
  document: {
    width: 36,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: colors.inset,
  },
  materialCopy: { flex: "1 1 0%", minWidth: 0, gap: 5 },
  materialTitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
    lineHeight: "20px",
    color: colors.ink,
  },
  fileName: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: "16px",
    color: colors.muted,
  },
  fold: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 13,
    height: 13,
    backgroundColor: colors.inset,
    borderBottomLeftRadius: 8,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#b7a27b",
  },
  regionPage: { padding: 16, paddingTop: 24, paddingBottom: 32, gap: 22 },
  backHeading: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#d6ae7c",
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.edge,
    borderRadius: 14,
  },
  regionTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    lineHeight: "28px",
    color: colors.ink,
  },
  detailTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    lineHeight: "22px",
    color: colors.wood,
  },
  regionShowcase: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
  },
  regionImage: {
    width: "100%",
    maxWidth: 320,
    height: 180,
  },
  topics: { gap: 10 },
  topic: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    backgroundColor: "#e8d2b2",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbb18e",
  },
  topicNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#54331a",
    alignItems: "center",
    justifyContent: "center",
  },
  topicNumberText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.parchment,
  },
  topicText: {
    flex: "1 1 0%",
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.ink,
  },
  encounterMeta: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    backgroundColor: "#e8d5b5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cca875",
  },
  badgeText: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: "#5c3714",
  },
  readyBlock: {
    marginTop: 10,
  },
  mapLegend: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 12,
    backgroundColor: "#e8d7ba",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cca875",
  },
} satisfies Record<string, CSSProperties>;
