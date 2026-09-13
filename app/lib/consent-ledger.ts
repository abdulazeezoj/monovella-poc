import type { ConsentPurpose, ConsentRecordRead } from "~/data/types";

export const CONSENT_VERSIONS = {
  terms: "terms-v0.1-2026-09-04",
  privacyNotice: "privacy-notice-v0.1-2026-09-04",
  ninVerification: "nin-verification-v1",
  telemedicine: "telemedicine-v1",
  expertReferral: "expert-referral-v1",
  pharmacyDisclosure: "pharmacy-disclosure-v1",
  labDisclosure: "lab-disclosure-v1",
  dependantRecordCare: "dependant-record-care-v1",
} as const;

export function activeConsent(
  entries: ConsentRecordRead[],
  purpose: ConsentPurpose,
  patientId: string | null,
  careEventId: string | null = null,
) {
  const candidate = [...entries]
    .reverse()
    .find(
      (entry) =>
        entry.purpose === purpose &&
        entry.patient_id === patientId &&
        entry.care_event_id === careEventId &&
        (entry.action === "CONSENTED" || entry.action === "ACKNOWLEDGED"),
    );
  if (!candidate) return null;
  return entries.some(
    (entry) =>
      (entry.action === "WITHDRAWN" && entry.withdrawn_entry_id === candidate.id) ||
      (entry.action === "REPLACED" && entry.replaces_entry_id === candidate.id),
  )
    ? null
    : candidate;
}

export function recordConsent(
  entries: ConsentRecordRead[],
  input: {
    actingUserId: string;
    patientId: string | null;
    actorCapacity: "ACCOUNT_HOLDER" | "GUARDIAN";
    guardianRelationship?: string | null;
    purpose: ConsentPurpose;
    version: string;
    action?: "ACKNOWLEDGED" | "CONSENTED";
    occurredAt: string;
    careEventId?: string | null;
  },
) {
  const careEventId = input.careEventId ?? null;
  const existing = activeConsent(entries, input.purpose, input.patientId, careEventId);
  if (existing?.document_or_statement_version === input.version) return existing;
  if (existing)
    entries.push({
      ...existing,
      id: `consent_replaced_${entries.length}`,
      action: "REPLACED",
      occurred_at: input.occurredAt,
      replaces_entry_id: existing.id,
      withdrawn_entry_id: null,
    });
  const created: ConsentRecordRead = {
    id: `consent_${input.purpose.toLowerCase()}_${entries.length}`,
    acting_user_id: input.actingUserId,
    patient_id: input.patientId,
    actor_capacity: input.actorCapacity,
    guardian_relationship: input.guardianRelationship ?? null,
    purpose: input.purpose,
    document_or_statement_version: input.version,
    action: input.action ?? "CONSENTED",
    occurred_at: input.occurredAt,
    care_event_id: careEventId,
    replaces_entry_id: existing?.id ?? null,
    withdrawn_entry_id: null,
  };
  entries.push(created);
  return created;
}

export function withdrawConsent(
  entries: ConsentRecordRead[],
  input: {
    actingUserId: string;
    patientId: string | null;
    purpose: ConsentPurpose;
    occurredAt: string;
    careEventId?: string | null;
  },
) {
  const existing = activeConsent(
    entries,
    input.purpose,
    input.patientId,
    input.careEventId ?? null,
  );
  if (!existing) return null;
  const prior = entries.find(
    (entry) => entry.action === "WITHDRAWN" && entry.withdrawn_entry_id === existing.id,
  );
  if (prior) return prior;
  const withdrawal: ConsentRecordRead = {
    ...existing,
    id: `consent_withdrawn_${entries.length}`,
    acting_user_id: input.actingUserId,
    action: "WITHDRAWN",
    occurred_at: input.occurredAt,
    replaces_entry_id: null,
    withdrawn_entry_id: existing.id,
  };
  entries.push(withdrawal);
  return withdrawal;
}
