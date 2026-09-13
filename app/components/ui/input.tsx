import { useId, useRef, useState } from "react";
import { cn } from "~/lib/cn";
import { type UploadKind, uploadPolicy, uploadProblem } from "~/lib/uploads";

const control =
  "w-full min-h-11.5 rounded-brand border border-base-300 bg-base-200 px-3.5 py-2.5 text-body text-base-content placeholder:text-base-content/40 transition-[background-color,border-color] duration-(--motion-fast) focus:border-primary focus:bg-base-100 focus:outline-none";

/**
 * PRODUCT_BRAND.md §8: label above the field in `--text-label`, never a
 * placeholder standing in as the only label. Errors quote the API's own field
 * name in plain language, inline beneath.
 */
export function Field({
  label,
  hint,
  error,
  optional,
  children,
  id,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  error?: string | null;
  optional?: boolean;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => React.ReactNode;
  id?: string;
  className?: string;
}) {
  const auto = useId();
  const fieldId = id ?? auto;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={fieldId} className="block text-label font-medium">
        {label}
        {optional ? (
          <span className="ml-1.5 font-normal text-base-content/50"> (Optional)</span>
        ) : null}
      </label>
      {hint ? (
        <p id={hintId} className="measure text-body-sm text-base-content/65">
          {hint}
        </p>
      ) : null}
      {children({ id: fieldId, "aria-describedby": describedBy, "aria-invalid": !!error })}
      {error ? (
        <p id={errorId} className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  numeric,
  ...rest
}: { numeric?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        control,
        numeric && "font-mono text-data tabular",
        "aria-invalid:border-error",
        className,
      )}
      {...rest}
    />
  );
}

export function Textarea({
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        control,
        "min-h-[104px] leading-relaxed",
        "aria-invalid:border-error",
        className,
      )}
      {...rest}
    />
  );
}

export function Select({
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(control, "appearance-none pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

type NativeInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/** A native date picker with the shared input treatment and data typeface. */
export function DateInput({ className, ...rest }: NativeInputProps) {
  return <Input {...rest} type="date" numeric className={className} />;
}

/** A native time picker with the shared input treatment and data typeface. */
export function TimeInput({ className, ...rest }: NativeInputProps) {
  return <Input {...rest} type="time" numeric className={className} />;
}

/**
 * A local date-time value is deliberately two native controls. It avoids a
 * browser's locale-dependent datetime parser while keeping the date and time
 * independently correctable on a phone.
 */
export function DateTimeInput({
  date,
  time,
  onDateChange,
  onTimeChange,
  dateLabel = "Date",
  timeLabel = "Time",
  dateInputProps,
  timeInputProps,
  className,
}: {
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  dateLabel?: string;
  timeLabel?: string;
  dateInputProps?: Omit<NativeInputProps, "id" | "value" | "onChange">;
  timeInputProps?: Omit<NativeInputProps, "id" | "value" | "onChange">;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-2", className)}>
      <Field label={dateLabel}>
        {(props) => (
          <DateInput
            {...props}
            {...dateInputProps}
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
          />
        )}
      </Field>
      <Field label={timeLabel}>
        {(props) => (
          <TimeInput
            {...props}
            {...timeInputProps}
            value={time}
            onChange={(event) => onTimeChange(event.target.value)}
          />
        )}
      </Field>
    </div>
  );
}

/** A paired date input for filters and forms that operate on an inclusive period. */
export function DateRangeInput({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel = "From",
  toLabel = "To",
  fromInputProps,
  toInputProps,
  className,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  fromLabel?: string;
  toLabel?: string;
  fromInputProps?: Omit<NativeInputProps, "id" | "value" | "onChange">;
  toInputProps?: Omit<NativeInputProps, "id" | "value" | "onChange">;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-3", className)}>
      <Field label={fromLabel}>
        {(props) => (
          <DateInput
            {...props}
            {...fromInputProps}
            value={from}
            onChange={(event) => onFromChange(event.target.value)}
          />
        )}
      </Field>
      <Field label={toLabel}>
        {(props) => (
          <DateInput
            {...props}
            {...toInputProps}
            value={to}
            onChange={(event) => onToChange(event.target.value)}
          />
        )}
      </Field>
    </div>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...rest
}: {
  label: React.ReactNode;
  description?: React.ReactNode;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-6 shrink-0 accent-[var(--brand-primary)]"
        {...rest}
      />
      <label htmlFor={id} className="text-body-sm">
        <span className="block">{label}</span>
        {description ? (
          <span className="mt-1 block text-base-content/65">{description}</span>
        ) : null}
      </label>
    </div>
  );
}

export function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  description,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-brand border p-4 transition-colors duration-(--motion-fast)",
        checked
          ? "border-primary bg-primary-tint"
          : "border-base-300 bg-base-200 hover:bg-base-300",
      )}
    >
      <input
        id={id}
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="size-6 shrink-0 accent-[var(--brand-primary)]"
      />
      <span className="min-w-0 text-body-sm">
        <span className="block font-medium">{title}</span>
        {description ? (
          <span className="mt-0.5 block text-base-content/65">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

/**
 * Fixed-count digit boxes that are *presentation only* — one real input
 * underneath, so paste, autofill and OS SMS-autofill all work
 * (WCAG 2.2 · 3.3.8, PRODUCT_BRAND.md §7).
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  disabled,
  label = "Verification code",
}: {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  label?: string;
}) {
  const id = useId();
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
      <div aria-hidden className="flex gap-2">
        {Array.from({ length }, (_, i) => (
          <div
            key={i}
            className={cn(
              "flex h-14 flex-1 items-center justify-center rounded-brand border bg-base-200 font-mono text-h2 tabular",
              value.length === i && !disabled ? "border-primary" : "border-base-300",
              disabled && "opacity-50",
            )}
          >
            {value[i] ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PinInput({
  value,
  onChange,
  disabled,
  label,
  error,
  autoComplete = "current-password",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
  error?: string | null;
  autoComplete?: React.InputHTMLAttributes<HTMLInputElement>["autoComplete"];
}) {
  return (
    <Field label={label} error={error}>
      {(props) => (
        <div className="relative">
          {/* One real input keeps keyboard, paste and password-manager behaviour intact;
              the boxes are deliberately presentational so a six-digit PIN remains one field. */}
          <input
            {...props}
            type="password"
            inputMode="numeric"
            autoComplete={autoComplete}
            maxLength={6}
            disabled={disabled}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0 disabled:cursor-not-allowed"
          />
          <div aria-hidden className="grid grid-cols-6 gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <span
                key={index}
                className={cn(
                  "flex h-14 items-center justify-center rounded-brand border bg-base-200 font-mono text-h2 tabular",
                  value.length === index && !disabled ? "border-primary" : "border-base-300",
                  disabled && "opacity-50",
                )}
              >
                {value[index] ? "•" : ""}
              </span>
            ))}
          </div>
        </div>
      )}
    </Field>
  );
}

