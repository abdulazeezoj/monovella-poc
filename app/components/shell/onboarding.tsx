/** A calm, visible marker of progress through a finite setup flow. */
export function OnboardingProgress({
  current,
  total,
  label,
  optional,
}: {
  current: number;
  total: number;
  label: string;
  optional?: boolean;
}) {
  return (
    <section
      aria-label={`Setup progress: step ${current} of ${total}`}
      className="border-b border-base-300 pb-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-primary">
          Step {current} of {total}
        </p>
        {optional ? <span className="text-body-sm text-base-content/55">Optional</span> : null}
      </div>
      <p className="mt-1 text-body-sm font-medium text-base-content/75">{label}</p>
      <div
        role="progressbar"
        aria-label={`Step ${current} of ${total}`}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-base-200"
      >
        <span
          className="block h-full rounded-full bg-primary transition-[width] duration-(--motion-base)"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </section>
  );
}
