import { cn } from "~/lib/cn";

/** A small initials circle — the same identity marker wherever an account or a person needs one. */
export function IdentityMark({ name, muted }: { name: string; muted?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full font-mono text-body-sm tabular",
        muted ? "bg-base-300 text-base-content/60" : "bg-primary-tint text-primary",
      )}
    >
      {name}
    </span>
  );
}
