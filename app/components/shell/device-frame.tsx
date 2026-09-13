import { forwardRef, useEffect, useState } from "react";
import { ToastHost } from "~/components/ui";
import { now } from "~/lib/clock";
import { cn } from "~/lib/cn";

/**
 * The hardware around the prototype.
 *
 * On a laptop the mobile app used to render as a rounded rectangle with a
 * border, which reads as a card rather than a phone. This is the body: bezel,
 * status bar, island, home indicator and side buttons, so a screen shown in a
 * pitch or a review is unmistakably a mobile product.
 *
 * All of it is chrome, so all of it is `aria-hidden`. It exists only behind
 * the `mockup:` variant (app/lib/use-mockup.ts) — on a real phone or tablet
 * the app *is* the device and this never renders, which is also why the
 * 320px accessibility sweep never sees it. A desktop browser window keeps
 * the mockup at its own fixed size regardless of how narrow the window is —
 * the shell wrapping it scrolls, rather than shrinking the mockup to fit.
 */

/** The status bar clock runs on the demo clock, like every other time in here. */
function useDemoClock() {
  const [text, setText] = useState(() => clockText());
  useEffect(() => {
    const id = window.setInterval(() => setText(clockText()), 10_000);
    return () => window.clearInterval(id);
  }, []);
  return text;
}

