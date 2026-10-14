import { APIRequestContext, request } from "@playwright/test";
import {
  API_URL,
  SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
} from "./env";

export interface TestUser {
  id: string;
  email: string;
  password: string;
  accessToken: string;
}

const PASSWORD = "QaTest123!"; // satisfies the 8-char complexity policy

/** Admin-create an email-confirmed Supabase user (no confirmation email sent). */
async function adminCreateUser(ctx: APIRequestContext, email: string): Promise<string> {
  const res = await ctx.post(`${SUPABASE_URL}/auth/v1/admin/users`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    data: { email, password: PASSWORD, email_confirm: true },
  });
  if (!res.ok()) {
    throw new Error(`adminCreateUser ${email} failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()).id as string;
}

export async function adminDeleteUser(ctx: APIRequestContext, id: string): Promise<void> {
  await ctx.delete(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
    headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
  });
}

/** Password grant → access token (same path the UI uses after login). */
export async function signIn(ctx: APIRequestContext, email: string): Promise<string> {
  const res = await ctx.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    data: { email, password: PASSWORD },
  });
  if (!res.ok()) {
    throw new Error(`signIn ${email} failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()).access_token as string;
}

/** Provision a fresh confirmed user and sign in. Caller must delete via adminDeleteUser. */
export async function createTestUser(ctx: APIRequestContext, label: string): Promise<TestUser> {
  // non-reserved TLD — EmailStr (email-validator) rejects RFC-2606 .test domains
  const email = `qa-${label}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@offroute-qa.dev`;
  const id = await adminCreateUser(ctx, email);
  const accessToken = await signIn(ctx, email);
  return { id, email, password: PASSWORD, accessToken };
}

/** API client bound to a user's bearer token, pointed at the backend. */
export async function apiFor(token: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

/** Admin context for provisioning (no base URL; absolute Supabase calls). */
export async function adminContext(): Promise<APIRequestContext> {
  return request.newContext();
}
