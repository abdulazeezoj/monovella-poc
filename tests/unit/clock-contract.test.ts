/**
 * The prototype clock contract.
 *
 * Fixtures are anchored to a fixed instant so the story on screen reads the
 * same today as in six months, and `app/lib/clock.ts` is the sole bridge to
 * elapsed time. A route that calls `new Date()` or `Date.now()` directly writes
 * the host computer's real date into a demo record, so a reset no longer
 * returns the prototype to its own timeline and a countdown built from that
 * record is nonsense.
 *
 * Ported from scripts/clock-contract.ts.
 */
import { readdir, readFile } from "node:fs/promises";
import { normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appRoot = normalize(fileURLToPath(new URL("../../app/", import.meta.url)));
const clockFile = normalize(fileURLToPath(new URL("../../app/lib/clock.ts", import.meta.url)));

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const file = `${directory}/${entry.name}`;
      if (entry.isDirectory()) return sourceFiles(file);
      return entry.isFile() && /\.tsx?$/.test(entry.name) ? [file] : [];
    }),
  );
  return nested.flat();
}

describe("prototype clock contract", () => {
  it("reads elapsed time only through app/lib/clock.ts", async () => {
    const violations: string[] = [];
    for (const file of await sourceFiles(appRoot)) {
      const normalizedFile = normalize(file);
      if (normalizedFile === clockFile) continue;
      const source = await readFile(normalizedFile, "utf8");
      if (/\bnew\s+Date\s*\(\s*\)/.test(source) || /\bDate\.now\s*\(\s*\)/.test(source)) {
        violations.push(`app/${relative(appRoot, normalizedFile).replaceAll("\\", "/")}`);
      }
    }

    expect(violations, "direct host-clock reads write the real date into demo records").toEqual([]);
  });
});
