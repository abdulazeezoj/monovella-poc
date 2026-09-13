import { STORE_KEY } from "../fixtures";
import { expect, journey, test } from "../journey";

journey.happy(
  "I8",
  "an invitation remains stable and carries its code into signup",
  async ({ app, page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (text: string) => sessionStorage.setItem("test-copied-invite", text),
        },
      });
    });
    await app.bootstrap("/app/account/invite");
    const patientId = (await app.state()).session!.viewingPatientId;
    // Exercise an older account saved before invitations were provisioned.
    await page.evaluate(
      ({ key, patientId }) => {
        const state = JSON.parse(sessionStorage.getItem(key)!);
        state.data.referralCodes = state.data.referralCodes.filter(
          (row: { patient_id: string }) => row.patient_id !== patientId,
        );
        sessionStorage.setItem(key, JSON.stringify(state));
      },
      { key: STORE_KEY, patientId },
    );
    await app.reload();
    await page.getByRole("button", { name: "Share", exact: true }).click();
    const copied = await page.evaluate(() => sessionStorage.getItem("test-copied-invite"));
    const code = new URL(copied!).searchParams.get("ref");
    expect(code).toMatch(/^INV-DEMO-/);
    expect(code).not.toContain(patientId!);
    await app.reload();
    await page.getByRole("button", { name: "Share", exact: true }).click();
    expect(await page.evaluate(() => sessionStorage.getItem("test-copied-invite"))).toBe(copied);
    await app.goto(`/?ref=${encodeURIComponent(code!)}`);
    const join = page.locator(`a[href="/app/sign-up?ref=${encodeURIComponent(code!)}"]`).first();
    await expect(join).toBeVisible();
    await join.click();
    await expect(page.getByLabel("Have a referral code?")).toHaveValue(code!);
  },
);

test("unavailable sharing does not claim an invitation was copied", async ({ app, page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined });
  });
  await app.bootstrap("/app/account/invite");
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(
    page.getByText("Sharing is unavailable. Select and copy the link shown on this page."),
  ).toBeVisible();
  await expect(page.getByText(/Invite link copied/)).toHaveCount(0);
});
