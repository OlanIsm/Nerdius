import { accessToken } from "../../platform/auth";

export type Account = { id: string; email: string | null };
export async function readAccount(): Promise<Account> {
  const response = await fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/me`, {
    headers: { Authorization: `Bearer ${await accessToken()}` },
  });
  if (!response.headers.get("content-type")?.includes("application/json")) throw new Error("Account server is not connected. Reload and try again.");
  let data;
  try { data = await response.json(); }
  catch { throw new Error("Account server returned invalid data. Try again."); }
  if (!response.ok) throw new Error("Could not load account. Try again.");
  if (typeof data?.user?.id !== "string" || !(data.user.email === null || typeof data.user.email === "string")) throw new Error("Account server returned invalid data. Try again.");
  return data.user;
}
