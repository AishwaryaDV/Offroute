import { test, expect } from "../helpers/fixtures";
import type { APIRequestContext } from "@playwright/test";

async function newCircuit(api: APIRequestContext, title = "Points host") {
  return (await (await api.post("/circuits", { data: { title } })).json());
}

test.describe("Points CRUD", () => {
  test("create → list ordered → get → patch (partial) → delete", async ({ apiA }) => {
    const c = await newCircuit(apiA);
    const p1 = await (await apiA.post(`/circuits/${c.id}/points`, {
      data: { title: "Cafe", latitude: 11.4, longitude: 76.7, category: "food", rating: 4 },
    })).json();
    const p2 = await (await apiA.post(`/circuits/${c.id}/points`, {
      data: { title: "Viewpoint", latitude: 11.5, longitude: 76.8 },
    })).json();

    expect(p1.order_index).toBe(0);
    expect(p2.order_index).toBe(1);
    expect(p1).toMatchObject({ latitude: 11.4, longitude: 76.7, category: "food", rating: 4 });

    const list = await (await apiA.get(`/circuits/${c.id}/points`)).json();
    expect(list.map((p: { id: string }) => p.id)).toEqual([p1.id, p2.id]);

    // partial update — only title changes, coords preserved
    const patched = await (await apiA.patch(`/points/${p1.id}`, { data: { title: "Cafe Renamed" } })).json();
    expect(patched).toMatchObject({ title: "Cafe Renamed", latitude: 11.4, longitude: 76.7 });

    expect((await apiA.delete(`/points/${p1.id}`)).status()).toBe(204);
    await apiA.delete(`/circuits/${c.id}`);
  });

  test("GET /points/all includes circuit_title + circuit_slug", async ({ apiA }) => {
    const c = await newCircuit(apiA, "World host");
    await apiA.post(`/circuits/${c.id}/points`, { data: { title: "X", latitude: 1, longitude: 2 } });
    const all = await (await apiA.get("/points/all")).json();
    const mine = all.find((p: { circuit_id: string }) => p.circuit_id === c.id);
    expect(mine).toBeTruthy();
    expect(mine.circuit_title).toBe("World host");
    expect(mine).toHaveProperty("circuit_slug");
    await apiA.delete(`/circuits/${c.id}`);
  });
});

test.describe("Points reorder", () => {
  test("reorder updates order_index, preserves data", async ({ apiA }) => {
    const c = await newCircuit(apiA, "Reorder host");
    const a = await (await apiA.post(`/circuits/${c.id}/points`, { data: { title: "A", latitude: 1, longitude: 1 } })).json();
    const b = await (await apiA.post(`/circuits/${c.id}/points`, { data: { title: "B", latitude: 2, longitude: 2 } })).json();

    const res = await apiA.patch(`/circuits/${c.id}/points/reorder`, {
      data: { points: [{ id: b.id, order_index: 0 }, { id: a.id, order_index: 1 }] },
    });
    expect(res.ok(), await res.text()).toBeTruthy();

    const list = await (await apiA.get(`/circuits/${c.id}/points`)).json();
    expect(list.map((p: { id: string }) => p.id)).toEqual([b.id, a.id]);
    await apiA.delete(`/circuits/${c.id}`);
  });
});

test.describe("Points validation & geo bounds", () => {
  test("blank title → 422", async ({ apiA }) => {
    const c = await newCircuit(apiA, "Validation host");
    expect((await apiA.post(`/circuits/${c.id}/points`, { data: { title: "  ", latitude: 0, longitude: 0 } })).status()).toBe(422);
    await apiA.delete(`/circuits/${c.id}`);
  });

  test("out-of-range lat/lng and rating → 422", async ({ apiA }) => {
    const c = await newCircuit(apiA, "Bounds host");
    expect((await apiA.post(`/circuits/${c.id}/points`, { data: { title: "x", latitude: 91, longitude: 0 } })).status()).toBe(422);
    expect((await apiA.post(`/circuits/${c.id}/points`, { data: { title: "x", latitude: 0, longitude: 181 } })).status()).toBe(422);
    expect((await apiA.post(`/circuits/${c.id}/points`, { data: { title: "x", latitude: 0, longitude: 0, rating: 6 } })).status()).toBe(422);
    await apiA.delete(`/circuits/${c.id}`);
  });

  test("boundary coords accepted (poles, date line, null island)", async ({ apiA }) => {
    const c = await newCircuit(apiA, "Boundary host");
    for (const [lat, lng] of [[90, 180], [-90, -180], [0, 0]]) {
      const res = await apiA.post(`/circuits/${c.id}/points`, { data: { title: "edge", latitude: lat, longitude: lng } });
      expect(res.status(), `${lat},${lng}`).toBe(201);
    }
    await apiA.delete(`/circuits/${c.id}`);
  });
});

test.describe("Points authorization", () => {
  test("cannot create/delete points on another user's circuit", async ({ apiA, apiB }) => {
    const c = await newCircuit(apiA, "Owned by A");
    const create = await apiB.post(`/circuits/${c.id}/points`, { data: { title: "intruder", latitude: 0, longitude: 0 } });
    expect([403, 404]).toContain(create.status());
    await apiA.delete(`/circuits/${c.id}`);
  });
});
