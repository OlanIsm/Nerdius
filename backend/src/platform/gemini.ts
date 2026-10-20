import { setTimeout as delay } from "node:timers/promises";
import { HttpError } from "./errors.ts";

export interface GeminiRequestOptions {
  contents: Array<{ role?: string; parts: Array<Record<string, unknown>> }>;
  systemInstruction?: string;
  responseJsonSchema?: object;
  maxOutputTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
}

export async function callGeminiApi(options: GeminiRequestOptions): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new HttpError("PDF generation is not configured", 503);
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

  let response: Response;
  let inputLimit = false;
  let providerStatus: string | undefined;
  const startedAt = Date.now();
  const requestInfo = { model, ...options.metadata };
  const signal = AbortSignal.timeout(90_000);

  try {
    for (let attempt = 0; ; attempt++) {
      const body: Record<string, unknown> = {
        contents: options.contents,
        generationConfig: {
          maxOutputTokens: options.maxOutputTokens ?? 24_000,
          temperature: options.temperature ?? 0.2,
        },
      };

      if (options.systemInstruction) {
        body.systemInstruction = { parts: [{ text: options.systemInstruction }] };
      }

      if (options.responseJsonSchema) {
        (body.generationConfig as Record<string, unknown>).responseMimeType = "application/json";
        (body.generationConfig as Record<string, unknown>).responseJsonSchema = options.responseJsonSchema;
      }

      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          signal,
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        const status = failure?.error?.status;
        providerStatus = typeof status === "string" && /^[A-Z_]{1,40}$/.test(status) ? status : undefined;
        const message = typeof failure?.error?.message === "string" ? failure.error.message : "";
        inputLimit =
          response.status === 400 &&
          /(input|context|payload).*(exceed|too large|too long|limit)|(exceed|too large|too long).*(input|context|payload)/i.test(
            message
          );
      }

      if (response.status !== 503 || attempt === 2) break;
      console.warn("Gemini busy; retrying generation", {
        ...requestInfo,
        status: 503,
        providerStatus,
        attempt: attempt + 1,
      });
      await delay(1000 * 2 ** attempt + Math.floor(Math.random() * 250), undefined, { signal });
    }
  } catch {
    throw new HttpError("PDF generation timed out or could not connect. Try again.", 504);
  }

  if (!response.ok) {
    console.error("Gemini generation failed", {
      ...requestInfo,
      status: response.status,
      providerStatus,
      reason: inputLimit ? "input_limit" : "provider_error",
      elapsedMs: Date.now() - startedAt,
    });
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
    const text = candidate.content?.parts
      ?.filter((part: { thought?: boolean; text?: string }) => !part.thought && typeof part.text === "string")
      .map((part: { text: string }) => part.text)
      .join("");
    if (!text || text.length > 200_000) throw new Error("Invalid output size");

    console.info("Gemini generation completed", {
      ...requestInfo,
      elapsedMs: Date.now() - startedAt,
      inputTokens: result.usageMetadata?.promptTokenCount,
      outputTokens: result.usageMetadata?.candidatesTokenCount,
    });

    if (options.responseJsonSchema) {
      return JSON.parse(text);
    }
    return text;
  } catch {
    throw new HttpError("Gemini returned incomplete or invalid content. Try again.");
  }
}

/**
 * Standard PDF Generation (backward compatible for existing tests and direct PDF calls).
 */
export async function generatePdfJson(
  pdf: Buffer,
  schema: object,
  pageCount: number,
  instruction: { system: string; user: string }
): Promise<unknown> {
  return callGeminiApi({
    systemInstruction: instruction.system,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: pdf.toString("base64") } },
          { text: instruction.user },
        ],
      },
    ],
    responseJsonSchema: schema,
    metadata: { pdfBytes: pdf.length, pageCount },
  });
}

/**
 * Step 4: Selective Visual OCR for scanned/image pages.
 */
export async function ocrPageWithVision(pagePdf: Buffer, pageNumber: number): Promise<string> {
  const result = await callGeminiApi({
    systemInstruction:
      "You are a high-accuracy document OCR engine. Transcribe all readable text, formulas, diagrams, labels, and notes from this page. Return plain text only without introductory text.",
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: pagePdf.toString("base64") } },
          { text: `Transcribe all visible educational text and diagrams on page ${pageNumber}.` },
        ],
      },
    ],
    metadata: { ocrPage: pageNumber, pageBytes: pagePdf.length },
  });
  return typeof result === "string" ? result : JSON.stringify(result);
}

/**
 * Step 6: Generate structured question candidates from extracted text.
 */
export async function generateTextJson(
  instruction: { system: string; user: string },
  schema: object
): Promise<unknown> {
  return callGeminiApi({
    systemInstruction: instruction.system,
    contents: [{ role: "user", parts: [{ text: instruction.user }] }],
    responseJsonSchema: schema,
    metadata: { textLength: instruction.user.length },
  });
}

export interface BlindSolveItem {
  id: string;
  prompt: string;
  options: string[];
}

export interface BlindSolveSolution {
  id: string;
  selectedIndex: number;
}

/**
 * Step 7: Verifikasi jawaban (Blind Solve).
 * Model is asked to answer questions without knowing the correct answer or explanation.
 */
export async function blindSolveQuestions(
  questions: BlindSolveItem[],
  customSolver?: (items: BlindSolveItem[]) => Promise<BlindSolveSolution[]>
): Promise<BlindSolveSolution[]> {
  if (!questions.length) return [];
  if (customSolver) return customSolver(questions);

  const blindSchema = {
    type: "object",
    required: ["solutions"],
    properties: {
      solutions: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "selectedIndex"],
          properties: {
            id: { type: "string" },
            selectedIndex: { type: "integer" },
          },
        },
      },
    },
  };

  const result = (await callGeminiApi({
    systemInstruction:
      "You are an expert academic evaluator. For each multiple-choice question, choose the single best correct option index (0, 1, 2, or 3). If a question is ambiguous, contains multiple correct answers, or cannot be answered definitively, set selectedIndex to -1.",
    contents: [{ role: "user", parts: [{ text: JSON.stringify(questions) }] }],
    responseJsonSchema: blindSchema,
    temperature: 0.0,
    metadata: { blindSolveCount: questions.length },
  })) as { solutions?: BlindSolveSolution[] };

  return Array.isArray(result?.solutions) ? result.solutions : [];
}
