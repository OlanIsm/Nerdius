import type { SupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "../../platform/errors.ts";
import { newExpedition } from "./state.ts";
import { generatePdfExpedition } from "./pdf.ts";
import { changeState } from "./store.ts";

type StudyFile = { originalname: string; size: number; buffer: Buffer };

export async function forgeExpedition(client: SupabaseClient, userId: string, file?: StudyFile) {
  if (!file || !/^[^\\/]{1,180}\.(pdf|docx)$/i.test(file.originalname) || !file.size || file.size > 25 * 1024 * 1024) {
    throw new HttpError("Choose a PDF or DOCX up to 25 MB", 400);
  }
  const pdf = file.originalname.toLowerCase().endsWith(".pdf");
  if (pdf ? file.buffer.subarray(0, 4).toString() !== "%PDF" : file.buffer.subarray(0, 2).toString() !== "PK") {
    throw new HttpError("File content does not match its extension", 400);
  }
  const expedition = pdf ? await generatePdfExpedition(file.originalname, file.buffer) : newExpedition(file.originalname);
  const path = `${userId}/${expedition.id}.${pdf ? "pdf" : "docx"}`;
  const storage = client.storage.from("expeditions");
  const stored = await storage.upload(path, file.buffer, {
    contentType: pdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    upsert: false,
  });
  if (stored.error) throw stored.error;
  try {
    const { game } = await changeState(client, userId, (game) => { game.expeditions.push(expedition); });
    return game;
  } catch (error) {
    const removed = await storage.remove([path]);
    if (removed.error) console.error("Forge source cleanup failed", { expeditionId: expedition.id });
    throw error;
  }
}
