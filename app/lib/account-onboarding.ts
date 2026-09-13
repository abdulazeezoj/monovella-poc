import type { Dataset } from "~/data";
import type { Gender } from "~/data/types";
import { now } from "~/lib/clock";
import { ensurePatientInvitation } from "~/lib/patient-invitations";

/** Create an isolated account in the demo dataset without taking over a fixture's history. */
export function createPrototypeAccount(
  data: Dataset,
  input: {
    userId: string;
    patientId: string;
    expertId: string;
    firstName: string;
    lastName: string;
    phone: string;
    dateOfBirth: string;
    gender: Gender;
    address: string;
    city: string;
    localGovernmentArea: string;
    state: string;
  },
) {
  if (
    data.accountPatientId ||
    data.patients.some((patient) => patient.id === input.patientId) ||
    data.experts.some((expert) => expert.id === input.expertId)
  )
    return false;
  const createdAt = now().toISOString();
  data.user = {
    id: input.userId,
    phone: input.phone,
    recovery_email: null,
    recovery_email_verified_at: null,
    has_patient_identity: true,
    has_expert_identity: false,
    biometric_enabled: false,
    closure_status: "ACTIVE",
    closure_requested_at: null,
    created_at: createdAt,
  };
  data.paymentMethods = [];
  data.deviceSessions = [
    {
      id: `${input.userId}_device`,
      is_current: true,
      created_at: createdAt,
      last_seen_at: createdAt,
    },
  ];
  for (const scope of ["PATIENT", "EXPERT"] as const)
    data.notificationPreferences.push({
      id: `${input.userId}_${scope}_preferences`,
      scope,
      subject_id: input.userId,
      appointment_reminders: true,
      incoming_request_alerts: scope === "EXPERT",
      payment_fee_updates: true,
      credential_licence_reminders: scope === "EXPERT",
      queue_overdue_alerts: null,
      product_updates: false,
    });
  data.twoFactorSettings.push({
    id: `${input.userId}_2fa`,
    subject_type: "USER",
    subject_id: input.userId,
    enabled: false,
    method: null,
    recovery_codes_remaining: 0,
  });
  data.accountPatientId = input.patientId;
  data.accountExpertId = input.expertId;
  data.patients.push({
    id: input.patientId,
    monovella_id: `MV-${input.patientId.slice(-8).toUpperCase()}`,
    first_name: input.firstName,
    last_name: input.lastName,
    status: "UNVERIFIED",
    date_of_birth: input.dateOfBirth,
    gender: input.gender,
    is_dependant: false,
    guardian_user_id: null,
    guardian_reason: null,
    verified_at: null,
    created_at: createdAt,
    address: input.address,
    city: input.city,
    local_government_area: input.localGovernmentArea,
    state: input.state,
    photo_url: null,
  });
  // An unverified workspace identity lets the person apply, but carries no credentials or cases.
  data.experts.push({
    id: input.expertId,
    first_name: input.firstName,
    last_name: input.lastName,
    professional_type: "DOCTOR",
    specialty: "GENERAL_PRACTICE",
    gender: input.gender,
    availability_status: "OUT_OF_OFFICE",
    consultation_fee_kobo: 0,
    credentials: [],
    next_available_start: null,
    address: input.address,
    city: input.city,
    local_government_area: input.localGovernmentArea,
    state: input.state,
    photo_url: null,
  });
  ensurePatientInvitation(data, input.patientId);
  return true;
}
