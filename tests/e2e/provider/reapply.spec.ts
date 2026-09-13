import { expect, journey } from "../journey";

for (const type of ["pharmacy", "lab"] as const) {
  journey.sad(
    "M7",
    `${type} applicant corrects a rejected licence without duplicating the business`,
    async ({ app, page }) => {
      await app.bootstrap(`/${type}/apply`);
      const seeded = await page.evaluate(async (type) => {
        const state = JSON.parse(sessionStorage.getItem("mv-prototype-state")!);
        const path = "/app/lib/provider-onboarding.ts";
        const { createProviderApplication } = await import(path);
        createProviderApplication(state.data, {
          providerId: "reapply_provider",
          applicationId: "reapply_initial",
          credentialId: "reapply_licence",
          providerType: type === "pharmacy" ? "PHARMACY" : "LAB",
          businessName: "Applicant Business",
          address: "10 Demo Road",
          city: "Lagos",
          localGovernmentArea: "Ikeja",
          state: "Lagos",
          contactName: "Applicant Contact",
          contactEmail: "applicant@example.test",
          contactPhone: "08012345678",
          cacNumber: "RC-DEMO",
          licenceNumber: "LICENCE-DEMO",
          licenceExpiry: "2028-01-31",
          documentFilename: "incomplete.pdf",
          services: [],
          bankCode: "058",
          bankAccountNumber: "1234567890",
        });
        return state;
      }, type);
      await page.addInitScript((state) => {
        if (sessionStorage.getItem("reapply-seeded")) return;
        sessionStorage.setItem("mv-prototype-state", JSON.stringify(state));
        sessionStorage.setItem("reapply-seeded", "yes");
      }, seeded);
      await app.goto("/console/applications/reapply_initial");
      await page.getByRole("button", { name: "Decline", exact: true }).click();
      await page
        .getByRole("alertdialog")
        .getByLabel("Reason", { exact: true })
        .fill("Upload the complete licence.");
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Decline", exact: true })
        .click();
      await app.goto(`/${type}/application`);
      await expect(page.getByText("Upload the complete licence.", { exact: true })).toBeVisible();
      const original = (await app.rows("applicationDetails")).find(
        (item) => item.id === "reapply_initial",
      );
      const count = (await app.rows("providers")).length;
      await page.getByRole("link", { name: "Correct and resubmit", exact: true }).click();
      await expect(page.getByLabel("Business name", { exact: true })).toHaveValue(
        "Applicant Business",
      );
      await expect(page.getByLabel("Account email", { exact: true })).toHaveValue(
        "applicant@example.test",
      );
      await page.getByRole("button", { name: "Continue to verification", exact: true }).click();
      await expect(page.getByRole("button", { name: "Continue", exact: true })).toBeDisabled();
      await page.locator('input[type="file"]').setInputFiles({
        name: "complete.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("prototype corrected document"),
      });
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.getByRole("button", { name: "Submit application", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Under review by Monovella", exact: true }),
      ).toBeVisible();
      await app.reload();
      expect(await app.rows("providers")).toHaveLength(count);
      expect(
        (await app.rows("applicationDetails")).find((item) => item.id === "reapply_initial"),
      ).toEqual(original);
      await expect(page.getByText("complete.pdf", { exact: true })).toBeVisible();
    },
  );
}
