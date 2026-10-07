import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.APP_SUPABASE_URL;
const key = import.meta.env.APP_SUPABASE_PUBLISHABLE_KEY;

export const supabase =
  url && key ? createClient(url, key) : null;

export const authConfigured = Boolean(supabase);

export async function signInWithProvider(provider) {
  if (!supabase) throw new Error("Supabase authentication is not configured.");
  return supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin + "/auth/callback" }
  });
}