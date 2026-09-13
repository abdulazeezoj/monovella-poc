/**
 * Build `public/prototype.pgdata` from the fixture JSON, through the real schema.
 *
 * PGlite is Postgres compiled to WebAssembly, so this applies the same
 * `prisma/postgres.sql` the FastAPI build will run and inserts every fixture row
 * into it. That is the point of this step: a fixture that references a
 * consultation that does not exist, or carries a status the specification does
 * not permit, stops being a runtime surprise on one screen and becomes a failed
 * seed, here, with the offending row named. Foreign keys, check constraints and
 * not-null are enforced by Postgres rather than approximated in another engine.
 *
 * The output is a Postgres data directory, dumped and gzipped. The prototype has
 * no server: the browser opens that directory in its own PGlite instance, the
 * way it would open any other static asset.
 *
 * Every run rebuilds `public/prototype.pgdata` from nothing, but hashes the
 * fixtures + postgres.sql first and skips the rebuild if that hash already
 * matches — so repeat `mise run dev`/`build` reseeds are cheap. `--reset` (or
 * `mise run reset`) forces it anyway.
 *
 *   mise run seed
 *   mise run reset
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { MODEL, RELATIONS } from "./prisma-common";

const root = fileURLToPath(new URL("../", import.meta.url));
const dataDir = path.join(root, "app", "data");
const outFile = path.join(root, "public", "prototype.pgdata");
const hashFile = path.join(root, "prisma", ".seed-hash");
const reset = process.argv.includes("--reset");

function currentHash(): string {
  const hash = createHash("sha256");
  hash.update(readFileSync(path.join(root, "prisma", "postgres.sql")));
  for (const file of readdirSync(dataDir)
    .filter((name) => name.endsWith(".json"))
    .sort()) {
    hash.update(file);
    hash.update(readFileSync(path.join(dataDir, file)));
  }
  return hash.digest("hex");
}

type TableInfo = { table: string; instants: string[] };

const MODEL_FOR_FILE = JSON.parse(
  readFileSync(path.join(root, "prisma", "models.json"), "utf8"),
) as Record<string, string>;

const TABLES = JSON.parse(readFileSync(path.join(root, "prisma", "tables.json"), "utf8")) as Record<
  string,
  TableInfo
>;

/**
 * Parents before children, so a foreign key never points at a row that has not
 * been written yet — a topological order over the relations prisma-common.ts
 * declares, rather than a hand-kept list that silently rots the moment someone
 * adds a foreign key. Alphabetical within a level, so the order is stable.
 */
function seedOrder(stems: string[]): string[] {
  const available = new Set(stems);
  const stemFor = new Map(Object.entries(MODEL).map(([stem, model]) => [model, stem]));
  const done = new Set<string>();
  const ordered: string[] = [];

  function visit(stem: string, visiting: Set<string>) {
    if (done.has(stem) || visiting.has(stem)) return;
    visiting.add(stem);
    for (const [, target] of RELATIONS[MODEL[stem]] ?? []) {
      const parent = stemFor.get(target);
      if (parent && parent !== stem && available.has(parent)) visit(parent, visiting);
    }
    visiting.delete(stem);
    done.add(stem);
    ordered.push(stem);
  }

  for (const stem of [...stems].sort()) visit(stem, new Set());
  return ordered;
}

function rowsOf(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter((row) => row && typeof row === "object");
  if (payload && typeof payload === "object") return [payload as Record<string, unknown>];
  return [];
}

/**
 * Postgres takes arrays and scalars natively through the driver. Only objects
 * bound to a `json` column need handing over as text, because the driver would
 * otherwise try to infer a composite type for them.
 */
function bind(value: unknown) {
  if (value === undefined) return null;
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value) && value.some((item) => item !== null && typeof item === "object")) {
    return JSON.stringify(value);
  }
  return value;
}

async function main() {
  const hash = currentHash();
  if (
    !reset &&
    existsSync(outFile) &&
    existsSync(hashFile) &&
    readFileSync(hashFile, "utf8").trim() === hash
  ) {
    console.log(
      `public/prototype.pgdata is already current with the fixtures (${hash.slice(0, 12)}); skipping. Use "mise run reset" to force a rebuild.`,
    );
    return;
  }

  const db = new PGlite();
  await db.waitReady;
  // Every fixture timestamp is naive UTC, and every screen compares those
  // strings. Fixing the session zone keeps what goes in identical to what the
  // reader gets back out.
  await db.exec("set time zone 'UTC'");
  await db.exec(readFileSync(path.join(root, "prisma", "postgres.sql"), "utf8"));

  const stems = readdirSync(dataDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => name.slice(0, -".json".length));

  let total = 0;
  for (const stem of seedOrder(stems)) {
    const file = `${stem}.json`;
    const model = MODEL_FOR_FILE[stem];
    if (!model) throw new Error(`No model declared for ${file}. Update scripts/gen-prisma.ts.`);
    const info = TABLES[model];
    if (!info) throw new Error(`No table declared for ${model}. Run "mise run schema".`);
    const rows = rowsOf(JSON.parse(readFileSync(path.join(dataDir, file), "utf8")));
    if (!rows.length) continue;

    // Every row of one collection shares a shape, but a later row can carry an
    // optional field an earlier one omitted, so the column set is the union.
    const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))];
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    const statement =
      `insert into "public"."${info.table}" ` +
      `(${columns.map((column) => `"${column}"`).join(", ")}) values (${placeholders})`;

    for (const row of rows) {
      const values = columns.map((column) => bind(row[column]));
      try {
        await db.query(statement, values);
      } catch (error) {
        const id = row.id ?? "(no id)";
        throw new Error(`${info.table} row ${String(id)} was refused: ${(error as Error).message}`);
      }
      total += 1;
    }
  }

  const tables = await db.query<{ n: number }>(
    "select count(*)::int as n from information_schema.tables where table_schema = 'public'",
  );
  const tableCount = tables.rows[0].n;
  const dump = Buffer.from(await (await db.dumpDataDir("gzip")).arrayBuffer());
  await db.close();

  mkdirSync(path.dirname(outFile), { recursive: true });
  writeFileSync(outFile, dump);
  writeFileSync(hashFile, hash);
  console.log(
    `Seeded ${outFile} with ${total} rows across ${tableCount} tables ` +
      `(${Math.round(dump.byteLength / 1024)} KB), ` +
      "foreign keys and check constraints enforced by Postgres.",
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
