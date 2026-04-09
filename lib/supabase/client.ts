// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// We don't use Supabase's generated types, so keep generics loose
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VocabClient = SupabaseClient<any, any>;

let _client: VocabClient | null = null;

export function getSupabase(): VocabClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Prefer service role key (server-side only, bypasses RLS) — fall back to anon key
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Missing Supabase env vars");
    _client = createClient(url, key, { db: { schema: "vocab" } });
  }
  return _client;
}

// Convenience alias for API routes
export const supabase = new Proxy({} as VocabClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
