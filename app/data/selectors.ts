// Resolved to whatever UUID scripts/gen-fixtures.ts's slugs ("pat_amara" etc.)
// became. Import these, never the slug string: the fixtures are free to
// regenerate to a different id and every lookup below stays correct.

import { nowMs, parse } from "~/lib/clock";
import { formatTime, specialtyLabel, titleCase } from "~/lib/format";
import {
  EXPERT_ID,
  LAB_ID,
  PATIENT_ID,
  PHARMACY_ID,
  STAFF_ID,
  USER_ID,
} from "./identities.generated";
import type { Dataset } from "./index";
import { providerSlotIsBookable } from "./schedule-projection";
import type {
  AvailabilityStatus,
  CalendarItem,
  ClinicalSafetyContextRead,
  ConsultationRead,
  ExpertRead,
  LabOrderDetailRead,
  NotificationScope,
  PatientRead,
  PrescriptionDetailRead,
  ProviderRequestRead,
  Specialty,
} from "./types";

// STAFF_ID is the demo account's own Back-Office identity (B6's `accountLine`)
// — used to keep it from deactivating itself.
export { EXPERT_ID, LAB_ID, PATIENT_ID, PHARMACY_ID, STAFF_ID, USER_ID };

export function expertById(d: Dataset, id: string) {
  return d.experts.find((e) => e.id === id);
}

/** The mutable practice-presence choice, falling back to the shipped directory fixture. */
export function expertAvailabilityStatus(d: Dataset, expertId: string): AvailabilityStatus {
  return (
    d.expertAvailabilityStatus[expertId] ??
    expertById(d, expertId)?.availability_status ??
    "OUT_OF_OFFICE"
  );
}

/** Out of Office stops new consultation requests; it never changes an existing booking. */
export function expertAcceptsNewWork(d: Dataset, expertId: string) {
  return expertAvailabilityStatus(d, expertId) !== "OUT_OF_OFFICE";
}

export function expertName(d: Dataset, id: string) {
  const e = expertById(d, id);
  if (!e) return "Unknown expert";
  const honorific = e.professional_type === "DOCTOR" ? "Dr. " : "";
  return `${honorific}${e.first_name} ${e.last_name}`;
}

/** The specialty this specific consultation was booked under — the chosen credential's, when one was recorded, falling back to the expert's headline specialty for consultations that pre-date multi-credential experts. */
export function consultationSpecialty(d: Dataset, c: ConsultationRead): Specialty | "" {
  const expert = expertById(d, c.expert_id);
  if (!expert) return "";
  const credential = expert.credentials.find((cred) => cred.id === c.credential_id);
  return credential?.specialty ?? expert.specialty;
}

export function patientById(d: Dataset, id: string) {
  return d.patients.find((p) => p.id === id);
}

export function patientName(d: Dataset, id: string) {
  const p = patientById(d, id);
  return p ? `${p.first_name} ${p.last_name}` : "Unknown patient";
}

export function providerById(d: Dataset, id: string) {
  return d.providers.find((p) => p.id === id);
}

/** Provider presence gates only new pharmacy/lab work, never accepted work. */
export function providerAvailabilityStatus(d: Dataset, providerId: string): AvailabilityStatus {
  const access = d.governanceAccess.find((row) => row.actor_id === providerId)?.status;
  if (access && access !== "ACTIVE") return "OUT_OF_OFFICE";
  return providerById(d, providerId)?.availability_status ?? "OUT_OF_OFFICE";
}

export function providerAcceptsNewWork(d: Dataset, providerId: string) {
  return providerAvailabilityStatus(d, providerId) !== "OUT_OF_OFFICE";
}

export function dependantsOf(d: Dataset, guardianUserId: string): PatientRead[] {
  return d.patients.filter((p) => p.guardian_user_id === guardianUserId);
}

