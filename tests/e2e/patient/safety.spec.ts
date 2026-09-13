/**
 * Scenario F: emergency language must never route to booking.
 *
 * Ported from the intake and Teni sections of scripts/e2e-flows.ts. The expert
 * route now names the seat through uid(); the script used the generator slug,
 * which after the fixtures moved to UUIDs opened a not-found page, so the
 * "emergency did not create a booking" assertions were passing against a screen
 * that could not have created one anyway.
 *
 * This is a patient-safety path. A silent fallthrough to ordinary specialty
 * matching is a blocker, not a UX nit.
 */
import { isPossibleEmergency } from "../../../app/lib/emergency";
import { uid } from "../helpers/ids";
import { expect, journey } from "../journey";

const EXPERT = uid("exp_nwosu");

journey.happy(
  "F5",
  "emergency detection survives spelling, punctuation and casing variants",
  async () => {
    for (const phrase of [
      "I can't breathe",
      "I cannot breathe.",
      "Difficulty breathing",
      "CHEST-PAIN!!!",
      "Bleeding won’t stop",
      "She has collapsed",
      "Sudden one-sided weakness",
    ]) {
      expect(isPossibleEmergency(phrase), `emergency variant missed: ${phrase}`).toBe(true);
    }

    expect(
      isPossibleEmergency("My phone battery collapsed yesterday."),
      "a non-clinical use of collapsed was treated as an emergency",
    ).toBe(false);
  },
);

journey.happy(
  "F2",
  "a typed complaint reaches final booking review unchanged",
  async ({ app, page }) => {
    await app.bootstrap("/app/find");

    const summary = "Dark patches on my cheeks got worse after a cream.";
    await page.getByLabel("In your own words").fill(summary);
    await page.getByRole("button", { name: "Find specialist" }).click();
    await page.getByText("Matched to").waitFor();

    // The complaint text is carried in a patient-scoped draft, never in the
    // directory URL.
    await page.waitForFunction(
      (expected) =>
        JSON.parse(sessionStorage.getItem("mv-prototype-state") ?? "{}").bookingDraft
          ?.requestSummary === expected,
      summary,
    );

    await app.goto(`/app/experts/${EXPERT}/book`);
    expect(
      await page.getByLabel("What do you want help with?").inputValue(),
      "typed intake did not reach final booking review unchanged",
    ).toBe(summary);
  },
);

journey.happy(
  "F2",
  "a corrected voice transcript is what gets classified, not the raw guess",
  async ({ app, page }) => {
    await app.bootstrap("/app/find");

    await page.getByRole("radio", { name: "Say it", exact: true }).click();
    await page.getByRole("button", { name: "Stop", exact: true }).click();

    const transcript = page.getByLabel("In your own words");
    await transcript.waitFor();
    expect(
      (await transcript.inputValue()).includes("dark patches"),
      "the visible voice transcript was not real state",
    ).toBe(true);

    const corrected = "A painful skin rash has spread across both arms.";
    await transcript.fill(corrected);
    await page.getByRole("button", { name: "Find specialist" }).click();

    await page.waitForFunction((expected) => {
      const draft = JSON.parse(sessionStorage.getItem("mv-prototype-state") ?? "{}").bookingDraft;
      return draft?.requestSummary === expected && draft?.source === "VOICE";
    }, corrected);
  },
);

journey.sad("F1", "emergency intake interrupts booking entirely", async ({ app, page }) => {
  await app.bootstrap("/app/find");

  await page.getByLabel("In your own words").fill("I can’t breathe!");
  await page.getByRole("button", { name: "Find specialist" }).click();
  await page.getByRole("heading", { name: "Get help in person now" }).waitFor();

  expect(
    (await app.state()).bookingDraft,
    "emergency intake created a routine booking draft",
  ).toBeFalsy();
  expect(
    await page.getByText(/See dermatologists|See GPs/).count(),
    "emergency intake still offered online booking",
  ).toBe(0);
});

journey.sad(
  "F3",
  "emergency language typed at final review creates no consultation or checkout",
  async ({ app, page }) => {
    await app.bootstrap(`/app/experts/${EXPERT}/book`);

    const before = await app.state();
    const consultationsBefore = before.data?.consultations?.length ?? 0;
    const checkoutsBefore = before.data?.checkoutPayments?.length ?? 0;

    await page.getByLabel("What do you want help with?").fill("CHEST-PAIN!!!");
    await page.getByRole("button", { name: "07:00-07:45", exact: true }).first().click();
    await page.getByRole("button", { name: "Continue to secure checkout", exact: true }).click();
    await page.getByRole("heading", { name: "Get help in person now" }).waitFor();

    const after = await app.state();
    expect(
      [after.data?.consultations?.length, after.data?.checkoutPayments?.length],
      "the final emergency review created a consultation or a checkout",
    ).toEqual([consultationsBefore, checkoutsBefore]);
  },
);

journey.sad(
  "F4",
  "throttled specialty matching preserves the complaint and still interrupts an emergency",
  async ({ app, page }) => {
    await app.bootstrap("/app/find");
    const words = page.getByLabel("In your own words");
    await words.fill("A skin rash has been bothering me.");
    await app.selectScreenState("429 too many attempts");
    await page.getByRole("button", { name: "Find specialist", exact: true }).click();
    await expect(page.getByText(/Specialty matching is temporarily busy/)).toBeVisible();
    await expect(words).toHaveValue("A skin rash has been bothering me.");
    await expect(page.getByText("Matched to", { exact: true })).toHaveCount(0);
    await words.fill("I cannot breathe.");
    await page.getByRole("button", { name: "Find specialist", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Get help in person now", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "All specialists", exact: true })).toHaveCount(0);
    expect((await app.state()).bookingDraft).toBeNull();
  },
);

journey.happy(
  "F4",
  "a throttled voice transcript remains editable when matching becomes available again",
  async ({ app, page }) => {
    await app.bootstrap("/app/find");
    await page.getByRole("radio", { name: "Say it", exact: true }).click();
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    const words = page.getByLabel("In your own words");
    await words.fill("A skin rash has been bothering me.");
    await page.clock.install();
    await app.selectScreenState("429 too many attempts");
    await page.clock.fastForward(30_001);
    await expect(words).toHaveValue("A skin rash has been bothering me.");
    await page.getByRole("button", { name: "Find specialist", exact: true }).click();
    await expect(page.getByText("Matched to", { exact: true })).toBeVisible();
    expect((await app.state()).bookingDraft?.source).toBe("VOICE");
  },
);
