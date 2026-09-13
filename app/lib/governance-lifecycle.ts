import type { Dataset } from "~/data";
import { EXPERT_ID, STAFF_ID } from "~/data/selectors";
import type {
  CredentialTier,
  ExpertRead,
  GovernanceAccessStatus,
  GovernanceAction,
  GovernanceApplicationLinkRead,
  GovernanceSubject,
  ProviderType,
  Specialty,
  StaffAccountRead,
} from "~/data/types";
import { now } from "~/lib/clock";
import {
  canAddFellowship,
  isFellowshipSpecialty,
  specialtyClaimTier,
  specialtyMatchesProfession,
} from "~/lib/expert-credentials";

const STAFF_REVIEWER_ID = STAFF_ID;

// Governance is five ordinary tables (application links, an append-only audit
// log, per-actor access, per-subject revisions, per-subject assignments). The
// subject and actor ids are polymorphic, so the lookups below stand in for the
// joins a relational backend would write instead.

/** The link row for one application, if governance is tracking it. */
export function applicationLink(data: Dataset, applicationId: string) {
  return data.governanceApplications.find((item) => item.application_id === applicationId);
}

/** Everything the audit log holds about one subject, oldest first. */
export function auditFor(data: Dataset, subjectId: string) {
  return data.governanceAudit.filter((item) => item.subject_id === subjectId);
}

/** Whether an actor may act today. Absent means governance has no opinion yet. */
export function accessStatusOf(data: Dataset, actorId: string) {
  return data.governanceAccess.find((item) => item.actor_id === actorId)?.status;
}

function setAccess(data: Dataset, actorId: string, status: GovernanceAccessStatus) {
  const row = data.governanceAccess.find((item) => item.actor_id === actorId);
  if (row) row.status = status;
  else data.governanceAccess.push({ actor_id: actorId, status });
}

/** The reviewer a subject is assigned to, if governance has assigned one. */
export function assigneeOf(data: Dataset, subjectId: string) {
  return data.governanceAssignments.find((item) => item.subject_id === subjectId)?.staff_id;
}

function assign(data: Dataset, subjectId: string, staffId: string) {
  const row = data.governanceAssignments.find((item) => item.subject_id === subjectId);
  if (row) row.staff_id = staffId;
  else data.governanceAssignments.push({ subject_id: subjectId, staff_id: staffId });
}

/** The revision a decision has to be taken against. A subject starts at 1. */
export function revisionOf(data: Dataset, subjectId: string) {
  return data.governanceRevisions.find((item) => item.subject_id === subjectId)?.revision ?? 1;
}

function bumpRevision(data: Dataset, subjectId: string, from: number) {
  const row = data.governanceRevisions.find((item) => item.subject_id === subjectId);
  if (row) row.revision = from + 1;
  else data.governanceRevisions.push({ subject_id: subjectId, revision: from + 1 });
}

function staffCanAdminister(data: Dataset, staffId: string) {
  const staff = data.staffAccounts.find((item) => item.id === staffId);
  return !!staff && !staff.revoked_at && staff.role === "PLATFORM_ADMIN";
}

/** An unseen subject falls to the duty reviewer rather than to nobody. */
function assignedTo(data: Dataset, subjectId: string, staffId: string) {
  return (assigneeOf(data, subjectId) ?? STAFF_REVIEWER_ID) === staffId;
}

function audit(
  data: Dataset,
  subjectType: GovernanceSubject,
  subjectId: string,
  action: GovernanceAction,
  actorId: string | null,
  note: string | null,
) {
  data.governanceAudit.push({
    id: `gov_${data.governanceAudit.length + 1}`,
    subject_type: subjectType,
    subject_id: subjectId,
    action,
    actor_id: actorId,
    occurred_at: now().toISOString().slice(0, 19),
    note,
  });
}

/** Find the open review before allowing another submission for the same purpose. */
export function pendingExpertApplication(
  data: Dataset,
  expertId: string,
  kind: GovernanceApplicationLinkRead["application_kind"],
  targetCredentialId?: string,
) {
  return data.governanceApplications.find(
    (link) =>
      link.actor_id === expertId &&
      link.application_kind === kind &&
      (kind !== "LICENCE_RENEWAL" || link.target_credential_id === targetCredentialId) &&
      data.applicationDetails.some(
        (detail) => detail.id === link.application_id && detail.status === "PENDING",
      ),
  );
}

