import type { Dataset } from "~/data";
import { payoutDetailsFor } from "~/data/selectors";
import type { ConsultationCloseoutReason, ConsultationRead } from "~/data/types";
import { now } from "./clock";

const ACTIVE_PROVIDER_REQUESTS = new Set(["REQUESTED", "ACCEPTED"]);
const OPEN_GUEST_STATES = new Set(["REQUESTED", "AWAITING_PATIENT_PAYMENT", "ACCEPTED"]);

export function closeoutBlockers(data: Dataset, consultationId: string) {
  const note = data.soapNotes.find((row) => row.consultation_id === consultationId);
  const missing = (["subjective", "objective", "assessment", "plan"] as const).filter(
    (field) => !note?.[field]?.trim(),
  );
  const pendingAttachments = (note?.attachments ?? []).filter(
    (attachment) => attachment.verification_status === "PENDING",
  ).length;
  const consultation = data.consultations.find((row) => row.id === consultationId);
  const guestOpen = Boolean(
    consultation?.guest_examination_status &&
      OPEN_GUEST_STATES.has(consultation.guest_examination_status),
  );
  const openRequests = data.providerRequests.filter(
    (request) =>
      request.consultation_id === consultationId && ACTIVE_PROVIDER_REQUESTS.has(request.status),
  );
  return { note, missing, pendingAttachments, guestOpen, openRequests };
}

export type CompletionResult =
  | { ok: true; alreadyComplete: boolean }
  | {
      ok: false;
      reason:
        | "NOT_ACTIVE"
        | "MISSING_RECORD"
        | "OPEN_GUEST"
        | "OPEN_ORDER"
        | "PENDING_ATTACHMENT"
        | "CONFLICT";
    };

export function completeConsultation(data: Dataset, consultationId: string): CompletionResult {
  const consultation = data.consultations.find((row) => row.id === consultationId);
  if (!consultation) return { ok: false, reason: "NOT_ACTIVE" };
  if (
    consultation.status === "COMPLETED" &&
    consultation.closeout_reason &&
    consultation.closeout_version
  ) {
    return { ok: true, alreadyComplete: true };
  }
  if (consultation.closeout_version || consultation.status === "CANCELLED")
    return { ok: false, reason: "CONFLICT" };
  if (consultation.status !== "ACTIVE") return { ok: false, reason: "NOT_ACTIVE" };
  const blockers = closeoutBlockers(data, consultationId);
  if (blockers.missing.length) return { ok: false, reason: "MISSING_RECORD" };
  if (blockers.pendingAttachments) return { ok: false, reason: "PENDING_ATTACHMENT" };
  if (blockers.guestOpen) return { ok: false, reason: "OPEN_GUEST" };
  if (blockers.openRequests.length) return { ok: false, reason: "OPEN_ORDER" };

  const closedAt = now().toISOString().slice(0, 19);
  consultation.status = "COMPLETED";
  consultation.completed_at = closedAt;
  consultation.closed_at = closedAt;
  consultation.closed_by = "EXPERT";
  consultation.closeout_version = 1;
  consultation.closeout_reason =
    consultation.call_outcome === "CONNECTION_FAILED" &&
    data.chatMessages.some((message) => message.consultation_id === consultationId)
      ? "FAILED_CALL_CHAT_COMPLETED"
      : "CLINICAL_COMPLETION";
  consultation.refund_outcome = "NOT_ELIGIBLE";
  consultation.payout_outcome = "PAYABLE";
  if (blockers.note) blockers.note.finalized_at = closedAt;

  const checkout = data.checkoutPayments.find(
    (payment) => payment.consultation_id === consultationId && payment.payer_role !== "GUEST",
  );
  if (
    checkout?.status === "PAID" &&
    !data.providerPayouts.some((payout) => payout.checkout_payment_id === checkout.id)
  ) {
    const payout = payoutDetailsFor(data, consultation.expert_id);
    data.providerPayouts.push({
      id: `pp_closeout_${consultationId}`,
      checkout_payment_id: checkout.id,
      provider_id: consultation.expert_id,
      provider_type: "SPECIALIST",
      amount_kobo: checkout.provider_amount_kobo,
      status: "PENDING",
      bank_account_last4: payout?.payout_bank_account_number?.slice(-4) ?? "----",
      bank_code: payout?.payout_bank_code ?? "",
      account_name: payout?.payout_account_name ?? "Verified expert",
      transfer_reference: null,
      initiated_at: closedAt,
      completed_at: null,
      failure_reason: null,
    });
  }
  addSystemEvent(
    data,
    consultation,
    "completed",
    "Expert completed the consultation. The clinical record is now final.",
  );
  return { ok: true, alreadyComplete: false };
}

