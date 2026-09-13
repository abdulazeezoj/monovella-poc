/**
 * Scenario L: professional scope of practice across the five expert seats.
 *
 * Ported from scripts/professional-scope-flow.ts, with every seat and case
 * resolved through uid(). The script used generator slugs for both, so once the
 * fixtures moved to UUIDs it seated the reviewer as nobody and opened a
 * not-found page — where a Prescriptions tab is of course absent, which is what
 * the advisory-seat assertions were checking for.
 *
 * Prescribing and lab ordering are allow-listed to DOCTOR under NMCN, PCN and
 * MLSCN scope of practice, which this prototype treats as assumed and
 * advisor-informed until validated. The point of these tests is that hiding a
 * tab is presentation: the panel is a real route, so a copied link, a bookmark
 * or a restored session has to land on a stated refusal rather than the form.
 */
import { SEAT_CASES, SEATS } from "../helpers/ids";
import { expect, journey } from "../journey";

const SEAT_LIST = [
  { key: "doctor", type: "DOCTOR", mayIssue: true },
  { key: "nurse", type: "NURSE", mayIssue: false },
  { key: "pharmacist", type: "PHARMACIST", mayIssue: false },
  { key: "labScientist", type: "LAB_SCIENTIST", mayIssue: false },
  { key: "physiotherapist", type: "PHYSIOTHERAPIST", mayIssue: false },
] as const;

const REFUSALS = [
  ["rx", "Prescribing is not in your scope"],
  ["labs", "Ordering lab tests is not in your scope"],
] as const;

journey.happy(
  "L11",
  "every professional seat has a working workspace and can contribute to the record",
  async ({ app, page }) => {
    await app.bootstrap("/app");

    for (const seat of SEAT_LIST) {
      await app.asSeat(SEATS[seat.key], `/app/expert/consultations/${SEAT_CASES[seat.key]}`);

      // Consultation, monitoring, education, result interpretation, referral
      // and escalation stay available to every type.
      await page.getByRole("tab", { name: "Chat", exact: true }).waitFor();
      await page.getByRole("tab", { name: "Refer", exact: true }).waitFor();

      const rx = page.getByRole("tab", { name: /^Rx/ });
      const labs = page.getByRole("tab", { name: /^Labs/ });

      if (seat.mayIssue) {
        await rx.waitFor();
        await labs.waitFor();
        await rx.click();
        await page
          .getByRole("button", { name: /^Issue/ })
          .first()
          .waitFor();
        continue;
      }

      expect(await rx.count(), `${seat.type} was offered a prescriptions tab`).toBe(0);
      expect(await labs.count(), `${seat.type} was offered a lab orders tab`).toBe(0);
    }
  },
);

journey.sad(
  "L11",
  "a direct link to an issuing panel is refused by name for an advisory seat",
  async ({ app, page }) => {
    await app.bootstrap("/app");

    for (const seat of SEAT_LIST) {
      await app.asSeat(SEATS[seat.key], "/app/expert");

      for (const [tab, refusal] of REFUSALS) {
        await app.goto(`/app/expert/consultations/${SEAT_CASES[seat.key]}?tab=${tab}`);

        if (seat.mayIssue) {
          expect(
            await page.getByRole("heading", { name: refusal }).count(),
            `a Doctor was refused the ${tab} panel`,
          ).toBe(0);
          continue;
        }

        await page.getByRole("heading", { name: refusal }).waitFor();
        expect(
          await page.getByRole("button", { name: /^Issue/ }).count(),
          `${seat.type} reached an issuing control through a direct ${tab} link`,
        ).toBe(0);
      }
    }
  },
);

journey.sad(
  "L11",
  "an advisory seat creates no prescription even while working the case",
  async ({ app, page }) => {
    await app.bootstrap("/app");
    await app.asSeat(SEATS.nurse, `/app/expert/consultations/${SEAT_CASES.nurse}`);

    const before = (await app.rows("prescriptions")).length;

    await page.getByRole("tab", { name: "Refer", exact: true }).click();
    await page.getByRole("tab", { name: "Guest", exact: true }).click();

    expect((await app.rows("prescriptions")).length, "a nurse seat created a prescription").toBe(
      before,
    );
  },
);
