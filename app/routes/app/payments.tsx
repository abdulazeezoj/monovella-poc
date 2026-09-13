import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { ScreenStates } from "~/components/shell/state-switcher";
import {
  Button,
  ButtonLink,
  Card,
  CheckoutPaymentBadge,
  DataRow,
  EmptyState,
  Field,
  Input,
  SearchablePicker,
  Sheet,
} from "~/components/ui";
import { reference } from "~/data";
import { consultationForPatient } from "~/data/selectors";
import type { CheckoutPaymentStatus } from "~/data/types";
import { now } from "~/lib/clock";
import { formatDateTime, naira } from "~/lib/format";
import { usePrototype } from "~/store/prototype";

/** P48 — Checkout receipt. One customer payment, with a transparent service-fee breakdown. */
export function CheckoutReceipt() {
  const { id } = useParams();
  const { data, session } = usePrototype();
  const consultation = consultationForPatient(data, id ?? "", session.viewingPatientId);
  const checkout = consultation
    ? data.checkoutPayments.find(
        (payment) =>
          payment.consultation_id === consultation.id &&
          payment.provider_type === "SPECIALIST" &&
          payment.provider_id === consultation.expert_id,
      )
    : undefined;
  const [override, setOverride] = useState<CheckoutPaymentStatus | "live">("live");

  if (!consultation || !checkout) {
    return (
      <MobileScreen title="Payment receipt" back="/app" patientContext>
        <EmptyState
          title="No checkout found"
          body="This booking does not have a checkout record."
        />
      </MobileScreen>
    );
  }

  const status = override === "live" ? checkout.status : override;
  const copy: Record<CheckoutPaymentStatus, string> = {
    PENDING: "Your bank is confirming this checkout. It usually takes under a minute.",
    PAID: "Paid when you booked the slot, not on the day. If the consultation does not happen, we start a full refund automatically.",
    FAILED: "This checkout did not go through, so the booking did not complete. Nothing was taken.",
    REFUND_PENDING: checkout.refund_method?.startsWith("Bank transfer")
      ? "Your full checkout total is being transferred to the verified bank account you supplied."
      : "Your full checkout total is being returned to the original payment method.",
    REFUNDED: "Refunded in full. Your bank can take up to seven business days to show it.",
    REFUND_FAILED:
      "We could not return this checkout to the original payment method. Add a bank account for a transfer instead.",
    CHARGED_BACK: "Your bank reversed this checkout. Nothing further is owed either way.",
  };

  return (
    <MobileScreen
      title="Payment receipt"
      back={`/app/consultations/${consultation.id}`}
      tabs="none"
      patientContext
    >
      <div data-screen="P48" className="space-y-4">
        <ScreenStates
          states={[
            { value: "live", label: "Live" },
            { value: "PENDING", label: "PENDING" },
            { value: "PAID", label: "PAID" },
            { value: "FAILED", label: "FAILED" },
            { value: "REFUND_PENDING", label: "REFUND_PENDING" },
            { value: "REFUNDED", label: "REFUNDED" },
            { value: "REFUND_FAILED", label: "REFUND_FAILED" },
            { value: "CHARGED_BACK", label: "CHARGED_BACK" },
          ]}
          value={override}
          onChange={setOverride}
        />

        <Card>
          <CheckoutPaymentBadge status={status} />
          <p className="mt-3 font-mono text-h1 tabular">{naira(checkout.total_amount_kobo)}</p>
          <p className="measure mt-2 text-body text-base-content/80">{copy[status]}</p>
          <dl className="mt-4 divide-y divide-base-300 border-t border-base-300 pt-2">
            <DataRow label="Paid" value={formatDateTime(checkout.paid_at)} />
            <DataRow
              label="Method"
              value={checkout.method === "TRANSFER" ? "Bank transfer" : "Card"}
              mono={false}
            />
            <DataRow label="Provider price" value={naira(checkout.provider_amount_kobo)} />
            <DataRow label="Monovella service fee" value={naira(checkout.commission_amount_kobo)} />
            {checkout.refunded_at ? (
              <DataRow label="Refund started" value={formatDateTime(checkout.refunded_at)} />
            ) : null}
            {checkout.refund_method ? (
              <DataRow label="Refunded to" value={checkout.refund_method} mono={false} />
            ) : null}
            <DataRow label="Reference" value={checkout.nomba_order_reference} />
          </dl>
        </Card>

        <p className="measure text-body-sm text-base-content/65">
          You paid once through Nomba. The service fee is disclosed above. Any provider payout is
          handled separately after checkout verification.
        </p>

        {status === "REFUND_FAILED" ? (
          <ButtonLink to={`/app/checkout-payments/${checkout.id}/refund`} full>
            Bank refund
          </ButtonLink>
        ) : null}
        {status === "FAILED" ? (
          <ButtonLink to="/app/card" full>
            Update card
          </ButtonLink>
        ) : null}
      </div>
    </MobileScreen>
  );
}

