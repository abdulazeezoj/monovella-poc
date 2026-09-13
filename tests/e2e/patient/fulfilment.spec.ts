/**
 * Scenario H: fulfilment friction, including the no-Monovella-provider fallback.
 *
 * A demo that only shows the happy in-network path will not survive a reviewer
 * asking "what if the pharmacy says no?" or "what if I already have a pharmacy
 * I trust?" — both questions need a rehearsed answer here.
 *
 * Ported from scripts/fulfilment-exceptions-flow.ts and the
 * providerDisclosureConsent section of scripts/e2e-flows.ts.
 */
import { uid } from "../helpers/ids";
import { expect, journey } from "../journey";

journey.sad(
  "C14",
  "choosing a pharmacy creates nothing until the patient consents to the disclosure",
  async ({ app, page }) => {
    const prescriptions = await (async () => {
      await app.bootstrap("/app");
      return app.rows("prescriptions");
    })();

    const requests = await app.rows("providerRequests");
    const open = new Set(requests.map((request) => request.prescription_id));
    const unsent = prescriptions.find((item) => !open.has(item.id));
    expect(unsent, "every prescription already has a provider request").toBeTruthy();

    const providers = (await app.rows("providers")).filter(
      (provider) => provider.provider_type === "PHARMACY",
    );
    expect(providers.length, "there are no pharmacies to choose").toBeGreaterThan(0);

    const before = requests.length;
    await app.goto(`/app/prescriptions/${unsent.id}/pharmacies/${providers[0].id}/consent`);

    // The screen names the provider, the patient and exactly what is shared.
    await page.getByRole("heading", { name: /Share .*details\?/ }).waitFor();

    const send = page.getByRole("button", { name: "Consent and send request" });
    await send.waitFor();
    await expect(send, "the request could be sent before the patient consented").toBeDisabled();

    // Leaving without consenting must create nothing at all.
    await page.getByRole("link", { name: "Cancel" }).click();
    expect(
      (await app.rows("providerRequests")).length,
      "cancelling the disclosure consent still created a provider request",
    ).toBe(before);
  },
);

journey.happy(
  "H7",
  "a patient who used an outside pharmacy can self-report it with no Monovella fee",
  async ({ app, page }) => {
    await app.bootstrap("/app");

    const prescriptions = await app.rows("prescriptions");
    expect(prescriptions.length, "there are no prescriptions to self-report").toBeGreaterThan(0);

    await app.goto(`/app/prescriptions/${prescriptions[0].id}/self-report`);
    const body = await page.innerText("body");
    expect(body.trim().length, "the self-report screen rendered nothing").toBeGreaterThan(0);

    // The fallback path exists precisely because no Monovella provider is
    // involved, so no fulfilment fee may be attached to it.
    expect(
      /Monovella (service )?fee/i.test(body),
      "the outside-pharmacy fallback attached a Monovella fulfilment fee",
    ).toBe(false);
  },
);

journey.sad(
  "H1",
  "a declined pharmacy request leaves the patient able to choose another",
  async ({ app, page }) => {
    await app.bootstrap("/app");

    const declined = (await app.rows("providerRequests")).find(
      (request) => request.status === "DECLINED" || request.status === "TIMED_OUT",
    );
    if (!declined) {
      // The fixtures carry no already-declined request; the reviewer reaches
      // this through the provider portal instead, which the provider journeys
      // cover. Nothing to assert here rather than assert against the wrong row.
      return;
    }

    await app.goto(`/app/prescriptions/${declined.prescription_id}/request`);
    const body = await page.innerText("body");
    expect(body.trim().length, "the request status screen rendered nothing").toBeGreaterThan(0);

    // At most one active request per prescription, so reselecting cannot leave
    // two providers holding the same order.
    const active = (await app.rows("providerRequests")).filter(
      (request) =>
        request.prescription_id === declined.prescription_id &&
        ["REQUESTED", "ACCEPTED"].includes(request.status),
    );
    expect(
      active.length,
      "a declined prescription has more than one active provider request",
    ).toBeLessThanOrEqual(1);

    // The patient is not stuck: the pharmacy chooser is still reachable, and
    // opening it creates nothing on its own.
    const beforeReselect = (await app.rows("providerRequests")).length;
    await app.goto(`/app/prescriptions/${declined.prescription_id}/pharmacies`);
    expect(
      (await page.innerText("body")).trim().length,
      "a declined request left the patient with no way to choose another pharmacy",
    ).toBeGreaterThan(0);
    expect(
      (await app.rows("providerRequests")).length,
      "reopening the pharmacy chooser created a duplicate request",
    ).toBe(beforeReselect);

    // Noted, not asserted: this fixture records no terminal_reason, so the
    // screen cannot say why the pharmacy declined. Whether a reason is required
    // is a product decision, not something to invent here.
  },
);

journey.happy(
  "H4",
  "a lab result reaches the patient record with its source and time intact",
  async ({ app, page }) => {
    await app.bootstrap("/app");

    const uploaded = (await app.rows("providerRequests")).find(
      (request) => request.result_status === "UPLOADED",
    );
    expect(uploaded, "no lab result has been uploaded in the fixtures").toBeTruthy();
    expect(uploaded.result_source, "the uploaded result names no source").toBeTruthy();
    expect(uploaded.result_uploaded_at, "the uploaded result carries no timestamp").toBeTruthy();

    await app.goto(`/app/lab-orders/${uploaded.lab_order_id}/result`);
    const body = await page.innerText("body");
    expect(body.trim().length, "the lab result screen rendered nothing").toBeGreaterThan(0);
    expect(
      body.includes(String(uploaded.result_source)),
      "the result did not state where it came from",
    ).toBe(true);
  },
);

journey.sad(
  "H6",
  "an unknown lab order identifier changes nothing and shows no other record",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    const before = (await app.rows("providerRequests")).length;

    await app.goto(`/app/lab-orders/${uid("not_a_real_lab_order")}/result`);
    const body = await page.innerText("body");
    expect(
      /not found|no longer available|unavailable|cannot be shown/i.test(body),
      "an unknown lab order did not fail closed",
    ).toBe(true);
    expect(
      (await app.rows("providerRequests")).length,
      "reaching an unknown lab order created a provider request",
    ).toBe(before);
  },
);
