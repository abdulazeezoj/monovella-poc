/**
 * Journey coverage: the machine-readable answer to "did we walk every
 * documented happy and sad path?"
 *
 * USER_JOURNEY.md is the prototype's demonstration script, sixteen scenarios of
 * checklist bullets. Every bullet is a path (see journeys.ts, which parses
 * them). This reporter collects what each end-to-end test claimed through
 * journey(), prints the coverage per scenario, and writes it to
 * test-results/journey-coverage.json.
 *
 * It fails the run on three things:
 *
 *   - coverage falling below COVERAGE_FLOOR, so a journey cannot be quietly
 *     deleted, renamed or left broken;
 *   - a scenario walking no failure path, unless recorded as having none;
 *   - a scenario walking no honest path, unless recorded as having none.
 *
 * It does NOT fail on a path that simply has no test yet. Those are printed in
 * full on every run instead. The suite covers 72 of the 152 documented paths,
 * and marking the other 74 "deferred" to turn the gate green would be exactly
 * the claim this repository exists not to make. The list is the gap, stated.
 *
 * Without any of this, "we have end-to-end tests" and "the documented journeys
 * are covered" are two different claims that look the same from outside.
 *
 * It only ENFORCES on a complete run. A filtered run (--grep, --shard, or a
 * file path on the command line) prints the table as information, because
 * `mise run e2e -- tests/e2e/patient/booking.spec.ts` legitimately walks one
 * journey and should not be told the other 151 are missing.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type {
  FullConfig,
  FullResult,
  Reporter,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";
import {
  COVERAGE_FLOOR,
  DEFERRED,
  PATHS,
  SCENARIOS,
  SCENARIOS_WITHOUT_HAPPY_PATHS,
  SCENARIOS_WITHOUT_SAD_PATHS,
} from "./journeys";

interface Claim {
  kind: "happy" | "sad";
  title: string;
  status: TestResult["status"];
}

function annotations(test: TestCase, type: string): string[] {
  return test.annotations.filter((a) => a.type === type).map((a) => a.description ?? "");
}

export default class JourneyReporter implements Reporter {
  private claims = new Map<string, Claim[]>();
  private filtered = false;
  // Resolved from the config rather than from import.meta: Playwright loads a
  // reporter through its own transpile, where import.meta.dirname is not there.
  private out = "test-results/journey-coverage.json";

  onBegin(config: FullConfig) {
    this.out = resolve(config.rootDir, "test-results/journey-coverage.json");
    // `grep` defaults to a match-everything regex, so compare against that
    // rather than checking for presence. `shard` and a positional file filter
    // both also mean this run is not the whole suite.
    const grep = String(config.grep);
    const grepsEverything = grep === "/.*/" || grep === "/(?:)/";
    this.filtered =
      !grepsEverything || config.grepInvert != null || !!config.shard || hasPositionalFilter();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const ids = annotations(test, "journey");
    if (ids.length === 0) return;
    const kind = (annotations(test, "journey-kind")[0] ?? "happy") as "happy" | "sad";
    for (const id of ids) {
      const claims = this.claims.get(id) ?? [];
      claims.push({ kind, title: test.title, status: result.status });
      this.claims.set(id, claims);
    }
  }

  async onEnd(result: FullResult): Promise<{ status: FullResult["status"] } | undefined> {
    const rows = PATHS.map((path) => {
      const claims = this.claims.get(path.id) ?? [];
      const passing = claims.filter((c) => c.status === "passed");
      return {
        ...path,
        claims,
        covered: passing.length > 0,
        attempted: claims.length > 0,
        deferred: path.id in DEFERRED,
        reason: DEFERRED[path.id],
      };
    });

    // Three buckets that partition the document: a path is covered, or excused,
    // or neither. Excused-and-covered counts as covered, so the three always
    // add up to the number of paths rather than double-counting one.
    const covered = rows.filter((row) => row.covered);
    const deferred = rows.filter((row) => !row.covered && row.deferred);
    const uncovered = rows.filter((row) => !row.covered && !row.deferred);

    const perScenario = SCENARIOS.map((scenario) => {
      const own = rows.filter((row) => row.scenario === scenario.id);
      const claims = own.flatMap((row) => row.claims);
      return {
        id: scenario.id,
        title: scenario.title,
        paths: own.length,
        covered: own.filter((row) => row.covered).length,
        deferred: own.filter((row) => row.deferred).length,
        happy: claims.filter((c) => c.kind === "happy" && c.status === "passed").length,
        sad: claims.filter((c) => c.kind === "sad" && c.status === "passed").length,
      };
    });

    // Every scenario must walk at least one failure path as well as at least
    // one honest one, unless it is recorded as having none. A suite that only
    // ever proves the happy route is the exact gap this reporter exists to make
    // visible.
    const missingSad = this.filtered
      ? []
      : perScenario.filter((row) => row.sad === 0 && !(row.id in SCENARIOS_WITHOUT_SAD_PATHS));
    const missingHappy = this.filtered
      ? []
      : perScenario.filter((row) => row.happy === 0 && !(row.id in SCENARIOS_WITHOUT_HAPPY_PATHS));

    print(perScenario, rows.length, covered.length, deferred.length, uncovered, this.filtered);

    mkdirSync(dirname(this.out), { recursive: true });
    writeFileSync(
      this.out,
      `${JSON.stringify(
        {
          generatedFrom: "USER_JOURNEY.md",
          complete: !this.filtered,
          totals: {
            paths: rows.length,
            covered: covered.length,
            deferred: deferred.length,
            uncovered: uncovered.length,
          },
          scenarios: perScenario,
          paths: rows.map(({ id, scenario, text, covered, deferred, reason, claims }) => ({
            id,
            scenario,
            text,
            covered,
            deferred,
            reason,
            claims: claims.map((c) => ({ kind: c.kind, title: c.title, status: c.status })),
          })),
        },
        null,
        2,
      )}\n`,
    );

    if (this.filtered) {
      console.log(
        "\n  Partial run, so coverage is reported but not enforced. " +
          "Run `mise run e2e` with no filter for the gate.\n",
      );
      return undefined;
    }

    const problems: string[] = [];
    // A ratchet, not a target. The paths with no test are printed on every run
    // so the gap stays visible; what fails the gate is coverage going
    // backwards, which is what a deleted, renamed or broken journey looks like.
    // Deferring the rest to make this green would be the exact claim this
    // repository exists not to make.
    if (covered.length < COVERAGE_FLOOR) {
      problems.push(
        `Journey coverage fell from ${COVERAGE_FLOOR} paths to ${covered.length}. ` +
          "A journey was deleted, renamed or is failing. Fix it, or lower " +
          "COVERAGE_FLOOR in tests/e2e/journeys.ts and say why in the same change.",
      );
    }
    if (missingSad.length > 0) {
      problems.push(
        `${missingSad.length} scenario(s) walk no failure path: ` +
          `${missingSad.map((row) => row.id).join(", ")}. Add a @sad journey, or ` +
          "record the scenario in SCENARIOS_WITHOUT_SAD_PATHS with the reason it has none.",
      );
    }
    if (missingHappy.length > 0) {
      problems.push(
        `${missingHappy.length} scenario(s) walk no honest path to the end: ` +
          `${missingHappy.map((row) => row.id).join(", ")}.`,
      );
    }

    if (problems.length === 0) return undefined;

    console.error(`\n  Journey coverage failed.\n\n  ${problems.join("\n\n  ")}\n`);
    // Do not downgrade an already-failing run: a coverage gap is real, but so
    // is a broken test, and the latter is the more urgent report.
    return { status: result.status === "passed" ? "failed" : result.status };
  }
}

