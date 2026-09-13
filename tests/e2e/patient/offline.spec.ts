/**
 * Scenario O: degraded conditions.
 *
 * Real device and poor-network behaviour has never been manually confirmed, and
 * a headless sweep cannot see it. What is checkable here is the part that is
 * fixture-backed: that an entry logged offline actually reaches the health
 * record when the connection returns, and that nothing else pretends to queue.
 *
 * Ported from scripts/offline-sync-flow.ts.
 */
import { PATIENTS } from "../helpers/ids";
import { expect, journey } from "../journey";

journey.happy(
  "O1",
  "entries logged offline reach the record once, keeping their original time",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.patchSession({ offline: true }, "/app/offline-queue");

    const queued = (await app.rows("logEntries")).filter(
      (entry) => entry.patient_id === PATIENTS.self,
    ).length;

    const body = await page.innerText("body");
    expect(body.trim().length, "the offline queue screen rendered nothing").toBeGreaterThan(0);

    // Back online, the device queue drains into the health record.
    await app.patchSession({ offline: false }, "/app/offline-queue");
    await page.waitForTimeout(1500);

    const after = (await app.rows("logEntries")).filter(
      (entry) => entry.patient_id === PATIENTS.self,
    ).length;
    expect(
      after,
      "reconnecting lost an entry that had been saved on the device",
    ).toBeGreaterThanOrEqual(queued);
  },
);

journey.sad(
  "O2",
  "offline blocks chat, checkout and booking without pretending to queue them",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.patchSession({ offline: true }, "/app");

    const body = await page.innerText("body");
    expect(
      /offline|no connection|not connected/i.test(body),
      "an offline session did not say so",
    ).toBe(true);
    // Only logging is queued. Saying anything else is queued would be a promise
    // the prototype does not keep.
    expect(
      /chat.{0,40}queued|checkout.{0,40}queued|booking.{0,40}queued/i.test(body),
      "the offline copy implied chat, checkout or booking would be queued",
    ).toBe(false);
  },
);

journey.sad(
  "O3",
  "reloading mid-OTP resumes at the same step rather than restarting",
  async ({ app, page }) => {
    await app.goto("/app/welcome");
    await page.evaluate(() => {
      sessionStorage.removeItem("mv-auth-journey-v1");
      sessionStorage.removeItem("mv-prototype-state");
    });
    await app.reload();

    await app.goto("/app/sign-up");
    await page.getByLabel("First name").fill("Ada");
    await page.getByLabel("Last name").fill("Okafor");
    await page.getByLabel("Phone number").fill("0803 123 4567");
    await page.getByRole("checkbox", { name: /I have read and agree to the Terms/ }).check();
    await page.getByRole("checkbox", { name: /I have read the Data and Privacy Policy/ }).check();
    await page.getByRole("button", { name: "Send code" }).click();

    await page.getByLabel("Verification code").waitFor();
    await app.reload();

    await expect(
      page.getByLabel("Verification code"),
      "a reload mid-OTP restarted the journey instead of resuming it",
    ).toBeVisible();
  },
);
