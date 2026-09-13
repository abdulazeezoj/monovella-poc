import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { useMutationStates } from "~/components/shell/mutation-states";
import { ScreenStates } from "~/components/shell/state-switcher";
import {
  Banner,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  Chip,
  ConsultationBadge,
  Countdown,
  DataRow,
  EmptyState,
  Modal,
  SegmentedControl,
} from "~/components/ui";
import {
  availabilityFor,
  consultationForPatient,
  consultationSpecialty,
  expertById,
  expertName,
  patientById,
} from "~/data/selectors";
import type { ConsultationStatus } from "~/data/types";
import { now } from "~/lib/clock";
import { CONSENT_VERSIONS, recordConsent } from "~/lib/consent-ledger";
import { formatDateLong, formatTime, naira, specialtyLabel } from "~/lib/format";
import { usePrototype, useTick } from "~/store/prototype";

/**
 * P40 — Booking Status. Two different waits live here and must not look alike:
 * waiting for a yes is an open question; holding a confirmed Thursday is not.
 */
export function BookingStatus() {
  useTick();
  const { id } = useParams();
  const { data, session, update, toast } = usePrototype();
  const navigate = useNavigate();
  const consultation = consultationForPatient(data, id ?? "", session.viewingPatientId);
  const [override, setOverride] = useState<ConsultationStatus | "live">("live");
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  if (!consultation) {
    return (
      <MobileScreen title="Booking" back="/app" patientContext>
        <EmptyState title="Booking not found" body="It may have been cancelled." />
      </MobileScreen>
    );
  }

  const status = override === "live" ? consultation.status : override;
  const name = expertName(data, consultation.expert_id);
  const patient = patientById(data, consultation.patient_identity_id);
  const bookingTitle = patient?.is_dependant
    ? `${patient.first_name ?? "Dependant"}'s booking`
    : "Your booking";
  const checkout = data.checkoutPayments.find(
    (payment) => payment.consultation_id === consultation.id,
  );
  const refundableTotal = checkout?.total_amount_kobo ?? 0;

  return (
    <MobileScreen title={bookingTitle} back="/app" tabs="none" patientContext>
      <div data-screen="P40" className="space-y-4">
        <ScreenStates
          states={[
            { value: "live", label: "Live" },
            { value: "REQUESTED", label: "Awaiting expert" },
            { value: "SCHEDULED", label: "Confirmed" },
            { value: "DECLINED", label: "Declined" },
            { value: "TIMED_OUT", label: "Timed out" },
            { value: "CANCELLED", label: "Cancelled by you" },
          ]}
          value={override}
          onChange={setOverride}
        />

        <Card>
          <ConsultationBadge status={status} />
          <p className="mt-3 font-heading text-h2">{name}</p>
          <p className="text-body-sm text-base-content/65">
            {specialtyLabel(consultationSpecialty(data, consultation))}
          </p>
          {consultation.scheduled_start ? (
            <p className="mt-3 font-mono text-h3 tabular">
              {formatDateLong(consultation.scheduled_start)},{" "}
              {formatTime(consultation.scheduled_start)}
            </p>
          ) : null}
        </Card>

        {status === "REQUESTED" ? (
          <>
            <Card>
              <p className="measure text-body">
                {patient?.is_dependant ? `${patient.first_name} has` : "You have"} a time. What you
                don't have yet is a yes. {name} is deciding whether to take this case.
              </p>
              <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-base-300 pt-3">
                <span className="text-body-sm text-base-content/60">They have</span>
                <Countdown deadline={consultation.respond_by} elapsedText="Time's up" />
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-2">
              <ButtonLink
                to={`/app/consultations/${consultation.id}/reschedule`}
                variant="secondary"
              >
                Reschedule
              </ButtonLink>
              <Button variant="ghost" onClick={() => setConfirmingCancel(true)}>
                Cancel
              </Button>
            </div>
          </>
        ) : null}

        {status === "SCHEDULED" ? (
          <>
            {/* No countdown. A ticking clock against an appointment three days
                out invents urgency where there is none. */}
            <Card>
              <p className="measure text-body">
                {name} has accepted. Nothing is needed from you before the day. We'll open the
                consultation at the appointed time and send you a reminder.
              </p>
            </Card>
            <div className="grid grid-cols-2 gap-2">
              <ButtonLink
                variant="secondary"
                to={`/app/consultations/${consultation.id}/reschedule`}
              >
                Reschedule
              </ButtonLink>
              <Button variant="ghost" onClick={() => setConfirmingCancel(true)}>
                Cancel
              </Button>
            </div>
          </>
        ) : null}

        {status === "DECLINED" || status === "TIMED_OUT" || status === "CANCELLED" ? (
          <>
            <Card>
              <p className="measure text-body">
                {status === "CANCELLED"
                  ? "You cancelled this booking."
                  : status === "DECLINED"
                    ? `${name} wasn't able to take this booking.`
                    : `${name} didn't respond in time.`}{" "}
                The slot is released, and your checkout total of{" "}
                <span className="font-mono">{naira(refundableTotal)}</span> is being refunded to
                your card automatically. Your card issuer may take up to seven business days.
              </p>
              <dl className="mt-3 divide-y divide-base-300 border-t border-base-300 pt-2">
                <DataRow label="Refund" value={naira(refundableTotal)} />
                <DataRow label="Refund destination" value="Card ending 4412" mono={false} />
              </dl>
            </Card>
            <ButtonLink to="/app/experts" full>
              Pick another
            </ButtonLink>
            <ButtonLink to={`/app/consultations/${consultation.id}/checkout`} variant="ghost" full>
              Track refund
            </ButtonLink>
          </>
        ) : null}

        {status === "ACTIVE" ? (
          <Button full onClick={() => navigate(`/app/consultations/${consultation.id}`)}>
            Open the consultation
          </Button>
        ) : null}

        <Modal
          open={confirmingCancel}
          onClose={() => setConfirmingCancel(false)}
          title="Cancel this booking?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmingCancel(false)}>
                Keep it
              </Button>
              <Button
                onClick={() => {
                  update((d) => {
                    d.expertAvailability = d.expertAvailability.map((slot) =>
                      slot.expert_id === consultation.expert_id &&
                      slot.start === consultation.scheduled_start &&
                      slot.end === consultation.scheduled_end
                        ? { ...slot, taken: false }
                        : slot,
                    );
                    d.consultations = d.consultations.map((c) =>
                      c.id === consultation.id
                        ? {
                            ...c,
                            status: "CANCELLED" as const,
                            cancelled_at: now().toISOString().slice(0, 19),
                            cancelled_by: "PATIENT" as const,
                            cancellation_reason: null,
                          }
                        : c,
                    );
                    d.checkoutPayments = d.checkoutPayments.map((payment) =>
                      payment.consultation_id === consultation.id
                        ? {
                            ...payment,
                            status: "REFUNDED" as const,
                            refunded_at: now().toISOString().slice(0, 19),
                            refund_method: "Card ending 4412",
                          }
                        : payment,
                    );
                    const paymentId = d.checkoutPayments.find(
                      (payment) => payment.consultation_id === consultation.id,
                    )?.id;
                    d.providerPayouts = d.providerPayouts.map((payout) =>
                      payout.checkout_payment_id === paymentId && payout.status !== "PAID"
                        ? { ...payout, status: "REVERSED" as const }
                        : payout,
                    );
                  });
                  setConfirmingCancel(false);
                  toast("Booking cancelled. Your checkout total is being refunded.");
                }}
              >
                Cancel booking
              </Button>
            </>
          }
        >
          {status === "SCHEDULED"
            ? `${name} has already accepted this slot. Cancelling releases it and starts a refund of the checkout total. This can't be undone.`
            : `Cancelling stops waiting on ${name} and starts a refund of the checkout total.`}
        </Modal>
      </div>
    </MobileScreen>
  );
}

