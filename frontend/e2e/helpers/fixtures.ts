import { APIRequestContext, test as base, request } from "@playwright/test";
import { API_URL } from "./env";
import { TestUser, adminContext, adminDeleteUser, apiFor, createTestUser } from "./auth";

// Worker-scoped two-user setup so collaboration/share/clone/star flows have a
// stable second actor without re-provisioning per test. Users are deleted in
// teardown, which cascades their app data via DELETE /me semantics on Supabase.
type Fixtures = {
  userA: TestUser;
  userB: TestUser;
  apiA: APIRequestContext;
  apiB: APIRequestContext;
  anonApi: APIRequestContext; // no auth header — for 401 + public-endpoint checks
};

// Cascade-delete the user's app data via the backend before removing the auth
// user (admin-deleting the Supabase user alone would orphan circuits/points).
async function cleanupUser(user: TestUser): Promise<void> {
  try {
    const ctx = await apiFor(user.accessToken);
    await ctx.delete("/me");
    await ctx.dispose();
  } catch {
    // best-effort: token may have expired on long runs
  }
}

export const test = base.extend<object, Fixtures>({
  userA: [
    async ({}, use, workerInfo) => {
      const admin = await adminContext();
      const user = await createTestUser(admin, `a${workerInfo.workerIndex}`);
      await use(user);
      await cleanupUser(user);
      await adminDeleteUser(admin, user.id);
      await admin.dispose();
    },
    { scope: "worker" },
  ],
  userB: [
    async ({}, use, workerInfo) => {
      const admin = await adminContext();
      const user = await createTestUser(admin, `b${workerInfo.workerIndex}`);
      await use(user);
      await cleanupUser(user);
      await adminDeleteUser(admin, user.id);
      await admin.dispose();
    },
    { scope: "worker" },
  ],
  apiA: [
    async ({ userA }, use) => {
      const ctx = await apiFor(userA.accessToken);
      await use(ctx);
      await ctx.dispose();
    },
    { scope: "worker" },
  ],
  apiB: [
    async ({ userB }, use) => {
      const ctx = await apiFor(userB.accessToken);
      await use(ctx);
      await ctx.dispose();
    },
    { scope: "worker" },
  ],
  anonApi: [
    async ({}, use) => {
      const ctx = await request.newContext({ baseURL: API_URL });
      await use(ctx);
      await ctx.dispose();
    },
    { scope: "worker" },
  ],
});

export const expect = test.expect;
