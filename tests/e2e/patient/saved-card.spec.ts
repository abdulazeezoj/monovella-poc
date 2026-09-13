import { expect, test } from "../journey";

test("card verification saves only a successful card and survives reload", async ({
  app,
  page,
}) => {
  await app.bootstrap("/app/account/payment-methods");
  const before = await app.rows("paymentMethods");
  await page.getByRole("link", { name: "Add a card", exact: true }).click();
  await expect(page.getByRole("button", { name: "Continue to Nomba" })).toBeVisible();
  const show = page.getByRole("button", { name: "Show prototype controls" });
  if (await show.isVisible()) await show.click();
  await page.getByTitle("Switch this screen's state").click();
  await page.getByRole("menuitemradio", { name: "FAILED", exact: true }).click();
  await expect(page.getByText("That card couldn't be verified.", { exact: false })).toBeVisible();
  expect(await app.rows("paymentMethods")).toEqual(before);
  await page.getByRole("button", { name: "Continue to Nomba" }).click();
  await expect(page.getByRole("button", { name: "Continue to Nomba" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Done", exact: true })).toBeVisible();
  const saved = await app.rows("paymentMethods");
  expect(saved).toHaveLength(before.length + 1);
  expect(new Set(saved.map((card) => card.id)).size).toBe(saved.length);
  expect(saved.at(-1)).toMatchObject({ brand: "Verve", last4: "7723" });
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await app.reload();
  expect(await app.rows("paymentMethods")).toEqual(saved);
  await expect(page.getByRole("button", { name: "Remove Verve ending 7723" })).toBeVisible();
});

test("leaving a pending card verification does not save a card later", async ({ app, page }) => {
  await page.clock.install();
  await app.bootstrap("/app/account/payment-methods");
  const before = await app.rows("paymentMethods");
  await page.getByRole("link", { name: "Add a card", exact: true }).click();
  await page.getByRole("button", { name: "Continue to Nomba" }).click();
  await page.goBack();
  await page.clock.fastForward(5000);
  expect(await app.rows("paymentMethods")).toEqual(before);
});