/** The patient identity owned by the signed-in prototype account. */
export function selfPatient(d: Dataset): PatientRead | undefined {
  return patientById(d, d.accountPatientId ?? PATIENT_ID);
}

/** Every patient identity the account may act for: self plus current dependants. */
export function managedPatientsForAccount(d: Dataset, userId = d.user.id): PatientRead[] {
  const self = selfPatient(d);
  return [...(self ? [self] : []), ...dependantsOf(d, userId)];
}

export function accountCanManagePatient(
  d: Dataset,
  patientId: string,
  userId = d.user.id,
): boolean {
  return managedPatientsForAccount(d, userId).some((patient) => patient.id === patientId);
}

/** Unknown or no-longer-managed patient contexts always fail closed to self. */
export function normalizeManagedPatientId(
  d: Dataset,
  patientId: string | null | undefined,
  userId = d.user.id,
): string {
  if (patientId && accountCanManagePatient(d, patientId, userId)) return patientId;
  return selfPatient(d)?.id ?? PATIENT_ID;
}

// ─── Consultations ──────────────────────────────────────────────────────────

export function consultationsForPatient(d: Dataset, patientId: string) {
  return d.consultations
    .filter((c) => c.patient_identity_id === patientId)
    .sort((a, b) => (b.requested_at > a.requested_at ? 1 : -1));
}

export function consultationsForExpert(d: Dataset, expertId: string) {
  return d.consultations
    .filter(
      (c) =>
        c.expert_id === expertId &&
        (!c.referred_from_id ||
          (c.referral_disclosure_ack_at != null &&
            d.checkoutPayments.some(
              (payment) =>
                payment.consultation_id === c.id &&
                payment.provider_id === expertId &&
                payment.payer_role !== "GUEST" &&
                payment.status === "PAID",
            ))),
    )
    .sort((a, b) => (b.requested_at > a.requested_at ? 1 : -1));
}

export function consultationById(d: Dataset, id: string) {
  return d.consultations.find((c) => c.id === id);
}

export function consultationForPatient(d: Dataset, id: string, patientId: string) {
  return d.consultations.find((c) => c.id === id && c.patient_identity_id === patientId);
}

export function consultationForExpert(d: Dataset, id: string, expertId: string) {
  return d.consultations.find(
    (c) =>
      c.id === id &&
      c.expert_id === expertId &&
      (!c.referred_from_id || c.referral_disclosure_ack_at != null),
  );
}

/** X26 — consultations where this expert is the invited guest, not the primary. */
export function guestExaminationsFor(d: Dataset, expertId: string) {
  return d.consultations
    .filter((c) => c.guest_expert_id === expertId)
    .sort((a, b) => (b.requested_at > a.requested_at ? 1 : -1));
}

export function activeConsultation(d: Dataset, patientId: string) {
  return consultationsForPatient(d, patientId).find((c) => c.status === "ACTIVE");
}

export function soapNote(d: Dataset, consultationId: string) {
  return d.soapNotes.find((s) => s.consultation_id === consultationId);
}

export function prescriptionsFor(d: Dataset, consultationId: string) {
  return d.prescriptions.filter((p) => p.consultation_id === consultationId);
}

export function labOrdersFor(d: Dataset, consultationId: string) {
  return d.labOrders.filter((l) => l.consultation_id === consultationId);
}

export function chatFor(d: Dataset, consultationId: string) {
  return d.chatMessages
    .filter((m) => m.consultation_id === consultationId)
    .sort((a, b) => (a.sent_at > b.sent_at ? 1 : -1));
}

export function providerRequestsFor(
  d: Dataset,
  opts: { prescriptionId?: string; labOrderId?: string },
) {
  return d.providerRequests.filter((r) =>
    opts.prescriptionId
      ? r.prescription_id === opts.prescriptionId
      : r.lab_order_id === opts.labOrderId,
  );
}

