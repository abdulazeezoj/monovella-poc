import { AlertTriangle, History, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { useMutationStates } from "~/components/shell/mutation-states";
import {
  Badge,
  Banner,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
} from "~/components/ui";
import { accountCanManagePatient, patientById } from "~/data/selectors";
import type { ClinicalSafetyAnswer } from "~/data/types";
import { now } from "~/lib/clock";
import { formatDateTime } from "~/lib/format";
import { usePrototype } from "~/store/prototype";

const answerLabel: Record<ClinicalSafetyAnswer, string> = {
  REPORTED: "Reported",
  NONE_KNOWN: "None known",
  NOT_SURE: "Not sure",
  DECLINED: "Prefer not to answer",
};

function isStale(confirmedAt: string) {
  return now().getTime() - new Date(confirmedAt).getTime() > 180 * 24 * 60 * 60 * 1000;
}

/** Patient/guardian supplied context only. It is not an interaction checker or diagnosis. */
export default function ClinicalSafetyContext() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "conflict", "forbidden"],
    "this safety context",
  );
  const { patientId = "" } = useParams();
  const { data, update, toast } = usePrototype();
  const patient = patientById(data, patientId);
  const authorized = !!patient && accountCanManagePatient(data, patient.id);
  const history = useMemo(
    () =>
      data.clinicalSafetyContexts
        .filter((item) => item.patient_id === patientId)
        .sort((a, b) => b.version - a.version),
    [data.clinicalSafetyContexts, patientId],
  );
  const current = history[0];
  const [editing, setEditing] = useState(!current);
  const [allergies, setAllergies] = useState<ClinicalSafetyAnswer>(
    current?.allergies_answer ?? "NOT_SURE",
  );
  const [substance, setSubstance] = useState(current?.reported_allergies[0]?.substance ?? "");
  const [reaction, setReaction] = useState(current?.reported_allergies[0]?.reaction ?? "");
  const [medicines, setMedicines] = useState<ClinicalSafetyAnswer>(
    current?.medicines_answer ?? "NOT_SURE",
  );
  const [medicineList, setMedicineList] = useState(current?.current_medicines.join(", ") ?? "");
  const [additional, setAdditional] = useState(current?.additional_context ?? "");
  const [reason, setReason] = useState("");

  if (!patient || !authorized) {
    return (
      <MobileScreen title="Medicines and reactions" back="/app/account" tabs="none" patientContext>
        <EmptyState
          title="Record unavailable"
          body="This patient is not available to this account."
        />
      </MobileScreen>
    );
  }

  const save = () => {
    if (allergies === "REPORTED" && (!substance.trim() || !reaction.trim())) return;
    if (medicines === "REPORTED" && !medicineList.trim()) return;
    if (current && !reason.trim()) return;
    const reportedAllergies =
      allergies === "REPORTED" ? [{ substance: substance.trim(), reaction: reaction.trim() }] : [];
    const currentMedicines =
      medicines === "REPORTED"
        ? medicineList
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];
    const unchanged =
      current &&
      current.allergies_answer === allergies &&
      JSON.stringify(current.reported_allergies) === JSON.stringify(reportedAllergies) &&
      current.medicines_answer === medicines &&
      JSON.stringify(current.current_medicines) === JSON.stringify(currentMedicines) &&
      current.additional_context === additional.trim();
    if (unchanged) {
      toast("Nothing changed. The current version remains active.");
      setEditing(false);
      return;
    }
    const version = (current?.version ?? 0) + 1;
    update((draft) => {
      if (!accountCanManagePatient(draft, patient.id)) return;
      const latest = draft.clinicalSafetyContexts
        .filter((item) => item.patient_id === patient.id)
        .sort((a, b) => b.version - a.version)[0];
      if ((latest?.version ?? 0) !== (current?.version ?? 0)) return;
      draft.clinicalSafetyContexts.push({
        id: `csc_${patient.id}_${version}`,
        patient_id: patient.id,
        version,
        source: patient.guardian_user_id ? "GUARDIAN" : "PATIENT",
        supplied_by_user_id: draft.user.id,
        allergies_answer: allergies,
        reported_allergies: reportedAllergies,
        medicines_answer: medicines,
        current_medicines: currentMedicines,
        additional_context: additional.trim(),
        confirmed_at: now().toISOString().slice(0, 19),
        supersedes_id: current?.id ?? null,
        correction_reason: current ? reason.trim() : null,
      });
    });
    toast(`Version ${version} saved to ${patient.first_name}'s record.`);
    setEditing(false);
    setReason("");
  };

  return (
    <MobileScreen title="Medicines and reactions" back="/app/account" tabs="none" patientContext>
      <div data-screen="P70" className="space-y-4">
        {mutation.node}
        <Banner tone="warning">
          <strong>Assumed minimum, pending qualified clinical governance.</strong> This is what you
          or a guardian reported. Monovella does not infer allergies, check interactions, or decide
          whether a medicine is suitable.
        </Banner>
        {current && !editing ? (
          <>
            {isStale(current.confirmed_at) ? (
              <Banner tone="warning">
                <AlertTriangle aria-hidden className="size-4" /> This was last confirmed more than
                six months ago. Review it before the next consultation.
              </Banner>
            ) : null}
            <Card className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-h3">Current version</p>
                  <p className="text-body-sm text-base-content/60">
                    {current.source === "GUARDIAN" ? "Guardian supplied" : "Patient supplied"} ·{" "}
                    {formatDateTime(current.confirmed_at)}
                  </p>
                </div>
                <Badge tone="info">Version {current.version}</Badge>
              </div>
              <div>
                <p className="text-label">Allergies or reactions</p>
                <p>{answerLabel[current.allergies_answer]}</p>
                {current.reported_allergies.map((item) => (
                  <p
                    key={`${item.substance}-${item.reaction}`}
                    className="text-body-sm text-base-content/70"
                  >
                    {item.substance}: {item.reaction}
                  </p>
                ))}
              </div>
              <div>
                <p className="text-label">Current medicines</p>
                <p>{answerLabel[current.medicines_answer]}</p>
                {current.current_medicines.length ? (
                  <p className="text-body-sm text-base-content/70">
                    {current.current_medicines.join(", ")}
                  </p>
                ) : null}
              </div>
              {current.additional_context ? (
                <p className="text-body-sm">{current.additional_context}</p>
              ) : null}
              <Button
                variant="secondary"
                full
                disabled={mutation.blocked}
                onClick={() => setEditing(true)}
              >
                Review or amend
              </Button>
            </Card>
          </>
        ) : (
          <Card className="space-y-3">
            <p className="font-heading text-h3">
              {current ? "Create a new version" : "Confirm the current context"}
            </p>
            <Field label="Allergies or medicine reactions">
              {(props) => (
                <Select
                  {...props}
                  value={allergies}
                  onChange={(event) => setAllergies(event.target.value as ClinicalSafetyAnswer)}
                >
                  <option value="REPORTED">I have something to report</option>
                  <option value="NONE_KNOWN">None known</option>
                  <option value="NOT_SURE">Not sure</option>
                  <option value="DECLINED">Prefer not to answer</option>
                </Select>
              )}
            </Field>
            {allergies === "REPORTED" ? (
              <div className="grid gap-3">
                <Field label="Medicine or substance">
                  {(props) => (
                    <Input
                      {...props}
                      value={substance}
                      onChange={(event) => setSubstance(event.target.value)}
                    />
                  )}
                </Field>
                <Field label="What reaction happened?">
                  {(props) => (
                    <Input
                      {...props}
                      value={reaction}
                      onChange={(event) => setReaction(event.target.value)}
                    />
                  )}
                </Field>
              </div>
            ) : null}
            <Field label="Current medicines">
              {(props) => (
                <Select
                  {...props}
                  value={medicines}
                  onChange={(event) => setMedicines(event.target.value as ClinicalSafetyAnswer)}
                >
                  <option value="REPORTED">I take medicines</option>
                  <option value="NONE_KNOWN">None known</option>
                  <option value="NOT_SURE">Not sure</option>
                  <option value="DECLINED">Prefer not to answer</option>
                </Select>
              )}
            </Field>
            {medicines === "REPORTED" ? (
              <Field label="Medicines, separated by commas">
                {(props) => (
                  <Textarea
                    {...props}
                    value={medicineList}
                    onChange={(event) => setMedicineList(event.target.value)}
                  />
                )}
              </Field>
            ) : null}
            <Field label="Anything else the expert should know?" hint="Optional">
              {(props) => (
                <Textarea
                  {...props}
                  value={additional}
                  onChange={(event) => setAdditional(event.target.value)}
                />
              )}
            </Field>
            {current ? (
              <Field label="Why are you changing this version?">
                {(props) => (
                  <Input
                    {...props}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                )}
              </Field>
            ) : null}
            <div className="flex gap-2">
              {current ? (
                <Button variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              ) : null}
              <Button
                full
                disabled={
                  mutation.blocked ||
                  (allergies === "REPORTED" && (!substance.trim() || !reaction.trim())) ||
                  (medicines === "REPORTED" && !medicineList.trim()) ||
                  (!!current && !reason.trim())
                }
                onClick={save}
              >
                Save version
              </Button>
            </div>
          </Card>
        )}
        {history.length > 1 ? (
          <Card>
            <div className="flex items-center gap-2">
              <History aria-hidden className="size-4 text-primary" />
              <p className="font-heading text-h3">Amendment history</p>
            </div>
            <ul className="mt-3 space-y-2">
              {history.slice(1).map((item) => (
                <li key={item.id} className="border-t border-base-300 pt-2 text-body-sm">
                  <span className="font-medium">Version {item.version}</span> ·{" "}
                  {formatDateTime(item.confirmed_at)}
                  {item.correction_reason ? ` · ${item.correction_reason}` : ""}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        <div className="flex items-start gap-2 text-body-sm text-base-content/60">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p>
            Only you, an authorised guardian, and the expert responsible for the consultation can
            review this context. It is not shared with fulfilment providers.
          </p>
        </div>
      </div>
    </MobileScreen>
  );
}
