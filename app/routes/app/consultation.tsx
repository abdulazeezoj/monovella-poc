import { ArrowRight, Check, FileText, MessageCircle, Phone, Star, WifiOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useCallSession } from "~/components/shell/call-provider";
import { CallScreen } from "~/components/shell/call-screen";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { ScreenStates } from "~/components/shell/state-switcher";
import type { ChatComposerMessage } from "~/components/ui";
import {
  Badge,
  Banner,
  Button,
  ButtonLink,
  Card,
  ChatBubble,
  ChatComposer,
  ChatUploadBubble,
  ConsultationBadge,
  Countdown,
  EmptyState,
  InlineLoading,
  ListGroup,
  ListRow,
  Sheet,
} from "~/components/ui";
import { FIXTURE_IDS } from "~/data/identities.generated";
import {
  chatFor,
  consultationForPatient,
  consultationSpecialty,
  expertName,
  labOrdersFor,
  latestProviderRequest,
  prescriptionsFor,
  providerById,
  soapNote,
} from "~/data/selectors";
import type { ConsultationRead, ConsultationStatus, SoapSection } from "~/data/types";
import { now } from "~/lib/clock";
import { terminalCloseout } from "~/lib/consultation-closeout";
import {
  formatDate,
  formatDateLong,
  formatTime,
  naira,
  providerOrderStatusLabel,
  specialtyLabel,
} from "~/lib/format";
import { usePrototype, useTick } from "~/store/prototype";

/**
 * P43 — Consultation Hub. The status banner is the signature element: its copy
 * changes completely per status, its structure never does.
 */
