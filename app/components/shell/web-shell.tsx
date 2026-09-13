import type { LucideIcon } from "lucide-react";
import { ArrowLeft, LifeBuoy, LogOut, Menu, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import type { Tone } from "~/components/ui";
import { cn } from "~/lib/cn";
import { initials } from "~/lib/format";
import { usePointerFine } from "~/lib/use-mockup";
import { IdentityMark } from "./avatar";
import { DeviceFrame, LaptopFrame } from "./device-frame";
import { Lockup } from "./logo";
import { MockupStage, MockupZoomProvider } from "./mockup-stage";
import { PrototypeBar, type WebWidth } from "./prototype-bar";

/** Just the text-color half of the Badge tone map, for a plain (unpilled) label. */
const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-base-content/55",
  info: "text-info",
  success: "text-success",
  warning: "text-warning",
  error: "text-error",
  primary: "text-primary",
  secondary: "text-secondary",
};

function authStory(productName: string) {
  if (productName === "Pharmacy Portal") {
    return {
      image: "/marketing/pharmacy-counter.jpg",
      eyebrow: "Pharmacy Portal",
      title: "Keep fulfilment connected to the care it belongs to.",
    };
  }
  if (productName === "Lab Portal") {
    return {
      image: "/marketing/lab-technician.jpg",
      eyebrow: "Lab Portal",
      title: "Every result belongs in the wider care story.",
    };
  }
  return {
    image: "/marketing/expert-consult.jpg",
    eyebrow: "One whole health story",
    title: "The context for safer, clearer care stays close.",
  };
}

/**
 * The portal's consistent exit to the public front door. The logo and portal
 * label form a compact two-line identity, while the link keeps a 44px touch target.
 */
function PortalBrandLink({
  productName,
  productTone,
  className,
  onNavigate,
}: {
  productName: string;
  productTone: Tone;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      to="/"
      onClick={onNavigate}
      aria-label="Return to Monovella landing page"
      className={cn(
        "flex min-h-11 min-w-0 items-center gap-2.5 rounded-brand text-base-content transition-colors duration-(--motion-fast) hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary",
        className,
      )}
    >
      <span className="flex min-h-8 min-w-0 flex-col justify-center">
        <Lockup size="sm" className="shrink-0" />
        <span className={cn("block truncate text-body-sm leading-4", TONE_TEXT[productTone])}>
          {productName}
        </span>
      </span>
    </Link>
  );
}

export interface NavItem {
  to: string;
  label: string;
  /** The label a bottom tab uses when the full one is too long for the target. */
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  end?: boolean;
  /** How many items are waiting. Shown as the total. */
  count?: number;
  /**
   * How many of those are past their deadline. This is the number a reviewer
   * is actually triaging on (B6), so it gets the `error` tint and the total
   * does not — a queue of 6 with 2 overdue is a different morning from a queue
   * of 6 with none.
   */
  overdue?: number;
}

/**
 * The Next.js PWA's frame, serving three audiences on separate logins:
 * Back-Office Console, Pharmacy Portal, Lab Portal.
 *
 * Navigation is a sidebar from `@4xl` up and a bottom tab bar below it. Both
 * are always visible: this console's whole job is triage across four queues,
 * and a hamburger would hide the one thing a reviewer needs on screen at all
 * times — where the work is piling up. The provider portal runs on a shared
 * counter tablet, which is exactly where a bottom tab bar belongs.
 */
