import {
  AlertTriangle,
  Check,
  Eye,
  EyeOff,
  FileText,
  HeartPulse,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useMutationStates } from "~/components/shell/mutation-states";
import { ScreenStates } from "~/components/shell/state-switcher";
import { PageHeader } from "~/components/shell/web-shell";
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  Chip,
  CopyButton,
  Countdown,
  DataRow,
  EmptyState,
  Field,
  FileDrop,
  IconButton,
  Input,
  Modal,
  Sheet,
  SkeletonRows,
  Table,
  TableWrap,
  Td,
  Textarea,
  Th,
  Tr,
} from "~/components/ui";
import {
  consultationById,
  expertName,
  notificationPrefsFor,
  patientName,
  providerById,
  STAFF_ID,
  twoFactorFor,
} from "~/data/selectors";
import type { ProviderType } from "~/data/types";
import { updateAuthJourney } from "~/lib/auth-journey";
import { now } from "~/lib/clock";
import {
  actorTypeLabel,
  formatDate,
  formatDateTime,
  naira,
  standingEventLabel,
  titleCase,
} from "~/lib/format";
import {
  assigneeOf,
  auditFor,
  deactivateStaff,
  decideDispute,
  decideGovernanceApplication,
  decideStanding,
  provisionStaff,
  revisionOf,
} from "~/lib/governance-lifecycle";
import { usePrototype, useTick } from "~/store/prototype";

function Urgency({
  overdue,
  dueSoon,
  due,
}: {
  overdue?: boolean;
  dueSoon?: boolean;
  due?: string | null;
}) {
  if (overdue)
    return (
      <Badge tone="error" icon={AlertTriangle}>
        Overdue
      </Badge>
    );
  if (dueSoon) return <Badge tone="warning">Due soon</Badge>;
  return (
    <span className="font-mono text-body-sm tabular text-base-content/60">
      {due ? formatDate(due) : "-"}
    </span>
  );
}

/** Overdue first, then due-soon — the one ordering all four back-office
 * queues share, so "what's overdue surfaces first" is true everywhere it's
 * claimed, not just on the one queue that happened to implement it. */
function byUrgency<T extends { overdue: boolean; due_soon: boolean }>(rows: T[]): T[] {
  return [...rows].sort(
    (a, b) => Number(b.overdue) - Number(a.overdue) || Number(b.due_soon) - Number(a.due_soon),
  );
}

/** B7 — Applications Queue. One queue for Specialist, Pharmacy and Lab. */
export function ApplicationsQueue() {
  const { data } = usePrototype();
  const navigate = useNavigate();
  const [type, setType] = useState<ProviderType | "ALL">("ALL");
  const [view, setView] = useState<"populated" | "loading" | "empty">("populated");

  const rows = byUrgency(
    (view === "empty" ? [] : data.applicationsQueue).filter(
      (a) => type === "ALL" || a.provider_type === type,
    ),
  );

  return (
    <>
      <PageHeader
        title="Provider applications"
        description="Specialist, Pharmacy and Lab in one queue. Overdue items surface first."
      />
      <div data-screen="B7" className="space-y-4">
        <ScreenStates
          states={[
            { value: "populated", label: "Populated" },
            { value: "loading", label: "Loading" },
            { value: "empty", label: "Empty" },
          ]}
          value={view}
          onChange={setView}
        />

        <div className="flex flex-wrap gap-2">
          {(["ALL", "SPECIALIST", "PHARMACY", "LAB"] as const).map((t) => (
            <Chip key={t} selected={type === t} onClick={() => setType(t)}>
              {t === "ALL" ? "All types" : titleCase(t)}
            </Chip>
          ))}
        </div>

        {view === "loading" ? <SkeletonRows rows={5} /> : null}

        {view !== "loading" && rows.length ? (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Applicant</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th>Submitted</Th>
                  <Th>Review due</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <Tr
                    key={a.id}
                    overdue={a.overdue}
                    onClick={() => navigate(`/console/applications/${a.id}`)}
                  >
                    <Td>
                      <Link
                        to={`/console/applications/${a.id}`}
                        className="inline-flex min-h-6 items-center gap-2 font-medium text-primary"
                      >
                        {a.name}
                        {a.request_kind === "RENEWAL" ? (
                          <Badge tone="neutral">Renewal</Badge>
                        ) : null}
                      </Link>
                    </Td>
                    <Td>{titleCase(a.provider_type)}</Td>
                    <Td>
                      <Badge
                        tone={
                          a.verification_status === "APPROVED"
                            ? "success"
                            : a.verification_status === "REJECTED"
                              ? "neutral"
                              : "warning"
                        }
                      >
                        {titleCase(a.verification_status)}
                      </Badge>
                    </Td>
                    <Td numeric>{formatDate(a.submitted_at)}</Td>
                    <Td>
                      <Urgency overdue={a.overdue} dueSoon={a.due_soon} due={a.review_due_by} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        ) : null}

        {view !== "loading" && !rows.length ? (
          <EmptyState
            title="Nothing to review"
            body="New Specialist, Pharmacy and Lab applications land here with a five-business-day review clock."
          />
        ) : null}
      </div>
    </>
  );
}

