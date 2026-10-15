import { createClient } from "@supabase/supabase-js";

const supabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
  : null;
export function getSupabaseClient() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}
export async function accessToken() {
  const client = getSupabaseClient();
  const { data: { session }, error } = await client.auth.getSession();
  if (error) throw error;
  if (session) return session.access_token;
  const signedIn = await client.auth.signInAnonymously();
  if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error("Could not sign in");
  return signedIn.data.session.access_token;
}
