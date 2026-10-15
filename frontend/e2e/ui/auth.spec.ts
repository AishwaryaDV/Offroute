import { test, expect } from "../helpers/fixtures";

test.describe("Login page", () => {
  test("renders login form + Google button", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByPlaceholder("Email")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in with Google" })).toBeVisible();
  });

  test("unauthenticated visit to /dashboard redirects to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/, { timeout: 15_000 });
    expect(page.url()).toContain("/login");
  });

  test("email + password login lands on /dashboard", async ({ page, userA }) => {
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(userA.email);
    await page.getByPlaceholder("Password").fill(userA.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });
    expect(page.url()).toContain("/dashboard");
  });
});

test.describe("Google OAuth diagnosis", () => {
  // Doesn't complete Google login (automation is blocked) — it verifies the
  // button initiates the OAuth redirect and that Supabase accepts the
  // redirect_to (i.e. the allow-list is configured). A bounce back to /login
  // with an error, or a Supabase error page, pinpoints the break.
  test("Google button initiates a valid OAuth redirect", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in with Google" }).click();

    // Wait for the top-level navigation away from our login page.
    await page.waitForURL((url) => !url.pathname.startsWith("/login") || url.host !== "localhost:3000", {
      timeout: 20_000,
    }).catch(() => {});

    const landed = page.url();
    console.log("[google-oauth] landed on:", landed);

    const isGoogle = /accounts\.google\.com/.test(landed);
    const isSupabaseAuthorize = /supabase\.co\/auth\/v1\/authorize/.test(landed);
    const looksBroken = /error|otp_disabled|redirect|not.*allowed/i.test(landed) && !isGoogle;

    expect(
      isGoogle || isSupabaseAuthorize,
      `Expected redirect to Google/Supabase authorize; got ${landed} (looksBroken=${looksBroken})`,
    ).toBeTruthy();
  });
});
