import { expect, journey } from "../journey";

journey.happy(
  "I1",
  "personal name, photo and verified phone changes persist together",
  async ({ app, page }) => {
    await app.bootstrap("/app/account/personal");
    await page.getByLabel("First name", { exact: true }).fill("Demo Amara");
    await page.getByLabel("Last name", { exact: true }).fill("Okonkwo Updated");
    const input = page.locator('input[type="file"]');
    await input.setInputFiles({
      name: "document.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-demo"),
    });
    await expect(page.getByText(/That file type isn't supported here/)).toBeVisible();
    await input.setInputFiles({
      name: "broken.png",
      mimeType: "image/png",
      buffer: Buffer.from("invalid image data"),
    });
    await expect(page.getByText(/We could not open that image/)).toBeVisible();
    const bytes = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#326bac";
      context.fillRect(0, 0, 1024, 1024);
      context.fillStyle = "#ffc52a";
      context.fillRect(0, 0, 512, 1024);
      return canvas.toDataURL("image/png").split(",")[1];
    });
    await input.setInputFiles({
      name: "demo-photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(bytes, "base64"),
    });
    const preview = page.locator('[data-screen="P58a"] img');
    await expect(preview).toHaveAttribute("src", /^data:image\/jpeg;base64,/);
    const source = await preview.getAttribute("src");
    await expect(page.getByText(/We could not open that image/)).toHaveCount(0);
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await app.reload();
    await expect(preview).toHaveAttribute("src", source!);
    await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Demo Amara");
    await expect(page.getByLabel("Last name", { exact: true })).toHaveValue("Okonkwo Updated");
    await page.getByRole("link", { name: "Change", exact: true }).click();
    await page.getByLabel("New phone number").fill("08062223344");
    await page.getByRole("button", { name: "Send a code", exact: true }).click();
    await page.getByLabel("Verification code").fill("864200");
    await page.getByRole("button", { name: "Verify", exact: true }).click();
    await page.waitForURL("**/app/account/personal");
    await app.reload();
    await expect(page.getByText("08062223344", { exact: true })).toBeVisible();
    await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Demo Amara");
    await expect(page.getByLabel("Last name", { exact: true })).toHaveValue("Okonkwo Updated");
    await expect(preview).toHaveAttribute("src", source!);
    expect(await preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(512);
    await page.getByRole("button", { name: "Remove this file", exact: true }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await app.reload();
    await expect(preview).toHaveCount(0);
    const state = await app.state();
    expect(
      state.data!.patients.find((row) => row.id === state.session!.viewingPatientId).photo_url,
    ).toBeNull();
  },
);
