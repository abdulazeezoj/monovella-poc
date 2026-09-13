import {
  AlertTriangle,
  ArrowRight,
  HeartPulse,
  LockKeyhole,
  MessageCircleHeart,
  Mic,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { PageHeader } from "~/components/shell/web-shell";
import {
  Badge,
  Banner,
  Button,
  ButtonLink,
  Card,
  DataRow,
  EmptyState,
  Field,
  Input,
  SegmentedControl,
  Select,
  StarRating,
  Textarea,
} from "~/components/ui";
import { LAB_ID, PHARMACY_ID, patientName } from "~/data/selectors";
import type { PrivacyRequestType } from "~/data/types";
import { now } from "~/lib/clock";
import { formatDateTime } from "~/lib/format";
import { mutableSupportSlices, nextSupportReference, supportSlices } from "~/lib/support-lifecycle";
import { usePrototype, useTick } from "~/store/prototype";

type Surface = "patient" | "expert" | "pharmacy" | "lab" | "staff";

function surfaceFrom(pathname: string): Surface {
  if (pathname.startsWith("/console")) return "staff";
  if (pathname.startsWith("/pharmacy")) return "pharmacy";
  if (pathname.startsWith("/lab")) return "lab";
  if (pathname.startsWith("/app/expert")) return "expert";
  return "patient";
}

function surfaceConfig(
  surface: Exclude<Surface, "staff">,
  patientId: string,
  userId: string,
  expertId: string,
) {
  if (surface === "expert")
    return {
      role: "EXPERT" as const,
      requesterId: expertId,
      patientId: null,
      base: "/app/expert",
      mobile: true,
    };
  if (surface === "pharmacy")
    return {
      role: "PHARMACY" as const,
      requesterId: PHARMACY_ID,
      patientId: null,
      base: "/pharmacy",
      mobile: false,
    };
  if (surface === "lab")
    return {
      role: "LAB" as const,
      requesterId: LAB_ID,
      patientId: null,
      base: "/lab",
      mobile: false,
    };
  return {
    role: "PATIENT" as const,
    requesterId: userId,
    patientId,
    base: "/app",
    mobile: true,
  };
}

const statusTone = {
  SUBMITTED: "info",
  IN_REVIEW: "warning",
  WAITING_ON_CUSTOMER: "warning",
  RESOLVED: "success",
} as const;

export default function SupportRoute() {
  const { pathname } = useLocation();
  const surface = surfaceFrom(pathname);
  return surface === "staff" ? <StaffSupport /> : <CustomerSupport surface={surface} />;
}

function CustomerSupport({ surface }: { surface: Exclude<Surface, "staff"> }) {
  const { data, session, update, toast } = usePrototype();
  const navigate = useNavigate();
  const { supportId } = useParams();
  const config = surfaceConfig(surface, session.viewingPatientId, data.user.id, session.expertId);
  const slices = supportSlices(data);
  const owned = slices.supportCases.filter(
    (item) =>
      item.requester_role === config.role &&
      item.requester_id === config.requesterId &&
      (config.role !== "PATIENT" || item.patient_identity_id === config.patientId),
  );
  const selected = supportId ? owned.find((item) => item.id === supportId) : undefined;
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  if (supportId) {
    return (
      <RolePage surface={surface} title="Support request" back={`${config.base}/support`}>
        {selected ? (
          <div className="space-y-4" data-screen="support-status">
            <Banner tone={statusTone[selected.status]}>
              {selected.status === "SUBMITTED"
                ? "We have your request and will review it."
                : selected.status === "IN_REVIEW"
                  ? "A support specialist is reviewing this request."
                  : selected.status === "WAITING_ON_CUSTOMER"
                    ? "Support needs more information from you."
                    : "This request is resolved. You can still return to the original screen."}
            </Banner>
            <Card>
              <DataRow label="Reference" value={selected.id} />
              <DataRow label="Status" value={selected.status.replaceAll("_", " ")} mono={false} />
              <DataRow
                label="Submitted"
                value={formatDateTime(selected.submitted_at)}
                mono={false}
              />
              <DataRow
                label="Expected response by"
                value={formatDateTime(selected.response_due_by)}
                mono={false}
              />
              <DataRow label="Subject" value={selected.subject} mono={false} />
              {selected.last_response ? (
                <DataRow label="Support response" value={selected.last_response} mono={false} />
              ) : null}
            </Card>
            <ButtonLink to={selected.return_to}>Go back</ButtonLink>
          </div>
        ) : (
          <EmptyState
            title="Support request unavailable"
            body="This reference does not belong to the active account or patient profile."
            action={<ButtonLink to={`${config.base}/support`}>Support</ButtonLink>}
          />
        )}
      </RolePage>
    );
  }

  const submit = () => {
    if (!subject.trim() || !message.trim()) return;
    let id = "";
    update((draft) => {
      const target = mutableSupportSlices(draft);
      id = nextSupportReference(
        "SUP",
        target.supportCases.map((item) => item.id),
      );
      const submitted = now();
      target.supportCases.unshift({
        id,
        requester_role: config.role,
        requester_id: config.requesterId,
        patient_identity_id: config.patientId,
        category: "GENERAL",
        subject: subject.trim(),
        message: message.trim(),
        status: "SUBMITTED",
        submitted_at: submitted.toISOString(),
        response_due_by: new Date(submitted.getTime() + 24 * 60 * 60_000).toISOString(),
        last_response: null,
        return_to: config.base,
        closed_at: null,
      });
    });
    toast(`Support request ${id} submitted.`);
    navigate(`${config.base}/support/${id}`);
  };

  return (
    <RolePage surface={surface} title="Help and support" back={config.base}>
      <div className="space-y-5" data-screen="support-home">
        <Card>
          <h2 className="font-heading text-h2">Talk to a person</h2>
          <p className="measure mt-2 text-body-sm text-base-content/70">
            Email{" "}
            <a className="text-primary underline" href="mailto:support@monovella.com">
              support@monovella.com
            </a>{" "}
            or message our WhatsApp support line at{" "}
            <a className="text-primary underline" href="https://wa.me/2348000000000">
              +234 800 000 0000
            </a>
            . These are prototype contact details, not live support channels.
          </p>
        </Card>

        <EscalationLinks surface={surface} />

        <Card>
          <h2 className="font-heading text-h3">Ask for general help</h2>
          <p className="mt-1 text-body-sm text-base-content/65">
            Do not use this form for an emergency, clinical safety concern, refund or payment issue.
          </p>
          <div className="mt-4 space-y-4">
            <Field label="Subject">
              {(props) => (
                <Input
                  {...props}
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              )}
            </Field>
            <Field label="What happened?">
              {(props) => (
                <Textarea
                  {...props}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={5}
                />
              )}
            </Field>
            <Button onClick={submit} disabled={!subject.trim() || !message.trim()}>
              Send
            </Button>
          </div>
        </Card>

        {owned.length ? (
          <section aria-labelledby="my-support">
            <h2 id="my-support" className="mb-2 font-heading text-h3">
              Your requests
            </h2>
            <ul className="divide-y divide-base-300 overflow-hidden rounded-brand border border-base-300 bg-base-200">
              {owned.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`${config.base}/support/${item.id}`}
                    className="flex min-h-11 items-center gap-3 px-4 py-3 hover:bg-base-300"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-label font-medium">{item.subject}</span>
                      <span className="font-mono text-body-sm text-base-content/55">{item.id}</span>
                    </span>
                    <Badge tone={statusTone[item.status]}>{item.status.replaceAll("_", " ")}</Badge>
                    <ArrowRight aria-hidden className="size-4" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </RolePage>
  );
}

function EscalationLinks({ surface }: { surface: Exclude<Surface, "staff"> }) {
  const base =
    surface === "expert" ? "/app/expert" : surface === "patient" ? "/app" : `/${surface}`;
  return (
    <div className="grid gap-3 @2xl:grid-cols-2">
      <Card>
        <MessageCircleHeart aria-hidden className="size-5 text-primary" />
        <h2 className="mt-2 font-heading text-h3">Money or service issue</h2>
        <p className="mt-1 text-body-sm text-base-content/65">
          Use the payment, payout or request record so support receives the correct transaction.
        </p>
        <ButtonLink
          className="mt-3"
          variant="secondary"
          to={
            surface === "expert"
              ? "/app/expert/payouts"
              : surface === "patient"
                ? "/app/consultations"
                : `${base}/payments`
          }
        >
          Open record
        </ButtonLink>
      </Card>
      <Card>
        <HeartPulse aria-hidden className="size-5 text-error" />
        <h2 className="mt-2 font-heading text-h3">Care or safety concern</h2>
        <p className="mt-1 text-body-sm text-base-content/65">
          Clinical complaints use a protected safety review. Immediate danger needs local emergency
          care now.
        </p>
        {surface === "patient" ? (
          <ButtonLink className="mt-3" variant="secondary" to="/app/consultations">
            Choose consultation
          </ButtonLink>
        ) : null}
      </Card>
      {surface === "patient" ? (
        <Card>
          <LockKeyhole aria-hidden className="size-5 text-secondary" />
          <h2 className="mt-2 font-heading text-h3">Privacy request</h2>
          <p className="mt-1 text-body-sm text-base-content/65">
            Ask about access, correction, deletion, objection or consent.
          </p>
          <ButtonLink className="mt-3" variant="secondary" to="/app/privacy-request">
            Privacy request
          </ButtonLink>
        </Card>
      ) : null}
      <Card>
        <AlertTriangle aria-hidden className="size-5 text-warning" />
        <h2 className="mt-2 font-heading text-h3">Emergency</h2>
        <p className="mt-1 text-body-sm text-base-content/65">
          Support is not emergency care or continuous monitoring. Seek immediate in-person help.
        </p>
      </Card>
    </div>
  );
}

function RolePage({
  surface,
  title,
  back,
  children,
}: {
  surface: Exclude<Surface, "staff">;
  title: string;
  back: string;
  children: React.ReactNode;
}) {
  if (surface === "patient" || surface === "expert")
    return (
      <MobileScreen title={title} back={back} tabs="none">
        {children}
      </MobileScreen>
    );
  return (
    <>
      <PageHeader
        title={title}
        description="Support requests stay with the account and return to the screen they came from."
      />
      {children}
    </>
  );
}

function StaffSupport() {
  const { data, update, toast } = usePrototype();
  const { supportId } = useParams();
  const { supportCases, feedbackEntries } = supportSlices(data);
  const selected = supportId ? supportCases.find((item) => item.id === supportId) : undefined;
  const [response, setResponse] = useState("");

  if (supportId) {
    if (!selected)
      return (
        <>
          <PageHeader title="Support request" />
          <EmptyState title="Request unavailable" body="This support reference no longer exists." />
        </>
      );
    const transition = (status: "IN_REVIEW" | "WAITING_ON_CUSTOMER" | "RESOLVED") => {
      update((draft) => {
        const item = mutableSupportSlices(draft).supportCases.find(
          (candidate) => candidate.id === selected.id,
        );
        if (!item) return;
        item.status = status;
        if (response.trim()) item.last_response = response.trim();
        item.closed_at = status === "RESOLVED" ? now().toISOString() : null;
      });
      toast(`Support request ${selected.id} updated.`);
    };
    return (
      <>
        <PageHeader title={selected.subject} description={selected.id} />
        <div className="grid gap-4 @3xl:grid-cols-[1fr_22rem]">
          <Card>
            <DataRow label="Role" value={selected.requester_role} mono={false} />
            <DataRow label="Status" value={selected.status.replaceAll("_", " ")} mono={false} />
            <DataRow
              label="Response due"
              value={formatDateTime(selected.response_due_by)}
              mono={false}
            />
            <DataRow label="Message" value={selected.message} mono={false} />
          </Card>
          <Card>
            <Field label="Private reply">
              {(props) => (
                <Textarea
                  {...props}
                  value={response}
                  onChange={(event) => setResponse(event.target.value)}
                  rows={5}
                />
              )}
            </Field>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => transition("IN_REVIEW")}>
                Start review
              </Button>
              <Button variant="secondary" onClick={() => transition("WAITING_ON_CUSTOMER")}>
                Ask for information
              </Button>
              <Button onClick={() => transition("RESOLVED")} disabled={!response.trim()}>
                Reply and resolve
              </Button>
            </div>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Customer support"
        description="General help and private service recovery. Financial, clinical safety, emergency and privacy work stay in their own queues."
      />
      <div className="space-y-6">
        <ul className="divide-y divide-base-300 overflow-hidden rounded-brand border border-base-300 bg-base-200">
          {supportCases.map((item) => (
            <li key={item.id}>
              <Link
                to={`/console/support/${item.id}`}
                className="flex min-h-11 items-center gap-3 px-4 py-3 hover:bg-base-300"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-label font-medium">{item.subject}</span>
                  <span className="text-body-sm text-base-content/60">
                    {item.requester_role} · {item.id}
                  </span>
                </span>
                <Badge tone={statusTone[item.status]}>{item.status.replaceAll("_", " ")}</Badge>
              </Link>
            </li>
          ))}
        </ul>
        <section>
          <h2 className="mb-2 font-heading text-h2">Feedback moderation</h2>
          {feedbackEntries.length ? (
            <ul className="space-y-3">
              {feedbackEntries.map((item) => (
                <li key={item.id}>
                  <Card>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-label font-medium">
                          {item.rating} out of 5 · {item.interaction_type}
                        </p>
                        <p className="mt-1 text-body-sm text-base-content/70">
                          {item.public_comment || "No public comment."}
                        </p>
                        <p className="mt-2 font-mono text-body-sm text-base-content/50">
                          {item.id}
                        </p>
                      </div>
                      <Badge
                        tone={
                          item.moderation_status === "APPROVED"
                            ? "success"
                            : item.moderation_status === "HELD"
                              ? "error"
                              : "warning"
                        }
                      >
                        {item.moderation_status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          update((draft) => {
                            const feedback = mutableSupportSlices(draft).feedbackEntries.find(
                              (candidate) => candidate.id === item.id,
                            );
                            if (feedback) feedback.moderation_status = "APPROVED";
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          update((draft) => {
                            const feedback = mutableSupportSlices(draft).feedbackEntries.find(
                              (candidate) => candidate.id === item.id,
                            );
                            if (feedback) feedback.moderation_status = "HELD";
                          })
                        }
                      >
                        Hold for review
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title="No feedback waiting"
              body="Submitted feedback appears here before public display or a provider response."
            />
          )}
        </section>
      </div>
    </>
  );
}

export function PrivacyRequest() {
  const { data, session, update, toast } = usePrototype();
  const slices = supportSlices(data);
  const existing = slices.privacyRequests.filter(
    (item) => item.patient_identity_id === session.viewingPatientId,
  );
  const [type, setType] = useState("ACCESS");
  const [scope, setScope] = useState("");
  const submit = () => {
    if (!scope.trim()) return;
    let id = "";
    update((draft) => {
      const target = mutableSupportSlices(draft);
      id = nextSupportReference(
        "PRV",
        target.privacyRequests.map((item) => item.id),
      );
      const submitted = now();
      target.privacyRequests.unshift({
        id,
        patient_identity_id: session.viewingPatientId,
        request_type: type as PrivacyRequestType,
        scope: scope.trim(),
        identity_status: "VERIFICATION_REQUIRED",
        status: "SUBMITTED",
        submitted_at: submitted.toISOString(),
        response_due_by: new Date(submitted.getTime() + 7 * 24 * 60 * 60_000).toISOString(),
        response: null,
      });
    });
    setScope("");
    toast(`Privacy request ${id} submitted.`);
  };
  return (
    <MobileScreen title="Privacy request" back="/app/support" tabs="none">
      <div className="space-y-4" data-screen="privacy-request">
        <Banner tone="info">
          Identity verification is required before records are disclosed or changed.
        </Banner>
        <Card>
          <h2 className="font-heading text-h3">What would you like us to review?</h2>
          <div className="mt-4 space-y-4">
            <Field label="Request type">
              {(props) => (
                <Select {...props} value={type} onChange={(event) => setType(event.target.value)}>
                  <option value="ACCESS">Access my information</option>
                  <option value="CORRECTION">Correct information</option>
                  <option value="DELETION">Delete information</option>
                  <option value="OBJECTION">Object to a use</option>
                  <option value="CONSENT_QUESTION">Ask about consent</option>
                </Select>
              )}
            </Field>
            <Field label="Records or use involved">
              {(props) => (
                <Textarea
                  {...props}
                  rows={5}
                  value={scope}
                  onChange={(event) => setScope(event.target.value)}
                />
              )}
            </Field>
            <Button onClick={submit} disabled={!scope.trim()}>
              Submit request
            </Button>
          </div>
        </Card>
        <Banner tone="warning">
          A request does not guarantee deletion. Clinical and financial records that must remain
          auditable may be restricted or corrected instead. The final legal outcome requires review.
        </Banner>
        {existing.map((item) => (
          <Card key={item.id}>
            <DataRow label="Reference" value={item.id} />
            <DataRow
              label="Patient"
              value={patientName(data, item.patient_identity_id)}
              mono={false}
            />
            <DataRow label="Status" value={item.status.replaceAll("_", " ")} mono={false} />
            <DataRow
              label="Identity"
              value={item.identity_status.replaceAll("_", " ")}
              mono={false}
            />
            <DataRow
              label="Expected response by"
              value={formatDateTime(item.response_due_by)}
              mono={false}
            />
          </Card>
        ))}
      </div>
    </MobileScreen>
  );
}

export function Feedback() {
  useTick();
  const { data, session, update, toast } = usePrototype();
  const { kind, interactionId } = useParams();
  const slices = supportSlices(data);
  const type = kind?.toUpperCase() as "EXPERT" | "PHARMACY" | "LAB";
  const eligible = useMemo(() => {
    if (type === "EXPERT") {
      const item = data.consultations.find((candidate) => candidate.id === interactionId);
      return item?.status === "COMPLETED" && item.patient_identity_id === session.viewingPatientId;
    }
    const item = data.providerRequests.find((candidate) => candidate.id === interactionId);
    if (
      !item ||
      item.patient_identity_id !== session.viewingPatientId ||
      item.status !== "ACCEPTED"
    )
      return false;
    return type === "PHARMACY"
      ? item.order_status === "FULFILLED"
      : item.result_status === "UPLOADED";
  }, [data, interactionId, session.viewingPatientId, type]);
  const existing = slices.feedbackEntries.find(
    (item) =>
      item.interaction_type === type &&
      item.interaction_id === interactionId &&
      item.patient_identity_id === session.viewingPatientId,
  );
  const [rating, setRating] = useState(0);
  const [commentKind, setCommentKind] = useState<"TEXT" | "VOICE">("TEXT");
  const [comment, setComment] = useState("");
  // Recording is a simulated UI state, like every other media control here.
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [recording, setRecording] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const elapsed =
    startedAt === null ? 0 : Math.max(0, Math.floor((now().getTime() - startedAt) / 1000));
  const [privateRecovery, setPrivateRecovery] = useState("");
  if (!eligible)
    return (
      <MobileScreen title="Feedback" back="/app" tabs="none">
        <EmptyState
          title="Feedback unavailable"
          body="Feedback opens once for a completed interaction owned by the active patient profile."
        />
      </MobileScreen>
    );
  if (existing)
    return (
      <MobileScreen title="Feedback" back="/app" tabs="none">
        <Card>
          <Badge tone={existing.moderation_status === "APPROVED" ? "success" : "warning"}>
            {existing.moderation_status}
          </Badge>
          <h1 className="mt-3 font-heading text-h2">Feedback already received</h1>
          <p className="mt-2 text-body-sm text-base-content/70">
            Reference {existing.id}. Submitted feedback cannot be edited or submitted twice. Contact
            private support to report abuse or ask for recovery.
          </p>
        </Card>
      </MobileScreen>
    );
  const canSubmit =
    rating >= 1 && rating <= 5 && !recording && (commentKind === "TEXT" || voiceSeconds >= 3);
  const submit = () => {
    if (!canSubmit || existing || !eligible) return;
    let id = "";
    update((draft) => {
      const target = mutableSupportSlices(draft);
      if (
        target.feedbackEntries.some(
          (entry) =>
            entry.interaction_type === type &&
            entry.interaction_id === interactionId &&
            entry.patient_identity_id === session.viewingPatientId,
        )
      )
        return;
      id = nextSupportReference(
        "FDB",
        target.feedbackEntries.map((item) => item.id),
      );
      target.feedbackEntries.unshift({
        id,
        interaction_type: type,
        interaction_id: interactionId!,
        patient_identity_id: session.viewingPatientId,
        submitted_by_user_id: target.user.id,
        rating,
        public_comment: commentKind === "TEXT" ? comment.trim() : "",
        comment_kind: commentKind,
        voice_duration_seconds: commentKind === "VOICE" ? voiceSeconds : null,
        moderation_status: "PENDING",
        provider_response: null,
        submitted_at: now().toISOString(),
      });
      if (privateRecovery.trim()) {
        const supportId = nextSupportReference(
          "SUP",
          target.supportCases.map((item) => item.id),
        );
        const submitted = now();
        target.supportCases.unshift({
          id: supportId,
          requester_role: "PATIENT",
          requester_id: target.user.id,
          patient_identity_id: session.viewingPatientId,
          category: "SERVICE_RECOVERY",
          subject: `${type.toLowerCase()} service recovery`,
          message: privateRecovery.trim(),
          status: "SUBMITTED",
          submitted_at: submitted.toISOString(),
          response_due_by: new Date(submitted.getTime() + 24 * 60 * 60_000).toISOString(),
          last_response: null,
          return_to: `/app/feedback/${kind}/${interactionId}`,
          closed_at: null,
        });
      }
    });
    if (!id) return;
    toast(`Feedback ${id} submitted for moderation.`);
  };
  return (
    <MobileScreen title="Share feedback" back="/app" tabs="none">
      <Card>
        <p className="text-body-sm text-base-content/70">
          Public feedback is moderated before display. Providers may respond after moderation. Your
          private recovery note is filed separately and is never published.
        </p>
        <div className="mt-4 space-y-4">
          <StarRating value={rating} onChange={setRating} label="How was this care?" />

          {/* The prototype models the recording states without capturing audio. */}
          <div>
            <p className="mb-2 text-label font-medium text-base-content/70">
              Add a review (optional)
            </p>
            <SegmentedControl
              label="How would you like to leave a review?"
              value={commentKind}
              onChange={(next) => {
                setCommentKind(next as "TEXT" | "VOICE");
                setRecording(false);
                setStartedAt(null);
                setVoiceError(null);
              }}
              options={[
                { value: "TEXT", label: "Type it" },
                { value: "VOICE", label: "Say it" },
              ]}
            />
          </div>

          {commentKind === "TEXT" ? (
            <Field label="Public review">
              {(props) => (
                <Textarea
                  {...props}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                />
              )}
            </Field>
          ) : (
            <div className="rounded-brand border border-base-300 bg-base-200 p-4">
              {voiceSeconds > 0 && !recording ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-body-sm">
                    Demo recording ready ·{" "}
                    <span className="font-mono">
                      {Math.floor(voiceSeconds / 60)}:{String(voiceSeconds % 60).padStart(2, "0")}
                    </span>
                  </p>
                  <Button size="sm" variant="ghost" onClick={() => setVoiceSeconds(0)}>
                    Delete
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-body-sm text-base-content/70">
                    {recording ? `Demo recording… ${elapsed}s` : "Try recording a short review."}
                  </p>
                  <Button
                    size="sm"
                    variant={recording ? "destructive" : "secondary"}
                    onClick={() => {
                      if (recording) {
                        const duration =
                          startedAt === null
                            ? 0
                            : Math.max(0, Math.floor((now().getTime() - startedAt) / 1000));
                        setRecording(false);
                        setStartedAt(null);
                        if (duration < 3) {
                          setVoiceSeconds(0);
                          setVoiceError(
                            "That recording is too short. Try again for at least three seconds, or type your review.",
                          );
                        } else {
                          setVoiceSeconds(duration);
                          setVoiceError(null);
                        }
                        return;
                      }
                      setStartedAt(now().getTime());
                      setVoiceError(null);
                      setRecording(true);
                    }}
                  >
                    <Mic aria-hidden className="size-4" strokeWidth={1.5} />
                    {recording ? "Stop" : "Record"}
                  </Button>
                </div>
              )}
              {recording ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setRecording(false);
                    setStartedAt(null);
                    setVoiceSeconds(0);
                  }}
                >
                  Cancel recording
                </Button>
              ) : null}
              {voiceError ? <Banner tone="warning">{voiceError}</Banner> : null}
              <p className="mt-3 text-body-sm text-base-content/55">
                This demo simulates recording time. It does not capture microphone audio. The
                planned product keeps spoken reviews as audio, without transcription.
              </p>
            </div>
          )}
          <Field label="Private help from Monovella (optional)">
            {(props) => (
              <Textarea
                {...props}
                value={privateRecovery}
                onChange={(event) => setPrivateRecovery(event.target.value)}
                rows={4}
              />
            )}
          </Field>
          <Button disabled={!canSubmit} onClick={submit}>
            Submit once
          </Button>
          {!rating ? (
            <p className="text-body-sm text-base-content/60">
              Choose a star rating to submit. A review without one is not a rating.
            </p>
          ) : null}
        </div>
      </Card>
    </MobileScreen>
  );
}
