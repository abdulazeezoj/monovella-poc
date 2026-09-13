/**
 * Visit every declared state of every routed screen.
 *
 * The prototype bar carries a state switcher wherever a screen declares more
 * than one condition, so a reviewer can see the 409, the rate limit, the empty
 * list and the failed write without having to reproduce them. This sweep opens
 * each of those states in turn and fails on a blank render or a browser error.
 *
 * It proves that the declared states render. It does not prove an action
 * reaches the right one — that is what the journeys under tests/e2e/ do.
 *
 * One test per screen rather than one long walk, so a failure names the screen
 * and the workers can share the load. As a script this ran roughly 150 screens
 * serially in a single browser.
 */
import { SCREEN_SECTIONS } from "../../../app/data/screen-manifest";
import { seatFor } from "../../screens";
import { expect, test } from "../fixtures";

const routes = SCREEN_SECTIONS.flatMap((section) =>
  section.screens
    .filter((screen) => screen.path)
    .map((screen) => ({
      id: screen.id,
      name: screen.name,
      path: screen.path as string,
      section: section.title,
    })),
);

// The manifest can point two screen ids at one route (a folded sub-flow, a
// Pharmacy and a Lab variant). Visiting it twice proves nothing twice.
const unique = [...new Map(routes.map((route) => [route.path, route])).values()];

test.describe("declared screen states", () => {
  for (const route of unique) {
    // The path is in the title because the Pharmacy and Lab portals share
    // screen ids and names while being genuinely different routes.
    test(`${route.id} ${route.name} (${route.path})`, async ({ app, page }) => {
      await app.goto(route.path);

      // Expert surfaces fail closed in a patient-context session, so visiting
      // one without switching seats records the guard's states rather than the
      // screen's.
      await app.patchSession({ role: seatFor(route.path) });
      await app.goto(route.path);

      const states = await app.declaredStates();

      if (states.length === 0) {
        // A screen with fewer than two states hides the control entirely. That
        // is legitimate for a genuinely static surface; whether this one has
        // earned it is the traceability sweep's question, not this one.
        await expect(page.locator("body")).not.toBeEmpty();
        return;
      }

      for (const label of states) {
        await app.selectScreenState(label);
        const text = (await page.locator("body").innerText()).trim();
        expect(text.length, `${route.id} rendered nothing in the "${label}" state`).toBeGreaterThan(
          0,
        );
      }
    });
  }
});