export function latestProviderRequest(
  d: Dataset,
  opts: { prescriptionId?: string; labOrderId?: string },
): ProviderRequestRead | undefined {
  const all = providerRequestsFor(d, opts);
  return all.sort((a, b) => (a.requested_at > b.requested_at ? -1 : 1))[0];
}

// ─── Expert directory ───────────────────────────────────────────────────────

export interface ExpertFilters {
  specialty?: Specialty | null;
  minFeeKobo?: number | null;
  maxFeeKobo?: number | null;
  professionalType?: ExpertRead["professional_type"] | null;
  gender?: ExpertRead["gender"] | null;
  state?: string | null;
  sort?: "SOONEST_AVAILABLE" | "FEE_ASC" | "FEE_DESC";
  /**
   * The account holder's own expert identity, when they have one.
   *
   * Patient and Expert are one account with a switchable context, so without
   * this the directory offered Amara a consultation with herself: her own
   * listing in her own search, her own payment, her own request to accept. No
   * clinician consults with themselves, and the product's own account model is
   * what makes it reachable.
   */
  excludeExpertId?: string | null;
}

export function filterExperts(d: Dataset, f: ExpertFilters) {
  let list = d.experts.slice();
  if (f.excludeExpertId) list = list.filter((e) => e.id !== f.excludeExpertId);
  if (f.specialty) list = list.filter((e) => e.specialty === f.specialty);
  if (f.professionalType) list = list.filter((e) => e.professional_type === f.professionalType);
  if (f.gender) list = list.filter((e) => e.gender === f.gender);
  if (f.state) list = list.filter((e) => e.state === f.state);
  if (f.minFeeKobo != null) list = list.filter((e) => e.consultation_fee_kobo >= f.minFeeKobo!);
  if (f.maxFeeKobo != null) list = list.filter((e) => e.consultation_fee_kobo <= f.maxFeeKobo!);

  const sort = f.sort ?? "SOONEST_AVAILABLE";
  if (sort === "FEE_ASC") list.sort((a, b) => a.consultation_fee_kobo - b.consultation_fee_kobo);
  else if (sort === "FEE_DESC")
    list.sort((a, b) => b.consultation_fee_kobo - a.consultation_fee_kobo);
  else {
    // Soonest available; experts publishing no upcoming hours sort last (P36).
    list.sort((a, b) => {
      const aNext = expertAcceptsNewWork(d, a.id) ? a.next_available_start : null;
      const bNext = expertAcceptsNewWork(d, b.id) ? b.next_available_start : null;
      if (!aNext) return 1;
      if (!bNext) return -1;
      return aNext > bNext ? 1 : -1;
    });
  }
  return list;
}

export function availabilityFor(d: Dataset, expertId: string) {
  return d.expertAvailability
    .filter((s) => s.expert_id === expertId && !s.taken && parse(s.start)!.getTime() > nowMs())
    .sort((a, b) => (a.start > b.start ? 1 : -1));
}

export function scheduleFor(d: Dataset, expertId: string) {
  return d.expertSchedule
    .filter((s) => s.expert_id === expertId)
    .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
}

export function schedulingRulesFor(d: Dataset, expertId: string) {
  return d.expertSchedulingRules?.find((rule) => rule.expert_id === expertId);
}

/** One payout destination per expert; undefined until they have set one up. */
export function payoutDetailsFor(d: Dataset, expertId: string) {
  return d.expertPayoutDetails?.find((row) => row.expert_id === expertId);
}

/** One referral code per patient. */
export function referralCodeFor(d: Dataset, patientId: string) {
  return d.referralCodes?.find((row) => row.patient_id === patientId);
}

/**
 * Per-actor settings rows, addressed by the seat a screen is rendering rather
 * than by the actor's id. Provider seats resolve the active business account. Patient
 * and Expert resolve to the same User and differ only by scope — one person
 * switching context has two preference sets, not one.
 */
export type SettingsSeat = "patient" | "expert" | "pharmacy" | "lab" | "staff";

