import {
  Check,
  Layers,
  Maximize,
  Minus,
  Monitor,
  Moon,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { cn } from "~/lib/cn";
import { usePrototype } from "~/store/prototype";
import { MonovellaIcon } from "./logo";
import { useMockupZoom, ZOOM_STOPS } from "./mockup-stage";

export type WebWidth = "mobile" | "tablet" | "desktop";

/**
 * The prototype's own chrome — never part of the product. It sits outside the
 * device frame, and it is where every prototype-only control lives, including
 * the screen-state switcher, so no page ever renders a control that isn't
 * Monovella's.
 *
 * Every control exists at every window width: from `md` up they sit inline in
 * the pill; below that the same controls live in a panel behind the sliders
 * button — moved, never dropped.
 */
export function PrototypeBar({
  surface,
  mockup,
}: {
  surface: string;
  /** Whether a device mockup is on stage — zoom only exists when one is. */
  mockup?: boolean;
}) {
  const { reset } = usePrototype();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center p-3 print:hidden">
      <div className="pointer-events-auto flex max-w-[calc(100vw-1rem)] items-center gap-1 rounded-full border border-base-300 bg-base-100/95 p-1 shadow-brand">
        <Link
          to="/tour"
          className="flex min-h-9 shrink-0 items-center gap-2 rounded-full px-2.5 text-label text-base-content/80 hover:bg-base-200"
          title="Back to the prototype tour"
        >
          <MonovellaIcon className="size-5" />
          <span className="hidden md:inline">{surface}</span>
        </Link>

        <StatesControl />

        <span aria-hidden className="mx-0.5 h-6 w-px shrink-0 bg-base-300" />

        {/* Inline controls, md and up. */}
        <div className="hidden items-center gap-1 md:flex">
          <ThemeControl />
          {mockup ? <ZoomControl /> : null}
          <ResetButton onReset={reset} />
        </div>

        {/* The same controls, below md, in a panel. */}
        <ControlsMenu mockup={mockup} onReset={reset} />
      </div>
    </div>
  );
}

function ThemeControl() {
  const { theme, setTheme } = usePrototype();
  return (
    <Segmented
      label="Theme"
      value={theme}
      onChange={(v) => setTheme(v as "light" | "dark" | "system")}
      options={[
        { value: "light", label: "Light", icon: Sun },
        { value: "dark", label: "Dark", icon: Moon },
        { value: "system", label: "System", icon: Monitor },
      ]}
    />
  );
}

/**
 * Fit / zoom for the device on stage. The device itself never reflows — these
 * scale the whole mockup, so a small window pans or zooms rather than ever
 * squeezing the device.
 */
function ZoomControl() {
  const { zoom, setZoom } = usePrototype();
  const { effective } = useMockupZoom();

  const step = (dir: 1 | -1) => {
    // Step from what's actually on screen, so leaving Fit feels continuous.
    const next =
      dir === 1
        ? ZOOM_STOPS.find((s) => s > effective + 0.001)
        : [...ZOOM_STOPS].reverse().find((s) => s < effective - 0.001);
    if (next) setZoom(next);
  };

  const label =
    zoom === "fit" ? `Fit · ${Math.round(effective * 100)}%` : `${Math.round(effective * 100)}%`;

  return (
    <div
      className="flex items-center rounded-full bg-base-200 p-0.5"
      role="group"
      aria-label="Zoom"
    >
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={effective <= ZOOM_STOPS[0] + 0.001}
        aria-label="Zoom out"
        title="Zoom out"
        className="flex size-8 items-center justify-center rounded-full text-base-content/55 hover:text-base-content disabled:opacity-30"
      >
        <Minus aria-hidden className="size-4" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        onClick={() => setZoom(zoom === "fit" ? 1 : "fit")}
        aria-label={zoom === "fit" ? "Zoom to actual size" : "Fit the device to the window"}
        title={zoom === "fit" ? "Showing the whole device — click for 100%" : "Fit to window"}
        className={cn(
          "flex h-8 min-w-[4.25rem] items-center justify-center gap-1 rounded-full px-2 font-mono text-body-sm tabular transition-colors",
          zoom === "fit"
            ? "bg-base-100 text-primary shadow-brand"
            : "text-base-content/70 hover:text-base-content",
        )}
      >
        <Maximize aria-hidden className="size-3.5 shrink-0" strokeWidth={1.5} />
        {label}
      </button>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={effective >= ZOOM_STOPS[ZOOM_STOPS.length - 1] - 0.001}
        aria-label="Zoom in"
        title="Zoom in"
        className="flex size-8 items-center justify-center rounded-full text-base-content/55 hover:text-base-content disabled:opacity-30"
      >
        <Plus aria-hidden className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}

function ResetButton({ onReset, labelled }: { onReset: () => void; labelled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onReset}
      title="Reset the demo data"
      className={cn(
        "flex min-h-9 items-center justify-center gap-2 rounded-full text-base-content/70 hover:bg-base-200",
        labelled ? "w-full px-2.5 text-label" : "size-9",
      )}
    >
      <RotateCcw aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
      {labelled ? "Reset the demo data" : <span className="sr-only">Reset the demo data</span>}
    </button>
  );
}

