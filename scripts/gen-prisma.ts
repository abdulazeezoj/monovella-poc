/**
 * Generate the Monovella data model from the fixture JSON.
 *
 *     prisma/contract.prisma  The schema, in Prisma 8's PSL, targeting Postgres.
 *     prisma/postgres.sql     The DDL that schema plans to, written by
 *                             scripts/plan-postgres.ts.
 *
 * There is one schema and one dialect. The prototype runs Postgres too: PGlite is
 * Postgres compiled to WebAssembly, so `public/prototype.pgdata` is a real
 * Postgres data directory that the tab opens directly. The prototype therefore
 * exercises the same enums, foreign keys, array columns and check constraints the
 * FastAPI build will, rather than an approximation of them in another engine.
 *
 * Enum values and `uuid`-typed columns come from Product_Docs/openapi.json,
 * which is the declared authority on data shapes. A column whose values only
 * appear in the fixtures is left as text with the observed values reported at
 * the end, rather than being promoted to an enum the specification never agreed
 * to.
 *
 * Relations and primary keys are declared in prisma-common.ts, not guessed
 * from column names, because a foreign key is a product decision.
 *
 *     pnpm exec vite-node scripts/gen-prisma.ts
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadSpec,
  MODEL,
  modelIdIsUuid,
  NO_SPEC,
  PRIMARY_KEY,
  RELATIONS,
  resolveSchema,
  UUID_COLUMNS,
} from "./prisma-common";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, "..", "app", "data");
const OUT_DIR = path.join(HERE, "..", "prisma");

// Columns that read like enums, so an unsourced one is worth reporting. The name
// alone is not enough: `cancellation_reason` holds a sentence and `corrected_by_id`
// holds an identifier, and neither is a missing enum.
const ENUM_SHAPED =
  /(_status|_type|_answer|_outcome|_reason|_state|^status$|^role$|^kind$|^source$|^type$)/;
// A full ISO-8601 instant, which Postgres should hold as timestamptz.
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]*$/;

/** A text column whose every value is a token, not a sentence or an id. */
function looksLikeEnum(key: string, values: unknown[]): boolean {
  if (key.endsWith("_id") || key.endsWith("_at")) return false;
  if (!ENUM_SHAPED.test(key)) return false;
  const seen = new Set(values.filter((v): v is string => typeof v === "string"));
  return seen.size > 0 && [...seen].every((v) => IDENTIFIER.test(v) && v === v.toUpperCase());
}

type PrismaScalar =
  | "Boolean"
  | "Int"
  | "Float"
  | "String"
  | "TimestamptzString"
  | "String[]"
  | "Int[]"
  | "Json";

/** The narrowest type every observed value fits, as [prisma, optional]. */
function scalar(key: string, values: unknown[]): [PrismaScalar, boolean] {
  const kinds = new Set<string>();
  let optional = false;
  for (const value of values) {
    if (value === null || value === undefined) {
      optional = true;
    } else if (typeof value === "boolean") {
      kinds.add("Boolean");
    } else if (typeof value === "number") {
      kinds.add(Number.isInteger(value) ? "Int" : "Float");
    } else if (typeof value === "string") {
      kinds.add(INSTANT.test(value) ? "Instant" : "String");
    } else if (Array.isArray(value)) {
      const elementTypes = new Set(value.map((item) => typeof item));
      if ([...elementTypes].every((t) => t === "string")) kinds.add("String[]");
      else if ([...elementTypes].every((t) => t === "number")) kinds.add("Int[]");
      else kinds.add("Json");
    } else {
      kinds.add("Json");
    }
  }
  if (kinds.size === 0) {
    // Every row is null. The column name is the only evidence of intent, and
    // a `_at` column is an instant whether or not a fixture fills it in.
    return [key.endsWith("_at") ? "TimestamptzString" : "String", true];
  }
  let set = kinds;
  if (eq(set, ["Int", "Float"])) set = new Set(["Float"]);
  // A column that is sometimes an instant and sometimes not is just text.
  if (eq(set, ["Instant", "String"])) set = new Set(["String"]);
  // An empty list in one row and a populated one in another still agree.
  if (eq(set, ["String[]", "Json"]) || eq(set, ["Int[]", "Json"])) set = new Set(["Json"]);
  if (set.size > 1) set = new Set(["Json"]);
  const kind = [...set][0];
  return [kind === "Instant" ? "TimestamptzString" : (kind as PrismaScalar), optional];
}

function eq(set: Set<string>, values: string[]): boolean {
  return set.size === values.length && values.every((v) => set.has(v));
}

function rowsFor(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload.filter((row) => row && typeof row === "object");
  return payload && typeof payload === "object" ? [payload as Record<string, unknown>] : [];
}