/**
 * Fixture seats and newly created accounts each have their own settings row.
 * A miss here is a broken dataset rather than a state a screen has
 * to render. Failing loudly keeps the settings screens free of guards that
 * would only ever hide a data bug.
 */
function seatRow<T>(row: T | undefined, kind: string, seat: string): T {
  if (!row) throw new Error(`No ${kind} row seeded for the ${seat} seat.`);
  return row;
}

const NOTIFICATION_SUBJECT: Record<SettingsSeat, [NotificationScope, string]> = {
  patient: ["PATIENT", USER_ID],
  expert: ["EXPERT", USER_ID],
  pharmacy: ["PHARMACY", PHARMACY_ID],
  lab: ["LAB", LAB_ID],
  staff: ["STAFF", STAFF_ID],
};

export function notificationPrefsFor(d: Dataset, seat: SettingsSeat) {
  const [scope, seededSubjectId] = NOTIFICATION_SUBJECT[seat];
  const subjectId =
    seat === "patient" || seat === "expert"
      ? d.user.id
      : seat === "pharmacy"
        ? (d.accountProviderIds?.PHARMACY ?? seededSubjectId)
        : seat === "lab"
          ? (d.accountProviderIds?.LAB ?? seededSubjectId)
          : seededSubjectId;
  return seatRow(
    d.notificationPreferences.find((row) => row.scope === scope && row.subject_id === subjectId),
    "notification preference",
    seat,
  );
}

/** The mobile seat is the User itself; a provider or staff seat is its own actor. */
const TWO_FACTOR_SUBJECT: Record<"mobile" | "pharmacy" | "lab" | "staff", [string, string]> = {
  mobile: ["USER", USER_ID],
  pharmacy: ["PROVIDER", PHARMACY_ID],
  lab: ["PROVIDER", LAB_ID],
  staff: ["STAFF", STAFF_ID],
};

export function twoFactorFor(d: Dataset, seat: keyof typeof TWO_FACTOR_SUBJECT) {
  const [subjectType, seededSubjectId] = TWO_FACTOR_SUBJECT[seat];
  const subjectId =
    seat === "mobile"
      ? d.user.id
      : seat === "pharmacy"
        ? (d.accountProviderIds?.PHARMACY ?? seededSubjectId)
        : seat === "lab"
          ? (d.accountProviderIds?.LAB ?? seededSubjectId)
          : seededSubjectId;
  return seatRow(
    d.twoFactorSettings.find(
      (row) => row.subject_type === subjectType && row.subject_id === subjectId,
    ),
    "two-factor settings",
    seat,
  );
}

// ─── Logging + calendar ─────────────────────────────────────────────────────

export function logsForPatient(d: Dataset, patientId: string) {
  return d.logEntries
    .filter((l) => l.patient_id === patientId)
    .sort((a, b) => (a.logged_at > b.logged_at ? -1 : 1));
}

export function insightsForPatient(d: Dataset, patientId: string) {
  return d.insights.filter((i) => i.patient_id === patientId);
}

const SYMPTOM_LABEL = new Map<string, string>();

/** Resolves a symptom id to its catalogue label, falling back to the id. */
export function symptomLabel(id: string) {
  return SYMPTOM_LABEL.get(id) ?? id;
}

export function registerSymptomLabels(rows: { id: string; label: string }[]) {
  for (const r of rows) SYMPTOM_LABEL.set(r.id, r.label);
}

