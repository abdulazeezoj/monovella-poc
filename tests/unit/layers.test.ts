/**
 * Every test belongs to a layer, and the directory decides which.
 *
 * `Product/api/tests/conftest.py` assigns the marker from the directory and
 * fails collection for a test outside all of them, because the layers have
 * different infrastructure contracts and selecting one has to actually select
 * what it claims. Vitest and Playwright are weaker here: a file that falls
 * outside every project glob is not an error, it simply never runs, which is
 * the worst of both worlds.
 *
 * This is the equivalent. A test file outside tests/unit, tests/integration or
 * tests/e2e fails here rather than sitting in the tree looking like coverage.
 */
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const TESTS_ROOT = fileURLToPath(new URL("../", import.meta.url));

const LAYERS = ["unit", "integration", "e2e"];

/**
 * Files under tests/ that are not themselves tests: the shared setup, the
 * end-to-end fixture, the journey registry and its reporter.
 */
const NOT_A_TEST = /\.(?:spec|test)\.tsx?$/;

async function walk(directory: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) return walk(`${directory}/${entry.name}`, relative);
      return entry.isFile() ? [relative] : [];
    }),
  );
  return nested.flat();
}

describe("test layers", () => {
  it("puts every test file inside unit, integration or e2e", async () => {
    const files = await walk(TESTS_ROOT);
    const strays = files.filter(
      (file) => NOT_A_TEST.test(file) && !LAYERS.some((layer) => file.startsWith(`${layer}/`)),
    );

    expect(
      strays,
      "a test outside the three layers runs in no project, so it never runs at all",
    ).toEqual([]);
  });

  it("names unit and integration tests .test.ts and end-to-end tests .spec.ts", async () => {
    const files = await walk(TESTS_ROOT);
    const wrong = files.filter((file) => {
      if (file.startsWith("e2e/")) return /\.test\.tsx?$/.test(file);
      if (file.startsWith("unit/") || file.startsWith("integration/")) {
        return /\.spec\.tsx?$/.test(file);
      }
      return false;
    });

    expect(
      wrong,
      "the runners select by suffix as well as directory, so a mismatch is skipped silently",
    ).toEqual([]);
  });
});