export default function ConsultationHub() {
  useTick();
  const { id } = useParams();
  const { data, session, update, toast } = usePrototype();
  const consultation = consultationForPatient(data, id ?? "", session.viewingPatientId);
  const [override, setOverride] = useState<ConsultationStatus | "live">("live");

  if (!consultation) {
    return (
      <MobileScreen title="Consultation" back="/app" patientContext>
        <EmptyState title="Consultation not found" body="It isn't on this account." />
      </MobileScreen>
    );
  }

  const status = override === "live" ? consultation.status : override;
  const name = expertName(data, consultation.expert_id);
  const guestName = consultation.guest_expert_id
    ? expertName(data, consultation.guest_expert_id)
    : "The guest expert";
  const guestMessages = {
    REQUESTED: `${guestName} has been invited to examine you in person. Waiting for their response.`,
    AWAITING_PATIENT_PAYMENT: `${guestName} accepted the invitation. Review and approve the separate fee before the examination can begin.`,
    ACCEPTED: `${guestName}'s examination is confirmed. Their findings will join this case after the visit.`,
    DECLINED: `${guestName}'s examination is not going ahead. Ask your primary expert about another option.`,
    COMPLETED: `${guestName} examined you at ${name}'s request. Their findings are in your case record.`,
  };
  const existingFeedback = data.feedbackEntries.find(
    (item) =>
      item.interaction_type === "EXPERT" &&
      item.interaction_id === consultation.id &&
      item.patient_identity_id === session.viewingPatientId,
  );
  const rx = prescriptionsFor(data, consultation.id);
  const labs = labOrdersFor(data, consultation.id);
  const note = soapNote(data, consultation.id);
  const hasRecord = rx.length || labs.length || note?.finalized_at;
  const checkout = data.checkoutPayments.find(
    (payment) =>
      payment.consultation_id === consultation.id &&
      payment.provider_id === consultation.expert_id &&
      payment.payer_role !== "GUEST",
  );

  return (
    <MobileScreen
      title={name}
      subtitle={specialtyLabel(consultationSpecialty(data, consultation))}
      back="/app"
      patientContext
    >
      <div data-screen="P43" className="space-y-4">
        <ScreenStates
          states={[
            { value: "live", label: "Live" },
            { value: "REQUESTED", label: "REQUESTED" },
            { value: "SCHEDULED", label: "SCHEDULED" },
            { value: "CANCELLED", label: "CANCELLED" },
            { value: "ACTIVE", label: "ACTIVE" },
            { value: "COMPLETED", label: "COMPLETED" },
            { value: "DECLINED", label: "DECLINED" },
            { value: "TIMED_OUT", label: "TIMED_OUT" },
          ]}
          value={override}
          onChange={setOverride}
        />

        <StatusBanner consultation={consultation} status={status} />

        {status === "ACTIVE" ? (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                update((draft) => {
                  const row = draft.consultations.find((item) => item.id === consultation.id);
                  if (row && !row.patient_joined_at)
                    row.patient_joined_at = now().toISOString().slice(0, 19);
                });
                toast("Your arrival is recorded.");
              }}
            >
              I have joined
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                update((draft) =>
                  terminalCloseout(draft, consultation.id, "PATIENT", "PATIENT_CANCELLED"),
                )
              }
            >
              Cancel consultation
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                update((draft) =>
                  terminalCloseout(draft, consultation.id, "PATIENT", "EXPERT_NO_SHOW"),
                )
              }
            >
              Expert did not attend
            </Button>
          </div>
        ) : null}

        {(status === "ACTIVE" || status === "COMPLETED") &&
        consultation.guest_expert_id &&
        consultation.guest_examination_status ? (
          <Banner tone="info">
            {guestMessages[consultation.guest_examination_status]}
            {consultation.guest_examination_reason &&
            consultation.guest_examination_status !== "COMPLETED"
              ? ` Reason: ${consultation.guest_examination_reason}`
              : ""}
            {consultation.guest_examination_status === "AWAITING_PATIENT_PAYMENT" &&
            consultation.guest_expert_fee_kobo ? (
              <>
                {" "}
                This creates a separate checkout of{" "}
                <span className="font-mono">{naira(consultation.guest_expert_fee_kobo)}</span> plus
                the disclosed service fee. It is separate from {name}'s own checkout.
              </>
            ) : null}
          </Banner>
        ) : null}

        {status === "ACTIVE" &&
        consultation.guest_examination_status === "AWAITING_PATIENT_PAYMENT" ? (
          <ButtonLink full to={`/app/consultations/${consultation.id}/guest-checkout`}>
            Review fee
          </ButtonLink>
        ) : null}

        {status !== "REQUESTED" &&
        status !== "DECLINED" &&
        status !== "TIMED_OUT" &&
        status !== "CANCELLED" ? (
          <ListGroup>
            <ListRow
              to={`/app/consultations/${consultation.id}/chat`}
              title="Chat"
              meta={
                status === "COMPLETED"
                  ? "Archived — still fully readable"
                  : `${chatFor(data, consultation.id).length} messages`
              }
            />
            {hasRecord ? (
              <ListRow
                to={`/app/consultations/${consultation.id}/record`}
                title="Case record"
                meta={`${rx.length} prescription${rx.length === 1 ? "" : "s"} · ${labs.length} lab order${labs.length === 1 ? "" : "s"}`}
              />
            ) : null}
          </ListGroup>
        ) : null}

        {status === "COMPLETED" ? (
          <>
            {/* Asked once, on the screen the patient already returns to. The
                feedback route existed but nothing ever offered it, so nobody
                was ever actually asked. */}
            {existingFeedback ? (
              <p className="text-body-sm text-base-content/60">
                You rated this consultation {existingFeedback.rating} of 5. Reference{" "}
                <span className="font-mono">{existingFeedback.id}</span>.
              </p>
            ) : (
              <Card>
                <p className="font-heading text-h3">How was this consultation?</p>
                <p className="measure mt-1.5 text-body-sm text-base-content/70">
                  A rating and a short review, typed or spoken. It helps the next patient choose,
                  and it is moderated before anyone else sees it.
                </p>
                <ButtonLink className="mt-3" full to={`/app/feedback/expert/${consultation.id}`}>
                  <Star aria-hidden className="size-4" strokeWidth={1.5} />
                  Rate {name}
                </ButtonLink>
              </Card>
            )}

            <ButtonLink
              to={`/app/reports/new?consultation=${consultation.id}`}
              variant="secondary"
              full
            >
              <FileText aria-hidden className="size-4" strokeWidth={1.5} />
              Report this visit
            </ButtonLink>

            {consultation.workday_impact_answer == null ? (
              <WorkdayCard consultationId={consultation.id} />
            ) : null}
          </>
        ) : null}

        <ListGroup label="Money">
          <ListRow
            to={`/app/consultations/${consultation.id}/checkout`}
            title="Checkout receipt"
            meta={
              checkout
                ? `${naira(checkout.total_amount_kobo)} · ${checkout.status}`
                : "Checkout not available"
            }
          />
        </ListGroup>

        {status === "COMPLETED" ||
        (status === "CANCELLED" && consultation.refund_outcome !== "NOT_ELIGIBLE") ? (
          <div className="flex flex-col gap-1 pt-2">
            <Link
              to={`/app/refunds/new/${consultation.id}`}
              className="px-1 py-2 text-label text-base-content/65"
            >
              Ask for a refund
            </Link>
            <Link
              to={`/app/complaints/new/${consultation.id}`}
              className="px-1 py-2 text-label text-base-content/65"
            >
              Raise a concern about the care
            </Link>
          </div>
        ) : null}
      </div>
    </MobileScreen>
  );

  function WorkdayCard({ consultationId }: { consultationId: string }) {
    const answer = (value: "YES" | "NO" | "DISMISSED") => {
      update((d) => {
        d.consultations = d.consultations.map((c) =>
          c.id === consultationId ? { ...c, workday_impact_answer: value } : c,
        );
      });
      if (value !== "DISMISSED") toast("Thanks.");
    };
    return (
      <div className="relative rounded-brand border border-base-300 bg-base-200 p-4">
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => answer("DISMISSED")}
          className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-brand text-base-content/45 hover:bg-base-300"
        >
          <X aria-hidden className="size-4" strokeWidth={1.5} />
        </button>
        <p className="measure pr-8 text-body">Did you need to take time off work for this?</p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => answer("YES")}>
            Yes
          </Button>
          <Button size="sm" variant="secondary" onClick={() => answer("NO")}>
            No
          </Button>
        </div>
      </div>
    );
  }
}

