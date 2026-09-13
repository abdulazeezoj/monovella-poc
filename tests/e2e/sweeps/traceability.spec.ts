/**
 * Screen traceability, the half that needs a browser.
 *
 * Every screen that fetches or writes has to show a reviewer what happens when
 * that fails, so every routed screen must either declare its states through the
 * prototype bar or be recorded in STATIC_BY_DESIGN with a written reason.
 *
 * That rule is the difference between "genuinely static" and "not done yet",
 * which are otherwise indistinguishable from outside. Before it existed, 90
 * screens declared a single state and nothing said which of those were finished.
 *
 * The document-versus-manifest half needs nothing running and lives in
 * tests/unit/screen-traceability.test.ts.
 */
import { SCREEN_SECTIONS } from "../../../app/data/screen-manifest";
import { logicalIds, STATIC_BY_DESIGN, seatFor } from "../../screens";
import { expect, test } from "../fixtures";

/** One entry per routed screen id, keeping the id its reason is filed under. */
const routed = SCREEN_SECTIONS.flatMap((section) =>
  section.screens
    .filter((screen) => screen.path)
    .flatMap((screen) =>
      logicalIds(screen).map((id) => ({
        id,
        name: screen.name,
        path: screen.path as string,
      })),
    ),
);

// Several ids can fold into one route. Checking the route once is enough; the
// reason is filed per id, so the first id that has one excuses the route.
const byPath = new Map<string, typeof routed>();
for (const entry of routed) {
  byPath.set(entry.path, [...(byPath.get(entry.path) ?? []), entry]);
}

test.describe("every screen declares its states or says why not", () => {
  for (const [path, entries] of byPath) {
    const ids = entries.map((entry) => entry.id);
    test(`${ids.join("/")} ${entries[0].name} (${path})`, async ({ app }) => {
      const excused = ids.filter((id) => STATIC_BY_DESIGN[id]);
      if (excused.length > 0) {
        test.skip(true, `static by design: ${STATIC_BY_DESIGN[excused[0]]}`);
      }

      await app.goto(path);
      // Expert surfaces fail closed in a patient-context session, so reading
      // the switcher without switching seats records the guard's states.
      await app.patchSession({ role: seatFor(path) });
      await app.goto(path);

      const states = await app.declaredStates();

      expect(
        states.length,
        `${ids.join("/")} (${path}) declares no reviewer states and is not recorded as ` +
          "static by design. Declare them with <ScreenStates>, or add the screen to " +
          "STATIC_BY_DESIGN in tests/screens.ts with the reason it genuinely has one state.",
      ).toBeGreaterThan(1);
    });
  }
});
