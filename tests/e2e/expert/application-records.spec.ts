import { SEATS } from "../helpers/ids";
import { expect, journey } from "../journey";

journey.sad(
  "K2",
  "a nurse receives the actual renewal decision and another expert cannot open it",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.asSeat(SEATS.nurse, "/app/expert/renew-licence");
    await page.getByLabel("NMCN licence number", { exact: true }).fill("NMCN/TEST/RENEWAL");
    await page.getByLabel("New expiry date", { exact: true }).fill("2028-01-31");
    await page.locator('input[type="file"]').setInputFiles({
      name: "nurse-renewal.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("prototype sample"),
    });
    await page.getByRole("button", { name: "Submit renewal", exact: true }).click();
    await page.getByRole("heading", { name: "Your renewal", exact: true }).waitFor();
    const id = new URL(page.url()).searchParams.get("id")!;
    expect(id).toBeTruthy();
    await expect(page.getByText("NMCN/TEST/RENEWAL", { exact: true })).toBeVisible();
    await expect(page.getByText("29 Aug 2026", { exact: true })).toBeVisible();
    await app.goto("/app/expert/renew-licence");
    await expect(
      page.getByText("A renewal is already pending review.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Submit renewal", exact: true })).toBeDisabled();
    await page.getByRole("link", { name: "See it", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`id=${id}`));
    await app.goto(`/console/applications/${id}`);
    await page.getByRole("button", { name: "Decline", exact: true }).click();
    const modal = page.getByRole("alertdialog", { name: "Decline this application", exact: true });
    const reason = "Upload the complete certificate; page two is missing.";
    await modal.getByLabel("Reason", { exact: true }).fill(reason);
    await modal.getByRole("button", { name: "Decline", exact: true }).click();
    await app.asSeat(SEATS.nurse, `/app/expert/application?renewal=1&id=${id}`);
    await expect(page.getByText(reason, { exact: true })).toBeVisible();
    await expect(page.getByText("NMCN/TEST/RENEWAL", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Reapply", exact: true })).toHaveAttribute(
      "href",
      "/app/expert/renew-licence",
    );
    await app.reload();
    await expect(page.getByText(reason, { exact: true })).toBeVisible();
    await app.asSeat(SEATS.doctor, `/app/expert/application?renewal=1&id=${id}`);
    await expect(page.getByText("Application unavailable", { exact: true }).first()).toBeVisible();
    await expect(page.getByText(reason, { exact: true })).toHaveCount(0);
  },
);

journey.happy(
  ["K1", "K2"],
  "an application preserves the entered profile through staff approval",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.asSeat(SEATS.nurse, "/app/expert/apply");
    await page.getByLabel("First name", { exact: true }).fill("Ada");
    await page.getByLabel("Last name", { exact: true }).fill("Test");
    await page.getByLabel("Email", { exact: true }).fill("ada@example.com");
    await page.getByLabel("Gender", { exact: true }).selectOption("FEMALE");
    await page.getByLabel("Practice address", { exact: true }).fill("12 Test Road");
    await page.getByLabel("City", { exact: true }).fill("Ikeja");
    await page.getByLabel("State", { exact: true }).click();
    await page.getByPlaceholder("Search states").fill("Lagos");
    await page
      .getByRole("dialog", { name: "Choose a state" })
      .getByText("Lagos", { exact: true })
      .click();
    await page.getByLabel("Local Government Area", { exact: true }).click();
    await page.getByPlaceholder("Search LGAs").fill("Ikeja");
    await page.getByRole("dialog").getByText("Ikeja", { exact: true }).click();
    await page.getByLabel("Professional type", { exact: true }).selectOption("NURSE");
    await page.getByLabel("Specialty", { exact: true }).selectOption("WOUND_CARE_GUIDANCE");
    await page.getByLabel("NMCN licence number", { exact: true }).fill("NMCN/TEST/12");
    await page.getByLabel("Licence expiry date", { exact: true }).fill("2028-01-31");
    await page.getByLabel("Consultation fee (₦)", { exact: true }).fill("4000");
    await page.locator('input[type="file"]').setInputFiles({
      name: "ada-certificate.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("prototype sample"),
    });
    await page.getByRole("button", { name: "Submit application", exact: true }).click();
    await page.getByRole("heading", { name: "Your application", exact: true }).waitFor();
    await expect(page.getByText("Under review by Monovella", { exact: true })).toBeVisible();
    const id = new URL(page.url()).searchParams.get("id")!;
    await app.goto("/app/expert/apply");
    await expect(
      page.getByText("You already have an application on this account.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit application", exact: true }),
    ).toBeDisabled();
    await page.getByRole("link", { name: "See it", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`id=${id}`));
    await app.goto(`/console/applications/${id}`);
    await expect(page.getByText("ada@example.com", { exact: true })).toBeVisible();
    await expect(page.getByText("NMCN/TEST/12", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await page
      .getByRole("alertdialog", { name: "Approve this application", exact: true })
      .getByRole("button", { name: "Approve", exact: true })
      .click();
    await app.asSeat(SEATS.nurse, `/app/expert/application?new=1&id=${id}`);
    await expect(page.getByText("You're verified", { exact: true })).toBeVisible();
    await app.reload();
    await expect(page.getByText("You're verified", { exact: true })).toBeVisible();
    const experts = await app.rows("experts");
    expect(experts.find((item) => item.id === SEATS.nurse)).toMatchObject({
      first_name: "Ada",
      last_name: "Test",
      professional_type: "NURSE",
      address: "12 Test Road",
      consultation_fee_kobo: 400000,
      credentials: expect.arrayContaining([
        expect.objectContaining({
          licence_or_fellowship_number: "NMCN/TEST/12",
          verification_status: "VERIFIED",
        }),
      ]),
    });
  },
);
