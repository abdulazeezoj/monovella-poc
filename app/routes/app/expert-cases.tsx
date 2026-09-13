import {
  AlertTriangle,
  Camera,
  Check,
  FileText,
  FlaskConical,
  Pencil,
  PenTool,
  Phone,
  Pill,
  Stethoscope,
  UserPlus,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useCallSession } from "~/components/shell/call-provider";
import { CallScreen, InCallStrip } from "~/components/shell/call-screen";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { useMutationStates } from "~/components/shell/mutation-states";
import { ScreenStates } from "~/components/shell/state-switcher";
import type { ChatComposerMessage } from "~/components/ui";
import {
  Badge,
  Banner,
  Button,
  Card,
  ChatBubble,
  ChatComposer,
  ConsultationBadge,
  Countdown,
  DataRow,
  EmptyState,
  Field,
  Input,
  ListGroup,
  ListRow,
  Modal,
  PageFooter,
  SearchablePicker,
  Sheet,
  Skeleton,
  Tabs,
  Textarea,
} from "~/components/ui";
import {
  chatFor,
  consultationById,
  consultationForExpert,
  consultationsForExpert,
  EXPERT_ID,
  expertById,
  expertName,
  guestExaminationsFor,
  historyAcknowledged,
  labOrdersFor,
  PATIENT_ID,
  patientById,
  patientHistory,
  patientName,
  prescriptionsFor,
  soapNote,
} from "~/data/selectors";
import type {
  ClinicalSafetyContextRead,
  ConsultationRead,
  ConsultationStatus,
  SoapAttachment,
  SoapSection,
} from "~/data/types";
import type { CareAccessDecision } from "~/lib/care-access";
import {
  expertCareAccess,
  guestCareAccess,
  isSelfExamination,
  transitionExpertGrant,
} from "~/lib/care-access";
import { now } from "~/lib/clock";
import {
  closeoutBlockers,
  completeConsultation,
  resolveCloseoutDependencies,
  terminalCloseout,
} from "~/lib/consultation-closeout";
import {
  ageFrom,
  availabilityLabel,
  consultationStatusLabel,
  formatDate,
  formatDateLong,
  formatDateTime,
  formatTime,
  genderLabel,
  naira,
  platformFee,
  specialtyLabel,
} from "~/lib/format";
import { usePagedList } from "~/lib/paged-list";
import { stopObsoleteFulfilment } from "~/lib/provider-fulfilment";
import { useExpertSeat, usePrototype, useTick } from "~/store/prototype";

/**
 * X9 / X10 — Incoming Requests & Appointments. Booked appointments are grouped
 * separately: a full day's schedule should not read as a pile of pending work.
 */
export default function Requests() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "conflict", "not_found"],
    "your response to this request",
  );
  useTick();
  const { data, session, update, toast } = usePrototype();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const expertId = useExpertSeat();
  const cases = consultationsForExpert(data, expertId);
  const pending = cases.filter((c) => c.status === "REQUESTED");
  const booked = cases.filter((c) => c.status === "SCHEDULED");

  const respond = (id: string, accept: boolean) => {
    update((d) => {
      const current = d.consultations.find(
        (item) => item.id === id && item.expert_id === expertId && item.status === "REQUESTED",
      );
      if (!current) return;
      transitionExpertGrant(d, current, accept ? "ACCEPTED" : "ENDED", now().toISOString());
      d.consultations = d.consultations.map((c) =>
        c.id === id
          ? {
              ...c,
              status: accept ? ("SCHEDULED" as const) : ("DECLINED" as const),
              responded_at: now().toISOString().slice(0, 19),
            }
          : c,
      );
    });
    toast(accept ? "Accepted — it's in your schedule." : "Declined.");
    setDeclining(null);
  };

  return (
    <MobileScreen title="Requests" tabs="expert">
      <div data-screen="X9" className="space-y-5">
        {mutation.node}
        <section>
          <h2 className="mb-2 font-heading text-h3">Waiting on you</h2>
          {pending.length ? (
            <ul className="space-y-3">
              {pending.map((c) => {
                const open = expanded === c.id;
                return (
                  <li key={c.id}>
                    <Card>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-heading text-h3">New patient request</p>
                          <p className="text-body-sm text-base-content/65">
                            Identity and health history stay hidden until you accept this care
                            purpose.
                          </p>
                        </div>
                        {/* A bare timer next to a patient's name says nothing.
                            Name what is running out. */}
                        <span className="shrink-0 text-right">
                          <span className="block text-body-sm text-base-content/55">
                            Respond within
                          </span>
                          <Countdown deadline={c.respond_by} elapsedText="Expired" />
                        </span>
                      </div>

                      {/* Accepting means taking this specific case, so what the
                          case *is* sits above the decision, never below it. */}
                      {c.request_summary ? (
                        <p className="measure mt-3 border-t border-base-300 pt-3 text-body text-base-content/85">
                          {c.request_summary}
                        </p>
                      ) : null}

                      <dl className="mt-3 divide-y divide-base-300 border-t border-base-300 pt-2">
                        <DataRow
                          label="For"
                          value={`${formatDateLong(c.scheduled_start)}, ${formatTime(c.scheduled_start)}`}
                        />
                        <DataRow label="Your fee" value={naira(c.expert_fee_kobo)} />
                      </dl>

                      {open ? (
                        <div className="mt-3 border-t border-base-300 pt-3">
                          <p className="text-label font-medium">Requested</p>
                          <p className="font-mono text-data text-base-content/70">
                            {formatDateTime(c.requested_at)}
                          </p>
                          <p className="measure mt-3 text-body-sm text-base-content/60">
                            Accepting opens only the history relevant to this consultation. It does
                            not grant general access to the patient's full record.
                          </p>
                        </div>
                      ) : null}

                      {/* Equal weight, deliberately. Declining is a legitimate
                          answer — an expert who is not right for a case should
                          not have to hunt for the smaller button to say so. */}
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button
                          full
                          disabled={session.standingSuspended || mutation.blocked}
                          onClick={() => respond(c.id, true)}
                        >
                          Accept
                        </Button>
                        <Button
                          full
                          variant="secondary"
                          disabled={mutation.blocked}
                          onClick={() => setDeclining(c.id)}
                        >
                          Decline
                        </Button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : c.id)}
                        className="mt-2 w-full py-2 text-label text-base-content/60"
                      >
                        {open ? "Less" : "More detail"}
                      </button>
                    </Card>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              title="No pending requests right now"
              body="New booking requests appear here with the time you have to respond."
            />
          )}
        </section>

        <section>
          <h2 className="mb-2 font-heading text-h3">Booked</h2>
          {booked.length ? (
            <ListGroup>
              {booked.map((c) => (
                <ListRow
                  key={c.id}
                  to={`/app/expert/consultations/${c.id}`}
                  title={patientName(data, c.patient_identity_id)}
                  meta={`${formatDateLong(c.scheduled_start)}, ${formatTime(c.scheduled_start)}`}
                />
              ))}
            </ListGroup>
          ) : (
            <p className="text-body-sm text-base-content/60">Nothing in your diary yet.</p>
          )}
        </section>

        <Modal
          open={!!declining}
          onClose={() => setDeclining(null)}
          title="Decline this request?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeclining(null)}>
                Go back
              </Button>
              <Button onClick={() => declining && respond(declining, false)}>Decline</Button>
            </>
          }
        >
          The slot is released and the patient's Monovella fee is refunded automatically. They're
          prompted to pick someone else straight away.
        </Modal>
      </div>
    </MobileScreen>
  );
}

/** X11 — My Consultations. A clinician's roster: dense but legible. */
/** Stable identity for paging: the row, not its position in the list. */
function consultationKey(row: { id: string }) {
  return row.id;
}

export function MyConsultations() {
  const expertId = useExpertSeat();
  const { data } = usePrototype();
  const [filter, setFilter] = useState<ConsultationStatus | "ALL">("ALL");
  const cases = consultationsForExpert(data, expertId);
  const rows = filter === "ALL" ? cases : cases.filter((c) => c.status === filter);
  // A caseload grows without limit, so X11 pages like every other list. Changing
  // the status filter starts a new list rather than appending to the old one.
  const page = usePagedList(rows, consultationKey, { pageSize: 8, resetKey: filter });

  const STATUSES: (ConsultationStatus | "ALL")[] = [
    "ALL",
    "ACTIVE",
    "SCHEDULED",
    "REQUESTED",
    "COMPLETED",
    "DECLINED",
  ];

  return (
    <MobileScreen title="Consultations" tabs="expert">
      <div data-screen="X11" className="space-y-4">
        <div className="scrollbar-thin -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={
                filter === s
                  ? "min-h-11 shrink-0 rounded-full bg-primary px-4 text-label text-primary-content"
                  : "min-h-11 shrink-0 rounded-full border border-base-300 bg-base-200 px-4 text-label"
              }
            >
              {s === "ALL" ? "All" : consultationStatusLabel[s]}
            </button>
          ))}
        </div>

        {rows.length ? (
          <>
            <ListGroup>
              {page.rows.map((c) => (
                <ListRow
                  key={c.id}
                  to={`/app/expert/consultations/${c.id}`}
                  title={patientName(data, c.patient_identity_id)}
                  meta={formatDateTime(c.scheduled_start ?? c.requested_at)}
                  trailing={<ConsultationBadge status={c.status} />}
                />
              ))}
            </ListGroup>
            <PageFooter
              nextCursor={page.nextCursor}
              loading={page.loading}
              error={page.error}
              onLoadMore={page.loadMore}
              onRetry={page.retry}
              shown={page.rows.length}
              total={page.total}
              moreLabel="Load older consultations"
              endLabel="That's every consultation in this filter"
            />
          </>
        ) : (
          <EmptyState
            icon={Stethoscope}
            title="Nothing here"
            body="No consultations match that status yet."
          />
        )}
      </div>
    </MobileScreen>
  );
}

