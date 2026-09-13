/**
 * The static fixture contract.
 *
 * Guards the relationships that keep the demonstration scenarios internally
 * credible: checkout arithmetic, uniqueness, patient scoping and the
 * cross-references between consultations, prescriptions, lab orders, provider
 * requests and payments. It does not validate a backend; it catches an
 * impossible sample before a screen can imply a flow the planned product does
 * not support.
 *
 * Ported from scripts/fixture-contract.ts. Every check is the same; the
 * identifiers are not. Fixture rows carry deterministic UUIDs derived from the
 * generator's slugs, so a comparison against "pat_amara" matches nothing and
 * reads as a passing check on an empty set. Everything here goes through
 * uid().
 */
import { describe, expect, it } from "vitest";
import careAccessGrants from "../../app/data/care-access-grants.json";
import checkoutPayments from "../../app/data/checkout-payments.json";
import companionMemory from "../../app/data/companion-memory.json";
import companionMessages from "../../app/data/companion-messages.json";
import consultations from "../../app/data/consultations.json";
import expertAvailability from "../../app/data/expert-availability.json";
import expertScheduleExceptions from "../../app/data/expert-schedule-exceptions.json";
import experts from "../../app/data/experts.json";
import labOrders from "../../app/data/lab-orders.json";
import logEntries from "../../app/data/log-entries.json";
import meta from "../../app/data/meta.json";
import patients from "../../app/data/patients.json";
import prescriptions from "../../app/data/prescriptions.json";
import providerRequests from "../../app/data/provider-requests.json";
import providerScheduleExceptions from "../../app/data/provider-schedule-exceptions.json";
import providerSlots from "../../app/data/provider-schedule-slots.json";
import providers from "../../app/data/providers.json";
import reference from "../../app/data/reference.json";
import reports from "../../app/data/reports.json";
import { uid } from "../../scripts/prisma-common";

type Checkout = (typeof checkoutPayments)[number];
type Consultation = (typeof consultations)[number];
type ExpertAvailability = (typeof expertAvailability)[number];
type ExpertScheduleException = (typeof expertScheduleExceptions)[number];
type Patient = (typeof patients)[number];
type ProviderScheduleException = (typeof providerScheduleExceptions)[number];
type ProviderSlot = (typeof providerSlots)[number];
type ProviderRequest = (typeof providerRequests)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const failures: string[] = [];
const paymentById = new Map(checkoutPayments.map((payment) => [payment.id, payment]));
const paymentsByConsultation = new Map<string, Checkout[]>();
const patientById = new Map(patients.map((patient) => [patient.id, patient]));
const expertById = new Map(experts.map((expert) => [expert.id, expert]));
const providerById = new Map(providers.map((provider) => [provider.id, provider]));
const consultationById = new Map(
  consultations.map((consultation) => [consultation.id, consultation]),
);
const labOrderById = new Map(labOrders.map((order) => [order.id, order]));
const prescriptionById = new Map(
  prescriptions.map((prescription) => [prescription.id, prescription]),
);
const anchorDate = meta.anchor.slice(0, 10);

if (meta.openapi_version !== "0.34.0") {
  failures.push(`meta: expected OpenAPI 0.34.0, found ${meta.openapi_version}.`);
}

for (const consultation of consultations) {
  const summary = consultation.request_summary;
  if (
    consultation.status === "REQUESTED" &&
    !consultation.referred_from_id &&
    (typeof summary !== "string" || summary.trim().length < 10 || summary.trim().length > 1000)
  ) {
    failures.push(`${consultation.id}: a direct booking request needs a valid request summary.`);
  }
}

for (const message of companionMessages as Array<Record<string, unknown>>) {
  if (typeof message.patient_id !== "string" || !patientById.has(message.patient_id)) {
    failures.push(`${String(message.id)}: companion message has no valid patient scope.`);
  }
  if (!("emergency_routing" in message)) {
    failures.push(`${String(message.id)}: companion message omits emergency_routing.`);
    continue;
  }
  const routing = message.emergency_routing as Record<string, unknown> | null;
  if (
    routing &&
    (routing.outcome !== "POSSIBLE_EMERGENCY" ||
      routing.next_action !== "SEEK_IMMEDIATE_IN_PERSON_CARE" ||
      routing.emergency_phone !== "112" ||
      message.item !== null ||
      message.pending_confirmation !== false)
  ) {
    failures.push(
      `${String(message.id)}: emergency companion response violates the shared boundary.`,
    );
  }
}