/**
 * P40 reschedule surface. The current booking remains the source of truth until
 * the patient confirms a still-open replacement time.
 */
export function RescheduleBooking() {
  const { id } = useParams();
  const { data, session, update, toast } = usePrototype();
  const navigate = useNavigate();
  const [patientId] = useState(session.viewingPatientId);
  const [chosen, setChosen] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [scenario, setScenario] = useState<"live" | "conflict">("live");
  const [error, setError] = useState<"none" | "conflict" | "current_missing">("none");
  const consultation =
    session.viewingPatientId === patientId
      ? consultationForPatient(data, id ?? "", patientId)
      : undefined;

  if (!consultation) {
    return (
      <MobileScreen title="Reschedule" back="/app" patientContext>
        <EmptyState
          title="Booking unavailable"
          body="This booking is not available for the patient you are viewing. Nothing was changed."
          action={<ButtonLink to="/app">Home</ButtonLink>}
        />
      </MobileScreen>
    );
  }

  if (consultation.status !== "REQUESTED" && consultation.status !== "SCHEDULED") {
    return (
      <MobileScreen
        title="Reschedule"
        back={`/app/consultations/${consultation.id}/booking`}
        patientContext
      >
        <EmptyState
          title="This booking cannot be moved"
          body="Only a booking that is waiting for confirmation or already confirmed can be rescheduled."
          action={
            <ButtonLink to={`/app/consultations/${consultation.id}/booking`}>Go back</ButtonLink>
          }
        />
      </MobileScreen>
    );
  }

  const name = expertName(data, consultation.expert_id);
  const patient = patientById(data, patientId);
  const currentSlot = data.expertAvailability.find(
    (slot) =>
      slot.expert_id === consultation.expert_id &&
      slot.start === consultation.scheduled_start &&
      slot.end === consultation.scheduled_end,
  );
  const slots = availabilityFor(data, consultation.expert_id);
  const grouped = new Map<string, typeof slots>();
  for (const slot of slots) {
    const day = slot.start.slice(0, 10);
    const rows = grouped.get(day);
    if (rows) rows.push(slot);
    else grouped.set(day, [slot]);
  }
  const replacement = slots.find((slot) => slot.id === chosen);

  const confirmReplacement = () => {
    setConfirming(false);
    const liveConsultation = consultationForPatient(data, consultation.id, patientId);
    if (
      session.viewingPatientId !== patientId ||
      !liveConsultation ||
      (liveConsultation.status !== "REQUESTED" && liveConsultation.status !== "SCHEDULED")
    ) {
      toast("The care context or booking changed. Nothing was rescheduled.");
      navigate("/app");
      return;
    }

    const oldSlot = data.expertAvailability.find(
      (slot) =>
        slot.expert_id === liveConsultation.expert_id &&
        slot.start === liveConsultation.scheduled_start &&
        slot.end === liveConsultation.scheduled_end,
    );
    if (!oldSlot) {
      setError("current_missing");
      return;
    }

    const liveReplacement = chosen
      ? data.expertAvailability.find(
          (slot) => slot.id === chosen && slot.expert_id === liveConsultation.expert_id,
        )
      : undefined;
    if (scenario === "conflict" || !liveReplacement || liveReplacement.taken) {
      setScenario("live");
      setChosen(null);
      setError("conflict");
      return;
    }

    update((draft) => {
      draft.expertAvailability = draft.expertAvailability.map((slot) =>
        slot.id === oldSlot.id
          ? { ...slot, taken: false }
          : slot.id === liveReplacement.id
            ? { ...slot, taken: true }
            : slot,
      );
      draft.consultations = draft.consultations.map((item) =>
        item.id === liveConsultation.id && item.patient_identity_id === patientId
          ? {
              ...item,
              scheduled_start: liveReplacement.start,
              scheduled_end: liveReplacement.end,
            }
          : item,
      );
    });
    toast("Booking moved. Your payment is unchanged.");
    navigate(`/app/consultations/${liveConsultation.id}/booking`);
  };

  return (
    <MobileScreen
      title={patient?.is_dependant ? `Move ${patient.first_name}'s booking` : "Move your booking"}
      back={`/app/consultations/${consultation.id}/booking`}
      tabs="none"
      patientContext
    >
      <div data-screen="P40" className="space-y-4">
        <ScreenStates
          states={[
            { value: "live", label: "Live" },
            { value: "conflict", label: "409 on confirmation" },
          ]}
          value={scenario}
          onChange={(value) => setScenario(value as "live" | "conflict")}
        />

        <Card>
          <p className="text-body-sm text-base-content/60">Current booking with {name}</p>
          <p className="mt-2 font-mono text-h3 tabular">
            {formatDateLong(consultation.scheduled_start)},{" "}
            {formatTime(consultation.scheduled_start)}-{formatTime(consultation.scheduled_end)}
          </p>
          <p className="measure mt-2 text-body-sm text-base-content/65">
            This time stays booked until you confirm a replacement. Your existing payment and refund
            terms do not change.
          </p>
        </Card>

        {error === "conflict" ? (
          <Banner
            tone="warning"
            action={
              <Button size="sm" variant="secondary" onClick={() => setError("none")}>
                Choose another time
              </Button>
            }
          >
            That replacement time was just booked. Your current booking is unchanged.
          </Banner>
        ) : null}

        {!currentSlot || error === "current_missing" ? (
          <EmptyState
            title="We could not match the current time"
            body="Your booking is unchanged. Return to its status and try again after the schedule is refreshed."
            action={
              <ButtonLink to={`/app/consultations/${consultation.id}/booking`}>Go back</ButtonLink>
            }
          />
        ) : slots.length ? (
          <>
            <section aria-labelledby="replacement-times">
              <h2 id="replacement-times" className="font-heading text-h3">
                Choose a replacement
              </h2>
              <p className="measure mt-1 text-body-sm text-base-content/65">
                All times use Africa/Lagos. Selecting a time does not move the booking yet.
              </p>
            </section>
            {[...grouped.entries()].map(([day, rows]) => (
              <section key={day}>
                <h2 className="mb-2 font-heading text-h3 text-base-content/80">
                  {formatDateLong(`${day}T00:00:00`)}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {rows.map((slot) => (
                    <Chip
                      key={slot.id}
                      selected={chosen === slot.id}
                      onClick={() => {
                        setChosen(slot.id);
                        setError("none");
                      }}
                    >
                      <span className="font-mono tabular">
                        {formatTime(slot.start)}-{formatTime(slot.end)}
                      </span>
                    </Chip>
                  ))}
                </div>
              </section>
            ))}
            <Button full disabled={!replacement} onClick={() => setConfirming(true)}>
              Review new time
            </Button>
          </>
        ) : (
          <EmptyState
            title="No replacement times available"
            body="Your current booking is unchanged. You can return later when new hours are published."
            action={
              <ButtonLink to={`/app/consultations/${consultation.id}/booking`}>
                Keep booking
              </ButtonLink>
            }
          />
        )}

        <Modal
          open={confirming}
          onClose={() => setConfirming(false)}
          title="Move this booking?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                Keep current time
              </Button>
              <Button onClick={confirmReplacement}>Confirm time</Button>
            </>
          }
        >
          {replacement ? (
            <p>
              Move from {formatDateLong(consultation.scheduled_start)},{" "}
              {formatTime(consultation.scheduled_start)} to {formatDateLong(replacement.start)},{" "}
              {formatTime(replacement.start)}? The old time is released only after this succeeds.
            </p>
          ) : null}
        </Modal>
      </div>
    </MobileScreen>
  );
}

