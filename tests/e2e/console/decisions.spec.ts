/**
 * Scenario N: the back-office control room.
 *
 * Ported from the staffDecision section of scripts/e2e-flows.ts, with the
 * refund identifier resolved through uid(). The console's own 409 state and the
 * governance lifecycles it drives are covered in governance.spec.ts and in
 * tests/integration/governance-lifecycle.test.ts.
 *
 * This is the scenario that proves Monovella is not just an app: a queue that
 * actually moves, on a staff account, with the patient-facing state following.
 */
import { uid } from "../helpers/ids";
import { expect, journey } from "../journey";

const REFUND = uid("rfd_003");

journey.happy(
  "N7",
  "a staff refund decision is recorded and leaves the queue",
  async ({ app, page }) => {
    await app.bootstrap(`/console/refunds/${REFUND}`);
    await page.locator('[data-screen="B15"]').waitFor();

    await page.getByRole("button", { name: "Decide", exact: true }).click();
    await page
      .getByLabel("Your reasoning")
      .fill("The verified cancellation meets the refund policy.");
    await page.getByRole("button", { name: "Record the decision", exact: true }).click();
    await page.waitForURL("**/console/refunds");

    const state = await app.state();
    const refund = (state.data?.refundRequests ?? []).find((item) => item.id === REFUND);
    expect(
      [refund?.decision_final, refund?.refund_issued],
      "the staff decision was not saved",
    ).toEqual([true, true]);
    expect(
      (state.data?.refundQueue ?? []).some((item) => item.id === REFUND),
      "the decision did not remove the request from the refund queue",
    ).toBe(false);
  },
);

journey.happy("N1", "console home shows real queue counts, not zeros", async ({ app, page }) => {
  await app.bootstrap("/console/home");

  const body = await page.innerText("body");
  expect(/\d/.test(body), "the console home showed no counts at all").toBe(true);

  const state = await app.state();
  const queued =
    (state.data?.refundQueue?.length ?? 0) +
    (state.data?.applicationsQueue?.length ?? 0) +
    (state.data?.standingQueue?.length ?? 0) +
    (state.data?.disputeQueue?.length ?? 0);
  expect(queued, "every staff queue is empty, so the console demonstrates nothing").toBeGreaterThan(
    0,
  );
});
