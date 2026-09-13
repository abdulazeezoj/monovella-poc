import { PATIENTS, SEATS, uid } from "../helpers/ids";
import { expect, journey, test } from "../journey";

journey.happy(
  "C16",
  "Amara's case record uses the signed note and original prescription and lab order",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    const state = await app.state();
    const booking = state.data!.consultations.find(
      (row) =>
        row.patient_identity_id === state.session!.viewingPatientId && row.status === "COMPLETED",
    )!;
    const note = state.data!.soapNotes.find((row) => row.consultation_id === booking.id)!;
    expect(note.finalized_at).toBeTruthy();
    expect(state.data!.prescriptions.some((row) => row.consultation_id === booking.id)).toBe(true);
    expect(state.data!.labOrders.some((row) => row.consultation_id === booking.id)).toBe(true);
    await app.goto(`/app/consultations/${booking.id}/record`);
    for (const text of [note.subjective, note.objective, note.assessment, note.plan]) {
      if (text) await expect(page.getByText(text, { exact: true })).toBeVisible();
    }
    for (const rx of state.data!.prescriptions.filter(
      (row) => row.consultation_id === booking.id,
    )) {
      await page.locator(`a[href="/app/prescriptions/${rx.id}"]`).click();
      await expect(page.getByText(rx.medication, { exact: true }).first()).toBeVisible();
      await app.goto(`/app/consultations/${booking.id}/record`);
    }
    for (const lab of state.data!.labOrders.filter((row) => row.consultation_id === booking.id)) {
      await page.locator(`a[href="/app/lab-orders/${lab.id}"]`).click();
      await expect(page.getByText(lab.test_requested, { exact: true }).first()).toBeVisible();
      await app.goto(`/app/consultations/${booking.id}/record`);
    }
  },
);

test("expert-authored care reaches the guardian only after the note is finalised", async ({
  app,
  page,
}) => {
  const id = uid("con_106");
  await app.bootstrap("/app");
  await app.asSeat(SEATS.doctor, `/app/expert/consultations/${id}?tab=rx`);
  await page.getByRole("button", { name: "I have read this", exact: true }).click();
  await page.getByLabel("Medication", { exact: true }).fill("Demonstration medicine");
  await page.getByLabel("Dosage", { exact: true }).fill("Demo only, not a treatment instruction");
  await page.getByLabel("Instructions", { exact: true }).fill("Prescription handoff test.");
  await page.getByRole("button", { name: "Issue", exact: true }).click();
  const rx = (await app.rows("prescriptions")).find(
    (row) => row.medication === "Demonstration medicine",
  )!;
  await app.goto(`/app/expert/consultations/${id}?tab=labs`);
  await page.getByRole("button", { name: "Order another", exact: true }).click();
  await page.getByLabel("Test requested", { exact: true }).fill("Demonstration lab order");
  await page.getByRole("button", { name: "Order it", exact: true }).click();
  const lab = (await app.rows("labOrders")).find(
    (row) => row.test_requested === "Demonstration lab order",
  )!;
  await page.getByRole("button", { name: "Case note", exact: true }).click();
  const sections = {
    Subjective: "Demonstration reported concern.",
    Objective: "Demonstration observation.",
    Assessment: "Demonstration assessment.",
    Plan: "Demonstration follow-up plan.",
  };
  for (const [label, text] of Object.entries(sections)) {
    await page.getByRole("textbox", { name: label, exact: true }).fill(text);
    await page.getByRole("heading", { name: "Case note", exact: true }).click();
  }
  await app.asPatient(PATIENTS.provisionalMinor, `/app/consultations/${id}/record`);
  await expect(page.getByText(sections.Objective, { exact: true })).toHaveCount(0);
  await expect(page.locator(`a[href="/app/prescriptions/${rx.id}"]`)).toBeVisible();
  await app.asSeat(SEATS.doctor, `/app/expert/consultations/${id}`);
  await page.getByRole("button", { name: "Complete", exact: true }).click();
  await page.getByRole("button", { name: "Complete it", exact: true }).click();
  await app.asPatient(PATIENTS.provisionalMinor, `/app/consultations/${id}/record`);
  await app.reload();
  for (const text of Object.values(sections))
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  await expect(page.locator(`a[href="/app/prescriptions/${rx.id}"]`)).toBeVisible();
  await expect(page.locator(`a[href="/app/lab-orders/${lab.id}"]`)).toBeVisible();
  expect((await app.rows("prescriptions")).filter((row) => row.id === rx.id)).toHaveLength(1);
  expect((await app.rows("labOrders")).filter((row) => row.id === lab.id)).toHaveLength(1);
  await page.locator(`a[href="/app/prescriptions/${rx.id}"]`).click();
  await expect(page.getByText("Demonstration medicine", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText("Demo only, not a treatment instruction", { exact: true }),
  ).toBeVisible();
  await app.goto(`/app/consultations/${id}/record`);
  await page.locator(`a[href="/app/lab-orders/${lab.id}"]`).click();
  await expect(page.getByText("Demonstration lab order", { exact: true }).first()).toBeVisible();
});
