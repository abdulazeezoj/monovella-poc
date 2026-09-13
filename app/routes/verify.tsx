import { BadgeCheck, Ban, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { Lockup } from "~/components/shell/logo";
import { PrototypeBar } from "~/components/shell/prototype-bar";
import { ScreenStates } from "~/components/shell/state-switcher";
import { formatDate } from "~/lib/format";
import { usePrototype } from "~/store/prototype";

type Verdict = "valid" | "invalid" | "revoked" | "not_found";

export function meta() {
  return [{ title: "Verify a Monovella report" }];
}

/**
 * P66 — Report Verification. Public, unauthenticated, reached from the QR code
 * or link printed in the report itself.
 *
 * The one screen a non-Monovella user will ever see. No login prompt, no
 * sign-up upsell, no navigation into the rest of the product — a trustworthy,
 * minimal verification stamp and nothing else.
 */
export default function Verify() {
  const { code } = useParams();
  const { data } = usePrototype();
  const report = data.reports.find((r) => r.verification_code === code);
  const routeVerdict: Verdict = !report
    ? "not_found"
    : report.status === "REVOKED"
      ? "revoked"
      : "valid";
  const [override, setOverride] = useState<Verdict | null>(null);
  const verdict = override ?? routeVerdict;
  const patient = report ? data.patients.find((item) => item.id === report.patient_id) : undefined;

  return (
    <div className="flex min-h-dvh flex-col bg-base-100">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-12">
        <Lockup size="sm" className="mb-10" />

        {verdict === "valid" && report ? (
          <Stamp
            tone="success"
            icon={BadgeCheck}
            heading="This report is genuine"
            body="Monovella issued this document and it has not been altered since."
            rows={[
              ["Issued", formatDate(report.ready_at)],
              ["Patient", patient?.monovella_id ?? "Not available"],
              ["Verification code", code ?? report.verification_code ?? ""],
            ]}
          />
        ) : null}

        {verdict === "invalid" ? (
          <Stamp
            tone="error"
            icon={ShieldAlert}
            heading="This report is not genuine"
            body="The signature on this document does not match what Monovella issued. Do not rely on it."
            rows={[["Verification code", code ?? ""]]}
          />
        ) : null}

        {verdict === "revoked" ? (
          <Stamp
            tone="neutral"
            icon={Ban}
            heading="This report is no longer valid"
            body="The person it belongs to has withdrawn it. Ask them for a current copy."
            rows={[["Verification code", code ?? ""]]}
          />
        ) : null}

        {verdict === "not_found" ? (
          <Stamp
            tone="neutral"
            icon={ShieldAlert}
            heading="Nothing found for this code"
            body="Check the code printed on the document, or the link you were sent."
            rows={[["Verification code", code ?? ""]]}
          />
        ) : null}

        <p className="mt-8 text-body-sm text-base-content/55">
          This page confirms one document. It never shows anyone's health record.
        </p>

        <ScreenStates
          states={[
            { value: "valid", label: "Valid" },
            { value: "invalid", label: "Invalid / tampered" },
            { value: "revoked", label: "Revoked" },
            { value: "not_found", label: "404" },
          ]}
          value={verdict}
          onChange={setOverride}
        />
      </div>
      <PrototypeBar surface="Public verification" />
    </div>
  );
}

function Stamp({
  tone,
  icon: Icon,
  heading,
  body,
  rows,
}: {
  tone: "success" | "error" | "neutral";
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  heading: string;
  body: string;
  rows: [string, string][];
}) {
  const ring =
    tone === "success"
      ? "border-success/40 bg-success-tint"
      : tone === "error"
        ? "border-error/40 bg-error-tint"
        : "border-base-300 bg-base-200";
  const fg =
    tone === "success" ? "text-success" : tone === "error" ? "text-error" : "text-base-content/70";

  return (
    <div className={`rounded-brand-lg border-2 p-6 ${ring}`}>
      <Icon aria-hidden className={`size-10 ${fg}`} strokeWidth={1.5} />
      <h1 className="mt-4 font-heading text-h1 leading-tight">{heading}</h1>
      <p className="measure mt-2 text-body text-base-content/80">{body}</p>
      <dl className="mt-6 space-y-2 border-t border-base-300 pt-4">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-wrap items-baseline justify-between gap-2">
            <dt className="text-body-sm text-base-content/60">{k}</dt>
            <dd className="font-mono text-record">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