for (const memory of companionMemory) {
  if (!patientById.has(memory.patient_id)) {
    failures.push(`${memory.id}: companion memory points to a missing patient.`);
  }
}

for (const entry of logEntries) {
  if (!patientById.has(entry.patient_id)) {
    failures.push(`${entry.id}: log entry points to a missing patient.`);
  }
}

for (const report of reports) {
  if (!patientById.has(report.patient_id)) {
    failures.push(`${report.id}: report points to a missing patient.`);
  }
  if (report.consultation_id) {
    const consultation = consultationById.get(report.consultation_id);
    if (!consultation || consultation.patient_identity_id !== report.patient_id) {
      failures.push(`${report.id}: consultation report crosses patient boundaries.`);
    }
  }
}

function assertUnique<T extends { id: string }>(name: string, records: readonly T[]) {
  const ids = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id)) failures.push(`${name}: duplicate id ${record.id}.`);
    ids.add(record.id);
  }
}

function isTimeRange(start: string | null, end: string | null) {
  return start != null && end != null && start < end;
}

function overlaps(start: string, end: string, otherStart: string, otherEnd: string) {
  return start < otherEnd && otherStart < end;
}

if (!meta.note.toLowerCase().includes("demo data")) {
  failures.push("meta: must clearly mark fixture data as a demo, not live records.");
}

assertUnique("patients", patients);
assertUnique("experts", experts);
assertUnique("consultations", consultations);
assertUnique("care access grants", careAccessGrants);
assertUnique("lab orders", labOrders);
assertUnique("provider slots", providerSlots);
assertUnique("expert schedule exceptions", expertScheduleExceptions);
assertUnique("provider schedule exceptions", providerScheduleExceptions);

for (const patient of patients as Patient[]) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(patient.date_of_birth) || patient.date_of_birth >= anchorDate) {
    failures.push(`${patient.id}: date of birth must be a valid date before the fixture anchor.`);
  }
  const lgas =
    reference.local_government_areas_by_state[
      patient.state as keyof typeof reference.local_government_areas_by_state
    ];
  if (!lgas?.includes(patient.local_government_area)) {
    failures.push(
      `${patient.id}: location does not map to a known state and Local Government Area.`,
    );
  }
  if (patient.is_dependant) {
    if (!patient.guardian_user_id || !patient.guardian_reason) {
      failures.push(`${patient.id}: dependant is missing a guardian relationship.`);
    }
  } else if (patient.guardian_user_id || patient.guardian_reason) {
    failures.push(`${patient.id}: independent adult should not carry dependant guardian fields.`);
  }
}

if (
  !patients.some((patient) => patient.is_dependant) ||
  !patients.some((patient) => !patient.is_dependant)
) {
  failures.push("patients: fixture set needs both independent and dependant care scenarios.");
}

for (const grant of careAccessGrants) {
  if (!patientById.has(grant.patient_identity_id)) {
    failures.push(`${grant.id}: care-access grant points to a missing patient.`);
  }
  if (grant.status === "CURRENT" && (grant.ended_at || grant.end_reason)) {
    failures.push(`${grant.id}: current care-access grant has terminal fields.`);
  }
  if (grant.status === "ENDED" && (!grant.ended_at || !grant.end_reason)) {
    failures.push(`${grant.id}: ended care-access grant lacks terminal evidence.`);
  }
  if (grant.grantee_type === "EXPERT" || grant.grantee_type === "GUEST_EXPERT") {
    if (!expertById.has(grant.grantee_id) || !consultationById.has(grant.care_event_id)) {
      failures.push(`${grant.id}: expert grant lacks a valid expert or consultation.`);
    }
  } else if (grant.grantee_type === "PHARMACY" || grant.grantee_type === "LAB") {
    const provider = providerById.get(grant.grantee_id);
    const request = providerRequests.find((item) => item.id === grant.care_event_id);
    if (!provider || !request || request.provider_id !== provider.id) {
      failures.push(`${grant.id}: provider grant lacks its directed provider request.`);
    }
  }
}

