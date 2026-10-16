import { test, expect } from "../helpers/fixtures";
import { adminContext, adminDeleteUser, apiFor, createTestUser } from "../helpers/auth";

// Generate a real notification for A by having B star A's public circuit.
async function seedNotification(apiA: import("@playwright/test").APIRequestContext, apiB: import("@playwright/test").APIRequestContext) {
  const c = await (await apiA.post("/circuits", { data: { title: "Notif seed", visibility: "public" } })).json();
  await apiB.post(`/circuits/${c.id}/star`);
  return c;
}

test.describe("Notifications", () => {
  test("empty state: list [] and unread count 0", async () => {
    // Needs a genuinely fresh user, not the shared worker-scoped apiB — other
    // spec files running earlier in this same worker can legitimately
    // generate notifications for apiB (e.g. collaborators.spec.ts deleting a
    // shared circuit), so "empty" can't be asserted against a user whose
    // history spans the whole suite run.
    const admin = await adminContext();
    const user = await createTestUser(admin, "notif-empty");
    const api = await apiFor(user.accessToken);
    await api.get("/me");

    expect(await (await api.get("/me/notifications")).json()).toEqual([]);
    expect((await (await api.get("/me/notifications/unread-count")).json()).count).toBe(0);

    await api.delete("/me");
    await api.dispose();
    await adminDeleteUser(admin, user.id);
    await admin.dispose();
  });

  test("new notification is unread → mark read → count 0", async ({ apiA, apiB }) => {
    const c = await seedNotification(apiA, apiB);

    const count1 = (await (await apiA.get("/me/notifications/unread-count")).json()).count;
    expect(count1).toBeGreaterThanOrEqual(1);

    const list = await (await apiA.get("/me/notifications")).json();
    expect(list[0]).toMatchObject({ read: false });
    for (const f of ["type", "message", "read", "created_at"]) expect(list[0]).toHaveProperty(f);

    expect((await apiA.post("/me/notifications/read")).ok()).toBeTruthy();
    expect((await (await apiA.get("/me/notifications/unread-count")).json()).count).toBe(0);

    await apiA.delete(`/circuits/${c.id}`);
  });

  test("delete single + clear all", async ({ apiA, apiB }) => {
    const c = await seedNotification(apiA, apiB);
    let list = await (await apiA.get("/me/notifications")).json();
    expect(list.length).toBeGreaterThanOrEqual(1);

    expect((await apiA.delete(`/me/notifications/${list[0].id}`)).status()).toBeLessThan(300);

    expect((await apiA.delete("/me/notifications")).status()).toBeLessThan(300);
    list = await (await apiA.get("/me/notifications")).json();
    expect(list).toEqual([]);

    await apiA.delete(`/circuits/${c.id}`);
  });

  test("deleting another user's notification → 404", async ({ apiA, apiB }) => {
    const c = await seedNotification(apiA, apiB);
    const list = await (await apiA.get("/me/notifications")).json();
    expect((await apiB.delete(`/me/notifications/${list[0].id}`)).status()).toBe(404);
    await apiA.delete(`/circuits/${c.id}`);
  });
});