export function submitExpertGovernance(
  data: Dataset,
  input: {
    id: string;
    kind: GovernanceApplicationLinkRead["application_kind"];
    credentialId: string;
    targetCredentialId?: string;
    expertId?: string;
    documentFilename?: string;
    applicant?: Pick<
      ExpertRead,
      | "first_name"
      | "last_name"
      | "gender"
      | "professional_type"
      | "address"
      | "city"
      | "local_government_area"
      | "state"
    > & { email: string };
    tier: CredentialTier;
    specialty: Specialty;
    licenceNumber: string;
    expiryDate: string;
    feeKobo: number;
  },
) {
  const expert = data.experts.find((item) => item.id === (input.expertId ?? EXPERT_ID));
  if (!expert || applicationLink(data, input.id)) return false;
  if (input.kind === "ADDITIONAL_CREDENTIAL") {
    if (input.targetCredentialId) {
      const source = expert.credentials.find((c) => c.id === input.targetCredentialId);
      if (
        !source ||
        source.verification_status !== "VERIFIED" ||
        source.retired_at ||
        !specialtyMatchesProfession(expert.professional_type, input.specialty) ||
        input.tier !== specialtyClaimTier(expert.professional_type, input.specialty)
      )
        return false;
      if (
        expert.credentials.some(
          (c) =>
            c.specialty === input.specialty &&
            !c.retired_at &&
            (c.verification_status === "VERIFIED" || c.verification_status === "PENDING"),
        )
      )
        return false;
    } else if (!canAddFellowship(expert) || !isFellowshipSpecialty(input.specialty)) return false;
  }
  if (
    input.kind !== "ADDITIONAL_CREDENTIAL" &&
    pendingExpertApplication(data, expert.id, input.kind, input.targetCredentialId)
  )
    return false;
  if (
    input.kind !== "LICENCE_RENEWAL" &&
    expert.credentials.some((credential) => credential.id === input.credentialId)
  )
    return false;
  const applicant = input.applicant ?? expert;
  if (input.kind === "ADDITIONAL_CREDENTIAL" || input.kind === "INITIAL") {
    expert.credentials.push({
      id: input.credentialId,
      professional_type: applicant.professional_type,
      tier: input.tier,
      specialty: input.specialty,
      licence_or_fellowship_number: input.licenceNumber,
      verification_status: "PENDING",
      credential_status: null,
      expiry_date: input.expiryDate,
      verified_at: null,
      consultation_fee_kobo: input.feeKobo,
      retired_at: null,
    });
  }
  data.applicationDetails.unshift({
    id: input.id,
    provider_type: "SPECIALIST",
    status: "PENDING",
    request_kind: input.kind === "LICENCE_RENEWAL" ? "RENEWAL" : "INITIAL",
    business_name: null,
    cac_number: null,
    cac_verified_at: null,
    license_number: input.licenceNumber,
    license_expiry_date: input.expiryDate,
    prior_license_expiry_date:
      input.kind === "LICENCE_RENEWAL"
        ? (expert.credentials.find((item) => item.id === input.targetCredentialId)?.expiry_date ??
          null)
        : null,
    license_document_url: input.documentFilename ?? "expert-credential.pdf",
    license_document_flagged: false,
    license_verified_at: null,
    license_verification_note: null,
    premises_address: applicant.address,
    city: applicant.city,
    local_government_area: applicant.local_government_area,
    state: applicant.state,
    prior_rejection_reason: null,
    submitted_at: now().toISOString().slice(0, 19),
    expert: {
      first_name: applicant.first_name,
      last_name: applicant.last_name,
      gender: applicant.gender,
      professional_type: applicant.professional_type,
      specialty: input.specialty,
      email: input.applicant?.email ?? "",
      consultation_fee_kobo: input.feeKobo,
      years_practising: expert.years_practising ?? 0,
    },
  });
  data.applicationsQueue.unshift({
    id: input.id,
    provider_type: "SPECIALIST",
    name: `${applicant.first_name} ${applicant.last_name}`,
    verification_status: "PENDING",
    request_kind: input.kind === "LICENCE_RENEWAL" ? "RENEWAL" : "INITIAL",
    review_due_by: new Date(now().getTime() + 5 * 24 * 60 * 60_000).toISOString().slice(0, 19),
    overdue: false,
    due_soon: false,
    submitted_at: now().toISOString().slice(0, 19),
  });
  data.governanceApplications.unshift({
    application_id: input.id,
    application_kind: input.kind,
    actor_id: expert.id,
    target_credential_id: input.targetCredentialId ?? null,
    submitted_credential_id: input.kind !== "LICENCE_RENEWAL" ? input.credentialId : null,
    licence_number: input.licenceNumber,
    expiry_date: input.expiryDate,
    revision: 1,
    assigned_staff_id: STAFF_REVIEWER_ID,
  });
  assign(data, input.id, STAFF_REVIEWER_ID);
  setAccess(
    data,
    expert.id,
    input.kind === "INITIAL" ? "PENDING" : (accessStatusOf(data, expert.id) ?? "ACTIVE"),
  );
  audit(data, "APPLICATION", input.id, "SUBMITTED", expert.id, input.kind);
  return true;
}

