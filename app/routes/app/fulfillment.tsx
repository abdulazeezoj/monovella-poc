import { Check, FlaskConical, MapPin, Navigation, Store, Upload } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { useMutationStates } from "~/components/shell/mutation-states";
import { ScreenStates } from "~/components/shell/state-switcher";
import {
  AvailabilityBadge,
  Badge,
  Banner,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  CheckoutPaymentBadge,
  Chip,
  Countdown,
  DataRow,
  DocumentCard,
  EmptyState,
  Field,
  FileDrop,
  Input,
  OrderStatusBadge,
  ProviderRequestBadge,
  SegmentedControl,
  Textarea,
} from "~/components/ui";
import { providerSlotDate } from "~/data/schedule-projection";
import {
  bookableSlotsForProvider,
  expertName,
  patientById,
  providerAcceptsNewWork,
  providerAvailabilityStatus,
  providerById,
  selfPatient,
} from "~/data/selectors";
import type {
  LabCollectionMethod,
  ProviderDirectoryRead,
  ProviderRequestRead,
  ProviderScheduleSlotRead,
} from "~/data/types";
import { now } from "~/lib/clock";
import { CONSENT_VERSIONS, recordConsent } from "~/lib/consent-ledger";
import {
  formatDate,
  formatDateLong,
  formatDateTime,
  naira,
  providerOrderStatusLabel,
} from "~/lib/format";
import { closeProviderRequest } from "~/lib/provider-fulfilment";
import { usePrototype, useTick } from "~/store/prototype";

