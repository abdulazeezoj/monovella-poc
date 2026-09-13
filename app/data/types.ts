/**
 * Types mirroring `Product_Docs/openapi.json` v0.27.0.
 *
 * The prototype has no backend: every screen reads these shapes out of the JSON
 * fixtures in this folder, so what a designer or an investor sees on screen is
 * exactly what the real API would hand a client. Fields are named and typed as
 * the spec names and types them — including `_kobo` integers, naive-UTC
 * timestamps, and `null` where the API allows null.
 */

// ─── Enums (openapi `components.schemas`) ───────────────────────────────────

export type ActivityType = "WALK" | "RUN" | "GYM" | "OTHER";
export type ActorType = "PATIENT" | "EXPERT" | "PHARMACY" | "LAB";
export type AvailabilityStatus = "ONLINE" | "AWAY" | "OUT_OF_OFFICE";
/** How a lab receives a sample during a capacity-managed collection window. */
export type LabCollectionMethod = "BRANCH" | "HOME";
/** A dated change to normally recurring availability. */
export type ScheduleExceptionKind = "UNAVAILABLE" | "EXTRA_HOURS";
export type CalendarItemKind =
  | "LOG_FOOD"
  | "LOG_DRINK"
  | "LOG_CYCLE"
  | "LOG_SYMPTOMS"
  | "LOG_VITALS"
  | "LOG_PHYSICAL_ACTIVITY"
  | "LOG_SLEEP"
  | "INSIGHT"
  | "CONSULTATION"
  | "PRESCRIPTION_FULFILLED"
  | "LAB_RESULT_ATTACHED"
  | "PROVIDER_ORDER_FULFILLED"
  | "PROVIDER_RESULT_UPLOADED";
export type CardVerificationStatus = "CONFIRMING" | "VERIFIED" | "FAILED";
export type ChatMessageType = "TEXT" | "VOICE" | "IMAGE" | "VIDEO" | "SYSTEM";
export type CompanionMessageType = "TEXT" | "VOICE" | "LOG_PROPOSAL" | "SYSTEM";
export type CompanionRole = "USER" | "COMPANION";
export type ConfidenceLevel = "HIGH" | "MODERATE";
/**
 * A second, independent axis from ExpertVerificationStatus/ProviderApplicationStatus
 * — those are the one-time approval gate; this is whether the licence that gate
 * approved is still current.
 */
export type CredentialStatus = "ACTIVE" | "EXPIRING_SOON" | "EXPIRED";
export type ConsultationStatus =
  | "REQUESTED"
  | "SCHEDULED"
  | "DECLINED"
  | "TIMED_OUT"
  | "CANCELLED"
  | "ACTIVE"
  | "COMPLETED";
export type DrinkType = "WATER" | "OTHER";
/** The customer-facing state of a single Nomba-hosted checkout. */
export type CheckoutPaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "REFUND_FAILED"
  | "CHARGED_BACK";
/** A transfer is asynchronous: never treat submission as final settlement. */
export type ProviderPayoutStatus = "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "REVERSED";
/**
 * Whose price a checkout is for. A guest examination creates a distinct
 * disclosed checkout and automated payout, alongside the primary expert's
 * own checkout for the same consultation.
 */
export type FeePayerRole = "PRIMARY" | "GUEST";
export type ExpertSort = "SOONEST_AVAILABLE" | "FEE_ASC" | "FEE_DESC";
export type ExpertVerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type FulfillmentStatus = "UNFILLED" | "FILLED" | "NOT_FILLED";
/**
 * A second expert joining the *same*, already-active consultation for one
 * examination the primary can't do remotely — distinct from a referral,
 * which creates a brand-new, separately-billed consultation.
 */
export type GuestExaminationStatus =
  | "REQUESTED"
  | "AWAITING_PATIENT_PAYMENT"
  | "ACCEPTED"
  | "DECLINED"
  | "COMPLETED";
/** Live voice/video call state for an ACTIVE consultation, layered on top of chat (P44a/X13a). */
export type ConsultationCallState = "NONE" | "RINGING" | "ACTIVE" | "ENDED";
export type ConsultationCallActor = "PATIENT" | "EXPERT";
export type ConsultationCallOutcome =
  | "DECLINED"
  | "MISSED"
  | "CANCELLED"
  | "ENDED"
  | "CONNECTION_FAILED";
export type ConsultationCallConnectionState = "GOOD" | "WEAK" | "RECONNECTING" | "FAILED";
export type ConsultationCallPermission = "PROMPT" | "GRANTED" | "DENIED";
export type Gender = "FEMALE" | "MALE" | "OTHER" | "PREFER_NOT_TO_SAY";
export type GuardianReason = "MINOR" | "HEALTH_CONDITION" | "NO_NIN_YET";
export type InputMode = "TEXT" | "VOICE";
export type InsightType = "OBSERVATION" | "PREDICTION";
export type LabResultStatus = "PENDING" | "ATTACHED";
export type LogCategory =
  | "FOOD"
  | "DRINK"
  | "CYCLE"
  | "SYMPTOMS"
  | "VITALS"
  | "PHYSICAL_ACTIVITY"
  | "SLEEP";
export type LogSource = "FORM" | "COMPANION";
export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
export type PartyType = "PATIENT" | "EXPERT";
export type PatientIdStatus = "UNVERIFIED" | "PROVISIONAL" | "VERIFIED";
/** Prescription and lab-order actions are allow-listed to DOCTOR only —
 * NURSE/PHARMACIST/LAB_SCIENTIST never gain them, per Nigeria's NMCN/PCN/
 * MLSCN scope-of-practice rules (Market_Research.md, assumed/advisor-
 * informed). Adding a professional type here does not grant it those
 * actions — each gate checks `=== "DOCTOR"` explicitly. */
export type ProfessionalType =
  | "DOCTOR"
  | "PHYSIOTHERAPIST"
  | "NURSE"
  | "PHARMACIST"
  | "LAB_SCIENTIST";
