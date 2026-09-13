import reference from "~/data/reference.json";
import type {
  ActorType,
  AvailabilityStatus,
  CheckoutPaymentStatus,
  ConsultationStatus,
  CredentialTier,
  Gender,
  GuardianReason,
  PatientIdStatus,
  ProfessionalType,
  ProviderOrderStatus,
  ProviderRequestStatus,
  ReportScope,
  ReportStatus,
  Specialty,
  StandingEventType,
} from "~/data/types";
import { now, parse } from "./clock";

// ─── Money ──────────────────────────────────────────────────────────────────

/**
 * The API deals in kobo; a ledger never shows a patient a bare kobo integer
 * (PRODUCT_SCREEN_V0.md P48).
 */
export function naira(kobo: number | null | undefined, opts?: { decimals?: boolean }) {
  if (kobo == null) return "Not set";
  const value = kobo / 100;
  return `₦${value.toLocaleString("en-NG", {
    minimumFractionDigits: opts?.decimals ? 2 : 0,
    maximumFractionDigits: opts?.decimals ? 2 : 0,
  })}`;
}

export const PLATFORM_FEE_RATE = 0.2;
export const PLATFORM_FEE_CAP_KOBO = 300_000;

export function platformFee(expertFeeKobo: number) {
  return Math.min(Math.round(expertFeeKobo * PLATFORM_FEE_RATE), PLATFORM_FEE_CAP_KOBO);
}

// ─── Time ───────────────────────────────────────────────────────────────────

const WAT = { timeZone: "UTC" } as const; // fixtures are already naive-UTC ≡ demo local

export function formatTime(iso: string | null | undefined) {
  const d = parse(iso);
  if (!d) return "Not set";
  // Leading zero kept: this is ledger data and the column has to align.
  return d.toLocaleTimeString("en-GB", { ...WAT, hour: "2-digit", minute: "2-digit" });
}

export function formatDate(iso: string | null | undefined) {
  const d = parse(iso);
  if (!d) return "Not set";
  return d.toLocaleDateString("en-GB", { ...WAT, day: "numeric", month: "short", year: "numeric" });
}

export function formatDateLong(iso: string | null | undefined) {
  const d = parse(iso);
  if (!d) return "Not set";
  return d.toLocaleDateString("en-GB", { ...WAT, weekday: "long", day: "numeric", month: "long" });
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "Not set";
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** "Thursday 2pm" — the phrasing P36/P37/P39 use for a next-available slot. */
export function formatSlotLabel(iso: string | null | undefined) {
  const d = parse(iso);
  if (!d) return "No upcoming times";
  const today = now();
  const sameDay = d.toDateString() === today.toDateString();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const day = sameDay
    ? "Today"
    : d.toDateString() === tomorrow.toDateString()
      ? "Tomorrow"
      : d.toLocaleDateString("en-GB", { ...WAT, weekday: "long" });
  const hour = d.getUTCHours();
  const minute = d.getUTCMinutes();
  const suffix = hour < 12 ? "am" : "pm";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${day} ${h12}${minute ? `:${String(minute).padStart(2, "0")}` : ""}${suffix}`;
}

export function relativeTime(iso: string | null | undefined) {
  const d = parse(iso);
  if (!d) return "Not set";
  const diff = d.getTime() - now().getTime();
  const abs = Math.abs(diff);
  const past = diff < 0;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (abs < minute) return past ? "just now" : "in a moment";
  if (abs < hour) {
    const m = Math.round(abs / minute);
    return past ? `${m} min ago` : `in ${m} min`;
  }
  if (abs < day) {
    const h = Math.round(abs / hour);
    return past ? `${h} hour${h === 1 ? "" : "s"} ago` : `in ${h} hour${h === 1 ? "" : "s"}`;
  }
  const dd = Math.round(abs / day);
  if (dd < 30)
    return past ? `${dd} day${dd === 1 ? "" : "s"} ago` : `in ${dd} day${dd === 1 ? "" : "s"}`;
  return formatDate(iso);
}

/**
 * A plain readout of remaining time. PRODUCT_BRAND.md §8: never red, never
 * pulsing, and when it reaches zero the surrounding state changes instead.
 */
export function countdown(iso: string | null | undefined): { text: string; elapsed: boolean } {
  const d = parse(iso);
  if (!d) return { text: "Not set", elapsed: false };
  const diff = d.getTime() - now().getTime();
  if (diff <= 0) return { text: "0:00", elapsed: true };
  const total = Math.floor(diff / 1000);
  const days = Math.floor(total / 86_400);
  if (days >= 1)
    return { text: `${days}d ${Math.floor((total % 86_400) / 3600)}h`, elapsed: false };
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return {
    text:
      h > 0
        ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
        : `${m}:${String(s).padStart(2, "0")}`,
    elapsed: false,
  };
}

export function durationBetween(startTime: string, endTime: string) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m ? `${m}m` : ""}`.trim() : `${m}m`;
}

export function ageFrom(dob: string) {
  const born = new Date(`${dob}T00:00:00Z`);
  const today = now();
  let age = today.getUTCFullYear() - born.getUTCFullYear();
  const m = today.getUTCMonth() - born.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < born.getUTCDate())) age -= 1;
  return age;
}

