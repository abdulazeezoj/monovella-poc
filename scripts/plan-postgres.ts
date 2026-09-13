/**
 * Write `prisma/postgres.sql`: the Postgres DDL Monovella plans to build on.
 *
 * Prisma 8 plans a migration as TypeScript, so the SQL only exists inside the
 * planner's preview. This pulls it out into one readable, diffable file, which
 * is the artifact the FastAPI build actually needs to review. The migration
 * package itself is regenerable machine output and is not kept.
 *
 * Nothing connects to a database. `migration plan` runs offline against an
 * empty schema, so this proves the DDL is plannable, not that it has ever run.
 *
 *   mise run schema
 */
import { execSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const outFile = path.join(root, "prisma", "postgres.sql");
const migrationDir = path.join(root, "prisma", "migrations");

type Statement = { text: string; language: string };

/** The CLI streams one JSON envelope per line. Only the result carries the plan. */
function plan(): Statement[] {
  // Planning is only a way to get the SQL. The package it writes is machine
  // output that would otherwise pile up one dated directory per run, so it is
  // cleared on the way in and taken away again below.
  rmSync(migrationDir, { recursive: true, force: true });
  const out = execSync("pnpm exec prisma migration plan --from @empty --name init --json", {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  for (const line of out.split(/\r?\n/)) {
    if (!line.startsWith("{")) continue;
    let parsed: {
      envelope?: { commandId?: string; ok?: boolean; result?: unknown; error?: unknown };
    };
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    const envelope = parsed.envelope;
    if (envelope?.commandId !== "migration.plan") continue;
    if (!envelope.ok) {
      throw new Error(`Prisma could not plan the migration: ${JSON.stringify(envelope.error)}`);
    }
    const result = envelope.result as { preview?: { statements?: Statement[] } };
    return result.preview?.statements ?? [];
  }
  throw new Error("Prisma printed no migration plan. Run `pnpm exec prisma contract emit` first.");
}

let statements: Statement[];
try {
  statements = plan();
} finally {
  // Also on the failure path. A half-written package left behind is picked up
  // by `tsc` on the next typecheck, which then fails for a reason that has
  // nothing to do with the code being checked.
  rmSync(migrationDir, { recursive: true, force: true });
}
if (!statements.length)
  throw new Error("The planned migration is empty. Check prisma/contract.prisma.");

const header = [
  "-- Monovella's Postgres schema.",
  "--",
  "-- Planned offline from prisma/contract.prisma, which scripts/gen-prisma.ts",
  "-- generates from the prototype fixtures. No database has ever run this. It is",
  "-- the pre-build artifact for the FastAPI and Postgres system in",
  "-- PRODUCT_ARCH_V0.md, not evidence that the system exists.",
  "--",
  "-- Enum values come from Product_Docs/openapi.json and land as CHECK",
  "-- constraints. Columns the specification has not pinned down are plain text;",
  "-- `mise run schema` lists them.",
  "",
  "",
];

writeFileSync(
  outFile,
  `${header.join("\n")}${statements.map((statement) => `${statement.text};`).join("\n\n")}\n`,
  "utf8",
);
console.log(`Wrote prisma/postgres.sql with ${statements.length} statements.`);
