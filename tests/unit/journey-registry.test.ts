/**
 * The journey registry and USER_JOURNEY.md cannot drift apart.
 *
 * tests/e2e/journeys.ts parses the document rather than copying it, so the two
 * agree by construction on *content*. What they can still disagree on is
 * position: path ids are the bullet numbers within a scenario, so inserting a
 * bullet renumbers every path after it and quietly re-points every test that
 * claimed one. A coverage table would keep reporting the same total while
 * meaning something different.
 *
 * These checks make that a failure a person has to read, not a silent shift.
 */
import { describe, expect, it } from "vitest";
import {
  COVERAGE_FLOOR,
  DEFERRED,
  JOURNEY_DOC,
  PATH_COUNTS,
  PATHS,
  SCENARIOS,
  SCENARIOS_WITHOUT_HAPPY_PATHS,
  SCENARIOS_WITHOUT_SAD_PATHS,
} from "../e2e/journeys";

describe("journey registry", () => {
  it("finds all fifteen scenarios", () => {
    expect(SCENARIOS.map((scenario) => scenario.id)).toEqual([
      "A",
      "B",
      "C",
      "E",
      "F",
      "G",
      "H",
      "I",
      "J",
      "K",
      "L",
      "M",
      "N",
      "O",
      "P",
    ]);
  });

  it("holds the pinned number of paths per scenario", () => {
    const actual = Object.fromEntries(
      SCENARIOS.map((scenario) => [scenario.id, scenario.paths.length]),
    );
    expect(
      actual,
      `${JOURNEY_DOC} changed shape. Path ids are positional, so every test ` +
        "claiming a path in a renumbered scenario now claims a different bullet. " +
        "Re-check those claims, then update PATH_COUNTS.",
    ).toEqual(PATH_COUNTS);
  });

  it("gives every path a unique id and non-empty text", () => {
    const ids = PATHS.map((path) => path.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PATHS.filter((path) => path.text.trim().length === 0)).toEqual([]);
  });

  it("numbers paths within their own scenario", () => {
    for (const scenario of SCENARIOS) {
      expect(scenario.paths.map((path) => path.id)).toEqual(
        scenario.paths.map((_, index) => `${scenario.id}${index + 1}`),
      );
    }
  });

  it("defers only real paths, and always with a reason", () => {
    const known = new Set(PATHS.map((path) => path.id));
    for (const [id, reason] of Object.entries(DEFERRED)) {
      expect(known.has(id), `DEFERRED names "${id}", which is not a journey path`).toBe(true);
      expect(reason.trim().length, `DEFERRED["${id}"] has no reason`).toBeGreaterThan(20);
    }
  });

  it("exempts a scenario from happy or failure path coverage only with a reason", () => {
    const known = new Set(SCENARIOS.map((scenario) => scenario.id));
    for (const exemptions of [SCENARIOS_WITHOUT_SAD_PATHS, SCENARIOS_WITHOUT_HAPPY_PATHS]) {
      for (const [id, reason] of Object.entries(exemptions)) {
        expect(known.has(id), `"${id}" is not a scenario`).toBe(true);
        expect(reason.trim().length, `the exemption for "${id}" has no reason`).toBeGreaterThan(20);
      }
    }
  });

  it("keeps the coverage floor inside the document it measures", () => {
    expect(COVERAGE_FLOOR, "the coverage floor is not a real number of paths").toBeGreaterThan(0);
    expect(
      COVERAGE_FLOOR,
      "the coverage floor claims more paths are covered than the document has",
    ).toBeLessThanOrEqual(PATHS.length);
  });

  it("uses DEFERRED for what cannot be asserted, not for what nobody wrote", () => {
    // A blunt guard against the easy way out. DEFERRED records what a browser
    // genuinely cannot check — a stopwatch, a human reading, a wall-clock wait.
    // A path that simply has no test yet is counted as uncovered and printed on
    // every run, which is the honest place for it.
    const deferredShare = Object.keys(DEFERRED).length / PATHS.length;
    expect(
      deferredShare,
      "more than a tenth of the documented journeys are excused rather than uncovered",
    ).toBeLessThan(0.1);
  });
});
