import { Mic, MicOff, PhoneOff } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import type { Dataset } from "~/data";
import type { ConsultationCallActor, ConsultationRead } from "~/data/types";
import { now } from "~/lib/clock";
import { cn } from "~/lib/cn";
import { usePrototype } from "~/store/prototype";
import { CallAvatar, formatDuration, type SimulatedCall } from "./call-screen";

/** Fixture-backed coordination only. No live audio or video connection exists. */
interface CallDescriptor {
  consultationId: string;
  otherName: string;
  returnTo: string;
  actor: ConsultationCallActor;
  participantId: string;
}
interface CallContextValue {
  descriptor: CallDescriptor | null;
  setDescriptor: (descriptor: CallDescriptor | null) => void;
}
const CallContext = createContext<CallContextValue | null>(null);
const DESCRIPTOR_KEY = "mv-simulated-call";

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [descriptor, setDescriptorState] = useState<CallDescriptor | null>(() => {
    try {
      const saved = sessionStorage.getItem(DESCRIPTOR_KEY);
      return saved ? (JSON.parse(saved) as CallDescriptor) : null;
    } catch {
      return null;
    }
  });
  const setDescriptor = useCallback((value: CallDescriptor | null) => {
    setDescriptorState(value);
    if (value) sessionStorage.setItem(DESCRIPTOR_KEY, JSON.stringify(value));
    else sessionStorage.removeItem(DESCRIPTOR_KEY);
  }, []);
  const value = useMemo(() => ({ descriptor, setDescriptor }), [descriptor, setDescriptor]);
  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

function useCallContext() {
  const value = useContext(CallContext);
  if (!value) throw new Error("useCallContext must be used inside <CallProvider>");
  return value;
}
function iso() {
  return now().toISOString().slice(0, 19);
}
function ownsCall(c: ConsultationRead, actor: ConsultationCallActor, participantId: string) {
  return actor === "PATIENT"
    ? c.patient_identity_id === participantId
    : c.expert_id === participantId;
}
function event(
  draft: Dataset,
  c: ConsultationRead,
  actor: ConsultationCallActor,
  code: string,
  body: string,
) {
  const id = `msg_call_${c.id}_${c.call_token_version ?? 1}_${code}`;
  if (draft.chatMessages.some((message) => message.id === id)) return;
  draft.chatMessages.push({
    id,
    consultation_id: c.id,
    sender_type: actor,
    type: "SYSTEM",
    body,
    media_url: null,
    sent_at: iso(),
  });
}
function derivePhase(c: ConsultationRead | undefined, actor: ConsultationCallActor) {
  if (!c?.call_state || c.call_state === "NONE") return "idle" as const;
  if (c.call_state === "RINGING")
    return c.call_initiated_by === actor ? ("outgoing" as const) : ("incoming" as const);
  if (c.call_state === "ACTIVE") {
    if (c.call_connection_state === "FAILED") return "failed" as const;
    if (c.call_connection_state === "RECONNECTING" || c.call_connection_state === "WEAK")
      return "reconnecting" as const;
    return "connected" as const;
  }
  return c.call_outcome === "CONNECTION_FAILED" ? ("failed" as const) : ("ended" as const);
}

