import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * The one and only server-side Supabase client this app uses — for recording
 * estimate submissions, nothing else (yet).
 *
 * Deliberately the secret/service-role key, not the publishable one: this
 * client never runs in the browser, there is no per-user auth context to
 * respect, and the table it writes to has row-level security on with zero
 * policies — the service key is the only thing that can touch it at all.
 * `SUPABASE_SERVICE_ROLE_KEY` must never be exposed with a `NEXT_PUBLIC_`
 * prefix; it bypasses every RLS policy on the project it's set for.
 *
 * Returns `null` rather than throwing when the env vars aren't set, so a
 * feature that depends on this can no-op cleanly during local development
 * or before Supabase is wired up, instead of crashing the whole request.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