function pastCareDateError(date: string, optional = false): string | null {
  if (!date) return optional ? null : "Choose when you got the medication.";
  const parsed = new Date(`${date}T09:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    return "Choose a valid date.";
  return date > now().toISOString().slice(0, 10) ? "Choose today or an earlier date." : null;
}

function activeFulfillmentPatient(
  data: ReturnType<typeof usePrototype>["data"],
  viewingPatientId: string,
) {
  const patient = patientById(data, viewingPatientId);
  if (!patient) return undefined;
  return patient.id === selfPatient(data)?.id || patient.guardian_user_id === data.user.id
    ? patient
    : undefined;
}

function providerRequestForActivePatient(
  data: ReturnType<typeof usePrototype>["data"],
  viewingPatientId: string,
  options: { prescriptionId?: string; labOrderId?: string },
): ProviderRequestRead | undefined {
  const patient = activeFulfillmentPatient(data, viewingPatientId);
  if (!patient) return undefined;
  return data.providerRequests
    .filter((request) => {
      if (request.patient_identity_id !== patient.id) return false;
      if (options.prescriptionId && request.prescription_id !== options.prescriptionId)
        return false;
      if (options.labOrderId && request.lab_order_id !== options.labOrderId) return false;
      return data.consultations.some(
        (consultation) =>
          consultation.id === request.consultation_id &&
          consultation.patient_identity_id === patient.id,
      );
    })
    .sort((left, right) => {
      // An open request always wins. After a decline and reselection both records
      // can share a timestamp at the frozen clock's one-second resolution, and a
      // stale terminal request must never hide the one the patient is waiting on.
      const leftActive = ["REQUESTED", "ACCEPTED"].includes(left.status) ? 1 : 0;
      const rightActive = ["REQUESTED", "ACCEPTED"].includes(right.status) ? 1 : 0;
      if (leftActive !== rightActive) return rightActive - leftActive;
      return right.requested_at.localeCompare(left.requested_at);
    })[0];
}

function providerRequestMutationTarget(
  data: ReturnType<typeof usePrototype>["data"],
  viewingPatientId: string,
  requestId: string,
) {
  const patient = activeFulfillmentPatient(data, viewingPatientId);
  if (!patient) return undefined;
  return data.providerRequests.find(
    (request) =>
      request.id === requestId &&
      request.patient_identity_id === patient.id &&
      !(
        request.prescription_id &&
        data.prescriptions.find((item) => item.id === request.prescription_id)?.corrected_by_id
      ) &&
      !(
        request.lab_order_id &&
        data.labOrders.find((item) => item.id === request.lab_order_id)?.corrected_by_id
      ) &&
      data.consultations.some(
        (consultation) =>
          consultation.id === request.consultation_id &&
          consultation.patient_identity_id === patient.id,
      ),
  );
}

function effectiveProviderRequestStatus(request: ProviderRequestRead) {
  if (
    request.status === "REQUESTED" &&
    request.respond_by &&
    new Date(`${request.respond_by}Z`).getTime() <= now().getTime()
  ) {
    return "EXPIRED" as const;
  }
  return request.status;
}

function safeProviderAddress(address: string | null | undefined) {
  const normalized = address?.replace(/\s+/g, " ").trim();
  return normalized && normalized.length <= 300 ? normalized : null;
}

function MapDirections({
  providerName,
  address,
}: {
  providerName: string;
  address: string | null | undefined;
}) {
  const destination = safeProviderAddress(address);
  if (!destination) {
    return (
      <Banner tone="info">
        Directions are unavailable because this provider has not supplied a complete destination
        address.
      </Banner>
    );
  }
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;

  return (
    <section
      aria-label={`Directions to ${providerName}`}
      className="rounded-brand border border-base-300 bg-base-200 p-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary/12 text-secondary">
          <MapPin aria-hidden className="size-5" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          {/* The section under the screen's own h1: h3 here skipped a level. */}
          <h2 className="font-heading text-h3">Get directions</h2>
          <address className="measure mt-1 not-italic text-body-sm text-base-content/70">
            {destination}
          </address>
        </div>
      </div>
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        data-map-navigation
        className="mt-3 inline-flex min-h-11.5 w-full items-center justify-center gap-2 rounded-brand border border-base-300 bg-base-100 px-4 text-label font-medium text-base-content transition-colors hover:border-base-content/20 hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <Navigation aria-hidden className="size-4" strokeWidth={1.5} />
        Open in Google Maps
      </a>
      <p className="measure mt-2 text-body-sm text-base-content/60">
        Google Maps opens in a new tab or its app. It provides the route, not Monovella. Check the
        destination before you leave.
      </p>
    </section>
  );
}

function useRx(id: string | undefined) {
  const { data, session } = usePrototype();
  const patient = activeFulfillmentPatient(data, session.viewingPatientId);
  const candidate = data.prescriptions.find((p) => p.id === id);
  const consultation = candidate
    ? data.consultations.find(
        (item) => item.id === candidate.consultation_id && item.patient_identity_id === patient?.id,
      )
    : undefined;
  return { rx: consultation ? candidate : undefined, consultation };
}

function useLab(id: string | undefined) {
  const { data, session } = usePrototype();
  const patient = activeFulfillmentPatient(data, session.viewingPatientId);
  const candidate = data.labOrders.find((l) => l.id === id);
  const consultation = candidate
    ? data.consultations.find(
        (item) => item.id === candidate.consultation_id && item.patient_identity_id === patient?.id,
      )
    : undefined;
  return { lab: consultation ? candidate : undefined, consultation };
}

/** Turns a recurring lab window into the next concrete day a patient can plan for. */
function collectionDate(slot: ProviderScheduleSlotRead) {
  const dateIso = providerSlotDate(slot);
  return { key: dateIso, label: formatDateLong(`${dateIso}T00:00:00`) };
}

/** P46 — Prescription Detail. */
export function PrescriptionDetail() {
  const { id } = useParams();
  const { data, session, toast } = usePrototype();
  const { rx, consultation } = useRx(id);

  if (!rx) {
    return (
      <MobileScreen title="Prescription" back="/app" patientContext>
        <EmptyState title="Prescription not found" body="" />
      </MobileScreen>
    );
  }

  const request = providerRequestForActivePatient(data, session.viewingPatientId, {
    prescriptionId: rx.id,
  });
  const open = rx.fulfillment_status == null || rx.fulfillment_status === "UNFILLED";

  return (
    <MobileScreen
      title={rx.medication}
      subtitle={consultation ? expertName(data, consultation.expert_id) : undefined}
      back={consultation ? `/app/consultations/${consultation.id}/record` : "/app"}
      patientContext
    >
      <div data-screen="P46" className="space-y-4">
        {rx.corrects_id ? (
          <Banner
            tone="info"
            action={
              <ButtonLink size="sm" variant="secondary" to={`/app/prescriptions/${rx.corrects_id}`}>
                View original
              </ButtonLink>
            }
          >
            This is a corrected version of an earlier prescription.
          </Banner>
        ) : null}
        {rx.corrected_by_id ? (
          <Banner
            tone="warning"
            action={
              <ButtonLink
                size="sm"
                variant="secondary"
                to={`/app/prescriptions/${rx.corrected_by_id}`}
              >
                View current
              </ButtonLink>
            }
          >
            This prescription was corrected. Use the current version.
          </Banner>
        ) : null}

        <Card>
          <p className="font-heading text-h2">{rx.medication}</p>
          <p className="mt-0.5 font-mono text-data">{rx.dosage}</p>
          <p className="measure mt-3 text-body text-base-content/85">{rx.instructions}</p>
          <dl className="mt-4 divide-y divide-base-300 border-t border-base-300 pt-2">
            <DataRow label="Issued" value={formatDate(rx.issued_at)} />
            {rx.filled_at ? <DataRow label="Filled" value={formatDate(rx.filled_at)} /> : null}
            {rx.pharmacy_name ? (
              <DataRow label="Pharmacy" value={rx.pharmacy_name} mono={false} />
            ) : null}
            {rx.receipt_file_name ? (
              <DataRow label="Receipt or label" value={rx.receipt_file_name} />
            ) : null}
          </dl>
        </Card>

        <DocumentCard
          title="Prescription"
          issuedAt={`Issued ${formatDate(rx.issued_at)}`}
          downloadLabel="PDF demo"
          onDownload={() => toast("Prototype simulation: no PDF file was downloaded.")}
        />

        {open && !request && !rx.corrected_by_id ? (
          <section>
            <h2 className="mb-2 font-heading text-h3">Get this filled</h2>
            <p className="measure mb-3 text-body-sm text-base-content/70">
              Two ways, and neither is the lesser one. A pharmacy on Monovella can send the record
              back on its own; any other pharmacy works exactly as it always has.
            </p>
            <div className="grid gap-2">
              <ButtonLink to={`/app/prescriptions/${rx.id}/pharmacies`} full>
                <Store aria-hidden className="size-4" strokeWidth={1.5} />
                Find a pharmacy on Monovella
              </ButtonLink>
              <ButtonLink to={`/app/prescriptions/${rx.id}/self-report`} variant="secondary" full>
                Go elsewhere
              </ButtonLink>
            </div>
          </section>
        ) : null}

        {request ? (
          <ButtonLink
            to={
              request.status === "ACCEPTED"
                ? `/app/prescriptions/${rx.id}/order`
                : `/app/prescriptions/${rx.id}/request`
            }
            variant="secondary"
            full
          >
            {providerById(data, request.provider_id)?.business_name} ·{" "}
            {request.status === "ACCEPTED" && request.order_status
              ? providerOrderStatusLabel[request.order_status]
              : "See the request"}
          </ButtonLink>
        ) : null}

        {rx.fulfillment_status === "FILLED" ? (
          <Card>
            <Badge tone="success" icon={Check}>
              Filled
            </Badge>
            <p className="measure mt-2 text-body-sm text-base-content/70">
              Recorded {formatDate(rx.filled_at)}
              {rx.pharmacy_name ? ` at ${rx.pharmacy_name}` : ""}. The next expert who opens your
              record sees this.
            </p>
            {rx.paid_note ? (
              <p className="mt-2 font-mono text-body-sm text-base-content/55">{rx.paid_note}</p>
            ) : null}
          </Card>
        ) : null}
        {rx.fulfillment_status === "NOT_FILLED" ? (
          <Card>
            <Badge>Not filled</Badge>
            <p className="measure mt-2 text-body-sm text-base-content/70">
              Recorded as not filled. That's a valid outcome, and your record is accurate either
              way.
            </p>
          </Card>
        ) : null}
      </div>
    </MobileScreen>
  );
}

/** P46a — Self-Report: Complete This Prescription. */
export function PrescriptionSelfReport() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation"],
    "what you recorded",
  );
  const { id } = useParams();
  const { data, session, update, toast } = usePrototype();
  const navigate = useNavigate();
  const { rx } = useRx(id);
  const [outcome, setOutcome] = useState<"FILLED" | "NOT_FILLED">(
    rx?.fulfillment_status === "NOT_FILLED" ? "NOT_FILLED" : "FILLED",
  );
  const [date, setDate] = useState(rx?.filled_at?.slice(0, 10) ?? now().toISOString().slice(0, 10));
  const [pharmacy, setPharmacy] = useState(rx?.pharmacy_name ?? "");
  const [paidNote, setPaidNote] = useState(rx?.paid_note ?? "");
  const [file, setFile] = useState<string | null>(rx?.receipt_file_name ?? null);
  const [uploading, setUploading] = useState(false);

  if (!rx) {
    return (
      <MobileScreen title="Prescription" back="/app" patientContext>
        <EmptyState title="Prescription not found" body="" />
      </MobileScreen>
    );
  }

  if (rx.corrected_by_id) {
    return (
      <MobileScreen title="Order updated" back={`/app/prescriptions/${rx.id}`} patientContext>
        <EmptyState
          title="Use the corrected prescription"
          body="The expert replaced this order. Add your update to the current version."
          action={
            <ButtonLink to={`/app/prescriptions/${rx.corrected_by_id}`}>
              View current prescription
            </ButtonLink>
          }
        />
      </MobileScreen>
    );
  }

  return (
    <MobileScreen
      title="Close the loop"
      back={`/app/prescriptions/${rx.id}`}
      tabs="none"
      patientContext
    >
      <div data-screen="P46a" className="space-y-4">
        {mutation.node}
        <p className="measure text-body text-base-content/75">
          Pay the pharmacy directly, the way you always have. This just keeps your record complete,
          so the next expert sees medication history that's actually current.
        </p>

        <SegmentedControl
          label="What happened"
          value={outcome}
          onChange={setOutcome}
          options={[
            { value: "FILLED", label: "I got it" },
            { value: "NOT_FILLED", label: "I didn't" },
          ]}
        />

        {outcome === "FILLED" ? (
          <>
            <Field label="When" error={pastCareDateError(date)}>
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  max={now().toISOString().slice(0, 10)}
                  numeric
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              )}
            </Field>
            <Field label="Which pharmacy" optional>
              {(p) => (
                <Input
                  {...p}
                  value={pharmacy}
                  onChange={(e) => setPharmacy(e.target.value)}
                  placeholder="Ebun Chemist, Surulere"
                />
              )}
            </Field>
            <div>
              <p className="mb-2 text-label font-medium">
                Photo of the receipt or label{" "}
                <span className="font-normal text-base-content/50">Optional</span>
              </p>
              <FileDrop
                label="Add a photo"
                accept="JPG or PNG"
                filename={file}
                onFile={(chosen) => setFile(chosen.name)}
                onUploadingChange={setUploading}
                onRemove={() => setFile(null)}
              />
            </div>
            <Field
              label="What you paid"
              optional
              hint="For your own record. Monovella isn't processing this payment."
            >
              {(p) => (
                <Input
                  {...p}
                  value={paidNote}
                  onChange={(e) => setPaidNote(e.target.value)}
                  placeholder="₦4,200 cash"
                />
              )}
            </Field>
          </>
        ) : (
          <Card>
            <p className="measure text-body-sm text-base-content/70">
              No follow-up questions. Recording that you didn't fill it is just as useful to the
              next expert as recording that you did.
            </p>
          </Card>
        )}

        <Button
          full
          disabled={
            uploading || (outcome === "FILLED" && !!pastCareDateError(date)) || mutation.blocked
          }
          onClick={() => {
            if (uploading || (outcome === "FILLED" && pastCareDateError(date))) return;
            if (!activeFulfillmentPatient(data, session.viewingPatientId)) return;
            update((d) => {
              const patient = activeFulfillmentPatient(d, session.viewingPatientId);
              const current = d.prescriptions.find((item) => item.id === rx.id);
              const ownsPrescription = current
                ? d.consultations.some(
                    (consultation) =>
                      consultation.id === current.consultation_id &&
                      consultation.patient_identity_id === patient?.id,
                  )
                : false;
              if (!ownsPrescription || current?.corrected_by_id) return;
              d.prescriptions = d.prescriptions.map((p) =>
                p.id === rx.id
                  ? {
                      ...p,
                      fulfillment_status: outcome,
                      filled_at: outcome === "FILLED" ? `${date}T09:00:00Z` : null,
                      pharmacy_name: outcome === "FILLED" ? pharmacy || null : null,
                      receipt_file_name: outcome === "FILLED" ? file : null,
                      paid_note: paidNote || null,
                    }
                  : p,
              );
            });
            toast("Record updated.");
            navigate(`/app/prescriptions/${rx.id}`);
          }}
        >
          Save to my record
        </Button>
      </div>
    </MobileScreen>
  );
}

function ProviderCard({
  provider,
  status,
  recommendedBy,
  onSelect,
}: {
  provider: ProviderDirectoryRead;
  status: ReturnType<typeof providerAvailabilityStatus>;
  recommendedBy?: string;
  onSelect: () => void;
}) {
  const acceptingNewWork = status !== "OUT_OF_OFFICE";
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!acceptingNewWork}
      className="w-full rounded-brand border border-base-300 bg-base-200 p-4 text-left transition-colors hover:border-primary/40"
    >
      {recommendedBy ? (
        <Badge tone="primary" className="mb-2">
          Recommended by {recommendedBy}
        </Badge>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-heading text-h3">{provider.business_name}</p>
        <Badge tone="success" icon={Check}>
          Verified
        </Badge>
        <AvailabilityBadge status={status} audience="Provider" />
      </div>
      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-body-sm text-base-content/60">
        <MapPin aria-hidden className="size-3.5" strokeWidth={1.5} />
        {provider.premises_address}
        {provider.distance_km != null ? (
          <span className="font-mono">· {provider.distance_km} km</span>
        ) : (
          // Every other card in the list carries a distance, so rendering
          // nothing here reads as "last", not as "we cannot tell you how far
          // this is". PathCare Abuja is the seeded case: a Lagos patient sees
          // it below three Lagos labs, and only the address says otherwise.
          <span className="italic">· distance unavailable</span>
        )}
      </p>
      {provider.profile_note ? (
        <p className="measure mt-2 text-body-sm text-base-content/70">{provider.profile_note}</p>
      ) : null}
      {status === "AWAY" ? (
        <p className="mt-2 text-body-sm text-warning">
          They are away; a new request may take longer to answer.
        </p>
      ) : null}
      {status === "OUT_OF_OFFICE" ? (
        <p className="mt-2 text-body-sm text-error">Not taking new requests right now.</p>
      ) : null}
      {provider.services_offered?.length ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {provider.services_offered.map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
        </div>
      ) : null}
    </button>
  );
}

/** P46b — Find a Pharmacy. Available *to ask*, never a claim about stock. */
function matchesProvider(provider: ProviderDirectoryRead, query: string, location: string) {
  const address = [
    provider.premises_address,
    provider.city,
    provider.local_government_area,
    provider.state,
  ]
    .join(" ")
    .toLocaleLowerCase();
  return (
    [provider.business_name, address, ...(provider.services_offered ?? [])]
      .join(" ")
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()) &&
    address.includes(location.trim().toLocaleLowerCase())
  );
}

function ProviderLocationSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label="Location">
      {(props) => (
        <Input
          {...props}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Area, city or state"
        />
      )}
    </Field>
  );
}

export function FindPharmacy() {
  const { id } = useParams();
  const { data } = usePrototype();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [view, setView] = useState<"populated" | "empty" | "no_location">("populated");
  const pharmacies =
    view === "empty"
      ? []
      : data.providers.filter(
          (p) => p.provider_type === "PHARMACY" && matchesProvider(p, query, location),
        );
  const { rx, consultation } = useRx(id);

  if (!rx || !consultation || rx.corrected_by_id) {
    return (
      <MobileScreen title="Choose a pharmacy" back="/app" tabs="none" patientContext>
        <div data-screen="P46b">
          <EmptyState
            title="Prescription unavailable"
            body="This prescription does not exist or is not available for the patient you are viewing."
          />
        </div>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen
      title="Choose a pharmacy"
      subtitle={rx.medication}
      back={`/app/prescriptions/${id}`}
      tabs="none"
      patientContext
    >
      <div data-screen="P46b" className="space-y-4">
        <ScreenStates
          states={[
            { value: "populated", label: "Populated" },
            { value: "no_location", label: "No location" },
            { value: "empty", label: "None nearby" },
          ]}
          value={view}
          onChange={setView}
        />

        <Card>
          <p className="measure text-body-sm text-base-content/75">
            These are pharmacies you can <em>ask</em>. Verified means Monovella checked their
            registration and licence. It isn't a claim about stock or service quality. You send one
            request to one pharmacy at a time.
          </p>
        </Card>

        {view === "no_location" ? (
          <Banner tone="info">
            Location isn't shared, so these aren't sorted by distance. Search by name instead.
          </Banner>
        ) : null}

        <Field label="Search pharmacies">
          {(props) => (
            <Input
              {...props}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Pharmacy name or area"
            />
          )}
        </Field>
        <ProviderLocationSearch value={location} onChange={setLocation} />
        {pharmacies.length ? (
          <ul className="space-y-2.5">
            {pharmacies.map((p) => (
              <li key={p.id}>
                <ProviderCard
                  provider={p}
                  status={providerAvailabilityStatus(data, p.id)}
                  onSelect={() => navigate(`/app/prescriptions/${id}/pharmacies/${p.id}/consent`)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={
              query.trim() || location.trim()
                ? "No matching pharmacies"
                : "No partnered pharmacies near you yet"
            }
            body={
              query.trim() || location.trim()
                ? "Try another pharmacy name or area, or clear your search."
                : "You can take this prescription to any pharmacy and record what happened yourself."
            }
            action={
              query.trim() || location.trim() ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setLocation("");
                  }}
                >
                  Clear search
                </Button>
              ) : (
                <ButtonLink to={`/app/prescriptions/${id}/self-report`}>Record myself</ButtonLink>
              )
            }
          />
        )}
      </div>
    </MobileScreen>
  );
}

/** P46c — Pharmacy Request Status. */
export function PharmacyRequestStatus() {
  useTick();
  const { id } = useParams();
  const { data, session, update, toast } = usePrototype();
  const { rx: activeRx } = useRx(id);
  const request = activeRx
    ? providerRequestForActivePatient(data, session.viewingPatientId, { prescriptionId: id })
    : undefined;
  const [override, setOverride] = useState<
    "live" | "REQUESTED" | "ACCEPTED" | "DECLINED" | "EXPIRED"
  >("live");

  if (!request) {
    return (
      <MobileScreen title="Request" back={`/app/prescriptions/${id}`} patientContext>
        <EmptyState title="No request sent yet" body="" />
      </MobileScreen>
    );
  }

  const pharmacy = providerById(data, request.provider_id);
  const rx = data.prescriptions.find((x) => x.id === request.prescription_id);
  const requestCheckout = data.checkoutPayments.find(
    (payment) => payment.provider_request_id === request.id,
  );
  const status =
    override === "live"
      ? rx?.corrected_by_id && ["REQUESTED", "ACCEPTED"].includes(request.status)
        ? "OBSOLETE"
        : effectiveProviderRequestStatus(request)
      : override;

  return (
    <MobileScreen
      title={pharmacy?.business_name ?? "Pharmacy"}
      /* Which medication this is was nowhere on the screen a patient pays
         from. It belongs under the name they are paying. */
      subtitle={rx ? `${rx.medication}, ${rx.dosage}` : undefined}
      back={`/app/prescriptions/${id}`}
      tabs="none"
      patientContext
    >
      <div data-screen="P46c" className="space-y-4">
        <ScreenStates
          states={[
            { value: "live", label: "Live" },
            { value: "REQUESTED", label: "Awaiting" },
            { value: "ACCEPTED", label: "Accepted" },
            { value: "DECLINED", label: "Declined" },
            { value: "EXPIRED", label: "Expired" },
          ]}
          value={override}
          onChange={setOverride}
        />

        <Card>
          <ProviderRequestBadge status={status} />
          <p className="mt-3 font-heading text-h3">{pharmacy?.business_name}</p>
          <p className="text-body-sm text-base-content/65">{pharmacy?.premises_address}</p>

          {status === "REQUESTED" ? (
            <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-base-300 pt-3">
              <span className="text-body-sm text-base-content/60">They have</span>
              <Countdown deadline={request.respond_by} elapsedText="No response" />
            </div>
          ) : null}
          {status === "DECLINED" ? (
            <p className="measure mt-3 text-body text-base-content/80">
              This pharmacy can't fill it right now
              {request.decline_reason ? `: ${request.decline_reason.toLowerCase()}` : ""}.
            </p>
          ) : null}
          {status === "EXPIRED" ? (
            <p className="measure mt-3 text-body text-base-content/80">
              No response within the window. Nothing was charged.
            </p>
          ) : null}
          {["CANCELLED", "WITHDRAWN", "UNABLE_TO_FULFIL", "OBSOLETE"].includes(status) ? (
            <p className="measure mt-3 text-body text-base-content/80">
              {status === "OBSOLETE"
                ? "This pharmacy holds an older prescription version and cannot continue. Open the corrected prescription before choosing a provider again."
                : (request.terminal_reason ??
                  "This request is closed. Any paid checkout is being refunded.")}
            </p>
          ) : null}
        </Card>

        {status === "ACCEPTED" ? (
          <ButtonLink to={`/app/prescriptions/${id}/order`} full>
            Payment handoff
          </ButtonLink>
        ) : null}

        {["DECLINED", "EXPIRED", "CANCELLED", "WITHDRAWN", "UNABLE_TO_FULFIL"].includes(status) ? (
          <>
            <ButtonLink to={`/app/prescriptions/${id}/pharmacies`} full>
              Try another
            </ButtonLink>
            <ButtonLink to={`/app/prescriptions/${id}/self-report`} variant="ghost" full>
              Record yourself
            </ButtonLink>
          </>
        ) : null}
        {status === "OBSOLETE" && rx?.corrected_by_id ? (
          <ButtonLink to={`/app/prescriptions/${rx.corrected_by_id}`} full>
            Open corrected
          </ButtonLink>
        ) : null}
        {status === "REQUESTED" || (status === "ACCEPTED" && !requestCheckout) ? (
          <Button
            variant="secondary"
            full
            onClick={() => {
              update((draft) =>
                closeProviderRequest(draft, request.id, "CANCELLED", "Cancelled by patient."),
              );
              toast("Request cancelled. Nothing was charged.");
            }}
          >
            Cancel request without charge
          </Button>
        ) : null}
      </div>
    </MobileScreen>
  );
}

/** P46d — Pharmacy Order: Payment & Handoff. */
export function PharmacyOrder() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "conflict"],
    "this order",
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
  const { rx: activeRx } = useRx(id);
  const request = activeRx
    ? providerRequestForActivePatient(data, session.viewingPatientId, { prescriptionId: id })
    : undefined;
  const [handoff, setHandoff] = useState<"PICKUP" | "DELIVERY">(
    request?.delivery_or_pickup === "PICKUP" ? "PICKUP" : "DELIVERY",
  );
  const [checkoutMethod, setCheckoutMethod] = useState<"CARD" | "TRANSFER">("CARD");
  const [note, setNote] = useState(request?.delivery_note ?? "");

  if (activeRx?.corrected_by_id) {
    return (
      <MobileScreen title="Order updated" back={`/app/prescriptions/${id}`} patientContext>
        <EmptyState
          title="Use the corrected prescription"
          body="The expert replaced this prescription. Unfinished fulfilment of this version has stopped."
          action={
            <ButtonLink to={`/app/prescriptions/${activeRx.corrected_by_id}`}>
              View current prescription
            </ButtonLink>
          }
        />
      </MobileScreen>
    );
  }
  if (!request) {
    return (
      <MobileScreen title="Order" back={`/app/prescriptions/${id}`} patientContext>
        <EmptyState title="No order yet" body="" />
      </MobileScreen>
    );
  }

  const pharmacy = providerById(data, request.provider_id);
  const rx = data.prescriptions.find((x) => x.id === request.prescription_id);
  const providerPrice = request.amount_kobo ?? 0;
  const serviceFee = Math.min(Math.floor(providerPrice * 0.2), 300000);
  const total = providerPrice + serviceFee;
  const checkout = data.checkoutPayments.find(
    (payment) => payment.provider_request_id === request.id,
  );
  const payout = checkout
    ? data.providerPayouts.find((item) => item.checkout_payment_id === checkout.id)
    : undefined;

  function simulatePaymentSuccess() {
    if (!request || checkout?.status !== "PENDING") return;

    const paidAt = now().toISOString().slice(0, 19);
    const payoutId = nextId("po");
    update((draft) => {
      const live = providerRequestMutationTarget(draft, session.viewingPatientId, request.id);
      const payment = draft.checkoutPayments.find((item) => item.id === checkout.id);
      if (live?.status !== "ACCEPTED" || payment?.status !== "PENDING") return;
      draft.checkoutPayments = draft.checkoutPayments.map((item) =>
        item.id === checkout.id ? { ...item, status: "PAID" as const, paid_at: paidAt } : item,
      );
      if (!draft.providerPayouts.some((item) => item.checkout_payment_id === checkout.id)) {
        draft.providerPayouts = [
          {
            id: payoutId,
            checkout_payment_id: checkout.id,
            provider_id: request.provider_id,
            provider_type: "PHARMACY",
            amount_kobo: providerPrice,
            status: "PROCESSING",
            bank_account_last4: pharmacy?.payout_bank_account_number?.slice(-4) ?? "—",
            bank_code: pharmacy?.payout_bank_code ?? "",
            account_name: pharmacy?.payout_account_name ?? pharmacy?.business_name ?? "Pharmacy",
            transfer_reference: `NOM-${request.id.toUpperCase()}`,
            initiated_at: paidAt,
            completed_at: null,
            failure_reason: null,
          },
          ...draft.providerPayouts,
        ];
      }
    });
    toast("Checkout verified. The pharmacy payout is starting.");
  }
  function simulatePaymentFailure() {
    if (!request || checkout?.status !== "PENDING") return;

    update((draft) => {
      const live = providerRequestMutationTarget(draft, session.viewingPatientId, request.id);
      const current = draft.checkoutPayments.find((item) => item.id === checkout.id);
      if (live?.status !== "ACCEPTED" || current?.status !== "PENDING") return;
      draft.checkoutPayments = draft.checkoutPayments.map((payment) =>
        payment.id === checkout.id ? { ...payment, status: "FAILED" as const } : payment,
      );
    });
    toast("Checkout marked failed.");
  }

  return (
    <MobileScreen
      title={pharmacy?.business_name ?? "Pharmacy"}
      /* Which medication this is was nowhere on the screen a patient pays
         from. It belongs under the name they are paying. */
      subtitle={rx ? `${rx.medication}, ${rx.dosage}` : undefined}
      back={`/app/prescriptions/${id}`}
      tabs="none"
      patientContext
    >
      <div data-screen="P46d" className="space-y-4">
        {mutation.node}
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            {request.order_status ? <OrderStatusBadge status={request.order_status} /> : null}
            {checkout ? (
              <CheckoutPaymentBadge status={checkout.status} />
            ) : (
              <Badge tone="warning">Checkout pending</Badge>
            )}
          </div>
          <p className="measure mt-3 text-body">
            {request.status !== "ACCEPTED"
              ? request.status === "REQUESTED"
                ? "Waiting for the pharmacy to confirm availability and price. You have not paid yet."
                : "This request is closed. Check its status before choosing another pharmacy."
              : request.order_status === "PREPARING"
                ? checkout?.status === "PAID"
                  ? `${pharmacy?.business_name} is preparing your medication. Your payment is confirmed.`
                  : `${pharmacy?.business_name} is preparing your medication. Complete payment before collection or delivery.`
                : request.order_status === "READY_FOR_PICKUP"
                  ? "Ready for collection."
                  : request.order_status === "OUT_FOR_DELIVERY"
                    ? "On its way to you."
                    : request.order_status === "FULFILLED"
                      ? "Fulfilled. This is now on your record."
                      : "The pharmacy has accepted your request. Complete checkout to continue."}
          </p>
        </Card>

        <section>
          <h2 className="mb-2 font-heading text-h3">How you'll get it</h2>
          <SegmentedControl
            label="Delivery or pickup"
            value={handoff}
            onChange={(nextHandoff) => {
              setHandoff(nextHandoff);
              update((draft) => {
                if (!providerRequestMutationTarget(draft, session.viewingPatientId, request.id))
                  return;
                draft.providerRequests = draft.providerRequests.map((item) =>
                  item.id === request.id ? { ...item, delivery_or_pickup: nextHandoff } : item,
                );
              });
            }}
            options={[
              { value: "PICKUP", label: "I'll collect" },
              { value: "DELIVERY", label: "Deliver it" },
            ]}
          />
          {handoff === "DELIVERY" ? (
            <div className="mt-3">
              <Field label="Where to, and anything they should know" optional>
                {(p) => (
                  <Textarea
                    {...p}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onBlur={() => {
                      // It used to be an uncontrolled box that went nowhere. An
                      // address a patient types is the address the pharmacy sees.
                      if (note === (request.delivery_note ?? "")) return;
                      update((d) => {
                        if (!providerRequestMutationTarget(d, session.viewingPatientId, request.id))
                          return;
                        d.providerRequests = d.providerRequests.map((r) =>
                          r.id === request.id ? { ...r, delivery_note: note } : r,
                        );
                      });
                      toast("Saved for the pharmacy.");
                    }}
                    placeholder="14b Ojuelegba Road, Surulere. Call on arrival."
                  />
                )}
              </Field>
            </div>
          ) : null}
          <p className="measure mt-2 text-body-sm text-base-content/65">
            You and {pharmacy?.business_name} arrange the actual handoff between you. Monovella
            records the choice and their contact details, not a delivery tracker.
          </p>
          {handoff === "PICKUP" ? (
            <div className="mt-3">
              <MapDirections
                providerName={pharmacy?.business_name ?? "the pharmacy"}
                address={pharmacy?.premises_address}
              />
            </div>
          ) : null}
        </section>

        <section>
          <h2 className="mb-2 font-heading text-h3">Secure checkout</h2>
          <Card>
            <p className="measure text-body-sm text-base-content/75">
              Pay once through Nomba. After payment verification, Monovella sends the pharmacy’s
              share to its verified bank account — no account details or payment proof needed from
              you.
            </p>
            <dl className="mt-3 divide-y divide-base-300 border-t border-base-300 pt-2">
              {request.amount_kobo ? (
                <>
                  <DataRow label="Medication price" value={naira(providerPrice)} />
                  <DataRow label="Monovella service fee" value={naira(serviceFee)} />
                  <DataRow label="Total" value={naira(total)} />
                </>
              ) : null}
              <DataRow label="Checkout" value={checkout?.status ?? "Not paid"} mono={false} />
            </dl>
            {!checkout && request.status === "ACCEPTED" ? (
              <div className="mt-4 space-y-3">
                <SegmentedControl
                  label="Checkout method"
                  value={checkoutMethod}
                  onChange={setCheckoutMethod}
                  options={[
                    { value: "CARD", label: "Card" },
                    { value: "TRANSFER", label: "Bank transfer" },
                  ]}
                />
                <Button
                  full
                  disabled={!providerPrice}
                  onClick={() => {
                    if (!providerRequestMutationTarget(data, session.viewingPatientId, request.id))
                      return;
                    const checkoutId = nextId("chk");
                    update((d) => {
                      if (
                        !providerRequestMutationTarget(d, session.viewingPatientId, request.id) ||
                        d.checkoutPayments.some(
                          (payment) => payment.provider_request_id === request.id,
                        )
                      )
                        return;
                      d.checkoutPayments = [
                        {
                          id: checkoutId,
                          consultation_id: request.consultation_id ?? null,
                          provider_request_id: request.id,
                          provider_id: request.provider_id,
                          provider_type: "PHARMACY",
                          total_amount_kobo: total,
                          provider_amount_kobo: providerPrice,
                          commission_amount_kobo: serviceFee,
                          method: checkoutMethod,
                          status: "PENDING",
                          nomba_order_reference: `MV-${request.id.toUpperCase()}`,
                          paid_at: null,
                          refunded_at: null,
                          refund_method: null,
                          patient_id: request.patient_identity_id,
                          payer_user_id: d.user.id,
                        },
                        ...d.checkoutPayments,
                      ];
                    });
                    toast("Checkout submitted for verification.");
                  }}
                >
                  Confirm secure checkout
                </Button>
              </div>
            ) : checkout?.status === "FAILED" && request.status === "ACCEPTED" ? (
              <Button
                full
                className="mt-4"
                onClick={() => {
                  update((draft) => {
                    draft.checkoutPayments = draft.checkoutPayments.map((payment) =>
                      payment.id === checkout.id
                        ? { ...payment, status: "PENDING" as const }
                        : payment,
                    );
                  });
                  toast("Checkout retry started.");
                }}
              >
                Retry checkout
              </Button>
            ) : checkout?.status === "PENDING" ? (
              <p className="measure mt-4 text-body-sm text-base-content/75" role="status">
                We are waiting for payment confirmation. Your order will update when it arrives.
              </p>
            ) : null}
          </Card>
          {payout?.status === "PAID" ? (
            <Banner tone="success" className="mt-3">
              The pharmacy payout has settled.
            </Banner>
          ) : null}
          {payout?.status === "PROCESSING" ? (
            <Banner tone="info" className="mt-3">
              Your order is paid. The pharmacy payout is processing.
            </Banner>
          ) : null}
          {request.status === "ACCEPTED" && request.order_status !== "FULFILLED" ? (
            <Button
              variant="secondary"
              full
              className="mt-3"
              onClick={() => {
                update((draft) =>
                  closeProviderRequest(
                    draft,
                    request.id,
                    "CANCELLED",
                    checkout?.status === "PAID"
                      ? "Cancelled by patient. Refund pending."
                      : "Cancelled by patient before payment.",
                  ),
                );
                toast(
                  checkout?.status === "PAID"
                    ? "Cancellation recorded. Refund pending."
                    : "Order cancelled.",
                );
              }}
            >
              {checkout?.status === "PAID" ? "Cancel and request refund" : "Cancel order"}
            </Button>
          ) : null}
        </section>
      </div>
    </MobileScreen>
  );
}

/** P47 — Lab Order Detail. Visual twin of P46; only the field labels differ. */
export function LabOrderDetail() {
  const { id } = useParams();
  const { data, session, toast } = usePrototype();
  const { lab, consultation } = useLab(id);

  if (!lab) {
    return (
      <MobileScreen title="Lab order" back="/app" patientContext>
        <EmptyState title="Lab order not found" body="" />
      </MobileScreen>
    );
  }

  const request = providerRequestForActivePatient(data, session.viewingPatientId, {
    labOrderId: lab.id,
  });
  const recommended = lab.recommended_lab_id
    ? providerById(data, lab.recommended_lab_id)
    : undefined;
  const pending = lab.result_status !== "ATTACHED";

  return (
    <MobileScreen
      title={lab.test_requested}
      subtitle={consultation ? expertName(data, consultation.expert_id) : undefined}
      back={consultation ? `/app/consultations/${consultation.id}/record` : "/app"}
      patientContext
    >
      <div data-screen="P47" className="space-y-4">
        {lab.corrected_by_id ? (
          <Banner
            tone="warning"
            action={
              <ButtonLink
                size="sm"
                variant="secondary"
                to={`/app/lab-orders/${lab.corrected_by_id}`}
              >
                View current
              </ButtonLink>
            }
          >
            This lab order was corrected. Use the current version.
          </Banner>
        ) : null}
        {lab.corrects_id ? (
          <Banner
            tone="info"
            action={
              <ButtonLink size="sm" variant="secondary" to={`/app/lab-orders/${lab.corrects_id}`}>
                View original
              </ButtonLink>
            }
          >
            This is a corrected version of an earlier lab order.
          </Banner>
        ) : null}
        <Card>
          <p className="font-heading text-h2">{lab.test_requested}</p>
          {lab.instructions ? (
            <p className="measure mt-2 text-body text-base-content/85">{lab.instructions}</p>
          ) : null}
          <dl className="mt-4 divide-y divide-base-300 border-t border-base-300 pt-2">
            <DataRow label="Ordered" value={formatDate(lab.issued_at)} />
            {lab.result_at ? <DataRow label="Result in" value={formatDate(lab.result_at)} /> : null}
          </dl>
          {recommended ? (
            <p className="mt-3 text-body-sm text-base-content/65">
              {consultation ? expertName(data, consultation.expert_id) : "Your expert"} suggested{" "}
              <strong className="font-medium">{recommended.business_name}</strong>: a suggestion,
              not a requirement.
            </p>
          ) : null}
        </Card>

        <DocumentCard
          title="Lab order"
          issuedAt={`Issued ${formatDate(lab.issued_at)}`}
          downloadLabel="PDF demo"
          onDownload={() => toast("Prototype simulation: no PDF file was downloaded.")}
        />

        {lab.result_status === "ATTACHED" ? (
          <Card className="border-l-[3px] border-l-success">
            <Badge tone="success" icon={Check}>
              Result in
            </Badge>
            <p className="measure mt-2.5 text-body">{lab.result_summary}</p>
            <p className="mt-2 font-mono text-body-sm text-base-content/55">
              {formatDateTime(lab.result_at)}
            </p>
            <ButtonLink
              to={`/app/lab-orders/${lab.id}/result`}
              variant="secondary"
              full
              className="mt-3"
            >
              See result
            </ButtonLink>
          </Card>
        ) : null}

        {pending && !request && !lab.corrected_by_id ? (
          <section>
            <h2 className="mb-2 font-heading text-h3">Get the test done</h2>
            <p className="measure mb-3 text-body-sm text-base-content/70">
              A lab on Monovella uploads the result straight into this case. Any other lab works
              too. You'd just add the result yourself.
            </p>
            <div className="grid gap-2">
              <ButtonLink to={`/app/lab-orders/${lab.id}/labs`} full>
                <FlaskConical aria-hidden className="size-4" strokeWidth={1.5} />
                Find a lab on Monovella
              </ButtonLink>
              <ButtonLink to={`/app/lab-orders/${lab.id}/self-report`} variant="secondary" full>
                Go elsewhere
              </ButtonLink>
            </div>
          </section>
        ) : null}

        {/* Offer collection-time selection only before a booking or result exists. */}
        {request ? (
          <ButtonLink
            to={
              request.status === "ACCEPTED" &&
              (request.slot_id || !request.result_status || request.result_status === "AWAITING")
                ? `/app/lab-orders/${lab.id}/schedule`
                : `/app/lab-orders/${lab.id}/request`
            }
            variant="primary"
            full
          >
            {request.status === "ACCEPTED"
              ? request.slot_id
                ? "View lab booking"
                : request.result_status && request.result_status !== "AWAITING"
                  ? "View lab request"
                  : "Choose a collection time"
              : `${providerById(data, request.provider_id)?.business_name} · see the request`}
          </ButtonLink>
        ) : null}
      </div>
    </MobileScreen>
  );
}

/** P47a — Self-Report: Attach Your Result. */
export function LabSelfReport() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation"],
    "the result you attached",
  );
  const { id } = useParams();
  const { data, session, update, toast } = usePrototype();
  const navigate = useNavigate();
  const { lab } = useLab(id);
  const [summary, setSummary] = useState(lab?.result_summary ?? "");
  const [date, setDate] = useState(lab?.result_at?.slice(0, 10) ?? "");
  const [paidNote, setPaidNote] = useState(lab?.paid_note ?? "");
  const [file, setFile] = useState<string | null>(lab?.result_file_name ?? null);
  const [uploading, setUploading] = useState(false);

  if (!lab) {
    return (
      <MobileScreen title="Lab order" back="/app" patientContext>
        <EmptyState title="Lab order not found" body="" />
      </MobileScreen>
    );
  }

  if (lab.corrected_by_id) {
    return (
      <MobileScreen title="Order updated" back={`/app/lab-orders/${lab.id}`} patientContext>
        <EmptyState
          title="Use the corrected lab order"
          body="The expert replaced this order. Add your update to the current version."
          action={
            <ButtonLink to={`/app/lab-orders/${lab.corrected_by_id}`}>
              View current lab order
            </ButtonLink>
          }
        />
      </MobileScreen>
    );
  }

  return (
    <MobileScreen
      title="Add your result"
      back={`/app/lab-orders/${lab.id}`}
      tabs="none"
      patientContext
    >
      <div data-screen="P47a" className="space-y-4">
        {mutation.node}
        <p className="measure text-body text-base-content/75">
          Pay the lab directly, the way you always have. This just keeps your record complete, so
          the next expert sees the result without you having to explain it.
        </p>
        <div>
          <p className="mb-2 text-label font-medium">
            Photo or PDF of the report{" "}
            <span className="font-normal text-base-content/50">Optional</span>
          </p>
          <FileDrop
            label="Add the result"
            filename={file}
            onFile={(chosen) => setFile(chosen.name)}
            onUploadingChange={setUploading}
            onRemove={() => setFile(null)}
          />
        </div>
        <Field label="Or type what it said" optional>
          {(p) => (
            <Textarea
              {...p}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="25-OH vitamin D 14 ng/mL: deficient"
            />
          )}
        </Field>
        <Field label="When was it done" optional error={pastCareDateError(date, true)}>
          {(p) => (
            <Input
              {...p}
              type="date"
              max={now().toISOString().slice(0, 10)}
              numeric
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          )}
        </Field>
        <Field
          label="What you paid"
          optional
          hint="For your own record. Monovella isn't processing this payment."
        >
          {(p) => (
            <Input
              {...p}
              value={paidNote}
              onChange={(e) => setPaidNote(e.target.value)}
              placeholder="₦9,500 by transfer"
            />
          )}
        </Field>
        <Button
          full
          disabled={
            uploading ||
            (!summary.trim() && !file) ||
            !!pastCareDateError(date, true) ||
            mutation.blocked
          }
          onClick={() => {
            if (uploading || (!summary.trim() && !file) || pastCareDateError(date, true)) return;
            if (!activeFulfillmentPatient(data, session.viewingPatientId)) return;
            update((d) => {
              const patient = activeFulfillmentPatient(d, session.viewingPatientId);
              const current = d.labOrders.find((item) => item.id === lab.id);
              const ownsLabOrder = current
                ? d.consultations.some(
                    (consultation) =>
                      consultation.id === current.consultation_id &&
                      consultation.patient_identity_id === patient?.id,
                  )
                : false;
              if (!ownsLabOrder || current?.corrected_by_id) return;
              d.labOrders = d.labOrders.map((l) =>
                l.id === lab.id
                  ? {
                      ...l,
                      result_status: "ATTACHED" as const,
                      result_at: date ? `${date}T09:00:00Z` : null,
                      result_file_name: file,
                      result_source: "Patient-supplied result",
                      result_corrected_at: null,
                      result_summary: summary.trim() || "Result attached as a file.",
                      paid_note: paidNote || null,
                    }
                  : l,
              );
            });
            toast("Result added to your record.");
            navigate(`/app/lab-orders/${lab.id}`);
          }}
        >
          Save to my record
        </Button>
      </div>
    </MobileScreen>
  );
}

/** P47b — Find a Lab. Recommended lab shown first, clearly labelled. */
export function FindLab() {
  const { id } = useParams();
  const { data, session } = usePrototype();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const { lab, consultation } = useLab(id);
  const [view, setView] = useState<"populated" | "empty">("populated");

  if (
    !lab ||
    lab.corrected_by_id ||
    !consultation ||
    consultation.patient_identity_id !== session.viewingPatientId
  ) {
    return (
      <MobileScreen title="Choose a lab" back="/app" tabs="none" patientContext>
        <div data-screen="P47b">
          <EmptyState
            title="Lab order unavailable"
            body="This lab order does not exist or is not available for the patient you are viewing."
          />
        </div>
      </MobileScreen>
    );
  }

  const labs =
    view === "empty"
      ? []
      : data.providers.filter(
          (p) => p.provider_type === "LAB" && matchesProvider(p, query, location),
        );
  const recommendedId = lab?.recommended_lab_id;
  const ordered = [...labs].sort((a, b) =>
    a.id === recommendedId ? -1 : b.id === recommendedId ? 1 : 0,
  );

  return (
    <MobileScreen
      title="Choose a lab"
      subtitle={lab.test_requested}
      back={`/app/lab-orders/${id}`}
      tabs="none"
      patientContext
    >
      <div data-screen="P47b" className="space-y-4">
        <ScreenStates
          states={[
            { value: "populated", label: "Populated" },
            { value: "empty", label: "None nearby" },
          ]}
          value={view}
          onChange={setView}
        />

        <Card>
          <p className="measure text-body-sm text-base-content/75">
            A lab here uploads your result straight into this case, nothing for you to photograph.
            Verified means Monovella checked its CAC registration and MLSCN licence.
          </p>
        </Card>

        <Field label="Search labs">
          {(props) => (
            <Input
              {...props}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Lab name, area or service"
            />
          )}
        </Field>
        <ProviderLocationSearch value={location} onChange={setLocation} />
        {ordered.length ? (
          <ul className="space-y-2.5">
            {ordered.map((p) => (
              <li key={p.id}>
                <ProviderCard
                  provider={p}
                  status={providerAvailabilityStatus(data, p.id)}
                  recommendedBy={
                    p.id === recommendedId && consultation
                      ? expertName(data, consultation.expert_id)
                      : undefined
                  }
                  onSelect={() => navigate(`/app/lab-orders/${id}/labs/${p.id}/consent`)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title={
              query.trim() || location.trim()
                ? "No matching labs"
                : "No partnered labs near you yet"
            }
            body={
              query.trim() || location.trim()
                ? "Try another lab name, area or service, or clear your search."
                : "You can use an outside lab that offers this test, then add its result to your record."
            }
            action={
              query.trim() || location.trim() ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setLocation("");
                  }}
                >
                  Clear search
                </Button>
              ) : (
                <ButtonLink to={`/app/lab-orders/${id}/self-report`}>Record myself</ButtonLink>
              )
            }
          />
        )}
      </div>
    </MobileScreen>
  );
}

export function ProviderDisclosureConsent({ providerType }: { providerType: "PHARMACY" | "LAB" }) {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "conflict", "forbidden"],
    "this disclosure consent",
  );
  const { id, providerId } = useParams();
  const { data, session, update, toast, nextId } = usePrototype();
  const navigate = useNavigate();
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const rxState = useRx(providerType === "PHARMACY" ? id : undefined);
  const labState = useLab(providerType === "LAB" ? id : undefined);
  const rx = rxState.rx;
  const lab = labState.lab;
  const consultation = rxState.consultation ?? labState.consultation;
  const provider = data.providers.find(
    (item) => item.id === providerId && item.provider_type === providerType,
  );
  const patient = consultation ? patientById(data, consultation.patient_identity_id) : undefined;
  const isSelf = patient?.id === selfPatient(data)?.id;
  const isGuardian = !!patient?.guardian_user_id && patient.guardian_user_id === data.user.id;
  const artifactMatches =
    providerType === "PHARMACY" ? !!rx && !rx.corrected_by_id : !!lab && !lab.corrected_by_id;
  const directoryPath =
    providerType === "PHARMACY"
      ? `/app/prescriptions/${id}/pharmacies`
      : `/app/lab-orders/${id}/labs`;
  const detailPath =
    providerType === "PHARMACY" ? `/app/prescriptions/${id}` : `/app/lab-orders/${id}`;
  const requestPath =
    providerType === "PHARMACY"
      ? `/app/prescriptions/${id}/request`
      : `/app/lab-orders/${id}/request`;
  const existingRequest = data.providerRequests.find(
    (item) =>
      item.patient_identity_id === patient?.id &&
      (providerType === "PHARMACY" ? item.prescription_id === id : item.lab_order_id === id) &&
      (effectiveProviderRequestStatus(item) === "REQUESTED" || item.status === "ACCEPTED"),
  );

  if (!artifactMatches || !consultation || !provider || !patient || (!isSelf && !isGuardian)) {
    return (
      <MobileScreen title="Share with provider" back={detailPath} tabs="none" patientContext>
        <div data-screen={providerType === "PHARMACY" ? "P46b" : "P47b"}>
          {mutation.node}
          <EmptyState
            title="Sharing request unavailable"
            body="The care record or provider is unavailable for the patient you are viewing."
          />
        </div>
      </MobileScreen>
    );
  }

  if (existingRequest) {
    return (
      <MobileScreen title="Share with provider" back={detailPath} tabs="none" patientContext>
        <div data-screen={providerType === "PHARMACY" ? "P46b" : "P47b"}>
          {mutation.node}
          <EmptyState
            title="A request is already active"
            body="Only one provider can hold this request at a time."
            action={<ButtonLink to={requestPath}>View request</ButtonLink>}
          />
        </div>
      </MobileScreen>
    );
  }

  const patientName = `${patient.first_name} ${patient.last_name}`;
  const informationShared =
    providerType === "PHARMACY"
      ? [
          ["Patient", patientName],
          ["Medication", rx?.medication ?? ""],
          ["Dose", rx?.dosage ?? ""],
          ["Instructions", rx?.instructions ?? ""],
        ]
      : [
          ["Patient", patientName],
          ["Test", lab?.test_requested ?? ""],
          ["Instructions", lab?.instructions ?? "No additional instructions"],
        ];

  const submit = () => {
    if (!agreed || submitting || session.offline) return;
    if (!providerAcceptsNewWork(data, provider.id)) {
      toast(`That ${providerType === "PHARMACY" ? "pharmacy" : "lab"} is not taking requests.`);
      return;
    }

    setSubmitting(true);
    const requestedAt = now().toISOString().slice(0, 19);
    const requestId = nextId("preq");
    const consentId = nextId("consent");
    update((draft) => {
      const currentPatient = activeFulfillmentPatient(draft, session.viewingPatientId);
      const currentConsultation = draft.consultations.find(
        (item) => item.id === consultation.id && item.patient_identity_id === currentPatient?.id,
      );
      const currentArtifact =
        providerType === "PHARMACY"
          ? draft.prescriptions.some(
              (item) =>
                item.id === rx?.id &&
                item.consultation_id === currentConsultation?.id &&
                !item.corrected_by_id,
            )
          : draft.labOrders.some(
              (item) =>
                item.id === lab?.id &&
                item.consultation_id === currentConsultation?.id &&
                !item.corrected_by_id,
            );
      if (!currentPatient || !currentConsultation || !currentArtifact) return;
      const duplicate = draft.providerRequests.some(
        (item) =>
          item.patient_identity_id === currentPatient.id &&
          (providerType === "PHARMACY" ? item.prescription_id === id : item.lab_order_id === id) &&
          (effectiveProviderRequestStatus(item) === "REQUESTED" || item.status === "ACCEPTED"),
      );
      if (duplicate) return;
      recordConsent(draft.consentRecords, {
        actingUserId: data.user.id,
        patientId: patient.id,
        actorCapacity: isSelf ? "ACCOUNT_HOLDER" : "GUARDIAN",
        guardianRelationship: isSelf ? null : patient.guardian_reason,
        purpose: providerType === "PHARMACY" ? "PHARMACY_DISCLOSURE" : "LAB_DISCLOSURE",
        version:
          providerType === "PHARMACY"
            ? CONSENT_VERSIONS.pharmacyDisclosure
            : CONSENT_VERSIONS.labDisclosure,
        occurredAt: requestedAt,
        careEventId: requestId,
      });
      draft.providerRequests = [
        {
          id: requestId,
          provider_type: providerType,
          provider_id: provider.id,
          status: "REQUESTED",
          requested_at: requestedAt,
          respond_by: new Date(now().getTime() + 3 * 3600_000).toISOString().slice(0, 19),
          responded_at: null,
          decline_reason: null,
          order_status: null,
          delivery_or_pickup: null,
          delivery_note: null,
          slot_id: null,
          result_status: null,
          prescription_id: rx?.id ?? null,
          lab_order_id: lab?.id ?? null,
          consultation_id: consultation.id,
          patient_identity_id: patient.id,
          disclosure_consent: {
            id: consentId,
            actor_user_id: data.user.id,
            patient_identity_id: patient.id,
            authority: isSelf ? "SELF" : "GUARDIAN",
            guardian_reason: isSelf ? null : patient.guardian_reason,
            purpose:
              providerType === "PHARMACY" ? "PRESCRIPTION_FULFILMENT" : "LAB_TEST_FULFILMENT",
            statement_version: "provider-disclosure-v1",
            information_shared:
              providerType === "PHARMACY"
                ? [
                    "PATIENT_NAME",
                    "PRESCRIPTION_MEDICATION",
                    "PRESCRIPTION_DOSAGE",
                    "PRESCRIPTION_INSTRUCTIONS",
                  ]
                : ["PATIENT_NAME", "LAB_TEST_REQUESTED", "LAB_INSTRUCTIONS"],
            consented_at: requestedAt,
          },
        },
        ...draft.providerRequests,
      ];
    });
    toast(`Request sent to one ${providerType === "PHARMACY" ? "pharmacy" : "lab"}.`);
    navigate(requestPath);
  };

  return (
    <MobileScreen title="Before you share" back={directoryPath} tabs="none" patientContext>
      <div data-screen={providerType === "PHARMACY" ? "P46b" : "P47b"} className="space-y-4">
        {mutation.node}
        <div>
          <p className="text-label text-primary">{provider.business_name}</p>
          <h1 className="mt-1 font-heading text-h1">Share {patient.first_name}'s details?</h1>
          <p className="measure mt-2 text-body text-base-content/75">
            {provider.business_name} needs only the details below to respond to this{" "}
            {providerType === "PHARMACY" ? "prescription" : "test"} request. They will see them
            after you confirm, before deciding whether they can help.
          </p>
        </div>

        <Card>
          <p className="mb-2 text-label font-medium text-base-content/65">Information shared</p>
          <dl className="divide-y divide-base-300">
            {informationShared.map(([label, value]) => (
              <DataRow key={label} label={label} value={value} mono={false} />
            ))}
          </dl>
        </Card>

        {isGuardian ? (
          <Banner tone="info">You are confirming this on {patient.first_name}'s behalf.</Banner>
        ) : null}
        {session.offline ? (
          <Banner tone="warning">Go online to share this request. It will not be queued.</Banner>
        ) : null}

        <Checkbox
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          label={`I agree to share these details with ${provider.business_name} for this request.`}
        />
        <div className="grid gap-2">
          <Button full disabled={!agreed || submitting || session.offline} onClick={submit}>
            {submitting ? "Sending request..." : "Consent and send request"}
          </Button>
          <ButtonLink to={detailPath} variant="secondary" full>
            Cancel
          </ButtonLink>
        </div>
      </div>
    </MobileScreen>
  );
}

/** P47c — Lab Request Status. Same family as P46c. */
export function LabRequestStatus() {
  useTick();
  const { id } = useParams();
  const { data, session, update, toast } = usePrototype();
  const { lab: activeLab } = useLab(id);
  const request = activeLab
    ? providerRequestForActivePatient(data, session.viewingPatientId, { labOrderId: id })
    : undefined;
  const [override, setOverride] = useState<
    "live" | "REQUESTED" | "ACCEPTED" | "DECLINED" | "EXPIRED"
  >("live");

  if (!request) {
    return (
      <MobileScreen title="Request" back={`/app/lab-orders/${id}`} patientContext>
        <EmptyState title="No request sent yet" body="" />
      </MobileScreen>
    );
  }

  const provider = providerById(data, request.provider_id);
  const lab = data.labOrders.find((item) => item.id === request.lab_order_id);
  const checkout = data.checkoutPayments.find(
    (payment) => payment.provider_request_id === request.id,
  );
  const status =
    override === "live"
      ? lab?.corrected_by_id && ["REQUESTED", "ACCEPTED"].includes(request.status)
        ? "OBSOLETE"
        : effectiveProviderRequestStatus(request)
      : override;

  return (
    <MobileScreen
      title={provider?.business_name ?? "Lab"}
      back={`/app/lab-orders/${id}`}
      tabs="none"
      patientContext
    >
      <div data-screen="P47c" className="space-y-4">
        <ScreenStates
          states={[
            { value: "live", label: "Live" },
            { value: "REQUESTED", label: "Awaiting" },
            { value: "ACCEPTED", label: "Accepted" },
            { value: "DECLINED", label: "Declined" },
            { value: "EXPIRED", label: "Expired" },
          ]}
          value={override}
          onChange={setOverride}
        />

        <Card>
          <ProviderRequestBadge status={status} />
          <p className="mt-3 font-heading text-h3">{provider?.business_name}</p>
          <p className="text-body-sm text-base-content/65">{provider?.premises_address}</p>
          {status === "REQUESTED" ? (
            <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-base-300 pt-3">
              <span className="text-body-sm text-base-content/60">They have</span>
              <Countdown deadline={request.respond_by} elapsedText="No response" />
            </div>
          ) : null}
          {status === "DECLINED" ? (
            <p className="measure mt-3 text-body text-base-content/80">
              This lab can't run it right now.
            </p>
          ) : null}
          {status === "EXPIRED" ? (
            <p className="measure mt-3 text-body text-base-content/80">
              No response within the window. Nothing was charged.
            </p>
          ) : null}
          {["CANCELLED", "WITHDRAWN", "UNABLE_TO_FULFIL", "OBSOLETE"].includes(status) ? (
            <p className="measure mt-3 text-body text-base-content/80">
              {status === "OBSOLETE"
                ? "This lab holds an older order version and cannot continue. Open the corrected order before choosing another lab."
                : (request.terminal_reason ??
                  "This request is closed. Any paid checkout is being refunded.")}
            </p>
          ) : null}
        </Card>

        {status === "ACCEPTED" ? (
          <ButtonLink to={`/app/lab-orders/${id}/schedule`} full>
            Choose time
          </ButtonLink>
        ) : null}

        {["DECLINED", "EXPIRED", "CANCELLED", "WITHDRAWN", "UNABLE_TO_FULFIL"].includes(status) ? (
          <>
            <ButtonLink to={`/app/lab-orders/${id}/labs`} full>
              Try another
            </ButtonLink>
            <ButtonLink to={`/app/lab-orders/${id}/self-report`} variant="ghost" full>
              Add yourself
            </ButtonLink>
          </>
        ) : null}
        {status === "OBSOLETE" && lab?.corrected_by_id ? (
          <ButtonLink to={`/app/lab-orders/${lab.corrected_by_id}`} full>
            Open corrected
          </ButtonLink>
        ) : null}
        {status === "REQUESTED" || (status === "ACCEPTED" && !checkout) ? (
          <Button
            variant="secondary"
            full
            onClick={() => {
              update((draft) =>
                closeProviderRequest(draft, request.id, "CANCELLED", "Cancelled by patient."),
              );
              toast("Request cancelled. Nothing was charged.");
            }}
          >
            Cancel request without charge
          </Button>
        ) : null}
      </div>
    </MobileScreen>
  );
}

/** P47d — Schedule & Pay for Lab Test. */
export function LabSchedule() {
  // "Choosing a slot" is the screen this route renders before a collection time
  // is booked, and it is the step the loop turns on: a lab visit that fits the
  // working day instead of costing it. Every seeded lab request is either still
  // awaiting the lab or already scheduled, so without this declared state the
  // picker is unreachable in the prototype and no screenshot ever shows it.
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "conflict"],
    "your booked slot",
    [
      { value: "choosing" as const, label: "Choosing a slot" },
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
  const { lab: activeLab } = useLab(id);
  const request = activeLab
    ? providerRequestForActivePatient(data, session.viewingPatientId, { labOrderId: id })
    : undefined;
  const [slot, setSlot] = useState<string | null>(null);
  const [collectionMethod, setCollectionMethod] = useState<LabCollectionMethod>("BRANCH");
  const [checkoutMethod, setCheckoutMethod] = useState<"CARD" | "TRANSFER">("CARD");

  if (activeLab?.corrected_by_id) {
    return (
      <MobileScreen title="Order updated" back={`/app/lab-orders/${id}`} patientContext>
        <EmptyState
          title="Use the corrected lab order"
          body="The expert replaced this test order. Unfinished fulfilment of this version has stopped."
          action={
            <ButtonLink to={`/app/lab-orders/${activeLab.corrected_by_id}`}>
              View current lab order
            </ButtonLink>
          }
        />
      </MobileScreen>
    );
  }
  if (request?.status !== "ACCEPTED" || request?.amount_kobo == null) {
    return (
      <MobileScreen title="Schedule" back={`/app/lab-orders/${id}`} patientContext>
        <EmptyState
          title="Waiting for the lab"
          body="Choose a time after the lab has accepted your request and confirmed its price."
        />
      </MobileScreen>
    );
  }

  const provider = providerById(data, request.provider_id);
  const providerStatus = providerAvailabilityStatus(data, request.provider_id);
  const acceptsNewWork = providerAcceptsNewWork(data, request.provider_id);
  const allOpenSlots = bookableSlotsForProvider(data, request.provider_id).filter((s) => !s.taken);
  const collectionMethods = [
    ...new Set(allOpenSlots.map((candidate) => candidate.collection_method ?? "BRANCH")),
  ];
  const activeCollectionMethod = collectionMethods.includes(collectionMethod)
    ? collectionMethod
    : (collectionMethods[0] ?? "BRANCH");
  const slots = allOpenSlots.filter(
    (candidate) => (candidate.collection_method ?? "BRANCH") === activeCollectionMethod,
  );
  const booked = request.slot_id
    ? data.providerSlots.find((s) => s.id === request.slot_id)
    : undefined;
  const selectedSlot = slots.find((candidate) => candidate.id === slot);
  const collectionDates = new Map<string, { label: string; slots: ProviderScheduleSlotRead[] }>();
  for (const candidate of slots) {
    const date = collectionDate(candidate);
    const group = collectionDates.get(date.key);
    if (group) group.slots.push(candidate);
    else collectionDates.set(date.key, { label: date.label, slots: [candidate] });
  }
  const bookedDate = booked ? collectionDate(booked) : undefined;
  const selectedDate = selectedSlot ? collectionDate(selectedSlot) : undefined;
  const providerPrice = request.amount_kobo ?? 0;
  const serviceFee = Math.min(Math.floor(providerPrice * 0.2), 300000);
  const total = providerPrice + serviceFee;
  const checkout = data.checkoutPayments.find(
    (payment) => payment.provider_request_id === request.id,
  );
  const payout = checkout
    ? data.providerPayouts.find((item) => item.checkout_payment_id === checkout.id)
    : undefined;

  function simulatePaymentSuccess() {
    if (!request || checkout?.status !== "PENDING") return;

    const paidAt = now().toISOString().slice(0, 19);
    const payoutId = nextId("po");
    update((draft) => {
      const live = providerRequestMutationTarget(draft, session.viewingPatientId, request.id);
      const payment = draft.checkoutPayments.find((item) => item.id === checkout.id);
      if (live?.status !== "ACCEPTED" || payment?.status !== "PENDING") return;
      draft.checkoutPayments = draft.checkoutPayments.map((item) =>
        item.id === checkout.id ? { ...item, status: "PAID" as const, paid_at: paidAt } : item,
      );
      if (!draft.providerPayouts.some((item) => item.checkout_payment_id === checkout.id)) {
        draft.providerPayouts = [
          {
            id: payoutId,
            checkout_payment_id: checkout.id,
            provider_id: request.provider_id,
            provider_type: "LAB",
            amount_kobo: providerPrice,
            status: "PROCESSING",
            bank_account_last4: provider?.payout_bank_account_number?.slice(-4) ?? "—",
            bank_code: provider?.payout_bank_code ?? "",
            account_name: provider?.payout_account_name ?? provider?.business_name ?? "Lab",
            transfer_reference: `NOM-${request.id.toUpperCase()}`,
            initiated_at: paidAt,
            completed_at: null,
            failure_reason: null,
          },
          ...draft.providerPayouts,
        ];
      }
    });
    toast("Checkout verified. The lab payout is starting.");
  }
  function simulatePaymentFailure() {
    if (!request || checkout?.status !== "PENDING") return;

    update((draft) => {
      const live = providerRequestMutationTarget(draft, session.viewingPatientId, request.id);
      const current = draft.checkoutPayments.find((item) => item.id === checkout.id);
      if (live?.status !== "ACCEPTED" || current?.status !== "PENDING") return;
      draft.checkoutPayments = draft.checkoutPayments.map((payment) =>
        payment.id === checkout.id ? { ...payment, status: "FAILED" as const } : payment,
      );
    });
    toast("Checkout marked failed. Your slot remains held for retry.");
  }

  return (
    <MobileScreen
      title={provider?.business_name ?? "Lab"}
      back={`/app/lab-orders/${id}`}
      tabs="none"
      patientContext
    >
      <div data-screen="P47d" className="space-y-4">
        {mutation.node}
        {booked && mutation.state !== "choosing" ? (
          <div className="space-y-3">
            <Card className="border-l-[3px] border-l-success">
              <Badge tone="success" icon={Check}>
                Collection confirmed
              </Badge>
              <p className="mt-2.5 font-mono text-data">
                {bookedDate?.label}, {booked.start_time} to {booked.end_time}
              </p>
              <p className="mt-1 text-body-sm text-base-content/65">
                {(booked.collection_method ?? "BRANCH") === "HOME"
                  ? "Home collection"
                  : "Collection at the lab"}
              </p>
              {(booked.collection_method ?? "BRANCH") === "BRANCH" ? (
                <p className="mt-1 text-body-sm text-base-content/65">
                  {provider?.premises_address}
                </p>
              ) : null}
            </Card>
            {(booked.collection_method ?? "BRANCH") === "BRANCH" ? (
              <MapDirections
                providerName={provider?.business_name ?? "the lab"}
                address={provider?.premises_address}
              />
            ) : null}
          </div>
        ) : request.result_status &&
          request.result_status !== "AWAITING" &&
          mutation.state !== "choosing" ? (
          <Card>
            <p className="measure text-body">
              This request has reached the result stage. A new collection time is not needed.
            </p>
            <ButtonLink to={`/app/lab-orders/${id}/result`} full className="mt-3">
              View result status
            </ButtonLink>
          </Card>
        ) : !acceptsNewWork ? (
          <EmptyState
            title="This lab is out of office"
            body="It is not taking a new collection booking right now. Your accepted test request is unchanged; choose another lab if you need a new time."
            action={<ButtonLink to={`/app/lab-orders/${id}/labs`}>Try another</ButtonLink>}
          />
        ) : allOpenSlots.length ? (
          <section>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-h3">Choose a collection time</h2>
              <AvailabilityBadge status={providerStatus} audience="Provider" />
            </div>
            {providerStatus === "AWAY" ? (
              <Banner tone="warning" className="mb-3">
                This lab is away. The collection window is still available, but any follow-up may
                take longer.
              </Banner>
            ) : null}
            {collectionMethods.length > 1 ? (
              <div className="mb-3">
                <SegmentedControl
                  label="Collection method"
                  value={activeCollectionMethod}
                  onChange={(next) => {
                    setCollectionMethod(next);
                    setSlot(null);
                  }}
                  options={[
                    {
                      value: "BRANCH",
                      label: "At the lab",
                      disabled: !collectionMethods.includes("BRANCH"),
                    },
                    {
                      value: "HOME",
                      label: "Home collection",
                      disabled: !collectionMethods.includes("HOME"),
                    },
                  ]}
                />
              </div>
            ) : null}
            <p className="measure mb-3 text-body-sm text-base-content/65">
              {activeCollectionMethod === "HOME"
                ? "Choose a home-collection window. The lab confirms any preparation and address details directly."
                : "Choose a branch collection window. Arrive early enough for the lab's own registration and preparation steps."}{" "}
              All times use Africa/Lagos and only windows with remaining capacity are shown.
            </p>
            {activeCollectionMethod === "BRANCH" ? (
              <div className="mb-3">
                <MapDirections
                  providerName={provider?.business_name ?? "the lab"}
                  address={provider?.premises_address}
                />
              </div>
            ) : null}
            <div className="space-y-4">
              {/* Ordered by date, not by weekday. `slotsForProvider` sorts on
                  `day_of_week`, which is right for the lab's own weekly slot
                  management but wrong here: these groups are concrete dates
                  `collectionDate` projected from that recurrence, so Friday (5)
                  sorted above Saturday (6) put next week's slot above today's.
                  The key is an ISO date, so it sorts chronologically as a
                  string. Sorting here rather than in the shared selector keeps
                  the provider's weekday view unchanged. */}
              {[...collectionDates.entries()]
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([, group]) => (
                  <section key={group.label} aria-label={group.label}>
                    <h3 className="mb-2 font-heading text-h3 text-base-content/80">
                      {group.label}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {group.slots.map((candidate) => (
                        <Chip
                          key={candidate.id}
                          selected={slot === candidate.id}
                          onClick={() => setSlot(candidate.id)}
                        >
                          <span className="font-mono tabular">
                            {candidate.start_time}-{candidate.end_time}
                          </span>
                          {/* The time and the remaining capacity are separate
                            spans, so without this they render as "11:001 left". */}
                          <span className="ml-1.5 text-body-sm text-base-content/60">
                            {Math.max(0, (candidate.capacity ?? 1) - (candidate.booked_count ?? 0))}{" "}
                            left
                          </span>
                        </Chip>
                      ))}
                    </div>
                  </section>
                ))}
            </div>
            {selectedSlot && providerPrice ? (
              <Card className="mt-3 space-y-3">
                <div>
                  <p className="text-body-sm text-base-content/60">Selected collection</p>
                  <p className="font-heading text-h3">
                    {selectedDate?.label}, {selectedSlot.start_time}-{selectedSlot.end_time}
                  </p>
                  <p className="mt-1 text-body-sm text-base-content/65">
                    {(selectedSlot.collection_method ?? "BRANCH") === "HOME"
                      ? "Home collection"
                      : "Collection at the lab"}
                  </p>
                </div>
                <p className="font-heading text-h3">Secure checkout</p>
                <dl className="divide-y divide-base-300 border-y border-base-300">
                  <DataRow label="Lab price" value={naira(providerPrice)} />
                  <DataRow label="Monovella service fee" value={naira(serviceFee)} />
                  <DataRow label="Total" value={naira(total)} />
                </dl>
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
                  Pay once through Nomba. After the payment is verified, Monovella sends the lab
                  price to the lab's verified bank account.
                </p>
              </Card>
            ) : null}
            <Button
              full
              className="mt-3"
              disabled={!slot || !providerPrice}
              onClick={() => {
                if (!providerRequestMutationTarget(data, session.viewingPatientId, request.id))
                  return;
                const liveSlot = slot
                  ? data.providerSlots.find((candidate) => candidate.id === slot)
                  : undefined;
                if (
                  !liveSlot ||
                  !bookableSlotsForProvider(data, request.provider_id).some(
                    (candidate) => candidate.id === liveSlot.id,
                  ) ||
                  liveSlot.taken ||
                  (liveSlot.booked_count ?? 0) >= (liveSlot.capacity ?? 1)
                ) {
                  setSlot(null);
                  toast("That collection window has just filled. Please choose another time.");
                  return;
                }
                const checkoutId = nextId("chk");
                update((d) => {
                  if (
                    !providerRequestMutationTarget(d, session.viewingPatientId, request.id) ||
                    d.checkoutPayments.some((payment) => payment.provider_request_id === request.id)
                  )
                    return;
                  d.providerRequests = d.providerRequests.map((r) =>
                    r.id === request.id ? { ...r, slot_id: slot } : r,
                  );
                  d.providerSlots = d.providerSlots.map((s) =>
                    s.id === slot
                      ? {
                          ...s,
                          booked_count: (s.booked_count ?? 0) + 1,
                          taken: (s.booked_count ?? 0) + 1 >= (s.capacity ?? 1),
                        }
                      : s,
                  );
                  d.checkoutPayments = [
                    {
                      id: checkoutId,
                      consultation_id: request.consultation_id ?? null,
                      provider_request_id: request.id,
                      provider_id: request.provider_id,
                      provider_type: "LAB",
                      total_amount_kobo: total,
                      provider_amount_kobo: providerPrice,
                      commission_amount_kobo: serviceFee,
                      method: checkoutMethod,
                      status: "PENDING",
                      nomba_order_reference: `MV-${request.id.toUpperCase()}`,
                      paid_at: null,
                      refunded_at: null,
                      refund_method: null,
                      patient_id: request.patient_identity_id,
                      payer_user_id: d.user.id,
                    },
                    ...d.checkoutPayments,
                  ];
                });
                toast("Checkout submitted. The slot is held while payment is verified.");
              }}
            >
              Confirm secure checkout
            </Button>
          </section>
        ) : (
          <EmptyState
            title="No open slots"
            body={`${provider?.business_name} hasn't published any times you can book right now.`}
            action={<ButtonLink to={`/app/lab-orders/${id}/labs`}>Try another</ButtonLink>}
          />
        )}

        <section>
          <h2 className="mb-2 font-heading text-h3">Payment status</h2>
          <Card>
            <p className="measure text-body-sm text-base-content/75">
              Your payment is collected once at secure checkout. We never ask you to send money
              separately to {provider?.business_name}.
            </p>
            <dl className="mt-3 divide-y divide-base-300 border-t border-base-300 pt-2">
              {request.amount_kobo ? (
                <>
                  <DataRow label="Lab price" value={naira(request.amount_kobo)} />
                  <DataRow label="Service fee" value={naira(serviceFee)} />
                  <DataRow
                    label={checkout?.status === "PAID" ? "Total paid" : "Total"}
                    value={naira(total)}
                  />
                </>
              ) : null}
              <DataRow
                label="Checkout"
                value={checkout ? checkout.status : "Choose a slot to pay"}
                mono={false}
              />
            </dl>
            {checkout?.status === "PENDING" ? (
              <p className="measure mt-4 text-body-sm text-base-content/75" role="status">
                We are waiting for payment confirmation. Your order will update when it arrives.
              </p>
            ) : checkout?.status === "FAILED" ? (
              <Button
                full
                className="mt-4"
                onClick={() => {
                  update((draft) => {
                    draft.checkoutPayments = draft.checkoutPayments.map((payment) =>
                      payment.id === checkout.id
                        ? { ...payment, status: "PENDING" as const }
                        : payment,
                    );
                  });
                  toast("Checkout retry started.");
                }}
              >
                Retry checkout
              </Button>
            ) : null}
          </Card>
          {payout?.status === "PAID" ? (
            <Banner tone="success" className="mt-3">
              The lab payout has settled.
            </Banner>
          ) : null}
          {payout?.status === "PROCESSING" ? (
            <Banner tone="info" className="mt-3">
              Your booking is confirmed. The lab payout is processing asynchronously.
            </Banner>
          ) : null}
          {request.status === "ACCEPTED" && request.result_status !== "UPLOADED" ? (
            <Button
              variant="secondary"
              full
              className="mt-3"
              onClick={() => {
                update((draft) =>
                  closeProviderRequest(
                    draft,
                    request.id,
                    "CANCELLED",
                    checkout?.status === "PAID"
                      ? "Cancelled by patient. Refund pending."
                      : "Cancelled by patient before payment.",
                  ),
                );
                toast(
                  checkout?.status === "PAID"
                    ? "Cancellation recorded. Refund pending."
                    : "Lab booking cancelled and capacity released.",
                );
              }}
            >
              {checkout?.status === "PAID" ? "Cancel and request refund" : "Cancel booking"}
            </Button>
          ) : null}
        </section>
      </div>
    </MobileScreen>
  );
}