/**
 * A touch-friendly numeric control for measurable values, while still allowing
 * a person to type or paste the exact number. Identifiers such as account
 * numbers intentionally keep a plain numeric input — incrementing those is an
 * error-prone interaction.
 */
export function NumberStepper({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  mode,
  precision,
  className,
  ...rest
}: {
  value: string | number;
  onValueChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Use decimal when a measurable value can include fractions. */
  mode?: "integer" | "decimal";
  /** Decimal places preserved when a step button changes a decimal value. */
  precision?: number;
  className?: string;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "min" | "max" | "step"
>) {
  const resolvedMode = mode ?? (Number.isInteger(step) ? "integer" : "decimal");
  const stepPrecision = String(step).split(".")[1]?.length ?? 0;
  const resolvedPrecision =
    precision ?? (resolvedMode === "decimal" ? Math.max(2, stepPrecision) : 0);
  const allowNegative = (min ?? 0) < 0;
  const parsedValue = Number(value);

  const sanitize = (raw: string) => {
    const signed = allowNegative && raw.startsWith("-");
    const unsigned = raw.replace(/-/g, "").replace(/,/g, ".");
    const [whole, ...fraction] = unsigned.split(".");
    const numericWhole = whole.replace(/\D/g, "");

    if (resolvedMode === "integer") {
      return `${signed ? "-" : ""}${numericWhole}`;
    }

    const numericFraction = fraction.join("").replace(/\D/g, "");
    const hasSeparator = unsigned.includes(".");
    return `${signed ? "-" : ""}${numericWhole}${hasSeparator ? `.${numericFraction}` : ""}`;
  };

  const changeBy = (direction: -1 | 1) => {
    const base = Number.isFinite(parsedValue) ? parsedValue : (min ?? 0);
    const next = Math.min(
      max ?? Number.POSITIVE_INFINITY,
      Math.max(min ?? Number.NEGATIVE_INFINITY, base + direction * step),
    );
    const formatted =
      resolvedMode === "integer"
        ? String(Math.round(next))
        : String(Number(next.toFixed(resolvedPrecision)));
    onValueChange(formatted);
  };

  return (
    <div
      className={cn(
        "flex min-h-11.5 overflow-hidden rounded-brand border border-base-300 bg-base-200 focus-within:border-primary focus-within:bg-base-100",
        className,
      )}
    >
      <button
        type="button"
        aria-label={`Decrease by ${step}`}
        disabled={parsedValue <= (min ?? Number.NEGATIVE_INFINITY) || rest.disabled}
        onClick={() => changeBy(-1)}
        className="flex w-12 shrink-0 items-center justify-center border-r border-base-300 text-h3 text-base-content/70 transition-colors hover:bg-base-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden>−</span>
      </button>
      <input
        {...rest}
        type="text"
        inputMode={resolvedMode === "integer" ? "numeric" : "decimal"}
        role="spinbutton"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number.isFinite(parsedValue) ? parsedValue : undefined}
        value={value}
        onChange={(event) => onValueChange(sanitize(event.target.value))}
        className="min-w-0 flex-1 bg-transparent px-3 text-center font-mono text-data tabular outline-none aria-invalid:border-error"
      />
      <button
        type="button"
        aria-label={`Increase by ${step}`}
        disabled={parsedValue >= (max ?? Number.POSITIVE_INFINITY) || rest.disabled}
        onClick={() => changeBy(1)}
        className="flex w-12 shrink-0 items-center justify-center border-l border-base-300 text-h3 text-base-content/70 transition-colors hover:bg-base-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden>+</span>
      </button>
    </div>
  );
}

