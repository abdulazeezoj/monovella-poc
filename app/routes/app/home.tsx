import {
  ArrowRight,
  Bell,
  CircleDot,
  CloudOff,
  FileText,
  LifeBuoy,
  LoaderCircle,
  Search,
  Stethoscope,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { ContextSwitcher, MobileScreen } from "~/components/shell/mobile-shell";
import { ScreenStates } from "~/components/shell/state-switcher";
import {
  Button,
  ButtonLink,
  ConsultationBadge,
  Countdown,
  EmptyState,
  OfflineBanner,
  StandingBanner,
} from "~/components/ui";
import {
  activeConsultation,
  consultationsForPatient,
  expertName,
  openLoops,
  patientById,
} from "~/data/selectors";
import type { ConsultationRead } from "~/data/types";
import { now } from "~/lib/clock";
import { formatSlotLabel } from "~/lib/format";
import { usePrototype, useTick } from "~/store/prototype";

export default function Home() {
  useTick();
  const { data, session } = usePrototype();
  const patientId = session.viewingPatientId;
  const patient = patientById(data, patientId);
  const active = activeConsultation(data, patientId);
  const upcoming = consultationsForPatient(data, patientId).find(
    (c) => c.status === "REQUESTED" || c.status === "SCHEDULED",
  );
  const lead = active ?? upcoming;
  const loops = openLoops(data, patientId);
  // A fixed "Good morning" is wrong for most of the day the demo clock runs
  // through, and a greeting that is plainly wrong undermines everything under it.
  const hour = now().getUTCHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  // Home was excused as "an aggregate of surfaces that each declare their own
  // states". An aggregate still has a load, a failure and a first visit of its
  // own: it reads a consultation and the open loops before it can show either.
  const [view, setView] = useState<"normal" | "loading" | "failed" | "new">("normal");
  const empty = view === "new" || (!lead && loops.length === 0);

  return (
    <MobileScreen contentPlacement="fill">
      <div data-screen="P19">
        <ScreenStates
          states={[
            { value: "normal", label: "Normal" },
            { value: "loading", label: "Loading" },
            { value: "failed", label: "Load failed" },
            { value: "new", label: "New user" },
          ]}
          value={view}
          onChange={setView}
        />
      </div>
      {/* Utilities first, the person second. Sharing one row squeezed the name
          against the context pill, and a name is not the thing that should
          shrink on a narrow phone. Whose care you are looking at is the most
          consequential control in the app, so it leads this row. */}
      <div className="flex items-center justify-between gap-2">
        <ContextSwitcher />
        <Link
          to="/app/notifications"
          aria-label="Notifications"
          className="flex size-11 shrink-0 items-center justify-center rounded-brand text-base-content/60 hover:bg-base-200"
        >
          <Bell aria-hidden className="size-5" strokeWidth={1.5} />
        </Link>
      </div>
      <div className="mt-3">
        <p className="text-body-sm text-base-content/60">{greeting}</p>
        <h1 className="font-heading text-h1 wrap-anywhere">{patient?.first_name}</h1>
      </div>

      {session.standingSuspended ? (
        <div className="mt-4">
          <StandingBanner audience="patient" />
        </div>
      ) : null}
      {session.offline ? (
        <div className="mt-4">
          <OfflineBanner />
        </div>
      ) : null}

      {view === "loading" ? (
        <EmptyState
          screen
          icon={LoaderCircle}
          spin
          title="One moment"
          body="Pulling your record together."
        />
      ) : null}
      {view === "failed" ? (
        <EmptyState
          screen
          icon={CloudOff}
          tone="warning"
          title="That did not load"
          body="Not your fault, and nothing has changed. Give it another go."
          action={
            <Button variant="secondary" onClick={() => setView("normal")}>
              Try again
            </Button>
          }
        />
      ) : null}
      {view !== "loading" && view !== "failed" && empty ? (
        <EmptyState
          screen
          icon={Stethoscope}
          title="Nothing here yet"
          body="Your care will appear here. Start by finding a specialist."
          action={<ButtonLink to="/app/find">Find specialist</ButtonLink>}
        />
      ) : null}

      {/* One column on a phone; two on a tablet, with Connect spanning both —
          the hierarchy is the same, the shape isn't. */}
      <div
        className="mt-5 grid gap-4 @2xl:grid-cols-2 @2xl:items-start"
        hidden={view !== "normal" || empty}
      >
        {/* Connect leads. The consultation card carries the strongest visual
            weight on the screen when one exists (P19). */}
        <div className="@2xl:col-span-2">
          {lead ? <ConsultationCard consultation={lead} /> : <FindSpecialistCard empty />}
        </div>

        <div className="space-y-4">
          {loops.length ? <OpenLoops loops={loops} /> : null}
          {lead ? <FindSpecialistCard secondary /> : null}
          {/* Two quiet actions, not a grid of six. Home's job in V0 is the open
              loop and the next action; everything else belongs on the surface
              that owns it. */}
          <div className="grid grid-cols-2 gap-3">
            <QuietAction to="/app/reports" icon={FileText} label="Reports" />
            <QuietAction to="/app/support" icon={LifeBuoy} label="Help" />
          </div>
        </div>
      </div>
    </MobileScreen>
  );
}

function ConsultationCard({ consultation }: { consultation: ConsultationRead }) {
  const { data } = usePrototype();
  const name = expertName(data, consultation.expert_id);

  const line =
    consultation.status === "ACTIVE"
      ? `In progress with ${name}. Nothing else needs you right now.`
      : consultation.status === "REQUESTED"
        ? `${formatSlotLabel(consultation.scheduled_start)}: waiting for ${name} to confirm.`
        : `${formatSlotLabel(consultation.scheduled_start)} with ${name}. Nothing needed before then.`;

  return (
    <Link
      to={`/app/consultations/${consultation.id}`}
      className="block rounded-brand-lg border-2 border-primary/35 bg-primary-tint p-5 transition-colors duration-(--motion-base) hover:border-primary/60"
    >
      <div className="flex items-center justify-between gap-3">
        <ConsultationBadge status={consultation.status} />
        {consultation.status === "REQUESTED" && consultation.respond_by ? (
          <Countdown deadline={consultation.respond_by} elapsedText="Time's up" />
        ) : null}
      </div>
      <p className="mt-3 font-heading text-h2 leading-snug">{name}</p>
      <p className="measure mt-1.5 text-body-sm text-base-content/75">{line}</p>
      <p className="mt-4 inline-flex items-center gap-1.5 text-label text-primary">
        {consultation.status === "ACTIVE" ? "Continue" : "Open"}
        <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
      </p>
    </Link>
  );
}

function FindSpecialistCard({ empty, secondary }: { empty?: boolean; secondary?: boolean }) {
  if (secondary) {
    return (
      <Link
        to="/app/find"
        className="flex items-center gap-3 rounded-brand border border-base-300 bg-base-200 px-4 py-3.5 transition-colors hover:bg-base-300"
      >
        <Search aria-hidden className="size-5 shrink-0 text-primary" strokeWidth={1.5} />
        <span className="flex-1 text-body-sm font-medium">See another specialist</span>
        <ArrowRight aria-hidden className="size-4 text-base-content/40" strokeWidth={1.5} />
      </Link>
    );
  }

  return (
    <div className="rounded-brand-lg border-2 border-primary/35 bg-primary-tint p-5">
      <h2 className="font-heading text-h2 leading-snug">
        {empty ? "Not feeling well, or just want to talk to someone?" : "Find a specialist"}
      </h2>
      <p className="measure mt-2 text-body-sm text-base-content/75">
        Describe what's going on in your own words and we'll point you at the right kind of
        specialist. You always pick the person.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink to="/app/find">Find specialist</ButtonLink>
        <ButtonLink to="/app/experts" variant="secondary">
          Browse all
        </ButtonLink>
      </div>
    </div>
  );
}

/**
 * Open loops — anything the record is waiting on. Capped at three plus a quiet
 * "see all": never a badge count, never a red dot, never a nag (P19).
 */
function OpenLoops({ loops }: { loops: ReturnType<typeof openLoops> }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? loops : loops.slice(0, 3);
  return (
    <section aria-labelledby="loops">
      <h2 id="loops" className="mb-2 px-1 font-heading text-h3">
        Waiting on
      </h2>
      <ul className="divide-y divide-base-300 overflow-hidden rounded-brand border border-base-300 bg-base-200">
        {shown.map((loop) => (
          <li key={loop.id}>
            <Link
              to={loop.href}
              className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors hover:bg-base-300"
            >
              <CircleDot
                aria-hidden
                className={
                  loop.mine
                    ? "size-4 shrink-0 text-primary"
                    : "size-4 shrink-0 text-base-content/30"
                }
                strokeWidth={1.5}
              />
              <span className="min-w-0 flex-1 text-body-sm">{loop.text}</span>
              <ArrowRight
                aria-hidden
                className="size-4 shrink-0 text-base-content/35"
                strokeWidth={1.5}
              />
            </Link>
          </li>
        ))}
      </ul>
      {loops.length > 3 ? (
        <Button
          variant="ghost"
          className="mt-2"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show fewer" : "Show all"}
        </Button>
      ) : null}
    </section>
  );
}

function QuietAction({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex min-h-11 items-center justify-center gap-2 rounded-brand px-3 py-3 text-label text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content"
    >
      <Icon aria-hidden className="size-4" strokeWidth={1.5} />
      {label}
    </Link>
  );
}
