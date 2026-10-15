import { test, expect } from "../helpers/fixtures";

test.describe("Trips", () => {
  test("CRUD + circuit association + unlink keeps circuits", async ({ apiA }) => {
    const trip = await (await apiA.post("/trips", { data: { title: "Europe 2026" } })).json();
    expect(trip.circuit_count).toBe(0);

    const c1 = await (await apiA.post("/circuits", { data: { title: "Paris" } })).json();
    const c2 = await (await apiA.post("/circuits", { data: { title: "Rome" } })).json();

    expect((await apiA.post(`/trips/${trip.id}/circuits/${c1.id}`)).ok()).toBeTruthy();
    expect((await apiA.post(`/trips/${trip.id}/circuits/${c2.id}`)).ok()).toBeTruthy();

    let trips = await (await apiA.get("/trips")).json();
    expect(trips.find((t: { id: string }) => t.id === trip.id).circuit_count).toBe(2);

    expect((await apiA.delete(`/trips/${trip.id}/circuits/${c1.id}`)).ok()).toBeTruthy();
    trips = await (await apiA.get("/trips")).json();
    expect(trips.find((t: { id: string }) => t.id === trip.id).circuit_count).toBe(1);

    // delete trip → circuits survive
    expect([200, 204]).toContain((await apiA.delete(`/trips/${trip.id}`)).status());
    expect((await apiA.get(`/circuits/${c2.id}`)).ok()).toBeTruthy();

    await apiA.delete(`/circuits/${c1.id}`);
    await apiA.delete(`/circuits/${c2.id}`);
  });

  // Fixed: TripCreate now has Field(min_length=1) + title_not_blank validator,
  // matching circuits/points. Blank titles are rejected with 422.
  test("empty / whitespace trip title → 422", async ({ apiA }) => {
    expect((await apiA.post("/trips", { data: { title: "" } })).status()).toBe(422);
    expect((await apiA.post("/trips", { data: { title: "   " } })).status()).toBe(422);
  });

  test("cannot add another user's circuit to your trip", async ({ apiA, apiB }) => {
    const trip = await (await apiA.post("/trips", { data: { title: "A trip" } })).json();
    const cB = await (await apiB.post("/circuits", { data: { title: "B circuit" } })).json();
    const res = await apiA.post(`/trips/${trip.id}/circuits/${cB.id}`);
    expect([403, 404]).toContain(res.status());
    await apiA.delete(`/trips/${trip.id}`);
    await apiB.delete(`/circuits/${cB.id}`);
  });
});