if (
  !patients.some(
    (patient) =>
      patient.id === uid("pat_kelechi") &&
      patient.status === "VERIFIED" &&
      patient.guardian_user_id === uid("acc_amara"),
  ) ||
  !patients.some(
    (patient) => patient.status === "PROVISIONAL" && patient.guardian_reason === "MINOR",
  ) ||
  !patients.some(
    (patient) => patient.status === "PROVISIONAL" && patient.guardian_reason === "NO_NIN_YET",
  )
) {
  failures.push(
    "patients: guardian demo needs a verified dependant plus provisional minor and no-NIN cases.",
  );
}

for (const patientId of [uid("pat_amara"), uid("pat_kelechi"), uid("pat_tobi")]) {
  if (!companionMessages.some((message) => message.patient_id === patientId)) {
    failures.push(`${patientId}: needs a patient-scoped Teni conversation sentinel.`);
  }
  if (!companionMemory.some((memory) => memory.patient_id === patientId)) {
    failures.push(`${patientId}: needs a patient-scoped Teni memory sentinel.`);
  }
}

for (const consultation of consultations as Consultation[]) {
  if (!patientById.has(consultation.patient_identity_id)) {
    failures.push(`${consultation.id}: consultation points to a missing patient.`);
  }
  if (!expertById.has(consultation.expert_id)) {
    failures.push(`${consultation.id}: consultation points to a missing expert.`);
  }
  if (
    (consultation.scheduled_start == null) !== (consultation.scheduled_end == null) ||
    (consultation.scheduled_start &&
      consultation.scheduled_end &&
      consultation.scheduled_start >= consultation.scheduled_end)
  ) {
    failures.push(`${consultation.id}: scheduled consultation needs one ordered start and end.`);
  }
}

const appointmentsByExpert = new Map<string, Consultation[]>();
for (const consultation of consultations as Consultation[]) {
  if (
    consultation.status === "CANCELLED" ||
    consultation.scheduled_start == null ||
    consultation.scheduled_end == null
  ) {
    continue;
  }
  const appointments = appointmentsByExpert.get(consultation.expert_id) ?? [];
  appointments.push(consultation);
  appointmentsByExpert.set(consultation.expert_id, appointments);
}

for (const [expertId, appointments] of appointmentsByExpert) {
  const ordered = [...appointments].sort((a, b) =>
    a.scheduled_start!.localeCompare(b.scheduled_start!),
  );
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (previous.scheduled_end! > current.scheduled_start!) {
      failures.push(`${expertId}: ${previous.id} and ${current.id} overlap.`);
    }
  }
}

for (const order of labOrders) {
  if (!consultationById.has(order.consultation_id)) {
    failures.push(`${order.id}: lab order points to a missing consultation.`);
  }
  if (!order.test_requested.trim())
    failures.push(`${order.id}: lab order must name the requested test.`);
  if (
    order.recommended_lab_id &&
    providerById.get(order.recommended_lab_id)?.provider_type !== "LAB"
  ) {
    failures.push(`${order.id}: recommended provider is not a laboratory.`);
  }
}

for (const slot of providerSlots as ProviderSlot[]) {
  if (providerById.get(slot.provider_id)?.provider_type !== "LAB") {
    failures.push(`${slot.id}: collection window belongs to a missing or non-lab provider.`);
  }
  if (
    !Number.isInteger(slot.capacity) ||
    slot.capacity < 1 ||
    slot.booked_count < 0 ||
    slot.booked_count > slot.capacity
  ) {
    failures.push(`${slot.id}: booked count must stay within positive collection capacity.`);
  }
  const isTaken = slot.booked_count >= slot.capacity;
  if (slot.taken !== isTaken) {
    failures.push(`${slot.id}: taken must reflect booked count and capacity.`);
  }
  if (!isTimeRange(slot.start_time, slot.end_time)) {
    failures.push(`${slot.id}: collection window must have an ordered time range.`);
  }
  if (
    slot.specific_date
      ? slot.day_of_week != null
      : slot.day_of_week == null || slot.day_of_week < 0 || slot.day_of_week > 6
  ) {
    failures.push(
      `${slot.id}: collection window needs either a specific date or a weekday from Monday to Sunday.`,
    );
  }
}

