import { PATIENTS, SEATS, uid } from "../helpers/ids";
import { expect, journey } from "../journey";

const CASE = uid("con_106");

journey.sad(
  "L6",
  "an incomplete case note cannot be finalised and keeps its draft after reload",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.asSeat(SEATS.doctor, `/app/expert/consultations/${CASE}`);
    await page.getByRole("button", { name: "Complete", exact: true }).click();
    await expect(page.getByRole("button", { name: "Complete it", exact: true })).toBeDisabled();
    await expect(page.getByText(/Complete the minimum SOAP record/)).toBeVisible();
    await page.getByRole("button", { name: "Not yet", exact: true }).click();
    await page.getByRole("button", { name: "Case note", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Objective", exact: true })
      .fill("Video review documented. No new distress reported.");
    await page.getByRole("textbox", { name: "Assessment", exact: true }).focus();
    await app.reload();
    await page.getByRole("button", { name: "Case note", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Objective", exact: true })).toHaveValue(
      "Video review documented. No new distress reported.",
    );
    expect((await app.rows("consultations")).find((item) => item.id === CASE).status).toBe(
      "ACTIVE",
    );
  },
);

journey.happy(
  "K9",
  "correcting a lab order retains the original, stops its request and reaches the patient record",
  async ({ app, page }) => {
    const orderId = uid("lab_004");
    await app.bootstrap("/app");
    await app.asPatient(
      PATIENTS.provisionalMinor,
      `/app/lab-orders/${orderId}/labs/${uid("prv_lab_lagosdiag")}/consent`,
    );
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Consent and send request" }).click();
    const request = (await app.rows("providerRequests")).find(
      (item) => item.lab_order_id === orderId,
    );
    expect(request).toBeTruthy();
    const original = (await app.rows("labOrders")).find((item) => item.id === orderId);
    await app.asSeat(SEATS.doctor, `/app/expert/consultations/${CASE}?tab=labs`);
    await expect(page.getByRole("button", { name: "Correct this", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Order another", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "I have read this", exact: true }).click();
    await page.getByRole("button", { name: "Correct this", exact: true }).click();
    await page
      .getByRole("textbox", { name: /^Instructions/ })
      .fill("Use the replacement order. Collect the sample before applying antiseptic.");
    await page.getByRole("button", { name: "Issue correction", exact: true }).click();
    const orders = await app.rows("labOrders");
    const replacement = orders.find((item) => item.corrects_id === orderId);
    expect(replacement).toBeTruthy();
    expect(orders.find((item) => item.id === orderId)).toMatchObject({
      ...original,
      corrected_by_id: replacement.id,
    });
    expect((await app.rows("providerRequests")).find((item) => item.id === request.id).status).toBe(
      "OBSOLETE",
    );
    await app.goto(`/lab/requests/${request.id}`);
    await expect(page.getByRole("button", { name: "Accept", exact: true })).toHaveCount(0);
    await app.asPatient(PATIENTS.provisionalMinor, `/app/lab-orders/${orderId}`);
    await expect(
      page.getByText("This lab order was corrected. Use the current version."),
    ).toBeVisible();
    await page.getByRole("link", { name: "View current", exact: true }).click();
    await expect(page.getByText(replacement.instructions, { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "View original", exact: true }).click();
    await expect(page.getByText(original.instructions, { exact: true })).toBeVisible();
    await app.goto(`/app/lab-orders/${orderId}/self-report`);
    await expect(page.getByRole("button", { name: "Save to my record", exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("link", { name: "View current lab order", exact: true }),
    ).toBeVisible();
    await app.goto(`/app/lab-orders/${orderId}/labs/${uid("prv_lab_lagosdiag")}/consent`);
    await expect(page.getByRole("button", { name: "Consent and send request" })).toHaveCount(0);
  },
);

journey.sad(
  "H6",
  "correcting a prescription stops an open pharmacy request and prevents old-version checkout",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.asSeat(SEATS.doctor, `/app/expert/consultations/${CASE}?tab=rx`);
    const acknowledge = page.getByRole("button", { name: "I have read this", exact: true });
    if (await acknowledge.count()) await acknowledge.click();
    await page
      .getByLabel("Medication", { exact: true })
      .fill("Sample medicine for correction test");
    await page.getByLabel("Dosage", { exact: true }).fill("Sample dose");
    await page
      .getByRole("textbox", { name: /^Instructions/ })
      .fill("Original demonstration instructions.");
    await page.getByRole("button", { name: "Issue", exact: true }).click();
    const rxId = (await app.rows("prescriptions")).find((item) => item.consultation_id === CASE).id;
    await app.asPatient(
      PATIENTS.provisionalMinor,
      `/app/prescriptions/${rxId}/pharmacies/${uid("prv_ph_greenlife")}/consent`,
    );
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Consent and send request" }).click();
    await app.asSeat(SEATS.doctor, `/app/expert/consultations/${CASE}?tab=rx`);
    const original = (await app.rows("prescriptions")).find((item) => item.id === rxId);
    const request = (await app.rows("providerRequests")).find(
      (item) => item.prescription_id === rxId,
    );
    expect(request).toBeTruthy();
    await page.getByRole("button", { name: "Correct this", exact: true }).click();
    await page
      .getByRole("textbox", { name: /^Instructions/ })
      .fill("Corrected instructions for this demonstration. Follow the replacement prescription.");
    await page.getByRole("button", { name: "Issue correction", exact: true }).click();
    const prescriptions = await app.rows("prescriptions");
    const replacement = prescriptions.find((item) => item.corrects_id === rxId);
    expect(replacement).toBeTruthy();
    expect(prescriptions.find((item) => item.id === rxId)).toMatchObject({
      ...original,
      corrected_by_id: replacement.id,
    });
    expect((await app.rows("providerRequests")).find((item) => item.id === request.id).status).toBe(
      "OBSOLETE",
    );
    await app.goto(`/pharmacy/requests/${request.id}`);
    await expect(page.getByRole("button", { name: "Fulfilled", exact: true })).toHaveCount(0);
    await app.asPatient(PATIENTS.provisionalMinor, `/app/prescriptions/${rxId}/self-report`);
    await expect(page.getByRole("button", { name: "Save to my record", exact: true })).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("link", { name: "View current prescription", exact: true }),
    ).toBeVisible();
    await app.asPatient(PATIENTS.provisionalMinor, `/app/prescriptions/${rxId}/order`);
    await expect(page.getByText("Use the corrected prescription", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry checkout", exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "View current prescription", exact: true }).click();
    await expect(page.getByText(replacement.instructions, { exact: true })).toBeVisible();
  },
);
