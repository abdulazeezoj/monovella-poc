import {
  ArrowRight,
  Award,
  Bell,
  CalendarDays,
  ClipboardList,
  CloudOff,
  FileText,
  Fingerprint,
  KeyRound,
  Landmark,
  LifeBuoy,
  LoaderCircle,
  LogOut,
  Mail,
  Plus,
  Settings,
  Share2,
  Smartphone,
  Trash2,
  User,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { ContextSwitcher, MobileScreen } from "~/components/shell/mobile-shell";
import { useMutationStates } from "~/components/shell/mutation-states";
import { ScreenStates } from "~/components/shell/state-switcher";
import {
  Badge,
  Banner,
  Button,
  ButtonLink,
  Card,
  ConsultationBadge,
  CredentialBanner,
  EmptyState,
  Field,
  FileDrop,
  Input,
  ListGroup,
  ListRow,
  Modal,
  NumberStepper,
  SearchablePicker,
  SegmentedControl,
  Select,
  Sheet,
  StandingBanner,
} from "~/components/ui";
import { reference } from "~/data";
import { FIXTURE_IDS } from "~/data/identities.generated";
import { reprojectExpertAvailability, weeklyTimeConflict } from "~/data/schedule-projection";
import {
  availabilityFor,
  consultationsForExpert,
  EXPERT_ID,
  expertById,
  expertName,
  guestExaminationsFor,
  patientName,
  payoutDetailsFor,
  scheduleFor,
  schedulingRulesFor,
} from "~/data/selectors";
import type {
  AvailabilityStatus,
  ExpertCredential,
  ScheduleExceptionKind,
  Specialty,
} from "~/data/types";
import { now } from "~/lib/clock";
import {
  canAddFellowship,
  specialtyClaimTier,
  specialtyMatchesProfession,
} from "~/lib/expert-credentials";
import {
  availabilityLabel,
  credentialTierLabel,
  DAY_NAMES,
  formatDateLong,
  formatSlotLabel,
  formatTime,
  naira,
  specialtyLabel,
} from "~/lib/format";
import { submitExpertGovernance } from "~/lib/governance-lifecycle";
import { useExpertSeat, usePrototype, useTick } from "~/store/prototype";

const EXPIRING_SOON_DATE_LABEL = "12 October 2026";
const EXPIRED_DATE_LABEL = "3 August 2026";

const bookableCredential = (credential: ExpertCredential) =>
  credential.verification_status === "VERIFIED" && !credential.retired_at;

type X4DemoState =
  | "normal"
  | "loading"
  | "failed"
  | "no_payout"
  | "suspended"
  | "expiring_soon"
  | "expired"
  | "seat_physiotherapist"
  | "seat_nurse"
  | "seat_pharmacist"
  | "seat_lab_scientist";

/**
 * The reviewer seats, one per professional type in the directory. Scope of
 * practice differs between them and prescribing is Doctor-only, so a reviewer
 * who can only ever be the Doctor cannot check that the narrower seats really
 * are narrower. Labelled assumed / advisor-informed until professional scope,
 * verification and clinical governance are validated.
 */
const REVIEWER_SEATS: Record<string, string> = {
  normal: EXPERT_ID,
  no_payout: EXPERT_ID,
  suspended: EXPERT_ID,
  expiring_soon: EXPERT_ID,
  expired: EXPERT_ID,
  seat_physiotherapist: FIXTURE_IDS.exp_nwosu,
  seat_nurse: FIXTURE_IDS.exp_etim,
  seat_pharmacist: FIXTURE_IDS.exp_adisa,
  seat_lab_scientist: FIXTURE_IDS.exp_garba,
};
type ScheduleExceptionMode = "CLOSED" | "UNAVAILABLE" | "EXTRA_HOURS";

function scheduleExceptionMode(kind: ScheduleExceptionKind, startTime: string | null) {
  if (kind === "EXTRA_HOURS") return "EXTRA_HOURS" as const;
  return startTime == null ? ("CLOSED" as const) : ("UNAVAILABLE" as const);
}

function scheduleExceptionLabel(mode: ScheduleExceptionMode) {
  if (mode === "EXTRA_HOURS") return "Extra hours";
  return mode === "CLOSED" ? "Closed all day" : "Unavailable for part of the day";
}

/** X4 — Expert Home. The availability switch is this screen's signature control. */
export default function ExpertHome() {
  const expertId = useExpertSeat();
  useTick();
  const { data, session, setSession, update, toast } = usePrototype();
  const expert = expertById(data, expertId)!;
  const rawStatus = data.expertAvailabilityStatus[expertId] ?? expert.availability_status;
  const [demoState, setDemoState] = useState<X4DemoState>("normal");
  const [expiryBannerDismissed, setExpiryBannerDismissed] = useState(false);
  const payout = payoutDetailsFor(data, expertId);
  const payoutSet =
    demoState !== "no_payout" &&
    Boolean(
      payout?.payout_bank_account_number && payout.payout_bank_code && payout.payout_verified_at,
    );
  const credentialExpired = demoState === "expired";
  const blockedOnline = !payoutSet || session.standingSuspended || credentialExpired;
  // A standing suspension, an expired licence, or no payout method pauses
  // going Online without discarding the expert's actual choice — reversible
  // the moment the restriction lifts, never overwritten in the data. Also
  // keeps the control from asserting "Online" while a banner right above it
  // says going Online is blocked.
  const status = blockedOnline && rawStatus === "ONLINE" ? "AWAY" : rawStatus;

  const cases = consultationsForExpert(data, expertId);
  const requests = cases.filter((c) => c.status === "REQUESTED");
  const active = cases.filter((c) => c.status === "ACTIVE");
  const scheduled = cases.filter((c) => c.status === "SCHEDULED");
  const guestRequests = guestExaminationsFor(data, expertId).filter(
    (c) => c.guest_examination_status === "REQUESTED",
  );

  const setStatus = (next: AvailabilityStatus) => {
    update((d) => {
      d.expertAvailabilityStatus = { ...d.expertAvailabilityStatus, [expertId]: next };
    });
    toast(`You're now ${availabilityLabel[next]}.`);
  };

  const explainBlockedOnline = () =>
    toast(
      !payoutSet
        ? "Add a payout method before going Online."
        : session.standingSuspended
          ? "Standing suspended, you can't go Online right now."
          : "Licence expired, renew it before going Online.",
    );

  return (
    <MobileScreen tabs="expert" contentPlacement="fill">
      <div
        data-screen="X4"
        className={
          demoState === "loading" || demoState === "failed"
            ? "flex flex-1 flex-col gap-4"
            : "space-y-4"
        }
      >
        <ScreenStates
          states={[
            { value: "normal", label: "Normal" },
            { value: "loading", label: "Loading" },
            { value: "failed", label: "Load failed" },
            { value: "no_payout", label: "No payout method" },
            { value: "suspended", label: "Standing suspended" },
            { value: "expiring_soon", label: "Licence expiring soon" },
            { value: "expired", label: "Licence expired" },
            { value: "seat_physiotherapist", label: "Seat: Physiotherapist" },
            { value: "seat_nurse", label: "Seat: Nurse" },
            { value: "seat_pharmacist", label: "Seat: Pharmacist" },
            { value: "seat_lab_scientist", label: "Seat: Lab Scientist" },
          ]}
          value={session.standingSuspended ? "suspended" : demoState}
          onChange={(v) => {
            setDemoState(v);
            setSession({
              standingSuspended: v === "suspended",
              expertId: REVIEWER_SEATS[v] ?? EXPERT_ID,
            });
          }}
        />
        {/* Utilities first, the person second — the same order as the patient
            Home. Four controls beside a full professional name left nothing for
            the name on a narrow phone. */}
        <div className="flex items-center justify-between gap-2">
          <ContextSwitcher />
          <div className="flex shrink-0 items-center">
            <Link
              to="/app/expert/notifications"
              aria-label="Notifications"
              className="flex size-11 shrink-0 items-center justify-center rounded-brand text-base-content/60 hover:bg-base-200"
            >
              <Bell aria-hidden className="size-5" strokeWidth={1.5} />
            </Link>
            <Link
              to="/app/expert/support"
              aria-label="Help and support"
              className="flex size-11 shrink-0 items-center justify-center rounded-brand text-base-content/60 hover:bg-base-200"
            >
              <LifeBuoy aria-hidden className="size-5" strokeWidth={1.5} />
            </Link>
            <Link
              to="/app/expert/account"
              aria-label="Account"
              className="flex size-11 shrink-0 items-center justify-center rounded-brand text-base-content/60 hover:bg-base-200"
            >
              <Settings aria-hidden className="size-5" strokeWidth={1.5} />
            </Link>
          </div>
        </div>
        <div>
          <p className="text-body-sm text-base-content/60">Practising as</p>
          <h1 className="font-heading text-h1 wrap-anywhere">{expertName(data, expertId)}</h1>
          <p className="text-body-sm text-base-content/60">{specialtyLabel(expert.specialty)}</p>
        </div>

        {session.standingSuspended ? <StandingBanner audience="expert" /> : null}
        {credentialExpired ? (
          <CredentialBanner
            status="EXPIRED"
            expiryDate={EXPIRED_DATE_LABEL}
            renewTo="/app/expert/renew-licence"
          />
        ) : demoState === "expiring_soon" && !expiryBannerDismissed ? (
          <CredentialBanner
            status="EXPIRING_SOON"
            expiryDate={EXPIRING_SOON_DATE_LABEL}
            renewTo="/app/expert/renew-licence"
            onDismiss={() => setExpiryBannerDismissed(true)}
          />
        ) : null}
        {!payoutSet ? (
          <Banner
            tone="warning"
            action={
              <ButtonLink size="sm" variant="secondary" to="/app/expert/payout">
                Add it
              </ButtonLink>
            }
          >
            Add and verify a bank account before going Online. Monovella needs a safe destination
            for your automated payouts.
          </Banner>
        ) : null}

        {/* X5, inline: the one decision an independent practitioner makes all day. */}
        {/* A practice home reads a caseload, a payout status and a schedule
            before it can show any of them, so it has a load and a failure of
            its own. Only the domain states were declared here, which left the
            two a working expert is most likely to hit unreviewable. */}
        {demoState === "loading" ? (
          <EmptyState
            screen
            icon={LoaderCircle}
            spin
            title="One moment"
            body="Pulling your practice together."
          />
        ) : null}
        {demoState === "failed" ? (
          <EmptyState
            screen
            icon={CloudOff}
            tone="warning"
            title="That did not load"
            body="Not your fault, and nothing has changed. Give it another go."
            action={
              <Button variant="secondary" onClick={() => setDemoState("normal")}>
                Try again
              </Button>
            }
          />
        ) : null}

        {demoState !== "loading" && demoState !== "failed" ? (
          <>
            <Card>
              <p className="mb-2 text-label font-medium">You're</p>
              <SegmentedControl
                label="Availability"
                value={status}
                onChange={setStatus}
                onBlockedChange={explainBlockedOnline}
                options={[
                  { value: "ONLINE", label: "Online", tone: "success", disabled: blockedOnline },
                  { value: "AWAY", label: "Away", tone: "warning" },
                  { value: "OUT_OF_OFFICE", label: "Out of office", tone: "error" },
                ]}
              />
              <p className="measure mt-2 text-body-sm text-base-content/60">
                Online and Away tell patients how quickly you're likely to reply. Out of Office
                pauses new bookings without changing any appointment already confirmed.
              </p>
            </Card>

            {requests.length ? (
              <Link
                to="/app/expert/requests"
                className="block rounded-brand-lg border-2 border-primary/35 bg-primary-tint p-5 transition-colors hover:border-primary/60"
              >
                <p className="font-mono text-[2rem] leading-none tabular">{requests.length}</p>
                <p className="mt-2 font-heading text-h3">
                  {requests.length === 1 ? "case waiting" : "cases waiting on you"}
                </p>
                <p className="measure mt-1 text-body-sm text-base-content/70">
                  Each has its own response window. Declining is normal practice management, only
                  silence carries a consequence.
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 text-label text-primary">
                  Review them
                  <ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />
                </p>
              </Link>
            ) : (
              <Card>
                <p className="font-heading text-h3">No pending requests right now</p>
                <p className="measure mt-1 text-body-sm text-base-content/70">
                  New requests land here with a countdown to your response deadline.
                </p>
              </Card>
            )}

            {guestRequests.length ? (
              <Link
                to="/app/expert/guest-examinations"
                className="flex items-center justify-between gap-3 rounded-brand border border-secondary/35 bg-secondary/10 p-4 transition-colors hover:border-secondary/60"
              >
                <div>
                  <p className="font-heading text-h3">
                    {guestRequests.length === 1 ? "Guest request" : "Guest requests"}
                  </p>
                  <p className="text-body-sm text-base-content/65">
                    Another expert wants you to examine their patient in person.
                  </p>
                </div>
                <span className="font-mono text-h3 tabular text-secondary">
                  {guestRequests.length}
                </span>
              </Link>
            ) : null}

            {active.length ? (
              <ListGroup label="In progress">
                {active.map((c) => (
                  <ListRow
                    key={c.id}
                    to={`/app/expert/consultations/${c.id}`}
                    title={patientName(data, c.patient_identity_id)}
                    meta={`Started ${formatTime(c.scheduled_start)}`}
                    trailing={<ConsultationBadge status={c.status} />}
                  />
                ))}
              </ListGroup>
            ) : null}

            {scheduled.length ? (
              <ListGroup label="Booked">
                {scheduled.map((c) => (
                  <ListRow
                    key={c.id}
                    to={`/app/expert/consultations/${c.id}`}
                    title={patientName(data, c.patient_identity_id)}
                    meta={`${formatDateLong(c.scheduled_start)}, ${formatTime(c.scheduled_start)}`}
                  />
                ))}
              </ListGroup>
            ) : null}

            {expert.credentials.length > 1 ? (
              <Card>
                <p className="font-heading text-h3">Your credentials</p>
                <p className="measure mt-1 text-body-sm text-base-content/65">
                  Each has its own fee: a patient picks one before booking, so a general visit is
                  never charged at your specialist rate.
                </p>
                <ul className="mt-3 divide-y divide-base-300">
                  {expert.credentials.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div>
                        <p className="text-label font-medium">{credentialTierLabel[c.tier]}</p>
                        <p className="text-body-sm text-base-content/60">
                          {specialtyLabel(c.specialty)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-data tabular">
                          {naira(c.consultation_fee_kobo)}
                        </p>
                        {c.credential_status && c.credential_status !== "ACTIVE" ? (
                          <Badge tone="warning">
                            {c.credential_status === "EXPIRED" ? "Expired" : "Expiring soon"}
                          </Badge>
                        ) : (
                          <Badge tone="success">Verified</Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}

            <ListGroup label="Your practice">
              <ListRow
                to="/app/expert/invite-patients"
                leading={
                  <Share2 aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
                }
                title="Invite a patient"
                meta="Share a location-aware sign-up link"
              />
              {canAddFellowship(expert) ? (
                <ListRow
                  to="/app/expert/add-credential"
                  leading={
                    <Award aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
                  }
                  title="Add another credential"
                  meta="A Specialist or Super-Specialist tier"
                />
              ) : null}
              <ListRow
                to="/app/expert/schedule"
                leading={
                  <CalendarDays
                    aria-hidden
                    className="size-4 text-base-content/45"
                    strokeWidth={1.5}
                  />
                }
                title="Weekly schedule"
                meta="The hours patients book into"
              />
              <ListRow
                to="/app/expert/payout"
                leading={
                  <Landmark aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
                }
                title="Payout details"
                meta="Where your fees are sent"
              />
              <ListRow
                to="/app/expert/payout-history"
                leading={
                  <ClipboardList
                    aria-hidden
                    className="size-4 text-base-content/45"
                    strokeWidth={1.5}
                  />
                }
                title="Payout change history"
              />
              <ListRow
                to="/app/expert/application"
                leading={
                  <FileText aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
                }
                title="Verification status"
              />
            </ListGroup>
          </>
        ) : null}
      </div>
    </MobileScreen>
  );
}

/** X5 — Availability Control, as its own screen for the states it can be in. */
export function Availability() {
  const expertId = useExpertSeat();
  const { data, session, update, toast } = usePrototype();
  const [payoutDemoState, setPayoutDemoState] = useState<"ok" | "no_payout">("ok");
  const payout = payoutDetailsFor(data, expertId);
  const payoutSet =
    payoutDemoState === "ok" &&
    Boolean(
      payout?.payout_bank_account_number && payout.payout_bank_code && payout.payout_verified_at,
    );
  const rawStatus = data.expertAvailabilityStatus[expertId] ?? "ONLINE";
  const blocked = !payoutSet || session.standingSuspended;
  // Same non-destructive, reversible override as X4 — see its comment. Also
  // covers "no payout method": the control can't say Online while going
  // Online is blocked, or the screen ends up asserting both at once.
  const status = blocked && rawStatus === "ONLINE" ? "AWAY" : rawStatus;

  return (
    <MobileScreen title="Availability" back="/app/expert" tabs="expert">
      <div data-screen="X5" className="space-y-4">
        <ScreenStates
          states={[
            { value: "ok", label: "Normal" },
            { value: "no_payout", label: "400 no payout" },
          ]}
          value={payoutDemoState}
          onChange={(v) => setPayoutDemoState(v as "ok" | "no_payout")}
        />

        {session.standingSuspended ? <StandingBanner audience="expert" /> : null}
        {!payoutSet ? (
          <Banner
            tone="warning"
            action={
              <ButtonLink size="sm" variant="secondary" to="/app/expert/payout">
                Add it
              </ButtonLink>
            }
          >
            Add and verify your bank account first.
          </Banner>
        ) : null}

        <SegmentedControl
          label="Availability"
          value={status}
          onChange={(v) => {
            update((d) => {
              d.expertAvailabilityStatus = { ...d.expertAvailabilityStatus, [expertId]: v };
            });
            toast(`You're now ${availabilityLabel[v]}.`);
          }}
          onBlockedChange={() =>
            toast(
              !payoutSet
                ? "Add and verify a bank account before going Online."
                : "Standing suspended, you can't go Online right now.",
            )
          }
          options={[
            { value: "ONLINE", label: "Online", tone: "success", disabled: blocked },
            { value: "AWAY", label: "Away", tone: "warning" },
            { value: "OUT_OF_OFFICE", label: "Out of office", tone: "error" },
          ]}
        />

        <Card>
          <dl className="space-y-3 text-body-sm">
            <div>
              <dt className="font-medium">Online</dt>
              <dd className="text-base-content/70">You're at your device and replying quickly.</dd>
            </div>
            <div>
              <dt className="font-medium">Away</dt>
              <dd className="text-base-content/70">
                You'll get to it, just not immediately. Patients can still book your published
                hours.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Out of office</dt>
              <dd className="text-base-content/70">
                Not working. Existing bookings stand; remove the hours if you can't keep them.
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </MobileScreen>
  );
}

/** X6 — Payout account. The destination for automated marketplace settlement. */
export function PayoutDetails() {
  const expertId = useExpertSeat();
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation"],
    "your payout account",
  );
  const { data, update, toast, nextId } = usePrototype();
  const initial = payoutDetailsFor(data, expertId);
  const [bank, setBank] = useState<{ code: string; name: string } | null>(
    reference.banks.find((candidate) => candidate.code === initial?.payout_bank_code) ?? null,
  );
  const [account, setAccount] = useState(initial?.payout_bank_account_number ?? "");
  const [accountName, setAccountName] = useState(initial?.payout_account_name ?? "");
  const [lookupState, setLookupState] = useState<"idle" | "checking" | "verified" | "failed">(
    initial?.payout_verified_at ? "verified" : "idle",
  );
  const [picker, setPicker] = useState(false);
  const readyToCheck = Boolean(bank && account.length === 10);

  const resetLookup = (nextAccount: string) => {
    setAccount(nextAccount);
    setAccountName("");
    setLookupState("idle");
  };

  return (
    <MobileScreen title="Payout account" back="/app/expert" tabs="expert">
      <div data-screen="X6" className="space-y-4">
        {mutation.node}
        <p className="measure text-body text-base-content/75">
          Monovella collects the total through secure checkout, keeps its disclosed service fee,
          then sends your share to this verified Nigerian bank account.
        </p>

        <Card className="space-y-4">
          <Field label="Bank">
            {() => (
              <button
                type="button"
                disabled={lookupState === "checking"}
                onClick={() => {
                  setPicker(true);
                  setAccountName("");
                  setLookupState("idle");
                }}
                className="min-h-11 w-full rounded-brand border border-base-300 bg-base-200 px-3 text-left text-body disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bank ? bank.name : <span className="text-base-content/45">Choose your bank</span>}
              </button>
            )}
          </Field>
          <Field label="Account number">
            {(p) => (
              <Input
                {...p}
                numeric
                inputMode="numeric"
                maxLength={10}
                disabled={lookupState === "checking"}
                value={account}
                onChange={(e) => resetLookup(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            )}
          </Field>
          <Button
            variant="secondary"
            full
            disabled={!readyToCheck || lookupState === "checking"}
            onClick={() => {
              setLookupState("checking");
              window.setTimeout(() => {
                // The prototype models the server-side Nomba account lookup. The real
                // build never trusts a user-entered account name or exposes API credentials.
                if (account === "0000000000") {
                  setLookupState("failed");
                  return;
                }
                const expert = expertById(data, expertId);
                setAccountName(
                  expert ? `${expert.first_name} ${expert.last_name}` : "Demo recipient",
                );
                setLookupState("verified");
              }, 600);
            }}
          >
            {lookupState === "checking" ? "Checking account…" : "Verify account"}
          </Button>
        </Card>

        {lookupState === "verified" ? (
          <Banner tone="success">
            Recipient verified: <span className="font-medium">{accountName}</span>. Check this is
            the account your practice uses before saving.
          </Banner>
        ) : null}
        {lookupState === "failed" ? (
          <Banner tone="error">
            We couldn't verify that bank account. Check the bank and number.
          </Banner>
        ) : null}

        <Button
          full
          disabled={lookupState !== "verified" || !accountName || mutation.blocked}
          onClick={() => {
            const updatedAt = now().toISOString().slice(0, 19);
            update((draft) => {
              const previous = payoutDetailsFor(draft, expertId);
              const changed =
                previous?.payout_bank_account_number !== (account || null) ||
                previous?.payout_bank_code !== (bank?.code ?? null) ||
                previous?.payout_account_name !== accountName;
              if (!changed) return;
              if (previous) {
                draft.payoutHistory = [
                  {
                    id: nextId("ph"),
                    expert_id: expertId,
                    payout_bank_account_number: previous.payout_bank_account_number,
                    payout_bank_code: previous.payout_bank_code,
                    payout_account_name: previous.payout_account_name,
                    payout_verified_at: previous.payout_verified_at,
                    payout_ussd_string: previous.payout_ussd_string,
                    payout_payment_link: previous.payout_payment_link,
                    changed_at: updatedAt,
                  },
                  ...draft.payoutHistory,
                ];
              }
              const next = {
                expert_id: expertId,
                payout_bank_account_number: account || null,
                payout_bank_code: bank?.code ?? null,
                payout_account_name: accountName || null,
                payout_verified_at: updatedAt,
                payout_ussd_string: null,
                payout_payment_link: null,
                updated_at: updatedAt,
              };
              draft.expertPayoutDetails = [
                next,
                ...draft.expertPayoutDetails.filter((row) => row.expert_id !== expertId),
              ];
            });
            toast("Verified payout account saved.");
          }}
        >
          Save payout account
        </Button>

        <Sheet open={picker} onClose={() => setPicker(false)} title="Choose your bank">
          <SearchablePicker
            items={reference.banks}
            value={bank?.code}
            getKey={(b) => b.code}
            getLabel={(b) => b.name}
            getMeta={(b) => b.code}
            placeholder="Search Nigerian banks"
            onSelect={(b) => {
              setBank(b);
              setAccountName("");
              setLookupState("idle");
              setPicker(false);
            }}
          />
        </Sheet>
      </div>
    </MobileScreen>
  );
}

/** X7 / X7a / X7b — Weekly Schedule, and editing or removing one block. */
export function Schedule() {
  const expertId = useExpertSeat();
  // Publishing hours is a write: the reviewer can put it into each documented
  // failure and see that nothing is saved and no control lies about succeeding.
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "conflict", "forbidden"],
    "your availability",
  );
  const { data, update, toast, nextId } = usePrototype();
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [day, setDay] = useState("0");
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("13:00");
  const [timeError, setTimeError] = useState<string | null>(null);
  const [rulesEditing, setRulesEditing] = useState(false);
  const [duration, setDuration] = useState("45");
  const [buffer, setBuffer] = useState("15");
  const [notice, setNotice] = useState("120");
  const [dailyCap, setDailyCap] = useState("4");
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [exceptionAdding, setExceptionAdding] = useState(false);
  const [exceptionEditing, setExceptionEditing] = useState<string | null>(null);
  const [exceptionRemoving, setExceptionRemoving] = useState<string | null>(null);
  const [exceptionDate, setExceptionDate] = useState(now().toISOString().slice(0, 10));
  const [exceptionMode, setExceptionMode] = useState<ScheduleExceptionMode>("CLOSED");
  const [exceptionFrom, setExceptionFrom] = useState("09:00");
  const [exceptionTo, setExceptionTo] = useState("13:00");
  const [exceptionNote, setExceptionNote] = useState("");
  const [exceptionError, setExceptionError] = useState<string | null>(null);
  const slots = scheduleFor(data, expertId);
  const exceptions = data.expertScheduleExceptions
    .filter((exception) => exception.expert_id === expertId)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.start_time?.localeCompare(b.start_time ?? "") || 0,
    );
  const openTimes = availabilityFor(data, expertId);
  const bookedAppointments = slots.reduce(
    (total, current) => total + (current.booked_count ?? 0),
    0,
  );
  const nextOpenTime = openTimes[0];
  const slot = slots.find((s) => s.id === (editing ?? removing));
  const removedException = exceptions.find((exception) => exception.id === exceptionRemoving);
  const rules = schedulingRulesFor(data, expertId) ?? {
    expert_id: expertId,
    appointment_duration_minutes: 45,
    buffer_minutes: 15,
    minimum_notice_minutes: 120,
    max_bookings_per_day: 4,
  };

  const openEdit = (s: (typeof slots)[number]) => {
    setEditing(s.id);
    setDay(String(s.day_of_week));
    setFrom(s.start_time);
    setTo(s.end_time);
    setTimeError(null);
  };

  const openAdd = () => {
    setDay("0");
    setFrom("09:00");
    setTo("13:00");
    setTimeError(null);
    setAdding(true);
  };

  const openRules = () => {
    setDuration(String(rules.appointment_duration_minutes));
    setBuffer(String(rules.buffer_minutes));
    setNotice(String(rules.minimum_notice_minutes));
    setDailyCap(String(rules.max_bookings_per_day));
    setRulesError(null);
    setRulesEditing(true);
  };

  const resetExceptionForm = () => {
    setExceptionDate(now().toISOString().slice(0, 10));
    setExceptionMode("CLOSED");
    setExceptionFrom("09:00");
    setExceptionTo("13:00");
    setExceptionNote("");
    setExceptionError(null);
  };

  const openAddException = () => {
    resetExceptionForm();
    setExceptionAdding(true);
  };

  const openEditException = (exception: (typeof exceptions)[number]) => {
    setExceptionDate(exception.date);
    setExceptionMode(scheduleExceptionMode(exception.kind, exception.start_time));
    setExceptionFrom(exception.start_time ?? "09:00");
    setExceptionTo(exception.end_time ?? "13:00");
    setExceptionNote(exception.note);
    setExceptionError(null);
    setExceptionEditing(exception.id);
  };

  const validateException = (editingId: string | null) => {
    if (exceptionDate < now().toISOString().slice(0, 10)) {
      return "Choose today or a future date.";
    }
    if (exceptionMode !== "CLOSED" && exceptionTo <= exceptionFrom) {
      return "End time must be after start time.";
    }
    if (exceptionMode === "EXTRA_HOURS") {
      const selectedDate = new Date(`${exceptionDate}T00:00:00Z`);
      const productDay = (selectedDate.getUTCDay() + 6) % 7;
      const conflicts = [
        ...slots.filter((candidate) => candidate.day_of_week === productDay),
        ...exceptions.filter(
          (candidate) =>
            candidate.id !== editingId &&
            candidate.date === exceptionDate &&
            candidate.kind === "EXTRA_HOURS",
        ),
      ];
      if (
        conflicts.some(
          (candidate) =>
            candidate.start_time != null &&
            candidate.end_time != null &&
            candidate.start_time < exceptionTo &&
            exceptionFrom < candidate.end_time,
        )
      ) {
        return "Extra hours cannot overlap your published hours or another dated opening.";
      }
      if (
        exceptions.some(
          (candidate) =>
            candidate.id !== editingId &&
            candidate.date === exceptionDate &&
            candidate.kind === "UNAVAILABLE" &&
            (candidate.start_time == null ||
              (candidate.start_time < exceptionTo &&
                exceptionFrom < (candidate.end_time ?? "23:59"))),
        )
      ) {
        return "Extra hours overlap a dated closure. Edit or remove that closure first.";
      }
    }
    return null;
  };

  const exceptionFields = (id: string) => ({
    id,
    expert_id: expertId,
    date: exceptionDate,
    kind: (exceptionMode === "EXTRA_HOURS"
      ? "EXTRA_HOURS"
      : "UNAVAILABLE") as ScheduleExceptionKind,
    start_time: exceptionMode === "CLOSED" ? null : exceptionFrom,
    end_time: exceptionMode === "CLOSED" ? null : exceptionTo,
    note: exceptionNote.trim(),
  });

  return (
    <MobileScreen
      title="Availability plan"
      back="/app/expert"
      tabs="expert"
      action={
        <Button size="sm" disabled={mutation.blocked} onClick={openAdd}>
          <Plus aria-hidden className="size-4" strokeWidth={1.5} />
          Add hours
        </Button>
      }
    >
      <div data-screen="X7" className="space-y-4">
        {mutation.node}
        <p className="measure text-body-sm text-base-content/70">
          Publish recurring hours and the rules that turn them into dated consultation times.
          Patients only see the resulting open times. All times use Africa/Lagos.
        </p>

        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-heading text-h3">This fortnight</p>
            <p className="text-body-sm text-base-content/55">What patients can plan around</p>
          </div>
          <dl className="mt-3 grid grid-cols-3 divide-x divide-base-300 border-y border-base-300 py-2">
            <div className="min-w-0 pr-2">
              <dt className="text-label text-base-content/55">Open times</dt>
              <dd className="mt-1 font-mono text-data tabular">{openTimes.length}</dd>
            </div>
            <div className="min-w-0 px-2">
              <dt className="text-label text-base-content/55">Booked</dt>
              <dd className="mt-1 font-mono text-data tabular">{bookedAppointments}</dd>
            </div>
            <div className="min-w-0 pl-2">
              <dt className="text-label text-base-content/55">Next open</dt>
              <dd
                className="mt-1 truncate font-mono text-data tabular"
                title={nextOpenTime ? formatSlotLabel(nextOpenTime.start) : "No open time"}
              >
                {nextOpenTime ? formatSlotLabel(nextOpenTime.start) : "None"}
              </dd>
            </div>
          </dl>
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-heading text-h3">Dated changes</p>
              <p className="measure mt-1 text-body-sm text-base-content/65">
                Add leave, a closure, or extra hours without changing the weekly plan.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={openAddException}>
              Add change
            </Button>
          </div>
          <p className="measure mt-3 text-body-sm text-base-content/55">
            Patients only see your final open times. Booked appointments stay put.
          </p>
          {exceptions.length ? (
            <div className="mt-3 space-y-2 border-t border-base-300 pt-3">
              {exceptions.map((exception) => {
                const mode = scheduleExceptionMode(exception.kind, exception.start_time);
                return (
                  <div
                    key={exception.id}
                    className="flex min-h-12 items-center gap-3 rounded-brand border border-base-300 bg-base-200 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-body-sm">
                        {formatDateLong(`${exception.date}T00:00:00`)} ·{" "}
                        {scheduleExceptionLabel(mode)}
                      </p>
                      <p className="truncate text-body-sm text-base-content/60">
                        {exception.start_time
                          ? `${exception.start_time}-${exception.end_time}`
                          : "All day"}
                        {exception.note ? ` · ${exception.note}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openEditException(exception)}
                      aria-label={`Edit dated change for ${formatDateLong(`${exception.date}T00:00:00`)}`}
                    >
                      Edit
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : null}
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-heading text-h3">Booking rules</p>
              <p className="measure mt-1 text-body-sm text-base-content/65">
                {rules.appointment_duration_minutes}-minute visits · {rules.buffer_minutes}-minute
                buffer · at least {rules.minimum_notice_minutes / 60} hours' notice · up to{" "}
                {rules.max_bookings_per_day} new bookings a day.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={openRules}>
              Edit
            </Button>
          </div>
          <p className="measure mt-3 text-body-sm text-base-content/55">
            These are your operational choices, not a clinical recommendation. Changing them updates
            unbooked future times only; a booked consultation stays put.
          </p>
        </Card>

        {slots.length ? (
          <div className="space-y-2">
            {DAY_NAMES.map((day, index) => {
              const rows = slots.filter((s) => s.day_of_week === index);
              return (
                <div
                  key={day}
                  className="flex flex-col gap-2 rounded-brand border border-base-300 bg-base-200 px-3.5 py-3 @sm:flex-row @sm:gap-3"
                >
                  <p className="shrink-0 text-body-sm font-medium @sm:w-20">{day}</p>
                  <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                    {rows.length ? (
                      rows.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => openEdit(s)}
                          aria-label={`Edit ${day}, ${s.start_time} to ${s.end_time}${s.booked_count ? `, ${s.booked_count} booked` : ""}`}
                          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-base-300 bg-base-100 px-3 font-mono text-data tabular"
                        >
                          {s.start_time}-{s.end_time}
                          {s.booked_count ? (
                            <span className="rounded-full bg-primary-tint px-1.5 text-body-sm text-primary">
                              {s.booked_count} booked
                            </span>
                          ) : null}
                        </button>
                      ))
                    ) : (
                      <span className="self-center text-body-sm text-base-content/40">
                        Not working
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No hours published yet"
            body="Until you add hours, patients can find your profile but have nothing to book. Add the times you actually work."
            action={<Button onClick={() => setAdding(true)}>Add your first block</Button>}
          />
        )}

        {/* X7a — a lightweight sheet, never a full-screen hop for a time range. */}
        <Sheet
          open={!!editing}
          onClose={() => setEditing(null)}
          title="Edit this block"
          footer={
            <div className="flex gap-2">
              <Button
                variant="ghost"
                disabled={mutation.blocked || Boolean(slot?.booked_count)}
                onClick={() => {
                  if (slot?.booked_count) {
                    toast("Keep this block while it has booked appointments.");
                    return;
                  }
                  setRemoving(editing);
                  setEditing(null);
                }}
              >
                <Trash2 aria-hidden className="size-4" strokeWidth={1.5} />
                Remove
              </Button>
              <Button
                disabled={mutation.blocked}
                full
                onClick={() => {
                  if (to <= from) {
                    setTimeError("End time must be after start time.");
                    return;
                  }
                  const conflict = weeklyTimeConflict(slots, {
                    id: editing ?? "draft-schedule-slot",
                    day_of_week: Number(day),
                    start_time: from,
                    end_time: to,
                  });
                  if (conflict) {
                    setTimeError(
                      `This overlaps ${DAY_NAMES[conflict.day_of_week ?? 0]} ${conflict.start_time}-${conflict.end_time}. Choose a non-overlapping block so patients only see one time at once.`,
                    );
                    return;
                  }
                  update((d) => {
                    const target = d.expertSchedule.find((s) => s.id === editing);
                    if (target) {
                      target.day_of_week = Number(day);
                      target.start_time = from;
                      target.end_time = to;
                      target.capacity = 1;
                      reprojectExpertAvailability(d, expertId);
                    }
                  });
                  setEditing(null);
                  toast("Schedule updated.");
                }}
              >
                Save
              </Button>
            </div>
          }
        >
          {slot ? (
            <div className="space-y-4">
              {slot.booked_count ? (
                <Banner tone="warning">
                  {slot.booked_count} appointment{slot.booked_count === 1 ? " is" : "s are"} already
                  booked inside this block. Changing it won't cancel them, it only stops new
                  bookings.
                </Banner>
              ) : null}
              <Field label="Day">
                {(p) => (
                  <Select {...p} value={day} onChange={(e) => setDay(e.target.value)}>
                    {DAY_NAMES.map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From">
                  {(p) => (
                    <Input
                      {...p}
                      type="time"
                      numeric
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                    />
                  )}
                </Field>
                <Field label="To">
                  {(p) => (
                    <Input
                      {...p}
                      type="time"
                      numeric
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                    />
                  )}
                </Field>
              </div>
              <Card>
                <p className="text-label font-medium">Booking capacity</p>
                <p className="mt-1 text-body-sm text-base-content/70">
                  One appointment per time. Group consultations are not part of V0.
                </p>
              </Card>
              {slot.booked_count ? (
                <p className="text-body-sm text-base-content/60">
                  A block with booked appointments cannot be removed. Keep it until those
                  appointments have happened or are rescheduled.
                </p>
              ) : null}
              {timeError ? <p className="text-body-sm text-error">{timeError}</p> : null}
            </div>
          ) : null}
        </Sheet>

        {/* X7b — proportionate: this affects a public grid, not a health record. */}
        <Modal
          open={!!removing}
          onClose={() => setRemoving(null)}
          title={
            slot
              ? `Remove ${DAY_NAMES[slot.day_of_week]} ${slot.start_time} to ${slot.end_time}?`
              : "Remove this block?"
          }
          footer={
            <>
              <Button variant="secondary" onClick={() => setRemoving(null)}>
                Keep it
              </Button>
              <Button
                variant="destructive"
                disabled={mutation.blocked || Boolean(slot?.booked_count)}
                onClick={() => {
                  if (slot?.booked_count) return;
                  update((d) => {
                    d.expertSchedule = d.expertSchedule.filter((s) => s.id !== removing);
                    reprojectExpertAvailability(d, expertId);
                  });
                  setRemoving(null);
                  toast("Block removed.");
                }}
              >
                Remove
              </Button>
            </>
          }
        >
          {slot?.booked_count
            ? `${slot.booked_count} appointment${slot.booked_count === 1 ? "" : "s"} are booked here, so this block must stay until they are rescheduled or complete.`
            : "Patients will no longer see slots in this window."}
        </Modal>

        <Sheet
          open={adding}
          onClose={() => setAdding(false)}
          title="Add working hours"
          footer={
            <Button
              full
              onClick={() => {
                if (to <= from) {
                  setTimeError("End time must be after start time.");
                  return;
                }
                const conflict = weeklyTimeConflict(slots, {
                  id: "draft-schedule-slot",
                  day_of_week: Number(day),
                  start_time: from,
                  end_time: to,
                });
                if (conflict) {
                  setTimeError(
                    `This overlaps ${DAY_NAMES[conflict.day_of_week ?? 0]} ${conflict.start_time}-${conflict.end_time}. Choose a non-overlapping block so patients only see one time at once.`,
                  );
                  return;
                }
                update((d) => {
                  d.expertSchedule = [
                    ...d.expertSchedule,
                    {
                      id: nextId("sch"),
                      expert_id: expertId,
                      day_of_week: Number(day),
                      start_time: from,
                      end_time: to,
                      booked_count: 0,
                      capacity: 1,
                    },
                  ];
                  reprojectExpertAvailability(d, expertId);
                });
                setAdding(false);
                toast("Hours added.");
              }}
            >
              Add
            </Button>
          }
        >
          <div className="space-y-4">
            <Field label="Day">
              {(p) => (
                <Select {...p} value={day} onChange={(e) => setDay(e.target.value)}>
                  {DAY_NAMES.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                {(p) => (
                  <Input
                    {...p}
                    type="time"
                    numeric
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  />
                )}
              </Field>
              <Field label="To">
                {(p) => (
                  <Input
                    {...p}
                    type="time"
                    numeric
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                )}
              </Field>
            </div>
            <Card>
              <p className="text-label font-medium">Booking capacity</p>
              <p className="mt-1 text-body-sm text-base-content/70">
                One appointment per time. Group consultations are not part of V0.
              </p>
            </Card>
            {timeError ? <p className="text-body-sm text-error">{timeError}</p> : null}
          </div>
        </Sheet>

        <Sheet
          open={rulesEditing}
          onClose={() => setRulesEditing(false)}
          title="Booking rules"
          footer={
            <Button
              disabled={mutation.blocked}
              full
              onClick={() => {
                const nextDuration = Number(duration);
                const nextBuffer = Number(buffer);
                const nextNotice = Number(notice);
                const nextCap = Number(dailyCap);
                if (
                  !Number.isInteger(nextDuration) ||
                  !Number.isInteger(nextBuffer) ||
                  !Number.isInteger(nextNotice) ||
                  !Number.isInteger(nextCap) ||
                  nextCap < 1
                ) {
                  setRulesError("Choose valid booking rules.");
                  return;
                }
                update((d) => {
                  const ruleList = d.expertSchedulingRules ?? [];
                  const target = ruleList.find((candidate) => candidate.expert_id === expertId);
                  if (target) {
                    target.appointment_duration_minutes = nextDuration;
                    target.buffer_minutes = nextBuffer;
                    target.minimum_notice_minutes = nextNotice;
                    target.max_bookings_per_day = nextCap;
                  } else {
                    d.expertSchedulingRules = [
                      ...ruleList,
                      {
                        expert_id: expertId,
                        appointment_duration_minutes: nextDuration,
                        buffer_minutes: nextBuffer,
                        minimum_notice_minutes: nextNotice,
                        max_bookings_per_day: nextCap,
                      },
                    ];
                  }
                  reprojectExpertAvailability(d, expertId);
                });
                setRulesEditing(false);
                toast("Booking rules updated.");
              }}
            >
              Save rules
            </Button>
          }
        >
          <div className="space-y-4">
            <Field label="Visit length">
              {(p) => (
                <Select
                  {...p}
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </Select>
              )}
            </Field>
            <Field label="Buffer after each visit">
              {(p) => (
                <Select {...p} value={buffer} onChange={(event) => setBuffer(event.target.value)}>
                  <option value="0">No buffer</option>
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                </Select>
              )}
            </Field>
            <Field label="Minimum booking notice">
              {(p) => (
                <Select {...p} value={notice} onChange={(event) => setNotice(event.target.value)}>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="240">4 hours</option>
                  <option value="720">12 hours</option>
                  <option value="1440">24 hours</option>
                </Select>
              )}
            </Field>
            <Field label="Maximum new bookings each day">
              {(p) => (
                <Select
                  {...p}
                  value={dailyCap}
                  onChange={(event) => setDailyCap(event.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((value) => (
                    <option key={value} value={value}>
                      {value} {value === 1 ? "booking" : "bookings"}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Banner tone="info">
              Existing booked consultations are preserved. New rules only control new, future
              availability.
            </Banner>
            {rulesError ? <p className="text-body-sm text-error">{rulesError}</p> : null}
          </div>
        </Sheet>

        <Sheet
          open={exceptionAdding || !!exceptionEditing}
          onClose={() => {
            setExceptionAdding(false);
            setExceptionEditing(null);
          }}
          title={exceptionEditing ? "Edit dated change" : "Add dated change"}
          footer={
            <div className="flex gap-2">
              {exceptionEditing ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setExceptionRemoving(exceptionEditing);
                    setExceptionEditing(null);
                  }}
                >
                  <Trash2 aria-hidden className="size-4" strokeWidth={1.5} />
                  Remove
                </Button>
              ) : null}
              <Button
                disabled={mutation.blocked}
                full
                onClick={() => {
                  const validation = validateException(exceptionEditing);
                  if (validation) {
                    setExceptionError(validation);
                    return;
                  }
                  update((draft) => {
                    if (exceptionEditing) {
                      draft.expertScheduleExceptions = draft.expertScheduleExceptions.map(
                        (exception) =>
                          exception.id === exceptionEditing
                            ? exceptionFields(exception.id)
                            : exception,
                      );
                    } else {
                      draft.expertScheduleExceptions = [
                        ...draft.expertScheduleExceptions,
                        exceptionFields(nextId("exs")),
                      ];
                    }
                    reprojectExpertAvailability(draft, expertId);
                  });
                  const action = exceptionEditing ? "updated" : "added";
                  setExceptionAdding(false);
                  setExceptionEditing(null);
                  toast(`Dated change ${action}.`);
                }}
              >
                {exceptionEditing ? "Save change" : "Add change"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <Field label="Date">
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  numeric
                  value={exceptionDate}
                  onChange={(event) => setExceptionDate(event.target.value)}
                />
              )}
            </Field>
            <Field label="Change">
              {(p) => (
                <Select
                  {...p}
                  value={exceptionMode}
                  onChange={(event) =>
                    setExceptionMode(event.target.value as ScheduleExceptionMode)
                  }
                >
                  <option value="CLOSED">Unavailable all day</option>
                  <option value="UNAVAILABLE">Unavailable for part of the day</option>
                  <option value="EXTRA_HOURS">Open extra hours</option>
                </Select>
              )}
            </Field>
            {exceptionMode !== "CLOSED" ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="From">
                  {(p) => (
                    <Input
                      {...p}
                      type="time"
                      numeric
                      value={exceptionFrom}
                      onChange={(event) => setExceptionFrom(event.target.value)}
                    />
                  )}
                </Field>
                <Field label="To">
                  {(p) => (
                    <Input
                      {...p}
                      type="time"
                      numeric
                      value={exceptionTo}
                      onChange={(event) => setExceptionTo(event.target.value)}
                    />
                  )}
                </Field>
              </div>
            ) : null}
            <Field
              label="Reason"
              optional
              hint="For your schedule, for example leave or a clinic closure."
            >
              {(p) => (
                <Input
                  {...p}
                  value={exceptionNote}
                  onChange={(event) => setExceptionNote(event.target.value)}
                />
              )}
            </Field>
            <Banner tone="info">
              {exceptionMode === "EXTRA_HOURS"
                ? "Patients can book only the new, unbooked times inside this one-off window."
                : "Patients cannot choose newly unavailable times. Existing booked appointments stay on the calendar."}
            </Banner>
            {exceptionError ? <p className="text-body-sm text-error">{exceptionError}</p> : null}
          </div>
        </Sheet>

        <Modal
          open={!!exceptionRemoving}
          onClose={() => setExceptionRemoving(null)}
          title="Remove this dated change?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setExceptionRemoving(null)}>
                Keep it
              </Button>
              <Button
                disabled={mutation.blocked}
                variant="destructive"
                onClick={() => {
                  update((draft) => {
                    draft.expertScheduleExceptions = draft.expertScheduleExceptions.filter(
                      (exception) => exception.id !== exceptionRemoving,
                    );
                    reprojectExpertAvailability(draft, expertId);
                  });
                  setExceptionRemoving(null);
                  toast("Dated change removed.");
                }}
              >
                Remove
              </Button>
            </>
          }
        >
          {removedException
            ? `Patients can once again see new times from ${formatDateLong(`${removedException.date}T00:00:00`)} where your regular plan permits them.`
            : "Patients can once again see the affected new times."}
        </Modal>
      </div>
    </MobileScreen>
  );
}

/**
 * X1b — Credentials, specialties and fees. A specialty is a verified
 * professional claim, not a free-form directory tag: a changed specialty is
 * submitted as a new pending credential while the currently verified one stays
 * available. Retiring hides a credential from new bookings but keeps its audit
 * and consultation history intact.
 */
export function Credentials() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "conflict"],
    "your credentials and fees",
  );
  const expertId = useExpertSeat();
  const { data, update, toast, nextId } = usePrototype();
  const expert = expertById(data, expertId)!;
  const [editing, setEditing] = useState<ExpertCredential | null>(null);
  const [retiring, setRetiring] = useState<ExpertCredential | null>(null);
  const [requestingFor, setRequestingFor] = useState<ExpertCredential | null>(null);
  const [fee, setFee] = useState("");
  const [specialty, setSpecialty] = useState<Specialty | "">("");
  const [credentialNumber, setCredentialNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [proof, setProof] = useState<string | null>(null);
  const bookable = expert.credentials.filter(bookableCredential);
  const availableSpecialties = reference.specialties.filter(
    (item) =>
      specialtyMatchesProfession(expert.professional_type, item.value) &&
      !expert.credentials.some(
        (c) =>
          c.specialty === item.value &&
          !c.retired_at &&
          (c.verification_status === "VERIFIED" || c.verification_status === "PENDING"),
      ),
  );

  const saveFee = () => {
    if (!editing || !fee) return;
    const amount = Number(fee) * 100;
    if (!Number.isFinite(amount) || amount < 1) return;
    update((draft) => {
      const target = expertById(draft, expertId);
      const credential = target?.credentials.find((item) => item.id === editing.id);
      if (!target || !credential) return;
      credential.consultation_fee_kobo = amount;
      if (target.credentials[0]?.id === credential.id) target.consultation_fee_kobo = amount;
    });
    setEditing(null);
    toast("Fee updated. Existing bookings keep their original price.");
  };

  const submitSpecialtyRequest = () => {
    if (!requestingFor || !specialty || !credentialNumber || !fee || !proof || !expiryDate) return;
    const amount = Number(fee) * 100;
    if (!Number.isFinite(amount) || amount < 1) return;
    const applicationId = nextId("application");
    const credentialId = nextId("cred");
    update((draft) => {
      submitExpertGovernance(draft, {
        id: applicationId,
        kind: "ADDITIONAL_CREDENTIAL",
        expertId,
        targetCredentialId: requestingFor.id,
        credentialId,
        tier: specialtyClaimTier(expert.professional_type, specialty),
        specialty,
        licenceNumber: credentialNumber,
        documentFilename: proof,
        expiryDate,
        feeKobo: amount,
      });
    });
    setRequestingFor(null);
    setSpecialty("");
    setCredentialNumber("");
    setFee("");
    setProof(null);
    setExpiryDate("");
    toast("Specialty request submitted for review.");
  };

  return (
    <MobileScreen title="Credentials & fees" back="/app/expert/account" tabs="expert">
      <div data-screen="X1b" className="space-y-4">
        {mutation.node}
        <p className="measure text-body-sm text-base-content/70">
          Patients only book verified, active credentials. Update a fee when it changes; submit a
          specialty change for review instead of silently changing a verified claim.
        </p>

        <div className="space-y-3">
          {expert.credentials.map((credential) => {
            const active = bookableCredential(credential);
            const pending = credential.verification_status === "PENDING";
            const application = data.governanceApplications.find(
              (link) =>
                link.actor_id === expertId && link.submitted_credential_id === credential.id,
            );
            return (
              <Card key={credential.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-h3">{specialtyLabel(credential.specialty)}</p>
                    <p className="text-body-sm text-base-content/60">
                      {credentialTierLabel[credential.tier]} ·{" "}
                      {credential.retired_at
                        ? "Retired"
                        : active
                          ? "Bookable"
                          : pending
                            ? "Under review"
                            : credential.verification_status === "REJECTED"
                              ? "Not approved"
                              : "Not bookable"}
                    </p>
                  </div>
                  <p className="font-mono text-data tabular">
                    {naira(credential.consultation_fee_kobo)}
                  </p>
                </div>

                {application ? (
                  <ButtonLink
                    to={`/app/expert/application?id=${application.application_id}`}
                    variant="ghost"
                  >
                    View application
                  </ButtonLink>
                ) : null}
                {active ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditing(credential);
                        setFee(String(credential.consultation_fee_kobo / 100));
                      }}
                    >
                      Edit fee
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!availableSpecialties.length}
                      onClick={() => setRequestingFor(credential)}
                    >
                      Change specialty
                    </Button>
                  </div>
                ) : null}

                {active ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={bookable.length <= 1}
                    onClick={() => setRetiring(credential)}
                  >
                    Retire from new bookings
                  </Button>
                ) : null}
                {active && bookable.length <= 1 ? (
                  <p className="text-body-sm text-base-content/55">
                    Keep at least one verified credential available before retiring another.
                  </p>
                ) : null}
              </Card>
            );
          })}
        </div>

        <Button
          variant="secondary"
          full
          disabled={!bookable.length || !availableSpecialties.length}
          onClick={() => setRequestingFor(bookable[0] ?? null)}
        >
          Add a specialty for review
        </Button>
        {!availableSpecialties.length ? (
          <p className="text-body-sm text-base-content/70">
            Every specialty currently supported for your profession is already verified or awaiting
            review.
          </p>
        ) : null}

        <Sheet
          open={!!editing}
          onClose={() => setEditing(null)}
          title="Edit consultation fee"
          footer={
            <Button full onClick={saveFee}>
              Save fee
            </Button>
          }
        >
          {editing ? (
            <div className="space-y-4">
              <p className="measure text-body-sm text-base-content/70">
                This applies to new bookings only. Existing consultations keep the fee shown when
                the patient booked.
              </p>
              <Field label={`${specialtyLabel(editing.specialty)} fee (₦)`}>
                {(props) => (
                  <NumberStepper {...props} min={0} step={100} value={fee} onValueChange={setFee} />
                )}
              </Field>
            </div>
          ) : null}
        </Sheet>

        <Sheet
          open={!!requestingFor}
          onClose={() => setRequestingFor(null)}
          title={
            requestingFor ? `Change ${specialtyLabel(requestingFor.specialty)}` : "Add specialty"
          }
          footer={
            <Button
              full
              disabled={!specialty || !credentialNumber || !fee || !proof || !expiryDate}
              onClick={submitSpecialtyRequest}
            >
              Submit
            </Button>
          }
        >
          {requestingFor ? (
            <div className="space-y-4">
              <Banner tone="info">
                Your current verified specialty stays bookable while Monovella reviews this request.
              </Banner>
              <Field label="Specialty">
                {(props) => (
                  <Select
                    {...props}
                    value={specialty}
                    onChange={(event) => setSpecialty(event.target.value as Specialty)}
                  >
                    <option value="">Select</option>
                    {availableSpecialties.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label="Credential or fellowship number">
                {(props) => (
                  <Input
                    {...props}
                    className="font-mono"
                    value={credentialNumber}
                    onChange={(event) => setCredentialNumber(event.target.value)}
                  />
                )}
              </Field>
              <Field label="Consultation fee (₦)">
                {(props) => (
                  <NumberStepper {...props} min={0} step={100} value={fee} onValueChange={setFee} />
                )}
              </Field>
              <Field label="Credential expiry date">
                {(props) => (
                  <Input
                    {...props}
                    type="date"
                    value={expiryDate}
                    onChange={(event) => setExpiryDate(event.target.value)}
                  />
                )}
              </Field>
              <FileDrop
                label="Upload supporting credential"
                filename={proof}
                onFile={(chosen) => setProof(chosen.name)}
                onRemove={() => setProof(null)}
                pendingVerification={!!proof}
              />
            </div>
          ) : null}
        </Sheet>

        <Modal
          open={!!retiring}
          onClose={() => setRetiring(null)}
          title={`Retire ${retiring ? specialtyLabel(retiring.specialty) : "this specialty"}?`}
          footer={
            <>
              <Button variant="secondary" onClick={() => setRetiring(null)}>
                Keep bookable
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!retiring) return;
                  update((draft) => {
                    const target = expertById(draft, expertId);
                    const credential = target?.credentials.find((item) => item.id === retiring.id);
                    if (credential) credential.retired_at = now().toISOString().slice(0, 19);
                  });
                  setRetiring(null);
                  toast("Specialty retired from new bookings.");
                }}
              >
                Retire specialty
              </Button>
            </>
          }
        >
          Existing consultations and the verified credential record stay intact. Patients simply
          cannot choose this specialty for a new booking.
        </Modal>
      </div>
    </MobileScreen>
  );
}

/**
 * X4a — Account (Expert). The settings hub for Expert mode, equivalent to
 * P58 — reuses shared account-level screens (same account, same PIN, same
 * device sessions) rather than duplicating them under Expert mode.
 */
export function ExpertAccount() {
  const { data } = usePrototype();
  const expertId = useExpertSeat();
  const expert = expertById(data, expertId);
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation"],
    "your account details",
  );
  return (
    <MobileScreen title="Account" back="/app/expert" tabs="expert">
      <div data-screen="X4a" className="space-y-4">
        {mutation.node}
        <ListGroup label="Practice">
          <ListRow
            to="/app/account/personal"
            leading={<User aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />}
            title="Personal information"
            meta="Name, phone and photo"
          />
          <ListRow
            to="/app/expert/payout"
            leading={
              <Landmark aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Payout details"
            meta="Where your consultation fees go"
          />
          <ListRow
            to="/app/expert/schedule"
            leading={
              <CalendarDays aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Weekly schedule"
          />
          {canAddFellowship(expert) ? (
            <ListRow
              to="/app/expert/add-credential"
              leading={
                <Award aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
              }
              title="Add another credential"
            />
          ) : null}
          <ListRow
            to="/app/expert/credentials"
            leading={
              <Award aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Credentials, specialties & fees"
            meta="Manage what patients can book"
          />
        </ListGroup>

        <ListGroup label="Payments & notifications">
          <ListRow
            to="/app/account/notifications"
            leading={<Bell aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />}
            title="Notification preferences"
          />
        </ListGroup>

        <ListGroup label="Security">
          <ListRow
            to="/app/account/devices"
            leading={
              <Smartphone aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Where you're signed in"
          />
          <ListRow
            to="/app/account/change-pin"
            leading={
              <KeyRound aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Change PIN"
          />
          <ListRow
            to="/app/account/biometric"
            leading={
              <Fingerprint aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Biometric unlock"
          />
          <ListRow
            to="/app/account/two-factor"
            leading={
              <Fingerprint aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Two-step verification"
            meta="Authenticator code on sensitive sign-ins"
          />
          <ListRow
            to="/app/account/recovery-email"
            leading={<Mail aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />}
            title="Recovery email"
          />
        </ListGroup>

        <ListGroup>
          <ListRow
            to="/app/account/close"
            leading={<Trash2 aria-hidden className="size-4 text-error" strokeWidth={1.5} />}
            title={<span className="text-error">Close my account</span>}
          />
          <ListRow
            to="/app/welcome"
            leading={
              <LogOut aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Sign out"
          />
        </ListGroup>
      </div>
    </MobileScreen>
  );
}