for (const exception of expertScheduleExceptions as ExpertScheduleException[]) {
  if (!expertById.has(exception.expert_id)) {
    failures.push(`${exception.id}: dated expert change points to a missing expert.`);
  }
  if (
    (exception.start_time == null) !== (exception.end_time == null) ||
    (exception.start_time && !isTimeRange(exception.start_time, exception.end_time))
  ) {
    failures.push(`${exception.id}: partial dated expert change must have an ordered time range.`);
  }
  for (const slot of expertAvailability as ExpertAvailability[]) {
    if (
      !slot.taken &&
      exception.kind === "UNAVAILABLE" &&
      slot.expert_id === exception.expert_id &&
      slot.start.slice(0, 10) === exception.date &&
      (exception.start_time == null ||
        overlaps(
          slot.start.slice(11, 16),
          slot.end.slice(11, 16),
          exception.start_time,
          exception.end_time!,
        ))
    ) {
      failures.push(`${exception.id}: closure still exposes unbooked availability ${slot.id}.`);
    }
  }
}

for (const exception of providerScheduleExceptions as ProviderScheduleException[]) {
  if (providerById.get(exception.provider_id)?.provider_type !== "LAB") {
    failures.push(
      `${exception.id}: dated provider closure points to a missing or non-lab provider.`,
    );
  }
  if (
    (exception.start_time == null) !== (exception.end_time == null) ||
    (exception.start_time && !isTimeRange(exception.start_time, exception.end_time))
  ) {
    failures.push(
      `${exception.id}: partial dated provider closure must have an ordered time range.`,
    );
  }
}

for (const payment of checkoutPayments) {
  const payments = paymentsByConsultation.get(payment.consultation_id) ?? [];
  payments.push(payment);
  paymentsByConsultation.set(payment.consultation_id, payments);

  if (payment.total_amount_kobo !== payment.provider_amount_kobo + payment.commission_amount_kobo) {
    failures.push(`${payment.id}: checkout total does not equal provider price plus service fee.`);
  }
}

for (const consultation of consultations as Consultation[]) {
  if (
    ["SCHEDULED", "ACTIVE", "COMPLETED"].includes(consultation.status) &&
    !paymentsByConsultation.get(consultation.id)?.length
  ) {
    failures.push(
      `${consultation.id}: ${consultation.status} requires a verified checkout record.`,
    );
  }

  if (consultation.status === "CANCELLED") {
    if (!consultation.cancelled_at || !consultation.cancelled_by) {
      failures.push(`${consultation.id}: cancelled consultation is missing cancellation metadata.`);
    }
    const refunds = paymentsByConsultation.get(consultation.id) ?? [];
    if (
      !refunds.some((payment) =>
        ["REFUND_PENDING", "REFUNDED", "REFUND_FAILED"].includes(payment.status),
      )
    ) {
      failures.push(
        `${consultation.id}: cancelled consultation is missing a refund lifecycle state.`,
      );
    }
  }
}

const disclosureConsentIds = new Set<string>();

