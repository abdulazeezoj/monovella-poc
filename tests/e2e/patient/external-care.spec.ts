import { PATIENTS } from "../helpers/ids";
import { expect, journey } from "../journey";

journey.sad(
  ["H7"],
  "external care keeps valid optional dates and patient result provenance",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    const cases = (await app.rows("consultations")).filter(
      (item) => item.patient_identity_id === PATIENTS.self,
    );
    const owns = (item: { consultation_id: string }) =>
      cases.some((care) => care.id === item.consultation_id);
    const rx = (await app.rows("prescriptions")).find(
      (item) => owns(item) && !item.corrected_by_id,
    );
    const lab = (await app.rows("labOrders")).find((item) => owns(item) && !item.corrected_by_id);
    expect(rx).toBeTruthy();
    expect(lab).toBeTruthy();
    const beforeRequests = (await app.rows("providerRequests")).length;
    const beforePayments = (await app.rows("checkoutPayments")).length;
    await app.goto(`/app/prescriptions/${rx.id}/self-report`);
    await page.getByLabel("When", { exact: true }).fill("");
    await expect(page.getByText("Choose when you got the medication.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save to my record" })).toBeDisabled();
    await page.getByLabel("When", { exact: true }).fill("2099-01-01");
    await expect(page.getByText("Choose today or an earlier date.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save to my record" })).toBeDisabled();
    await page.getByRole("radio", { name: "I didn't", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save to my record" })).toBeEnabled();
    await page.getByRole("radio", { name: "I got it", exact: true }).click();
    await page.getByLabel("When", { exact: true }).fill("2026-08-28");
    await page.getByLabel("Which pharmacy").fill("Outside pharmacy");
    await page.locator('input[type="file"]').setInputFiles({
      name: "outside-receipt.png",
      mimeType: "image/png",
      buffer: Buffer.from("prototype sample"),
    });
    await expect(page.getByRole("button", { name: "Save to my record" })).toBeDisabled();
    await expect(page.getByText("outside-receipt.png", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save to my record" }).click();
    await app.reload();
    expect((await app.rows("prescriptions")).find((item) => item.id === rx.id)).toMatchObject({
      fulfillment_status: "FILLED",
      filled_at: "2026-08-28T09:00:00Z",
      pharmacy_name: "Outside pharmacy",
      receipt_file_name: "outside-receipt.png",
    });
    await app.goto(`/app/prescriptions/${rx.id}/self-report`);
    await expect(page.getByLabel("When", { exact: true })).toHaveValue("2026-08-28");
    await expect(page.getByLabel("Which pharmacy")).toHaveValue("Outside pharmacy");
    await app.goto(`/app/prescriptions/${rx.id}`);
    const downloads: string[] = [];
    page.on("download", (download) => downloads.push(download.suggestedFilename()));
    await page.getByRole("button", { name: "PDF demo", exact: true }).click();
    await expect(
      page.getByText("Prototype simulation: no PDF file was downloaded.", { exact: true }),
    ).toBeVisible();
    expect(downloads).toHaveLength(0);
    await app.goto(`/app/lab-orders/${lab.id}/self-report`);
    await page.getByLabel("When was it done").fill("2099-01-01");
    await expect(page.getByText("Choose today or an earlier date.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save to my record" })).toBeDisabled();
    await page.getByLabel("When was it done").fill("");
    await page
      .getByLabel("Or type what it said")
      .fill("Patient copied the outside laboratory result.");
    await page.locator('input[type="file"]').setInputFiles({
      name: "outside-result.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("prototype sample"),
    });
    await expect(page.getByText("outside-result.pdf", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Save to my record" }).click();
    await app.reload();
    expect((await app.rows("labOrders")).find((item) => item.id === lab.id)).toMatchObject({
      result_status: "ATTACHED",
      result_at: null,
      result_file_name: "outside-result.pdf",
      result_source: "Patient-supplied result",
    });
    await app.goto(`/app/lab-orders/${lab.id}/result`);
    await expect(page.getByText("Patient-supplied result", { exact: true })).toBeVisible();
    await expect(page.getByText("Date not recorded", { exact: true })).toBeVisible();
    await expect(page.getByRole("term", { name: "Lab", exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "File demo", exact: true }).click();
    await expect(
      page.getByText(
        "Prototype simulation: only the filename is retained. No file was downloaded.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(downloads).toHaveLength(0);
    await app.goto(`/app/lab-orders/${lab.id}/self-report`);
    await expect(page.getByLabel("When was it done")).toHaveValue("");
    await expect(page.getByLabel("Or type what it said")).toHaveValue(
      "Patient copied the outside laboratory result.",
    );
    await page.getByRole("button", { name: "Remove this file", exact: true }).click();
    await page.getByLabel("Or type what it said").fill("Outside lab supplied this result as text.");
    await page.getByRole("button", { name: "Save to my record", exact: true }).click();
    await app.goto(`/app/lab-orders/${lab.id}/result`);
    await expect(
      page.getByText("Outside lab supplied this result as text.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "File demo", exact: true })).toHaveCount(0);
    expect(await app.rows("providerRequests")).toHaveLength(beforeRequests);
    expect(await app.rows("checkoutPayments")).toHaveLength(beforePayments);
  },
);
