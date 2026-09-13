/**
 * Scenarios C and M: the Pharmacy and Lab portals accept work and are held at
 * the point where money has not yet changed hands.
 *
 * Ported from the providerFulfilment section of scripts/e2e-flows.ts, with every
 * request, prescription and lab-order identifier resolved through uid().
 *
 * The guard these prove matters more than the acceptance: a provider may start
 * preparing an order at their own risk, but no handoff state and no result may
 * reach the patient before their checkout is actually paid.
 */
import { uid } from "../helpers/ids";
import { expect, journey } from "../journey";

const PHARMACY_REQUEST = uid("preq_101");
const LAB_REQUEST = uid("preq_201");
const LAB_ORDER = uid("lab_003");

/** Wait until one provider request reaches the state an action should have set. */
async function waitForRequest(
  // biome-ignore lint/suspicious/noExplicitAny: the page fixture, narrowed by use
  page: any,
  id: string,
  expected: Record<string, unknown>,
) {
  await page.waitForFunction(
    ({ id, expected }: { id: string; expected: Record<string, unknown> }) => {
      const state = JSON.parse(sessionStorage.getItem("mv-prototype-state") ?? "{}");
      const row = state.data?.providerRequests?.find((item: { id: string }) => item.id === id);
      return !!row && Object.entries(expected).every(([key, value]) => row[key] === value);
    },
    { id, expected },
  );
}

journey.happy(
  "M4",
  "a pharmacy accepts a request and records its quoted price",
  async ({ app, page }) => {
    await app.bootstrap(`/pharmacy/requests/${PHARMACY_REQUEST}`);
    await page.locator('[data-screen="V7"]').waitFor();

    await page.getByRole("button", { name: "Accept", exact: true }).click();
    await waitForRequest(page, PHARMACY_REQUEST, { status: "ACCEPTED" });

    const request = (await app.rows("providerRequests")).find(
      (item) => item.id === PHARMACY_REQUEST,
    );
    expect(request.responded_at, "acceptance recorded no response timestamp").toBeTruthy();
    expect(request.amount_kobo, "acceptance did not record the quoted price").toBe(650000);
    expect(new URL(page.url()).pathname, "accepting navigated away from V7").toBe(
      `/pharmacy/requests/${PHARMACY_REQUEST}`,
    );
  },
);

journey.sad(
  "M4",
  "a pharmacy cannot reach a handoff state before the patient has paid",
  async ({ app, page }) => {
    await app.bootstrap(`/pharmacy/requests/${PHARMACY_REQUEST}`);
    await page.locator('[data-screen="V7"]').waitFor();
    await page.getByRole("button", { name: "Accept", exact: true }).click();
    await waitForRequest(page, PHARMACY_REQUEST, { status: "ACCEPTED" });

    // Preparing at the provider's own risk is allowed. Telling the patient the
    // medicine is ready, or that it is on its way, is not.
    await page.getByRole("button", { name: "Preparing", exact: true }).click();
    await waitForRequest(page, PHARMACY_REQUEST, { order_status: "PREPARING" });

    for (const label of ["Ready for pickup", "Out for delivery", "Fulfilled"]) {
      await expect(
        page.getByRole("button", { name: label, exact: true }),
        `the pharmacy could reach "${label}" before the patient's checkout was paid`,
      ).toBeDisabled();
    }
  },
);

journey.happy("M4", "a lab accepts a request", async ({ app, page }) => {
  await app.bootstrap(`/lab/requests/${LAB_REQUEST}`);
  await page.locator('[data-screen="V7"]').waitFor();

  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await waitForRequest(page, LAB_REQUEST, { status: "ACCEPTED" });

  const accepted = (await app.rows("providerRequests")).find((item) => item.id === LAB_REQUEST);
  expect(accepted.responded_at, "lab acceptance recorded no response timestamp").toBeTruthy();
  expect(new URL(page.url()).pathname, "accepting navigated away from V7").toBe(
    `/lab/requests/${LAB_REQUEST}`,
  );
});

journey.sad(
  "M5",
  "a lab result cannot reach the patient's record before the visit is paid for",
  async ({ app, page }) => {
    await app.bootstrap(`/lab/requests/${LAB_REQUEST}`);
    await page.locator('[data-screen="V7"]').waitFor();
    await page.getByRole("button", { name: "Accept", exact: true }).click();
    await waitForRequest(page, LAB_REQUEST, { status: "ACCEPTED" });

    await page.getByRole("button", { name: /Upload the report/ }).click();
    await expect(
      page.getByRole("button", { name: "Send to the patient's record", exact: true }),
      "the lab could send a result before the patient's checkout was paid",
    ).toBeDisabled();

    const order = (await app.rows("labOrders")).find((item) => item.id === LAB_ORDER);
    expect(order.result_status, "an unpaid lab request attached a result to the case").not.toBe(
      "ATTACHED",
    );
  },
);

for (const [portal, requestId] of [
  ["pharmacy", PHARMACY_REQUEST],
  ["lab", LAB_REQUEST],
]) {
  journey.sad(
    "M4",
    `${portal} rejects invalid quotes and retains the accepted price on reload`,
    async ({ app, page }) => {
      await app.bootstrap(`/${portal}/requests/${requestId}`);
      const price = page.getByLabel("Your confirmed price (₦)");
      for (const invalid of ["letters", "0", "-1", "Infinity", "1e3", "1.234"]) {
        await price.fill(invalid);
        await expect(page.getByRole("button", { name: "Accept", exact: true })).toBeDisabled();
      }
      await expect(
        page.getByText("Enter a positive amount with no more than two decimal places.", {
          exact: true,
        }),
      ).toBeVisible();
      await price.fill("7500.25");
      await page.getByRole("button", { name: "Accept", exact: true }).click();
      await app.reload();
      const revised = page.getByLabel("Revised price before checkout (₦)");
      await expect(revised).toHaveValue("7500.25");
      await revised.fill("not a price");
      await expect(page.getByRole("button", { name: "Update price", exact: true })).toBeDisabled();
      expect(
        (await app.rows("providerRequests")).find((item) => item.id === requestId).amount_kobo,
      ).toBe(750025);
    },
  );
}

journey.sad(
  "M4",
  "a completed pharmacy order has no route back to preparation or cancellation",
  async ({ app, page }) => {
    const completedId = uid("preq_104");
    await app.bootstrap(`/pharmacy/requests/${completedId}`);
    const before = (await app.rows("providerRequests")).find((item) => item.id === completedId);
    expect(before.order_status).toBe("FULFILLED");
    for (const name of ["Preparing", "Ready for pickup", "Out for delivery", "Fulfilled"]) {
      await expect(page.getByRole("button", { name, exact: true })).toBeDisabled();
    }
    await expect(page.getByRole("button", { name: "Unable to fulfil", exact: true })).toHaveCount(
      0,
    );
    await app.reload();
    expect((await app.rows("providerRequests")).find((item) => item.id === before.id)).toEqual(
      before,
    );
  },
);
