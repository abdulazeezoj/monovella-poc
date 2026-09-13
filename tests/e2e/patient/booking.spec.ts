/**
 * Scenario C: the patient books, pays and reaches a live response deadline.
 *
 * Ported from scripts/booking-flow.ts. The assertions are the same; the expert
 * is named through uid() rather than by the generator slug the script compared
 * against, which after the fixtures moved to UUIDs matched no row at all — so
 * every run failed at "no future fixture slot was available".
 *
 * Two of these checks exist because the bug they describe actually shipped: a
 * booking that arrived at P40 with its response deadline already expired, and a
 * mutation that wrote the host computer's date into the frozen demo timeline.
 */
import { uid } from "../helpers/ids";
import { expect, journey, test } from "../journey";

const EXPERT = uid("exp_nwosu");
const ANCHOR_DATE = "2026-08-29";

const CONFIRMED_SUMMARY =
  "Recurring headaches after lunch are making it difficult to finish the workday.";

/** Fixture timestamps are naive UTC (PRODUCT_ARCH_V0.md section 3). */
function utcMs(iso: string) {
  return Date.parse(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`);
}

interface Slot {
  expert_id: string;
  taken: boolean;
  start: string;
  end: string;
}

journey.happy(
  ["C6", "C9"],
  "booking keeps the chosen slot and opens a live 15-minute response window",
  async ({ app, page }) => {
    await app.bootstrap(`/app/experts/${EXPERT}/book`);

    const before = await app.state();
    const existingIds = new Set(
      (before.data?.consultations ?? []).map((consultation) => consultation.id),
    );
    const slots = (before.data?.expertAvailability ?? []) as Slot[];
    const slot = slots
      .filter((candidate) => candidate.expert_id === EXPERT && !candidate.taken)
      .sort((left, right) => left.start.localeCompare(right.start))[0];
    expect(slot, "no open fixture slot for the booking journey").toBeTruthy();

    const label = `${slot.start.slice(11, 16)}-${slot.end.slice(11, 16)}`;
    await page.getByRole("button", { name: label, exact: true }).first().click();

    const checkout = page.getByRole("button", {
      name: "Continue to secure checkout",
      exact: true,
    });
    await page.getByLabel("What do you want help with?").fill(CONFIRMED_SUMMARY);
    await expect(checkout, "a valid confirmed summary did not enable checkout").toBeEnabled();
    await checkout.click();
    await page.waitForURL(/\/app\/consultations\/[^/]+\/booking$/);

    const p40 = page.locator('[data-screen="P40"]');
    await p40.waitFor();

    const bookingId = new URL(page.url()).pathname.split("/")[3];
    const after = await app.state();
    const consultation = (after.data?.consultations ?? []).find((item) => item.id === bookingId);

    expect(consultation, "checkout created no consultation for P40").toBeTruthy();
    expect(
      consultation.request_summary,
      "the consultation did not retain the exact confirmed summary",
    ).toBe(CONFIRMED_SUMMARY);
    expect(
      (after.data?.consultations ?? []).filter((item) => !existingIds.has(item.id)).length,
      "the booking action created more than one consultation",
    ).toBe(1);
    expect(
      [consultation.scheduled_start, consultation.scheduled_end],
      "P40 did not retain the selected future slot",
    ).toEqual([slot.start, slot.end]);
    expect(
      utcMs(consultation.respond_by) - utcMs(consultation.requested_at),
      "the response deadline was not 15 minutes after the request",
    ).toBe(15 * 60_000);
    expect(
      consultation.requested_at.startsWith(`${ANCHOR_DATE}T`),
      `the booking used the host clock instead of the ${ANCHOR_DATE} demo timeline`,
    ).toBe(true);

    // A deadline derived from a naive fixture timestamp reparsed in local time
    // arrives already expired. This is the assertion that catches that.
    const countdown = (await p40.locator(".font-mono.text-data.tabular").innerText()).trim();
    const parts = countdown.match(/^(\d{1,2}):(\d{2})$/);
    expect(parts, `P40 showed no countdown. Received: ${countdown || "nothing"}`).toBeTruthy();
    if (!parts) return;
    const remaining = Number(parts[1]) * 60 + Number(parts[2]);
    expect(remaining, `P40 showed an expired countdown: ${countdown}`).toBeGreaterThan(0);
  },
);

journey.sad(
  "C6",
  "checkout stays blocked until the patient confirms a usable summary",
  async ({ app, page }) => {
    await app.bootstrap(`/app/experts/${EXPERT}/book`);

    const slots = ((await app.state()).data?.expertAvailability ?? []) as Slot[];
    const slot = slots
      .filter((candidate) => candidate.expert_id === EXPERT && !candidate.taken)
      .sort((left, right) => left.start.localeCompare(right.start))[0];
    expect(slot, "no open fixture slot for the booking journey").toBeTruthy();

    const label = `${slot.start.slice(11, 16)}-${slot.end.slice(11, 16)}`;
    await page.getByRole("button", { name: label, exact: true }).first().click();

    const checkout = page.getByRole("button", {
      name: "Continue to secure checkout",
      exact: true,
    });
    await expect(
      checkout,
      "a direct booking route allowed checkout with no patient-confirmed summary",
    ).toBeDisabled();

    const summary = page.getByLabel("What do you want help with?");

    await summary.fill("Too short");
    await page
      .getByText("Add a little more detail so the expert can review the request.")
      .waitFor();
    await expect(checkout, "a minimal summary enabled checkout").toBeDisabled();

    const oversized = "x".repeat(1001);
    await summary.fill(oversized);
    await page.getByText(/Keep this summary within 1,000 characters/).waitFor();
    expect(
      await summary.inputValue(),
      "the oversized-summary error discarded the words the patient had typed",
    ).toBe(oversized);
    await expect(checkout, "an oversized summary enabled checkout").toBeDisabled();
  },
);

journey.sad(
  "C10",
  "the confirmed summary is not visible to an expert who was never asked",
  async ({ app, page }) => {
    await app.bootstrap(`/app/experts/${EXPERT}/book`);

    const slots = ((await app.state()).data?.expertAvailability ?? []) as Slot[];
    const slot = slots
      .filter((candidate) => candidate.expert_id === EXPERT && !candidate.taken)
      .sort((left, right) => left.start.localeCompare(right.start))[0];
    const label = `${slot.start.slice(11, 16)}-${slot.end.slice(11, 16)}`;
    await page.getByRole("button", { name: label, exact: true }).first().click();
    await page.getByLabel("What do you want help with?").fill(CONFIRMED_SUMMARY);
    await page.getByRole("button", { name: "Continue to secure checkout", exact: true }).click();
    await page.waitForURL(/\/app\/consultations\/[^/]+\/booking$/);

    const bookingId = new URL(page.url()).pathname.split("/")[3];

    // The reviewer's own expert seat is not the expert this was booked with, so
    // the workspace must fail closed rather than render someone else's case.
    await app.patchSession({ role: "expert" });
    await app.goto(`/app/expert/consultations/${bookingId}`);

    await page.getByRole("heading", { name: "Consultation not found", exact: true }).waitFor();
    expect(
      await page.getByText(CONFIRMED_SUMMARY, { exact: true }).count(),
      "the patient-confirmed summary was exposed to an unrelated expert",
    ).toBe(0);
  },
);

test.describe("demo reset", () => {
  journey.happy(
    "C13",
    "resetting the demo returns a created booking to the anchor fixtures",
    async ({ app, page }) => {
      await app.bootstrap(`/app/experts/${EXPERT}/book`);

      const slots = ((await app.state()).data?.expertAvailability ?? []) as Slot[];
      const slot = slots
        .filter((candidate) => candidate.expert_id === EXPERT && !candidate.taken)
        .sort((left, right) => left.start.localeCompare(right.start))[0];
      const label = `${slot.start.slice(11, 16)}-${slot.end.slice(11, 16)}`;
      await page.getByRole("button", { name: label, exact: true }).first().click();
      await page.getByLabel("What do you want help with?").fill(CONFIRMED_SUMMARY);
      await page.getByRole("button", { name: "Continue to secure checkout", exact: true }).click();
      await page.waitForURL(/\/app\/consultations\/[^/]+\/booking$/);
      const bookingId = new URL(page.url()).pathname.split("/")[3];

      await page.getByRole("button", { name: "Show prototype controls", exact: true }).click();
      await page.getByRole("button", { name: "Reset the demo data", exact: true }).click();

      await page.waitForFunction((createdId) => {
        const raw = sessionStorage.getItem("mv-prototype-state");
        if (!raw) return true;
        const state = JSON.parse(raw);
        return !state.data?.consultations?.some((item: { id: string }) => item.id === createdId);
      }, bookingId);
    },
  );
});