/** P41 — Telemedicine Consent. A real consent moment, not a EULA wall. */
export function TelemedicineConsent() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "conflict"],
    "your consent",
  );
  const { id } = useParams();
  const { data, session, update, toast } = usePrototype();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const consultation = consultationForPatient(data, id ?? "", session.viewingPatientId);
  if (!consultation) {
    return (
      <MobileScreen title="Consent" back="/app" patientContext>
        <EmptyState title="Consultation not found" body="" />
      </MobileScreen>
    );
  }
  const name = expertName(data, consultation.expert_id);
  const patient = patientById(data, consultation.patient_identity_id);

  return (
    <MobileScreen title="Before you start" back tabs="none" patientContext>
      <div data-screen="P41" className="space-y-4">
        {mutation.node}
        <p className="measure text-body text-base-content/80">
          You're about to consult {name} remotely, by chat, voice notes and images. Please read this
          once.
        </p>
        <Card>
          <ul className="measure space-y-2.5 text-body text-base-content/80">
            <li>
              A remote consultation can't include a physical examination. {name} will say so if you
              need to be seen in person, and that is not a failure of the consultation.
            </li>
            <li>
              Anything you send (messages, photos, voice notes) becomes part of your Monovella
              record and is visible to {name} for this case.
            </li>
            <li>
              {name} is individually verified against their licence and indemnity cover before being
              allowed to take a single case.
            </li>
            <li>
              If this becomes an emergency, stop and seek immediate in-person care. Call{" "}
              <span className="font-mono">112</span>.
            </li>
          </ul>
        </Card>
        <Checkbox
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          label="I understand, and I consent to this remote consultation."
          description={
            "Statement " +
            CONSENT_VERSIONS.telemedicine +
            ". This is separate from account terms and other sharing permissions."
          }
        />
        <Button
          full
          disabled={!agreed}
          onClick={() => {
            update((d) => {
              recordConsent(d.consentRecords, {
                actingUserId: data.user.id,
                patientId: consultation.patient_identity_id,
                actorCapacity: patient?.guardian_user_id ? "GUARDIAN" : "ACCOUNT_HOLDER",
                guardianRelationship: patient?.guardian_reason,
                purpose: "TELEMEDICINE",
                version: CONSENT_VERSIONS.telemedicine,
                occurredAt: now().toISOString(),
                careEventId: consultation.id,
              });
              d.consultations = d.consultations.map((c) =>
                c.id === consultation.id
                  ? { ...c, telemedicine_consent_at: now().toISOString().slice(0, 19) }
                  : c,
              );
            });
            toast("Consent recorded.");
            navigate(`/app/consultations/${consultation.id}`);
          }}
        >
          Start the consultation
        </Button>
      </div>
    </MobileScreen>
  );
}

