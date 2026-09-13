import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Info,
  LoaderCircle,
  SearchX,
  WifiOff,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { copyToClipboard } from "~/lib/clipboard";
import { cn } from "~/lib/cn";
import { countdown } from "~/lib/format";
import { usePrototype } from "~/store/prototype";
import { Button, ButtonLink, IconButton } from "./button";

type BannerTone = "info" | "success" | "warning" | "error";

/**
 * An explicit copy action for values a person needs to hand off, such as a
 * referral or verification link. It confirms the outcome without relying on
 * an application-level toast, so it also works in compact cards and sheets.
 */
export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  failureLabel = "Copy failed",
  iconOnly = false,
  size,
  variant,
  full,
  ...buttonProps
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  failureLabel?: string;
  /** Use alongside an already-visible value when the copy glyph is unambiguous. */
  iconOnly?: boolean;
} & Omit<React.ComponentProps<typeof Button>, "children" | "onClick">) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const feedback = status === "copied" ? copiedLabel : status === "failed" ? failureLabel : label;
  const icon =
    status === "copied" ? (
      <Check aria-hidden className="size-4" strokeWidth={1.5} />
    ) : (
      <Copy aria-hidden className="size-4" strokeWidth={1.5} />
    );

  useEffect(() => {
    if (status === "idle") return;
    const timer = window.setTimeout(() => setStatus("idle"), 2400);
    return () => window.clearTimeout(timer);
  }, [status]);

  const copy = async () => setStatus((await copyToClipboard(text)) ? "copied" : "failed");

  if (iconOnly) {
    return (
      <IconButton {...buttonProps} label={feedback} onClick={copy}>
        {icon}
      </IconButton>
    );
  }

  return (
    <Button {...buttonProps} size={size} variant={variant} full={full} onClick={copy}>
      {icon}
      {feedback}
    </Button>
  );
}

const BANNER: Record<BannerTone, { cls: string; icon: LucideIcon }> = {
  info: { cls: "bg-info-tint text-info", icon: Info },
  success: { cls: "bg-success-tint text-success", icon: CheckCircle2 },
  warning: { cls: "bg-warning-tint text-warning", icon: AlertTriangle },
  error: { cls: "bg-error-tint text-error", icon: XCircle },
};

/**
 * Full-width tinted alert: icon + one plain sentence + at most one action.
 * `persistent` drops the close affordance entirely — the condition is still
 * true, so there is nothing to dismiss (PRODUCT_BRAND.md §8).
 */
export function Banner({
  tone = "info",
  icon,
  children,
  action,
  onDismiss,
  className,
}: {
  tone?: BannerTone;
  icon?: LucideIcon;
  children: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const { cls, icon: DefaultIcon } = BANNER[tone];
  const Icon = icon ?? DefaultIcon;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-brand px-4 py-3", cls, className)}
    >
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.5} />
      <div className="min-w-0 flex-1 text-body-sm">{children}</div>
      {action}
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded px-2 text-label underline underline-offset-2"
        >
          Close
        </button>
      ) : null}
    </div>
  );
}

/** §2's offline banner. Logging is the only surface that keeps working. */
export function OfflineBanner({ loggingSurface }: { loggingSurface?: boolean }) {
  return (
    <Banner tone="warning" icon={WifiOff}>
      {loggingSurface
        ? "You're offline. Entries are saved on this device and will sync automatically."
        : "You're offline. This screen needs a connection, so it can't load right now."}
    </Banner>
  );
}

/** §2's standing-suspension banner: persistent, never phrased as blame. */
export function StandingBanner({ audience }: { audience: "patient" | "expert" | "provider" }) {
  const what =
    audience === "patient"
      ? "requesting a new consultation"
      : audience === "expert"
        ? "going Online"
        : "accepting new requests";
  return (
    <Banner tone="warning">
      Your account is temporarily restricted pending review, so {what} is paused. Monovella staff
      are looking at it. Everything else stays available.
    </Banner>
  );
}

/**
 * §2's credential expiring/expired banner — a second, independent axis from
 * standing suspension. EXPIRING_SOON stays dismissable for the session;
 * EXPIRED gets the same non-dismissable weight as StandingBanner, since
 * access really is restricted at that point, just for a nameable reason
 * with something the account holder can do about it right now.
 */
