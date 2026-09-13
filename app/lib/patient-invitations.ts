import type { Dataset } from "~/data";

/** Stable demonstration codes, separate from health-record identifiers. */
export function ensurePatientInvitation(data: Dataset, patientId: string) {
  const existing = data.referralCodes.find((row) => row.patient_id === patientId);
  if (existing) return existing;
  const patient = data.patients.find((row) => row.id === patientId && !row.is_dependant);
  if (!patient) return undefined;
  let number = data.referralCodes.length + 1;
  let code = `INV-DEMO-${String(number).padStart(6, "0")}`;
  while (data.referralCodes.some((row) => row.referral_code === code)) {
    number += 1;
    code = `INV-DEMO-${String(number).padStart(6, "0")}`;
  }
  const invitation = {
    patient_id: patientId,
    referral_code: code,
    referral_link: `https://monovella.com/?ref=${encodeURIComponent(code)}`,
    converted_count: 0,
  };
  data.referralCodes.push(invitation);
  return invitation;
}
