/**
 * Shared vocabulary between scripts/gen-fixtures.ts and scripts/gen-prisma.ts.
 *
 * Both scripts need to agree on which fixture file backs which model, where
 * each model's shape is declared in Product_Docs/openapi.json, and which of
 * its columns openapi.json types as a UUID. Keeping one copy here is how
 * gen-fixtures.ts's UUID rewrite and gen-prisma.ts's `Uuid` columns stay the
 * same set of fields without a second list to keep in sync by hand.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SPEC = path.join(HERE, "..", "..", "..", "Product_Docs", "openapi.json");

// A fixed namespace so `uid("pat_amara")` returns the same UUID on every run.
// Fixtures are checked into git, so a random UUID per regeneration would make
// every foreign key change on every run for no reason; uuid5 makes the id a
// pure function of the slug instead.
const NAMESPACE = "8f4d9c9e-2b3a-4e2a-9c3e-6d6f2b8a5c11";

function parseUuid(value: string): Buffer {
  const hex = value.replace(/-/g, "");
  return Buffer.from(hex, "hex");
}

function formatUuid(bytes: Buffer): string {
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

/** RFC 4122 UUID5 (namespace + SHA-1), the same algorithm Python's uuid.uuid5 uses. */
function uuid5(namespace: string, name: string): string {
  const hash = createHash("sha1")
    .update(parseUuid(namespace))
    .update(Buffer.from(name, "utf8"))
    .digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  return formatUuid(bytes);
}

/** The stable UUID a human-readable fixture slug (e.g. "pat_amara") maps to. */
export function uid(slug: string): string {
  return uuid5(NAMESPACE, slug);
}

// One model per collection file. Names follow app/data/types.ts. No model is
// a fixed-key "singleton" — some (User, ReferenceData...) just ship one demo
// row today, same as Patient ships four; every row still gets a real id.
export const MODEL: Record<string, string> = {
  accounts: "Account",
  "application-details": "ProviderApplicationDetail",
  "applications-queue": "ProviderApplicationQueueItem",
  "care-access-grants": "CareAccessGrant",
  "chat-messages": "ChatMessage",
  "checkout-payments": "CheckoutPayment",
  "clinical-complaint-referrals": "ClinicalComplaintReferral",
  "clinical-safety-contexts": "ClinicalSafetyContext",
  "companion-memory": "CompanionMemory",
  "companion-messages": "CompanionMessage",
  "consent-records": "ConsentRecord",
  consultations: "Consultation",
  "device-sessions": "DeviceSession",
  "dispute-queue": "PaymentDisputeQueueItem",
  "expert-availability": "ExpertAvailabilitySlot",
  "expert-payout-details": "ExpertPayoutDetails",
  "expert-payout-history": "ExpertPayoutHistoryEntry",
  "expert-schedule-exceptions": "ExpertScheduleException",
  "expert-schedule": "ExpertScheduleSlot",
  "expert-scheduling-rules": "ExpertSchedulingRules",
  experts: "Expert",
  "feedback-entries": "Feedback",
  "governance-access": "GovernanceAccess",
  "governance-applications": "GovernanceApplicationLink",
  "governance-assignments": "GovernanceAssignment",
  "governance-audit": "GovernanceAuditEvent",
  "governance-revisions": "GovernanceRevision",
  "history-read-events": "HistoryReadEvent",
  insights: "Insight",
  "lab-orders": "LabOrder",
  "log-entries": "LogEntry",
  members: "Member",
  meta: "FixtureMeta",
  "notification-preferences": "NotificationPreferences",
  organizations: "Organization",
  patients: "Patient",
  "payment-disputes": "PaymentDispute",
  "payment-methods": "PaymentMethod",
  "payout-support-requests": "PayoutSupportRequest",
  prescriptions: "Prescription",
  "privacy-requests": "PrivacyRequest",
  "provider-credentials": "ProviderCredential",
  "provider-payouts": "ProviderPayout",
  "provider-requests": "ProviderRequest",
  "provider-schedule-exceptions": "ProviderScheduleException",
  "provider-schedule-slots": "ProviderScheduleSlot",
  "provider-sessions": "ProviderSession",
  providers: "Provider",
  reference: "ReferenceData",
  "referral-code": "PatientReferralCode",
  "refund-queue": "RefundRequestQueueItem",
  "refund-requests": "RefundRequest",
  reports: "Report",
  "soap-notes": "SoapNote",
  "staff-accounts": "StaffAccount",
  "standing-queue": "StandingQueueItem",
  "support-cases": "SupportCase",
  users: "User",
  verifications: "Verification",
  "two-factor-settings": "TwoFactorSettings",
};