/** B8 / B9 — Application Detail and the decision panel over it. */
export function ApplicationDetail() {
  const { id } = useParams();
  const { data, update, toast } = usePrototype();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState<null | "approve" | "reject">(null);
  const [reason, setReason] = useState("");
  const [conflict, setConflict] = useState(false);

  const app = data.applicationDetails.find((a) => a.id === id);
  const queueRow = data.applicationsQueue.find((a) => a.id === id);
  const assignment = id ? assigneeOf(data, id) : undefined;
  const expectedRevision = id ? revisionOf(data, id) : 1;
  const auditEvents = id ? auditFor(data, id) : [];

  if (!app || (assignment && assignment !== STAFF_ID)) {
    return <EmptyState title="Application not found" body="It may already have been decided." />;
  }

  const isSpecialist = app.provider_type === "SPECIALIST";
  const expert = app.expert as Record<string, string | number> | undefined;
  const cacFailed = !isSpecialist && !app.cac_verified_at;
  // A 409 means another reviewer's decision may already have landed — the
  // banner above says so, but only disabling the button actually prevents
  // submitting a second, conflicting decision on top of it.
  const canDecide = !conflict && (isSpecialist ? true : checked && !cacFailed);
  const settled = app.status !== "PENDING";

  return (
    <>
      <PageHeader
        back={{ to: "/console/applications", label: "All applications" }}
        title={queueRow?.name ?? app.business_name ?? "Application"}
        description={
          <>
            {titleCase(app.provider_type)}{" "}
            {app.request_kind === "RENEWAL" ? "licence renewal" : "application"} · submitted{" "}
            {formatDate(app.submitted_at)}
            {app.request_kind === "RENEWAL" ? (
              <Badge tone="neutral" className="ml-2">
                Renewal
              </Badge>
            ) : null}
          </>
        }
        action={
          settled ? (
            <Badge tone={app.status === "APPROVED" ? "success" : "neutral"}>
              {titleCase(app.status)}
            </Badge>
          ) : (
            <Button onClick={() => setDecision("approve")} disabled={!canDecide}>
              Decide
            </Button>
          )
        }
      />

      <div data-screen="B8" className="space-y-4">
        <ScreenStates
          states={[
            { value: "normal", label: "Pending" },
            { value: "conflict", label: "409 already reviewed" },
          ]}
          value={conflict ? "conflict" : "normal"}
          onChange={(v) => setConflict(v === "conflict")}
        />

        {conflict ? (
          <Banner
            tone="warning"
            action={
              <Button size="sm" variant="secondary" onClick={() => setConflict(false)}>
                Refresh
              </Button>
            }
          >
            Already reviewed by another staff member. Refresh to see the current decision.
          </Banner>
        ) : null}

        {app.prior_rejection_reason ? (
          <Banner tone="info">
            Resubmission. Previously declined: “{app.prior_rejection_reason}”
          </Banner>
        ) : null}

        {app.license_document_flagged ? (
          <Banner tone="warning" icon={ShieldAlert}>
            This document was flagged during upload. Read it carefully before deciding.
          </Banner>
        ) : null}

        {cacFailed ? (
          <Banner tone="error">
            CAC verification failed or hasn't returned. Approval stays disabled until it resolves,
            or a reviewer overrides it with a documented reason.
          </Banner>
        ) : null}

        <div className="grid gap-4 @3xl:grid-cols-2">
          <Card>
            <p className="font-heading text-h3">{isSpecialist ? "Practitioner" : "Business"}</p>
            <dl className="mt-3 divide-y divide-base-300">
              {isSpecialist && expert ? (
                <>
                  <DataRow
                    label="Name"
                    value={`${expert.first_name} ${expert.last_name}`}
                    mono={false}
                  />
                  <DataRow
                    label="Professional type"
                    value={titleCase(String(expert.professional_type))}
                    mono={false}
                  />
                  <DataRow
                    label="Specialty"
                    value={titleCase(String(expert.specialty))}
                    mono={false}
                  />
                  <DataRow label="Email" value={String(expert.email)} />
                  <DataRow
                    label="Consultation fee"
                    value={naira(Number(expert.consultation_fee_kobo))}
                  />
                  <DataRow label="Years practising" value={String(expert.years_practising)} />
                </>
              ) : (
                <>
                  <DataRow label="Business name" value={app.business_name ?? "-"} mono={false} />
                  <DataRow label="Contact" value={app.contact_person ?? "-"} mono={false} />
                  <DataRow
                    label="Premises"
                    value={app.premises_address ?? "-"}
                    mono={false}
                    align="left"
                  />
                  {app.services_offered?.length ? (
                    <DataRow
                      label="Services"
                      value={app.services_offered.join(", ")}
                      mono={false}
                    />
                  ) : null}
                </>
              )}
            </dl>
          </Card>

          <Card>
            <p className="font-heading text-h3">Registration</p>
            <dl className="mt-3 divide-y divide-base-300">
              {!isSpecialist ? (
                <>
                  <DataRow label="CAC number" value={app.cac_number ?? "-"} />
                  <DataRow
                    label="CAC verified"
                    value={
                      app.cac_verified_at ? (
                        <span className="text-success">{formatDateTime(app.cac_verified_at)}</span>
                      ) : (
                        <span className="text-error">Not verified</span>
                      )
                    }
                  />
                </>
              ) : null}
              <DataRow
                label={
                  isSpecialist
                    ? "Licence number"
                    : app.provider_type === "PHARMACY"
                      ? "PCN licence"
                      : "MLSCN licence"
                }
                value={app.license_number ?? "-"}
              />
              {app.request_kind === "RENEWAL" ? (
                <DataRow
                  label="Prior expiry"
                  value={
                    app.prior_license_expiry_date ? formatDate(app.prior_license_expiry_date) : "-"
                  }
                />
              ) : null}
              {app.license_expiry_date ? (
                <DataRow
                  label={app.request_kind === "RENEWAL" ? "New expiry" : "Expiry date"}
                  value={
                    <span className="text-success">{formatDate(app.license_expiry_date)}</span>
                  }
                />
              ) : null}
              {app.license_verified_at ? (
                <DataRow label="Checked" value={formatDateTime(app.license_verified_at)} />
              ) : null}
            </dl>
            {app.license_verification_note ? (
              <p className="measure mt-3 border-t border-base-300 pt-3 text-body-sm text-base-content/70">
                {app.license_verification_note}
              </p>
            ) : null}
          </Card>
        </div>

        <Card>
          <p className="font-heading text-h3">
            {isSpecialist ? "Indemnity certificate" : "Licence document"}
          </p>
          {/* Viewable inline at real size — never a thumbnail behind a download. */}
          <div className="mt-3 flex h-80 items-center justify-center rounded-brand border border-base-300 bg-base-300">
            <div className="text-center">
              <FileText
                aria-hidden
                className="mx-auto size-8 text-base-content/40"
                strokeWidth={1.5}
              />
              <p className="mt-2 font-mono text-body-sm text-base-content/60">
                {app.license_document_url}
              </p>
            </div>
          </div>
        </Card>

        {!isSpecialist && !settled ? (
          <Card>
            <p className="font-heading text-h3">Manual register check</p>
            <p className="measure mt-1.5 text-body-sm text-base-content/70">
              Monovella has no automated access to the{" "}
              {app.provider_type === "PHARMACY" ? "PCN" : "MLSCN"} register, so this step is a
              person's. Tick it only after you've actually looked.
            </p>
            <div className="mt-4 space-y-3">
              <Checkbox
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                label={`I checked ${app.license_number} against the ${app.provider_type === "PHARMACY" ? "PCN" : "MLSCN"} register.`}
              />
              <Field label="What you found">
                {(p) => (
                  <Textarea
                    {...p}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Listed, active, premises address matches the application."
                  />
                )}
              </Field>
            </div>
          </Card>
        ) : null}

        {!settled ? (
          <div className="flex flex-wrap gap-2">
            <Button disabled={!canDecide} onClick={() => setDecision("approve")}>
              <Check aria-hidden className="size-4" strokeWidth={1.5} />
              Approve
            </Button>
            <Button variant="secondary" onClick={() => setDecision("reject")}>
              <X aria-hidden className="size-4" strokeWidth={1.5} />
              Decline
            </Button>
          </div>
        ) : null}

        {auditEvents.length ? (
          <Card>
            <p className="font-heading text-h3">Decision history</p>
            <dl className="mt-3 divide-y divide-base-300">
              {auditEvents.map((event) => (
                <DataRow
                  key={event.id}
                  label={titleCase(event.action)}
                  value={`${formatDateTime(event.occurred_at)} · ${event.actor_id}`}
                />
              ))}
            </dl>
          </Card>
        ) : null}
      </div>

      {/* B9 — the decision as a deliberate step, not a stray button. */}
      <Modal
        open={!!decision}
        onClose={() => setDecision(null)}
        title={decision === "reject" ? "Decline this application" : "Approve this application"}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDecision(null)}>
              Cancel
            </Button>
            <Button
              full
              variant={decision === "reject" ? "destructive" : "primary"}
              disabled={decision === "reject" && !reason.trim()}
              onClick={() => {
                let recorded = false;
                let unauthorized = false;
                update((d) => {
                  const result = decideGovernanceApplication(
                    d,
                    app.id,
                    expectedRevision,
                    decision === "reject" ? "REJECTED" : "APPROVED",
                    decision === "reject" ? reason.trim() : note.trim() || null,
                    STAFF_ID,
                  );
                  recorded = result.ok;
                  unauthorized = result.unauthorized;
                });
                if (!recorded) {
                  setDecision(null);
                  if (unauthorized) toast("This case is assigned to another staff member.");
                  else setConflict(true);
                  return;
                }
                toast(decision === "reject" ? "Application declined." : "Application approved.");
                setDecision(null);
                navigate("/console/applications");
              }}
            >
              {decision === "reject" ? "Decline" : "Approve"}
            </Button>
          </div>
        }
      >
        {decision === "reject" ? (
          <div className="space-y-3">
            <p className="measure text-body-sm text-base-content/75">
              The applicant reads this word for word on their own status screen. Be specific enough
              that they know what to fix.
            </p>
            <Field label="Reason">
              {(p) => (
                <Textarea
                  {...p}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="min-h-35"
                />
              )}
            </Field>
          </div>
        ) : (
          <p className="measure text-body">
            {queueRow?.name} will be able to take cases on Monovella immediately. Approve only if
            the licence check above is genuinely done.
          </p>
        )}
      </Modal>
    </>
  );
}