export function terminalCloseout(
  data: Dataset,
  consultationId: string,
  actor: "PATIENT" | "EXPERT",
  reason: Exclude<ConsultationCloseoutReason, "CLINICAL_COMPLETION" | "FAILED_CALL_CHAT_COMPLETED">,
) {
  const consultation = data.consultations.find((row) => row.id === consultationId);
  if (!consultation || consultation.closeout_version || consultation.status === "COMPLETED")
    return false;
  const allowed =
    actor === "PATIENT"
      ? reason === "PATIENT_CANCELLED" || reason === "EXPERT_NO_SHOW"
      : reason === "EXPERT_CANCELLED" ||
        reason === "PATIENT_NO_SHOW" ||
        reason === "WINDOW_ELAPSED";
  if (!allowed || !["SCHEDULED", "ACTIVE"].includes(consultation.status)) return false;
  const closedAt = now().toISOString().slice(0, 19);
  consultation.status = "CANCELLED";
  consultation.cancelled_at = closedAt;
  consultation.cancelled_by = actor;
  consultation.cancellation_reason = reason.replaceAll("_", " ").toLowerCase();
  consultation.closeout_reason = reason;
  consultation.closed_by = actor;
  consultation.closed_at = closedAt;
  consultation.closeout_version = 1;
  consultation.slot_released_at = closedAt;
  consultation.refund_outcome = "PENDING";
  consultation.payout_outcome = "WITHHELD";
  const checkout = data.checkoutPayments.find(
    (payment) => payment.consultation_id === consultationId && payment.payer_role !== "GUEST",
  );
  if (checkout?.status === "PAID") checkout.status = "REFUND_PENDING";
  for (const payout of data.providerPayouts.filter(
    (row) => row.checkout_payment_id === checkout?.id,
  )) {
    payout.status = "REVERSED";
  }
  if (
    checkout &&
    !data.refundRequests.some((request) => request.consultation_id === consultationId)
  ) {
    data.refundRequests.push({
      id: `rr_closeout_${consultationId}`,
      consultation_id: consultationId,
      checkout_payment_id: checkout.id,
      patient_id: consultation.patient_identity_id,
      reason: "NON_PERFORMANCE",
      filed_at: closedAt,
      decision_due_by: closedAt,
      decided_at: closedAt,
      decision: "Automatic full refund after consultation non-performance closeout.",
      decision_final: true,
      refund_issued: true,
      elaboration: reason.replaceAll("_", " ").toLowerCase(),
    });
  }
  addSystemEvent(
    data,
    consultation,
    "closed",
    `Consultation closed: ${reason.replaceAll("_", " ").toLowerCase()}.`,
  );
  return true;
}

export function resolveCloseoutDependencies(data: Dataset, consultationId: string) {
  const consultation = data.consultations.find((row) => row.id === consultationId);
  if (consultation?.status !== "ACTIVE") return;
  if (
    consultation.guest_examination_status &&
    OPEN_GUEST_STATES.has(consultation.guest_examination_status)
  ) {
    consultation.guest_examination_status = "DECLINED";
    const guestCheckout = data.checkoutPayments.find(
      (payment) => payment.consultation_id === consultationId && payment.payer_role === "GUEST",
    );
    if (guestCheckout?.status === "PAID") guestCheckout.status = "REFUND_PENDING";
  }
  for (const request of data.providerRequests.filter(
    (row) => row.consultation_id === consultationId && ACTIVE_PROVIDER_REQUESTS.has(row.status),
  )) {
    request.status = "OBSOLETE";
    request.terminal_reason = "Clinical order withdrawn before consultation closeout.";
    request.capacity_released_at = now().toISOString().slice(0, 19);
    const checkout = data.checkoutPayments.find(
      (payment) => payment.id === request.checkout_payment_id,
    );
    if (checkout?.status === "PAID") checkout.status = "REFUND_PENDING";
  }
}

function addSystemEvent(
  data: Dataset,
  consultation: ConsultationRead,
  suffix: string,
  body: string,
) {
  const id = `msg_closeout_${consultation.id}_${consultation.closeout_version}_${suffix}`;
  if (data.chatMessages.some((message) => message.id === id)) return;
  data.chatMessages.push({
    id,
    consultation_id: consultation.id,
    sender_type: "EXPERT",
    type: "SYSTEM",
    body,
    media_url: null,
    sent_at: consultation.closed_at ?? now().toISOString().slice(0, 19),
  });
}
