import {
  Mic,
  MicOff,
  Minimize2,
  Phone,
  PhoneOff,
  Settings,
  Video,
  VideoOff,
  Wifi,
} from "lucide-react";
import { ScreenStates } from "~/components/shell/state-switcher";
import { consultationById } from "~/data/selectors";
import { cn } from "~/lib/cn";
import { initials } from "~/lib/format";
import { usePrototype } from "~/store/prototype";

export type CallPhase =
  | "idle"
  | "outgoing"
  | "incoming"
  | "connected"
  | "reconnecting"
  | "failed"
  | "ended";

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export interface SimulatedCall {
  phase: CallPhase;
  setPhase: (phase: CallPhase) => void;
  muted: boolean;
  toggleMuted: () => void;
  cameraOn: boolean;
  toggleCamera: () => void;
  duration: number;
  device: string;
  start: () => void;
  accept: () => void;
  decline: () => void;
  cancel: () => void;
  miss: () => void;
  expireToken: () => void;
  denyCamera: () => void;
  denyMicrophone: () => void;
  changeDevice: () => void;
  weak: () => void;
  reconnect: () => void;
  failReconnect: () => void;
  end: () => void;
  leave: () => void;
}

/**
 * A minimise affordance shared by the video and voice views. Minimising is
 * `call.leave` — the route changes, the call itself keeps running in
 * `CallProvider` and follows the user as a strip or PiP tile (`FloatingCall`).
 */
function MinimizeButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-brand bg-base-100/90 px-3 py-2 text-label text-base-content shadow-brand backdrop-blur hover:bg-base-100"
    >
      <Minimize2 aria-hidden className="size-4" strokeWidth={1.5} />
      Minimize
    </button>
  );
}

/** The initials disc every non-video presentation of a person uses here. */
export function CallAvatar({ name, size = "lg" }: { name: string; size?: "lg" | "sm" }) {
  const [first, ...rest] = name
    .replace(/^Dr\.\s*/, "")
    .trim()
    .split(/\s+/);
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-secondary/20 font-heading text-secondary",
        size === "lg" ? "size-24 text-h1" : "size-9 text-label",
      )}
    >
      {initials(first, rest.at(-1))}
    </span>
  );
}

/**
 * The stand-in for a live camera feed. A real build renders the LiveKit/SDK
 * video track here; the prototype renders a soft dark scene with the
 * participant's initials, so the layout, chips and controls are all real.
 */
function SimulatedFeed({
  name,
  dimmed,
  className,
  children,
}: {
  name: string;
  dimmed?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_30%_20%,rgb(79_67_58/0.55),transparent_60%),radial-gradient(ellipse_at_75%_80%,rgb(43_38_33/0.9),transparent_65%)] bg-base-200",
        dimmed && "opacity-60",
        className,
      )}
    >
      <CallAvatar name={name} />
      {children}
    </div>
  );
}

/** A call chip. Media is deliberately labelled as simulated. */
function CallMeta({
  name,
  duration,
  voiceOnly,
}: {
  name: string;
  duration: number;
  voiceOnly?: boolean;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <span className="flex items-center gap-2 rounded-full bg-base-100/85 px-3 py-1.5 backdrop-blur">
        <span aria-hidden className="size-2 animate-pulse rounded-full bg-success" />
        <span className="text-label">{name}</span>
        <span className="font-mono text-body-sm tabular text-base-content/65">
          {formatDuration(duration)}
        </span>
      </span>
      <span className="flex items-center gap-1.5 rounded-full bg-base-100/70 px-3 py-1 text-body-sm text-base-content/65 backdrop-blur">
        {voiceOnly ? "Voice-only media simulation" : "Video media simulation"}
      </span>
    </div>
  );
}

/** One round call control with its label underneath — legible one-handed. */
function CallControl({
  label,
  active,
  danger,
  onClick,
  children,
}: {
  label: string;
  /** Highlighted (filled) state — a toggle that's currently on. */
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-16 flex-col items-center gap-1.5">
      <button
        type="button"
        aria-label={label}
        aria-pressed={danger ? undefined : active}
        onClick={onClick}
        className={cn(
          "flex items-center justify-center rounded-full transition-colors",
          danger
            ? "size-16 bg-error text-error-content hover:opacity-90"
            : active
              ? "size-14 bg-base-content text-base-100"
              : "size-14 border border-base-300 bg-base-100/60 text-base-content hover:bg-base-200",
        )}
      >
        {children}
      </button>
      <span className="text-body-sm text-base-content/65">{label}</span>
    </div>
  );
}

