import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { HttpError } from "./errors.ts";

const execFileAsync = promisify(execFile);

/**
 * Step 1: Convert PPTX / DOCX to PDF using LibreOffice headless.
 * If LibreOffice is not installed, throws a descriptive error.
 */
export async function convertOfficeToPdf(buffer: Buffer, extension: "pptx" | "docx"): Promise<Buffer> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "nerdungeon-conv-"));
  const inputPath = path.join(tempDir, `input.${extension}`);
  const outputPath = path.join(tempDir, "input.pdf");

  try {
    await fs.writeFile(inputPath, buffer);
    const binary = process.platform === "win32" ? "soffice.exe" : "soffice";
    await execFileAsync(binary, ["--headless", "--convert-to", "pdf", "--outdir", tempDir, inputPath], {
      timeout: 45_000,
    });
    return await fs.readFile(outputPath);
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      throw new HttpError(
        `LibreOffice is required to convert .${extension} files. Please install LibreOffice or upload a PDF directly.`,
        400
      );
    }
    throw new HttpError(
      `Could not convert .${extension} to PDF: ${error?.message || "Conversion failed"}`,
      422
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
