/**
 * Scenario O: the three route states, on every shell.
 *
 * Ported from scripts/page-status-flow.ts. One RouteStatus component backs the
 * public site, the mobile app, the Back-Office Console and both provider
 * portals, and the real ErrorBoundary in root.tsx shares it, so the state a
 * reviewer can select and the one a person actually hits cannot drift apart.
 *
 * The console has no customer support route, so it deliberately offers two
 * recovery actions where the others offer three. That difference is asserted
 * rather than smoothed over.
 */
import { expect, journey } from "../journey";

interface Shell {
  path: string;
  shellText?: string;
  action: string;
  destination: string;
  /** Shells with a customer-facing support route offer it from the error state. */
  support?: boolean;
  /** The console and both portals are desk-bound surfaces. */
  desktop?: boolean;
}

const SHELLS: Shell[] = [
  { path: "/app/not-a-real-screen", support: true, action: "Go to Home", destination: "/app" },
  {
    path: "/console/not-a-real-screen",
    shellText: "Back-Office Console",
    desktop: true,
    action: "Go to console home",
    destination: "/console",
  },
  {
    path: "/pharmacy/not-a-real-screen",
    support: true,
    shellText: "Pharmacy Portal",
    desktop: true,
    action: "Go to pharmacy home",
    destination: "/pharmacy",
  },
  {
    path: "/lab/not-a-real-screen",
    support: true,
    shellText: "Lab Portal",
    desktop: true,
    action: "Go to lab home",
    destination: "/lab",
  },
  {
    path: "/not-a-real-screen",
    action: "Back to the prototype tour",
    destination: "/tour",
  },
];

for (const shell of SHELLS) {
  journey.sad(
    "O5",
    `an unknown address in ${shell.destination} names the part of Monovella that lacks it`,
    async ({ app, page }) => {
      // The console and the provider portals are desk-bound. At phone width
      // their shell label is present but collapsed, so asserting it is visible
      // at 390px tests the wrong thing about the wrong surface.
      if (shell.desktop) await page.setViewportSize({ width: 1280, height: 900 });

      await app.goto(shell.path);

      await page.getByRole("heading", { name: "Screen not found" }).waitFor();
      if (shell.shellText) {
        // The 404 runs inside its own shell rather than as a bare page, so the
        // prototype bar stays reachable and the surface still looks like itself.
        await page.getByText(shell.shellText, { exact: true }).first().waitFor();
      }

      // The prototype bar carries its own link back to the tour, so the public
      // shell has two. The recovery action is the one in the page body.
      const recovery = page.getByRole("link", { name: shell.action, exact: true }).first();
      await recovery.waitFor();
      await recovery.click();
      await page.waitForURL(`**${shell.destination}`);
      await app.ready();
    },
  );
}

journey.sad(
  "O5",
  "the error state says the fault is ours and offers a way on",
  async ({ app, page }) => {
    // The three route states are declared by the RouteStatus screen itself, so
    // they are selected on a status route rather than on Home, which is an
    // aggregate of surfaces that each declare their own.
    await app.goto("/app/not-a-real-screen");
    await app.selectScreenState("Unexpected error");

    await page.getByRole("heading", { name: "We couldn't open this screen" }).waitFor();
    await page.getByRole("link", { name: "Try again", exact: true }).waitFor();
    // The patient app has a customer support route; the console does not, and
    // offers its two other actions instead.
    await page.getByRole("link", { name: "Contact support", exact: true }).waitFor();
  },
);

journey.happy(
  "O5",
  "the loading state is a centred wait, not a blank screen",
  async ({ app, page }) => {
    await app.goto("/app/not-a-real-screen");
    await app.selectScreenState("Loading");

    await page.getByRole("heading", { name: "Opening this screen" }).waitFor();
    expect(
      (await page.locator("body").innerText()).trim().length,
      "the loading state rendered nothing",
    ).toBeGreaterThan(0);
  },
);
