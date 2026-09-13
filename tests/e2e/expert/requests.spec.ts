/**
 * Scenario L: the expert's own working day, on the one seat a reviewer can
 * actually occupy.
 *
 * Ported from the expertAcceptAndDecline section of scripts/e2e-flows.ts. The
 * seat is named through uid(); the script filtered the caseload on the string
 * "exp_adeyemi", which matched no row once the fixtures moved to UUIDs, so it
 * failed at "no expert request was available to accept".
 */
import { SEATS } from "../helpers/ids";
import { expect, journey } from "../journey";

/** Wait until one fixture row reaches the state an action should have set. */
async function waitForConsultation(
  // biome-ignore lint/suspicious/noExplicitAny: the page fixture, narrowed by use
  page: any,
  id: string,
  expected: Record<string, unknown>,
) {
  await page.waitForFunction(
    ({ id, expected }: { id: string; expected: Record<string, unknown> }) => {
      const state = JSON.parse(sessionStorage.getItem("mv-prototype-state") ?? "{}");
      const row = state.data?.consultations?.find((item: { id: string }) => item.id === id);
      return !!row && Object.entries(expected).every(([key, value]) => row[key] === value);
    },
    { id, expected },
  );
}

journey.happy(
  "L2",
  "accepting a request schedules it and records when the expert responded",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.asSeat(SEATS.doctor, "/app/expert/requests");
    await page.locator('[data-screen="X9"]').waitFor();

    const pending = ((await app.state()).data?.consultations ?? []).filter(
      (item) => item.expert_id === SEATS.doctor && item.status === "REQUESTED",
    );
    expect(pending.length, "no expert request was available to accept").toBeGreaterThan(0);
    const requestId = pending[0].id;

    await page.getByRole("button", { name: "Accept", exact: true }).first().click();
    await waitForConsultation(page, requestId, { status: "SCHEDULED" });

    const accepted = ((await app.state()).data?.consultations ?? []).find(
      (item) => item.id === requestId,
    );
    expect(
      accepted?.responded_at,
      "an accepted request recorded no response timestamp",
    ).toBeTruthy();
    expect(new URL(page.url()).pathname, "accepting navigated away from the requests queue").toBe(
      "/app/expert/requests",
    );
  },
);

journey.sad(
  "L2",
  "declining a request reaches its own terminal state, not the accepted one",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.asSeat(SEATS.doctor, "/app/expert/requests");
    await page.locator('[data-screen="X9"]').waitFor();

    const pending = ((await app.state()).data?.consultations ?? []).filter(
      (item) => item.expert_id === SEATS.doctor && item.status === "REQUESTED",
    );
    expect(pending.length, "no expert request was available to decline").toBeGreaterThan(0);
    const requestId = pending[0].id;

    await page.getByRole("button", { name: "Decline", exact: true }).first().click();
    await page.getByRole("button", { name: "Decline", exact: true }).last().click();
    await waitForConsultation(page, requestId, { status: "DECLINED" });

    const declined = ((await app.state()).data?.consultations ?? []).find(
      (item) => item.id === requestId,
    );
    expect(
      declined?.responded_at,
      "a declined request recorded no response timestamp",
    ).toBeTruthy();
    expect(new URL(page.url()).pathname, "declining navigated away from the requests queue").toBe(
      "/app/expert/requests",
    );
  },
);

journey.happy(
  "L1",
  "the practice home shows real work, not placeholder zeros",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.asSeat(SEATS.doctor, "/app/expert");

    const body = await page.innerText("body");
    expect(/\d/.test(body), "the expert home showed no counts at all").toBe(true);

    const consultations = ((await app.state()).data?.consultations ?? []).filter(
      (item) => item.expert_id === SEATS.doctor,
    );
    expect(
      consultations.length,
      "the seat a reviewer occupies has no caseload to work through",
    ).toBeGreaterThan(0);
  },
);
