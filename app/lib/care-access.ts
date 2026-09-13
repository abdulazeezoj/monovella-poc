import type { Dataset } from "~/data";
import type { ConsultationRead, ProviderRequestRead } from "~/data/types";

export type CareAccessScope =
  | "NONE"
  | "REQUEST_SUMMARY"
  | "PURPOSE_HISTORY"
  | "ENCOUNTER_RECORD"
  | "GUEST_EXAM_CONTEXT"
  | "FULFILMENT_FIELDS"
  | "OPERATIONAL_CASE";

export type CareAccessDecision = {
  scope: CareAccessScope;
  current: boolean;
  reason: string;
  /**
   * Whether a care relationship exists at all. A viewer with no relationship must not
   * learn that the record exists, so the screen shows the same response it gives for an
   * unknown identifier. Only a related viewer is told why their access is closed.
   */
  related: boolean;
};

const activeCareStatuses = new Set(["ACCEPTED", "PAID", "SCHEDULED", "ACTIVE"]);

export function expertCareAccess(
  data: Dataset,
  consultation: ConsultationRead | undefined,
  expertId: string,
  options: { suspended?: boolean; credentialCurrent?: boolean; patientClosed?: boolean } = {},
): CareAccessDecision {
  if (!consultation || consultation.expert_id !== expertId)
    return {
      scope: "NONE",
      current: false,
      related: false,
      reason: "No care relationship for this case.",
    };
  if (options.suspended || options.credentialCurrent === false)
    return {
      scope: "NONE",
      current: false,
      related: true,
      reason: "Current browsing is blocked while standing or credentials are unresolved.",
    };
  if (options.patientClosed && consultation.status !== "COMPLETED")
    return {
      scope: "NONE",
      current: false,
      related: true,
      reason:
        "Account closure ended current browsing; retained records remain governed separately.",
    };
  if (consultation.status === "REQUESTED")
    return {
      scope: "REQUEST_SUMMARY",
      current: true,
      related: true,
      reason: "Only the patient-approved request summary is available before acceptance.",
    };
  if (activeCareStatuses.has(consultation.status))
    return {
      scope: "PURPOSE_HISTORY",
      current: true,
      related: true,
      reason: "Relevant history is available only for this accepted care purpose.",
    };
  const authored = data.soapNotes.some((note) => note.consultation_id === consultation.id);
  if (consultation.status === "COMPLETED" || authored)
    return {
      scope: "ENCOUNTER_RECORD",
      current: false,
      related: true,
      reason: "The authored encounter remains readable; wider longitudinal browsing has ended.",
    };
  return {
    scope: "NONE",
    current: false,
    related: true,
    reason: "Declined, expired or cancelled requests do not grant record access.",
  };
}

/**
 * An expert may not examine themselves, whichever route is taken.
 *
 * Patient and Expert are one account with a switchable context, so the same
 * human holds both a patient identity and an expert identity. Self-booking is
 * blocked in discovery; a guest invitation is the other way the same pairing
 * could be reached, and it has to be blocked in the same terms.
 */
export function isSelfExamination(
  consultation: Pick<ConsultationRead, "patient_identity_id">,
  guestExpertId: string,
  accountSelf: { patientId: string; expertId: string },
) {
  return (
    consultation.patient_identity_id === accountSelf.patientId &&
    guestExpertId === accountSelf.expertId
  );
}

export function guestCareAccess(
  consultation: ConsultationRead | undefined,
  guestExpertId: string,
): CareAccessDecision {
  if (!consultation || consultation.guest_expert_id !== guestExpertId)
    return {
      scope: "NONE",
      current: false,
      related: false,
      reason: "No guest assignment for this case.",
    };
  if (consultation.guest_examination_status === "ACCEPTED" && consultation.status === "ACTIVE")
    return {
      scope: "GUEST_EXAM_CONTEXT",
      current: true,
      related: true,
      reason: "Only the examination reason and the guest's own objective findings are available.",
    };
  if (consultation.guest_examination_status === "COMPLETED")
    return {
      scope: "GUEST_EXAM_CONTEXT",
      current: false,
      related: true,
      reason: "Only the guest's submitted findings remain readable after the examination.",
    };
  return {
    scope: "NONE",
    current: false,
    related: true,
    reason: "A request or unpaid invitation does not open the patient record.",
  };
}

export function providerCareAccess(
  request: ProviderRequestRead | undefined,
  providerId: string,
): CareAccessDecision {
  if (!request || request.provider_id !== providerId || !request.disclosure_consent)
    return {
      scope: "NONE",
      current: false,
      related: false,
      reason: "No consented request for this provider.",
    };
  const current = request.status === "REQUESTED" || request.status === "ACCEPTED";
  return {
    scope: "FULFILMENT_FIELDS",
    current,
    related: true,
    reason: current
      ? "Only the fields listed in the purpose-specific disclosure are available."
      : "The fulfilment transaction is retained; current patient-record browsing has ended.",
  };
}

export function staffCareAccess(hasAssignedOperationalCase: boolean): CareAccessDecision {
  return hasAssignedOperationalCase
    ? {
        scope: "OPERATIONAL_CASE",
        current: true,
        related: true,
        reason: "Only the assigned operational case and minimum linked details are available.",
      }
    : {
        scope: "NONE",
        current: false,
        related: false,
        reason: "No assigned operational purpose.",
      };
}

export function transitionExpertGrant(
  data: Dataset,
  consultation: ConsultationRead,
  next: "REQUESTED" | "ACCEPTED" | "ENDED",
  occurredAt: string,
) {
  const existing = data.careAccessGrants.find(
    (grant) =>
      grant.grantee_type === "EXPERT" &&
      grant.grantee_id === consultation.expert_id &&
      grant.care_event_id === consultation.id,
  );
  const scope =
    next === "REQUESTED"
      ? "REQUEST_SUMMARY"
      : next === "ACCEPTED"
        ? "PURPOSE_HISTORY"
        : data.soapNotes.some((note) => note.consultation_id === consultation.id)
          ? "ENCOUNTER_RECORD"
          : (existing?.scope ?? "REQUEST_SUMMARY");
  if (existing) {
    existing.scope = scope;
    existing.status = next === "ENDED" ? "ENDED" : "CURRENT";
    existing.ended_at = next === "ENDED" ? occurredAt : null;
    existing.end_reason = next === "ENDED" ? "CARE_PURPOSE_ENDED" : null;
    return existing;
  }
  const created = {
    id: `cag_${consultation.id}_${consultation.expert_id}`,
    patient_identity_id: consultation.patient_identity_id,
    grantee_type: "EXPERT" as const,
    grantee_id: consultation.expert_id,
    care_event_id: consultation.id,
    purpose: consultation.referred_from_id ? "Referral consultation" : "Specialist consultation",
    scope,
    grant_source: "CARE_EVENT" as const,
    status: next === "ENDED" ? ("ENDED" as const) : ("CURRENT" as const),
    granted_at: occurredAt,
    ended_at: next === "ENDED" ? occurredAt : null,
    end_reason: next === "ENDED" ? "CARE_PURPOSE_ENDED" : null,
  };
  data.careAccessGrants.push(created);
  return created;
}