function clockText() {
  const d = now();
  return `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function Signal() {
  return (
    <svg viewBox="0 0 18 12" className="h-[0.6rem] w-[0.9rem]" fill="currentColor">
      <title>Signal</title>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={i * 4.6} y={9 - i * 3} width="3" height={3 + i * 3} rx="1" />
      ))}
    </svg>
  );
}

function Wifi() {
  return (
    <svg viewBox="0 0 16 12" className="h-[0.6rem] w-[0.8rem]" fill="none" stroke="currentColor">
      <title>Wi-Fi</title>
      <path d="M1 4.2a10 10 0 0 1 14 0" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M3.6 6.9a6.2 6.2 0 0 1 8.8 0" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Battery() {
  return (
    <svg viewBox="0 0 26 12" className="h-[0.6rem] w-[1.3rem]" fill="none">
      <title>Battery</title>
      <rect
        x="0.7"
        y="0.7"
        width="22"
        height="10.6"
        rx="3"
        stroke="currentColor"
        strokeOpacity="0.45"
        strokeWidth="1.2"
      />
      <rect x="2.4" y="2.4" width="16" height="7.2" rx="1.8" fill="currentColor" />
      <path d="M24.4 4.3v3.4a2 2 0 0 0 0-3.4Z" fill="currentColor" fillOpacity="0.45" />
    </svg>
  );
}

/**
 * The strip a real phone reserves at the top of the screen. It sits *inside*
 * the app surface, so the app's own header scrolls under nothing and the
 * container queries still measure the screen, not the bezel.
 */
function StatusBar({ tablet = false }: { tablet?: boolean }) {
  const time = useDemoClock();
  return (
    <div
      aria-hidden
      className={cn(
        // Only from `lg`: below it the real device draws its own.
        "hidden shrink-0 select-none items-center justify-between bg-base-100 font-mono text-[0.68rem] tabular text-base-content/70 mockup:flex",
        tablet ? "px-6 pb-1 pt-2" : "px-7 pb-1 pt-3",
      )}
    >
      <span className="tracking-tight">{time}</span>
      {/* On a phone the island occupies the middle of this row. */}
      <span className={cn("flex items-center gap-1.5", tablet ? "" : "pl-16")}>
        <Signal />
        <Wifi />
        <Battery />
      </span>
    </div>
  );
}

/** The pill cut out of the top of the screen. Phone only. */
function Island() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-[0.55rem] z-50 hidden h-[1.4rem] w-[5.2rem] -translate-x-1/2 rounded-full bg-[#0b0a09] mockup:block"
    >
      <span className="absolute right-[0.7rem] top-1/2 size-[0.4rem] -translate-y-1/2 rounded-full bg-[#171a1f]" />
    </div>
  );
}

/** The bar iOS draws over the bottom of the screen. */
function HomeIndicator() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 z-50 hidden h-[0.9rem] items-center justify-center mockup:flex"
    >
      <span className="h-[0.22rem] w-[8rem] rounded-full bg-base-content/25" />
    </div>
  );
}

/** Volume rocker and power key, on the outside of the body. */
function SideKeys({ tablet }: { tablet: boolean }) {
  const key = "pointer-events-none absolute hidden rounded-full bg-[#2b2621] mockup:block";
  return (
    <span aria-hidden>
      {/* left: volume, plus a silence switch above it on the phone */}
      {tablet ? null : <span className={cn(key, "-left-[3px] top-[7.5rem] h-[1.6rem] w-[3px]")} />}
      <span
        className={cn(
          key,
          "-left-[3px] w-[3px]",
          tablet ? "top-[5rem] h-[2.2rem]" : "top-[9.8rem] h-[2.6rem]",
        )}
      />
      <span
        className={cn(
          key,
          "-left-[3px] w-[3px]",
          tablet ? "top-[7.8rem] h-[2.2rem]" : "top-[13rem] h-[2.6rem]",
        )}
      />
      {/* right: power */}
      <span
        className={cn(
          key,
          "-right-[3px] w-[3px]",
          tablet ? "top-[6rem] h-[3rem]" : "top-[10.5rem] h-[4rem]",
        )}
      />
    </span>
  );
}

/**
 * Wraps the app surface in a device body. `children` is the screen: it keeps
 * its own `@container`, so switching Phone → Tablet reflows the app rather
 * than scaling a phone layout up.
 */
export const DeviceFrame = forwardRef<
  HTMLDivElement,
  {
    tablet?: boolean;
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
  }
>(function DeviceFrame({ tablet = false, className, style, children }, ref) {
  return (
    <div
      ref={ref}
      data-prototype-frame={tablet ? "tablet" : "phone"}
      style={style}
      className={cn(
        // Without a mockup there is no device: the browser is the device.
        "relative flex w-full flex-1 flex-col mockup:flex-none",
        // The body.
        "mockup:rounded-[2.9rem] mockup:bg-[#2b2621] mockup:p-[0.7rem] mockup:shadow-[0_2.5rem_5rem_-1.5rem_rgb(0_0_0/0.45)]",
        // A hairline of light along the top edge, the way an aluminium band catches it.
        "mockup:ring-1 mockup:ring-inset mockup:ring-white/10",
        tablet && "mockup:rounded-[2.1rem] mockup:p-[0.85rem]",
        className,
      )}
    >
      {/* The front camera, on a tablet's even bezel. */}
      {tablet ? (
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[0.34rem] hidden size-[0.3rem] -translate-x-1/2 rounded-full bg-[#0b0a09] mockup:block"
        />
      ) : null}

      <SideKeys tablet={tablet} />

      {/* The screen. `children` keeps its own container query, so the app
          reflows to the screen rather than scaling to it. */}
      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-base-100 mockup:pb-[0.9rem]",
          tablet ? "mockup:rounded-[1.35rem]" : "mockup:rounded-[2.25rem]",
        )}
      >
        {!tablet ? <Island /> : null}
        <StatusBar tablet={tablet} />
        {/* The app's own area. Positioned, so an overlay inside the app (a
            navigation drawer, say) covers the app and not the status bar, and
            so a toast lands on the screen rather than on the desk beside it. */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          {children}
          <ToastHost />
        </div>
        <HomeIndicator />
      </div>
    </div>
  );
});

/** The window chrome. Decorative: the address is a label, not a control. */
function BrowserChrome({ url }: { url: string }) {
  return (
    <div
      aria-hidden
      className="hidden shrink-0 select-none items-center gap-3 border-b border-base-300 bg-base-200 px-3 py-2 mockup:flex"
    >
      <span className="flex shrink-0 gap-1.5">
        <span className="size-[0.6rem] rounded-full bg-base-content/15" />
        <span className="size-[0.6rem] rounded-full bg-base-content/15" />
        <span className="size-[0.6rem] rounded-full bg-base-content/15" />
      </span>
      <span className="flex min-w-0 flex-1 justify-center">
        <span className="max-w-full truncate rounded-full bg-base-100 px-3 py-1 font-mono text-[0.68rem] text-base-content/50">
          {url}
        </span>
      </span>
      <span className="w-[3.4rem] shrink-0" />
    </div>
  );
}

/**
 * The web PWA's mockup: a laptop, because a back-office reviewer, a pharmacy
 * counter and a lab all run this in a browser on a machine, not on a handset.
 *
 * The lid is a real box with its own scroll from `lg` up, so the app inside
 * uses `h-full` there instead of `dvh` and any bottom-anchored chrome becomes
 * `absolute` inside this frame rather than `fixed` to the viewport.
 */
export const LaptopFrame = forwardRef<
  HTMLDivElement,
  {
    url: string;
    className?: string;
    style?: React.CSSProperties;
    children: React.ReactNode;
  }
>(function LaptopFrame({ url, className, style, children }, ref) {
  return (
    <div
      ref={ref}
      style={style}
      className={cn("flex w-full flex-1 flex-col mockup:flex-none mockup:items-center", className)}
    >
      {/* The lid. */}
      <div
        className={cn(
          "relative flex w-full min-h-0 flex-1 flex-col overflow-hidden bg-base-100",
          "mockup:rounded-[1.1rem] mockup:bg-[#2b2621] mockup:p-[0.6rem] mockup:pt-[1.1rem]",
          "mockup:shadow-[0_2.5rem_5rem_-2rem_rgb(0_0_0/0.45)] mockup:ring-1 mockup:ring-inset mockup:ring-white/10",
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[0.42rem] hidden size-[0.26rem] -translate-x-1/2 rounded-full bg-[#0b0a09] mockup:block"
        />
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-base-100 mockup:rounded-[0.55rem]">
          <BrowserChrome url={url} />
          <div className="relative flex min-h-0 flex-1 flex-col">
            {children}
            <ToastHost />
          </div>
        </div>
      </div>

      {/* The base: a hinge bar wider than the lid, with the trackpad notch. */}
      <div aria-hidden className="hidden w-full shrink-0 flex-col items-center mockup:flex">
        <span className="h-[0.6rem] w-[calc(100%+3.5rem)] rounded-b-[0.5rem] bg-gradient-to-b from-[#3a342d] to-[#221e1a] shadow-[0_0.4rem_0.9rem_-0.4rem_rgb(0_0_0/0.5)]" />
        <span className="h-[0.22rem] w-[7rem] rounded-b-full bg-[#171310]" />
      </div>
    </div>
  );
});
