import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Load frontend/.env.local (anon key, supabase url, api url) and backend/.env
// (service-role key) so the harness can both call the API and admin-provision
// Supabase test users. Backend .env wins for the service-role key only.
const frontendEnv = resolve(__dirname, "../../.env.local");
const backendEnv = resolve(__dirname, "../../../backend/.env");

if (existsSync(frontendEnv)) loadEnv({ path: frontendEnv });
if (existsSync(backendEnv)) loadEnv({ path: backendEnv });

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env ${name} — check frontend/.env.local and backend/.env`);
  return value;
}

export const API_URL = required("NEXT_PUBLIC_API_URL", process.env.NEXT_PUBLIC_API_URL);
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
);
export const SUPABASE_ANON_KEY = required(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
export const SERVICE_ROLE_KEY = required(
  "SUPABASE_SERVICE_ROLE_KEY",
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
