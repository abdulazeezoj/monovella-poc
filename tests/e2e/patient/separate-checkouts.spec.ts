import { PATIENTS } from "../helpers/ids";
import { expect, journey } from "../journey";

journey.sad(
  "G2",
  "referral checkout retries independently and cannot be paid twice",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    const referral = (await app.rows("consultations")).find(
      (c) =>
        c.patient_identity_id === PATIENTS.self &&
        c.referred_from_id &&
        !c.referral_disclosure_ack_at,
    );
    expect(referral).toBeTruthy();
    const original = (await app.rows("checkoutPayments")).filter(
      (p) => p.consultation_id === referral.referred_from_id,
    );
    await app.goto(`/app/consultations/${referral.id}/referral`);
    for (const checkbox of await page.getByRole("checkbox").all()) await checkbox.check();
    await page
      .getByRole("button", { name: "Accept and continue to checkout", exact: true })
      .click();
    await expect(
      page.getByText("Payment verification is pending.", { exact: false }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Verify payment", exact: true })).toHaveCount(0);
    await app.selectScreenState("Simulate payment failure");
    await app.reload();
    await page.getByRole("button", { name: "Retry checkout", exact: true }).click();
    await app.selectScreenState("Simulate payment success");
    await app.reload();
    await app.selectScreenState("Simulate payment success");
    await app.selectScreenState("Simulate payment failure");
    const payments = (await app.rows("checkoutPayments")).filter(
      (p) => p.consultation_id === referral.id,
    );
    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe("PAID");
    expect(
      (await app.rows("providerPayouts")).filter((p) => p.checkout_payment_id === payments[0].id),
    ).toHaveLength(1);
    expect(
      (await app.rows("checkoutPayments")).filter(
        (p) => p.consultation_id === referral.referred_from_id,
      ),
    ).toEqual(original);
  },
);

journey.sad(
  "G8",
  "guest checkout retries independently and preserves the primary receipt",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    const care = (await app.rows("consultations")).find(
      (c) =>
        c.patient_identity_id === PATIENTS.provisionalMinor &&
        c.status === "ACTIVE" &&
        c.guest_examination_status === "REQUESTED",
    );
    expect(care).toBeTruthy();
    const primary = (await app.rows("checkoutPayments")).filter(
      (p) => p.consultation_id === care.id && p.payer_role !== "GUEST",
    );
    expect(primary.length).toBeGreaterThan(0);
    await app.asSeat(care.guest_expert_id, "/app/expert/guest-examinations");
    const invite = page.getByRole("listitem").filter({ hasText: care.guest_examination_reason });
    await invite.getByRole("button", { name: "Accept", exact: true }).click();
    await app.patchSession(
      { role: "patient", viewingPatientId: care.patient_identity_id },
      `/app/consultations/${care.id}/guest-checkout`,
    );
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Confirm guest checkout", exact: true }).click();
    await app.selectScreenState("Simulate payment failure");
    await app.reload();
    await page.getByRole("button", { name: "Retry checkout", exact: true }).click();
    await app.selectScreenState("Simulate payment success");
    await app.reload();
    await app.selectScreenState("Simulate payment success");
    const payments = (await app.rows("checkoutPayments")).filter(
      (p) => p.consultation_id === care.id && p.payer_role === "GUEST",
    );
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ status: "PAID", provider_id: care.guest_expert_id });
    expect(
      (await app.rows("providerPayouts")).filter((p) => p.checkout_payment_id === payments[0].id),
    ).toHaveLength(1);
    expect(
      (await app.rows("checkoutPayments")).filter(
        (p) => p.consultation_id === care.id && p.payer_role !== "GUEST",
      ),
    ).toEqual(primary);
  },
);