export function logSummary(entry: Dataset["logEntries"][number]): string {
  switch (entry.category) {
    case "FOOD":
      return `${titleCase(entry.meal_type ?? "")}${entry.label ? `: ${entry.label}` : ""}`;
    case "DRINK":
      return `${entry.count ?? 0} × ${entry.label ?? titleCase(entry.drink_type ?? "water")}`;
    case "CYCLE":
      return `Period ${entry.start_date ?? ""}${entry.end_date ? ` to ${entry.end_date}` : ""}`;
    case "SYMPTOMS": {
      const names = [
        ...(entry.symptom_ids ?? []).map((id) => SYMPTOM_LABEL.get(id) ?? id),
        ...(entry.custom_symptoms ?? []),
      ];
      const sev = ["", "Mild", "Moderate", "Severe"][entry.severity ?? 0] ?? "";
      return `${names.join(", ")}${sev ? ` (${sev})` : ""}`;
    }
    case "VITALS":
      if (entry.vital_type === "BLOOD_PRESSURE")
        return `Blood pressure ${entry.systolic}/${entry.diastolic}`;
      if (entry.vital_type === "TEMPERATURE") return `Temperature ${entry.value} °C`;
      if (entry.vital_type === "WEIGHT") return `Weight ${entry.value} kg`;
      return `Heart rate ${entry.value} bpm`;
    case "PHYSICAL_ACTIVITY":
      return `${titleCase(entry.activity_type ?? "")}, ${entry.duration_minutes} min`;
    case "SLEEP":
      return `Slept ${entry.sleep_start_time} to ${entry.sleep_end_time}`;
    default:
      return titleCase(entry.category);
  }
}

const LOG_KIND: Record<string, CalendarItem["kind"]> = {
  FOOD: "LOG_FOOD",
  DRINK: "LOG_DRINK",
  CYCLE: "LOG_CYCLE",
  SYMPTOMS: "LOG_SYMPTOMS",
  VITALS: "LOG_VITALS",
  PHYSICAL_ACTIVITY: "LOG_PHYSICAL_ACTIVITY",
  SLEEP: "LOG_SLEEP",
};

/** `GET /calendar/` — one mixed, newest-first timeline of everything (P31). */
export function calendarFor(d: Dataset, patientId: string): CalendarItem[] {
  const items: CalendarItem[] = [];

  for (const entry of logsForPatient(d, patientId)) {
    items.push({
      kind: LOG_KIND[entry.category],
      reference_id: entry.id,
      occurred_at: entry.logged_at,
      summary: logSummary(entry),
    });
  }
  for (const insight of insightsForPatient(d, patientId)) {
    items.push({
      kind: "INSIGHT",
      reference_id: insight.id,
      occurred_at: insight.occurred_at,
      summary: insight.observation,
    });
  }
  for (const c of consultationsForPatient(d, patientId)) {
    items.push({
      kind: "CONSULTATION",
      reference_id: c.id,
      occurred_at: c.scheduled_start ?? c.requested_at,
      summary: `Consultation with ${expertName(d, c.expert_id)}`,
    });
    for (const rx of prescriptionsFor(d, c.id)) {
      if (rx.fulfillment_status === "FILLED") {
        items.push({
          kind: "PRESCRIPTION_FULFILLED",
          reference_id: rx.id,
          occurred_at: rx.filled_at ?? rx.issued_at,
          summary: `${rx.medication} filled${rx.pharmacy_name ? ` at ${rx.pharmacy_name}` : ""}`,
        });
      }
    }
    for (const lab of labOrdersFor(d, c.id)) {
      if (lab.result_status === "ATTACHED") {
        items.push({
          kind: "LAB_RESULT_ATTACHED",
          reference_id: lab.id,
          occurred_at: lab.result_at ?? lab.issued_at,
          summary: `${lab.test_requested}: result attached`,
        });
      }
    }
  }
  return items.sort((a, b) => (a.occurred_at > b.occurred_at ? -1 : 1));
}

// ─── Open loops (P19) ───────────────────────────────────────────────────────

export interface OpenLoop {
  id: string;
  text: string;
  href: string;
  /** Something the patient must do, versus something someone else is doing. */
  mine: boolean;
}

/**
 * Derived client-side from data already fetched — no new endpoint (P19).
 * Ordered: what the patient has to do, then what someone else is doing.
 */
