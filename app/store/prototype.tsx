import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { PageStatus } from "~/components/ui";
import {
  buildDataset,
  type Dataset,
  isPrototypeDataLoaded,
  loadPrototypeData,
  reference,
} from "~/data";
import {
  EXPERT_ID,
  normalizeManagedPatientId,
  PATIENT_ID,
  registerSymptomLabels,
} from "~/data/selectors";
import type { LogEntryDetailRead } from "~/data/types";
import { AUTH_JOURNEY_STORAGE_KEY } from "~/lib/auth-journey";
import { now } from "~/lib/clock";
import { updateDataset } from "~/lib/dataset-update";
import { ensureProviderSettings } from "~/lib/provider-settings";

registerSymptomLabels(reference.symptoms);

export type ThemeChoice = "light" | "dark" | "system";
export type AppContextRole = "patient" | "expert";
export type AppAccess =
  | "GRANTED"
  | "CREDENTIAL_CHANGE_REQUIRED"
  | "SESSION_REVOKED"
  | "CLOSURE_REQUESTED";
export type DeviceFrame = "phone" | "tablet";
/** How the mockup stage sizes the device: fit the window, or a fixed scale. */
export type ZoomChoice = "fit" | number;

export interface Session {
  /** Whether this browser session may enter protected mobile-app routes. */
  authenticated: boolean;
  /** Why protected access is available or blocked in the prototype. */
  access: AppAccess;
  /** Which identity the mobile app is currently showing (P0). */
  role: AppContextRole;
  /** The patient whose record is on screen — self, or a dependant (P15). */
  viewingPatientId: string;
  /** Set while the patient is browsing the app "offline" (P29, §2). */
  offline: boolean;
  /** Standing suspension demo toggle (P62 / X8 / V12). */
  standingSuspended: boolean;
  /**
   * Which expert seat the reviewer occupies. The directory holds Nurse,
   * Pharmacist, Lab Scientist and Physiotherapist experts whose permitted
   * actions differ from a Doctor's, and a reviewer who can only ever be the
   * Doctor cannot check that those differences hold.
   */
  expertId: string;
}

export interface BookingDraft {
  patientId: string;
  requestSummary: string;
  source: "TEXT" | "VOICE";
}

export interface Toast {
  id: number;
  message: string;
}

export interface ScreenStateOption {
  value: string;
  label: string;
}

/**
 * The states the screen currently on view can be put into.
 *
 * PRODUCT_SCREEN_V0.md enumerates every distinct condition each screen must
 * design for, and a prototype that only shows the happy path hides the work
 * that matters. The control for switching between them lives in the prototype
 * bar rather than on the screen itself, so nothing that isn't product ever
 * renders inside the product.
 */
export interface ScreenStates {
  options: ScreenStateOption[];
  value: string;
}

export interface OfflineSyncResult {
  acknowledged: string[];
  failed: string[];
  conflicts: string[];
}

interface PrototypeValue {
  data: Dataset;
  session: Session;
  bookingDraft: BookingDraft | null;
  theme: ThemeChoice;
  frame: DeviceFrame;
  zoom: ZoomChoice;
  toasts: Toast[];
  screenStates: ScreenStates | null;
  update: (mutate: (draft: Dataset) => void) => void;
  setSession: (patch: Partial<Session>) => void;
  setBookingDraft: (draft: BookingDraft | null) => void;
  setTheme: (theme: ThemeChoice) => void;
  setFrame: (frame: DeviceFrame) => void;
  setZoom: (zoom: ZoomChoice) => void;
  toast: (message: string) => void;
  dismissToast: (id: number) => void;
  requestAccountClosure: () => void;
  syncOfflineQueue: (patientId: string, partial?: boolean) => Promise<OfflineSyncResult>;
  reset: () => void;
  nextId: (prefix: string) => string;
  registerScreenStates: (
    options: ScreenStateOption[] | null,
    setter: ((value: string) => void) | null,
  ) => void;
  setScreenStateValue: (value: string) => void;
  selectScreenState: (value: string) => void;
}

const PrototypeContext = createContext<PrototypeValue | null>(null);

const DEFAULT_SESSION: Session = {
  authenticated: true,
  access: "GRANTED",
  role: "patient",
  viewingPatientId: PATIENT_ID,
  offline: false,
  standingSuspended: false,
  expertId: EXPERT_ID,
};

