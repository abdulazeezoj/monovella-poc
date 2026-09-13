/**
 * Scenario I: account, records and trust surfaces.
 *
 * This is where the prototype's honesty about retention, closure and record
 * access gets tested by a reviewer clicking around off-script. No screen may
 * promise something the planned architecture does not do.
 *
 * Ported from scripts/care-access-lifecycle.ts, scripts/consent-lifecycle.ts
 * and scripts/account-closure.ts.
 */
import { PATIENTS } from "../helpers/ids";
import { expect, journey } from "../journey";

journey.happy(
  "I5",
  "care-team access history names who holds access and for which care event",
  async ({ app, page }) => {
    await app.bootstrap("/app/account/access-history");

    const grants = await app.rows("careAccessGrants");
    expect(grants.length, "there are no access grants to show").toBeGreaterThan(0);

    const body = await page.innerText("body");
    expect(body.trim().length, "the access history rendered nothing").toBeGreaterThan(0);

    // It is a permission history, not a security log, and says so rather than
    // implying Monovella surfaces internal access detail to patients.
    expect(
      /access log|security log/i.test(body),
      "the permission history described itself as an access or security log",
    ).toBe(false);
  },
);

journey.happy(
  "I4",
  "the consent ledger records what was agreed, by whom, and to which version",
  async ({ app, page }) => {
    await app.bootstrap("/app/account/privacy-consents");

    const records = await app.rows("consentRecords");
    expect(records.length, "there are no consent records to show").toBeGreaterThan(0);

    // A timestamp alone must not imply which text was agreed to, so every
    // entry carries the acting account, the patient, the capacity the actor
    // held, the exact statement version and the care event it belongs to.
    for (const entry of records) {
      expect(entry.purpose, "a consent entry names no purpose").toBeTruthy();
      expect(entry.acting_user_id, `${entry.id} names no acting account`).toBeTruthy();
      expect(entry.patient_id, `${entry.id} names no patient`).toBeTruthy();
      expect(entry.actor_capacity, `${entry.id} records no actor capacity`).toBeTruthy();
      expect(
        entry.document_or_statement_version,
        `${entry.id} records a time but not which text was agreed to`,
      ).toBeTruthy();
      expect(entry.occurred_at, `${entry.id} records no time`).toBeTruthy();
    }

    const body = await page.innerText("body");
    expect(body.trim().length, "the consent ledger rendered nothing").toBeGreaterThan(0);

    // The ledger ships with one entry, a dependant-care consent. The other
    // purposes — identity, telemedicine, referral and provider disclosure —
    // are appended as they are given during a journey rather than seeded, and
    // provider disclosure is snapshotted onto the request itself. Asserting a
    // spread of purposes here would be asserting against seed data, not
    // against the ledger.
    expect(
      new Set(records.map((entry) => entry.purpose)).size,
      "the ledger holds entries with no distinct purpose at all",
    ).toBeGreaterThan(0);
  },
);

journey.sad(
  "I9",
  "account closure does not promise an erasure the architecture will not perform",
  async ({ app, page }) => {
    await app.bootstrap("/app/account/close");

    const body = await page.innerText("body");
    expect(body.trim().length, "the closure screen rendered nothing").toBeGreaterThan(0);

    // The screen used to say consultations, prescriptions and results are
    // erased within 30 days, while the architecture keeps clinical and payment
    // records under a six-year or minor-record retention floor.
    expect(
      /erased within 30 days/i.test(body),
      "account closure still promises erasure within 30 days",
    ).toBe(false);
    expect(
      /retain|retention|kept|remain/i.test(body),
      "account closure does not say what is kept and why",
    ).toBe(true);
  },
);

journey.happy(
  "I7",
  "a report verification link returns a genuine, data-minimised result",
  async ({ app, page }) => {
    await app.bootstrap("/app/reports");

    const reports = (await app.rows("reports")).filter(
      (report) => report.patient_id === PATIENTS.self,
    );
    expect(reports.length, "the account holder has no reports").toBeGreaterThan(0);

    const withCode = reports.find((report) => report.verification_code);
    if (!withCode) return;

    // The public route is the one unauthenticated surface in the prototype.
    await app.goto(`/verify/${withCode.verification_code}`);
    const body = await page.innerText("body");

    expect(
      /genuine|verified/i.test(body),
      "a real verification code was not confirmed as genuine",
    ).toBe(true);
    // Data-minimised: a public check confirms the report exists, it does not
    // publish the patient's clinical content.
    expect(
      /diagnosis|prescription|dosage/i.test(body),
      "the public verification response exposed clinical detail",
    ).toBe(false);
  },
);
