import { SEATS } from "../fixtures";
import { expect, test } from "../journey";

for (const role of ["patient", "expert"] as const) {
  test(`${role} personal details preserve the other demonstration account`, async ({
    app,
    page,
  }) => {
    await app.bootstrap("/app");
    await app.asSeat(SEATS.nurse);
    await app.patchSession({ role }, "/app/account/personal");
    const before = await app.state();
    await page.getByLabel("First name", { exact: true }).fill("Demo revised");
    await page.getByLabel("Last name", { exact: true }).fill("Name");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await app.reload();
    const after = await app.state();
    if (role === "expert") {
      expect(after.data!.patients).toEqual(before.data!.patients);
      expect(after.data!.experts.find((row) => row.id === SEATS.nurse)).toMatchObject({
        first_name: "Demo revised",
        last_name: "Name",
      });
      expect(after.data!.experts.filter((row) => row.id !== SEATS.nurse)).toEqual(
        before.data!.experts.filter((row) => row.id !== SEATS.nurse),
      );
    } else {
      expect(after.data!.experts.find((row) => row.id === SEATS.nurse)).toEqual(
        before.data!.experts.find((row) => row.id === SEATS.nurse),
      );
      expect(
        after.data!.patients.find((row) => row.id === after.session!.viewingPatientId),
      ).toMatchObject({ first_name: "Demo revised", last_name: "Name" });
      expect(after.data!.experts.find((row) => row.id === SEATS.doctor)).toMatchObject({
        first_name: "Demo revised",
        last_name: "Name",
      });
    }
  });
}

test("personal details require a name and preserve the draft when saving is unavailable", async ({
  app,
  page,
}) => {
  await app.bootstrap("/app/account/personal");
  const before = await app.state();
  await page.getByLabel("First name", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Enter a first name.", { exact: true })).toBeVisible();
  await page.getByLabel("First name", { exact: true }).fill("Revised demo");
  const show = page.getByRole("button", { name: "Show prototype controls" });
  if (await show.isVisible()) await show.click();
  await page.getByTitle("Switch this screen's state").click();
  await page.getByRole("menuitemradio", { name: "Request failed", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeDisabled();
  expect(await app.rows("patients")).toEqual(before.data!.patients);
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Revised demo");
  await page.getByTitle("Switch this screen's state").click();
  await page.getByRole("menuitemradio", { name: "Default", exact: true }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await app.reload();
  await expect(page.getByLabel("First name", { exact: true })).toHaveValue("Revised demo");
});