/** P47e — Lab Result. */
export function LabResult() {
  const { id } = useParams();
  const { data, session, toast } = usePrototype();
  const { lab, consultation } = useLab(id);
  const request = lab
    ? providerRequestForActivePatient(data, session.viewingPatientId, { labOrderId: id })
    : undefined;
  const [view, setView] = useState<"live" | "awaiting" | "physical">("live");

  if (!lab) {
    return (
      <MobileScreen title="Result" back="/app" patientContext>
        <EmptyState title="Lab order not found" body="" />
      </MobileScreen>
    );
  }

  const provider = request ? providerById(data, request.provider_id) : undefined;
  const available = view === "live" ? lab.result_status === "ATTACHED" : false;
  const liveResultStatus = request?.result_status;

  return (
    <MobileScreen title="Your result" back={`/app/lab-orders/${lab.id}`} tabs="none" patientContext>
      <div data-screen="P47e" className="space-y-4">
        <ScreenStates
          states={[
            { value: "live", label: "Live" },
            { value: "awaiting", label: "Awaiting upload" },
            { value: "physical", label: "Physical copy only" },
          ]}
          value={view}
          onChange={setView}
        />

        {available ? (
          <>
            <Card className="border-l-[3px] border-l-success">
              <Badge tone="success" icon={Check}>
                Result in
              </Badge>
              <p className="mt-2.5 font-heading text-h3">{lab.test_requested}</p>
              <p className="measure mt-2 text-body">{lab.result_summary}</p>
              <dl className="mt-3 divide-y divide-base-300 border-t border-base-300 pt-2">
                <DataRow
                  label="Reported"
                  value={lab.result_at ? formatDateTime(lab.result_at) : "Date not recorded"}
                />
                {lab.result_file_name ? (
                  <DataRow label="File" value={lab.result_file_name} />
                ) : null}
                <DataRow
                  label="Source"
                  value={lab.result_source ?? "Source not recorded"}
                  mono={false}
                />
                {lab.result_corrected_at ? (
                  <DataRow label="Corrected" value={formatDateTime(lab.result_corrected_at)} />
                ) : null}
              </dl>
            </Card>
            {/* This sentence is the whole product. Ahmed took leave purely to
                collect a result, and Cherish asked for exactly this: "I wish
                they can just post the result to my care and the gyne can
                continue." It used to render as muted helper text below the
                download card, which put a PDF download above the reason the PDF
                does not need collecting. It leads now. */}
            <Card className="border-l-[3px] border-l-secondary">
              <p className="measure text-body">
                This is already on your record, so{" "}
                {consultation ? expertName(data, consultation.expert_id) : "the ordering expert"}{" "}
                can see it without you sending anything.
              </p>
            </Card>
            {lab.result_file_name ? (
              <DocumentCard
                title="Result attachment"
                issuedAt={lab.result_file_name}
                downloadLabel="File demo"
                onDownload={() =>
                  toast(
                    "Prototype simulation: only the filename is retained. No file was downloaded.",
                  )
                }
              />
            ) : null}
          </>
        ) : view === "physical" ||
          (view === "live" && liveResultStatus === "PHYSICAL_COPY_ONLY") ? (
          <Card>
            <Badge tone="warning">Physical copy only</Badge>
            <p className="measure mt-2.5 text-body">
              This lab is giving you a printed copy rather than uploading it. Once you have it, add
              a photo here and it joins your record like any other result.
            </p>
            <ButtonLink to={`/app/lab-orders/${lab.id}/self-report`} full className="mt-3">
              <Upload aria-hidden className="size-4" strokeWidth={1.5} />
              Add the printed result
            </ButtonLink>
          </Card>
        ) : view === "live" && liveResultStatus === "INCORRECT_FILE" ? (
          <Card>
            <Badge tone="error">Incorrect file rejected</Badge>
            <p className="measure mt-2.5 text-body">
              The file did not match this order and was not added to your record. The lab must send
              a replacement before a result appears here.
            </p>
          </Card>
        ) : (
          <Card>
            <p className="font-heading text-h3">
              {liveResultStatus === "DELAYED"
                ? `${provider?.business_name ?? "Your lab"} reported a delay`
                : `${provider?.business_name ?? "Your lab"} is preparing your result`}
            </p>
            <p className="measure mt-1.5 text-body-sm text-base-content/70">
              It lands here on its own, nothing for you to photograph or upload. We'll let you know
              the moment it does.
            </p>
          </Card>
        )}
      </div>
    </MobileScreen>
  );
}