export type ProviderApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ProviderOrderStatus =
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "OUT_FOR_DELIVERY"
  | "FULFILLED"
  | "MISSED_COLLECTION";
export type ProviderRequestStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "CANCELLED"
  | "WITHDRAWN"
  | "UNABLE_TO_FULFIL"
  | "OBSOLETE";
export type ProviderResultStatus =
  | "AWAITING"
  | "DELAYED"
  | "PHYSICAL_COPY_ONLY"
  | "INCORRECT_FILE"
  | "UPLOADED"
  | "CORRECTED";
export type ProviderType = "SPECIALIST" | "PHARMACY" | "LAB";
export type ProviderDisclosureAuthority = "SELF" | "GUARDIAN";
export type ProviderDisclosurePurpose = "PRESCRIPTION_FULFILMENT" | "LAB_TEST_FULFILMENT";
export type RefundReason = "NON_PERFORMANCE";
export type CancellationActor = "PATIENT" | "EXPERT" | "STAFF";
export type ConsultationCloseoutReason =
  | "CLINICAL_COMPLETION"
  | "FAILED_CALL_CHAT_COMPLETED"
  | "PATIENT_CANCELLED"
  | "EXPERT_CANCELLED"
  | "PATIENT_NO_SHOW"
  | "EXPERT_NO_SHOW"
  | "WINDOW_ELAPSED";
export type ConsultationRefundOutcome = "NOT_ELIGIBLE" | "ELIGIBLE" | "PENDING" | "REFUNDED";
export type ConsultationPayoutOutcome = "NOT_EARNED" | "PENDING" | "PAYABLE" | "PAID" | "WITHHELD";
/** INITIAL for a first application; RENEWAL for a licence renewal submitted from X24/V15. */
export type RequestKind = "INITIAL" | "RENEWAL";
export type ReportScope = "CONSULTATION" | "FULL_HISTORY" | "DATE_RANGE";
export type ReportStatus = "GENERATING" | "READY" | "FAILED" | "REVOKED";
export type Specialty =
  | "GENERAL_PRACTICE"
  | "DERMATOLOGY"
  | "PHYSIOTHERAPY"
  | "PEDIATRICS"
  | "OBSTETRICS_GYNECOLOGY"
  | "CARDIOLOGY"
  | "ENDOCRINOLOGY"
  | "GASTROENTEROLOGY"
  | "NEUROLOGY"
  | "PSYCHIATRY"
  | "ORTHOPEDICS"
  | "OTORHINOLARYNGOLOGY"
  | "OPHTHALMOLOGY"
  | "UROLOGY"
  | "NEPHROLOGY"
  | "PULMONOLOGY"
  | "INFECTIOUS_DISEASE"
  | "GENERAL_SURGERY"
  | "CHRONIC_DISEASE_MONITORING"
  | "WOUND_CARE_GUIDANCE"
  | "MATERNAL_CHILD_HEALTH"
  | "POST_OP_FOLLOW_UP"
  | "MEDICATION_THERAPY_MANAGEMENT"
  | "OTC_WELLNESS_COUNSELING"
  | "RESULT_INTERPRETATION_REFERRAL";
export type StaffRole = "PLATFORM_ADMIN";
export type StandingEventType =
  | "DECLINED_BOOKING"
  | "NON_PERFORMANCE"
  | "FALSE_PAYMENT_CLAIM"
  | "UNMERITED_DISPUTE"
  | "CREDENTIAL_EXPIRED";
export type VitalType = "BLOOD_PRESSURE" | "TEMPERATURE" | "WEIGHT" | "HEART_RATE";
export type WorkdayImpactAnswer = "YES" | "NO" | "DISMISSED";

// ─── Identity ───────────────────────────────────────────────────────────────

export interface PatientRead {
  id: string;
  monovella_id: string;
  first_name: string | null;
  last_name: string | null;
  status: PatientIdStatus;
  date_of_birth: string;
  gender: Gender;
  is_dependant: boolean;
  guardian_user_id: string | null;
  guardian_reason: GuardianReason | null;
  verified_at: string | null;
  created_at: string;
  /** Private residential location, captured at P12 and never shown in the public directory. */
  address: string;
  city: string;
  local_government_area: string;
  state: string;
  /** Set via the photo-upload-url flow (P58a); null until the account uploads one. */
  photo_url: string | null;
}

export type ClinicalSafetyAnswer = "REPORTED" | "NONE_KNOWN" | "NOT_SURE" | "DECLINED";
export type ClinicalSafetySource = "PATIENT" | "GUARDIAN";

export interface ReportedAllergyRead {
  substance: string;
  reaction: string;
}

/**
 * Append-only patient-supplied safety context. This is an assumed prototype
 * minimum pending qualified clinical governance, not a diagnosis or automated
 * interaction check.
 */
export interface ClinicalSafetyContextRead {
  id: string;
  patient_id: string;
  version: number;
  source: ClinicalSafetySource;
  supplied_by_user_id: string;
  allergies_answer: ClinicalSafetyAnswer;
  reported_allergies: ReportedAllergyRead[];
  medicines_answer: ClinicalSafetyAnswer;
  current_medicines: string[];
  additional_context: string | null;
  confirmed_at: string;
  supersedes_id: string | null;
  correction_reason: string | null;
}

export interface PatientReferralCodeRead {
  /** One code per patient. The API scopes this to the caller and omits it. */
  patient_id: string;
  referral_code: string;
  referral_link: string;
  converted_count: number;
}