export function submitProviderGovernance(
  data: Dataset,
  input: {
    id: string;
    providerType: Extract<ProviderType, "PHARMACY" | "LAB">;
    providerId: string;
    kind: GovernanceApplicationLinkRead["application_kind"];
    targetCredentialId?: string;
    credentialId?: string;
    licenceNumber: string;
    expiryDate: string;
    documentFilename?: string;
  },
) {
  const provider = data.providers.find((item) => item.id === input.providerId);
  if (!provider) return false;
  if (applicationLink(data, input.id)) return false;
  if (input.kind === "ADDITIONAL_CREDENTIAL" && input.credentialId) {
    data.providerCredentials.push({
      id: input.credentialId,
      provider_id: input.providerId,
      credential_type: "CERTIFICATION",
      title: "Additional supporting credential",
      reference_number: input.licenceNumber,
      document_filename: "supporting-credential.pdf",
      expires_at: input.expiryDate,
      verification_status: "PENDING",
      verified_at: null,
      retired_at: null,
    });
  }
  data.applicationDetails.unshift({
    id: input.id,
    provider_type: input.providerType,
    status: "PENDING",
    request_kind: input.kind === "LICENCE_RENEWAL" ? "RENEWAL" : "INITIAL",
    business_name: provider.business_name,
    cac_number: provider.cac_number ?? null,
    cac_verified_at: now().toISOString().slice(0, 19),
    license_number: input.licenceNumber,
    license_expiry_date: input.expiryDate,
    prior_license_expiry_date:
      input.kind === "LICENCE_RENEWAL"
        ? (data.providerCredentials.find((item) => item.id === input.targetCredentialId)
            ?.expires_at ?? null)
        : null,
    license_document_url: input.documentFilename ?? "provider-credential.pdf",
    license_document_flagged: false,
    license_verified_at: null,
    license_verification_note: null,
    premises_address: provider.premises_address ?? null,
    city: provider.city,
    local_government_area: provider.local_government_area,
    state: provider.state,
    prior_rejection_reason: null,
    contact_person: provider.contact_name,
    submitted_at: now().toISOString().slice(0, 19),
    services_offered: provider.services_offered,
  });
  data.applicationsQueue.unshift({
    id: input.id,
    provider_type: input.providerType,
    name: provider.business_name,
    verification_status: "PENDING",
    request_kind: input.kind === "LICENCE_RENEWAL" ? "RENEWAL" : "INITIAL",
    review_due_by: new Date(now().getTime() + 5 * 24 * 60 * 60_000).toISOString().slice(0, 19),
    overdue: false,
    due_soon: false,
    submitted_at: now().toISOString().slice(0, 19),
  });
  data.governanceApplications.unshift({
    application_id: input.id,
    application_kind: input.kind,
    actor_id: input.providerId,
    target_credential_id: input.targetCredentialId ?? null,
    submitted_credential_id: input.credentialId ?? null,
    licence_number: input.licenceNumber,
    expiry_date: input.expiryDate,
    revision: 1,
    assigned_staff_id: STAFF_REVIEWER_ID,
  });
  assign(data, input.id, STAFF_REVIEWER_ID);
  setAccess(
    data,
    input.providerId,
    input.kind === "INITIAL" ? "PENDING" : (accessStatusOf(data, input.providerId) ?? "ACTIVE"),
  );
  audit(data, "APPLICATION", input.id, "SUBMITTED", input.providerId, input.kind);
  return true;
}

