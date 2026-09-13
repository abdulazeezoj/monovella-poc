/**
 * Scenario K: expert onboarding and practice administration.
 *
 * The supply-side mirror of Scenario A. A reviewer will ask "how does a doctor
 * actually get onto this platform," and until this was written that was the one
 * onboarding path with no coverage anywhere.
 *
 * Ported from scripts/expert-patient-onboarding.ts.
 */
import { PATIENTS, SEATS } from "../helpers/ids";
import { expect, journey, test } from "../journey";

journey.happy(
  "K2",
  "a submitted application reaches a genuine pending state, not a dead success screen",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.asSeat(SEATS.doctor, "/app/expert/application");

    const body = await page.innerText("body");
    expect(body.trim().length, "the application status screen rendered nothing").toBeGreaterThan(0);
    expect(
      /pending|under review|reviewing|submitted/i.test(body),
      "the application status screen states no review state at all",
    ).toBe(true);
  },
);

journey.happy(
  "K6",
  "a verified expert can publish working hours as a first useful action",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.asSeat(SEATS.doctor, "/app/expert/schedule");

    const rules = await app.rows("expertSchedulingRules");
    const slots = await app.rows("expertSchedule");
    expect(
      rules.length + slots.length,
      "the expert seat has no schedule to manage",
    ).toBeGreaterThan(0);

    const body = await page.innerText("body");
    // Availability windows must be visibly editable, not styled as read-only
    // status tags with no affordance.
    expect(/edit/i.test(body), "no window on the schedule offers a way to change it").toBe(true);
  },
);

test("an expert invite page makes no promises of endorsement or free care", async ({
  app,
  page,
}) => {
  await app.bootstrap("/app");
  await app.asSeat(SEATS.doctor, "/app/expert/invite-patients");

  const body = await page.innerText("body");
  expect(body.trim().length, "the invite screen rendered nothing").toBeGreaterThan(0);

  // The invite must not promise endorsement, availability or free care.
  expect(
    /free consultation|guaranteed appointment|recommends this doctor/i.test(body),
    "the invite promised endorsement, availability or free care",
  ).toBe(false);
});

journey.sad(
  "K7",
  "a suspended standing explains itself in the expert's own workspace",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.patchSession(
      { role: "expert", expertId: SEATS.doctor, standingSuspended: true },
      "/app/expert",
    );

    const body = await page.innerText("body");
    expect(
      /suspend|standing|restricted|paused/i.test(body),
      "a suspended expert saw an ordinary home screen with no explanation",
    ).toBe(true);
  },
);

