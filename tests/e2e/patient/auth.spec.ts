/**
 * Scenario B: authentication, recovery and session management.
 *
 * Ported from scripts/auth-session-flow.ts. Three separate returning people,
 * each locked out in a different way: a patient who forgot her PIN, a staff
 * member with an expired password, a provider who lost portal access.
 *
 * The patient auth screens are not reachable cold — arriving at /app or /tour
 * signs you straight in — so each of these clears the session first, which is
 * what signing out from Account Settings actually does.
 */
import { expect, journey } from "../journey";

const AUTH_KEY = "mv-auth-journey-v1";
const APP_KEY = "mv-prototype-state";

/** The state a signed-out person is in, cleared of any earlier walk. */
async function signOut(app: { page: import("@playwright/test").Page }) {
  await app.page.evaluate(
    ({ authKey, appKey }) => {
      sessionStorage.removeItem(authKey);
      sessionStorage.removeItem(appKey);
    },
    { authKey: AUTH_KEY, appKey: APP_KEY },
  );
}

journey.happy(
  ["B3", "B6"],
  "recovery by verified email sets a new phone and PIN and signs the person back in",
  async ({ app, page }) => {
    await app.goto("/app/welcome");
    await signOut(app);
    await app.reload();

    await app.goto("/app/recover");
    await page.getByLabel("Recovery email or Monovella ID").fill("amara.okonkwo@example.com");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Email verification code").fill("135790");
    await page.getByRole("button", { name: "Continue" }).click();

    await page.getByLabel("New phone number").fill("0804 555 0101");
    await page.getByLabel("New PIN").fill("654321");
    await page.getByRole("button", { name: "Save and sign in" }).click();
    await page.waitForURL("**/app/sign-in");

    await page.getByLabel("Phone number").fill("0804 555 0101");
    await page.getByLabel("PIN").fill("654321");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(/\/app$/);
    await app.ready();
  },
);

journey.happy(
  "B2",
  "sign-up survives a reload mid-OTP without restarting",
  async ({ app, page }) => {
    await app.goto("/app/welcome");
    await signOut(app);
    await app.reload();

    await app.goto("/app/sign-up");
    await page.getByLabel("First name").fill("Ada");
    await page.getByLabel("Last name").fill("Okafor");
    await page.getByLabel("Phone number").fill("0803 123 4567");
    await page.getByRole("checkbox", { name: /I have read and agree to the Terms/ }).check();
    await page.getByRole("checkbox", { name: /I have read the Data and Privacy Policy/ }).check();
    await page.getByRole("button", { name: "Send code" }).click();

    await app.reload();
    await page.getByLabel("Verification code").fill("246810");
    await page.getByRole("button", { name: "Verify code" }).click();

    await expect(
      page.getByText("Set your PIN", { exact: true }),
      "sign-up did not persist across a reload",
    ).toBeVisible();
  },
);

journey.sad(
  ["B8", "B11"],
  "a revoked session fails closed rather than keeping the record open",
  async ({ app, page }) => {
    await app.bootstrap("/app");

    // "Sign out everywhere", from the point of view of the device that lost it.
    await app.patchSession({ authenticated: false, access: "SESSION_REVOKED" });

    await page.goto("/app/reports");
    // Welcome or Sign In, depending where the shell sends a revoked session;
    // what matters is that it is not the report list.
    await page.waitForURL(/\/app\/(welcome|sign-in)/);
    await app.ready();

    expect(
      new URL(page.url()).pathname,
      "a revoked session stayed on the record it had open",
    ).not.toContain("/reports");
  },
);

const WEB_ROLES = [
  {
    name: "staff",
    session: "STAFF" as const,
    deepLink: "/console/refunds",
    signIn: "/console/sign-in",
  },
  {
    name: "pharmacy",
    session: "PHARMACY" as const,
    deepLink: "/pharmacy/requests",
    signIn: "/pharmacy/sign-in",
  },
  { name: "lab", session: "LAB" as const, deepLink: "/lab/requests", signIn: "/lab/sign-in" },
];

for (const role of WEB_ROLES) {
  journey.sad(
    role.name === "staff" ? "B12" : "B15",
    `a signed-out ${role.name} deep link lands on sign-in, not on the record`,
    async ({ app, page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await app.goto(role.deepLink);
      await app.signOutWebRole(role.session);

      await page.goto(role.deepLink);
      // The guard is a client-side <Navigate replace>, so there is no load
      // event to wait on. Poll the path instead.
      await expect
        .poll(() => new URL(page.url()).pathname, {
          message: `a signed-out ${role.name} deep link stayed on the record`,
        })
        .toBe(role.signIn);
      await app.ready();
    },
  );
}

journey.sad(
  "B7",
  "an expired signup code is refused, resend respects cooldown, and a renewed code works",
  async ({ app, page }) => {
    await app.goto("/app/welcome");
    await signOut(app);
    await app.reload();
    await page.clock.install();
    await app.goto("/app/sign-up");
    await page.getByLabel("First name").fill("Ada");
    await page.getByLabel("Last name").fill("Okafor");
    await page.getByLabel("Phone number").fill("0803 123 4567");
    await page.getByRole("checkbox", { name: /I have read and agree to the Terms/ }).check();
    await page.getByRole("checkbox", { name: /I have read the Data and Privacy Policy/ }).check();
    await page.getByRole("button", { name: "Send code" }).click();
    const challenge = () =>
      page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!).sign_up.challenge, AUTH_KEY);
    const initial = await challenge();
    await page.getByRole("button", { name: "Resend code", exact: true }).click();
    await expect(
      page.getByText("Please wait 30 seconds before requesting another code.", { exact: true }),
    ).toBeVisible();
    expect((await challenge()).resend_count).toBe(initial.resend_count);
    await page.clock.fastForward(10 * 60_000 + 1000);
    await page.getByLabel("Verification code").fill("246810");
    await page.getByRole("button", { name: "Verify code", exact: true }).click();
    await expect(
      page.getByText("That code has expired. Request a new code to continue.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("Set your PIN", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "Resend code", exact: true }).click();
    expect((await challenge()).resend_count).toBe(initial.resend_count + 1);
    await page.getByRole("button", { name: "Verify code", exact: true }).click();
    await expect(page.getByText("Set your PIN", { exact: true })).toBeVisible();
  },
);
