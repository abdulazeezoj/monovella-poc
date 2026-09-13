import { ArrowLeft, Check, ChevronDown, UserPlus, UserRound } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { ListGroup, ListRow, Sheet } from "~/components/ui";
import { expertById, managedPatientsForAccount, patientById, selfPatient } from "~/data/selectors";
import { cn } from "~/lib/cn";
import { ageFrom, initials, specialtyLabel } from "~/lib/format";
import { usePointerFine } from "~/lib/use-mockup";
import { usePrototype } from "~/store/prototype";
import { IdentityMark } from "./avatar";
import { CallProvider, FloatingCall } from "./call-provider";
import { DeviceFrame } from "./device-frame";
import { ExpertTabs, PatientTabs } from "./mobile-tabs";
import { MockupStage, MockupZoomProvider } from "./mockup-stage";
import { PrototypeBar } from "./prototype-bar";

/**
 * The Expo app's frame. On a real phone or tablet this *is* the app, so no
 * mockup is drawn. On a desktop browser it sits in a `DeviceFrame`: bezel,
 * status bar, island and home indicator, so the prototype reads as a mobile
 * product on a laptop rather than as a card — a fixed size regardless of the
 * browser window, scrollable into view rather than shrunk to fit it (see
 * `mockup:` in app.css).
 *
 * The app's own layout responds to the **frame**, not the window: everything
 * inside uses container queries (`@lg:` etc.), so switching Phone → Tablet
 * genuinely reflows rather than scaling a phone layout up. That is why
 * `@container` sits on the screen surface inside the mockup, never on the body.
 */
export function MobileShell() {
  const { frame } = usePrototype();
  const mockup = usePointerFine();

  // The device body carries its own true hardware size; the stage fits, zooms
  // or pans it — the device itself is never squeezed by the browser window.
  const size =
    frame === "phone" ? "mockup:h-[860px] mockup:w-[406px]" : "mockup:h-[1108px] mockup:w-[838px]";

  return (
    <MockupZoomProvider>
      <CallProvider>
        <MockupStage mockup={mockup} className="bg-base-100 pb-[var(--prototype-bar-height)]">
          <DeviceFrame
            tablet={frame === "tablet"}
            className={cn("h-[calc(100dvh-var(--prototype-bar-height))]", size)}
          >
            <div className="@container relative flex min-h-0 flex-1 flex-col overflow-hidden bg-base-100">
              {/* In flow above the screen: a docked voice call pushes the app
                  down rather than covering its header. */}
              <FloatingCall />
              <Outlet />
            </div>
          </DeviceFrame>
        </MockupStage>
        <PrototypeBar surface="Mobile app" frames mockup={mockup} />
      </CallProvider>
    </MockupZoomProvider>
  );
}

