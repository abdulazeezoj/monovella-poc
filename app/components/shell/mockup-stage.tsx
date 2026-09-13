import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "~/lib/cn";
import { usePrototype } from "~/store/prototype";

/**
 * The floor the device sits on. A mockup keeps its own fixed hardware size —
 * it is never squeezed to fit the browser window the way the page around it
 * would be. When the window is smaller than the device, the stage either
 * scales the whole device down (Fit / explicit zoom levels — CSS `zoom`, so
 * the app inside still lays out at its true device size and its container
 * queries never notice) or lets it overflow and pan: the stage scrolls, and
 * an empty patch of floor can be grabbed and dragged like a canvas.
 *
 * On a real phone or tablet (`mockup` false) none of this exists — the app
 * is the device and fills the viewport as itself.
 */

/** Fixed zoom stops the +/− controls step through. "Fit" lives outside this ladder. */
export const ZOOM_STOPS = [0.5, 0.65, 0.8, 1] as const;

interface ZoomState {
  /** What the stage is actually rendering at right now (fit resolves to a number). */
  effective: number;
  /** Whether the whole device is visible without panning. */
  fits: boolean;
}

const DEFAULT_ZOOM_STATE: ZoomState = { effective: 1, fits: true };

const MockupZoomContext = createContext<{
  state: ZoomState;
  setState: React.Dispatch<React.SetStateAction<ZoomState>>;
}>({ state: DEFAULT_ZOOM_STATE, setState: () => {} });

/**
 * Shared between the stage (which measures) and the prototype bar (which
 * labels the zoom control) — wrap both in this, since the bar lives outside
 * the stage so the CSS zoom never scales it.
 */
export function MockupZoomProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ZoomState>(DEFAULT_ZOOM_STATE);
  const value = useMemo(() => ({ state, setState }), [state]);
  return <MockupZoomContext.Provider value={value}>{children}</MockupZoomContext.Provider>;
}

/** The prototype bar reads this to label the zoom control with a live percentage. */
export function useMockupZoom() {
  return useContext(MockupZoomContext).state;
}

/** Bottom clearance so a device at 100% can still scroll fully past the prototype bar. */
const BAR_CLEARANCE = 88;
const STAGE_PAD = 32;

export function MockupStage({
  mockup,
  className,
  children,
}: {
  mockup: boolean;
  /** Styling for the plain (real-device) wrapper only — the stage styles itself. */
  className?: string;
  children: React.ReactNode;
}) {
  const { zoom } = usePrototype();
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const { state, setState } = useContext(MockupZoomContext);

  // Fit maths: the frame's own layout size is in unzoomed CSS px, the stage's
  // client box is real px — the ratio is the zoom that shows the whole device.
  const measure = useCallback(() => {
    const stage = stageRef.current;
    const frame = frameRef.current;
    if (!stage || !frame) return;
    const availW = stage.clientWidth - STAGE_PAD * 2;
    const availH = stage.clientHeight - STAGE_PAD - BAR_CLEARANCE;
    const w = frame.offsetWidth;
    const h = frame.offsetHeight;
    if (!w || !h || availW <= 0 || availH <= 0) return;
    const fitScale = Math.max(0.25, Math.min(availW / w, availH / h, 1));
    const effective = zoom === "fit" ? fitScale : zoom;
    const fits = effective <= fitScale + 0.001;
    setState((s) => (s.effective === effective && s.fits === fits ? s : { effective, fits }));
  }, [zoom, setState]);

  useLayoutEffect(() => {
    if (!mockup) return;
    measure();
    const stage = stageRef.current;
    const frame = frameRef.current;
    if (!stage || !frame) return;
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [mockup, measure]);

  // When the device overflows, an empty patch of floor drags the view around.
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    const stage = stageRef.current;
    if (!stage) return;
    // Only the floor itself pans — never a click that lands on the app.
    if ((e.target as HTMLElement).dataset.stageFloor === undefined) return;
    drag.current = { x: e.clientX, y: e.clientY, left: stage.scrollLeft, top: stage.scrollTop };
    stage.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const stage = stageRef.current;
    if (!stage || !drag.current) return;
    stage.scrollLeft = drag.current.left - (e.clientX - drag.current.x);
    stage.scrollTop = drag.current.top - (e.clientY - drag.current.y);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    drag.current = null;
    stageRef.current?.releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (!mockup) setState(DEFAULT_ZOOM_STATE);
  }, [mockup, setState]);

  if (!mockup) {
    // The browser is the device: no floor, no zoom, the app fills the viewport.
    return (
      <div
        data-mockup={false}
        className={cn("flex h-dvh flex-col overflow-hidden bg-base-100", className)}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={stageRef}
      data-mockup
      data-stage-floor
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className={cn(
        "scrollbar-thin flex h-dvh overflow-auto bg-base-200",
        !state.fits && "cursor-grab",
      )}
      style={{ padding: `${STAGE_PAD}px`, paddingBottom: `${BAR_CLEARANCE}px` }}
    >
      {/* margin:auto centres a small device and keeps every edge reachable
          when it overflows — the classic scroll-container centring. */}
      <div data-stage-floor className="m-auto" style={{ zoom: state.effective }}>
        <div ref={frameRef} className="flex">
          {children}
        </div>
      </div>
    </div>
  );
}
