import { Link } from "react-router";
import { cn } from "~/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "md" | "sm" | "lg";

const VARIANTS: Record<Variant, string> = {
  // PRODUCT_BRAND.md §8: solid primary fill; outlined secondary; text-only ghost.
  primary:
    "border border-primary/35 bg-primary text-primary-content shadow-brand hover:brightness-110 active:translate-y-px active:brightness-95",
  secondary:
    "border border-base-300 bg-base-100 text-base-content hover:border-base-content/20 hover:bg-base-200",
  ghost: "text-base-content/80 hover:bg-base-200 hover:text-base-content",
  destructive:
    "border border-error/30 bg-error text-error-content hover:brightness-110 active:translate-y-px",
};

const SIZES: Record<Size, string> = {
  // 44px minimum target on mobile (WCAG 2.2 · 2.5.8).
  sm: "min-h-11 px-3 text-label",
  md: "min-h-11.5 px-4 text-label",
  lg: "min-h-[54px] px-6 text-body",
};

interface BaseProps {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  className?: string;
  children: React.ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-brand font-sans font-medium transition-[filter,background-color,border-color,transform] duration-(--motion-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-45";

export function Button({
  variant = "primary",
  size = "md",
  full,
  className,
  children,
  ...rest
}: BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(base, VARIANTS[variant], SIZES[size], full && "w-full", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  to,
  variant = "primary",
  size = "md",
  full,
  className,
  children,
  ...rest
}: BaseProps & { to: string } & React.ComponentProps<typeof Link>) {
  return (
    <Link
      to={to}
      className={cn(base, VARIANTS[variant], SIZES[size], full && "w-full", className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-brand text-base-content/70 transition-colors duration-(--motion-fast) hover:bg-base-200 hover:text-base-content focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