function pascal(text: string): string {
  return text
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join("");
}

interface Column {
  name: string;
  prisma: PrismaScalar;
  optional: boolean;
  isId: boolean;
  enum: [string, string[]] | null;
  relation: string | null;
  nativeUuid: boolean;
}

interface Model {
  name: string;
  stem: string;
  columns: Column[];
}

/** Every column of every fixture, with its type, in file order. */
function readModels(): { models: Model[]; unsourced: string[] } {
  const spec = loadSpec();
  const models: Model[] = [];
  const unsourced: string[] = [];

  const files = readdirSync(DATA)
    .filter((name) => name.endsWith(".json"))
    .sort();

  for (const fileName of files) {
    const stem = fileName.slice(0, -".json".length);
    const modelName = MODEL[stem];
    if (!modelName) throw new Error(`No model name declared for ${fileName}`);
    const rows = rowsFor(JSON.parse(readFileSync(path.join(DATA, fileName), "utf8")));

    const observed: Record<string, unknown[]> = {};
    for (const row of rows) {
      for (const [key, value] of Object.entries(row)) {
        observed[key] ??= [];
        observed[key].push(value);
      }
    }
    // A key absent from some rows is optional even if it is never null.
    for (const key of Object.keys(observed)) {
      if (observed[key].length < rows.length) observed[key].push(null);
    }

    const schemaName = resolveSchema(spec.schemas, modelName);
    if (schemaName === null && !NO_SPEC.has(modelName)) {
      throw new Error(`No openapi schema for ${modelName}. Add it to SPEC_SCHEMA or NO_SPEC.`);
    }
    const specEnums = schemaName === null ? {} : spec.enumsOf(schemaName);
    const specUuids = schemaName === null ? {} : spec.uuidPropsOf(schemaName);
    const specNullable = schemaName === null ? new Set<string>() : spec.nullablePropsOf(schemaName);

    const relations = new Map(RELATIONS[modelName] ?? []);
    const idColumn = PRIMARY_KEY[modelName] ?? "id";
    const columns: Column[] = [];
    for (const [key, values] of Object.entries(observed)) {
      const [prisma, observedOptional] = scalar(key, values);
      // openapi.json decides whether a column may be null. Inferring it from the
      // fixtures alone makes a column NOT NULL because the demo cast happened to
      // fill it in, which is a constraint the real API would immediately break.
      const optional = observedOptional || specNullable.has(key);
      let enumName: string | null = null;
      let enumValues: string[] | null = null;
      const specEnum = specEnums[key];
      if (specEnum && prisma === "String") {
        const [name, values2] = specEnum;
        const seen = new Set(values.filter((v): v is string => typeof v === "string"));
        const extra = [...seen].filter((v) => !values2.includes(v)).sort();
        if (extra.length) {
          throw new Error(
            `${modelName}.${key} holds ${extra.join(", ")}, which openapi.json does not permit. Fix the fixture or the spec.`,
          );
        }
        enumName = name ?? modelName + pascal(key);
        enumValues = values2;
      } else if (prisma === "String" && looksLikeEnum(key, values)) {
        const observedValues = [...new Set(values.filter((v) => v !== null).map(String))].sort();
        unsourced.push(`${modelName}.${key} (observed: ${observedValues.join(", ")})`);
      }
      columns.push({
        name: key,
        prisma,
        optional,
        isId: key === idColumn,
        enum: enumValues ? [enumName as string, enumValues] : null,
        relation: relations.get(key) ?? null,
        // openapi.json types this column `format: uuid`, or UUID_COLUMNS does
        // where openapi.json cannot. Postgres's native `uuid` type is
        // index-friendly where text is not, and rejects a malformed value at
        // insert time instead of at read time. Array-of-uuid columns (e.g.
        // Insight.source_log_entries) stay `String[]`: their values are real
        // UUIDs too, just not natively typed.
        nativeUuid:
          (specUuids[key] === "scalar" || (UUID_COLUMNS[modelName]?.includes(key) ?? false)) &&
          prisma === "String",
      });
    }
    // A model whose shape is declared (app/data/types.ts, openapi.json) but has
    // no fixture rows yet still needs a primary key to be a table at all.
    if (columns.length === 0) {
      columns.push({
        name: idColumn,
        prisma: "String",
        optional: false,
        isId: true,
        enum: null,
        relation: null,
        nativeUuid: modelIdIsUuid(spec, modelName),
      });
    }
    models.push({ name: modelName, stem, columns });
  }

  // A relation column must match its target's actual type. openapi.json is
  // often silent on it (DeviceSessionRead never echoes back `user_id`), so
  // inherit nativeUuid from the target's own id instead.
  const idIsUuid = new Map<string, boolean>();
  for (const model of models) {
    for (const column of model.columns) {
      if (column.isId) idIsUuid.set(model.name, column.nativeUuid);
    }
  }
  for (const model of models) {
    for (const column of model.columns) {
      if (column.relation && idIsUuid.get(column.relation)) column.nativeUuid = true;
    }
  }

  return { models, unsourced };
}

