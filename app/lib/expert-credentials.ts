import type { CredentialTier, ExpertRead, ProfessionalType, Specialty } from "~/data/types";

/** V0's fellowship ladder belongs to doctors with an existing verified claim. */
export function canAddFellowship(expert: ExpertRead | undefined): boolean {
  return (
    !!expert &&
    expert.professional_type === "DOCTOR" &&
    expert.credentials.some((credential) => credential.verification_status === "VERIFIED")
  );
}

/** Fellowship specialties supported by the prototype's doctor credential contract. */
const FELLOWSHIP_SPECIALTIES: readonly Specialty[] = [
  "DERMATOLOGY",
  "PEDIATRICS",
  "OBSTETRICS_GYNECOLOGY",
  "CARDIOLOGY",
  "ENDOCRINOLOGY",
  "GASTROENTEROLOGY",
  "NEUROLOGY",
  "PSYCHIATRY",
  "ORTHOPEDICS",
  "OTORHINOLARYNGOLOGY",
  "OPHTHALMOLOGY",
  "UROLOGY",
  "NEPHROLOGY",
  "PULMONOLOGY",
  "INFECTIOUS_DISEASE",
  "GENERAL_SURGERY",
];

export function isFellowshipSpecialty(specialty: string): specialty is Specialty {
  return FELLOWSHIP_SPECIALTIES.includes(specialty as Specialty);
}

const PROFESSIONAL_SPECIALTIES: Partial<Record<ProfessionalType, readonly Specialty[]>> = {
  PHYSIOTHERAPIST: ["PHYSIOTHERAPY"],
  NURSE: [
    "CHRONIC_DISEASE_MONITORING",
    "WOUND_CARE_GUIDANCE",
    "MATERNAL_CHILD_HEALTH",
    "POST_OP_FOLLOW_UP",
  ],
  PHARMACIST: ["MEDICATION_THERAPY_MANAGEMENT", "OTC_WELLNESS_COUNSELING"],
  LAB_SCIENTIST: ["RESULT_INTERPRETATION_REFERRAL"],
};
export function specialtyMatchesProfession(type: ProfessionalType, specialty: string): boolean {
  return type === "DOCTOR"
    ? specialty === "GENERAL_PRACTICE" || isFellowshipSpecialty(specialty)
    : !!PROFESSIONAL_SPECIALTIES[type]?.includes(specialty as Specialty);
}
export function specialtyClaimTier(type: ProfessionalType, specialty: Specialty): CredentialTier {
  return type === "DOCTOR" ? (specialty === "GENERAL_PRACTICE" ? "GP" : "SPECIALIST") : "GENERAL";
}