/**
 * P44a / X13a — the product's one always-dark, edge-to-edge full-screen
 * surface, wrapped in `dark` (Tailwind v4's dark variant scope, not the
 * document's own theme) so it stays dark regardless of the viewer's light
 * or dark setting elsewhere in the app, matching how a call screen reads
 * everywhere else.
 *
 * Video and voice-only are the same call: turning the camera off *is* the
 * switch to voice (`PRODUCT_SCREEN_V0.md` P44a's "switch to voice-only"),
 * and the presentation follows the camera, not a separate mode.
 */
export function CallScreen({
  call,
  consultationId,
  otherName,
  extra,
}: {
  call: SimulatedCall;
  consultationId: string;
  otherName: string;
  /** An extra in-call action (the expert's Case note button). */
  extra?: React.ReactNode;
}) {
  const { data } = usePrototype();
  const consultation = consultationById(data, consultationId);
  const { phase, muted, cameraOn, duration } = call;

  // The state switcher exposes voice-only as its own entry, since it is a
  // documented presentation of the connected call, not a separate phase.
  const stateValue = phase === "connected" ? (cameraOn ? "connected" : "voice") : phase;
  const selectState = (v: string) => {
    if (v === "voice") {
      call.setPhase("connected");
      if (cameraOn) call.toggleCamera();
      return;
    }
    if (v === "connected" && !cameraOn) call.toggleCamera();
    call.setPhase(v as CallPhase);
  };

  if (!consultation) return null;

  const voiceOnly = !cameraOn;

  return (
    <div className="dark flex h-full min-h-0 flex-1 flex-col bg-base-100 text-base-content">
      <ScreenStates
        states={[
          { value: "idle", label: "Ready" },
          { value: "outgoing", label: "Outgoing" },
          { value: "incoming", label: "Incoming" },
          { value: "connected", label: "Connected — video" },
          { value: "voice", label: "Connected — voice only" },
          { value: "reconnecting", label: "Reconnecting" },
          { value: "failed", label: "Failed" },
          { value: "ended", label: "Ended" },
        ]}
        value={stateValue}
        onChange={selectState}
      />

      {phase === "idle" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
          <CallAvatar name={otherName} />
          <div>
            <p className="font-heading text-h2">Ready to call {otherName}</p>
            <p className="measure mt-1 text-body-sm text-base-content/65">
              This is a prototype media simulation. No audio or video is transmitted.
            </p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-2">
            <button
              type="button"
              onClick={call.start}
              className="min-h-11 rounded-brand bg-success px-4 text-label text-success-content"
            >
              Start simulated call
            </button>
            <button
              type="button"
              onClick={call.denyCamera}
              className="min-h-11 rounded-brand border border-base-300 px-4 text-label"
            >
              Continue voice-only (camera denied)
            </button>
            <button
              type="button"
              onClick={call.denyMicrophone}
              className="min-h-11 rounded-brand border border-base-300 px-4 text-label"
            >
              Simulate microphone denied
            </button>
          </div>
        </div>
      ) : phase === "failed" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex size-20 items-center justify-center rounded-full bg-error-tint text-error">
            <PhoneOff aria-hidden className="size-8" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-heading text-h2">Couldn't connect</p>
            <p className="measure mt-1 text-body-sm text-base-content/65">
              We couldn't reach {otherName} — they may be offline or on a weak connection.
            </p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-2">
            <button
              type="button"
              onClick={call.start}
              className="min-h-11 rounded-brand bg-primary px-4 text-label text-primary-content"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={call.leave}
              className="min-h-11 rounded-brand border border-base-300 px-4 text-label"
            >
              Send a message instead
            </button>
          </div>
        </div>
      ) : phase === "incoming" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
          <div className="relative flex items-center justify-center">
            <span
              aria-hidden
              className="absolute size-36 animate-ping rounded-full bg-secondary/10 [animation-duration:2s]"
            />
            <CallAvatar name={otherName} />
          </div>
          <div>
            <p className="font-heading text-h1">{otherName}</p>
            <p className="mt-1 text-body-sm text-base-content/65">Incoming video call…</p>
          </div>
          <div className="flex gap-12">
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                aria-label="Decline"
                onClick={call.decline}
                className="flex size-16 items-center justify-center rounded-full bg-error text-error-content"
              >
                <PhoneOff aria-hidden className="size-6" strokeWidth={1.5} />
              </button>
              <span className="text-body-sm text-base-content/65">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <button
                type="button"
                aria-label="Accept"
                onClick={call.accept}
                className="flex size-16 items-center justify-center rounded-full bg-success text-success-content"
              >
                <Phone aria-hidden className="size-6" strokeWidth={1.5} />
              </button>
              <span className="text-body-sm text-base-content/65">Accept</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={call.denyCamera}
              className="rounded-brand border border-base-300 px-3 py-2 text-label"
            >
              Camera unavailable, answer voice-only
            </button>
            <button
              type="button"
              onClick={call.denyMicrophone}
              className="rounded-brand border border-base-300 px-3 py-2 text-label"
            >
              Simulate microphone denied
            </button>
          </div>
        </div>
      ) : phase === "ended" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-base-200 text-base-content/50">
            <PhoneOff aria-hidden className="size-6" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-heading text-h2">Call ended</p>
            {duration > 0 ? (
              <p className="mt-1 font-mono text-body-sm tabular text-base-content/60">
                {formatDuration(duration)}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={call.leave}
            className="min-h-11 rounded-brand border border-base-300 px-4 text-label"
          >
            Back to chat
          </button>
        </div>
      ) : voiceOnly && phase === "connected" ? (
        /* Voice-only: the camera is off on both sides, so the person — not a
           dark feed — is the screen. */
        <div className="relative flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
            <div className="flex flex-col items-start gap-2">{extra}</div>
            <MinimizeButton onClick={call.leave} />
          </div>
          <div className="relative flex items-center justify-center">
            <span
              aria-hidden
              className="absolute size-36 animate-ping rounded-full bg-secondary/10 [animation-duration:2.6s]"
            />
            <CallAvatar name={otherName} />
          </div>
          <div>
            <p className="font-heading text-h1">{otherName}</p>
            <p className="mt-1 font-mono text-body-sm tabular text-base-content/60">
              {formatDuration(duration)}
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-base-200 px-3 py-1 text-body-sm text-base-content/65">
              Voice-only media simulation
            </p>
          </div>
        </div>
      ) : (
        /* Outgoing, connected video, reconnecting: the remote feed fills the
           screen the way every call product reads. */
        <div className="relative flex flex-1 flex-col">
          <SimulatedFeed name={otherName} dimmed={phase === "reconnecting"} className="flex-1">
            {phase === "outgoing" ? (
              <div className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-1">
                <p className="font-heading text-h2">{otherName}</p>
                <p className="font-mono text-body-sm tabular text-base-content/60">Calling…</p>
                <p className="mt-1 text-body-sm text-base-content/55">Prototype media simulation</p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={call.cancel}
                    className="rounded-brand border border-base-300 bg-base-100/85 px-3 py-2 text-label"
                  >
                    Cancel call
                  </button>
                  <button
                    type="button"
                    onClick={call.miss}
                    className="rounded-brand border border-base-300 bg-base-100/85 px-3 py-2 text-label"
                  >
                    Simulate missed
                  </button>
                  <button
                    type="button"
                    onClick={call.expireToken}
                    className="rounded-brand border border-base-300 bg-base-100/85 px-3 py-2 text-label"
                  >
                    Expire call link
                  </button>
                </div>
              </div>
            ) : null}
          </SimulatedFeed>

          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-col items-start gap-2">
              {phase !== "outgoing" ? <CallMeta name={otherName} duration={duration} /> : null}
              {extra}
            </div>
            <MinimizeButton onClick={call.leave} />
          </div>
          {phase === "reconnecting" ? (
            <div className="absolute inset-x-4 top-32 flex items-center justify-center gap-2 rounded-brand bg-base-100/90 px-4 py-2 text-body-sm backdrop-blur">
              <Wifi aria-hidden className="size-4 text-warning" strokeWidth={1.5} />
              Reconnecting simulated media…
              <button
                type="button"
                onClick={call.reconnect}
                className="rounded-brand bg-success px-2 py-1 text-label text-success-content"
              >
                Restored
              </button>
              <button
                type="button"
                onClick={call.failReconnect}
                className="rounded-brand bg-error px-2 py-1 text-label text-error-content"
              >
                Failed
              </button>
            </div>
          ) : null}

          {/* Self-view begins after answer, leaving ringing actions unobstructed. */}
          {phase !== "outgoing" ? (
            <div className="absolute bottom-4 right-4 flex h-28 w-20 flex-col items-center justify-center gap-1 overflow-hidden rounded-brand-lg border border-base-300 bg-[radial-gradient(ellipse_at_50%_30%,rgb(79_67_58/0.5),transparent_70%)] bg-base-200 shadow-brand">
              {cameraOn ? (
                <CallAvatar name="You" size="sm" />
              ) : (
                <VideoOff aria-hidden className="size-5 text-base-content/40" strokeWidth={1.5} />
              )}
              <span className="text-body-sm text-base-content/55">You</span>
              {muted ? (
                <span
                  aria-hidden
                  className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-base-100/85"
                >
                  <MicOff className="size-3 text-error" strokeWidth={1.75} />
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {phase === "outgoing" || phase === "connected" || phase === "reconnecting" ? (
        <div className="flex shrink-0 flex-wrap items-start justify-center gap-3 border-t border-base-300 bg-base-100 px-4 pb-4 pt-4">
          <CallControl label={muted ? "Unmute" : "Mute"} active={muted} onClick={call.toggleMuted}>
            {muted ? (
              <MicOff aria-hidden className="size-5" strokeWidth={1.5} />
            ) : (
              <Mic aria-hidden className="size-5" strokeWidth={1.5} />
            )}
          </CallControl>
          <CallControl
            label="End"
            danger
            onClick={() => {
              call.end();
            }}
          >
            <PhoneOff aria-hidden className="size-6" strokeWidth={1.5} />
          </CallControl>
          {phase === "connected" ? (
            <>
              <CallControl label="Weak signal" onClick={call.weak}>
                <Wifi aria-hidden className="size-5" strokeWidth={1.5} />
              </CallControl>
              <CallControl label={call.device} onClick={call.changeDevice}>
                <Settings aria-hidden className="size-5" strokeWidth={1.5} />
              </CallControl>
            </>
          ) : null}
          <CallControl
            label={cameraOn ? "Video off" : "Video on"}
            active={!cameraOn}
            onClick={call.toggleCamera}
          >
            {cameraOn ? (
              <Video aria-hidden className="size-5" strokeWidth={1.5} />
            ) : (
              <VideoOff aria-hidden className="size-5" strokeWidth={1.5} />
            )}
          </CallControl>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The call, folded into a strip — pinned above the Case note editor so
 * writing up the visit never means losing the call: the patient stays
 * visible, the clock keeps running, and mute/end stay one tap away.
 */
export function InCallStrip({ call, name }: { call: SimulatedCall; name: string }) {
  const { phase, muted, duration } = call;
  if (phase === "ended" || phase === "failed") {
    return (
      <div className="dark -mx-4 -mt-4 mb-4 flex items-center gap-3 border-b border-base-300 bg-base-100 px-4 py-2.5 text-base-content">
        <PhoneOff aria-hidden className="size-4 text-base-content/50" strokeWidth={1.5} />
        <p className="text-body-sm text-base-content/70">
          Call ended{duration > 0 ? ` · ${formatDuration(duration)}` : ""}. The note stays open.
        </p>
      </div>
    );
  }
  return (
    <div className="dark sticky -top-4 z-10 -mx-4 -mt-4 mb-4 flex items-center gap-3 border-b border-base-300 bg-base-100 px-4 py-2.5 text-base-content">
      <CallAvatar name={name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-label">{name}</p>
        <p className="flex items-center gap-1.5 font-mono text-body-sm tabular text-base-content/60">
          <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-success" />
          {phase === "reconnecting" ? "Reconnecting…" : `On call · ${formatDuration(duration)}`}
        </p>
      </div>
      <button
        type="button"
        aria-label={muted ? "Unmute" : "Mute"}
        aria-pressed={muted}
        onClick={call.toggleMuted}
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full transition-colors",
          muted
            ? "bg-base-content text-base-100"
            : "border border-base-300 text-base-content hover:bg-base-200",
        )}
      >
        {muted ? (
          <MicOff aria-hidden className="size-4" strokeWidth={1.5} />
        ) : (
          <Mic aria-hidden className="size-4" strokeWidth={1.5} />
        )}
      </button>
      <button
        type="button"
        aria-label="End call"
        onClick={call.end}
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-error text-error-content hover:opacity-90"
      >
        <PhoneOff aria-hidden className="size-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