function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/**
 * Whether the command line named specific test files or titles.
 *
 * Playwright does not expose positional filters on FullConfig, so this reads
 * argv directly. Anything after the `test` subcommand that is not a flag is a
 * file or directory filter.
 */
function hasPositionalFilter() {
  const argv = process.argv.slice(2);
  const start = argv.indexOf("test");
  if (start === -1) return false;
  return argv.slice(start + 1).some((arg) => !arg.startsWith("-"));
}

function print(
  scenarios: {
    id: string;
    title: string;
    paths: number;
    covered: number;
    deferred: number;
    happy: number;
    sad: number;
  }[],
  total: number,
  covered: number,
  deferred: number,
  uncovered: { id: string; text: string }[],
  filtered: boolean,
) {
  const width = Math.max(...scenarios.map((s) => s.title.length));
  console.log(`\n  Journey coverage${filtered ? " (partial run)" : ""}`);
  for (const scenario of scenarios) {
    const gap = scenario.paths - scenario.covered - scenario.deferred;
    const mark = gap > 0 ? "!" : " ";
    console.log(
      `  ${mark} ${scenario.id}  ${scenario.title.padEnd(width)}  ` +
        `${String(scenario.covered).padStart(2)}/${String(scenario.paths).padEnd(2)} paths  ` +
        `${String(scenario.happy).padStart(2)} happy  ${String(scenario.sad).padStart(2)} sad` +
        (scenario.deferred > 0 ? `  (${scenario.deferred} deferred)` : ""),
    );
  }
  console.log(
    `\n  ${scenarios.length} scenarios, ${total} paths: ` +
      `${covered} covered, ${deferred} excused, ${uncovered.length} not yet covered.`,
  );
  if (!filtered && uncovered.length > 0) {
    // Printed rather than hidden. This is the honest state of the suite, and it
    // is the list somebody picks the next journey to write from.
    console.log(
      `\n  Not yet covered (${uncovered.length}):\n${uncovered
        .map((row) => `    ${row.id}  ${truncate(row.text, 92)}`)
        .join("\n")}`,
    );
  }
}
