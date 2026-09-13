import { expect, test } from "../journey";

for (const type of ["pharmacy", "lab"] as const) {
  test(`${type} two-step verification enrolls, challenges sign-in and consumes recovery codes`, async ({
    app,
    page,
  }) => {
    await app.bootstrap(`/${type}/settings`);
    await page.getByRole("button", { name: /Two-step verification/ }).click();
    await page.getByLabel("Six-digit authenticator code").fill("000000");
    await page.getByRole("button", { name: "Confirm and turn on" }).click();
    await expect(
      page.getByText("That authenticator code is not valid.", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Six-digit authenticator code").fill("112233");
    await page.getByRole("button", { name: "Confirm and turn on" }).click();
    await expect(page.getByText("Save your demo recovery codes", { exact: true })).toBeVisible();
    const recovery = await page
      .locator("li")
      .filter({ hasText: /^DEMO-/ })
      .first()
      .innerText();
    await app.goto(`/${type}/sign-in`);
    await page.getByLabel("Password", { exact: true }).fill("Monovella2026!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Verify your sign-in" })).toBeVisible();
    await page.getByLabel("Verification code").fill("000000");
    await page.getByRole("button", { name: "Verify and sign in" }).click();
    await expect(
      page.getByText("That code is invalid or has already been used.", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Verification code").fill(recovery);
    await page.getByRole("button", { name: "Verify and sign in" }).click();
    await expect(page).toHaveURL(new RegExp(`/${type}$`));
    await app.reload();
    await app.goto(`/${type}/sign-in`);
    await page.getByLabel("Password", { exact: true }).fill("Monovella2026!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByLabel("Verification code").fill(recovery);
    await page.getByRole("button", { name: "Verify and sign in" }).click();
    await expect(
      page.getByText("That code is invalid or has already been used.", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Verification code").fill("112233");
    await page.getByRole("button", { name: "Verify and sign in" }).click();
    await app.goto(`/${type}/settings`);
    await page.getByRole("button", { name: /Two-step verification/ }).click();
    await page.getByLabel("Current password").fill("wrong");
    await page.getByLabel("Verification code").fill("112233");
    await page.getByRole("button", { name: "Turn it off" }).click();
    await expect(page.getByText(/Check your password and verification code/)).toBeVisible();
    await page.getByLabel("Current password").fill("Monovella2026!");
    await page.getByRole("button", { name: "Turn it off" }).click();
    await expect(page.getByText("Not set up", { exact: true })).toBeVisible();
  });
}

test("provider verification previews preserve account settings", async ({ app, page }) => {
  await app.bootstrap("/pharmacy/sign-in");
  const original = await app.rows("twoFactorSettings");
  for (const label of ["two_factor_required", "Invalid verification code", "Verification locked"]) {
    await app.selectScreenState(label);
    await expect(page.getByRole("heading", { name: "Verify your sign-in" })).toBeVisible();
    await page.getByLabel("Verification code").fill("112233");
    await expect(page.getByRole("button", { name: "Verify and sign in" })).toBeDisabled();
    expect(await app.rows("twoFactorSettings")).toEqual(original);
  }
  await app.selectScreenState("Default");
  await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
});

for (const type of ["pharmacy", "lab"] as const) {
  test(`${type} verification lock survives reload and allows sign-in after expiry`, async ({
    app,
    page,
  }) => {
    await app.bootstrap(`/${type}/settings`);
    await page.getByRole("button", { name: /Two-step verification/ }).click();
    await page.getByLabel("Six-digit authenticator code").fill("112233");
    await page.getByRole("button", { name: "Confirm and turn on" }).click();
    await expect(page.getByText("Save your demo recovery codes", { exact: true })).toBeVisible();
    const signIn = async () => {
      await app.goto(`/${type}/sign-in`);
      await page.getByLabel("Password", { exact: true }).fill("Monovella2026!");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page.getByRole("heading", { name: "Verify your sign-in" })).toBeVisible();
    };
    await signIn();
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.getByLabel("Verification code").fill(`00000${attempt}`);
      await page.getByRole("button", { name: "Verify and sign in" }).click();
    }
    const lockMessage = page.getByText("Too many incorrect codes. Try again in five minutes.", {
      exact: true,
    });
    await expect(lockMessage).toBeVisible();
    await app.reload();
    await signIn();
    await page.getByLabel("Verification code").fill("112233");
    await page.getByRole("button", { name: "Verify and sign in" }).click();
    await expect(lockMessage).toBeVisible();
    const authenticated = await page.evaluate(
      (type) =>
        JSON.parse(sessionStorage.getItem("mv-auth-journey-v1")!).web_sessions[type.toUpperCase()]
          .authenticated,
      type,
    );
    expect(authenticated).toBe(false);
    // Advance only this demo factor's deadline, without waiting five real minutes.
    await page.evaluate(() => {
      const auth = JSON.parse(sessionStorage.getItem("mv-auth-journey-v1")!);
      for (const factor of Object.values(auth.providerFactors) as { lockedUntil: string | null }[])
        factor.lockedUntil = "2020-01-01T00:00:00Z";
      sessionStorage.setItem("mv-auth-journey-v1", JSON.stringify(auth));
    });
    await app.reload();
    await signIn();
    await page.getByLabel("Verification code").fill("112233");
    await page.getByRole("button", { name: "Verify and sign in" }).click();
    await expect(page).toHaveURL(new RegExp(`/${type}$`));
  });
}
