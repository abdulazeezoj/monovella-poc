import { cn } from "~/lib/cn";

export function MonovellaIcon({ className }: { className?: string }) {
  // No default size baked in here: every call site supplies the size appropriate
  // to its surface. The colored icon is the standard mark on the prototype's
  // paper surfaces; callers pair it with visible product text where needed.
  return (
    <span aria-hidden="true" className={cn("relative block", className)}>
      <img
        src="/brand/icon-colored.svg"
        alt=""
        className="block size-full object-contain dark:hidden"
      />
      <img
        src="/brand/icon-light.svg"
        alt=""
        className="hidden size-full object-contain dark:block"
      />
    </span>
  );
}

export function Lockup({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const logo = { sm: "h-7", md: "h-9", lg: "h-16" }[size];
  return (
    <span className={cn("inline-block", logo, className)}>
      <img
        src="/brand/logo-colored.svg"
        alt="Monovella"
        className="block h-full w-auto object-contain dark:hidden"
      />
      <img
        src="/brand/logo-light.svg"
        alt="Monovella"
        className="hidden h-full w-auto object-contain dark:block"
      />
    </span>
  );
}