/**
 * One derived sentence, not a stack of badges. A patient can hold five statuses
 * at once; resolve the whole set to the loop most on them, then the one most
 * likely to move next.
 */
function StatusBanner({
  consultation,
  status,
}: {
  consultation: ConsultationRead;
  status: ConsultationStatus;
}) {
  const { data } = usePrototype();
  const name = expertName(data, consultation.expert_id);
  const rx = prescriptionsFor(data, consultation.id);
  const checkout = data.checkoutPayments.find(
    (payment) => payment.consultation_id === consultation.id,
  );

  let line = "Nothing needs you right now.";
  let action: React.ReactNode = null;

  if (status === "REQUESTED") {
    line = `Waiting for ${name} to confirm. Your time is held until then.`;
    action = (
      <ButtonLink
        to={`/app/consultations/${consultation.id}/booking`}
        size="sm"
        variant="secondary"
      >
        See booking
      </ButtonLink>
    );
  } else if (status === "SCHEDULED") {
    line = `${name} has accepted. Nothing is needed before the day. We will open this at the appointed time.`;
  } else if (status === "DECLINED") {
    line = `${name} wasn't able to take this booking. Your full checkout total is being refunded.`;
    action = (
      <ButtonLink to="/app/experts" size="sm" variant="secondary">
        Pick another
      </ButtonLink>
    );
  } else if (status === "TIMED_OUT") {
    line = `${name} didn't respond in time. The slot is released and your full checkout total is being refunded.`;
    action = (
      <ButtonLink to="/app/experts" size="sm" variant="secondary">
        Pick another
      </ButtonLink>
    );
  } else if (status === "CANCELLED") {
    const reasons = {
      PATIENT_CANCELLED: "You cancelled this consultation.",
      EXPERT_CANCELLED: `${name} cancelled this consultation.`,
      PATIENT_NO_SHOW: "This consultation closed because the patient did not attend.",
      EXPERT_NO_SHOW: `${name} did not attend this consultation.`,
      WINDOW_ELAPSED: "The appointment window passed without the consultation opening.",
    } as const;
    line = `${consultation.closeout_reason && consultation.closeout_reason in reasons ? reasons[consultation.closeout_reason as keyof typeof reasons] : "This booking was cancelled."} Your full checkout total is being refunded, and the slot is released.`;
  } else if (status === "ACTIVE") {
    line = `In progress with ${name}. Send anything relevant to the thread as it comes to you.`;
    action = (
      <ButtonLink to={`/app/consultations/${consultation.id}/chat`} size="sm">
        Open chat
      </ButtonLink>
    );
  } else if (status === "COMPLETED") {
    const unfilled = rx.find(
      (r) => r.fulfillment_status == null || r.fulfillment_status === "UNFILLED",
    );
    const pharmacyReq = unfilled
      ? latestProviderRequest(data, { prescriptionId: unfilled.id })
      : undefined;
    if (pharmacyReq?.status === "ACCEPTED" && pharmacyReq.order_status) {
      const pharmacy = providerById(data, pharmacyReq.provider_id)?.business_name;
      line = `${pharmacy} is ${providerOrderStatusLabel[pharmacyReq.order_status].toLowerCase()}. Your checkout has already been verified.`;
      action = (
        <ButtonLink to={`/app/prescriptions/${unfilled!.id}/order`} size="sm" variant="secondary">
          Open order
        </ButtonLink>
      );
    } else if (unfilled) {
      line = `You haven't told us what happened with ${unfilled.medication}.`;
      action = (
        <ButtonLink to={`/app/prescriptions/${unfilled.id}`} size="sm" variant="secondary">
          Close loop
        </ButtonLink>
      );
    } else if (checkout?.status === "PENDING") {
      line = "Your checkout is still confirming. We will not ask you to pay the expert separately.";
    } else if (checkout?.status === "FAILED") {
      line = "Your checkout did not complete, so this booking was not paid for.";
      action = (
        <ButtonLink to={`/app/consultations/${consultation.id}/checkout`} size="sm">
          View checkout
        </ButtonLink>
      );
    } else {
      line = "This consultation is complete and your record is finalised.";
    }
  }

  const tone =
    status === "ACTIVE"
      ? "border-success/35 bg-success-tint"
      : status === "DECLINED" || status === "TIMED_OUT" || status === "CANCELLED"
        ? "border-base-300 bg-base-200"
        : "border-base-300 bg-base-200";

  return (
    <div className={`rounded-brand-lg border-2 p-4 ${tone}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ConsultationBadge status={status} />
        {status === "REQUESTED" && consultation.respond_by ? (
          <Countdown deadline={consultation.respond_by} elapsedText="Time's up" />
        ) : null}
      </div>
      {consultation.scheduled_start ? (
        <p className="mt-2.5 font-mono text-data tabular text-base-content/70">
          {formatDateLong(consultation.scheduled_start)}, {formatTime(consultation.scheduled_start)}
        </p>
      ) : null}
      <p className="measure mt-1.5 text-body">{line}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** P44 — Chat. One continuous thread; the highest-volume reading surface. */
export function ConsultationChat() {
  const { id } = useParams();
  const { data, session, update, nextId } = usePrototype();
  const [view, setView] = useState<"live" | "loading" | "error" | "empty" | "uploading" | "failed">(
    "live",
  );
  const [uploadName, setUploadName] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const consultation = consultationForPatient(data, id ?? "", session.viewingPatientId);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  if (!consultation) {
    return (
      <MobileScreen title="Chat" back="/app" patientContext>
        <EmptyState title="Consultation not found" body="" />
      </MobileScreen>
    );
  }

  const name = expertName(data, consultation.expert_id);
  const messages = view === "empty" ? [] : chatFor(data, consultation.id);
  const archived = consultation.status === "COMPLETED";

  const send = (message: ChatComposerMessage) => {
    update((d) => {
      d.chatMessages = [
        ...d.chatMessages,
        {
          id: nextId("msg"),
          consultation_id: consultation.id,
          sender_type: "PATIENT",
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
    setUploadName(file.name);
    setView("uploading");
    window.setTimeout(() => {
      update((d) => {
        d.chatMessages = [
          ...d.chatMessages,
          {
            id: nextId("msg"),
            consultation_id: consultation.id,
            sender_type: "PATIENT",
            type,
            body: file.name,
            media_url: type === "VIDEO" ? "/media/attachment.mp4" : "/media/attachment.jpg",
            sent_at: now().toISOString().slice(0, 19),
          },
        ];
      });
      setUploadName(null);
      setView("live");
    }, 650);
  };

  return (
    <MobileScreen
      title={name}
      subtitle={archived ? "This consultation has ended" : "In progress"}
      back={`/app/consultations/${consultation.id}`}
      tabs="none"
      patientContext
      scrollRef={scrollRef}
      footer={
        archived ? null : (
          <ChatComposer onSend={send} onAttachment={attach} messageLabel={`Message ${name}`} />
        )
      }
      action={
        consultation.status === "ACTIVE" ? (
          <Link
            to={`/app/consultations/${consultation.id}/call`}
            aria-label={`Call ${name}`}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-base-300 bg-base-200 px-3.5 text-label text-base-content hover:bg-base-300"
          >
            <Phone aria-hidden className="size-4" strokeWidth={1.5} />
            Call
          </Link>
        ) : null
      }
    >
      <div data-screen="P44" className="space-y-3">
        {consultation.status === "ACTIVE" &&
        (consultation.call_state === "ACTIVE" || consultation.call_state === "RINGING") ? (
          <Link
            to={`/app/consultations/${consultation.id}/call`}
            className="flex items-center gap-2 rounded-brand bg-success-tint px-3 py-2.5 text-label text-success"
          >
            <span aria-hidden className="size-2 animate-pulse rounded-full bg-success" />A call with{" "}
            {name} is open — tap to rejoin
            <ArrowRight aria-hidden className="ml-auto size-4 shrink-0" strokeWidth={1.5} />
          </Link>
        ) : null}
        <ScreenStates
          states={[
            { value: "live", label: "Populated" },
            { value: "loading", label: "Loading" },
            { value: "error", label: "Couldn't load" },
            { value: "empty", label: "Empty" },
            { value: "uploading", label: "Media uploading" },
            { value: "failed", label: "Media failed" },
          ]}
          value={view}
          onChange={setView}
        />

        {view === "loading" ? (
          <InlineLoading label={`Opening your chat with ${name}`} rows={3} />
        ) : null}

        {view === "error" ? (
          <EmptyState
            icon={WifiOff}
            title="We couldn't load this conversation"
            body="Nothing you sent was lost. Check your connection and try again, or call instead if this is urgent."
            action={
              <>
                <Button onClick={() => setView("live")}>Try again</Button>
                <ButtonLink to="/app/support" variant="secondary">
                  Get help
                </ButtonLink>
              </>
            }
          />
        ) : null}

        {view !== "loading" && view !== "error" && !messages.length ? (
          <EmptyState
            icon={MessageCircle}
            title="Nothing sent yet"
            body={`${name} has accepted your case. Start wherever feels natural — what's going on, and since when.`}
          />
        ) : null}

        {view === "loading" || view === "error"
          ? null
          : messages.map((m, index) => (
              <ChatBubble
                key={m.id}
                own={m.sender_type === "PATIENT"}
                body={m.body}
                sentAt={m.sent_at}
                type={m.type}
                durationSeconds={m.duration_seconds}
                collapsible={index < messages.length - 1}
              />
            ))}

        {view === "uploading" ? (
          <ChatUploadBubble filename={uploadName ?? "photo.jpg"} progress={62} />
        ) : null}
        {view === "failed" ? (
          // The preview stays: a failure that replaces the picture with a
          // sentence leaves the person guessing which photo failed.
          <ChatUploadBubble
            failed
            filename={uploadName ?? "photo.jpg"}
            onRetry={() => setView("uploading")}
            onDiscard={() => setView("live")}
          />
        ) : null}

        {archived ? (
          <p className="border-t border-base-300 pt-4 text-center text-body-sm text-base-content/60">
            This consultation has ended. You can still read everything here.
          </p>
        ) : null}
      </div>
    </MobileScreen>
  );
}

