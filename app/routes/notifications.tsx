import { Bell, BellOff, ChevronRight, TriangleAlert } from "lucide-react";
import { Link, Navigate, useLocation, useParams } from "react-router";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { PageHeader } from "~/components/shell/web-shell";
import { ButtonLink, Card, EmptyState } from "~/components/ui";
import {
  type NotificationAudience,
  notificationEntries,
  resolveNotificationLink,
} from "~/lib/notification-links";
import { usePrototype } from "~/store/prototype";

function audienceFromPath(
  pathname: string,
  mobileRole: "patient" | "expert",
): NotificationAudience {
  if (pathname.startsWith("/console")) return "staff";
  if (pathname.startsWith("/pharmacy")) return "pharmacy";
  if (pathname.startsWith("/lab")) return "lab";
  if (pathname.startsWith("/app/expert")) return "expert";
  return mobileRole;
}

function baseFor(audience: NotificationAudience) {
  if (audience === "staff") return "/console";
  if (audience === "pharmacy") return "/pharmacy";
  if (audience === "lab") return "/lab";
  return audience === "expert" ? "/app/expert" : "/app";
}

export default function NotificationsRoute() {
  const { data, session } = usePrototype();
  const { pathname } = useLocation();
  const { notificationId } = useParams();
  const audience = audienceFromPath(pathname, session.role);
  const base = baseFor(audience);

  if (notificationId) {
    const resolution = resolveNotificationLink(
      data,
      notificationId,
      audience,
      session.viewingPatientId,
    );
    if (resolution.available) return <Navigate to={resolution.href} replace />;
    const reason =
      resolution.reason === "wrong_patient"
        ? "This update belongs to another patient profile. Switch back to the profile that received it, then open the notification again."
        : resolution.reason === "wrong_role"
          ? "This update is not available in the account you are using."
          : resolution.reason === "resolved"
            ? "This update has already been resolved or its record has changed. Open the relevant work list to see the current position."
            : resolution.reason === "expired"
              ? "This notification link has expired."
              : "This notification is stale or its record is no longer available.";
    return (
      <Unavailable
        mobile={audience === "patient" || audience === "expert"}
        back={base}
        reason={reason}
      />
    );
  }

  const entries = notificationEntries.filter((entry) => entry.audience === audience);
  const content = entries.length ? (
    <ul className="divide-y divide-base-300 overflow-hidden rounded-brand border border-base-300 bg-base-200">
      {entries.map((entry) => (
        <li key={entry.id}>
          <Link
            to={`${base}/notifications/${entry.id}`}
            className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-base-300"
          >
            <Bell aria-hidden className="size-5 shrink-0 text-primary" strokeWidth={1.5} />
            <span className="min-w-0 flex-1">
              <span className="block text-label font-medium">{entry.title}</span>
              <span className="block text-body-sm text-base-content/65">{entry.detail}</span>
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-base-content/40" />
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <EmptyState
      icon={BellOff}
      title="Nothing needs you right now"
      body="Reminders, expert responses and results land here. We only interrupt you when something has actually changed."
    />
  );

  if (audience === "patient" || audience === "expert") {
    return (
      <MobileScreen title="Notifications" back={base} tabs="none">
        <div data-screen="notification-inbox" className="space-y-4">
          {content}
        </div>
      </MobileScreen>
    );
  }
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Open each update against its current record."
      />
      <div data-screen="notification-inbox">{content}</div>
    </>
  );
}

function Unavailable({ mobile, back, reason }: { mobile: boolean; back: string; reason: string }) {
  const content = (
    <Card className="max-w-xl">
      <TriangleAlert aria-hidden className="size-7 text-warning" strokeWidth={1.5} />
      <h1 className="mt-3 font-heading text-h2">Update unavailable</h1>
      <p className="measure mt-2 text-body-sm text-base-content/70">{reason}</p>
      <ButtonLink className="mt-4" to={back}>
        Home
      </ButtonLink>
    </Card>
  );
  return mobile ? (
    <MobileScreen title="Notification" back={back} tabs="none">
      {content}
    </MobileScreen>
  ) : (
    <>
      <PageHeader title="Notification" />
      {content}
    </>
  );
}
