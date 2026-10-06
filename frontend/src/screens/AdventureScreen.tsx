import type { CSSProperties } from "react";
import { useState } from "react";
import { mapArt } from "../assets";
import { Badge, Button, Icon, Meter } from "../components/GameUI";
import {
  AdventurePath,
  chapterState,
  currentChapter,
} from "../components/AdventurePath";
import { RealmFrame, RealmButton, fantasy } from "../components/FantasyUI";
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
  return (
    <div style={s.page} className="stack">
      <div style={s.pageHeading} className="stack">
        <span style={fantasy.title} className="text">
          Your Expeditions
        </span>
        <span style={fantasy.body} className="text">
          A chapter at a time. A little further every day.
        </span>
      </div>
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
              style={{
                ...s.scrollChoice,
                ...((active === index && s.activeChoice) || {}),
              }}
              className="stack pressable"
              type="button"
            >
              <Icon
                name="book-open-page-variant-outline"
                size={21}
                color={active === index ? colors.parchment : colors.teal}
              />
              <span
                style={{
                  ...s.choiceText,
                  ...((active === index && { color: colors.parchment }) || {}),
                }}
                className="text"
              >
                {item.title}
              </span>
            </button>
          ))}
        </div>
      </div>
      <button
        role="button"
        aria-label={`Open ${expedition.title}`}
        onClick={() => onSelect(expedition)}
        style={s.expeditionHeading}
        className="stack pressable"
        type="button"
      >
        <div style={ui.flex} className="stack">
          <span style={s.expeditionTitle} className="text">
            {expedition.title}
          </span>
          <span style={ui.label} className="text">
            {expedition.file}
          </span>
        </div>
        <div style={s.progressSeal} className="stack">
          <span style={s.progressSealText} className="text">
            {expedition.progress}%
          </span>
          <span style={s.sealLabel} className="text">
            cleared
          </span>
        </div>
      </button>
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
      <RealmFrame style={s.selectedChapter}>
        <div style={ui.between} className="stack">
          <Badge
            text={`Chapter ${selectedRegion.chapter}`}
            icon="flag-variant"
          />
          <span style={s.stateText} className="text">
            {chapterState(
              expedition.progress,
              expedition.regions.length,
              chapter,
            )}
          </span>
        </div>
        <span style={ui.heading} className="text">
          {selectedRegion.title}
        </span>
        <span style={ui.body} className="text">
          {selectedRegion.summary}
        </span>
        <span style={ui.label} className="text">
          {selectedRegion.questions} questions · Up to {selectedRegion.enemies}{" "}
          enemies
        </span>
        <Button
          label="View chapter"
          icon="arrow-right"
          tone="gold"
          onPress={() => onSelect(expedition, selectedRegion)}
        />
      </RealmFrame>
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
          <div style={ui.flex} className="stack">
            <Meter value={expedition.progress} />
          </div>
          <span style={s.materialProgress} className="text">
            {expedition.progress}%
          </span>
        </div>
      </div>
      <Icon name="chevron-right" size={22} color={colors.teal} />
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
        <Meter
          value={expedition.progress}
          label={`${expedition.progress}% of this expedition cleared`}
        />
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
        <span style={s.mapHint} className="text">
          Every stop holds a new idea. Tap a chapter to see its topics.
        </span>
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
      <div className="stack" style={s.detailPage}>
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
          <span style={ui.body} className="text">Start with 500 HP. Each enemy has 100 HP. Correct answers deal 50 damage; wrong answers cost you 50 HP. Finish every question with HP remaining to win. Unfinished answers are saved.</span>
          {region.material && (
            <div style={s.topics} className="stack">
              <span style={ui.heading} className="text">Study material</span>
              {region.material.split(/\n\s*\n/).map((paragraph, index) => (
                <p key={index} style={{ ...ui.body, margin: 0, whiteSpace: "pre-wrap" }}>{paragraph}</p>
              ))}
              {!!region.sourcePages?.length && (
                <span style={ui.body} className="text">PDF pages: {region.sourcePages.join(", ")}</span>
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
const s = {
  page: { gap: 16 },
  pageHeading: { gap: 4 },
  scrollChoices: { gap: 8, paddingTop: 3, paddingBottom: 3, paddingRight: 12 },
  scrollChoice: {
    width: 156,
    minHeight: 58,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: "#b4a481",
    borderRadius: 12,
    backgroundColor: colors.parchment,
  },
  activeChoice: { backgroundColor: colors.teal, borderColor: colors.edge },
  choiceText: {
    flex: "1 1 0%",
    fontFamily: fonts.heading,
    fontSize: 12,
    lineHeight: "17px",
    color: colors.ink,
  },
  expeditionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 70,
  },
  expeditionTitle: {
    fontFamily: fonts.heading,
    fontSize: 19,
    lineHeight: "26px",
    color: colors.ink,
    marginBottom: 4,
  },
  progressSeal: {
    minWidth: 61,
    minHeight: 61,
    borderWidth: 2,
    borderColor: "#b8a279",
    backgroundColor: "#f5e7bb",
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
  },
  progressSealText: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.wood,
  },
  sealLabel: { fontFamily: fonts.label, fontSize: 10, color: colors.muted },
  selectedChapter: { gap: 10 },
  stateText: { ...ui.label, color: colors.teal },
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
  materialProgress: {
    fontFamily: fonts.heading,
    fontSize: 11,
    color: colors.teal,
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
  pressed: { transform: "translateY(" + 2 + "px)" },
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
  mapLegend: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 14,
  },
  mapHint: {
    ...ui.body,
    textAlign: "center",
    paddingLeft: 18,
    paddingRight: 18,
  },
  detailPage: { padding: 16, paddingTop: 24, paddingBottom: 32, gap: 20 },
  detailTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    lineHeight: "29px",
    color: colors.ink,
    marginTop: 4,
  },
  regionShowcase: { alignItems: "center" },
  regionImage: {
    position: "relative",
    width: "100%",
    maxWidth: 330,
    height: 190,
  },
  topics: { gap: 12, marginTop: 4 },
  topic: { flexDirection: "row", alignItems: "center", gap: 10 },
  topicNumber: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#adb99a",
  },
  topicNumberText: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: colors.teal,
  },
  topicText: {
    flex: "1 1 0%",
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: "20px",
    color: colors.ink,
  },
  encounterMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  readyBlock: { gap: 10, alignItems: "center" },
} satisfies Record<string, CSSProperties>;
