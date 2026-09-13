import { PATIENTS } from "../helpers/ids";
import { expect, journey } from "../journey";

journey.happy(
  "I11",
  "Care reaches closed consultation records, prescriptions and lab orders",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await page.getByRole("link", { name: "Care", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Care history", exact: true })).toBeVisible();
    const state = await app.state();
    const owned = state.data!.consultations.filter(
      (item) => item.patient_identity_id === state.session!.viewingPatientId,
    );
    const rows = page.locator('[data-screen="P19a"] a[href^="/app/consultations/"]');
    await expect(rows).toHaveCount(owned.length);
    for (const consultation of owned) {
      await expect(
        page.locator(`[data-screen="P19a"] a[href="/app/consultations/${consultation.id}"]`),
      ).toHaveCount(1);
    }
    const prescription = state.data!.prescriptions.find(
      (item) =>
        item.medication === "Omeprazole" &&
        owned.some(
          (consultation) =>
            consultation.id === item.consultation_id && consultation.status === "COMPLETED",
        ),
    )!;
    expect(prescription).toBeTruthy();
    const lab = state.data!.labOrders.find(
      (item) => item.consultation_id === prescription.consultation_id,
    )!;
    expect(lab).toBeTruthy();
    await page.getByLabel("Search care history", { exact: true }).fill("omeprazole");
    await expect(rows).toHaveCount(1);
    await rows.click();
    await page.getByRole("link", { name: /Case record/ }).click();
    await page.locator(`a[href="/app/prescriptions/${prescription.id}"]`).click();
    await expect(page.getByText("Omeprazole", { exact: true }).first()).toBeVisible();
    await page.getByRole("link", { name: "Care", exact: true }).click();
    await page.getByLabel("Search care history", { exact: true }).fill(lab.test_requested);
    await page
      .locator(`[data-screen="P19a"] a[href="/app/consultations/${prescription.consultation_id}"]`)
      .click();
    await page.getByRole("link", { name: /Case record/ }).click();
    await page.locator(`a[href="/app/lab-orders/${lab.id}"]`).click();
    await expect(page.getByText(lab.test_requested, { exact: true }).first()).toBeVisible();
  },
);

journey.sad(
  "I11",
  "Care filters recover and switching patient never lists another person's encounter",
  async ({ app, page }) => {
    await app.bootstrap("/app/consultations");
    const rows = page.locator('[data-screen="P19a"] a[href^="/app/consultations/"]');
    await page.getByLabel("Consultation status", { exact: true }).selectOption("CANCELLED");
    const state = await app.state();
    const cancelled = state.data!.consultations.filter(
      (item) =>
        item.patient_identity_id === state.session!.viewingPatientId && item.status === "CANCELLED",
    );
    await expect(rows).toHaveCount(cancelled.length);
    await page
      .getByLabel("Search care history", { exact: true })
      .fill("no such specialist or medicine");
    await expect(page.getByRole("heading", { name: "No matching consultations" })).toBeVisible();
    await page.getByRole("button", { name: "Clear filters", exact: true }).click();
    await expect(page.getByLabel("Consultation status", { exact: true })).toHaveValue("all");
    await expect(page.getByLabel("Search care history", { exact: true })).toHaveValue("");
    await app.patchSession({ viewingPatientId: PATIENTS.verifiedDependant });
    await app.goto("/app/consultations");
    await expect(page.getByRole("heading", { name: "No consultations yet" })).toBeVisible();
    await expect(rows).toHaveCount(0);
    await app.patchSession({ viewingPatientId: PATIENTS.provisionalMinor });
    await app.goto("/app/consultations");
    const dependant = state.data!.consultations.filter(
      (item) => item.patient_identity_id === PATIENTS.provisionalMinor,
    );
    expect(dependant.length).toBeGreaterThan(0);
    await expect(rows).toHaveCount(dependant.length);
    const links = await rows.evaluateAll((items) => items.map((item) => item.getAttribute("href")));
    expect(new Set(links)).toEqual(
      new Set(dependant.map((item) => `/app/consultations/${item.id}`)),
    );
    await app.patchSession({ offline: true });
    await app.goto("/app/consultations");
    await expect(page.getByText(/You're offline/)).toBeVisible();
    await expect(rows).toHaveCount(0);
  },
);