export function WebShell({
  productName,
  productTone = "neutral",
  nav,
  accountLine,
  accountRole,
  accountHref,
  footer,
  supportHref,
}: {
  productName: string;
  /** Which portal this is, carried as a colour so it reads at a glance (PRODUCT_BRAND.md §3). */
  productTone?: Tone;
  nav: NavItem[];
  accountLine: string;
  accountRole?: string;
  /** Where the sidebar's own account identity block links to — its self-service settings screen. */
  accountHref?: string;
  footer?: React.ReactNode;
  /** This portal's own support screen. Email is the fallback, never the route. */
  supportHref?: string;
}) {
  const [width, setWidth] = useState<WebWidth>("desktop");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const { pathname } = useLocation();
  const mockup = usePointerFine();

  // A route change means the drawer did its job. Closing it returns focus to
  // the button that opened it, so a keyboard user is not dropped at the top.
  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    menuTrigger.current?.focus();
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the effect exists to react to `pathname`.
  useEffect(() => setMenuOpen(false), [pathname]);

  // On a desktop browser the app sits in a mockup: a browser window at
  // desktop width, and the actual device at the widths where this portal
  // really runs — a counter tablet, or a phone. On a real phone or tablet no
  // mockup is drawn and the layout keeps its viewport-height behaviour.
  const inner = (
    <>
      {/* `@container` sits on the wrapper, never on the element that reads it —
          a `@4xl:` utility resolves against an *ancestor* container. */}
      <div className="@container relative min-h-dvh mockup:h-full mockup:min-h-0">
        <div className="flex min-h-dvh flex-col mockup:h-full mockup:min-h-0 @4xl:flex-row">
          <Sidebar
            productName={productName}
            productTone={productTone}
            nav={nav}
            accountLine={accountLine}
            accountRole={accountRole}
            accountHref={accountHref}
          />

          <div className="flex min-w-0 flex-1 flex-col mockup:min-h-0 mockup:overflow-y-auto">
            <MobileHeader
              productName={productName}
              productTone={productTone}
              nav={nav}
              menuId={menuId}
              menuOpen={menuOpen}
              triggerRef={menuTrigger}
              onOpenMenu={() => setMenuOpen(true)}
            />

            <main className="mx-auto w-full max-w-[80rem] flex-1 px-4 pb-40 pt-6 @4xl:px-8 @4xl:pt-8 mockup:pb-8">
              <Outlet />
            </main>

            {/* WCAG 2.2 · 3.2.6 — the support entry point sits in the footer
                  on web and never moves per screen. */}
            <footer className="hidden border-t border-base-300 @4xl:block">
              <div className="mx-auto w-full max-w-[80rem] px-8 pb-[4.5rem] pt-4 text-body-sm text-base-content/55 mockup:pb-6">
                {footer ?? <SupportLine supportHref={supportHref} />}
              </div>
            </footer>
          </div>

          <SidebarDrawer
            open={menuOpen}
            onClose={closeMenu}
            id={menuId}
            productName={productName}
            productTone={productTone}
            nav={nav}
            accountLine={accountLine}
            accountRole={accountRole}
            accountHref={accountHref}
          />
        </div>
      </div>
    </>
  );

  const shell =
    width === "desktop" ? (
      <LaptopFrame url={`monovella.com${pathname}`} className="mockup:h-[900px] mockup:w-[84rem]">
        {inner}
      </LaptopFrame>
    ) : (
      <DeviceFrame
        tablet={width === "tablet"}
        className={
          width === "tablet"
            ? "mockup:h-[1108px] mockup:w-[838px]"
            : "mockup:h-[860px] mockup:w-[406px]"
        }
      >
        {inner}
      </DeviceFrame>
    );

  return (
    <MockupZoomProvider>
      <MockupStage mockup={mockup} className="bg-base-200">
        {shell}
      </MockupStage>
      <PrototypeBar surface={productName} webWidth={width} onWebWidth={setWidth} mockup={mockup} />
    </MockupZoomProvider>
  );
}

/**
 * The standing support entry point (WCAG 2.2 · 3.2.6).
 *
 * A raw mailto skipped the support lifecycle this product actually has: a case
 * with a reference, a visible status, an expected response window and a return
 * path. Email stays as the fallback for someone who cannot sign in, but it is
 * no longer the only way in.
 */
function SupportLine({ supportHref }: { supportHref?: string }) {
  if (!supportHref) {
    return (
      <p>
        Need help? Email <span className="font-mono">support@monovella.com</span>.
      </p>
    );
  }
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <Link
        to={supportHref}
        className="inline-flex min-h-11 items-center gap-2 text-label text-primary underline-offset-2 hover:underline"
      >
        <LifeBuoy aria-hidden className="size-4" strokeWidth={1.5} />
        Get help and track your request
      </Link>
      <span>
        or email <span className="font-mono">support@monovella.com</span>
      </span>
    </p>
  );
}

/** The rail: `@4xl` and up. Full labels, and urgency visible without a click. */
function Sidebar(props: {
  productName: string;
  productTone: Tone;
  nav: NavItem[];
  accountLine: string;
  accountRole?: string;
  accountHref?: string;
}) {
  return (
    <div className="hidden w-[15.5rem] shrink-0 border-r border-base-300 bg-base-200 @4xl:block">
      <div className="sticky top-0 flex h-dvh flex-col mockup:h-full">
        <SidebarBody {...props} />
      </div>
    </div>
  );
}

/**
 * The menu itself. One definition, worn either as the persistent rail or as
 * the drawer below `@4xl` — so the two can never drift apart.
 */