/** B11 — Checkout Exceptions Queue. Four possible raisers, not two. */
export function DisputesQueue() {
  const { data } = usePrototype();
  const navigate = useNavigate();
  const [view, setView] = useState<"populated" | "loading" | "empty">("populated");
  const rows = byUrgency(view === "empty" ? [] : data.disputeQueue);
  const payoutRows = byUrgency(
    view === "empty"
      ? []
      : data.payoutSupportRequests.filter((request) => request.status !== "REVERSED"),
  );

  return (
    <>
      <PageHeader
        title="Checkout exceptions"
        description="Refund, chargeback and provider-payout cases, raised by any of the four parties."
      />
      <div data-screen="B11" className="space-y-4">
        <ScreenStates
          states={[
            { value: "populated", label: "Populated" },
            { value: "loading", label: "Loading" },
            { value: "empty", label: "Empty" },
          ]}
          value={view}
          onChange={setView}
        />
        {view === "loading" ? <SkeletonRows rows={4} /> : null}
        {view !== "loading" && payoutRows.length ? (
          <Card>
            <p className="font-heading text-h3">Payout support</p>
            <p className="mt-1 text-body-sm text-base-content/65">
              Expert transfer cases. These do not reopen the patient's checkout.
            </p>
            <TableWrap className="mt-3">
              <Table>
                <thead>
                  <tr>
                    <Th>Reference</Th>
                    <Th>Expert</Th>
                    <Th>Status</Th>
                    <Th numeric>Amount</Th>
                    <Th>Review by</Th>
                  </tr>
                </thead>
                <tbody>
                  {payoutRows.map((request) => {
                    const payout = data.providerPayouts.find(
                      (item) => item.id === request.payout_id,
                    );
                    return (
                      <Tr
                        key={request.id}
                        overdue={request.overdue}
                        onClick={() => navigate(`/console/disputes/${request.id}`)}
                      >
                        <Td>
                          <Link
                            to={`/console/disputes/${request.id}`}
                            className="inline-flex min-h-11 items-center font-medium text-primary"
                          >
                            {request.id}
                          </Link>
                        </Td>
                        <Td>{payout?.account_name ?? request.expert_id}</Td>
                        <Td>
                          <Badge tone="warning">{titleCase(request.status)}</Badge>
                        </Td>
                        <Td numeric>{payout ? naira(payout.amount_kobo) : "-"}</Td>
                        <Td>
                          <Urgency
                            overdue={request.overdue}
                            dueSoon={request.due_soon}
                            due={request.review_due_by}
                          />
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </TableWrap>
          </Card>
        ) : null}
        {view !== "loading" && rows.length ? (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Exception</Th>
                  <Th>Raised by</Th>
                  {/* `provider_type` says which kind of provider the dispute
                      concerns — not who it is against. Label it as what it is. */}
                  <Th>Provider type</Th>
                  <Th numeric>Amount</Th>
                  <Th>Raised</Th>
                  <Th>Decide by</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <Tr
                    key={d.id}
                    overdue={d.overdue}
                    onClick={() => navigate(`/console/disputes/${d.id}`)}
                  >
                    <Td>
                      <Link
                        to={`/console/disputes/${d.id}`}
                        className="inline-flex min-h-6 items-center font-medium text-primary"
                      >
                        {d.subject}
                      </Link>
                    </Td>
                    <Td>{actorTypeLabel[d.raised_by]}</Td>
                    <Td>{titleCase(d.provider_type)}</Td>
                    <Td numeric>{naira(d.amount_kobo)}</Td>
                    <Td numeric>{formatDate(d.raised_at)}</Td>
                    <Td>
                      <Urgency overdue={d.overdue} dueSoon={d.due_soon} due={d.decision_due_by} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        ) : null}
        {view !== "loading" && !rows.length && !payoutRows.length ? (
          <EmptyState
            title="No open checkout exceptions"
            body="Refund, chargeback and payout exceptions appear here with a decision deadline."
          />
        ) : null}
      </div>
    </>
  );
}

/** B12 / B13 — Checkout Exception Detail with its lifecycle, then the ruling. */
export function DisputeDetail() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "conflict", "forbidden"],
    "this exception decision",
  );
  useTick();
  const { id } = useParams();
  const { data, update, toast } = usePrototype();
  const navigate = useNavigate();
  const [deciding, setDeciding] = useState(false);
  const [favors, setFavors] = useState<"PATIENT" | "PROVIDER">("PATIENT");
  const [text, setText] = useState("");
  const [conflict, setConflict] = useState(false);

  const payoutRequest = data.payoutSupportRequests.find((request) => request.id === id);
  const supportPayout = payoutRequest
    ? data.providerPayouts.find((item) => item.id === payoutRequest.payout_id)
    : undefined;

  if (payoutRequest && supportPayout) {
    const act = (action: "retry" | "reverse") => {
      const recordedAt = now().toISOString().slice(0, 19);
      update((draft) => {
        draft.payoutSupportRequests = draft.payoutSupportRequests.map((request) =>
          request.id === payoutRequest.id
            ? {
                ...request,
                status: action === "retry" ? "RETRYING" : "REVERSED",
                retry_requested_at: action === "retry" ? recordedAt : request.retry_requested_at,
                resolved_at: action === "reverse" ? recordedAt : null,
                resolution_note: text.trim(),
              }
            : request,
        );
        draft.providerPayouts = draft.providerPayouts.map((payout) =>
          payout.id === supportPayout.id
            ? {
                ...payout,
                status: action === "retry" ? "PROCESSING" : "REVERSED",
                failure_reason: action === "retry" ? null : payout.failure_reason,
              }
            : payout,
        );
      });
      toast(action === "retry" ? "Payout retry recorded." : "Payout reversal recorded.");
      setText("");
      if (action === "reverse") navigate("/console/disputes");
    };

    return (
      <>
        <PageHeader
          back={{ to: "/console/disputes", label: "All exceptions" }}
          title={`Payout support ${payoutRequest.id}`}
          description={`Raised ${formatDate(payoutRequest.raised_at)}`}
          action={<Badge tone="warning">{titleCase(payoutRequest.status)}</Badge>}
        />
        <div data-screen="B12" className="space-y-4">
          {mutation.node}
          <Banner tone="info">
            This case concerns Monovella's transfer to the expert. The patient checkout remains
            settled.
          </Banner>
          <div className="grid gap-4 @3xl:grid-cols-2">
            <Card>
              <p className="font-heading text-h3">Support request</p>
              <dl className="mt-3 divide-y divide-base-300">
                <DataRow label="Expert" value={supportPayout.account_name} mono={false} />
                <DataRow label="Payout" value={naira(supportPayout.amount_kobo)} />
                <DataRow
                  label="Transfer reference"
                  value={supportPayout.transfer_reference ?? "Not available"}
                />
                <DataRow
                  label="Payout status"
                  value={titleCase(supportPayout.status)}
                  mono={false}
                />
              </dl>
            </Card>
            <Card>
              <p className="font-heading text-h3">What the expert reported</p>
              <p className="measure mt-3 text-body">{payoutRequest.details}</p>
              {payoutRequest.resolution_note ? (
                <p className="measure mt-3 border-t border-base-300 pt-3 text-body-sm">
                  Latest staff note: {payoutRequest.resolution_note}
                </p>
              ) : null}
            </Card>
          </div>
          {payoutRequest.status !== "REVERSED" ? (
            <Card>
              <Field label="Staff note">
                {(props) => (
                  <Textarea
                    {...props}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                  />
                )}
              </Field>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button disabled={!text.trim()} onClick={() => act("retry")}>
                  Retry transfer
                </Button>
                <Button
                  variant="destructive"
                  disabled={!text.trim()}
                  onClick={() => act("reverse")}
                >
                  Confirm reversal
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      </>
    );
  }

  const row = data.disputeQueue.find((d) => d.id === id);
  const dispute = data.disputes.find((d) => d.id === id);
  const assignment = id ? assigneeOf(data, id) : undefined;
  const expectedRevision = id ? revisionOf(data, id) : 1;
  const auditEvents = id ? auditFor(data, id) : [];
  if (!dispute || (assignment && assignment !== STAFF_ID)) {
    return <EmptyState title="Exception not found" body="It may already have been resolved." />;
  }

  const consultation = dispute.consultation_id
    ? consultationById(data, dispute.consultation_id)
    : undefined;
  const providerRequest = dispute.provider_request_id
    ? data.providerRequests.find((r) => r.id === dispute.provider_request_id)
    : undefined;
  const checkout = providerRequest?.checkout_payment_id
    ? data.checkoutPayments.find((payment) => payment.id === providerRequest.checkout_payment_id)
    : consultation
      ? data.checkoutPayments.find(
          (payment) => payment.consultation_id === consultation.id && !payment.provider_request_id,
        )
      : undefined;
  const payout = checkout
    ? data.providerPayouts.find((item) => item.checkout_payment_id === checkout.id)
    : undefined;

  return (
    <>
      <PageHeader
        back={{ to: "/console/disputes", label: "All exceptions" }}
        title={row?.subject ?? "Checkout exception"}
        description={`Raised by the ${actorTypeLabel[dispute.raised_by].toLowerCase()} on ${formatDate(dispute.raised_at)}`}
        action={
          dispute.decision_final ? (
            <Badge tone="success">Resolved</Badge>
          ) : (
            <Button onClick={() => setDeciding(true)}>Decide</Button>
          )
        }
      />

      <div data-screen="B12" className="space-y-4">
        <ScreenStates
          states={[
            { value: "normal", label: "Current" },
            { value: "conflict", label: "409 already decided" },
          ]}
          value={conflict ? "conflict" : "normal"}
          onChange={(value) => setConflict(value === "conflict")}
        />
        {conflict ? (
          <Banner tone="warning">
            Another assigned staff member already decided this record. Refresh to see the current
            decision.
          </Banner>
        ) : null}
        {row?.overdue ? <Banner tone="error">This decision is overdue.</Banner> : null}

        <div className="grid gap-4 @3xl:grid-cols-2">
          <Card>
            <p className="font-heading text-h3">Checkout context</p>
            <dl className="mt-3 divide-y divide-base-300">
              <DataRow
                label="Amount stated"
                value={naira(row?.amount_kobo ?? checkout?.total_amount_kobo ?? 0)}
              />
              {consultation ? (
                <>
                  <DataRow
                    label="Patient"
                    value={patientName(data, consultation.patient_identity_id)}
                    mono={false}
                  />
                  <DataRow
                    label="Provider"
                    value={expertName(data, consultation.expert_id)}
                    mono={false}
                  />
                  <DataRow label="Consultation" value={formatDate(consultation.scheduled_start)} />
                </>
              ) : null}
              {providerRequest ? (
                <DataRow
                  label="Provider"
                  value={providerById(data, providerRequest.provider_id)?.business_name ?? ""}
                  mono={false}
                />
              ) : null}
            </dl>
          </Card>

          <Card>
            <p className="font-heading text-h3">Checkout record</p>
            <dl className="mt-3 divide-y divide-base-300">
              {checkout ? (
                <>
                  <DataRow label="Reference" value={checkout.nomba_order_reference} />
                  <DataRow label="Total" value={naira(checkout.total_amount_kobo)} />
                  <DataRow label="Status" value={checkout.status} mono={false} />
                  <DataRow label="Paid" value={formatDateTime(checkout.paid_at)} />
                  {payout ? (
                    <>
                      <DataRow label="Payout" value={titleCase(payout.status)} mono={false} />
                      <DataRow
                        label="Transfer reference"
                        value={payout.transfer_reference ?? "Not initiated"}
                      />
                      {payout.failure_reason ? (
                        <DataRow label="Payout issue" value={payout.failure_reason} mono={false} />
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : providerRequest ? (
                <DataRow
                  label="Order status"
                  value={providerRequest.order_status ?? "-"}
                  mono={false}
                />
              ) : (
                <DataRow label="Checkout" value="No linked checkout record" mono={false} />
              )}
            </dl>
          </Card>
        </div>

        {dispute.decision_final ? (
          <Card>
            <p className="font-heading text-h3">Decision</p>
            <p className="measure mt-2 text-body">{dispute.decision}</p>
          </Card>
        ) : dispute.decision_due_by ? (
          <Card>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-body-sm text-base-content/60">Decision due</span>
              <Countdown deadline={dispute.decision_due_by} elapsedText="overdue" />
            </div>
          </Card>
        ) : null}
        {auditEvents.length ? (
          <Card>
            <p className="font-heading text-h3">Decision history</p>
            <dl className="mt-3 divide-y divide-base-300">
              {auditEvents.map((event) => (
                <DataRow
                  key={event.id}
                  label={titleCase(event.action)}
                  value={`${formatDateTime(event.occurred_at)} · ${event.actor_id}`}
                />
              ))}
            </dl>
          </Card>
        ) : null}
      </div>

      <Modal
        open={deciding}
        onClose={() => setDeciding(false)}
        title="Resolve this checkout exception"
        footer={
          <Button
            full
            disabled={!text.trim()}
            onClick={() => {
              let recorded = false;
              let unauthorized = false;
              update((d) => {
                const result = decideDispute(
                  d,
                  dispute.id,
                  expectedRevision,
                  favors,
                  text.trim(),
                  STAFF_ID,
                );
                recorded = result.ok;
                unauthorized = result.unauthorized;
              });
              if (!recorded) {
                setDeciding(false);
                if (unauthorized) toast("This case is assigned to another staff member.");
                else setConflict(true);
                return;
              }
              toast("Decision recorded.");
              setDeciding(false);
              navigate("/console/disputes");
            }}
          >
            Record the decision
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-label font-medium">In favour of</p>
            <div className="flex gap-2">
              <Chip selected={favors === "PATIENT"} onClick={() => setFavors("PATIENT")}>
                Patient
              </Chip>
              <Chip selected={favors === "PROVIDER"} onClick={() => setFavors("PROVIDER")}>
                Provider
              </Chip>
            </div>
          </div>
          <Field
            label="Your reasoning"
            hint="Both parties read this on their own status screen. A one-word verdict helps nobody."
          >
            {(p) => (
              <Textarea
                {...p}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[160px]"
              />
            )}
          </Field>
        </div>
      </Modal>
    </>
  );
}

/** B14 — Refund Requests Queue. The same shared queue-list, third instance. */
export function RefundsQueue() {
  const { data } = usePrototype();
  const navigate = useNavigate();
  const [view, setView] = useState<"populated" | "loading" | "empty">("populated");
  const rows = byUrgency(view === "empty" ? [] : data.refundQueue);

  return (
    <>
      <PageHeader
        title="Refund requests"
        description="Patient-filed non-performance claims against Monovella's own fee."
      />
      <div data-screen="B14" className="space-y-4">
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
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Patient</Th>
                  <Th>Reason</Th>
                  <Th numeric>Amount</Th>
                  <Th>Filed</Th>
                  <Th>Decide by</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Tr
                    key={r.id}
                    overdue={r.overdue}
                    onClick={() => navigate(`/console/refunds/${r.id}`)}
                  >
                    <Td>
                      <Link
                        to={`/console/refunds/${r.id}`}
                        className="inline-flex min-h-6 items-center font-medium text-primary"
                      >
                        {patientName(data, r.patient_id)}
                      </Link>
                    </Td>
                    <Td>{titleCase(r.reason)}</Td>
                    <Td numeric>{naira(r.amount_kobo)}</Td>
                    <Td numeric>{formatDate(r.filed_at)}</Td>
                    <Td>
                      <Urgency overdue={r.overdue} dueSoon={r.due_soon} />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        ) : null}
        {view !== "loading" && !rows.length ? (
          <EmptyState
            title="No refund requests open"
            body="Patients have 7 days from acceptance to file one."
          />
        ) : null}
      </div>
    </>
  );
}

/** B15 / B16 — Refund Request Detail and the ruling. */
export function RefundDetail() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "conflict", "forbidden", "not_found"],
    "this refund decision",
  );
  const { id } = useParams();
  const { data, update, toast } = usePrototype();
  const navigate = useNavigate();
  const [deciding, setDeciding] = useState(false);
  const [issue, setIssue] = useState(true);
  const [text, setText] = useState("");

  const request = data.refundRequests.find((r) => r.id === id);
  if (!request) {
    return <EmptyState title="Refund request not found" body="It may already have been decided." />;
  }

  const consultation = consultationById(data, request.consultation_id);
  const accepted = consultation?.responded_at;
  const daysSinceAccept = accepted
    ? Math.floor(
        (new Date(`${request.filed_at}Z`).getTime() - new Date(`${accepted}Z`).getTime()) /
          86_400_000,
      )
    : null;

  return (
    <>
      <PageHeader
        back={{ to: "/console/refunds", label: "All refund requests" }}
        title={
          consultation ? patientName(data, consultation.patient_identity_id) : "Refund request"
        }
        description={`Filed ${formatDate(request.filed_at)} · ${titleCase(request.reason ?? "NON_PERFORMANCE")}`}
        action={
          request.decision_final ? (
            <Badge tone={request.refund_issued ? "success" : "neutral"}>Decided</Badge>
          ) : (
            <Button disabled={mutation.blocked} onClick={() => setDeciding(true)}>
              Decide
            </Button>
          )
        }
      />

      <div data-screen="B15" className="space-y-4">
        {mutation.node}
        <div className="grid gap-4 @3xl:grid-cols-2">
          <Card>
            <p className="font-heading text-h3">Eligibility</p>
            <dl className="mt-3 divide-y divide-base-300">
              <DataRow label="Consultation accepted" value={formatDate(accepted)} />
              <DataRow label="Request filed" value={formatDate(request.filed_at)} />
              <DataRow
                label="Days since acceptance"
                value={
                  daysSinceAccept == null ? (
                    "-"
                  ) : (
                    <span className={daysSinceAccept <= 7 ? "text-success" : "text-error"}>
                      {daysSinceAccept} {daysSinceAccept === 1 ? "day" : "days"} (
                      {daysSinceAccept <= 7 ? "within the 7-day window" : "past the 7-day window"})
                    </span>
                  )
                }
              />
            </dl>
          </Card>

          <Card>
            <p className="font-heading text-h3">The consultation</p>
            <dl className="mt-3 divide-y divide-base-300">
              {consultation ? (
                <>
                  <DataRow
                    label="Expert"
                    value={expertName(data, consultation.expert_id)}
                    mono={false}
                  />
                  <DataRow label="Status" value={titleCase(consultation.status)} mono={false} />
                  <DataRow label="Scheduled" value={formatDateTime(consultation.scheduled_start)} />
                  <DataRow label="Monovella's fee" value={naira(consultation.platform_fee_kobo)} />
                </>
              ) : null}
            </dl>
          </Card>
        </div>

        {request.elaboration ? (
          <Card>
            <p className="font-heading text-h3">What the patient said</p>
            <p className="measure mt-2 text-body">“{request.elaboration}”</p>
          </Card>
        ) : null}

        {request.decision_final ? (
          <Card>
            <p className="font-heading text-h3">Decision</p>
            <p className="measure mt-2 text-body">{request.decision}</p>
            <p className="mt-3 text-body-sm text-base-content/65">
              Refund issued: {request.refund_issued ? "Yes" : "No"}
            </p>
          </Card>
        ) : null}
      </div>

      <Modal
        open={deciding}
        onClose={() => setDeciding(false)}
        title="Decide this refund request"
        footer={
          <Button
            full
            disabled={!text.trim()}
            onClick={() => {
              update((d) => {
                d.refundRequests = d.refundRequests.map((r) =>
                  r.id === request.id
                    ? {
                        ...r,
                        decision: text,
                        decision_final: true,
                        refund_issued: issue,
                        decided_at: now().toISOString().slice(0, 19),
                      }
                    : r,
                );
                d.refundQueue = d.refundQueue.filter((r) => r.id !== request.id);
              });
              toast("Decision recorded.");
              setDeciding(false);
              navigate("/console/refunds");
            }}
          >
            Record the decision
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-label font-medium">Outcome</p>
            <div className="flex gap-2">
              <Chip selected={issue} onClick={() => setIssue(true)}>
                Issue the refund
              </Chip>
              <Chip selected={!issue} onClick={() => setIssue(false)}>
                Decline it
              </Chip>
            </div>
          </div>
          <Field label="Your reasoning" hint="The patient reads this on their own status screen.">
            {(p) => (
              <Textarea
                {...p}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-[160px]"
              />
            )}
          </Field>
        </div>
      </Modal>
    </>
  );
}

/** B17 — Standing Queue. Event-type chips show directly in the list. */
export function StandingQueue() {
  const { data } = usePrototype();
  const navigate = useNavigate();
  const [view, setView] = useState<"populated" | "loading" | "empty">("populated");
  const rows = byUrgency(view === "empty" ? [] : data.standingQueue);

  return (
    <>
      <PageHeader
        title="Standing"
        description="Accounts currently suspended pending review: patients, experts, pharmacies and labs."
      />
      <div data-screen="B17" className="space-y-4">
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
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Account</Th>
                  <Th>Type</Th>
                  <Th>Suspended</Th>
                  <Th>Review</Th>
                  <Th>What triggered it</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <Tr
                    key={s.id}
                    overdue={s.overdue}
                    onClick={() => navigate(`/console/standing/${s.id}`)}
                  >
                    <Td>
                      <Link
                        to={`/console/standing/${s.id}`}
                        className="inline-flex min-h-6 items-center font-medium text-primary"
                      >
                        {s.name}
                      </Link>
                    </Td>
                    <Td>{actorTypeLabel[s.actor_type]}</Td>
                    <Td numeric>{formatDate(s.standing_suspended_at)}</Td>
                    <Td>
                      <Urgency overdue={s.overdue} dueSoon={s.due_soon} />
                    </Td>
                    <Td>
                      <span className="flex flex-wrap gap-1.5">
                        {s.events.map((e, i) => (
                          <Badge
                            key={`${e}-${i}`}
                            tone={e === "FALSE_PAYMENT_CLAIM" ? "error" : "warning"}
                          >
                            {standingEventLabel[e]}
                          </Badge>
                        ))}
                      </span>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        ) : null}
        {view !== "loading" && !rows.length ? (
          <EmptyState
            title="Nobody is suspended"
            body="Accounts that accumulate standing events appear here for review."
          />
        ) : null}
      </div>
    </>
  );
}

/** B18 / B19 — Standing Detail as a factual timeline, then lift or uphold. */
export function StandingDetail() {
  const { id } = useParams();
  const { data, update, toast } = usePrototype();
  const navigate = useNavigate();
  const [deciding, setDeciding] = useState<null | "lift" | "uphold">(null);
  const [note, setNote] = useState("");
  const [conflict, setConflict] = useState(false);
  const item = data.standingQueue.find((s) => s.id === id);
  const assignment = id ? assigneeOf(data, id) : undefined;
  const expectedRevision = id ? revisionOf(data, id) : 1;
  const auditEvents = id ? auditFor(data, id) : [];

  if (!item || (assignment && assignment !== STAFF_ID)) {
    return (
      <EmptyState title="Suspended account not found" body="It may already have been resolved." />
    );
  }
  const automaticCredentialCase =
    item.events.length === 1 &&
    item.events[0] === "CREDENTIAL_EXPIRED" &&
    !!item.linked_application_id;

  return (
    <>
      <PageHeader
        back={{ to: "/console/standing", label: "All standing cases" }}
        title={item.name ?? "Account"}
        description={`${actorTypeLabel[item.actor_type]} · suspended ${formatDate(item.standing_suspended_at)}`}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDeciding("uphold")}>
              Uphold
            </Button>
            <Button disabled={automaticCredentialCase} onClick={() => setDeciding("lift")}>
              Lift
            </Button>
          </div>
        }
      />

      <div data-screen="B18" className="space-y-4">
        <ScreenStates
          states={[
            { value: "normal", label: "Current" },
            { value: "conflict", label: "409 already decided" },
          ]}
          value={conflict ? "conflict" : "normal"}
          onChange={(value) => setConflict(value === "conflict")}
        />
        {conflict ? (
          <Banner tone="warning">
            Another assigned staff member already decided this case. Refresh before taking another
            action.
          </Banner>
        ) : null}
        {item.events.includes("CREDENTIAL_EXPIRED") ? (
          <Banner tone="info">
            Resolves automatically once the pending licence renewal is approved. No lift needed here
            unless the account never actually submitted one.
          </Banner>
        ) : null}
        <Card>
          <p className="font-heading text-h3">Event history</p>
          <ol className="mt-4 space-y-4">
            {(item.event_log ?? []).map((e, i) => (
              <li key={`${e.type}-${i}`} className="flex gap-4">
                <span className="w-24 shrink-0 font-mono text-body-sm tabular text-base-content/55">
                  {formatDate(e.occurred_at)}
                </span>
                <span className="min-w-0 flex-1">
                  <Badge tone={e.type === "FALSE_PAYMENT_CLAIM" ? "error" : "warning"}>
                    {standingEventLabel[e.type]}
                  </Badge>
                  <span className="measure mt-1.5 block text-body-sm text-base-content/80">
                    {e.detail}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
        {auditEvents.length ? (
          <Card>
            <p className="font-heading text-h3">Decision history</p>
            <dl className="mt-3 divide-y divide-base-300">
              {auditEvents.map((event) => (
                <DataRow
                  key={event.id}
                  label={titleCase(event.action)}
                  value={`${formatDateTime(event.occurred_at)} · ${event.actor_id}`}
                />
              ))}
            </dl>
          </Card>
        ) : null}
      </div>

      <Modal
        open={!!deciding}
        onClose={() => setDeciding(null)}
        title={deciding === "lift" ? "Lift this suspension?" : "Uphold this suspension?"}
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDeciding(null)}>
              Cancel
            </Button>
            <Button
              full
              disabled={!note.trim()}
              onClick={() => {
                let recorded = false;
                let unauthorized = false;
                update((d) => {
                  const result = decideStanding(
                    d,
                    item.id,
                    expectedRevision,
                    deciding === "lift" ? "LIFTED" : "UPHELD",
                    note.trim(),
                    STAFF_ID,
                  );
                  recorded = result.ok;
                  unauthorized = result.unauthorized;
                });
                if (!recorded) {
                  setDeciding(null);
                  if (unauthorized) toast("This case is assigned to another staff member.");
                  else setConflict(true);
                  return;
                }
                toast(deciding === "lift" ? "Suspension lifted." : "Suspension upheld.");
                setDeciding(null);
                navigate("/console/standing");
              }}
            >
              {deciding === "lift" ? "Lift it" : "Uphold it"}
            </Button>
          </div>
        }
      >
        <p className="measure text-body">
          {deciding === "lift"
            ? `${item.name} gets full access back immediately. The event history stays on the record.`
            : `${item.name} stays restricted. Nothing else changes, and the case stays in this queue.`}
        </p>
        <div className="mt-4">
          <Field label="Decision note">
            {(props) => (
              <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} />
            )}
          </Field>
        </div>
      </Modal>
    </>
  );
}

/** B20 / B21 / B22 — Staff accounts, provisioning, deactivation. */
export function StaffAccounts() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "conflict", "forbidden", "validation"],
    "this staff account",
  );
  const { data, update, toast, nextId } = usePrototype();
  const [provisioning, setProvisioning] = useState(false);
  const [deactivating, setDeactivating] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [staffError, setStaffError] = useState<string | null>(null);
  const target = data.staffAccounts.find((s) => s.id === deactivating);

  return (
    <>
      <PageHeader
        title="Staff accounts"
        description="Provisioned access, not self-signup. Staff can act only on assigned operational cases."
        action={
          <Button disabled={mutation.blocked} onClick={() => setProvisioning(true)}>
            Provision an account
          </Button>
        }
      />

      <div data-screen="B20" className="space-y-4">
        {mutation.node}
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th> </Th>
              </tr>
            </thead>
            <tbody>
              {data.staffAccounts.map((s) => (
                <Tr key={s.id} muted={!!s.revoked_at}>
                  <Td className={s.revoked_at ? "line-through" : ""}>
                    {s.name}
                    {s.id === STAFF_ID ? (
                      <span className="ml-1.5 text-body-sm text-base-content/50">(you)</span>
                    ) : null}
                  </Td>
                  <Td className="font-mono text-record">{s.email}</Td>
                  <Td>{titleCase(s.role)}</Td>
                  <Td>
                    {s.revoked_at ? (
                      <Badge>Revoked {formatDate(s.revoked_at)}</Badge>
                    ) : s.must_change_password ? (
                      <Badge tone="warning">Password change pending</Badge>
                    ) : (
                      <Badge tone="success">Active</Badge>
                    )}
                  </Td>
                  <Td>
                    {s.revoked_at ? null : s.id === STAFF_ID ? (
                      <span className="text-body-sm text-base-content/45">Ask another admin</span>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setDeactivating(s.id)}>
                        Deactivate
                      </Button>
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>

        <p className="measure text-body-sm text-base-content/60">
          Platform Admin is the only fixture role today. Case assignment still limits which
          operational records a signed-in staff member may open or decide.
        </p>
        {staffError ? (
          <Banner
            tone="warning"
            action={
              <Button size="sm" variant="secondary" onClick={() => setStaffError(null)}>
                Refresh
              </Button>
            }
          >
            {staffError}
          </Banner>
        ) : null}
      </div>

      <Sheet
        open={provisioning}
        onClose={() => {
          setProvisioning(false);
          setTempPassword(null);
          setRevealed(false);
        }}
        irreversible={!!tempPassword}
        title={tempPassword ? "Temporary password" : "Provision a staff account"}
        footer={
          tempPassword ? (
            <Button
              full
              onClick={() => {
                setProvisioning(false);
                setTempPassword(null);
                setRevealed(false);
                setName("");
                setEmail("");
                setPhone("");
              }}
            >
              I've copied it
            </Button>
          ) : (
            <Button
              full
              disabled={!name.trim() || !email.includes("@") || !phone.trim()}
              onClick={() => {
                const staffId = nextId("stf");
                let created = false;
                update((d) => {
                  created = provisionStaff(
                    d,
                    {
                      id: staffId,
                      name,
                      email,
                      phone,
                      role: "PLATFORM_ADMIN",
                      revoked_at: null,
                      must_change_password: true,
                    },
                    STAFF_ID,
                  );
                });
                if (!created) {
                  setStaffError(
                    "That work email already exists, or your admin access is no longer active.",
                  );
                  setProvisioning(false);
                  return;
                }
                setTempPassword("Tf7q-Rm2v-Xk9d-P4az");
              }}
            >
              Create the account
            </Button>
          )
        }
      >
        {tempPassword ? (
          <div className="space-y-3">
            <Banner tone="warning">
              This is shown once and never again. Copy it now and give it to {name} directly.
            </Banner>
            <div className="flex items-center gap-2 rounded-brand border border-base-300 bg-base-200 p-3">
              <span className="min-w-0 flex-1 truncate font-mono text-record">
                {revealed ? tempPassword : "••••••••••••••••••••"}
              </span>
              <IconButton
                label={revealed ? "Hide password" : "Reveal password"}
                onClick={() => setRevealed((current) => !current)}
              >
                {revealed ? (
                  <EyeOff aria-hidden className="size-4" strokeWidth={1.5} />
                ) : (
                  <Eye aria-hidden className="size-4" strokeWidth={1.5} />
                )}
              </IconButton>
              <CopyButton iconOnly text={tempPassword} label="Copy password" />
            </div>
            <p className="measure text-body-sm text-base-content/65">
              They'll be forced to change it on first sign-in.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label="Full name">
              {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}
            </Field>
            <Field label="Work email">
              {(p) => (
                <Input
                  {...p}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@monovella.com"
                />
              )}
            </Field>
            <Field label="Contact phone">
              {(p) => (
                <Input
                  {...p}
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+234 803 000 1014"
                />
              )}
            </Field>
          </div>
        )}
      </Sheet>

      <Modal
        open={!!deactivating}
        onClose={() => setDeactivating(null)}
        title="Deactivate this account?"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDeactivating(null)}>
              Cancel
            </Button>
            <Button
              full
              variant="destructive"
              onClick={() => {
                const expectedRevision = deactivating ? revisionOf(data, deactivating) : 1;
                let deactivated = false;
                let unauthorized = false;
                update((d) => {
                  const result = deactivateStaff(d, deactivating ?? "", expectedRevision, STAFF_ID);
                  deactivated = result.ok;
                  unauthorized = "unauthorized" in result && result.unauthorized === true;
                });
                if (!deactivated) {
                  setStaffError(
                    unauthorized
                      ? "You cannot deactivate this account."
                      : "Another staff member already changed this account. Refresh the roster.",
                  );
                  setDeactivating(null);
                  return;
                }
                toast("Access revoked.");
                setDeactivating(null);
              }}
            >
              Deactivate
            </Button>
          </div>
        }
      >
        <p className="measure text-body">
          {target?.name} loses access immediately, and every session they hold is revoked. Their
          past decisions stay on the record with their name against them.
        </p>
      </Modal>
    </>
  );
}

/**
 * B23 — My Profile. Self-service for the signed-in staff member — distinct
 * from B20-22, which is one admin managing *other* staff accounts.
 */
export function StaffProfile() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation"],
    "your staff profile",
  );
  const { data, update, toast } = usePrototype();
  const navigate = useNavigate();
  const self = data.staffAccounts.find((s) => s.id === STAFF_ID);
  const [name, setName] = useState(self?.name ?? "");
  const [phone, setPhone] = useState(self?.phone ?? "");
  const [photo, setPhoto] = useState<string | null>(self?.photo_url ?? null);
  const [changingPassword, setChangingPassword] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [wrong, setWrong] = useState(false);
  const [managingTwoFactor, setManagingTwoFactor] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const prefs = notificationPrefsFor(data, "staff");
  const twoFactor = twoFactorFor(data, "staff");

  if (!self) return null;

  return (
    <>
      <PageHeader title="My profile" description="Your own account, not the staff roster." />
      <div data-screen="B23" className="max-w-2xl space-y-5">
        {mutation.node}
        <Card>
          <div className="flex items-center gap-4">
            <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-h2 text-primary-content">
              {photo ? (
                <img src={photo} alt="" className="size-16 rounded-full object-cover" />
              ) : (
                name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
              )}
            </span>
            <FileDrop
              label={photo ? "Change photo" : "Add a photo"}
              accept="JPG or PNG"
              filename={photo ? "profile-photo.jpg" : null}
              onPick={() => setPhoto("/avatars/placeholder.svg")}
            />
          </div>
          <div className="mt-4">
            <Field label="Name">
              {(p) => <Input {...p} value={name} onChange={(e) => setName(e.target.value)} />}
            </Field>
            <Field label="Contact phone">
              {(p) => (
                <Input
                  {...p}
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              )}
            </Field>
          </div>
          <dl className="mt-4 divide-y divide-base-300 border-t border-base-300 pt-1">
            <DataRow label="Email" value={self.email} mono />
            <DataRow label="Role" value="Platform admin" mono={false} />
          </dl>
          <Button
            className="mt-4"
            onClick={() => {
              update((d) => {
                const target = d.staffAccounts.find((s) => s.id === STAFF_ID);
                if (target) {
                  target.name = name;
                  target.phone = phone;
                  target.photo_url = photo;
                }
              });
              toast("Profile saved.");
            }}
          >
            Save changes
          </Button>
        </Card>

        <Card>
          <p className="font-heading text-h3">Notifications</p>
          <div className="mt-2">
            <Checkbox
              label="Queue overdue alerts"
              description="When something in your queues passes its review deadline."
              checked={!!prefs.queue_overdue_alerts}
              onChange={() => {
                update((draft) => {
                  const row = notificationPrefsFor(draft, "staff");
                  row.queue_overdue_alerts = !row.queue_overdue_alerts;
                });
                toast("Saved.");
              }}
            />
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-heading text-h3">Password</p>
              <p className="mt-1 text-body-sm text-base-content/65">
                Change the password you sign in with.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setChangingPassword(true)}>
              Change password
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-heading text-h3">
                <ShieldCheck aria-hidden className="size-5 text-success" strokeWidth={1.5} />
                Two-step verification
              </p>
              <p className="mt-1 text-body-sm text-base-content/65">
                {twoFactor.enabled
                  ? `Authenticator app on · ${twoFactor.recovery_codes_remaining} recovery codes left.`
                  : "Required for staff accounts before production access."}
              </p>
            </div>
            <Button variant="secondary" onClick={() => setManagingTwoFactor(true)}>
              Manage
            </Button>
          </div>
        </Card>

        <button
          type="button"
          className="inline-flex min-h-11 items-center text-label text-error"
          onClick={() => {
            updateAuthJourney((draft) => {
              draft.web_sessions.STAFF.authenticated = false;
            });
            navigate("/console/sign-in");
          }}
        >
          Sign out
        </button>

        <Modal
          open={changingPassword}
          onClose={() => setChangingPassword(false)}
          title="Change password"
          footer={
            <>
              <Button variant="secondary" onClick={() => setChangingPassword(false)}>
                Cancel
              </Button>
              <Button
                disabled={!current || next.length < 8}
                onClick={() => {
                  if (current !== "password123") {
                    setWrong(true);
                    return;
                  }
                  setChangingPassword(false);
                  setCurrent("");
                  setNext("");
                  toast("Password changed.");
                }}
              >
                Save
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Current password" error={wrong ? "Incorrect current password." : null}>
              {(p) => (
                <Input
                  {...p}
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => {
                    setCurrent(e.target.value);
                    setWrong(false);
                  }}
                />
              )}
            </Field>
            <Field label="New password" hint="At least 8 characters.">
              {(p) => (
                <Input
                  {...p}
                  type="password"
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                />
              )}
            </Field>
          </div>
        </Modal>

        <Modal
          open={managingTwoFactor}
          onClose={() => setManagingTwoFactor(false)}
          title="Two-step verification"
          footer={
            <Button
              disabled={twoFactorCode.length < 6}
              onClick={() => {
                update((draft) => {
                  twoFactorFor(draft, "staff").recovery_codes_remaining = 8;
                });
                setTwoFactorCode("");
                setManagingTwoFactor(false);
                toast("New recovery codes prepared.");
              }}
            >
              Confirm and refresh codes
            </Button>
          }
        >
          <div className="space-y-3">
            <p className="measure text-body-sm text-base-content/70">
              Staff two-step verification stays required. In the real product, a fresh password and
              authenticator code are required before replacing recovery codes. This prototype never
              displays the codes or a factor secret.
            </p>
            <Field label="Six-digit authenticator code">
              {(p) => (
                <Input
                  {...p}
                  inputMode="numeric"
                  value={twoFactorCode}
                  onChange={(event) =>
                    setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                />
              )}
            </Field>
          </div>
        </Modal>
      </div>
    </>
  );
}

