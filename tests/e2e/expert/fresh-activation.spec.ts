import { expect, journey } from "../journey";

journey.happy(
  ["K1", "K2", "K4", "K6"],
  "a fresh expert reaches approval, payout setup and first published hours",
  async ({ app, page }) => {
    await app.bootstrap("/?ref=EXP-ADEYEMI&region=Lagos");
    await app.patchSession({ authenticated: false, access: "GRANTED" });
    await page.evaluate(() => sessionStorage.removeItem("mv-auth-journey-v1"));

    await app.goto("/app/sign-up?ref=EXP-ADEYEMI&region=Lagos");
    expect(
      await page.getByLabel("Have a referral code?").inputValue(),
      "the referral code did not survive the move from landing to sign-up",
    ).toBe("EXP-ADEYEMI");

    await page.getByLabel("First name").fill("Ada");
    await page.getByLabel("Last name").fill("Test");
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

    const expertId = (await app.state()).session?.expertId;
    if (!expertId) throw new Error("Fresh expert identity was not created");
    await app.patchSession({ role: "expert", expertId });
    await app.goto("/app/expert/application");
    await expect(
      page.getByRole("heading", { name: "No application yet", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Start application", exact: true }).click();
    await page.getByLabel("First name", { exact: true }).fill("Ada");
    await page.getByLabel("Last name", { exact: true }).fill("Test");
    await page.getByLabel("Email", { exact: true }).fill("ada@example.com");
    await page.getByLabel("Gender", { exact: true }).selectOption("FEMALE");
    await page.getByLabel("Practice address", { exact: true }).fill("12 Test Road");
    await page.getByLabel("City", { exact: true }).fill("Ikeja");
    await page.getByLabel("State", { exact: true }).click();
    await page.getByPlaceholder("Search states").fill("Lagos");
    await page
      .getByRole("dialog", { name: "Choose a state" })
      .getByText("Lagos", { exact: true })
      .click();
    await page.getByLabel("Local Government Area", { exact: true }).click();
    await page.getByPlaceholder("Search LGAs").fill("Ikeja");
    await page.getByRole("dialog").getByText("Ikeja", { exact: true }).click();
    await page.getByLabel("Professional type", { exact: true }).selectOption("NURSE");
    await page.getByLabel("Specialty", { exact: true }).selectOption("WOUND_CARE_GUIDANCE");
    await page.getByLabel("NMCN licence number", { exact: true }).fill("NMCN/TEST/12");
    await page.getByLabel("Licence expiry date", { exact: true }).fill("2028-01-31");
    await page.getByLabel("Consultation fee (₦)", { exact: true }).fill("4000");
    await page.locator('input[type="file"]').setInputFiles({
      name: "ada-certificate.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("prototype sample"),
    });
    await page.getByRole("button", { name: "Submit application", exact: true }).click();
    await page.getByRole("heading", { name: "Your application", exact: true }).waitFor();
    await expect(page.getByText("Under review by Monovella", { exact: true })).toBeVisible();
    const id = new URL(page.url()).searchParams.get("id")!;
    await app.goto("/app/expert/apply");
    await expect(
      page.getByText("You already have an application on this account.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit application", exact: true }),
    ).toBeDisabled();
    await page.getByRole("link", { name: "See it", exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`id=${id}`));
    await app.goto(`/console/applications/${id}`);
    await expect(page.getByText("ada@example.com", { exact: true })).toBeVisible();
    await expect(page.getByText("NMCN/TEST/12", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Approve", exact: true }).click();
    await page
      .getByRole("alertdialog", { name: "Approve this application", exact: true })
      .getByRole("button", { name: "Approve", exact: true })
      .click();
    await app.patchSession({ role: "expert", expertId }, "/app/expert/application");
    await expect(page.getByText("You're verified", { exact: true })).toBeVisible();
    await app.reload();
    await expect(page.getByText("You're verified", { exact: true })).toBeVisible();
    const experts = await app.rows("experts");
    expect(experts.find((item) => item.id === expertId)).toMatchObject({
      first_name: "Ada",
      last_name: "Test",
      professional_type: "NURSE",
      address: "12 Test Road",
      consultation_fee_kobo: 400000,
      credentials: expect.arrayContaining([
        expect.objectContaining({
          licence_or_fellowship_number: "NMCN/TEST/12",
          verification_status: "VERIFIED",
        }),
      ]),
    });
    await app.goto("/app/expert/payout");
    await page.getByRole("button", { name: "Choose your bank", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Search Nigerian banks", exact: true })
      .fill("Guaranty");
    await page.getByRole("listitem").filter({ hasText: "Guaranty" }).getByRole("button").click();
    await page.getByRole("textbox", { name: "Account number", exact: true }).fill("0123456789");
    await page.getByRole("button", { name: "Verify account", exact: true }).click();
    await expect(page.getByText(/Recipient verified: Ada Test/)).toBeVisible();
    await page.getByRole("button", { name: "Save payout account", exact: true }).click();
    await app.reload();
    await expect(page.getByRole("textbox", { name: "Account number", exact: true })).toHaveValue(
      "0123456789",
    );
    await app.goto("/app/expert/schedule");
    await expect(page.getByText("No hours published yet", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Add your first block", exact: true }).click();
    const sheet = page.getByRole("dialog", { name: "Add working hours", exact: true });
    await sheet.getByLabel("Day", { exact: true }).selectOption("1");
    await sheet.getByLabel("From", { exact: true }).fill("09:00");
    await sheet.getByLabel("To", { exact: true }).fill("12:00");
    await sheet.getByRole("button", { name: "Add", exact: true }).click();
    await app.reload();
    const slots = (await app.rows("expertSchedule")).filter((slot) => slot.expert_id === expertId);
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({ day_of_week: 1, start_time: "09:00", end_time: "12:00" });
    expect(
      (await app.rows("expertAvailability")).filter((slot) => slot.expert_id === expertId).length,
    ).toBeGreaterThan(0);
  },
);