export function openLoops(d: Dataset, patientId: string): OpenLoop[] {
  const mine: OpenLoop[] = [];
  const theirs: OpenLoop[] = [];
  const patient = patientById(d, patientId);

  if (patient && patient.status !== "VERIFIED") {
    mine.push({
      id: "verify-id",
      text: patient.is_dependant
        ? `${patient.first_name}'s Monovella ID isn't verified yet`
        : "Your Monovella ID isn't verified yet",
      href: patient.is_dependant ? `/app/dependants/${patient.id}/verify` : "/app/verify-id",
      mine: true,
    });
  }

  if (patientId === selfPatient(d)?.id) {
    for (const dep of dependantsOf(d, d.user.id)) {
      if (dep.status === "PROVISIONAL") {
        theirs.push({
          id: `dep-${dep.id}`,
          text: `${dep.first_name}'s Monovella ID is still provisional`,
          href: `/app/dependants/${dep.id}/verify`,
          mine: false,
        });
      }
    }
  }

  for (const c of consultationsForPatient(d, patientId)) {
    if (c.referred_from_id && !c.referral_disclosure_ack_at && c.status === "REQUESTED") {
      const source = consultationById(d, c.referred_from_id);
      mine.push({
        id: `referral-${c.id}`,
        text: `${expertName(d, source?.expert_id ?? "")} suggested ${expertName(d, c.expert_id)}. Review the referral and fee`,
        href: `/app/consultations/${c.id}/referral`,
        mine: true,
      });
      continue;
    }
    for (const rx of prescriptionsFor(d, c.id)) {
      const req = latestProviderRequest(d, { prescriptionId: rx.id });
      const checkout = req
        ? d.checkoutPayments.find((payment) => payment.provider_request_id === req.id)
        : undefined;
      if (req && req.status === "ACCEPTED" && checkout?.status === "PENDING") {
        mine.push({
          id: `pay-${req.id}`,
          text: `${providerById(d, req.provider_id)?.business_name} is ready. Complete secure checkout`,
          href: `/app/prescriptions/${rx.id}/order`,
          mine: true,
        });
      } else if (req && req.status === "ACCEPTED" && checkout?.status === "PAID") {
        theirs.push({
          id: `pharm-${req.id}`,
          text: `${providerById(d, req.provider_id)?.business_name} is preparing ${rx.medication}`,
          href: `/app/prescriptions/${rx.id}/order`,
          mine: false,
        });
      } else if (rx.fulfillment_status === "UNFILLED" || rx.fulfillment_status == null) {
        if (!req) {
          mine.push({
            id: `rx-${rx.id}`,
            text: `You haven't told us if you filled ${rx.medication}`,
            href: `/app/prescriptions/${rx.id}`,
            mine: true,
          });
        }
      }
    }

    for (const lab of labOrdersFor(d, c.id)) {
      const req = latestProviderRequest(d, { labOrderId: lab.id });
      if (
        lab.result_status === "ATTACHED" &&
        parse(lab.result_at)!.getTime() > nowMs() - 5 * 86_400_000
      ) {
        theirs.push({
          id: `res-${lab.id}`,
          text: `Your ${lab.test_requested.toLowerCase()} result is ready`,
          href: `/app/lab-orders/${lab.id}`,
          mine: false,
        });
      } else if (lab.result_status === "PENDING" && !req) {
        mine.push({
          id: `lab-${lab.id}`,
          text: `${lab.test_requested} hasn't been done yet`,
          href: `/app/lab-orders/${lab.id}`,
          mine: true,
        });
      } else if (req?.status === "REQUESTED") {
        theirs.push({
          id: `labreq-${req.id}`,
          text: `Waiting on ${providerById(d, req.provider_id)?.business_name} to accept your test`,
          href: `/app/lab-orders/${lab.id}/request`,
          mine: false,
        });
      }
    }

    const checkout = d.checkoutPayments.find(
      (payment) => payment.consultation_id === c.id && payment.provider_id === c.expert_id,
    );
    if (checkout?.status === "PENDING") {
      mine.push({
        id: `checkout-${checkout.id}`,
        text: `Complete your secure checkout with ${expertName(d, c.expert_id)}`,
        href: `/app/consultations/${c.id}/checkout`,
        mine: true,
      });
    } else if (checkout?.status === "FAILED") {
      theirs.push({
        id: `checkout-failed-${checkout.id}`,
        text: `Checkout with ${expertName(d, c.expert_id)} needs a new payment method`,
        href: `/app/consultations/${c.id}/checkout`,
        mine: false,
      });
    }

    if (checkout?.status === "REFUND_FAILED") {
      mine.push({
        id: `checkout-refund-${checkout.id}`,
        text: "A refund couldn't reach your card. Add bank details",
        href: `/app/checkout-payments/${checkout.id}/refund`,
        mine: true,
      });
    }
  }

  return [...mine, ...theirs];
}

