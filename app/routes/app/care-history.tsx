import { ChevronDown, CloudOff, FileText, SearchX, Stethoscope } from "lucide-react";
import { useState } from "react";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { ScreenStates } from "~/components/shell/state-switcher";
import {
  Button,
  ButtonLink,
  ConsultationBadge,
  EmptyState,
  Field,
  InlineLoading,
  Input,
  ListGroup,
  ListRow,
  OfflineBanner,
  Select,
} from "~/components/ui";
import {
  accountCanManagePatient,
  consultationSpecialty,
  consultationsForPatient,
  expertName,
  labOrdersFor,
  prescriptionsFor,
} from "~/data/selectors";
import { consultationStatusLabel, formatDateTime, specialtyLabel } from "~/lib/format";
import { usePrototype } from "~/store/prototype";

/** P19a: the active patient's complete consultation index, including closed care. */
export default function CareHistory() {
  const { session } = usePrototype();
  return <PatientCareHistory key={session.viewingPatientId} />;
}

function PatientCareHistory() {
  const { data, session } = usePrototype();
  const [view, setView] = useState<
    "normal" | "empty" | "loading" | "failed" | "no_matches" | "unavailable"
  >("normal");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [limit, setLimit] = useState(20);
  const allowed = accountCanManagePatient(data, session.viewingPatientId);
  const consultations = allowed ? consultationsForPatient(data, session.viewingPatientId) : [];
  const needle = query.trim().toLocaleLowerCase();
  const matches =
    view === "no_matches"
      ? []
      : consultations.filter((consultation) => {
          if (status !== "all" && consultation.status !== status) return false;
          const searchable = [
            expertName(data, consultation.expert_id),
            specialtyLabel(consultationSpecialty(data, consultation)),
            ...prescriptionsFor(data, consultation.id).map((rx) => rx.medication),
            ...labOrdersFor(data, consultation.id).map((lab) => lab.test_requested),
          ];
          return searchable.some((text) => text.toLocaleLowerCase().includes(needle));
        });
  const empty = view === "empty" || consultations.length === 0;
  const resetFilters = () => {
    setView("normal");
    setQuery("");
    setStatus("all");
    setLimit(20);
  };

  return (
    <MobileScreen title="Care history" back="/app" patientContext>
      <div data-screen="P19a" className="space-y-4">
        <ScreenStates
          states={[
            { value: "normal", label: "Normal" },
            { value: "empty", label: "Empty" },
            { value: "loading", label: "Loading" },
            { value: "failed", label: "Load failed" },
            { value: "no_matches", label: "No matches" },
            { value: "unavailable", label: "Access unavailable" },
          ]}
          value={view}
          onChange={setView}
        />
        {session.offline ? (
          <OfflineBanner />
        ) : !allowed || view === "unavailable" ? (
          <EmptyState
            title="Care history unavailable"
            body="This patient record is not available to your account."
          />
        ) : view === "loading" ? (
          <InlineLoading label="Loading care history" />
        ) : view === "failed" ? (
          <EmptyState
            icon={CloudOff}
            tone="warning"
            title="Care history did not load"
            body="Your records have not changed. Try loading them again."
            action={<Button onClick={() => setView("normal")}>Try again</Button>}
          />
        ) : empty ? (
          <EmptyState
            icon={Stethoscope}
            title="No consultations yet"
            body="Your bookings and past consultations will appear here, with their prescriptions, tests and results."
            action={<ButtonLink to="/app/experts">Find specialist</ButtonLink>}
          />
        ) : (
          <>
            <p className="text-body-sm text-base-content/65">
              Open a consultation to see its notes, prescriptions, tests and payment details.
            </p>
            <Field label="Search care history">
              {(props) => (
                <Input
                  {...props}
                  type="search"
                  placeholder="Expert, specialty, medicine or test"
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setLimit(20);
                  }}
                />
              )}
            </Field>
            <Field label="Consultation status">
              {(props) => (
                <div className="relative">
                  <Select
                    {...props}
                    value={status}
                    onChange={(event) => {
                      setStatus(event.target.value);
                      setLimit(20);
                    }}
                  >
                    <option value="all">All consultations</option>
                    {Object.entries(consultationStatusLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-base-content/60"
                  />
                </div>
              )}
            </Field>
            {!matches.length ? (
              <EmptyState
                icon={SearchX}
                title="No matching consultations"
                body="Try another name, medicine or test, or clear the filters to see all your care."
                action={
                  <Button variant="secondary" onClick={resetFilters}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <ListGroup label="Consultations">
                {matches.slice(0, limit).map((consultation) => {
                  const rx = prescriptionsFor(data, consultation.id);
                  const labs = labOrdersFor(data, consultation.id);
                  return (
                    <ListRow
                      key={consultation.id}
                      to={`/app/consultations/${consultation.id}`}
                      title={
                        <span className="flex flex-wrap items-center justify-between gap-2">
                          <span>{expertName(data, consultation.expert_id)}</span>
                          <ConsultationBadge status={consultation.status} />
                        </span>
                      }
                      meta={
                        <div className="space-y-1">
                          <p>{specialtyLabel(consultationSpecialty(data, consultation))}</p>
                          <p>
                            {formatDateTime(
                              consultation.scheduled_start ?? consultation.requested_at,
                            )}
                          </p>
                          {rx.length || labs.length ? (
                            <p className="flex items-center gap-1.5">
                              <FileText aria-hidden className="size-3.5 shrink-0" />
                              {[
                                rx.length
                                  ? `${rx.length} prescription${rx.length === 1 ? "" : "s"}`
                                  : "",
                                labs.length
                                  ? `${labs.length} test order${labs.length === 1 ? "" : "s"}`
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </div>
                      }
                    />
                  );
                })}
              </ListGroup>
            )}
            {matches.length > limit ? (
              <Button variant="secondary" full onClick={() => setLimit((value) => value + 20)}>
                Show more consultations
              </Button>
            ) : null}
            <ButtonLink to="/app/reports" variant="ghost" full>
              Export a report
            </ButtonLink>
          </>
        )}
      </div>
    </MobileScreen>
  );
}
