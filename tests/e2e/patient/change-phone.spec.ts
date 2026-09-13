import { expect, test } from "../journey";

const nextPhone = "08062223344";
test("phone change verifies the new number and survives a reload", async ({ app, page }) => {
  await app.bootstrap("/app/account/personal");
  await page.getByRole("link", { name: "Change", exact: true }).click();
  await page.getByLabel("New phone number").fill(nextPhone);
  await page.getByRole("button", { name: "Send a code", exact: true }).click();
  await page.getByLabel("Verification code").fill("000000");
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await expect(page.getByText("That code is not correct.", { exact: true })).toBeVisible();
  await app.reload();
  await page.getByLabel("Verification code").fill("864200");
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await page.waitForURL("**/app/account/personal");
  await app.reload();
  await expect(page.getByText(nextPhone, { exact: true })).toBeVisible();
});

test("phone verification lock survives reload and cannot be reset by starting again", async ({
  app,
  page,
}) => {
  await page.clock.install();
  await app.bootstrap("/app/account/change-phone");
  await page.getByLabel("New phone number").fill(nextPhone);
  await page.getByRole("button", { name: "Send a code", exact: true }).click();
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByLabel("Verification code").fill("000000");
    await page.getByRole("button", { name: "Verify", exact: true }).click();
  }
  await app.reload();
  await page.getByLabel("Verification code").fill("864200");
  await expect(page.getByRole("button", { name: "Verify", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Start again", exact: true })).toBeDisabled();
  await expect(page.getByText(/Too many incorrect codes/)).toBeVisible();
  await page.clock.fastForward(6 * 60_000);
  await expect(page.getByRole("button", { name: "Verify", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Verify", exact: true }).click();
  await page.waitForURL("**/app/account/personal");
  await expect(page.getByText(nextPhone, { exact: true })).toBeVisible();
});
