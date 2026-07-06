import { createClient } from "@supabase/supabase-js";

// Auth flows only — never used for data access. All app data goes through
// the FastAPI client in lib/api.ts.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
