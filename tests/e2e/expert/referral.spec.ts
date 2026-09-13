/**
 * Scenario G: referral and guest-expert money paths, from both sides.
 *
 * Two checkouts on one consultation is the highest-risk area for a demo, so the
 * assertions here are mostly about keeping them apart: a guest payment that
 * reverses only itself, receipts that are separately identifiable, and a
 * declined referral that charges nothing.
 *
 * Ported from scripts/referral-flow.ts and
 * scripts/referred-guest-checkout-flow.ts. `con_012` is the guardian-care fixture case
 * where the guest invite is already REQUESTED for the seat a reviewer can
 * occupy, which is what makes the guest half performable at all.
 */
import type { ExpertCredential } from "../../../app/data/types";
import { PATIENTS, SEATS, uid } from "../helpers/ids";
import { expect, journey } from "../journey";

const GUEST_CASE = uid("con_012");

journey.happy(
  "G4",
  "a pending guest invite is visible to the patient without clinical detail",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.patchSession(
      { viewingPatientId: PATIENTS.provisionalMinor },
      `/app/consultations/${GUEST_CASE}`,
    );

    const consultation = (await app.rows("consultations")).find((item) => item.id === GUEST_CASE);
    expect(consultation, "the guest fixture consultation is missing").toBeTruthy();
    expect(
      consultation.guest_expert_id,
      "no guest expert is invited on the guest fixture case",
    ).toBeTruthy();

    expect(consultation.guest_examination_status).toBe("REQUESTED");
    await expect(
      page.getByText(/has been invited to examine you in person. Waiting for their response/),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Review fee", exact: true })).toHaveCount(0);
  },
);

journey.happy(
  "G5",
  "the invited seat sees the guest examination request in its own queue",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.asSeat(SEATS.doctor, "/app/expert/guest-examinations");

    const invited = (await app.rows("consultations")).filter(
      (item) => item.guest_expert_id === SEATS.doctor,
    );
    expect(
      invited.length,
      "the seat a reviewer occupies has no guest examination to work",
    ).toBeGreaterThan(0);

    const care = invited.find((item) => item.id === GUEST_CASE);
    expect(care).toBeTruthy();
    const invite = page.getByRole("listitem").filter({ hasText: care.guest_examination_reason });
    await expect(invite.getByRole("button", { name: "Accept", exact: true })).toBeEnabled();
    await expect(invite.getByRole("button", { name: "Decline", exact: true })).toBeEnabled();
    await expect(invite.getByText("Your examination fee", { exact: true })).toBeVisible();
  },
);

