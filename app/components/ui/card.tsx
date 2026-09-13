import { Download, FileText } from "lucide-react";
import { Link } from "react-router";
import { cn } from "~/lib/cn";

export function Card({
  className,
  children,
  as: As = "div",
  ...rest
}: {
  className?: string;
  children: React.ReactNode;
  as?: "div" | "section" | "article";
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <As className={cn("folio-surface rounded-brand p-4 pt-5", className)} {...rest}>
      {children}
    </As>
  );
}

export function CardTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <h3 className={cn("font-heading text-h3 text-base-content", className)}>{children}</h3>;
}

export function CardLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "folio-surface block rounded-brand p-4 pt-5 transition-[background-color,border-color,transform] duration-(--motion-fast) hover:border-primary/40 hover:bg-base-300 hover:-translate-y-px",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/**
 * The "this is a real record" affordance for a PDF (P46, P47, P65).
 * Looks like a document, not a list row.
 */
export function DocumentCard({
  title,
  issuedAt,
  onDownload,
  downloadLabel = "PDF",
  meta,
}: {
  title: string;
  issuedAt: string;
  onDownload?: () => void;
  downloadLabel?: string;
  meta?: React.ReactNode;
}) {
  return (
    <div className="folio-surface flex items-start gap-3 rounded-brand bg-base-100 p-4 pt-5">
      <FileText aria-hidden className="mt-0.5 size-6 shrink-0 text-primary" strokeWidth={1.5} />
      <div className="min-w-0 flex-1">
        <p className="font-heading text-h3 leading-snug">{title}</p>
        <p className="mt-1 font-mono text-body-sm text-base-content/65">{issuedAt}</p>
        {meta}
      </div>
      {onDownload ? (
        <button
          type="button"
          onClick={onDownload}
          className="inline-flex min-h-11 items-center gap-2 rounded-brand px-3 text-label text-primary hover:bg-base-200"
        >
          <Download aria-hidden className="size-4" strokeWidth={1.5} />
          {downloadLabel}
        </button>
      ) : null}
    </div>
  );
}
