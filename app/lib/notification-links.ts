import type { Dataset } from "~/data";
import { FIXTURE_IDS } from "~/data/identities.generated";
import { EXPERT_ID, LAB_ID, PHARMACY_ID } from "~/data/selectors";
import { now } from "~/lib/clock";

export type NotificationAudience = "patient" | "expert" | "pharmacy" | "lab" | "staff";

export interface NotificationEntry {
  id: string;
  audience: NotificationAudience;
  title: string;
  detail: string;
  recordId: string;
  expiresAt?: string;
}

export const notificationEntries: NotificationEntry[] = [
  {
    id: "booking-accepted",
    audience: "patient",
    title: "Booking accepted",
    detail: "Dr. Aisha Musa confirmed your appointment.",
    recordId: "con_004",
  },
  {
    id: "booking-declined",
    audience: "patient",
    title: "Booking declined",
    detail: "This booking could not go ahead. Open it to see the current status.",
    recordId: "con_005",
  },
  {
    id: "appointment-reminder",
    audience: "patient",
    title: "Appointment reminder",
    detail: "Your appointment with Dr. Aisha Musa is coming up.",
    recordId: "con_004",
  },
  {
    id: "expired-reminder",
    audience: "patient",
    title: "Earlier appointment reminder",
    detail: "This older reminder is no longer active.",
    recordId: "con_001",
    expiresAt: "2026-08-08T09:15:00",
  },
  {
    id: "provider-accepted",
    audience: "patient",
    title: "Pharmacy request accepted",
    detail: "Greenlife Pharmacy accepted your request.",
    recordId: "preq_001",
  },
  {
    id: "refund-updated",
    audience: "patient",
    title: "Refund updated",
    detail: "Your declined booking payment has been refunded.",
    recordId: "chk_005",
  },
  {
    id: "lab-result-ready",
    audience: "patient",
    title: "Lab result ready",
    detail: "Your vitamin D result is ready to review.",
    recordId: FIXTURE_IDS.lab_002,
  },
  {
    id: "expert-reminder",
    audience: "expert",
    title: "Consultation reminder",
    detail: "Your next scheduled consultation is ready to review.",
    recordId: "con_102",
  },
  {
    id: "licence-expiry",
    audience: "pharmacy",
    title: "Licence renewal reminder",
    detail: "Review the current premises licence before it expires.",
    recordId: "pcred_greenlife_licence",
  },
  {
    id: "lab-request-accepted",
    audience: "lab",
    title: "Accepted lab request",
    detail: "Open the exact request that is now in progress.",
    recordId: "preq_202",
  },
  {
    id: "overdue-staff-queue",
    audience: "staff",
    title: "Application review overdue",
    detail: "A provider application is past its review time.",
    recordId: FIXTURE_IDS.app_001,
  },
];

export type NotificationResolution =
  | { available: true; href: string; entry: NotificationEntry }
  | {
      available: false;
      reason: "expired" | "not_found" | "resolved" | "wrong_patient" | "wrong_role";
      entry?: NotificationEntry;
    };