/** P44a — patient side of the call. Shares CallScreen with X13a's expert wrapper. */
export function ConsultationCall() {
  const { id } = useParams();
  const { data, session, toast } = usePrototype();
  const navigate = useNavigate();
  const consultation = consultationForPatient(data, id ?? "", session.viewingPatientId);
  const call = useCallSession(
    id ?? "",
    consultation ? expertName(data, consultation.expert_id) : "Expert",
    `/app/consultations/${id}/call`,
    `/app/consultations/${id}/chat`,
    "PATIENT",
    session.viewingPatientId,
    consultation?.status === "ACTIVE",
  );

  useEffect(() => {
    if (consultation && consultation.status !== "ACTIVE") {
      toast("That consultation isn't active, so there's no call to join.");
      navigate(`/app/consultations/${consultation.id}`, { replace: true });
    }
  }, [consultation, navigate, toast]);

  if (!consultation) {
    return (
      <MobileScreen title="Call" back="/app" patientContext>
        <EmptyState title="Consultation not found" body="" />
      </MobileScreen>
    );
  }
  if (consultation.status !== "ACTIVE") return null;
  return (
    <div data-screen="P44a" className="flex h-full min-h-0 flex-1 flex-col">
      <CallScreen
        call={call}
        consultationId={consultation.id}
        otherName={expertName(data, consultation.expert_id)}
      />
    </div>
  );
}