const openFulfilmentOrders = new Set<string>();
for (const request of providerRequests as ProviderRequest[]) {
  if (["REQUESTED", "ACCEPTED"].includes(request.status)) {
    const key = `${request.provider_type}:${request.prescription_id ?? request.lab_order_id}`;
    if (openFulfilmentOrders.has(key)) {
      failures.push(`${request.id}: more than one active provider request holds the same order.`);
    }
    openFulfilmentOrders.add(key);
  }
  if (["READY_FOR_PICKUP", "OUT_FOR_DELIVERY", "FULFILLED"].includes(request.order_status ?? "")) {
    const paid = checkoutPayments.find((payment) => payment.provider_request_id === request.id);
    if (paid?.status !== "PAID") failures.push(`${request.id}: handoff precedes verified payment.`);
  }
  const legacy = ["fee_status", "paid_evidence_key", "confirmed_at"].filter(
    (key) => key in request,
  );
  if (legacy.length)
    failures.push(`${request.id}: contains retired direct-payment field(s): ${legacy.join(", ")}.`);

  const patient = patientById.get(request.patient_identity_id);
  const consultation = consultationById.get(request.consultation_id);
  const provider = providerById.get(request.provider_id);
  const consent = request.disclosure_consent;
  const expectedPurpose =
    request.provider_type === "PHARMACY" ? "PRESCRIPTION_FULFILMENT" : "LAB_TEST_FULFILMENT";
  const expectedInformation =
    expectedPurpose === "PRESCRIPTION_FULFILMENT"
      ? [
          "PATIENT_NAME",
          "PRESCRIPTION_MEDICATION",
          "PRESCRIPTION_DOSAGE",
          "PRESCRIPTION_INSTRUCTIONS",
        ]
      : ["PATIENT_NAME", "LAB_TEST_REQUESTED", "LAB_INSTRUCTIONS"];

  if (!consent) {
    failures.push(`${request.id}: provider request is missing its disclosure consent snapshot.`);
  } else {
    if (disclosureConsentIds.has(consent.id)) {
      failures.push(`${request.id}: disclosure consent id ${consent.id} is not unique.`);
    }
    disclosureConsentIds.add(consent.id);
    // The consent id used to be `pdc_${request.id}` and was asserted as such.
    // Both sides are UUIDs now, and the consent id is derived from the
    // request's generator slug rather than from the id the row ends up with,
    // so the derivation is not reproducible from the fixture alone. What is
    // still checkable is that it is its own identifier and a real one.
    if (!UUID.test(consent.id) || consent.id === request.id) {
      failures.push(`${request.id}: disclosure consent has no identifier of its own.`);
    }
    if (consent.patient_identity_id !== request.patient_identity_id) {
      failures.push(`${request.id}: disclosure consent belongs to a different patient.`);
    }
    if (consent.purpose !== expectedPurpose) {
      failures.push(
        `${request.id}: disclosure consent purpose does not match the provider request.`,
      );
    }
    if (consent.statement_version !== "provider-disclosure-v1") {
      failures.push(`${request.id}: disclosure consent uses an unsupported statement version.`);
    }
    if (JSON.stringify(consent.information_shared) !== JSON.stringify(expectedInformation)) {
      failures.push(`${request.id}: disclosure consent does not list the expected minimum fields.`);
    }
    if (!patient) {
      failures.push(`${request.id}: disclosure consent points to a missing patient.`);
    } else if (patient.is_dependant) {
      if (
        consent.authority !== "GUARDIAN" ||
        consent.actor_user_id !== patient.guardian_user_id ||
        consent.guardian_reason !== patient.guardian_reason
      ) {
        failures.push(`${request.id}: dependant disclosure consent does not match its guardian.`);
      }
    } else if (
      consent.authority !== "SELF" ||
      !UUID.test(String(consent.actor_user_id)) ||
      consent.guardian_reason !== null
    ) {
      failures.push(`${request.id}: self disclosure consent carries the wrong actor or authority.`);
    } else if (patient.id === uid("pat_amara") && consent.actor_user_id !== uid("acc_amara")) {
      // Which account gave a self consent used to be recomputed from the
      // patient id, back when both were readable slugs. It is not recoverable
      // from a UUID row, and only the demo account has an Account fixture at
      // all, so this checks the one case that is actually verifiable: the
      // account holder consenting for herself names her own account.
      failures.push(`${request.id}: the account holder's own consent names another account.`);
    }

    const consentedAt = Date.parse(`${consent.consented_at}Z`);
    const requestedAt = Date.parse(`${request.requested_at}Z`);
    if (
      !Number.isFinite(consentedAt) ||
      !Number.isFinite(requestedAt) ||
      consentedAt > requestedAt
    ) {
      failures.push(
        `${request.id}: disclosure consent must be captured no later than the request.`,
      );
    }
  }

  if (!consultation) {
    failures.push(`${request.id}: provider request points to a missing consultation.`);
  } else if (consultation.patient_identity_id !== request.patient_identity_id) {
    failures.push(`${request.id}: provider request belongs to a different consultation patient.`);
  }
  if (!provider) {
    failures.push(`${request.id}: provider request points to a missing provider.`);
  } else if (provider.provider_type !== request.provider_type) {
    failures.push(`${request.id}: provider request type does not match the selected provider.`);
  }

  if (request.provider_type === "LAB") {
    const order = request.lab_order_id ? labOrderById.get(request.lab_order_id) : undefined;
    if (!order) {
      failures.push(`${request.id}: lab request points to a missing lab order.`);
    } else if (order.consultation_id !== request.consultation_id) {
      failures.push(`${request.id}: lab order belongs to a different consultation.`);
    } else if (
      consent &&
      Date.parse(`${consent.consented_at}Z`) < Date.parse(`${order.issued_at}Z`)
    ) {
      failures.push(`${request.id}: disclosure consent predates the linked lab order.`);
    }
    if (request.slot_id) {
      const slot = providerSlots.find((candidate) => candidate.id === request.slot_id);
      if (!slot || slot.provider_id !== request.provider_id) {
        failures.push(`${request.id}: collection slot does not belong to the selected laboratory.`);
      }
    }
  } else if (request.provider_type === "PHARMACY") {
    const prescription = request.prescription_id
      ? prescriptionById.get(request.prescription_id)
      : undefined;
    if (!prescription) {
      failures.push(`${request.id}: pharmacy request points to a missing prescription.`);
    } else if (prescription.consultation_id !== request.consultation_id) {
      failures.push(`${request.id}: prescription belongs to a different consultation.`);
    } else if (
      consent &&
      Date.parse(`${consent.consented_at}Z`) < Date.parse(`${prescription.issued_at}Z`)
    ) {
      failures.push(`${request.id}: disclosure consent predates the linked prescription.`);
    }
  }

  if (!request.checkout_payment_id) continue;
  const payment = paymentById.get(request.checkout_payment_id);
  if (!payment) {
    failures.push(`${request.id}: points to missing checkout ${request.checkout_payment_id}.`);
    continue;
  }
  if (
    payment.provider_request_id !== request.id ||
    payment.consultation_id !== request.consultation_id ||
    payment.provider_id !== request.provider_id
  ) {
    failures.push(
      `${request.id}: checkout ${payment.id} does not match its request, consultation and provider.`,
    );
  }
}

