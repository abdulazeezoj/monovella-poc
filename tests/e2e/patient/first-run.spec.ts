/**
 * Scenario A: the real entry path, from the landing page to discovery.
 *
 * Every other journey starts inside an established account, which is exactly
 * the part a new person never gets to skip. Ported from
 * scripts/first-run-flow.ts.
 *
 * Two real defects this walk found the first time it was written, both still
 * asserted here: completing sign-up never marked the session authenticated, so
 * a genuinely new account carried on as an unauthenticated one; and "Do this
 * later" on identity verification called history back, landing the person on
 * the profile form they had just submitted.
 *
 * Completing this proves the screens connect. It is not evidence of conversion:
 * these are fixtures, not people. The drop-off points below are recorded as
 * questions for a real walkthrough to answer, never as findings.
 */
import { expect, journey } from "../journey";

/** Where a new person can fall out. Questions, not conclusions. */
const DROP_OFF_QUESTIONS = [
  "Landing: does an invited person understand they are creating their own account, not joining the inviter's?",
  "OTP: with no real SMS, does a person know where the code is meant to come from?",
  "Profile: is it clear why date of birth and location are needed before any care?",
  "Identity: how many people stop at the NIN step, and what do they do instead?",
  "Identity: of the people who choose 'Do this later', how many ever come back to verify?",
  "Discovery: can a first-time person tell the consultation fee from the total before tapping in?",
];

journey.happy(
  "A7",
  "a referral link names the inviter without promising endorsement or free care",
  async ({ app, page }) => {
    await app.bootstrap("/?ref=EXP-ADEYEMI&region=Lagos");

    await expect(
      page.getByText(/invited you to explore Monovella|invite/i).first(),
      "the landing page lost the referral context",
    ).toBeVisible();

    const landing = await page.innerText("body");
    expect(
      /free consultation|guaranteed|recommends this doctor/i.test(landing),
      "the referral landing implied endorsement, availability or free care",
    ).toBe(false);
  },
);

journey.sad(
  "A5",
  "a signed-out person reaching a protected route lands on Welcome",
  async ({ app, page }) => {
    await app.bootstrap("/");
    // Not signed in, and nothing revoked: the state a brand-new person is in.
    await app.patchSession({ authenticated: false, access: "GRANTED" });
    await page.evaluate(() => sessionStorage.removeItem("mv-auth-journey-v1"));

    await page.goto("/app/reports");
    await page.waitForURL("**/app/welcome");
    await app.ready();
  },
);