export function resolveNotificationLink(
  data: Dataset,
  notificationId: string,
  audience: NotificationAudience,
  activePatientId: string,
): NotificationResolution {
  const entry = notificationEntries.find((candidate) => candidate.id === notificationId);
  if (!entry) return { available: false, reason: "not_found" };
  if (entry.audience !== audience) return { available: false, reason: "wrong_role", entry };
  if (entry.expiresAt && Date.parse(entry.expiresAt) <= now().getTime())
    return { available: false, reason: "expired", entry };

  if (entry.id === "booking-accepted" || entry.id === "appointment-reminder") {
    const record = data.consultations.find((candidate) => candidate.id === entry.recordId);
    if (!record) return { available: false, reason: "not_found", entry };
    if (record.patient_identity_id !== activePatientId)
      return { available: false, reason: "wrong_patient", entry };
    if (record.status !== "SCHEDULED") return { available: false, reason: "resolved", entry };
    return { available: true, href: `/app/consultations/${record.id}`, entry };
  }
  if (entry.id === "booking-declined") {
    const record = data.consultations.find((candidate) => candidate.id === entry.recordId);
    if (!record) return { available: false, reason: "not_found", entry };
    if (record.patient_identity_id !== activePatientId)
      return { available: false, reason: "wrong_patient", entry };
    if (record.status !== "DECLINED") return { available: false, reason: "resolved", entry };
    return { available: true, href: `/app/consultations/${record.id}/booking`, entry };
  }
  if (entry.id === "provider-accepted") {
    const record = data.providerRequests.find((candidate) => candidate.id === entry.recordId);
    if (!record) return { available: false, reason: "not_found", entry };
    if (record.patient_identity_id !== activePatientId)
      return { available: false, reason: "wrong_patient", entry };
    if (record.status !== "ACCEPTED") return { available: false, reason: "resolved", entry };
    const orderId = record.prescription_id ?? record.lab_order_id;
    return orderId
      ? {
          available: true,
          href: record.prescription_id
            ? `/app/prescriptions/${orderId}/order`
            : `/app/lab-orders/${orderId}/request`,
          entry,
        }
      : { available: false, reason: "not_found", entry };
  }
  if (entry.id === "refund-updated") {
    const record = data.checkoutPayments.find((candidate) => candidate.id === entry.recordId);
    if (!record) return { available: false, reason: "not_found", entry };
    if (record.patient_id !== activePatientId)
      return { available: false, reason: "wrong_patient", entry };
    if (record.status !== "REFUNDED") return { available: false, reason: "resolved", entry };
    return { available: true, href: `/app/consultations/${record.consultation_id}/booking`, entry };
  }
  if (entry.id === "lab-result-ready") {
    const record = data.labOrders.find((candidate) => candidate.id === entry.recordId);
    const consultation = record
      ? data.consultations.find((candidate) => candidate.id === record.consultation_id)
      : undefined;
    if (!record || !consultation) return { available: false, reason: "not_found", entry };
    if (consultation.patient_identity_id !== activePatientId)
      return { available: false, reason: "wrong_patient", entry };
    if (record.result_status !== "ATTACHED") return { available: false, reason: "resolved", entry };
    return { available: true, href: `/app/lab-orders/${record.id}/result`, entry };
  }
  if (entry.id === "expert-reminder") {
    const record = data.consultations.find((candidate) => candidate.id === entry.recordId);
    if (!record) return { available: false, reason: "not_found", entry };
    if (record.expert_id !== EXPERT_ID) return { available: false, reason: "wrong_role", entry };
    if (!new Set(["REQUESTED", "SCHEDULED", "ACTIVE"]).has(record.status))
      return { available: false, reason: "resolved", entry };
    return { available: true, href: `/app/expert/consultations/${record.id}`, entry };
  }
  if (entry.id === "licence-expiry") {
    const record = data.providerCredentials.find((candidate) => candidate.id === entry.recordId);
    return record && record.provider_id === PHARMACY_ID && !record.retired_at
      ? { available: true, href: "/pharmacy/renew-licence", entry }
      : { available: false, reason: "resolved", entry };
  }
  if (entry.id === "lab-request-accepted") {
    const record = data.providerRequests.find((candidate) => candidate.id === entry.recordId);
    return record && record.provider_id === LAB_ID && record.status === "ACCEPTED"
      ? { available: true, href: `/lab/requests/${record.id}`, entry }
      : { available: false, reason: "resolved", entry };
  }
  const application = data.applicationsQueue.find((candidate) => candidate.id === entry.recordId);
  if (!application) return { available: false, reason: "not_found", entry };
  if (!application.overdue || application.verification_status !== "PENDING")
    return { available: false, reason: "resolved", entry };
  return { available: true, href: `/console/applications/${application.id}`, entry };
}