// Where each model's shape is defined in openapi.json. The convention is
// "<Model>Read"; these do not follow it, and the rest are prototype-only
// fixtures with no API resource behind them.
export const SPEC_SCHEMA: Record<string, string> = {
  ExpertPayoutHistoryEntry: "ExpertPayoutHistoryRead",
  NotificationPreferences: "NotificationPreferenceRead",
  Provider: "ProviderDirectoryRead",
  LabOrder: "LabOrderDetailRead",
  LogEntry: "LogEntryDetailRead",
};

// Fixtures with no API resource: minted, matched or held server-side, never
// returned as a resource of their own.
export const NO_SPEC = new Set([
  "Account",
  "FixtureMeta",
  "Member",
  "Organization",
  "PayoutSupportRequest",
  "ReferenceData",
  "Verification",
]);

// UUID columns openapi.json cannot type, because it does not describe the model
// (a server-only table) or describes it only as a response that omits the
// column. Declared for the same reason RELATIONS is: a column's type is a
// decision, not something to infer from its name. Both generators read this —
// gen-fixtures.ts to write a real UUID, gen-prisma.ts to type the column.
//
// `Account.provider_id`/`account_id` are deliberately absent: those are
// Better-Auth's provider name ("phone_pin") and the identifier at that provider
// (the phone number), not foreign keys, despite how `provider_id` reads.
export const UUID_COLUMNS: Record<string, string[]> = {
  Account: ["id"],
  FixtureMeta: ["id"],
  Member: ["id"],
  Organization: ["id"],
  PayoutSupportRequest: ["id"],
  ProviderSession: ["id"],
  ReferenceData: ["id"],
  Verification: ["id"],
};

// Identifier fields inside a JSON column, which uuidIds() would otherwise never
// reach: it walks a row's own keys, and a nested snapshot object is one value
// among them.
//
// Postgres cannot help here. `provider_requests.disclosure_consent` is a `json`
// column, so a consent snapshot naming "pat_amara" while its own row names the
// UUID that slug became satisfies every constraint the database has and still
// points at nothing. The fixture contract check is what catches it, and this is
// what stops it happening.
export const NESTED_UUID_COLUMNS: Record<string, Record<string, string[]>> = {
  SoapNote: {
    guest_objective_contribution: ["expert_id"],
  },
  ProviderRequest: {
    disclosure_consent: ["id", "actor_user_id", "patient_identity_id"],
  },
};

// Declared relations, one entry per (field, target model). Only the ones the
// product actually depends on: a consultation belongs to a patient and an
// expert, a prescription belongs to a consultation, and so on. A foreign key
// is a product decision, so these are written down rather than guessed from
// names. gen-fixtures.ts also reads this, to UUID-convert an FK column
// openapi.json's response schema is silent on (it never echoes another
// resource's id back).
export const RELATIONS: Record<string, [string, string][]> = {
  Consultation: [
    ["patient_identity_id", "Patient"],
    ["expert_id", "Expert"],
  ],
  ClinicalSafetyContext: [["patient_id", "Patient"]],
  CareAccessGrant: [["patient_identity_id", "Patient"]],
  SoapNote: [["consultation_id", "Consultation"]],
  Prescription: [["consultation_id", "Consultation"]],
  LabOrder: [["consultation_id", "Consultation"]],
  ChatMessage: [["consultation_id", "Consultation"]],
  LogEntry: [["patient_id", "Patient"]],
  Insight: [["patient_id", "Patient"]],
  CompanionMessage: [["patient_id", "Patient"]],
  CompanionMemory: [["patient_id", "Patient"]],
  ProviderCredential: [["provider_id", "Provider"]],
  ProviderScheduleSlot: [["provider_id", "Provider"]],
  ExpertScheduleSlot: [["expert_id", "Expert"]],
  ExpertSchedulingRules: [["expert_id", "Expert"]],
  ExpertAvailabilitySlot: [["expert_id", "Expert"]],
  ExpertScheduleException: [["expert_id", "Expert"]],
  ExpertPayoutDetails: [["expert_id", "Expert"]],
  ExpertPayoutHistoryEntry: [["expert_id", "Expert"]],
  ProviderScheduleException: [["provider_id", "Provider"]],
  PatientReferralCode: [["patient_id", "Patient"]],
  Report: [["patient_id", "Patient"]],
  PaymentDispute: [
    ["consultation_id", "Consultation"],
    ["provider_request_id", "ProviderRequest"],
  ],
  Account: [["user_id", "User"]],
  DeviceSession: [["user_id", "User"]],
  // Forward capacity for §5's hospital/clinic Organization.
  Member: [
    ["organization_id", "Organization"],
    ["user_id", "User"],
  ],
  Expert: [["organization_id", "Organization"]],
  Provider: [["organization_id", "Organization"]],
  // A governance case is worked by exactly one staff reviewer. Its subject and
  // actor ids stay plain text: each points into one of several tables depending
  // on the case, which is not a foreign key Postgres can hold.
  GovernanceApplicationLink: [
    ["application_id", "ProviderApplicationDetail"],
    ["assigned_staff_id", "StaffAccount"],
  ],
  GovernanceAssignment: [["staff_id", "StaffAccount"]],
  // A read event names the expert who read and the patient who was read. Both
  // are real foreign keys, unlike the governance ids above: there is no
  // polymorphism here, only an expert and a patient.
  HistoryReadEvent: [
    ["expert_id", "Expert"],
    ["patient_identity_id", "Patient"],
  ],
  ConsentRecord: [["patient_id", "Patient"]],
};