export interface DeviceSessionRead {
  id: string;
  is_current: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export type ConsentPurpose =
  | "GENERAL_TERMS"
  | "PRIVACY_NOTICE"
  | "NIN_VERIFICATION"
  | "TELEMEDICINE"
  | "EXPERT_REFERRAL"
  | "PHARMACY_DISCLOSURE"
  | "LAB_DISCLOSURE"
  /** A guardian consenting to Monovella holding and disclosing a dependant's
   * record for care. Captured when the dependant is added, never per read, so a
   * treating expert is never blocked mid-care waiting on a parent. It is not the
   * lawful basis for that disclosure: NDPA s.30(1)(g) and NHA s.27 are, which is
   * what stops a withdrawal leaving a doctor treating a child blind. */
  | "DEPENDANT_RECORD_CARE";

/** Append-only acknowledgement and purpose-consent evidence. */
export interface ConsentRecordRead {
  id: string;
  acting_user_id: string;
  patient_id: string | null;
  actor_capacity: "ACCOUNT_HOLDER" | "GUARDIAN";
  guardian_relationship: string | null;
  purpose: ConsentPurpose;
  document_or_statement_version: string;
  action: "ACKNOWLEDGED" | "CONSENTED" | "WITHDRAWN" | "REPLACED";
  occurred_at: string;
  care_event_id: string | null;
  replaces_entry_id: string | null;
  withdrawn_entry_id: string | null;
}

export type CareAccessGranteeType = "EXPERT" | "GUEST_EXPERT" | "PHARMACY" | "LAB" | "STAFF";
export type CareAccessGrantScope =
  | "REQUEST_SUMMARY"
  | "PURPOSE_HISTORY"
  | "ENCOUNTER_RECORD"
  | "GUEST_EXAM_CONTEXT"
  | "FULFILMENT_FIELDS"
  | "OPERATIONAL_CASE";

/** Data-minimised, append-only grant lifecycle. Retention is not browsing authority. */
export interface CareAccessGrantRead {
  id: string;
  patient_identity_id: string;
  grantee_type: CareAccessGranteeType;
  grantee_id: string;
  care_event_id: string;
  purpose: string;
  scope: CareAccessGrantScope;
  /** An ordinary grant opened by accepting a consultation, or a break-glass one
   * an expert opened without it. */
  grant_source: "CARE_EVENT" | "EMERGENCY";
  status: "CURRENT" | "ENDED";
  granted_at: string;
  ended_at: string | null;
  end_reason: string | null;
}

export type HistorySection =
  | "ALLERGIES"
  | "DIAGNOSES"
  | "PRESCRIPTIONS"
  | "LAB_RESULTS"
  | "ENCOUNTERS";

/**
 * One expert opening one patient's history.
 *
 * A `CareAccessGrantRead` records that access was permitted. This records that
 * it was used, which is the thing the expert is answerable for and the thing
 * the patient sees in P69.
 */
export interface HistoryReadEventRead {
  id: string;
  expert_id: string;
  patient_identity_id: string;
  care_event_id: string;
  sections: HistorySection[];
  route: "NORMAL" | "EMERGENCY";
  read_at: string;
}

/** The root identity a phone number resolves to — Patient and Expert contexts share one. */
export interface UserRead {
  id: string;
  phone: string;
  recovery_email: string | null;
  recovery_email_verified_at: string | null;
  has_patient_identity: boolean;
  has_expert_identity: boolean;
  biometric_enabled: boolean;
  /** Auditable prototype state. No deletion worker or retention process runs here. */
  closure_status: "ACTIVE" | "CLOSURE_REQUESTED";
  closure_requested_at: string | null;
  created_at: string;
}

/** Which actor a per-actor settings row belongs to. Polymorphic across User,
 * Provider and StaffAccount, so it carries no foreign key. */
export type NotificationScope = "PATIENT" | "EXPERT" | "PHARMACY" | "LAB" | "STAFF";
export type TwoFactorSubjectType = "USER" | "PROVIDER" | "STAFF";

/** The settings that are meaningful for the signed-in role; irrelevant keys are null.
 * One row per (scope, subject) — the API scopes this to the caller and omits both. */
export interface NotificationPreferenceRead {
  id: string;
  scope: NotificationScope;
  subject_id: string;
  appointment_reminders: boolean | null;
  incoming_request_alerts: boolean | null;
  payment_fee_updates: boolean | null;
  credential_licence_reminders: boolean | null;
  queue_overdue_alerts: boolean | null;
  product_updates: boolean | null;
}

/**
 * Planning contract for a TOTP factor. The static prototype never generates,
 * stores, or displays a real authentication secret or recovery code.
 */
export interface TwoFactorSettingsRead {
  id: string;
  subject_type: TwoFactorSubjectType;
  subject_id: string;
  enabled: boolean;
  method: "TOTP" | null;
  recovery_codes_remaining: number;
}

// ─── Experts ────────────────────────────────────────────────────────────────

/** Scoped per ProfessionalType — GP/SPECIALIST/SUPER_SPECIALIST apply to DOCTOR; every other type uses GENERAL. */
export type CredentialTier = "GP" | "SPECIALIST" | "SUPER_SPECIALIST" | "GENERAL";

/** The patient-facing view of one ExpertCredential — enough to pick a tier and see its price at P37/P39. */
export interface ExpertCredentialSummary {
  id: string;
  tier: CredentialTier;
  specialty: Specialty;
  consultation_fee_kobo: number;
}

/** One verified (or pending) credential on an expert account (X1's first application, or an X1a addition). */
export interface ExpertCredential {
  id: string;
  professional_type: ProfessionalType;
  tier: CredentialTier;
  specialty: Specialty;
  licence_or_fellowship_number: string;
  verification_status: ExpertVerificationStatus;
  credential_status?: CredentialStatus | null;
  expiry_date?: string | null;
  verified_at?: string | null;
  consultation_fee_kobo: number;
  /** A verified credential can be retired from new bookings without erasing its audit history. */
  retired_at?: string | null;
}

export interface ExpertRead {
  id: string;
  first_name: string;
  last_name: string;
  professional_type: ProfessionalType;
  /** The specialty of this expert's primary credential (credentials[0]) — what the directory filters and sorts on. */
  specialty: Specialty;
  gender: Gender;
  availability_status: AvailabilityStatus;
  /** The fee of this expert's primary credential (credentials[0]) — the directory's headline figure. */
  consultation_fee_kobo: number;
  /**
   * Every credential this expert holds — a patient picks one at P37/P39
   * before booking. The real API's ExpertRead only carries the lighter
   * ExpertCredentialSummary shape here (see openapi.json); the prototype
   * uses the fuller ExpertCredential everywhere so X4 (the expert's own
   * home, reading this same fixture array) can additionally show each
   * credential's verification_status/credential_status/expiry — patient-
   * facing screens (P36/P37/P39) only ever read tier/specialty/fee off it.
   */
  credentials: ExpertCredential[];
  next_available_start: string | null;
  /** Practice location collected at X1. Patient discovery still only uses state. */
  address: string;
  city: string;
  local_government_area: string;
  state: string | null;
  /** Prototype-only: short practice biography shown on P37. Not in the API. */
  bio?: string;
  /** Prototype-only: years since MDCN registration, shown on P37. */
  years_practising?: number;
  /** Prototype-only: MDCN/MRTB licence number surfaced on P37's credentials block. */
  licence_number?: string;
  /** Set via the photo-upload-url flow (P58a/X4a); null until the account uploads one. */
  photo_url: string | null;
}

export interface ExpertScheduleSlotRead {
  id: string;
  expert_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  /** Prototype-only: how many appointments already sit inside this block (X7). */
  booked_count?: number;
  /** How many appointments this slot can hold — always 1 for an expert's one-to-one
   * consultation slots (a video/audio consultation is one patient with one expert);
   * kept here for schema parity since the same slot concept extends to
   * ProviderScheduleSlotRead, where more than one per block is normal (V9). */
  capacity: number;
}

/**
 * A dated change to the expert's recurring hours. UNAVAILABLE removes only
 * unbooked supply; EXTRA_HOURS adds supply on one specific date.
 */
export interface ExpertScheduleExceptionRead {
  id: string;
  expert_id: string;
  date: string;
  kind: ScheduleExceptionKind;
  start_time: string | null;
  end_time: string | null;
  note: string;
}

export interface ExpertAvailabilitySlotRead {
  id: string;
  expert_id: string;
  start: string;
  end: string;
  taken?: boolean;
}

/**
 * The recurring rules that turn an expert's working-hours blocks into dated
 * one-to-one consultation slots. These are operational preferences, not
 * clinical-duration recommendations.
 */
export interface ExpertSchedulingRulesRead {
  expert_id: string;
  appointment_duration_minutes: number;
  buffer_minutes: number;
  minimum_notice_minutes: number;
  max_bookings_per_day: number;
}

export interface ExpertPayoutDetailsRead {
  /** One payout destination per expert. The API scopes this to the caller and omits it. */
  expert_id: string;
  payout_bank_account_number: string | null;
  payout_bank_code: string | null;
  /** Returned by Nomba bank-account lookup; never user-typed. */
  payout_account_name: string | null;
  /** Null while the recipient lookup is pending or failed. */
  payout_verified_at: string | null;
  payout_ussd_string: string | null;
  payout_payment_link: string | null;
  updated_at: string;
}

export interface ExpertApplicationDetail {
  id: string;
  account_id: string;
  status: ExpertVerificationStatus;
  /** INITIAL when omitted — most rows are a first application, not a renewal. */
  request_kind?: RequestKind;
  licence_number: string;
  licence_expiry_date?: string | null;
  /** Set only when request_kind is RENEWAL, so B8 can show old vs. new. */
  prior_licence_expiry_date?: string | null;
  /** Only meaningful once status is VERIFIED — computed from licence_expiry_date. */
  credential_status?: CredentialStatus;
  indemnity_certificate_flagged: boolean;
  rejection_reason: string | null;
  submitted_at: string;
  decided_at: string | null;
  first_name?: string;
  last_name?: string;
  professional_type?: ProfessionalType;
  specialty?: Specialty;
  consultation_fee_kobo?: number;
  email?: string;
  indemnity_certificate_url?: string;
}

export interface ExpertPayoutHistoryRead {
  id: string;
  expert_id: string;
  payout_bank_account_number: string | null;
  payout_bank_code: string | null;
  payout_account_name?: string | null;
  payout_verified_at?: string | null;
  payout_ussd_string: string | null;
  payout_payment_link: string | null;
  changed_at: string;
}

// ─── Consultations ──────────────────────────────────────────────────────────

export interface ConsultationRead {
  id: string;
  expert_id: string;
  patient_identity_id: string;
  status: ConsultationStatus;
  platform_fee_kobo: number;
  expert_fee_kobo: number;
  /** Which of the expert's credentials this booking was made against — null pre-dates multi-credential experts. */
  credential_id?: string | null;
  /** Denormalized from credential_id so history stays legible even if the expert's credentials change later. */
  tier?: CredentialTier | null;
  /** Set by inviting a guest expert into this same consultation (X25) — the primary (expert_id) stays in charge throughout. */
  guest_expert_id?: string | null;
  guest_examination_status?: GuestExaminationStatus | null;
  guest_examination_reason?: string | null;
  /**
   * Snapshotted from the guest's own consultation_fee_kobo when they accept.
   * The patient receives a second disclosed checkout for this price plus the
   * service fee; the guest is paid through their verified payout account.
   */
  guest_expert_fee_kobo?: number | null;
  /** Set by POST .../call/token and .../call/end (P44a/X13a). Null on a consultation that has never had a call attempt. */
  call_state?: ConsultationCallState | null;
  call_initiated_by?: ConsultationCallActor | null;
  call_started_at?: string | null;
  call_answered_at?: string | null;
  call_ended_at?: string | null;
  call_ring_expires_at?: string | null;
  call_outcome?: ConsultationCallOutcome | null;
  call_token_version?: number | null;
  call_token_expires_at?: string | null;
  call_connection_state?: ConsultationCallConnectionState | null;
  patient_call_muted?: boolean | null;
  expert_call_muted?: boolean | null;
  patient_call_camera_on?: boolean | null;
  expert_call_camera_on?: boolean | null;
  patient_call_device?: string | null;
  expert_call_device?: string | null;
  patient_microphone_permission?: ConsultationCallPermission | null;
  patient_camera_permission?: ConsultationCallPermission | null;
  expert_microphone_permission?: ConsultationCallPermission | null;
  expert_camera_permission?: ConsultationCallPermission | null;
  requested_at: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  respond_by: string | null;
  referred_from_id: string | null;
  referral_reason: string | null;
  referral_chain_depth: number | null;
  telemedicine_consent_at: string | null;
  referral_disclosure_ack_at: string | null;
  completed_at: string | null;
  cancelled_at?: string | null;
  cancelled_by?: CancellationActor | null;
  cancellation_reason?: string | null;
  /** One immutable terminal decision, shared across both roles and safe to retry. */
  closeout_reason?: ConsultationCloseoutReason | null;
  closed_by?: CancellationActor | null;
  closed_at?: string | null;
  closeout_version?: number | null;
  slot_released_at?: string | null;
  patient_joined_at?: string | null;
  expert_joined_at?: string | null;
  refund_outcome?: ConsultationRefundOutcome | null;
  payout_outcome?: ConsultationPayoutOutcome | null;
  clinical_safety_context_id?: string | null;
  clinical_safety_context_version?: number | null;
  clinical_safety_acknowledged_at?: string | null;
  clinical_safety_acknowledged_by_expert_id?: string | null;
  workday_impact_answer: WorkdayImpactAnswer | null;
  responded_at: string | null;
  /**
   * Patient-confirmed snapshot shown only to the chosen expert before acceptance.
   * Null is retained only for legacy fixtures and referrals, which disclose referral_reason.
   */
  request_summary: string | null;
}

export type SoapSection = "SUBJECTIVE" | "OBJECTIVE" | "ASSESSMENT" | "PLAN";
/** PHOTO is captured/uploaded; DRAWING comes from X14's own stylus canvas. Both stored identically. */
export type SoapAttachmentKind = "PHOTO" | "DRAWING";
/** A lightweight content check, not a moderation queue — see openapi.json for the full description. */
export type SoapAttachmentVerificationStatus = "PENDING" | "VALID" | "FLAGGED";

export interface SoapAttachment {
  id: string;
  section: SoapSection;
  kind: SoapAttachmentKind;
  media_url: string;
  verification_status: SoapAttachmentVerificationStatus;
  flagged_reason: string | null;
  created_at: string;
}

export interface GuestObjectiveContribution {
  expert_id: string;
  text: string;
  submitted_at: string;
}

export interface SoapNoteRead {
  consultation_id: string;
  subjective: string | null;
  objective: string | null;
  /** A guest expert's own examination findings (X27) — attributed, never merged into objective. */
  guest_objective_contribution?: GuestObjectiveContribution | null;
  assessment: string | null;
  plan: string | null;
  /** Combinable with each section's typed text — never a replacement for it. */
  attachments?: SoapAttachment[];
  finalized_at: string | null;
}

export interface PrescriptionDetailRead {
  id: string;
  consultation_id: string;
  medication: string;
  dosage: string;
  instructions: string;
  issued_at: string;
  corrects_id: string | null;
  corrected_by_id: string | null;
  fulfillment_status: FulfillmentStatus | null;
  filled_at: string | null;
  pharmacy_name: string | null;
  paid_note: string | null;
  /** Patient-selected attachment metadata; the prototype does not store file contents. */
  receipt_file_name?: string | null;
  /** Exact patient-supplied safety-context version acknowledged before issue. */
  clinical_safety_context_id?: string | null;
  clinical_safety_context_version?: number | null;
}

export interface LabOrderDetailRead {
  id: string;
  consultation_id: string;
  test_requested: string;
  instructions: string | null;
  recommended_lab_id: string | null;
  issued_at: string;
  corrects_id: string | null;
  corrected_by_id: string | null;
  result_status: LabResultStatus | null;
  result_at: string | null;
  result_summary: string | null;
  /** Provider-supplied result provenance retained for patient and ordering expert views. */
  result_source?: string | null;
  result_file_name?: string | null;
  result_corrected_at?: string | null;
  paid_note: string | null;
}

export interface ChatMessageRead {
  id: string;
  consultation_id: string;
  sender_type: PartyType;
  type: ChatMessageType;
  body: string | null;
  media_url: string | null;
  sent_at: string;
  /** Prototype-only: voice-note length, rendered on the bubble. */
  duration_seconds?: number;
}

// ─── Logging, calendar, insight, companion ──────────────────────────────────

export interface LogEntryDetailRead {
  id: string;
  patient_id: string;
  category: LogCategory;
  source: LogSource;
  logged_at: string;
  updated_at: string;
  supersedes: string | null;
  is_estimate: boolean;
  note: string | null;
  label?: string | null;
  meal_type?: MealType | null;
  drink_type?: DrinkType | null;
  count?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  flow_intensity?: number | null;
  symptom_ids?: string[] | null;
  /** Patient-entered symptom labels, resolved by the planned server catalogue. */
  custom_symptoms?: string[] | null;
  severity?: number | null;
  vital_type?: VitalType | null;
  systolic?: number | null;
  diastolic?: number | null;
  value?: number | null;
  activity_type?: ActivityType | null;
  duration_minutes?: number | null;
  sleep_start_time?: string | null;
  sleep_end_time?: string | null;
}

export interface CalendarItem {
  kind: CalendarItemKind;
  reference_id: string;
  occurred_at: string;
  summary: string;
}

export interface InsightRead {
  id: string;
  patient_id: string;
  type: InsightType;
  observation: string;
  reasoning: string;
  occurred_at: string;
  source_log_entries: string[];
  dismissed_at: string | null;
}

export interface CompanionMessageRead {
  id: string;
  /** Immutable patient scope for this conversation row. */
  patient_id: string;
  seq: number;
  role: CompanionRole;
  type: CompanionMessageType;
  body: string | null;
  item: Record<string, string> | null;
  pending_confirmation: boolean;
  sent_at: string;
  /** Populated only on the shared emergency guidance reply; null on ordinary messages. */
  emergency_routing: EmergencyRoutingOutcome | null;
}

export interface CompanionMemoryRead {
  id: string;
  /** Immutable patient scope for this remembered note. */
  patient_id: string;
  note: string;
  keywords: string[];
  confirmed_at: string | null;
  dismissed_at: string | null;
}

export interface SpecialtyMatchCandidate {
  specialty: Specialty;
  confidence: ConfidenceLevel;
}

/**
 * One non-clinical safety outcome shared by P35, P39 and Teni.
 * It directs the patient out of the online path and is not a diagnosis,
 * severity assessment, monitoring promise or emergency dispatch record.
 */
export interface EmergencyRoutingOutcome {
  outcome: "POSSIBLE_EMERGENCY";
  message: string;
  next_action: "SEEK_IMMEDIATE_IN_PERSON_CARE";
  emergency_phone: "112";
}

export interface SpecialtyMatchResponse {
  emergency_routing: EmergencyRoutingOutcome | null;
  matches: SpecialtyMatchCandidate[] | null;
  fallback_to_general_practice: boolean;
}

// ─── Providers (pharmacy + lab) ─────────────────────────────────────────────

/** A provider-managed, patient-visible indicative price for one lab service. */
export interface ProviderServiceFee {
  service: string;
  fee_kobo: number;
}

export interface ProviderDirectoryRead {
  id: string;
  provider_type: ProviderType;
  business_name: string;
  /** Taking-new-work state, distinct from verification and opening hours. */
  availability_status: AvailabilityStatus;
  distance_km: number | null;
  services_offered: string[] | null;
  /** Lab-only service prices. They are illustrative until a patient receives a specific order. */
  service_fees?: ProviderServiceFee[] | null;
  /** Prototype-only: the plain note a pharmacy sets on its own profile (P46b). */
  profile_note?: string;
  premises_address?: string;
  city?: string;
  local_government_area?: string;
  state?: string;
  /** Editable on V14 (Business Profile) — never business_name/cac/licence, which need re-verification. */
  contact_name?: string;
  contact_phone?: string;
  /** Bank destination paid by Monovella after a verified checkout; never shown to patients. */
  payout_bank_account_number?: string | null;
  payout_bank_code?: string | null;
  payout_account_name?: string | null;
  payout_verified_at?: string | null;
  /** Editable on V14. The business's logo shown in the directory and on receipts; null until uploaded. */
  logo_url?: string | null;
  /** Verified application details. They are displayed but never edited on V14. */
  cac_number?: string;
  license_number?: string;
}

/** A Pharmacy or Lab document submitted for verification on V14a. */
export interface ProviderCredentialRead {
  id: string;
  provider_id: string;
  credential_type: "OPERATING_LICENCE" | "CERTIFICATION";
  title: string;
  reference_number: string;
  document_filename: string;
  expires_at: string | null;
  verification_status: "PENDING" | "VERIFIED" | "REJECTED";
  verified_at: string | null;
  /** Retired records remain auditable but are not presented as current. */
  retired_at: string | null;
}

export interface ProviderDisclosureConsentRead {
  readonly id: string;
  readonly actor_user_id: string;
  readonly patient_identity_id: string;
  readonly authority: ProviderDisclosureAuthority;
  readonly guardian_reason: GuardianReason | null;
  readonly purpose: ProviderDisclosurePurpose;
  readonly statement_version: "provider-disclosure-v1";
  readonly information_shared: readonly string[];
  readonly consented_at: string;
}

export interface ProviderRequestRead {
  id: string;
  provider_type: ProviderType;
  provider_id: string;
  status: ProviderRequestStatus;
  requested_at: string;
  respond_by: string | null;
  responded_at: string | null;
  decline_reason: string | null;
  order_status: ProviderOrderStatus | null;
  delivery_or_pickup: string | null;
  delivery_note: string | null;
  slot_id: string | null;
  result_status: ProviderResultStatus | null;
  /** Prototype-only linkage so a screen can walk back to what was requested. */
  prescription_id?: string | null;
  lab_order_id?: string | null;
  consultation_id?: string;
  patient_identity_id?: string;
  amount_kobo?: number;
  original_amount_kobo?: number | null;
  price_changed_at?: string | null;
  terminal_reason?: string | null;
  capacity_released_at?: string | null;
  checkout_payment_id?: string | null;
  result_summary?: string | null;
  result_file_name?: string | null;
  result_source?: string | null;
  result_uploaded_at?: string | null;
  result_corrected_at?: string | null;
  /** Immutable snapshot of the disclosure consent captured before this request was sent. */
  readonly disclosure_consent: ProviderDisclosureConsentRead;
}

export interface ProviderScheduleSlotRead {
  id: string;
  provider_id: string;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  /** Branch and home collection are deliberately separate capacity pools. */
  collection_method: LabCollectionMethod;
  /** Precomputed gate patient-facing screens (P47d) filter on: booked_count >= capacity. */
  taken?: boolean;
  /** How many patients this test slot can accept — e.g. 4 walk-in samples in one morning block. Defaults to 1. */
  capacity?: number;
  /** Prototype-only: how many bookings already sit inside this slot (V9). */
  booked_count?: number;
}

/** A dated Lab closure, optionally limited to a collection method or time range. */
export interface ProviderScheduleExceptionRead {
  id: string;
  provider_id: string;
  date: string;
  kind: "UNAVAILABLE";
  start_time: string | null;
  end_time: string | null;
  collection_method: LabCollectionMethod | null;
  note: string;
}

export interface ProviderHomeRead {
  new_requests_count: number;
  in_progress_count: number;
  standing_restricted: boolean;
  /** Drives V5's expiring-soon/expired licence banner. */
  credential_status?: CredentialStatus | null;
  license_expiry_date?: string | null;
}

export interface ProviderApplicationDetail {
  id: string;
  provider_type: ProviderType;
  status: ProviderApplicationStatus;
  /** INITIAL when omitted — most rows are a first application, not a renewal. */
  request_kind?: RequestKind;
  business_name: string | null;
  cac_number: string | null;
  cac_verified_at: string | null;
  license_number: string | null;
  license_expiry_date?: string | null;
  /** Set only when request_kind is RENEWAL, so B8 can show old vs. new. */
  prior_license_expiry_date?: string | null;
  license_document_url: string | null;
  license_document_flagged: boolean | null;
  license_verified_at: string | null;
  license_verification_note: string | null;
  premises_address: string | null;
  city?: string | null;
  local_government_area?: string | null;
  state?: string | null;
  prior_rejection_reason: string | null;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  submitted_at?: string;
  services_offered?: string[] | null;
}

// ─── Money, disputes, refunds ───────────────────────────────────────────────

export interface PaymentMethodRead {
  id: string;
  brand: string;
  last4: string;
  expiry_month: number;
  expiry_year: number;
  verified_at: string;
}

/** One hosted checkout for the transparent patient total: provider price plus service fee. */
export interface CheckoutPaymentRead {
  id: string;
  consultation_id: string | null;
  provider_request_id: string | null;
  provider_id: string;
  provider_type: ProviderType;
  total_amount_kobo: number;
  provider_amount_kobo: number;
  commission_amount_kobo: number;
  method: "CARD" | "TRANSFER";
  status: CheckoutPaymentStatus;
  nomba_order_reference: string;
  paid_at: string | null;
  refunded_at: string | null;
  refund_method?: string | null;
  /** PRIMARY includes a direct or referred consultation; GUEST is the additional examination. */
  payer_role?: FeePayerRole;
  /** The patient receiving care and the account that authorised payment may differ for dependant care. */
  patient_id?: string;
  payer_user_id?: string;
}

/** A provider-side record of the bank transfer generated by a paid checkout. */
export interface ProviderPayoutRead {
  id: string;
  checkout_payment_id: string;
  provider_id: string;
  provider_type: ProviderType;
  amount_kobo: number;
  status: ProviderPayoutStatus;
  bank_account_last4: string;
  bank_code: string;
  account_name: string;
  transfer_reference: string | null;
  initiated_at: string | null;
  completed_at: string | null;
  failure_reason: string | null;
}

export type PayoutSupportRequestStatus = "OPEN" | "RETRYING" | "REVERSED";

/** An expert's support case for a failed automated payout, separate from checkout disputes. */
export interface PayoutSupportRequestRead {
  id: string;
  payout_id: string;
  expert_id: string;
  details: string;
  status: PayoutSupportRequestStatus;
  raised_at: string;
  review_due_by: string;
  overdue: boolean;
  due_soon: boolean;
  retry_requested_at: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
}

export interface PaymentDisputeRead {
  id: string;
  raised_by: ActorType;
  raised_at: string;
  decision_due_by: string | null;
  decision: string | null;
  decision_final: boolean;
  consultation_id?: string | null;
  provider_request_id?: string | null;
  provider_type?: ProviderType;
  decision_favors?: "PATIENT" | "PROVIDER" | null;
}

export interface RefundRequestRead {
  id: string;
  consultation_id: string;
  checkout_payment_id: string;
  patient_id: string;
  reason: RefundReason;
  filed_at: string;
  decision_due_by: string | null;
  decided_at: string | null;
  decision: string | null;
  decision_final: boolean;
  refund_issued: boolean | null;
  elaboration?: string | null;
}

export type ClinicalComplaintStatus = "OPEN" | "UNDER_REVIEW" | "CLOSED" | "APPEALED";
export type ClinicalComplaintTriage =
  | "UNASSESSED"
  | "ROUTINE"
  | "URGENT_SAFETY"
  | "IMMEDIATE_EMERGENCY";

export interface ClinicalComplaintAuditEvent {
  at: string;
  actor_type: "PATIENT" | "STAFF";
  action: string;
  note: string | null;
}

export interface ClinicalComplaintPatientUpdate {
  at: string;
  message: string;
}

/** A clinical-safety referral. It is never a refund or checkout dispute. */
export interface ClinicalComplaintReferral {
  id: string;
  consultation_id: string;
  patient_id: string;
  filed_by_user_id: string;
  details: string;
  status: ClinicalComplaintStatus;
  triage: ClinicalComplaintTriage;
  filed_at: string;
  expected_response_by: string;
  assigned_staff_id: string | null;
  reviewed_at: string | null;
  resolved_at: string | null;
  outcome: string | null;
  attachment_name: string | null;
  escalated_at: string | null;
  audit_history: ClinicalComplaintAuditEvent[];
  patient_updates: ClinicalComplaintPatientUpdate[];
  overdue: boolean;
  due_soon: boolean;
}

export interface ReportRead {
  id: string;
  patient_id: string;
  scope: ReportScope;
  status: ReportStatus;
  consultation_id: string | null;
  start_date: string | null;
  end_date: string | null;
  requested_at: string;
  ready_at: string | null;
  pdf_url: string | null;
  verification_code: string | null;
  revoked_at: string | null;
}

// ─── Back office ────────────────────────────────────────────────────────────

export interface QueueCounts {
  total: number;
  overdue: number;
  due_soon: number;
}

export interface ConsoleHomeRead {
  applications: QueueCounts;
  payment_disputes: QueueCounts;
  refund_requests: QueueCounts;
  standing_cases: QueueCounts;
  clinical_complaints: QueueCounts;
}

export interface ProviderApplicationQueueItem {
  id: string;
  provider_type: ProviderType;
  name: string;
  verification_status: string;
  /** INITIAL when omitted — most rows are a first application, not a renewal. */
  request_kind?: RequestKind;
  review_due_by: string | null;
  overdue: boolean;
  due_soon: boolean;
  submitted_at?: string;
}

export interface PaymentDisputeQueueItem {
  id: string;
  raised_by: ActorType;
  provider_type: ProviderType;
  decision_due_by: string | null;
  overdue: boolean;
  due_soon: boolean;
  amount_kobo?: number;
  raised_at?: string;
  subject?: string;
}

export interface RefundRequestQueueItem {
  id: string;
  consultation_id: string;
  checkout_payment_id: string;
  patient_id: string;
  reason: RefundReason;
  filed_at: string;
  overdue: boolean;
  due_soon: boolean;
  amount_kobo: number;
}

export interface StandingQueueItem {
  id: string;
  actor_type: ActorType;
  standing_suspended_at: string;
  events: StandingEventType[];
  /** A case open past the standard review SLA — mirrors overdue/due_soon on
   * the other three queues, so all four can sort/badge the same way. */
  overdue: boolean;
  due_soon: boolean;
  name?: string;
  event_log?: { type: StandingEventType; occurred_at: string; detail: string }[];
  /** Present only when one credential-expiry standing case is tied to one renewal review. */
  linked_application_id?: string | null;
}

export interface StaffAccountRead {
  id: string;
  name: string;
  email: string;
  /** A staff member may keep their operational contact number current on B23. */
  phone: string;
  role: StaffRole;
  revoked_at: string | null;
  must_change_password: boolean;
  /** Editable by the staff member themself on B23 (My Profile); null until uploaded. */
  photo_url?: string | null;
}

export type GovernanceSubject = "APPLICATION" | "DISPUTE" | "STANDING" | "STAFF";
export type GovernanceAction =
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "DECIDED"
  | "LIFTED"
  | "UPHELD"
  | "PROVISIONED"
  | "DEACTIVATED"
  | "AUTO_LIFTED";

export interface GovernanceAuditEventRead {
  id: string;
  subject_type: GovernanceSubject;
  subject_id: string;
  action: GovernanceAction;
  /** Null where the platform acted on its own, not a person. */
  actor_id: string | null;
  occurred_at: string;
  note: string | null;
}

export interface GovernanceApplicationLinkRead {
  application_id: string;
  application_kind: "INITIAL" | "ADDITIONAL_CREDENTIAL" | "LICENCE_RENEWAL";
  /** The expert or provider who applied. Null where only the queue row survives. */
  actor_id: string | null;
  target_credential_id: string | null;
  submitted_credential_id: string | null;
  licence_number: string;
  expiry_date: string;
  revision: number;
  assigned_staff_id: string;
}

export type GovernanceAccessStatus = "PENDING" | "ACTIVE" | "RESTRICTED" | "REJECTED";

/**
 * Whether one actor may currently act on the platform. The actor is an expert,
 * a provider or a staff member, so `actor_id` points into one of three tables
 * and cannot carry a foreign key.
 */
export interface GovernanceAccessRead {
  actor_id: string;
  status: GovernanceAccessStatus;
}

/**
 * The optimistic-concurrency counter for one governance subject. A decision
 * carries the revision it was taken against and is refused as a conflict once
 * the stored revision has moved on.
 */
export interface GovernanceRevisionRead {
  subject_id: string;
  revision: number;
}

/** The one active staff reviewer who may open or mutate a governance subject. */
export interface GovernanceAssignmentRead {
  subject_id: string;
  staff_id: string;
}

// ─── Customer support, privacy and feedback ────────────────────────────────

export type SupportRequesterRole = "PATIENT" | "EXPERT" | "PHARMACY" | "LAB";
export type SupportCaseStatus = "SUBMITTED" | "IN_REVIEW" | "WAITING_ON_CUSTOMER" | "RESOLVED";

export interface SupportCaseRead {
  id: string;
  requester_role: SupportRequesterRole;
  requester_id: string;
  patient_identity_id: string | null;
  category: "GENERAL" | "SERVICE_RECOVERY";
  subject: string;
  message: string;
  status: SupportCaseStatus;
  submitted_at: string;
  response_due_by: string;
  last_response: string | null;
  return_to: string;
  closed_at: string | null;
}

export type PrivacyRequestType =
  | "ACCESS"
  | "CORRECTION"
  | "DELETION"
  | "OBJECTION"
  | "CONSENT_QUESTION";

export interface PrivacyRequestRead {
  id: string;
  patient_identity_id: string;
  request_type: PrivacyRequestType;
  scope: string;
  identity_status: "VERIFICATION_REQUIRED" | "VERIFIED";
  status: SupportCaseStatus;
  submitted_at: string;
  response_due_by: string;
  response: string | null;
}

export interface FeedbackRead {
  id: string;
  interaction_type: "EXPERT" | "PHARMACY" | "LAB";
  interaction_id: string;
  patient_identity_id: string;
  submitted_by_user_id: string;
  /** One to five stars. Required: a review with no rating is not a rating. */
  rating: number;
  public_comment: string;
  /**
   * Whether the review was typed or spoken. A spoken review is stored and
   * replayed as audio, never transcribed: the same rule as a chat voice note,
   * for the same reason. See PRODUCT_SCREEN_V0.md, P44.
   */
  comment_kind: "TEXT" | "VOICE";
  voice_duration_seconds: number | null;
  moderation_status: "PENDING" | "APPROVED" | "HELD";
  provider_response: string | null;
  submitted_at: string;
}