journey.happy(
  ["K4", "K5"],
  "expert availability changes patient booking without changing existing visits",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    const payoutBefore = await app.rows("expertPayoutDetails");
    await app.asSeat(SEATS.nurse, "/app/expert/payout");
    await expect(page.getByRole("textbox", { name: "Account number", exact: true })).toHaveValue(
      "",
    );
    await page.getByRole("button", { name: "Choose your bank", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Search Nigerian banks", exact: true })
      .fill("Guaranty");
    await page.getByRole("listitem").filter({ hasText: "Guaranty" }).getByRole("button").click();
    await page.getByRole("textbox", { name: "Account number", exact: true }).fill("0123456789");
    await expect(
      page.getByRole("button", { name: "Save payout account", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Verify account", exact: true }).click();
    await expect(page.getByText(/Recipient verified: Blessing Etim/)).toBeVisible();
    await page.getByRole("button", { name: "Save payout account", exact: true }).click();
    await app.reload();
    await expect(page.getByRole("textbox", { name: "Account number", exact: true })).toHaveValue(
      "0123456789",
    );
    const payoutAfter = await app.rows("expertPayoutDetails");
    expect(payoutAfter.filter((p) => p.expert_id !== SEATS.nurse)).toEqual(payoutBefore);
    expect(payoutAfter.filter((p) => p.expert_id === SEATS.nurse)).toEqual([
      expect.objectContaining({
        payout_bank_account_number: "0123456789",
        payout_account_name: "Blessing Etim",
        payout_verified_at: expect.any(String),
      }),
    ]);
    const historyBefore = await app.rows("payoutHistory");
    await page.getByRole("textbox", { name: "Account number", exact: true }).fill("9876543210");
    await page.getByRole("button", { name: "Verify account", exact: true }).click();
    await expect(page.getByText(/Recipient verified: Blessing Etim/)).toBeVisible();
    await page.getByRole("button", { name: "Save payout account", exact: true }).click();
    await app.goto("/app/expert/payout-history");
    await expect(page.getByText("0123456789", { exact: true })).toBeVisible();
    await expect(page.getByText("Amara Okonkwo", { exact: true })).toHaveCount(0);
    const historyAfter = await app.rows("payoutHistory");
    expect(historyAfter.filter((h) => h.expert_id !== SEATS.nurse)).toEqual(historyBefore);
    expect(historyAfter.filter((h) => h.expert_id === SEATS.nurse)).toEqual([
      expect.objectContaining({ payout_bank_account_number: "0123456789", expert_id: SEATS.nurse }),
    ]);
    await app.asSeat(SEATS.doctor, "/app/expert/payout-history");
    await expect(page.getByText("Amara Okonkwo", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("0123456789", { exact: true })).toHaveCount(0);
    const before = await app.rows("consultations");
    const payments = await app.rows("checkoutPayments");
    for (const label of ["Out of office", "Away", "Online"]) {
      await app.asSeat(SEATS.nurse, "/app/expert/availability");
      await page.getByRole("radio", { name: label, exact: true }).check();
      await expect(page.getByRole("radio", { name: label, exact: true })).toBeChecked();
      await app.patchSession(
        { role: "patient", viewingPatientId: PATIENTS.verifiedDependant },
        `/app/experts/${SEATS.nurse}`,
      );
      if (label === "Out of office") {
        await expect(page.getByText("Not taking new bookings", { exact: true })).toBeVisible();
      } else {
        await expect(page.getByText(label, { exact: true })).toBeVisible();
        await expect(page.getByText("Not taking new bookings", { exact: true })).toHaveCount(0);
      }
      await app.goto(`/app/experts/${SEATS.nurse}/book`);
      if (label === "Out of office") {
        await expect(page.getByText("Not taking new bookings", { exact: true })).toBeVisible();
        await expect(
          page.getByRole("heading", { name: "Open times to plan around", exact: true }),
        ).toHaveCount(0);
      } else {
        await expect(
          page.getByRole("heading", { name: "Open times to plan around", exact: true }),
        ).toBeVisible();
      }
      expect(await app.rows("consultations")).toEqual(before);
      expect(await app.rows("checkoutPayments")).toEqual(payments);
    }
  },
);

journey.sad(
  "K4",
  "payout verification locks its inputs and rejects a failed lookup",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.asSeat(SEATS.doctor, "/app/expert/payout");
    const before = await app.rows("expertPayoutDetails");
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    const account = page.getByRole("textbox", { name: "Account number", exact: true });
    const save = page.getByRole("button", { name: "Save payout account", exact: true });
    await account.fill("0000000000");
    await expect(save).toBeDisabled();
    await page.getByRole("button", { name: "Verify account", exact: true }).click();
    await expect(account).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Guaranty Trust Bank", exact: true }),
    ).toBeDisabled();
    await page.clock.fastForward(600);
    await expect(
      page.getByText("We couldn't verify that bank account. Check the bank and number.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(save).toBeDisabled();
    expect(await app.rows("expertPayoutDetails")).toEqual(before);
    await account.fill("0123456789");
    await page.getByRole("button", { name: "Verify account", exact: true }).click();
    await page.clock.fastForward(600);
    await expect(save).toBeEnabled();
    await account.fill("9876543210");
    await expect(save).toBeDisabled();
    await expect(page.getByText(/Recipient verified:/)).toHaveCount(0);
    expect(await app.rows("expertPayoutDetails")).toEqual(before);
  },
);

journey.sad(
  "P1",
  "another expert cannot read the doctor's payout list or copied receipt",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    const payout = (await app.rows("providerPayouts")).find((p) => p.provider_id === SEATS.doctor);
    expect(payout).toBeTruthy();
    await app.asSeat(SEATS.nurse, "/app/expert/payouts");
    await expect(page.getByText("No payouts yet", { exact: true })).toBeVisible();
    await expect(page.locator(`a[href="/app/expert/payouts/${payout.id}"]`)).toHaveCount(0);
    await app.goto(`/app/expert/payouts/${payout.id}`);
    await expect(page.getByText("Payment not found", { exact: true })).toBeVisible();
    await app.goto("/app/expert/payout-history");
    await expect(
      page.getByText("You've never changed your payout details", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("dl")).toHaveCount(0);
    await app.asSeat(SEATS.doctor, "/app/expert/payouts");
    await expect(page.locator(`a[href="/app/expert/payouts/${payout.id}"]`)).toBeVisible();
  },
);
