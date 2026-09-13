import { expect, journey } from "../journey";

for (const type of ["pharmacy", "lab"] as const) {
  journey.happy(
    ["M1", "M2", "M9"],
    `new ${type} application preserves business details through approval`,
    async ({ app, page }) => {
      await app.bootstrap(`/${type}/apply`);
      const originals = await app.rows("providers");
      await page.getByLabel("Business name", { exact: true }).fill(`New ${type} business`);
      await page.getByLabel("Premises address", { exact: true }).fill("10 Demo Road");
      await page.getByLabel("City", { exact: true }).fill("Lagos");
      await page.getByLabel("State", { exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Lagos", exact: true }).click();
      await page.getByLabel("Local Government Area", { exact: true }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Ikeja", exact: true }).click();
      await page.getByLabel("Contact person", { exact: true }).fill("Applicant Contact");
      await page.getByLabel("Account email", { exact: true }).fill(`new-${type}@example.test`);
      await page.getByLabel("Contact phone", { exact: true }).fill("08012345678");
      await page.getByRole("button", { name: "Continue to verification", exact: true }).click();
      await page.getByLabel("CAC registration number", { exact: true }).fill("RC-NEW-DEMO");
      await page
        .getByLabel(`${type === "pharmacy" ? "PCN" : "MLSCN"} licence number`, { exact: true })
        .fill("LICENCE-NEW-DEMO");
      await page.getByLabel("Licence expiry date", { exact: true }).fill("2028-01-31");
      await page.locator('input[type="file"]').setInputFiles({
        name: "applicant.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("prototype document"),
      });
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.getByLabel("Bank", { exact: true }).selectOption("058");
      await page.getByLabel("Account number", { exact: true }).fill("1234567890");
      await page.getByRole("button", { name: "Submit application", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: "Under review by Monovella", exact: true }),
      ).toBeVisible();
      await expect(page.getByText("LICENCE-NEW-DEMO", { exact: true })).toBeVisible();
      const id = new URL(page.url()).searchParams.get("id")!;
      await app.reload();
      await expect(page.getByText("applicant.pdf", { exact: true })).toBeVisible();
      const providers = await app.rows("providers");
      expect(providers.slice(0, originals.length)).toEqual(originals);
      const added = providers.find((p) => p.business_name === `New ${type} business`)!;
      expect(added.contact_name).toBe("Applicant Contact");
      await app.goto(`/console/applications/${id}`);
      await expect(page.getByText(`New ${type} business`, { exact: true }).first()).toBeVisible();
      await page.getByRole("checkbox", { name: /I checked LICENCE-NEW-DEMO/ }).check();
      await page.getByRole("button", { name: "Approve", exact: true }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Approve", exact: true })
        .click();
      await app.goto(`/${type}/application`);
      await expect(
        page.getByRole("heading", { name: "Your application is approved", exact: true }),
      ).toBeVisible();
      await page.getByRole("link", { name: "Open your portal", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/${type}/sign-in$`));
      await page.getByLabel("Email", { exact: true }).fill(`new-${type}@example.test`);
      await page.getByLabel("Password", { exact: true }).fill("Monovella2026!");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/${type}/password$`));
      await page.getByLabel("Current password", { exact: true }).fill("Monovella2026!");
      await page.getByLabel("New password", { exact: true }).fill("NewApplicant2026!");
      await page.getByRole("button", { name: "Change password", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: `New ${type} business`, exact: true }),
      ).toBeVisible();
      await app.goto(`/${type}/settings`);
      await expect(page.getByRole("checkbox", { name: "Product updates" })).not.toBeChecked();
      await page.getByRole("checkbox", { name: "Incoming request alerts" }).uncheck();
      await app.reload();
      await expect(
        page.getByRole("checkbox", { name: "Incoming request alerts" }),
      ).not.toBeChecked();
      expect(
        (await app.rows("notificationPreferences")).find((row) => row.subject_id === added.id)
          ?.incoming_request_alerts,
      ).toBe(false);
      // Recovery selects the entered account, even after another business signs in.
      await app.goto(`/${type}/sign-in`);
      await page
        .getByLabel("Email", { exact: true })
        .fill(
          type === "pharmacy" ? "counter@greenlifepharmacy.ng" : "reception@lagosdiagnostics.ng",
        );
      await page.getByLabel("Password", { exact: true }).fill("Monovella2026!");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/${type}$`));
      await app.goto(`/${type}/settings`);
      await expect(page.getByRole("checkbox", { name: "Incoming request alerts" })).toBeChecked();
      await app.goto(`/${type}/forgot`);
      await page.getByLabel("Email", { exact: true }).fill(`new-${type}@example.test`);
      await page.getByRole("button", { name: "Send reset link", exact: true }).click();
      await page.getByRole("button", { name: "Open the link (demo)", exact: true }).click();
      await page.getByLabel("New password", { exact: true }).fill("RecoveredApplicant2026!");
      await page.getByRole("button", { name: "Reset password", exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/${type}/sign-in$`));
      await page.getByLabel("Password", { exact: true }).fill("RecoveredApplicant2026!");
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(
        page.getByRole("heading", { name: `New ${type} business`, exact: true }),
      ).toBeVisible();
      expect(
        (await app.rows("providerRequests")).filter((r) => r.provider_id === added.id),
      ).toHaveLength(0);
    },
  );
}
