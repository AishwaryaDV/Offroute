import { test, expect } from "../helpers/fixtures";

test.describe("Health & infrastructure", () => {
  test("GET /health returns ok + database ok", async ({ anonApi }) => {
    const res = await anonApi.get("/health");
    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toMatchObject({ status: "ok", database: "ok" });
  });

  test("GET /push/vapid-key returns a public key (no auth)", async ({ anonApi }) => {
    const res = await anonApi.get("/push/vapid-key");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.publicKey ?? body.public_key).toBeTruthy();
  });
});

test.describe("Auth boundaries", () => {
  test("protected endpoint without token returns 401", async ({ anonApi }) => {
    expect((await anonApi.get("/me")).status()).toBe(401);
    expect((await anonApi.get("/circuits")).status()).toBe(401);
  });

  test("tampered JWT returns 401", async ({ anonApi, userA }) => {
    const parts = userA.accessToken.split(".");
    const tampered = `${parts[0]}.${parts[1]}x.${parts[2]}`;
    const res = await anonApi.get("/me", { headers: { Authorization: `Bearer ${tampered}` } });
    expect(res.status()).toBe(401);
  });

  test("valid token resolves /me (user auto-synced from JWT)", async ({ apiA, userA }) => {
    const res = await apiA.get("/me");
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).email).toBe(userA.email);
  });
});