// ─── Provider portal ────────────────────────────────────────────────────────

export function requestsForProvider(d: Dataset, providerId: string) {
  return d.providerRequests
    .filter((r) => r.provider_id === providerId)
    .sort((a, b) => (a.requested_at > b.requested_at ? -1 : 1));
}

export function providerRequestSubject(d: Dataset, r: ProviderRequestRead) {
  if (r.prescription_id) {
    const rx = d.prescriptions.find((p) => p.id === r.prescription_id);
    return rx ? `${rx.medication}, ${rx.dosage}` : "Prescription";
  }
  const lab = d.labOrders.find((l) => l.id === r.lab_order_id);
  return lab ? lab.test_requested : "Test request";
}

export function providerHome(d: Dataset, providerId: string) {
  const rows = requestsForProvider(d, providerId);
  return {
    new_requests_count: rows.filter((r) => r.status === "REQUESTED").length,
    in_progress_count: rows.filter(
      (r) =>
        r.status === "ACCEPTED" &&
        (r.order_status !== "FULFILLED" || r.result_status === "AWAITING"),
    ).length,
    standing_restricted: false,
  };
}

export function slotsForProvider(d: Dataset, providerId: string) {
  return d.providerSlots
    .filter((s) => s.provider_id === providerId)
    .sort(
      (a, b) =>
        (a.day_of_week ?? 0) - (b.day_of_week ?? 0) || a.start_time.localeCompare(b.start_time),
    );
}

/** The patient view excludes a Lab's dated closures but keeps provider management complete. */
export function bookableSlotsForProvider(d: Dataset, providerId: string) {
  return slotsForProvider(d, providerId).filter((slot) => providerSlotIsBookable(d, slot));
}

// ─── Back-office queues ─────────────────────────────────────────────────────

/**
 * The applications still waiting on a staff decision.
 *
 * `applicationsQueue` is the reviewer's list, so it keeps recently decided rows
 * on screen with their outcome. A workload count is a different question, and
 * answering it with the list's length reports work that is already done. B1's
 * queue cards and the console sidebar badge both count this.
 */
export function pendingApplications(d: Dataset) {
  return d.applicationsQueue.filter((item) => item.verification_status === "PENDING");
}

// ─── Misc display helpers ───────────────────────────────────────────────────

export function consultationHeadline(d: Dataset, c: ConsultationRead) {
  return `${expertName(d, c.expert_id)} · ${specialtyLabel(expertById(d, c.expert_id)?.specialty ?? "")}`;
}

export function prescriptionLine(rx: PrescriptionDetailRead) {
  return `${rx.medication}, ${rx.dosage}`;
}

export function labLine(lab: LabOrderDetailRead) {
  return lab.test_requested;
}

export function slotRangeLabel(startIso: string, endIso: string) {
  return `${formatTime(startIso)} to ${formatTime(endIso)}`;
}

// ─── Patient history (X12 History tab) ──────────────────────────────────────

