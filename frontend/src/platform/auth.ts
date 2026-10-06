import { createClient } from "@supabase/supabase-js";

const supabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  ? createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)
  : null;
export async function accessToken() {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (session) return session.access_token;
  const signedIn = await supabase.auth.signInAnonymously();
  if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error("Could not sign in");
  return signedIn.data.session.access_token;
}