/** X26 — Guest Examination Request. Accept/decline, mirroring X9/X10's own restraint. */
export function GuestExaminations() {
  const expertId = useExpertSeat();
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "conflict", "not_found"],
    "your response to this guest request",
  );
  const { data, session, update, toast } = usePrototype();
  const navigate = useNavigate();
  const [declining, setDeclining] = useState<string | null>(null);
  const rows = guestExaminationsFor(data, expertId).filter(
    (c) => c.guest_examination_status === "REQUESTED",
  );
  const guestFeeKobo = expertById(data, expertId)?.consultation_fee_kobo ?? 0;

  const respond = (id: string, accept: boolean) => {
    update((d) => {
      d.consultations = d.consultations.map((c) =>
        c.id === id
          ? {
              ...c,
              guest_examination_status: accept
                ? ("AWAITING_PATIENT_PAYMENT" as const)
                : ("DECLINED" as const),
              ...(accept ? { guest_expert_fee_kobo: guestFeeKobo } : {}),
            }
          : c,
      );
    });
    if (accept) {
      toast("Fee accepted. The patient must approve and pay before the examination opens.");
      navigate(`/app/expert/guest-examinations/${id}`);
    } else {
      toast("Declined.");
    }
    setDeclining(null);
  };

  // The list is an acting surface, not just a view: accepting here commits the
  // expert to a fee and opens a care relationship. It fails closed in the same
  // conditions as the examination detail screen rather than relying on
  // navigation to keep a patient-context session away from it.
  if (session.role !== "expert") {
    return (
      <MobileScreen title="Guest requests" tabs="expert">
        <EmptyState
          title="Switch to your expert workspace"
          body="Guest examination requests are only available in the expert context."
        />
      </MobileScreen>
    );
  }
  if (session.standingSuspended) {
    return (
      <MobileScreen title="Guest requests" tabs="expert">
        <EmptyState
          title="Guest requests unavailable"
          body="New guest work stays closed while your standing is suspended."
        />
      </MobileScreen>
    );
  }

  return (
    <MobileScreen title="Guest requests" tabs="expert">
      <div data-screen="X26" className="space-y-4">
        {mutation.node}
        <p className="measure text-body-sm text-base-content/65">
          Another expert wants you to examine their patient in person, mid-consultation — the case
          stays theirs, you're contributing one set of findings.
        </p>
        {rows.length ? (
          <ul className="space-y-3">
            {rows.map((c) => (
              <li key={c.id}>
                <Card>
                  <p className="font-heading text-h3">{patientName(data, c.patient_identity_id)}</p>
                  <p className="text-body-sm text-base-content/65">
                    Requested by {expertName(data, c.expert_id)}
                  </p>
                  {c.guest_examination_reason ? (
                    <p className="measure mt-3 border-t border-base-300 pt-3 text-body text-base-content/85">
                      {c.guest_examination_reason}
                    </p>
                  ) : null}
                  <dl className="mt-3 divide-y divide-base-300 border-t border-base-300 pt-2">
                    <DataRow label="Your examination fee" value={naira(guestFeeKobo)} />
                    <DataRow
                      label="Monovella service fee"
                      value={naira(platformFee(guestFeeKobo))}
                    />
                    <DataRow
                      label="Patient checkout total"
                      value={naira(guestFeeKobo + platformFee(guestFeeKobo))}
                    />
                  </dl>
                  <p className="measure mt-2 text-body-sm text-base-content/65">
                    The patient sees this disclosed checkout on top of{" "}
                    {expertName(data, c.expert_id)}'s own fee. Once it is verified, Monovella sends
                    your share to your verified payout account.
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button full disabled={mutation.blocked} onClick={() => respond(c.id, true)}>
                      Accept
                    </Button>
                    <Button
                      full
                      variant="secondary"
                      disabled={mutation.blocked}
                      onClick={() => setDeclining(c.id)}
                    >
                      Decline
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No guest requests right now"
            body="Requests to examine another expert's patient in person appear here."
          />
        )}
      </div>

      <Modal
        open={!!declining}
        onClose={() => setDeclining(null)}
        title="Decline this request?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeclining(null)}>
              Not yet
            </Button>
            <Button
              variant="destructive"
              disabled={mutation.blocked}
              onClick={() => declining && respond(declining, false)}
            >
              Decline it
            </Button>
          </>
        }
      >
        Declining is a normal answer — you don't need a reason, and it won't affect your standing.
      </Modal>
    </MobileScreen>
  );
}

/** X27 — Guest Examination Notes. Objective findings only; the guest never sees the rest of the note. */
export function GuestExaminationNotes() {
  const expertId = useExpertSeat();
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "conflict", "not_found"],
    "your examination findings",
  );
  const { id } = useParams();
  const { data, session, update, toast, nextId } = usePrototype();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [drawing, setDrawing] = useState(false);
  const [attachments, setAttachments] = useState<SoapAttachment[]>([]);
  const consultation = consultationById(data, id ?? "");

  const guestAccess = guestCareAccess(consultation, expertId);
  // Someone with no guest assignment must not learn the case exists. An assigned
  // guest whose access has not opened yet falls through to the specific waiting
  // state below, which tells them what is actually outstanding.
  if (!consultation || session.role !== "expert" || !guestAccess.related) {
    return (
      <MobileScreen title="Guest examination" back="/app/expert/guest-examinations" tabs="expert">
        <EmptyState title="Request not found" body="It may already have been resolved." />
      </MobileScreen>
    );
  }
  if (session.standingSuspended) {
    return (
      <MobileScreen title="Guest examination" back="/app/expert/guest-examinations" tabs="expert">
        <EmptyState
          title="Guest examination unavailable"
          body="Guest work stays closed while your standing is suspended."
        />
      </MobileScreen>
    );
  }

  const completed = consultation.guest_examination_status === "COMPLETED";
  const savedContribution = soapNote(data, consultation.id)?.guest_objective_contribution;
  const ownContribution = savedContribution?.expert_id === expertId ? savedContribution : null;
  const guestCheckout = data.checkoutPayments.find(
    (payment) =>
      payment.consultation_id === consultation.id &&
      payment.provider_id === expertId &&
      payment.payer_role === "GUEST",
  );

  if (
    !completed &&
    (consultation.status !== "ACTIVE" ||
      consultation.guest_examination_status !== "ACCEPTED" ||
      guestCheckout?.status !== "PAID")
  ) {
    return (
      <MobileScreen title="Guest examination" back="/app/expert/guest-examinations" tabs="expert">
        {mutation.node}
        <EmptyState
          title="Waiting for patient checkout"
          body="The examination stays closed until the correct patient approves the disclosed fee and payment is verified."
        />
      </MobileScreen>
    );
  }
  const patient = patientById(data, consultation.patient_identity_id)!;

  const addAttachment = (kind: SoapAttachment["kind"], mediaUrl: string) => {
    const attachment: SoapAttachment = {
      id: nextId("soapatt"),
      section: "OBJECTIVE",
      kind,
      media_url: mediaUrl,
      verification_status: "PENDING",
      flagged_reason: null,
      created_at: now().toISOString().slice(0, 19),
    };
    setAttachments((prev) => [...prev, attachment]);
    window.setTimeout(() => {
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === attachment.id ? { ...a, verification_status: "VALID" as const } : a,
        ),
      );
    }, 1100);
  };

  const submit = () => {
    const submittedAt = now().toISOString().slice(0, 19);
    update((d) => {
      if (d.consultations.find((row) => row.id === consultation.id)?.status !== "ACTIVE") return;
      d.consultations = d.consultations.map((c) =>
        c.id === consultation.id ? { ...c, guest_examination_status: "COMPLETED" as const } : c,
      );
      const contribution = { expert_id: expertId, text, submitted_at: submittedAt };
      d.soapNotes = d.soapNotes.some((n) => n.consultation_id === consultation.id)
        ? d.soapNotes.map((n) =>
            n.consultation_id === consultation.id
              ? {
                  ...n,
                  guest_objective_contribution: contribution,
                  attachments: [...(n.attachments ?? []), ...attachments],
                }
              : n,
          )
        : [
            ...d.soapNotes,
            {
              consultation_id: consultation.id,
              subjective: null,
              objective: null,
              guest_objective_contribution: contribution,
              assessment: null,
              plan: null,
              attachments,
              finalized_at: null,
            },
          ];
      // The guest is the person physically in the room with the patient, so the
      // patient should learn that their findings landed from the thread they are
      // already watching, not by opening the case record on a hunch. The findings
      // themselves stay in the record: this is a notice, not a second copy.
      d.chatMessages = [
        ...d.chatMessages,
        {
          id: nextId("msg"),
          consultation_id: consultation.id,
          sender_type: "EXPERT" as const,
          type: "SYSTEM" as const,
          body: `${expertName(d, expertId)} shared their in-person examination findings with ${expertName(
            d,
            consultation.expert_id,
          )}. Your visit note will be available after your primary expert finalizes it.`,
          media_url: null,
          sent_at: submittedAt,
        },
      ];
    });
    toast("Findings sent.");
    navigate("/app/expert/guest-examinations");
  };

  return (
    <MobileScreen title="Guest examination" back="/app/expert/guest-examinations" tabs="expert">
      <div data-screen="X27" className="space-y-4">
        {mutation.node}
        <Banner tone="info">{guestAccess.reason}</Banner>
        <Card>
          <p className="font-heading text-h3">{patientName(data, patient.id)}</p>
          <p className="text-body-sm text-base-content/65">
            Requested by {expertName(data, consultation.expert_id)}
          </p>
          {consultation.guest_examination_reason ? (
            <p className="measure mt-3 border-t border-base-300 pt-3 text-body text-base-content/85">
              {consultation.guest_examination_reason}
            </p>
          ) : null}
        </Card>

        {completed ? (
          <>
            <Banner tone="info">
              Findings sent. {expertName(data, consultation.expert_id)} can see them in the case
              note. You won't see the rest of their note.
            </Banner>
            {ownContribution ? (
              <Card>
                <h2 className="font-heading text-h3">Your submitted findings</h2>
                <p className="mt-1 text-body-sm text-base-content/65">
                  Submitted {formatDateTime(ownContribution.submitted_at)}. Read-only.
                </p>
                <p className="mt-3 whitespace-pre-wrap text-body text-base-content/85">
                  {ownContribution.text}
                </p>
              </Card>
            ) : (
              <Banner tone="warning">
                Your submitted findings are not available in this record.
              </Banner>
            )}
          </>
        ) : (
          <>
            <section>
              <h2 className="font-heading text-h3">Your findings</h2>
              <p className="mb-2 text-body-sm text-base-content/55">
                What you observed on examination. This is the only part of the note you contribute.
              </p>
              <Textarea
                aria-label="Your findings"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="min-h-35"
              />
              <div className="mt-2 flex flex-wrap items-start gap-2">
                {attachments.map((a) => (
                  <AttachmentChip
                    key={a.id}
                    attachment={a}
                    onOpen={() => {}}
                    onRetake={() => setDrawing(true)}
                    onTypeInstead={() =>
                      setAttachments((prev) => prev.filter((x) => x.id !== a.id))
                    }
                  />
                ))}
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => addAttachment("PHOTO", "/soap-attachments/captured-note.jpg")}
                    className="flex size-11 items-center justify-center rounded-brand border border-dashed border-base-300 text-base-content/50 hover:border-primary/40 hover:text-primary"
                    aria-label="Add a photo of your findings"
                  >
                    <Camera aria-hidden className="size-4" strokeWidth={1.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawing(true)}
                    className="flex size-11 items-center justify-center rounded-brand border border-dashed border-base-300 text-base-content/50 hover:border-primary/40 hover:text-primary"
                    aria-label="Draw your findings"
                  >
                    <PenTool aria-hidden className="size-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </section>

            <Button full disabled={!text.trim() || mutation.blocked} onClick={submit}>
              Send findings
            </Button>

            <DrawSheet
              open={drawing}
              onClose={() => setDrawing(false)}
              onSave={(dataUrl) => {
                addAttachment("DRAWING", dataUrl);
                setDrawing(false);
              }}
            />
          </>
        )}
      </div>
    </MobileScreen>
  );
}

type Tab = "chat" | "history" | "rx" | "labs" | "refer" | "guest";

const TABS: Tab[] = ["chat", "history", "rx", "labs", "refer", "guest"];

function latestClinicalSafetyContext(contexts: ClinicalSafetyContextRead[], patientId: string) {
  return contexts
    .filter((item) => item.patient_id === patientId)
    .sort((a, b) => b.version - a.version)[0];
}

