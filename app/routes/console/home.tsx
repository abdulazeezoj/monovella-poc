import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  HeartPulse,
  LifeBuoy,
  Receipt,
  Scale,
} from "lucide-react";
import { Link } from "react-router";
import { HeaderUtilityLink, PageHeader } from "~/components/shell/web-shell";
import { Badge, EmptyState } from "~/components/ui";
import { pendingApplications } from "~/data/selectors";
import type { QueueCounts } from "~/data/types";
import { cn } from "~/lib/cn";
import { usePrototype } from "~/store/prototype";

const QUEUES = [
  {
    key: "applications",
    to: "/console/applications",
    label: "Provider applications",
    icon: BadgeCheck,
    sub: "Specialist, Pharmacy and Lab, in one queue",
  },
  {
    key: "payment_disputes",
    to: "/console/disputes",
    label: "Checkout exceptions",
    icon: Scale,
    sub: "Refund, chargeback and payout cases",
  },
  {
    key: "refund_requests",
    to: "/console/refunds",
    label: "Refund requests",
    icon: Receipt,
    sub: "Patient-filed, non-performance",
  },
  {
    key: "clinical_complaints",
    to: "/console/clinical-safety",
    label: "Clinical safety",
    icon: HeartPulse,
    sub: "Care concerns requiring human review",
  },
  {
    key: "standing_cases",
    to: "/console/standing",
    label: "Standing cases",
    icon: AlertTriangle,
    sub: "Accounts suspended pending review",
  },
] as const;

/** Every tile counts its own queue. Nothing here is stored: a dashboard total
 * that is a row somewhere is a total that can disagree with the queue it
 * describes, and the backend computes this response the same way (B1). */
function countsOf<T extends { overdue: boolean; due_soon: boolean }>(items: T[]): QueueCounts {
  return {
    total: items.length,
    overdue: items.filter((item) => item.overdue).length,
    due_soon: items.filter((item) => item.due_soon).length,
  };
}

export default function ConsoleHome() {
  const { data } = usePrototype();
  const payoutSupport = data.payoutSupportRequests.filter(
    (request) => request.status !== "REVERSED",
  );
  const checkout = countsOf([...data.disputeQueue, ...payoutSupport]);
  const clinical = countsOf(
    data.clinicalComplaintReferrals.filter((item) => item.status !== "CLOSED"),
  );
  const counts: Record<(typeof QUEUES)[number]["key"], QueueCounts> = {
    applications: countsOf(pendingApplications(data)),
    payment_disputes: checkout,
    refund_requests: countsOf(data.refundQueue),
    clinical_complaints: clinical,
    standing_cases: countsOf(data.standingQueue),
  };
  const countsFor = (key: (typeof QUEUES)[number]["key"]) => counts[key];
  const allClear = QUEUES.every((q) => countsFor(q.key).total === 0);

  return (
    <>
      <PageHeader
        utility={
          <>
            <Badge tone="neutral">Platform admin</Badge>
            <div className="flex flex-wrap items-center gap-2">
              <HeaderUtilityLink
                to="/console/notifications"
                icon={Bell}
                label="One overdue queue update"
                tone="attention"
              />
              <HeaderUtilityLink
                to="/console/support"
                icon={LifeBuoy}
                label="Support and moderation"
              />
            </div>
          </>
        }
        title="Review queues"
        description="Everything waiting on a decision from Monovella staff, with what's overdue surfaced first."
      />

      {allClear ? (
        <EmptyState
          title="Nothing needs review right now"
          body="All four queues are clear. New applications, checkout exceptions, refunds and standing cases will appear here as they arrive."
        />
      ) : (
        <ul className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-4">
          {QUEUES.map((q) => {
            const counts = countsFor(q.key);
            return (
              <li key={q.key}>
                <Link
                  to={q.to}
                  className="folio-surface flex h-full min-h-60 flex-col rounded-brand-lg p-5 pt-7 transition-[background-color,border-color,transform] duration-(--motion-fast) hover:-translate-y-0.5 hover:border-primary/40 hover:bg-base-300"
                >
                  <div className="flex items-center justify-between gap-3">
                    <q.icon aria-hidden className="size-5 text-primary" strokeWidth={1.5} />
                    <span className="folio-kicker text-base-content/45">Queue</span>
                  </div>
                  <p className="mt-5 font-mono text-[2.75rem] leading-none tabular">
                    {counts.total}
                  </p>
                  <p className="mt-2 font-heading text-h3">{q.label}</p>
                  <p className="mt-1 flex-1 text-body-sm text-base-content/60">{q.sub}</p>
                  <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-body-sm">
                    <Flag count={counts.overdue} label="overdue" tone="error" />
                    <Flag count={counts.due_soon} label="due soon" tone="warning" />
                    {!counts.overdue && !counts.due_soon ? (
                      <span className="text-base-content/50">Nothing overdue</span>
                    ) : null}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function Flag({ count, label, tone }: { count: number; label: string; tone: "error" | "warning" }) {
  if (!count) return null;
  return (
    <span className={cn(tone === "error" ? "text-error" : "text-warning")}>
      <span className="font-mono tabular">{count}</span> {label}
    </span>
  );
}