/** B24 — Clinical Safety Queue. Care concerns never enter payment workflows. */
export function ClinicalSafetyQueue() {
  const { data } = usePrototype();
  const navigate = useNavigate();
  const rows = byUrgency(
    data.clinicalComplaintReferrals.filter((complaint) => complaint.status !== "CLOSED"),
  );

  return (
    <>
      <PageHeader
        title="Clinical safety"
        description="Patient concerns about care, reviewed separately from refunds and checkout exceptions."
      />
      <div data-screen="B24" className="space-y-4">
        <Banner tone="info" icon={HeartPulse}>
          Review the care concern and consultation record. Do not make payment decisions here.
        </Banner>
        {rows.length ? (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Patient</Th>
                  <Th>Status</Th>
                  <Th>Filed</Th>
                  <Th>Respond by</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((complaint) => (
                  <Tr
                    key={complaint.id}
                    overdue={complaint.overdue}
                    onClick={() => navigate(`/console/clinical-safety/${complaint.id}`)}
                  >
                    <Td>
                      <Link
                        to={`/console/clinical-safety/${complaint.id}`}
                        className="inline-flex min-h-11 items-center font-medium text-primary"
                      >
                        {complaint.id}
                      </Link>
                    </Td>
                    <Td>{patientName(data, complaint.patient_id)}</Td>
                    <Td>
                      <Badge tone="warning">{titleCase(complaint.status)}</Badge>
                    </Td>
                    <Td numeric>{formatDate(complaint.filed_at)}</Td>
                    <Td>
                      <Urgency
                        overdue={complaint.overdue}
                        dueSoon={complaint.due_soon}
                        due={complaint.expected_response_by}
                      />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        ) : (
          <EmptyState
            title="No clinical concerns awaiting review"
            body="New patient care concerns appear here with a response window."
          />
        )}
      </div>
    </>
  );
}

/** B25 — Clinical Safety Detail and review action. */
export function ClinicalSafetyDetail() {
  const { id } = useParams();
  const { data, update, toast } = usePrototype();
  const navigate = useNavigate();
  const [outcome, setOutcome] = useState("");
  const [conflict, setConflict] = useState(false);
  const complaint = data.clinicalComplaintReferrals.find((item) => item.id === id);
  const consultation = complaint ? consultationById(data, complaint.consultation_id) : undefined;

  if (!complaint || !consultation) {
    return <EmptyState title="Clinical concern not found" body="It may no longer be available." />;
  }

  const startReview = () => {
    const reviewedAt = now().toISOString().slice(0, 19);
    update((draft) => {
      draft.clinicalComplaintReferrals = draft.clinicalComplaintReferrals.map((item) =>
        item.id === complaint.id
          ? {
              ...item,
              status: "UNDER_REVIEW",
              assigned_staff_id: STAFF_ID,
              reviewed_at: reviewedAt,
              audit_history: [
                ...item.audit_history,
                { at: reviewedAt, actor_type: "STAFF", action: "REVIEW_STARTED", note: null },
              ],
            }
          : item,
      );
    });
    toast("Clinical review started.");
  };

  const setTriage = (triage: "ROUTINE" | "URGENT_SAFETY" | "IMMEDIATE_EMERGENCY") => {
    const triagedAt = now().toISOString().slice(0, 19);
    const responseHours = triage === "ROUTINE" ? 48 : triage === "URGENT_SAFETY" ? 4 : 0;
    const responseBy = new Date(now().getTime() + responseHours * 3_600_000)
      .toISOString()
      .slice(0, 19);
    update((draft) => {
      draft.clinicalComplaintReferrals = draft.clinicalComplaintReferrals.map((item) =>
        item.id === complaint.id
          ? {
              ...item,
              triage,
              expected_response_by: responseBy,
              audit_history: [
                ...item.audit_history,
                { at: triagedAt, actor_type: "STAFF", action: `TRIAGED_${triage}`, note: null },
              ],
              patient_updates:
                triage === "IMMEDIATE_EMERGENCY"
                  ? [
                      ...item.patient_updates,
                      {
                        at: triagedAt,
                        message:
                          "Seek immediate in-person emergency care now. Do not wait for this review; Monovella is not emergency monitoring.",
                      },
                    ]
                  : item.patient_updates,
            }
          : item,
      );
    });
    toast("Clinical priority recorded.");
  };

  return (
    <>
      <PageHeader
        back={{ to: "/console/clinical-safety", label: "Clinical safety" }}
        title={`Clinical concern ${complaint.id}`}
        description={`Filed ${formatDateTime(complaint.filed_at)}`}
        action={
          <Badge tone={complaint.status === "CLOSED" ? "success" : "warning"}>
            {titleCase(complaint.status)}
          </Badge>
        }
      />
      <div data-screen="B25" className="space-y-4">
        <ScreenStates
          states={[
            { value: "normal", label: "Current" },
            { value: "conflict", label: "409 another reviewer" },
          ]}
          value={conflict ? "conflict" : "normal"}
          onChange={(value) => setConflict(value === "conflict")}
        />
        {conflict ? (
          <Banner
            tone="warning"
            action={
              <Button size="sm" variant="secondary" onClick={() => setConflict(false)}>
                Refresh
              </Button>
            }
          >
            Another staff member changed this review. Refresh before recording another action.
          </Banner>
        ) : null}
        {complaint.overdue ? (
          <Banner tone="error">The expected response window has passed.</Banner>
        ) : null}
        <Banner tone="warning" icon={HeartPulse}>
          This is a clinical-safety review. Any refund decision belongs in its separate workflow.
        </Banner>
        <div className="grid gap-4 @3xl:grid-cols-2">
          <Card>
            <p className="font-heading text-h3">Care context</p>
            <dl className="mt-3 divide-y divide-base-300">
              <DataRow
                label="Patient"
                value={patientName(data, complaint.patient_id)}
                mono={false}
              />
              <DataRow
                label="Expert"
                value={expertName(data, consultation.expert_id)}
                mono={false}
              />
              <DataRow label="Consultation" value={formatDateTime(consultation.scheduled_start)} />
              <DataRow
                label="Response expected"
                value={formatDateTime(complaint.expected_response_by)}
              />
              <DataRow label="Priority" value={titleCase(complaint.triage)} mono={false} />
            </dl>
          </Card>
          <Card>
            <p className="font-heading text-h3">Patient's account</p>
            <p className="measure mt-3 text-body">{complaint.details}</p>
            {complaint.attachment_name ? (
              <p className="mt-3 font-mono text-body-sm text-base-content/65">
                Attachment: {complaint.attachment_name}
              </p>
            ) : null}
          </Card>
        </div>
        {complaint.status === "OPEN" || complaint.status === "APPEALED" ? (
          <Card>
            <p className="font-heading text-h3">Clinical priority</p>
            <p className="measure mt-1 text-body-sm text-base-content/70">
              This prioritises staff response. It is not diagnosis, emergency dispatch or
              monitoring.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="secondary" disabled={conflict} onClick={() => setTriage("ROUTINE")}>
                Routine
              </Button>
              <Button
                variant="secondary"
                disabled={conflict}
                onClick={() => setTriage("URGENT_SAFETY")}
              >
                Urgent safety
              </Button>
              <Button
                variant="destructive"
                disabled={conflict}
                onClick={() => setTriage("IMMEDIATE_EMERGENCY")}
              >
                Immediate emergency
              </Button>
            </div>
            <Button
              className="mt-4"
              disabled={conflict || complaint.triage === "UNASSESSED"}
              onClick={startReview}
            >
              {complaint.status === "APPEALED"
                ? "Start escalation review"
                : "Start clinical review"}
            </Button>
          </Card>
        ) : complaint.status === "UNDER_REVIEW" ? (
          <Card>
            <Field label="Outcome shared with the patient">
              {(props) => (
                <Textarea
                  {...props}
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value)}
                />
              )}
            </Field>
            <Button
              className="mt-4"
              disabled={!outcome.trim() || conflict}
              onClick={() => {
                const resolvedAt = now().toISOString().slice(0, 19);
                update((draft) => {
                  draft.clinicalComplaintReferrals = draft.clinicalComplaintReferrals.map((item) =>
                    item.id === complaint.id
                      ? {
                          ...item,
                          status: "CLOSED",
                          resolved_at: resolvedAt,
                          outcome: outcome.trim(),
                          audit_history: [
                            ...item.audit_history,
                            {
                              at: resolvedAt,
                              actor_type: "STAFF",
                              action: "CLOSED",
                              note: outcome.trim(),
                            },
                          ],
                          patient_updates: [
                            ...item.patient_updates,
                            {
                              at: resolvedAt,
                              message:
                                "The clinical-safety review is complete. Read the outcome and request escalation if needed.",
                            },
                          ],
                        }
                      : item,
                  );
                });
                toast("Clinical review closed.");
                navigate("/console/clinical-safety");
              }}
            >
              Complete review
            </Button>
          </Card>
        ) : (
          <Card>
            <p className="font-heading text-h3">Outcome</p>
            <p className="measure mt-2 text-body">{complaint.outcome}</p>
          </Card>
        )}
        <Card>
          <p className="font-heading text-h3">Audit history</p>
          <ol className="mt-3 space-y-3">
            {complaint.audit_history.map((event) => (
              <li
                key={`${event.at}-${event.action}`}
                className="flex flex-wrap gap-x-2 text-body-sm"
              >
                <span className="font-mono text-base-content/55">{formatDateTime(event.at)}</span>
                <span>
                  {titleCase(event.action)} by {titleCase(event.actor_type)}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
