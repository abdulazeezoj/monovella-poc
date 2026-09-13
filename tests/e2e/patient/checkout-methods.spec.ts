import { uid } from "../helpers/ids";
import { expect, journey, test } from "../journey";

const expertId = uid("exp_nwosu");
for (const [method, label] of [
  ["CARD", "Card"],
  ["TRANSFER", "Bank transfer"],
] as const) {
  journey.happy(
    "C8",
    `${label} checkout reaches its own receipt without a second charge on refresh`,
    async ({ app, page }) => {
      await app.bootstrap(`/app/experts/${expertId}/book`);
      const before = await app.state();
      const slot = before.data!.expertAvailability.find(
        (row) => row.expert_id === expertId && !row.taken,
      )!;
      await page
        .getByRole("button", {
          name: `${slot.start.slice(11, 16)}-${slot.end.slice(11, 16)}`,
          exact: true,
        })
        .first()
        .click();
      await page
        .getByLabel("What do you want help with?")
        .fill("Recurring headaches interrupt my work in the afternoon.");
      await page.getByRole("radio", { name: label, exact: true }).click();
      await page.getByRole("button", { name: "Continue to secure checkout", exact: true }).click();
      await page.waitForURL(/\/consultations\/[^/]+\/booking$/);
      const id = new URL(page.url()).pathname.split("/")[3];
      const created = (await app.rows("checkoutPayments")).filter(
        (row) => row.consultation_id === id,
      );
      expect(created).toHaveLength(1);
      const payment = created[0];
      expect(payment).toMatchObject({ method, status: "PAID", provider_id: expertId });
      expect(payment.total_amount_kobo).toBe(
        payment.provider_amount_kobo + payment.commission_amount_kobo,
      );
      await app.goto(`/app/consultations/${id}`);
      await page.getByRole("link", { name: /Checkout receipt/ }).click();
      await expect(page.locator('[data-screen="P48"]')).toBeVisible();
      await expect(page.getByText(label, { exact: true })).toBeVisible();
      await expect(page.getByText(payment.nomba_order_reference, { exact: true })).toBeVisible();
      await app.reload();
      const after = await app.rows("checkoutPayments");
      expect(after).toHaveLength(before.data!.checkoutPayments.length + 1);
      expect(after.filter((row) => row.consultation_id === id)).toEqual(created);
    },
  );
}

test("leaving checkout confirmation does not create a booking or payment later", async ({
  app,
  page,
}) => {
  await page.clock.install();
  await app.bootstrap(`/app/experts/${expertId}/book`);
  const before = await app.state();
  const slot = before.data!.expertAvailability.find(
    (row) => row.expert_id === expertId && !row.taken,
  )!;
  await page
    .getByRole("button", {
      name: `${slot.start.slice(11, 16)}-${slot.end.slice(11, 16)}`,
      exact: true,
    })
    .first()
    .click();
  await page
    .getByLabel("What do you want help with?")
    .fill("Recurring headaches interrupt my work in the afternoon.");
  await page.clock.pauseAt(await page.evaluate(() => new Date().toISOString()));
  await page.getByRole("button", { name: "Continue to secure checkout", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.clock.fastForward(5000);
  expect(await app.rows("checkoutPayments")).toEqual(before.data!.checkoutPayments);
  expect(await app.rows("consultations")).toEqual(before.data!.consultations);
  expect(await app.rows("expertAvailability")).toEqual(before.data!.expertAvailability);
});