const STORAGE_KEY = "mv-prototype-state";

function recordOrEmpty(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Fixtures evolve during review while a browser tab can retain its demo state.
 * Keep the saved interactions, but supply defaults for data slices added after
 * that state was written so a new route cannot crash on an old session.
 */
function hydrateDataset(value: unknown): Dataset {
  const fresh = buildDataset();
  const persisted = recordOrEmpty(value);

  const data = {
    ...fresh,
    ...persisted,
    user: { ...fresh.user, ...recordOrEmpty(persisted.user) },
  } as Dataset;
  for (const account of data.providerAccounts ?? [])
    ensureProviderSettings(data, account.providerId);
  return data;
}

function normalizeSession(data: Dataset, value: unknown): Session {
  const session = { ...DEFAULT_SESSION, ...recordOrEmpty(value) } as Session;
  const closureRequested = data.user.closure_status === "CLOSURE_REQUESTED";
  const knownAccess: AppAccess[] = [
    "GRANTED",
    "CREDENTIAL_CHANGE_REQUIRED",
    "SESSION_REVOKED",
    "CLOSURE_REQUESTED",
  ];
  const access = knownAccess.includes(session.access) ? session.access : "SESSION_REVOKED";
  return {
    ...session,
    authenticated:
      closureRequested || access === "SESSION_REVOKED" || access === "CLOSURE_REQUESTED"
        ? false
        : session.authenticated,
    access: closureRequested ? "CLOSURE_REQUESTED" : access,
    viewingPatientId: normalizeManagedPatientId(data, session.viewingPatientId),
  };
}

function loadPersisted(): {
  data: Dataset;
  session: Session;
  bookingDraft: BookingDraft | null;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = recordOrEmpty(JSON.parse(raw));
    const persistedData = recordOrEmpty(parsed.data);
    if (!Array.isArray(persistedData.patients)) return null;
    const data = hydrateDataset(persistedData);
    const persistedSession = { ...DEFAULT_SESSION, ...recordOrEmpty(parsed.session) } as Session;
    const session = normalizeSession(data, persistedSession);
    const changedPatient = session.viewingPatientId !== persistedSession.viewingPatientId;
    return {
      data,
      session,
      bookingDraft:
        !changedPatient && parsed.bookingDraft && typeof parsed.bookingDraft === "object"
          ? (parsed.bookingDraft as BookingDraft)
          : null,
    };
  } catch {
    return null;
  }
}

/**
 * Opens the Postgres database before anything renders.
 *
 * The prototype's data is `public/prototype.pgdata`, opened in the browser with
 * PGlite. That is asynchronous, and every screen assumes its data is already
 * there, so the wait happens once, here, behind the same loading screen a slow
 * route uses. A failure says what to run rather than rendering an empty app.
 */
