import { Minus, Plus, Search, Star, X } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "~/lib/cn";
import { Input } from "./input";

/**
 * Three visually distinct chips (PRODUCT_BRAND.md §8):
 *  - `select`     multi-select, base-200 resting, primary fill when on (P24)
 *  - `filter`     removable, trailing ×, accessible "remove" name (P36)
 *  - `suggestion` one-tap prefill, outlined, never pre-selected (P21/P22/P26)
 * All three hold the 44px target.
 */
export function Chip({
  kind = "select",
  selected,
  onClick,
  onRemove,
  children,
  className,
  ariaLabel,
}: {
  kind?: "select" | "filter" | "suggestion";
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}) {
  if (kind === "filter") {
    return (
      <span
        className={cn(
          "inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full bg-primary-tint px-3.5 text-label text-primary",
          className,
        )}
      >
        {children}
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove filter ${typeof children === "string" ? children : ""}`}
            className="-mr-1 flex size-8 items-center justify-center rounded-full hover:bg-primary/15"
          >
            <X aria-hidden className="size-4" strokeWidth={2} />
          </button>
        ) : null}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={kind === "select" ? !!selected : undefined}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex min-h-11 items-center whitespace-nowrap rounded-full border px-4 text-label transition-colors duration-(--motion-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        kind === "suggestion"
          ? "border-base-300 bg-transparent text-base-content/80 hover:bg-base-200"
          : selected
            ? "border-primary bg-primary text-primary-content"
            : "border-base-300 bg-base-200 text-base-content hover:bg-base-300",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** A three-way switch for mutually exclusive states (X5's canonical use). */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  onBlockedChange,
  label,
}: {
  value: T;
  options: {
    value: T;
    label: string;
    tone?: "success" | "warning" | "error";
    disabled?: boolean;
  }[];
  onChange: (value: T) => void;
  /** Called instead of `onChange` when a disabled option is tapped — so the
   * tap still does something (e.g. a toast explaining why), rather than the
   * silent no-op a plain `disabled` button would produce. */
  onBlockedChange?: (value: T) => void;
  label: string;
}) {
  const TONE = {
    success: "bg-success-tint text-success",
    warning: "bg-warning-tint text-warning",
    error: "bg-error-tint text-error",
  } as const;
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-brand bg-base-200 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-disabled={o.disabled}
            onClick={() => (o.disabled ? onBlockedChange?.(o.value) : onChange(o.value))}
            className={cn(
              "min-h-11 flex-1 whitespace-nowrap rounded-[calc(var(--radius-brand)-2px)] px-3 text-label transition-colors duration-(--motion-fast)",
              o.disabled && "cursor-not-allowed opacity-40",
              active
                ? o.tone
                  ? TONE[o.tone]
                  : "bg-primary-tint text-primary"
                : "text-base-content/65 hover:text-base-content",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Large tap-to-increment with clearly separated targets (P22, P26). */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  label,
  unit,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-brand border border-base-300 bg-base-200 p-2">
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
        className="flex size-14 items-center justify-center rounded-brand bg-base-100 text-base-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-35"
      >
        <Minus aria-hidden className="size-5" strokeWidth={1.5} />
      </button>
      <output className="font-mono text-h2 tabular" aria-label={`${label}: ${value}`}>
        {value}
        {unit ? <span className="ml-1 text-body-sm text-base-content/60">{unit}</span> : null}
      </output>
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
        className="flex size-14 items-center justify-center rounded-brand bg-base-100 text-base-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-35"
      >
        <Plus aria-hidden className="size-5" strokeWidth={1.5} />
      </button>
    </div>
  );
}

/** P20's category picker. Used once — not a general navigation pattern. */
export function TileGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</div>;
}

export function Tile({
  icon: Icon,
  label,
  onClick,
  to,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  label: string;
  onClick?: () => void;
  to?: string;
}) {
  const inner = (
    <>
      <Icon aria-hidden className="size-7 text-primary" strokeWidth={1.5} />
      <span className="text-label font-medium">{label}</span>
    </>
  );
  const cls =
    "flex aspect-[4/3] flex-col items-center justify-center gap-2.5 rounded-brand border border-base-300 bg-base-200 p-3 text-center transition-colors duration-(--motion-fast) hover:border-primary/40 hover:bg-base-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
  if (to) {
    return (
      <a href={to} className={cls}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

/**
 * A filterable list for any option set past ~10 entries — 18 specialties,
 * Nigerian bank codes, an expert picker. Never a bare native select, never a
 * raw code the user must already know (PRODUCT_BRAND.md §8).
 */
export function SearchablePicker<T>({
  items,
  value,
  onSelect,
  getKey,
  getLabel,
  getMeta,
  placeholder = "Search",
  emptyText = "Nothing matches that",
  maxHeight = "20rem",
}: {
  items: T[];
  value?: string | null;
  onSelect: (item: T) => void;
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getMeta?: (item: T) => React.ReactNode;
  placeholder?: string;
  emptyText?: string;
  maxHeight?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => getLabel(i).toLowerCase().includes(q));
  }, [items, query, getLabel]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-base-content/45"
          strokeWidth={1.5}
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="pl-9"
        />
      </div>
      <ul className="scrollbar-thin space-y-1 overflow-y-auto" style={{ maxHeight }}>
        {filtered.map((item) => {
          const key = getKey(item);
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onSelect(item)}
                className={cn(
                  // Stacked on a phone, side by side once there is room. Meta can
                  // carry a specialty, an area and an availability, which does not
                  // fit beside a full professional name on a 390px screen.
                  "flex min-h-11 w-full flex-col items-start gap-0.5 rounded-brand px-3 py-2 text-left text-body-sm transition-colors @sm:flex-row @sm:items-center @sm:justify-between @sm:gap-3",
                  value === key ? "bg-primary-tint text-primary" : "hover:bg-base-200",
                )}
              >
                <span className="min-w-0">{getLabel(item)}</span>
                {getMeta ? (
                  <span className="min-w-0 text-body-sm text-base-content/55 @sm:shrink-0 @sm:text-right">
                    {getMeta(item)}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
        {!filtered.length ? (
          <li className="px-3 py-6 text-center text-body-sm text-base-content/55">{emptyText}</li>
        ) : null}
      </ul>
    </div>
  );
}

/**
 * A one-to-five star rating.
 *
 * Built as a radio group rather than a row of buttons, so it is one tab stop,
 * arrow keys move between values, and a screen reader announces "3 of 5 stars"
 * instead of five unlabelled controls. Stars are the form people already know
 * from every other rating they have given; a dropdown of "4 out of 5" is not.
 */
export function StarRating({
  value,
  onChange,
  label = "Rating",
  max = 5,
}: {
  value: number;
  onChange: (next: number) => void;
  label?: string;
  max?: number;
}) {
  const WORDS = ["", "Poor", "Not good", "Fine", "Good", "Very good"];
  return (
    <div>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex items-center gap-1"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault();
            onChange(Math.min(max, value + 1));
          }
          if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault();
            onChange(Math.max(1, value - 1));
          }
        }}
      >
        {Array.from({ length: max }, (_, index) => index + 1).map((star) => {
          const filled = star <= value;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === value}
              aria-label={`${star} of ${max} stars`}
              tabIndex={star === value || (value === 0 && star === 1) ? 0 : -1}
              onClick={() => onChange(star)}
              className="flex size-11 items-center justify-center rounded-brand transition-colors hover:bg-base-200"
            >
              <Star
                aria-hidden
                className={cn(
                  "size-7",
                  filled ? "fill-warning text-warning" : "text-base-content/30",
                )}
                strokeWidth={1.5}
              />
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="mt-1 text-body-sm text-base-content/65">
        {value ? `${value} of ${max} · ${WORDS[value] ?? ""}` : "Choose a rating"}
      </p>
    </div>
  );
}
