import { test, expect } from "../helpers/fixtures";

test.describe("User profile /me", () => {
  test("GET /me returns all fields", async ({ apiA }) => {
    const user = await (await apiA.get("/me")).json();
    for (const f of [
      "id", "email", "username", "display_name",
      "nationality", "avatar_url", "profile_enabled", "profile_bio",
    ]) {
      expect(user).toHaveProperty(f);
    }
  });

  test("PATCH /me updates display_name, nationality, bio, profile_enabled", async ({ apiA }) => {
    const res = await apiA.patch("/me", {
      data: {
        display_name: "QA Tester",
        nationality: "IN",
        profile_bio: "exploring edge cases",
        profile_enabled: true,
      },
    });
    expect(res.ok()).toBeTruthy();
    expect(await res.json()).toMatchObject({
      display_name: "QA Tester",
      nationality: "IN",
      profile_bio: "exploring edge cases",
      profile_enabled: true,
    });
  });

  test("PATCH /me sets a unique username", async ({ apiA }) => {
    const username = `qa_${Date.now()}`;
    const res = await apiA.patch("/me", { data: { username } });
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).username).toBe(username);
  });

  test("PATCH /me without auth returns 401", async ({ anonApi }) => {
    expect((await anonApi.patch("/me", { data: { display_name: "x" } })).status()).toBe(401);
  });
});
