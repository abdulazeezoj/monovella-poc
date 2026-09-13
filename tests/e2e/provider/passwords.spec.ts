import { expect, test } from "../journey";

for (const type of ["pharmacy", "lab"] as const) {
  test(`${type} password change and reset survive reload and consume the reset link`, async ({
    app,
    page,
  }) => {
    await app.bootstrap(`/${type}/password`);
    await page.getByLabel("Current password", { exact: true }).fill("Monovella2026!");
    await page.getByLabel("New password", { exact: true }).fill("ChangedPassword2026!");
    await page.getByRole("button", { name: "Change password", exact: true }).click();
    await app.goto(`/${type}/sign-in`);
    await page.getByLabel("Password", { exact: true }).fill("Monovella2026!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Incorrect email or password.", { exact: true })).toBeVisible();
    await page.getByLabel("Password", { exact: true }).fill("ChangedPassword2026!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${type}$`));
    await app.goto(`/${type}/forgot`);
    await page
      .getByLabel("Email", { exact: true })
      .fill(type === "pharmacy" ? "counter@greenlifepharmacy.ng" : "reception@lagosdiagnostics.ng");
    await page.getByRole("button", { name: "Send reset link", exact: true }).click();
    await page.getByRole("button", { name: "Open the link (demo)", exact: true }).click();
    const url = page.url();
    await app.reload();
    await page.getByLabel("New password", { exact: true }).fill("ResetPassword2026!");
    await page.getByRole("button", { name: "Reset password", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${type}/sign-in$`));
    await page.getByLabel("Password", { exact: true }).fill("ResetPassword2026!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${type}$`));
    await app.goto(new URL(url).pathname + new URL(url).search);
    await page.getByLabel("New password", { exact: true }).fill("ReusePassword2026!");
    await page.getByRole("button", { name: "Reset password", exact: true }).click();
    await expect(
      page.getByText("That reset link is invalid or has expired.", { exact: true }),
    ).toBeVisible();
  });
}
