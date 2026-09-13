import type { Dataset } from "~/data";
import type { ProviderOrderStatus, ProviderRequestRead } from "~/data/types";
import { now } from "./clock";

/** A quoted price is a positive naira amount with at most two decimal places. */
export function quotedNairaToKobo(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const amount = Math.round(Number(value.trim()) * 100);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export function fulfilmentComplete(request: ProviderRequestRead) {
  return (
    request.order_status === "FULFILLED" ||
    ["UPLOADED", "CORRECTED"].includes(request.result_status ?? "")
  );
}

export function canAdvancePharmacyOrder(
  request: ProviderRequestRead,
  next: ProviderOrderStatus,
  paid: boolean,
) {
  if (
    request.status !== "ACCEPTED" ||
    request.provider_type !== "PHARMACY" ||
    fulfilmentComplete(request)
  )
    return false;
  if (next === "PREPARING") return !request.order_status || request.order_status === "PREPARING";
  if (!paid) return false;
  const handoff =
    request.delivery_or_pickup === "DELIVERY"
      ? "OUT_FOR_DELIVERY"
      : request.delivery_or_pickup === "PICKUP"
        ? "READY_FOR_PICKUP"
        : null;
  if (next === handoff) return request.order_status === "PREPARING";
  return next === "FULFILLED" && !!handoff && request.order_status === handoff;
}

/** Correcting an order stops only unfinished fulfilment of that version. */
export function stopObsoleteFulfilment(data: Dataset, orderId: string) {
  for (const request of data.providerRequests) {
    if (request.prescription_id !== orderId && request.lab_order_id !== orderId) continue;
    if (
      request.order_status === "FULFILLED" ||
      ["UPLOADED", "CORRECTED"].includes(request.result_status ?? "")
    )
      continue;
    closeProviderRequest(
      data,
      request.id,
      "OBSOLETE",
      "The expert corrected this order. Use the replacement version for a new request.",
    );
  }
}

export function closeProviderRequest(
  draft: Dataset,
  requestId: string,
  status: "CANCELLED" | "WITHDRAWN" | "UNABLE_TO_FULFIL" | "OBSOLETE",
  reason: string,
) {
  const request = draft.providerRequests.find((item) => item.id === requestId);
  if (
    !request ||
    fulfilmentComplete(request) ||
    !["REQUESTED", "ACCEPTED"].includes(request.status)
  )
    return;
  const closedAt = now().toISOString().slice(0, 19);
  const checkout = draft.checkoutPayments.find(
    (payment) => payment.provider_request_id === request.id,
  );
  draft.providerRequests = draft.providerRequests.map((item) =>
    item.id === request.id
      ? {
          ...item,
          status,
          terminal_reason: reason,
          capacity_released_at: item.slot_id ? closedAt : item.capacity_released_at,
          slot_id: null,
        }
      : item,
  );
  if (request.slot_id) {
    draft.providerSlots = draft.providerSlots.map((slot) =>
      slot.id === request.slot_id
        ? {
            ...slot,
            booked_count: Math.max(0, (slot.booked_count ?? 0) - 1),
            taken: false,
          }
        : slot,
    );
  }
  if (!checkout) return;
  draft.checkoutPayments = draft.checkoutPayments.map((payment) =>
    payment.id === checkout.id
      ? {
          ...payment,
          status:
            payment.status === "PAID"
              ? ("REFUND_PENDING" as const)
              : ["PENDING", "FAILED"].includes(payment.status)
                ? ("FAILED" as const)
                : payment.status,
        }
      : payment,
  );
  if (checkout.status === "PAID") {
    draft.providerPayouts = draft.providerPayouts.map((payout) =>
      payout.checkout_payment_id === checkout.id
        ? { ...payout, status: "REVERSED" as const }
        : payout,
    );
  }
}
