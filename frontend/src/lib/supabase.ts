import { createClient } from "@supabase/supabase-js";

// Auth flows only — never used for data access. All app data goes through
// the FastAPI client in lib/api.ts.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { autoRefreshToken: true, persistSession: true } },
);

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

supabase.auth.onAuthStateChange((_event, session) => {
  cachedAccessToken = session?.access_token ?? null;
  tokenExpiresAt = session?.expires_at ?? 0;
});

supabase.auth.getSession().then(({ data: { session } }) => {
  cachedAccessToken = session?.access_token ?? null;
  tokenExpiresAt = session?.expires_at ?? 0;
});

export async function getAccessToken(): Promise<string | null> {
  if (cachedAccessToken && tokenExpiresAt > 0) {
    const nowSec = Math.floor(Date.now() / 1000);
    if (tokenExpiresAt - nowSec < 60) {
      const { data: { session } } = await supabase.auth.refreshSession();
      cachedAccessToken = session?.access_token ?? null;
      tokenExpiresAt = session?.expires_at ?? 0;
    }
  }
  return cachedAccessToken;
}