/** Below `md`: one button, every control, nothing missing — just rehoused. */
function ControlsMenu({
  mockup,
  onReset,
}: {
  mockup?: boolean;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useCloseOnOutside(open, ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? "Hide prototype controls" : "Show prototype controls"}
        className={cn(
          "flex size-9 items-center justify-center rounded-full transition-colors",
          open ? "bg-neutral text-neutral-content" : "text-base-content/70 hover:bg-base-200",
        )}
      >
        {open ? (
          <X aria-hidden className="size-4" strokeWidth={1.5} />
        ) : (
          <SlidersHorizontal aria-hidden className="size-4" strokeWidth={1.5} />
        )}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Prototype controls"
          className="animate-enter fixed bottom-16 right-3 w-[min(17rem,calc(100vw-1.5rem))] space-y-3 rounded-brand-lg border border-base-300 bg-base-100 p-3 shadow-brand"
        >
          <ControlRow label="Theme">
            <ThemeControl />
          </ControlRow>
          {mockup ? (
            <ControlRow label="Zoom">
              <ZoomControl />
            </ControlRow>
          ) : null}
          <div className="border-t border-base-300 pt-2">
            <ResetButton labelled onReset={onReset} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-body-sm uppercase tracking-wider text-base-content/40">
        {label}
      </span>
      {children}
    </div>
  );
}

function useCloseOnOutside(
  open: boolean,
  ref: React.RefObject<HTMLDivElement | null>,
  close: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open, ref, close]);
}

/**
 * Switches the screen on view between the states PRODUCT_SCREEN_V0.md lists
 * for it. Renders nothing at all on a screen that only has one state, so it
 * never becomes decoration.
 */
function StatesControl() {
  const { screenStates, selectScreenState } = usePrototype();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useCloseOnOutside(open, ref, () => setOpen(false));

  // Close whenever the screen changes what it offers.
  const signature = screenStates?.options.map((o) => o.value).join("|") ?? "";
  // biome-ignore lint/correctness/useExhaustiveDependencies: closing is keyed on the option set changing, which is what `signature` tracks.
  useEffect(() => setOpen(false), [signature]);

  if (!screenStates || screenStates.options.length < 2) return null;

  const current =
    screenStates.options.find((o) => o.value === screenStates.value) ?? screenStates.options[0];

  return (
    <div ref={ref} className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex min-h-9 max-w-[7.5rem] items-center gap-1.5 rounded-full px-2.5 font-mono text-body-sm transition-colors sm:max-w-[11rem] md:max-w-[14rem]",
          open ? "bg-neutral text-neutral-content" : "text-base-content/70 hover:bg-base-200",
        )}
        title="Switch this screen's state"
      >
        <Layers aria-hidden className="size-4 shrink-0" strokeWidth={1.5} />
        <span className="truncate">{current.label}</span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Screen states"
          // Centred on the button and clamped to the viewport, so the last
          // option is reachable on a 320px screen as well as a laptop.
          className="animate-enter absolute bottom-[calc(100%+0.75rem)] left-1/2 max-h-[60vh] w-[min(16rem,calc(100vw-1.5rem))] -translate-x-1/2 overflow-y-auto rounded-brand-lg border border-base-300 bg-base-100 p-1 shadow-brand"
        >
          <p className="px-2.5 py-1.5 font-mono text-body-sm uppercase tracking-wider text-base-content/40">
            This screen's states
          </p>
          {screenStates.options.map((o) => {
            const active = o.value === screenStates.value;
            return (
              <button
                key={o.value}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  selectScreenState(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-9 w-full items-center gap-2 rounded-brand px-2.5 text-left font-mono text-body-sm",
                  active ? "bg-primary-tint text-primary" : "hover:bg-base-200",
                )}
              >
                <Check
                  aria-hidden
                  className={cn("size-3.5 shrink-0", active ? "opacity-100" : "opacity-0")}
                  strokeWidth={2}
                />
                <span className="min-w-0 flex-1">{o.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function Segmented({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
    icon: React.ComponentType<{
      className?: string;
      strokeWidth?: number;
      "aria-hidden"?: boolean;
    }>;
  }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-base-200 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label}: ${o.label}`}
            title={o.label}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex size-8 items-center justify-center rounded-full transition-colors",
              active
                ? "bg-base-100 text-primary shadow-brand"
                : "text-base-content/55 hover:text-base-content",
            )}
          >
            <o.icon aria-hidden className="size-4" strokeWidth={1.5} />
          </button>
        );
      })}
    </div>
  );
}