/**
 * P42 — Referral Received. Disclosure and consent in one screen with one
 * confirming tap; it replaces P41 rather than preceding it.
 */
export function ReferralReceived() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "conflict"],
    "your decision on this referral",
    [
      {
        value: "payment_success" as const,
        label: "Simulate payment success",
        onSelect: () => simulatePaymentSuccess(),
      },
      {
        value: "payment_failure" as const,
        label: "Simulate payment failure",
        onSelect: () => simulatePaymentFailure(),
      },
    ],
  );
  const { id } = useParams();
  const { data, session, update, toast, nextId } = usePrototype();
  const navigate = useNavigate();
  const [referralAgreed, setReferralAgreed] = useState(false);
  const [telemedicineAgreed, setTelemedicineAgreed] = useState(false);
  const [checkoutMethod, setCheckoutMethod] = useState<"CARD" | "TRANSFER">("CARD");
  const [confirming, setConfirming] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [referralPatientId] = useState(session.viewingPatientId);
  const consultation = consultationForPatient(data, id ?? "", session.viewingPatientId);

  if (!consultation) {
    return (
      <MobileScreen title="Referral" back="/app" patientContext>
        <EmptyState title="Consultation not found" body="" />
      </MobileScreen>
    );
  }

  const to = expertName(data, consultation.expert_id);
  const referralPatient = patientById(data, consultation.patient_identity_id);
  const from = consultation.referred_from_id
    ? expertName(
        data,
        consultationForPatient(data, consultation.referred_from_id, session.viewingPatientId)
          ?.expert_id ?? "",
      )
    : "your previous expert";
  const depth = consultation.referral_chain_depth ?? 1;
  const checkout = data.checkoutPayments.find(
    (payment) =>
      payment.consultation_id === consultation.id &&
      payment.provider_request_id === null &&
      payment.provider_id === consultation.expert_id &&
      payment.payer_role !== "GUEST",
  );

  if (!consultation.referred_from_id) {
    return (
      <MobileScreen title="Referral" back="/app" tabs="none" patientContext>
        <EmptyState
          title="Referral not found"
          body="This consultation was not created by an expert referral."
        />
      </MobileScreen>
    );
  }

  if (consultation.status !== "REQUESTED") {
    return (
      <MobileScreen title="Referral" back="/app" tabs="none" patientContext>
        <EmptyState
          title="This referral is no longer awaiting your decision"
          body="No checkout can be verified from this screen. Return home to continue with your current care."
          action={<ButtonLink to="/app">Home</ButtonLink>}
        />
      </MobileScreen>
    );
  }

  function simulatePaymentSuccess() {
    if (!consultation || checkout?.status !== "PENDING") return;

    const paidAt = now().toISOString().slice(0, 19);
    const payoutId = nextId("po");
    update((draft) => {
      const payment = draft.checkoutPayments.find((item) => item.id === checkout.id);
      const live = draft.consultations.find(
        (item) => item.id === consultation.id && item.patient_identity_id === referralPatientId,
      );
      if (payment?.status !== "PENDING" || live?.status !== "REQUESTED") return;
      draft.checkoutPayments = draft.checkoutPayments.map((item) =>
        item.id === checkout.id ? { ...item, status: "PAID" as const, paid_at: paidAt } : item,
      );
      if (!draft.providerPayouts.some((item) => item.checkout_payment_id === checkout.id)) {
        draft.providerPayouts = [
          {
            id: payoutId,
            checkout_payment_id: checkout.id,
            provider_id: consultation.expert_id,
            provider_type: "SPECIALIST",
            amount_kobo: consultation.expert_fee_kobo,
            status: "PROCESSING",
            bank_account_last4: "9740",
            bank_code: "058",
            account_name: to,
            transfer_reference: `NOM-${checkout.id.toUpperCase()}`,
            initiated_at: paidAt,
            completed_at: null,
            failure_reason: null,
          },
          ...draft.providerPayouts,
        ];
      }
    });
    toast("Referral checkout verified.");
  }
  function simulatePaymentFailure() {
    if (!consultation || checkout?.status !== "PENDING") return;

    update((draft) => {
      const payment = draft.checkoutPayments.find((item) => item.id === checkout.id);
      if (payment?.status === "PENDING") payment.status = "FAILED";
    });
    toast("Checkout marked failed for this prototype state.");
  }

  if (consultation.referral_disclosure_ack_at && checkout) {
    const paid = checkout.status === "PAID";
    return (
      <MobileScreen
        title={paid ? "Referral accepted" : "Referral checkout"}
        back="/app"
        tabs="none"
        patientContext
      >
        <div data-screen="P42" className="space-y-4">
          {mutation.node}
          <Banner tone={paid ? "success" : checkout.status === "FAILED" ? "error" : "info"}>
            {paid
              ? `Your referral to ${to} is paid and ready for the receiving expert.`
              : checkout.status === "FAILED"
                ? "This checkout failed. The referral remains unopened and nothing was split to the receiving expert."
                : "Payment verification is pending. The receiving expert cannot open the referral yet."}
          </Banner>
          <Card>
            <dl className="divide-y divide-base-300">
              <DataRow label="Checkout reference" value={checkout.nomba_order_reference} />
              <DataRow
                label="Payment method"
                value={checkout.method === "CARD" ? "Card" : "Bank transfer"}
                mono={false}
              />
              <DataRow label="Total" value={naira(checkout.total_amount_kobo)} />
              <DataRow label="Status" value={checkout.status} mono={false} />
            </dl>
          </Card>
          {paid ? (
            <ButtonLink full to={`/app/consultations/${consultation.id}/booking`}>
              Referral status
            </ButtonLink>
          ) : (
            <>
              {checkout.status === "FAILED" ? (
                <Button
                  full
                  onClick={() => {
                    update((draft) => {
                      const payment = draft.checkoutPayments.find(
                        (item) => item.id === checkout.id,
                      );
                      if (payment?.status === "FAILED") payment.status = "PENDING";
                    });
                    toast("Checkout retry started.");
                  }}
                >
                  Retry checkout
                </Button>
              ) : (
                <p className="measure text-body-sm text-base-content/75" role="status">
                  We are waiting for payment confirmation. Your referral will update when it
                  arrives.
                </p>
              )}
              <Button
                variant="ghost"
                full
                onClick={() => {
                  const cancelledAt = now().toISOString().slice(0, 19);
                  update((draft) => {
                    const payment = draft.checkoutPayments.find((item) => item.id === checkout.id);
                    if (!payment || payment.status === "PAID") return;
                    payment.status = "FAILED";
                    draft.consultations = draft.consultations.map((item) =>
                      item.id === consultation.id
                        ? {
                            ...item,
                            status: "CANCELLED",
                            cancelled_at: cancelledAt,
                            cancelled_by: "PATIENT",
                            cancellation_reason: "Patient cancelled referral checkout.",
                          }
                        : item,
                    );
                  });
                  toast("Referral cancelled without charge.");
                  navigate("/app");
                }}
              >
                Cancel referral without charge
              </Button>
            </>
          )}
        </div>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen title="You've been referred" back tabs="none" patientContext>
      <div data-screen="P42" className="space-y-4">
        {mutation.node}
        <Card>
          <p className="measure text-body">
            <strong className="font-medium">{from}</strong> has referred you to{" "}
            <strong className="font-medium">{to}</strong>.
          </p>
          {consultation.referral_reason ? (
            <p className="measure mt-3 border-l-2 border-base-300 pl-3 text-body text-base-content/75">
              “{consultation.referral_reason}”
            </p>
          ) : null}
          {depth > 1 ? (
            <p className="mt-3 text-body-sm text-base-content/65">
              This is referral {depth} in this case. Monovella caps a chain at three.
            </p>
          ) : null}
        </Card>

        <Card>
          <p className="font-heading text-h3">This is a new consultation</p>
          <p className="measure mt-1.5 text-body-sm text-base-content/75">
            It isn't a free continuation of the last one. {to} is a different expert, paid
            separately, and Monovella's fee applies again at the full rate.
          </p>
          <dl className="mt-3 divide-y divide-base-300 border-t border-base-300 pt-2">
            <DataRow label={`${to}'s fee`} value={naira(consultation.expert_fee_kobo)} />
            <DataRow label="Monovella's fee" value={naira(consultation.platform_fee_kobo)} />
          </dl>
          <p className="mt-2 text-body-sm text-base-content/65">
            You choose card or bank transfer below. Nothing is charged until you confirm this
            referral and its full fee.
          </p>
        </Card>

        <Card>
          <p className="font-heading text-h3">And the same consent as any consultation</p>
          <p className="measure mt-1.5 text-body-sm text-base-content/75">
            A remote consultation can't include a physical examination; {to} will say if you need to
            be seen in person. Everything you send becomes part of your record. If this becomes an
            emergency, seek immediate in-person care.
          </p>
        </Card>

        <Checkbox
          checked={referralAgreed}
          onChange={(e) => setReferralAgreed(e.target.checked)}
          label={`I accept the referral disclosure and separately charged consultation with ${to}.`}
          description={`Referral statement ${CONSENT_VERSIONS.expertReferral}.`}
        />
        <Checkbox
          checked={telemedicineAgreed}
          onChange={(e) => setTelemedicineAgreed(e.target.checked)}
          label="I consent to this remote consultation."
          description={
            "Telemedicine statement " +
            CONSENT_VERSIONS.telemedicine +
            ". This is not permission for Pharmacy or Lab disclosure."
          }
        />
        <SegmentedControl
          label="Checkout method"
          value={checkoutMethod}
          onChange={setCheckoutMethod}
          options={[
            { value: "CARD", label: "Card" },
            { value: "TRANSFER", label: "Bank transfer" },
          ]}
        />
        <p className="measure text-body-sm text-base-content/65">
          Your referral opens after payment is confirmed. You can return to this page to check its
          status.
        </p>
        <Button
          full
          disabled={!referralAgreed || !telemedicineAgreed || confirming}
          onClick={() => {
            if (session.viewingPatientId !== referralPatientId) {
              toast("The care context changed. Review the referral again.");
              navigate("/app");
              return;
            }
            setConfirming(true);
            const iso = now().toISOString().slice(0, 19);
            const respondBy = new Date(now().getTime() + 15 * 60_000).toISOString().slice(0, 19);
            const checkoutId = nextId("chk");
            const actorCapacity = referralPatient?.guardian_user_id ? "GUARDIAN" : "ACCOUNT_HOLDER";
            update((d) => {
              const live = d.consultations.find(
                (candidate) =>
                  candidate.id === consultation.id &&
                  candidate.patient_identity_id === referralPatientId &&
                  candidate.referred_from_id &&
                  candidate.status === "REQUESTED",
              );
              if (
                !live ||
                live.referral_disclosure_ack_at ||
                d.checkoutPayments.some(
                  (payment) =>
                    payment.consultation_id === live.id && payment.provider_request_id === null,
                )
              ) {
                return;
              }
              recordConsent(d.consentRecords, {
                actingUserId: data.user.id,
                patientId: referralPatientId,
                actorCapacity,
                guardianRelationship: referralPatient?.guardian_reason,
                purpose: "EXPERT_REFERRAL",
                version: CONSENT_VERSIONS.expertReferral,
                occurredAt: iso,
                careEventId: consultation.id,
              });
              recordConsent(d.consentRecords, {
                actingUserId: data.user.id,
                patientId: referralPatientId,
                actorCapacity,
                guardianRelationship: referralPatient?.guardian_reason,
                purpose: "TELEMEDICINE",
                version: CONSENT_VERSIONS.telemedicine,
                occurredAt: iso,
                careEventId: consultation.id,
              });
              d.consultations = d.consultations.map((c) =>
                c.id === consultation.id
                  ? {
                      ...c,
                      referral_disclosure_ack_at: iso,
                      telemedicine_consent_at: iso,
                      respond_by: respondBy,
                    }
                  : c,
              );
              d.checkoutPayments = [
                {
                  id: checkoutId,
                  consultation_id: live.id,
                  provider_request_id: null,
                  provider_id: live.expert_id,
                  provider_type: "SPECIALIST",
                  total_amount_kobo: live.expert_fee_kobo + live.platform_fee_kobo,
                  provider_amount_kobo: live.expert_fee_kobo,
                  commission_amount_kobo: live.platform_fee_kobo,
                  method: checkoutMethod,
                  status: "PENDING",
                  nomba_order_reference: `MV-REF-${checkoutId.toUpperCase()}`,
                  paid_at: null,
                  refunded_at: null,
                  refund_method: null,
                  payer_role: "PRIMARY",
                  patient_id: live.patient_identity_id,
                  payer_user_id: d.user.id,
                },
                ...d.checkoutPayments,
              ];
            });
            setConfirming(false);
            toast("Referral checkout submitted for verification.");
          }}
        >
          {confirming ? "Confirming checkout…" : "Accept and continue to checkout"}
        </Button>
        <Button variant="ghost" full onClick={() => navigate("/app")}>
          Not now
        </Button>
        <Button variant="ghost" full onClick={() => setDeclining(true)}>
          Decline this referral
        </Button>
        <Modal
          open={declining}
          onClose={() => setDeclining(false)}
          title="Decline this referral?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeclining(false)}>
                Keep it for later
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const declinedAt = now().toISOString().slice(0, 19);
                  update((draft) => {
                    if (
                      draft.checkoutPayments.some(
                        (payment) => payment.consultation_id === consultation.id,
                      )
                    ) {
                      return;
                    }
                    draft.consultations = draft.consultations.map((candidate) =>
                      candidate.id === consultation.id &&
                      candidate.patient_identity_id === referralPatientId &&
                      candidate.status === "REQUESTED" &&
                      !candidate.referral_disclosure_ack_at
                        ? {
                            ...candidate,
                            status: "CANCELLED" as const,
                            cancelled_at: declinedAt,
                            cancelled_by: "PATIENT" as const,
                            cancellation_reason: "Patient declined the referral before checkout.",
                          }
                        : candidate,
                    );
                  });
                  setDeclining(false);
                  toast("Referral declined. Nothing was charged.");
                  navigate("/app");
                }}
              >
                Decline without charge
              </Button>
            </>
          }
        >
          You will not be charged and the receiving expert will not get access to this request. You
          can still ask your current expert about another option.
        </Modal>
      </div>
    </MobileScreen>
  );
}

