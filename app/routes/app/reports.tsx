import { Download, FileText, Share2, ShieldOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { useMutationStates } from "~/components/shell/mutation-states";
import { ScreenStates } from "~/components/shell/state-switcher";
import {
  Banner,
  Button,
  ButtonLink,
  CopyButton,
  DataRow,
  DateRangeInput,
  EmptyState,
  ListGroup,
  ListRow,
  Modal,
  RadioCard,
  ReportBadge,
  SkeletonRows,
} from "~/components/ui";
import { expertName, patientById, selfPatient } from "~/data/selectors";
import type { ReportScope } from "~/data/types";
import { now } from "~/lib/clock";
import { formatDate, formatDateTime, reportScopeLabel } from "~/lib/format";
import { usePrototype } from "~/store/prototype";

function activeReportPatient(
  data: ReturnType<typeof usePrototype>["data"],
  viewingPatientId: string,
) {
  const patient = patientById(data, viewingPatientId);
  if (!patient) return undefined;
  const isSelf = patient.id === selfPatient(data)?.id;
  const isCurrentDependant = patient.guardian_user_id === data.user.id;
  return isSelf || isCurrentDependant ? patient : undefined;
}

/** P63 — My Reports. A folder of certificates, not a feed. */
export default function Reports() {
  const { data, session } = usePrototype();
  const [view, setView] = useState<"populated" | "empty" | "loading">("populated");
  const activePatient = activeReportPatient(data, session.viewingPatientId);
  const rows =
    view === "empty" || !activePatient
      ? []
      : data.reports.filter((report) => report.patient_id === activePatient.id);

  return (
    <MobileScreen
      title="Reports"
      back="/app/account"
      patientContext
      action={
        <ButtonLink to="/app/reports/new" size="sm">
          Generate
        </ButtonLink>
      }
    >
      <div data-screen="P63" className="space-y-4">
        <ScreenStates
          states={[
            { value: "populated", label: "Populated" },
            { value: "loading", label: "Loading" },
            { value: "empty", label: "Empty" },
          ]}
          value={view}
          onChange={setView}
        />

        {view === "loading" ? <SkeletonRows rows={3} /> : null}

        {view !== "loading" && rows.length ? (
          <ListGroup>
            {rows.map((r) => {
              const consultation = r.consultation_id
                ? data.consultations.find(
                    (item) =>
                      item.id === r.consultation_id &&
                      item.patient_identity_id === activePatient?.id,
                  )
                : undefined;
              return (
                <ListRow
                  key={r.id}
                  to={`/app/reports/${r.id}`}
                  leading={
                    <FileText
                      aria-hidden
                      className="size-4 text-base-content/45"
                      strokeWidth={1.5}
                    />
                  }
                  title={
                    r.scope === "CONSULTATION" && consultation
                      ? `Visit with ${expertName(data, consultation.expert_id)}`
                      : reportScopeLabel[r.scope]
                  }
                  meta={
                    r.scope === "DATE_RANGE"
                      ? `${formatDate(`${r.start_date}T00:00:00`)} to ${formatDate(`${r.end_date}T00:00:00`)}`
                      : formatDate(r.ready_at ?? r.requested_at)
                  }
                  trailing={<ReportBadge status={r.status} />}
                />
              );
            })}
          </ListGroup>
        ) : null}

        {view !== "loading" && !rows.length ? (
          <EmptyState
            icon={FileText}
            title="No reports yet"
            body="Take a signed copy of your care history to a new provider, a school, an insurer. Anyone can confirm it's genuine without needing a Monovella account of their own."
            action={<ButtonLink to="/app/reports/new">Generate report</ButtonLink>}
          />
        ) : null}
      </div>
    </MobileScreen>
  );
}

/** P64 — Generate a Report. A deliberate act, not a debounced toggle. */
export function GenerateReport() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation"],
    "your report",
  );
  const [params] = useSearchParams();
  const { data, session, update, toast, nextId } = usePrototype();
  const navigate = useNavigate();
  const activePatient = activeReportPatient(data, session.viewingPatientId);
  const requestedConsultationId = params.get("consultation");
  const consultation = requestedConsultationId
    ? data.consultations.find(
        (item) =>
          item.id === requestedConsultationId && item.patient_identity_id === activePatient?.id,
      )
    : undefined;
  const consultationId = consultation?.id ?? null;
  const [scope, setScope] = useState<ReportScope>(consultationId ? "CONSULTATION" : "FULL_HISTORY");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [state, setState] = useState<"form" | "generating" | "failed">("form");
  const effectiveScope = scope === "CONSULTATION" && !consultation ? "FULL_HISTORY" : scope;
  const invalidRange = effectiveScope === "DATE_RANGE" && !!from && !!to && from > to;
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const generatedReport = data.reports.find((report) => report.id === generatedId);
  useEffect(() => {
    if (generatedReport?.status !== "READY") return;
    toast("Your report is ready.");
    navigate(`/app/reports/${generatedReport.id}`);
  }, [generatedReport, navigate, toast]);

  if (!activePatient) {
    return (
      <MobileScreen title="Generate a report" back="/app/reports" tabs="none" patientContext>
        <EmptyState
          title="Patient unavailable"
          body="Choose your own profile or a dependant you currently manage before generating a report."
        />
      </MobileScreen>
    );
  }

  if (state === "generating") {
    return (
      <MobileScreen
        title="Putting your report together"
        back="/app/reports"
        tabs="none"
        patientContext
      >
        <div className="space-y-4">
          <div className="skeleton h-40 w-full rounded-brand" aria-hidden />
          <p className="measure text-body text-base-content/75">
            We're assembling and signing the document. It takes a moment. You can leave this screen
            and it'll be waiting in your reports.
          </p>
          <ButtonLink to="/app/reports" variant="secondary" full>
            My reports
          </ButtonLink>
          <ScreenStates
            states={[
              { value: "generating", label: "Generating" },
              { value: "failed", label: "Failed" },
            ]}
            value={state}
            onChange={(v) => setState(v as typeof state)}
          />
        </div>
      </MobileScreen>
    );
  }

  if (state === "failed") {
    return (
      <MobileScreen title="Report" back="/app/reports" tabs="none" patientContext>
        <div className="space-y-4">
          <Banner tone="error">That report didn't generate. Nothing was lost. Try again.</Banner>
          <Button full onClick={() => setState("form")}>
            Try again
          </Button>
        </div>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen title="Generate a report" back="/app/reports" tabs="none" patientContext>
      <div data-screen="P64" className="space-y-4">
        {mutation.node}
        <p className="measure text-body text-base-content/75">
          A signed PDF of{" "}
          {activePatient.is_dependant ? `${activePatient.first_name}'s` : "your own"} record.
          Whoever you give it to can check it's genuine without a Monovella account. It carries its
          own verification code.
        </p>

        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-label font-medium">What should it cover</legend>
          {consultation ? (
            <RadioCard
              name="scope"
              value="CONSULTATION"
              checked={effectiveScope === "CONSULTATION"}
              onChange={(v) => setScope(v as ReportScope)}
              title="This consultation"
              description={`${expertName(data, consultation.expert_id)} · ${formatDate(consultation.scheduled_start)}`}
            />
          ) : null}
          <RadioCard
            name="scope"
            value="FULL_HISTORY"
            checked={effectiveScope === "FULL_HISTORY"}
            onChange={(v) => setScope(v as ReportScope)}
            title={
              activePatient.is_dependant
                ? `${activePatient.first_name}'s full history`
                : "My full history"
            }
            description={`Everything on ${activePatient.is_dependant ? `${activePatient.first_name}'s` : "your"} record to date`}
          />
          <RadioCard
            name="scope"
            value="DATE_RANGE"
            checked={effectiveScope === "DATE_RANGE"}
            onChange={(v) => setScope(v as ReportScope)}
            title="A date range"
            description="Useful when a school or insurer asks for a specific period"
          />
        </fieldset>

        {effectiveScope === "DATE_RANGE" ? (
          <DateRangeInput from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
        ) : null}
        {invalidRange ? (
          <Banner tone="warning">The end date must be on or after the start date.</Banner>
        ) : null}

        <Button
          full
          disabled={invalidRange || (effectiveScope === "DATE_RANGE" && (!from || !to))}
          onClick={() => {
            if (invalidRange || (effectiveScope === "DATE_RANGE" && (!from || !to))) return;
            const reportId = nextId("rep");
            const patientId = activePatient.id;
            setState("generating");
            update((d) => {
              const patient = activeReportPatient(d, patientId);
              const selectedConsultation = consultationId
                ? d.consultations.find(
                    (item) =>
                      item.id === consultationId && item.patient_identity_id === patient?.id,
                  )
                : undefined;
              if (!patient || (effectiveScope === "CONSULTATION" && !selectedConsultation)) return;
              d.reports = [
                {
                  id: reportId,
                  patient_id: patient.id,
                  scope: effectiveScope,
                  status: "GENERATING",
                  consultation_id:
                    effectiveScope === "CONSULTATION" ? (selectedConsultation?.id ?? null) : null,
                  start_date: effectiveScope === "DATE_RANGE" ? from : null,
                  end_date: effectiveScope === "DATE_RANGE" ? to : null,
                  requested_at: now().toISOString().slice(0, 19),
                  ready_at: null,
                  pdf_url: null,
                  verification_code: null,
                  revoked_at: null,
                },
                ...d.reports,
              ];
            });
            setGeneratedId(reportId);
          }}
        >
          Generate report
        </Button>
      </div>
    </MobileScreen>
  );
}

/** P65 — Report Detail / Viewer. The most "physical document" screen there is. */
export function ReportDetail() {
  const { id } = useParams();
  const { data, session, update, toast } = usePrototype();
  const [revoking, setRevoking] = useState(false);
  const activePatient = activeReportPatient(data, session.viewingPatientId);
  const report = data.reports.find(
    (item) => item.id === id && item.patient_id === activePatient?.id,
  );

  if (!report) {
    return (
      <MobileScreen title="Report" back="/app/reports" patientContext>
        <EmptyState
          title="This report is gone"
          body="Generate a fresh one: a report is a snapshot, and a new one is always current."
        />
      </MobileScreen>
    );
  }

  const revoked = report.status === "REVOKED";
  const reportConsultation = report.consultation_id
    ? data.consultations.find(
        (item) =>
          item.id === report.consultation_id && item.patient_identity_id === activePatient?.id,
      )
    : undefined;

  return (
    <MobileScreen title="Report" back="/app/reports" tabs="none" patientContext>
      <div data-screen="P65" className="space-y-4">
        <ReportBadge status={report.status} />

        {revoked ? (
          <Banner tone="warning">
            You revoked this on {formatDate(report.revoked_at)}. Anyone checking its code now sees
            that it's no longer valid.
          </Banner>
        ) : null}

        {report.status === "GENERATING" ? (
          <div className="skeleton h-56 w-full rounded-brand" aria-hidden />
        ) : (
          <div className="rounded-brand border border-base-300 bg-base-100 p-6">
            <p className="font-heading text-h3">Monovella</p>
            <p className="mt-6 font-heading text-h1 leading-tight">Care record</p>
            <p className="mt-1 text-body-sm text-base-content/65">
              {report.scope === "CONSULTATION" && reportConsultation
                ? `One consultation · ${expertName(data, reportConsultation.expert_id)}`
                : reportScopeLabel[report.scope]}
            </p>
            <dl className="mt-6 divide-y divide-base-300 border-t border-base-300 pt-2">
              <DataRow label="Patient" value={activePatient?.monovella_id ?? "-"} />
              <DataRow label="Generated" value={formatDateTime(report.ready_at)} />
              <DataRow label="Verification code" value={report.verification_code ?? "-"} />
            </dl>
            <div className="mt-6 flex items-center gap-3 border-t border-base-300 pt-4">
              <p className="measure text-body-sm text-base-content/65">
                Open the verification link to confirm the document is genuine and unaltered. It
                never shows them your record.
              </p>
            </div>
          </div>
        )}

        {report.status === "READY" ? (
          <>
            <Banner tone="info">
              Prototype note: this demo does not generate a real PDF file. The verification link
              below is interactive; download is shown only as a labelled simulation.
            </Banner>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => toast("Prototype simulation: no PDF file was downloaded.")}>
                <Download aria-hidden className="size-4" strokeWidth={1.5} />
                Simulate download
              </Button>
              <Button
                variant="secondary"
                onClick={async () => {
                  const url = `${window.location.origin}/verify/${report.verification_code}`;
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: "Monovella report verification", url });
                    } catch {
                      toast("Share closed. Nothing was sent.");
                    }
                    return;
                  }
                  await navigator.clipboard.writeText(url);
                  toast("Verification link copied.");
                }}
              >
                <Share2 aria-hidden className="size-4" strokeWidth={1.5} />
                Share verification link
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <ButtonLink
                to={`/verify/${report.verification_code}`}
                variant="secondary"
                className="min-w-0 flex-1"
              >
                Verify report
              </ButtonLink>
              <CopyButton
                iconOnly
                text={`${window.location.origin}/verify/${report.verification_code}`}
                label="Copy verification link"
                copiedLabel="Verification link copied"
              />
            </div>
            <Button variant="ghost" full onClick={() => setRevoking(true)}>
              <ShieldOff aria-hidden className="size-4" strokeWidth={1.5} />
              Revoke sharing
            </Button>
          </>
        ) : null}

        <p className="measure text-body-sm text-base-content/60">
          A report is a snapshot of the moment it was made. It never updates itself. Generating a
          new one leaves whatever you already shared exactly as it was.
        </p>

        <Modal
          open={revoking}
          onClose={() => setRevoking(false)}
          title="Revoke this report?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setRevoking(false)}>
                Keep it valid
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  update((d) => {
                    d.reports = d.reports.map((r) =>
                      r.id === report.id &&
                      r.patient_id === session.viewingPatientId &&
                      activeReportPatient(d, session.viewingPatientId)
                        ? {
                            ...r,
                            status: "REVOKED" as const,
                            revoked_at: now().toISOString().slice(0, 19),
                          }
                        : r,
                    );
                  });
                  setRevoking(false);
                  toast("Revoked.");
                }}
              >
                Revoke it
              </Button>
            </>
          }
        >
          Anyone who checks its code will see it's no longer valid. Copies already downloaded still
          exist as files. This stops them verifying.
        </Modal>
      </div>
    </MobileScreen>
  );
}
