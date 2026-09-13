import { useState } from "react";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { useMutationStates } from "~/components/shell/mutation-states";
import { Badge, Banner, Button, Card, DataRow, EmptyState } from "~/components/ui";
import { patientById, selfPatient } from "~/data/selectors";
import type { ConsentRecordRead } from "~/data/types";
import { now } from "~/lib/clock";
import { CONSENT_VERSIONS, withdrawConsent } from "~/lib/consent-ledger";
import { formatDateTime } from "~/lib/format";
import { usePrototype } from "~/store/prototype";

const PURPOSE_LABEL: Record<ConsentRecordRead["purpose"], string> = {
  GENERAL_TERMS: "General terms acknowledgement",
  PRIVACY_NOTICE: "Privacy notice acknowledgement",
  NIN_VERIFICATION: "Identity verification",
  TELEMEDICINE: "Remote consultation",
  EXPERT_REFERRAL: "Expert referral",
  PHARMACY_DISCLOSURE: "Pharmacy disclosure",
  LAB_DISCLOSURE: "Lab disclosure",
  DEPENDANT_RECORD_CARE: "Dependant record, held and shared for care",
};

const CURRENT_VERSION: Record<ConsentRecordRead["purpose"], string> = {
  GENERAL_TERMS: CONSENT_VERSIONS.terms,
  PRIVACY_NOTICE: CONSENT_VERSIONS.privacyNotice,
  NIN_VERIFICATION: CONSENT_VERSIONS.ninVerification,
  TELEMEDICINE: CONSENT_VERSIONS.telemedicine,
  EXPERT_REFERRAL: CONSENT_VERSIONS.expertReferral,
  PHARMACY_DISCLOSURE: CONSENT_VERSIONS.pharmacyDisclosure,
  LAB_DISCLOSURE: CONSENT_VERSIONS.labDisclosure,
  DEPENDANT_RECORD_CARE: CONSENT_VERSIONS.dependantRecordCare,
};

export default function PrivacyConsents() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "forbidden", "conflict"],
    "this consent change",
  );
  const { data, session, toast, update } = usePrototype();
  const patient = patientById(data, session.viewingPatientId);
  const hasAuthority =
    patient?.id === selfPatient(data)?.id || patient?.guardian_user_id === data.user.id;
  const [revision, setRevision] = useState(0);
  const entries = hasAuthority
    ? data.consentRecords.filter(
        (entry) => entry.acting_user_id === data.user.id && entry.patient_id === patient?.id,
      )
    : [];
  const active = entries.filter(
    (entry) =>
      (entry.action === "CONSENTED" || entry.action === "ACKNOWLEDGED") &&
      !entries.some(
        (later) =>
          (later.action === "WITHDRAWN" && later.withdrawn_entry_id === entry.id) ||
          (later.action === "REPLACED" && later.replaces_entry_id === entry.id),
      ),
  );
  void revision;

  if (!patient || !hasAuthority) {
    return (
      <MobileScreen title="Privacy and consent" back="/app/account" tabs="none" patientContext>
        <EmptyState
          title="Consent history unavailable"
          body="This patient is not available to this account."
        />
      </MobileScreen>
    );
  }

  return (
    <MobileScreen title="Privacy and consent" back="/app/account" tabs="none" patientContext>
      <div data-screen="P68" className="space-y-4">
        {mutation.node}
        <p className="measure text-body text-base-content/75">
          This prototype ledger shows what this account recorded for {patient.first_name}, including
          the exact statement version and whether the account acted for itself or as guardian.
        </p>
        <Banner tone="info">
          Prototype evidence is not proof of legal sufficiency. Qualified Nigerian counsel must
          approve the wording, guardian rules, retention and withdrawal effects before launch.
        </Banner>

        {active.length ? (
          <ul className="space-y-3">
            {active.map((entry) => {
              const stale = entry.document_or_statement_version !== CURRENT_VERSION[entry.purpose];
              const canWithdrawFuture =
                entry.action === "CONSENTED" &&
                entry.care_event_id === null &&
                entry.purpose === "NIN_VERIFICATION";
              const actorLabel =
                entry.actor_capacity === "GUARDIAN"
                  ? `Guardian (${entry.guardian_relationship ?? "relationship recorded"})`
                  : "Account holder";
              return (
                <li key={entry.id}>
                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-heading text-h3">{PURPOSE_LABEL[entry.purpose]}</p>
                      <Badge tone={stale ? "warning" : "success"}>
                        {stale ? "Review needed" : "Current"}
                      </Badge>
                    </div>
                    <dl className="mt-3 divide-y divide-base-300">
                      <DataRow label="Statement" value={entry.document_or_statement_version} />
                      <DataRow label="Acting as" value={actorLabel} mono={false} />
                      <DataRow label="Recorded" value={formatDateTime(entry.occurred_at)} />
                      {entry.care_event_id ? (
                        <DataRow label="Care event" value={entry.care_event_id} />
                      ) : null}
                    </dl>
                    {canWithdrawFuture ? (
                      <Button
                        className="mt-3"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          update((draft) => {
                            withdrawConsent(draft.consentRecords, {
                              actingUserId: data.user.id,
                              patientId: patient.id,
                              purpose: entry.purpose,
                              occurredAt: now().toISOString(),
                            });
                          });
                          setRevision((value) => value + 1);
                          toast(
                            "Future use withdrawn. The completed identity check remains recorded.",
                          );
                        }}
                      >
                        Withdraw for future checks
                      </Button>
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState
            title="No versioned records yet"
            body="Older fixture timestamps do not prove which statement was shown. New acknowledgements and consent decisions appear here."
          />
        )}

        {entries.some((entry) => entry.action === "WITHDRAWN") ? (
          <Card>
            <p className="font-heading text-h3">Withdrawal history retained</p>
            <p className="mt-1 text-body-sm text-base-content/70">
              A withdrawal stops the future use described on the record. It does not erase a
              completed verification, consultation, or disclosure already sent to another provider.
            </p>
          </Card>
        ) : null}
      </div>
    </MobileScreen>
  );
}