function ClinicalSafetySummary({ consultation }: { consultation: ConsultationRead }) {
  const expertId = useExpertSeat();
  const { data, update, toast } = usePrototype();
  // Collapses to one line once reviewed. Allergies and medicines must stay
  // visible for the whole consultation, so this never hides them, but at full
  // height the card pushed the chat, the note and the tabs below the fold on a
  // phone for the rest of the consultation. Before acknowledgement it always
  // renders in full: the gate is the point.
  const [showDetail, setShowDetail] = useState(false);
  const context = latestClinicalSafetyContext(
    data.clinicalSafetyContexts,
    consultation.patient_identity_id,
  );
  const acknowledged =
    !!context &&
    consultation.clinical_safety_context_id === context.id &&
    consultation.clinical_safety_context_version === context.version &&
    consultation.clinical_safety_acknowledged_by_expert_id === expertId;
  const stale =
    !!context &&
    now().getTime() - new Date(context.confirmed_at).getTime() > 180 * 24 * 60 * 60 * 1000;
  // Read as a sentence a clinician scans, not as the enum behind it.
  const label = (answer: ClinicalSafetyContextRead["allergies_answer"]) =>
    ({
      REPORTED: "Reported",
      NONE_KNOWN: "None known",
      NOT_SURE: "Not sure",
      DECLINED: "Chose not to say",
    })[answer];

  const firstName =
    patientById(data, consultation.patient_identity_id)?.first_name ?? "the patient";
  const toldUsBy = context?.source === "GUARDIAN" ? `${firstName}'s guardian` : firstName;

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Named for what it holds and what it is for. "Clinical safety
              context" described the schema, not the two things a prescriber
              actually needs to see before writing anything. */}
          <p className="font-heading text-h3">Allergies and current medicines</p>
          <p className="measure text-body-sm text-base-content/70">
            {acknowledged
              ? `You reviewed what ${toldUsBy} told us. You can prescribe and order tests.`
              : `Review what ${toldUsBy} told us before you prescribe or order a test.`}
          </p>
        </div>
        <Badge tone={acknowledged ? "success" : "warning"}>
          {acknowledged ? "Reviewed" : "Review first"}
        </Badge>
      </div>
      {!context ? (
        <Banner tone="warning">
          {firstName} has not told us about allergies or medicines yet. That is not the same as
          none: ask before you prescribe.
        </Banner>
      ) : acknowledged && !showDetail ? (
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <p className="text-body-sm">
            <span className="text-base-content/60">Allergies</span>{" "}
            <span className="font-medium">{label(context.allergies_answer)}</span>
          </p>
          <p className="text-body-sm">
            <span className="text-base-content/60">Medicines</span>{" "}
            <span className="font-medium">{label(context.medicines_answer)}</span>
          </p>
          <Button variant="ghost" size="sm" onClick={() => setShowDetail(true)}>
            Show details
          </Button>
        </div>
      ) : (
        <>
          {stale ? (
            <Banner tone="warning">
              {toldUsBy} last confirmed this over six months ago. Check it is still right before you
              rely on it.
            </Banner>
          ) : null}
          <div className="grid gap-3 min-[34rem]:grid-cols-2">
            <div>
              <p className="text-label text-base-content/60">Allergies or reactions</p>
              <p className="mt-0.5 font-heading text-h3">{label(context.allergies_answer)}</p>
              {context.reported_allergies.map((item) => (
                <p
                  key={`${item.substance}-${item.reaction}`}
                  className="measure mt-1 text-body-sm text-base-content/75"
                >
                  <span className="font-medium">{item.substance}</span>: {item.reaction}
                </p>
              ))}
            </div>
            <div>
              <p className="text-label text-base-content/60">Current medicines</p>
              <p className="mt-0.5 font-heading text-h3">{label(context.medicines_answer)}</p>
              {context.current_medicines.length ? (
                <p className="measure mt-1 text-body-sm text-base-content/75">
                  {context.current_medicines.join(", ")}
                </p>
              ) : null}
            </div>
          </div>
          <p className="text-body-sm text-base-content/60">
            {toldUsBy} told us this on {formatDate(context.confirmed_at)}
            {context.version > 1
              ? `, and has corrected it ${context.version - 1} time${context.version > 2 ? "s" : ""} since`
              : ""}
            .
          </p>
          {consultation.status === "ACTIVE" && !acknowledged ? (
            <Button
              variant="secondary"
              full
              onClick={() => {
                let saved = false;
                update((draft) => {
                  const row = draft.consultations.find(
                    (item) => item.id === consultation.id && item.expert_id === expertId,
                  );
                  const latest = latestClinicalSafetyContext(
                    draft.clinicalSafetyContexts,
                    consultation.patient_identity_id,
                  );
                  if (row?.status !== "ACTIVE" || !latest || latest.id !== context.id) return;
                  row.clinical_safety_context_id = latest.id;
                  row.clinical_safety_context_version = latest.version;
                  row.clinical_safety_acknowledged_at = now().toISOString().slice(0, 19);
                  row.clinical_safety_acknowledged_by_expert_id = expertId;
                  saved = true;
                });
                toast(
                  saved
                    ? `Version ${context.version} acknowledged.`
                    : "Context changed. Review the latest version.",
                );
              }}
            >
              I have read this
            </Button>
          ) : null}
          {acknowledged ? (
            <Button variant="ghost" size="sm" onClick={() => setShowDetail(false)}>
              Hide details
            </Button>
          ) : null}
          <p className="measure text-body-sm text-base-content/55">
            This is what the patient reported, nothing more. Monovella does not check interactions
            or judge whether a medicine is suitable. That stays your clinical judgement.
          </p>
        </>
      )}
    </Card>
  );
}

/** X12 — Consultation Workspace, holding X13, X15–X17 and X19 as persistent tabs. */
export function Workspace() {
  const expertId = useExpertSeat();
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "conflict", "forbidden", "not_found"],
    "this consultation record",
  );
  useTick();
  const { id } = useParams();
  const { data, session, update, toast } = usePrototype();
  const navigate = useNavigate();
  // The open tab lives in the URL, so a case can be linked to at the part that
  // matters and survives a refresh. It also means "open the prescriptions panel"
  // is a real route, which is what makes the scope refusal testable rather than
  // a claim about a hidden control.
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") as Tab | null;
  const tab: Tab = requestedTab && TABS.includes(requestedTab) ? requestedTab : "chat";
  const setTab = (next: Tab) => {
    const params = new URLSearchParams(searchParams);
    if (next === "chat") params.delete("tab");
    else params.set("tab", next);
    setSearchParams(params, { replace: true });
  };
  const [completing, setCompleting] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const consultation = consultationForExpert(data, id ?? "", expertId);
  const credential = consultation
    ? expertById(data, expertId)?.credentials.find(
        (item) => !consultation.credential_id || item.id === consultation.credential_id,
      )
    : undefined;
  const credentialCurrent =
    !!credential &&
    credential.verification_status === "VERIFIED" &&
    credential.credential_status !== "EXPIRED" &&
    (!credential.expiry_date || credential.expiry_date >= now().toISOString().slice(0, 10));
  const access = expertCareAccess(data, consultation, expertId, {
    suspended: session.standingSuspended,
    credentialCurrent,
    patientClosed: data.user.closure_status === "CLOSURE_REQUESTED",
  });

  if (!consultation || session.role !== "expert" || access.scope === "NONE") {
    // A viewer with no care relationship must not learn that the case exists, so an
    // unrelated expert and an unknown identifier get the same response. Only an expert
    // who is actually on the case is told why their access is closed.
    const relatedViewer = !!consultation && session.role === "expert" && access.related;
    return (
      <MobileScreen title="Case" back="/app/expert/consultations" tabs="expert">
        <EmptyState
          title={relatedViewer ? "Case access unavailable" : "Consultation not found"}
          body={
            relatedViewer
              ? access.reason
              : "This link is not available in the current expert session."
          }
        />
      </MobileScreen>
    );
  }

  const patient = patientById(data, consultation.patient_identity_id)!;
  const expert = expertById(data, consultation.expert_id)!;
  const active = consultation.status === "ACTIVE";
  const locked = consultation.status === "COMPLETED";
  const isDoctor = expert.professional_type === "DOCTOR";
  const blockers = closeoutBlockers(data, consultation.id);
  const completionBlocked =
    blockers.missing.length > 0 ||
    blockers.pendingAttachments > 0 ||
    blockers.guestOpen ||
    blockers.openRequests.length > 0;

  return (
    <MobileScreen
      title={`${patient.first_name} ${patient.last_name}`}
      subtitle={`${ageFrom(patient.date_of_birth)} · ${genderLabel[patient.gender]} · ${patient.monovella_id}`}
      back="/app/expert/consultations"
      tabs="none"
    >
      <div data-screen="X12" className="space-y-4">
        {mutation.node}
        <Banner tone={access.current ? "info" : "warning"}>{access.reason}</Banner>
        <ClinicalSafetySummary consultation={consultation} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ConsultationBadge status={consultation.status} />
          {/* Up to four actions can be live at once on an active case, which
              runs off the right edge of a phone unless they are allowed to
              wrap. */}
          <div className="flex min-w-0 flex-wrap gap-2">
            {active ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate(`/app/expert/consultations/${consultation.id}/call`)}
              >
                <Phone aria-hidden className="size-4" strokeWidth={1.5} />
                Call
              </Button>
            ) : null}
            {/* X14, always reachable: opens over whichever tab is showing, chat included. */}
            <Button size="sm" variant="secondary" onClick={() => setNoteOpen(true)}>
              <FileText aria-hidden className="size-4" strokeWidth={1.5} />
              Case note
            </Button>
            {active ? (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={mutation.blocked}
                  onClick={() => setCompleting(true)}
                >
                  <Check aria-hidden className="size-4" strokeWidth={1.5} />
                  Complete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={mutation.blocked}
                  onClick={() => {
                    update((draft) => {
                      const row = draft.consultations.find((item) => item.id === consultation.id);
                      if (row && !row.expert_joined_at)
                        row.expert_joined_at = now().toISOString().slice(0, 19);
                    });
                    toast("Expert arrival recorded.");
                  }}
                >
                  Mark joined
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <Tabs
          active={tab}
          onChange={(t) => setTab(t as Tab)}
          tabs={[
            { id: "chat", label: "Chat" },
            { id: "history", label: "History" },
            ...(isDoctor
              ? [
                  { id: "rx", label: "Rx", badge: prescriptionsFor(data, consultation.id).length },
                  { id: "labs", label: "Labs", badge: labOrdersFor(data, consultation.id).length },
                ]
              : []),
            { id: "refer", label: "Refer" },
            { id: "guest", label: "Guest" },
          ]}
        />

        {tab === "chat" ? <WorkspaceChat consultationId={consultation.id} locked={locked} /> : null}
        {tab === "history" ? (
          <PatientHistoryPanel consultation={consultation} scope={access.scope} />
        ) : null}
        {/* The tab is hidden for a professional type that may not issue these,
            but the panel is a real route. Render it either way and let the
            panel's own scope check answer: a copied link gets an explanation,
            not a blank screen, and the refusal has one home rather than two. */}
        {tab === "rx" ? <Prescriptions consultationId={consultation.id} active={active} /> : null}
        {tab === "labs" ? <LabOrders consultationId={consultation.id} active={active} /> : null}
        {tab === "refer" ? <Refer consultation={consultation} /> : null}
        {tab === "guest" ? <GuestInvite consultation={consultation} active={active} /> : null}

        <Sheet open={noteOpen} onClose={() => setNoteOpen(false)} title="Case note">
          <SoapEditor consultationId={consultation.id} locked={locked} />
        </Sheet>

        {/* X19 — a real, slightly weighty confirmation. */}
        <Modal
          open={completing}
          onClose={() => setCompleting(false)}
          title="Complete this consultation?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setCompleting(false)}>
                Not yet
              </Button>
              <Button
                disabled={completionBlocked || mutation.blocked}
                onClick={() => {
                  let completed = false;
                  update((d) => {
                    completed = completeConsultation(d, consultation.id).ok;
                    const closed = d.consultations.find((item) => item.id === consultation.id);
                    if (completed && closed)
                      transitionExpertGrant(d, closed, "ENDED", now().toISOString());
                  });
                  if (!completed) return;
                  setCompleting(false);
                  toast("Consultation completed.");
                  navigate("/app/expert/consultations");
                }}
              >
                Complete it
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <p>
              This finalises the SOAP note and locks the case record. Neither of you can edit it
              afterwards, and it becomes a permanent part of {patient.first_name}'s portable
              history.
            </p>
            {blockers.missing.length ? (
              <Banner tone="warning">
                Complete the minimum SOAP record: {blockers.missing.join(", ")}.
              </Banner>
            ) : null}
            {blockers.pendingAttachments ? (
              <Banner tone="warning">
                Wait for {blockers.pendingAttachments} attachment check to finish.
              </Banner>
            ) : null}
            {blockers.guestOpen || blockers.openRequests.length ? (
              <div className="rounded-brand border border-warning/40 bg-warning-tint p-3">
                <p className="text-body-sm">
                  Resolve the open {blockers.guestOpen ? "guest examination" : ""}
                  {blockers.guestOpen && blockers.openRequests.length ? " and " : ""}
                  {blockers.openRequests.length
                    ? `${blockers.openRequests.length} fulfilment request${blockers.openRequests.length === 1 ? "" : "s"}`
                    : ""}{" "}
                  before closeout.
                </p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-2"
                  onClick={() =>
                    update((draft) => resolveCloseoutDependencies(draft, consultation.id))
                  }
                >
                  Withdraw open items and start refunds
                </Button>
              </div>
            ) : null}
            <div className="border-t border-base-300 pt-3">
              <p className="text-body-sm text-base-content/65">Non-performance closeout</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    update((draft) =>
                      terminalCloseout(draft, consultation.id, "EXPERT", "PATIENT_NO_SHOW"),
                    )
                  }
                >
                  Patient did not attend
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    update((draft) =>
                      terminalCloseout(draft, consultation.id, "EXPERT", "EXPERT_CANCELLED"),
                    )
                  }
                >
                  Expert cancellation
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    update((draft) =>
                      terminalCloseout(draft, consultation.id, "EXPERT", "WINDOW_ELAPSED"),
                    )
                  }
                >
                  Window elapsed
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      </div>
    </MobileScreen>
  );
}