/**
 * How many prior encounters the projection reaches back over.
 *
 * A count, not a date range, following NHS GP Connect, which offers "last N
 * consultations" as a first-class alternative to a period. A twelve-month
 * window on a patient who consulted twice in three years returns nothing; a
 * count always returns something, and a clinician can reason about it.
 *
 * This value is a design default. Neither advisor named a number, and
 * Dr. Hameedat's misdiagnosis reasoning arguably argues against any limit in
 * Ob/Gyn. It belongs in server configuration, never in a client parameter.
 */
export const HISTORY_ENCOUNTER_DEPTH = 10;

export interface PatientHistoryEncounter {
  consultation_id: string;
  occurred_at: string;
  specialty: Specialty | "";
  expert_name: string;
  /** The prior note's assessment. Never its subjective, objective or plan. */
  assessment: string | null;
}

export interface PatientHistory {
  /** Every entry, including superseded ones, newest first. Never bounded: a
   * capped allergy list is clinically indefensible. */
  safetyContexts: ClinicalSafetyContextRead[];
  encounters: PatientHistoryEncounter[];
  prescriptions: PrescriptionDetailRead[];
  labResults: LabOrderDetailRead[];
}

/**
 * What a `PURPOSE_HISTORY` grant resolves to.
 *
 * The five sections Dr. Hameedat named: allergies and adverse reactions, past
 * diagnoses, prescriptions, laboratory results, and the encounters they came
 * from. It deliberately excludes the free-text subjective, objective and plan
 * of a prior note. She asked for what was found and what was given, not for
 * another clinician's narrative, and the smaller disclosure is the safer one.
 *
 * `excludeConsultationId` drops the consultation being treated, so the tab
 * shows history rather than a copy of the case already on screen.
 */
export function patientHistory(
  d: Dataset,
  patientId: string,
  excludeConsultationId?: string,
): PatientHistory {
  const priorConsultations = d.consultations
    .filter((c) => c.patient_identity_id === patientId && c.id !== excludeConsultationId)
    .filter((c) => c.status === "COMPLETED")
    .sort((a, b) =>
      (a.completed_at ?? a.requested_at) > (b.completed_at ?? b.requested_at) ? -1 : 1,
    )
    .slice(0, HISTORY_ENCOUNTER_DEPTH);
  const ids = new Set(priorConsultations.map((c) => c.id));

  return {
    safetyContexts: d.clinicalSafetyContexts
      .filter((row) => row.patient_id === patientId)
      .sort((a, b) => (a.version > b.version ? -1 : 1)),
    encounters: priorConsultations.map((c) => ({
      consultation_id: c.id,
      occurred_at: c.completed_at ?? c.requested_at,
      specialty: consultationSpecialty(d, c),
      expert_name: expertName(d, c.expert_id),
      assessment: d.soapNotes.find((n) => n.consultation_id === c.id)?.assessment ?? null,
    })),
    prescriptions: d.prescriptions
      .filter((row) => ids.has(row.consultation_id))
      .sort((a, b) => (a.issued_at > b.issued_at ? -1 : 1)),
    labResults: d.labOrders
      .filter((row) => ids.has(row.consultation_id) && row.result_status === "ATTACHED")
      .sort((a, b) => (a.issued_at > b.issued_at ? -1 : 1)),
  };
}

/** Every recorded read of one patient's history, newest first. Shown in P69. */
export function historyReadsFor(d: Dataset, patientId: string) {
  return d.historyReadEvents
    .filter((row) => row.patient_identity_id === patientId)
    .sort((a, b) => (a.read_at > b.read_at ? -1 : 1));
}

/** Whether this expert has already acknowledged their duty on this care event. */
export function historyAcknowledged(d: Dataset, careEventId: string, expertId: string) {
  return d.historyReadEvents.some(
    (row) => row.care_event_id === careEventId && row.expert_id === expertId,
  );
}
