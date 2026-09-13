import { AlertTriangle, ShieldCheck } from "lucide-react";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { useMutationStates } from "~/components/shell/mutation-states";
import { Badge, Banner, ButtonLink, Card, EmptyState } from "~/components/ui";
import {
  expertName,
  historyReadsFor,
  patientById,
  providerById,
  selfPatient,
} from "~/data/selectors";
import { formatDate, formatDateTime } from "~/lib/format";
import { usePrototype } from "~/store/prototype";

type GrantRow = {
  key: string;
  name: string;
  purpose: string;
  scope: string;
  current: boolean;
};

export default function AccessHistory() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "forbidden"],
    "this access review request",
  );
  const { data, session } = usePrototype();
  const patient = patientById(data, session.viewingPatientId);
  const authorized =
    patient?.id === selfPatient(data)?.id || patient?.guardian_user_id === data.user.id;

  if (!patient || !authorized) {
    return (
      <MobileScreen title="Care-team access" back="/app/account" tabs="none" patientContext>
        <EmptyState
          title="Access history unavailable"
          body="This patient is not available to this account."
        />
      </MobileScreen>
    );
  }

  const reads = historyReadsFor(data, patient.id);
  const rows: GrantRow[] = data.careAccessGrants
    .filter((grant) => grant.patient_identity_id === patient.id)
    .map((grant) => {
      const provider = providerById(data, grant.grantee_id);
      const staff = data.staffAccounts.find((item) => item.id === grant.grantee_id);
      const name =
        grant.grantee_type === "EXPERT" || grant.grantee_type === "GUEST_EXPERT"
          ? expertName(data, grant.grantee_id)
          : (provider?.business_name ?? staff?.name ?? "Monovella operations");
      const scope = {
        REQUEST_SUMMARY: "Request summary only",
        PURPOSE_HISTORY: "Relevant history for this consultation",
        ENCOUNTER_RECORD: "Their authored encounter only",
        GUEST_EXAM_CONTEXT:
          grant.status === "CURRENT" ? "Examination reason and own findings" : "Own findings only",
        FULFILMENT_FIELDS:
          grant.status === "CURRENT"
            ? "Only the consented fulfilment fields"
            : "Retained fulfilment record",
        OPERATIONAL_CASE: "Minimum details for the assigned operational case",
      }[grant.scope];
      return {
        key: grant.id,
        name,
        // Not the care_event_id. Since ids became UUIDs it reads as a wall of
        // hex to the one person this screen is for, and the date is what they
        // would actually use to place it.
        purpose: `${grant.purpose} · ${formatDate(grant.granted_at)}`,
        scope,
        current: grant.status === "CURRENT",
      };
    });

  return (
    <MobileScreen title="Care-team access" back="/app/account" tabs="none" patientContext>
      <div data-screen="P69" className="space-y-4">
        {mutation.node}
        <p className="measure text-body text-base-content/75">
          These are the care relationships recorded for {patient.first_name}, and every time an
          expert actually opened {patient.first_name}&apos;s history.
        </p>
        <Banner tone="info">
          Current means the stated care purpose is still open. Ended access can leave a retained
          encounter or fulfilment record without permission to browse unrelated history.
        </Banner>

        {rows.length ? (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.key}>
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-h3">{row.name}</p>
                      <p className="mt-1 text-body-sm text-base-content/65">{row.purpose}</p>
                    </div>
                    <Badge tone={row.current ? "success" : "neutral"}>
                      {row.current ? "Current" : "Ended"}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-start gap-2 border-t border-base-300 pt-3">
                    <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
                    <p className="text-body-sm text-base-content/75">{row.scope}</p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No care-team access recorded"
            body="New care relationships will appear here."
          />
        )}

        {reads.length ? (
          <div>
            <p className="mb-2 px-1 text-label font-medium">When your history was opened</p>
            <ul className="space-y-3">
              {reads.map((read) => (
                <li key={read.id}>
                  <Card>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-heading text-h3">{expertName(data, read.expert_id)}</p>
                        <p className="mt-1 text-body-sm text-base-content/65">
                          {formatDateTime(read.read_at)}
                        </p>
                      </div>
                      {read.route === "EMERGENCY" ? (
                        <Badge tone="warning">Emergency</Badge>
                      ) : (
                        <Badge tone="neutral">While treating you</Badge>
                      )}
                    </div>
                    {read.route === "EMERGENCY" ? (
                      <div className="mt-3 flex items-start gap-2 border-t border-base-300 pt-3">
                        <AlertTriangle
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 text-warning"
                        />
                        <p className="text-body-sm text-base-content/75">
                          Opened without an open consultation, which Monovella staff review. Tell us
                          if this was not expected.
                        </p>
                      </div>
                    ) : null}
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Card>
          <div className="flex items-start gap-3">
            <AlertTriangle aria-hidden className="mt-0.5 size-5 shrink-0 text-warning" />
            <div>
              <p className="font-heading text-h3">Something does not look right?</p>
              <p className="mt-1 text-body-sm text-base-content/70">
                Ask the privacy team to review or end optional access. We will not expose internal
                security details in this list.
              </p>
            </div>
          </div>
          <ButtonLink className="mt-3" full variant="secondary" to="/app/privacy-request">
            Request review
          </ButtonLink>
        </Card>
        <p className="text-body-sm text-base-content/55">
          Prototype policy only. Access governance, retention and withdrawal rules still require
          qualified Nigerian legal and clinical approval.
        </p>
      </div>
    </MobileScreen>
  );
}