journey.sad(
  "G11",
  "guest work is expert-context only and fails closed in a patient session",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    // Explicitly a patient-context session reaching for an expert surface.
    await app.patchSession({ role: "patient" }, "/app/expert/guest-examinations");

    await expect(page.getByText("Switch to your expert workspace", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept", exact: true })).toHaveCount(0);
    await app.goto(`/app/expert/guest-examinations/${GUEST_CASE}`);
    await expect(page.getByText("Request not found", { exact: true })).toBeVisible();
    await app.patchSession(
      { role: "expert", expertId: SEATS.doctor, standingSuspended: true },
      "/app/expert/guest-examinations",
    );
    await expect(page.getByText("Guest requests unavailable", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Accept", exact: true })).toHaveCount(0);
    await app.goto(`/app/expert/guest-examinations/${GUEST_CASE}`);
    await expect(page.getByText("Guest examination unavailable", { exact: true })).toBeVisible();
    expect(
      (await app.rows("consultations")).find((item) => item.id === GUEST_CASE)
        .guest_examination_status,
    ).toBe("REQUESTED");
  },
);

journey.sad(
  "G3",
  "declining a referral creates no charge and leaves the original consultation alone",
  async ({ app, page }) => {
    await app.bootstrap("/app");

    const referred = (await app.rows("consultations")).find((item) => item.referred_from_id);
    expect(referred).toBeTruthy();
    const originalBefore = (await app.rows("consultations")).find(
      (item) => item.id === referred.referred_from_id,
    );
    expect(originalBefore).toBeTruthy();

    const before = await app.rows("checkoutPayments");
    const beforeForReferral = before.filter(
      (payment) => payment.consultation_id === referred.id,
    ).length;

    await app.goto(`/app/consultations/${referred.id}/referral`);
    await page.getByRole("button", { name: "Decline this referral", exact: true }).click();
    await page.getByRole("button", { name: "Decline without charge", exact: true }).click();
    await app.reload();
    expect((await app.rows("consultations")).find((item) => item.id === referred.id)).toMatchObject(
      { status: "CANCELLED", cancelled_by: "PATIENT" },
    );

    const after = (await app.rows("checkoutPayments")).filter(
      (payment) => payment.consultation_id === referred.id,
    ).length;
    expect(after, "declining a referral created a charge").toBe(beforeForReferral);

    const original = (await app.rows("consultations")).find(
      (item) => item.id === referred.referred_from_id,
    );
    expect(original).toEqual(originalBefore);
  },
);

journey.happy(
  "G8",
  "a consultation with two checkouts keeps them separately identifiable",
  async ({ app }) => {
    await app.bootstrap("/app");

    const payments = await app.rows("checkoutPayments");
    const byConsultation = new Map<string, typeof payments>();
    for (const payment of payments) {
      const list = byConsultation.get(payment.consultation_id) ?? [];
      list.push(payment);
      byConsultation.set(payment.consultation_id, list);
    }

    const doubled = [...byConsultation.values()].filter((list) => list.length > 1);
    expect(
      doubled.length,
      "no consultation carries a primary and a guest payment, so the risk is untested",
    ).toBeGreaterThan(0);

    for (const list of doubled) {
      const ids = new Set(list.map((payment) => payment.id));
      expect(ids.size, "two checkouts on one consultation share an identifier").toBe(list.length);

      // A receipt list that shows "the first checkout found" is the failure
      // this guards. One consultation legitimately carries several: the
      // consultation fee itself, then a pharmacy and a lab fulfilment, all paid
      // by the same person. What has to stay distinguishable is what each one
      // was for.
      const purposes = list.map((payment) => payment.provider_request_id ?? "consultation");
      expect(
        new Set(purposes).size,
        "two checkouts on one consultation are for the same thing",
      ).toBe(list.length);
    }

    // The guest examination is the case where the payer differs, not just the
    // purpose, and it is the one the receipt list most easily confuses.
    const guest = payments.filter((payment) => payment.payer_role === "GUEST");
    expect(
      guest.length,
      "no guest payment exists, so the two-payer case is untested",
    ).toBeGreaterThan(0);
    for (const payment of guest) {
      expect(payment.id, "a guest payment has no identifier of its own").toBeTruthy();
      // Where a primary payment sits on the same consultation, the two must be
      // separately identifiable: this is the pair a receipt list confuses.
      const primary = payments.find(
        (other) =>
          other.consultation_id === payment.consultation_id && other.payer_role === "PRIMARY",
      );
      if (primary) {
        expect(primary.id, "the guest and primary payments share an identifier").not.toBe(
          payment.id,
        );
      }
    }
  },
);

journey.happy(
  "G9",
  "the finished guest engagement shows an attributed finalized record",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    const id = uid("con_011");
    const care = (await app.rows("consultations")).find((c) => c.id === id);
    const note = (await app.rows("soapNotes")).find((n) => n.consultation_id === id);
    expect(care).toMatchObject({ status: "COMPLETED", guest_examination_status: "COMPLETED" });
    expect(note?.finalized_at).toBeTruthy();
    expect(note.guest_objective_contribution.expert_id).toBe(care.guest_expert_id);
    await app.goto(`/app/consultations/${id}`);
    await expect(page.getByText(/examined you at/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Review fee", exact: true })).toHaveCount(0);
    await app.goto(`/app/consultations/${id}/record`);
    await app.reload();
    await expect(page.getByText(note.objective, { exact: true })).toBeVisible();
    const contribution = page
      .locator("div")
      .filter({ has: page.getByText(note.guest_objective_contribution.text, { exact: true }) });
    await expect(
      page.getByText(note.guest_objective_contribution.text, { exact: true }),
    ).toBeVisible();
    await expect(contribution.getByText(/From Dr\..*, guest examination/).first()).toBeVisible();
    await expect(page.getByText(/Finalised/)).toBeVisible();
    await expect(page.getByRole("textbox")).toHaveCount(0);
    await app.goto(`/app/consultations/${id}/guest-checkout`);
    await expect(
      page.getByText(/examination is completed. This is your payment receipt/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cancel and request refund", exact: true }),
    ).toHaveCount(0);
  },
);

journey.happy(
  "G1",
  "an expert creates a referral that waits for the patient's decision",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    const source = (await app.rows("consultations")).find(
      (c) =>
        c.expert_id === SEATS.doctor &&
        c.status === "ACTIVE" &&
        c.patient_identity_id === PATIENTS.provisionalMinor,
    );
    expect(source).toBeTruthy();
    const target = (await app.rows("experts")).find(
      (e) =>
        e.id !== SEATS.doctor &&
        e.credentials.some(
          (c: ExpertCredential) => c.verification_status === "VERIFIED" && !c.retired_at,
        ),
    );
    expect(target).toBeTruthy();
    const payments = await app.rows("checkoutPayments");
    const notes = await app.rows("soapNotes");
    const before = await app.rows("consultations");
    await app.asSeat(SEATS.doctor, `/app/expert/consultations/${source.id}?tab=refer`);
    await expect(
      page.getByRole("button", { name: "Send the referral", exact: true }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Choose a specialist", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Search verified experts", exact: true })
      .fill(`${target.first_name} ${target.last_name}`);
    await page
      .getByRole("listitem")
      .filter({ hasText: `${target.first_name} ${target.last_name}` })
      .getByRole("button")
      .click();
    const reason =
      "A second specialist opinion would help us agree the next step. This is a separate paid visit if you choose to proceed.";
    await page.getByRole("textbox", { name: "Why", exact: true }).fill(reason);
    await page.getByRole("button", { name: "Send the referral", exact: true }).click();
    await expect(page.getByText(/is waiting for the patient/)).toBeVisible();
    const after = await app.rows("consultations");
    const created = after.filter((c) => !before.some((b) => b.id === c.id));
    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      expert_id: target.id,
      patient_identity_id: source.patient_identity_id,
      referred_from_id: source.id,
      referral_reason: reason,
      status: "REQUESTED",
      referral_disclosure_ack_at: null,
      scheduled_start: null,
    });
    expect(after.find((c) => c.id === source.id)).toEqual(source);
    expect(await app.rows("checkoutPayments")).toEqual(payments);
    expect(await app.rows("soapNotes")).toEqual(notes);
    await app.patchSession(
      { role: "patient", viewingPatientId: source.patient_identity_id },
      `/app/consultations/${created[0].id}/referral`,
    );
    await expect(page.getByText(`“${reason}”`, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Accept and continue to checkout", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Decline this referral", exact: true }),
    ).toBeVisible();
    await page.getByRole("checkbox").nth(0).check();
    await expect(
      page.getByRole("button", { name: "Accept and continue to checkout", exact: true }),
    ).toBeDisabled();
    await page.getByRole("checkbox").nth(1).check();
    await expect(
      page.getByRole("button", { name: "Accept and continue to checkout", exact: true }),
    ).toBeEnabled();
    expect(await app.rows("checkoutPayments")).toEqual(payments);
  },
);
