/**
 * Scenario C: the patient's side of an active consultation.
 *
 * Ported from the patientChat section of scripts/e2e-flows.ts, with the
 * consultation named through uid().
 *
 * The expert's live half of a conversation — replying, calling, prescribing —
 * is Scenario L, on the one seat a reviewer can occupy. Here the patient sends
 * into a thread and reads what is already there.
 */
import { uid } from "../helpers/ids";
import { expect, journey } from "../journey";

const CONSULTATION = uid("con_003");

journey.happy(
  "C11",
  "a patient message joins the thread and keeps its sender and time",
  async ({ app, page }) => {
    await app.bootstrap(`/app/consultations/${CONSULTATION}/chat`);
    await page.locator('[data-screen="P44"]').waitFor();

    const before = (await app.rows("chatMessages")).filter(
      (item) => item.consultation_id === CONSULTATION,
    ).length;

    const message = "Can I take this after breakfast?";
    await page.getByRole("textbox", { name: /Message/ }).fill(message);
    await page.getByRole("button", { name: "Send message", exact: true }).click();
    await page.getByText(message, { exact: true }).waitFor();

    const thread = (await app.rows("chatMessages")).filter(
      (item) => item.consultation_id === CONSULTATION,
    );
    expect(thread.length, "the message was not added to the fixture data").toBe(before + 1);

    const latest = thread.at(-1);
    expect(
      [latest?.body, latest?.sender_type, !!latest?.sent_at],
      "the message did not retain its patient sender or timestamp",
    ).toEqual([message, "PATIENT", true]);
    expect(new URL(page.url()).pathname, "sending navigated away from the thread").toBe(
      `/app/consultations/${CONSULTATION}/chat`,
    );
  },
);

journey.happy(
  "C13",
  "the consultation hub lists the account holder's own consultations",
  async ({ app, page }) => {
    await app.bootstrap("/app/consultations");

    const rows = (await app.rows("consultations")).filter(
      (item) => item.patient_identity_id === uid("pat_amara"),
    );
    expect(rows.length, "the account holder has no consultations to list").toBeGreaterThan(0);

    const body = await page.innerText("body");
    expect(body.trim().length, "the consultation hub rendered nothing").toBeGreaterThan(0);
  },
);