/** X13a — expert side of the call. Shares CallScreen with P44a's patient wrapper. */
export function ExpertConsultationCall() {
  const expertId = useExpertSeat();
  const { id } = useParams();
  const { data, toast } = usePrototype();
  const navigate = useNavigate();
  const [noteOpen, setNoteOpen] = useState(false);
  const consultation = consultationForExpert(data, id ?? "", expertId);
  const call = useCallSession(
    id ?? "",
    consultation
      ? `${patientById(data, consultation.patient_identity_id)?.first_name ?? "Patient"} ${patientById(data, consultation.patient_identity_id)?.last_name ?? ""}`.trim()
      : "Patient",
    `/app/expert/consultations/${id}/call`,
    `/app/expert/consultations/${id}`,
    "EXPERT",
    expertId,
    consultation?.status === "ACTIVE",
  );

  useEffect(() => {
    if (consultation && consultation.status !== "ACTIVE") {
      toast("That consultation isn't active, so there's no call to join.");
      navigate(`/app/expert/consultations/${consultation.id}`, { replace: true });
    }
  }, [consultation, navigate, toast]);

  if (!consultation) {
    return (
      <MobileScreen title="Call" back="/app/expert/consultations" tabs="expert">
        <EmptyState title="Consultation not found" body="" />
      </MobileScreen>
    );
  }
  if (consultation.status !== "ACTIVE") return null;
  const patient = patientById(data, consultation.patient_identity_id)!;
  const patientName = `${patient.first_name} ${patient.last_name}`;
  return (
    <div data-screen="X13a" className="flex h-full min-h-0 flex-1 flex-col">
      <CallScreen
        call={call}
        consultationId={consultation.id}
        otherName={patientName}
        extra={
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="flex items-center gap-1.5 rounded-brand bg-base-100/90 px-3 py-2 text-label text-base-content shadow-brand backdrop-blur hover:bg-base-100"
          >
            <FileText aria-hidden className="size-4" strokeWidth={1.5} />
            Case note
          </button>
        }
      />
      {/* X14 layered over the live call: the strip keeps the patient, the
          clock and mute/end in reach while the note is written. */}
      <Sheet open={noteOpen} onClose={() => setNoteOpen(false)} title="Case note">
        <InCallStrip call={call} name={patientName} />
        <SoapEditor consultationId={consultation.id} locked={false} />
      </Sheet>
    </div>
  );
}

/**
 * X12 History — what a PURPOSE_HISTORY grant resolves to.
 *
 * Two advisors settled the shape of this panel. Dr. Hameedat named the five
 * sections and said a patient must not be able to hide any of them, because a
 * partial record the expert believes is complete is the dangerous case. Barr.
 * Christopher added that access ends when care completes, that an emergency
 * route has to exist anyway, and that the expert carries the liability for what
 * they read. That liability is why the first read in a care event is gated on
 * an acknowledgement, and why every read is written down.
 */
function PatientHistoryPanel({
  consultation,
  scope,
}: {
  consultation: ConsultationRead;
  scope: CareAccessDecision["scope"];
}) {
  const expertId = useExpertSeat();
  const { data, update, toast } = usePrototype();
  const granted = scope === "PURPOSE_HISTORY";
  const acknowledged = historyAcknowledged(data, consultation.id, expertId);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [emergencyGranted, setEmergencyGranted] = useState(false);
  const patientLabel = patientName(data, consultation.patient_identity_id);
  // The four conditions this panel has to design for. Declared here so a
  // reviewer can reach each one; the switcher itself lives in the prototype bar.
  const [demoState, setDemoState] = useState<HistoryPanelState>(
    granted ? (acknowledged ? "open" : "acknowledge") : "ended",
  );
  const open = demoState === "open" || demoState === "emergency" || emergencyGranted;

  const record = (route: "NORMAL" | "EMERGENCY") => {
    update((draft) => {
      draft.historyReadEvents.push({
        id: `hre_${draft.historyReadEvents.length + 1}`,
        expert_id: expertId,
        patient_identity_id: consultation.patient_identity_id,
        care_event_id: consultation.id,
        sections: ["ALLERGIES", "DIAGNOSES", "PRESCRIPTIONS", "LAB_RESULTS", "ENCOUNTERS"],
        route,
        read_at: now().toISOString().slice(0, 19),
      });
    });
  };

  // Access is closed and there is no acknowledgement to offer, so the emergency
  // route is the only way through. That is exactly what it is for.
  if (demoState === "ended" && !emergencyGranted) {
    return (
      <div className="space-y-3">
        <HistoryStates value={demoState} onChange={setDemoState} />
        <EmptyState
          title="History is not open for this case"
          body="Access to this patient's history runs with the consultation, and it ended when the consultation was completed. If you need it now to keep this patient safe, you can open it as an emergency. That is recorded, the patient is told, and Monovella reviews it."
        />
        <Button variant="secondary" full onClick={() => setEmergencyOpen(true)}>
          Open as an emergency
        </Button>
        <EmergencyModal
          open={emergencyOpen}
          reason={reason}
          setReason={setReason}
          onClose={() => setEmergencyOpen(false)}
          onConfirm={() => {
            record("EMERGENCY");
            setEmergencyGranted(true);
            setEmergencyOpen(false);
            toast("Emergency access opened. The patient has been told.");
          }}
        />
      </div>
    );
  }

  // Granted, but not yet acknowledged. The duty is stated before the first read
  // rather than buried in terms nobody reads.
  if (!open) {
    return (
      <>
        <HistoryStates value={demoState} onChange={setDemoState} />
        <Card>
          <p className="font-heading text-h3">Before you open this patient's history</p>
          <ul className="measure mt-2 space-y-1.5 text-body-sm text-base-content/70">
            <li>
              You can see it because you are treating this patient, and only until you complete this
              consultation.
            </li>
            <li>Opening it is recorded, and {patientLabel} can see that you did.</li>
            <li>You are responsible for keeping what you read confidential.</li>
          </ul>
          <Button
            full
            className="mt-3"
            onClick={() => {
              record("NORMAL");
              toast("History opened.");
            }}
          >
            I understand, open the history
          </Button>
        </Card>
      </>
    );
  }

  const history = patientHistory(data, consultation.patient_identity_id, consultation.id);

  return (
    <div className="space-y-4">
      <HistoryStates value={demoState} onChange={setDemoState} />
      {emergencyGranted || demoState === "emergency" ? (
        <Banner tone="warning">
          Emergency access. It closes after 24 hours, the patient has been told, and Monovella
          reviews every one.
        </Banner>
      ) : null}
      <p className="measure text-body-sm text-base-content/60">
        Care recorded on Monovella only. This is not {patientLabel}'s whole medical history.
      </p>

      {/* The current allergies and medicines are already at the top of this
          screen for every case, so repeating them here is noise. What History
          adds is the trail: what this patient told us before, and when it
          changed. */}
      <HistorySection
        title="Earlier versions of allergies and medicines"
        empty="Nothing has changed since it was first recorded."
      >
        {history.safetyContexts.slice(1).map((entry) => (
          <ListRow
            key={entry.id}
            title={
              entry.reported_allergies.length
                ? entry.reported_allergies.map((item) => item.substance).join(", ")
                : "No allergies reported"
            }
            meta={`Version ${entry.version} · ${formatDate(entry.confirmed_at)}${entry.correction_reason ? ` · ${entry.correction_reason}` : ""}`}
          />
        ))}
      </HistorySection>

      <HistorySection title="Past diagnoses" empty="No earlier consultations on Monovella.">
        {history.encounters.map((entry) => (
          <ListRow
            key={entry.consultation_id}
            title={entry.assessment ?? "No assessment recorded"}
            meta={`${formatDate(entry.occurred_at)} · ${entry.expert_name}`}
          />
        ))}
      </HistorySection>

      <HistorySection title="Prescriptions" empty="Nothing prescribed on Monovella before.">
        {history.prescriptions.map((rx) => (
          <ListRow
            key={rx.id}
            title={rx.medication}
            meta={`${rx.dosage} · ${formatDate(rx.issued_at)} · ${rx.fulfillment_status === "FILLED" ? "Filled" : "Not filled"}`}
          />
        ))}
      </HistorySection>

      <HistorySection title="Lab results" empty="No results on Monovella.">
        {history.labResults.map((lab) => (
          <ListRow
            key={lab.id}
            title={lab.test_requested}
            meta={`${lab.result_summary ?? "Result attached"} · ${formatDate(lab.issued_at)}`}
          />
        ))}
      </HistorySection>
    </div>
  );
}

type HistoryPanelState = "acknowledge" | "open" | "ended" | "emergency";

function HistoryStates({
  value,
  onChange,
}: {
  value: HistoryPanelState;
  onChange: (next: HistoryPanelState) => void;
}) {
  return (
    <ScreenStates
      states={[
        { value: "acknowledge", label: "Before acknowledgement" },
        { value: "open", label: "Open" },
        { value: "ended", label: "Access ended" },
        { value: "emergency", label: "Emergency access" },
      ]}
      value={value}
      onChange={onChange}
    />
  );
}