/**
 * The one upload control (P50, P46a, X1, V10, V14a).
 *
 * It opens a real file picker narrowed to the types the surface accepts, then
 * carries the whole recovery path itself: an unsupported type, an empty file
 * and an oversize file are each refused with their own reason; an interrupted
 * upload keeps the chosen file and offers a retry; a completed upload can be
 * replaced or removed. Nothing is ever reported as attached before its
 * fixture mutation completes.
 */
export function FileDrop({
  label,
  filename,
  onPick,
  onFile,
  onUploadingChange,
  onRemove,
  kind = "DOCUMENT",
  accept,
  limit,
  /** Simulates an interrupted upload, for the reviewer's failure state. */
  failUpload = false,
  /** A document awaiting staff verification is not yet a verified document. */
  pendingVerification = false,
}: {
  label: string;
  filename?: string | null;
  /** Legacy demo hook: pick a representative file without a real chooser. */
  onPick?: () => void;
  /** Called once a chosen file has passed the shared policy check. */
  onFile?: (file: File) => void;
  onUploadingChange?: (uploading: boolean) => void;
  onRemove?: () => void;
  kind?: UploadKind;
  accept?: string;
  limit?: string;
  failUpload?: boolean;
  pendingVerification?: boolean;
}) {
  const policy = uploadPolicy(kind);
  const inputRef = useRef<HTMLInputElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [failed, setFailed] = useState<File | null>(null);

  const send = (file: File) => {
    setUploading(true);
    onUploadingChange?.(true);
    setFailed(null);
    window.setTimeout(() => {
      setUploading(false);
      onUploadingChange?.(false);
      if (failUpload) {
        // Keep the chosen file so retrying does not mean choosing it again.
        setFailed(file);
        return;
      }
      onFile?.(file);
    }, 400);
  };

  const choose = () => {
    if (onFile) inputRef.current?.click();
    else onPick?.();
  };

  return (
    <div className="space-y-2">
      {onFile ? (
        <input
          ref={inputRef}
          type="file"
          accept={accept ?? policy.accept}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (!file) return;
            const reason = uploadProblem(file, kind);
            setProblem(reason);
            if (!reason) send(file);
          }}
        />
      ) : null}

      <button
        type="button"
        onClick={choose}
        disabled={uploading}
        className="flex w-full flex-col items-center gap-1 rounded-brand border border-dashed border-base-300 bg-base-200 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-base-100 disabled:opacity-60"
      >
        <span className="text-label font-medium">
          {uploading ? "Uploading…" : filename ? "Replace this file" : label}
        </span>
        <span className="text-body-sm text-base-content/60">
          {accept ?? policy.humanTypes} · up to {limit ?? policy.humanLimit}
        </span>
        {filename ? (
          <span className="mt-2 font-mono text-record text-primary">{filename}</span>
        ) : null}
      </button>

      {problem ? (
        <p role="alert" className="text-body-sm text-error">
          {problem}
        </p>
      ) : null}

      {failed ? (
        <div role="alert" className="rounded-brand border border-warning/35 bg-warning-tint p-3">
          <p className="text-body-sm">
            The upload was interrupted. <span className="font-mono">{failed.name}</span> is still
            selected, so you do not have to find it again.
          </p>
          <button
            type="button"
            onClick={() => send(failed)}
            className="mt-2 min-h-11 rounded-brand border border-base-300 bg-base-100 px-4 text-label"
          >
            Retry upload
          </button>
        </div>
      ) : null}

      {filename && pendingVerification ? (
        <p className="text-body-sm text-base-content/65">
          Uploaded and awaiting review. It is not treated as verified until staff confirm it.
        </p>
      ) : null}

      {filename && onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="min-h-11 text-label text-base-content/70 underline underline-offset-2"
        >
          Remove this file
        </button>
      ) : null}
    </div>
  );
}