export function decideGovernanceApplication(
  data: Dataset,
  applicationId: string,
  expectedRevision: number,
  decision: "APPROVED" | "REJECTED",
  reason: string | null,
  staffId = STAFF_REVIEWER_ID,
) {
  const detail = data.applicationDetails.find((item) => item.id === applicationId);
  let link = applicationLink(data, applicationId);
  if (!link && detail) {
    link = {
      application_id: applicationId,
      application_kind: detail.request_kind === "RENEWAL" ? "LICENCE_RENEWAL" : "INITIAL",
      // The queue row is all governance has; nothing on it names the applicant.
      actor_id: null,
      target_credential_id: null,
      submitted_credential_id: null,
      licence_number: detail.license_number ?? "",
      expiry_date: detail.license_expiry_date ?? "",
      revision: 1,
      assigned_staff_id: STAFF_REVIEWER_ID,
    };
    data.governanceApplications.push(link);
  }
  const currentRevision = revisionOf(data, applicationId);
  if (!staffCanAdminister(data, staffId) || !assignedTo(data, applicationId, staffId))
    return { ok: false as const, conflict: false as const, unauthorized: true as const };
  if (!link || !detail || detail.status !== "PENDING" || currentRevision !== expectedRevision)
    return { ok: false as const, conflict: true as const, unauthorized: false as const };

  detail.status = decision;
  if (decision === "REJECTED") detail.prior_rejection_reason = reason;
  data.applicationsQueue = data.applicationsQueue.filter((item) => item.id !== applicationId);
  bumpRevision(data, applicationId, currentRevision);
  // A link synthesized from a queue row names no applicant, so there is nobody
  // whose platform access this decision can flip. The application is still
  // decided; the access row waits until the applicant is known.
  if (link.actor_id && (link.application_kind === "INITIAL" || decision === "APPROVED"))
    setAccess(data, link.actor_id, decision === "APPROVED" ? "ACTIVE" : "REJECTED");

  const expert = data.experts.find((item) => item.id === link.actor_id);
  if (expert) {
    const credential = expert?.credentials.find(
      (item) => item.id === (link.submitted_credential_id ?? link.target_credential_id),
    );
    if (credential && !(link.application_kind === "LICENCE_RENEWAL" && decision === "REJECTED")) {
      credential.verification_status = decision === "APPROVED" ? "VERIFIED" : "REJECTED";
      credential.verified_at = decision === "APPROVED" ? now().toISOString().slice(0, 19) : null;
      if (link.application_kind === "INITIAL" && decision === "APPROVED") {
        if (data.accountExpertId === expert.id) data.user.has_expert_identity = true;
        const profile = detail.expert;
        if (typeof profile?.first_name === "string") expert.first_name = profile.first_name;
        if (typeof profile?.last_name === "string") expert.last_name = profile.last_name;
        if (
          profile?.gender === "FEMALE" ||
          profile?.gender === "MALE" ||
          profile?.gender === "OTHER" ||
          profile?.gender === "PREFER_NOT_TO_SAY"
        )
          expert.gender = profile.gender;
        expert.professional_type = credential.professional_type;
        expert.specialty = credential.specialty;
        expert.consultation_fee_kobo = credential.consultation_fee_kobo;
        expert.licence_number = credential.licence_or_fellowship_number;
        expert.address = detail.premises_address ?? expert.address;
        expert.city = detail.city ?? expert.city;
        expert.local_government_area = detail.local_government_area ?? expert.local_government_area;
        expert.state = detail.state ?? expert.state;
        expert.credentials = [
          credential,
          ...expert.credentials.filter((item) => item.id !== credential.id),
        ];
      }
      if (link.application_kind === "LICENCE_RENEWAL" && decision === "APPROVED") {
        credential.licence_or_fellowship_number = link.licence_number;
        credential.expiry_date = link.expiry_date;
        credential.credential_status = "ACTIVE";
      }
    }
  } else {
    const credential = data.providerCredentials.find(
      (item) => item.id === (link.submitted_credential_id ?? link.target_credential_id),
    );
    if (credential && !(link.application_kind === "LICENCE_RENEWAL" && decision === "REJECTED")) {
      credential.verification_status = decision === "APPROVED" ? "VERIFIED" : "REJECTED";
      credential.verified_at = decision === "APPROVED" ? now().toISOString().slice(0, 19) : null;
      if (link.application_kind === "LICENCE_RENEWAL" && decision === "APPROVED") {
        credential.reference_number = link.licence_number;
        credential.expires_at = link.expiry_date;
      }
    }
  }

  if (link.application_kind === "LICENCE_RENEWAL" && decision === "APPROVED") {
    const linked = data.standingQueue.filter(
      (item) =>
        item.events.length === 1 &&
        item.events[0] === "CREDENTIAL_EXPIRED" &&
        (item as typeof item & { linked_application_id?: string }).linked_application_id ===
          applicationId,
    );
    data.standingQueue = data.standingQueue.filter((item) => !linked.includes(item));
    // No actor: the platform lifted this itself when the renewal landed.
    for (const item of linked)
      audit(data, "STANDING", item.id, "AUTO_LIFTED", null, `Renewal ${applicationId} approved.`);
  }
  audit(data, "APPLICATION", applicationId, decision, staffId, reason);
  return { ok: true as const, conflict: false as const, unauthorized: false as const };
}

