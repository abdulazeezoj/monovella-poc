/**
 * Generates the prototype's JSON fixtures.
 *
 * Every record matches a schema in Product_Docs/openapi.json v0.34.0. Timestamps
 * are naive UTC (PRODUCT_ARCH_V0.md §3) and anchored to a fixed demo clock so a
 * screenshot taken today and one taken next month tell the same story.
 *
 * Run:  pnpm exec vite-node scripts/gen-fixtures.ts
 */
import { statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadSpec,
  MODEL,
  modelIdIsUuid,
  NESTED_UUID_COLUMNS,
  RELATIONS,
  resolveSchema,
  UUID_COLUMNS,
  uid,
} from "./prisma-common";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "app", "data");

const ANCHOR_MS = Date.UTC(2026, 7, 29, 9, 15, 0);

// Ids below stay readable slugs ("pat_amara"); write() converts each one
// openapi.json types `format: uuid` into a real, deterministic UUID on the
// way out, so nothing here has to spell a UUID out by hand.
const SPEC = loadSpec();

function asUuid(slug: unknown): unknown {
  return typeof slug === "string" && slug ? uid(slug) : slug;
}

function uuidIds(stem: string, payload: unknown): unknown {
  const modelName = MODEL[stem];
  const specName = modelName ? resolveSchema(SPEC.schemas, modelName) : null;
  const uuidProps: Record<string, "scalar" | "array"> = specName
    ? { ...SPEC.uuidPropsOf(specName) }
    : {};
  // A relation's own field is often not in its model's response schema at all —
  // DeviceSessionRead never echoes back `account_id`, a client already knows
  // whose session it is — so openapi.json has nothing to say about its type.
  // It still has to become the same UUID its target's `id` became, or the
  // foreign key this relation declares can never be satisfied.
  for (const [field, target] of RELATIONS[modelName ?? ""] ?? []) {
    if (modelIdIsUuid(SPEC, target)) {
      if (!(field in uuidProps)) uuidProps[field] = "scalar";
    }
  }
  // Server-only tables openapi.json does not describe at all declare their UUID
  // columns instead, so both generators agree on the same set.
  for (const field of UUID_COLUMNS[modelName ?? ""] ?? []) {
    if (!(field in uuidProps)) uuidProps[field] = "scalar";
  }
  const nestedProps = NESTED_UUID_COLUMNS[modelName ?? ""] ?? {};
  if (Object.keys(uuidProps).length === 0 && Object.keys(nestedProps).length === 0) {
    return payload;
  }

  function convert(row: unknown): unknown {
    if (row === null || typeof row !== "object" || Array.isArray(row)) return row;
    // A copy, never a mutation: the rest of this script keeps cross-referencing
    // the original slugs (e.g. `rules_by_expert[expert_id]`) long after a
    // write() call, so the object handed to write() must not change under it.
    const copy: Record<string, unknown> = { ...(row as Record<string, unknown>) };
    for (const [key, kind] of Object.entries(uuidProps)) {
      const value = copy[key];
      if (value === null || value === undefined) continue;
      if (kind === "scalar") {
        copy[key] = asUuid(value);
      } else if (kind === "array" && Array.isArray(value)) {
        copy[key] = value.map((item) => asUuid(item));
      }
    }
    // Identifiers inside a JSON column. Without this the snapshot keeps the
    // slugs it was built from while its own row carries UUIDs, which no
    // constraint can see because the column is `json`.
    for (const [key, fields] of Object.entries(nestedProps)) {
      const value = copy[key];
      if (value === null || typeof value !== "object" || Array.isArray(value)) continue;
      const nested: Record<string, unknown> = { ...(value as Record<string, unknown>) };
      for (const field of fields) {
        if (nested[field] === null || nested[field] === undefined) continue;
        nested[field] = asUuid(nested[field]);
      }
      copy[key] = nested;
    }
    return copy;
  }

  if (Array.isArray(payload)) return payload.map((row) => convert(row));
  return convert(payload);
}