/** prisma/contract.prisma, targeting Postgres through Prisma 8. */
function writeContract(models: Model[]): number {
  const enums = new Map<string, Set<string>>();
  for (const model of models) {
    for (const column of model.columns) {
      if (column.enum) {
        const [name, values] = column.enum;
        const set = enums.get(name) ?? new Set<string>();
        for (const v of values) set.add(v);
        enums.set(name, set);
      }
    }
  }

  const lines = [
    "// use prisma-next",
    "",
    "// Monovella's data model, generated from the prototype fixtures by",
    "// scripts/gen-prisma.ts. Edit the generator or the fixtures, never this file.",
    "// Targets Postgres, which PRODUCT_ARCH_V0.md plans the FastAPI backend onto. A",
    "// model with only an `id` column has a declared shape (app/data/types.ts) and no",
    "// fixture rows yet. Every model has a real, generated primary key - none is a",
    "// fixed-key singleton, even where the fixtures currently ship it exactly one row.",
    "// Enum values and `uuid`-typed columns come from Product_Docs/openapi.json; a",
    "// plain `String` status is one the specification has not pinned down, and a",
    "// `Json` column's shape is not modelled here (app/data/types.ts is the authority).",
    "",
  ];
  for (const name of [...enums.keys()].sort()) {
    lines.push(`enum ${name} {`);
    for (const value of [...enums.get(name)!].sort()) lines.push(`  ${value}`);
    lines.push("}", "");
  }

  const backReferences = new Map<string, string[]>();
  for (const model of models) {
    for (const column of model.columns) {
      if (column.relation) {
        const rel = `${model.name}_${column.name}`;
        const list = backReferences.get(column.relation) ?? [];
        list.push(`  ${rel} ${model.name}[] @relation("${rel}")`);
        backReferences.set(column.relation, list);
      }
    }
  }

  for (const model of models) {
    const body = [`model ${model.name} {`];
    for (const column of model.columns) {
      const kind = column.enum ? column.enum[0] : column.nativeUuid ? "Uuid" : column.prisma;
      const suffix = column.optional && !column.isId ? "?" : "";
      const marker = column.isId ? " @id" : "";
      body.push(`  ${column.name} ${kind}${suffix}${marker}`);
      if (column.relation) {
        const rel = `${model.name}_${column.name}`;
        body.push(
          `  ${column.name}_rel ${column.relation}? @relation("${rel}", fields: [${column.name}], references: [id])`,
        );
      }
    }
    for (const back of backReferences.get(model.name) ?? []) body.push(back);
    body.push("}");
    lines.push(...body, "");
  }

  writeFileSync(path.join(OUT_DIR, "contract.prisma"), lines.join("\n"));
  return enums.size;
}

function jsonStringifySorted(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v as Record<string, unknown>).sort()) {
        out[k] = sort((v as Record<string, unknown>)[k]);
      }
      return out;
    }
    return v;
  };
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}

function main() {
  const { models, unsourced } = readModels();
  const enumCount = writeContract(models);

  // The seed and the browser reader both need to know where each model lives
  // and which of its columns are instants. Postgres hands timestamptz back as a
  // Date, and every screen compares the naive-UTC strings the fixtures use, so
  // those columns are selected as text instead. Duplicating this in TypeScript
  // is how it would drift.
  const tables: Record<string, { table: string; instants: string[] }> = {};
  for (const model of models) {
    tables[model.name] = {
      // Prisma lowercases the leading character and leaves the rest alone.
      table: model.name[0].toLowerCase() + model.name.slice(1),
      instants: model.columns
        .filter((c) => c.prisma === "TimestamptzString")
        .map((c) => c.name)
        .sort(),
    };
  }

  writeFileSync(path.join(OUT_DIR, "models.json"), jsonStringifySorted(MODEL));
  writeFileSync(path.join(OUT_DIR, "tables.json"), jsonStringifySorted(tables));

  console.log(
    `Wrote prisma/contract.prisma: ${models.length} models, ${enumCount} enums from openapi.json.`,
  );
  if (unsourced.length) {
    console.log(
      `\n${unsourced.length} enum-shaped columns openapi.json does not pin down. They are plain text\nin both schemas, and the Postgres build should settle them:`,
    );
    for (const entry of [...unsourced].sort()) console.log(`  ${entry}`);
  }
}

main();
