/**
 * Scenario P: the adversarial pass.
 *
 * Every other scenario proves one persona's honest path works. This one exists
 * because a reviewer stress-testing a health platform will not stay on the
 * honest path, and PRODUCT_SCREEN_V0.md's standing design brief promises this
 * behaviour by name.
 *
 * Assertions gathered from the fail-closed halves of scripts/first-run-flow.ts,
 * scripts/e2e-flows.ts and scripts/care-access-lifecycle.ts.
 */
import { COUNTERPARTY_EXPERT, PATIENTS, SEATS, uid } from "../helpers/ids";
import { expect, journey } from "../journey";

journey.sad(
  "P5",
  "an expert cannot be booked to treat their own account's patient identity",
  async ({ app, page }) => {
    await app.bootstrap("/app/experts");

    // Patient and Expert are one account with a switchable context, so the
    // directory could offer a consultation with yourself. Hiding the row is not
    // enough: the profile and booking routes have to refuse it too.
    const listed = await page
      .locator("li a[href^='/app/experts/']")
      .evaluateAll((els) => els.map((el) => el.getAttribute("href") ?? ""));
    expect(
      listed.some((href) => href.includes(SEATS.doctor)),
      "the directory listed the account holder's own expert identity",
    ).toBe(false);

    for (const path of [`/app/experts/${SEATS.doctor}`, `/app/experts/${SEATS.doctor}/book`]) {
      await app.goto(path);
      await page.getByRole("heading", { name: "This is your own practice" }).waitFor();
    }
  },
);

journey.sad(
  "P1",
  "a copied consultation URL does not open under the wrong patient context",
  async ({ app, page }) => {
    await app.bootstrap("/app");

    const consultations = await app.rows("consultations");
    const amaras = consultations.find(
      (consultation) => consultation.patient_identity_id === PATIENTS.self,
    );
    expect(amaras, "no consultation belongs to the account holder").toBeTruthy();

    // Switch to a dependant, then reach for the account holder's own record.
    await app.asPatient(PATIENTS.provisionalMinor);
    await app.goto(`/app/consultations/${amaras.id}`);

    const body = await page.innerText("body");
    expect(
      /not found|no longer available|cannot be shown|unavailable/i.test(body),
      "a dependant context opened the account holder's consultation",
    ).toBe(true);
  },
);

journey.sad(
  "P1",
  "an unknown identifier shows the not-found state rather than another record",
  async ({ app, page }) => {
    await app.bootstrap("/app");

    // /verify/:code used to fall back to the first report fixture and default
    // to a valid verdict, which described a made-up code as a genuine one.
    await app.goto("/verify/NOT-A-REAL-CODE");
    const verify = await page.innerText("body");
    expect(
      /verified|genuine|authentic/i.test(verify) && !/not|unknown|no record/i.test(verify),
      "an unknown verification code was described as genuine",
    ).toBe(false);

    const unknownId = uid("definitely_not_a_real_record");
    for (const path of [
      `/app/consultations/${unknownId}`,
      `/app/refunds/${unknownId}`,
      `/app/prescriptions/${unknownId}`,
    ]) {
      await app.goto(path);
      const body = await page.innerText("body");
      expect(
        /not found|no longer available|unavailable|cannot be shown/i.test(body),
        `${path} did not fail closed on an unknown identifier`,
      ).toBe(true);
    }
  },
);

journey.sad(
  "P4",
  "knowing a directory expert's identifier does not open their workspace",
  async ({ app, page }) => {
    await app.bootstrap("/app");

    // The reviewer's own seat is exp_adeyemi. A counterparty expert's own
    // surfaces must not open just because their id is known.
    await app.patchSession({ role: "expert", expertId: SEATS.doctor });
    await app.goto(`/app/expert/consultations/${COUNTERPARTY_EXPERT}`);

    const body = await page.innerText("body");
    expect(
      /not found|no longer available|unavailable|cannot be shown/i.test(body),
      "a known identifier opened a record the seat has no relationship to",
    ).toBe(true);
  },
);