function SidebarBody({
  productName,
  productTone,
  nav,
  accountLine,
  accountRole,
  accountHref,
  onNavigate,
}: {
  productName: string;
  productTone: Tone;
  nav: NavItem[];
  accountLine: string;
  accountRole?: string;
  accountHref?: string;
  onNavigate?: () => void;
}) {
  // "Abdulazeez Ojimoh" -> "AO", "GreenLife Pharmacy" -> "GP".
  const [first, ...rest] = accountLine.trim().split(/\s+/);
  const mark = initials(first, rest.at(-1) ?? first);

  return (
    <>
      <div className="p-2 pt-3">
        <PortalBrandLink
          productName={productName}
          productTone={productTone}
          onNavigate={onNavigate}
          className="bg-base-100 px-3 py-2.5 shadow-brand hover:bg-base-200"
        />
      </div>

      <nav aria-label={productName} className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
        <ul className="space-y-0.5">
          {nav.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex min-h-11 items-center gap-3 rounded-brand px-3 text-label transition-colors duration-(--motion-fast)",
                    isActive
                      ? "bg-base-100 text-primary shadow-brand"
                      : "text-base-content/70 hover:bg-base-300 hover:text-base-content",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      aria-hidden
                      className="size-4 shrink-0"
                      strokeWidth={isActive ? 2 : 1.5}
                    />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <QueueCount count={item.count} overdue={item.overdue} />
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-base-300 pb-[4.5rem] pt-2 mockup:pb-2">
        <div className="px-2">
          <Link
            to="/"
            className="flex min-h-11 items-center gap-3 rounded-brand px-3 text-label text-error transition-colors duration-(--motion-fast) hover:bg-error-tint"
          >
            <LogOut aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
            Sign out
          </Link>
        </div>
        {accountHref ? (
          <Link
            to={accountHref}
            onClick={onNavigate}
            className="flex items-center gap-2.5 rounded-brand px-4 pb-3 pt-2 transition-colors duration-(--motion-fast) hover:bg-base-300"
          >
            <IdentityMark name={mark} muted />
            <div className="min-w-0">
              <p className="truncate text-body-sm font-medium">{accountLine}</p>
              {accountRole ? (
                <p className="truncate text-body-sm text-base-content/55">{accountRole}</p>
              ) : null}
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2.5 px-4 pb-3 pt-2">
            <IdentityMark name={mark} muted />
            <div className="min-w-0">
              <p className="truncate text-body-sm font-medium">{accountLine}</p>
              {accountRole ? (
                <p className="truncate text-body-sm text-base-content/55">{accountRole}</p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * The total, and separately how much of it is late. Colour is never the only
 * signal — the overdue figure carries its own word (PRODUCT_BRAND.md §3).
 */
function QueueCount({ count, overdue }: { count?: number; overdue?: number }) {
  if (!count) return null;
  return (
    <span className="flex shrink-0 items-center gap-1">
      {overdue ? (
        <span className="rounded-full bg-error-tint px-1.5 font-mono text-body-sm tabular text-error">
          <span className="sr-only">overdue: </span>
          {overdue}
          <span aria-hidden> late</span>
        </span>
      ) : null}
      <span className="rounded-full bg-base-300 px-1.5 font-mono text-body-sm tabular text-base-content/70">
        <span className="sr-only">waiting: </span>
        {count}
      </span>
    </span>
  );
}

/**
 * Below `@4xl` the rail is gone, so the landing-linked portal lockup goes here — and with it
 * the menu button that opens the same rail as a drawer.
 *
 * The button carries the queue's totals. That was the reason this console used
 * a tab bar rather than a hamburger in the first place: a reviewer has to see
 * where work is piling up without opening anything. Hiding the nav is fine;
 * hiding the count is not.
 */
function MobileHeader({
  productName,
  productTone,
  nav,
  onOpenMenu,
  menuId,
  menuOpen,
  triggerRef,
}: {
  productName: string;
  productTone: Tone;
  nav: NavItem[];
  onOpenMenu: () => void;
  menuId: string;
  menuOpen: boolean;
  triggerRef: React.Ref<HTMLButtonElement>;
}) {
  const waiting = nav.reduce((n, i) => n + (i.count ?? 0), 0);
  const overdue = nav.reduce((n, i) => n + (i.overdue ?? 0), 0);

  return (
    <header className="sticky top-0 z-30 border-b border-base-300 bg-base-100/95 backdrop-blur @4xl:hidden">
      <div className="flex items-center gap-3 px-4 py-1.5">
        <button
          type="button"
          ref={triggerRef}
          onClick={onOpenMenu}
          aria-expanded={menuOpen}
          aria-controls={menuId}
          className="relative flex size-11 shrink-0 items-center justify-center rounded-brand text-base-content/75 hover:bg-base-200"
        >
          <Menu aria-hidden className="size-5" strokeWidth={1.5} />
          <span className="sr-only">
            Menu
            {waiting ? `, ${waiting} waiting${overdue ? `, ${overdue} overdue` : ""}` : ""}
          </span>
          {waiting ? (
            <span
              aria-hidden
              className={cn(
                "absolute -right-0.5 -top-0.5 min-w-4 rounded-full px-1 text-center font-mono text-[0.625rem] leading-4 ring-2 ring-base-100",
                overdue ? "bg-error text-error-content" : "bg-base-300 text-base-content/75",
              )}
            >
              {waiting}
            </span>
          ) : null}
        </button>
        <PortalBrandLink productName={productName} productTone={productTone} className="flex-1" />
      </div>
    </header>
  );
}

/**
 * The same menu as the rail, as a drawer. It is `absolute` inside the device
 * mockup from `lg` up and `fixed` below it, so on a real phone it covers the
 * viewport and inside the mockup it covers the screen.
 */
function SidebarDrawer({
  open,
  onClose,
  id,
  ...body
}: {
  open: boolean;
  onClose: () => void;
  id: string;
  productName: string;
  productTone: Tone;
  nav: NavItem[];
  accountLine: string;
  accountRole?: string;
  accountHref?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 mockup:absolute @4xl:hidden">
      {/* A pointer affordance only: Escape and the close button already serve
          the keyboard, and the scrim itself is hidden from assistive tech. */}
      <div
        aria-hidden
        onClick={onClose}
        className="absolute inset-0 bg-neutral/40 backdrop-blur-[2px]"
      />
      <div
        ref={panel}
        id={id}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`${body.productName} menu`}
        className="absolute inset-y-0 left-0 flex w-[16.5rem] max-w-[85%] flex-col border-r border-base-300 bg-base-200 shadow-brand outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-3 flex size-11 items-center justify-center rounded-brand text-base-content/60 hover:bg-base-300"
        >
          <X aria-hidden className="size-5" strokeWidth={1.5} />
          <span className="sr-only">Close menu</span>
        </button>
        <SidebarBody {...body} onNavigate={onClose} />
      </div>
    </div>
  );
}

/** A framed sign-in / application page — no nav, same tokens. */
export function WebAuthShell({
  productName,
  productTone = "neutral",
  children,
}: {
  productName: string;
  productTone?: Tone;
  children: React.ReactNode;
}) {
  const [width, setWidth] = useState<WebWidth>("desktop");
  const { pathname } = useLocation();
  const mockup = usePointerFine();
  const story = authStory(productName);

  const inner = (
    <div className="@container relative flex min-h-dvh flex-col bg-base-200 mockup:h-full mockup:min-h-0 mockup:flex-1 mockup:overflow-y-auto">
      <div className="grid flex-1 @2xl:grid-cols-[minmax(0,1fr)_minmax(17rem,0.8fr)]">
        <div className="flex items-center justify-center p-4 @2xl:p-6">
          <div className="w-full max-w-md rounded-brand-lg border border-base-300 bg-base-100 p-6 shadow-folio @2xl:p-8">
            <Link
              to="/"
              aria-label="Return to Monovella landing page"
              className="mb-6 inline-flex min-h-11 items-center gap-2.5 rounded-brand text-base-content transition-colors duration-(--motion-fast) hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <span className="flex min-h-8 min-w-0 flex-col justify-center">
                <Lockup size="sm" className="shrink-0" />
                <span
                  className={cn("block truncate text-body-sm leading-4", TONE_TEXT[productTone])}
                >
                  {productName}
                </span>
              </span>
            </Link>
            {children}
          </div>
        </div>
        <aside className="relative hidden overflow-hidden border-l border-base-300 @2xl:block">
          <img src={story.image} alt="" className="h-full w-full object-cover" decoding="async" />
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-t from-neutral/90 via-neutral/25 to-transparent"
          />
          <div className="absolute inset-x-6 bottom-7 text-neutral-content">
            <p className="w-fit font-mono text-[0.6875rem] uppercase tracking-widest text-primary bg-primary-content px-2 py-1">
              {story.eyebrow}
            </p>
            <p className="mt-2 font-heading text-h2 leading-tight">{story.title}</p>
          </div>
        </aside>
      </div>
      <footer className="px-4 pb-24 pt-4 text-center text-body-sm text-base-content/55 mockup:pb-6 @2xl:text-left">
        <SupportLine />
      </footer>
    </div>
  );

  const shell =
    width === "desktop" ? (
      <LaptopFrame url={`monovella.com${pathname}`} className="mockup:h-[900px] mockup:w-[84rem]">
        {inner}
      </LaptopFrame>
    ) : (
      <DeviceFrame
        tablet={width === "tablet"}
        className={
          width === "tablet"
            ? "mockup:h-[1108px] mockup:w-[838px]"
            : "mockup:h-[860px] mockup:w-[406px]"
        }
      >
        {inner}
      </DeviceFrame>
    );

  return (
    <MockupZoomProvider>
      <MockupStage mockup={mockup} className="bg-base-200">
        {shell}
      </MockupStage>
      <PrototypeBar surface={productName} webWidth={width} onWebWidth={setWidth} mockup={mockup} />
    </MockupZoomProvider>
  );
}

/**
 * The public site's frame — landing page and legal pages. Same laptop/device
 * mockup and Phone/Tablet/Desktop toggle as the rest of the web portal, but
 * no sidebar and no account chrome: the page itself supplies its own header,
 * nav and footer as `children`, the way it would as a real marketing site.
 */
export function PublicWebShell({
  children,
  surface = "Landing page",
}: {
  children: React.ReactNode;
  surface?: string;
}) {
  const [width, setWidth] = useState<WebWidth>("desktop");
  const { pathname } = useLocation();
  const mockup = usePointerFine();

  const inner = (
    // Full-bleed on a real device there is no mockup gap under the page, so the
    // floating prototype bar would sit over the last of the footer. Reserve its
    // height; inside a mockup the stage already provides the space.
    <div className="@container relative min-h-dvh bg-base-100 pb-[var(--prototype-bar-height)] mockup:h-full mockup:min-h-0 mockup:overflow-y-auto mockup:pb-0">
      {children}
    </div>
  );

  const shell =
    width === "desktop" ? (
      <LaptopFrame url={`monovella.com${pathname}`} className="mockup:h-[900px] mockup:w-[84rem]">
        {inner}
      </LaptopFrame>
    ) : (
      <DeviceFrame
        tablet={width === "tablet"}
        className={
          width === "tablet"
            ? "mockup:h-[1108px] mockup:w-[838px]"
            : "mockup:h-[860px] mockup:w-[406px]"
        }
      >
        {inner}
      </DeviceFrame>
    );

  return (
    <MockupZoomProvider>
      <MockupStage mockup={mockup} className="bg-base-200">
        {shell}
      </MockupStage>
      <PrototypeBar surface={surface} webWidth={width} onWebWidth={setWidth} mockup={mockup} />
    </MockupZoomProvider>
  );
}

export function PageHeader({
  title,
  description,
  action,
  back,
  className,
  utility,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** The one level up, when this screen is a detail view of a queue. */
  back?: { to: string; label: string };
  className?: string;
  /**
   * Standing top-level controls — who you are signed in as, notifications,
   * help. They sit above the title for the same reason they do on the mobile
   * Home: a business or queue name should never have to share a line with
   * chrome, and it is the part that must not shrink.
   */
  utility?: React.ReactNode;
}) {
  return (
    <div className={cn("mb-6", className)}>
      {utility ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">{utility}</div>
      ) : null}
      {back ? (
        <Link
          to={back.to}
          className="mb-3 inline-flex min-h-6 items-center gap-1.5 text-label text-primary"
        >
          <ArrowLeft aria-hidden className="size-4" strokeWidth={1.5} />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-heading text-h1 wrap-anywhere">{title}</h1>
          {description ? (
            <p className="measure mt-1 text-body-sm text-base-content/65">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
    </div>
  );
}

/**
 * One standing control in a `PageHeader`'s utility row. Keeps its label rather
 * than reducing to a bare icon: these are infrequent destinations, and an
 * unlabelled glyph in a staff tool costs more than the space it saves.
 */
export function HeaderUtilityLink({
  to,
  icon: Icon,
  label,
  tone = "default",
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  tone?: "default" | "attention";
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex min-h-11 items-center gap-2 rounded-brand border px-3 text-body-sm transition-colors",
        tone === "attention"
          ? "border-warning/35 bg-warning-tint text-base-content hover:border-warning/60"
          : "border-base-300 bg-base-200 text-base-content/80 hover:border-primary/40",
      )}
    >
      <Icon
        aria-hidden
        className={cn("size-4 shrink-0", tone === "attention" ? "text-warning" : "text-primary")}
        strokeWidth={1.5}
      />
      {label}
    </Link>
  );
}
