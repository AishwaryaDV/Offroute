import { test, expect } from "../helpers/fixtures";

test.describe("Ask AI chat", () => {
  test("open, send a message, get a reply, undo a write", async ({ page, userA, apiA }) => {
    const circuit = await (await apiA.post("/circuits", { data: { title: "Chat UI Test" } })).json();

    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(userA.email);
    await page.getByPlaceholder("Password").fill(userA.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 });

    await page.goto(`/circuits/${circuit.id}`);
    await page.getByRole("button", { name: "Ask AI" }).click();

    await expect(page.getByText("Ask AI")).toBeVisible();
    const input = page.getByPlaceholder("Message the assistant…");
    await input.fill("Add Toit in Indiranagar Bangalore, drinks, 5 stars.");
    await page.getByRole("button", { name: "Send" }).click();

    // typing indicator appears, then a reply bubble lands
    await expect(page.locator("text=Added").or(page.locator('[role="log"]'))).toBeVisible();
    await expect(page.getByRole("button", { name: "Undo last change" })).toBeVisible({ timeout: 30_000 });

    await page.getByRole("button", { name: "Undo last change" }).click();
    await expect(page.getByRole("button", { name: "Undo last change" })).toBeHidden();

    const points = await (await apiA.get(`/circuits/${circuit.id}/points`)).json();
    expect(points.length).toBe(0);

    await apiA.delete(`/circuits/${circuit.id}`);
  });
});
