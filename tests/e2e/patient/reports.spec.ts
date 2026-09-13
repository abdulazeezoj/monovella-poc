import { PATIENTS } from "../helpers/ids";
import { expect, journey } from "../journey";

journey.sad(
  "I7",
  "a report rejects a reversed date range without creating a record",
  async ({ app, page }) => {
    await app.bootstrap("/app/reports/new");
    const before = (await app.rows("reports")).length;
    await page.getByRole("radio", { name: /A date range/ }).check();
    await page.getByLabel("From", { exact: true }).fill("2026-08-29");
    await page.getByLabel("To", { exact: true }).fill("2026-08-01");
    await expect(page.getByText("The end date must be on or after the start date.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Generate report", exact: true })).toBeDisabled();
    expect((await app.rows("reports")).length).toBe(before);
  },
);

journey.happy(
  ["I7", "E5"],
  "new reports have different verification codes and revoking one leaves the other valid",
  async ({ app, page }) => {
    await app.bootstrap("/app/reports/new");
    const before = new Set((await app.rows("reports")).map((item) => item.id));
    await page.getByRole("button", { name: "Generate report", exact: true }).click();
    await page.getByRole("button", { name: "Revoke sharing", exact: true }).waitFor();
    const self = (await app.rows("reports")).find((item) => !before.has(item.id));
    expect(self.patient_id).toBe(PATIENTS.self);
    await app.asPatient(PATIENTS.verifiedDependant, "/app/reports/new");
    await page.getByRole("button", { name: "Generate report", exact: true }).click();
    await page.getByRole("button", { name: "Revoke sharing", exact: true }).waitFor();
    const dependant = (await app.rows("reports")).find(
      (item) => !before.has(item.id) && item.id !== self.id,
    );
    expect(dependant.patient_id).toBe(PATIENTS.verifiedDependant);
    expect(dependant.verification_code).not.toBe(self.verification_code);
    await app.goto(`/verify/${dependant.verification_code}`);
    await expect(
      page.getByRole("heading", { name: "This report is genuine", exact: true }),
    ).toBeVisible();
    await app.goto(`/app/reports/${dependant.id}`);
    await page.getByRole("button", { name: "Revoke sharing", exact: true }).click();
    await page.getByRole("button", { name: "Revoke it", exact: true }).click();
    await app.patchSession({ authenticated: false });
    await app.goto(`/verify/${dependant.verification_code}`);
    await expect(
      page.getByRole("heading", { name: "This report is no longer valid", exact: true }),
    ).toBeVisible();
    await app.goto(`/verify/${self.verification_code}`);
    await expect(
      page.getByRole("heading", { name: "This report is genuine", exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Sample medicine|Wound swab/)).toHaveCount(0);
  },
);

journey.happy(
  "I7",
  "report generation resumes after a reload and finishes while another screen is open",
  async ({ app, page }) => {
    await app.bootstrap("/app/reports/new");
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    const before = new Set((await app.rows("reports")).map((item) => item.id));
    await page.getByRole("button", { name: "Generate report", exact: true }).click();
    const report = (await app.rows("reports")).find((item) => !before.has(item.id));
    expect(report.status).toBe("GENERATING");
    await app.reload();
    await app.goto("/app");
    await page.clock.fastForward(2000);
    await expect
      .poll(async () => (await app.rows("reports")).find((item) => item.id === report.id)?.status)
      .toBe("READY");
    const ready = (await app.rows("reports")).find((item) => item.id === report.id);
    expect(ready.patient_id).toBe(report.patient_id);
    expect(ready.verification_code).toBeTruthy();
    await app.goto(`/verify/${ready.verification_code}`);
    await expect(
      page.getByRole("heading", { name: "This report is genuine", exact: true }),
    ).toBeVisible();
  },
);
