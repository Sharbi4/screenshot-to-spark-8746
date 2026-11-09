import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Anonymous, RLS-bound client for public directory reads in server functions.
// Server-only: load with `await import("@/lib/supabase-public.server")` inside handlers.
export function createPublicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const url = process.env["SUPABASE_URL"];
  if (!key || !url) return null;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}
