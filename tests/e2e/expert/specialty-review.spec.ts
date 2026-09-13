import { SEATS } from "../helpers/ids";
import { expect, test } from "../journey";

test("a nurse specialty request reaches staff approval and preserves the original claim", async ({
  app,
  page,
}) => {
  await app.bootstrap("/app");
  await app.asSeat(SEATS.nurse, "/app/expert/credentials");
  const original = (await app.rows("experts")).find((e) => e.id === SEATS.nurse)!.credentials;
  await page.getByRole("button", { name: "Add a specialty for review", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await expect(
    sheet.getByLabel("Specialty", { exact: true }).locator('option[value="CARDIOLOGY"]'),
  ).toHaveCount(0);
  await sheet.getByLabel("Specialty", { exact: true }).selectOption("MATERNAL_CHILD_HEALTH");
  await sheet.getByLabel("Credential or fellowship number").fill("NMCN/TEST/NEW");
  await sheet.getByLabel("Consultation fee (₦)").fill("4000");
  await sheet.getByLabel("Credential expiry date").fill("2028-01-31");
  await sheet.locator('input[type="file"]').setInputFiles({
    name: "proof.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("prototype proof"),
  });
  await sheet.getByRole("button", { name: "Submit", exact: true }).click();
  await page.getByRole("link", { name: "View application", exact: true }).click();
  await expect(
    page.getByText("Your new credential is under review", { exact: true }),
  ).toBeVisible();
  const id = new URL(page.url()).searchParams.get("id")!;
  await app.goto(`/console/applications/${id}`);
  await expect(page.getByText("NMCN/TEST/NEW", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Approve", exact: true }).click();
  await app.asSeat(SEATS.nurse, "/app/expert/credentials");
  await app.reload();
  const credentials = (await app.rows("experts")).find((e) => e.id === SEATS.nurse)!.credentials;
  expect(credentials).toEqual(expect.arrayContaining(original));
  expect(credentials).toContainEqual(
    expect.objectContaining({
      specialty: "MATERNAL_CHILD_HEALTH",
      verification_status: "VERIFIED",
    }),
  );
});

test("a lab scientist with every supported specialty has no empty request form", async ({
  app,
  page,
}) => {
  await app.bootstrap("/app");
  await app.asSeat(SEATS.labScientist, "/app/expert/credentials");
  await expect(
    page.getByRole("button", { name: "Add a specialty for review", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/Every specialty currently supported/)).toBeVisible();
});