// Models with exactly one row per parent, so the foreign key is the primary
// key. One scheduling rule set and one payout destination per expert, one SOAP
// note per consultation, one referral code per patient: a second of any of them
// would be a bug, and the schema should say so.
export const PRIMARY_KEY: Record<string, string> = {
  ExpertPayoutDetails: "expert_id",
  GovernanceAccess: "actor_id",
  GovernanceApplicationLink: "application_id",
  GovernanceAssignment: "subject_id",
  GovernanceRevision: "subject_id",
  ExpertSchedulingRules: "expert_id",
  PatientReferralCode: "patient_id",
  SoapNote: "consultation_id",
};

/** Where openapi.json describes this model. Most follow the <Model>Read convention. */
export function resolveSchema(schemas: Record<string, unknown>, modelName: string): string | null {
  if (NO_SPEC.has(modelName)) return null;
  const override = SPEC_SCHEMA[modelName];
  if (override) return override in schemas ? override : null;
  for (const candidate of [`${modelName}Read`, modelName, `${modelName}DetailRead`]) {
    if (candidate in schemas) return candidate;
  }
  return null;
}

type JsonSchema = Record<string, unknown>;

const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]*$/;

function resolveRef(
  schemas: Record<string, JsonSchema>,
  node: unknown,
): [string | null, JsonSchema | undefined] {
  if (node && typeof node === "object" && "$ref" in node) {
    const name = (node as { $ref: string }).$ref.split("/").pop() as string;
    return [name, schemas[name]];
  }
  return [null, node as JsonSchema | undefined];
}

/** A nullable/optional field is a union; look inside for the real type. */
function branches(
  schemas: Record<string, JsonSchema>,
  node: JsonSchema,
): [string | null, JsonSchema | undefined][] {
  const result: [string | null, JsonSchema | undefined][] = [[null, node]];
  const union = (node.anyOf ?? node.oneOf) as unknown[] | undefined;
  for (const branch of union ?? []) result.push(resolveRef(schemas, branch));
  return result;
}

/**
 * Every property of a schema, including the ones it only has through `allOf`.
 * `ExpertScheduleExceptionRead` is `allOf: [ExpertScheduleExceptionCreate, {id}]`
 * and has no `properties` of its own, so reading `.properties` alone saw an empty
 * schema and typed its columns from the fixtures instead of the specification.
 */
function propertiesOf(
  schemas: Record<string, JsonSchema>,
  node: JsonSchema | undefined,
  seen = new Set<string>(),
): Record<string, unknown> {
  if (!node) return {};
  const found: Record<string, unknown> = {};
  // Composed branches first, so a schema's own property wins over an inherited one.
  for (const branch of (node.allOf as unknown[] | undefined) ?? []) {
    const [name, target] = resolveRef(schemas, branch);
    if (name) {
      if (seen.has(name)) continue;
      seen.add(name);
    }
    Object.assign(found, propertiesOf(schemas, target, seen));
  }
  Object.assign(found, (node.properties as JsonSchema) ?? {});
  return found;
}

/** True for `{"type": "string", "format": "uuid"}`, including this spec's nullable
 * spelling `{"type": ["string", "null"], "format": "uuid"}` — a nullable ref or enum
 * instead uses `anyOf`, which `branches()` unwraps. */