journey.happy(
  ["G6", "G7"],
  "guest findings remain readable only as their own contribution and notify the guardian",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    const care = (await app.rows("consultations")).find(
      (c) =>
        c.patient_identity_id === PATIENTS.provisionalMinor &&
        c.status === "ACTIVE" &&
        c.guest_examination_status === "REQUESTED",
    );
    expect(care).toBeTruthy();
    const originalNote = (await app.rows("soapNotes")).find((n) => n.consultation_id === care.id);
    expect(originalNote).toBeTruthy();
    await app.asSeat(care.guest_expert_id, "/app/expert/guest-examinations");
    await page
      .getByRole("listitem")
      .filter({ hasText: care.guest_examination_reason })
      .getByRole("button", { name: "Accept", exact: true })
      .click();
    await app.goto(`/app/expert/guest-examinations/${care.id}`);
    await expect(page.getByText("Waiting for patient checkout", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Send findings", exact: true })).toHaveCount(0);
    await app.patchSession(
      { role: "patient", viewingPatientId: care.patient_identity_id },
      `/app/consultations/${care.id}/guest-checkout`,
    );
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Confirm guest checkout", exact: true }).click();
    await app.selectScreenState("Simulate payment success");
    await app.asSeat(care.guest_expert_id, `/app/expert/guest-examinations/${care.id}`);
    await expect(page.getByRole("button", { name: "Send findings", exact: true })).toBeDisabled();
    const findings =
      "Demo examination: movement assessed in person. Findings sent to the primary expert.";
    await page.getByRole("textbox", { name: "Your findings", exact: true }).fill(findings);
    await page.getByRole("button", { name: "Send findings", exact: true }).click();
    await expect(page).toHaveURL(/guest-examinations$/);
    await app.goto(`/app/expert/guest-examinations/${care.id}`);
    await app.reload();
    await expect(
      page.getByRole("heading", { name: "Your submitted findings", exact: true }),
    ).toBeVisible();
    await expect(page.getByText(findings, { exact: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Your findings", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send findings", exact: true })).toHaveCount(0);
    for (const field of ["subjective", "objective", "assessment", "plan"]) {
      if (originalNote[field])
        await expect(page.getByText(originalNote[field], { exact: true })).toHaveCount(0);
    }
    const note = (await app.rows("soapNotes")).find((n) => n.consultation_id === care.id);
    expect(note).toEqual({
      ...originalNote,
      attachments: originalNote.attachments ?? [],
      guest_objective_contribution: {
        expert_id: care.guest_expert_id,
        text: findings,
        submitted_at: expect.any(String),
      },
    });
    expect((await app.rows("consultations")).find((c) => c.id === care.id)).toEqual({
      ...care,
      guest_examination_status: "COMPLETED",
      guest_expert_fee_kobo: expect.any(Number),
    });
    const notice = (await app.rows("chatMessages")).filter(
      (m) =>
        m.consultation_id === care.id &&
        m.body.includes("shared their in-person examination findings"),
    );
    expect(notice).toHaveLength(1);
    expect(notice[0].body).not.toContain(findings);
    await app.patchSession(
      { role: "patient", viewingPatientId: care.patient_identity_id },
      `/app/consultations/${care.id}/chat`,
    );
    await expect(page.getByText(notice[0].body, { exact: false })).toBeVisible();
    await expect(page.getByText(findings, { exact: true })).toHaveCount(0);
    await app.goto(`/app/consultations/${care.id}/record`);
    await expect(
      page.getByText("Your expert is still writing your visit note.", { exact: false }),
    ).toBeVisible();
    for (const field of ["subjective", "objective", "assessment", "plan"]) {
      await expect(page.getByText(originalNote[field], { exact: true })).toHaveCount(0);
    }
    await expect(page.getByText(findings, { exact: true })).toHaveCount(0);
  },
);

journey.sad(
  "G10",
  "cancelling the paid guest examination reverses only its payment",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    const care = (await app.rows("consultations")).find(
      (c) =>
        c.patient_identity_id === PATIENTS.provisionalMinor &&
        c.guest_examination_status === "REQUESTED",
    );
    expect(care).toBeTruthy();
    const notes = await app.rows("soapNotes");
    const primary = (await app.rows("checkoutPayments")).filter(
      (p) => p.consultation_id === care.id && p.payer_role !== "GUEST",
    );
    expect(primary.length).toBeGreaterThan(0);
    const payouts = await app.rows("providerPayouts");
    await app.asSeat(care.guest_expert_id, "/app/expert/guest-examinations");
    await page
      .getByRole("listitem")
      .filter({ hasText: care.guest_examination_reason })
      .getByRole("button", { name: "Accept", exact: true })
      .click();
    await app.patchSession(
      { role: "patient", viewingPatientId: care.patient_identity_id },
      `/app/consultations/${care.id}/guest-checkout`,
    );
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Confirm guest checkout", exact: true }).click();
    await app.selectScreenState("Simulate payment success");
    const payment = (await app.rows("checkoutPayments")).find(
      (p) => p.consultation_id === care.id && p.payer_role === "GUEST",
    );
    expect(payment.status).toBe("PAID");
    await page.getByRole("button", { name: "Cancel and request refund", exact: true }).click();
    await app.reload();
    await expect(page.getByText("REFUND_PENDING", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Cancel and request refund", exact: true }),
    ).toHaveCount(0);
    await app.selectScreenState("Simulate payment success");
    expect((await app.rows("checkoutPayments")).find((p) => p.id === payment.id).status).toBe(
      "REFUND_PENDING",
    );
    expect(
      (await app.rows("checkoutPayments")).filter(
        (p) => p.consultation_id === care.id && p.payer_role !== "GUEST",
      ),
    ).toEqual(primary);
    expect(await app.rows("soapNotes")).toEqual(notes);
    expect((await app.rows("consultations")).find((c) => c.id === care.id)).toEqual({
      ...care,
      guest_examination_status: "DECLINED",
      guest_expert_fee_kobo: expect.any(Number),
    });
    const afterPayouts = await app.rows("providerPayouts");
    expect(afterPayouts.filter((p) => p.checkout_payment_id !== payment.id)).toEqual(payouts);
    expect(afterPayouts.filter((p) => p.checkout_payment_id === payment.id)).toEqual([
      expect.objectContaining({ status: "REVERSED", provider_id: care.guest_expert_id }),
    ]);
    await app.asSeat(care.guest_expert_id, `/app/expert/guest-examinations/${care.id}`);
    await expect(page.getByRole("button", { name: "Send findings", exact: true })).toHaveCount(0);
  },
);
