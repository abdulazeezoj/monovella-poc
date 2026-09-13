import { PATIENTS, uid } from "../helpers/ids";
import { expect, journey } from "../journey";

for (const handoff of ["PICKUP", "DELIVERY"] as const) {
  journey.happy(
    ["C15", "H2", "M6", "O4", "P2"],
    `pharmacy quote to paid ${handoff.toLowerCase()} remains one order after reload`,
    async ({ app, page }) => {
      await app.bootstrap("/app");
      const cases = (await app.rows("consultations")).filter(
        (item) => item.patient_identity_id === PATIENTS.self,
      );
      const requests = await app.rows("providerRequests");
      const rx = (await app.rows("prescriptions")).find(
        (item) =>
          cases.some((care) => care.id === item.consultation_id) &&
          !item.corrected_by_id &&
          item.fulfillment_status !== "FILLED" &&
          !requests.some((request) => request.prescription_id === item.id),
      );
      expect(
        rx,
        "an unfilled patient prescription must be available for a new request",
      ).toBeTruthy();
      await app.goto(`/app/prescriptions/${rx.id}/pharmacies`);
      await page.getByLabel("Search pharmacies").fill("no-such-pharmacy");
      await expect(page.getByText("No matching pharmacies", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Clear search" }).click();
      await page.getByLabel("Search pharmacies").fill("GreenLife");
      await page.getByLabel("Location", { exact: true }).fill("Abuja");
      await expect(page.getByText("No matching pharmacies", { exact: true })).toBeVisible();
      await page.getByLabel("Location", { exact: true }).fill("Lagos");
      await page.getByRole("button", { name: /GreenLife Pharmacy/ }).click();
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Consent and send request" }).click();
      const request = (await app.rows("providerRequests")).find(
        (item) => item.prescription_id === rx.id,
      );
      expect(request).toBeTruthy();
      await app.goto(`/app/prescriptions/${rx.id}/order`);
      await expect(
        page.getByText(
          "Waiting for the pharmacy to confirm availability and price. You have not paid yet.",
        ),
      ).toBeVisible();
      await expect(page.getByText("Fulfilled. This is now on your record.")).toHaveCount(0);
      await app.goto(`/pharmacy/requests/${request.id}`);
      await page.getByLabel("Your confirmed price (₦)").fill("6500");
      await page.getByRole("button", { name: "Accept", exact: true }).click();
      await page.getByLabel("Revised price before checkout (₦)").fill("7000");
      await page.getByRole("button", { name: "Update price", exact: true }).click();
      await app.goto(`/app/prescriptions/${rx.id}/order`);
      await expect(page.getByText(/Complete payment before collection or delivery/)).toBeVisible();
      await expect(page.getByText("₦8,400", { exact: true })).toBeVisible();
      await page
        .getByRole("radio", { name: handoff === "PICKUP" ? "I'll collect" : "Deliver it" })
        .click();
      if (handoff === "DELIVERY") {
        await page
          .getByLabel("Where to, and anything they should know")
          .fill("14 Demo Street, Ikeja. Call at the gate.");
      }
      await page.getByRole("radio", { name: "Bank transfer", exact: true }).click();
      await page.getByRole("button", { name: "Confirm secure checkout", exact: true }).click();
      await app.reload();
      await expect(
        page.getByRole("button", { name: "Verify demo payment", exact: true }),
      ).toHaveCount(0);
      await app.selectScreenState("Simulate payment success");
      await app.reload();
      await app.selectScreenState("Simulate payment success");
      await app.selectScreenState("Simulate payment failure");
      const payments = (await app.rows("checkoutPayments")).filter(
        (item) => item.provider_request_id === request.id,
      );
      expect(payments).toHaveLength(1);
      expect(payments[0]).toMatchObject({
        status: "PAID",
        total_amount_kobo: 840000,
        provider_amount_kobo: 700000,
        method: "TRANSFER",
      });
      await expect(
        page.getByRole("button", { name: "Confirm secure checkout", exact: true }),
      ).toHaveCount(0);
      await app.goto(`/pharmacy/requests/${request.id}`);
      if (handoff === "DELIVERY")
        await expect(
          page.getByText("14 Demo Street, Ikeja. Call at the gate.", { exact: true }),
        ).toBeVisible();
      await page
        .getByRole("button", {
          name: handoff === "PICKUP" ? "Ready for pickup" : "Out for delivery",
          exact: true,
        })
        .click();
      await app.goto(`/app/prescriptions/${rx.id}/order`);
      await expect(
        page.getByText(handoff === "PICKUP" ? "Ready for collection." : "On its way to you.", {
          exact: true,
        }),
      ).toBeVisible();
      await app.goto(`/pharmacy/requests/${request.id}`);
      await page.getByRole("button", { name: "Fulfilled", exact: true }).click();
      await app.goto(`/app/prescriptions/${rx.id}/order`);
      await expect(
        page.getByText("Fulfilled. This is now on your record.", { exact: true }),
      ).toBeVisible();
      expect(
        (await app.rows("prescriptions")).find((item) => item.id === rx.id).fulfillment_status,
      ).toBe("FILLED");
      const payout = (await app.rows("providerPayouts")).find(
        (item) => item.checkout_payment_id === payments[0].id,
      );
      expect(payout.status, "fulfilment is not proof that a bank transfer settled").toBe(
        "PROCESSING",
      );
      await app.goto(`/pharmacy/requests/${request.id}`);
      for (const label of ["Preparing", "Ready for pickup", "Out for delivery", "Fulfilled"]) {
        await expect(page.getByRole("button", { name: label, exact: true })).toBeDisabled();
      }
      await expect(page.getByRole("button", { name: "Unable to fulfil", exact: true })).toHaveCount(
        0,
      );
      await app.goto("/pharmacy/payments");
      const payoutCard = page
        .locator('[data-screen="V13"] .space-y-2')
        .filter({ hasText: payout.transfer_reference });
      await expect(payoutCard.getByText("Processing", { exact: true })).toBeVisible();
      await expect(payoutCard.getByText("₦7,000", { exact: true })).toBeVisible();
    },
  );
}

journey.sad(
  "H3",
  "failed lab checkout retries the same payment and keeps exactly one slot reservation",
  async ({ app, page }) => {
    const requestId = uid("preq_201");
    const orderId = uid("lab_003");
    await app.bootstrap(`/lab/requests/${requestId}`);
    await page.getByRole("button", { name: "Accept", exact: true }).click();
    await app.goto(`/app/lab-orders/${orderId}/labs`);
    await page.getByLabel("Search labs").fill("no-such-lab");
    await expect(page.getByText("No matching labs", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();
    await app.goto(`/app/lab-orders/${orderId}/schedule`);
    const before = await app.rows("providerSlots");
    await page
      .getByRole("button", { name: /^\d{2}:\d{2}/ })
      .first()
      .click();
    await page.getByRole("button", { name: "Confirm secure checkout", exact: true }).click();
    await app.selectScreenState("Simulate payment failure");
    await app.reload();
    await page.getByRole("button", { name: "Retry checkout", exact: true }).click();
    await app.selectScreenState("Simulate payment success");
    await app.reload();
    const payments = (await app.rows("checkoutPayments")).filter(
      (item) => item.provider_request_id === requestId,
    );
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe("PAID");
    const request = (await app.rows("providerRequests")).find((item) => item.id === requestId);
    const slot = (await app.rows("providerSlots")).find((item) => item.id === request.slot_id);
    expect(slot.booked_count).toBe(
      (before.find((item) => item.id === slot.id).booked_count ?? 0) + 1,
    );
    await app.goto(`/app/lab-orders/${orderId}`);
    await expect(
      page.getByRole("link", { name: "Choose a collection time", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("link", { name: "View lab booking", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Confirm secure checkout", exact: true }),
    ).toHaveCount(0);
    expect((await app.rows("providerSlots")).find((item) => item.id === slot.id).booked_count).toBe(
      slot.booked_count,
    );
  },
);

journey.sad(
  "H4",
  "a delayed lab result does not prompt another collection booking",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    const request = (await app.rows("providerRequests")).find(
      (r) =>
        r.provider_type === "LAB" &&
        r.result_status === "DELAYED" &&
        r.patient_identity_id === PATIENTS.self,
    );
    expect(request).toBeTruthy();
    await app.goto(`/app/lab-orders/${request.lab_order_id}`);
    await expect(page.getByRole("link", { name: "View lab request", exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Choose a collection time", exact: true }),
    ).toHaveCount(0);
    await app.goto(`/app/lab-orders/${request.lab_order_id}/schedule`);
    await expect(
      page.getByRole("button", { name: "Confirm secure checkout", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("link", { name: "View result status", exact: true }).click();
    await expect(page.getByText(/reported a delay/).first()).toBeVisible();
  },
);