export function decideDispute(
  data: Dataset,
  id: string,
  expectedRevision: number,
  favors: "PATIENT" | "PROVIDER",
  decision: string,
  staffId = STAFF_REVIEWER_ID,
) {
  const item = data.disputes.find((candidate) => candidate.id === id);
  const revision = revisionOf(data, id);
  if (!staffCanAdminister(data, staffId) || !assignedTo(data, id, staffId))
    return { ok: false as const, unauthorized: true as const };
  if (!item || item.decision_final || revision !== expectedRevision)
    return { ok: false as const, unauthorized: false as const };
  item.decision = decision;
  item.decision_final = true;
  item.decision_favors = favors;
  data.disputeQueue = data.disputeQueue.filter((candidate) => candidate.id !== id);
  bumpRevision(data, id, revision);
  audit(data, "DISPUTE", id, "DECIDED", staffId, decision);
  return { ok: true as const, unauthorized: false as const };
}

export function decideStanding(
  data: Dataset,
  id: string,
  expectedRevision: number,
  decision: "LIFTED" | "UPHELD",
  note: string,
  staffId = STAFF_REVIEWER_ID,
) {
  const item = data.standingQueue.find((candidate) => candidate.id === id);
  const revision = revisionOf(data, id);
  if (!staffCanAdminister(data, staffId) || !assignedTo(data, id, staffId))
    return { ok: false as const, unauthorized: true as const };
  if (!item || revision !== expectedRevision)
    return { ok: false as const, unauthorized: false as const };
  if (decision === "LIFTED")
    data.standingQueue = data.standingQueue.filter((candidate) => candidate.id !== id);
  bumpRevision(data, id, revision);
  const actorId =
    data.experts.find((candidate) =>
      item.name?.includes(`${candidate.first_name} ${candidate.last_name}`),
    )?.id ??
    data.providers.find((candidate) => candidate.business_name === item.name)?.id ??
    data.patients.find(
      (candidate) => `${candidate.first_name} ${candidate.last_name}` === item.name,
    )?.id ??
    id;
  setAccess(data, actorId, decision === "LIFTED" ? "ACTIVE" : "RESTRICTED");
  audit(data, "STANDING", id, decision, staffId, note);
  return { ok: true as const, unauthorized: false as const };
}

export function provisionStaff(
  data: Dataset,
  staff: StaffAccountRead,
  staffId = STAFF_REVIEWER_ID,
) {
  if (!staffCanAdminister(data, staffId)) return false;
  if (data.staffAccounts.some((item) => item.email.toLowerCase() === staff.email.toLowerCase()))
    return false;
  data.staffAccounts.push(staff);
  setAccess(data, staff.id, "PENDING");
  audit(data, "STAFF", staff.id, "PROVISIONED", staffId, "Temporary password issued once.");
  return true;
}

export function deactivateStaff(
  data: Dataset,
  id: string,
  expectedRevision: number,
  staffId = STAFF_REVIEWER_ID,
) {
  const staff = data.staffAccounts.find((item) => item.id === id);
  const revision = revisionOf(data, id);
  if (!staffCanAdminister(data, staffId) || id === staffId)
    return { ok: false as const, unauthorized: true as const };
  if (!staff || staff.revoked_at || revision !== expectedRevision) return { ok: false as const };
  staff.revoked_at = now().toISOString().slice(0, 19);
  bumpRevision(data, id, revision);
  setAccess(data, id, "RESTRICTED");
  audit(data, "STAFF", id, "DEACTIVATED", staffId, "All sessions revoked.");
  return { ok: true as const, unauthorized: false as const };
}