function isUuidString(node: JsonSchema | undefined): boolean {
  if (node?.format !== "uuid") return false;
  const t = node.type;
  return t === "string" || (Array.isArray(t) && t.includes("string"));
}

export interface LoadedSpec {
  schemas: Record<string, JsonSchema>;
  enumsOf(schemaName: string): Record<string, [string | null, string[]]>;
  /** Every property the schema permits to be null. */
  nullablePropsOf(schemaName: string): Set<string>;
  /** Property name -> "scalar" or "array" for every column openapi.json types as a
   * UUID (direct, nullable, or an array of them), e.g. Insight.source_log_entries. */
  uuidPropsOf(schemaName: string): Record<string, "scalar" | "array">;
}

/** The parsed component schemas from openapi.json, plus lookups keyed by schema name. */
export function loadSpec(): LoadedSpec {
  const schemas = JSON.parse(readFileSync(SPEC, "utf8")).components.schemas as Record<
    string,
    JsonSchema
  >;

  function enumsOf(schemaName: string) {
    const schema = schemas[schemaName];
    const found: Record<string, [string | null, string[]]> = {};
    if (!schema) return found;
    for (const [prop, node] of Object.entries(propertiesOf(schemas, schema))) {
      let [name, target] = resolveRef(schemas, node);
      if (target && !target.enum) {
        for (const [branchName, branchTarget] of branches(schemas, target)) {
          if (branchTarget?.enum) {
            name = branchName;
            target = branchTarget;
            break;
          }
        }
      }
      if (target && Array.isArray(target.enum)) {
        const values = (target.enum as unknown[]).filter(
          (v): v is string => typeof v === "string" && v !== "None",
        );
        if (values.length && values.every((v) => IDENTIFIER.test(v))) found[prop] = [name, values];
      }
    }
    return found;
  }

  /**
   * Nullability is a contract decision, so it is read from openapi.json rather
   * than inferred from whether the demo cast happened to fill the column in.
   * Only an explicit null is nullable here: `{"type": ["string", "null"]}` or a
   * `null` branch of an anyOf/oneOf. A property merely missing from `required`
   * is a statement about the response shape, not about what the column may
   * hold, and the fixtures already make a sometimes-absent key optional.
   */
  function nullablePropsOf(schemaName: string) {
    const schema = schemas[schemaName];
    const found = new Set<string>();
    if (!schema) return found;
    const permitsNull = (node: JsonSchema | undefined): boolean => {
      if (!node) return false;
      const type = node.type;
      if (type === "null" || (Array.isArray(type) && type.includes("null"))) return true;
      return branches(schemas, node)
        .slice(1)
        .some(([, branch]) => permitsNull(branch));
    };
    for (const [prop, node] of Object.entries(propertiesOf(schemas, schema))) {
      const [, target] = resolveRef(schemas, node);
      if (permitsNull(target)) found.add(prop);
    }
    return found;
  }

  function uuidPropsOf(schemaName: string) {
    const schema = schemas[schemaName];
    const found: Record<string, "scalar" | "array"> = {};
    if (!schema) return found;
    for (const [prop, node] of Object.entries(propertiesOf(schemas, schema))) {
      const [, target] = resolveRef(schemas, node);
      const candidates = target ? [target, ...branches(schemas, target).map(([, b]) => b)] : [];
      const defined = candidates.filter((c): c is JsonSchema => Boolean(c));
      if (defined.some(isUuidString)) {
        found[prop] = "scalar";
      } else if (
        defined.some((c) => c.type === "array" && isUuidString(resolveRef(schemas, c.items)[1]))
      ) {
        found[prop] = "array";
      }
    }
    return found;
  }

  return { schemas, enumsOf, nullablePropsOf, uuidPropsOf };
}

/** Whether `columnName` on `modelName` is a UUID — from openapi.json where it
 * describes the column, from UUID_COLUMNS where it cannot. */
export function columnIsUuid(spec: LoadedSpec, modelName: string, columnName: string): boolean {
  if (UUID_COLUMNS[modelName]?.includes(columnName)) return true;
  const schemaName = resolveSchema(spec.schemas, modelName);
  return schemaName !== null && spec.uuidPropsOf(schemaName)[columnName] === "scalar";
}

/** Whether `modelName`'s own `id` is a UUID — resolved without reading any fixture
 * row, so a relation's target type is known before that target has been loaded. */
export function modelIdIsUuid(spec: LoadedSpec, modelName: string): boolean {
  return columnIsUuid(spec, modelName, PRIMARY_KEY[modelName] ?? "id");
}
