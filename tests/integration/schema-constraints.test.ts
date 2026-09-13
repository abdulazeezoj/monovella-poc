/**
 * The generated Postgres schema, and whether its guards actually bite.
 *
 * `mise run seed` proves a good row goes in. It does not prove a bad one stays
 * out, and those are different claims: a schema whose foreign keys were emitted
 * as plain columns would seed exactly as happily and catch nothing. The
 * prototype leans on that enforcement — a dangling reference is meant to fail
 * the seed with the row named rather than break one screen at runtime — so it
 * is worth one layer that checks the guards rather than assuming them.
 *
 * This is the prototype's only real infrastructure: PGlite is Postgres compiled
 * to WebAssembly, running the same `prisma/postgres.sql` the planned FastAPI
 * build will run.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));
const schema = readFileSync(path.join(root, "prisma", "postgres.sql"), "utf8");

let db: PGlite;

/** Postgres error codes, so a test says which guard it expects to fire. */
const FOREIGN_KEY_VIOLATION = "23503";
const NOT_NULL_VIOLATION = "23502";
const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";
const UNDEFINED_COLUMN = "42703";

async function failureCodeOf(sql: string): Promise<string | null> {
  try {
    await db.exec(sql);
    return null;
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  }
}

/** Ids for the two anchor rows every guard test builds on. */
const PATIENT = "00000000-0000-4000-8000-00000000aaaa";
const EXPERT = "00000000-0000-4000-8000-00000000bbbb";
const MISSING = "00000000-0000-4000-8000-00000000ffff";

beforeAll(async () => {
  // An in-memory database rather than the seeded data directory: these tests
  // insert deliberately broken rows, and none of them should be able to reach
  // public/prototype.pgdata.
  db = new PGlite();
  await db.exec(schema);

  // One valid patient and one valid expert, so a guard test can vary exactly
  // the thing it is testing. Without them a bad insert fails on a missing
  // column rather than on the constraint under test, which passes for the
  // wrong reason.
  await db.exec(`
    insert into "public"."patient" (
      "id", "monovella_id", "first_name", "last_name", "status", "date_of_birth",
      "gender", "is_dependant", "created_at", "address", "city",
      "local_government_area", "state"
    ) values (
      '${PATIENT}', 'MV-TEST-0001', 'Test', 'Patient', 'VERIFIED', '1990-01-01',
      'FEMALE', false, '2026-08-29T09:15:00Z', '1 Test Close', 'Lagos', 'Ikeja', 'Lagos'
    );
    insert into "public"."expert" (
      "id", "first_name", "last_name", "professional_type", "specialty", "gender",
      "availability_status", "consultation_fee_kobo", "years_practising",
      "licence_number", "bio", "credentials", "address", "city",
      "local_government_area"
    ) values (
      '${EXPERT}', 'Test', 'Expert', 'DOCTOR', 'DERMATOLOGY', 'FEMALE',
      'ONLINE', 1500000, 9, 'TEST-0001', 'A fixture expert.', '[]'::json,
      '2 Test Close', 'Lagos', 'Ikeja'
    );
  `);
}, 180_000);

afterAll(async () => {
  await db?.close();
});

describe("generated Postgres schema", () => {
  it("applies cleanly from nothing", async () => {
    const { rows } = await db.query<{ count: string }>(
      "select count(*)::text as count from information_schema.tables where table_schema = 'public'",
    );
    // 60 models at the time of writing. The exact figure moves with the
    // fixtures; what matters is that the whole file applied rather than
    // stopping partway through.
    expect(Number(rows[0].count)).toBeGreaterThan(50);
  });

  it("constrains every enumerated column to the values the contract defines", async () => {
    // The generator renders openapi.json's enums as CHECK constraints on text
    // columns rather than as CREATE TYPE, so this counts the checks. Either
    // shape is a real guard; a bare `text` column with neither is not.
    const { rows } = await db.query<{ count: string }>(
      "select count(*)::text as count from information_schema.table_constraints " +
        "where constraint_type = 'CHECK' and constraint_name like '%_check_%' " +
        "and table_schema = 'public'",
    );
    expect(
      Number(rows[0].count),
      "without these an unrecognised status would be stored as ordinary text",
    ).toBeGreaterThan(50);
  });

  it("declares foreign keys rather than plain columns", async () => {
    const { rows } = await db.query<{ count: string }>(
      "select count(*)::text as count from information_schema.table_constraints " +
        "where constraint_type = 'FOREIGN KEY' and table_schema = 'public'",
    );
    expect(
      Number(rows[0].count),
      "without real foreign keys a dangling reference seeds silently",
    ).toBeGreaterThan(20);
  });
});

describe("schema guards", () => {
  it("refuses a consultation pointing at a patient that does not exist", async () => {
    const code = await failureCodeOf(`
      insert into "public"."consultation" (
        "id", "patient_identity_id", "expert_id", "status", "requested_at",
        "expert_fee_kobo", "platform_fee_kobo"
      ) values (
        '00000000-0000-4000-8000-000000000001', '${MISSING}', '${EXPERT}',
        'REQUESTED', '2026-08-29T09:15:00Z', 1500000, 300000
      )
    `);
    expect(code, "a dangling patient reference was accepted").toBe(FOREIGN_KEY_VIOLATION);
  });

  it("refuses a status the specification does not define", async () => {
    const code = await failureCodeOf(`
      insert into "public"."consultation" (
        "id", "patient_identity_id", "expert_id", "status", "requested_at",
        "expert_fee_kobo", "platform_fee_kobo"
      ) values (
        '00000000-0000-4000-8000-000000000002', '${PATIENT}', '${EXPERT}',
        'DEFINITELY_NOT_A_STATUS', '2026-08-29T09:15:00Z', 1500000, 300000
      )
    `);
    expect(code, "the status column has no CHECK, so any string would be stored").toBe(
      CHECK_VIOLATION,
    );
  });

  it("refuses a row missing a required column", async () => {
    const code = await failureCodeOf(`
      insert into "public"."patient" ("id")
      values ('00000000-0000-4000-8000-000000000003')
    `);
    expect(code, "a patient with no name or status was accepted").toBe(NOT_NULL_VIOLATION);
  });

  it("refuses a duplicate primary key", async () => {
    const code = await failureCodeOf(`
      insert into "public"."patient" (
        "id", "monovella_id", "first_name", "last_name", "status",
        "date_of_birth", "gender", "is_dependant", "created_at",
        "address", "city", "local_government_area", "state"
      ) values (
        '${PATIENT}', 'MV-TEST-0002', 'Another', 'Patient',
        'VERIFIED', '1990-01-01', 'FEMALE', false, '2026-08-29T09:15:00Z',
        '1 Test Close', 'Lagos', 'Ikeja', 'Lagos'
      )
    `);
    expect(code, "two rows shared a primary key").toBe(UNIQUE_VIOLATION);
  });

  it("stores instants as timestamptz, not as text", async () => {
    const { rows } = await db.query<{ data_type: string }>(
      "select data_type from information_schema.columns " +
        "where table_name = 'consultation' and column_name = 'requested_at'",
    );
    expect(rows[0]?.data_type, "an instant stored as text cannot be compared or ordered").toBe(
      "timestamp with time zone",
    );
  });
});

// Referenced so the linter keeps the constant beside the others it belongs
// with, even while no test currently provokes an unknown column.
void UNDEFINED_COLUMN;
