/**
 * Scenario E: guardian care, patient isolation and independence.
 *
 * Ported from the guardianPatientIsolation section of scripts/e2e-flows.ts.
 * Every patient, report and expert identifier here now goes through uid(); the
 * script compared against generator slugs, so after the fixtures moved to UUIDs
 * its isolation assertions were comparing a UUID against "pat_kelechi" and
 * passing because nothing ever matched.
 *
 * Patient-context leakage was a Critical item. Writing a symptom, a
 * prescription or a consent onto the wrong person is the failure this guards.
 */
import { PATIENTS, uid } from "../helpers/ids";
import { expect, journey } from "../journey";

const EXPERT = uid("exp_nwosu");

journey.happy(
  ["E2", "E3"],
  "a booking made for a dependant stays attached to that dependant",
  async ({ app, page }) => {
    await app.bootstrap("/app");

    await page.getByRole("button", { name: "Patient", exact: true }).click();
    await page.getByRole("button", { name: /Kelechi Okonkwo/ }).click();
    await page.waitForFunction(
      (id) =>
        JSON.parse(sessionStorage.getItem("mv-prototype-state") ?? "{}").session
          ?.viewingPatientId === id,
      PATIENTS.verifiedDependant,
    );

    const before = await app.state();
    const existing = new Set((before.data?.consultations ?? []).map((item) => item.id));

    await app.goto(`/app/experts/${EXPERT}/book`);
    // Record screens state whose care this is; they no longer offer to change
    // it, so the assertion is on the statement, not on a control.
    await page.getByText("Care for Kelechi", { exact: false }).first().waitFor();

    await page
      .getByLabel("What do you want help with?")
      .fill("Recurring headaches that make it difficult for Kelechi to work.");
    await page.getByRole("button", { name: "07:00-07:45", exact: true }).first().click();
    await page.getByRole("button", { name: "Continue to secure checkout", exact: true }).click();
    await page.waitForURL(/\/app\/consultations\/[^/]+\/booking$/);
    await page.getByRole("heading", { name: "Kelechi's booking", exact: true }).waitFor();

    const after = await app.state();
    const created = (after.data?.consultations ?? []).find((item) => !existing.has(item.id));
    expect(
      created?.patient_identity_id,
      "the guardian booking did not retain the selected dependant",
    ).toBe(PATIENTS.verifiedDependant);
    expect(
      (after.data?.checkoutPayments ?? []).some(
        (payment) => payment.consultation_id === created.id,
      ),
      "the checkout was not linked to the dependant's consultation",
    ).toBe(true);
  },
);

journey.sad(
  ["E5", "E6"],
  "switching to another dependant leaks no loop or report",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.asPatient(PATIENTS.verifiedDependant);

    // Switching patient is a Home action, so the journey goes through Home
    // exactly as a person would.
    await app.goto("/app");
    await page.getByRole("button", { name: /^Kelechi/ }).click();
    await page.getByRole("button", { name: /Tobi Okonkwo/ }).click();
    await page.waitForURL("**/app");

    await page.getByText("Tobi's Monovella ID isn't verified yet", { exact: true }).waitFor();
    expect(
      await page.getByText("Zainab's Monovella ID is still provisional", { exact: true }).count(),
      "an account-level guardian prompt leaked into the dependant's context",
    ).toBe(0);

    await app.goto("/app/reports");
    await page.locator('[data-screen="P63"]').waitFor();
    const tobi = await page.locator(`a[href="/app/reports/${uid("rep_tobi_001")}"]`).count();
    const kelechi = await page.locator(`a[href="/app/reports/${uid("rep_kelechi_001")}"]`).count();
    expect([tobi, kelechi], "the report list crossed the active patient boundary").toEqual([1, 0]);
  },
);

journey.happy(
  "E8",
  "claiming independence moves the record and ends the guardian relationship",
  async ({ app, page }) => {
    await app.bootstrap("/app/claim");

    await page.getByLabel("First name").fill("Kelechi");
    await page.getByLabel("Last name").fill("Okonkwo");
    await page.getByLabel("Date of birth").fill("2001-11-09");
    await page.getByLabel("National Identity Number (NIN)").fill("12345678901");
    await page.getByRole("button", { name: "Claim this record", exact: true }).click();
    await page.getByText(/former guardian can no longer open or change it/).waitFor();

    const claimed = ((await app.state()).data?.patients ?? []).find(
      (patient) => patient.id === PATIENTS.verifiedDependant,
    );
    expect(
      [claimed?.is_dependant, claimed?.guardian_user_id, claimed?.guardian_reason],
      "the independent claim did not clear the former guardian relationship",
    ).toEqual([false, null, null]);

    // A success toast is not an ownership transfer. The former guardian has to
    // actually lose the route.
    await app.goto(`/app/dependants/${PATIENTS.verifiedDependant}`);
    await page.getByRole("heading", { name: "Dependant not found", exact: true }).waitFor();
  },
);