/** One screen inside the app frame: fixed top bar, scrolling body, tab bar. */
export function MobileScreen({
  title,
  back,
  action,
  children,
  tabs = "patient",
  hideTabs,
  scrollRef,
  subtitle,
  contentPlacement = "start",
  footer,
  patientContext,
}: {
  title?: string;
  /**
   * A bare path or `true` (navigate(-1)) renders an icon-only back control.
   * Pass `{ to, label }` to give the control a more specific accessible name,
   * or `{ onBack, label }` when a multi-step form needs to preserve its inputs.
   */
  back?: string | true | { to?: string; label: string; onBack?: () => void };
  action?: React.ReactNode;
  children: React.ReactNode;
  tabs?: "patient" | "expert" | "none";
  hideTabs?: boolean;
  scrollRef?: React.Ref<HTMLDivElement>;
  subtitle?: React.ReactNode;
  contentPlacement?: "start" | "center" | "fill";
  /** A persistent action area below the scrollable screen content. */
  footer?: React.ReactNode;
  /** Show the active self/dependant context on patient record and action screens. */
  patientContext?: boolean;
}) {
  const navigate = useNavigate();
  const backTarget = typeof back === "object" ? back.to : back;
  const backLabel = typeof back === "object" ? back.label : "Back";
  const onBack = typeof back === "object" ? back.onBack : undefined;
  return (
    <>
      {title || back ? (
        <header className="flex shrink-0 items-center gap-1 border-b border-base-300 bg-base-100 px-2 pb-2 pt-3 @lg:px-4">
          {back ? (
            <button
              type="button"
              onClick={() => {
                if (onBack) {
                  onBack();
                  return;
                }
                if (typeof backTarget === "string") {
                  navigate(backTarget);
                  return;
                }
                navigate(-1);
              }}
              aria-label={backLabel}
              className="-ml-1 flex size-11 shrink-0 items-center justify-center rounded-brand text-base-content/70 hover:bg-base-200"
            >
              <ArrowLeft aria-hidden className="size-5 shrink-0" strokeWidth={1.5} />
            </button>
          ) : (
            <span className="w-2" />
          )}
          <div className="min-w-0 flex-1">
            {title ? (
              <h1 className="truncate font-heading text-h2 leading-tight">{title}</h1>
            ) : null}
            {subtitle ? (
              <p className="truncate text-body-sm text-base-content/60">{subtitle}</p>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}

      {patientContext ? (
        // Whose record this is, stated but not switchable. Switching context is
        // a deliberate act that belongs on Home and the expert Practice home,
        // not a control sitting one mis-tap away from a clinical record.
        <div className="flex shrink-0 items-center gap-2 border-b border-base-300 bg-base-100 px-4 py-2.5 @lg:px-6">
          <PatientContextLabel />
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className={cn(
          "scrollbar-thin min-h-0 flex-1 overflow-y-auto overscroll-contain",
          (contentPlacement === "center" || contentPlacement === "fill") && "flex flex-col",
        )}
      >
        <div
          className={cn(
            "mx-auto w-full max-w-184 px-4 pt-4 @lg:px-8 @lg:pt-6",
            tabs === "none" || hideTabs ? "pb-6" : "pb-24",
            contentPlacement === "center" && "my-auto",
            // "fill" gives the content the scroller's full height so a child can
            // grow into it. `@container` is inline-size only, so `cqh` never
            // resolves; a flex chain is the only way to centre against the
            // container's height rather than the viewport's.
            contentPlacement === "fill" && "flex min-h-full flex-1 flex-col",
          )}
        >
          {children}
        </div>
      </div>

      {footer ? <div className="shrink-0">{footer}</div> : null}
      {!hideTabs && tabs !== "none" ? tabs === "patient" ? <PatientTabs /> : <ExpertTabs /> : null}
    </>
  );
}

/**
 * P0 — a small pill reading "Patient", a dependant's name, or "Expert" that
 * opens a drawer covering every context this account can switch into: its own
 * record, each dependant it manages, and its expert practice. Switching to
 * Expert is a mode, not a new person — it never changes the account holder's
 * own first and last name, so the drawer's Expert row carries the same name
 * as the Patient row above it, not a separate "Practicing as" identity.
 */
/**
 * Whose record is on screen, as a statement rather than a control.
 *
 * Getting this wrong in a health product means writing a symptom, a
 * prescription or a consent onto the wrong person, so the context stays visible
 * on every record and action screen. Changing it is the deliberate act, and
 * that lives on Home and the expert Practice home only.
 */
export function PatientContextLabel() {
  const { session, data } = usePrototype();
  const viewing = patientById(data, session.viewingPatientId);
  const self = selfPatient(data);
  const isDependant = viewing && self && viewing.id !== self.id;
  const name = viewing?.first_name ?? viewing?.last_name ?? "this patient";

  return (
    <p className="flex min-w-0 items-center gap-2 text-body-sm text-base-content/70">
      <UserRound aria-hidden className="size-4 shrink-0 text-base-content/45" strokeWidth={1.5} />
      <span className="truncate">
        {isDependant ? (
          <>
            Care for <span className="font-medium text-base-content">{name}</span>, a dependant on
            your account
          </>
        ) : (
          <>
            Care for <span className="font-medium text-base-content">{name}</span>
          </>
        )}
      </span>
    </p>
  );
}

export function ContextSwitcher({ patientContext = false }: { patientContext?: boolean }) {
  const { session, setSession, data } = usePrototype();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const inExpert =
    location.pathname === "/app/expert" || location.pathname.startsWith("/app/expert/");
  const patient = selfPatient(data);
  const viewingDependant = !inExpert && session.viewingPatientId !== patient?.id;

  const viewing = patientById(data, session.viewingPatientId);
  const dependants = managedPatientsForAccount(data, data.user.id).filter(
    (managedPatient) => managedPatient.id !== patient?.id,
  );
  const expert = expertById(data, session.expertId);

  // The route (and, for dependants, the session) is the source of truth for
  // which context is on screen — a stale flag would let the pill contradict
  // the screen behind it. Labels stay short: never "Practicing as Dr. [Name]".
  const roleLabel = inExpert
    ? "Expert"
    : viewingDependant
      ? (viewing?.first_name ?? "Dependant")
      : "Patient";
  const label = patientContext
    ? `Care for ${viewing?.first_name ?? viewing?.last_name ?? "patient"}`
    : roleLabel;

  const switchTo = (
    patch: { role: "patient" | "expert"; viewingPatientId?: string },
    to: string,
  ) => {
    setSession(patch);
    setOpen(false);
    navigate(to);
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex min-h-11 max-w-40 items-center gap-1.5 rounded-full border border-base-300 bg-base-200 px-3 text-label"
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 text-base-content/50"
          strokeWidth={1.5}
        />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title="Switch context">
        <div className="space-y-4">
          <ListGroup>
            <ListRow
              chevron={false}
              leading={<IdentityMark name={initials(patient?.first_name, patient?.last_name)} />}
              title={patient ? `${patient.first_name} ${patient.last_name}` : "Patient"}
              meta="Your own record"
              trailing={!inExpert && !viewingDependant ? <ActiveMark /> : null}
              onClick={() => switchTo({ role: "patient", viewingPatientId: patient?.id }, "/app")}
            />
          </ListGroup>

          {dependants.length ? (
            <ListGroup label="Dependants">
              {dependants.map((dep) => (
                <ListRow
                  key={dep.id}
                  chevron={false}
                  leading={<IdentityMark name={initials(dep.first_name, dep.last_name)} muted />}
                  title={`${dep.first_name} ${dep.last_name}`}
                  meta={`${ageFrom(dep.date_of_birth)} years old`}
                  trailing={
                    !inExpert && session.viewingPatientId === dep.id ? <ActiveMark /> : null
                  }
                  onClick={() => switchTo({ role: "patient", viewingPatientId: dep.id }, "/app")}
                />
              ))}
              <ListRow
                chevron={false}
                leading={
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-base-content/25 text-base-content/50"
                  >
                    <UserPlus className="size-4" strokeWidth={1.5} />
                  </span>
                }
                title="Add a dependant"
                onClick={() => {
                  setOpen(false);
                  navigate("/app/dependants/new");
                }}
              />
            </ListGroup>
          ) : null}

          {expert?.credentials.some(
            (credential) => credential.verification_status === "VERIFIED",
          ) ? (
            <ListGroup label="Expert">
              <ListRow
                chevron={false}
                leading={<IdentityMark name={initials(patient?.first_name, patient?.last_name)} />}
                title="Expert"
                meta={`${specialtyLabel(expert.specialty)} · Verified`}
                trailing={inExpert ? <ActiveMark /> : null}
                onClick={() => switchTo({ role: "expert" }, "/app/expert")}
              />
            </ListGroup>
          ) : null}
        </div>
      </Sheet>
    </div>
  );
}

function ActiveMark() {
  return (
    <span className="flex size-5 items-center justify-center text-primary">
      <Check aria-hidden className="size-4" strokeWidth={2} />
      <span className="sr-only">Current</span>
    </span>
  );
}

export function ScreenTag({ id, name }: { id: string; name: string }) {
  return (
    <p className="mb-3 font-mono text-body-sm text-base-content/35">
      {id} · {name}
    </p>
  );
}

export { Link };
