/**
 * The journey registry: what USER_JOURNEY.md says a reviewer must be able to
 * walk, in a form a test can claim and a reporter can count.
 *
 * The registry is PARSED FROM USER_JOURNEY.md rather than transcribed into it.
 * A hand-written copy of 140 checklist bullets would go stale the first time
 * somebody edited the document, and the whole point of this file is to answer
 * "is every documented journey covered?" truthfully. Parsing means the document
 * is the source of truth and the answer cannot drift from it.
 *
 * Each `- [ ]` bullet under a `## X. Title` heading is one path, numbered in
 * document order: A1, A2, … P5. A path is covered when at least one end-to-end
 * test claims it through journey(). An uncovered path must be recorded in
 * DEFERRED with a written reason, exactly as an undeclared screen must be
 * recorded in STATIC_BY_DESIGN. It is never silent.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export type PathKind = "happy" | "sad";

export interface JourneyPath {
  /** A1 … P5, in document order within the scenario. */
  id: string;
  scenario: string;
  /** The checklist bullet, verbatim apart from markdown emphasis. */
  text: string;
}

export interface Scenario {
  /** A … P */
  id: string;
  title: string;
  paths: JourneyPath[];
}

const DOC_URL = new URL("../../USER_JOURNEY.md", import.meta.url);

export const JOURNEY_DOC = fileURLToPath(DOC_URL);

function parse(): Scenario[] {
  const lines = readFileSync(DOC_URL, "utf8").split(/\r?\n/);
  const scenarios: Scenario[] = [];
  let current: Scenario | null = null;

  for (const line of lines) {
    const heading = line.match(/^## ([A-P])\. (.+)$/);
    if (heading) {
      current = { id: heading[1], title: heading[2].trim(), paths: [] };
      scenarios.push(current);
      continue;
    }
    // Any other level-two heading ends the scenario: the coverage overview and
    // the closing section both carry checkboxes that are not paths.
    if (line.startsWith("## ")) {
      current = null;
      continue;
    }
    if (!current) continue;
    const bullet = line.match(/^- \[[ x~]\] (.+)$/);
    if (!bullet) continue;
    current.paths.push({
      id: `${current.id}${current.paths.length + 1}`,
      scenario: current.id,
      text: bullet[1].replace(/\*\*/g, "").trim(),
    });
  }

  return scenarios;
}

export const SCENARIOS: Scenario[] = parse();

export const PATHS: JourneyPath[] = SCENARIOS.flatMap((scenario) => scenario.paths);

const BY_ID = new Map(PATHS.map((path) => [path.id, path]));

export function lookupPath(id: string): JourneyPath {
  const path = BY_ID.get(id);
  if (!path) {
    throw new Error(
      `Unknown journey path "${id}". Ids are the checklist bullets of ` +
        `USER_JOURNEY.md, numbered per scenario in document order (A1 … P5). ` +
        `If a bullet was added or removed, the numbering shifted: re-check ` +
        `tests/unit/journey-registry.test.ts, which pins the count per scenario.`,
    );
  }
  return path;
}

/**
 * The count of checklist bullets in each scenario, pinned.
 *
 * Path ids are positional, so inserting a bullet in the middle of a scenario
 * silently renumbers every path after it and every test claiming one of them
 * would then be claiming the wrong bullet. This pin turns that into a failing
 * unit test instead, which is a person re-reading the mapping rather than a
 * coverage table quietly telling a lie.
 *
 * When the document genuinely changes, update this and re-check the claims in
 * that scenario's specs. Do not update it without doing the second half.
 */
export const PATH_COUNTS: Record<string, number> = {
  A: 7,
  B: 18,
  C: 18,
  E: 8,
  F: 5,
  G: 11,
  H: 7,
  I: 11,
  J: 6,
  K: 10,
  L: 11,
  M: 10,
  N: 9,
  O: 7,
  P: 5,
};

/**
 * Paths with no automated coverage, each with the reason it has none.
 *
 * This is a record of what is not proven, not a way to make the number look
 * better. A path belongs here when a browser cannot honestly assert it, or when
 * the work is genuinely deferred and named as such. "Nobody got to it yet" is
 * an acceptable reason as long as it says so.
 */
export const DEFERRED: Record<string, string> = {
  A1: "Judgement, not assertion: whether the landing copy 'states the value plainly' is a human reading. The narrower half — that it promises no endorsement, guaranteed availability or free care — is asserted in the first-run spec against A7.",
  C7: "Readability in under 30 seconds is a stopwatch and a person, not an assertion.",
  C18: "The end-to-end story check is explicitly a judgement about whether the demonstration is plausible. It is the reason USER_JOURNEY.md is walked by hand.",
  I3: "Six account mutation screens in one bullet, each already covered as its own state in the states sweep. A journey test here would restate the sweep rather than add evidence.",
};

/**
 * How many documented paths currently have a passing test.
 *
 * A ratchet, not a target. The suite covers 72 of the 152 checklist bullets in
 * USER_JOURNEY.md; the rest are named in every run's output so the gap stays
 * visible. Deferring the other 74 to make the gate green would be exactly the
 * kind of claim this repository exists not to make.
 *
 * The gate fails when coverage drops below this number, so a journey cannot be
 * quietly deleted or left broken. Raise it when you cover more — the run tells
 * you the new figure — and never lower it without saying why in the same change.
 */
export const COVERAGE_FLOOR = 72;

/**
 * Scenarios with no honest path to the end, each with the reason.
 *
 * Every other scenario must walk at least one @happy journey. A scenario listed
 * here is asserting that walking one would be meaningless.
 */
export const SCENARIOS_WITHOUT_HAPPY_PATHS: Record<string, string> = {
  P: "An adversarial sweep has no honest path by definition. Its persona is someone deliberately trying to break isolation, so every path through it is a refusal that has to hold.",
};

/**
 * Scenarios with no failure path of their own, each with the reason.
 *
 * Every other scenario must carry at least one @sad test as well as at least
 * one @happy test, because each of them names a failure condition in the
 * document. A scenario listed here is asserting that it genuinely has none.
 */
export const SCENARIOS_WITHOUT_SAD_PATHS: Record<string, string> = {};
