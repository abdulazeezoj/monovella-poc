/**
 * Screen traceability, the half that needs nothing running.
 *
 * Every screen id documented in PRODUCT_SCREEN_V0.md must be routed in the
 * prototype, and every routed id must be documented. A screen that exists in
 * one and not the other is either an undocumented surface a reviewer will hit
 * with no written intent behind it, or a documented promise the prototype never
 * kept.
 *
 * The other half of the old `mise run traceability` — that every screen either
 * declares its reviewer states or is recorded as static by design — needs a
 * browser and lives in tests/e2e/sweeps/traceability.spec.ts.
 */
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { SCREEN_SECTIONS } from "../../app/data/screen-manifest";
import { documentedIds, logicalIds, SCREEN_DOCUMENT_PATH, STATIC_BY_DESIGN } from "../screens";

const entries = SCREEN_SECTIONS.flatMap((section) => section.screens);
const manifestIds = new Set(entries.flatMap(logicalIds));

describe("screen traceability", () => {
  it("routes every screen the product specification documents", async () => {
    const documented = documentedIds(await readFile(SCREEN_DOCUMENT_PATH, "utf8"));
    const missing = [...documented].filter((id) => !manifestIds.has(id));

    expect(
      missing,
      "PRODUCT_SCREEN_V0.md documents these screens but the prototype routes none of them",
    ).toEqual([]);
  });

  it("documents every screen the prototype routes", async () => {
    const documented = documentedIds(await readFile(SCREEN_DOCUMENT_PATH, "utf8"));
    const undocumented = [...manifestIds].filter((id) => !documented.has(id));

    expect(
      undocumented,
      "the prototype routes these screens but PRODUCT_SCREEN_V0.md does not describe them",
    ).toEqual([]);
  });

  it("excuses a screen from declaring states only with a written reason", () => {
    for (const [id, reason] of Object.entries(STATIC_BY_DESIGN)) {
      expect(
        manifestIds.has(id),
        `STATIC_BY_DESIGN names "${id}", which is not a routed screen`,
      ).toBe(true);
      expect(reason.trim().length, `STATIC_BY_DESIGN["${id}"] has no reason`).toBeGreaterThan(20);
    }
  });

  it("gives every manifest entry a name", () => {
    expect(entries.filter((screen) => !screen.name?.trim())).toEqual([]);
  });
});
