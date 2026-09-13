import { SEATS } from "../helpers/ids";
import { expect, test } from "../journey";

for (const seat of [SEATS.nurse, SEATS.pharmacist, SEATS.labScientist, SEATS.physiotherapist]) {
  test(`fellowship additions stay outside the professional scope of ${seat}`, async ({
    app,
    page,
  }) => {
    await app.bootstrap("/app");
    await app.asSeat(seat, "/app/expert");
    await expect(page.getByRole("link", { name: /Add another credential/ })).toHaveCount(0);
    await app.goto("/app/expert/account");
    await expect(page.getByRole("link", { name: /Add another credential/ })).toHaveCount(0);
    await app.goto("/app/expert/add-credential");
    await expect(page.getByText("Fellowship tiers are for doctors", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Fellowship certificate number")).toHaveCount(0);
    await page.getByRole("link", { name: "Manage credentials", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/expert\/credentials$/);
  });
}

test("a verified doctor can still open the fellowship form", async ({ app, page }) => {
  await app.bootstrap("/app");
  await app.asSeat(SEATS.doctor, "/app/expert");
  await page.getByRole("link", { name: /Add another credential/ }).click();
  await expect(page.getByLabel("Fellowship certificate number")).toBeVisible();
});

test("a GP fellowship application offers doctor specialties and records the selected one", async ({
  app,
  page,
}) => {
  await app.bootstrap("/app");
  const expert = (await app.rows("experts")).find(
    (item) =>
      item.professional_type === "DOCTOR" &&
      item.credentials.length === 1 &&
      item.credentials[0].tier === "GP",
  );
  if (!expert) throw new Error("The demo needs a GP eligible for a fellowship");
  await app.patchSession({ role: "expert", expertId: expert.id }, "/app/expert/add-credential");
  const specialty = page.getByLabel("Specialty", { exact: true });
  for (const invalid of [
    "GENERAL_PRACTICE",
    "PHYSIOTHERAPY",
    "WOUND_CARE_GUIDANCE",
    "MEDICATION_THERAPY_MANAGEMENT",
    "RESULT_INTERPRETATION_REFERRAL",
  ])
    await expect(specialty.locator(`option[value="${invalid}"]`)).toHaveCount(0);
  await specialty.selectOption("CARDIOLOGY");
  await page.getByLabel("Fellowship certificate number").fill("WACP/DEMO/123");
  await page.getByLabel("Specialist consultation fee (₦)").fill("15000");
  await page.locator('input[type="file"]').setInputFiles({
    name: "fellowship.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("prototype document"),
  });
  await page.getByRole("button", { name: "Submit credential", exact: true }).click();
  await expect(
    page.getByText("Your new credential is under review", { exact: true }),
  ).toBeVisible();
  await app.reload();
  const updated = (await app.rows("experts")).find((item) => item.id === expert.id)!;
  expect(updated.credentials).toEqual(expect.arrayContaining(expert.credentials));
  expect(updated.credentials).toContainEqual(
    expect.objectContaining({
      tier: "SPECIALIST",
      specialty: "CARDIOLOGY",
      verification_status: "PENDING",
    }),
  );
});
