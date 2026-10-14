import { test, expect } from "../helpers/fixtures";

test.describe("Search", () => {
  test("matches own circuits/points; scoped per-user; injection-safe", async ({ apiA, apiB }) => {
    const term = `tokyo${Date.now()}`;
    const c = await (await apiA.post("/circuits", { data: { title: `${term} nights`, description: "neon" } })).json();
    await apiA.post(`/circuits/${c.id}/points`, { data: { title: `${term} tower`, latitude: 35.6, longitude: 139.7 } });

    const res = await (await apiA.get(`/search?q=${term}`)).json();
    expect(res.circuits.length + res.points.length).toBeGreaterThanOrEqual(1);

    // B searching the same term sees none of A's data
    const bRes = await (await apiB.get(`/search?q=${term}`)).json();
    expect(bRes.circuits.length + bRes.points.length).toBe(0);

    // SQL-injection style input is handled safely (no 500)
    const inj = await apiA.get(`/search?q=${encodeURIComponent("'; DROP TABLE points; --")}`);
    expect(inj.status()).toBeLessThan(500);

    await apiA.delete(`/circuits/${c.id}`);
  });

  test("empty query (<1 char) → 422", async ({ apiA }) => {
    expect((await apiA.get("/search?q=")).status()).toBe(422);
  });
});

test.describe("Stats", () => {
  test("reflects created circuits/points; categories map", async ({ apiA }) => {
    const base = await (await apiA.get("/me/stats")).json();
    const c = await (await apiA.post("/circuits", { data: { title: "Stats circuit" } })).json();
    await apiA.post(`/circuits/${c.id}/points`, { data: { title: "p", latitude: 1, longitude: 1, category: "food" } });

    const after = await (await apiA.get("/me/stats")).json();
    expect(after.circuits).toBeGreaterThan(base.circuits ?? 0);
    expect(after.points).toBeGreaterThan(base.points ?? 0);
    expect(after).toHaveProperty("categories");
    expect(after).toHaveProperty("stars_received");
    expect(after).toHaveProperty("total_clones");

    await apiA.delete(`/circuits/${c.id}`);
  });
});

test.describe("Public profiles", () => {
  test("enabled profile exposes only public circuits; disabled → 404", async ({ apiA, anonApi }) => {
    const username = `qa_pub_${Date.now()}`;
    await apiA.patch("/me", { data: { username, display_name: "Pub User", profile_enabled: true } });

    const pub = await apiA.post("/circuits", { data: { title: "Public one", visibility: "public" } });
    const priv = await apiA.post("/circuits", { data: { title: "Private one", visibility: "private" } });
    const pubId = (await pub.json()).id;
    const privId = (await priv.json()).id;

    // public profile endpoints need no auth
    const profile = await anonApi.get(`/u/${username}`);
    expect(profile.ok(), await profile.text()).toBeTruthy();

    const circuits = await (await anonApi.get(`/u/${username}/circuits`)).json();
    const ids = circuits.map((c: { id: string }) => c.id);
    expect(ids).toContain(pubId);
    expect(ids).not.toContain(privId);

    // username case-insensitive
    expect((await anonApi.get(`/u/${username.toUpperCase()}`)).ok()).toBeTruthy();

    // disable → 404
    await apiA.patch("/me", { data: { profile_enabled: false } });
    expect((await anonApi.get(`/u/${username}`)).status()).toBe(404);

    await apiA.delete(`/circuits/${pubId}`);
    await apiA.delete(`/circuits/${privId}`);
  });

  test("non-existent username → 404", async ({ anonApi }) => {
    expect((await anonApi.get(`/u/nope_${Date.now()}`)).status()).toBe(404);
  });
});
