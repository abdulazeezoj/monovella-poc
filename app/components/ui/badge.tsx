import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgeCheck,
  Ban,
  CheckCircle2,
  CircleDot,
  Clock,
  FileClock,
  Info,
  MinusCircle,
  ShieldQuestion,
  XCircle,
} from "lucide-react";
import type {
  AvailabilityStatus,
  CheckoutPaymentStatus,
  ConsultationStatus,
  PatientIdStatus,
  ProviderOrderStatus,
  ProviderRequestStatus,
  ReportStatus,
} from "~/data/types";
import { cn } from "~/lib/cn";
import {
  availabilityLabel,
  checkoutPaymentStatusLabel,
  consultationStatusLabel,
  patientIdStatusLabel,
  providerOrderStatusLabel,
  providerRequestStatusLabel,
  reportStatusLabel,
} from "~/lib/format";

export type Tone = "neutral" | "info" | "success" | "warning" | "error" | "primary" | "secondary";

const TONES: Record<Tone, string> = {
  // Pale tint ground, deep semantic text — never the saturated fill pair,
  // which PRODUCT_BRAND.md §3 reserves for buttons and alert banners.
  neutral: "bg-base-300 text-base-content/80",
  info: "bg-info-tint text-info",
  success: "bg-success-tint text-success",
  warning: "bg-warning-tint text-warning",
  error: "bg-error-tint text-error",
  primary: "bg-primary-tint text-primary",
  secondary: "bg-secondary-tint text-secondary",
};

export function Badge({
  tone = "neutral",
  icon: Icon,
  children,
  srPrefix,
  className,
}: {
  tone?: Tone;
  icon?: LucideIcon;
  children: React.ReactNode;
  /**
   * PRODUCT_BRAND.md §7: a screen reader hears the status *and* what it applies
   * to — "Consultation status: waiting for response", never bare "Away".
   */
  srPrefix?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-label leading-none",
        TONES[tone],
        className,
      )}
    >
      {Icon ? <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.5} /> : null}
      {srPrefix ? <span className="sr-only">{srPrefix}: </span> : null}
      <span>{children}</span>
    </span>
  );
}

const CONSULTATION: Record<ConsultationStatus, { tone: Tone; icon: LucideIcon }> = {
  REQUESTED: { tone: "warning", icon: Clock },
  SCHEDULED: { tone: "info", icon: FileClock },
  DECLINED: { tone: "neutral", icon: MinusCircle },
  TIMED_OUT: { tone: "neutral", icon: MinusCircle },
  CANCELLED: { tone: "neutral", icon: MinusCircle },
  ACTIVE: { tone: "success", icon: CircleDot },
  COMPLETED: { tone: "neutral", icon: CheckCircle2 },
};

export function ConsultationBadge({ status }: { status: ConsultationStatus }) {
  const { tone, icon } = CONSULTATION[status];
  return (
    <Badge tone={tone} icon={icon} srPrefix="Consultation status">
      {consultationStatusLabel[status]}
    </Badge>
  );
}

const AVAILABILITY: Record<AvailabilityStatus, { tone: Tone; icon: LucideIcon }> = {
  ONLINE: { tone: "success", icon: CircleDot },
  AWAY: { tone: "warning", icon: Clock },
  OUT_OF_OFFICE: { tone: "error", icon: Ban },
};

export function AvailabilityBadge({
  status,
  audience = "Expert",
}: {
  status: AvailabilityStatus;
  audience?: "Expert" | "Provider";
}) {
  const { tone, icon } = AVAILABILITY[status];
  return (
    <Badge tone={tone} icon={icon} srPrefix={`${audience} availability`}>
      {availabilityLabel[status]}
    </Badge>
  );
}

const PATIENT_ID: Record<PatientIdStatus, { tone: Tone; icon: LucideIcon }> = {
  VERIFIED: { tone: "success", icon: BadgeCheck },
  PROVISIONAL: { tone: "warning", icon: ShieldQuestion },
  UNVERIFIED: { tone: "warning", icon: ShieldQuestion },
};

export function PatientIdBadge({ status }: { status: PatientIdStatus }) {
  const { tone, icon } = PATIENT_ID[status];
  return (
    <Badge tone={tone} icon={icon} srPrefix="Monovella ID status">
      {patientIdStatusLabel[status]}
    </Badge>
  );
}

const CHECKOUT_PAYMENT: Record<CheckoutPaymentStatus, { tone: Tone; icon: LucideIcon }> = {
  PENDING: { tone: "info", icon: Clock },
  PAID: { tone: "success", icon: CheckCircle2 },
  FAILED: { tone: "error", icon: XCircle },
  REFUND_PENDING: { tone: "info", icon: Clock },
  REFUNDED: { tone: "success", icon: CheckCircle2 },
  REFUND_FAILED: { tone: "warning", icon: AlertTriangle },
  CHARGED_BACK: { tone: "info", icon: Info },
};

export function CheckoutPaymentBadge({ status }: { status: CheckoutPaymentStatus }) {
  const { tone, icon } = CHECKOUT_PAYMENT[status];
  return (
    <Badge tone={tone} icon={icon} srPrefix="Checkout status">
      {checkoutPaymentStatusLabel[status]}
    </Badge>
  );
}

const PROVIDER_REQUEST: Record<ProviderRequestStatus, { tone: Tone; icon: LucideIcon }> = {
  REQUESTED: { tone: "warning", icon: Clock },
  ACCEPTED: { tone: "success", icon: CheckCircle2 },
  DECLINED: { tone: "neutral", icon: MinusCircle },
  EXPIRED: { tone: "neutral", icon: MinusCircle },
  CANCELLED: { tone: "neutral", icon: MinusCircle },
  WITHDRAWN: { tone: "error", icon: XCircle },
  UNABLE_TO_FULFIL: { tone: "error", icon: XCircle },
  OBSOLETE: { tone: "error", icon: Ban },
};

export function ProviderRequestBadge({ status }: { status: ProviderRequestStatus }) {
  const { tone, icon } = PROVIDER_REQUEST[status];
  return (
    <Badge tone={tone} icon={icon} srPrefix="Request status">
      {providerRequestStatusLabel[status]}
    </Badge>
  );
}

const ORDER: Record<ProviderOrderStatus, Tone> = {
  PREPARING: "info",
  READY_FOR_PICKUP: "success",
  OUT_FOR_DELIVERY: "info",
  FULFILLED: "neutral",
  MISSED_COLLECTION: "warning",
};

export function OrderStatusBadge({ status }: { status: ProviderOrderStatus }) {
  return (
    <Badge tone={ORDER[status]} icon={CircleDot} srPrefix="Order status">
      {providerOrderStatusLabel[status]}
    </Badge>
  );
}

const REPORT: Record<ReportStatus, { tone: Tone; icon: LucideIcon }> = {
  GENERATING: { tone: "info", icon: Clock },
  READY: { tone: "success", icon: CheckCircle2 },
  FAILED: { tone: "error", icon: XCircle },
  REVOKED: { tone: "neutral", icon: Ban },
};

export function ReportBadge({ status }: { status: ReportStatus }) {
  const { tone, icon } = REPORT[status];
  return (
    <Badge tone={tone} icon={icon} srPrefix="Report status">
      {reportStatusLabel[status]}
    </Badge>
  );
}