export function useCallSession(
  consultationId: string,
  otherName: string,
  returnTo: string,
  backTo: string,
  actor: ConsultationCallActor,
  participantId: string,
  enabled = true,
): SimulatedCall {
  const ctx = useCallContext();
  const { data, update, toast } = usePrototype();
  const navigate = useNavigate();
  const [, tick] = useState(0);
  const consultation = data.consultations.find((c) => c.id === consultationId);
  const phase = derivePhase(consultation, actor);
  useEffect(() => {
    if (consultationId && enabled)
      ctx.setDescriptor({ consultationId, otherName, returnTo, actor, participantId });
  }, [consultationId, otherName, returnTo, actor, participantId, enabled, ctx.setDescriptor]);
  useEffect(() => {
    if (phase !== "connected") return;
    const timer = window.setInterval(() => tick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);
  const mutate = useCallback(
    (action: (draft: Dataset, c: ConsultationRead) => void) => {
      if (!enabled) return;
      update((draft) => {
        const c = draft.consultations.find((row) => row.id === consultationId);
        if (c?.status !== "ACTIVE" || !ownsCall(c, actor, participantId)) return;
        action(draft, c);
      });
    },
    [actor, consultationId, enabled, participantId, update],
  );
  const start = useCallback(
    () =>
      mutate((draft, c) => {
        if (c.call_state === "RINGING" || c.call_state === "ACTIVE") {
          toast("A call is already active for this consultation.");
          return;
        }
        const started = now();
        c.call_token_version = (c.call_token_version ?? 0) + 1;
        c.call_state = "RINGING";
        c.call_initiated_by = actor;
        c.call_started_at = iso();
        c.call_answered_at = null;
        c.call_ended_at = null;
        c.call_outcome = null;
        c.call_connection_state = null;
        c.call_token_expires_at = new Date(started.getTime() + 5 * 60_000)
          .toISOString()
          .slice(0, 19);
        c.call_ring_expires_at = new Date(started.getTime() + 45_000).toISOString().slice(0, 19);
        event(
          draft,
          c,
          actor,
          "started",
          `${actor === "PATIENT" ? "Patient" : "Expert"} started a simulated call.`,
        );
      }),
    [actor, mutate, toast],
  );
  const finish = useCallback(
    (outcome: "DECLINED" | "MISSED" | "CANCELLED" | "ENDED" | "CONNECTION_FAILED") =>
      mutate((draft, c) => {
        if (c.call_state === "NONE" || c.call_state === "ENDED") return;
        if (outcome === "DECLINED" && (c.call_state !== "RINGING" || c.call_initiated_by === actor))
          return;
        if (
          outcome === "CANCELLED" &&
          (c.call_state !== "RINGING" || c.call_initiated_by !== actor)
        )
          return;
        c.call_state = "ENDED";
        c.call_ended_at = iso();
        c.call_outcome = outcome;
        if (outcome === "CONNECTION_FAILED") c.call_connection_state = "FAILED";
        const labels = {
          DECLINED: "Call declined.",
          MISSED: "Call was not answered.",
          CANCELLED: "Caller cancelled the call.",
          ENDED: `${actor === "PATIENT" ? "Patient" : "Expert"} ended the call.`,
          CONNECTION_FAILED: "Call ended after the simulated connection could not recover.",
        } as const;
        event(draft, c, actor, outcome.toLowerCase(), labels[outcome]);
      }),
    [actor, mutate],
  );
  useEffect(() => {
    if (
      (phase === "incoming" || phase === "outgoing") &&
      consultation?.call_ring_expires_at &&
      consultation.call_ring_expires_at <= iso()
    ) {
      finish("MISSED");
    }
  }, [consultation?.call_ring_expires_at, finish, phase]);
  const accept = useCallback(
    () =>
      mutate((draft, c) => {
        if (c.call_state !== "RINGING" || c.call_initiated_by === actor) return;
        if (!c.call_token_expires_at || c.call_token_expires_at <= iso()) {
          c.call_state = "ENDED";
          c.call_outcome = "CONNECTION_FAILED";
          c.call_connection_state = "FAILED";
          c.call_ended_at = iso();
          event(
            draft,
            c,
            actor,
            "stale",
            "The simulated call link expired before it was answered.",
          );
          return;
        }
        const microphoneKey =
          actor === "PATIENT" ? "patient_microphone_permission" : "expert_microphone_permission";
        if (c[microphoneKey] === "DENIED") {
          toast("Microphone access is required to answer. Check permission and try again.");
          return;
        }
        c[microphoneKey] = "GRANTED";
        const cameraKey =
          actor === "PATIENT" ? "patient_camera_permission" : "expert_camera_permission";
        if (c[cameraKey] === "PROMPT" || !c[cameraKey]) c[cameraKey] = "GRANTED";
        c.call_state = "ACTIVE";
        c.call_answered_at = iso();
        c.call_connection_state = "GOOD";
        event(
          draft,
          c,
          actor,
          "answered",
          `${actor === "PATIENT" ? "Patient" : "Expert"} answered the simulated call.`,
        );
      }),
    [actor, mutate, toast],
  );
  const actorField = <T extends string>(patient: T, expert: T) =>
    actor === "PATIENT" ? patient : expert;
  const muted = Boolean(consultation?.[actorField("patient_call_muted", "expert_call_muted")]);
  const cameraOn =
    consultation?.[actorField("patient_call_camera_on", "expert_call_camera_on")] !== false;
  const device =
    consultation?.[actorField("patient_call_device", "expert_call_device")] ?? "Default device";
  const toggleMuted = () =>
    mutate((_draft, c) => {
      const key = actorField("patient_call_muted", "expert_call_muted");
      c[key] = !muted;
    });
  const toggleCamera = () =>
    mutate((_draft, c) => {
      const key = actorField("patient_call_camera_on", "expert_call_camera_on");
      const permission = actorField("patient_camera_permission", "expert_camera_permission");
      c[key] = c[permission] === "DENIED" ? false : !cameraOn;
    });
  const denyCamera = () =>
    mutate((_draft, c) => {
      c[actorField("patient_camera_permission", "expert_camera_permission")] = "DENIED";
      c[actorField("patient_call_camera_on", "expert_call_camera_on")] = false;
    });
  const denyMicrophone = () =>
    mutate((_draft, c) => {
      c[actorField("patient_microphone_permission", "expert_microphone_permission")] = "DENIED";
    });
  const changeDevice = () =>
    mutate((_draft, c) => {
      const key = actorField("patient_call_device", "expert_call_device");
      c[key] = device === "Phone speaker" ? "Default device" : "Phone speaker";
    });
  const setConnection = (state: "GOOD" | "WEAK" | "FAILED") =>
    mutate((draft, c) => {
      if (c.call_state !== "ACTIVE") return;
      c.call_connection_state = state;
      if (state === "WEAK")
        event(draft, c, actor, "weak", "Weak simulated connection detected. Reconnecting…");
      if (state === "GOOD")
        event(draft, c, actor, "restored", "Simulated call connection restored.");
      if (state === "FAILED") {
        c.call_state = "ENDED";
        c.call_outcome = "CONNECTION_FAILED";
        c.call_ended_at = iso();
        event(
          draft,
          c,
          actor,
          "connection_failed",
          "Simulated call connection could not be restored.",
        );
      }
    });
  const duration = consultation?.call_answered_at
    ? Math.max(
        0,
        Math.floor((now().getTime() - Date.parse(`${consultation.call_answered_at}Z`)) / 1000),
      )
    : 0;
  return {
    phase,
    setPhase: (next) => {
      if (next === "outgoing") start();
      else if (next === "connected") accept();
      else if (next === "reconnecting") setConnection("WEAK");
      else if (next === "failed") setConnection("FAILED");
    },
    muted,
    toggleMuted,
    cameraOn,
    toggleCamera,
    duration,
    device,
    start,
    accept,
    decline: () => finish("DECLINED"),
    cancel: () => finish("CANCELLED"),
    miss: () => finish("MISSED"),
    expireToken: () =>
      mutate((_draft, c) => {
        c.call_token_expires_at = "2020-01-01T00:00:00";
      }),
    denyCamera,
    denyMicrophone,
    changeDevice,
    weak: () => setConnection("WEAK"),
    reconnect: () => setConnection("GOOD"),
    failReconnect: () => setConnection("FAILED"),
    end: () => finish("ENDED"),
    leave: () => navigate(backTo),
  };
}

export function FloatingCall() {
  const { descriptor, setDescriptor } = useCallContext();
  const { pathname } = useLocation();
  const { data, update } = usePrototype();
  if (!descriptor || pathname === descriptor.returnTo) return null;
  const c = data.consultations.find((row) => row.id === descriptor.consultationId);
  if (!c || !ownsCall(c, descriptor.actor, descriptor.participantId)) return null;
  const phase = derivePhase(c, descriptor.actor);
  if (!["outgoing", "incoming", "connected", "reconnecting"].includes(phase)) return null;
  const mutedKey = descriptor.actor === "PATIENT" ? "patient_call_muted" : "expert_call_muted";
  const cameraKey =
    descriptor.actor === "PATIENT" ? "patient_call_camera_on" : "expert_call_camera_on";
  const muted = Boolean(c[mutedKey]);
  const cameraOn = c[cameraKey] !== false;
  const duration = c.call_answered_at
    ? Math.max(0, Math.floor((now().getTime() - Date.parse(`${c.call_answered_at}Z`)) / 1000))
    : 0;
  const toggleMuted = () =>
    update((draft) => {
      const row = draft.consultations.find((item) => item.id === c.id);
      if (row && ownsCall(row, descriptor.actor, descriptor.participantId)) row[mutedKey] = !muted;
    });
  const end = () =>
    update((draft) => {
      const row = draft.consultations.find((item) => item.id === c.id);
      if (row?.status !== "ACTIVE" || !ownsCall(row, descriptor.actor, descriptor.participantId))
        return;
      row.call_state = "ENDED";
      row.call_outcome = "ENDED";
      row.call_ended_at = iso();
      event(
        draft,
        row,
        descriptor.actor,
        "ended",
        `${descriptor.actor === "PATIENT" ? "Patient" : "Expert"} ended the call.`,
      );
      setDescriptor(null);
    });
  const status =
    phase === "connected"
      ? formatDuration(duration)
      : phase === "reconnecting"
        ? "Reconnecting…"
        : phase === "incoming"
          ? "Incoming…"
          : "Calling…";
  if (cameraOn)
    return (
      <div className="dark absolute bottom-24 right-3 z-40 w-36 overflow-hidden rounded-brand-lg border border-base-300 bg-base-100 text-base-content shadow-brand">
        <Link
          to={descriptor.returnTo}
          aria-label={`Return to the call with ${descriptor.otherName}`}
          className="flex h-24 items-center justify-center bg-base-200"
        >
          <CallAvatar name={descriptor.otherName} size="sm" />
        </Link>
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm">{descriptor.otherName}</p>
            <p className="font-mono text-[0.7rem] text-base-content/60">{status}</p>
          </div>
          <button
            type="button"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={toggleMuted}
            className={cn(
              "flex size-8 items-center justify-center rounded-full",
              muted ? "bg-base-content text-base-100" : "border border-base-300",
            )}
          >
            {muted ? <MicOff className="size-3.5" /> : <Mic className="size-3.5" />}
          </button>
          <button
            type="button"
            aria-label="End call"
            onClick={end}
            className="flex size-8 items-center justify-center rounded-full bg-error text-error-content"
          >
            <PhoneOff className="size-3.5" />
          </button>
        </div>
      </div>
    );
  return (
    <div className="relative z-40 flex shrink-0 items-center gap-2 bg-success px-3 py-1.5 text-success-content">
      <Link
        to={descriptor.returnTo}
        className="min-w-0 flex-1 truncate"
        aria-label={`Return to the call with ${descriptor.otherName}`}
      >
        On a simulated call with {descriptor.otherName} · {status}
      </Link>
      <button type="button" aria-label={muted ? "Unmute" : "Mute"} onClick={toggleMuted}>
        {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
      </button>
      <button type="button" aria-label="End call" onClick={end}>
        <PhoneOff className="size-4" />
      </button>
    </div>
  );
}
