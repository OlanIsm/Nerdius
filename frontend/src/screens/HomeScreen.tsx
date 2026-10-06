import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { art } from "../assets";
import {
  Button,
  Icon,
  Meter,
  SectionTitle,
  useReducedMotion,
} from "../components/GameUI";
import { RealmFrame } from "../components/FantasyUI";
import { colors, fonts, ui } from "../theme";
import { ExpeditionCard } from "./AdventureScreen";
import { expeditions } from "../modules/game/tutorial";
import type { Expedition, Region } from "../modules/game/types";
import { useForge } from "../modules/game/useForge";
import type { ScreenProps } from "../types";
export function HomeScreen({
  navigate,
  notify,
  onSelectExpedition,
  onContinue,
  lastAdventure,
  expeditions: items = expeditions,
  onForge,
  onForgeSettled,
  onReadForge,
}: ScreenProps & {
  onSelectExpedition: (expedition: Expedition) => void;
  onContinue: () => void;
  lastAdventure: {
    expedition: Expedition;
    region: Region;
  };
  expeditions?: Expedition[];
  onForge: (asset: File) => Promise<Expedition>;
  onForgeSettled: (result: "ready" | "failed") => void;
  onReadForge: () => void;
}) {
  const { file, job, forging, expanded, selectFile, forgeAdventure, minimize, expand } = useForge({
    onForge, onForgeSettled, onReadForge, navigate, notify,
  });
  const reducedMotion = useReducedMotion();
  const fileInput = useRef<HTMLInputElement>(null);
  function pickFile() {
    fileInput.current?.click();
  }
  return (
    <div style={s.page} className="stack">
      <input
        ref={fileInput}
        type="file"
        accept=".pdf,.docx"
        hidden
        disabled={forging}
        aria-label="Study file"
        onChange={(event) => {
          selectFile(event.currentTarget.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      {job && forging && expanded && (
        <ForgeDialog
          file={job.file.name}
          startedAt={job.startedAt}
          reducedMotion={reducedMotion}
          onMinimize={() => {
            minimize();
            requestAnimationFrame(() => {
              const status = document.querySelector<HTMLElement>(
                "[data-forge-status]",
              );
              status?.focus({ preventScroll: true });
              status?.scrollIntoView({
                block: "center",
                behavior: reducedMotion ? "instant" : "smooth",
              });
            });
          }}
        />
      )}

      <div style={s.scroll} className="stack">
        <div
          aria-hidden={true}
          style={{ ...s.scrollRoll, ...s.rollTop }}
          className="stack"
        >
          <div style={s.rollHighlight} className="stack" />
        </div>
        <div
          aria-hidden={true}
          style={{ ...s.scrollRoll, ...s.rollBottom }}
          className="stack"
        >
          <div style={s.rollHighlight} className="stack" />
        </div>
        <div style={s.forgeHeading} className="stack">
          <Icon name="feather" size={23} color={colors.wood} />
          <span style={s.forgeTitle} className="text">
            The Study Forge
          </span>
        </div>
        <span style={s.forgeSubtitle} className="text">
          Every great quest starts with a little knowledge.
        </span>
        <button
          role="button"
          aria-label="Browse study files"
          onClick={pickFile}
          style={{ ...s.dropZone }}
          className="stack pressable"
          type="button"
          disabled={forging}
        >
          <div
            aria-label={file ? "Selected PDF" : undefined}
            style={s.documentEmblem}
            className="stack"
          >
            <Icon
              name={file ? "file-check-outline" : "file-plus-outline"}
              size={30}
              color={colors.teal}
            />
          </div>
          <span style={s.uploadTitle} className="text">
            {file ?? "Turn your notes into an adventure"}
          </span>
          <span style={s.uploadSubtitle} className="text">
            {file ? "Tap to choose another file" : "Upload your study material"}
          </span>
          {!file && (
            <div style={s.browse} className="stack">
              <span style={s.browseText} className="text">
                Browse files
              </span>
              <Icon name="upload" size={18} color={colors.ink} />
            </div>
          )}
          <span style={s.formats} className="text">
            PDF: chapters and questions · DOCX: starter chapters · Max 25 MB
          </span>
        </button>
        {file && (
          <Button
            label="Forge Adventure"
            tone="gold"
            icon="creation"
            onPress={() => void forgeAdventure()}
            disabled={forging}
          />
        )}
      </div>

      <RealmFrame variant="sage" style={s.continueCard}>
        <div style={ui.row} className="stack">
          <Icon name="flag-variant" size={21} color={colors.teal} />
          <span style={s.continueHeading} className="text">
            Continue Adventure
          </span>
        </div>
        <span style={s.questTitle} className="text">
          {lastAdventure.expedition.title}
        </span>
        <span style={ui.body} className="text">
          Chapter {lastAdventure.region.chapter} · {lastAdventure.region.title}
        </span>
        <div style={s.progressRow} className="stack">
          <div style={ui.flex} className="stack">
            <Meter
              value={lastAdventure.expedition.progress}
              label="Expedition progress"
            />
          </div>
          <span style={s.progressValue} className="text">
            {lastAdventure.expedition.progress}%
          </span>
        </div>
        <Button
          label="Continue Adventure"
          tone="gold"
          icon="play"
          onPress={onContinue}
        />
      </RealmFrame>

      <div style={s.materialHeading} className="stack">
        <div style={ui.flex} className="stack">
          <SectionTitle title="Study scrolls" />
        </div>
        <button
          role="button"
          aria-label="View all expeditions"
          onClick={() => navigate("Expedition")}
          style={s.allLink}
          className="stack pressable"
          type="button"
        >
          <span style={s.allText} className="text">
            View all
          </span>
          <Icon name="chevron-right" size={18} color={colors.teal} />
        </button>
      </div>
      <div style={s.materials} className="stack">
        {job && (
          <RealmFrame variant="sage" style={{ gap: 12 }}>
            <section
              className="forge-status"
              data-forge-status={job.status}
              aria-label="Forge progress"
              tabIndex={-1}
            >
              <div className="forge-status-heading">
                <img
                  src={
                    forging && !reducedMotion ? art.nerdEatPdf : art.character
                  }
                  alt=""
                />
                <div>
                  <h3>
                    {forging
                      ? "Forging adventure"
                      : job.status === "ready"
                        ? "Adventure ready!"
                        : "Could not forge adventure"}
                  </h3>
                  <p>{job.file.name}</p>
                </div>
              </div>
              <div role={job.status === "failed" ? "alert" : "status"}>
                {forging ? (
                  <>
                    <progress aria-label="Generating study material" />
                    <p>
                      You can keep exploring. Your result will appear here. Keep
                      this tab open.
                    </p>
                  </>
                ) : job.status === "ready" ? (
                  <p>{job.expedition?.title} is ready to explore.</p>
                ) : (
                  <p>{job.error}</p>
                )}
              </div>
              {forging ? (
                <Button
                  label="View forging progress"
                  onPress={expand}
                />
              ) : job.status === "ready" && job.expedition ? (
                <Button
                  label="Open adventure"
                  tone="gold"
                  onPress={() => {
                    onReadForge();
                    onSelectExpedition(job.expedition!);
                  }}
                />
              ) : (
                <Button
                  label="Retry forge"
                  tone="gold"
                  onPress={() => void forgeAdventure(job.file)}
                />
              )}
            </section>
          </RealmFrame>
        )}
        {items.slice(0, 2).map((expedition) => (
          <ExpeditionCard
            key={expedition.title}
            expedition={expedition}
            onPress={() => onSelectExpedition(expedition)}
          />
        ))}
      </div>
    </div>
  );
}
const s = {
  page: { gap: 20 },
  scroll: {
    backgroundColor: "#f9edcd",
    borderWidth: 2,
    borderColor: "#9a794b",
    marginLeft: 4,
    marginRight: 4,
    marginTop: 8,
    padding: 16,
    paddingTop: 23,
    paddingBottom: 22,
    gap: 10,
    borderRadius: 10,
  },
  scrollRoll: {
    position: "absolute",
    left: -8,
    right: -8,
    height: 17,
    backgroundColor: "#dec08a",
    borderWidth: 2,
    borderBottomWidth: 3,
    borderColor: colors.wood,
    borderRadius: 12,
  },
  rollTop: { top: -9 },
  rollBottom: { bottom: -9 },
  rollHighlight: {
    height: 3,
    marginTop: 2,
    marginLeft: 10,
    marginRight: 10,
    backgroundColor: "#fff2ce",
    borderRadius: 3,
  },
  forgeHeading: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  forgeTitle: { fontFamily: fonts.heading, fontSize: 22, color: colors.ink },
  forgeSubtitle: {
    ...ui.body,
    textAlign: "center",
    fontSize: 12,
    lineHeight: "18px",
  },
  dropZone: {
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#b49b71",
    borderRadius: 14,
    backgroundColor: "#fff8e5",
  },
  documentEmblem: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: colors.sage,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#a8b594",
  },
  uploadTitle: {
    fontFamily: fonts.heading,
    fontSize: 17,
    lineHeight: "23px",
    textAlign: "center",
    color: colors.ink,
    maxWidth: 290,
  },
  uploadSubtitle: { ...ui.body, fontSize: 12, textAlign: "center" },
  browse: {
    minHeight: 44,
    width: "100%",
    maxWidth: 230,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: colors.gold,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.edge,
    borderRadius: 12,
  },
  browseText: { fontFamily: fonts.heading, fontSize: 14, color: colors.ink },
  formats: { ...ui.label, fontSize: 11, textAlign: "center" },
  continueCard: { gap: 8, marginTop: 6 },
  continueHeading: {
    fontFamily: fonts.heading,
    fontSize: 16,
    color: colors.teal,
  },
  questTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    lineHeight: "24px",
    color: colors.ink,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  progressValue: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: colors.teal,
  },
  materialHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: -14,
  },
  allLink: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 8,
  },
  allText: { fontFamily: fonts.heading, fontSize: 12, color: colors.teal },
  materials: { gap: 10 },
} satisfies Record<string, CSSProperties>;
function ForgeDialog({
  file,
  reducedMotion,
  startedAt,
  onMinimize,
}: {
  file?: string;
  reducedMotion: boolean;
  startedAt: number;
  onMinimize: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [canMinimize, setCanMinimize] = useState(
    Date.now() - startedAt >= 3000,
  );
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    const timer = setTimeout(
      () => setCanMinimize(true),
      Math.max(0, 3000 - (Date.now() - startedAt)),
    );
    return () => clearTimeout(timer);
  }, [startedAt]);
  return (
    <dialog
      className="forge-dialog"
      ref={dialog}
      aria-label="Forging adventure"
      onCancel={(event) => {
        event.preventDefault();
        if (canMinimize) onMinimize();
      }}
    >
      <div className="forge-dialog-content">
        <img
          alt="Nerd eating PDF"
          src={reducedMotion ? art.character : art.nerdEatPdf}
        />
        <h2 aria-live="polite">Forging your adventure</h2>
        <p>{file}</p>
        {canMinimize && (
          <div className="forge-minimize">
            <p>Continue exploring while we prepare your questions.</p>
            <Button label="Minimize" tone="gold" onPress={onMinimize} />
          </div>
        )}
      </div>
    </dialog>
  );
}