/** P54 — Bank Account Refund Opt-In for a failed full-checkout refund. */
export function BankRefund() {
  const { id } = useParams();
  const { data, session, update, toast } = usePrototype();
  const navigate = useNavigate();
  const checkout = data.checkoutPayments.find((payment) => {
    if (payment.id !== id) return false;
    if (payment.consultation_id) {
      return !!consultationForPatient(data, payment.consultation_id, session.viewingPatientId);
    }
    if (payment.provider_request_id) {
      return data.providerRequests.some(
        (request) =>
          request.id === payment.provider_request_id &&
          request.patient_identity_id === session.viewingPatientId,
      );
    }
    return false;
  });
  const [account, setAccount] = useState("");
  const [bank, setBank] = useState<{ code: string; name: string } | null>(null);
  const [picker, setPicker] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [view, setView] = useState<"default" | "lookup_failed" | "no_refund_due">("default");

  if (checkout?.status !== "REFUND_FAILED" || view === "no_refund_due") {
    return (
      <MobileScreen title="Refund" back tabs="none" patientContext>
        <div className="space-y-4">
          <ScreenStates
            states={[
              { value: "default", label: "Default" },
              { value: "lookup_failed", label: "Bank lookup failed" },
              { value: "no_refund_due", label: "400 no refund due" },
            ]}
            value={view}
            onChange={setView}
          />
          <EmptyState
            title="No refund is due on this checkout"
            body="Nothing needs setting up here. If you think that is wrong, our team can look at it."
            action={
              <ButtonLink to="/app" variant="secondary">
                Home
              </ButtonLink>
            }
          />
        </div>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen title="Where should we send it" back tabs="none" patientContext>
      <div data-screen="P54" className="space-y-4">
        <ScreenStates
          states={[
            { value: "default", label: "Default" },
            { value: "lookup_failed", label: "Bank lookup failed" },
            { value: "no_refund_due", label: "400 no refund due" },
          ]}
          value={view}
          onChange={setView}
        />
        <p className="measure text-body text-base-content/75">
          Your original payment method would not take the full checkout refund back. Give us an
          account and we will transfer {naira(checkout.total_amount_kobo)} instead, usually within
          two working days.
        </p>
        <Field label="Bank">
          {() => (
            <button
              type="button"
              onClick={() => setPicker(true)}
              className="min-h-11 w-full rounded-brand border border-base-300 bg-base-200 px-3 text-left text-body"
            >
              {bank ? bank.name : <span className="text-base-content/45">Choose your bank</span>}
            </button>
          )}
        </Field>
        <Field label="Account number" error={accountError ?? undefined}>
          {(p) => (
            <Input
              {...p}
              numeric
              inputMode="numeric"
              maxLength={10}
              value={account}
              aria-invalid={accountError ? true : undefined}
              onChange={(event) => {
                setAccount(event.target.value.replace(/\D/g, "").slice(0, 10));
                setAccountError(null);
                if (view === "lookup_failed") setView("default");
              }}
            />
          )}
        </Field>
        {view === "lookup_failed" ? (
          <p className="measure text-body-sm text-error">
            We could not verify that account. Check the bank and 10-digit number, then try again.
            Your refund is still waiting safely.
          </p>
        ) : null}
        <Button
          full
          disabled={!bank || account.length < 10}
          onClick={() => {
            if (!bank || account.length !== 10) return;
            if (account === "0000000000") {
              setAccountError("Enter a valid Nigerian account number.");
              setView("lookup_failed");
              return;
            }
            const requestedAt = now().toISOString().slice(0, 19);
            update((draft) => {
              draft.checkoutPayments = draft.checkoutPayments.map((payment) => {
                if (payment.id !== checkout.id || payment.status !== "REFUND_FAILED")
                  return payment;
                return {
                  ...payment,
                  status: "REFUND_PENDING",
                  refunded_at: requestedAt,
                  refund_method: `Bank transfer to ${bank.name} ••••${account.slice(-4)}`,
                };
              });
            });
            toast("Bank refund request recorded.");
            navigate(
              checkout.consultation_id
                ? `/app/consultations/${checkout.consultation_id}/checkout`
                : "/app",
            );
          }}
        >
          Send the refund there
        </Button>

        <Sheet open={picker} onClose={() => setPicker(false)} title="Choose your bank">
          <SearchablePicker
            items={reference.banks}
            value={bank?.code}
            getKey={(item) => item.code}
            getLabel={(item) => item.name}
            getMeta={(item) => item.code}
            placeholder="Search Nigerian banks"
            onSelect={(item) => {
              setBank(item);
              setPicker(false);
            }}
          />
        </Sheet>
      </div>
    </MobileScreen>
  );
}
