import { PGlite } from "@electric-sql/pglite";
import modelForFile from "../../prisma/models.json";
import tableInfo from "../../prisma/tables.json";
import { asset } from "../lib/asset";

/**
 * The prototype's data is Postgres.
 *
 * `public/prototype.pgdata` is a real Postgres data directory, built by
 * `mise run seed` from the fixtures through `prisma/postgres.sql` with foreign
 * keys and check constraints enforced. The tab opens that directory with PGlite,
 * which is Postgres compiled to WebAssembly, so the schema the prototype renders
 * is the same schema the FastAPI build will run rather than an approximation of
 * it in another engine.
 *
 * There is still no server. The data directory is a static asset like any image,
 * and the database runs inside the tab.
 */

type TableInfo = { table: string; instants: string[] };

const TABLES = tableInfo as Record<string, TableInfo>;
const MODEL_FOR_FILE = modelForFile as Record<string, string>;

/**
 * Dataset keys collapsed to a convenience object (one demo row today) rather
 * than an array — a read-model choice, not a database constraint; none of
 * these tables caps row count.
 */
const SINGLE_ROW_KEYS = new Set(["user"]);

/** Which fixture file each Dataset key came from, so tables map back to keys. */
const FILE_FOR_KEY: Record<string, string> = {
  user: "users",
  patients: "patients",
  experts: "experts",
  expertSchedule: "expert-schedule",
  expertScheduleExceptions: "expert-schedule-exceptions",
  expertSchedulingRules: "expert-scheduling-rules",
  expertAvailability: "expert-availability",
  consultations: "consultations",
  careAccessGrants: "care-access-grants",
  historyReadEvents: "history-read-events",
  clinicalSafetyContexts: "clinical-safety-contexts",
  consentRecords: "consent-records",
  soapNotes: "soap-notes",
  prescriptions: "prescriptions",
  labOrders: "lab-orders",
  chatMessages: "chat-messages",
  logEntries: "log-entries",
  insights: "insights",
  companionMessages: "companion-messages",
  companionMemory: "companion-memory",
  providers: "providers",
  providerCredentials: "provider-credentials",
  providerRequests: "provider-requests",
  providerScheduleExceptions: "provider-schedule-exceptions",
  providerSlots: "provider-schedule-slots",
  paymentMethods: "payment-methods",
  checkoutPayments: "checkout-payments",
  clinicalComplaintReferrals: "clinical-complaint-referrals",
  providerPayouts: "provider-payouts",
  payoutSupportRequests: "payout-support-requests",
  expertPayoutDetails: "expert-payout-details",
  payoutHistory: "expert-payout-history",
  disputes: "payment-disputes",
  refundRequests: "refund-requests",
  reports: "reports",
  deviceSessions: "device-sessions",
  notificationPreferences: "notification-preferences",
  twoFactorSettings: "two-factor-settings",
  referralCodes: "referral-code",
  applicationsQueue: "applications-queue",
  applicationDetails: "application-details",
  disputeQueue: "dispute-queue",
  refundQueue: "refund-queue",
  standingQueue: "standing-queue",
  staffAccounts: "staff-accounts",
  supportCases: "support-cases",
  privacyRequests: "privacy-requests",
  feedbackEntries: "feedback-entries",
  governanceApplications: "governance-applications",
  governanceAudit: "governance-audit",
  governanceAccess: "governance-access",
  governanceRevisions: "governance-revisions",
  governanceAssignments: "governance-assignments",
};

/**
 * Fixture timestamps are naive UTC and every screen compares those strings, so
 * `timestamptz` columns are read back as text in exactly that shape. Reading them
 * as the driver's default would hand each screen a Date object instead.
 */
const INSTANT_FORMAT = `'YYYY-MM-DD"T"HH24:MI:SS'`;

async function dataDirectory(): Promise<Blob> {
  if (typeof window === "undefined") {
    // The flow scripts run in Node, where there is nothing to fetch from. They
    // read the same file the browser is served.
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const file = fileURLToPath(new URL("../../public/prototype.pgdata", import.meta.url));
    return new Blob([readFileSync(file)]);
  }
  // Where the data directory is served from, and where the seed writes it.
  const response = await fetch(asset("/prototype.pgdata"));
  if (!response.ok) {
    throw new Error(
      "Could not load prototype.pgdata. Run `mise run seed` to build it from the fixtures.",
    );
  }
  return response.blob();
}

/** Opens the shipped database. Its bytes are the reset point the bar returns to. */
export async function openPrototypeDatabase(): Promise<PGlite> {
  const db = new PGlite({ loadDataDir: await dataDirectory() });
  await db.waitReady;
  await db.exec("set time zone 'UTC'");
  return db;
}

async function columnsOf(db: PGlite, table: string): Promise<string[]> {
  const result = await db.query<{ column_name: string }>(
    "select column_name from information_schema.columns " +
      "where table_schema = 'public' and table_name = $1 order by ordinal_position",
    [table],
  );
  return result.rows.map((row) => row.column_name);
}

async function readTable(db: PGlite, info: TableInfo): Promise<Record<string, unknown>[]> {
  const columns = await columnsOf(db, info.table);
  const instants = new Set(info.instants);
  const selected = columns.map((column) =>
    instants.has(column)
      ? `to_char("${column}" at time zone 'UTC', ${INSTANT_FORMAT}) as "${column}"`
      : `"${column}"`,
  );
  const result = await db.query<Record<string, unknown>>(
    `select ${selected.join(", ")} from "public"."${info.table}"`,
  );
  return result.rows;
}

/**
 * Every table, read once into the working shape the screens already use.
 *
 * The store mutates that working copy and writes it back, which keeps every
 * screen's `update(draft => ...)` intact rather than rewriting several hundred
 * call sites as SQL for a prototype that has no server to talk to anyway.
 */
export async function readDataset(db: PGlite): Promise<Record<string, unknown>> {
  const dataset: Record<string, unknown> = {};
  for (const [key, file] of Object.entries(FILE_FOR_KEY)) {
    const model = MODEL_FOR_FILE[file];
    const info = model ? TABLES[model] : undefined;
    if (!info) continue;
    const rows = await readTable(db, info);
    dataset[key] = SINGLE_ROW_KEYS.has(key) ? (rows[0] ?? {}) : rows;
  }
  return dataset;
}
