import { expect, test } from "../journey";

for (const type of ["pharmacy", "lab"] as const) {
  test(`${type} password lock persists across reload and expires`, async ({ app, page }) => {
    await app.bootstrap(`/${type}/sign-in`);
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.getByLabel("Password", { exact: true }).fill("wrong-password");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
    }
    await expect(page.getByLabel("Password", { exact: true })).toBeDisabled();
    await expect(page.getByText(/Too many incorrect attempts/)).toBeVisible();
    await app.reload();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeDisabled();
    await page.evaluate(() => {
      const auth = JSON.parse(sessionStorage.getItem("mv-auth-journey-v1")!);
      for (const attempt of Object.values(auth.providerSignInAttempts) as {
        lockedUntil: string | null;
      }[])
        attempt.lockedUntil = "2020-01-01T00:00:00Z";
      sessionStorage.setItem("mv-auth-journey-v1", JSON.stringify(auth));
    });
    await app.reload();
    await page.getByLabel("Password", { exact: true }).fill("Monovella2026!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${type}$`));
  });
}
