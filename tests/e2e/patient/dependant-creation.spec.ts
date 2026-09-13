import { expect, journey } from "../journey";

journey.happy(
  "E1",
  "a new dependant survives confirmation and NIN verification",
  async ({ app, page }) => {
    await app.bootstrap("/app/dependants/new");
    await page.getByLabel("First name", { exact: true }).fill("Ada");
    await page.getByLabel("Last name", { exact: true }).fill("Test");
    await page.getByLabel("Date of birth").fill("1994-04-09");
    await page.getByLabel("Gender", { exact: true }).selectOption("FEMALE");
    await page.getByRole("radio", { name: "They don't have a National ID number yet" }).check();
    await page.getByLabel("Their phone number").fill("08062223344");
    await page.getByRole("button", { name: "Add them", exact: true }).click();
    await expect(page.getByText("Waiting for Ada to confirm", { exact: true })).toBeVisible();
    const id = new URL(page.url()).searchParams.get("pending")!;
    await app.reload();
    await expect(page.getByText("Waiting for Ada to confirm", { exact: true })).toBeVisible();
    expect((await app.rows("patients")).some((p) => p.id === id)).toBe(false);
    await app.patchSession({ authenticated: false }, `/app/dependants/confirm?id=${id}`);
    await page.getByLabel("Confirmation code").fill("000000");
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(page.getByText(/That code is not correct/)).toBeVisible();
    await app.reload();
    await page.getByLabel("Confirmation code").fill("246810");
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(page.getByText(/Confirmed.*can now help manage your care/)).toBeVisible();
    await app.patchSession({ authenticated: true }, "/app/dependants");
    await expect(page.getByRole("link", { name: /Ada Test/ })).toBeVisible();
    await app.goto(`/app/dependants/${id}/verify`);
    await page.getByLabel("Ada's National Identity Number").fill("12345678901");
    await page.getByRole("checkbox", { name: /I consent to Monovella verifying/ }).check();
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    await app.reload();
    expect((await app.rows("patients")).find((p) => p.id === id)).toMatchObject({
      first_name: "Ada",
      status: "VERIFIED",
      guardian_reason: "NO_NIN_YET",
      verified_at: expect.any(String),
    });
  },
);

journey.happy(
  "E1",
  "a child is saved provisionally without adult phone confirmation",
  async ({ app, page }) => {
    await app.bootstrap("/app/dependants/new");
    const before = await app.rows("patients");
    await page.getByLabel("First name", { exact: true }).fill("Nneka");
    await page.getByLabel("Last name", { exact: true }).fill("Test");
    await page.getByLabel("Date of birth").fill("2018-04-09");
    await page.getByLabel("Gender", { exact: true }).selectOption("FEMALE");
    await page.getByRole("radio", { name: "They're under 18", exact: true }).check();
    await page.getByRole("button", { name: "Add them", exact: true }).click();
    await expect(page.getByRole("link", { name: /Nneka Test/ })).toBeVisible();
    await app.reload();
    const after = await app.rows("patients");
    expect(after).toEqual(expect.arrayContaining(before));
    expect(after).toHaveLength(before.length + 1);
    expect(after.find((p) => p.first_name === "Nneka" && p.last_name === "Test")).toMatchObject({
      status: "PROVISIONAL",
      is_dependant: true,
      guardian_reason: "MINOR",
    });
  },
);

journey.sad(
  "E1",
  "a locked dependant confirmation requires the guardian to resend",
  async ({ app, page }) => {
    await app.bootstrap("/app/dependants/new");
    await page.getByLabel("First name", { exact: true }).fill("Ada");
    await page.getByLabel("Last name", { exact: true }).fill("Test");
    await page.getByLabel("Date of birth").fill("1994-04-09");
    await page.getByLabel("Gender", { exact: true }).selectOption("FEMALE");
    await page.getByRole("radio", { name: "They don't have a National ID number yet" }).check();
    await page.getByLabel("Their phone number").fill("08062223344");
    await page.getByRole("button", { name: "Add them", exact: true }).click();
    await expect(page.getByText("Waiting for Ada to confirm", { exact: true })).toBeVisible();
    const id = new URL(page.url()).searchParams.get("pending")!;

    await app.patchSession({ authenticated: false }, `/app/dependants/confirm?id=${id}`);
    await page.getByLabel("Confirmation code").fill("000000");
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.getByRole("button", { name: "Confirm", exact: true }).click();
      if (attempt < 4) await expect(page.getByText(/That code is not correct/)).toBeVisible();
    }
    await expect(page.getByText(/Too many attempts/)).toBeVisible();
    await app.reload();
    await expect(page.getByRole("button", { name: "Confirm", exact: true })).toBeDisabled();
    expect((await app.rows("patients")).some((patient) => patient.id === id)).toBe(false);
    await app.patchSession({ authenticated: true }, `/app/dependants/new?pending=${id}`);
    await page.getByRole("button", { name: "Send a new code", exact: true }).click();
    await app.patchSession({ authenticated: false }, `/app/dependants/confirm?id=${id}`);
    await page.getByLabel("Confirmation code").fill("246810");
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(page.getByText(/Confirmed.*can now help manage your care/)).toBeVisible();
    await app.reload();
    expect((await app.rows("patients")).filter((patient) => patient.id === id)).toHaveLength(1);
  },
);
