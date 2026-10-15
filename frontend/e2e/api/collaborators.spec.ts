import { test, expect } from "../helpers/fixtures";

test.describe("Collaborators invite flow (two-user)", () => {
  test("invite → invitee sees invite + notification → accept → inviter notified", async ({ apiA, apiB, userB }) => {
    const c = await (await apiA.post("/circuits", { data: { title: "Collab circuit" } })).json();

    const invite = await apiA.post(`/circuits/${c.id}/collaborators`, {
      data: { email: userB.email, role: "editor" },
    });
    expect(invite.status(), await invite.text()).toBeLessThan(300);

    // B sees pending invite + invite notification
    const invites = await (await apiB.get("/me/invites")).json();
    const mine = invites.find((i: { circuit_id: string }) => i.circuit_id === c.id);
    expect(mine).toBeTruthy();
    expect(mine.status).toBe("pending");

    const bNotifs = await (await apiB.get("/me/notifications")).json();
    expect(bNotifs.some((n: { type: string }) => n.type === "invite")).toBeTruthy();

    // accept → inviter (A) gets invite_accepted
    expect((await apiB.post(`/me/invites/${mine.id}/accept`)).ok()).toBeTruthy();
    const aNotifs = await (await apiA.get("/me/notifications")).json();
    expect(aNotifs.some((n: { type: string }) => n.type === "invite_accepted")).toBeTruthy();

    // owner lists collaborators
    const collabs = await (await apiA.get(`/circuits/${c.id}/collaborators`)).json();
    expect(collabs.some((x: { user_id: string }) => x.user_id === userB.id)).toBeTruthy();

    await apiA.delete(`/circuits/${c.id}`);
  });

  test("inviting yourself → 400", async ({ apiA, userA }) => {
    const c = await (await apiA.post("/circuits", { data: { title: "self invite" } })).json();
    const res = await apiA.post(`/circuits/${c.id}/collaborators`, { data: { email: userA.email, role: "editor" } });
    expect(res.status()).toBe(400);
    await apiA.delete(`/circuits/${c.id}`);
  });

  test("only the owner can invite / list collaborators", async ({ apiA, apiB, userA }) => {
    const c = await (await apiA.post("/circuits", { data: { title: "owner only" } })).json();
    expect([403, 404]).toContain((await apiB.get(`/circuits/${c.id}/collaborators`)).status());
    expect([403, 404]).toContain(
      (await apiB.post(`/circuits/${c.id}/collaborators`, { data: { email: userA.email, role: "viewer" } })).status(),
    );
    await apiA.delete(`/circuits/${c.id}`);
  });
});