const guardianLabOrder = labOrderById.get(uid("lab_006"));
const guardianLabConsultation = guardianLabOrder
  ? consultationById.get(guardianLabOrder.consultation_id)
  : undefined;
if (
  guardianLabOrder?.result_status !== "PENDING" ||
  guardianLabConsultation?.patient_identity_id !== uid("pat_tobi") ||
  providerRequests.some((request) => request.lab_order_id === guardianLabOrder?.id)
) {
  failures.push(
    "lab_006: guardian consent scenario needs Tobi's pending lab order with no provider request.",
  );
}

describe("fixture contract", () => {
  it("keeps every demo relationship internally credible", () => {
    expect(failures, `${failures.length} fixture relationship issue(s)`).toEqual([]);
  });

  it("covers the scenarios the journeys depend on", () => {
    expect(consultations.length).toBeGreaterThan(0);
    expect(checkoutPayments.length).toBeGreaterThan(0);
    expect(providerRequests.length).toBeGreaterThan(0);
  });
});

it("each pending or scheduled consultation holds one exact availability slot", () => {
  for (const booking of consultations.filter((row) =>
    ["REQUESTED", "SCHEDULED"].includes(row.status),
  )) {
    const holds = expertAvailability.filter(
      (slot) =>
        slot.expert_id === booking.expert_id &&
        slot.start === booking.scheduled_start &&
        slot.end === booking.scheduled_end &&
        slot.taken,
    );
    expect(holds, `Missing reserved time for ${booking.id}`).toHaveLength(1);
    const overlappingOpen = expertAvailability.filter(
      (slot) =>
        slot.expert_id === booking.expert_id &&
        !slot.taken &&
        slot.start < booking.scheduled_end &&
        slot.end > booking.scheduled_start,
    );
    expect(overlappingOpen, `Open time overlaps ${booking.id}`).toHaveLength(0);
  }
});
