import {
  Check,
  Clock,
  Image as ImageIcon,
  Mic,
  Paperclip,
  Pause,
  Play,
  RotateCcw,
  Send,
  Square,
  Trash2,
  Video,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatMessageType } from "~/data/types";
import { cn } from "~/lib/cn";
import { formatTime } from "~/lib/format";
import { uploadPolicy, uploadProblem } from "~/lib/uploads";

const LONG_MESSAGE_LENGTH = 320;
const COLLAPSED_MESSAGE_LENGTH = 260;
const WAVE_HEIGHTS = [6, 12, 18, 10, 22, 14, 8, 16, 20, 9, 13, 7];

export type ChatComposerMessage = {
  type: "TEXT" | "VOICE";
  body: string | null;
  durationSeconds?: number;
  mediaUrl: string | null;
};

/**
 * PRODUCT_BRAND.md §8: message text is `--text-body` (EB Garamond). One party's
 * messages sit in a base-200 fill, the other's outlined — distinguished by
 * fill-vs-outline, never by colour-coding one party a friendlier hue.
 */
export function ChatBubble({
  own,
  body,
  sentAt,
  type = "TEXT",
  durationSeconds,
  pending,
  authorLabel,
  collapsible = false,
}: {
  own: boolean;
  body: string | null;
  sentAt: string;
  type?: ChatMessageType;
  durationSeconds?: number;
  pending?: boolean;
  authorLabel?: string;
  /** Older long messages can collapse, but the most recent message stays whole. */
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = type === "TEXT" && collapsible && (body?.length ?? 0) > LONG_MESSAGE_LENGTH;
  const text =
    canCollapse && !expanded ? `${body?.slice(0, COLLAPSED_MESSAGE_LENGTH).trimEnd()}…` : body;

  if (type === "SYSTEM") {
    return (
      <div className="flex justify-center py-1">
        <p className="max-w-[90%] rounded-full bg-base-200 px-3 py-1.5 text-center text-body-sm text-base-content/60">
          {body} · <span className="font-mono tabular">{formatTime(sentAt)}</span>
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex", own ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-brand-lg px-3.5 py-2.5 sm:max-w-[75%]",
          own ? "border border-base-300 bg-transparent" : "bg-base-200",
        )}
      >
        {authorLabel ? (
          <p className="mb-1 text-body-sm font-medium text-base-content/60">{authorLabel}</p>
        ) : null}
        {type === "TEXT" ? (
          <p className="min-w-0 whitespace-pre-wrap text-body wrap-anywhere">{text}</p>
        ) : (
          <MediaBubble type={type} durationSeconds={durationSeconds} label={body} />
        )}
        {canCollapse ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            className="mt-1 text-label text-primary underline-offset-2 hover:underline"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : null}
        <p className="mt-1 flex items-center justify-end gap-1 font-mono text-body-sm tabular text-base-content/50">
          {formatTime(sentAt)}
          {pending ? (
            <Clock aria-label="Sending" className="size-3" strokeWidth={1.5} />
          ) : own ? (
            <Check aria-label="Sent" className="size-3" strokeWidth={1.5} />
          ) : null}
        </p>
      </div>
    </div>
  );
}

function MediaBubble({
  type,
  durationSeconds,
  label,
}: {
  type: ChatMessageType;
  durationSeconds?: number;
  label?: string | null;
}) {
  if (type === "VOICE") {
    return (
      <div className="flex min-w-[11rem] items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-content">
          <Play aria-hidden className="ml-0.5 size-4" strokeWidth={2} />
        </span>
        <span aria-hidden className="flex h-6 flex-1 items-end gap-[3px]">
          {WAVE_HEIGHTS.map((h, i) => (
            <span
              key={i}
              className="w-[3px] rounded-full bg-base-content/25"
              style={{ height: h }}
            />
          ))}
        </span>
        <span className="font-mono text-body-sm tabular text-base-content/60">
          <Mic aria-hidden className="mr-1 inline size-3" strokeWidth={1.5} />
          {durationSeconds ? `0:${String(durationSeconds).padStart(2, "0")}` : "0:00"}
        </span>
      </div>
    );
  }
  const Icon = type === "VIDEO" ? Video : ImageIcon;
  return (
    <div className="flex h-32 w-48 flex-col items-center justify-center gap-2 rounded-brand bg-base-300 px-3">
      <Icon
        aria-label={type === "VIDEO" ? "Video attachment" : "Image attachment"}
        className="size-7 text-base-content/40"
        strokeWidth={1.5}
      />
      {label ? (
        <span className="w-full truncate text-center text-body-sm text-base-content/60">
          {label}
        </span>
      ) : null}
    </div>
  );
}