export function PrototypeProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(() => isPrototypeDataLoaded());
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    loadPrototypeData()
      .then(() => !cancelled && setReady(true))
      .catch((error: unknown) => {
        if (!cancelled) setFailure(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  if (failure) {
    return (
      <main className="flex min-h-dvh flex-col justify-center bg-base-100">
        <PageStatus kind="error" title="The prototype's data could not be opened" body={failure} />
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="flex min-h-dvh bg-base-100">
        <PageStatus
          kind="loading"
          title="Loading Monovella"
          body="Opening the prototype's records."
          className="min-h-dvh"
        />
      </main>
    );
  }

  return <PrototypeStore>{children}</PrototypeStore>;
}

function PrototypeStore({ children }: { children: React.ReactNode }) {
  // Restore an in-progress demo across reloads, but never across sessions.
  // Hydrating lazily (in the initializer) rather than via a mount effect
  // avoids a render where `data`/`session` are still the fresh defaults —
  // a persist effect firing on that render would overwrite the very
  // sessionStorage entry it's meant to be restoring.
  const [data, setData] = useState<Dataset>(() => loadPersisted()?.data ?? buildDataset());
  const [sessionState, setSessionState] = useState<Session>(() => ({
    ...DEFAULT_SESSION,
    ...loadPersisted()?.session,
  }));
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(
    () => loadPersisted()?.bookingDraft ?? null,
  );
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [frame, setFrameState] = useState<DeviceFrame>("phone");
  const [zoom, setZoomState] = useState<ZoomChoice>("fit");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [screenStates, setScreenStates] = useState<ScreenStates | null>(null);
  const screenStateSetter = useRef<((value: string) => void) | null>(null);
  const counter = useRef(0);
  const session = useMemo(() => normalizeSession(data, sessionState), [data, sessionState]);
  const previousPatientId = useRef(session.viewingPatientId);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("mv-theme") as ThemeChoice | null;
    if (storedTheme) setThemeState(storedTheme);
    const storedFrame = window.localStorage.getItem("mv-frame") as DeviceFrame | null;
    if (storedFrame) setFrameState(storedFrame);
    const storedZoom = window.localStorage.getItem("mv-zoom");
    if (storedZoom === "fit") setZoomState("fit");
    else if (storedZoom && !Number.isNaN(Number(storedZoom))) setZoomState(Number(storedZoom));
  }, []);

  // This is intentionally state, not visual chrome: screenshot and review
  // tooling can confirm that a mobile route used the selected Phone/Tablet
  // layout even when that route is viewed on a real touch device, where the
  // decorative DeviceFrame is correctly absent.
  useEffect(() => {
    document.documentElement.dataset.prototypeFrame = frame;
  }, [frame]);

  useEffect(() => {
    if (previousPatientId.current !== session.viewingPatientId) {
      previousPatientId.current = session.viewingPatientId;
      setBookingDraft(null);
    }
  }, [session.viewingPatientId]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ data, session, bookingDraft }));
    } catch {
      /* quota — the demo still works, it just won't survive a reload */
    }
  }, [data, session, bookingDraft]);

  const applyTheme = useCallback((choice: ThemeChoice) => {
    const dark =
      choice === "dark" ||
      (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, applyTheme]);

  const update = useCallback((mutate: (draft: Dataset) => void) => {
    setData((current) => updateDataset(current, mutate));
  }, []);

  const generatingReports = data.reports
    .filter((report) => report.status === "GENERATING")
    .map((report) => report.id)
    .sort()
    .join(",");
  useEffect(() => {
    if (!generatingReports) return;
    const pending = new Set(generatingReports.split(","));
    // The simulated job belongs to the session, so navigation and reloads
    // cannot strand a persisted report in GENERATING. No PDF is produced.
    const timer = window.setTimeout(() => {
      update((draft) => {
        draft.reports = draft.reports.map((report) =>
          pending.has(report.id) && report.status === "GENERATING"
            ? {
                ...report,
                status: "READY",
                ready_at: now().toISOString().slice(0, 19),
                pdf_url: `/reports/${report.id}.pdf`,
                verification_code: `MV-RPT-${report.id.replace(/^rep_/, "").toUpperCase()}`,
              }
            : report,
        );
      });
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [generatingReports, update]);

  const setSession = useCallback(
    (patch: Partial<Session>) => {
      setSessionState((current) => normalizeSession(data, { ...current, ...patch }));
    },
    [data],
  );

  // Persisted on the explicit choice only. Writing from the effect would let
  // the default clobber a stored choice before hydration had read it.
  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    window.localStorage.setItem("mv-theme", next);
  }, []);

  const setFrame = useCallback((next: DeviceFrame) => {
    setFrameState(next);
    window.localStorage.setItem("mv-frame", next);
  }, []);

  const setZoom = useCallback((next: ZoomChoice) => {
    setZoomState(next);
    window.localStorage.setItem("mv-zoom", String(next));
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message: string) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((t) => [...t, { id, message }]);
      // PRODUCT_BRAND.md §8 — transient, ~4s, never carries a timed action.
      window.setTimeout(() => dismissToast(id), 4000);
    },
    [dismissToast],
  );

  const registerScreenStates = useCallback(
    (options: ScreenStateOption[] | null, setter: ((value: string) => void) | null) => {
      screenStateSetter.current = setter;
      setScreenStates(options ? { options, value: options[0]?.value ?? "" } : null);
    },
    [],
  );

  const setScreenStateValue = useCallback((value: string) => {
    setScreenStates((current) =>
      current && current.value !== value ? { ...current, value } : current,
    );
  }, []);

  /** Routed through the screen's own setter, so the screen stays the owner. */
  const selectScreenState = useCallback((value: string) => {
    screenStateSetter.current?.(value);
  }, []);

  const requestAccountClosure = useCallback(() => {
    const requestedAt = now().toISOString().slice(0, 19);
    setData((current) => ({
      ...current,
      user: {
        ...current.user,
        closure_status: "CLOSURE_REQUESTED",
        closure_requested_at: requestedAt,
      },
    }));
    setSessionState((current) => ({
      ...current,
      authenticated: false,
      access: "CLOSURE_REQUESTED",
      offline: false,
    }));
    setBookingDraft(null);
  }, []);

  const syncOfflineQueue = useCallback(
    (patientId: string, partial = false) =>
      new Promise<OfflineSyncResult>((resolve) => {
        window.setTimeout(() => {
          let settled = false;
          setData((current) => {
            const result: OfflineSyncResult = { acknowledged: [], failed: [], conflicts: [] };
            const finish = () => {
              if (settled) return;
              settled = true;
              window.queueMicrotask(() => resolve(result));
            };
            if (normalizeManagedPatientId(current, patientId) !== patientId) {
              finish();
              return current;
            }
            const queued = current.offlineQueue.filter((entry) => entry.patient_id === patientId);
            const failId = partial && queued.length > 1 ? queued.at(-1)?.id : undefined;
            const acknowledged = new Set<string>();
            const nextLogs = [...current.logEntries];

            for (const entry of queued) {
              if (entry.id === failId) {
                result.failed.push(entry.id);
                continue;
              }
              const existing = nextLogs.find((saved) => saved.id === entry.id);
              if (existing) {
                if (JSON.stringify(existing) === JSON.stringify(entry)) {
                  acknowledged.add(entry.id);
                  result.acknowledged.push(entry.id);
                } else {
                  result.conflicts.push(entry.id);
                }
                continue;
              }
              nextLogs.unshift(entry as LogEntryDetailRead);
              acknowledged.add(entry.id);
              result.acknowledged.push(entry.id);
            }

            const next = {
              ...current,
              logEntries: nextLogs,
              offlineQueue: current.offlineQueue.filter(
                (entry) => entry.patient_id !== patientId || !acknowledged.has(entry.id),
              ),
            };
            finish();
            return next;
          });
        }, 500);
      }),
    [],
  );

  const reset = useCallback(() => {
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_JOURNEY_STORAGE_KEY);
    setData(buildDataset());
    setSessionState(DEFAULT_SESSION);
    setBookingDraft(null);
    setToasts([]);
  }, []);

  const nextId = useCallback((prefix: string) => {
    counter.current += 1;
    return `${prefix}_${now().getTime().toString(36)}${counter.current}`;
  }, []);

  const value = useMemo<PrototypeValue>(
    () => ({
      data,
      session,
      bookingDraft,
      theme,
      frame,
      zoom,
      toasts,
      screenStates,
      update,
      setSession,
      setBookingDraft,
      setTheme,
      setFrame,
      setZoom,
      toast,
      dismissToast,
      requestAccountClosure,
      syncOfflineQueue,
      reset,
      nextId,
      registerScreenStates,
      setScreenStateValue,
      selectScreenState,
    }),
    [
      data,
      session,
      bookingDraft,
      theme,
      frame,
      zoom,
      toasts,
      screenStates,
      update,
      setSession,
      setTheme,
      setFrame,
      setZoom,
      toast,
      dismissToast,
      requestAccountClosure,
      syncOfflineQueue,
      reset,
      nextId,
      registerScreenStates,
      setScreenStateValue,
      selectScreenState,
    ],
  );

  return <PrototypeContext.Provider value={value}>{children}</PrototypeContext.Provider>;
}

export function usePrototype() {
  const ctx = useContext(PrototypeContext);
  if (!ctx) throw new Error("usePrototype must be used inside <PrototypeProvider>");
  return ctx;
}

/** Re-renders once a second so live countdowns actually count down. */
export function useTick(intervalMs = 1000) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}

/**
 * The expert seat the reviewer currently occupies.
 *
 * Every expert workspace reads this rather than a fixed id, so the Nurse,
 * Pharmacist, Lab Scientist and Physiotherapist seats can be operated and their
 * narrower scope actually exercised, not just described.
 */
export function useExpertSeat() {
  return usePrototype().session.expertId;
}
