-- Monovella's Postgres schema.
--
-- Planned offline from prisma/contract.prisma, which scripts/gen-prisma.ts
-- generates from the prototype fixtures. No database has ever run this. It is
-- the pre-build artifact for the FastAPI and Postgres system in
-- PRODUCT_ARCH_V0.md, not evidence that the system exists.
--
-- Enum values come from Product_Docs/openapi.json and land as CHECK
-- constraints. Columns the specification has not pinned down are plain text;
-- `mise run schema` lists them.

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "public"."account" (
  "account_id" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "id" uuid NOT NULL,
  "pin_failed_attempts" int4 NOT NULL,
  "pin_hash" text NOT NULL,
  "pin_locked_until" text,
  "provider_id" text NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "user_id" uuid NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."careAccessGrant" (
  "care_event_id" uuid NOT NULL,
  "end_reason" text,
  "ended_at" timestamptz,
  "grant_source" text NOT NULL,
  "granted_at" timestamptz NOT NULL,
  "grantee_id" uuid NOT NULL,
  "grantee_type" text NOT NULL,
  "id" uuid NOT NULL,
  "patient_identity_id" uuid NOT NULL,
  "purpose" text NOT NULL,
  "scope" text NOT NULL,
  "status" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "careAccessGrant_grant_source_check_73cd66c1" CHECK ("grant_source" IN ('CARE_EVENT', 'EMERGENCY')),
  CONSTRAINT "careAccessGrant_grantee_type_check_a941fdc2" CHECK ("grantee_type" IN ('EXPERT', 'GUEST_EXPERT', 'LAB', 'PHARMACY', 'STAFF')),
  CONSTRAINT "careAccessGrant_scope_check_e5ef1c03" CHECK ("scope" IN ('ENCOUNTER_RECORD', 'FULFILMENT_FIELDS', 'GUEST_EXAM_CONTEXT', 'OPERATIONAL_CASE', 'PURPOSE_HISTORY', 'REQUEST_SUMMARY')),
  CONSTRAINT "careAccessGrant_status_check_295d6932" CHECK ("status" IN ('CURRENT', 'ENDED'))
);

CREATE TABLE "public"."chatMessage" (
  "body" text,
  "consultation_id" uuid NOT NULL,
  "duration_seconds" int4,
  "id" uuid NOT NULL,
  "media_url" text,
  "sender_type" text NOT NULL,
  "sent_at" timestamptz NOT NULL,
  "type" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "chatMessage_sender_type_check_55e16268" CHECK ("sender_type" IN ('EXPERT', 'PATIENT')),
  CONSTRAINT "chatMessage_type_check_8e817aea" CHECK ("type" IN ('IMAGE', 'SYSTEM', 'TEXT', 'VIDEO', 'VOICE'))
);

CREATE TABLE "public"."checkoutPayment" (
  "commission_amount_kobo" int4 NOT NULL,
  "consultation_id" uuid,
  "id" uuid NOT NULL,
  "method" text NOT NULL,
  "nomba_order_reference" text NOT NULL,
  "paid_at" timestamptz,
  "patient_id" uuid,
  "payer_role" text NOT NULL,
  "payer_user_id" uuid,
  "provider_amount_kobo" int4 NOT NULL,
  "provider_id" uuid NOT NULL,
  "provider_request_id" uuid,
  "provider_type" text NOT NULL,
  "refund_method" text,
  "refunded_at" timestamptz,
  "status" text NOT NULL,
  "total_amount_kobo" int4 NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "checkoutPayment_method_check_896cb49c" CHECK ("method" IN ('CARD', 'TRANSFER')),
  CONSTRAINT "checkoutPayment_payer_role_check_c54e6274" CHECK ("payer_role" IN ('GUEST', 'PRIMARY')),
  CONSTRAINT "checkoutPayment_provider_type_check_f15803de" CHECK ("provider_type" IN ('LAB', 'PHARMACY', 'SPECIALIST')),
  CONSTRAINT "checkoutPayment_status_check_a98e0808" CHECK ("status" IN ('CHARGED_BACK', 'FAILED', 'PAID', 'PENDING', 'REFUNDED', 'REFUND_FAILED', 'REFUND_PENDING'))
);

CREATE TABLE "public"."clinicalComplaintReferral" (
  "assigned_staff_id" uuid,
  "attachment_name" text,
  "audit_history" json NOT NULL,
  "consultation_id" uuid NOT NULL,
  "details" text NOT NULL,
  "due_soon" bool NOT NULL,
  "escalated_at" timestamptz,
  "expected_response_by" timestamptz NOT NULL,
  "filed_at" timestamptz NOT NULL,
  "filed_by_user_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "outcome" text,
  "overdue" bool NOT NULL,
  "patient_id" uuid NOT NULL,
  "patient_updates" json NOT NULL,
  "resolved_at" timestamptz,
  "reviewed_at" timestamptz,
  "status" text NOT NULL,
  "triage" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "clinicalComplaintReferral_status_check_28d3c6ed" CHECK ("status" IN ('APPEALED', 'CLOSED', 'OPEN', 'UNDER_REVIEW')),
  CONSTRAINT "clinicalComplaintReferral_triage_check_9f8ba995" CHECK ("triage" IN ('IMMEDIATE_EMERGENCY', 'ROUTINE', 'UNASSESSED', 'URGENT_SAFETY'))
);

CREATE TABLE "public"."clinicalSafetyContext" (
  "additional_context" text,
  "allergies_answer" text NOT NULL,
  "confirmed_at" timestamptz NOT NULL,
  "correction_reason" text,
  "current_medicines" text[] NOT NULL,
  "id" uuid NOT NULL,
  "medicines_answer" text NOT NULL,
  "patient_id" uuid NOT NULL,
  "reported_allergies" json NOT NULL,
  "source" text NOT NULL,
  "supersedes_id" uuid,
  "supplied_by_user_id" uuid NOT NULL,
  "version" int4 NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "clinicalSafetyContext_allergies_answer_check_909c3e7d" CHECK ("allergies_answer" IN ('DECLINED', 'NONE_KNOWN', 'NOT_SURE', 'REPORTED')),
  CONSTRAINT "clinicalSafetyContext_current_medicines_elem_not_null_027f3d88" CHECK (array_position("current_medicines", NULL) IS NULL),
  CONSTRAINT "clinicalSafetyContext_medicines_answer_check_7000f8a8" CHECK ("medicines_answer" IN ('DECLINED', 'NONE_KNOWN', 'NOT_SURE', 'REPORTED')),
  CONSTRAINT "clinicalSafetyContext_source_check_51269f6b" CHECK ("source" IN ('GUARDIAN', 'PATIENT'))
);

CREATE TABLE "public"."companionMemory" (
  "confirmed_at" timestamptz,
  "dismissed_at" timestamptz,
  "id" uuid NOT NULL,
  "keywords" text[] NOT NULL,
  "note" text NOT NULL,
  "patient_id" uuid NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "companionMemory_keywords_elem_not_null_f10c6f3f" CHECK (array_position("keywords", NULL) IS NULL)
);

CREATE TABLE "public"."companionMessage" (
  "body" text,
  "emergency_routing" text,
  "id" uuid NOT NULL,
  "item" json,
  "patient_id" uuid NOT NULL,
  "pending_confirmation" bool NOT NULL,
  "role" text NOT NULL,
  "sent_at" timestamptz NOT NULL,
  "seq" int4 NOT NULL,
  "type" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "companionMessage_role_check_2097b485" CHECK ("role" IN ('COMPANION', 'USER')),
  CONSTRAINT "companionMessage_type_check_d3bdeffd" CHECK ("type" IN ('LOG_PROPOSAL', 'SYSTEM', 'TEXT', 'VOICE'))
);

CREATE TABLE "public"."consentRecord" (
  "acting_user_id" uuid NOT NULL,
  "action" text NOT NULL,
  "actor_capacity" text NOT NULL,
  "care_event_id" uuid,
  "document_or_statement_version" text NOT NULL,
  "guardian_relationship" text,
  "id" uuid NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "patient_id" uuid,
  "purpose" text NOT NULL,
  "replaces_entry_id" uuid,
  "withdrawn_entry_id" uuid,
  PRIMARY KEY ("id"),
  CONSTRAINT "consentRecord_action_check_6d467984" CHECK ("action" IN ('ACKNOWLEDGED', 'CONSENTED', 'REPLACED', 'WITHDRAWN')),
  CONSTRAINT "consentRecord_actor_capacity_check_e0149eab" CHECK ("actor_capacity" IN ('ACCOUNT_HOLDER', 'GUARDIAN')),
  CONSTRAINT "consentRecord_purpose_check_c6854d51" CHECK ("purpose" IN ('DEPENDANT_RECORD_CARE', 'EXPERT_REFERRAL', 'GENERAL_TERMS', 'LAB_DISCLOSURE', 'NIN_VERIFICATION', 'PHARMACY_DISCLOSURE', 'PRIVACY_NOTICE', 'TELEMEDICINE'))
);

CREATE TABLE "public"."consultation" (
  "call_answered_at" timestamptz,
  "call_connection_state" text,
  "call_ended_at" timestamptz,
  "call_initiated_by" text,
  "call_outcome" text,
  "call_ring_expires_at" timestamptz,
  "call_started_at" timestamptz,
  "call_state" text,
  "call_token_expires_at" timestamptz,
  "call_token_version" text,
  "cancellation_reason" text,
  "cancelled_at" timestamptz,
  "cancelled_by" text,
  "clinical_safety_acknowledged_at" timestamptz,
  "clinical_safety_acknowledged_by_expert_id" uuid,
  "clinical_safety_context_id" uuid,
  "clinical_safety_context_version" text,
  "closed_at" timestamptz,
  "closed_by" text,
  "closeout_reason" text,
  "closeout_version" int4,
  "completed_at" timestamptz,
  "expert_call_camera_on" bool,
  "expert_call_device" text,
  "expert_call_muted" bool,
  "expert_camera_permission" text,
  "expert_fee_kobo" int4 NOT NULL,
  "expert_id" uuid NOT NULL,
  "expert_joined_at" timestamptz,
  "expert_microphone_permission" text,
  "guest_examination_reason" text,
  "guest_examination_status" text,
  "guest_expert_fee_kobo" int4,
  "guest_expert_id" uuid,
  "id" uuid NOT NULL,
  "patient_call_camera_on" bool,
  "patient_call_device" text,
  "patient_call_muted" bool,
  "patient_camera_permission" text,
  "patient_identity_id" uuid NOT NULL,
  "patient_joined_at" timestamptz,
  "patient_microphone_permission" text,
  "payout_outcome" text,
  "platform_fee_kobo" int4 NOT NULL,
  "referral_chain_depth" int4,
  "referral_disclosure_ack_at" timestamptz,
  "referral_reason" text,
  "referred_from_id" uuid,
  "refund_outcome" text,
  "request_summary" text,
  "requested_at" timestamptz NOT NULL,
  "respond_by" timestamptz,
  "responded_at" timestamptz,
  "scheduled_end" timestamptz,
  "scheduled_start" timestamptz,
  "slot_released_at" timestamptz,
  "status" text NOT NULL,
  "telemedicine_consent_at" timestamptz,
  "workday_impact_answer" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "consultation_call_connection_state_check_9622ecd3" CHECK ("call_connection_state" IN ('FAILED', 'GOOD', 'RECONNECTING', 'WEAK')),
  CONSTRAINT "consultation_call_initiated_by_check_89ea880f" CHECK ("call_initiated_by" IN ('EXPERT', 'PATIENT')),
  CONSTRAINT "consultation_call_outcome_check_e7157be4" CHECK ("call_outcome" IN ('CANCELLED', 'CONNECTION_FAILED', 'DECLINED', 'ENDED', 'MISSED')),
  CONSTRAINT "consultation_call_state_check_15cb0bc8" CHECK ("call_state" IN ('ACTIVE', 'ENDED', 'NONE', 'RINGING')),
  CONSTRAINT "consultation_cancelled_by_check_6b76e8b5" CHECK ("cancelled_by" IN ('EXPERT', 'PATIENT', 'STAFF')),
  CONSTRAINT "consultation_closed_by_check_869f427c" CHECK ("closed_by" IN ('EXPERT', 'PATIENT', 'STAFF')),
  CONSTRAINT "consultation_closeout_reason_check_2d2827c8" CHECK ("closeout_reason" IN ('CLINICAL_COMPLETION', 'EXPERT_CANCELLED', 'EXPERT_NO_SHOW', 'FAILED_CALL_CHAT_COMPLETED', 'PATIENT_CANCELLED', 'PATIENT_NO_SHOW', 'WINDOW_ELAPSED')),
  CONSTRAINT "consultation_expert_camera_permission_check_333ac8b0" CHECK ("expert_camera_permission" IN ('DENIED', 'GRANTED', 'PROMPT')),
  CONSTRAINT "consultation_expert_microphone_permission_check_05435aee" CHECK ("expert_microphone_permission" IN ('DENIED', 'GRANTED', 'PROMPT')),
  CONSTRAINT "consultation_guest_examination_status_check_2a3b7b6c" CHECK ("guest_examination_status" IN ('ACCEPTED', 'AWAITING_PATIENT_PAYMENT', 'COMPLETED', 'DECLINED', 'REQUESTED')),
  CONSTRAINT "consultation_patient_camera_permission_check_198019bc" CHECK ("patient_camera_permission" IN ('DENIED', 'GRANTED', 'PROMPT')),
  CONSTRAINT "consultation_patient_microphone_permission_check_7df780db" CHECK ("patient_microphone_permission" IN ('DENIED', 'GRANTED', 'PROMPT')),
  CONSTRAINT "consultation_payout_outcome_check_762c5da6" CHECK ("payout_outcome" IN ('NOT_EARNED', 'PAID', 'PAYABLE', 'PENDING', 'WITHHELD')),
  CONSTRAINT "consultation_refund_outcome_check_3b2b91b6" CHECK ("refund_outcome" IN ('ELIGIBLE', 'NOT_ELIGIBLE', 'PENDING', 'REFUNDED')),
  CONSTRAINT "consultation_status_check_a2a4d955" CHECK ("status" IN ('ACTIVE', 'CANCELLED', 'COMPLETED', 'DECLINED', 'REQUESTED', 'SCHEDULED', 'TIMED_OUT')),
  CONSTRAINT "consultation_workday_impact_answer_check_7a75b0e3" CHECK ("workday_impact_answer" IN ('DISMISSED', 'NO', 'YES'))
);

CREATE TABLE "public"."deviceSession" (
  "created_at" timestamptz NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "id" uuid NOT NULL,
  "ip_address" text NOT NULL,
  "is_current" bool NOT NULL,
  "last_seen_at" timestamptz,
  "revoked_at" timestamptz,
  "token_hash" text NOT NULL,
  "user_agent" text NOT NULL,
  "user_id" uuid NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."expert" (
  "address" text NOT NULL,
  "availability_status" text NOT NULL,
  "bio" text NOT NULL,
  "city" text NOT NULL,
  "consultation_fee_kobo" int4 NOT NULL,
  "credentials" json NOT NULL,
  "first_name" text NOT NULL,
  "gender" text NOT NULL,
  "id" uuid NOT NULL,
  "last_name" text NOT NULL,
  "licence_number" text NOT NULL,
  "local_government_area" text NOT NULL,
  "next_available_start" timestamptz,
  "organization_id" uuid,
  "photo_url" text,
  "professional_type" text NOT NULL,
  "specialty" text NOT NULL,
  "state" text,
  "years_practising" int4 NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "expert_availability_status_check_c49aaf15" CHECK ("availability_status" IN ('AWAY', 'ONLINE', 'OUT_OF_OFFICE')),
  CONSTRAINT "expert_gender_check_c764a63a" CHECK ("gender" IN ('FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY')),
  CONSTRAINT "expert_professional_type_check_0ed864b3" CHECK ("professional_type" IN ('DOCTOR', 'LAB_SCIENTIST', 'NURSE', 'PHARMACIST', 'PHYSIOTHERAPIST')),
  CONSTRAINT "expert_specialty_check_f3a1cf78" CHECK ("specialty" IN ('CARDIOLOGY', 'CHRONIC_DISEASE_MONITORING', 'DERMATOLOGY', 'ENDOCRINOLOGY', 'GASTROENTEROLOGY', 'GENERAL_PRACTICE', 'GENERAL_SURGERY', 'INFECTIOUS_DISEASE', 'MATERNAL_CHILD_HEALTH', 'MEDICATION_THERAPY_MANAGEMENT', 'NEPHROLOGY', 'NEUROLOGY', 'OBSTETRICS_GYNECOLOGY', 'OPHTHALMOLOGY', 'ORTHOPEDICS', 'OTC_WELLNESS_COUNSELING', 'OTORHINOLARYNGOLOGY', 'PEDIATRICS', 'PHYSIOTHERAPY', 'POST_OP_FOLLOW_UP', 'PSYCHIATRY', 'PULMONOLOGY', 'RESULT_INTERPRETATION_REFERRAL', 'UROLOGY', 'WOUND_CARE_GUIDANCE'))
);

CREATE TABLE "public"."expertAvailabilitySlot" (
  "end" timestamptz NOT NULL,
  "expert_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "start" timestamptz NOT NULL,
  "taken" bool NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."expertPayoutDetails" (
  "expert_id" uuid NOT NULL,
  "payout_account_name" text,
  "payout_bank_account_number" text,
  "payout_bank_code" text,
  "payout_payment_link" text,
  "payout_ussd_string" text,
  "payout_verified_at" timestamptz,
  "updated_at" timestamptz NOT NULL,
  PRIMARY KEY ("expert_id")
);

CREATE TABLE "public"."expertPayoutHistoryEntry" (
  "changed_at" timestamptz NOT NULL,
  "expert_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "payout_account_name" text,
  "payout_bank_account_number" text,
  "payout_bank_code" text,
  "payout_payment_link" text,
  "payout_ussd_string" text,
  "payout_verified_at" timestamptz,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."expertScheduleException" (
  "date" text NOT NULL,
  "end_time" text,
  "expert_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "kind" text NOT NULL,
  "note" text NOT NULL,
  "start_time" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "expertScheduleException_kind_check_b07a912f" CHECK ("kind" IN ('EXTRA_HOURS', 'UNAVAILABLE'))
);

CREATE TABLE "public"."expertScheduleSlot" (
  "booked_count" int4 NOT NULL,
  "capacity" int4 NOT NULL,
  "day_of_week" int4 NOT NULL,
  "end_time" text NOT NULL,
  "expert_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "start_time" text NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."expertSchedulingRules" (
  "appointment_duration_minutes" int4 NOT NULL,
  "buffer_minutes" int4 NOT NULL,
  "expert_id" uuid NOT NULL,
  "max_bookings_per_day" int4 NOT NULL,
  "minimum_notice_minutes" int4 NOT NULL,
  PRIMARY KEY ("expert_id")
);

CREATE TABLE "public"."feedback" (
  "comment_kind" text NOT NULL,
  "id" text NOT NULL,
  "interaction_id" uuid NOT NULL,
  "interaction_type" text NOT NULL,
  "moderation_status" text NOT NULL,
  "patient_identity_id" uuid NOT NULL,
  "provider_response" text,
  "public_comment" text NOT NULL,
  "rating" int4 NOT NULL,
  "submitted_at" timestamptz NOT NULL,
  "submitted_by_user_id" uuid NOT NULL,
  "voice_duration_seconds" int4,
  PRIMARY KEY ("id"),
  CONSTRAINT "feedback_interaction_type_check_422d2c63" CHECK ("interaction_type" IN ('EXPERT', 'LAB', 'PHARMACY')),
  CONSTRAINT "feedback_moderation_status_check_0414e8a3" CHECK ("moderation_status" IN ('APPROVED', 'HELD', 'PENDING'))
);

CREATE TABLE "public"."fixtureMeta" (
  "anchor" timestamptz NOT NULL,
  "id" uuid NOT NULL,
  "note" text NOT NULL,
  "openapi_version" text NOT NULL,
  "platform_fee_cap_kobo" int4 NOT NULL,
  "platform_fee_rate" float8 NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."governanceAccess" (
  "actor_id" uuid NOT NULL,
  "status" text NOT NULL,
  PRIMARY KEY ("actor_id"),
  CONSTRAINT "governanceAccess_status_check_49cd57f8" CHECK ("status" IN ('ACTIVE', 'PENDING', 'REJECTED', 'RESTRICTED'))
);

CREATE TABLE "public"."governanceApplicationLink" (
  "actor_id" uuid,
  "application_id" uuid NOT NULL,
  "application_kind" text NOT NULL,
  "assigned_staff_id" uuid NOT NULL,
  "expiry_date" text NOT NULL,
  "licence_number" text NOT NULL,
  "revision" int4 NOT NULL,
  "submitted_credential_id" text,
  "target_credential_id" text,
  PRIMARY KEY ("application_id"),
  CONSTRAINT "governanceApplicationLink_application_kind_check_ade6c9e3" CHECK ("application_kind" IN ('ADDITIONAL_CREDENTIAL', 'INITIAL', 'LICENCE_RENEWAL'))
);

CREATE TABLE "public"."governanceAssignment" (
  "staff_id" uuid NOT NULL,
  "subject_id" uuid NOT NULL,
  PRIMARY KEY ("subject_id")
);

CREATE TABLE "public"."governanceAuditEvent" (
  "action" text NOT NULL,
  "actor_id" uuid,
  "id" text NOT NULL,
  "note" text,
  "occurred_at" timestamptz NOT NULL,
  "subject_id" uuid NOT NULL,
  "subject_type" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "governanceAuditEvent_action_check_77fe021f" CHECK ("action" IN ('APPROVED', 'AUTO_LIFTED', 'DEACTIVATED', 'DECIDED', 'LIFTED', 'PROVISIONED', 'REJECTED', 'SUBMITTED', 'UPHELD')),
  CONSTRAINT "governanceAuditEvent_subject_type_check_45a4872f" CHECK ("subject_type" IN ('APPLICATION', 'DISPUTE', 'STAFF', 'STANDING'))
);

CREATE TABLE "public"."governanceRevision" (
  "revision" int4 NOT NULL,
  "subject_id" uuid NOT NULL,
  PRIMARY KEY ("subject_id")
);

CREATE TABLE "public"."historyReadEvent" (
  "care_event_id" uuid NOT NULL,
  "expert_id" uuid NOT NULL,
  "id" uuid NOT NULL,
  "patient_identity_id" uuid NOT NULL,
  "read_at" timestamptz NOT NULL,
  "route" text NOT NULL,
  "sections" text[] NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "historyReadEvent_route_check_65596d7e" CHECK ("route" IN ('EMERGENCY', 'NORMAL')),
  CONSTRAINT "historyReadEvent_sections_elem_not_null_c7bfa6c1" CHECK (array_position("sections", NULL) IS NULL)
);

CREATE TABLE "public"."insight" (
  "dismissed_at" timestamptz,
  "id" uuid NOT NULL,
  "observation" text NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "patient_id" uuid NOT NULL,
  "reasoning" text NOT NULL,
  "source_log_entries" text[] NOT NULL,
  "type" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "insight_source_log_entries_elem_not_null_2de5e1f4" CHECK (array_position("source_log_entries", NULL) IS NULL),
  CONSTRAINT "insight_type_check_4831b55f" CHECK ("type" IN ('OBSERVATION', 'PREDICTION'))
);

CREATE TABLE "public"."labOrder" (
  "consultation_id" uuid NOT NULL,
  "corrected_by_id" uuid,
  "corrects_id" uuid,
  "id" uuid NOT NULL,
  "instructions" text,
  "issued_at" timestamptz NOT NULL,
  "paid_note" text,
  "recommended_lab_id" uuid,
  "result_at" timestamptz,
  "result_corrected_at" timestamptz,
  "result_file_name" text,
  "result_source" text,
  "result_status" text,
  "result_summary" text,
  "test_requested" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "labOrder_result_status_check_5607c4e9" CHECK ("result_status" IN ('ATTACHED', 'PENDING'))
);

CREATE TABLE "public"."logEntry" (
  "activity_type" text,
  "category" text NOT NULL,
  "count" int4,
  "diastolic" int4,
  "drink_type" text,
  "duration_minutes" int4,
  "end_date" text,
  "flow_intensity" int4,
  "id" uuid NOT NULL,
  "is_estimate" bool NOT NULL,
  "label" text,
  "logged_at" timestamptz NOT NULL,
  "meal_type" text,
  "note" text,
  "patient_id" uuid NOT NULL,
  "severity" int4,
  "sleep_end_time" text,
  "sleep_start_time" text,
  "source" text NOT NULL,
  "start_date" text,
  "supersedes" uuid,
  "symptom_ids" text[],
  "systolic" int4,
  "updated_at" timestamptz NOT NULL,
  "value" float8,
  "vital_type" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "logEntry_activity_type_check_ddc990f0" CHECK ("activity_type" IN ('GYM', 'OTHER', 'RUN', 'WALK')),
  CONSTRAINT "logEntry_category_check_a949a795" CHECK ("category" IN ('CYCLE', 'DRINK', 'FOOD', 'PHYSICAL_ACTIVITY', 'SLEEP', 'SYMPTOMS', 'VITALS')),
  CONSTRAINT "logEntry_drink_type_check_efe69a50" CHECK ("drink_type" IN ('OTHER', 'WATER')),
  CONSTRAINT "logEntry_meal_type_check_e3f7bc59" CHECK ("meal_type" IN ('BREAKFAST', 'DINNER', 'LUNCH', 'SNACK')),
  CONSTRAINT "logEntry_source_check_bd4dfa13" CHECK ("source" IN ('COMPANION', 'FORM')),
  CONSTRAINT "logEntry_symptom_ids_elem_not_null_dd7ecc76" CHECK (array_position("symptom_ids", NULL) IS NULL),
  CONSTRAINT "logEntry_vital_type_check_5e2a9560" CHECK ("vital_type" IN ('BLOOD_PRESSURE', 'HEART_RATE', 'TEMPERATURE', 'WEIGHT'))
);

CREATE TABLE "public"."member" (
  "id" uuid NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."notificationPreferences" (
  "appointment_reminders" bool,
  "credential_licence_reminders" bool,
  "id" uuid NOT NULL,
  "incoming_request_alerts" bool,
  "payment_fee_updates" bool,
  "product_updates" bool,
  "queue_overdue_alerts" bool,
  "scope" text NOT NULL,
  "subject_id" uuid NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "notificationPreferences_scope_check_830ce7dd" CHECK ("scope" IN ('EXPERT', 'LAB', 'PATIENT', 'PHARMACY', 'STAFF'))
);

CREATE TABLE "public"."organization" (
  "id" uuid NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."patient" (
  "address" text NOT NULL,
  "city" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "date_of_birth" text NOT NULL,
  "first_name" text,
  "gender" text NOT NULL,
  "guardian_reason" text,
  "guardian_user_id" uuid,
  "id" uuid NOT NULL,
  "is_dependant" bool NOT NULL,
  "last_name" text,
  "local_government_area" text NOT NULL,
  "monovella_id" text NOT NULL,
  "photo_url" text,
  "state" text NOT NULL,
  "status" text NOT NULL,
  "verified_at" timestamptz,
  PRIMARY KEY ("id"),
  CONSTRAINT "patient_gender_check_c764a63a" CHECK ("gender" IN ('FEMALE', 'MALE', 'OTHER', 'PREFER_NOT_TO_SAY')),
  CONSTRAINT "patient_guardian_reason_check_6448031a" CHECK ("guardian_reason" IN ('HEALTH_CONDITION', 'MINOR', 'NO_NIN_YET')),
  CONSTRAINT "patient_status_check_5e80d468" CHECK ("status" IN ('PROVISIONAL', 'UNVERIFIED', 'VERIFIED'))
);

CREATE TABLE "public"."patientReferralCode" (
  "converted_count" int4 NOT NULL,
  "patient_id" uuid NOT NULL,
  "referral_code" text NOT NULL,
  "referral_link" text NOT NULL,
  PRIMARY KEY ("patient_id")
);

CREATE TABLE "public"."paymentDispute" (
  "consultation_id" uuid NOT NULL,
  "decision" text,
  "decision_due_by" timestamptz,
  "decision_favors" text,
  "decision_final" bool NOT NULL,
  "id" uuid NOT NULL,
  "provider_request_id" uuid,
  "provider_type" text NOT NULL,
  "raised_at" timestamptz NOT NULL,
  "raised_by" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "paymentDispute_raised_by_check_c321466d" CHECK ("raised_by" IN ('EXPERT', 'LAB', 'PATIENT', 'PHARMACY'))
);

CREATE TABLE "public"."paymentDisputeQueueItem" (
  "amount_kobo" int4 NOT NULL,
  "decision_due_by" timestamptz,
  "due_soon" bool NOT NULL,
  "id" uuid NOT NULL,
  "overdue" bool NOT NULL,
  "provider_type" text NOT NULL,
  "raised_at" timestamptz NOT NULL,
  "raised_by" text NOT NULL,
  "subject" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "paymentDisputeQueueItem_provider_type_check_f15803de" CHECK ("provider_type" IN ('LAB', 'PHARMACY', 'SPECIALIST')),
  CONSTRAINT "paymentDisputeQueueItem_raised_by_check_c321466d" CHECK ("raised_by" IN ('EXPERT', 'LAB', 'PATIENT', 'PHARMACY'))
);

CREATE TABLE "public"."paymentMethod" (
  "brand" text NOT NULL,
  "expiry_month" int4 NOT NULL,
  "expiry_year" int4 NOT NULL,
  "id" uuid NOT NULL,
  "last4" text NOT NULL,
  "verified_at" timestamptz NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."payoutSupportRequest" (
  "id" uuid NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."prescription" (
  "consultation_id" uuid NOT NULL,
  "corrected_by_id" uuid,
  "corrects_id" uuid,
  "dosage" text NOT NULL,
  "filled_at" timestamptz,
  "fulfillment_status" text,
  "id" uuid NOT NULL,
  "instructions" text NOT NULL,
  "issued_at" timestamptz NOT NULL,
  "medication" text NOT NULL,
  "paid_note" text,
  "pharmacy_name" text,
  "receipt_file_name" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "prescription_fulfillment_status_check_4b9655db" CHECK ("fulfillment_status" IN ('FILLED', 'NOT_FILLED', 'UNFILLED'))
);

CREATE TABLE "public"."privacyRequest" (
  "id" text NOT NULL,
  "identity_status" text NOT NULL,
  "patient_identity_id" uuid NOT NULL,
  "request_type" text NOT NULL,
  "response" text,
  "response_due_by" timestamptz NOT NULL,
  "scope" text NOT NULL,
  "status" text NOT NULL,
  "submitted_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "privacyRequest_identity_status_check_b6bfea8f" CHECK ("identity_status" IN ('VERIFICATION_REQUIRED', 'VERIFIED')),
  CONSTRAINT "privacyRequest_request_type_check_305313bd" CHECK ("request_type" IN ('ACCESS', 'CONSENT_QUESTION', 'CORRECTION', 'DELETION', 'OBJECTION')),
  CONSTRAINT "privacyRequest_status_check_4370054f" CHECK ("status" IN ('IN_REVIEW', 'RESOLVED', 'SUBMITTED', 'WAITING_ON_CUSTOMER'))
);

CREATE TABLE "public"."provider" (
  "availability_status" text NOT NULL,
  "business_name" text NOT NULL,
  "cac_number" text,
  "city" text NOT NULL,
  "contact_name" text NOT NULL,
  "contact_phone" text NOT NULL,
  "distance_km" float8,
  "id" uuid NOT NULL,
  "license_number" text,
  "local_government_area" text NOT NULL,
  "logo_url" text,
  "organization_id" uuid,
  "payout_account_name" text NOT NULL,
  "payout_bank_account_number" text NOT NULL,
  "payout_bank_code" text NOT NULL,
  "payout_verified_at" timestamptz NOT NULL,
  "premises_address" text NOT NULL,
  "profile_note" text NOT NULL,
  "provider_type" text NOT NULL,
  "service_fees" json,
  "services_offered" text[],
  "state" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "provider_provider_type_check_f15803de" CHECK ("provider_type" IN ('LAB', 'PHARMACY', 'SPECIALIST')),
  CONSTRAINT "provider_services_offered_elem_not_null_3626007c" CHECK (array_position("services_offered", NULL) IS NULL)
);

CREATE TABLE "public"."providerApplicationDetail" (
  "business_name" text,
  "cac_number" text,
  "cac_verified_at" timestamptz,
  "city" text,
  "contact_person" text NOT NULL,
  "expert" json,
  "id" uuid NOT NULL,
  "license_document_flagged" bool,
  "license_document_url" text,
  "license_expiry_date" text,
  "license_number" text,
  "license_verification_note" text,
  "license_verified_at" timestamptz,
  "local_government_area" text,
  "premises_address" text,
  "prior_license_expiry_date" text,
  "prior_rejection_reason" text,
  "provider_type" text NOT NULL,
  "request_kind" text,
  "services_offered" text[],
  "state" text,
  "status" text NOT NULL,
  "submitted_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "providerApplicationDetail_provider_type_check_f15803de" CHECK ("provider_type" IN ('LAB', 'PHARMACY', 'SPECIALIST')),
  CONSTRAINT "providerApplicationDetail_request_kind_check_95133326" CHECK ("request_kind" IN ('CREDENTIAL_ADDITION', 'INITIAL', 'RENEWAL')),
  CONSTRAINT "providerApplicationDetail_services_offered_elem_not_nu_3626007c" CHECK (array_position("services_offered", NULL) IS NULL)
);

CREATE TABLE "public"."providerApplicationQueueItem" (
  "due_soon" bool NOT NULL,
  "id" uuid NOT NULL,
  "name" text NOT NULL,
  "overdue" bool NOT NULL,
  "provider_type" text NOT NULL,
  "request_kind" text,
  "review_due_by" timestamptz,
  "submitted_at" timestamptz NOT NULL,
  "verification_status" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "providerApplicationQueueItem_provider_type_check_f15803de" CHECK ("provider_type" IN ('LAB', 'PHARMACY', 'SPECIALIST')),
  CONSTRAINT "providerApplicationQueueItem_request_kind_check_95133326" CHECK ("request_kind" IN ('CREDENTIAL_ADDITION', 'INITIAL', 'RENEWAL'))
);

CREATE TABLE "public"."providerCredential" (
  "credential_type" text NOT NULL,
  "document_filename" text NOT NULL,
  "expires_at" text,
  "id" uuid NOT NULL,
  "provider_id" uuid NOT NULL,
  "reference_number" text NOT NULL,
  "retired_at" timestamptz,
  "title" text NOT NULL,
  "verification_status" text NOT NULL,
  "verified_at" timestamptz,
  PRIMARY KEY ("id"),
  CONSTRAINT "providerCredential_credential_type_check_929ecde5" CHECK ("credential_type" IN ('CERTIFICATION', 'OPERATING_LICENCE')),
  CONSTRAINT "providerCredential_verification_status_check_b0c462e8" CHECK ("verification_status" IN ('PENDING', 'REJECTED', 'VERIFIED'))
);

CREATE TABLE "public"."providerPayout" (
  "account_name" text NOT NULL,
  "amount_kobo" int4 NOT NULL,
  "bank_account_last4" text NOT NULL,
  "bank_code" text NOT NULL,
  "checkout_payment_id" uuid NOT NULL,
  "completed_at" timestamptz,
  "failure_reason" text,
  "id" uuid NOT NULL,
  "initiated_at" timestamptz,
  "provider_id" uuid NOT NULL,
  "provider_type" text NOT NULL,
  "status" text NOT NULL,
  "transfer_reference" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "providerPayout_provider_type_check_f15803de" CHECK ("provider_type" IN ('LAB', 'PHARMACY', 'SPECIALIST')),
  CONSTRAINT "providerPayout_status_check_660f97a7" CHECK ("status" IN ('FAILED', 'PAID', 'PENDING', 'PROCESSING', 'REVERSED'))
);

CREATE TABLE "public"."providerRequest" (
  "amount_kobo" int4,
  "capacity_released_at" timestamptz,
  "checkout_payment_id" uuid,
  "consultation_id" uuid NOT NULL,
  "decline_reason" text,
  "delivery_note" text,
  "delivery_or_pickup" text,
  "disclosure_consent" json NOT NULL,
  "id" uuid NOT NULL,
  "lab_order_id" uuid,
  "order_status" text,
  "original_amount_kobo" text,
  "patient_identity_id" uuid NOT NULL,
  "prescription_id" uuid,
  "price_changed_at" timestamptz,
  "provider_id" uuid NOT NULL,
  "provider_type" text NOT NULL,
  "requested_at" timestamptz NOT NULL,
  "respond_by" timestamptz,
  "responded_at" timestamptz,
  "result_corrected_at" timestamptz,
  "result_file_name" text,
  "result_source" text,
  "result_status" text,
  "result_summary" text,
  "result_uploaded_at" timestamptz,
  "slot_id" uuid,
  "status" text NOT NULL,
  "terminal_reason" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "providerRequest_delivery_or_pickup_check_e74906ce" CHECK ("delivery_or_pickup" IN ('DELIVERY', 'PICKUP')),
  CONSTRAINT "providerRequest_order_status_check_c54df73b" CHECK ("order_status" IN ('FULFILLED', 'MISSED_COLLECTION', 'OUT_FOR_DELIVERY', 'PREPARING', 'READY_FOR_PICKUP')),
  CONSTRAINT "providerRequest_provider_type_check_f15803de" CHECK ("provider_type" IN ('LAB', 'PHARMACY', 'SPECIALIST')),
  CONSTRAINT "providerRequest_result_status_check_92efd2e3" CHECK ("result_status" IN ('AWAITING', 'CORRECTED', 'DELAYED', 'INCORRECT_FILE', 'PHYSICAL_COPY_ONLY', 'UPLOADED')),
  CONSTRAINT "providerRequest_status_check_4c4031ec" CHECK ("status" IN ('ACCEPTED', 'CANCELLED', 'DECLINED', 'EXPIRED', 'OBSOLETE', 'REQUESTED', 'UNABLE_TO_FULFIL', 'WITHDRAWN'))
);

CREATE TABLE "public"."providerScheduleException" (
  "collection_method" text,
  "date" text NOT NULL,
  "end_time" text,
  "id" uuid NOT NULL,
  "kind" text NOT NULL,
  "note" text NOT NULL,
  "provider_id" uuid NOT NULL,
  "start_time" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "providerScheduleException_collection_method_check_7faa63f0" CHECK ("collection_method" IN ('BRANCH', 'HOME'))
);

CREATE TABLE "public"."providerScheduleSlot" (
  "booked_count" int4 NOT NULL,
  "capacity" int4 NOT NULL,
  "collection_method" text NOT NULL,
  "day_of_week" int4,
  "end_time" text NOT NULL,
  "id" uuid NOT NULL,
  "provider_id" uuid NOT NULL,
  "specific_date" text,
  "start_time" text NOT NULL,
  "taken" bool NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "providerScheduleSlot_collection_method_check_7faa63f0" CHECK ("collection_method" IN ('BRANCH', 'HOME'))
);

CREATE TABLE "public"."providerSession" (
  "id" uuid NOT NULL,
  PRIMARY KEY ("id")
);

CREATE TABLE "public"."referenceData" (
  "banks" json NOT NULL,
  "id" uuid NOT NULL,
  "local_government_areas_by_state" json NOT NULL,
  "saved_items" json NOT NULL,
  "specialties" json NOT NULL,
  "states" text[] NOT NULL,
  "symptoms" json NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "referenceData_states_elem_not_null_bc7d95ce" CHECK (array_position("states", NULL) IS NULL)
);

CREATE TABLE "public"."refundRequest" (
  "checkout_payment_id" uuid NOT NULL,
  "consultation_id" uuid NOT NULL,
  "decided_at" timestamptz,
  "decision" text,
  "decision_due_by" timestamptz,
  "decision_final" bool NOT NULL,
  "elaboration" text,
  "filed_at" timestamptz NOT NULL,
  "id" uuid NOT NULL,
  "patient_id" uuid NOT NULL,
  "reason" text NOT NULL,
  "refund_issued" bool,
  PRIMARY KEY ("id"),
  CONSTRAINT "refundRequest_reason_check_d0f6938e" CHECK ("reason" IN ('NON_PERFORMANCE'))
);

CREATE TABLE "public"."refundRequestQueueItem" (
  "amount_kobo" int4 NOT NULL,
  "checkout_payment_id" uuid NOT NULL,
  "consultation_id" uuid NOT NULL,
  "due_soon" bool NOT NULL,
  "filed_at" timestamptz NOT NULL,
  "id" uuid NOT NULL,
  "overdue" bool NOT NULL,
  "patient_id" uuid NOT NULL,
  "reason" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "refundRequestQueueItem_reason_check_d0f6938e" CHECK ("reason" IN ('NON_PERFORMANCE'))
);

CREATE TABLE "public"."report" (
  "consultation_id" uuid,
  "end_date" text,
  "id" uuid NOT NULL,
  "patient_id" uuid NOT NULL,
  "pdf_url" text,
  "ready_at" timestamptz,
  "requested_at" timestamptz NOT NULL,
  "revoked_at" timestamptz,
  "scope" text NOT NULL,
  "start_date" text,
  "status" text NOT NULL,
  "verification_code" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "report_scope_check_997ca2d7" CHECK ("scope" IN ('CONSULTATION', 'DATE_RANGE', 'FULL_HISTORY')),
  CONSTRAINT "report_status_check_55d45f8d" CHECK ("status" IN ('FAILED', 'GENERATING', 'READY', 'REVOKED'))
);

CREATE TABLE "public"."soapNote" (
  "assessment" text,
  "attachments" json,
  "consultation_id" uuid NOT NULL,
  "finalized_at" timestamptz,
  "guest_objective_contribution" json,
  "objective" text,
  "plan" text,
  "subjective" text,
  PRIMARY KEY ("consultation_id")
);

CREATE TABLE "public"."staffAccount" (
  "email" text NOT NULL,
  "failed_login_attempts" int4 NOT NULL,
  "id" uuid NOT NULL,
  "locked_until" text,
  "must_change_password" bool NOT NULL,
  "name" text NOT NULL,
  "password_hash" text NOT NULL,
  "phone" text NOT NULL,
  "photo_url" text,
  "revoked_at" timestamptz,
  "role" text NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "staffAccount_role_check_b411dab5" CHECK ("role" IN ('PLATFORM_ADMIN'))
);

CREATE TABLE "public"."standingQueueItem" (
  "actor_type" text NOT NULL,
  "due_soon" bool NOT NULL,
  "event_log" json NOT NULL,
  "events" text[] NOT NULL,
  "id" uuid NOT NULL,
  "linked_application_id" uuid,
  "name" text NOT NULL,
  "overdue" bool NOT NULL,
  "standing_suspended_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "standingQueueItem_actor_type_check_acbf1471" CHECK ("actor_type" IN ('EXPERT', 'LAB', 'PATIENT', 'PHARMACY')),
  CONSTRAINT "standingQueueItem_events_elem_not_null_3fea1ac8" CHECK (array_position("events", NULL) IS NULL)
);

CREATE TABLE "public"."supportCase" (
  "category" text NOT NULL,
  "closed_at" timestamptz,
  "id" text NOT NULL,
  "last_response" text,
  "message" text NOT NULL,
  "patient_identity_id" uuid,
  "requester_id" uuid NOT NULL,
  "requester_role" text NOT NULL,
  "response_due_by" timestamptz NOT NULL,
  "return_to" text NOT NULL,
  "status" text NOT NULL,
  "subject" text NOT NULL,
  "submitted_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "supportCase_category_check_5c7bc689" CHECK ("category" IN ('GENERAL', 'SERVICE_RECOVERY')),
  CONSTRAINT "supportCase_requester_role_check_a8862140" CHECK ("requester_role" IN ('EXPERT', 'LAB', 'PATIENT', 'PHARMACY')),
  CONSTRAINT "supportCase_status_check_4370054f" CHECK ("status" IN ('IN_REVIEW', 'RESOLVED', 'SUBMITTED', 'WAITING_ON_CUSTOMER'))
);

CREATE TABLE "public"."twoFactorSettings" (
  "enabled" bool NOT NULL,
  "id" uuid NOT NULL,
  "method" text,
  "recovery_codes_hashed" text[] NOT NULL,
  "recovery_codes_remaining" int4 NOT NULL,
  "subject_id" uuid NOT NULL,
  "subject_type" text NOT NULL,
  "totp_secret_encrypted" text,
  PRIMARY KEY ("id"),
  CONSTRAINT "twoFactorSettings_method_check_b6e2b7f9" CHECK ("method" IN ('TOTP')),
  CONSTRAINT "twoFactorSettings_recovery_codes_hashed_elem_not_null_df24b936" CHECK (array_position("recovery_codes_hashed", NULL) IS NULL),
  CONSTRAINT "twoFactorSettings_subject_type_check_5e07a231" CHECK ("subject_type" IN ('PROVIDER', 'STAFF', 'USER'))
);

CREATE TABLE "public"."user" (
  "biometric_enabled" bool NOT NULL,
  "closure_requested_at" timestamptz,
  "closure_status" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  "has_expert_identity" bool NOT NULL,
  "has_patient_identity" bool NOT NULL,
  "id" uuid NOT NULL,
  "phone" text NOT NULL,
  "recovery_email" text,
  "recovery_email_verified_at" timestamptz,
  PRIMARY KEY ("id"),
  CONSTRAINT "user_closure_status_check_7c4c7750" CHECK ("closure_status" IN ('ACTIVE', 'CLOSURE_REQUESTED'))
);

CREATE TABLE "public"."verification" (
  "id" uuid NOT NULL,
  PRIMARY KEY ("id")
);

CREATE INDEX "account_user_id_idx_6c952402" ON "public"."account" ("user_id");

CREATE INDEX "careAccessGrant_patient_identity_id_idx_5c33c7a7" ON "public"."careAccessGrant" ("patient_identity_id");

CREATE INDEX "chatMessage_consultation_id_idx_ccb1c5b7" ON "public"."chatMessage" ("consultation_id");

CREATE INDEX "clinicalSafetyContext_patient_id_idx_2f641dda" ON "public"."clinicalSafetyContext" ("patient_id");

CREATE INDEX "companionMemory_patient_id_idx_2f641dda" ON "public"."companionMemory" ("patient_id");

CREATE INDEX "companionMessage_patient_id_idx_2f641dda" ON "public"."companionMessage" ("patient_id");

CREATE INDEX "consentRecord_patient_id_idx_2f641dda" ON "public"."consentRecord" ("patient_id");

CREATE INDEX "consultation_expert_id_idx_b44d1d7c" ON "public"."consultation" ("expert_id");

CREATE INDEX "consultation_patient_identity_id_idx_5c33c7a7" ON "public"."consultation" ("patient_identity_id");

CREATE INDEX "deviceSession_user_id_idx_6c952402" ON "public"."deviceSession" ("user_id");

CREATE INDEX "expert_organization_id_idx_1a5cd3f5" ON "public"."expert" ("organization_id");

CREATE INDEX "expertAvailabilitySlot_expert_id_idx_b44d1d7c" ON "public"."expertAvailabilitySlot" ("expert_id");

CREATE INDEX "expertPayoutHistoryEntry_expert_id_idx_b44d1d7c" ON "public"."expertPayoutHistoryEntry" ("expert_id");

CREATE INDEX "expertScheduleException_expert_id_idx_b44d1d7c" ON "public"."expertScheduleException" ("expert_id");

CREATE INDEX "expertScheduleSlot_expert_id_idx_b44d1d7c" ON "public"."expertScheduleSlot" ("expert_id");

CREATE INDEX "governanceApplicationLink_assigned_staff_id_idx_ce429edc" ON "public"."governanceApplicationLink" ("assigned_staff_id");

CREATE INDEX "governanceAssignment_staff_id_idx_416d53f4" ON "public"."governanceAssignment" ("staff_id");

CREATE INDEX "historyReadEvent_expert_id_idx_b44d1d7c" ON "public"."historyReadEvent" ("expert_id");

CREATE INDEX "historyReadEvent_patient_identity_id_idx_5c33c7a7" ON "public"."historyReadEvent" ("patient_identity_id");

CREATE INDEX "insight_patient_id_idx_2f641dda" ON "public"."insight" ("patient_id");

CREATE INDEX "labOrder_consultation_id_idx_ccb1c5b7" ON "public"."labOrder" ("consultation_id");

CREATE INDEX "logEntry_patient_id_idx_2f641dda" ON "public"."logEntry" ("patient_id");

CREATE INDEX "paymentDispute_consultation_id_idx_ccb1c5b7" ON "public"."paymentDispute" ("consultation_id");

CREATE INDEX "paymentDispute_provider_request_id_idx_56e325f7" ON "public"."paymentDispute" ("provider_request_id");

CREATE INDEX "prescription_consultation_id_idx_ccb1c5b7" ON "public"."prescription" ("consultation_id");

CREATE INDEX "provider_organization_id_idx_1a5cd3f5" ON "public"."provider" ("organization_id");

CREATE INDEX "providerCredential_provider_id_idx_d89e110d" ON "public"."providerCredential" ("provider_id");

CREATE INDEX "providerScheduleException_provider_id_idx_d89e110d" ON "public"."providerScheduleException" ("provider_id");

CREATE INDEX "providerScheduleSlot_provider_id_idx_d89e110d" ON "public"."providerScheduleSlot" ("provider_id");

CREATE INDEX "report_patient_id_idx_2f641dda" ON "public"."report" ("patient_id");

ALTER TABLE "public"."account"
ADD CONSTRAINT "account_user_id_fkey"
FOREIGN KEY ("user_id")
REFERENCES "public"."user" ("id");

ALTER TABLE "public"."careAccessGrant"
ADD CONSTRAINT "careAccessGrant_patient_identity_id_fkey"
FOREIGN KEY ("patient_identity_id")
REFERENCES "public"."patient" ("id");

ALTER TABLE "public"."chatMessage"
ADD CONSTRAINT "chatMessage_consultation_id_fkey"
FOREIGN KEY ("consultation_id")
REFERENCES "public"."consultation" ("id");

ALTER TABLE "public"."clinicalSafetyContext"
ADD CONSTRAINT "clinicalSafetyContext_patient_id_fkey"
FOREIGN KEY ("patient_id")
REFERENCES "public"."patient" ("id");

ALTER TABLE "public"."companionMemory"
ADD CONSTRAINT "companionMemory_patient_id_fkey"
FOREIGN KEY ("patient_id")
REFERENCES "public"."patient" ("id");

ALTER TABLE "public"."companionMessage"
ADD CONSTRAINT "companionMessage_patient_id_fkey"
FOREIGN KEY ("patient_id")
REFERENCES "public"."patient" ("id");

ALTER TABLE "public"."consentRecord"
ADD CONSTRAINT "consentRecord_patient_id_fkey"
FOREIGN KEY ("patient_id")
REFERENCES "public"."patient" ("id");

ALTER TABLE "public"."consultation"
ADD CONSTRAINT "consultation_expert_id_fkey"
FOREIGN KEY ("expert_id")
REFERENCES "public"."expert" ("id");

ALTER TABLE "public"."consultation"
ADD CONSTRAINT "consultation_patient_identity_id_fkey"
FOREIGN KEY ("patient_identity_id")
REFERENCES "public"."patient" ("id");

ALTER TABLE "public"."deviceSession"
ADD CONSTRAINT "deviceSession_user_id_fkey"
FOREIGN KEY ("user_id")
REFERENCES "public"."user" ("id");

ALTER TABLE "public"."expert"
ADD CONSTRAINT "expert_organization_id_fkey"
FOREIGN KEY ("organization_id")
REFERENCES "public"."organization" ("id");

ALTER TABLE "public"."expertAvailabilitySlot"
ADD CONSTRAINT "expertAvailabilitySlot_expert_id_fkey"
FOREIGN KEY ("expert_id")
REFERENCES "public"."expert" ("id");

ALTER TABLE "public"."expertPayoutDetails"
ADD CONSTRAINT "expertPayoutDetails_expert_id_fkey"
FOREIGN KEY ("expert_id")
REFERENCES "public"."expert" ("id");

ALTER TABLE "public"."expertPayoutHistoryEntry"
ADD CONSTRAINT "expertPayoutHistoryEntry_expert_id_fkey"
FOREIGN KEY ("expert_id")
REFERENCES "public"."expert" ("id");

ALTER TABLE "public"."expertScheduleException"
ADD CONSTRAINT "expertScheduleException_expert_id_fkey"
FOREIGN KEY ("expert_id")
REFERENCES "public"."expert" ("id");

ALTER TABLE "public"."expertScheduleSlot"
ADD CONSTRAINT "expertScheduleSlot_expert_id_fkey"
FOREIGN KEY ("expert_id")
REFERENCES "public"."expert" ("id");

ALTER TABLE "public"."expertSchedulingRules"
ADD CONSTRAINT "expertSchedulingRules_expert_id_fkey"
FOREIGN KEY ("expert_id")
REFERENCES "public"."expert" ("id");

ALTER TABLE "public"."governanceApplicationLink"
ADD CONSTRAINT "governanceApplicationLink_application_id_fkey"
FOREIGN KEY ("application_id")
REFERENCES "public"."providerApplicationDetail" ("id");

ALTER TABLE "public"."governanceApplicationLink"
ADD CONSTRAINT "governanceApplicationLink_assigned_staff_id_fkey"
FOREIGN KEY ("assigned_staff_id")
REFERENCES "public"."staffAccount" ("id");

ALTER TABLE "public"."governanceAssignment"
ADD CONSTRAINT "governanceAssignment_staff_id_fkey"
FOREIGN KEY ("staff_id")
REFERENCES "public"."staffAccount" ("id");

ALTER TABLE "public"."historyReadEvent"
ADD CONSTRAINT "historyReadEvent_expert_id_fkey"
FOREIGN KEY ("expert_id")
REFERENCES "public"."expert" ("id");

ALTER TABLE "public"."historyReadEvent"
ADD CONSTRAINT "historyReadEvent_patient_identity_id_fkey"
FOREIGN KEY ("patient_identity_id")
REFERENCES "public"."patient" ("id");

ALTER TABLE "public"."insight"
ADD CONSTRAINT "insight_patient_id_fkey"
FOREIGN KEY ("patient_id")
REFERENCES "public"."patient" ("id");

ALTER TABLE "public"."labOrder"
ADD CONSTRAINT "labOrder_consultation_id_fkey"
FOREIGN KEY ("consultation_id")
REFERENCES "public"."consultation" ("id");

ALTER TABLE "public"."logEntry"
ADD CONSTRAINT "logEntry_patient_id_fkey"
FOREIGN KEY ("patient_id")
REFERENCES "public"."patient" ("id");

ALTER TABLE "public"."patientReferralCode"
ADD CONSTRAINT "patientReferralCode_patient_id_fkey"
FOREIGN KEY ("patient_id")
REFERENCES "public"."patient" ("id");

ALTER TABLE "public"."paymentDispute"
ADD CONSTRAINT "paymentDispute_consultation_id_fkey"
FOREIGN KEY ("consultation_id")
REFERENCES "public"."consultation" ("id");

ALTER TABLE "public"."paymentDispute"
ADD CONSTRAINT "paymentDispute_provider_request_id_fkey"
FOREIGN KEY ("provider_request_id")
REFERENCES "public"."providerRequest" ("id");

ALTER TABLE "public"."prescription"
ADD CONSTRAINT "prescription_consultation_id_fkey"
FOREIGN KEY ("consultation_id")
REFERENCES "public"."consultation" ("id");

ALTER TABLE "public"."provider"
ADD CONSTRAINT "provider_organization_id_fkey"
FOREIGN KEY ("organization_id")
REFERENCES "public"."organization" ("id");

ALTER TABLE "public"."providerCredential"
ADD CONSTRAINT "providerCredential_provider_id_fkey"
FOREIGN KEY ("provider_id")
REFERENCES "public"."provider" ("id");

ALTER TABLE "public"."providerScheduleException"
ADD CONSTRAINT "providerScheduleException_provider_id_fkey"
FOREIGN KEY ("provider_id")
REFERENCES "public"."provider" ("id");

ALTER TABLE "public"."providerScheduleSlot"
ADD CONSTRAINT "providerScheduleSlot_provider_id_fkey"
FOREIGN KEY ("provider_id")
REFERENCES "public"."provider" ("id");

ALTER TABLE "public"."report"
ADD CONSTRAINT "report_patient_id_fkey"
FOREIGN KEY ("patient_id")
REFERENCES "public"."patient" ("id");

ALTER TABLE "public"."soapNote"
ADD CONSTRAINT "soapNote_consultation_id_fkey"
FOREIGN KEY ("consultation_id")
REFERENCES "public"."consultation" ("id");
