import { useEffect, useRef, useState } from "react";
import { art } from "../assets";
import {
  Button,
  Icon,
  useReducedMotion,
} from "../components/GameUI";
import { RealmFrame } from "../components/FantasyUI";
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
    <div className="hub-page stack">
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

      {/* CARD 1: THE STUDY FORGE (PURE CSS ARCHITECTURE) */}
      <div className="css-forge-wrapper stack">
        {/* Left Stone Pillar with Torch Brazier & Star Banner */}
        <div className="pillar left" aria-hidden="true">
          <div className="torch-flame" />
          <div className="torch-brazier" />
          <div className="pillar-column" />
          <div className="pillar-banner">
            <span className="banner-star">★</span>
          </div>
          <div className="pillar-vines" />
        </div>

        {/* Right Stone Pillar with Torch Brazier & Star Banner */}
        <div className="pillar right" aria-hidden="true">
          <div className="torch-flame" />
          <div className="torch-brazier" />
          <div className="pillar-column" />
          <div className="pillar-banner">
            <span className="banner-star">★</span>
          </div>
          <div className="pillar-vines" />
        </div>

        {/* Top Arched Wooden Banner */}
        <div className="forge-header-arch">
          <div className="arch-star-crest" aria-hidden="true">✦</div>
          <div className="arch-content">
            <span className="arch-book-icon" aria-hidden="true">📖</span>
            <span className="forge-title text">The Study Forge</span>
          </div>
        </div>

        {/* Main Parchment Board */}
        <div className="forge-parchment-board stack">
          <div className="rivet top-left" aria-hidden="true" />
          <div className="rivet top-right" aria-hidden="true" />
          <div className="rivet bottom-left" aria-hidden="true" />
          <div className="rivet bottom-right" aria-hidden="true" />

          {/* Halo & Document Upload Emblem */}
          <div className="forge-halo-emblem" aria-hidden="true">
            <div className="halo-circle">
              <span className="halo-sparkle s1">✦</span>
              <span className="halo-sparkle s2">✦</span>
              <span className="halo-sparkle s3">✦</span>
              <span className="halo-sparkle s4">✦</span>
              <div className="upload-doc-graphic">
                <div className="doc-page">
                  <div className="doc-line l1" />
                  <div className="doc-line l2" />
                </div>
                <div className="doc-arrow">▲</div>
              </div>
            </div>
          </div>

          <span className="forge-upload-heading text">
            {file ?? "Upload study material"}
          </span>

          {/* 3D Gold Action Button */}
          <button
            role="button"
            aria-label={file ? "Forge Adventure" : "Browse study files"}
            onClick={file ? () => void forgeAdventure() : pickFile}
            className="css-gold-btn forge-main-btn"
            type="button"
            disabled={forging}
          >
            <Icon name={file ? "creation" : "book-open-page-variant-outline"} size={20} color="#3d2105" />
            <span className="btn-label text">{file ? "Forge Adventure" : "Browse files"}</span>
            <Icon name={file ? "arrow-right" : "upload"} size={18} color="#3d2105" />
          </button>

          <span className="forge-file-hint text">
            PDF, DOCX · Max 25 MB
          </span>
        </div>

        {/* Stepped Cobblestone Foundation */}
        <div className="forge-stone-steps" aria-hidden="true">
          <div className="step-tier top" />
          <div className="step-tier bottom" />
        </div>
      </div>

      {/* CARD 2: CONTINUE ADVENTURE (PURE CSS ARCHITECTURE) */}
      <div className="css-continue-card stack">
        {/* Metal Corner Brackets */}
        <div className="corner-bracket top-left" aria-hidden="true"><span>•</span></div>
        <div className="corner-bracket top-right" aria-hidden="true"><span>•</span></div>
        <div className="corner-bracket bottom-left" aria-hidden="true"><span>•</span><div className="corner-leaves" /></div>
        <div className="corner-bracket bottom-right" aria-hidden="true"><span>•</span><div className="corner-leaves" /></div>

        {/* Forest Green Ribbon Banner */}
        <div className="continue-ribbon-banner">
          <div className="ribbon-fold left" aria-hidden="true" />
          <div className="ribbon-body">
            <span className="ribbon-flag-icon" aria-hidden="true">🚩</span>
            <span className="continue-title text">Continue Adventure</span>
          </div>
          <div className="ribbon-fold right" aria-hidden="true" />
        </div>

        {/* Interior Parchment with Castle Silhouette */}
        <div className="continue-parchment-inner">
          <div className="parchment-castle-decor" aria-hidden="true" />

          <div className="continue-body-row">
            {/* CSS Leather Quest Book */}
            <div className="css-quest-book" aria-hidden="true">
              <div className="book-spine" />
              <div className="book-cover">
                <span className="book-star">✦</span>
              </div>
              <span className="book-sparkle">✨</span>
            </div>

            <div className="continue-quest-details stack">
              <span className="quest-main-title text">
                {lastAdventure.expedition.title}
              </span>
              <span className="quest-chapter-label text">
                Chapter {lastAdventure.region.chapter} · {lastAdventure.region.title}
              </span>
            </div>
          </div>

          {/* Big 3D Gold Continue Button */}
          <button
            role="button"
            aria-label="Continue Adventure"
            onClick={onContinue}
            className="css-gold-btn continue-big-btn"
            type="button"
          >
            <span className="btn-chevron text">«</span>
            <Icon name="play" size={20} color="#3d2105" />
            <span className="btn-label text">Continue Adventure</span>
            <span className="btn-chevron text">»</span>
          </button>
        </div>
      </div>

      {/* SECTION 3: STUDY SCROLLS (PURE CSS ARCHITECTURE) */}
      <div className="css-scrolls-section stack">
        <div className="scrolls-section-header">
          {/* Carved Wooden Plank Badge */}
          <div className="css-wooden-scrolls-badge">
            <div className="badge-scroll-icon" aria-hidden="true">📜</div>
            <span className="badge-title text">Study scrolls</span>
            <div className="badge-ivy-leaves" aria-hidden="true" />
          </div>

          <button
            role="button"
            aria-label="View all expeditions"
            onClick={() => navigate("Expedition")}
            className="css-view-all-btn"
            type="button"
          >
            <span className="text">View all</span>
            <Icon name="chevron-right" size={16} color="#ffd899" />
          </button>
        </div>

        <div className="scroll-cards-container stack">
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
            <button
              key={expedition.title}
              role="button"
              aria-label={`Open ${expedition.title}`}
              onClick={() => onSelectExpedition(expedition)}
              className="css-parchment-scroll-card"
              type="button"
            >
              <div className="rivet top-left" aria-hidden="true" />
              <div className="rivet top-right" aria-hidden="true" />
              <div className="rivet bottom-left" aria-hidden="true" />
              <div className="rivet bottom-right" aria-hidden="true" />

              {/* Rolled Scroll with Leaf Icon */}
              <div className="css-rolled-scroll" aria-hidden="true">
                <div className="scroll-roll-top" />
                <div className="scroll-body">
                  <span className="scroll-leaf">🍃</span>
                </div>
                <div className="scroll-roll-bottom" />
              </div>

              <div className="scroll-card-content stack">
                <span className="expedition-main-title text">{expedition.title}</span>
                <span className="expedition-subtitle text">{expedition.file}</span>
                <div className="expedition-meta-row">
                  <Icon name="book-open-page-variant-outline" size={14} color="#6e461f" />
                  <span className="text">{expedition.regions.length} chapters</span>
                </div>
              </div>

              <span className="card-right-arrow text" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

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
