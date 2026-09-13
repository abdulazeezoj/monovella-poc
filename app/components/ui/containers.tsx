import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "~/lib/cn";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

/**
 * Shared open behavior for `Sheet`/`Modal`: move focus into the dialog, trap
 * Tab/Shift+Tab among its own focusable descendants, restore focus to
 * whatever was focused before opening (the trigger button) on close, and
 * wire Escape — unless `irreversible` says the only way out is a deliberate
 * footer action (Sheet's "I've copied it", Modal's Confirm/Cancel).
 */
function useDialogBehavior(
  dialogRef: React.RefObject<HTMLDivElement | null>,
  open: boolean,
  onClose: () => void,
  irreversible: boolean | undefined,
) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: dialogRef is a stable ref object; its .current is read fresh on every open, not captured.
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!irreversible) onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusables || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose, irreversible]);
}

/**
 * Bottom-anchored on mobile, 12px top radius, base-200 on a scrim. The default
 * for a focused sub-task over a screen that should stay in place
 * (PRODUCT_BRAND.md §8).
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  irreversible,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** True while a one-time, unrecoverable-if-lost value (a temp password) is
   * showing — the scrim, Escape and the X stop working, so only a deliberate
   * footer action can close it. */
  irreversible?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(dialogRef, open, onClose, irreversible);

  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[70] flex items-end justify-center">
      {/* Mouse-only dismissal. The header's Close button and Escape are the
          accessible routes out, so the scrim stays out of the tab order and out
          of the accessibility tree rather than announcing a second "Close". */}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        disabled={irreversible}
        onClick={irreversible ? undefined : onClose}
        className={cn("absolute inset-0 bg-neutral/50", irreversible && "cursor-default")}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-sheet relative flex max-h-[85%] w-full flex-col rounded-t-brand-lg border-t border-base-300 bg-base-100 outline-none sm:max-w-lg sm:rounded-b-brand-lg sm:border"
      >
        <div className="flex items-center justify-between gap-3 border-b border-base-300 px-4 py-3">
          <h2 className="font-heading text-h3">{title}</h2>
          <button
            type="button"
            onClick={irreversible ? undefined : onClose}
            disabled={irreversible}
            aria-label="Close"
            className={cn(
              "flex size-11 items-center justify-center rounded-brand text-base-content/65",
              irreversible ? "cursor-default opacity-40" : "hover:bg-base-200",
            )}
          >
            <X aria-hidden className="size-5" strokeWidth={1.5} />
          </button>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        {footer ? <div className="border-t border-base-300 p-4">{footer}</div> : null}
      </div>
    </div>
  );
}

/**
 * Reserved for destructive confirmation only (P61, P28's delete, X19).
 * Never dismissable by tapping the scrim when the action is irreversible.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  irreversible,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  irreversible?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(dialogRef, open, onClose, irreversible);

  if (!open) return null;
  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center p-4">
      {/* Mouse-only dismissal. The header's Close button and Escape are the
          accessible routes out, so the scrim stays out of the tab order and out
          of the accessibility tree rather than announcing a second "Close". */}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        disabled={irreversible}
        onClick={irreversible ? undefined : onClose}
        className={cn("absolute inset-0 bg-neutral/60", irreversible && "cursor-default")}
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="animate-enter relative w-full max-w-md rounded-brand-lg border border-base-300 bg-base-100 p-5 shadow-brand outline-none"
      >
        <h2 className="font-heading text-h2">{title}</h2>
        <div className="measure mt-2 text-body text-base-content/80">{children}</div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>
      </div>
    </div>
  );
}

/** Underline-on-active in primary. Used by P43 and X12 only. */
export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { id: string; label: string; badge?: number }[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("flex gap-1 border-b border-base-300", className)}>
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={t.badge ? `${t.label} (${t.badge})` : undefined}
            onClick={() => onChange(t.id)}
            className={cn(
              "-mb-px min-h-11 border-b-2 px-3 text-label transition-colors duration-(--motion-fast)",
              isActive
                ? "border-primary text-primary"
                : "border-transparent text-base-content/60 hover:text-base-content",
            )}
          >
            {t.label}
            {t.badge ? (
              <span aria-hidden className="ml-1.5 font-mono text-body-sm tabular">
                {t.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