function HistorySection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode[];
}) {
  return (
    <div>
      <p className="mb-2 px-1 text-label font-medium">{title}</p>
      {children.length ? (
        <ListGroup>{children}</ListGroup>
      ) : (
        // A section is never dropped when it is empty, so the expert can tell
        // "nothing recorded" from "not disclosed to you".
        <Card>
          <p className="text-body-sm text-base-content/60">{empty}</p>
        </Card>
      )}
    </div>
  );
}

function EmergencyModal({
  open,
  reason,
  setReason,
  onClose,
  onConfirm,
}: {
  open: boolean;
  reason: string;
  setReason: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}) {
  // A typed reason with no preset options, so it cannot be clicked through.
  const valid = reason.trim().length >= 20;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Open this history as an emergency?"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" disabled={!valid} onClick={onConfirm}>
            Open it
          </Button>
        </>
      }
    >
      <p className="measure text-body-sm text-base-content/70">
        Say why you need it. The patient is told straight away, Monovella staff review every
        emergency access, and it closes after 24 hours.
      </p>
      <Field label="Why you need this now" className="mt-3">
        {(props) => (
          <Textarea
            {...props}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            placeholder="For example: patient is in distress and cannot recall what she reacted to."
          />
        )}
      </Field>
      {reason.length > 0 && !valid ? (
        <p className="mt-1 text-body-sm text-error">Please give a bit more detail.</p>
      ) : null}
    </Modal>
  );
}

function WorkspaceChat({ consultationId, locked }: { consultationId: string; locked: boolean }) {
  const { data, update, nextId } = usePrototype();
  const messages = chatFor(data, consultationId);

  const send = (message: ChatComposerMessage) => {
    update((d) => {
      d.chatMessages = [
        ...d.chatMessages,
        {
          id: nextId("msg"),
          consultation_id: consultationId,
          sender_type: "EXPERT",
          type: message.type,
          body: message.body,
          media_url: message.mediaUrl,
          sent_at: now().toISOString().slice(0, 19),
          ...(message.durationSeconds ? { duration_seconds: message.durationSeconds } : {}),
        },
      ];
    });
  };

  const attach = (file: File) => {
    const type = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
    update((d) => {
      d.chatMessages = [
        ...d.chatMessages,
        {
          id: nextId("msg"),
          consultation_id: consultationId,
          sender_type: "EXPERT",
          type,
          body: file.name,
          media_url: type === "VIDEO" ? "/media/attachment.mp4" : "/media/attachment.jpg",
          sent_at: now().toISOString().slice(0, 19),
        },
      ];
    });
  };

  return (
    <div className="space-y-3">
      {messages.length ? (
        messages.map((m, index) => (
          <ChatBubble
            key={m.id}
            own={m.sender_type === "EXPERT"}
            body={m.body}
            sentAt={m.sent_at}
            type={m.type}
            durationSeconds={m.duration_seconds}
            collapsible={index < messages.length - 1}
          />
        ))
      ) : (
        <EmptyState title="Nothing sent yet" body="Open however you normally would." />
      )}

      {locked ? (
        <p className="border-t border-base-300 pt-4 text-center text-body-sm text-base-content/60">
          This consultation has ended. The thread stays readable.
        </p>
      ) : (
        <ChatComposer
          className="sticky bottom-0 -mx-4"
          onSend={send}
          onAttachment={attach}
          messageLabel="Message the patient"
        />
      )}
    </div>
  );
}

/** X14 — SOAP Note Editor. The most prose-heavy surface in the product. */
const SOAP_FIELDS: {
  key: "subjective" | "objective" | "assessment" | "plan";
  section: SoapSection;
  label: string;
  hint: string;
}[] = [
  {
    key: "subjective",
    section: "SUBJECTIVE",
    label: "Subjective",
    hint: "What the patient reports, in their terms",
  },
  {
    key: "objective",
    section: "OBJECTIVE",
    label: "Objective",
    hint: "What you observed or measured",
  },
  {
    key: "assessment",
    section: "ASSESSMENT",
    label: "Assessment",
    hint: "Your clinical impression",
  },
  {
    key: "plan",
    section: "PLAN",
    label: "Plan",
    hint: "Treatment, investigations, follow-up, safety-netting",
  },
];

