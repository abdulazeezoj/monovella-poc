import { expect, test } from "../journey";

for (const type of ["pharmacy", "lab"] as const) {
  test(`${type} settings changes the account password and rejects the previous password`, async ({
    app,
    page,
  }) => {
    await app.bootstrap(`/${type}/settings`);
    await page.getByRole("button", { name: "Change password", exact: true }).click();
    await page.getByLabel("Current password", { exact: true }).fill("wrong-password");
    await page.getByLabel("New password", { exact: true }).fill("SettingsPassword2026!");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Incorrect current password.", { exact: true })).toBeVisible();
    await page.getByLabel("Current password", { exact: true }).fill("Monovella2026!");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByLabel("Current password", { exact: true })).not.toBeVisible();
    await app.reload();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByLabel("Password", { exact: true }).fill("Monovella2026!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Incorrect email or password.", { exact: true })).toBeVisible();
    await page.getByLabel("Password", { exact: true }).fill("SettingsPassword2026!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${type}$`));
  });
}