/** Patient-controlled checkout after a guest accepts and fixes their fee. */
export function GuestCheckout() {
  const simulation = useMutationStates([], "this checkout", [
    {
      value: "payment_success" as const,
      label: "Simulate payment success",
      onSelect: () => verify(),
    },
    {
      value: "payment_failure" as const,
      label: "Simulate payment failure",
      onSelect: () => simulatePaymentFailure(),
    },
  ]);
  const { id } = useParams();
  const { data, session, update, toast, nextId } = usePrototype();
  const navigate = useNavigate();
  const consultation = consultationForPatient(data, id ?? "", session.viewingPatientId);
  const [agreed, setAgreed] = useState(false);
  const [method, setMethod] = useState<"CARD" | "TRANSFER">("CARD");

  if (!consultation?.guest_expert_id || !consultation.guest_expert_fee_kobo) {
    return (
      <MobileScreen title="Guest examination" back="/app" patientContext>
        <EmptyState
          title="Guest checkout not found"
          body="It is not available in the current patient record."
        />
      </MobileScreen>
    );
  }

  const guestId = consultation.guest_expert_id;
  const guestName = expertName(data, guestId);
  const guestExpert = expertById(data, guestId);
  const guestPatient = patientById(data, consultation.patient_identity_id);
  const guestArea = guestExpert
    ? [guestExpert.local_government_area, guestExpert.city].filter(Boolean).join(", ") +
      (guestExpert.local_government_area &&
      guestExpert.local_government_area === guestPatient?.local_government_area
        ? " · your area"
        : "")
    : null;
  const fee = consultation.guest_expert_fee_kobo;
  const serviceFee = Math.min(Math.round(fee * 0.2), 300000);
  const checkout = data.checkoutPayments.find(
    (payment) =>
      payment.consultation_id === consultation.id &&
      payment.provider_id === guestId &&
      payment.payer_role === "GUEST",
  );

  const verify = () => {
    if (checkout?.status !== "PENDING") return;
    const paidAt = now().toISOString().slice(0, 19);
    const payoutId = nextId("po");
    update((draft) => {
      const payment = draft.checkoutPayments.find((item) => item.id === checkout.id);
      const live = draft.consultations.find((item) => item.id === consultation.id);
      if (payment?.status !== "PENDING" || live?.status !== "ACTIVE") return;
      draft.checkoutPayments = draft.checkoutPayments.map((item) =>
        item.id === checkout.id ? { ...item, status: "PAID" as const, paid_at: paidAt } : item,
      );
      draft.consultations = draft.consultations.map((item) =>
        item.id === consultation.id
          ? { ...item, guest_examination_status: "ACCEPTED" as const }
          : item,
      );
      if (!draft.providerPayouts.some((item) => item.checkout_payment_id === checkout.id)) {
        draft.providerPayouts = [
          {
            id: payoutId,
            checkout_payment_id: checkout.id,
            provider_id: guestId,
            provider_type: "SPECIALIST",
            amount_kobo: fee,
            status: "PROCESSING",
            bank_account_last4: "9740",
            bank_code: "058",
            account_name: guestName,
            transfer_reference: `NOM-${checkout.id.toUpperCase()}`,
            initiated_at: paidAt,
            completed_at: null,
            failure_reason: null,
          },
          ...draft.providerPayouts,
        ];
      }
      // Confirm in the thread, not only on the checkout screen the patient is
      // about to leave. This is the point the examination actually opens.
      draft.chatMessages = [
        ...draft.chatMessages,
        {
          id: nextId("msg"),
          consultation_id: consultation.id,
          sender_type: "EXPERT" as const,
          type: "SYSTEM" as const,
          body: `${guestName} can now examine you in person. Their findings will come back into this case.`,
          media_url: null,
          sent_at: paidAt,
        },
      ];
    });
    toast("Guest checkout verified.");
  };

  function simulatePaymentFailure() {
    if (checkout?.status !== "PENDING") return;

    update((draft) => {
      const payment = draft.checkoutPayments.find((item) => item.id === checkout.id);
      if (payment?.status === "PENDING") payment.status = "FAILED";
    });
    toast("Guest checkout marked failed.");
  }

  if (checkout) {
    const paid = checkout.status === "PAID";
    const refunding =
      checkout.status === "REFUND_PENDING" ||
      checkout.status === "REFUNDED" ||
      checkout.status === "REFUND_FAILED";
    const cancellable =
      paid &&
      consultation.status === "ACTIVE" &&
      consultation.guest_examination_status === "ACCEPTED";
    return (
      <MobileScreen
        title="Guest checkout"
        back={`/app/consultations/${consultation.id}`}
        tabs="none"
        patientContext
      >
        <div data-screen="P43" className="space-y-4">
          {simulation.node}
          <Banner
            tone={
              paid
                ? "success"
                : checkout.status === "FAILED"
                  ? "error"
                  : refunding
                    ? "warning"
                    : "info"
            }
          >
            {refunding
              ? "This guest examination was cancelled. Its separate checkout refund is tracked here."
              : paid
                ? consultation.guest_examination_status === "COMPLETED"
                  ? `${guestName}'s examination is completed. This is your payment receipt.`
                  : `${guestName}'s examination is paid and can now begin.`
                : checkout.status === "FAILED"
                  ? "Payment failed. The guest examination remains closed and no payout was created."
                  : "Payment verification is pending. The guest cannot open the examination yet."}
          </Banner>
          <Card>
            <dl className="divide-y divide-base-300">
              <DataRow label="Receipt reference" value={checkout.nomba_order_reference} />
              <DataRow label="For" value={`${guestName}'s guest examination`} mono={false} />
              <DataRow
                label={paid ? "Paid by" : "Payer"}
                value={
                  checkout.payer_user_id === data.user.id
                    ? "You"
                    : checkout.payer_user_id
                      ? "Another account"
                      : "Not recorded"
                }
                mono={false}
              />
              <DataRow
                label="Method"
                value={checkout.method === "CARD" ? "Card" : "Bank transfer"}
                mono={false}
              />
              <DataRow label="Total" value={naira(checkout.total_amount_kobo)} />
              <DataRow label="Status" value={checkout.status} mono={false} />
            </dl>
          </Card>
          {refunding ? null : !paid ? (
            checkout.status === "FAILED" ? (
              <Button
                full
                onClick={() => {
                  update((draft) => {
                    const payment = draft.checkoutPayments.find((item) => item.id === checkout.id);
                    if (payment?.status === "FAILED") payment.status = "PENDING";
                  });
                  toast("Guest checkout retry started.");
                }}
              >
                Retry checkout
              </Button>
            ) : (
              <p className="measure text-body-sm text-base-content/75" role="status">
                We are waiting for payment confirmation. Your guest examination will update when it
                arrives.
              </p>
            )
          ) : cancellable ? (
            <Button
              variant="secondary"
              full
              onClick={() => {
                update((draft) => {
                  const payment = draft.checkoutPayments.find((item) => item.id === checkout.id);
                  const live = draft.consultations.find((item) => item.id === consultation.id);
                  if (
                    payment?.status !== "PAID" ||
                    live?.status !== "ACTIVE" ||
                    live.guest_examination_status !== "ACCEPTED"
                  )
                    return;
                  draft.checkoutPayments = draft.checkoutPayments.map((item) =>
                    item.id === checkout.id ? { ...item, status: "REFUND_PENDING" as const } : item,
                  );
                  draft.consultations = draft.consultations.map((item) =>
                    item.id === consultation.id
                      ? { ...item, guest_examination_status: "DECLINED" as const }
                      : item,
                  );
                  draft.providerPayouts = draft.providerPayouts.map((item) =>
                    item.checkout_payment_id === checkout.id
                      ? { ...item, status: "REVERSED" }
                      : item,
                  );
                });
                toast("Guest examination cancelled. The refund is pending.");
              }}
            >
              Cancel and request refund
            </Button>
          ) : null}
        </div>
      </MobileScreen>
    );
  }

  if (
    consultation.status !== "ACTIVE" ||
    consultation.guest_examination_status !== "AWAITING_PATIENT_PAYMENT"
  ) {
    return (
      <MobileScreen
        title="Guest checkout"
        back={`/app/consultations/${consultation.id}`}
        patientContext
      >
        <EmptyState
          title="Guest checkout is not available"
          body="The consultation must still be active and the guest must accept their fee first."
        />
      </MobileScreen>
    );
  }

  return (
    <MobileScreen
      title="Approve guest examination"
      back={`/app/consultations/${consultation.id}`}
      tabs="none"
      patientContext
    >
      <div data-screen="P43" className="space-y-4">
        <Banner tone="info">
          {guestName} accepted the invitation. You decide whether to add and pay for this
          examination.
        </Banner>
        <Card>
          <dl className="divide-y divide-base-300">
            <DataRow label="Guest expert" value={guestName} mono={false} />
            <DataRow
              label="Why"
              value={consultation.guest_examination_reason ?? "Additional examination"}
              mono={false}
            />
            {guestArea ? (
              // The one part of Monovella that happens in a room. Where they
              // are is as decisive as what they charge.
              <DataRow label="Where they are" value={guestArea} mono={false} />
            ) : null}
            <DataRow label="Guest fee" value={naira(fee)} />
            <DataRow label="Monovella service fee" value={naira(serviceFee)} />
            <DataRow label="Total" value={naira(fee + serviceFee)} />
          </dl>
        </Card>
        <Checkbox
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          label={`I approve ${guestName}'s separate examination and the full fee shown.`}
        />
        {/* Declining is not the same as refusing the examination. A patient who
            cannot reach this person needs to say so without losing the care. */}
        <Button
          variant="ghost"
          full
          onClick={() => {
            update((draft) => {
              const live = draft.consultations.find((item) => item.id === consultation.id);
              if (live?.guest_examination_status !== "AWAITING_PATIENT_PAYMENT") return;
              live.guest_examination_status = "DECLINED";
              draft.chatMessages = [
                ...draft.chatMessages,
                {
                  id: nextId("msg"),
                  consultation_id: consultation.id,
                  sender_type: "PATIENT" as const,
                  type: "SYSTEM" as const,
                  body: `${guestName} is too far to reach. Your expert has been asked to suggest someone closer.`,
                  media_url: null,
                  sent_at: now().toISOString().slice(0, 19),
                },
              ];
            });
            toast("Your expert will suggest someone closer. Nothing was charged.");
            navigate(`/app/consultations/${consultation.id}`);
          }}
        >
          Ask for someone closer to me
        </Button>
        <SegmentedControl
          label="Checkout method"
          value={method}
          onChange={setMethod}
          options={[
            { value: "CARD", label: "Card" },
            { value: "TRANSFER", label: "Bank transfer" },
          ]}
        />
        <Button
          full
          disabled={!agreed}
          onClick={() => {
            const checkoutId = nextId("chk");
            update((draft) => {
              const live = draft.consultations.find(
                (item) =>
                  item.id === consultation.id &&
                  item.patient_identity_id === session.viewingPatientId &&
                  item.status === "ACTIVE" &&
                  item.guest_examination_status === "AWAITING_PATIENT_PAYMENT",
              );
              if (
                !live ||
                draft.checkoutPayments.some(
                  (item) => item.consultation_id === live.id && item.payer_role === "GUEST",
                )
              )
                return;
              draft.checkoutPayments = [
                {
                  id: checkoutId,
                  consultation_id: live.id,
                  provider_request_id: null,
                  provider_id: guestId,
                  provider_type: "SPECIALIST",
                  total_amount_kobo: fee + serviceFee,
                  provider_amount_kobo: fee,
                  commission_amount_kobo: serviceFee,
                  method,
                  status: "PENDING",
                  nomba_order_reference: `MV-GUEST-${checkoutId.toUpperCase()}`,
                  paid_at: null,
                  refunded_at: null,
                  refund_method: null,
                  payer_role: "GUEST",
                  patient_id: live.patient_identity_id,
                  payer_user_id: draft.user.id,
                },
                ...draft.checkoutPayments,
              ];
            });
            toast("Guest checkout submitted for verification.");
          }}
        >
          Confirm guest checkout
        </Button>
        <Button
          variant="ghost"
          full
          onClick={() => {
            update((draft) => {
              draft.consultations = draft.consultations.map((item) =>
                item.id === consultation.id && item.patient_identity_id === session.viewingPatientId
                  ? { ...item, guest_examination_status: "DECLINED" }
                  : item,
              );
            });
            toast("Guest examination declined. Nothing was charged.");
            navigate(`/app/consultations/${consultation.id}`);
          }}
        >
          Decline without charge
        </Button>
      </div>
    </MobileScreen>
  );
}
