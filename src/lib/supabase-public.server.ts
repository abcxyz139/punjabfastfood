// Server-only Supabase client for public (anon) reads.
// Single source of truth: every public server function uses this factory so
// key handling and auth options can never drift between modules.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type CloudClient = SupabaseClient<Database>;

function isOpaqueKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/**
 * New-format Supabase API keys are opaque strings, not JWTs. supabase-js still
 * sends them as `Authorization: Bearer <key>`, which PostgREST rejects with
 * "Expected 3 parts in JWT; got 1". Strip it and send only `apikey`.
 */
function publicFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    if (isOpaqueKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

/** Anonymous, RLS-respecting client. Read `process.env` at call time, never at module scope. */
export function publicClient(): CloudClient {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY on the server.");
  }
  return createClient<Database>(url, key, {
    global: { fetch: publicFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
