import { uid } from "../helpers/ids";
import { expect, test } from "../journey";

test("application previews do not replace the recorded decision", async ({ app, page }) => {
  await app.bootstrap("/app");
  const link = (await app.rows("governanceApplications")).find(
    (item) => item.application_id === uid("app_009"),
  );
  if (!link?.actor_id) throw new Error("A linked application is required for this check");
  await app.patchSession(
    { role: "expert", expertId: link.actor_id },
    `/app/expert/application?id=${link.application_id}`,
  );
  const before = await app.rows("applicationDetails");
  const application = before.find((item) => item.id === link.application_id);
  expect(application?.status).toBe("PENDING");
  await expect(page.getByText("Your renewal is under review", { exact: true })).toBeVisible();
  await app.selectScreenState("Verified");
  await expect(page.getByText("You're verified", { exact: true })).toBeVisible();
  await app.selectScreenState("Rejected");
  await expect(page.getByText("We couldn't approve this", { exact: true })).toBeVisible();
  await app.selectScreenState("Pending");
  await expect(page.getByText("Your renewal is under review", { exact: true })).toBeVisible();
  expect(await app.rows("applicationDetails")).toEqual(before);
  await app.selectScreenState("Verified");
  await app.reload();
  await expect(page.getByText("Your renewal is under review", { exact: true })).toBeVisible();
});
