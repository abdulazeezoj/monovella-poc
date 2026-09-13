/**
 * Scenario N: the documented 409, and the applicant's own view of a decision.
 *
 * Ported from the browser half of scripts/governance-lifecycle.ts. Its pure
 * lifecycle half — approvals, renewals, disputes, standing and staff
 * provisioning against the real dataset — is
 * tests/integration/governance-lifecycle.test.ts.
 *
 * Two staff members deciding the same queue item at once is the race the
 * product specification names by hand. The second one must see the conflict,
 * not silently overwrite the first.
 */
import { uid } from "../helpers/ids";
import { expect, journey } from "../journey";

const RENEWAL_APPLICATION = uid("app_009");

journey.sad(
  "N5",
  "a queue item already decided by another reviewer refuses a second decision",
  async ({ app, page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await app.goto(`/console/applications/${RENEWAL_APPLICATION}`);
    await page.getByRole("heading", { name: "Dr. Tunde Ogunleye" }).waitFor();

    await app.selectScreenState("409 already reviewed");

    await expect(
      page.getByRole("button", { name: "Approve" }),
      "a stale decision was still allowed to overwrite the first one",
    ).toBeDisabled();
  },
);

journey.sad(
  "N4",
  "an applicant cannot open an application that is not theirs",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.goto(`/app/expert/application?id=${RENEWAL_APPLICATION}`);

    await page.getByText("Application unavailable", { exact: true }).first().waitFor();
  },
);

journey.happy(
  "N4",
  "the applications queue lists work for staff to pick up",
  async ({ app, page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await app.goto("/console/applications");

    const queue = await app.rows("applicationsQueue");
    expect(queue.length, "the applications queue is empty").toBeGreaterThan(0);
    expect(
      (await page.innerText("body")).trim().length,
      "the applications queue rendered nothing",
    ).toBeGreaterThan(0);
  },
);