/**
 * The same composer appears in P44 and the expert's X13 workspace. It keeps
 * text and voice modes mutually clear: a person never has to guess whether a
 * tap will send text, begin recording, or discard an unfinished voice note.
 */
export function ChatComposer({
  onSend,
  onAttachment,
  messageLabel,
  className,
  placeholder = "Message",
  /** Teni has no attachment or voice surface, so both controls are optional. */
  attachments = true,
  voice = true,
  disabled = false,
  disabledReason,
  /**
   * Lets a screen refuse a specific draft while keeping the composer usable, so a
   * rate limit that still allows emergency words shows a disabled send button
   * rather than silently dropping what the person typed.
   */
  canSend,
}: {
  onSend: (message: ChatComposerMessage) => void;
  onAttachment?: (file: File) => void;
  messageLabel: string;
  className?: string;
  placeholder?: string;
  attachments?: boolean;
  voice?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  canSend?: (draft: string) => boolean;
}) {
  const [draft, setDraft] = useState("");
  const [voiceMode, setVoiceMode] = useState<"text" | "recording" | "preview">("text");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);

  const resizeTextarea = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, 44), 160)}px`;
  };

  useEffect(() => {
    if (voiceMode !== "recording") return;
    const interval = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [voiceMode]);

  const blocked = !!draft.trim() && !!canSend && !canSend(draft);

  const sendText = () => {
    const body = draft.trim();
    if (!body || blocked) return;
    onSend({ type: "TEXT", body, mediaUrl: null });
    setDraft("");
    window.requestAnimationFrame(resizeTextarea);
  };

  const sendVoice = () => {
    onSend({
      type: "VOICE",
      body: null,
      durationSeconds: Math.max(recordingSeconds, 1),
      mediaUrl: "/media/voice-note.m4a",
    });
    setVoiceMode("text");
    setRecordingSeconds(0);
    setPlaying(false);
  };

  const send = () => {
    if (draft.trim()) {
      sendText();
      return;
    }
    if (voiceMode === "preview") sendVoice();
  };

  const startRecording = () => {
    setDraft("");
    setRecordingSeconds(0);
    setPlaying(false);
    setVoiceMode("recording");
  };

  const stopRecording = () => {
    setVoiceMode("preview");
    setPlaying(false);
  };

  const discardVoice = () => {
    setVoiceMode("text");
    setRecordingSeconds(0);
    setPlaying(false);
  };

  return (
    <div className={cn("border-t border-base-300 bg-base-100", className)}>
      {attachmentError ? (
        <p
          role="alert"
          className="border-b border-base-300 bg-warning/10 px-3 py-2 text-body-sm text-base-content @lg:px-4"
        >
          {attachmentError}{" "}
          <button
            type="button"
            onClick={() => setAttachmentError(null)}
            className="underline underline-offset-2"
          >
            Dismiss
          </button>
        </p>
      ) : null}
      {disabled && disabledReason ? (
        <p className="px-3 py-2 text-body-sm text-base-content/60 @lg:px-4">{disabledReason}</p>
      ) : null}
      <form
        className="flex items-end gap-1.5 px-3 py-2 @lg:px-4"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        {attachments ? (
          <>
            <input
              ref={attachmentRef}
              type="file"
              accept={uploadPolicy("MEDIA").accept}
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                // The typed draft is never discarded by a rejected file.
                const problem = uploadProblem(file, "MEDIA");
                setAttachmentError(problem);
                if (!problem) onAttachment?.(file);
              }}
            />
            <button
              type="button"
              aria-label="Attach a photo, video or PDF"
              disabled={disabled}
              onClick={() => attachmentRef.current?.click()}
              className="flex size-11 shrink-0 items-center justify-center rounded-brand text-base-content/60 hover:bg-base-200 disabled:opacity-40"
            >
              <Paperclip aria-hidden className="size-5" strokeWidth={1.5} />
            </button>
          </>
        ) : null}

        <div className="min-w-0 flex-1 rounded-brand border border-base-300 bg-base-200 focus-within:border-primary focus-within:bg-base-100">
          {voiceMode === "text" ? (
            <textarea
              ref={textareaRef}
              rows={1}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                window.requestAnimationFrame(resizeTextarea);
              }}
              onKeyDown={(event) => {
                // Shift+Enter is the newline, matching the chat apps people
                // already use. Enter alone sends, and so does Cmd/Ctrl+Enter.
                if (event.key !== "Enter") return;
                if (event.shiftKey) return;
                event.preventDefault();
                sendText();
              }}
              aria-label={messageLabel}
              disabled={disabled}
              placeholder={placeholder}
              className="block min-h-11 w-full resize-none bg-transparent px-3 py-2.5 text-body leading-5 outline-none placeholder:text-base-content/40"
            />
          ) : voiceMode === "recording" ? (
            <div className="flex min-h-11 items-center gap-2 px-3 text-body-sm" aria-live="polite">
              <span aria-hidden className="size-2 shrink-0 animate-pulse rounded-full bg-error" />
              <span className="shrink-0 text-error">Recording</span>
              <VoiceWave active />
              <span className="shrink-0 font-mono text-data tabular text-base-content/60">
                {formatVoiceDuration(recordingSeconds)}
              </span>
            </div>
          ) : (
            <div className="flex min-h-11 items-center gap-1 px-1.5">
              <button
                type="button"
                aria-label={playing ? "Pause voice note" : "Play voice note"}
                onClick={() => setPlaying((value) => !value)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-content"
              >
                {playing ? (
                  <Pause aria-hidden className="size-4" strokeWidth={2} />
                ) : (
                  <Play aria-hidden className="ml-0.5 size-4" strokeWidth={2} />
                )}
              </button>
              <VoiceWave active={playing} />
              <span className="shrink-0 font-mono text-data tabular text-base-content/60">
                {formatVoiceDuration(Math.max(recordingSeconds, 1))}
              </span>
              <button
                type="button"
                aria-label="Delete voice note"
                onClick={discardVoice}
                className="flex size-9 shrink-0 items-center justify-center rounded-brand text-base-content/60 hover:bg-base-300"
              >
                <Trash2 aria-hidden className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>

        {draft.trim() || voiceMode === "preview" ? (
          <button
            type="submit"
            disabled={disabled || blocked}
            aria-label={voiceMode === "preview" ? "Send voice note" : "Send message"}
            className="flex size-11 shrink-0 items-center justify-center rounded-brand bg-primary text-primary-content transition-colors hover:bg-primary/90 disabled:opacity-40"
          >
            <Send aria-hidden className="size-4" strokeWidth={1.5} />
          </button>
        ) : voiceMode === "recording" ? (
          <button
            type="button"
            aria-label="Stop recording"
            onClick={(event) => {
              // This control becomes the submit button after its state update.
              // Prevent the click's native form action from sending the note
              // before the person has reviewed or discarded it.
              event.preventDefault();
              stopRecording();
            }}
            className="flex size-11 shrink-0 items-center justify-center rounded-brand bg-error text-error-content transition-colors hover:bg-error/90"
          >
            <Square aria-hidden className="size-4 fill-current" strokeWidth={1.5} />
          </button>
        ) : voice ? (
          <button
            type="button"
            aria-label="Record a voice note"
            disabled={disabled}
            onClick={startRecording}
            className="flex size-11 shrink-0 items-center justify-center rounded-brand text-base-content/60 hover:bg-base-200 disabled:opacity-40"
          >
            <Mic aria-hidden className="size-5" strokeWidth={1.5} />
          </button>
        ) : (
          // Without a voice control the send button must not disappear when the
          // draft is empty: it stays put and disabled, so the layout never shifts.
          <button
            type="submit"
            disabled
            aria-label="Send message"
            className="flex size-11 shrink-0 items-center justify-center rounded-brand bg-primary text-primary-content opacity-40"
          >
            <Send aria-hidden className="size-4" strokeWidth={1.5} />
          </button>
        )}
      </form>
    </div>
  );
}

function VoiceWave({ active = false }: { active?: boolean }) {
  return (
    <span aria-hidden className="flex min-w-0 flex-1 items-center gap-[3px] overflow-hidden">
      {WAVE_HEIGHTS.map((height, index) => (
        <span
          key={index}
          className={cn(
            "w-[3px] shrink-0 rounded-full bg-base-content/30",
            active && "animate-pulse bg-primary/60",
          )}
          style={{ height }}
        />
      ))}
    </span>
  );
}

function formatVoiceDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Teni's pending-confirmation item: a bordered card inside the thread. */
export function ConfirmCard({
  title,
  fields,
  onConfirm,
  onDismiss,
  settled,
}: {
  title: string;
  fields: Record<string, string>;
  onConfirm?: () => void;
  onDismiss?: () => void;
  settled?: boolean;
}) {
  return (
    <div className="max-w-[85%] rounded-brand-lg border border-base-300 bg-base-100 p-3.5 sm:max-w-[75%]">
      <p className="text-body-sm font-medium">{title}</p>
      <dl className="mt-2 space-y-1">
        {Object.entries(fields).map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-4">
            <dt className="text-body-sm capitalize text-base-content/60">{k.replace(/_/g, " ")}</dt>
            <dd className="font-mono text-data tabular">{v}</dd>
          </div>
        ))}
      </dl>
      {settled ? (
        <p className="mt-3 text-body-sm text-success">Saved to your calendar.</p>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-11 flex-1 rounded-brand bg-primary px-3 text-label text-primary-content"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="min-h-11 flex-1 rounded-brand border border-base-300 px-3 text-label"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * An attachment that is still on its way, or did not make it.
 *
 * The preview stays visible in both states. A failure that replaces the picture
 * with a sentence makes the person wonder which photo failed; keeping the
 * thumbnail and putting the retry on it answers that without asking. Retry and
 * discard are icon buttons at full target size, because they sit on a bubble,
 * not in a form.
 */
export function ChatUploadBubble({
  filename,
  progress,
  failed = false,
  onRetry,
  onDiscard,
}: {
  filename: string;
  /** 0-100 while sending; ignored once `failed`. */
  progress?: number;
  failed?: boolean;
  onRetry?: () => void;
  onDiscard?: () => void;
}) {
  return (
    <div className="flex justify-end">
      <div
        className={cn(
          "w-60 rounded-brand-lg border p-3",
          failed ? "border-error/40 bg-error-tint" : "border-base-300",
        )}
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-brand",
              failed ? "bg-error/10 text-error" : "bg-base-300 text-base-content/45",
            )}
          >
            <ImageIcon className="size-5" strokeWidth={1.5} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-body-sm text-base-content/75">{filename}</p>
            <p className={cn("text-body-sm", failed ? "text-error" : "text-base-content/55")}>
              {failed ? "Didn't send" : "Sending…"}
            </p>
          </div>
        </div>

        {failed ? (
          <div className="mt-2 flex justify-end gap-1">
            <button
              type="button"
              aria-label={`Discard ${filename}`}
              onClick={onDiscard}
              className="flex size-11 items-center justify-center rounded-brand text-base-content/60 hover:bg-base-200"
            >
              <Trash2 aria-hidden className="size-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label={`Retry sending ${filename}`}
              onClick={onRetry}
              className="flex size-11 items-center justify-center rounded-brand bg-primary text-primary-content hover:bg-primary/90"
            >
              <RotateCcw aria-hidden className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        ) : (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-base-300">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-(--motion-base)"
              style={{ width: `${progress ?? 45}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
