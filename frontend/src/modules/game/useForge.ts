import { useRef, useState } from "react";
import type { Screen } from "../../types";
import type { Expedition } from "./types";

export function useForge({ onForge, onForgeSettled, onReadForge, navigate, notify }: {
  onForge: (file: File) => Promise<Expedition>;
  onForgeSettled: (result: "ready" | "failed") => void;
  onReadForge: () => void;
  navigate: (screen: Screen) => void;
  notify: (message: string) => void;
}) {
  const [asset, setAsset] = useState<File>();
  // ponytail: one in-flight job per mounted Hub; persist jobs if reloads must retain tracking.
  const [job, setJob] = useState<{
    file: File; startedAt: number; status: "processing" | "ready" | "failed";
    expedition?: Expedition; error?: string;
  }>();
  const [expanded, setExpanded] = useState(false);
  const minimized = useRef(false);
  const pending = useRef(false);
  const forging = job?.status === "processing";

  function selectFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(pdf|docx)$/i.test(file.name) || !file.size || file.size > 25 * 1024 * 1024) {
      notify("Pilih PDF atau DOCX dengan ukuran maksimal 25 MB.");
      return;
    }
    setAsset(file);
  }
  async function forgeAdventure(source = asset) {
    if (pending.current || !source) return;
    pending.current = true;
    minimized.current = false;
    const startedAt = Date.now();
    setJob({ file: source, startedAt, status: "processing" });
    setExpanded(true);
    onReadForge();
    try {
      const expedition = await onForge(source);
      setJob({ file: source, startedAt, status: "ready", expedition });
      onForgeSettled("ready");
      if (!minimized.current) navigate("Expedition");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Forge failed";
      setJob({ file: source, startedAt, status: "failed", error: message });
      onForgeSettled("failed");
      if (!minimized.current) notify(message);
    } finally {
      pending.current = false;
      setExpanded(false);
    }
  }
  function minimize() {
    minimized.current = true;
    setExpanded(false);
  }
  return { file: asset?.name, job, forging, expanded, selectFile, forgeAdventure, minimize, expand: () => setExpanded(true) };
}
