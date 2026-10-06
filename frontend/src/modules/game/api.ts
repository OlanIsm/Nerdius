import type { GameData } from "./types";
import { accessToken } from "../../platform/auth";

const url = import.meta.env.VITE_API_URL ?? "";
export async function gameRequest(
  action?: Record<string, unknown>,
): Promise<GameData> {
  const response = await fetch(
    `${url}/api/game`,
    action
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${await accessToken()}` },
          body: JSON.stringify(action),
        }
      : { headers: { Authorization: `Bearer ${await accessToken()}` } },
  );
  return readGameResponse(response);
}
export async function forgeRequest(asset: File): Promise<GameData> {
  const form = new FormData();
  form.append("file", asset);
  const response = await fetch(`${url}/api/game/forge`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}` },
    body: form,
  });
  return readGameResponse(response);
}
async function readGameResponse(response: Response): Promise<GameData> {
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("Game server is not connected. Restart the Nerdungeon backend, then reload this page.");
  }
  let data;
  try { data = await response.json(); }
  catch { throw new Error("Game server returned invalid data. Reload this page and try again."); }
  if (!response.ok) throw new Error(typeof data?.error === "string" ? data.error : "Game server unavailable. Try again.");
  if (!Array.isArray(data?.expeditions) || typeof data.gold !== "number") throw new Error("Game server returned invalid data. Reload this page and try again.");
  return data as GameData;
}