/**
 * P45 — Case Record. The same four SOAP fields the expert writes, under plain
 * patient-facing headings.
 */
const DEMO_GUEST_CONTRIBUTION = {
  expert_id: FIXTURE_IDS.exp_lawal,
  text: "Wood's lamp exam shows accentuated pigment, consistent with epidermal melasma rather than dermal — supports the current plan without needing a change in approach.",
  submitted_at: "2026-08-23T09:40:00",
};

export function CaseRecord() {
  const { id } = useParams();
  const { data, session } = usePrototype();
  const [zoomed, setZoomed] = useState<string | null>(null);
  const [showGuestDemo, setShowGuestDemo] = useState(false);
  const consultation = consultationForPatient(data, id ?? "", session.viewingPatientId);
  if (!consultation) {
    return (
      <MobileScreen title="Case record" back="/app" patientContext>
        <EmptyState title="Consultation not found" body="" />
      </MobileScreen>
    );
  }

  const realNote = soapNote(data, consultation.id);
  // The patient sees the signed record. A draft, including guest findings,
  // remains expert-only until the primary expert finalizes it.
  const finalizedNote = realNote?.finalized_at ? realNote : null;
  const note =
    showGuestDemo && finalizedNote
      ? { ...finalizedNote, guest_objective_contribution: DEMO_GUEST_CONTRIBUTION }
      : finalizedNote;
  const rx = prescriptionsFor(data, consultation.id);
  const labs = labOrdersFor(data, consultation.id);
  const finalized = !!note?.finalized_at;
  const empty = !finalized && !rx.length && !labs.length;

  const SECTIONS: [string, string | null | undefined, SoapSection][] = [
    ["What you said", note?.subjective, "SUBJECTIVE"],
    ["What the doctor found", note?.objective, "OBJECTIVE"],
    ["What it means", note?.assessment, "ASSESSMENT"],
    ["Next steps", note?.plan, "PLAN"],
  ];
  const validAttachments = (section: SoapSection) =>
    (note?.attachments ?? []).filter(
      (a) => a.section === section && a.verification_status === "VALID",
    );

  return (
    <MobileScreen
      title="Case record"
      subtitle={expertName(data, consultation.expert_id)}
      back={`/app/consultations/${consultation.id}`}
      patientContext
    >
      <div data-screen="P45" className="space-y-5">
        <ScreenStates
          states={[
            { value: "default", label: "Default" },
            { value: "with_guest", label: "With guest examination" },
          ]}
          value={showGuestDemo ? "with_guest" : "default"}
          onChange={(v) => setShowGuestDemo(v === "with_guest")}
        />

        {empty ? (
          <EmptyState
            title="Nothing's been added to your record yet"
            body="Prescriptions and lab orders appear here when issued. Your visit note appears after your expert finalizes it."
          />
        ) : null}

        {finalized ? (
          <p className="text-body-sm text-base-content/60">
            Finalised {formatDate(note?.finalized_at)}. No further edits from either side.
          </p>
        ) : realNote ? (
          <Banner tone="info">
            Your expert is still writing your visit note. You can read it once they finalize it.
          </Banner>
        ) : null}

        {SECTIONS.filter(
          ([, body, section]) =>
            body ||
            validAttachments(section).length ||
            (section === "OBJECTIVE" && note?.guest_objective_contribution),
        ).map(([heading, body, section]) => (
          <section key={heading}>
            <h2 className="font-heading text-h3">{heading}</h2>
            {body ? (
              <p className="measure mt-1.5 whitespace-pre-wrap text-body text-base-content/85">
                {body}
              </p>
            ) : null}
            {validAttachments(section).length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {validAttachments(section).map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setZoomed(a.media_url)}
                    className="flex size-14 items-center justify-center overflow-hidden rounded-brand border border-base-300 bg-base-200"
                    aria-label={`View ${a.kind === "PHOTO" ? "photo" : "drawing"}`}
                  >
                    {a.kind === "DRAWING" ? (
                      <img src={a.media_url} alt="" className="size-full object-cover" />
                    ) : (
                      <FileText
                        aria-hidden
                        className="size-5 text-base-content/40"
                        strokeWidth={1.5}
                      />
                    )}
                  </button>
                ))}
              </div>
            ) : null}
            {section === "OBJECTIVE" && note?.guest_objective_contribution ? (
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
        ))}

        <Sheet open={!!zoomed} onClose={() => setZoomed(null)} title="Attachment">
          {zoomed ? (
            <div className="overflow-hidden rounded-brand border border-base-300 bg-base-200">
              <img src={zoomed} alt="" className="w-full" />
            </div>
          ) : null}
        </Sheet>

        {rx.length ? (
          <ListGroup label="Prescriptions">
            {rx.map((r) => (
              <ListRow
                key={r.id}
                to={`/app/prescriptions/${r.id}`}
                title={r.medication}
                meta={r.dosage}
                trailing={
                  r.fulfillment_status === "FILLED" ? (
                    <Badge tone="success" icon={Check}>
                      Filled
                    </Badge>
                  ) : r.fulfillment_status === "NOT_FILLED" ? (
                    <Badge>Not filled</Badge>
                  ) : (
                    <Badge tone="warning">Open</Badge>
                  )
                }
              />
            ))}
          </ListGroup>
        ) : null}

        {labs.length ? (
          <ListGroup label="Lab orders">
            {labs.map((l) => (
              <ListRow
                key={l.id}
                to={`/app/lab-orders/${l.id}`}
                title={l.test_requested}
                meta={l.result_summary ?? "No result yet"}
                trailing={
                  l.result_status === "ATTACHED" ? (
                    <Badge tone="success" icon={Check}>
                      Result in
                    </Badge>
                  ) : (
                    <Badge tone="warning">Pending</Badge>
                  )
                }
              />
            ))}
          </ListGroup>
        ) : null}

        {finalized ? (
          <ButtonLink
            to={`/app/reports/new?consultation=${consultation.id}`}
            variant="secondary"
            full
          >
            <FileText aria-hidden className="size-4" strokeWidth={1.5} />
            Take a signed copy of this visit
            <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
          </ButtonLink>
        ) : null}
      </div>
    </MobileScreen>
  );
}
