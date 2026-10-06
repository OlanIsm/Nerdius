import { setTimeout as delay } from "node:timers/promises";
import { HttpError } from "./errors.ts";

export async function generatePdfJson(pdf: Buffer, schema: object, pageCount: number, instruction: { system: string; user: string }): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new HttpError("PDF generation is not configured", 503);
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  let response: Response;
  let inputLimit = false;
  let providerStatus: string | undefined;
  const startedAt = Date.now();
  const requestInfo = { model, pdfBytes: pdf.length, pageCount };
  const signal = AbortSignal.timeout(90_000);
  try {
    // Share one timeout across attempts: an overloaded model must not hold uploads indefinitely.
    for (let attempt = 0; ; attempt++) {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instruction.system }] },
          contents: [{ role: "user", parts: [
            { inlineData: { mimeType: "application/pdf", data: pdf.toString("base64") } },
            { text: instruction.user },
          ] }],
          generationConfig: { responseMimeType: "application/json", responseJsonSchema: schema, maxOutputTokens: 24000, temperature: 0.2 },
        }),
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        const status = failure?.error?.status;
        providerStatus = typeof status === "string" && /^[A-Z_]{1,40}$/.test(status) ? status : undefined;
        const message = typeof failure?.error?.message === "string" ? failure.error.message : "";
        inputLimit = response.status === 400 && /(input|context|payload).*(exceed|too large|too long|limit)|(exceed|too large|too long).*(input|context|payload)/i.test(message);
      }
      if (response.status !== 503 || attempt === 2) break;
      console.warn("Gemini busy; retrying generation", { ...requestInfo, status: 503, providerStatus, attempt: attempt + 1 });
      await delay(1000 * 2 ** attempt + Math.floor(Math.random() * 250), undefined, { signal });
    }
  } catch {
    throw new HttpError("PDF generation timed out or could not connect. Try again.", 504);
  }
  if (!response.ok) {
    console.error("Gemini generation failed", { ...requestInfo, status: response.status, providerStatus, reason: inputLimit ? "input_limit" : "provider_error", elapsedMs: Date.now() - startedAt });
    if (inputLimit) throw new HttpError("This PDF exceeds the model's input limit. Split it into smaller PDFs and try again.", 422);
    if (response.status === 429) throw new HttpError("Gemini quota reached. Check your quota and try again later.", 503);
    if (response.status === 503) throw new HttpError("Gemini is still busy after 3 attempts. Wait a moment, then upload the PDF again.", 503);
    if (response.status === 404) throw new HttpError("Configured Gemini model is unavailable. Check GEMINI_MODEL in backend/.env.");
    if (response.status === 401 || response.status === 403) throw new HttpError("Gemini authentication failed. Check GEMINI_API_KEY and project access.");
    if (response.status === 400) throw new HttpError("Gemini could not process this PDF. Try a readable, unencrypted PDF.", 422);
    throw new HttpError("PDF generation is unavailable. Check Gemini configuration and try again.", 502);
  }
  try {
    const result = await response.json();
    const candidate = result.candidates?.[0];
    if (candidate?.finishReason !== "STOP") throw new Error("Incomplete or blocked generation");
    const text = candidate.content?.parts?.filter((part: { thought?: boolean; text?: string }) => !part.thought && typeof part.text === "string")
      .map((part: { text: string }) => part.text).join("");
    if (!text || text.length > 200_000) throw new Error("Invalid output size");
    const content = JSON.parse(text);
    console.info("Gemini generation completed", { ...requestInfo, elapsedMs: Date.now() - startedAt, inputTokens: result.usageMetadata?.promptTokenCount, outputTokens: result.usageMetadata?.candidatesTokenCount });
    return content;
  } catch {
    throw new HttpError("Gemini returned incomplete or invalid content. Try again.");
  }
}