/** X14 — SOAP Note Editor. Type, photo and drawing combine in the same section; none replaces another. */
function SoapEditor({ consultationId, locked }: { consultationId: string; locked: boolean }) {
  const { data, update, nextId } = usePrototype();
  const note = soapNote(data, consultationId);
  const [saved, setSaved] = useState<string | null>(null);
  const [drawingFor, setDrawingFor] = useState<SoapSection | null>(null);
  const [preview, setPreview] = useState<SoapAttachment | null>(null);

  const addAttachment = (section: SoapSection, kind: SoapAttachment["kind"], mediaUrl: string) => {
    const attachment: SoapAttachment = {
      id: nextId("soapatt"),
      section,
      kind,
      media_url: mediaUrl,
      verification_status: "PENDING",
      flagged_reason: null,
      created_at: now().toISOString().slice(0, 19),
    };
    update((d) => {
      if (d.consultations.find((row) => row.id === consultationId)?.status !== "ACTIVE") return;
      d.soapNotes = d.soapNotes.some((n) => n.consultation_id === consultationId)
        ? d.soapNotes.map((n) =>
            n.consultation_id === consultationId
              ? { ...n, attachments: [...(n.attachments ?? []), attachment] }
              : n,
          )
        : [
            ...d.soapNotes,
            {
              consultation_id: consultationId,
              subjective: null,
              objective: null,
              assessment: null,
              plan: null,
              finalized_at: null,
              attachments: [attachment],
            },
          ];
    });
    // Simulated content check (PRODUCT_ARCH_V0.md §6) — the interactive demo
    // path always passes; the FLAGGED recovery state ships as fixture data
    // instead, so both states are visible without needing a failure to inject.
    window.setTimeout(() => {
      update((d) => {
        if (d.consultations.find((row) => row.id === consultationId)?.status !== "ACTIVE") return;
        d.soapNotes = d.soapNotes.map((n) =>
          n.consultation_id === consultationId
            ? {
                ...n,
                attachments: (n.attachments ?? []).map((a) =>
                  a.id === attachment.id ? { ...a, verification_status: "VALID" as const } : a,
                ),
              }
            : n,
        );
      });
    }, 1100);
  };

  const removeAttachment = (id: string) => {
    update((d) => {
      if (d.consultations.find((row) => row.id === consultationId)?.status !== "ACTIVE") return;
      d.soapNotes = d.soapNotes.map((n) =>
        n.consultation_id === consultationId
          ? { ...n, attachments: (n.attachments ?? []).filter((a) => a.id !== id) }
          : n,
      );
    });
    setPreview(null);
  };

  return (
    <div data-screen="X14" className="space-y-5">
      {locked ? (
        <Banner tone="info">
          Finalised {formatDate(note?.finalized_at)} — this note can't be edited.
        </Banner>
      ) : null}

      {SOAP_FIELDS.map((f) => {
        const attachments = (note?.attachments ?? []).filter((a) => a.section === f.section);
        return (
          <section key={f.key}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <h3 className="font-heading text-h3">{f.label}</h3>
              {saved === f.key ? (
                <span className="text-body-sm text-success">
                  <Check aria-hidden className="mr-1 inline size-3.5" strokeWidth={2} />
                  Saved
                </span>
              ) : null}
            </div>
            <p className="mb-2 text-body-sm text-base-content/55">{f.hint}</p>
            {locked ? (
              <p className="measure whitespace-pre-wrap text-body text-base-content/85">
                {note?.[f.key] ?? "—"}
              </p>
            ) : (
              <Textarea
                aria-label={f.label}
                defaultValue={note?.[f.key] ?? ""}
                className="min-h-35"
                onBlur={(e) => {
                  update((d) => {
                    if (
                      d.consultations.find((row) => row.id === consultationId)?.status !== "ACTIVE"
                    )
                      return;
                    d.soapNotes = d.soapNotes.some((n) => n.consultation_id === consultationId)
                      ? d.soapNotes.map((n) =>
                          n.consultation_id === consultationId
                            ? { ...n, [f.key]: e.target.value }
                            : n,
                        )
                      : [
                          ...d.soapNotes,
                          {
                            consultation_id: consultationId,
                            subjective: null,
                            objective: null,
                            assessment: null,
                            plan: null,
                            finalized_at: null,
                            [f.key]: e.target.value,
                          },
                        ];
                  });
                  setSaved(f.key);
                  window.setTimeout(() => setSaved(null), 1600);
                }}
              />
            )}

            {attachments.length || !locked ? (
              <div className="mt-2 flex flex-wrap items-start gap-2">
                {attachments.map((a) => (
                  <AttachmentChip
                    key={a.id}
                    attachment={a}
                    onOpen={() => setPreview(a)}
                    onRetake={() => setDrawingFor(f.section)}
                    onTypeInstead={() => removeAttachment(a.id)}
                  />
                ))}
                {!locked ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        addAttachment(f.section, "PHOTO", "/soap-attachments/captured-note.jpg")
                      }
                      className="flex size-11 items-center justify-center rounded-brand border border-dashed border-base-300 text-base-content/50 hover:border-primary/40 hover:text-primary"
                      aria-label={`Add a photo to ${f.label}`}
                    >
                      <Camera aria-hidden className="size-4" strokeWidth={1.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDrawingFor(f.section)}
                      className="flex size-11 items-center justify-center rounded-brand border border-dashed border-base-300 text-base-content/50 hover:border-primary/40 hover:text-primary"
                      aria-label={`Draw for ${f.label}`}
                    >
                      <PenTool aria-hidden className="size-4" strokeWidth={1.5} />
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {f.section === "OBJECTIVE" && note?.guest_objective_contribution ? (
              <div className="mt-3 rounded-brand border border-secondary/30 bg-secondary/10 p-3">
                <p className="text-body-sm font-medium text-secondary">
                  From {expertName(data, note.guest_objective_contribution.expert_id)}, guest
                  examination
                </p>
                <p className="measure mt-1 whitespace-pre-wrap text-body text-base-content/85">
                  {note.guest_objective_contribution.text}
                </p>
              </div>
            ) : null}
          </section>
        );
      })}

      {!locked ? (
        <p className="text-body-sm text-base-content/55">
          Saved as you go. The note finalises when you complete the consultation.
        </p>
      ) : null}

      <DrawSheet
        open={!!drawingFor}
        onClose={() => setDrawingFor(null)}
        onSave={(dataUrl) => {
          if (drawingFor) addAttachment(drawingFor, "DRAWING", dataUrl);
          setDrawingFor(null);
        }}
      />

      <Sheet
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview ? `${preview.kind === "PHOTO" ? "Photo" : "Drawing"} attachment` : ""}
        footer={
          preview ? (
            <Button variant="destructive" full onClick={() => removeAttachment(preview.id)}>
              Remove
            </Button>
          ) : null
        }
      >
        {preview ? (
          <div className="overflow-hidden rounded-brand border border-base-300 bg-base-200">
            {preview.kind === "DRAWING" ? (
              <img src={preview.media_url} alt="Drawing attachment" className="w-full" />
            ) : (
              <div className="flex h-48 items-center justify-center text-base-content/40">
                <Camera aria-hidden className="size-10" strokeWidth={1} />
              </div>
            )}
          </div>
        ) : null}
      </Sheet>
    </div>
  );
}

/** One attachment chip: skeleton while checked, solid once valid, plain recovery text if flagged. */
function AttachmentChip({
  attachment,
  onOpen,
  onRetake,
  onTypeInstead,
}: {
  attachment: SoapAttachment;
  onOpen: () => void;
  onRetake: () => void;
  onTypeInstead: () => void;
}) {
  if (attachment.verification_status === "PENDING") {
    return (
      <div className="flex flex-col items-center gap-1">
        <Skeleton className="size-11" />
        <span className="text-body-sm text-base-content/50">Checking…</span>
      </div>
    );
  }

  if (attachment.verification_status === "FLAGGED") {
    return (
      <div className="w-full max-w-xs rounded-brand border border-warning/40 bg-warning-tint p-2">
        <div className="flex items-center gap-1.5 text-warning">
          <AlertTriangle aria-hidden className="size-3.5 shrink-0" strokeWidth={1.5} />
          <span className="text-body-sm">
            {attachment.flagged_reason ?? "We couldn't read this clearly."}
          </span>
        </div>
        <div className="mt-1.5 flex gap-2">
          <button type="button" onClick={onRetake} className="text-body-sm text-primary underline">
            Retake
          </button>
          <button
            type="button"
            onClick={onTypeInstead}
            className="text-body-sm text-primary underline"
          >
            Type it instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex size-11 items-center justify-center overflow-hidden rounded-brand border border-base-300 bg-base-200 text-base-content/60 hover:border-primary/40"
      aria-label={`View ${attachment.kind === "PHOTO" ? "photo" : "drawing"} attachment`}
    >
      {attachment.kind === "DRAWING" ? (
        <img src={attachment.media_url} alt="" className="size-full object-cover" />
      ) : (
        <Camera aria-hidden className="size-4" strokeWidth={1.5} />
      )}
    </button>
  );
}

/** The stylus canvas for X14's "Draw" action — one pen weight, one eraser, clear/undo. Not a drawing app. */
function DrawSheet({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [erasing, setErasing] = useState(false);

  const brandColor = (name: string) => {
    if (typeof window === "undefined") return "#211d18";
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#211d18";
  };

  const paintBackground = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = brandColor("--brand-base-200");
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: paintBackground reads a ref, not state.
  useEffect(() => {
    if (!open) return;
    paintBackground();
    setHasDrawn(false);
    setErasing(false);
  }, [open]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Draw"
      footer={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              paintBackground();
              setHasDrawn(false);
            }}
          >
            Clear
          </Button>
          <Button variant={erasing ? "primary" : "secondary"} onClick={() => setErasing((v) => !v)}>
            Eraser
          </Button>
          <Button
            full
            disabled={!hasDrawn}
            onClick={() => onSave(canvasRef.current?.toDataURL("image/png") ?? "")}
          >
            Save drawing
          </Button>
        </div>
      }
    >
      <canvas
        ref={canvasRef}
        width={640}
        height={420}
        className="w-full touch-none rounded-brand border border-base-300"
        onPointerDown={(e) => {
          drawing.current = true;
          last.current = point(e);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = canvasRef.current?.getContext("2d");
          if (!ctx || !last.current) return;
          const p = point(e);
          ctx.strokeStyle = erasing
            ? brandColor("--brand-base-200")
            : brandColor("--brand-base-content");
          ctx.lineWidth = erasing ? 28 : 3;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(last.current.x, last.current.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          last.current = p;
          setHasDrawn(true);
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
        onPointerLeave={() => {
          drawing.current = false;
        }}
      />
      <p className="mt-2 text-body-sm text-base-content/55">
        Draw with a stylus or your finger. Saved just like a photo — the icon on its chip is the
        only difference.
      </p>
    </Sheet>
  );
}

/** X15 — Prescriptions. A correction is an amendment, never a deletion. */
function Prescriptions({ consultationId, active }: { consultationId: string; active: boolean }) {
  const expertId = useExpertSeat();
  const { data, update, toast, nextId } = usePrototype();
  const [form, setForm] = useState<null | { correctsId?: string }>(null);
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("");
  // Second gate, independent of the tab and the panel. Prescribing and lab
  // ordering are allow-listed to DOCTOR under NMCN/PCN/MLSCN scope of practice
  // (assumed, advisor-informed). A Nurse, Pharmacist, Lab Scientist or
  // Physiotherapist seat reaching here by any route sees only the refusal.
  if (expertById(data, expertId)?.professional_type !== "DOCTOR") {
    return (
      <EmptyState
        title="Prescribing is not in your scope"
        body="Your professional type is not permitted to issue this. Refer the patient to a doctor, or record your own findings in the case note."
      />
    );
  }

  const rows = prescriptionsFor(data, consultationId);
  const consultation = data.consultations.find((item) => item.id === consultationId);
  const safetyContext = consultation
    ? latestClinicalSafetyContext(data.clinicalSafetyContexts, consultation.patient_identity_id)
    : undefined;
  const safetyReady =
    !!safetyContext &&
    consultation?.clinical_safety_context_id === safetyContext.id &&
    consultation.clinical_safety_context_version === safetyContext.version &&
    consultation.clinical_safety_acknowledged_by_expert_id === expertId;

  const issue = () => {
    const rxId = nextId("rx");
    let issued = false;
    update((d) => {
      const row = d.consultations.find(
        (item) => item.id === consultationId && item.expert_id === expertId,
      );
      if (row?.status !== "ACTIVE") return;
      if (!medication.trim() || !dosage.trim()) return;
      if (
        form?.correctsId &&
        !d.prescriptions.some(
          (item) =>
            item.id === form.correctsId &&
            item.consultation_id === consultationId &&
            !item.corrected_by_id,
        )
      )
        return;
      const latest = latestClinicalSafetyContext(d.clinicalSafetyContexts, row.patient_identity_id);
      if (
        !latest ||
        row.clinical_safety_context_id !== latest.id ||
        row.clinical_safety_context_version !== latest.version ||
        row.clinical_safety_acknowledged_by_expert_id !== expertId
      )
        return;
      d.prescriptions = [
        ...d.prescriptions.map((p) =>
          p.id === form?.correctsId ? { ...p, corrected_by_id: rxId } : p,
        ),
        {
          id: rxId,
          consultation_id: consultationId,
          medication: medication.trim(),
          dosage: dosage.trim(),
          instructions: instructions.trim(),
          issued_at: now().toISOString().slice(0, 19),
          corrects_id: form?.correctsId ?? null,
          corrected_by_id: null,
          fulfillment_status: null,
          filled_at: null,
          pharmacy_name: null,
          paid_note: null,
          clinical_safety_context_id: latest.id,
          clinical_safety_context_version: latest.version,
        },
      ];
      if (form?.correctsId) stopObsoleteFulfilment(d, form.correctsId);
      issued = true;
    });
    if (!issued) {
      toast("Clinical safety context changed. Review and acknowledge the latest version.");
      return;
    }
    toast(form?.correctsId ? "Correction issued." : "Prescription issued.");
    setForm(null);
    setMedication("");
    setDosage("");
    setInstructions("");
  };

  return (
    <div className="space-y-4">
      {!safetyReady ? (
        <Banner tone="warning">
          Review and acknowledge the current clinical safety context above before prescribing.
          Missing or declined information is never treated as none known.
        </Banner>
      ) : (
        <Banner tone="info">
          Prescription will record clinical safety context version {safetyContext?.version}. This is
          not an automated interaction or suitability check.
        </Banner>
      )}
      {rows.length ? (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className={r.corrected_by_id ? "opacity-60" : ""}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading text-h3">{r.medication}</p>
                    <p className="font-mono text-data">{r.dosage}</p>
                  </div>
                  {r.corrected_by_id ? (
                    <Badge>Corrected</Badge>
                  ) : r.corrects_id ? (
                    <Badge tone="info">Amendment</Badge>
                  ) : null}
                </div>
                <p className="measure mt-2 text-body-sm text-base-content/80">{r.instructions}</p>
                <p className="mt-2 font-mono text-body-sm text-base-content/50">
                  Issued {formatDateTime(r.issued_at)}
                </p>
                {active && !r.corrected_by_id ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    disabled={!safetyReady}
                    onClick={() => {
                      setForm({ correctsId: r.id });
                      setMedication(r.medication);
                      setDosage(r.dosage);
                      setInstructions(r.instructions);
                    }}
                  >
                    <Pencil aria-hidden className="size-4" strokeWidth={1.5} />
                    Correct this
                  </Button>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      {active ? (
        rows.length && !form ? (
          <Button variant="secondary" full disabled={!safetyReady} onClick={() => setForm({})}>
            <Pill aria-hidden className="size-4" strokeWidth={1.5} />
            Issue another
          </Button>
        ) : (
          <Card className="space-y-3">
            <p className="font-heading text-h3">
              {form?.correctsId ? "Correct this prescription" : "Issue a prescription"}
            </p>
            {form?.correctsId ? (
              <p className="measure text-body-sm text-base-content/65">
                The original stays visible on the patient's record with a link forward to this one.
                Nothing is deleted.
              </p>
            ) : null}
            <Field label="Medication">
              {(p) => (
                <Input {...p} value={medication} onChange={(e) => setMedication(e.target.value)} />
              )}
            </Field>
            <Field label="Dosage">
              {(p) => (
                <Input
                  {...p}
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="20mg capsule, once daily"
                />
              )}
            </Field>
            <Field label="Instructions">
              {(p) => (
                <Textarea
                  {...p}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              )}
            </Field>
            <div className="flex gap-2">
              {form?.correctsId || rows.length ? (
                <Button variant="secondary" onClick={() => setForm(null)}>
                  Cancel
                </Button>
              ) : null}
              <Button
                full
                disabled={!medication.trim() || !dosage.trim() || !safetyReady}
                onClick={issue}
              >
                {form?.correctsId ? "Issue correction" : "Issue"}
              </Button>
            </div>
          </Card>
        )
      ) : (
        <p className="text-body-sm text-base-content/60">
          {rows.length
            ? "This consultation is closed, so these are final."
            : "Nothing was prescribed on this consultation."}
        </p>
      )}
    </div>
  );
}

/** X16 — Lab Orders. The visual twin of X15; only the field labels differ. */
function LabOrders({ consultationId, active }: { consultationId: string; active: boolean }) {
  const expertId = useExpertSeat();
  const { data, update, toast, nextId } = usePrototype();
  const [open, setOpen] = useState(false);
  const [correctsId, setCorrectsId] = useState<string | null>(null);
  const [test, setTest] = useState("");
  const [instructions, setInstructions] = useState("");
  const [recommended, setRecommended] = useState<string | null>(null);
  const [picker, setPicker] = useState(false);
  // Second gate, independent of the tab and the panel. Prescribing and lab
  // ordering are allow-listed to DOCTOR under NMCN/PCN/MLSCN scope of practice
  // (assumed, advisor-informed). A Nurse, Pharmacist, Lab Scientist or
  // Physiotherapist seat reaching here by any route sees only the refusal.
  if (expertById(data, expertId)?.professional_type !== "DOCTOR") {
    return (
      <EmptyState
        title="Ordering lab tests is not in your scope"
        body="Your professional type is not permitted to issue this. Refer the patient to a doctor, or record your own findings in the case note."
      />
    );
  }

  const rows = labOrdersFor(data, consultationId);
  const labs = data.providers.filter((p) => p.provider_type === "LAB");
  const consultation = data.consultations.find((item) => item.id === consultationId);
  const safetyContext = consultation
    ? latestClinicalSafetyContext(data.clinicalSafetyContexts, consultation.patient_identity_id)
    : undefined;
  const safetyReady =
    !!safetyContext &&
    consultation?.clinical_safety_context_id === safetyContext.id &&
    consultation.clinical_safety_context_version === safetyContext.version &&
    consultation.clinical_safety_acknowledged_by_expert_id === expertId;

  return (
    <div className="space-y-4">
      {!safetyReady ? (
        <Banner tone="warning">
          Review and acknowledge the current clinical safety context above before ordering a test.
          Missing or declined information is never treated as none known.
        </Banner>
      ) : null}
      {rows.length ? (
        <ul className="space-y-2.5">
          {rows.map((l) => (
            <li key={l.id}>
              <Card className={l.corrected_by_id ? "opacity-60" : ""}>
                {l.corrected_by_id ? (
                  <Badge>Corrected</Badge>
                ) : l.corrects_id ? (
                  <Badge tone="info">Amendment</Badge>
                ) : null}
                <p className="font-heading text-h3">{l.test_requested}</p>
                {l.instructions ? (
                  <p className="measure mt-1.5 text-body-sm text-base-content/80">
                    {l.instructions}
                  </p>
                ) : null}
                {l.result_status === "ATTACHED" ? (
                  <div className="mt-2 rounded-brand bg-success-tint p-2.5 text-body-sm text-success">
                    <p className="measure">{l.result_summary}</p>
                    <p className="mt-1 font-mono text-data">
                      {l.result_source ?? "Patient record"} · {formatDateTime(l.result_at)}
                    </p>
                    {l.result_file_name ? <p className="mt-1">{l.result_file_name}</p> : null}
                  </div>
                ) : (
                  <p className="mt-2 text-body-sm text-base-content/55">No result yet.</p>
                )}
                <p className="mt-2 font-mono text-body-sm text-base-content/50">
                  Ordered {formatDateTime(l.issued_at)}
                </p>
                {active && !l.corrected_by_id ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    disabled={!safetyReady}
                    onClick={() => {
                      setCorrectsId(l.id);
                      setTest(l.test_requested);
                      setInstructions(l.instructions ?? "");
                      setRecommended(l.recommended_lab_id);
                      setOpen(true);
                    }}
                  >
                    Correct this
                  </Button>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      ) : null}

      {active ? (
        rows.length && !open ? (
          <Button
            variant="secondary"
            full
            disabled={!safetyReady}
            onClick={() => {
              setCorrectsId(null);
              setOpen(true);
              setTest("");
              setInstructions("");
              setRecommended(null);
            }}
          >
            <FlaskConical aria-hidden className="size-4" strokeWidth={1.5} />
            Order another
          </Button>
        ) : (
          <Card className="space-y-3">
            <p className="font-heading text-h3">
              {correctsId ? "Correct this lab order" : "Order a test"}
            </p>
            {correctsId ? (
              <p className="measure text-body-sm text-base-content/65">
                The original stays on the record and links to this amendment. Unfinished fulfilment
                of the old version stops.
              </p>
            ) : null}
            <Field label="Test requested">
              {(p) => (
                <Input
                  {...p}
                  value={test}
                  onChange={(e) => setTest(e.target.value)}
                  placeholder="Full blood count and serum ferritin"
                />
              )}
            </Field>
            <Field label="Instructions" optional>
              {(p) => (
                <Textarea
                  {...p}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Suggest a lab"
              optional
              hint="A suggestion the patient can override. Never required to order a test."
            >
              {() => (
                <button
                  type="button"
                  onClick={() => setPicker(true)}
                  className="min-h-11 w-full rounded-brand border border-base-300 bg-base-200 px-3 text-left text-body"
                >
                  {recommended ? (
                    labs.find((l) => l.id === recommended)?.business_name
                  ) : (
                    <span className="text-base-content/45">No suggestion</span>
                  )}
                </button>
              )}
            </Field>
            <div className="flex gap-2">
              {rows.length ? (
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
              ) : null}
              <Button
                full
                disabled={!test.trim() || !safetyReady}
                onClick={() => {
                  const orderId = nextId("lab");
                  let issued = false;
                  update((d) => {
                    const current = d.consultations.find(
                      (row) => row.id === consultationId && row.expert_id === expertId,
                    );
                    if (!test.trim() || current?.status !== "ACTIVE") return;
                    const latest = latestClinicalSafetyContext(
                      d.clinicalSafetyContexts,
                      current.patient_identity_id,
                    );
                    if (
                      !latest ||
                      current.clinical_safety_context_id !== latest.id ||
                      current.clinical_safety_context_version !== latest.version ||
                      current.clinical_safety_acknowledged_by_expert_id !== expertId
                    )
                      return;
                    if (
                      correctsId &&
                      !d.labOrders.some(
                        (item) =>
                          item.id === correctsId &&
                          item.consultation_id === consultationId &&
                          !item.corrected_by_id,
                      )
                    )
                      return;
                    d.labOrders = [
                      ...d.labOrders.map((item) =>
                        item.id === correctsId ? { ...item, corrected_by_id: orderId } : item,
                      ),
                      {
                        id: orderId,
                        consultation_id: consultationId,
                        test_requested: test.trim(),
                        instructions: instructions.trim() || null,
                        recommended_lab_id: recommended,
                        issued_at: now().toISOString().slice(0, 19),
                        corrects_id: correctsId,
                        corrected_by_id: null,
                        result_status: "PENDING",
                        result_at: null,
                        result_summary: null,
                        paid_note: null,
                      },
                    ];
                    if (correctsId) stopObsoleteFulfilment(d, correctsId);
                    issued = true;
                  });
                  if (!issued) {
                    toast(
                      "The case or clinical safety context changed. Review the latest information before trying again.",
                    );
                    return;
                  }
                  toast(correctsId ? "Lab order correction issued." : "Lab order issued.");
                  setOpen(false);
                  setCorrectsId(null);
                  setTest("");
                  setInstructions("");
                }}
              >
                {correctsId ? "Issue correction" : "Order it"}
              </Button>
            </div>
          </Card>
        )
      ) : (
        <p className="text-body-sm text-base-content/60">
          {rows.length
            ? "This consultation is closed, so these are final."
            : "No tests were ordered on this consultation."}
        </p>
      )}

      <Sheet open={picker} onClose={() => setPicker(false)} title="Suggest a lab">
        <SearchablePicker
          items={[{ id: "", business_name: "No suggestion", premises_address: "" }, ...labs]}
          value={recommended ?? ""}
          getKey={(l) => l.id}
          getLabel={(l) => l.business_name}
          getMeta={(l) => l.premises_address ?? ""}
          placeholder="Search verified labs"
          onSelect={(l) => {
            setRecommended(l.id || null);
            setPicker(false);
          }}
        />
      </Sheet>
    </div>
  );
}

/** X17 — Create Referral. Be explicit: a referral is a new, billable consultation. */
function Refer({ consultation }: { consultation: ConsultationRead }) {
  const { data, update, toast, nextId } = usePrototype();
  const [picker, setPicker] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [sentId, setSentId] = useState<string | null>(null);
  const depth = (consultation.referral_chain_depth ?? 0) + 1;
  const capped = depth > 3;
  const target = chosen ? expertById(data, chosen) : undefined;
  const others = data.experts.filter((e) => e.id !== consultation.expert_id);
  const active = consultation.status === "ACTIVE";

  if (!active) {
    return (
      <p className="text-body-sm text-base-content/60">
        A referral can only be created while the consultation is active.
      </p>
    );
  }

  if (sentId) {
    return (
      <div className="space-y-4">
        <Banner tone="success">
          Referral {sentId} is waiting for the patient. No checkout, slot or receiving-expert
          request exists until they review the reason, fee and consent.
        </Banner>
        <p className="measure text-body-sm text-base-content/65">
          The patient can resume this decision from their home screen. This consultation stays
          unchanged.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <p className="font-heading text-h3">A referral is a new consultation</p>
        <p className="measure mt-1.5 text-body-sm text-base-content/75">
          It isn't a hand-off inside this one. The patient pays the receiving expert's fee{" "}
          <em>and</em> Monovella's fee again, at the full rate. Say so when you suggest it — they
          see the same breakdown before they accept.
        </p>
        <p className="measure mt-2 text-body-sm text-base-content/65">
          Monovella caps a chain at three hops. This would be referral {depth}.
        </p>
      </Card>

      {capped ? (
        <Banner tone="warning">
          This referral chain has reached its 3-hop cap. Handle it within this consultation, or
          advise in-person care.
        </Banner>
      ) : (
        <>
          <Field label="Refer to">
            {() => (
              <button
                type="button"
                onClick={() => setPicker(true)}
                className="min-h-11 w-full rounded-brand border border-base-300 bg-base-200 px-3 text-left text-body"
              >
                {target ? (
                  `${expertName(data, target.id)} · ${specialtyLabel(target.specialty)}`
                ) : (
                  <span className="text-base-content/45">Choose a specialist</span>
                )}
              </button>
            )}
          </Field>

          {target ? (
            <Card>
              <dl className="divide-y divide-base-300">
                <DataRow
                  label={`${expertName(data, target.id)}'s fee`}
                  value={naira(target.consultation_fee_kobo)}
                />
                <DataRow
                  label="Monovella's fee"
                  value={naira(Math.min(Math.round(target.consultation_fee_kobo * 0.2), 300000))}
                />
              </dl>
            </Card>
          ) : null}

          <Field label="Why" hint="The patient reads this, and so does the receiving expert.">
            {(p) => <Textarea {...p} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>

          <Button
            full
            disabled={!chosen || !reason.trim()}
            onClick={() => {
              if (!target) return;
              const credential = target.credentials.find(
                (candidate) =>
                  candidate.verification_status === "VERIFIED" && !candidate.retired_at,
              );
              if (!credential) return;
              const referralId = nextId("con");
              const requestedAt = now().toISOString().slice(0, 19);
              const summary = reason.trim();
              update((draft) => {
                const source = draft.consultations.find(
                  (candidate) =>
                    candidate.id === consultation.id &&
                    candidate.expert_id === consultation.expert_id &&
                    candidate.status === "ACTIVE",
                );
                if (
                  !source ||
                  draft.consultations.some((candidate) => candidate.id === referralId)
                ) {
                  return;
                }
                draft.consultations = [
                  {
                    id: referralId,
                    expert_id: target.id,
                    patient_identity_id: source.patient_identity_id,
                    status: "REQUESTED",
                    platform_fee_kobo: platformFee(credential.consultation_fee_kobo),
                    expert_fee_kobo: credential.consultation_fee_kobo,
                    credential_id: credential.id,
                    tier: credential.tier,
                    requested_at: requestedAt,
                    scheduled_start: null,
                    scheduled_end: null,
                    respond_by: null,
                    referred_from_id: source.id,
                    referral_reason: summary,
                    referral_chain_depth: depth,
                    telemedicine_consent_at: null,
                    referral_disclosure_ack_at: null,
                    completed_at: null,
                    workday_impact_answer: null,
                    responded_at: null,
                    request_summary: null,
                  },
                  ...draft.consultations,
                ];
              });
              setSentId(referralId);
              toast("Referral sent. The patient decides what happens next.");
            }}
          >
            <UserPlus aria-hidden className="size-4" strokeWidth={1.5} />
            Send the referral
          </Button>
        </>
      )}

      <Sheet open={picker} onClose={() => setPicker(false)} title="Choose a specialist">
        <SearchablePicker
          items={others}
          value={chosen ?? ""}
          getKey={(expert) => expert.id}
          getLabel={(expert) =>
            `${expert.professional_type === "DOCTOR" ? "Dr. " : ""}${expert.first_name} ${expert.last_name}`
          }
          // A referral is remote, so location does not decide it; how quickly
          // they are likely to respond does.
          getMeta={(expert) =>
            `${specialtyLabel(expert.specialty)} · ${
              availabilityLabel[
                data.expertAvailabilityStatus[expert.id] ?? expert.availability_status
              ]
            }`
          }
          placeholder="Search verified experts"
          onSelect={(expert) => {
            setChosen(expert.id);
            setPicker(false);
          }}
        />
      </Sheet>
    </div>
  );
}

/** X25 — Invite a Guest Expert. Same consultation, one examination — never a hand-off. */
/**
 * How near a candidate guest is to the patient, and how quickly they respond.
 *
 * A guest examination is the one part of Monovella that happens in a room, so
 * the two things that decide whether it can happen at all are where the expert
 * is and whether they are taking work. Neither was shown, which left the
 * inviting expert picking a name and hoping.
 *
 * Local government area, then city, then state: the coarsest split a Nigerian
 * address reliably gives, and honest about being coarse. It is not a distance.
 */
function proximityToPatient(
  expert: { local_government_area?: string | null; city?: string | null; state?: string | null },
  patient: { local_government_area?: string | null; city?: string | null; state?: string | null },
): { rank: number; label: string } {
  if (
    expert.local_government_area &&
    expert.local_government_area === patient.local_government_area
  )
    return { rank: 0, label: `Same area · ${expert.local_government_area}` };
  if (expert.city && expert.city === patient.city)
    return { rank: 1, label: `Same city · ${expert.local_government_area ?? expert.city}` };
  if (expert.state && expert.state === patient.state)
    return { rank: 2, label: `Same state · ${expert.city ?? expert.state}` };
  return { rank: 3, label: `Different state · ${expert.state ?? "location not given"}` };
}

function GuestInvite({
  consultation,
  active,
}: {
  consultation: ConsultationRead;
  active: boolean;
}) {
  const { data, update, toast } = usePrototype();
  const [picker, setPicker] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const patient = patientById(data, consultation.patient_identity_id);
  // Nearest first, then whoever is actually taking work. A guest examination
  // happens in a room, so both decide whether it can happen at all.
  const others = data.experts
    .filter((e) => e.id !== consultation.expert_id)
    // An expert may not examine themselves. Patient and Expert are one account,
    // so a guest invitation is the other route to the pairing that self-booking
    // already blocks in discovery.
    .filter(
      (e) => !isSelfExamination(consultation, e.id, { patientId: PATIENT_ID, expertId: EXPERT_ID }),
    )
    .map((expert) => ({
      expert,
      proximity: proximityToPatient(expert, patient ?? {}),
      available:
        (data.expertAvailabilityStatus[expert.id] ?? expert.availability_status) === "ONLINE",
    }))
    .sort(
      (left, right) =>
        left.proximity.rank - right.proximity.rank ||
        Number(right.available) - Number(left.available),
    );
  const guest = consultation.guest_expert_id
    ? expertById(data, consultation.guest_expert_id)
    : null;
  const status = consultation.guest_examination_status;

  if (!active && !guest) {
    return (
      <p className="text-body-sm text-base-content/60">
        A guest expert can only be invited while the consultation is active.
      </p>
    );
  }

  if (guest && status) {
    const STATUS_COPY: Record<string, string> = {
      REQUESTED: `Waiting on ${expertName(data, guest.id)} to respond.`,
      AWAITING_PATIENT_PAYMENT: `${expertName(data, guest.id)} accepted the fee. Waiting for ${patientName(data, consultation.patient_identity_id)} to approve and pay.`,
      ACCEPTED: `${expertName(data, guest.id)} accepted and is examining ${patientName(data, consultation.patient_identity_id)}.`,
      DECLINED: `${expertName(data, guest.id)} declined. You can invite someone else.`,
      COMPLETED: `${expertName(data, guest.id)}'s findings are in the case note, attributed to them.`,
    };
    const guestCheckout = data.checkoutPayments.find(
      (payment) =>
        payment.consultation_id === consultation.id &&
        payment.provider_id === guest.id &&
        payment.provider_type === "SPECIALIST",
    );
    return (
      <div className="space-y-4">
        <Card>
          <Badge
            tone={
              status === "COMPLETED" ? "success" : status === "DECLINED" ? "neutral" : "warning"
            }
          >
            {status === "REQUESTED"
              ? "Waiting"
              : status === "AWAITING_PATIENT_PAYMENT"
                ? "Patient decision"
                : status === "ACCEPTED"
                  ? "In examination"
                  : status === "DECLINED"
                    ? "Declined"
                    : "Findings received"}
          </Badge>
          <p className="measure mt-3 text-body text-base-content/85">{STATUS_COPY[status]}</p>
          {consultation.guest_examination_reason ? (
            <p className="measure mt-3 border-t border-base-300 pt-3 text-body-sm text-base-content/65">
              “{consultation.guest_examination_reason}”
            </p>
          ) : null}
          {consultation.guest_expert_fee_kobo ? (
            <dl className="mt-3 divide-y divide-base-300 border-t border-base-300 pt-2">
              <DataRow
                label={`${expertName(data, guest.id)}'s examination fee`}
                value={naira(consultation.guest_expert_fee_kobo)}
              />
              {guestCheckout ? (
                <DataRow label="Checkout" value={guestCheckout.status.toLowerCase()} mono={false} />
              ) : null}
            </dl>
          ) : null}
        </Card>
        {active && status === "DECLINED" ? (
          <Button
            full
            variant="secondary"
            onClick={() =>
              update((d) => {
                d.consultations = d.consultations.map((c) =>
                  c.id === consultation.id
                    ? { ...c, guest_expert_id: null, guest_examination_status: null }
                    : c,
                );
              })
            }
          >
            Invite someone else
          </Button>
        ) : active && (status === "REQUESTED" || status === "AWAITING_PATIENT_PAYMENT") ? (
          <Button
            full
            variant="secondary"
            onClick={() =>
              update((draft) => {
                if (
                  draft.checkoutPayments.some(
                    (payment) =>
                      payment.consultation_id === consultation.id &&
                      payment.payer_role === "GUEST" &&
                      payment.status === "PAID",
                  )
                )
                  return;
                draft.consultations = draft.consultations.map((item) =>
                  item.id === consultation.id
                    ? {
                        ...item,
                        guest_expert_id: null,
                        guest_examination_status: null,
                        guest_examination_reason: null,
                        guest_expert_fee_kobo: null,
                      }
                    : item,
                );
                draft.checkoutPayments = draft.checkoutPayments.map((payment) =>
                  payment.consultation_id === consultation.id &&
                  payment.payer_role === "GUEST" &&
                  payment.status !== "PAID"
                    ? { ...payment, status: "FAILED" }
                    : payment,
                );
              })
            }
          >
            Withdraw invite
          </Button>
        ) : null}
      </div>
    );
  }

  const target = chosen ? expertById(data, chosen) : undefined;

  return (
    <div className="space-y-4">
      {patient ? (
        <Card>
          <p className="text-label text-base-content/60">Where {patient.first_name} is</p>
          <p className="mt-1 font-heading text-h3">
            {/* Lagos city inside Lagos state would otherwise read "Lagos, Lagos". */}
            {[...new Set([patient.local_government_area, patient.city, patient.state])]
              .filter(Boolean)
              .join(", ")}
          </p>
          <p className="measure mt-1.5 text-body-sm text-base-content/70">
            A guest examination happens in person, so invite someone who can actually reach{" "}
            {patient.first_name}. The list below is ordered by area, then by who is taking work.
          </p>
        </Card>
      ) : null}

      <Card>
        <p className="font-heading text-h3">A guest examines, you keep the case</p>
        <p className="measure mt-1.5 text-body-sm text-base-content/75">
          Unlike a referral, this stays the same consultation — a second expert contributes one
          examination's findings, attributed to them, and you continue caring for{" "}
          {patientName(data, consultation.patient_identity_id)} afterwards.
        </p>
      </Card>

      <Field label="Invite">
        {() => (
          <button
            type="button"
            onClick={() => setPicker(true)}
            className="min-h-11 w-full rounded-brand border border-base-300 bg-base-200 px-3 text-left text-body"
          >
            {target ? (
              `${expertName(data, target.id)} · ${specialtyLabel(target.specialty)}`
            ) : (
              <span className="text-base-content/45">Choose an expert</span>
            )}
          </button>
        )}
      </Field>

      {target ? (
        <Card>
          <dl className="divide-y divide-base-300">
            <DataRow
              label={`${expertName(data, target.id)}'s examination fee`}
              value={naira(target.consultation_fee_kobo)}
            />
            <DataRow
              label="Monovella service fee"
              value={naira(platformFee(target.consultation_fee_kobo))}
            />
            <DataRow
              label="Where they are"
              value={proximityToPatient(target, patient ?? {}).label}
              mono={false}
            />
          </dl>
          <p className="measure mt-2 text-body-sm text-base-content/65">
            {patientName(data, consultation.patient_identity_id)} sees one additional, disclosed
            checkout for {expertName(data, target.id)}'s examination fee plus the service fee.
            Accepting the invite does not charge the patient. They must review the disclosed fee and
            confirm checkout before the guest can join.
          </p>
        </Card>
      ) : null}

      {target && target.availability_status !== "ONLINE" ? (
        // Not a block: the colleague standing in the room with the patient may
        // well be Out of office in the app. It is a warning about how long the
        // patient may be left waiting on a response.
        <Banner tone="warning">
          {expertName(data, target.id)} is{" "}
          {availabilityLabel[target.availability_status].toLowerCase()} right now, so they may be
          slower to respond. The patient is not charged until the guest accepts and the patient
          confirms checkout.
        </Banner>
      ) : null}

      <Field
        label="Why"
        hint="The patient and the guest both see this — frame it around what the patient needs."
      >
        {(p) => <Textarea {...p} value={reason} onChange={(e) => setReason(e.target.value)} />}
      </Field>

      <Button
        full
        disabled={!chosen || !reason.trim()}
        onClick={() => {
          update((d) => {
            d.consultations = d.consultations.map((c) =>
              c.id === consultation.id
                ? {
                    ...c,
                    guest_expert_id: chosen,
                    guest_examination_status: "REQUESTED" as const,
                    guest_examination_reason: reason,
                  }
                : c,
            );
          });
          toast("Invite sent.");
        }}
      >
        <UserPlus aria-hidden className="size-4" strokeWidth={1.5} />
        Invite to examine
      </Button>

      <Sheet open={picker} onClose={() => setPicker(false)} title="Choose an expert">
        <SearchablePicker
          items={others}
          value={chosen ?? ""}
          getKey={(row) => row.expert.id}
          getLabel={(row) =>
            `${row.expert.professional_type === "DOCTOR" ? "Dr. " : ""}${row.expert.first_name} ${row.expert.last_name}`
          }
          getMeta={(row) =>
            `${specialtyLabel(row.expert.specialty)} · ${row.proximity.label} · ${
              availabilityLabel[
                data.expertAvailabilityStatus[row.expert.id] ?? row.expert.availability_status
              ]
            }`
          }
          placeholder="Search verified experts"
          onSelect={(row) => {
            setChosen(row.expert.id);
            setPicker(false);
          }}
        />
      </Sheet>
    </div>
  );
}