journey.happy(
  ["A2", "A3", "A4", "A5", "A6"],
  "sign-up survives a reload, creates an authenticated session and reaches discovery",
  async ({ app, page }) => {
    await app.bootstrap("/?ref=EXP-ADEYEMI&region=Lagos");
    await app.patchSession({ authenticated: false, access: "GRANTED" });
    await page.evaluate(() => sessionStorage.removeItem("mv-auth-journey-v1"));

    await app.goto("/app/sign-up?ref=EXP-ADEYEMI&region=Lagos");
    expect(
      await page.getByLabel("Have a referral code?").inputValue(),
      "the referral code did not survive the move from landing to sign-up",
    ).toBe("EXP-ADEYEMI");

    await page.getByLabel("First name").fill("Chidinma");
    await page.getByLabel("Last name").fill("Nwachukwu");
    await page.getByLabel("Phone number").fill("0806 222 3344");

    // Separate, unchecked acknowledgements: neither may be pre-ticked, and
    // neither may stand in for the other.
    const terms = page.getByRole("checkbox", { name: /I have read and agree to the Terms/ });
    const privacy = page.getByRole("checkbox", {
      name: /I have read the Data and Privacy Policy/,
    });
    expect(await terms.isChecked(), "the Terms acknowledgement was pre-accepted").toBe(false);
    expect(await privacy.isChecked(), "the Privacy acknowledgement was pre-accepted").toBe(false);
    await expect(
      page.getByRole("button", { name: "Send code" }),
      "sign-up could proceed without either acknowledgement",
    ).toBeDisabled();

    await terms.check();
    await privacy.check();
    await page.getByRole("button", { name: "Send code" }).click();

    // An interruption mid-journey must not cost the person their place.
    await app.reload();
    await page.getByLabel("Verification code").fill("246810");
    await page.getByRole("button", { name: "Verify code" }).click();
    await page.getByText("Set your PIN", { exact: true }).waitFor();

    await page.getByLabel("Choose a PIN").fill("135790");
    await page.getByLabel("Confirm your PIN").fill("135790");
    await page.getByRole("button", { name: "Create my Monovella ID" }).click();
    await page.waitForURL("**/app/profile/create");
    await app.ready();

    // Completing sign-up must actually mark the session signed in. It did not,
    // once, and nothing noticed because the demo session starts signed in.
    const session = (await app.state()).session;
    expect(session?.authenticated, "completing sign-up left the session unauthenticated").toBe(
      true,
    );

    await page.getByLabel("Date of birth").fill("1994-03-18");
    await page.getByLabel("Gender").selectOption({ index: 1 });
    await page.getByLabel("Address").fill("18 Adeniyi Jones Avenue");
    await page.getByLabel("City").fill("Ikeja");
    // State and LGA are searchable pickers, not native selects: an LGA list is
    // far too long to scroll on a phone.
    await page.getByLabel("State").click();
    await page.getByPlaceholder("Search states").fill("Lagos");
    await page
      .getByRole("dialog", { name: "Choose a state" })
      .getByText("Lagos", { exact: true })
      .click();
    await page.getByLabel("Local Government Area").click();
    await page.getByPlaceholder("Search LGAs").fill("Ikeja");
    await page.getByRole("dialog").getByText("Ikeja", { exact: true }).click();

    const proceed = page.getByRole("button", { name: "Continue" });
    await expect(
      proceed,
      "the patient record could not be completed with every required field filled",
    ).toBeEnabled();
    await proceed.click();
    await page.waitForURL("**/app/verify-id");
    await app.ready();

    // Verification unlocks paid booking, and the screen has to say so rather
    // than reading as an optional extra with no consequence.
    const verifyText = await page.innerText("body");
    expect(
      /unlocks booking|unlock booking/i.test(verifyText),
      "P13 did not explain what verification actually unlocks",
    ).toBe(true);
    expect(
      /find this one record with your Monovella ID/i.test(verifyText),
      "P13 still implied that a Monovella ID alone opens a record",
    ).toBe(false);

    const fresh = await app.state();
    const patient = fresh.data?.patients.find(
      (item: { id: string }) => item.id === fresh.session?.viewingPatientId,
    );
    expect(patient).toMatchObject({
      first_name: "Chidinma",
      last_name: "Nwachukwu",
      date_of_birth: "1994-03-18",
      address: "18 Adeniyi Jones Avenue",
      city: "Ikeja",
      state: "Lagos",
      status: "UNVERIFIED",
    });
    expect(
      (await app.rows("consultations")).filter((item) => item.patient_identity_id === patient.id),
    ).toHaveLength(0);
    expect(
      (await app.rows("experts")).find((item) => item.id === fresh.session?.expertId)?.credentials,
    ).toEqual([]);

    // Deferring is a real option and must not strand the person back on the
    // form they just submitted.
    await page.getByRole("button", { name: /Do this later/ }).click();
    await page.waitForURL(/\/app(?!\/profile\/create)/);
    await app.ready();

    for (const [route, text] of [
      ["/app/consultations", "No consultations yet"],
      ["/app/dependants", "You're not managing anyone else's care yet"],
      ["/app/account/payment-methods", "No saved cards"],
    ]) {
      await app.goto(route);
      await expect(page.getByText(text, { exact: true })).toBeVisible();
    }
    for (const [route, heading] of [
      ["/app/account/notifications", "Notification preferences"],
      ["/app/account/two-factor", "Two-step verification"],
      ["/app/expert/renew-licence", "No licence to renew"],
      ["/app/expert/add-credential", "Apply to practise first"],
    ]) {
      await app.goto(route);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }
    await app.goto("/app");

    await page.getByRole("link", { name: "Find specialist", exact: true }).first().click();
    // Discovery opens on intake, not a directory: the product asks what is
    // going on before it shows anyone.
    await page.waitForURL(/\/app\/(find|experts)/);
    await app.ready();
    await page.getByRole("heading", { name: "What's going on?" }).waitFor();
    await page.getByRole("link", { name: "All specialists" }).click();
    await page.waitForURL(/\/app\/experts/);
    await app.ready();

    const results = await page
      .getByRole("link", { name: /Dr\.|Nurse|Pharmacist|Lab|Physio/ })
      .count();
    expect(results, "discovery had no specialists to choose from on a first run").toBeGreaterThan(
      0,
    );

    const directory = await page.innerText("body");
    expect(
      /₦/.test(directory),
      "the specialist list showed no prices, so a first-time person cannot compare",
    ).toBe(true);

    // eslint-disable-next-line no-console -- these are the point of the walk
    console.log(
      `\n  Prototype learning questions, recorded and not answered:\n${DROP_OFF_QUESTIONS.map(
        (question) => `    - ${question}`,
      ).join("\n")}\n`,
    );
  },
);

journey.sad(
  "A4",
  "identity verification needs its own consent, separate from sign-up",
  async ({ app, page }) => {
    await app.bootstrap("/app/verify-id");

    // The fixture's patient record is already verified, so the unverified path
    // is reached through the screen's own declared state rather than by
    // pretending a fresh record exists.
    await app.selectScreenState("Unverified");

    const nin = page.getByLabel(/National Identity Number/);
    await nin.waitFor();
    await nin.fill("12345678901");

    const verify = page.getByRole("button", { name: "Verify", exact: true });
    await expect(
      verify,
      "NIN verification could be submitted without its own separate consent",
    ).toBeDisabled();

    await page.getByRole("checkbox").first().check();
    await expect(verify, "NIN verification stayed blocked after consent").toBeEnabled();
  },
);