// ─── Enum labels ────────────────────────────────────────────────────────────

const SPECIALTY_LABEL = new Map(reference.specialties.map((s) => [s.value, s.label]));

export function specialtyLabel(value: Specialty | string) {
  return SPECIALTY_LABEL.get(value) ?? titleCase(value);
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const professionalTypeLabel: Record<ProfessionalType, string> = {
  DOCTOR: "Doctor",
  PHYSIOTHERAPIST: "Physiotherapist",
  NURSE: "Nurse",
  PHARMACIST: "Pharmacist",
  LAB_SCIENTIST: "Lab Scientist",
};

export const credentialTierLabel: Record<CredentialTier, string> = {
  GP: "General practice",
  SPECIALIST: "Specialist",
  SUPER_SPECIALIST: "Super-specialist",
  GENERAL: "General",
};

export const genderLabel: Record<Gender, string> = {
  FEMALE: "Female",
  MALE: "Male",
  OTHER: "Other",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

export const availabilityLabel: Record<AvailabilityStatus, string> = {
  ONLINE: "Online",
  AWAY: "Away",
  OUT_OF_OFFICE: "Out of Office",
};

export const patientIdStatusLabel: Record<PatientIdStatus, string> = {
  UNVERIFIED: "Unverified",
  PROVISIONAL: "Provisional",
  VERIFIED: "Verified",
};

export const guardianReasonLabel: Record<GuardianReason, string> = {
  MINOR: "Under 18",
  HEALTH_CONDITION: "Needs help managing a health condition",
  NO_NIN_YET: "No National ID number yet",
};

export const consultationStatusLabel: Record<ConsultationStatus, string> = {
  REQUESTED: "Waiting for response",
  SCHEDULED: "Scheduled",
  DECLINED: "Declined",
  TIMED_OUT: "No response in time",
  CANCELLED: "Cancelled",
  ACTIVE: "In progress",
  COMPLETED: "Completed",
};

export const checkoutPaymentStatusLabel: Record<CheckoutPaymentStatus, string> = {
  PENDING: "Confirming checkout",
  PAID: "Paid",
  FAILED: "Failed",
  REFUND_PENDING: "Refund in progress",
  REFUNDED: "Refunded",
  REFUND_FAILED: "Refund failed",
  CHARGED_BACK: "Charged back",
};

export const providerRequestStatusLabel: Record<ProviderRequestStatus, string> = {
  REQUESTED: "Waiting for response",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "No response in time",
  CANCELLED: "Cancelled",
  WITHDRAWN: "Provider withdrew",
  UNABLE_TO_FULFIL: "Unable to fulfil",
  OBSOLETE: "Obsolete order",
};

export const providerOrderStatusLabel: Record<ProviderOrderStatus, string> = {
  PREPARING: "Preparing",
  READY_FOR_PICKUP: "Ready for pickup",
  OUT_FOR_DELIVERY: "Out for delivery",
  FULFILLED: "Fulfilled",
  MISSED_COLLECTION: "Collection missed",
};

export const actorTypeLabel: Record<ActorType, string> = {
  PATIENT: "Patient",
  EXPERT: "Expert",
  PHARMACY: "Pharmacy",
  LAB: "Lab",
};

export const standingEventLabel: Record<StandingEventType, string> = {
  DECLINED_BOOKING: "Declined booking",
  NON_PERFORMANCE: "Non-performance",
  FALSE_PAYMENT_CLAIM: "False payment claim",
  UNMERITED_DISPUTE: "Unmerited dispute",
  CREDENTIAL_EXPIRED: "Credential expired",
};

export const reportScopeLabel: Record<ReportScope, string> = {
  CONSULTATION: "One consultation",
  FULL_HISTORY: "Full history",
  DATE_RANGE: "Date range",
};

export const reportStatusLabel: Record<ReportStatus, string> = {
  GENERATING: "Generating",
  READY: "Ready",
  FAILED: "Failed",
  REVOKED: "Revoked",
};

export function initials(first?: string | null, last?: string | null) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

export function maskPhone(phone: string) {
  return phone.replace(/^(\+?\d{4})\d+(\d{3})$/, "$1••••$2");
}