export function CredentialBanner({
  status,
  expiryDate,
  renewTo,
  onDismiss,
  pausedNoun = "bookings",
}: {
  status: "EXPIRING_SOON" | "EXPIRED";
  expiryDate: string;
  renewTo: string;
  onDismiss?: () => void;
  /** What actually stops arriving while expired — "bookings" fits the expert
   * app and the Lab portal (both run appointment slots); the Pharmacy portal
   * has no booking concept at all, so it passes "requests" instead. */
  pausedNoun?: string;
}) {
  return (
    <Banner
      tone="warning"
      action={
        <ButtonLink to={renewTo} size="sm" variant="secondary">
          {status === "EXPIRED" ? "Renew now" : "Renew"}
        </ButtonLink>
      }
      onDismiss={status === "EXPIRING_SOON" ? onDismiss : undefined}
    >
      {status === "EXPIRED"
        ? `Your licence expired on ${expiryDate}, so new ${pausedNoun} are paused until it's renewed. Everything else stays available.`
        : `Your licence expires on ${expiryDate}. Renew it before then to avoid any interruption.`}
    </Banner>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-brand", className)} />;
}

export function SkeletonRows({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}

/**
 * Full-page feedback for route loading, missing routes and unexpected errors.
 * The parent owns the available height so this stays usable inside mobile,
 * portal and public shells without reading the viewport directly.
 */
/**
 * Waiting lines for the loading state. Warm and human rather than jokey: someone
 * on this screen may be anxious about a symptom or a result, and a punchline
 * lands badly there. They rotate so a slow connection does not feel frozen.
 */
const WAITING_LINES = [
  "Getting your records in order.",
  "Checking who is available.",
  "Almost there. Thank you for waiting.",
  "Still working. Your place is saved.",
];

export function PageStatus({
  kind,
  title,
  body,
  action,
  className,
}: {
  kind: "loading" | "not-found" | "error";
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  const Icon = kind === "loading" ? LoaderCircle : kind === "not-found" ? SearchX : AlertTriangle;
  const [waitingLine, setWaitingLine] = useState(0);

  useEffect(() => {
    if (kind !== "loading") return;
    const interval = window.setInterval(
      () => setWaitingLine((value) => (value + 1) % WAITING_LINES.length),
      2600,
    );
    return () => window.clearInterval(interval);
  }, [kind]);

  return (
    <section
      data-page-status={kind}
      aria-live={kind === "loading" ? "polite" : undefined}
      aria-busy={kind === "loading" || undefined}
      role={kind === "loading" ? "status" : kind === "error" ? "alert" : undefined}
      className={cn(
        "mx-auto flex w-full max-w-md flex-col items-center justify-center px-5 py-12 text-center",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-full border",
          kind === "error"
            ? "border-error/25 bg-error/10 text-error"
            : "border-primary/20 bg-primary/10 text-primary",
        )}
      >
        <Icon
          aria-hidden
          className={cn("size-6", kind === "loading" && "animate-spin motion-reduce:animate-none")}
          strokeWidth={1.5}
        />
      </span>
      <h1 className="mt-5 font-heading text-h1">{title}</h1>
      <p className="measure mt-2 text-body text-base-content/70">{body}</p>
      {kind === "loading" ? (
        <>
          {/* Outside the live region on purpose: a rotating line announced every
              couple of seconds is noise for a screen-reader user, who already
              has the stable title and body above. */}
          <p aria-hidden className="mt-1 text-body-sm text-base-content/55">
            {WAITING_LINES[waitingLine]}
          </p>
          <div className="mt-6 w-full max-w-xs space-y-3" aria-hidden>
            <Skeleton className="mx-auto h-4 w-4/5" />
            <Skeleton className="mx-auto h-4 w-3/5" />
            <Skeleton className="mt-5 h-12 w-full" />
          </div>
        </>
      ) : null}
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </section>
  );
}

/** §2: the end of a paginated list is stated once, quietly. */
export function EndOfList({ children = "That's everything" }: { children?: React.ReactNode }) {
  return <p className="py-4 text-center text-body-sm text-base-content/50">{children}</p>;
}

/**
 * The foot of a cursor-paged list: the next-page control, the in-flight
 * placeholder, a failure that keeps everything already shown, and the quiet
 * end-of-list note. One component so every list in the product behaves the same
 * way at its boundary.
 */
export function PageFooter({
  nextCursor,
  loading,
  error,
  onLoadMore,
  onRetry,
  shown,
  total,
  moreLabel = "Load more",
  endLabel,
}: {
  nextCursor: string | null;
  loading: boolean;
  error: string | null;
  onLoadMore: () => void;
  onRetry: () => void;
  shown: number;
  total: number;
  moreLabel?: string;
  endLabel?: string;
}) {
  if (error) {
    return (
      <div role="alert" className="rounded-brand border border-warning/35 bg-warning-tint p-4">
        <p className="text-body-sm">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 min-h-11 rounded-brand border border-base-300 bg-base-100 px-4 text-label"
        >
          Try again
        </button>
      </div>
    );
  }
  if (!nextCursor) return <EndOfList>{endLabel}</EndOfList>;
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onLoadMore}
        disabled={loading}
        aria-busy={loading}
        className="min-h-11 w-full rounded-brand border border-base-300 text-label text-base-content/75 disabled:opacity-60"
      >
        {loading ? "Loading…" : moreLabel}
      </button>
      {/* A placeholder at the foot, never a spinner over rows already read. */}
      {loading ? <Skeleton className="h-14 w-full" /> : null}
      <p className="text-center text-body-sm text-base-content/50">
        Showing {shown} of {total}
      </p>
    </div>
  );
}

/**
 * The one shape every "nothing to show here" condition uses: empty, first run,
 * still loading, and failed to load. One icon, one line, one sentence, at most
 * one action, centred in whatever container it is given.
 *
 * Centring is the default because these states are almost always the whole of
 * their container, and a block hugging the top of an otherwise blank screen
 * reads as a layout bug rather than an answer. `inline` opts back into the
 * bordered strip, for a section inside a fuller screen where the rest of the
 * page is still the point.
 *
 * `tone` only colours the icon: warning for a failure the person can retry,
 * plain for everything else. Status colour is never the only signal here, since
 * the sentence always says what happened.
 */
export function EmptyState({
  title,
  body,
  action,
  className,
  icon: Icon,
  inline = false,
  screen = false,
  spin = false,
  tone = "plain",
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
  icon?: LucideIcon;
  inline?: boolean;
  /**
   * The state is the whole screen rather than a section of one, so it grows
   * into the space its container gives it. Requires the screen to pass
   * `contentPlacement="fill"`, which is what supplies that height.
   */
  screen?: boolean;
  spin?: boolean;
  tone?: "plain" | "warning";
}) {
  if (inline) {
    return (
      <div
        className={cn("rounded-brand border border-dashed border-base-300 px-5 py-8", className)}
      >
        <div className={cn(Icon && "flex items-start gap-3")}>
          {Icon ? (
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon aria-hidden className="size-4.5" strokeWidth={1.5} />
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="font-heading text-h3">{title}</h2>
            <p className="measure mt-1.5 text-body-sm text-base-content/70">{body}</p>
          </div>
        </div>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex min-h-60 flex-col items-center justify-center px-5 py-10 text-center",
        screen && "flex-1",
        className,
      )}
    >
      {Icon ? (
        <span
          className={cn(
            "flex size-14 items-center justify-center rounded-full border",
            tone === "warning"
              ? "border-warning/25 bg-warning/10 text-warning"
              : "border-primary/20 bg-primary/10 text-primary",
          )}
        >
          <Icon aria-hidden className={cn("size-6", spin && "animate-spin")} strokeWidth={1.5} />
        </span>
      ) : null}
      <h2 className={cn("font-heading text-h3", Icon && "mt-4")}>{title}</h2>
      <p className="measure mt-1.5 text-body-sm text-base-content/70">{body}</p>
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

/**
 * The in-screen counterpart to `PageStatus`'s loading state, for a section of a
 * screen that is still fetching while the rest of the shell is already there.
 * Same spinner, same rotating line, same skeletons, so a loading calendar and a
 * loading route do not look like two different products.
 */
export function InlineLoading({
  label,
  rows = 4,
  className,
}: {
  label: string;
  rows?: number;
  className?: string;
}) {
  const [line, setLine] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(
      () => setLine((value) => (value + 1) % WAITING_LINES.length),
      2600,
    );
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div
      role="status"
      aria-busy
      aria-live="polite"
      className={cn("flex min-h-64 flex-col items-center justify-center py-8", className)}
    >
      <span className="flex size-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
        <LoaderCircle
          aria-hidden
          className="size-5 animate-spin motion-reduce:animate-none"
          strokeWidth={1.5}
        />
      </span>
      <p className="mt-4 font-heading text-h3">{label}</p>
      <p aria-hidden className="mt-1 text-body-sm text-base-content/55">
        {WAITING_LINES[line]}
      </p>
      <div className="mt-6 w-full max-w-sm space-y-2" aria-hidden>
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * A plain readout of remaining time (PRODUCT_BRAND.md §8). Never red, never
 * pulsing; when it reaches zero the surrounding state is what changes.
 */
export function Countdown({
  deadline,
  prefix,
  elapsedText = "Deadline passed",
  className,
}: {
  deadline: string | null | undefined;
  prefix?: string;
  elapsedText?: string;
  className?: string;
}) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const { text, elapsed } = countdown(deadline);
  return (
    <span
      className={cn(
        "font-mono text-data tabular",
        elapsed ? "font-medium text-error" : "text-base-content/70",
        className,
      )}
    >
      {elapsed ? elapsedText : `${prefix ? `${prefix} ` : ""}${text}`}
    </span>
  );
}

/** Determinate bar for a known upload, scoped to its own field or bubble. */
export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="w-full">
      <div className="mb-1 flex justify-between text-body-sm text-base-content/60">
        <span>{label}</span>
        <span className="font-mono tabular">{Math.round(value)}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-base-300"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-(--motion-base)"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

/** Bottom-anchored, neutral fill, one line, auto-dismissing. Quiet success. */
/**
 * Toasts belong to the product, so they land on the device's screen rather than
 * on the desk beside it.
 *
 * Mounted once, inside each frame's own screen area: a positioned, non-scrolling
 * box that is the app's viewport whether a mockup is on stage or the app is
 * running full-bleed on a real phone. `fixed` against the browser window put
 * confirmations outside the laptop entirely.
 */
export function ToastHost() {
  const { toasts } = usePrototype();
  if (!toasts.length) return null;
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-enter max-w-sm rounded-brand bg-neutral px-4 py-3 text-body-sm text-neutral-content shadow-brand"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