interface Delta {
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

function addDelta(ms: number, kw: Delta): number {
  const deltaMs =
    (kw.days ?? 0) * 86400000 +
    (kw.hours ?? 0) * 3600000 +
    (kw.minutes ?? 0) * 60000 +
    (kw.seconds ?? 0) * 1000;
  return ms + deltaMs;
}

function pad(n: number, len = 2): string {
  return String(n).padStart(len, "0");
}

/** ANCHOR.isoformat(timespec="seconds")-style naive-UTC instant: "2026-08-29T09:15:00". No timezone suffix. */
function isoDateTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** Just the date part: "2026-08-29". */
function isoDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Just the time-of-day, minute precision: "09:15". */
function isoTimeMinutes(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Midnight (00:00) of the calendar date `instantMs` falls on. */
function dayMidnightMs(instantMs: number): number {
  const d = new Date(instantMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Python's datetime.weekday(): Monday=0 .. Sunday=6 (JS getUTCDay() is Sunday=0 .. Saturday=6). */
function pyWeekday(ms: number): number {
  return (new Date(ms).getUTCDay() + 6) % 7;
}

function ts(kw: Delta = {}): string {
  return isoDateTime(addDelta(ANCHOR_MS, kw));
}

function dateStr(kw: Delta = {}): string {
  return isoDate(addDelta(ANCHOR_MS, kw));
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function dayOfMonth(ms: number): number {
  return new Date(ms).getUTCDate();
}

function monthName(ms: number): string {
  return MONTH_NAMES[new Date(ms).getUTCMonth()];
}

/** s.removeprefix(prefix) */
function removePrefix(s: string, prefix: string): string {
  return s.startsWith(prefix) ? s.slice(prefix.length) : s;
}

/** urllib.parse.quote(string, safe='/'): percent-encode every UTF-8 byte outside the
 * RFC 3986 unreserved set (plus the given `safe` characters), uppercase hex. */
function pyQuote(input: string, safe = "/"): string {
  const alwaysSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.-~";
  const safeSet = new Set([...alwaysSafe, ...safe]);
  const bytes = Buffer.from(input, "utf8");
  let out = "";
  for (const byte of bytes) {
    const ch = String.fromCharCode(byte);
    if (byte < 128 && safeSet.has(ch)) {
      out += ch;
    } else {
      out += `%${byte.toString(16).toUpperCase().padStart(2, "0")}`;
    }
  }
  return out;
}

/** A plausible stylus-drawn sketch, for the one demo SoapAttachment fixture
 * that stands in for a real drawing (a photo attachment has no equivalent —
 * this prototype never simulates a real camera capture, same as FileDrop
 * elsewhere). */
function sketchDataUri(): string {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420">' +
    '<rect width="640" height="420" fill="#f5f2ec"/>' +
    '<g fill="none" stroke="#211d18" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
    // a simple lower-abdomen outline, quartered, for marking where the tenderness was found
    '<rect x="220" y="90" width="200" height="160" rx="18"/>' +
    '<line x1="220" y1="170" x2="420" y2="170"/>' +
    '<line x1="320" y1="90" x2="320" y2="250"/>' +
    // circled X over the lower-left quadrant
    '<circle cx="270" cy="215" r="26"/>' +
    '<path d="M258 203 L 282 227 M 282 203 L 258 227"/>' +
    "</g>" +
    '<text x="150" y="300" font-family="monospace" font-size="18" fill="#211d18">' +
    "L lower quadrant: mild tenderness, no mass</text>" +
    "</svg>";
  return `data:image/svg+xml,${pyQuote(svg)}`;
}

function formatBytes(n: number): string {
  return n.toLocaleString("en-US").padStart(7);
}

function write(name: string, payload: unknown): void {
  const stem = name.endsWith(".json") ? name.slice(0, -5) : name;
  const converted = uuidIds(stem, payload);
  const filePath = path.join(OUT, name);
  writeFileSync(filePath, `${JSON.stringify(converted, null, 2)}\n`, { encoding: "utf-8" });
  console.log(`  ${name.padEnd(34)} ${formatBytes(statSync(filePath).size)} bytes`);
}

// ─────────────────────────────────────────────────────────── meta ──

write("meta.json", {
  id: "meta",
  anchor: isoDateTime(ANCHOR_MS),
  openapi_version: "0.34.0",
  platform_fee_rate: 0.2,
  platform_fee_cap_kobo: 300000,
  note: "Demo data. No real patient, expert, pharmacy or lab is represented here.",
});

// ────────────────────────────────────────────────────── patients ──

const patients: Record<string, any>[] = [
  {
    id: "pat_amara",
    monovella_id: "MV-3K7P-2QX9",
    first_name: "Amara",
    last_name: "Okonkwo",
    status: "VERIFIED",
    date_of_birth: "1994-03-12",
    gender: "FEMALE",
    is_dependant: false,
    guardian_user_id: null,
    guardian_reason: null,
    verified_at: ts({ days: -214 }),
    created_at: ts({ days: -214, minutes: -40 }),
    photo_url: null,
  },
  {
    id: "pat_tobi",
    monovella_id: "MV-8W2D-5HR4",
    first_name: "Tobi",
    last_name: "Okonkwo",
    status: "PROVISIONAL",
    date_of_birth: "2018-07-04",
    gender: "MALE",
    is_dependant: true,
    guardian_user_id: "acc_amara",
    guardian_reason: "MINOR",
    verified_at: null,
    created_at: ts({ days: -186 }),
    photo_url: null,
  },
  {
    id: "pat_kelechi",
    monovella_id: "MV-4Q8H-7DK2",
    first_name: "Kelechi",
    last_name: "Okonkwo",
    status: "VERIFIED",
    date_of_birth: "2001-11-09",
    gender: "FEMALE",
    is_dependant: true,
    guardian_user_id: "acc_amara",
    guardian_reason: "HEALTH_CONDITION",
    verified_at: ts({ days: -96 }),
    created_at: ts({ days: -142 }),
    photo_url: null,
  },
  {
    id: "pat_zainab",
    monovella_id: "MV-6L9N-1CT7",
    first_name: "Zainab",
    last_name: "Okonkwo",
    status: "PROVISIONAL",
    date_of_birth: "2007-01-22",
    gender: "FEMALE",
    is_dependant: true,
    guardian_user_id: "acc_amara",
    guardian_reason: "NO_NIN_YET",
    verified_at: null,
    created_at: ts({ days: -4 }),
    photo_url: null,
  },
];
// Amara's own caseload, in her expert context — patient identities she sees, never their full record.
const caseload: [string, string, string, string, string][] = [
  ["pat_ngozi", "Ngozi", "Balogun", "1991-06-18", "FEMALE"],
  ["pat_sade", "Sade", "Ojo", "1979-09-30", "FEMALE"],
  ["pat_emeka", "Emeka", "Nnamdi", "1988-02-14", "MALE"],
  ["pat_bilkisu", "Bilkisu", "Sani", "2000-12-05", "FEMALE"],
  ["pat_dele", "Dele", "Faronbi", "1966-04-21", "MALE"],
  ["pat_chiamaka", "Chiamaka", "Udo", "1997-08-08", "FEMALE"],
];
caseload.forEach(([pid, fn, ln, dob, g], i) => {
  patients.push({
    id: pid,
    monovella_id: `MV-${4000 + i * 137}-${9100 + i * 53}`,
    first_name: fn,
    last_name: ln,
    status: "VERIFIED",
    date_of_birth: dob,
    gender: g,
    is_dependant: false,
    guardian_user_id: null,
    guardian_reason: null,
    verified_at: ts({ days: -300 + i * 11 }),
    created_at: ts({ days: -300 + i * 11 }),
    photo_url: null,
  });
});

const PATIENT_LOCATIONS: Record<string, [string, string, string, string]> = {
  pat_amara: ["11 Adebayo Doherty Street", "Lagos", "Ikeja", "Lagos"],
  pat_tobi: ["11 Adebayo Doherty Street", "Lagos", "Ikeja", "Lagos"],
  pat_kelechi: ["11 Adebayo Doherty Street", "Lagos", "Ikeja", "Lagos"],
  pat_zainab: ["11 Adebayo Doherty Street", "Lagos", "Ikeja", "Lagos"],
  pat_ngozi: ["14 Akerele Street", "Lagos", "Surulere", "Lagos"],
  pat_sade: ["22 Akin Adesola Street", "Lagos", "Eti-Osa", "Lagos"],
  pat_emeka: ["8 Ogui Road", "Enugu", "Enugu North", "Enugu"],
  pat_bilkisu: ["17 Lamido Crescent", "Abuja", "Abuja Municipal", "FCT"],
  pat_dele: ["31 Iyaganku GRA", "Ibadan", "Ibadan South West", "Oyo"],
  pat_chiamaka: ["5 Aba Road", "Port Harcourt", "Port-Harcourt", "Rivers"],
};
for (const patient of patients) {
  const [address, city, lga, state] = PATIENT_LOCATIONS[patient.id];
  Object.assign(patient, { address, city, local_government_area: lga, state });
}
write("patients.json", patients);

// Assumed prototype minimum pending qualified clinical governance. These are
// patient/guardian statements only; the prototype performs no clinical inference.
const clinicalSafetyContexts = [
  {
    id: "csc_amara_1",
    patient_id: "pat_amara",
    version: 1,
    source: "PATIENT",
    supplied_by_user_id: "acc_amara",
    allergies_answer: "NONE_KNOWN",
    reported_allergies: [],
    medicines_answer: "NOT_SURE",
    current_medicines: [],
    additional_context: null,
    confirmed_at: ts({ days: -220 }),
    supersedes_id: null,
    correction_reason: null,
  },
  {
    id: "csc_amara_2",
    patient_id: "pat_amara",
    version: 2,
    source: "PATIENT",
    supplied_by_user_id: "acc_amara",
    allergies_answer: "REPORTED",
    reported_allergies: [
      { substance: "Amoxicillin", reaction: "Raised itchy rash after the second dose" },
    ],
    medicines_answer: "NOT_SURE",
    current_medicines: [],
    additional_context: "I corrected this after remembering the antibiotic reaction.",
    confirmed_at: ts({ days: -1 }),
    supersedes_id: "csc_amara_1",
    correction_reason: "Remembered a prior medicine reaction.",
  },
  {
    id: "csc_tobi_1",
    patient_id: "pat_tobi",
    version: 1,
    source: "GUARDIAN",
    supplied_by_user_id: "acc_amara",
    allergies_answer: "NONE_KNOWN",
    reported_allergies: [],
    medicines_answer: "DECLINED",
    current_medicines: [],
    additional_context: null,
    confirmed_at: ts({ days: -12 }),
    supersedes_id: null,
    correction_reason: null,
  },
  {
    id: "csc_kelechi_1",
    patient_id: "pat_kelechi",
    version: 1,
    source: "GUARDIAN",
    supplied_by_user_id: "acc_amara",
    allergies_answer: "NOT_SURE",
    reported_allergies: [],
    medicines_answer: "NONE_KNOWN",
    current_medicines: [],
    additional_context: null,
    confirmed_at: ts({ days: -210 }),
    supersedes_id: null,
    correction_reason: null,
  },
];
write("clinical-safety-contexts.json", clinicalSafetyContexts);

// User is the root identity; credentials live on the separate Account row
// below (Better-Auth's "one login method linked to a user" shape, §5).
write("users.json", {
  id: "acc_amara",
  phone: "+234 802 411 9034",
  recovery_email: "amara.okonkwo@example.com",
  recovery_email_verified_at: ts({ days: -211 }),
  has_patient_identity: true,
  has_expert_identity: true,
  biometric_enabled: true,
  closure_status: "ACTIVE",
  closure_requested_at: null,
  created_at: ts({ days: -214, minutes: -45 }),
});

// Account = one login method linked to a User. V0 ships one: phone + PIN.
// Server-only, so the hash below is a placeholder shape, not a real one.
write("accounts.json", [
  {
    id: "usr_acc_amara",
    user_id: "acc_amara",
    provider_id: "phone_pin",
    account_id: "+234 802 411 9034",
    pin_hash: "argon2id$v=19$m=19456,t=2,p=1$ZGVtby1zYWx0$ZGVtby1waW4taGFzaA",
    pin_failed_attempts: 0,
    pin_locked_until: null,
    created_at: ts({ days: -214, minutes: -45 }),
    updated_at: ts({ days: -214, minutes: -45 }),
  },
]);

// Append-only consent evidence. Journeys add records through the mutable
// fixture dataset, and Reset Demo Data restores this shipped baseline.
//
// The one shipped row is the guardian's consent to Monovella holding and
// disclosing a dependant's record for care. It is captured when the dependant
// is added, never per read, so a treating expert is never blocked mid-care
// waiting on a parent. It is also not the lawful basis for that disclosure:
// NDPA s.30(1)(g) and NHA s.27 are, which is what stops a withdrawal leaving
// a doctor treating a child blind.
write("consent-records.json", [
  {
    id: "csr_001",
    acting_user_id: "acc_amara",
    patient_id: "pat_zainab",
    actor_capacity: "GUARDIAN",
    guardian_relationship: "PARENT",
    purpose: "DEPENDANT_RECORD_CARE",
    document_or_statement_version: "dependant-record-care-v1",
    action: "CONSENTED",
    occurred_at: ts({ days: -180 }),
    care_event_id: null,
    replaces_entry_id: null,
    withdrawn_entry_id: null,
  },
]);

// Data-minimised permission history. Ended grants preserve the care/audit link
// without implying continuing permission to browse unrelated patient history.
const careAccessGrants = [
  {
    id: "cag_001",
    patient_identity_id: "pat_amara",
    grantee_type: "EXPERT",
    grantee_id: "exp_bello",
    care_event_id: "con_001",
    purpose: "Specialist consultation",
    scope: "ENCOUNTER_RECORD",
    grant_source: "CARE_EVENT",
    status: "ENDED",
    granted_at: ts({ days: -190 }),
    ended_at: ts({ days: -190, hours: 1 }),
    end_reason: "CONSULTATION_COMPLETED",
  },
  {
    id: "cag_002",
    patient_identity_id: "pat_amara",
    grantee_type: "EXPERT",
    grantee_id: "exp_eze",
    care_event_id: "con_003",
    purpose: "Specialist consultation",
    scope: "PURPOSE_HISTORY",
    grant_source: "CARE_EVENT",
    status: "CURRENT",
    granted_at: ts({ hours: -1 }),
    ended_at: null,
    end_reason: null,
  },
  {
    id: "cag_003",
    patient_identity_id: "pat_amara",
    grantee_type: "EXPERT",
    grantee_id: "exp_lawal",
    care_event_id: "con_007",
    purpose: "Referral request",
    scope: "REQUEST_SUMMARY",
    grant_source: "CARE_EVENT",
    status: "CURRENT",
    granted_at: ts({ minutes: -8 }),
    ended_at: null,
    end_reason: null,
  },
  {
    id: "cag_004",
    patient_identity_id: "pat_amara",
    grantee_type: "GUEST_EXPERT",
    grantee_id: "exp_lawal",
    care_event_id: "con_011",
    purpose: "Guest examination",
    scope: "GUEST_EXAM_CONTEXT",
    grant_source: "CARE_EVENT",
    status: "ENDED",
    granted_at: ts({ days: -10 }),
    ended_at: ts({ days: -10, minutes: 35 }),
    end_reason: "EXAMINATION_COMPLETED",
  },
  {
    id: "cag_005",
    patient_identity_id: "pat_amara",
    grantee_type: "PHARMACY",
    grantee_id: "prv_ph_greenlife",
    care_event_id: "preq_001",
    purpose: "Prescription fulfilment",
    scope: "FULFILMENT_FIELDS",
    grant_source: "CARE_EVENT",
    status: "CURRENT",
    granted_at: ts({ days: -1 }),
    ended_at: null,
    end_reason: null,
  },
  {
    id: "cag_006",
    patient_identity_id: "pat_amara",
    grantee_type: "PHARMACY",
    grantee_id: "prv_ph_medplus",
    care_event_id: "preq_003",
    purpose: "Prescription fulfilment",
    scope: "FULFILMENT_FIELDS",
    grant_source: "CARE_EVENT",
    status: "ENDED",
    granted_at: ts({ days: -4 }),
    ended_at: ts({ days: -4, minutes: 12 }),
    end_reason: "PROVIDER_DECLINED",
  },
  {
    id: "cag_007",
    patient_identity_id: "pat_tobi",
    grantee_type: "EXPERT",
    grantee_id: "exp_adeyemi",
    care_event_id: "con_106",
    purpose: "Specialist consultation",
    scope: "PURPOSE_HISTORY",
    grant_source: "CARE_EVENT",
    status: "CURRENT",
    granted_at: ts({ minutes: -45 }),
    ended_at: null,
    end_reason: null,
  },
  {
    id: "cag_008",
    patient_identity_id: "pat_tobi",
    grantee_type: "PHARMACY",
    grantee_id: "prv_ph_greenlife",
    care_event_id: "preq_103",
    purpose: "Prescription fulfilment",
    scope: "FULFILMENT_FIELDS",
    grant_source: "CARE_EVENT",
    status: "CURRENT",
    granted_at: ts({ days: -2 }),
    ended_at: null,
    end_reason: null,
  },
];
write("care-access-grants.json", careAccessGrants);

// History reads. The grant above records that access was permitted; these
// record that it was used, which is what the expert is answerable for and what
// the patient sees in P69. Emergency reads are the ones worth finding here.
write("history-read-events.json", [
  {
    id: "hre_001",
    expert_id: "exp_adeyemi",
    patient_identity_id: "pat_amara",
    care_event_id: "con_001",
    sections: ["ALLERGIES", "DIAGNOSES", "PRESCRIPTIONS", "LAB_RESULTS", "ENCOUNTERS"],
    route: "NORMAL",
    read_at: ts({ days: -2, minutes: 6 }),
  },
  {
    id: "hre_002",
    expert_id: "exp_adeyemi",
    patient_identity_id: "pat_tobi",
    care_event_id: "con_106",
    sections: ["ALLERGIES", "DIAGNOSES", "PRESCRIPTIONS", "LAB_RESULTS", "ENCOUNTERS"],
    route: "NORMAL",
    read_at: ts({ minutes: -40 }),
  },
  {
    id: "hre_003",
    expert_id: "exp_ogunleye",
    patient_identity_id: "pat_amara",
    care_event_id: "con_002",
    sections: ["ALLERGIES", "PRESCRIPTIONS"],
    route: "EMERGENCY",
    read_at: ts({ days: -6, minutes: 14 }),
  },
]);

write("support-cases.json", [
  {
    id: "SUP-2026-0001",
    requester_role: "PATIENT",
    requester_id: "acc_amara",
    patient_identity_id: "pat_amara",
    category: "GENERAL",
    subject: "Calendar question",
    message: "I need help finding an older record.",
    status: "IN_REVIEW",
    submitted_at: ts({ hours: -7 }),
    response_due_by: ts({ hours: 17 }),
    last_response: "We are checking the record index and will reply here.",
    return_to: "/app/consultations",
    closed_at: null,
  },
  {
    id: "SUP-2026-0002",
    requester_role: "EXPERT",
    requester_id: "exp_adeyemi",
    patient_identity_id: null,
    category: "GENERAL",
    subject: "Availability question",
    message: "One saved availability window needs review.",
    status: "SUBMITTED",
    submitted_at: ts({ hours: -5 }),
    response_due_by: ts({ hours: 19 }),
    last_response: null,
    return_to: "/app/expert/availability",
    closed_at: null,
  },
  {
    id: "SUP-2026-0003",
    requester_role: "PHARMACY",
    requester_id: "prv_ph_greenlife",
    patient_identity_id: null,
    category: "GENERAL",
    subject: "Request list question",
    message: "A fulfilled request is still highlighted.",
    status: "WAITING_ON_CUSTOMER",
    submitted_at: ts({ hours: -3 }),
    response_due_by: ts({ hours: 21 }),
    last_response: "Please confirm the request reference shown on your screen.",
    return_to: "/pharmacy/requests",
    closed_at: null,
  },
  {
    id: "SUP-2026-0004",
    requester_role: "LAB",
    requester_id: "prv_lab_lagosdiag",
    patient_identity_id: null,
    category: "GENERAL",
    subject: "Upload acknowledgement",
    message: "I cannot see the acknowledgement for a result upload.",
    status: "RESOLVED",
    submitted_at: ts({ days: -2 }),
    response_due_by: ts({ days: -1 }),
    last_response: "The acknowledgement is now visible on the request.",
    return_to: "/lab/requests",
    closed_at: ts({ days: -1, hours: -3 }),
  },
]);

write("privacy-requests.json", [
  {
    id: "PRV-2026-0001",
    patient_identity_id: "pat_amara",
    request_type: "ACCESS",
    scope: "A copy of account and consultation information.",
    identity_status: "VERIFIED",
    status: "IN_REVIEW",
    submitted_at: ts({ days: -1 }),
    response_due_by: ts({ days: 6 }),
    response: null,
  },
]);

write("feedback-entries.json", [
  {
    id: "FDB-2026-0001",
    interaction_type: "EXPERT",
    interaction_id: "con_002",
    patient_identity_id: "pat_amara",
    submitted_by_user_id: "acc_amara",
    rating: 5,
    public_comment: "The plan was explained clearly.",
    comment_kind: "TEXT",
    voice_duration_seconds: null,
    moderation_status: "APPROVED",
    provider_response: "Thank you for sharing this.",
    submitted_at: ts({ days: -5 }),
  },
  // A spoken review, for the literacy bridge PRODUCT_VISION.md §2 commits to.
  // Stored and replayed as audio; never transcribed, for the same reason a chat
  // voice note is not (PRODUCT_SCREEN_V0.md, P44).
  {
    id: "FDB-2026-0002",
    interaction_type: "LAB",
    interaction_id: "preq_201",
    patient_identity_id: "pat_amara",
    submitted_by_user_id: "acc_amara",
    rating: 4,
    public_comment: "",
    comment_kind: "VOICE",
    voice_duration_seconds: 14,
    moderation_status: "PENDING",
    provider_response: null,
    submitted_at: ts({ days: -2 }),
  },
]);

// One row per (scope, subject): a person switching between their patient and
// expert context has two preference sets, so the scope is part of the key, not
// a column on one shared row. A setting that does not apply to a scope stays
// null there. `subject_id` is polymorphic across User, Provider and
// StaffAccount, so it carries no foreign key — the same shape CareAccessGrant's
// grantee already uses.
write("notification-preferences.json", [
  {
    id: "npref_patient",
    scope: "PATIENT",
    subject_id: "acc_amara",
    appointment_reminders: true,
    incoming_request_alerts: null,
    payment_fee_updates: true,
    credential_licence_reminders: null,
    queue_overdue_alerts: null,
    product_updates: true,
  },
  {
    id: "npref_expert",
    scope: "EXPERT",
    subject_id: "acc_amara",
    appointment_reminders: null,
    incoming_request_alerts: true,
    payment_fee_updates: true,
    credential_licence_reminders: true,
    queue_overdue_alerts: null,
    product_updates: true,
  },
  {
    id: "npref_pharmacy",
    scope: "PHARMACY",
    subject_id: "prv_ph_greenlife",
    appointment_reminders: null,
    incoming_request_alerts: true,
    payment_fee_updates: true,
    credential_licence_reminders: true,
    queue_overdue_alerts: null,
    product_updates: true,
  },
  {
    id: "npref_lab",
    scope: "LAB",
    subject_id: "prv_lab_lagosdiag",
    appointment_reminders: null,
    incoming_request_alerts: true,
    payment_fee_updates: true,
    credential_licence_reminders: true,
    queue_overdue_alerts: null,
    product_updates: true,
  },
  {
    id: "npref_staff",
    scope: "STAFF",
    subject_id: "stf_001",
    appointment_reminders: null,
    incoming_request_alerts: null,
    payment_fee_updates: null,
    credential_licence_reminders: null,
    queue_overdue_alerts: true,
    product_updates: null,
  },
]);

// TwoFactorSettingsRead is only enabled/method/recovery_codes_remaining — a
// TOTP seed and recovery codes are never returned once issued (§5, §12: "do not
// log TOTP secrets, recovery-code values..."). `totp_secret_encrypted` and
// `recovery_codes_hashed` are the columns that actually back an enabled
// factor; each placeholder below is a shape, not a real secret's ciphertext.
function twoFactor(
  id: string,
  subjectType: string,
  subjectId: string,
  enabled: boolean,
  method: string | null,
  remaining: number,
): Record<string, any> {
  return {
    id,
    subject_type: subjectType,
    subject_id: subjectId,
    enabled,
    method,
    recovery_codes_remaining: remaining,
    totp_secret_encrypted: enabled ? "enc:demo-totp-seed" : null,
    recovery_codes_hashed: enabled
      ? Array.from({ length: remaining }, (_, i) => `argon2id$demo-recovery-code-${i}`)
      : [],
  };
}

// One row per actor that can hold a second factor, not one row holding all of
// them. Staff policy (§5) requires an enabled factor before a production
// StaffSession is issued, which is a per-staff-account fact.
write("two-factor-settings.json", [
  twoFactor("2fa_user", "USER", "acc_amara", false, null, 0),
  twoFactor("2fa_pharmacy", "PROVIDER", "prv_ph_greenlife", false, null, 0),
  twoFactor("2fa_lab", "PROVIDER", "prv_lab_lagosdiag", false, null, 0),
  twoFactor("2fa_staff", "STAFF", "stf_001", true, "TOTP", 6),
]);

// Named in PRODUCT_ARCH_V0.md §5 and shaped in openapi.json (ProviderSessionRead,
// StaffSessionRead) but never listed back to a client as a resource of their
// own — a session is minted once and consumed, not browsed. The prototype has
// no server to mint one, so this stays empty, same as consent-records.json above.
write("provider-sessions.json", []);

// Verification = one pending, single-use, expiring token (Better-Auth's
// shape), covering both StaffPasswordReset and TwoFactorEnrollment. Empty for
// the same reason as above; the OTP challenge itself stays Redis-only (§1).
write("verifications.json", []);

// Forward capacity for §5's hospital/clinic Organization — nothing creates one yet.
write("organizations.json", []);
write("members.json", []);

// ─────────────────────────────────────────────────────── experts ──

// [id, first_name, last_name, professional_type, specialty, gender, availability_status,
//  consultation_fee_kobo, next_available_start, city (unused — real city comes from
//  EXPERT_LOCATIONS below), years_practising, licence_number, bio]
type ExpertRow = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  string | null,
  string,
  number,
  string,
  string,
];

const EXPERTS: ExpertRow[] = [
  // Amara Okonkwo's own expert identity — the same account and the same
  // name as pat_amara, per P0: one Monovella account can hold a Patient
  // identity and an Expert identity together, never two different names.
  [
    "exp_adeyemi",
    "Amara",
    "Okonkwo",
    "DOCTOR",
    "DERMATOLOGY",
    "FEMALE",
    "ONLINE",
    1200000,
    ts({ days: 0, hours: 5 }),
    "Lagos",
    11,
    "MDCN/2014/104882",
    "Medical dermatologist. Acne, eczema, pigmentation and hair loss. Fourteen years " +
      "in Lagos clinics, seven of them running her own practice in Ikeja.",
  ],
  [
    "exp_bello",
    "Ibrahim",
    "Bello",
    "DOCTOR",
    "GENERAL_PRACTICE",
    "MALE",
    "ONLINE",
    650000,
    ts({ days: 0, hours: 2, minutes: 45 }),
    "Lagos",
    9,
    "MDCN/2016/118340",
    "Family medicine. First port of call for anything unclear, and happy to say when " +
      "something belongs with a specialist.",
  ],
  [
    "exp_eze",
    "Chinelo",
    "Eze",
    "DOCTOR",
    "OBSTETRICS_GYNECOLOGY",
    "FEMALE",
    "AWAY",
    1500000,
    ts({ days: 1, hours: 1 }),
    "Lagos",
    14,
    "MDCN/2011/091204",
    "Obstetrics and gynaecology, with a particular interest in fibroids and menstrual " +
      "disorders.",
  ],
  [
    "exp_musa",
    "Aisha",
    "Musa",
    "DOCTOR",
    "ENDOCRINOLOGY",
    "FEMALE",
    "ONLINE",
    1800000,
    ts({ days: 2, hours: 0 }),
    "Abuja",
    16,
    "MDCN/2009/077611",
    "Diabetes, thyroid and metabolic medicine. Consultant at a teaching hospital in " +
      "Abuja and sees independent patients on Monovella.",
  ],
  [
    "exp_ogunleye",
    "Tunde",
    "Ogunleye",
    "DOCTOR",
    "CARDIOLOGY",
    "MALE",
    "OUT_OF_OFFICE",
    2500000,
    ts({ days: 9, hours: 1 }),
    "Lagos",
    19,
    "MDCN/2006/054129",
    "Interventional cardiology. Hypertension, arrhythmia and post-event follow-up.",
  ],
  [
    "exp_nwosu",
    "Kelechi",
    "Nwosu",
    "PHYSIOTHERAPIST",
    "PHYSIOTHERAPY",
    "MALE",
    "ONLINE",
    800000,
    ts({ days: 0, hours: 7 }),
    "Lagos",
    8,
    "MRTB/PT/2017/2288",
    "Musculoskeletal physiotherapy. Low back pain, frozen shoulder and return-to-work " +
      "rehabilitation.",
  ],
  [
    "exp_danjuma",
    "Hauwa",
    "Danjuma",
    "DOCTOR",
    "PEDIATRICS",
    "FEMALE",
    "ONLINE",
    950000,
    ts({ days: 0, hours: 3, minutes: 30 }),
    "Abuja",
    12,
    "MDCN/2013/099045",
    "General paediatrics from newborn to sixteen. Feeding, growth, fevers and rashes.",
  ],
  [
    "exp_adebayo",
    "Segun",
    "Adebayo",
    "DOCTOR",
    "PSYCHIATRY",
    "MALE",
    "AWAY",
    2000000,
    ts({ days: 1, hours: 6 }),
    "Lagos",
    13,
    "MDCN/2012/095518",
    "Adult psychiatry. Anxiety, depression and sleep, with an emphasis on talking " +
      "through options before reaching for a prescription.",
  ],
  [
    "exp_okafor",
    "Ngozi",
    "Okafor",
    "DOCTOR",
    "GASTROENTEROLOGY",
    "FEMALE",
    "ONLINE",
    1600000,
    ts({ days: 1, hours: 2 }),
    "Enugu",
    15,
    "MDCN/2010/084733",
    "Gut and liver medicine. Reflux, IBS, ulcers and hepatitis follow-up.",
  ],
  [
    "exp_yusuf",
    "Bashir",
    "Yusuf",
    "DOCTOR",
    "NEUROLOGY",
    "MALE",
    "ONLINE",
    2200000,
    ts({ days: 3, hours: 1 }),
    "Kano",
    17,
    "MDCN/2008/066902",
    "Headache, epilepsy and stroke aftercare.",
  ],
  [
    "exp_lawal",
    "Fatima",
    "Lawal",
    "DOCTOR",
    "DERMATOLOGY",
    "FEMALE",
    "ONLINE",
    900000,
    ts({ days: 0, hours: 9 }),
    "Ibadan",
    7,
    "MDCN/2018/126471",
    "Dermatology with a focus on skin of colour: keloids, pigmentation and reactions " +
      "to over-the-counter creams.",
  ],
  [
    "exp_anyanwu",
    "Uche",
    "Anyanwu",
    "DOCTOR",
    "ORTHOPEDICS",
    "MALE",
    "ONLINE",
    1750000,
    ts({ days: 2, hours: 4 }),
    "Lagos",
    18,
    "MDCN/2007/060118",
    "Bone and joint surgery. Fractures, knee and hip pain, sports injuries.",
  ],
  [
    "exp_bassey",
    "Emem",
    "Bassey",
    "DOCTOR",
    "DERMATOLOGY",
    "FEMALE",
    "AWAY",
    1100000,
    null,
    "Rivers",
    10,
    "MDCN/2015/110236",
    "Dermatology and dermatologic surgery. Currently not publishing new hours.",
  ],
  [
    "exp_olaniyi",
    "Yemi",
    "Olaniyi",
    "DOCTOR",
    "GENERAL_PRACTICE",
    "MALE",
    "ONLINE",
    500000,
    ts({ days: 0, hours: 1, minutes: 15 }),
    "Lagos",
    6,
    "MDCN/2019/131890",
    "General practice. Straightforward, unhurried first consultations at a low fee.",
  ],
  [
    "exp_kalu",
    "Amaka",
    "Kalu",
    "PHYSIOTHERAPIST",
    "PHYSIOTHERAPY",
    "FEMALE",
    "ONLINE",
    750000,
    ts({ days: 1, hours: 3 }),
    "Abuja",
    9,
    "MRTB/PT/2016/1904",
    "Women's health and post-natal physiotherapy, plus general musculoskeletal work.",
  ],
  [
    "exp_saliu",
    "Rasheed",
    "Saliu",
    "DOCTOR",
    "OPHTHALMOLOGY",
    "MALE",
    "ONLINE",
    1400000,
    ts({ days: 0, hours: 6 }),
    "Lagos",
    14,
    "MDCN/2011/089977",
    "Eye medicine and surgery. Glaucoma, cataract assessment and screen-related strain.",
  ],
  // Nurse/Pharmacist/Lab Scientist: advisory scope only, per NMCN/PCN/MLSCN
  // research (Market_Research.md) — never prescription or lab-order actions,
  // which stay allow-listed to DOCTOR regardless of what's added here.
  [
    "exp_etim",
    "Blessing",
    "Etim",
    "NURSE",
    "CHRONIC_DISEASE_MONITORING",
    "FEMALE",
    "ONLINE",
    350000,
    ts({ days: 0, hours: 4 }),
    "Akwa Ibom",
    10,
    "NMCN/RN/2015/034521",
    "Registered nurse. Diabetes and hypertension check-ins, wound-care guidance and " +
      "post-op follow-up between doctor visits.",
  ],
  [
    "exp_adisa",
    "Folake",
    "Adisa",
    "PHARMACIST",
    "MEDICATION_THERAPY_MANAGEMENT",
    "FEMALE",
    "ONLINE",
    300000,
    ts({ days: 0, hours: 8 }),
    "Ibadan",
    8,
    "PCN/2016/008847",
    "Community pharmacist. Medication interactions, dosing questions and over-the-counter " +
      "choices.",
  ],
  [
    "exp_garba",
    "Suleiman",
    "Garba",
    "LAB_SCIENTIST",
    "RESULT_INTERPRETATION_REFERRAL",
    "MALE",
    "ONLINE",
    400000,
    ts({ days: 1, hours: 2 }),
    "Kano",
    12,
    "MLSCN/2014/002391",
    "Medical laboratory scientist. Helps make sense of a lab result and what to ask a " +
      "doctor next, and does not order new tests.",
  ],
];

function defaultTier(professionalType: string, specialty: string): string {
  if (professionalType !== "DOCTOR") return "GENERAL";
  return specialty === "GENERAL_PRACTICE" ? "GP" : "SPECIALIST";
}

function credential(
  credId: string,
  professionalType: string,
  tier: string,
  specialty: string,
  licence: string,
  fee: number,
): Record<string, any> {
  return {
    id: credId,
    professional_type: professionalType,
    tier,
    specialty,
    licence_or_fellowship_number: licence,
    verification_status: "VERIFIED",
    credential_status: "ACTIVE",
    expiry_date: null,
    verified_at: ts({ days: -300 }),
    consultation_fee_kobo: fee,
    retired_at: null,
  };
}

// Amara Okonkwo holds two credentials on the one account — her original
// Dermatology Specialist application (X1, credentials[0], matching her
// existing ExpertRead.specialty/fee below) plus a General Practice credential
// added later (X1a) — so the tier picker at P37/P39 has something real to
// demonstrate: specialist care at her Dermatology rate, general care at her
// cheaper GP rate, never one billed as the other.
const EXTRA_CREDENTIALS: Record<string, [string, string, string, string, string, number][]> = {
  exp_adeyemi: [
    ["exp_adeyemi_cred_gp", "DOCTOR", "GP", "GENERAL_PRACTICE", "MDCN/2014/104882", 500000],
  ],
};

const EXPERT_LOCATIONS: Record<string, [string, string, string, string]> = {
  exp_adeyemi: ["24 Aromire Avenue", "Lagos", "Ikeja", "Lagos"],
  exp_bello: ["8 Herbert Macaulay Way", "Lagos", "Lagos Mainland", "Lagos"],
  exp_eze: ["16 Bode Thomas Street", "Lagos", "Surulere", "Lagos"],
  exp_musa: ["18 Kumasi Crescent", "Abuja", "Abuja Municipal", "FCT"],
  exp_ogunleye: ["7 Admiralty Way", "Lagos", "Eti-Osa", "Lagos"],
  exp_nwosu: ["31 Opebi Road", "Lagos", "Ikeja", "Lagos"],
  exp_danjuma: ["6 Libreville Street", "Abuja", "Abuja Municipal", "FCT"],
  exp_adebayo: ["12 Broad Street", "Lagos", "Lagos Island", "Lagos"],
  exp_okafor: ["10 Independence Layout", "Enugu", "Enugu North", "Enugu"],
  exp_yusuf: ["5 Murtala Mohammed Way", "Kano", "Kano Municipal", "Kano"],
  exp_lawal: ["14 Bodija Road", "Ibadan", "Ibadan North", "Oyo"],
  exp_anyanwu: ["9 Oyetubo Street", "Lagos", "Oshodi-Isolo", "Lagos"],
  exp_bassey: ["20 Azikiwe Road", "Port Harcourt", "Port-Harcourt", "Rivers"],
  exp_olaniyi: ["3 Queens Street", "Lagos", "Lagos Mainland", "Lagos"],
  exp_kalu: ["4 Dar es Salaam Street", "Abuja", "Abuja Municipal", "FCT"],
  exp_saliu: ["15 Toyin Street", "Lagos", "Ikeja", "Lagos"],
  exp_etim: ["21 Oron Road", "Uyo", "Uyo", "Akwa Ibom"],
  exp_adisa: ["6 Queen Elizabeth Road", "Ibadan", "Ibadan North", "Oyo"],
  exp_garba: ["18 Zoo Road", "Kano", "Kano Municipal", "Kano"],
};

const experts: Record<string, any>[] = [];
for (const e of EXPERTS) {
  const expertId = e[0];
  const fee = e[7];
  const tier = defaultTier(e[3], e[4]);
  const credentials = [credential(`${expertId}_cred_1`, e[3], tier, e[4], e[11], fee)];
  for (const [extraId, prof, extraTier, specialty, licence, extraFee] of EXTRA_CREDENTIALS[
    expertId
  ] ?? []) {
    credentials.push(credential(extraId, prof, extraTier, specialty, licence, extraFee));
  }
  const [address, city, localGovernmentArea, state] = EXPERT_LOCATIONS[expertId];
  experts.push({
    id: expertId,
    first_name: e[1],
    last_name: e[2],
    professional_type: e[3],
    specialty: e[4],
    gender: e[5],
    availability_status: e[6],
    consultation_fee_kobo: fee,
    next_available_start: e[8],
    address,
    city,
    local_government_area: localGovernmentArea,
    state,
    years_practising: e[10],
    licence_number: e[11],
    bio: e[12],
    credentials,
    photo_url: null,
    organization_id: null, // Forward capacity for a hospital/clinic tenant (§5).
  });
}

// ─── weekly schedule + concrete availability slots ─────────────────

// These are intentional starting settings for the prototype account, not a
// clinical standard. Each expert can set their own duration, buffer, notice
// and daily cap in X7; the generator carries that operational data through to
// the patient-visible, dated slots.
const DEFAULT_SCHEDULING_RULES = {
  appointment_duration_minutes: 45,
  buffer_minutes: 15,
  minimum_notice_minutes: 120,
  max_bookings_per_day: 6,
};
const EXPERT_SCHEDULING_RULE_OVERRIDES: Record<string, Record<string, number>> = {
  exp_adeyemi: {
    appointment_duration_minutes: 45,
    buffer_minutes: 15,
    minimum_notice_minutes: 120,
    max_bookings_per_day: 4,
  },
};
const expertSchedulingRules: Record<string, any>[] = [];
for (const expert of experts) {
  const rules = {
    ...DEFAULT_SCHEDULING_RULES,
    ...(EXPERT_SCHEDULING_RULE_OVERRIDES[expert.id] ?? {}),
  };
  expertSchedulingRules.push({ expert_id: expert.id, ...rules });
}
write("expert-scheduling-rules.json", expertSchedulingRules);
const rulesByExpert: Record<string, Record<string, any>> = Object.fromEntries(
  expertSchedulingRules.map((rule) => [rule.expert_id, rule]),
);

// Dated changes are operational fixture scenarios, not claims about a real
// clinician's leave. They prove that normal weekly hours can be safely paused
// without disturbing an appointment already on the calendar.
const expertScheduleExceptions = [
  {
    id: "exs_001",
    expert_id: "exp_adeyemi",
    date: "2026-08-31",
    kind: "UNAVAILABLE",
    start_time: "09:00",
    end_time: "11:00",
    note: "Clinic administration",
  },
];
write("expert-schedule-exceptions.json", expertScheduleExceptions);

const schedule: Record<string, any>[] = [];
const availability: Record<string, any>[] = [];
let sid = 0;
let aid = 0;
// Counts span every split working-hours block on a calendar day, so a lunch
// break cannot accidentally reset the expert's maximum-new-bookings setting.
const dailyProjectedCounts: Record<string, number> = {};
const SCHEDULE_SHAPE: Record<string, [number, string, string, number][]> = {
  exp_adeyemi: [
    [0, "09:00", "13:00", 3],
    [2, "09:00", "13:00", 1],
    [2, "15:00", "18:00", 0],
    [4, "10:00", "14:00", 2],
  ],
  exp_bello: [
    [0, "08:00", "12:00", 1],
    [1, "08:00", "12:00", 0],
    [3, "08:00", "12:00", 2],
    [5, "09:00", "13:00", 0],
  ],
  exp_eze: [
    [1, "10:00", "15:00", 4],
    [3, "10:00", "15:00", 2],
  ],
  exp_musa: [
    [2, "14:00", "18:00", 1],
    [4, "14:00", "18:00", 0],
  ],
  exp_ogunleye: [[1, "16:00", "19:00", 0]],
  exp_nwosu: [
    [0, "07:00", "11:00", 2],
    [2, "07:00", "11:00", 1],
    [4, "07:00", "11:00", 0],
  ],
  exp_danjuma: [
    [0, "12:00", "16:00", 2],
    [3, "12:00", "16:00", 1],
  ],
  exp_adebayo: [
    [1, "17:00", "20:00", 1],
    [4, "17:00", "20:00", 0],
  ],
  exp_okafor: [
    [1, "09:00", "13:00", 0],
    [3, "09:00", "13:00", 1],
  ],
  exp_yusuf: [
    [2, "10:00", "14:00", 0],
    [5, "10:00", "13:00", 0],
  ],
  exp_lawal: [
    [0, "15:00", "19:00", 1],
    [2, "15:00", "19:00", 0],
    [4, "15:00", "19:00", 0],
  ],
  exp_anyanwu: [
    [1, "08:00", "12:00", 1],
    [3, "14:00", "18:00", 0],
  ],
  exp_bassey: [],
  exp_olaniyi: [
    [0, "09:00", "17:00", 3],
    [1, "09:00", "17:00", 2],
    [2, "09:00", "17:00", 1],
    [3, "09:00", "17:00", 0],
  ],
  exp_kalu: [
    [1, "08:00", "12:00", 0],
    [4, "13:00", "17:00", 1],
  ],
  exp_saliu: [
    [0, "14:00", "18:00", 1],
    [3, "09:00", "13:00", 0],
  ],
  exp_etim: [
    [0, "10:00", "14:00", 1],
    [3, "10:00", "14:00", 0],
  ],
  exp_adisa: [
    [2, "09:00", "13:00", 0],
    [4, "09:00", "13:00", 1],
  ],
  exp_garba: [[1, "13:00", "17:00", 0]],
};
// ANCHOR is a Saturday (2026-08-29). day_of_week 0 = Monday.
const anchorDow = pyWeekday(ANCHOR_MS);
for (const [expertId, blocks] of Object.entries(SCHEDULE_SHAPE)) {
  for (const [dow, start, end, booked] of blocks) {
    sid += 1;
    schedule.push({
      id: `sch_${pad(sid, 3)}`,
      expert_id: expertId,
      day_of_week: dow,
      start_time: start,
      end_time: end,
      booked_count: booked,
      // A consultation is one patient with one expert — capacity stays 1 for
      // every expert slot; the field exists for schema parity with the lab
      // portal's ProviderScheduleSlotRead, where more than one is normal.
      capacity: 1,
    });
    // Project working hours into dated one-to-one slots, respecting each
    // expert's own duration, buffer, minimum notice and daily cap.
    const rules = rulesByExpert[expertId];
    const duration = rules.appointment_duration_minutes;
    const buffer = rules.buffer_minutes;
    const maxPerDay = rules.max_bookings_per_day;
    for (let week = 0; week < 2; week++) {
      const delta = ((((dow - anchorDow) % 7) + 7) % 7) + week * 7;
      if (delta === 0) continue;
      const dayInstantMs = ANCHOR_MS + delta * 86400000;
      const dayMidnight = dayMidnightMs(dayInstantMs);
      const dayIso = isoDate(dayInstantMs);
      const startMinutes =
        Number.parseInt(start.slice(0, 2), 10) * 60 + Number.parseInt(start.slice(3), 10);
      const endMinutes =
        Number.parseInt(end.slice(0, 2), 10) * 60 + Number.parseInt(end.slice(3), 10);
      let cursorMinutes = startMinutes;
      let takenLeft = week === 0 ? booked : 0;
      const dayKey = `${expertId}::${dayIso}`;
      let generatedForDay = dailyProjectedCounts[dayKey] ?? 0;
      while (cursorMinutes + duration <= endMinutes && generatedForDay < maxPerDay) {
        aid += 1;
        const taken = takenLeft > 0 && aid % 3 === 0;
        if (taken) takenLeft -= 1;
        const slotStartMs = dayMidnight + cursorMinutes * 60000;
        const slotEndMs = slotStartMs + duration * 60000;
        const slotEndHM = isoTimeMinutes(slotEndMs);
        const slotStartHM = isoTimeMinutes(slotStartMs);
        const unavailable = expertScheduleExceptions.some(
          (exception) =>
            exception.expert_id === expertId &&
            exception.kind === "UNAVAILABLE" &&
            exception.date === dayIso &&
            (exception.start_time === null ||
              (exception.start_time < slotEndHM && slotStartHM < exception.end_time)),
        );
        if (unavailable) {
          cursorMinutes += duration + buffer;
          continue;
        }
        availability.push({
          id: `avl_${pad(aid, 4)}`,
          expert_id: expertId,
          start: isoDateTime(slotStartMs),
          end: isoDateTime(slotEndMs),
          taken,
        });
        generatedForDay += 1;
        dailyProjectedCounts[dayKey] = generatedForDay;
        cursorMinutes += duration + buffer;
      }
    }
  }
}

write("expert-schedule.json", schedule);

console.log("fixtures part 1 done");

// ────────────────────────────────────────────── consultations ──

const FEE_RATE = 0.2;
const FEE_CAP = 300000;

function platformFee(expertFeeKobo: number): number {
  return Math.min(Math.trunc(expertFeeKobo * FEE_RATE), FEE_CAP);
}

const EXPERT_FEE: Record<string, number> = Object.fromEntries(
  experts.map((e) => [e.id, e.consultation_fee_kobo]),
);

function consultation(
  cid: string,
  expertId: string,
  patientId: string,
  status: string,
  over: Record<string, any> = {},
): Record<string, any> {
  const fee = EXPERT_FEE[expertId];
  let base: Record<string, any> = {
    id: cid,
    expert_id: expertId,
    patient_identity_id: patientId,
    status,
    platform_fee_kobo: platformFee(fee),
    expert_fee_kobo: fee,
    requested_at: ts({ days: -1 }),
    scheduled_start: null,
    scheduled_end: null,
    respond_by: null,
    referred_from_id: null,
    referral_reason: null,
    referral_chain_depth: null,
    telemedicine_consent_at: null,
    referral_disclosure_ack_at: null,
    completed_at: null,
    call_state: "NONE",
    call_initiated_by: null,
    call_started_at: null,
    call_answered_at: null,
    call_ended_at: null,
    call_ring_expires_at: null,
    call_outcome: null,
    call_token_version: null,
    call_token_expires_at: null,
    call_connection_state: null,
    patient_call_muted: false,
    expert_call_muted: false,
    patient_call_camera_on: true,
    expert_call_camera_on: true,
    patient_call_device: "Default device",
    expert_call_device: "Default device",
    patient_microphone_permission: "PROMPT",
    patient_camera_permission: "PROMPT",
    expert_microphone_permission: "PROMPT",
    expert_camera_permission: "PROMPT",
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
    closeout_reason: null,
    closed_by: null,
    closed_at: null,
    closeout_version: null,
    slot_released_at: null,
    patient_joined_at: null,
    expert_joined_at: null,
    refund_outcome: null,
    payout_outcome: null,
    clinical_safety_context_id: null,
    clinical_safety_context_version: null,
    clinical_safety_acknowledged_at: null,
    clinical_safety_acknowledged_by_expert_id: null,
    workday_impact_answer: null,
    responded_at: null,
    request_summary: null,
  };
  base = { ...base, ...over };
  if (status === "COMPLETED") {
    base = {
      ...base,
      closeout_reason: base.closeout_reason || "CLINICAL_COMPLETION",
      closed_by: base.closed_by || "EXPERT",
      closed_at: base.closed_at || base.completed_at,
      closeout_version: base.closeout_version || 1,
      refund_outcome: base.refund_outcome || "NOT_ELIGIBLE",
      payout_outcome: base.payout_outcome || "PAID",
    };
  } else if (status === "CANCELLED") {
    const cancelledBy = base.cancelled_by;
    base = {
      ...base,
      closeout_reason:
        base.closeout_reason ||
        (cancelledBy === "PATIENT" ? "PATIENT_CANCELLED" : "EXPERT_CANCELLED"),
      closed_by: base.closed_by || cancelledBy,
      closed_at: base.closed_at || base.cancelled_at,
      closeout_version: base.closeout_version || 1,
      slot_released_at: base.slot_released_at || base.cancelled_at,
      refund_outcome: base.refund_outcome || "REFUNDED",
      payout_outcome: base.payout_outcome || "NOT_EARNED",
    };
  }
  return base;
}

const consultations: Record<string, any>[] = [
  // ── Amara's history ───────────────────────────────────────────
  consultation("con_001", "exp_bello", "pat_amara", "COMPLETED", {
    requested_at: ts({ days: -23, hours: -2 }),
    scheduled_start: ts({ days: -22, hours: -1 }),
    scheduled_end: ts({ days: -22 }),
    responded_at: ts({ days: -23, hours: -1, minutes: -48 }),
    telemedicine_consent_at: ts({ days: -22, hours: -1 }),
    completed_at: ts({ days: -22, minutes: -20 }),
    workday_impact_answer: "YES",
  }),
  consultation("con_002", "exp_bassey", "pat_amara", "COMPLETED", {
    requested_at: ts({ days: -7, hours: -3 }),
    scheduled_start: ts({ days: -6, hours: -2 }),
    scheduled_end: ts({ days: -6, hours: -1 }),
    responded_at: ts({ days: -7, hours: -2, minutes: -51 }),
    telemedicine_consent_at: ts({ days: -6, hours: -2 }),
    completed_at: ts({ days: -6, hours: -1, minutes: -5 }),
    workday_impact_answer: null,
  }),
  consultation("con_003", "exp_eze", "pat_amara", "ACTIVE", {
    requested_at: ts({ days: -2, hours: -4 }),
    scheduled_start: ts({ hours: -1, minutes: -15 }),
    scheduled_end: ts({ minutes: -15 }),
    responded_at: ts({ days: -2, hours: -3, minutes: -40 }),
    telemedicine_consent_at: ts({ hours: -1, minutes: -14 }),
    // A guest invite the patient sees pending. The guest here is a third
    // expert, never the account holder's own expert identity: an expert may
    // not examine themselves, and Amara is both this patient and exp_adeyemi.
    // The reviewer-playable guest seat lives on con_012 instead, where the
    // patient is a dependant rather than the same person.
    guest_expert_id: "exp_bassey",
    guest_examination_status: "REQUESTED",
    guest_examination_reason:
      "A hands-on pelvic exam would help confirm what's causing the " +
      "heavier bleeding. Could you see her in person this week?",
  }),
  consultation("con_004", "exp_musa", "pat_amara", "SCHEDULED", {
    requested_at: ts({ days: -1, hours: -5 }),
    scheduled_start: ts({ days: 5, hours: 4, minutes: 45 }),
    scheduled_end: ts({ days: 5, hours: 5, minutes: 45 }),
    responded_at: ts({ days: -1, hours: -4, minutes: -22 }),
    telemedicine_consent_at: ts({ days: -1, hours: -4 }),
  }),
  consultation("con_005", "exp_ogunleye", "pat_amara", "DECLINED", {
    requested_at: ts({ days: -11, hours: -1 }),
    scheduled_start: ts({ days: -9, hours: 6 }),
    scheduled_end: ts({ days: -9, hours: 7 }),
    respond_by: ts({ days: -11, minutes: -45 }),
    responded_at: ts({ days: -11, minutes: -52 }),
  }),
  consultation("con_006", "exp_bassey", "pat_amara", "TIMED_OUT", {
    requested_at: ts({ days: -13, hours: -3 }),
    scheduled_start: ts({ days: -12, hours: 2 }),
    scheduled_end: ts({ days: -12, hours: 3 }),
    respond_by: ts({ days: -13, hours: -2, minutes: -45 }),
  }),
  consultation("con_007", "exp_lawal", "pat_amara", "REQUESTED", {
    requested_at: ts({ minutes: -9 }),
    scheduled_start: ts({ days: 2, hours: 5, minutes: 45 }),
    scheduled_end: ts({ days: 2, hours: 6, minutes: 45 }),
    respond_by: ts({ minutes: 6 }),
    referred_from_id: "con_002",
    referral_reason:
      "Pigmentation is not settling on the current regimen; Dr. Lawal " +
      "works with post-inflammatory hyperpigmentation in skin of colour.",
    referral_chain_depth: 1,
  }),
  consultation("con_008", "exp_nwosu", "pat_amara", "CANCELLED", {
    requested_at: ts({ days: -1, hours: -2 }),
    scheduled_start: ts({ hours: -3 }),
    scheduled_end: ts({ hours: -2 }),
    responded_at: ts({ days: -1, hours: -1, minutes: -38 }),
    telemedicine_consent_at: ts({ hours: -3 }),
    cancelled_at: ts({ hours: -2, minutes: -40 }),
    cancelled_by: "PATIENT",
    cancellation_reason: "No longer needed this appointment.",
  }),
  consultation("con_009", "exp_saliu", "pat_amara", "SCHEDULED", {
    requested_at: ts({ minutes: -42 }),
    scheduled_start: ts({ hours: 6 }),
    scheduled_end: ts({ hours: 7 }),
    responded_at: ts({ minutes: -31 }),
    telemedicine_consent_at: ts({ minutes: -30 }),
  }),
  // ── Tobi (dependant) ─────────────────────────────────────────
  consultation("con_010", "exp_danjuma", "pat_tobi", "COMPLETED", {
    requested_at: ts({ days: -40, hours: -2 }),
    scheduled_start: ts({ days: -39, hours: 3 }),
    scheduled_end: ts({ days: -39, hours: 4 }),
    responded_at: ts({ days: -40, hours: -1 }),
    telemedicine_consent_at: ts({ days: -39, hours: 3 }),
    completed_at: ts({ days: -39, hours: 3, minutes: 48 }),
    workday_impact_answer: "YES",
  }),
  consultation("con_011", "exp_bello", "pat_amara", "COMPLETED", {
    requested_at: ts({ days: -18, hours: -3 }),
    scheduled_start: ts({ days: -17, hours: 1 }),
    scheduled_end: ts({ days: -17, hours: 2 }),
    responded_at: ts({ days: -18, hours: -2, minutes: -20 }),
    telemedicine_consent_at: ts({ days: -17, hours: 1 }),
    completed_at: ts({ days: -17, hours: 1, minutes: 52 }),
    workday_impact_answer: "NO",
    // Guest-examination-with-payment demo: Dr. Bello (GP, remote) brought in
    // Dr. Lawal (dermatology) to physically examine a lesion photos couldn't
    // settle. Resolved and fully paid, so P43/X25's whole disclosure trail
    // is visible without an extra ScreenStates toggle.
    guest_expert_id: "exp_lawal",
    guest_examination_status: "COMPLETED",
    guest_examination_reason:
      "A hands-on look at the lesion on her forearm would help rule " +
      "out what the photos cannot. Could you see her in person?",
    guest_expert_fee_kobo: EXPERT_FEE.exp_lawal,
  }),
  // X26/X27 demo. Dr. Musa is treating Tobi, Amara's dependant, and has asked
  // Amara's own expert identity to look at a rash in person. The reviewer can
  // sit in both seats — guardian on the patient side, exp_adeyemi as the guest
  // — without the same person appearing on both sides of one examination.
  consultation("con_012", "exp_musa", "pat_tobi", "ACTIVE", {
    requested_at: ts({ days: -2, hours: -6 }),
    scheduled_start: ts({ hours: -1 }),
    scheduled_end: ts({ minutes: -1 }),
    responded_at: ts({ days: -2, hours: -5 }),
    telemedicine_consent_at: ts({ hours: -1 }),
    guest_expert_id: "exp_adeyemi",
    guest_examination_status: "REQUESTED",
    guest_examination_reason:
      "A patch on his forearm is not settling and photos are not " +
      "telling me enough. Could you look at it in person?",
  }),
];

// ── Amara's own caseload (expert context) ────────────────────
const adeyemiCases: [string, string, string, Record<string, any>][] = [
  [
    "con_101",
    "pat_ngozi",
    "REQUESTED",
    {
      requested_at: ts({ minutes: -22 }),
      respond_by: ts({ minutes: 53 }),
      scheduled_start: ts({ days: 1, hours: 1 }),
      scheduled_end: ts({ days: 1, hours: 2 }),
      request_summary:
        "Recurring painful bumps under both arms for eight months, " +
        "flaring before periods and sometimes discharging.",
    },
  ],
  [
    "con_102",
    "pat_sade",
    "REQUESTED",
    {
      requested_at: ts({ minutes: -47 }),
      respond_by: ts({ minutes: 28 }),
      scheduled_start: ts({ days: 2, hours: 4 }),
      scheduled_end: ts({ days: 2, hours: 5 }),
      request_summary:
        "Thick scaly patches on both elbows and the scalp, worse " +
        "since the harmattan. Over-the-counter creams not helping.",
    },
  ],
  [
    "con_103",
    "pat_emeka",
    "REQUESTED",
    {
      requested_at: ts({ hours: -1, minutes: -3 }),
      respond_by: ts({ minutes: 12 }),
      scheduled_start: ts({ days: 4, hours: 1 }),
      scheduled_end: ts({ days: 4, hours: 2 }),
      request_summary:
        "A mole on the shoulder that has changed shape and colour " + "over about four months.",
    },
  ],
  [
    "con_104",
    "pat_bilkisu",
    "SCHEDULED",
    {
      requested_at: ts({ days: -2 }),
      responded_at: ts({ days: -2, minutes: 14 }),
      scheduled_start: ts({ days: 2, hours: 0, minutes: 45 }),
      scheduled_end: ts({ days: 2, hours: 1, minutes: 45 }),
      telemedicine_consent_at: ts({ days: -2, minutes: 20 }),
    },
  ],
  [
    "con_105",
    "pat_dele",
    "SCHEDULED",
    {
      requested_at: ts({ days: -1 }),
      responded_at: ts({ days: -1, minutes: 9 }),
      scheduled_start: ts({ days: 2, hours: 2, minutes: 45 }),
      scheduled_end: ts({ days: 2, hours: 3, minutes: 45 }),
      telemedicine_consent_at: ts({ days: -1, minutes: 15 }),
    },
  ],
  [
    "con_106",
    "pat_tobi",
    "ACTIVE",
    {
      requested_at: ts({ days: -3 }),
      responded_at: ts({ days: -3, minutes: 11 }),
      scheduled_start: ts({ minutes: -35 }),
      scheduled_end: ts({ minutes: 25 }),
      telemedicine_consent_at: ts({ minutes: -34 }),
    },
  ],
  [
    "con_107",
    "pat_ngozi",
    "COMPLETED",
    {
      requested_at: ts({ days: -31 }),
      responded_at: ts({ days: -31, minutes: 18 }),
      scheduled_start: ts({ days: -30, hours: 1 }),
      scheduled_end: ts({ days: -30, hours: 2 }),
      telemedicine_consent_at: ts({ days: -30, hours: 1 }),
      completed_at: ts({ days: -30, hours: 1, minutes: 52 }),
      workday_impact_answer: "NO",
    },
  ],
  [
    "con_108",
    "pat_sade",
    "COMPLETED",
    {
      requested_at: ts({ days: -18 }),
      responded_at: ts({ days: -18, minutes: 7 }),
      scheduled_start: ts({ days: -17, hours: 2 }),
      scheduled_end: ts({ days: -17, hours: 3 }),
      telemedicine_consent_at: ts({ days: -17, hours: 2 }),
      completed_at: ts({ days: -17, hours: 2, minutes: 44 }),
      workday_impact_answer: "YES",
    },
  ],
  [
    "con_109",
    "pat_dele",
    "COMPLETED",
    {
      requested_at: ts({ days: -9 }),
      responded_at: ts({ days: -9, minutes: 25 }),
      scheduled_start: ts({ days: -8, hours: 3 }),
      scheduled_end: ts({ days: -8, hours: 4 }),
      telemedicine_consent_at: ts({ days: -8, hours: 3 }),
      completed_at: ts({ days: -8, hours: 3, minutes: 39 }),
      workday_impact_answer: "DISMISSED",
    },
  ],
  [
    "con_110",
    "pat_emeka",
    "DECLINED",
    {
      requested_at: ts({ days: -6 }),
      respond_by: ts({ days: -6, minutes: 45 }),
      responded_at: ts({ days: -6, minutes: 31 }),
      scheduled_start: ts({ days: -4, hours: 2 }),
      scheduled_end: ts({ days: -4, hours: 3 }),
    },
  ],
];
for (const [cid, pid, status, over] of adeyemiCases) {
  consultations.push(consultation(cid, "exp_adeyemi", pid, status, over));
}

// ── Advisory practice caseloads (assumed / advisor-informed) ─────────────
// The directory holds Nurse, Pharmacist, Lab Scientist and Physiotherapist
// experts whose permitted actions are narrower than a Doctor's. Without a case
// to open, a reviewer switching into one of those seats sees an empty workspace
// and cannot check that prescribing and lab ordering really are refused there.
// Scope of practice is assumed until validated with professional bodies.
const advisoryCases: [string, string, string, string, Record<string, any>][] = [
  [
    "con_121",
    "exp_etim",
    "pat_ngozi",
    "ACTIVE",
    {
      requested_at: ts({ days: -4 }),
      responded_at: ts({ days: -4, minutes: 16 }),
      scheduled_start: ts({ minutes: -20 }),
      scheduled_end: ts({ minutes: 40 }),
      telemedicine_consent_at: ts({ minutes: -19 }),
      request_summary:
        "Blood pressure readings at home have been higher than usual for " +
        "two weeks. Wants help reading the numbers and knowing when to worry.",
    },
  ],
  [
    "con_122",
    "exp_adisa",
    "pat_sade",
    "ACTIVE",
    {
      requested_at: ts({ days: -2 }),
      responded_at: ts({ days: -2, minutes: 22 }),
      scheduled_start: ts({ minutes: -10 }),
      scheduled_end: ts({ minutes: 50 }),
      telemedicine_consent_at: ts({ minutes: -9 }),
      request_summary:
        "Taking four medicines from two different clinics and is not sure " +
        "whether any of them should not be taken together.",
    },
  ],
  [
    "con_123",
    "exp_garba",
    "pat_emeka",
    "ACTIVE",
    {
      requested_at: ts({ days: -1 }),
      responded_at: ts({ days: -1, minutes: 8 }),
      scheduled_start: ts({ minutes: -5 }),
      scheduled_end: ts({ minutes: 55 }),
      telemedicine_consent_at: ts({ minutes: -4 }),
      request_summary:
        "Has a full blood count and liver panel from another lab and wants " +
        "help understanding which values are outside range.",
    },
  ],
  [
    "con_124",
    "exp_nwosu",
    "pat_dele",
    "ACTIVE",
    {
      requested_at: ts({ days: -3 }),
      responded_at: ts({ days: -3, minutes: 30 }),
      scheduled_start: ts({ minutes: -25 }),
      scheduled_end: ts({ minutes: 35 }),
      telemedicine_consent_at: ts({ minutes: -24 }),
      request_summary:
        "Lower back pain since lifting at work. Wants exercises and advice " +
        "on what movement is safe.",
    },
  ],
  [
    "con_125",
    "exp_etim",
    "pat_bilkisu",
    "REQUESTED",
    {
      requested_at: ts({ minutes: -16 }),
      respond_by: ts({ minutes: 59 }),
      scheduled_start: ts({ days: 1, hours: 3 }),
      scheduled_end: ts({ days: 1, hours: 4 }),
      request_summary: "Wants a nurse to talk through daily blood sugar monitoring.",
    },
  ],
];
for (const [cid, eid, pid, status, over] of advisoryCases) {
  consultations.push(consultation(cid, eid, pid, status, over));
}

// Existing bookings are reservations, including times agreed before the current
// weekly schedule. Replace overlapping projected times with their exact hold so
// the patient can move the booking without releasing it before confirmation.
for (const booking of consultations.filter((row) =>
  ["REQUESTED", "SCHEDULED"].includes(row.status),
)) {
  const exact = availability.find(
    (slot) =>
      slot.expert_id === booking.expert_id &&
      slot.start === booking.scheduled_start &&
      slot.end === booking.scheduled_end,
  );
  for (let index = availability.length - 1; index >= 0; index--) {
    const slot = availability[index];
    if (
      slot !== exact &&
      slot.expert_id === booking.expert_id &&
      slot.start < booking.scheduled_end &&
      slot.end > booking.scheduled_start
    )
      availability.splice(index, 1);
  }
  if (exact) exact.taken = true;
  else
    availability.push({
      id: `avl_booking_${booking.id}`,
      expert_id: booking.expert_id,
      start: booking.scheduled_start,
      end: booking.scheduled_end,
      taken: true,
    });
}
for (const expert of experts) {
  const upcoming = availability
    .filter((slot) => slot.expert_id === expert.id && !slot.taken)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  expert.next_available_start = upcoming?.start ?? null;
}
write("experts.json", experts);
write("expert-availability.json", availability);
write("consultations.json", consultations);

// ─────────────────────────────────────────────── SOAP notes ──

const soapNotes: Record<string, any>[] = [
  {
    consultation_id: "con_001",
    subjective:
      "Three weeks of intermittent burning in the upper abdomen, worse at " +
      "night and after late meals. No vomiting, no weight loss, no blood in " +
      "stool. Has been taking a friend's antacid with partial relief.",
    objective:
      "BP 118/76. Temperature 36.8 C. Abdomen soft, mild epigastric " +
      "tenderness, no guarding, no rebound. No pallor, no jaundice.",
    assessment:
      "Dyspepsia, most likely acid-related. H. pylori not yet excluded; a " +
      "stool antigen test will settle that before committing to eradication.",
    plan:
      "Omeprazole 20mg once daily before breakfast for 14 days. Stool antigen for " +
      "H. pylori. Avoid late heavy meals and NSAIDs. Review once the result is in, " +
      "sooner if pain wakes her nightly or she notices dark stool.",
    finalized_at: ts({ days: -22, minutes: -22 }),
  },
  {
    consultation_id: "con_002",
    subjective:
      "Dark patches across both cheeks, six months, worse since a bleaching " +
      "cream bought at a market in April. Some itching in the first weeks, " +
      "none now. Very conscious of it at work.",
    objective:
      "Symmetrical hyperpigmented macules over both malar areas, well " +
      "demarcated, no scale, no erythema. No telangiectasia. Fitzpatrick V.",
    assessment:
      "Post-inflammatory hyperpigmentation on a background of probable " +
      "melasma, likely aggravated by an unregulated topical steroid in the " +
      "cream she used. No sign of ochronosis.",
    plan:
      "Stop all current creams today. Azelaic acid 20% twice daily. Broad-spectrum " +
      "SPF 50 every morning, reapplied at midday. Vitamin D level, since she has " +
      "been avoiding sun entirely. Review in six weeks; expect slow change, not " +
      "fast. If there is no movement by then, referral to a colleague who works " +
      "specifically with pigmentation in skin of colour.",
    finalized_at: ts({ days: -6, hours: -1, minutes: -8 }),
  },
  {
    consultation_id: "con_003",
    subjective:
      "Heavier and longer periods over the last four cycles, with clots and " +
      "two days off work last month. Cramping starts a day before bleeding.",
    objective: null,
    assessment: null,
    plan: null,
    finalized_at: null,
    attachments: [
      {
        id: "soapatt_001",
        section: "OBJECTIVE",
        kind: "DRAWING",
        media_url: sketchDataUri(),
        verification_status: "VALID",
        flagged_reason: null,
        created_at: ts({ hours: -1, minutes: -40 }),
      },
    ],
  },
  {
    consultation_id: "con_010",
    subjective:
      "Two days of fever and a dry cough. Eating less, drinking normally. No " +
      "rash, no ear pulling, no vomiting.",
    objective:
      "Temperature 38.4 C at home. Alert, well perfused, no respiratory " +
      "distress on video. Throat not clearly visualised.",
    assessment:
      "Likely viral upper respiratory infection. No red flags on today's " + "assessment.",
    plan:
      "Paracetamol suspension 250mg/5ml, 5ml six-hourly as needed. Fluids. Return " +
      "or seek in-person care if the fever passes 72 hours, breathing becomes " +
      "fast or laboured, or he stops drinking.",
    finalized_at: ts({ days: -39, hours: 3, minutes: 45 }),
  },
  {
    // Finished guest engagement for the patient-side demonstration (G9).
    consultation_id: "con_011",
    subjective: "Persistent patch on the forearm. Remote photographs did not show enough detail.",
    objective: "Reviewed the guest expert's in-person observations with the patient.",
    assessment: "The examination findings have been reviewed and explained to the patient.",
    plan: "The patient will follow the agreed care plan and arrange a review if the patch changes or does not settle.",
    guest_objective_contribution: {
      expert_id: "exp_lawal",
      submitted_at: ts({ days: -17, hours: 1, minutes: 40 }),
      text: "Examined the forearm patch in person. Recorded its appearance and extent for the primary expert's review.",
    },
    finalized_at: ts({ days: -17, hours: 1, minutes: 52 }),
  },
  {
    // A primary draft makes the playable guest loop demonstrate attribution:
    // guest findings must not replace the inviting expert's own observations.
    consultation_id: "con_012",
    subjective:
      "Guardian reports a persistent patch on Tobi's forearm. Photos have not been clear enough for assessment.",
    objective: "Remote images are insufficient. An in-person examination has been requested.",
    assessment: "Assessment pending the guest examination.",
    plan: "Review the guest's findings with the guardian before agreeing next steps.",
    finalized_at: null,
  },
  {
    consultation_id: "con_106",
    subjective:
      "Recurrent painful bumps in both armpits for eight months, flaring " +
      "before periods, occasionally discharging.",
    objective: null,
    assessment: null,
    plan: null,
    finalized_at: null,
    attachments: [
      {
        id: "soapatt_002",
        section: "OBJECTIVE",
        kind: "PHOTO",
        media_url: "/soap-attachments/con_106_objective_photo.jpg",
        verification_status: "FLAGGED",
        flagged_reason: "We couldn't read this clearly.",
        created_at: ts({ minutes: -6 }),
      },
    ],
  },
  {
    consultation_id: "con_107",
    subjective: "Itchy scalp with flaking for two months.",
    objective:
      "Diffuse fine scale over the vertex, mild erythema, no bogginess, no " +
      "hair loss at the margins.",
    assessment: "Seborrhoeic dermatitis of the scalp.",
    plan:
      "Ketoconazole 2% shampoo twice weekly for four weeks, left on five minutes. " +
      "Review if no better at four weeks.",
    finalized_at: ts({ days: -30, hours: 1, minutes: 50 }),
  },
];
write("soap-notes.json", soapNotes);

console.log("fixtures part 2 done");

// ──────────────────────────────── prescriptions & lab orders ──

const prescriptions: Record<string, any>[] = [
  {
    id: "rx_001",
    consultation_id: "con_001",
    medication: "Omeprazole",
    dosage: "20mg capsule, once daily",
    instructions: "One capsule 30 minutes before breakfast for 14 days.",
    issued_at: ts({ days: -22, minutes: -35 }),
    corrects_id: null,
    corrected_by_id: null,
    fulfillment_status: "FILLED",
    filled_at: ts({ days: -21, hours: 2 }),
    pharmacy_name: "Ebun Chemist, Surulere",
    paid_note: "Paid 4,200 cash at the counter.",
  },
  {
    id: "rx_002",
    consultation_id: "con_002",
    medication: "Azelaic acid 20% cream",
    dosage: "Apply a thin layer twice daily",
    instructions:
      "Morning and night to the affected areas of both cheeks. Expect " +
      "mild tingling in the first week. Do not use with any other " +
      "lightening product.",
    issued_at: ts({ days: -6, hours: -1, minutes: -20 }),
    corrects_id: null,
    corrected_by_id: null,
    fulfillment_status: null,
    filled_at: null,
    pharmacy_name: null,
    paid_note: null,
  },
  {
    id: "rx_003",
    consultation_id: "con_002",
    medication: "Broad-spectrum sunscreen SPF 50",
    dosage: "Apply every morning, reapply at midday",
    instructions:
      "Two fingers' length for the face and neck. This is the part of the " +
      "plan that does the most work; the cream alone will not hold.",
    issued_at: ts({ days: -6, hours: -1, minutes: -18 }),
    corrects_id: null,
    corrected_by_id: null,
    fulfillment_status: "UNFILLED",
    filled_at: null,
    pharmacy_name: null,
    paid_note: null,
  },
  {
    id: "rx_004",
    consultation_id: "con_010",
    medication: "Paracetamol suspension",
    dosage: "250mg/5ml, 5ml six-hourly as needed",
    instructions: "Maximum four doses in 24 hours. Stop once the fever settles.",
    issued_at: ts({ days: -39, hours: 3, minutes: 40 }),
    corrects_id: null,
    corrected_by_id: null,
    fulfillment_status: "FILLED",
    filled_at: ts({ days: -39, hours: 5 }),
    pharmacy_name: "GreenLife Pharmacy",
    paid_note: null,
  },
  {
    id: "rx_005",
    consultation_id: "con_107",
    medication: "Ketoconazole 2% shampoo",
    dosage: "Twice weekly",
    instructions: "Lather into the scalp, leave five minutes, rinse. Four weeks.",
    issued_at: ts({ days: -30, hours: 1, minutes: 44 }),
    corrects_id: null,
    corrected_by_id: "rx_006",
    fulfillment_status: "FILLED",
    filled_at: ts({ days: -29, hours: 4 }),
    pharmacy_name: "MedPlus, Ikeja",
    paid_note: null,
  },
  {
    id: "rx_006",
    consultation_id: "con_107",
    medication: "Ketoconazole 2% shampoo",
    dosage: "Twice weekly for four weeks, then once weekly for four weeks",
    instructions:
      "Corrected to add the maintenance phase. Stopping at four weeks is " +
      "the usual reason this comes back.",
    issued_at: ts({ days: -30, hours: 2, minutes: 6 }),
    corrects_id: "rx_005",
    corrected_by_id: null,
    fulfillment_status: "FILLED",
    filled_at: ts({ days: -29, hours: 4 }),
    pharmacy_name: "MedPlus, Ikeja",
    paid_note: null,
  },
  {
    id: "rx_007",
    consultation_id: "con_108",
    medication: "Clobetasol 0.05% ointment",
    dosage: "Apply once at night to the plaques only",
    instructions: "Two weeks, then stop. Not for the face.",
    issued_at: ts({ days: -17, hours: 2, minutes: 38 }),
    corrects_id: null,
    corrected_by_id: null,
    fulfillment_status: "FILLED",
    filled_at: ts({ days: -16, hours: 6 }),
    pharmacy_name: "HopeWell Pharmacy",
    paid_note: null,
  },
];
for (const prescription of prescriptions) prescription.receipt_file_name ??= null;
write("prescriptions.json", prescriptions);

const labOrders: Record<string, any>[] = [
  {
    id: "lab_001",
    consultation_id: "con_001",
    test_requested: "H. pylori stool antigen",
    instructions: "No PPI for two weeks before the sample if it can be avoided.",
    recommended_lab_id: null,
    issued_at: ts({ days: -22, minutes: -30 }),
    corrects_id: null,
    corrected_by_id: null,
    result_status: "ATTACHED",
    result_at: ts({ days: -19, hours: 4 }),
    result_summary: "Negative for H. pylori antigen.",
    paid_note: "Paid 9,500 by transfer.",
  },
  {
    id: "lab_002",
    consultation_id: "con_002",
    test_requested: "Serum 25-hydroxyvitamin D",
    instructions: "No fasting needed.",
    recommended_lab_id: "prv_lab_lagosdiag",
    issued_at: ts({ days: -6, hours: -1, minutes: -14 }),
    corrects_id: null,
    corrected_by_id: null,
    result_status: "ATTACHED",
    result_at: ts({ days: -2, hours: 1 }),
    result_summary: "25-OH vitamin D 14 ng/mL, deficient (reference 30-100 ng/mL).",
    paid_note: null,
  },
  {
    id: "lab_003",
    consultation_id: "con_003",
    test_requested: "Full blood count and serum ferritin",
    instructions: "Any time of day. Bring the order reference.",
    recommended_lab_id: "prv_lab_lagosdiag",
    issued_at: ts({ minutes: -38 }),
    corrects_id: null,
    corrected_by_id: null,
    result_status: "PENDING",
    result_at: null,
    result_summary: null,
    paid_note: null,
  },
  {
    id: "lab_004",
    consultation_id: "con_106",
    test_requested: "Wound swab, microscopy culture and sensitivity",
    instructions: "Swab the discharging lesion before any antiseptic is applied.",
    recommended_lab_id: "prv_lab_synlab",
    issued_at: ts({ minutes: -12 }),
    corrects_id: null,
    corrected_by_id: null,
    result_status: "PENDING",
    result_at: null,
    result_summary: null,
    paid_note: null,
  },
  {
    id: "lab_005",
    consultation_id: "con_109",
    test_requested: "Fasting blood sugar and HbA1c",
    instructions: "Eight hours fasting.",
    recommended_lab_id: null,
    issued_at: ts({ days: -8, hours: 3, minutes: 20 }),
    corrects_id: null,
    corrected_by_id: null,
    result_status: "ATTACHED",
    result_at: ts({ days: -6, hours: 2 }),
    result_summary: "FBS 6.1 mmol/L. HbA1c 6.0%, pre-diabetic range.",
    paid_note: null,
  },
  {
    id: "lab_006",
    consultation_id: "con_010",
    test_requested: "Malaria parasite rapid diagnostic test",
    instructions:
      "No fasting needed. Bring the order reference and tell the lab when the fever started.",
    recommended_lab_id: null,
    issued_at: ts({ days: -39, hours: 3, minutes: 46 }),
    corrects_id: null,
    corrected_by_id: null,
    result_status: "PENDING",
    result_at: null,
    result_summary: null,
    paid_note: null,
  },
];
for (const order of labOrders) {
  order.result_source = order.result_status === "ATTACHED" ? "Lagos Diagnostics" : null;
  // Named the way a patient would name a file they downloaded, not after the
  // row it came from. This string is rendered verbatim on P47e, so `lab_002`
  // in it put an internal fixture identifier in front of the patient.
  order.result_file_name =
    order.result_status === "ATTACHED"
      ? `Laboratory report ${(order.result_at ?? "").slice(0, 10)}.pdf`
      : null;
  order.result_corrected_at = null;
}
write("lab-orders.json", labOrders);

// ───────────────────────────────────────────────────── chat ──

function msg(
  mid: string,
  cid: string,
  sender: string,
  body: string | null,
  when: string,
  mtype = "TEXT",
  extra: Record<string, any> = {},
): Record<string, any> {
  let row: Record<string, any> = {
    id: mid,
    consultation_id: cid,
    sender_type: sender,
    type: mtype,
    body,
    media_url: null,
    sent_at: when,
  };
  row = { ...row, ...extra };
  return row;
}

const chat: Record<string, any>[] = [
  msg(
    "msg_301",
    "con_003",
    "EXPERT",
    "Good morning Amara. I've read what you sent through. Before we go further, how " +
      "many pads or tampons are you getting through on your heaviest day?",
    ts({ hours: -1, minutes: -12 }),
  ),
  msg(
    "msg_302",
    "con_003",
    "PATIENT",
    "Morning doctor. Maybe seven or eight. I have to change through the night too.",
    ts({ hours: -1, minutes: -9 }),
  ),
  msg("msg_303", "con_003", "PATIENT", null, ts({ hours: -1, minutes: -8 }), "VOICE", {
    media_url: "/media/voice-note.m4a",
    duration_seconds: 34,
  }),
  msg(
    "msg_304",
    "con_003",
    "EXPERT",
    "Thank you, that's clearer than any form would have been. The clots you mentioned " +
      "Roughly what size?",
    ts({ hours: -1, minutes: -4 }),
  ),
  msg(
    "msg_305",
    "con_003",
    "PATIENT",
    "Some are as big as a 100 naira coin. I took a photo last month.",
    ts({ hours: -1, minutes: -1 }),
  ),
  msg("msg_306", "con_003", "PATIENT", null, ts({ minutes: -58 }), "IMAGE", {
    media_url: "/media/attachment.jpg",
  }),
  msg(
    "msg_307",
    "con_003",
    "EXPERT",
    "Understood. Two things: I want a full blood count and a ferritin, because losing " +
      "that volume monthly usually shows up as iron deficiency before anything else. " +
      "I've put the order on your record. Second, I'd like to see your last four cycles " +
      "from your Monovella calendar. You've been logging them, which makes this much " +
      "easier than starting from memory.",
    ts({ minutes: -42 }),
  ),
  msg(
    "msg_308",
    "con_003",
    "PATIENT",
    "They're all logged. I can see them on my side.",
    ts({ minutes: -36 }),
  ),
  msg(
    "msg_309",
    "con_003",
    "EXPERT",
    "I have them. Bring the lab result back into this consultation when it lands and " +
      "we'll talk about options. There are several, and none of them start with " +
      "surgery.",
    ts({ minutes: -31 }),
  ),
  // con_002, the completed dermatology visit
  msg(
    "msg_201",
    "con_002",
    "PATIENT",
    "Good afternoon doctor. I've attached photos in daylight as you asked.",
    ts({ days: -6, hours: -2, minutes: 5 }),
  ),
  msg("msg_202", "con_002", "PATIENT", null, ts({ days: -6, hours: -2, minutes: 6 }), "IMAGE", {
    media_url: "/media/attachment.jpg",
  }),
  msg(
    "msg_203",
    "con_002",
    "EXPERT",
    "Thank you. Can you tell me the exact name on the cream you bought in April, and " +
      "whether it listed its ingredients?",
    ts({ days: -6, hours: -1, minutes: -48 }),
  ),
  msg(
    "msg_204",
    "con_002",
    "PATIENT",
    "No ingredients on it at all. Just the brand name on the tub.",
    ts({ days: -6, hours: -1, minutes: -45 }),
  ),
  msg(
    "msg_205",
    "con_002",
    "EXPERT",
    "That's the part I was worried about. Unlabelled lightening creams sold that way " +
      "very often contain a strong steroid, and a strong steroid on facial skin for six " +
      "months is what turns a treatable patch into this. Stop it today, don't taper, " +
      "just stop. I'll write up what to use instead.",
    ts({ days: -6, hours: -1, minutes: -40 }),
  ),
  msg(
    "msg_206",
    "con_002",
    "PATIENT",
    "I stopped this morning after reading your note. Thank you for being straight " + "with me.",
    ts({ days: -6, hours: -1, minutes: -12 }),
  ),
  // con_106, Amara's active case (expert context)
  msg(
    "msg_601",
    "con_106",
    "PATIENT",
    "Doctor, they've come back again this month, both sides.",
    ts({ minutes: -33 }),
  ),
  msg(
    "msg_602",
    "con_106",
    "EXPERT",
    "How many separate lumps right now, and is any of them draining today?",
    ts({ minutes: -28 }),
  ),
  msg(
    "msg_603",
    "con_106",
    "PATIENT",
    "Three on the left, one on the right. The left one is draining.",
    ts({ minutes: -24 }),
  ),
  msg(
    "msg_604",
    "con_106",
    "EXPERT",
    "I've ordered a swab so we treat what's actually there rather than guessing. " +
      "Please have it taken before you put anything antiseptic on it.",
    ts({ minutes: -11 }),
  ),
];
write("chat-messages.json", chat);

console.log("fixtures part 3 done");

// ────────────────────────────────────────── logs & insights ──

const SYMPTOMS: [string, string][] = [
  ["sym_cramping", "Cramping"],
  ["sym_headache", "Headache"],
  ["sym_nausea", "Nausea"],
  ["sym_fatigue", "Fatigue"],
  ["sym_bloating", "Bloating"],
  ["sym_dizziness", "Dizziness"],
  ["sym_back_pain", "Back pain"],
  ["sym_fever", "Fever"],
  ["sym_cough", "Cough"],
  ["sym_sore_throat", "Sore throat"],
  ["sym_itching", "Itching"],
  ["sym_rash", "Rash"],
  ["sym_chest_pain", "Chest pain"],
  ["sym_breathlessness", "Breathlessness"],
  ["sym_heartburn", "Heartburn"],
  ["sym_low_mood", "Low mood"],
  ["sym_poor_sleep", "Poor sleep"],
  ["sym_joint_pain", "Joint pain"],
];

const logs: Record<string, any>[] = [];
let lid = 0;

function log(
  category: string,
  when: string,
  source = "FORM",
  fields: Record<string, any> = {},
): Record<string, any> {
  lid += 1;
  let row: Record<string, any> = {
    id: `log_${pad(lid, 4)}`,
    patient_id: "pat_amara",
    category,
    source,
    logged_at: when,
    updated_at: when,
    supersedes: null,
    is_estimate: false,
    note: null,
    label: null,
  };
  row = { ...row, ...fields };
  return row;
}

// A month of believable, uneven logging — not a perfect streak.
const MEALS: [string, string, string | null][] = [
  ["BREAKFAST", "Akara and pap", null],
  ["LUNCH", "Jollof rice with chicken", null],
  ["DINNER", "Yam and egg sauce", null],
  ["SNACK", "Groundnuts", null],
  ["BREAKFAST", "Bread and tea", "Rushed, ate at the office"],
  ["LUNCH", "Beans and plantain", null],
  ["DINNER", "Pepper soup", "Late, around 10pm"],
];
const MEAL_HOUR: Record<string, number> = { BREAKFAST: -3, LUNCH: 1, DINNER: 7, SNACK: 4 };
const dayOffsets = [
  0, 0, 0, -1, -1, -2, -2, -3, -4, -4, -5, -6, -6, -7, -8, -9, -9, -11, -12, -13, -14, -14, -16,
  -18, -19, -21, -22, -24, -27, -30,
];
dayOffsets.forEach((d, i) => {
  const [meal, label, note] = MEALS[i % MEALS.length];
  const hour = MEAL_HOUR[meal];
  logs.push(
    log(
      "FOOD",
      ts({ days: d, hours: hour, minutes: -(i % 40) }),
      i % 6 === 0 ? "COMPANION" : "FORM",
      {
        meal_type: meal,
        label,
        note,
      },
    ),
  );
});

[0, -1, -2, -3, -4, -5, -6, -8, -9, -11, -13, -15, -18, -22, -28].forEach((d, i) => {
  logs.push(
    log("DRINK", ts({ days: d, hours: 5, minutes: -(i * 3) }), "FORM", {
      drink_type: i % 4 ? "WATER" : "OTHER",
      label: i % 4 ? null : "Zobo",
      count: [6, 8, 5, 7, 9][i % 5],
    }),
  );
});

// Cycle: one estimated history row, then four logged cycles.
logs.push(
  log("CYCLE", ts({ days: -152 }), "FORM", {
    is_estimate: true,
    start_date: dateStr({ days: -158 }),
    end_date: dateStr({ days: -153 }),
    flow_intensity: 2,
    note: "Estimated from what Amara remembered at sign-up.",
  }),
);
(
  [
    [-118, -113, 2],
    [-89, -83, 3],
    [-59, -52, 3],
    [-30, -22, 3],
  ] as [number, number, number][]
).forEach(([start, end, flow]) => {
  logs.push(
    log("CYCLE", ts({ days: start, hours: -2 }), "FORM", {
      start_date: dateStr({ days: start }),
      end_date: dateStr({ days: end }),
      flow_intensity: flow,
      note: flow === 3 ? "Heavier than usual, clots" : null,
    }),
  );
});

(
  [
    [0, ["sym_cramping", "sym_fatigue"], 2, null],
    [-1, ["sym_cramping"], 3, "Had to leave a meeting"],
    [-2, ["sym_back_pain", "sym_cramping"], 2, null],
    [-6, ["sym_itching"], 1, "Only after the cream"],
    [-8, ["sym_headache"], 2, null],
    [-13, ["sym_fatigue", "sym_dizziness"], 2, "Stood up too fast twice today"],
    [-21, ["sym_heartburn"], 3, "Woke me around 2am"],
    [-23, ["sym_heartburn", "sym_nausea"], 2, null],
    [-25, ["sym_heartburn"], 2, null],
  ] as [number, string[], number, string | null][]
).forEach(([d, syms, sev, note], i) => {
  logs.push(
    log(
      "SYMPTOMS",
      ts({ days: d, hours: 6, minutes: -(i * 7) }),
      i === 0 || i === 5 ? "COMPANION" : "FORM",
      {
        symptom_ids: syms,
        severity: sev,
        note,
      },
    ),
  );
});

(
  [
    [0, "BLOOD_PRESSURE", { systolic: 112, diastolic: 74 }],
    [-2, "WEIGHT", { value: 68.4 }],
    [-7, "BLOOD_PRESSURE", { systolic: 118, diastolic: 76 }],
    [-9, "HEART_RATE", { value: 88 }],
    [-14, "TEMPERATURE", { value: 36.9 }],
    [-22, "BLOOD_PRESSURE", { systolic: 124, diastolic: 80 }],
    [-29, "WEIGHT", { value: 69.1 }],
  ] as [number, string, Record<string, number>][]
).forEach(([d, vt, extra], i) => {
  logs.push(
    log("VITALS", ts({ days: d, hours: -2, minutes: -(i * 11) }), "FORM", {
      vital_type: vt,
      ...extra,
    }),
  );
});

(
  [
    [0, "WALK", 35],
    [-2, "WALK", 40],
    [-3, "GYM", 55],
    [-5, "WALK", 25],
    [-7, "RUN", 30],
    [-10, "GYM", 60],
    [-12, "WALK", 45],
    [-17, "WALK", 30],
  ] as [number, string, number][]
).forEach(([d, at, mins], i) => {
  logs.push(
    log("PHYSICAL_ACTIVITY", ts({ days: d, hours: -4, minutes: -(i * 5) }), "FORM", {
      activity_type: at,
      duration_minutes: mins,
    }),
  );
});

(
  [
    [0, "23:20", "05:40", null],
    [-1, "00:10", "06:05", "Woke twice"],
    [-2, "22:50", "06:15", null],
    [-3, "23:45", "05:30", null],
    [-4, "01:05", "06:20", "Late night, cramps"],
    [-6, "22:40", "06:00", null],
    [-8, "23:30", "06:10", null],
    [-11, "23:00", "05:50", null],
  ] as [number, string, string, string | null][]
).forEach(([d, s, e, note], i) => {
  logs.push(
    log("SLEEP", ts({ days: d, hours: -6, minutes: -(i * 3) }), "FORM", {
      sleep_start_time: s,
      sleep_end_time: e,
      note,
    }),
  );
});

// One dependant log so P15's "manage their calendar" has something behind it.
for (const row of [
  log("VITALS", ts({ days: -39, hours: 2 }), "FORM", { vital_type: "TEMPERATURE", value: 38.4 }),
  log("SYMPTOMS", ts({ days: -39, hours: 1 }), "FORM", {
    symptom_ids: ["sym_fever", "sym_cough"],
    severity: 2,
    note: "Second day",
  }),
]) {
  row.patient_id = "pat_tobi";
  logs.push(row);
}

// A distinct verified-dependant row makes cross-context calendar and logging checks auditable.
const kelechiLog = log("SYMPTOMS", ts({ days: -2, hours: 3 }), "FORM", {
  symptom_ids: ["sym_headache"],
  severity: 1,
  note: "Kelechi context sentinel: mild headache after lunch",
});
kelechiLog.patient_id = "pat_kelechi";
logs.push(kelechiLog);

logs.sort((a, b) => (a.logged_at < b.logged_at ? 1 : a.logged_at > b.logged_at ? -1 : 0));
write("log-entries.json", logs);

const insights = [
  {
    id: "ins_001",
    patient_id: "pat_amara",
    type: "OBSERVATION",
    observation:
      "Your last four cycles have each run a day or two longer than the one " + "before.",
    reasoning:
      "Comparing the start and end dates you logged in May, June, July and " +
      "August: 5 days, then 6, then 7, then 8. That is a consistent direction " +
      "rather than one unusual month, which is why it is worth naming. It does " +
      "not tell us the cause. Bleeding can lengthen for many reasons, several " +
      "of them ordinary. An expert can.",
    occurred_at: ts({ days: -21, hours: 3 }),
    source_log_entries: ["log_0055", "log_0056", "log_0057", "log_0058"],
    dismissed_at: null,
  },
  {
    id: "ins_002",
    patient_id: "pat_amara",
    type: "OBSERVATION",
    observation: "The heartburn you logged in late July always followed a meal after " + "9pm.",
    reasoning:
      "Three of the three heartburn entries in that stretch came the night of " +
      "a dinner you logged after 9pm, and none came on a night you ate " +
      "earlier. Three matches is a small number, so treat this as a pattern " +
      "worth watching rather than a settled fact.",
    occurred_at: ts({ days: -20, hours: 1 }),
    source_log_entries: ["log_0061", "log_0062"],
    dismissed_at: null,
  },
  {
    id: "ins_003",
    patient_id: "pat_amara",
    type: "PREDICTION",
    observation:
      "If your recent pattern holds, your next period would start around " +
      `${dayOfMonth(addDelta(ANCHOR_MS, { days: 1 }))} ${monthName(addDelta(ANCHOR_MS, { days: 1 }))}.`,
    reasoning:
      "Your last four cycles started 29, 30 and 29 days apart. That average " +
      "puts the next one within a couple of days of tomorrow. Cycles move for " +
      "all sorts of reasons, so this is an estimate from your own history, not " +
      "a schedule.",
    occurred_at: ts({ days: -3, hours: 2 }),
    source_log_entries: ["log_0058"],
    dismissed_at: null,
  },
  {
    id: "ins_004",
    patient_id: "pat_amara",
    type: "OBSERVATION",
    observation: "You slept under six hours on four of the last seven nights.",
    reasoning:
      "From the sleep windows you logged. Nothing here says why, and one short " +
      "week is not a trend.",
    occurred_at: ts({ days: -1, hours: -1 }),
    source_log_entries: ["log_0070", "log_0071"],
    dismissed_at: ts({ days: -1 }),
  },
];
write("insights.json", insights);

console.log("fixtures part 4 done");

// ─────────────────────────────────── Teni (companion) ──

interface CmsgOpts {
  item?: unknown;
  pending?: boolean;
  patientId?: string;
  key?: string;
}

function cmsg(
  seq: number,
  role: string,
  body: string | null,
  when: string,
  mtype = "TEXT",
  opts: CmsgOpts = {},
): Record<string, any> {
  const { item = null, pending = false, patientId = "pat_amara", key } = opts;
  return {
    id: key ?? `cmp_${pad(seq, 3)}`,
    patient_id: patientId,
    seq,
    role,
    type: mtype,
    body,
    item,
    pending_confirmation: pending,
    sent_at: when,
    emergency_routing: null,
  };
}

const companion: Record<string, any>[] = [
  cmsg(
    1,
    "COMPANION",
    "Hello Amara. I'm Teni. You can tell me what you've eaten, how you're feeling, " +
      "or what you've measured, and I'll put it in your record. I'll always read it " +
      "back before I save anything. I don't diagnose and I don't prescribe; that's a " +
      "licensed expert's job, and I can help you find one.",
    ts({ days: -214, minutes: -20 }),
    "SYSTEM",
  ),
  cmsg(
    2,
    "USER",
    "I've been getting that burning feeling again after dinner",
    ts({ days: -25, hours: 7 }),
  ),
  cmsg(
    3,
    "COMPANION",
    "That's the third time this month. Do you want me to log it as heartburn?",
    ts({ days: -25, hours: 7, minutes: 1 }),
  ),
  cmsg(4, "USER", "yes, moderate", ts({ days: -25, hours: 7, minutes: 2 })),
  cmsg(
    5,
    "COMPANION",
    "Saving this to your calendar.",
    ts({ days: -25, hours: 7, minutes: 2 }),
    "LOG_PROPOSAL",
    {
      item: {
        category: "SYMPTOMS",
        symptom: "Heartburn",
        severity: "Moderate (2 of 3)",
        logged_at: "25 Jul 2026, 16:15",
      },
    },
  ),
  cmsg(6, "USER", "what did the doctor say about the cream last week", ts({ days: -5, hours: 2 })),
  cmsg(
    7,
    "COMPANION",
    "Dr. Bassey's plan from 23 August says: stop all current creams, start azelaic " +
      "acid 20% twice daily, and use SPF 50 every morning with a midday reapplication. " +
      "She wrote that the sunscreen is the part that does most of the work. The full " +
      "note is on your case record.",
    ts({ days: -5, hours: 2, minutes: 1 }),
  ),
  cmsg(8, "USER", "I walked for about 35 minutes this morning", ts({ hours: -4 })),
  cmsg(
    9,
    "COMPANION",
    "Nice one. Logging a 35-minute walk for this morning.",
    ts({ hours: -4, minutes: 1 }),
    "LOG_PROPOSAL",
    {
      item: {
        category: "Physical activity",
        type: "Walk",
        duration: "35 minutes",
        logged_at: "Today, 05:15",
      },
    },
  ),
  cmsg(10, "USER", "also I only slept about five hours", ts({ hours: -4, minutes: 2 })),
  cmsg(
    11,
    "COMPANION",
    "Got it. I have you down as 23:20 to 05:40, six hours twenty. Should I save " +
      "that, or do you want to change the times?",
    ts({ hours: -4, minutes: 3 }),
    "LOG_PROPOSAL",
    {
      item: { category: "Sleep", asleep: "23:20", awake: "05:40", duration: "6h 20m" },
      pending: true,
    },
  ),
  cmsg(
    1,
    "COMPANION",
    "Hello Kelechi. This conversation belongs only to your record.",
    ts({ days: -12 }),
    "SYSTEM",
    {
      patientId: "pat_kelechi",
      key: "cmp_kelechi_001",
    },
  ),
  cmsg(2, "USER", "I had a mild headache after lunch", ts({ days: -2, hours: 3 }), "TEXT", {
    patientId: "pat_kelechi",
    key: "cmp_kelechi_002",
  }),
  cmsg(
    3,
    "COMPANION",
    "Save Kelechi's mild headache to the calendar?",
    ts({ days: -2, hours: 3, minutes: 1 }),
    "LOG_PROPOSAL",
    {
      item: {
        category: "SYMPTOMS",
        symptom: "Headache",
        severity: "A little (1 of 3)",
        logged_at: "2 days ago, 12:15",
      },
      pending: true,
      patientId: "pat_kelechi",
      key: "cmp_kelechi_003",
    },
  ),
  cmsg(
    1,
    "COMPANION",
    "Hello Tobi. This conversation belongs only to Tobi's record.",
    ts({ days: -39 }),
    "SYSTEM",
    {
      patientId: "pat_tobi",
      key: "cmp_tobi_001",
    },
  ),
];
write("companion-messages.json", companion);

const memory: Record<string, any>[] = [
  {
    id: "mem_001",
    note: "Prefers to be called Amara, not Ms. Okonkwo.",
    keywords: ["name", "preference"],
    confirmed_at: ts({ days: -180 }),
    dismissed_at: null,
  },
  {
    id: "mem_002",
    note:
      "Works in an open-plan office in Victoria Island; a clinic visit costs her " +
      "most of a working day.",
    keywords: ["work", "travel", "time off"],
    confirmed_at: ts({ days: -97 }),
    dismissed_at: null,
  },
  {
    id: "mem_003",
    note: "Allergic to sulfa drugs, rash as a teenager.",
    keywords: ["allergy", "sulfa", "rash"],
    confirmed_at: ts({ days: -88 }),
    dismissed_at: null,
  },
  {
    id: "mem_004",
    note:
      "Manages her son Tobi's health from this account, and her sister Zainab's " + "since April.",
    keywords: ["dependants", "guardian"],
    confirmed_at: ts({ days: -40 }),
    dismissed_at: null,
  },
  {
    id: "mem_005",
    note:
      "Stopped the market lightening cream on 23 August and is nervous about the " +
      "pigmentation coming back.",
    keywords: ["skin", "cream", "worry"],
    confirmed_at: null,
    dismissed_at: null,
  },
  {
    id: "mem_006",
    note: "Fasts on Wednesdays.",
    keywords: ["fasting", "routine"],
    confirmed_at: null,
    dismissed_at: null,
  },
];
for (const row of memory) {
  row.patient_id = "pat_amara";
}
memory.push(
  {
    id: "mem_kelechi_001",
    patient_id: "pat_kelechi",
    note: "Kelechi prefers appointment reminders after 6pm.",
    keywords: ["reminders", "evening"],
    confirmed_at: ts({ days: -30 }),
    dismissed_at: null,
  },
  {
    id: "mem_tobi_001",
    patient_id: "pat_tobi",
    note: "Tobi finds liquid medicine easier than tablets.",
    keywords: ["medicine", "preference"],
    confirmed_at: ts({ days: -38 }),
    dismissed_at: null,
  },
);
write("companion-memory.json", memory);

// ─────────────────────────────────── providers (pharmacy/lab) ──

const providers: Record<string, any>[] = [
  {
    id: "prv_ph_greenlife",
    provider_type: "PHARMACY",
    business_name: "GreenLife Pharmacy",
    availability_status: "ONLINE",
    distance_km: 1.2,
    services_offered: null,
    state: "Lagos",
    premises_address: "14 Herbert Macaulay Way, Yaba, Lagos",
    city: "Lagos",
    local_government_area: "Lagos Mainland",
    cac_number: "RC-2884190",
    license_number: "PCN/PRM/LA/2021/04417",
    profile_note:
      "Usually carries common medications. Delivery within Yaba and " + "Surulere the same day.",
    contact_name: "Ibrahim Sule",
    contact_phone: "+234 802 314 7761",
  },
  {
    id: "prv_ph_medplus",
    provider_type: "PHARMACY",
    business_name: "MedPlus Ikeja",
    availability_status: "AWAY",
    distance_km: 4.8,
    services_offered: null,
    state: "Lagos",
    premises_address: "Allen Avenue, Ikeja, Lagos",
    city: "Lagos",
    local_government_area: "Ikeja",
    profile_note: "Wide stock, including refrigerated items. Pickup only.",
    contact_name: "Funmi Adigun",
    contact_phone: "+234 803 552 9012",
  },
  {
    id: "prv_ph_alpha",
    provider_type: "PHARMACY",
    business_name: "Alpha Chemists",
    availability_status: "OUT_OF_OFFICE",
    distance_km: 6.4,
    services_offered: null,
    state: "Lagos",
    premises_address: "22 Adeniran Ogunsanya, Surulere, Lagos",
    city: "Lagos",
    local_government_area: "Surulere",
    profile_note: "Common medications and dermatology lines.",
    contact_name: "Chinedu Okoye",
    contact_phone: "+234 806 771 4420",
  },
  {
    id: "prv_ph_hopewell",
    provider_type: "PHARMACY",
    business_name: "HopeWell Pharmacy",
    availability_status: "ONLINE",
    distance_km: 9.1,
    services_offered: null,
    state: "Lagos",
    premises_address: "Admiralty Way, Lekki Phase 1, Lagos",
    city: "Lagos",
    local_government_area: "Eti-Osa",
    profile_note: "Open until 10pm daily.",
    contact_name: "Grace Effiong",
    contact_phone: "+234 809 220 6614",
  },
  {
    id: "prv_lab_lagosdiag",
    provider_type: "LAB",
    business_name: "Lagos Diagnostics",
    availability_status: "ONLINE",
    distance_km: 2.1,
    services_offered: [
      "Haematology",
      "Chemistry",
      "Hormones",
      "Microbiology",
      "Home sample collection",
    ],
    state: "Lagos",
    premises_address: "3 Commercial Avenue, Yaba, Lagos",
    city: "Lagos",
    local_government_area: "Lagos Mainland",
    cac_number: "RC-5278134",
    license_number: "MLSCN/LAB/2020/1188",
    profile_note: "Results typically within 24 hours.",
    contact_name: "Ngozi Chukwu",
    contact_phone: "+234 807 441 3390",
  },
  {
    id: "prv_lab_synlab",
    provider_type: "LAB",
    business_name: "SynLab Ikoyi",
    availability_status: "AWAY",
    distance_km: 5.6,
    services_offered: ["Microbiology", "Culture and sensitivity", "Histopathology"],
    state: "Lagos",
    premises_address: "18 Awolowo Road, Ikoyi, Lagos",
    city: "Lagos",
    local_government_area: "Eti-Osa",
    profile_note: "Microbiology and culture work, including sensitivities.",
    contact_name: "Tunde Bakare",
    contact_phone: "+234 813 662 5581",
  },
  {
    id: "prv_lab_clinix",
    provider_type: "LAB",
    business_name: "Clinix Laboratory",
    availability_status: "OUT_OF_OFFICE",
    distance_km: 7.9,
    services_offered: ["Chemistry", "Haematology", "Imaging"],
    state: "Lagos",
    premises_address: "Ogudu Road, Ojota, Lagos",
    city: "Lagos",
    local_government_area: "Kosofe",
    profile_note: "Walk-ins accepted before 11am.",
    contact_name: "Blessing Nwachukwu",
    contact_phone: "+234 815 903 2247",
  },
  {
    id: "prv_lab_pathcare",
    provider_type: "LAB",
    business_name: "PathCare Abuja",
    availability_status: "ONLINE",
    distance_km: null,
    services_offered: ["Chemistry", "Hormones", "Genetics"],
    state: "FCT",
    premises_address: "Plot 244 Ademola Adetokunbo, Wuse II, Abuja",
    city: "Abuja",
    local_government_area: "Abuja Municipal",
    profile_note: "Endocrine and genetic panels.",
    contact_name: "Ahmed Musa",
    contact_phone: "+234 816 774 1198",
  },
];
const LAB_SERVICE_FEES: Record<string, number> = {
  Haematology: 500000,
  Chemistry: 650000,
  Microbiology: 800000,
  Hormones: 1200000,
  Serology: 550000,
  Histopathology: 1500000,
  "Home sample collection": 350000,
  "Culture and sensitivity": 1000000,
  Imaging: 1800000,
  Genetics: 2500000,
};
const PAYOUT_ACCOUNTS: Record<string, [string, string, string]> = {
  prv_ph_greenlife: ["058", "0123456789", "GreenLife Pharmacy Ltd."],
  prv_ph_medplus: ["057", "1122334455", "MedPlus Ikeja Ltd."],
  prv_ph_alpha: ["044", "0033441122", "Alpha Chemists Ltd."],
  prv_ph_hopewell: ["033", "2001887766", "HopeWell Pharmacy Ltd."],
  prv_lab_lagosdiag: ["058", "0099887766", "Lagos Diagnostics Ltd."],
  prv_lab_synlab: ["057", "5544332211", "SynLab Ikoyi Ltd."],
  prv_lab_clinix: ["044", "0077665544", "Clinix Laboratory Ltd."],
  prv_lab_pathcare: ["033", "3009911223", "PathCare Abuja Ltd."],
};
for (const p of providers) {
  p.logo_url = null; // Nobody's uploaded one yet (V14) — the honest default.
  p.organization_id = null; // Forward capacity for a hospital/clinic tenant (§5).
  p.service_fees =
    p.provider_type === "LAB"
      ? (p.services_offered as string[]).map((service) => ({
          service,
          fee_kobo: LAB_SERVICE_FEES[service] ?? 500000,
        }))
      : null;
  // A payout destination belongs to the provider profile, not to the patient-facing
  // order. The real build resolves the account holder with Nomba before allowing
  // this destination to receive a marketplace settlement.
  const [bankCode, accountNumber, accountName] = PAYOUT_ACCOUNTS[p.id];
  p.payout_bank_code = bankCode;
  p.payout_bank_account_number = accountNumber;
  p.payout_account_name = accountName;
  p.payout_verified_at = ts({ days: -12 });
}
write("providers.json", providers);

// V14a is deliberately separate from V14: operational profile changes are immediate,
// while documents remain an auditable verification record. The pending certificate
// gives the prototype a safe, deletable-upload state without implying that an issued
// licence can be silently erased.
const providerCredentials = [
  {
    id: "pcred_greenlife_licence",
    provider_id: "prv_ph_greenlife",
    credential_type: "OPERATING_LICENCE",
    title: "PCN premises licence",
    reference_number: "PCN/PRM/LA/2021/04417",
    document_filename: "greenlife-pcn-licence.pdf",
    expires_at: "2027-08-31",
    verification_status: "VERIFIED",
    verified_at: ts({ days: -6 }),
    retired_at: null,
  },
  {
    id: "pcred_greenlife_gdp",
    provider_id: "prv_ph_greenlife",
    credential_type: "CERTIFICATION",
    title: "Good Distribution Practice certificate",
    reference_number: "GDP/NG/2026/091",
    document_filename: "greenlife-gdp.pdf",
    expires_at: "2028-02-15",
    verification_status: "VERIFIED",
    verified_at: ts({ days: -4 }),
    retired_at: null,
  },
  {
    id: "pcred_greenlife_cold",
    provider_id: "prv_ph_greenlife",
    credential_type: "CERTIFICATION",
    title: "Cold-chain handling certificate",
    reference_number: "CCH/2026/114",
    document_filename: "cold-chain-certificate.pdf",
    expires_at: "2027-05-20",
    verification_status: "PENDING",
    verified_at: null,
    retired_at: null,
  },
  {
    id: "pcred_lagosdiag_licence",
    provider_id: "prv_lab_lagosdiag",
    credential_type: "OPERATING_LICENCE",
    title: "MLSCN laboratory licence",
    reference_number: "MLSCN/LAB/2020/1188",
    document_filename: "lagos-diagnostics-mlscn-licence.pdf",
    expires_at: "2027-06-30",
    verification_status: "VERIFIED",
    verified_at: ts({ days: -6 }),
    retired_at: null,
  },
  {
    id: "pcred_lagosdiag_iso",
    provider_id: "prv_lab_lagosdiag",
    credential_type: "CERTIFICATION",
    title: "Quality management certificate",
    reference_number: "QMS/LAB/2026/041",
    document_filename: "lagos-diagnostics-qms.pdf",
    expires_at: "2028-01-12",
    verification_status: "VERIFIED",
    verified_at: ts({ days: -3 }),
    retired_at: null,
  },
  {
    id: "pcred_lagosdiag_collection",
    provider_id: "prv_lab_lagosdiag",
    credential_type: "CERTIFICATION",
    title: "Home sample collection certificate",
    reference_number: "HSC/2026/029",
    document_filename: "home-sample-certificate.pdf",
    expires_at: "2027-03-01",
    verification_status: "PENDING",
    verified_at: null,
    retired_at: null,
  },
];
write("provider-credentials.json", providerCredentials);

const providerRequests: Record<string, any>[] = [
  {
    id: "preq_001",
    provider_type: "PHARMACY",
    provider_id: "prv_ph_greenlife",
    status: "ACCEPTED",
    requested_at: ts({ days: -5, hours: -2 }),
    respond_by: ts({ days: -5, hours: 1 }),
    responded_at: ts({ days: -5, hours: -1, minutes: -18 }),
    decline_reason: null,
    order_status: "PREPARING",
    delivery_or_pickup: "DELIVERY",
    delivery_note: "14b Ojuelegba Road, Surulere. Call on arrival, the gate is unmarked.",
    slot_id: null,
    result_status: null,
    prescription_id: "rx_002",
    lab_order_id: null,
    checkout_payment_id: "chk_301",
    consultation_id: "con_002",
    patient_identity_id: "pat_amara",
    amount_kobo: 780000,
  },
  {
    id: "preq_002",
    provider_type: "LAB",
    provider_id: "prv_lab_lagosdiag",
    status: "ACCEPTED",
    requested_at: ts({ days: -5, hours: -1 }),
    respond_by: ts({ days: -5, hours: 2 }),
    responded_at: ts({ days: -5, minutes: -40 }),
    decline_reason: null,
    order_status: null,
    delivery_or_pickup: null,
    delivery_note: null,
    slot_id: "pslot_003",
    result_status: "UPLOADED",
    prescription_id: null,
    checkout_payment_id: "chk_302",
    lab_order_id: "lab_002",
    consultation_id: "con_002",
    patient_identity_id: "pat_amara",
    amount_kobo: 1450000,
    result_summary: "25-OH vitamin D 14 ng/mL, deficient (reference 30-100 ng/mL).",
  },
  {
    id: "preq_003",
    provider_type: "PHARMACY",
    provider_id: "prv_ph_medplus",
    status: "DECLINED",
    requested_at: ts({ days: -5, hours: -4 }),
    respond_by: ts({ days: -5, hours: -1 }),
    responded_at: ts({ days: -5, hours: -3, minutes: -11 }),
    decline_reason: "Out of stock today.",
    order_status: null,
    delivery_or_pickup: null,
    delivery_note: null,
    slot_id: null,
    result_status: null,
    prescription_id: "rx_002",
    lab_order_id: null,
    checkout_payment_id: null,
    consultation_id: "con_002",
    patient_identity_id: "pat_amara",
    amount_kobo: null,
  },
  // ── GreenLife's own inbound queue (pharmacy portal) ─────────
  {
    id: "preq_101",
    provider_type: "PHARMACY",
    provider_id: "prv_ph_greenlife",
    status: "REQUESTED",
    requested_at: ts({ minutes: -7 }),
    respond_by: ts({ hours: 2, minutes: 53 }),
    responded_at: null,
    decline_reason: null,
    order_status: null,
    delivery_or_pickup: null,
    delivery_note: null,
    slot_id: null,
    result_status: null,
    prescription_id: "rx_007",
    lab_order_id: null,
    checkout_payment_id: null,
    consultation_id: "con_108",
    patient_identity_id: "pat_sade",
    amount_kobo: null,
  },
  {
    id: "preq_102",
    provider_type: "PHARMACY",
    provider_id: "prv_ph_greenlife",
    status: "REQUESTED",
    requested_at: ts({ minutes: -51 }),
    respond_by: ts({ hours: 2, minutes: 9 }),
    responded_at: null,
    decline_reason: null,
    order_status: null,
    delivery_or_pickup: null,
    delivery_note: null,
    slot_id: null,
    result_status: null,
    prescription_id: "rx_005",
    lab_order_id: null,
    checkout_payment_id: null,
    consultation_id: "con_107",
    patient_identity_id: "pat_ngozi",
    amount_kobo: null,
  },
  {
    id: "preq_103",
    provider_type: "PHARMACY",
    provider_id: "prv_ph_greenlife",
    status: "ACCEPTED",
    requested_at: ts({ hours: -5 }),
    respond_by: ts({ hours: -2 }),
    responded_at: ts({ hours: -4, minutes: -42 }),
    decline_reason: null,
    order_status: "READY_FOR_PICKUP",
    delivery_or_pickup: "PICKUP",
    delivery_note: "Collecting after 5pm.",
    slot_id: null,
    result_status: null,
    prescription_id: "rx_004",
    lab_order_id: null,
    checkout_payment_id: "chk_201",
    consultation_id: "con_010",
    patient_identity_id: "pat_tobi",
    amount_kobo: 320000,
  },
  {
    id: "preq_104",
    provider_type: "PHARMACY",
    provider_id: "prv_ph_greenlife",
    status: "ACCEPTED",
    requested_at: ts({ days: -3 }),
    respond_by: ts({ days: -3, hours: 3 }),
    responded_at: ts({ days: -3, minutes: 22 }),
    decline_reason: null,
    order_status: "FULFILLED",
    delivery_or_pickup: "DELIVERY",
    delivery_note: "Left with the security post.",
    slot_id: null,
    result_status: null,
    prescription_id: "rx_006",
    lab_order_id: null,
    checkout_payment_id: "chk_304",
    consultation_id: "con_107",
    patient_identity_id: "pat_ngozi",
    amount_kobo: 540000,
  },
  {
    id: "preq_105",
    provider_type: "PHARMACY",
    provider_id: "prv_ph_greenlife",
    status: "ACCEPTED",
    requested_at: ts({ days: -8 }),
    respond_by: ts({ days: -8, hours: 3 }),
    responded_at: ts({ days: -8, minutes: 40 }),
    decline_reason: null,
    order_status: "FULFILLED",
    delivery_or_pickup: "PICKUP",
    delivery_note: null,
    slot_id: null,
    result_status: null,
    prescription_id: "rx_001",
    lab_order_id: null,
    checkout_payment_id: "chk_305",
    consultation_id: "con_001",
    patient_identity_id: "pat_amara",
    amount_kobo: 420000,
  },
  // ── Lagos Diagnostics' inbound queue (lab portal) ───────────
  {
    id: "preq_201",
    provider_type: "LAB",
    provider_id: "prv_lab_lagosdiag",
    status: "REQUESTED",
    requested_at: ts({ minutes: -16 }),
    respond_by: ts({ hours: 2 }),
    responded_at: null,
    decline_reason: null,
    order_status: null,
    delivery_or_pickup: null,
    delivery_note: null,
    slot_id: null,
    result_status: null,
    prescription_id: null,
    lab_order_id: "lab_003",
    checkout_payment_id: null,
    consultation_id: "con_003",
    patient_identity_id: "pat_amara",
    amount_kobo: null,
  },
  {
    id: "preq_202",
    provider_type: "LAB",
    provider_id: "prv_lab_lagosdiag",
    status: "ACCEPTED",
    requested_at: ts({ days: -1, hours: -2 }),
    respond_by: ts({ days: -1, hours: 1 }),
    responded_at: ts({ days: -1, hours: -1, minutes: -30 }),
    decline_reason: null,
    order_status: null,
    delivery_or_pickup: null,
    delivery_note: null,
    slot_id: "pslot_001",
    result_status: "AWAITING",
    prescription_id: null,
    lab_order_id: "lab_005",
    checkout_payment_id: "chk_204",
    consultation_id: "con_109",
    patient_identity_id: "pat_dele",
    amount_kobo: 1180000,
  },
  {
    id: "preq_203",
    provider_type: "LAB",
    provider_id: "prv_lab_lagosdiag",
    status: "ACCEPTED",
    requested_at: ts({ days: -6 }),
    respond_by: ts({ days: -6, hours: 3 }),
    responded_at: ts({ days: -6, minutes: 35 }),
    decline_reason: null,
    order_status: null,
    delivery_or_pickup: null,
    delivery_note: null,
    slot_id: "pslot_004",
    result_status: "UPLOADED",
    prescription_id: null,
    lab_order_id: "lab_001",
    checkout_payment_id: "chk_202",
    consultation_id: "con_001",
    patient_identity_id: "pat_amara",
    amount_kobo: 950000,
    result_summary: "Negative for H. pylori antigen.",
  },
  // Values the schema permits that no row carried, so the screens that render
  // them could only be reached through the prototype bar and never through the
  // data. Each of these sits on a V0 bullet: delivery and collection are half of
  // the pharmacy step, the terminal statuses are how a provider says no, and the
  // result states are every way a lab result can arrive badly.
  {
    id: "preq_204",
    provider_type: "PHARMACY",
    provider_id: "prv_ph_medplus",
    status: "ACCEPTED",
    requested_at: ts({ days: -1, hours: -4 }),
    respond_by: ts({ days: -1, hours: -1 }),
    responded_at: ts({ days: -1, hours: -3 }),
    decline_reason: null,
    order_status: "OUT_FOR_DELIVERY",
    delivery_or_pickup: "DELIVERY",
    delivery_note: "7 Bode Thomas Street, Surulere. Rider to call from the junction.",
    slot_id: null,
    result_status: null,
    prescription_id: "rx_002",
    lab_order_id: null,
    checkout_payment_id: null,
    consultation_id: "con_002",
    patient_identity_id: "pat_amara",
    amount_kobo: 640000,
  },
  {
    id: "preq_205",
    provider_type: "PHARMACY",
    provider_id: "prv_ph_alpha",
    status: "ACCEPTED",
    requested_at: ts({ days: -4, hours: -6 }),
    respond_by: ts({ days: -4, hours: -3 }),
    responded_at: ts({ days: -4, hours: -5 }),
    decline_reason: null,
    order_status: "MISSED_COLLECTION",
    delivery_or_pickup: "PICKUP",
    delivery_note: null,
    slot_id: null,
    result_status: null,
    prescription_id: "rx_002",
    lab_order_id: null,
    checkout_payment_id: null,
    consultation_id: "con_002",
    patient_identity_id: "pat_amara",
    amount_kobo: 640000,
  },
  {
    id: "preq_206",
    provider_type: "PHARMACY",
    provider_id: "prv_ph_hopewell",
    status: "UNABLE_TO_FULFIL",
    requested_at: ts({ days: -3, hours: -6 }),
    respond_by: ts({ days: -3, hours: -3 }),
    responded_at: ts({ days: -3, hours: -5 }),
    decline_reason: "Two of the four medications are out of stock and not expected this week.",
    order_status: null,
    delivery_or_pickup: null,
    delivery_note: null,
    slot_id: null,
    result_status: null,
    prescription_id: "rx_002",
    lab_order_id: null,
    checkout_payment_id: null,
    consultation_id: "con_002",
    patient_identity_id: "pat_amara",
    amount_kobo: null,
  },
  {
    id: "preq_207",
    provider_type: "LAB",
    provider_id: "prv_lab_synlab",
    status: "EXPIRED",
    requested_at: ts({ days: -7, hours: -6 }),
    respond_by: ts({ days: -7, hours: -3 }),
    responded_at: null,
    decline_reason: null,
    order_status: null,
    delivery_or_pickup: null,
    delivery_note: null,
    slot_id: null,
    result_status: null,
    prescription_id: null,
    lab_order_id: "lab_001",
    checkout_payment_id: null,
    consultation_id: "con_001",
    patient_identity_id: "pat_amara",
    amount_kobo: null,
  },
  {
    id: "preq_208",
    provider_type: "LAB",
    provider_id: "prv_lab_clinix",
    status: "WITHDRAWN",
    requested_at: ts({ days: -4, hours: -3 }),
    respond_by: ts({ days: -4 }),
    responded_at: null,
    decline_reason: null,
    order_status: null,
    delivery_or_pickup: null,
    delivery_note: null,
    slot_id: null,
    result_status: null,
    prescription_id: null,
    lab_order_id: "lab_001",
    checkout_payment_id: null,
    consultation_id: "con_001",
    patient_identity_id: "pat_amara",
    amount_kobo: null,
  },
  {
    id: "preq_209",
    provider_type: "LAB",
    provider_id: "prv_lab_pathcare",
    status: "OBSOLETE",
    requested_at: ts({ days: -10 }),
    respond_by: ts({ days: -10, hours: 3 }),
    responded_at: null,
    decline_reason: null,
    order_status: null,
    delivery_or_pickup: null,
    delivery_note: null,
    slot_id: null,
    result_status: null,
    prescription_id: null,
    lab_order_id: "lab_001",
    checkout_payment_id: null,
    consultation_id: "con_001",
    patient_identity_id: "pat_amara",
    amount_kobo: null,
  },
  {
    id: "preq_210",
    provider_type: "LAB",
    provider_id: "prv_lab_lagosdiag",
    status: "ACCEPTED",
    requested_at: ts({ days: -3, hours: -5 }),
    respond_by: ts({ days: -3, hours: -2 }),
    responded_at: ts({ days: -3, hours: -4 }),
    decline_reason: null,
    order_status: null,
    delivery_or_pickup: null,
    delivery_note: null,
    slot_id: null,
    result_status: "DELAYED",
    prescription_id: null,
    lab_order_id: "lab_001",
    checkout_payment_id: null,
    consultation_id: "con_001",
    patient_identity_id: "pat_amara",
    amount_kobo: 880000,
  },
  {
    id: "preq_211",
    provider_type: "LAB",
    provider_id: "prv_lab_synlab",
    status: "ACCEPTED",
    requested_at: ts({ days: -11 }),
    respond_by: ts({ days: -11, hours: 3 }),
    responded_at: ts({ days: -11, minutes: 40 }),
    decline_reason: null,
    order_status: null,
    delivery_or_pickup: null,
    delivery_note: null,
    slot_id: null,
    result_status: "PHYSICAL_COPY_ONLY",
    prescription_id: null,
    lab_order_id: "lab_001",
    checkout_payment_id: null,
    consultation_id: "con_001",
    patient_identity_id: "pat_amara",
    amount_kobo: 880000,
  },
  {
    id: "preq_212",
    provider_type: "LAB",
    provider_id: "prv_lab_clinix",
    status: "ACCEPTED",
    requested_at: ts({ days: -13 }),
    respond_by: ts({ days: -13, hours: 3 }),
    responded_at: ts({ days: -13, minutes: 30 }),
    decline_reason: null,
    order_status: null,
    delivery_or_pickup: null,
    delivery_note: null,
    slot_id: null,
    result_status: "CORRECTED",
    prescription_id: null,
    lab_order_id: "lab_001",
    checkout_payment_id: null,
    consultation_id: "con_001",
    patient_identity_id: "pat_amara",
    amount_kobo: 880000,
    result_summary:
      "Corrected: haemoglobin 11.8 g/dL, not 8.1. The first report transposed two digits.",
  },
  {
    id: "preq_213",
    provider_type: "LAB",
    provider_id: "prv_lab_pathcare",
    status: "ACCEPTED",
    requested_at: ts({ days: -14 }),
    respond_by: ts({ days: -14, hours: 3 }),
    responded_at: ts({ days: -14, minutes: 45 }),
    decline_reason: null,
    order_status: null,
    delivery_or_pickup: null,
    delivery_note: null,
    slot_id: null,
    result_status: "INCORRECT_FILE",
    prescription_id: null,
    lab_order_id: "lab_001",
    checkout_payment_id: null,
    consultation_id: "con_001",
    patient_identity_id: "pat_amara",
    amount_kobo: 880000,
  },
];

// Independent fulfilment examples need independent care episodes. Sharing one
// order across these active requests made the patient selector hide all but one
// provider and implied that the same medicine had been bought three times.
const fulfilmentExamples = new Set([
  "preq_204",
  "preq_205",
  "preq_210",
  "preq_211",
  "preq_212",
  "preq_213",
]);
for (const request of providerRequests.filter((item) => fulfilmentExamples.has(item.id))) {
  const originalCase = consultations.find((item) => item.id === request.consultation_id)!;
  const caseId = `con_${request.id}`;
  const issuedAt = new Date(new Date(`${request.requested_at}Z`).getTime() - 3600000)
    .toISOString()
    .slice(0, 19);
  const completedAt = new Date(new Date(`${request.requested_at}Z`).getTime() - 1800000)
    .toISOString()
    .slice(0, 19);
  consultations.push(
    consultation(caseId, originalCase.expert_id, request.patient_identity_id, "COMPLETED", {
      requested_at: issuedAt,
      responded_at: issuedAt,
      telemedicine_consent_at: issuedAt,
      scheduled_start: issuedAt,
      scheduled_end: completedAt,
      completed_at: completedAt,
      request_summary: originalCase.request_summary,
    }),
  );
  const note = soapNotes.find((item) => item.consultation_id === originalCase.id);
  if (note)
    soapNotes.push({
      ...note,
      consultation_id: caseId,
      finalized_at: completedAt,
      attachments: [],
    });
  request.consultation_id = caseId;
  if (request.prescription_id) {
    const original = prescriptions.find((item) => item.id === request.prescription_id)!;
    const prescriptionId = `rx_${request.id}`;
    prescriptions.push({
      ...original,
      id: prescriptionId,
      consultation_id: caseId,
      issued_at: issuedAt,
      fulfillment_status: null,
      filled_at: null,
      pharmacy_name: null,
      paid_note: null,
      corrects_id: null,
      corrected_by_id: null,
    });
    request.prescription_id = prescriptionId;
    if (request.order_status === "MISSED_COLLECTION") {
      request.status = "UNABLE_TO_FULFIL";
      request.decline_reason =
        "The collection window was missed. Choose a pharmacy for a new request.";
    }
  } else {
    const original = labOrders.find((item) => item.id === request.lab_order_id)!;
    const orderId = `lab_${request.id}`;
    const corrected = request.result_status === "CORRECTED";
    if (corrected)
      request.result_summary =
        "Corrected report: negative for H. pylori antigen. The earlier file belonged to a different sample and has been withdrawn.";
    labOrders.push({
      ...original,
      id: orderId,
      consultation_id: caseId,
      issued_at: issuedAt,
      result_status: corrected ? "ATTACHED" : "PENDING",
      result_at: corrected ? request.responded_at : null,
      result_summary: corrected ? request.result_summary : null,
      result_source: corrected
        ? providers.find((item) => item.id === request.provider_id)?.business_name
        : null,
      result_file_name: corrected ? "Corrected laboratory report.pdf" : null,
      result_corrected_at: corrected ? request.responded_at : null,
      paid_note: null,
      corrects_id: null,
      corrected_by_id: null,
    });
    request.lab_order_id = orderId;
  }
}
write("consultations.json", consultations);
write("soap-notes.json", soapNotes);
for (const prescription of prescriptions) prescription.receipt_file_name ??= null;
write("prescriptions.json", prescriptions);
write("lab-orders.json", labOrders);

const patientById: Record<string, Record<string, any>> = Object.fromEntries(
  patients.map((p) => [p.id, p]),
);

for (const request of providerRequests) {
  const patient = patientById[request.patient_identity_id];
  const isGuardian = patient.is_dependant;
  const purpose =
    request.provider_type === "PHARMACY" ? "PRESCRIPTION_FULFILMENT" : "LAB_TEST_FULFILMENT";
  const informationShared =
    purpose === "PRESCRIPTION_FULFILMENT"
      ? [
          "PATIENT_NAME",
          "PRESCRIPTION_MEDICATION",
          "PRESCRIPTION_DOSAGE",
          "PRESCRIPTION_INSTRUCTIONS",
        ]
      : ["PATIENT_NAME", "LAB_TEST_REQUESTED", "LAB_INSTRUCTIONS"];
  request.disclosure_consent = {
    id: `pdc_${request.id}`,
    actor_user_id: isGuardian
      ? patient.guardian_user_id
      : `acc_${removePrefix(patient.id, "pat_")}`,
    patient_identity_id: request.patient_identity_id,
    authority: isGuardian ? "GUARDIAN" : "SELF",
    guardian_reason: isGuardian ? patient.guardian_reason : null,
    purpose,
    statement_version: "provider-disclosure-v1",
    information_shared: informationShared,
    // Backfilled consent is represented at the request transaction boundary;
    // no more precise historical time exists in the fixture story.
    consented_at: request.requested_at,
  };
  request.original_amount_kobo = null;
  request.price_changed_at = null;
  request.terminal_reason = null;
  request.capacity_released_at = null;
  // Same patient-facing name as the lab order it belongs to, derived from the
  // same date, so the lab portal and the patient's record never disagree about
  // what the file is called.
  const resultOrder = labOrders.find((order) => order.id === request.lab_order_id);
  const hasResult = request.result_status === "UPLOADED" || request.result_status === "CORRECTED";
  request.result_file_name = hasResult ? (resultOrder?.result_file_name ?? null) : null;
  request.result_source = hasResult
    ? (providers.find((provider) => provider.id === request.provider_id)?.business_name ?? null)
    : null;
  request.result_uploaded_at = hasResult ? (resultOrder?.result_at ?? null) : null;
  request.result_corrected_at =
    request.result_status === "CORRECTED" ? (resultOrder?.result_at ?? null) : null;
}

write("provider-requests.json", providerRequests);

const providerSlots: Record<string, any>[] = [];
let psid = 0;
const PROVIDER_SLOT_BLOCKS: [string, [number, string, string][]][] = [
  [
    "prv_lab_lagosdiag",
    [
      [0, "07:00", "11:00"],
      [1, "07:00", "11:00"],
      [2, "07:00", "11:00"],
      [3, "07:00", "11:00"],
      [4, "07:00", "11:00"],
      [5, "08:00", "11:00"],
    ],
  ],
  [
    "prv_lab_synlab",
    [
      [0, "08:00", "12:00"],
      [2, "08:00", "12:00"],
      [4, "08:00", "12:00"],
    ],
  ],
  [
    "prv_lab_clinix",
    [
      [1, "07:00", "10:00"],
      [3, "07:00", "10:00"],
    ],
  ],
  [
    "prv_lab_pathcare",
    [
      [0, "08:00", "12:00"],
      [3, "08:00", "12:00"],
    ],
  ],
];
for (const [pid, blocks] of PROVIDER_SLOT_BLOCKS) {
  for (const [dow, start, end] of blocks) {
    psid += 1;
    // Two slots demonstrate real multi-patient capacity (V16 plan): pslot_001 is
    // a fully-booked 4-sample morning block, pslot_004 a 6-sample block with room
    // left. Everything else keeps the original single-booking shape.
    const capacity = ({ 1: 4, 4: 6 } as Record<number, number>)[psid] ?? 1;
    const bookedCount = ({ 1: 4, 4: 3 } as Record<number, number>)[psid] ?? (psid === 3 ? 1 : 0);
    providerSlots.push({
      id: `pslot_${pad(psid, 3)}`,
      provider_id: pid,
      day_of_week: dow,
      specific_date: null,
      start_time: start,
      end_time: end,
      collection_method:
        pid === "prv_lab_lagosdiag" && (dow === 1 || dow === 3) ? "HOME" : "BRANCH",
      capacity,
      booked_count: bookedCount,
      taken: bookedCount >= capacity,
    });
  }
}
write("provider-schedule-slots.json", providerSlots);

// A Lab closure is separate from its recurring collection windows. It hides
// only new patient choices on that date; accepted collections remain intact.
const providerScheduleExceptions = [
  {
    id: "pse_001",
    provider_id: "prv_lab_lagosdiag",
    date: "2026-08-31",
    kind: "UNAVAILABLE",
    start_time: null,
    end_time: null,
    collection_method: null,
    note: "Public-holiday closure",
  },
];
write("provider-schedule-exceptions.json", providerScheduleExceptions);

console.log("fixtures part 5 done");

// ───────────────────────────────────────────────── payments ──

const paymentMethods = [
  {
    id: "pm_001",
    brand: "Verve",
    last4: "4412",
    expiry_month: 9,
    expiry_year: 2029,
    verified_at: ts({ days: -213 }),
  },
  {
    id: "pm_002",
    brand: "Mastercard",
    last4: "0087",
    expiry_month: 3,
    expiry_year: 2028,
    verified_at: ts({ days: -42 }),
  },
];
write("payment-methods.json", paymentMethods);

const BANK = {
  payout_bank_account_number: "0231889740",
  payout_bank_code: "058",
  payout_account_name: "Amara Okonkwo",
  payout_verified_at: ts({ days: -18 }),
  payout_ussd_string: null,
  payout_payment_link: null,
};
// One payout destination per expert, keyed by the expert it settles to. Only
// the demo account's own expert seat has set one up.
write("expert-payout-details.json", [
  {
    expert_id: "exp_adeyemi",
    ...BANK,
    updated_at: ts({ days: -18 }),
  },
]);

// One customer checkout holds the transparent total: the provider's stated price
// plus Monovella's capped service fee. The payout is a distinct, asynchronous
// transfer record — an accepted transfer request is not final settlement.
const checkoutPayments: Record<string, any>[] = [
  {
    id: "chk_001",
    consultation_id: "con_001",
    provider_request_id: null,
    provider_id: "exp_bello",
    provider_type: "SPECIALIST",
    total_amount_kobo: 780000,
    provider_amount_kobo: 650000,
    commission_amount_kobo: 130000,
    method: "CARD",
    status: "PAID",
    nomba_order_reference: "MV-CONSULT-001",
    paid_at: ts({ days: -23, hours: -2 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_002",
    consultation_id: "con_002",
    provider_request_id: null,
    provider_id: "exp_bassey",
    provider_type: "SPECIALIST",
    total_amount_kobo: 1320000,
    provider_amount_kobo: 1100000,
    commission_amount_kobo: 220000,
    method: "TRANSFER",
    status: "PAID",
    nomba_order_reference: "MV-CONSULT-002",
    paid_at: ts({ days: -7, hours: -3 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_003",
    consultation_id: "con_003",
    provider_request_id: null,
    provider_id: "exp_eze",
    provider_type: "SPECIALIST",
    total_amount_kobo: 1800000,
    provider_amount_kobo: 1500000,
    commission_amount_kobo: 300000,
    method: "CARD",
    status: "PAID",
    nomba_order_reference: "MV-CONSULT-003",
    paid_at: ts({ days: -2, hours: -4 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_004",
    consultation_id: "con_004",
    provider_request_id: null,
    provider_id: "exp_musa",
    provider_type: "SPECIALIST",
    total_amount_kobo: 2100000,
    provider_amount_kobo: 1800000,
    commission_amount_kobo: 300000,
    method: "TRANSFER",
    status: "PAID",
    nomba_order_reference: "MV-CONSULT-004",
    paid_at: ts({ days: -1, hours: -5 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_005",
    consultation_id: "con_005",
    provider_request_id: null,
    provider_id: "exp_ogunleye",
    provider_type: "SPECIALIST",
    total_amount_kobo: 2800000,
    provider_amount_kobo: 2500000,
    commission_amount_kobo: 300000,
    method: "CARD",
    status: "REFUNDED",
    nomba_order_reference: "MV-CONSULT-005",
    paid_at: ts({ days: -11, hours: -1 }),
    refunded_at: ts({ days: -11, minutes: -35 }),
    refund_method: "Card ending 4412",
  },
  {
    id: "chk_006",
    consultation_id: "con_006",
    provider_request_id: null,
    provider_id: "exp_bassey",
    provider_type: "SPECIALIST",
    total_amount_kobo: 1320000,
    provider_amount_kobo: 1100000,
    commission_amount_kobo: 220000,
    method: "CARD",
    status: "REFUND_FAILED",
    nomba_order_reference: "MV-CONSULT-006",
    paid_at: ts({ days: -13, hours: -3 }),
    refunded_at: ts({ days: -12, hours: 1 }),
    refund_method: null,
  },
  {
    id: "chk_008",
    consultation_id: "con_008",
    provider_request_id: null,
    provider_id: "exp_nwosu",
    provider_type: "SPECIALIST",
    total_amount_kobo: 960000,
    provider_amount_kobo: 800000,
    commission_amount_kobo: 160000,
    method: "CARD",
    status: "REFUND_PENDING",
    nomba_order_reference: "MV-CONSULT-008",
    paid_at: ts({ days: -1, hours: -2 }),
    refunded_at: ts({ hours: -2, minutes: -40 }),
    refund_method: null,
  },
  {
    id: "chk_009",
    consultation_id: "con_009",
    provider_request_id: null,
    provider_id: "exp_saliu",
    provider_type: "SPECIALIST",
    total_amount_kobo: 1680000,
    provider_amount_kobo: 1400000,
    commission_amount_kobo: 280000,
    method: "CARD",
    status: "PENDING",
    nomba_order_reference: "MV-CONSULT-009",
    paid_at: null,
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_010",
    consultation_id: "con_010",
    provider_request_id: null,
    provider_id: "exp_danjuma",
    provider_type: "SPECIALIST",
    total_amount_kobo: 1140000,
    provider_amount_kobo: 950000,
    commission_amount_kobo: 190000,
    method: "CARD",
    status: "PAID",
    nomba_order_reference: "MV-CONSULT-010",
    paid_at: ts({ days: -40, hours: -2 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_011g",
    consultation_id: "con_011",
    provider_request_id: null,
    provider_id: "exp_lawal",
    provider_type: "SPECIALIST",
    total_amount_kobo: 1080000,
    provider_amount_kobo: 900000,
    commission_amount_kobo: 180000,
    method: "CARD",
    status: "PAID",
    nomba_order_reference: "MV-GUEST-011",
    paid_at: ts({ days: -17, hours: 2 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_101",
    consultation_id: "con_107",
    provider_request_id: null,
    provider_id: "exp_adeyemi",
    provider_type: "SPECIALIST",
    total_amount_kobo: 1440000,
    provider_amount_kobo: 1200000,
    commission_amount_kobo: 240000,
    method: "TRANSFER",
    status: "PAID",
    nomba_order_reference: "MV-CONSULT-107",
    paid_at: ts({ days: -30, hours: 2 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_102",
    consultation_id: "con_108",
    provider_request_id: null,
    provider_id: "exp_adeyemi",
    provider_type: "SPECIALIST",
    total_amount_kobo: 1440000,
    provider_amount_kobo: 1200000,
    commission_amount_kobo: 240000,
    method: "CARD",
    status: "PAID",
    nomba_order_reference: "MV-CONSULT-108",
    paid_at: ts({ days: -17, hours: 3 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_104",
    consultation_id: "con_104",
    provider_request_id: null,
    provider_id: "exp_adeyemi",
    provider_type: "SPECIALIST",
    total_amount_kobo: 1440000,
    provider_amount_kobo: 1200000,
    commission_amount_kobo: 240000,
    method: "TRANSFER",
    status: "PAID",
    nomba_order_reference: "MV-CONSULT-104",
    paid_at: ts({ days: -2 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_105",
    consultation_id: "con_105",
    provider_request_id: null,
    provider_id: "exp_adeyemi",
    provider_type: "SPECIALIST",
    total_amount_kobo: 1440000,
    provider_amount_kobo: 1200000,
    commission_amount_kobo: 240000,
    method: "CARD",
    status: "PAID",
    nomba_order_reference: "MV-CONSULT-105",
    paid_at: ts({ days: -1 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_106",
    consultation_id: "con_106",
    provider_request_id: null,
    provider_id: "exp_adeyemi",
    provider_type: "SPECIALIST",
    total_amount_kobo: 1440000,
    provider_amount_kobo: 1200000,
    commission_amount_kobo: 240000,
    method: "CARD",
    status: "PAID",
    nomba_order_reference: "MV-CONSULT-106",
    paid_at: ts({ days: -3 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_109",
    consultation_id: "con_109",
    provider_request_id: null,
    provider_id: "exp_adeyemi",
    provider_type: "SPECIALIST",
    total_amount_kobo: 1440000,
    provider_amount_kobo: 1200000,
    commission_amount_kobo: 240000,
    method: "TRANSFER",
    status: "PAID",
    nomba_order_reference: "MV-CONSULT-109",
    paid_at: ts({ days: -9 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_110",
    consultation_id: "con_110",
    provider_request_id: null,
    provider_id: "exp_adeyemi",
    provider_type: "SPECIALIST",
    total_amount_kobo: 1440000,
    provider_amount_kobo: 1200000,
    commission_amount_kobo: 240000,
    method: "CARD",
    status: "REFUND_PENDING",
    nomba_order_reference: "MV-CONSULT-110",
    paid_at: ts({ days: -7, hours: -1 }),
    refunded_at: ts({ hours: -5 }),
    refund_method: null,
  },
  {
    id: "chk_012",
    consultation_id: "con_012",
    provider_request_id: null,
    provider_id: "exp_musa",
    provider_type: "SPECIALIST",
    total_amount_kobo: EXPERT_FEE.exp_musa + platformFee(EXPERT_FEE.exp_musa),
    provider_amount_kobo: EXPERT_FEE.exp_musa,
    commission_amount_kobo: platformFee(EXPERT_FEE.exp_musa),
    method: "CARD",
    status: "PAID",
    nomba_order_reference: "MV-CONSULT-012",
    paid_at: ts({ days: -2, hours: -5 }),
    refunded_at: null,
    refund_method: null,
  },
  // Advisory practice caseloads: each ACTIVE consultation needs its verified
  // checkout, same as any other. Fees come from the directory so the seat's own
  // payout arithmetic stays consistent.
  ...advisoryCases
    .filter(([, , , status]) => status === "ACTIVE")
    .map(([cid, eid]) => ({
      id: `chk_${cid.split("_")[1]}`,
      consultation_id: cid,
      provider_request_id: null,
      provider_id: eid,
      provider_type: "SPECIALIST",
      total_amount_kobo: EXPERT_FEE[eid] + platformFee(EXPERT_FEE[eid]),
      provider_amount_kobo: EXPERT_FEE[eid],
      commission_amount_kobo: platformFee(EXPERT_FEE[eid]),
      method: "CARD",
      status: "PAID",
      nomba_order_reference: `MV-CONSULT-${cid.split("_")[1]}`,
      paid_at: ts({ days: -1 }),
      refunded_at: null,
      refund_method: null,
    })),
  {
    id: "chk_201",
    consultation_id: "con_010",
    provider_request_id: "preq_103",
    provider_id: "prv_ph_greenlife",
    provider_type: "PHARMACY",
    total_amount_kobo: 384000,
    provider_amount_kobo: 320000,
    commission_amount_kobo: 64000,
    method: "TRANSFER",
    status: "PAID",
    nomba_order_reference: "MV-ORDER-103",
    paid_at: ts({ hours: -4 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_202",
    consultation_id: "con_001",
    provider_request_id: "preq_203",
    provider_id: "prv_lab_lagosdiag",
    provider_type: "LAB",
    total_amount_kobo: 1140000,
    provider_amount_kobo: 950000,
    commission_amount_kobo: 190000,
    method: "CARD",
    status: "PAID",
    nomba_order_reference: "MV-TEST-202",
    paid_at: ts({ days: -6 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_204",
    consultation_id: "con_109",
    provider_request_id: "preq_202",
    provider_id: "prv_lab_lagosdiag",
    provider_type: "LAB",
    total_amount_kobo: 1416000,
    provider_amount_kobo: 1180000,
    commission_amount_kobo: 236000,
    method: "TRANSFER",
    status: "PAID",
    nomba_order_reference: "MV-TEST-204",
    paid_at: ts({ days: -1, hours: -2 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_301",
    consultation_id: "con_002",
    provider_request_id: "preq_001",
    provider_id: "prv_ph_greenlife",
    provider_type: "PHARMACY",
    total_amount_kobo: 936000,
    provider_amount_kobo: 780000,
    commission_amount_kobo: 156000,
    method: "CARD",
    status: "PAID",
    nomba_order_reference: "MV-ORDER-301",
    paid_at: ts({ days: -5, hours: -2 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_302",
    consultation_id: "con_002",
    provider_request_id: "preq_002",
    provider_id: "prv_lab_lagosdiag",
    provider_type: "LAB",
    total_amount_kobo: 1740000,
    provider_amount_kobo: 1450000,
    commission_amount_kobo: 290000,
    method: "TRANSFER",
    status: "PAID",
    nomba_order_reference: "MV-TEST-302",
    paid_at: ts({ days: -5, hours: -1 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_304",
    consultation_id: "con_107",
    provider_request_id: "preq_104",
    provider_id: "prv_ph_greenlife",
    provider_type: "PHARMACY",
    total_amount_kobo: 648000,
    provider_amount_kobo: 540000,
    commission_amount_kobo: 108000,
    method: "CARD",
    status: "PAID",
    nomba_order_reference: "MV-ORDER-304",
    paid_at: ts({ days: -3 }),
    refunded_at: null,
    refund_method: null,
  },
  {
    id: "chk_305",
    consultation_id: "con_001",
    provider_request_id: "preq_105",
    provider_id: "prv_ph_greenlife",
    provider_type: "PHARMACY",
    total_amount_kobo: 504000,
    provider_amount_kobo: 420000,
    commission_amount_kobo: 84000,
    method: "TRANSFER",
    status: "PAID",
    nomba_order_reference: "MV-ORDER-305",
    paid_at: ts({ days: -8 }),
    refunded_at: null,
    refund_method: null,
  },
];
for (const request of providerRequests.filter((item) => fulfilmentExamples.has(item.id))) {
  const care = consultations.find((item) => item.id === request.consultation_id)!;
  const paymentId = `chk_${request.id}`;
  const fee = platformFee(request.amount_kobo);
  request.checkout_payment_id = paymentId;
  checkoutPayments.push({
    id: paymentId,
    consultation_id: care.id,
    provider_request_id: request.id,
    provider_id: request.provider_id,
    provider_type: request.provider_type,
    total_amount_kobo: request.amount_kobo + fee,
    provider_amount_kobo: request.amount_kobo,
    commission_amount_kobo: fee,
    method: "CARD",
    status: request.status === "UNABLE_TO_FULFIL" ? "REFUND_PENDING" : "PAID",
    nomba_order_reference: `MV-${paymentId}`,
    paid_at: request.responded_at,
    refunded_at: null,
    refund_method: null,
  });
  checkoutPayments.push({
    id: `chk_consult_${request.id}`,
    consultation_id: care.id,
    provider_request_id: null,
    provider_id: care.expert_id,
    provider_type: "SPECIALIST",
    total_amount_kobo: care.expert_fee_kobo + care.platform_fee_kobo,
    provider_amount_kobo: care.expert_fee_kobo,
    commission_amount_kobo: care.platform_fee_kobo,
    method: "CARD",
    status: "PAID",
    nomba_order_reference: `MV-CONSULT-${request.id}`,
    paid_at: care.requested_at,
    refunded_at: null,
    refund_method: null,
  });
}
write("provider-requests.json", providerRequests);

const consultationPatient: Record<string, string> = Object.fromEntries(
  consultations.map((item) => [item.id, item.patient_identity_id]),
);
for (const payment of checkoutPayments) {
  const patientId: string = consultationPatient[payment.consultation_id];
  payment.payer_role = payment.id.endsWith("g") ? "GUEST" : "PRIMARY";
  payment.patient_id = patientId;
  payment.payer_user_id =
    patientId === "pat_amara" || patientId === "pat_kelechi" || patientId === "pat_tobi"
      ? "acc_amara"
      : `acc_${removePrefix(patientId, "pat_")}`;
}
write("checkout-payments.json", checkoutPayments);

const providerPayouts = [
  {
    id: "po_001",
    checkout_payment_id: "chk_001",
    provider_id: "exp_bello",
    provider_type: "SPECIALIST",
    amount_kobo: 650000,
    status: "PAID",
    bank_account_last4: "9740",
    bank_code: "058",
    account_name: "Folake Adeyemi",
    transfer_reference: "NOM-TRF-220845",
    initiated_at: ts({ days: -23, hours: -2 }),
    completed_at: ts({ days: -23, hours: -2, minutes: 1 }),
    failure_reason: null,
  },
  {
    id: "po_011g",
    checkout_payment_id: "chk_011g",
    provider_id: "exp_lawal",
    provider_type: "SPECIALIST",
    amount_kobo: 900000,
    status: "PAID",
    bank_account_last4: "4471",
    bank_code: "057",
    account_name: "Fatima Lawal",
    transfer_reference: "NOM-TRF-118842",
    initiated_at: ts({ days: -17, hours: 2 }),
    completed_at: ts({ days: -17, hours: 2, minutes: 1 }),
    failure_reason: null,
  },
  {
    id: "po_101",
    checkout_payment_id: "chk_101",
    provider_id: "exp_adeyemi",
    provider_type: "SPECIALIST",
    amount_kobo: 1200000,
    status: "PAID",
    bank_account_last4: "9740",
    bank_code: "058",
    account_name: "Amara Okonkwo",
    transfer_reference: "NOM-TRF-774100",
    initiated_at: ts({ days: -30, hours: 2 }),
    completed_at: ts({ days: -30, hours: 2, minutes: 1 }),
    failure_reason: null,
  },
  {
    id: "po_102",
    checkout_payment_id: "chk_102",
    provider_id: "exp_adeyemi",
    provider_type: "SPECIALIST",
    amount_kobo: 1200000,
    status: "FAILED",
    bank_account_last4: "9740",
    bank_code: "058",
    account_name: "Amara Okonkwo",
    transfer_reference: "NOM-TRF-356981",
    initiated_at: ts({ days: -17, hours: 3 }),
    completed_at: null,
    failure_reason: "Receiving bank did not complete the transfer.",
  },
  {
    id: "po_201",
    checkout_payment_id: "chk_201",
    provider_id: "prv_ph_greenlife",
    provider_type: "PHARMACY",
    amount_kobo: 320000,
    status: "PAID",
    bank_account_last4: "6789",
    bank_code: "058",
    account_name: "GreenLife Pharmacy Ltd.",
    transfer_reference: "NOM-TRF-660214",
    initiated_at: ts({ hours: -4 }),
    completed_at: ts({ hours: -4, minutes: 1 }),
    failure_reason: null,
  },
  {
    id: "po_202",
    checkout_payment_id: "chk_202",
    provider_id: "prv_lab_lagosdiag",
    provider_type: "LAB",
    amount_kobo: 950000,
    status: "FAILED",
    bank_account_last4: "7766",
    bank_code: "058",
    account_name: "Lagos Diagnostics Ltd.",
    transfer_reference: "NOM-TRF-552048",
    initiated_at: ts({ days: -6 }),
    completed_at: null,
    failure_reason: "Receiving bank did not complete the transfer.",
  },
  {
    id: "po_204",
    checkout_payment_id: "chk_204",
    provider_id: "prv_lab_lagosdiag",
    provider_type: "LAB",
    amount_kobo: 1180000,
    status: "FAILED",
    bank_account_last4: "7766",
    bank_code: "058",
    account_name: "Lagos Diagnostics Ltd.",
    transfer_reference: "NOM-TRF-204118",
    initiated_at: ts({ days: -1, hours: -1 }),
    completed_at: null,
    failure_reason: "Receiving bank did not complete the transfer.",
  },
  {
    id: "po_305",
    checkout_payment_id: "chk_305",
    provider_id: "prv_ph_greenlife",
    provider_type: "PHARMACY",
    amount_kobo: 420000,
    status: "FAILED",
    bank_account_last4: "6789",
    bank_code: "058",
    account_name: "GreenLife Pharmacy Ltd.",
    transfer_reference: "NOM-TRF-305420",
    initiated_at: ts({ days: -8 }),
    completed_at: null,
    failure_reason: "Receiving bank rejected the account details.",
  },
];
write("provider-payouts.json", providerPayouts);

// Dedicated payout-support cases. These are intentionally not payment disputes:
// the patient checkout is already settled and the expert is tracking Monovella's transfer.
const payoutSupportRequests: Record<string, any>[] = [];
write("payout-support-requests.json", payoutSupportRequests);

const payoutHistory = [
  {
    id: "ph_001",
    expert_id: "exp_adeyemi",
    payout_bank_account_number: "0231889740",
    payout_bank_code: "058",
    payout_account_name: "Amara Okonkwo",
    payout_verified_at: ts({ days: -118 }),
    payout_ussd_string: null,
    payout_payment_link: null,
    changed_at: ts({ days: -118 }),
  },
  {
    id: "ph_002",
    expert_id: "exp_adeyemi",
    payout_bank_account_number: "0231889740",
    payout_bank_code: "058",
    payout_account_name: "Amara Okonkwo",
    payout_verified_at: ts({ days: -260 }),
    payout_ussd_string: null,
    payout_payment_link: null,
    changed_at: ts({ days: -260 }),
  },
  {
    id: "ph_003",
    expert_id: "exp_adeyemi",
    payout_bank_account_number: "3084112990",
    payout_bank_code: "011",
    payout_account_name: "Amara Okonkwo",
    payout_verified_at: ts({ days: -395 }),
    payout_ussd_string: null,
    payout_payment_link: null,
    changed_at: ts({ days: -395 }),
  },
];
write("expert-payout-history.json", payoutHistory);

const disputes = [
  {
    id: "dsp_002",
    raised_by: "PATIENT",
    raised_at: ts({ days: -2, hours: -3 }),
    decision_due_by: ts({ days: 3, hours: -3 }),
    decision: null,
    decision_final: false,
    consultation_id: "con_006",
    provider_request_id: null,
    provider_type: "SPECIALIST",
    decision_favors: null,
  },
  {
    id: "dsp_003",
    raised_by: "PHARMACY",
    raised_at: ts({ days: -6, hours: 1 }),
    decision_due_by: ts({ hours: -4 }),
    decision: null,
    decision_final: false,
    consultation_id: "con_001",
    provider_request_id: "preq_105",
    provider_type: "PHARMACY",
    decision_favors: null,
  },
  {
    id: "dsp_004",
    raised_by: "LAB",
    raised_at: ts({ days: -1, hours: -6 }),
    decision_due_by: ts({ days: 4 }),
    decision: null,
    decision_final: false,
    consultation_id: "con_109",
    provider_request_id: "preq_202",
    provider_type: "LAB",
    decision_favors: null,
  },
  {
    id: "dsp_005",
    raised_by: "PATIENT",
    raised_at: ts({ days: -24 }),
    decision_due_by: ts({ days: -19 }),
    decision:
      "The checkout was reversed after the provider declined the booking. The full total " +
      "returned to the original card, so no further action is required.",
    decision_final: true,
    consultation_id: "con_005",
    provider_request_id: null,
    provider_type: "SPECIALIST",
    decision_favors: "PATIENT",
  },
];
write("payment-disputes.json", disputes);

const refundRequests = [
  {
    id: "rfd_001",
    consultation_id: "con_006",
    checkout_payment_id: "chk_006",
    patient_id: "pat_amara",
    reason: "NON_PERFORMANCE",
    filed_at: ts({ days: -12, hours: 1 }),
    decision_due_by: ts({ days: -10, hours: 1 }),
    decided_at: ts({ days: -11 }),
    decision:
      "The expert did not respond within the acceptance window. The full checkout " +
      "total is refunded to the original payment method.",
    decision_final: true,
    refund_issued: true,
    elaboration: "Booked Tuesday, never heard back, had to book someone else.",
  },
  {
    id: "rfd_002",
    consultation_id: "con_005",
    checkout_payment_id: "chk_005",
    patient_id: "pat_amara",
    reason: "NON_PERFORMANCE",
    filed_at: ts({ days: -10, hours: 3 }),
    decision_due_by: ts({ days: -8, hours: 3 }),
    decided_at: ts({ days: -9, hours: 2 }),
    decision:
      "Booking declined by the expert. Full checkout refund already issued " +
      "automatically on 18 August; nothing further is owed.",
    decision_final: true,
    refund_issued: true,
    elaboration: null,
  },
  {
    id: "rfd_003",
    consultation_id: "con_108",
    checkout_payment_id: "chk_102",
    patient_id: "pat_sade",
    reason: "NON_PERFORMANCE",
    filed_at: ts({ days: -3, hours: 2 }),
    decision_due_by: ts({ days: -1, hours: 2 }),
    decided_at: null,
    decision: null,
    decision_final: false,
    refund_issued: null,
    elaboration: "The appointment time came and went with no message.",
  },
  {
    id: "rfd_004",
    consultation_id: "con_110",
    checkout_payment_id: "chk_110",
    patient_id: "pat_emeka",
    reason: "NON_PERFORMANCE",
    filed_at: ts({ hours: -6 }),
    decision_due_by: ts({ days: 2, hours: -6 }),
    decided_at: null,
    decision: null,
    decision_final: false,
    refund_issued: null,
    elaboration: null,
  },
];
write("refund-requests.json", refundRequests);

// Clinical complaints are safety referrals, never refund or payment records.
const clinicalComplaintReferrals = [
  {
    id: "ccr_001",
    consultation_id: "con_108",
    patient_id: "pat_sade",
    filed_by_user_id: "acc_sade",
    details: "I am concerned that my symptoms were not addressed before the consultation ended.",
    status: "OPEN",
    triage: "UNASSESSED",
    filed_at: ts({ days: -3 }),
    expected_response_by: ts({ days: -1 }),
    assigned_staff_id: null,
    reviewed_at: null,
    resolved_at: null,
    outcome: null,
    attachment_name: null,
    escalated_at: null,
    audit_history: [{ at: ts({ days: -3 }), actor_type: "PATIENT", action: "FILED", note: null }],
    patient_updates: [
      { at: ts({ days: -3 }), message: "Your concern was received for clinical-safety review." },
    ],
    overdue: true,
    due_soon: false,
  },
];
write("clinical-complaint-referrals.json", clinicalComplaintReferrals);

// ──────────────────────────────────────────────────── reports ──

const reports = [
  {
    id: "rep_001",
    patient_id: "pat_amara",
    scope: "CONSULTATION",
    status: "READY",
    consultation_id: "con_002",
    start_date: null,
    end_date: null,
    requested_at: ts({ days: -5, hours: 1 }),
    ready_at: ts({ days: -5, hours: 1, minutes: 2 }),
    pdf_url: "/reports/rep_001.pdf",
    verification_code: "MV-RPT-4K7Q-2XN8",
    revoked_at: null,
  },
  {
    id: "rep_002",
    patient_id: "pat_amara",
    scope: "FULL_HISTORY",
    status: "READY",
    consultation_id: null,
    start_date: null,
    end_date: null,
    requested_at: ts({ days: -31 }),
    ready_at: ts({ days: -31, minutes: 4 }),
    pdf_url: "/reports/rep_002.pdf",
    verification_code: "MV-RPT-9B2L-5TZ1",
    revoked_at: null,
  },
  {
    id: "rep_003",
    patient_id: "pat_amara",
    scope: "DATE_RANGE",
    status: "REVOKED",
    consultation_id: null,
    start_date: dateStr({ days: -120 }),
    end_date: dateStr({ days: -30 }),
    requested_at: ts({ days: -28 }),
    ready_at: ts({ days: -28, minutes: 3 }),
    pdf_url: "/reports/rep_003.pdf",
    verification_code: "MV-RPT-1C8H-7WD3",
    revoked_at: ts({ days: -14 }),
  },
  {
    id: "rep_004",
    patient_id: "pat_amara",
    scope: "CONSULTATION",
    status: "GENERATING",
    consultation_id: "con_001",
    start_date: null,
    end_date: null,
    requested_at: ts({ minutes: -2 }),
    ready_at: null,
    pdf_url: null,
    verification_code: null,
    revoked_at: null,
  },
  {
    id: "rep_kelechi_001",
    patient_id: "pat_kelechi",
    scope: "FULL_HISTORY",
    status: "READY",
    consultation_id: null,
    start_date: null,
    end_date: null,
    requested_at: ts({ days: -9 }),
    ready_at: ts({ days: -9, minutes: 3 }),
    pdf_url: "/reports/rep_kelechi_001.pdf",
    verification_code: "MV-RPT-6H4K-8QD2",
    revoked_at: null,
  },
  {
    id: "rep_tobi_001",
    patient_id: "pat_tobi",
    scope: "CONSULTATION",
    status: "READY",
    consultation_id: "con_010",
    start_date: null,
    end_date: null,
    requested_at: ts({ days: -38 }),
    ready_at: ts({ days: -38, minutes: 2 }),
    pdf_url: "/reports/rep_tobi_001.pdf",
    verification_code: "MV-RPT-3T7B-5CN9",
    revoked_at: null,
  },
];
write("reports.json", reports);

// DeviceSessionRead (what P.. "where I'm signed in" renders) is only
// id/is_current/created_at/last_seen_at — a session's owner, hashed token,
// expiry and revocation are never returned to a client, per PRODUCT_ARCH_V0.md
// §5 ("each session is a row - account, hashed refresh token, revokedAt").
// They are still real columns the seed carries, each fixture placeholder
// rather than an actual secret since no real device ever created these.
const deviceSessions = [
  {
    id: "dev_001",
    user_id: "acc_amara",
    is_current: true,
    token_hash: "sha256:9f3a1c2e7b5d4098a1c6f2e8b7d3a0459c1e7f2b6a4d8c0e3f1b5a7d9c2e4f68",
    ip_address: "105.112.24.9",
    user_agent: "Monovella/1.0 (Expo; iOS 18.4; iPhone14,5)",
    created_at: ts({ days: -58 }),
    expires_at: ts({ days: 32 }),
    last_seen_at: ts({ minutes: -1 }),
    revoked_at: null,
  },
  {
    id: "dev_002",
    user_id: "acc_amara",
    is_current: false,
    token_hash: "sha256:2b6d9a4f1e8c3057b2d5a9f4e1c8b6073a5d9f2e4c1b8a6d3f0e7c5b9a2d4f16",
    ip_address: "197.211.63.140",
    user_agent: "Monovella/1.0 (Expo; Android 14; SM-A546E)",
    created_at: ts({ days: -201 }),
    expires_at: ts({ days: -111 }),
    last_seen_at: ts({ days: -33 }),
    revoked_at: ts({ days: -33 }),
  },
  {
    id: "dev_003",
    user_id: "acc_amara",
    is_current: false,
    token_hash: "sha256:7c1e5b8a3f9d0264c7b1a5e9f3d0c8462b7a1e5c9f3b0d6a4c8e2b5f9a1d3c70",
    ip_address: "154.113.8.201",
    user_agent: "Monovella/1.0 (Expo; iOS 17.6; iPhone13,2)",
    // Never revoked — this one lapsed on its own 90-day rotation, the other
    // real way a DeviceSession ends besides an explicit sign-out.
    created_at: ts({ days: -95 }),
    expires_at: ts({ days: -5 }),
    last_seen_at: ts({ days: -12 }),
    revoked_at: null,
  },
];
write("device-sessions.json", deviceSessions);

// One referral code per patient, keyed by the patient who owns it.
write("referral-code.json", [
  {
    patient_id: "pat_amara",
    referral_code: "AMARA-7QK2",
    referral_link: "https://monovella.com/join/AMARA-7QK2",
    converted_count: 4,
  },
]);

console.log("fixtures part 6 done");

// ───────────────────────────────────────────── back office ──

const applications = [
  {
    id: "app_001",
    provider_type: "SPECIALIST",
    name: "Dr. Ifeoma Nwachukwu",
    verification_status: "PENDING",
    review_due_by: ts({ days: -2 }),
    overdue: true,
    due_soon: false,
    submitted_at: ts({ days: -9 }),
  },
  {
    id: "app_002",
    provider_type: "PHARMACY",
    name: "Sunrise Pharmacy Ltd",
    verification_status: "PENDING",
    review_due_by: ts({ hours: 6 }),
    overdue: false,
    due_soon: true,
    submitted_at: ts({ days: -5 }),
  },
  {
    id: "app_003",
    provider_type: "LAB",
    name: "Precision Medical Laboratory",
    verification_status: "PENDING",
    review_due_by: ts({ days: 1 }),
    overdue: false,
    due_soon: true,
    submitted_at: ts({ days: -4 }),
  },
  {
    id: "app_004",
    provider_type: "SPECIALIST",
    name: "Dr. Musa Abdulkarim",
    verification_status: "PENDING",
    review_due_by: ts({ days: -1, hours: 3 }),
    overdue: true,
    due_soon: false,
    submitted_at: ts({ days: -8 }),
  },
  {
    id: "app_005",
    provider_type: "SPECIALIST",
    name: "Grace Okoro",
    verification_status: "PENDING",
    review_due_by: ts({ days: 3 }),
    overdue: false,
    due_soon: false,
    submitted_at: ts({ days: -2 }),
  },
  {
    id: "app_006",
    provider_type: "PHARMACY",
    name: "Fountain Chemists",
    verification_status: "PENDING",
    review_due_by: ts({ days: 4 }),
    overdue: false,
    due_soon: false,
    submitted_at: ts({ days: -1 }),
  },
  {
    id: "app_007",
    provider_type: "LAB",
    name: "BioTrust Diagnostics",
    verification_status: "APPROVED",
    review_due_by: ts({ days: -16 }),
    overdue: false,
    due_soon: false,
    submitted_at: ts({ days: -21 }),
  },
  {
    id: "app_008",
    provider_type: "SPECIALIST",
    name: "Dr. Peter Aluko",
    verification_status: "REJECTED",
    review_due_by: ts({ days: -27 }),
    overdue: false,
    due_soon: false,
    submitted_at: ts({ days: -32 }),
  },
  {
    id: "app_009",
    provider_type: "SPECIALIST",
    name: "Dr. Tunde Ogunleye",
    verification_status: "PENDING",
    request_kind: "RENEWAL",
    review_due_by: ts({ days: 2 }),
    overdue: false,
    due_soon: false,
    submitted_at: ts({ days: -3 }),
  },
];
write("applications-queue.json", applications);

const applicationDetails: Record<string, any>[] = [
  {
    id: "app_001",
    provider_type: "SPECIALIST",
    status: "PENDING",
    business_name: null,
    cac_number: null,
    cac_verified_at: null,
    license_number: "MDCN/2015/108420",
    license_document_url: "/documents/indemnity-nwachukwu.pdf",
    license_document_flagged: false,
    license_verified_at: null,
    license_verification_note: null,
    premises_address: null,
    prior_rejection_reason: null,
    contact_person: "Dr. Ifeoma Nwachukwu",
    submitted_at: ts({ days: -9 }),
    expert: {
      first_name: "Ifeoma",
      last_name: "Nwachukwu",
      professional_type: "DOCTOR",
      specialty: "PEDIATRICS",
      gender: "FEMALE",
      consultation_fee_kobo: 1100000,
      email: "ifeoma.nwachukwu@example.ng",
      years_practising: 12,
    },
  },
  {
    id: "app_002",
    provider_type: "PHARMACY",
    status: "PENDING",
    business_name: "Sunrise Pharmacy Ltd",
    cac_number: "RC-2884190",
    cac_verified_at: ts({ days: -5, minutes: 3 }),
    license_number: "PCN/PRM/LA/2021/04417",
    license_document_url: "/documents/pcn-sunrise.pdf",
    license_document_flagged: false,
    license_verified_at: null,
    license_verification_note: null,
    premises_address: "56 Bode Thomas Street, Surulere, Lagos",
    prior_rejection_reason: null,
    contact_person: "Pharm. Adaeze Ilo",
    submitted_at: ts({ days: -5 }),
  },
  {
    id: "app_003",
    provider_type: "LAB",
    status: "PENDING",
    business_name: "Precision Medical Laboratory",
    cac_number: "RC-3110975",
    cac_verified_at: null,
    license_number: "MLSCN/LAB/2020/1188",
    license_document_url: "/documents/mlscn-precision.pdf",
    license_document_flagged: true,
    license_verified_at: null,
    license_verification_note: null,
    premises_address: "9 Isaac John Street, Ikeja GRA, Lagos",
    prior_rejection_reason: null,
    contact_person: "Mr. Sola Adegoke",
    submitted_at: ts({ days: -4 }),
    services_offered: ["Chemistry", "Haematology", "Serology"],
  },
  {
    id: "app_004",
    provider_type: "SPECIALIST",
    status: "PENDING",
    business_name: null,
    cac_number: null,
    cac_verified_at: null,
    license_number: "MDCN/2017/121055",
    license_document_url: "/documents/indemnity-abdulkarim.pdf",
    license_document_flagged: true,
    license_verified_at: null,
    license_verification_note: null,
    premises_address: null,
    prior_rejection_reason: null,
    contact_person: "Dr. Musa Abdulkarim",
    submitted_at: ts({ days: -8 }),
    expert: {
      first_name: "Musa",
      last_name: "Abdulkarim",
      professional_type: "DOCTOR",
      specialty: "UROLOGY",
      gender: "MALE",
      consultation_fee_kobo: 1900000,
      email: "m.abdulkarim@example.ng",
      years_practising: 9,
    },
  },
  {
    id: "app_005",
    provider_type: "SPECIALIST",
    status: "PENDING",
    business_name: null,
    cac_number: null,
    cac_verified_at: null,
    license_number: "MRTB/PT/2019/3041",
    license_document_url: "/documents/indemnity-okoro.pdf",
    license_document_flagged: false,
    license_verified_at: null,
    license_verification_note: null,
    premises_address: null,
    prior_rejection_reason:
      "Indemnity certificate had expired at submission. " +
      "Reapply with cover valid for the current year.",
    contact_person: "Grace Okoro",
    submitted_at: ts({ days: -2 }),
    expert: {
      first_name: "Grace",
      last_name: "Okoro",
      professional_type: "PHYSIOTHERAPIST",
      specialty: "PHYSIOTHERAPY",
      gender: "FEMALE",
      consultation_fee_kobo: 700000,
      email: "grace.okoro@example.ng",
      years_practising: 6,
    },
  },
  {
    id: "app_006",
    provider_type: "PHARMACY",
    status: "PENDING",
    business_name: "Fountain Chemists",
    cac_number: "RC-1907442",
    cac_verified_at: ts({ days: -1, minutes: 2 }),
    license_number: "PCN/PRM/OY/2019/02210",
    license_document_url: "/documents/pcn-fountain.pdf",
    license_document_flagged: false,
    license_verified_at: null,
    license_verification_note: null,
    premises_address: "Ring Road, Ibadan, Oyo State",
    prior_rejection_reason: null,
    contact_person: "Pharm. Kunle Bamidele",
    submitted_at: ts({ days: -1 }),
  },
  {
    id: "app_007",
    provider_type: "LAB",
    status: "APPROVED",
    business_name: "BioTrust Diagnostics",
    cac_number: "RC-2211048",
    cac_verified_at: ts({ days: -21, minutes: 4 }),
    license_number: "MLSCN/LAB/2018/0904",
    license_document_url: "/documents/mlscn-biotrust.pdf",
    license_document_flagged: false,
    license_verified_at: ts({ days: -17 }),
    license_verification_note:
      "Checked MLSCN/LAB/2018/0904 against the MLSCN register " +
      "on 12 August. Listed, active, premises match.",
    premises_address: "Trans-Amadi, Port Harcourt, Rivers State",
    prior_rejection_reason: null,
    contact_person: "Dr. Ann Briggs",
    submitted_at: ts({ days: -21 }),
    services_offered: ["Chemistry", "Microbiology"],
  },
  {
    id: "app_008",
    provider_type: "SPECIALIST",
    status: "REJECTED",
    business_name: null,
    cac_number: null,
    cac_verified_at: null,
    license_number: "MDCN/2020/1409XX",
    license_document_url: "/documents/indemnity-aluko.pdf",
    license_document_flagged: true,
    license_verified_at: null,
    license_verification_note:
      "Licence number does not appear on the MDCN register. " + "Checked twice on 30 July.",
    premises_address: null,
    prior_rejection_reason:
      "The licence number supplied does not appear on the MDCN " +
      "register, and the indemnity certificate names a different " +
      "practitioner. If this is an error, reapply with the " +
      "certificate that matches your own registration.",
    contact_person: "Dr. Peter Aluko",
    submitted_at: ts({ days: -32 }),
    expert: {
      first_name: "Peter",
      last_name: "Aluko",
      professional_type: "DOCTOR",
      specialty: "GENERAL_PRACTICE",
      gender: "MALE",
      consultation_fee_kobo: 800000,
      email: "p.aluko@example.ng",
      years_practising: 4,
    },
  },
  {
    id: "app_009",
    provider_type: "SPECIALIST",
    status: "PENDING",
    request_kind: "RENEWAL",
    business_name: null,
    cac_number: null,
    cac_verified_at: null,
    license_number: "MDCN/2006/054129",
    license_expiry_date: "2027-02-01",
    prior_license_expiry_date: "2026-08-27",
    license_document_url: "/documents/indemnity-ogunleye-2027.pdf",
    license_document_flagged: false,
    license_verified_at: null,
    license_verification_note: null,
    premises_address: null,
    prior_rejection_reason: null,
    contact_person: "Dr. Tunde Ogunleye",
    submitted_at: ts({ days: -3 }),
    expert: {
      first_name: "Tunde",
      last_name: "Ogunleye",
      professional_type: "DOCTOR",
      specialty: "CARDIOLOGY",
      gender: "MALE",
      consultation_fee_kobo: 2500000,
      email: "t.ogunleye@example.ng",
      years_practising: 19,
    },
  },
];
// Simulated history for the two reviewable demo businesses, not real approvals.
const demoProviderApplications = ["prv_ph_greenlife", "prv_lab_lagosdiag"].map((providerId) => {
  const provider = providers.find((item) => item.id === providerId)!;
  const credential = providerCredentials.find(
    (item) => item.provider_id === providerId && item.credential_type === "OPERATING_LICENCE",
  )!;
  return { provider, credential, id: `app_history_${providerId}` };
});
for (const { provider, credential, id } of demoProviderApplications) {
  applicationDetails.push({
    id,
    provider_type: provider.provider_type,
    status: "APPROVED",
    request_kind: "INITIAL",
    business_name: provider.business_name,
    cac_number: provider.cac_number,
    cac_verified_at: ts({ days: -7 }),
    license_number: credential.reference_number,
    license_expiry_date: credential.expires_at,
    prior_license_expiry_date: null,
    license_document_url: credential.document_filename,
    license_document_flagged: false,
    license_verified_at: credential.verified_at,
    license_verification_note: "Simulated approved application for prototype review.",
    premises_address: provider.premises_address,
    city: provider.city,
    local_government_area: provider.local_government_area,
    state: provider.state,
    prior_rejection_reason: null,
    contact_person: provider.contact_name,
    submitted_at: ts({ days: -8 }),
    services_offered: provider.services_offered,
  });
}
write("application-details.json", applicationDetails);

const disputeQueue = [
  {
    id: "dsp_003",
    raised_by: "PHARMACY",
    provider_type: "PHARMACY",
    decision_due_by: ts({ hours: -4 }),
    overdue: true,
    due_soon: false,
    amount_kobo: 504000,
    raised_at: ts({ days: -6, hours: 1 }),
    subject: "GreenLife Pharmacy vs. Amara Okonkwo",
  },
  {
    id: "dsp_002",
    raised_by: "PATIENT",
    provider_type: "SPECIALIST",
    decision_due_by: ts({ days: 3, hours: -3 }),
    overdue: false,
    due_soon: false,
    amount_kobo: 1320000,
    raised_at: ts({ days: -2, hours: -3 }),
    subject: "Amara Okonkwo vs. Dr. Emem Bassey",
  },
  {
    id: "dsp_004",
    raised_by: "LAB",
    provider_type: "LAB",
    decision_due_by: ts({ days: 4 }),
    overdue: false,
    due_soon: false,
    amount_kobo: 1416000,
    raised_at: ts({ days: -1, hours: -6 }),
    subject: "Lagos Diagnostics vs. Dele Faronbi",
  },
];
write("dispute-queue.json", disputeQueue);

const refundQueue = [
  {
    id: "rfd_003",
    patient_id: "pat_sade",
    reason: "NON_PERFORMANCE",
    filed_at: ts({ days: -3, hours: 2 }),
    overdue: true,
    due_soon: false,
    consultation_id: "con_108",
    checkout_payment_id: "chk_102",
    amount_kobo: 240000,
  },
  {
    id: "rfd_004",
    patient_id: "pat_emeka",
    reason: "NON_PERFORMANCE",
    filed_at: ts({ hours: -6 }),
    overdue: false,
    due_soon: true,
    consultation_id: "con_110",
    checkout_payment_id: "chk_110",
    amount_kobo: 240000,
  },
];
write("refund-queue.json", refundQueue);

const standingQueue = [
  {
    id: "std_001",
    actor_type: "EXPERT",
    standing_suspended_at: ts({ days: -2, hours: 3 }),
    events: ["DECLINED_BOOKING", "DECLINED_BOOKING", "NON_PERFORMANCE"],
    overdue: false,
    due_soon: false,
    name: "Dr. Emem Bassey",
    event_log: [
      {
        type: "DECLINED_BOOKING",
        occurred_at: ts({ days: -19 }),
        detail: "Booking for 12 August declined 4 minutes before the response deadline.",
      },
      {
        type: "DECLINED_BOOKING",
        occurred_at: ts({ days: -14 }),
        detail: "Booking for 17 August declined.",
      },
      {
        type: "NON_PERFORMANCE",
        occurred_at: ts({ days: -13, hours: -2 }),
        detail: "Booking for 17 August timed out with no response. Patient refunded.",
      },
    ],
  },
  {
    id: "std_002",
    actor_type: "PHARMACY",
    standing_suspended_at: ts({ days: -5, hours: 1 }),
    events: ["FALSE_PAYMENT_CLAIM"],
    overdue: false,
    due_soon: true,
    name: "Alpha Chemists",
    event_log: [
      {
        type: "FALSE_PAYMENT_CLAIM",
        occurred_at: ts({ days: -5, hours: 1 }),
        detail:
          "Confirmed receipt of a payment the patient's bank has no record of. " +
          "Reversed after review of both statements.",
      },
    ],
  },
  {
    id: "std_003",
    actor_type: "PATIENT",
    standing_suspended_at: ts({ days: -1, hours: -4 }),
    events: ["FALSE_PAYMENT_CLAIM", "UNMERITED_DISPUTE"],
    overdue: false,
    due_soon: false,
    name: "Dele Faronbi",
    event_log: [
      {
        type: "FALSE_PAYMENT_CLAIM",
        occurred_at: ts({ days: -8, hours: 4 }),
        detail:
          "Reported a checkout payment as complete when the payment record did not " + "match.",
      },
      {
        type: "UNMERITED_DISPUTE",
        occurred_at: ts({ days: -1, hours: -4 }),
        detail: "Disputed the same fee again after the first decision went against " + "the claim.",
      },
    ],
  },
  {
    id: "std_004",
    actor_type: "LAB",
    standing_suspended_at: ts({ days: -9 }),
    events: ["NON_PERFORMANCE", "NON_PERFORMANCE"],
    overdue: true,
    due_soon: false,
    name: "Clinix Laboratory",
    event_log: [
      {
        type: "NON_PERFORMANCE",
        occurred_at: ts({ days: -16 }),
        detail:
          "Accepted a test request and never uploaded the result. Patient " +
          "collected a physical copy instead.",
      },
      {
        type: "NON_PERFORMANCE",
        occurred_at: ts({ days: -9 }),
        detail: "Second accepted request with no result after 9 days.",
      },
    ],
  },
  {
    id: "std_005",
    actor_type: "EXPERT",
    standing_suspended_at: ts({ days: -3 }),
    events: ["CREDENTIAL_EXPIRED"],
    overdue: false,
    due_soon: false,
    name: "Dr. Tunde Ogunleye",
    linked_application_id: "app_009",
    event_log: [
      {
        type: "CREDENTIAL_EXPIRED",
        occurred_at: ts({ days: -3 }),
        detail:
          "MDCN licence MDCN/2006/054129 expired on the credential_expiry_sweep " +
          "run 3 days ago. A renewal (app_009) is now pending review. Approving " +
          "it lifts this standing automatically.",
      },
    ],
  },
];
write("standing-queue.json", standingQueue);

const staffAccounts: Record<string, any>[] = [
  {
    id: "stf_001",
    name: "Abdulazeez Ojimoh",
    email: "abdulazeez@monovella.com",
    phone: "+234 803 000 1010",
    role: "PLATFORM_ADMIN",
    revoked_at: null,
    must_change_password: false,
    failed_login_attempts: 0,
    locked_until: null,
  },
  {
    id: "stf_002",
    name: "Chidera Obi",
    email: "chidera@monovella.com",
    phone: "+234 803 000 1011",
    role: "PLATFORM_ADMIN",
    revoked_at: null,
    must_change_password: false,
    failed_login_attempts: 0,
    locked_until: null,
  },
  {
    id: "stf_003",
    name: "Halima Yakubu",
    email: "halima@monovella.com",
    phone: "+234 803 000 1012",
    role: "PLATFORM_ADMIN",
    revoked_at: null,
    must_change_password: true,
    // Two wrong passwords short of §5's 15-minute lockout at 5 — a demo row for
    // the escalating-lockout counter, not a real incident.
    failed_login_attempts: 2,
    locked_until: null,
  },
  {
    id: "stf_004",
    name: "Tolu Ajayi",
    email: "tolu@monovella.com",
    phone: "+234 803 000 1013",
    role: "PLATFORM_ADMIN",
    revoked_at: ts({ days: -46 }),
    must_change_password: false,
    failed_login_attempts: 0,
    locked_until: null,
  },
];
for (const s of staffAccounts) {
  s.photo_url = null; // Nobody's uploaded one yet (B23) — the honest default.
  // Server-only, per §5's email/password StaffSession mechanism. StaffAccountRead
  // never returns it; this is a placeholder shape, not a real password's hash.
  s.password_hash = `argon2id$v=19$m=19456,t=2,p=1$ZGVtby1zYWx0$${s.id}-demo-hash`;
}
write("staff-accounts.json", staffAccounts);

// Governance is five tables, not one document. Every case that can be worked
// has a reviewer and a revision counter from the start, so a decision never has
// to invent the revision it is racing against.
const governanceSubjects = [...applications, ...disputeQueue, ...standingQueue].map(
  (item) => item.id,
);

write("governance-applications.json", [
  ...demoProviderApplications.map(({ provider, credential, id }) => ({
    application_id: id,
    application_kind: "INITIAL",
    actor_id: provider.id,
    target_credential_id: credential.id,
    submitted_credential_id: null,
    licence_number: credential.reference_number,
    expiry_date: credential.expires_at,
    revision: 1,
    assigned_staff_id: "stf_001",
  })),
  {
    application_id: "app_009",
    application_kind: "LICENCE_RENEWAL",
    actor_id: "exp_ogunleye",
    target_credential_id: "exp_ogunleye_cred_1",
    submitted_credential_id: null,
    licence_number: "MDCN/2006/054129",
    expiry_date: "2027-02-01",
    revision: 1,
    assigned_staff_id: "stf_001",
  },
]);

write("governance-audit.json", [
  {
    id: "gov_1",
    subject_type: "APPLICATION",
    subject_id: "app_009",
    action: "SUBMITTED",
    actor_id: "exp_ogunleye",
    occurred_at: ts({ days: -3 }),
    note: "LICENCE_RENEWAL",
  },
]);

write(
  "governance-access.json",
  [
    ["exp_adeyemi", "ACTIVE"],
    ["exp_ogunleye", "RESTRICTED"],
    ["prv_ph_greenlife", "ACTIVE"],
    ["prv_lab_lagosdiag", "ACTIVE"],
    ["stf_001", "ACTIVE"],
    ["stf_002", "ACTIVE"],
    ["stf_003", "PENDING"],
    ["stf_004", "RESTRICTED"],
  ].map(([actor_id, status]) => ({ actor_id, status })),
);

write(
  "governance-revisions.json",
  governanceSubjects.map((subject_id) => ({ subject_id, revision: 1 })),
);

write(
  "governance-assignments.json",
  governanceSubjects.map((subject_id) => ({ subject_id, staff_id: "stf_001" })),
);

// No console-home fixture: B1's queue totals are counted from the queues
// themselves, both here and in the backend that will serve ConsoleHomeRead. A
// stored total is one that can disagree with the queue it describes, and this
// one already had (it claimed 7 applications against a queue of 9).

// ──────────────────────────────────────────── reference data ──

const SPECIALTY_LABELS: [string, string, string][] = [
  ["GENERAL_PRACTICE", "General Practice", "Anything unclear, first"],
  ["DERMATOLOGY", "Dermatology", "Skin, hair and nails"],
  ["PHYSIOTHERAPY", "Physiotherapy", "Movement, pain and rehabilitation"],
  ["PEDIATRICS", "Paediatrics", "Children, newborn to sixteen"],
  ["OBSTETRICS_GYNECOLOGY", "Obstetrics & Gynaecology", "Pregnancy and reproductive health"],
  ["CARDIOLOGY", "Cardiology", "Heart and blood pressure"],
  ["ENDOCRINOLOGY", "Endocrinology", "Hormones, diabetes and thyroid"],
  ["GASTROENTEROLOGY", "Gastroenterology", "Stomach, gut and liver"],
  ["NEUROLOGY", "Neurology", "Brain, nerves and headaches"],
  ["PSYCHIATRY", "Psychiatry", "Mental health"],
  ["ORTHOPEDICS", "Orthopaedics", "Bones and joints"],
  ["OTORHINOLARYNGOLOGY", "Ear, Nose & Throat", "Hearing, sinuses and throat"],
  ["OPHTHALMOLOGY", "Ophthalmology", "Eyes and vision"],
  ["UROLOGY", "Urology", "Kidneys, bladder and urinary tract"],
  ["NEPHROLOGY", "Nephrology", "Kidney disease"],
  ["PULMONOLOGY", "Pulmonology", "Lungs and breathing"],
  ["INFECTIOUS_DISEASE", "Infectious Disease", "Infections and fevers"],
  ["GENERAL_SURGERY", "General Surgery", "Surgical assessment"],
  [
    "CHRONIC_DISEASE_MONITORING",
    "Chronic Disease Monitoring",
    "Diabetes, hypertension and asthma check-ins",
  ],
  ["WOUND_CARE_GUIDANCE", "Wound Care Guidance", "Dressing changes and healing checks"],
  [
    "MATERNAL_CHILD_HEALTH",
    "Maternal & Child Health",
    "Antenatal, postnatal and infant care advice",
  ],
  ["POST_OP_FOLLOW_UP", "Post-Op Follow-Up", "Recovery checks after a procedure"],
  [
    "MEDICATION_THERAPY_MANAGEMENT",
    "Medication Therapy Management",
    "Interactions, dosing and adherence review",
  ],
  [
    "OTC_WELLNESS_COUNSELING",
    "OTC & Wellness Counselling",
    "Over-the-counter choices and general wellness",
  ],
  [
    "RESULT_INTERPRETATION_REFERRAL",
    "Result Interpretation & Referral Advice",
    "Making sense of a lab result and what to do next",
  ],
];

const BANKS: [string, string][] = [
  ["044", "Access Bank"],
  ["023", "Citibank Nigeria"],
  ["050", "Ecobank Nigeria"],
  ["084", "Enterprise Bank"],
  ["070", "Fidelity Bank"],
  ["011", "First Bank of Nigeria"],
  ["214", "First City Monument Bank"],
  ["058", "Guaranty Trust Bank"],
  ["030", "Heritage Bank"],
  ["301", "Jaiz Bank"],
  ["082", "Keystone Bank"],
  ["50211", "Kuda Bank"],
  ["526", "Parallex Bank"],
  ["076", "Polaris Bank"],
  ["101", "Providus Bank"],
  ["221", "Stanbic IBTC Bank"],
  ["068", "Standard Chartered"],
  ["232", "Sterling Bank"],
  ["100", "SunTrust Bank"],
  ["032", "Union Bank of Nigeria"],
  ["033", "United Bank for Africa"],
  ["215", "Unity Bank"],
  ["035", "Wema Bank"],
  ["057", "Zenith Bank"],
  ["999992", "OPay"],
  ["999991", "PalmPay"],
  ["50515", "Moniepoint MFB"],
];

const STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

// State and LGA labels derive from the Nigeria Administrative Divisions Dataset
// (https://github.com/open-admin-data/nigeria-administrative-divisions),
// CC-BY-4.0, accessed 2026-09-03. This compact fixture keeps only English
// labels, drops coordinates/wards, and normalises Federal Capital Territory to
// the prototype's existing "FCT" label. It is static reference data: no live
// location lookup is made by the prototype.
const LGAS_BY_STATE: Record<string, string> = {
  Abia: "Aba North|Aba South|Arochukwu|Bende|Ikwuano|Isiala-Ngwa North|Isiala-Ngwa South|Isiukwuato|Obi Ngwa|Ohafia|Osisioma Ngwa|Ugwunagbo|Ukwa East|Ukwa West|Umu-Nneochi|Umuahia North|Umuahia South",
  Adamawa:
    "Demsa|Fufore|Ganye|Girei|Gombi|Guyuk|Hong|Jada|Lamurde|Madagali|Maiha|Mayo-Belwa|Michika|Mubi North|Mubi South|Numan|Shelleng|Song|Toungo|Yola North|Yola South",
  "Akwa Ibom":
    "Abak|Eastern Obolo|Eket|Esit - Eket|Essien Udim|Etim Ekpo|Etinan|Ibeno|Ibesikpo Asutan|Ibiono Ibom|Ika|Ikono|Ikot Abasi|Ikot Ekpene|Ini|Itu|Mbo|Mkpat Enin|Nsit Atai|Nsit Ibom|Nsit Ubium|Obot Akara|Okobo|Onna|Oron|Oruk Anam|Udung Uko|Ukanafun|Uruan|Urue-Offong/Oruko|Uyo",
  Anambra:
    "Aguata|Anambra East|Anambra West|Anaocha|Awka North|Awka South|Ayamelum|Dunukofia|Ekwusigo|Idemili North|Idemili South|Ihiala|Njikoka|Nnewi North|Nnewi South|Ogbaru|Onitsha North|Onitsha South|Orumba North|Orumba South|Oyi",
  Bauchi:
    "Alkaleri|Bauchi|Bogoro|Damban|Darazo|Dass|Gamawa|Ganjuwa|Giade|Itas/Gadau|Jama'are|Katagum|Kirfi|Misau|Ningi|Shira|Tafawa-Balewa|Toro|Warji|Zaki",
  Bayelsa: "Brass|Ekeremor|Kolokuma/Opokuma|Nembe|Ogbia|Sagbama|Southern Ijaw|Yenegoa",
  Benue:
    "Ado|Agatu|Apa|Buruku|Gboko|Guma|Gwer East|Gwer West|Katsina-Ala|Konshisha|Kwande|Logo|Makurdi|Obi|Ogbadibo|Ohimini|Oju|Okpokwu|Oturkpo|Tarka|Ukum|Ushongo|Vandeikya",
  Borno:
    "Abadam|Askira/Uba|Bama|Bayo|Biu|Chibok|Damboa|Dikwa|Gubio|Guzamala|Gwoza|Hawul|Jere|Kaga|Kala/Balge|Konduga|Kukawa|Kwaya Kusar|Mafa|Magumeri|Maiduguri|Marte|Mobbar|Monguno|Ngala|Nganzai|Shani",
  "Cross River":
    "Abi|Akamkpa|Akpabuyo|Bakassi|Bekwara|Biase|Boki|Calabar South|Calabar-Municipal|Etung|Ikom|Obanliku|Obubra|Obudu|Odukpani|Ogoja|Yakurr|Yala",
  Delta:
    "Aniocha North|Aniocha South|Bomadi|Burutu|Ethiope East|Ethiope West|Ika North East|Ika South|Isoko North|Isoko South|Ndokwa East|Ndokwa West|Okpe|Oshimili North|Oshimili South|Patani|Sapele|Udu|Ughelli North|Ughelli South|Ukwuani|Uvwie|Warri North|Warri South|Warri South West",
  Ebonyi:
    "Abakaliki|Afikpo North|Afikpo South|Ebonyi|Ezza North|Ezza South|Ikwo|Ishielu|Ivo|Izzi|Ohaozara|Ohaukwu|Onicha",
  Edo: "Akoko-Edo|Egor|Esan Central|Esan North East|Esan South East|Esan West|Etsako Central|Etsako East|Etsako West|Igueben|Ikpoba-Okha|Oredo|Orhionmwon|Ovia North East|Ovia South West|Owan East|Owan West|Uhunmwonde",
  Ekiti:
    "Ado Ekiti|Aiyekire (Gbonyin)|Efon|Ekiti East|Ekiti South West|Ekiti West|Emure|Ido-Osi|Ijero|Ikere|Ikole|Ilejemeji|Irepodun/Ifelodun|Ise/Orun|Moba|Oye",
  Enugu:
    "Aninri|Awgu|Enugu East|Enugu North|Enugu South|Ezeagu|Igbo-Etiti|Igbo-Eze North|Igbo-Eze South|Isi-Uzo|Nkanu East|Nkanu West|Nsukka|Oji-River|Udenu|Udi|Uzo-Uwani",
  FCT: "Abaji|Abuja Municipal|Bwari|Gwagwalada|Kuje|Kwali",
  Gombe: "Akko|Balanga|Billiri|Dukku|Funakaye|Gombe|Kaltungo|Kwami|Nafada|Shomgom|Yamaltu/Deba",
  Imo: "Aboh-Mbaise|Ahiazu-Mbaise|Ehime-Mbano|Ezinihitte|Ideato North|Ideato South|Ihitte/Uboma|Ikeduru|Isiala Mbano|Isu|Mbaitoli|Ngor-Okpala|Njaba|Nkwerre|Nwangele|Obowo|Oguta|Ohaji/Egbema|Okigwe|Orlu|Orsu|Oru East|Oru West|Owerri North|Owerri West|Owerri-Municipal|Unuimo",
  Jigawa:
    "Auyo|Babura|Biriniwa|Birni Kudu|Buji|Dutse|Gagarawa|Garki|Gumel|Guri|Gwaram|Gwiwa|Hadejia|Jahun|Kafin Hausa|Kaugama|Kazaure|Kiri Kasamma|Kiyawa|Maigatari|Malam Madori|Miga|Ringim|Roni|Sule-Tankarkar|Taura|Yankwashi",
  Kaduna:
    "Birnin-Gwari|Chikun|Giwa|Igabi|Ikara|Jaba|Jema'a|Kachia|Kaduna North|Kaduna South|Kagarko|Kajuru|Kaura|Kauru|Kubau|Kudan|Lere|Markafi|Sabon-Gari|Sanga|Soba|Zango-Kataf|Zaria",
  Kano: "Ajingi|Albasu|Bagwai|Bebeji|Bichi|Bunkure|Dala|Dambatta|Dawakin Kudu|Dawakin Tofa|Doguwa|Fagge|Gabasawa|Garko|Garum Mallam|Gaya|Gezawa|Gwale|Gwarzo|Kabo|Kano Municipal|Karaye|Kibiya|Kiru|Kumbotso|Kunchi|Kura|Madobi|Makoda|Minjibir|Nasarawa|Rano|Rimin Gado|Rogo|Shanono|Sumaila|Takai|Tarauni|Tofa|Tsanyawa|Tudun Wada|Ungogo|Warawa|Wudil",
  Katsina:
    "Bakori|Batagarawa|Batsari|Baure|Bindawa|Charanchi|Dan Musa|Dandume|Danja|Daura|Dutsi|Dutsin-Ma|Faskari|Funtua|Ingawa|Jibia|Kafur|Kaita|Kankara|Kankia|Katsina|Kurfi|Kusada|Mai'adua|Malumfashi|Mani|Mashi|Matazu|Musawa|Rimi|Sabuwa|Safana|Sandamu|Zango",
  Kebbi:
    "Aleiro|Arewa-Dandi|Argungu|Augie|Bagudo|Birnin Kebbi|Bunza|Dandi|Fakai|Gwandu|Jega|Kalgo|Koko/Besse|Maiyama|Ngaski|Sakaba|Shanga|Suru|Wasagu/Danko|Yauri|Zuru",
  Kogi: "Adavi|Ajaokuta|Ankpa|Bassa|Dekina|Ibaji|Idah|Igalamela-Odolu|Ijumu|Kabba/Bunu|Kogi|Lokoja|Mopa-Muro|Ofu|Ogori/Magongo|Okehi|Okene|Olamabolo|Omala|Yagba East|Yagba West",
  Kwara:
    "Asa|Baruten|Edu|Ekiti|Ifelodun|Ilorin East|Ilorin South|Ilorin West|Irepodun|Isin|Kaiama|Moro|Offa|Oke-Ero|Oyun|Pategi",
  Lagos:
    "Agege|Ajeromi-Ifelodun|Alimosho|Amuwo-Odofin|Apapa|Badagry|Epe|Eti-Osa|Ibeju/Lekki|Ifako-Ijaye|Ikeja|Ikorodu|Kosofe|Lagos Island|Lagos Mainland|Mushin|Ojo|Oshodi-Isolo|Shomolu|Surulere",
  Nasarawa: "Akwanga|Awe|Doma|Karu|Keana|Keffi|Kokona|Lafia|Nasarawa|Nasarawa-Eggon|Obi|Toto|Wamba",
  Niger:
    "Agaie|Agwara|Bida|Borgu|Bosso|Chanchaga|Edati|Gbako|Gurara|Katcha|Kontagora|Lapai|Lavun|Magama|Mariga|Mashegu|Mokwa|Muya|Paikoro|Rafi|Rijau|Shiroro|Suleja|Tafa|Wushishi",
  Ogun: "Abeokuta North|Abeokuta South|Ado-Odo/Ota|Egbado North|Egbado South|Ewekoro|Ifo|Ijebu East|Ijebu North|Ijebu North East|Ijebu Ode|Ikenne|Imeko-Afon|Ipokia|Obafemi-Owode|Odeda|Odogbolu|Ogun waterside|Remo North|Shagamu",
  Ondo: "Akoko North East|Akoko North West|Akoko South East|Akoko South West|Akure North|Akure South|Ese-Odo|Idanre|Ifedore|Ilaje|Ile-Oluji-Okeigbo|Irele|Odigbo|Okitipupa|Ondo East|Ondo West|Ose|Owo",
  Osun: "Aiyedade|Aiyedire|Atakumosa East|Atakumosa West|Boluwaduro|Boripe|Ede North|Ede South|Egbedore|Ejigbo|Ife Central|Ife East|Ife North|Ife South|Ifedayo|Ifelodun|Ila|Ilesha East|Ilesha West|Irepodun|Irewole|Isokan|Iwo|Obokun|Odo-Otin|Ola-oluwa|Olorunda|Oriade|Orolu|Osogbo",
  Oyo: "Afijio|Akinyele|Atiba|Atigbo|Egbeda|Ibadan North|Ibadan North East|Ibadan North West|Ibadan South East|Ibadan South West|Ibarapa Central|Ibarapa East|Ibarapa North|Ido|Irepo|Iseyin|Itesiwaju|Iwajowa|Kajola|Lagelu|Ogbomosho North|Ogbomosho South|Ogo Oluwa|Olorunsogo|Oluyole|Ona-Ara|Orelope|Ori Ire|Oyo East|Oyo West|Saki East|Saki West|Surulere",
  Plateau:
    "Barikin Ladi|Bassa|Bokkos|Jos East|Jos North|Jos South|Kanam|Kanke|Langtang North|Langtang South|Mangu|Mikang|Pankshin|Qua'an Pan|Riyom|Shendam|Wase",
  Rivers:
    "Abua/Odual|Ahoada East|Ahoada West|Akuku Toru|Andoni|Asari-Toru|Bonny|Degema|Eleme|Emohua|Etche|Gokana|Ikwerre|Khana|Obia/Akpor|Ogba/Egbema/Ndoni|Ogu/Bolo|Okrika|Omumma|Opobo/Nkoro|Oyigbo|Port-Harcourt|Tai",
  Sokoto:
    "Binji|Bodinga|Dange-Shuni|Gada|Goronyo|Gudu|Gwadabawa|Illela|Isa|Kebbe|Kware|Rabah|Sabon Birni|Shagari|Silame|Sokoto North|Sokoto South|Tambuwal|Tangaza|Tureta|Wamako|Wurno|Yabo",
  Taraba:
    "Ardo-Kola|Bali|Donga|Gashaka|Gassol|Ibi|Jalingo|Karim-Lamido|Kurmi|Lau|Sardauna|Takum|Ussa|Wukari|Yorro|Zing",
  Yobe: "Bade|Bursari|Damaturu|Fika|Fune|Geidam|Gujba|Gulani|Jakusko|Karasuwa|Machina|Nangere|Nguru|Potiskum|Tarmua|Yunusari|Yusufari",
  Zamfara:
    "Anka|Bakura|Birnin Magaji|Bukkuyum|Bungudu|Gummi|Gusau|Kaura Namoda|Maradun|Maru|Shinkafi|Talata Mafara|Tsafe|Zurmi",
};

write("reference.json", {
  id: "reference",
  specialties: SPECIALTY_LABELS.map(([v, l, b]) => ({ value: v, label: l, blurb: b })),
  banks: BANKS.map(([c, n]) => ({ code: c, name: n })),
  states: STATES,
  local_government_areas_by_state: Object.fromEntries(
    Object.entries(LGAS_BY_STATE).map(([state, labels]) => [state, labels.split("|")]),
  ),
  symptoms: SYMPTOMS.map(([i, l]) => ({ id: i, label: l })),
  saved_items: {
    food: [
      "Akara and pap",
      "Jollof rice with chicken",
      "Bread and tea",
      "Beans and plantain",
      "Yam and egg sauce",
    ],
    drink: ["Water", "Zobo", "Tea", "Malt"],
    activity: ["Morning walk", "Gym session", "Evening run"],
  },
});

// The demo account's "self" identities, resolved to whatever UUID their
// underlying fixture slug became. app code (selectors.ts and others) imports
// these instead of a literal "pat_amara"-style string, so a regeneration can
// never leave one screen looking up an id no fixture carries any more — the
// exact bug this file's own ids-as-slugs convention would otherwise invite.
const IDENTITIES: Record<string, string> = {
  USER_ID: "acc_amara",
  PATIENT_ID: "pat_amara",
  EXPERT_ID: "exp_adeyemi",
  PHARMACY_ID: "prv_ph_greenlife",
  LAB_ID: "prv_lab_lagosdiag",
  STAFF_ID: "stf_001",
};
// Fixture rows the app names directly rather than reaching through a
// selector: the screen catalogue's deep links, the reviewer seats on X4, the
// demo notification targets. These are not the demo account's own identities,
// just specific rows a screen has to be able to open.
// Emitted `as const`, so removing one here fails the typecheck at the manifest
// instead of shipping a link to a row that no longer exists.
const SCREEN_LINK_SLUGS = [
  "app_001",
  "app_002",
  "ccr_001",
  "chk_006",
  "con_002",
  "con_003",
  "con_005",
  "con_007",
  "con_009",
  "con_012",
  "con_106",
  "dsp_002",
  "exp_adisa",
  "exp_etim",
  "exp_garba",
  "exp_lawal",
  "exp_nwosu",
  "ins_001",
  "lab_002",
  "lab_003",
  "lab_006",
  "log_0001",
  "pat_amara",
  "pat_zainab",
  "po_102",
  "preq_101",
  "preq_103",
  "preq_201",
  "preq_202",
  "prv_lab_pathcare",
  "prv_ph_greenlife",
  "rep_001",
  "rfd_001",
  "rfd_003",
  "rx_002",
  "rx_003",
  "std_001",
];

const identitiesPath = path.join(OUT, "identities.generated.ts");
{
  let content = "// Generated by scripts/gen-fixtures.ts. Edit the generator, never this file.\n";
  content += "// The demo account's own identities — see app/data/selectors.ts.\n";
  for (const [name, slug] of Object.entries(IDENTITIES)) {
    content += `export const ${name} = "${asUuid(slug)}";\n`;
  }
  content += "\n// Rows app/data/screen-manifest.ts links to. See SCREEN_LINK_SLUGS.\n";
  content += "export const FIXTURE_IDS = {\n";
  for (const slug of SCREEN_LINK_SLUGS) {
    content += `  ${slug}: "${asUuid(slug)}",\n`;
  }
  content += "} as const;\n";
  writeFileSync(identitiesPath, content, { encoding: "utf-8" });
  console.log(
    `  identities.generated.ts           ${formatBytes(statSync(identitiesPath).size)} bytes`,
  );
}
console.log("all fixtures written");
