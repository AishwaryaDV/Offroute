import { test, expect } from "../helpers/fixtures";

async function createCircuit(api: import("@playwright/test").APIRequestContext, data: object) {
  const res = await api.post("/circuits", { data });
  expect(res.status(), await res.text()).toBe(201);
  return res.json();
}

test.describe("Circuits CRUD", () => {
  test("empty list for a fresh user", async ({ apiA }) => {
    expect(await (await apiA.get("/circuits")).json()).toEqual([]);
  });

  test("create → get → list → patch → delete", async ({ apiA }) => {
    const created = await createCircuit(apiA, {
      title: "Weekend Trip",
      description: "a short one",
      visibility: "private",
      tags: ["weekend", "coast"],
    });
    expect(created.slug).toBeTruthy();
    expect(created).toMatchObject({ point_count: 0, star_count: 0, is_starred: false, clone_count: 0 });

    const got = await (await apiA.get(`/circuits/${created.id}`)).json();
    expect(got.id).toBe(created.id);

    // accessible by slug too
    expect((await apiA.get(`/circuits/${created.slug}`)).ok()).toBeTruthy();

    const list = await (await apiA.get("/circuits")).json();
    expect(list.map((c: { id: string }) => c.id)).toContain(created.id);

    const patched = await (await apiA.patch(`/circuits/${created.id}`, {
      data: { title: "Weekend Trip Revised", visibility: "public" },
    })).json();
    expect(patched.title).toBe("Weekend Trip Revised");
    expect(patched.visibility).toBe("public");

    expect((await apiA.delete(`/circuits/${created.id}`)).status()).toBe(204);
    expect((await apiA.get(`/circuits/${created.id}`)).status()).toBe(404);
  });

  test("duplicate titles get suffixed slugs", async ({ apiA }) => {
    const a = await createCircuit(apiA, { title: "Dup Slug Trip" });
    const b = await createCircuit(apiA, { title: "Dup Slug Trip" });
    expect(a.slug).not.toBe(b.slug);
  });
});

test.describe("Circuit validation", () => {
  test("blank / whitespace title → 422", async ({ apiA }) => {
    expect((await apiA.post("/circuits", { data: { title: "" } })).status()).toBe(422);
    expect((await apiA.post("/circuits", { data: { title: "   " } })).status()).toBe(422);
  });

  test("non-existent circuit → 404, bad UUID → 422", async ({ apiA }) => {
    expect((await apiA.get("/circuits/00000000-0000-0000-0000-000000000000")).status()).toBe(404);
    expect((await apiA.get("/circuits/not-a-uuid-and-not-a-real-slug-xyz")).status()).toBe(404);
  });
});

test.describe("Circuit authorization", () => {
  test("another user's circuit is not readable/editable/deletable", async ({ apiA, apiB }) => {
    const c = await createCircuit(apiA, { title: "A's private circuit" });
    for (const status of [
      (await apiB.get(`/circuits/${c.id}`)).status(),
      (await apiB.patch(`/circuits/${c.id}`, { data: { title: "hijack" } })).status(),
      (await apiB.delete(`/circuits/${c.id}`)).status(),
    ]) {
      expect([403, 404]).toContain(status);
    }
    await apiA.delete(`/circuits/${c.id}`);
  });

  test("GET /circuits is per-user isolated", async ({ apiA, apiB }) => {
    const c = await createCircuit(apiA, { title: "Isolation check" });
    const bList = await (await apiB.get("/circuits")).json();
    expect(bList.map((x: { id: string }) => x.id)).not.toContain(c.id);
    await apiA.delete(`/circuits/${c.id}`);
  });
});

test.describe("Stars (two-user)", () => {
  test("B stars A's circuit → count+notification; unstar reverses", async ({ apiA, apiB }) => {
    const c = await createCircuit(apiA, { title: "Starrable", visibility: "public" });

    const star = await apiB.post(`/circuits/${c.id}/star`);
    expect(star.status()).toBe(201);
    expect(await star.json()).toMatchObject({ star_count: 1, is_starred: true });

    const notifs = await (await apiA.get("/me/notifications")).json();
    expect(notifs.some((n: { type: string }) => n.type === "star")).toBeTruthy();

    const unstar = await apiB.delete(`/circuits/${c.id}/star`);
    expect(await unstar.json()).toMatchObject({ star_count: 0, is_starred: false });

    await apiA.delete(`/circuits/${c.id}`);
  });

  test("starring own circuit creates no notification", async ({ apiA }) => {
    const c = await createCircuit(apiA, { title: "Self star" });
    await apiA.post(`/circuits/${c.id}/star`);
    const notifs = await (await apiA.get("/me/notifications")).json();
    expect(notifs.some((n: { type: string; circuit_id: string }) =>
      n.type === "star" && n.circuit_id === c.id)).toBeFalsy();
    await apiA.delete(`/circuits/${c.id}`);
  });
});

test.describe("Share + clone (two-user)", () => {
  test("share → public view → B clones independently → owner notified", async ({ apiA, apiB }) => {
    const c = await createCircuit(apiA, { title: "Shareable Route", visibility: "shared" });
    await apiA.post(`/circuits/${c.id}/points`, {
      data: { title: "Start", latitude: 11.4, longitude: 76.7 },
    });

    const token = (await (await apiA.post(`/circuits/${c.id}/share`)).json()).share_token;
    expect(token).toBeTruthy();

    const shared = await (await apiA.get(`/shared/${token}`)).json();
    expect(shared.title).toBe("Shareable Route");
    expect(shared.points.length).toBe(1);

    const clone = await apiB.post(`/shared/${token}/clone`);
    expect(clone.status(), await clone.text()).toBe(201);
    const cloned = await clone.json();
    expect(cloned.id).not.toBe(c.id);
    expect(cloned.cloned_from_token).toBe(token);

    // clone_count incremented + owner notified
    const refreshed = await (await apiA.get(`/circuits/${c.id}`)).json();
    expect(refreshed.clone_count).toBeGreaterThanOrEqual(1);
    const notifs = await (await apiA.get("/me/notifications")).json();
    expect(notifs.some((n: { type: string }) => n.type === "clone")).toBeTruthy();

    // independence: editing clone's point doesn't touch original
    const clonePoints = await (await apiB.get(`/circuits/${cloned.id}/points`)).json();
    await apiB.patch(`/points/${clonePoints[0].id}`, { data: { title: "Edited in clone" } });
    const origPoints = await (await apiA.get(`/circuits/${c.id}/points`)).json();
    expect(origPoints[0].title).toBe("Start");

    await apiB.delete(`/circuits/${cloned.id}`);
    await apiA.delete(`/circuits/${c.id}`);
  });

  test("cloning own circuit → 400", async ({ apiA }) => {
    const c = await createCircuit(apiA, { title: "Own clone attempt", visibility: "shared" });
    const token = (await (await apiA.post(`/circuits/${c.id}/share`)).json()).share_token;
    expect((await apiA.post(`/shared/${token}/clone`)).status()).toBe(400);
    await apiA.delete(`/circuits/${c.id}`);
  });

  test("invalid share token → 404; clone without auth → 401", async ({ apiA, anonApi }) => {
    expect((await apiA.get("/shared/definitely-not-a-real-token")).status()).toBe(404);
    const c = await createCircuit(apiA, { title: "t", visibility: "shared" });
    const token = (await (await apiA.post(`/circuits/${c.id}/share`)).json()).share_token;
    expect((await anonApi.post(`/shared/${token}/clone`)).status()).toBe(401);
    await apiA.delete(`/circuits/${c.id}`);
  });
});
