import type { Dataset } from "~/data";
import type { Gender, GuardianReason, PatientRead } from "~/data/types";
import { now } from "~/lib/clock";

/** Browser-only confirmation state; no SMS or identity service is contacted. */
export interface DependantConfirmation {
  patient: PatientRead;
  guardianName: string;
  phone: string;
  attempts: number;
  status: "PENDING" | "LOCKED" | "CONFIRMED";
}

export function addPrototypeDependant(
  data: Dataset,
  input: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: Gender;
    reason: GuardianReason;
    phone: string;
    guardianName: string;
  },
): "ADDED" | "PENDING" | "INVALID" | "EXISTS" {
  if (
    data.patients.some((p) => p.id === input.id) ||
    data.dependantConfirmations?.some((r) => r.patient.id === input.id)
  )
    return "EXISTS";
  const today = now().toISOString().slice(0, 10);
  if (
    !input.firstName.trim() ||
    !input.lastName.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.dateOfBirth) ||
    input.dateOfBirth > today ||
    Number.isNaN(Date.parse(input.dateOfBirth))
  )
    return "INVALID";
  if (input.reason === "NO_NIN_YET" && input.phone.replace(/\D/g, "").length < 10) return "INVALID";
  const patient: PatientRead = {
    id: input.id,
    monovella_id: `MV-${input.id.slice(-8).toUpperCase()}`,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    date_of_birth: input.dateOfBirth,
    gender: input.gender,
    status: "PROVISIONAL",
    is_dependant: true,
    guardian_user_id: data.user.id,
    guardian_reason: input.reason,
    verified_at: null,
    created_at: now().toISOString(),
    address: "",
    city: "",
    local_government_area: "",
    state: "",
    photo_url: null,
  };
  if (input.reason === "NO_NIN_YET") {
    data.dependantConfirmations ??= [];
    data.dependantConfirmations.push({
      patient,
      guardianName: input.guardianName,
      phone: input.phone,
      attempts: 0,
      status: "PENDING",
    });
    return "PENDING";
  }
  data.patients.push(patient);
  return "ADDED";
}

export function confirmPrototypeDependant(data: Dataset, id: string, code: string) {
  const request = data.dependantConfirmations?.find((r) => r.patient.id === id);
  if (!request) return "NOT_FOUND";
  if (request.status === "CONFIRMED") return "CONFIRMED";
  if (request.status === "LOCKED") return "LOCKED";
  if (code !== "246810") {
    request.attempts += 1;
    if (request.attempts >= 5) request.status = "LOCKED";
    return request.status === "LOCKED" ? "LOCKED" : "INCORRECT";
  }
  if (!data.patients.some((p) => p.id === id)) data.patients.push(structuredClone(request.patient));
  request.status = "CONFIRMED";
  return "CONFIRMED";
}
