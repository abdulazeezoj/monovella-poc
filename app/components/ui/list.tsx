import { ChevronRight } from "lucide-react";
import { Link } from "react-router";
import { cn } from "~/lib/cn";

/** Row minimum 44px — on a provider's counter tablet as much as on mobile. */
export function ListRow({
  to,
  onClick,
  leading,
  title,
  meta,
  trailing,
  className,
  chevron = true,
}: {
  to?: string;
  onClick?: () => void;
  leading?: React.ReactNode;
  title: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
  chevron?: boolean;
}) {
  const body = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="text-body-sm font-medium">{title}</div>
        {meta ? <div className="mt-0.5 text-body-sm text-base-content/65">{meta}</div> : null}
      </div>
      {trailing}
      {chevron && (to || onClick) ? (
        <ChevronRight
          aria-hidden
          className="size-4 shrink-0 text-base-content/35"
          strokeWidth={1.5}
        />
      ) : null}
    </>
  );

  const cls = cn(
    "flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-(--motion-fast)",
    (to || onClick) && "hover:bg-base-200",
    className,
  );

  if (to) {
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}

export function ListGroup({
  children,
  className,
  label,
}: {
  children: React.ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <section className={className}>
      {label ? (
        <h2 className="mb-2 px-1 font-heading text-h3 text-base-content/80">{label}</h2>
      ) : null}
      <div className="divide-y divide-base-300 overflow-hidden rounded-brand border border-base-300 bg-base-200">
        {children}
      </div>
    </section>
  );
}

/**
 * Data-dense tables scroll inside their own container, never the page
 * (WCAG 2.2 · 1.4.10 Reflow).
 */
export function TableWrap({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "scrollbar-thin overflow-x-auto rounded-brand border border-base-300 [contain:paint]",
        className,
      )}
      style={{
        // A CSS-only "scroll shadow": two solid covers riding with the
        // content (background-attachment: local) hide the fixed shadow
        // layers beneath them except right at each scrollable edge, so a
        // hint to keep scrolling only shows up when there's actually more
        // to see — no JS scroll-position tracking needed.
        backgroundImage: [
          "linear-gradient(to right, var(--color-base-100) 30%, transparent)",
          "linear-gradient(to left, var(--color-base-100) 30%, transparent)",
          "linear-gradient(to right, rgba(0, 0, 0, 0.28), transparent)",
          "linear-gradient(to left, rgba(0, 0, 0, 0.28), transparent)",
        ].join(", "),
        backgroundPosition: "left, right, left, right",
        backgroundRepeat: "no-repeat",
        backgroundSize: "24px 100%, 24px 100%, 16px 100%, 16px 100%",
        backgroundAttachment: "local, local, scroll, scroll",
      }}
    >
      {children}
    </div>
  );
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <table className={cn("w-full min-w-[42rem] border-collapse", className)}>{children}</table>
  );
}

export function Th({
  children,
  className,
  numeric,
}: {
  children: React.ReactNode;
  className?: string;
  numeric?: boolean;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-base-300 bg-base-200 px-4 py-2.5 text-left text-label font-medium text-base-content/70",
        numeric && "text-right",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
  numeric,
}: {
  children: React.ReactNode;
  className?: string;
  numeric?: boolean;
}) {
  return (
    <td
      className={cn(
        "border-b border-base-300 px-4 py-3 align-middle text-body-sm",
        numeric && "text-right font-mono text-data tabular",
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Overdue rows carry a persistent error-tint left edge, scannable down the list. */
export function Tr({
  children,
  onClick,
  overdue,
  muted,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  overdue?: boolean;
  muted?: boolean;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        onClick && "cursor-pointer hover:bg-base-200",
        overdue && "border-l-[3px] border-l-error",
        muted && "text-base-content/45",
      )}
    >
      {children}
    </tr>
  );
}

/** A labelled figure pair — the standard record row inside a card. */
export function DataRow({
  label,
  value,
  mono = true,
  align = "right",
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  /** Long free text (an address, a reason) reads better left-aligned than
   * ragged-right once it wraps — right align stays the default for the
   * short numeric/code values most rows carry. */
  align?: "left" | "right";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <dt className="text-body-sm text-base-content/65">{label}</dt>
      <dd
        className={cn(
          "text-body-sm",
          align === "right" ? "text-right" : "text-left",
          mono && "font-mono text-data tabular",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
