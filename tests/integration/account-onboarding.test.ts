import { beforeAll, expect, it } from "vitest";
import { buildDataset, loadPrototypeData } from "../../app/data";
import {
  accountCanManagePatient,
  managedPatientsForAccount,
  notificationPrefsFor,
  PATIENT_ID,
  selfPatient,
  twoFactorFor,
} from "../../app/data/selectors";
import { createPrototypeAccount } from "../../app/lib/account-onboarding";

beforeAll(async () => {
  await loadPrototypeData();
});

it("creates a separate patient account without inheriting fixture records or credentials", () => {
  const data = buildDataset();
  const originalPatients = structuredClone(data.patients);
  const originalExperts = structuredClone(data.experts);
  expect(
    createPrototypeAccount(data, {
      userId: "new_user",
      patientId: "new_patient",
      expertId: "new_expert",
      firstName: "Chidinma",
      lastName: "Nwachukwu",
      phone: "08062223344",
      dateOfBirth: "1994-03-18",
      gender: "FEMALE",
      address: "18 Test Road",
      city: "Ikeja",
      localGovernmentArea: "Ikeja",
      state: "Lagos",
    }),
  ).toBe(true);
  expect(selfPatient(data)).toMatchObject({
    id: "new_patient",
    first_name: "Chidinma",
    address: "18 Test Road",
    status: "UNVERIFIED",
  });
  expect(managedPatientsForAccount(data).map((patient) => patient.id)).toEqual(["new_patient"]);
  expect(accountCanManagePatient(data, PATIENT_ID)).toBe(false);
  expect(data.experts.find((expert) => expert.id === "new_expert")?.credentials).toEqual([]);
  expect(data.patients.slice(0, originalPatients.length)).toEqual(originalPatients);
  expect(data.experts.slice(0, originalExperts.length)).toEqual(originalExperts);
  expect(
    data.consultations.filter(
      (consultation) =>
        consultation.patient_identity_id === "new_patient" ||
        consultation.expert_id === "new_expert",
    ),
  ).toEqual([]);
  expect(data.user.has_expert_identity).toBe(false);
  expect(data.paymentMethods).toEqual([]);
  const invitation = data.referralCodes.find((row) => row.patient_id === "new_patient");
  expect(invitation?.referral_code).toMatch(/^INV-DEMO-/);
  expect(invitation?.referral_link).toContain(encodeURIComponent(invitation!.referral_code));
  expect(invitation?.referral_code).not.toContain("new_patient");
  expect(data.deviceSessions).toHaveLength(1);
  expect(data.deviceSessions[0].is_current).toBe(true);
  expect(notificationPrefsFor(data, "patient").subject_id).toBe("new_user");
  expect(twoFactorFor(data, "mobile")).toMatchObject({
    subject_id: "new_user",
    enabled: false,
    recovery_codes_remaining: 0,
  });
});
