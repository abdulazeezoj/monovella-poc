import { Wallet } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { useMutationStates } from "~/components/shell/mutation-states";
import { ScreenStates } from "~/components/shell/state-switcher";
import {
  Badge,
  Banner,
  Button,
  ButtonLink,
  Card,
  DataRow,
  EmptyState,
  Field,
  ListGroup,
  ListRow,
  Textarea,
} from "~/components/ui";
import { consultationById, patientName } from "~/data/selectors";
import { now } from "~/lib/clock";
import { formatDate, formatDateTime, naira, titleCase } from "~/lib/format";
import { useExpertSeat, usePrototype, useTick } from "~/store/prototype";

/** X20 — My Payouts. A settlement ledger, not a balance a provider can withdraw. */
export default function Payouts() {
  const expertId = useExpertSeat();
  useTick();
  const { data } = usePrototype();
  const [view, setView] = useState<"populated" | "empty">("populated");
  const rows =
    view === "empty"
      ? []
      : data.providerPayouts.filter(
          (payout) => payout.provider_id === expertId && payout.provider_type === "SPECIALIST",
        );
  const settled = rows.filter((payout) => payout.status === "PAID");
  const total = settled.reduce((n, payout) => n + payout.amount_kobo, 0);

  return (
    <MobileScreen title="Payouts" tabs="expert">
      <div data-screen="X20" className="space-y-4">
        <ScreenStates
          states={[
            { value: "populated", label: "Populated" },
            { value: "empty", label: "Empty" },
          ]}
          value={view}
          onChange={setView}
        />

        {rows.length ? (
          <>
            <Card>
              <p className="text-body-sm text-base-content/60">Settled to your bank</p>
              <p className="mt-1 font-mono text-h1 tabular">{naira(total)}</p>
              <p className="measure mt-2 text-body-sm text-base-content/65">
                Each row starts only after Monovella has verified the patient checkout. Transfers
                can still be processing; a successful request is not treated as settled until Nomba
                confirms it.
              </p>
            </Card>

            <ListGroup>
              {rows.map((payout) => {
                const checkout = data.checkoutPayments.find(
                  (payment) => payment.id === payout.checkout_payment_id,
                );
                const c = checkout?.consultation_id
                  ? consultationById(data, checkout.consultation_id)
                  : undefined;
                return (
                  <ListRow
                    key={payout.id}
                    to={`/app/expert/payouts/${payout.id}`}
                    title={c ? patientName(data, c.patient_identity_id) : "Provider payout"}
                    meta={formatDate(c?.completed_at ?? c?.scheduled_start)}
                    trailing={
                      <div className="text-right">
                        <p className="font-mono text-data tabular">{naira(payout.amount_kobo)}</p>
                        <div className="mt-1">
                          <Badge
                            tone={
                              payout.status === "PAID"
                                ? "success"
                                : payout.status === "FAILED"
                                  ? "error"
                                  : "warning"
                            }
                          >
                            {payout.status === "PAID"
                              ? "Settled"
                              : payout.status === "PROCESSING"
                                ? "Processing"
                                : payout.status}
                          </Badge>
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </ListGroup>
          </>
        ) : (
          <EmptyState
            icon={Wallet}
            title="No payouts yet"
            body="Completed patient checkouts split at payment, and your share is recorded here."
          />
        )}
      </div>
    </MobileScreen>
  );
}

/** X21 / X22 — Provider payout detail. Nomba, not the provider, confirms settlement. */
export function PayoutDetail() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "not_found"],
    "this payout",
  );
  const expertId = useExpertSeat();
  useTick();
  const { id } = useParams();
  const { data } = usePrototype();
  const payout = data.providerPayouts.find(
    (item) =>
      item.id === id && item.provider_id === expertId && item.provider_type === "SPECIALIST",
  );

  if (!payout) {
    return (
      <MobileScreen title="Payout" back="/app/expert/payouts" tabs="expert">
        <EmptyState title="Payment not found" body="" />
      </MobileScreen>
    );
  }

  const checkout = data.checkoutPayments.find(
    (payment) => payment.id === payout.checkout_payment_id,
  );
  const consultation = checkout?.consultation_id
    ? consultationById(data, checkout.consultation_id)
    : undefined;
  const patient = consultation ? patientName(data, consultation.patient_identity_id) : "";

  return (
    <MobileScreen title={patient || "Payout"} back="/app/expert/payouts" tabs="expert">
      <div data-screen="X21" className="space-y-4">
        {mutation.node}
        <Card>
          <Badge
            tone={
              payout.status === "PAID"
                ? "success"
                : payout.status === "FAILED"
                  ? "error"
                  : "warning"
            }
          >
            {payout.status === "PAID"
              ? "Settled"
              : payout.status === "PROCESSING"
                ? "Processing"
                : payout.status}
          </Badge>
          <p className="mt-3 font-mono text-h1 tabular">{naira(payout.amount_kobo)}</p>
          <dl className="mt-4 divide-y divide-base-300 border-t border-base-300 pt-2">
            <DataRow
              label="Recipient"
              value={`${payout.account_name} ····${payout.bank_account_last4}`}
              mono={false}
            />
            <DataRow label="Transfer reference" value={payout.transfer_reference ?? "Preparing"} />
            <DataRow label="Started" value={formatDateTime(payout.initiated_at)} />
            {payout.completed_at ? (
              <DataRow label="Settled" value={formatDateTime(payout.completed_at)} />
            ) : null}
          </dl>
        </Card>
        {payout.status === "PAID" ? (
          <Banner tone="success">Settled to the verified account. Nothing further needed.</Banner>
        ) : null}
        {payout.status === "PROCESSING" ? (
          <Banner tone="warning">
            Nomba has accepted this transfer. We’ll update the final status when the transfer
            webhook confirms it.
          </Banner>
        ) : null}
        {payout.status === "FAILED" ? (
          <Banner tone="error">
            {payout.failure_reason ?? "The transfer failed."} Monovella will retry or contact you;
            do not ask the patient to pay again.
          </Banner>
        ) : null}
        {payout.status === "FAILED" || payout.status === "REVERSED" ? (
          <ButtonLink to={`/app/expert/payouts/${payout.id}/support`} full>
            Payout support
          </ButtonLink>
        ) : null}
      </div>
    </MobileScreen>
  );
}

/** X22 — Payout Support. It never reopens a patient-to-provider payment dispute. */
export function PayoutSupport() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation"],
    "this payout support request",
  );
  const expertId = useExpertSeat();
  const { id } = useParams();
  const { data, update, toast, nextId } = usePrototype();
  const payout = data.providerPayouts.find(
    (item) =>
      item.id === id && item.provider_id === expertId && item.provider_type === "SPECIALIST",
  );
  const [note, setNote] = useState("");

  if (!payout) {
    return (
      <MobileScreen title="Payout support" back="/app/expert/payouts" tabs="expert">
        <EmptyState title="Payout not found" body="" />
      </MobileScreen>
    );
  }

  const existing = data.payoutSupportRequests.find((request) => request.payout_id === payout.id);

  if (!existing && payout.status !== "FAILED" && payout.status !== "REVERSED") {
    return (
      <MobileScreen title="Payout support" back={`/app/expert/payouts/${payout.id}`} tabs="expert">
        <EmptyState
          title="Support is not needed for this payout"
          body="Payout support opens only when a transfer has failed or been reversed."
          action={<ButtonLink to={`/app/expert/payouts/${payout.id}`}>Payout status</ButtonLink>}
        />
      </MobileScreen>
    );
  }

  if (existing) {
    return (
      <MobileScreen title="Payout support" back={`/app/expert/payouts/${payout.id}`} tabs="expert">
        <div data-screen="X22" className="space-y-4">
          {mutation.node}
          <Banner tone="success">
            Your payout support request is recorded. Support will review the transfer without asking
            the patient to pay again.
          </Banner>
          <Card>
            <dl className="divide-y divide-base-300">
              <DataRow label="Support reference" value={existing.id} />
              <DataRow label="Status" value={titleCase(existing.status)} mono={false} />
              <DataRow label="Submitted" value={formatDateTime(existing.raised_at)} />
              <DataRow label="Payout" value={naira(payout.amount_kobo)} />
              <DataRow
                label="Transfer reference"
                value={payout.transfer_reference ?? "Not available"}
              />
              {existing.resolution_note ? (
                <DataRow label="Staff update" value={existing.resolution_note} mono={false} />
              ) : null}
            </dl>
          </Card>
        </div>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen title="Payout support" back={`/app/expert/payouts/${payout.id}`} tabs="expert">
      <div data-screen="X22" className="space-y-4">
        {mutation.node}
        <Banner tone={payout.status === "FAILED" ? "error" : "warning"}>
          This concerns the automated payout only. The patient does not need to pay again.
        </Banner>
        <Card>
          <DataRow label="Payout" value={naira(payout.amount_kobo)} />
          <DataRow label="Status" value={payout.status} mono={false} />
          <DataRow label="Transfer reference" value={payout.transfer_reference ?? "Preparing"} />
        </Card>
        <Field label="What should we review">
          {(props) => (
            <Textarea {...props} value={note} onChange={(event) => setNote(event.target.value)} />
          )}
        </Field>
        <Button
          full
          disabled={!note.trim()}
          onClick={() => {
            const supportId = nextId("psr");
            const raisedAt = now();
            const raisedAtIso = raisedAt.toISOString().slice(0, 19);
            const decisionDueBy = new Date(raisedAt.getTime() + 5 * 86_400_000)
              .toISOString()
              .slice(0, 19);
            update((d) => {
              const duplicate = d.payoutSupportRequests.find(
                (request) => request.payout_id === payout.id,
              );
              if (duplicate) return;

              d.payoutSupportRequests = [
                {
                  id: supportId,
                  payout_id: payout.id,
                  expert_id: expertId,
                  details: note.trim(),
                  status: "OPEN",
                  raised_at: raisedAtIso,
                  review_due_by: decisionDueBy,
                  overdue: false,
                  due_soon: false,
                  retry_requested_at: null,
                  resolved_at: null,
                  resolution_note: null,
                },
                ...d.payoutSupportRequests,
              ];
            });
            toast(`Payout support request ${supportId} recorded for review.`);
          }}
        >
          Send to support
        </Button>
      </div>
    </MobileScreen>
  );
}

/** X23 — Payout History. A security record; treat it like a bank statement. */
export function PayoutHistory() {
  const expertId = useExpertSeat();
  const { data } = usePrototype();
  const [view, setView] = useState<"populated" | "empty">("populated");
  const rows =
    view === "empty" ? [] : data.payoutHistory.filter((row) => row.expert_id === expertId);

  return (
    <MobileScreen title="Payout changes" back="/app/expert" tabs="expert">
      <div data-screen="X23" className="space-y-4">
        <ScreenStates
          states={[
            { value: "populated", label: "Populated" },
            { value: "empty", label: "Never changed" },
          ]}
          value={view}
          onChange={setView}
        />

        <p className="measure text-body-sm text-base-content/70">
          Every change to where your money goes, kept for your own reference. If something here
          wasn't you, contact us immediately.
        </p>

        {rows.length ? (
          <div className="space-y-3">
            {rows.map((h) => (
              <Card key={h.id}>
                <h2 className="font-heading text-h3">Changed {formatDate(h.changed_at)}</h2>
                <dl className="mt-3 divide-y divide-base-300">
                  <DataRow
                    label="Previous account"
                    value={h.payout_bank_account_number ?? "Not recorded"}
                  />
                  <DataRow label="Bank code" value={h.payout_bank_code ?? "Not recorded"} />
                  <DataRow
                    label="Verified recipient"
                    value={h.payout_account_name ?? "Not verified"}
                    mono={false}
                  />
                </dl>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="You've never changed your payout details"
            body="If you do, every change is recorded here with a timestamp."
          />
        )}
      </div>
    </MobileScreen>
  );
}
