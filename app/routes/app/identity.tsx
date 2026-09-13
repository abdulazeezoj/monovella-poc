import { UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { LocationFields, type LocationValue } from "~/components/location-fields";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { useMutationStates } from "~/components/shell/mutation-states";
import { OnboardingProgress } from "~/components/shell/onboarding";
import { ScreenStates } from "~/components/shell/state-switcher";
import {
  Badge,
  Banner,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Input,
  ListGroup,
  ListRow,
  OtpInput,
  PatientIdBadge,
  RadioCard,
  Select,
} from "~/components/ui";
import { dependantsOf, patientById, selfPatient } from "~/data/selectors";
import type { Gender, GuardianReason } from "~/data/types";
import { createPrototypeAccount } from "~/lib/account-onboarding";
import { readAuthJourney } from "~/lib/auth-journey";
import { now } from "~/lib/clock";
import { CONSENT_VERSIONS, recordConsent } from "~/lib/consent-ledger";
import { addPrototypeDependant, confirmPrototypeDependant } from "~/lib/dependant-onboarding";
import { ageFrom, genderLabel, guardianReasonLabel } from "~/lib/format";
import { usePrototype } from "~/store/prototype";

const GENDERS: Gender[] = ["FEMALE", "MALE", "OTHER", "PREFER_NOT_TO_SAY"];

/** P12 — Create Patient Profile. */
export function CreateProfile() {
  const navigate = useNavigate();
  const { toast, data, update, setSession, nextId } = usePrototype();
  const [created, setCreated] = useState(false);
  useEffect(() => {
    if (!created || !data.accountPatientId || !data.accountExpertId) return;
    setSession({
      role: "patient",
      viewingPatientId: data.accountPatientId,
      expertId: data.accountExpertId,
    });
    navigate("/app/verify-id");
  }, [created, data.accountPatientId, data.accountExpertId, navigate, setSession]);
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const referralRegion = readAuthJourney().sign_up.referral_region;
  const suggestedState =
    referralRegion === "Abuja" ? "FCT" : referralRegion === "Lagos" ? "Lagos" : "";
  const [location, setLocation] = useState<LocationValue>({
    address: "",
    city: referralRegion === "Lagos" || referralRegion === "Abuja" ? referralRegion : "",
    localGovernmentArea: "",
    state: suggestedState,
  });
  const [variant, setVariant] = useState<
    "default" | "submitting" | "already_exists" | "validation"
  >("default");

  return (
    <MobileScreen title="A little about you" tabs="none" contentPlacement="center">
      <div data-screen="P12" className="mx-auto w-full max-w-128 space-y-5 py-6">
        <OnboardingProgress current={4} total={5} label="Create your patient record" />
        <ScreenStates
          states={[
            { value: "default", label: "Default" },
            { value: "submitting", label: "Submitting" },
            { value: "already_exists", label: "409 profile exists" },
            { value: "validation", label: "422 validation" },
          ]}
          value={variant}
          onChange={(value) => setVariant(value as typeof variant)}
        />
        <p className="measure text-body text-base-content/75">
          A few details, so an expert reading your record knows who they are reading about and care
          can be coordinated in the right place.
        </p>
        {suggestedState ? (
          <Banner tone="info">
            Your invite suggested {referralRegion} as a starting area. Confirm or change it below.
            It is not treated as your verified location.
          </Banner>
        ) : null}
        {variant === "already_exists" ? (
          <Banner tone="info">
            Your patient record is already set up. <Link to="/app">Go to home.</Link>
          </Banner>
        ) : null}
        <Field
          label="Date of birth"
          error={variant === "validation" ? "Enter your date of birth." : null}
        >
          {(p) => (
            <Input
              {...p}
              type="date"
              numeric
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          )}
        </Field>
        <Field
          label="Gender"
          error={variant === "validation" ? "Choose the option that fits you." : null}
        >
          {(p) => (
            <Select {...p} value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
              <option value="">Select</option>
              {GENDERS.map((g) => (
                <option key={g} value={g}>
                  {genderLabel[g]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <section className="space-y-4" aria-labelledby="patient-location-heading">
          <div>
            <h2 id="patient-location-heading" className="font-heading text-h3">
              Where you live
            </h2>
            <p className="mt-1 text-body-sm text-base-content/65">
              This stays in your private record.
            </p>
          </div>
          <LocationFields value={location} onChange={setLocation} />
        </section>
        <Button
          full
          disabled={
            created ||
            !dob ||
            !gender ||
            !location.address.trim() ||
            !location.city.trim() ||
            !location.localGovernmentArea ||
            !location.state ||
            variant === "submitting" ||
            variant === "already_exists"
          }
          onClick={() => {
            if (data.accountPatientId) {
              setVariant("already_exists");
              return;
            }
            const signup = readAuthJourney().sign_up;
            if (
              !signup.first_name ||
              !signup.last_name ||
              !signup.phone ||
              signup.step !== "COMPLETE"
            ) {
              toast("Start with your account details before creating a patient record.");
              navigate("/app/sign-up");
              return;
            }
            const userId = nextId("user"),
              patientId = nextId("patient"),
              expertId = nextId("expert");
            update((draft) => {
              const recorded = createPrototypeAccount(draft, {
                userId,
                patientId,
                expertId,
                firstName: signup.first_name,
                lastName: signup.last_name,
                phone: signup.phone,
                dateOfBirth: dob,
                gender: gender as Gender,
                address: location.address.trim(),
                city: location.city.trim(),
                localGovernmentArea: location.localGovernmentArea,
                state: location.state,
              });
              if (!recorded) return;
              for (const [purpose, version] of [
                ["GENERAL_TERMS", signup.terms_version],
                ["PRIVACY_NOTICE", signup.privacy_version],
              ] as const) {
                if (version)
                  recordConsent(draft.consentRecords, {
                    actingUserId: userId,
                    patientId,
                    actorCapacity: "ACCOUNT_HOLDER",
                    purpose,
                    version,
                    action: "ACKNOWLEDGED",
                    occurredAt: now().toISOString(),
                  });
              }
            });
            setCreated(true);
            toast("Profile created.");
          }}
        >
          {variant === "submitting" ? "Creating your record…" : "Continue"}
        </Button>
      </div>
    </MobileScreen>
  );
}

/** P13 — Verify Your Monovella ID (NIN). */
export function VerifyId() {
  const { data, session, update, toast } = usePrototype();
  const navigate = useNavigate();
  const patient = patientById(data, session.viewingPatientId)!;
  const [nin, setNin] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<
    "current" | "unverified" | "provisional" | "verified" | "nin_failed" | "no_profile"
  >("current");

  const status =
    view === "current"
      ? patient.status
      : view === "verified"
        ? "VERIFIED"
        : view === "provisional"
          ? "PROVISIONAL"
          : "UNVERIFIED";

  return (
    <MobileScreen
      title="Verify your Monovella ID"
      back
      tabs="none"
      contentPlacement={view === "no_profile" || status === "VERIFIED" ? "center" : "start"}
    >
      <div data-screen="P13" className="mx-auto w-full max-w-128 space-y-5 py-6">
        <OnboardingProgress
          current={5}
          total={5}
          label="Verify your ID to unlock booking"
          optional={view !== "verified"}
        />
        <ScreenStates
          states={[
            { value: "current", label: "Live" },
            { value: "unverified", label: "Unverified" },
            { value: "provisional", label: "Provisional" },
            { value: "verified", label: "Verified" },
            { value: "nin_failed", label: "400 NIN failed" },
            { value: "no_profile", label: "404 no profile" },
          ]}
          value={view}
          onChange={setView}
        />

        {view === "no_profile" ? (
          <div className="space-y-3">
            <Banner tone="info">
              Set up your patient record before verifying your Monovella ID.
            </Banner>
            <ButtonLink to="/app/profile/create" full>
              Create record
            </ButtonLink>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <PatientIdBadge status={status} />
              <span className="font-mono text-record text-base-content/70">
                {patient.monovella_id}
              </span>
            </div>

            {status === "VERIFIED" ? (
              <div className="space-y-3">
                <Card>
                  <p className="font-heading text-h3">You're verified</p>
                  <p className="measure mt-1.5 text-body-sm text-base-content/70">
                    Your Monovella ID helps an authorized care team match the right record. Knowing
                    the ID or being verified is never enough to open it. Protected details appear
                    only for the correct care relationship and approved purpose.
                  </p>
                </Card>
                <Button full onClick={() => navigate("/app")}>
                  Go to home
                </Button>
              </div>
            ) : (
              <>
                <Card>
                  <p className="measure text-body-sm text-base-content/75">
                    Verifying links your record to one real person, so no one else can claim it and
                    every expert who opens it knows whose it is. We check the number once through
                    our identity partner and keep only the result:{" "}
                    <strong className="font-medium">the number itself isn't stored.</strong>
                  </p>
                </Card>

                {status === "PROVISIONAL" ? (
                  <Banner tone="info">
                    You can log, browse experts and use Teni on a provisional ID. Verify whenever
                    you're ready: it's what unlocks booking a paid consultation.
                  </Banner>
                ) : null}

                <Field
                  label="National Identity Number (NIN)"
                  error={
                    view === "nin_failed"
                      ? "NIN verification failed: check the number and try again."
                      : error
                  }
                >
                  {(p) => (
                    <Input
                      {...p}
                      numeric
                      inputMode="numeric"
                      maxLength={11}
                      value={nin}
                      onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      placeholder="00000000000"
                    />
                  )}
                </Field>
                <Checkbox
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  label="I consent to Monovella verifying this NIN with the identity service."
                  description={
                    <>
                      This consent is only for identity verification. It is not part of the general
                      terms acknowledgement. Read the{" "}
                      <Link
                        to="/legal/privacy"
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        Data and Privacy Policy
                      </Link>{" "}
                      before deciding.
                    </>
                  }
                />
                <Button
                  full
                  disabled={nin.length < 11 || !consent}
                  onClick={() => {
                    if (nin.startsWith("0")) {
                      setError("NIN verification failed: check the number and try again.");
                      return;
                    }
                    update((d) => {
                      recordConsent(d.consentRecords, {
                        actingUserId: data.user.id,
                        patientId: patient.id,
                        actorCapacity: patient.guardian_user_id ? "GUARDIAN" : "ACCOUNT_HOLDER",
                        guardianRelationship: patient.guardian_reason,
                        purpose: "NIN_VERIFICATION",
                        version: CONSENT_VERSIONS.ninVerification,
                        occurredAt: now().toISOString(),
                      });
                      d.patients = d.patients.map((p) =>
                        p.id === patient.id ? { ...p, status: "VERIFIED" as const } : p,
                      );
                    });
                    toast("Your Monovella ID is verified.");
                    setView("verified");
                  }}
                >
                  Verify
                </Button>
                {/* This is the last step of onboarding. Going "back" landed the
                    person on the profile form they had just submitted; deferring
                    verification should take them into the app instead. */}
                <Button variant="ghost" full onClick={() => navigate("/app")}>
                  Do this later
                </Button>
              </>
            )}
          </>
        )}
      </div>
    </MobileScreen>
  );
}

/** P14 — Claim Independent Sign-In. */
export function ClaimIndependent() {
  const navigate = useNavigate();
  const { data, update, toast } = usePrototype();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [nin, setNin] = useState("");
  const [variant, setVariant] = useState<
    | "default"
    | "submitting"
    | "nomatch"
    | "already_exists"
    | "validation"
    | "disputed"
    | "supported_access"
    | "claimed"
  >("default");

  const claim = () => {
    const match = data.patients.find(
      (patient) =>
        patient.is_dependant &&
        patient.first_name?.toLocaleLowerCase() === firstName.trim().toLocaleLowerCase() &&
        patient.last_name?.toLocaleLowerCase() === lastName.trim().toLocaleLowerCase() &&
        patient.date_of_birth === dob,
    );
    if (!match) {
      setVariant("nomatch");
      return;
    }

    update((draft) => {
      draft.patients = draft.patients.map((patient) =>
        patient.id === match.id
          ? {
              ...patient,
              is_dependant: false,
              guardian_user_id: null,
              guardian_reason: null,
            }
          : patient,
      );
    });
    setVariant("claimed");
    toast("The former guardian can no longer access this record.");
  };

  return (
    <MobileScreen title="Claim your own account" back tabs="none">
      <div data-screen="P14" className="space-y-5">
        <ScreenStates
          states={[
            { value: "default", label: "Default" },
            { value: "submitting", label: "Submitting" },
            { value: "nomatch", label: "400 no matching record" },
            { value: "already_exists", label: "409 identity exists" },
            { value: "validation", label: "422 validation" },
            { value: "disputed", label: "Access disputed" },
            { value: "supported_access", label: "Continuing support needed" },
            { value: "claimed", label: "Ownership transferred" },
          ]}
          value={variant}
          onChange={(value) => setVariant(value as typeof variant)}
        />
        {variant === "claimed" ? (
          <>
            <Banner tone="success">
              This record now belongs to its own sign-in. Its health history stays with it, and the
              former guardian can no longer open or change it.
            </Banner>
            <p className="measure text-body text-base-content/75">
              Sign in with the claimant's phone and PIN to continue. Eligibility, continuing adult
              support and guardian notice rules still require qualified Nigerian legal review before
              live use.
            </p>
            <Button full onClick={() => navigate("/app/sign-in")}>
              Continue to sign in
            </Button>
          </>
        ) : (
          <>
            <p className="measure text-body text-base-content/75">
              If someone has been managing your care on their account, this moves your record onto
              your own sign-in. Everything already in it comes with you.
            </p>
            {variant === "already_exists" ? (
              <Banner tone="info">
                Your patient record already has its own sign-in. <Link to="/app">Go to home.</Link>
              </Banner>
            ) : null}
            {variant === "disputed" ? (
              <Banner tone="warning">
                This claim is paused while the access dispute is reviewed. The current guardian
                relationship stays unchanged, and neither party should use this form to override the
                other.
              </Banner>
            ) : null}
            {variant === "supported_access" ? (
              <Banner tone="info">
                This person still needs help managing their care. Continuing adult support needs a
                separately approved consent and withdrawal rule before live use, so this prototype
                does not silently retain guardian access after an independent claim.
              </Banner>
            ) : null}
            <Field
              label="First name"
              error={variant === "validation" ? "Enter your first name." : null}
            >
              {(p) => (
                <Input {...p} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              )}
            </Field>
            <Field
              label="Last name"
              error={variant === "validation" ? "Enter your last name." : null}
            >
              {(p) => (
                <Input {...p} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              )}
            </Field>
            <Field
              label="Date of birth"
              error={variant === "validation" ? "Enter your date of birth." : null}
            >
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  numeric
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                />
              )}
            </Field>
            <Field
              label="National Identity Number (NIN)"
              error={
                variant === "nomatch"
                  ? "No matching dependant record found."
                  : variant === "validation"
                    ? "Enter the 11-digit NIN used for this record."
                    : null
              }
            >
              {(p) => (
                <Input
                  {...p}
                  numeric
                  inputMode="numeric"
                  maxLength={11}
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
                />
              )}
            </Field>
            <Button
              full
              disabled={
                !firstName.trim() ||
                !lastName.trim() ||
                !dob ||
                nin.length < 11 ||
                variant === "submitting" ||
                variant === "already_exists" ||
                variant === "disputed" ||
                variant === "supported_access"
              }
              onClick={claim}
            >
              {variant === "submitting" ? "Claiming your record…" : "Claim this record"}
            </Button>
            <ButtonLink to="/app/profile/create" variant="ghost" full>
              Start fresh
            </ButtonLink>
          </>
        )}
      </div>
    </MobileScreen>
  );
}

/** P15 — Dependants. */
export function Dependants() {
  const { data } = usePrototype();
  const [view, setView] = useState<"populated" | "empty">("populated");
  const rows = view === "empty" ? [] : dependantsOf(data, data.user.id);

  return (
    <MobileScreen title="People you manage" back="/app/account">
      <div data-screen="P15" className="space-y-4">
        <ScreenStates
          states={[
            { value: "populated", label: "Populated" },
            { value: "empty", label: "Empty" },
          ]}
          value={view}
          onChange={setView}
        />

        {data.dependantConfirmations
          ?.filter((r) => r.patient.guardian_user_id === data.user.id && r.status !== "CONFIRMED")
          .map((request) => (
            <ListRow
              key={request.patient.id}
              to={`/app/dependants/new?pending=${request.patient.id}`}
              title={`${request.patient.first_name} ${request.patient.last_name}`}
              meta={
                request.status === "LOCKED"
                  ? "Confirmation locked. Send a new code."
                  : "Waiting for phone confirmation"
              }
            />
          ))}
        {rows.length ? (
          <>
            <ListGroup>
              {rows.map((dep) => (
                <ListRow
                  key={dep.id}
                  to={`/app/dependants/${dep.id}`}
                  title={`${dep.first_name} ${dep.last_name}`}
                  meta={
                    <>
                      {ageFrom(dep.date_of_birth)} years old ·{" "}
                      {guardianReasonLabel[dep.guardian_reason as GuardianReason]}
                      {dep.status === "PROVISIONAL" ? (
                        <span className="mt-1 block text-warning">
                          Verify their NIN when they have one: it's what turns a provisional ID into
                          a permanent one.
                        </span>
                      ) : null}
                    </>
                  }
                  trailing={<PatientIdBadge status={dep.status} />}
                />
              ))}
            </ListGroup>
            <ButtonLink to="/app/dependants/new" variant="secondary" full>
              <UserPlus aria-hidden className="size-4" strokeWidth={1.5} />
              Add a dependant
            </ButtonLink>
          </>
        ) : (
          <EmptyState
            title="You're not managing anyone else's care yet"
            body="Add a child, or an adult who needs help managing a condition, and their record sits alongside yours, with their own Monovella ID."
            action={<ButtonLink to="/app/dependants/new">Add dependant</ButtonLink>}
          />
        )}
      </div>
    </MobileScreen>
  );
}

/** P16 — Add Dependant. */
export function AddDependant() {
  const navigate = useNavigate();
  const { toast, data, update, nextId } = usePrototype();
  const [searchParams] = useSearchParams();
  const pendingRequest = data.dependantConfirmations?.find(
    (r) =>
      r.patient.id === searchParams.get("pending") && r.patient.guardian_user_id === data.user.id,
  );
  const [reason, setReason] = useState<GuardianReason | "">("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [phone, setPhone] = useState("");
  const [variant, setVariant] = useState<
    "default" | "submitting" | "phone_required" | "no_profile" | "validation"
  >("default");

  if (pendingRequest && pendingRequest.status !== "CONFIRMED") {
    return (
      <MobileScreen title="Waiting on them" back="/app/dependants" tabs="none">
        <div data-screen="P16" className="space-y-4">
          <Card>
            <p className="font-heading text-h3">
              Waiting for {pendingRequest.patient.first_name} to confirm
            </p>
            <p className="measure mt-1.5 text-body-sm text-base-content/70">
              We texted a one-time code to{" "}
              <span className="font-mono text-record">{pendingRequest.phone}</span>. Once they enter
              it, their record appears in your list.
            </p>
          </Card>
          <Button
            variant="secondary"
            full
            onClick={() => {
              update((draft) => {
                const request = draft.dependantConfirmations?.find(
                  (r) =>
                    r.patient.id === pendingRequest.patient.id &&
                    r.patient.guardian_user_id === draft.user.id,
                );
                if (request && request.status !== "CONFIRMED") {
                  request.status = "PENDING";
                  request.attempts = 0;
                }
              });
              toast("A new confirmation code is ready.");
            }}
          >
            Send a new code
          </Button>
          <ButtonLink to="/app/dependants" variant="secondary" full>
            Go back
          </ButtonLink>
          <ScreenStates
            states={[
              { value: "default", label: "Default" },
              { value: "submitting", label: "Submitting" },
              { value: "phone_required", label: "400 phone required" },
              { value: "no_profile", label: "404 no patient identity" },
              { value: "validation", label: "422 validation" },
            ]}
            value="default"
            onChange={(value) => {
              navigate("/app/dependants/new");
              setVariant(value as typeof variant);
            }}
          />
        </div>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen title="Add a dependant" back="/app/dependants" tabs="none">
      <div data-screen="P16" className="space-y-5">
        <ScreenStates
          states={[
            { value: "default", label: "Default" },
            { value: "submitting", label: "Submitting" },
            { value: "phone_required", label: "400 phone required" },
            { value: "no_profile", label: "404 no patient identity" },
            { value: "validation", label: "422 validation" },
          ]}
          value={variant}
          onChange={(value) => {
            const next = value as typeof variant;
            setVariant(next);
            if (next === "phone_required") setReason("NO_NIN_YET");
          }}
        />
        {variant === "no_profile" ? (
          <div className="space-y-3">
            <Banner tone="info">
              Set up your own patient record before adding someone you manage.
            </Banner>
            <ButtonLink to="/app/profile/create" full>
              Create record
            </ButtonLink>
          </div>
        ) : (
          <>
            <Field
              label="First name"
              error={variant === "validation" ? "Enter their first name." : null}
            >
              {(p) => (
                <Input
                  {...p}
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                />
              )}
            </Field>
            <Field
              label="Last name"
              error={variant === "validation" ? "Enter their last name." : null}
            >
              {(p) => (
                <Input
                  {...p}
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                />
              )}
            </Field>
            <Field
              label="Date of birth"
              error={variant === "validation" ? "Enter their date of birth." : null}
            >
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  numeric
                  value={dob}
                  onChange={(event) => setDob(event.target.value)}
                />
              )}
            </Field>
            <Field
              label="Gender"
              error={variant === "validation" ? "Choose the option that fits them." : null}
            >
              {(p) => (
                <Select
                  {...p}
                  value={gender}
                  onChange={(event) => setGender(event.target.value as Gender)}
                >
                  <option value="">Select</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>
                      {genderLabel[g]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <fieldset className="space-y-2">
              <legend className="mb-1.5 text-label font-medium">
                Why are you managing their care?
              </legend>
              <RadioCard
                name="reason"
                value="MINOR"
                checked={reason === "MINOR"}
                onChange={(v) => setReason(v as GuardianReason)}
                title="They're under 18"
              />
              <RadioCard
                name="reason"
                value="HEALTH_CONDITION"
                checked={reason === "HEALTH_CONDITION"}
                onChange={(v) => setReason(v as GuardianReason)}
                title="They need my help managing a health condition"
              />
              <RadioCard
                name="reason"
                value="NO_NIN_YET"
                checked={reason === "NO_NIN_YET"}
                onChange={(v) => setReason(v as GuardianReason)}
                title="They don't have a National ID number yet"
              />
            </fieldset>

            {reason === "NO_NIN_YET" ? (
              <Field
                label="Their phone number"
                hint="We'll text them a one-time code to confirm. Use the number as they normally write it."
                error={variant === "phone_required" ? "Enter their phone number." : null}
              >
                {(p) => (
                  <Input
                    {...p}
                    type="tel"
                    inputMode="tel"
                    numeric
                    placeholder="0801 234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                )}
              </Field>
            ) : null}

            {variant === "phone_required" ? (
              <Banner tone="error">
                Enter their phone number before sending the confirmation code.
              </Banner>
            ) : null}

            <Button
              full
              disabled={variant === "submitting"}
              onClick={() => {
                if (!firstName.trim() || !lastName.trim() || !dob || !gender || !reason) {
                  setVariant("validation");
                  return;
                }
                if (reason === "NO_NIN_YET" && !phone.trim()) {
                  setVariant("phone_required");
                  return;
                }
                if (dob > now().toISOString().slice(0, 10) || Number.isNaN(Date.parse(dob))) {
                  setVariant("validation");
                  return;
                }
                if (reason === "NO_NIN_YET" && phone.replace(/\D/g, "").length < 10) {
                  setVariant("phone_required");
                  return;
                }
                const id = nextId("patient");
                update((draft) => {
                  addPrototypeDependant(draft, {
                    id,
                    firstName,
                    lastName,
                    dateOfBirth: dob,
                    gender,
                    reason,
                    phone,
                    guardianName: selfPatient(data)?.first_name ?? "Your guardian",
                  });
                });
                if (reason === "NO_NIN_YET") navigate(`/app/dependants/new?pending=${id}`);
                else {
                  toast("Dependant added.");
                  navigate("/app/dependants");
                }
              }}
            >
              {variant === "submitting" ? "Adding them…" : "Add them"}
            </Button>
          </>
        )}
      </div>
    </MobileScreen>
  );
}

/** P17 — Dependant OTP Confirmation. Reached from an SMS link, no session. */
export function DependantConfirm() {
  const { data, update } = usePrototype();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id") ?? "";
  const request = data.dependantConfirmations?.find((r) => r.patient.id === id);
  const guardianName = request?.guardianName ?? "Your guardian";
  const [code, setCode] = useState("");
  const [preview, setView] = useState<
    | "default"
    | "submitting"
    | "confirmed"
    | "not_needed"
    | "no_pending"
    | "incorrect"
    | "not_found"
    | "locked"
  >("default");
  const view =
    preview !== "default"
      ? preview
      : !request
        ? "not_found"
        : request.status === "CONFIRMED"
          ? "confirmed"
          : request.status === "LOCKED"
            ? "locked"
            : request.attempts > 0
              ? "incorrect"
              : "default";
  const unavailable = view === "not_needed" || view === "no_pending" || view === "not_found";
  const locked = view === "locked";
  return (
    <MobileScreen tabs="none">
      <div data-screen="P17" className="space-y-5 py-6">
        <h1 className="font-heading text-h1">{guardianName} added you to Monovella</h1>
        <p className="measure text-body text-base-content/75">
          Monovella is a health record you own, and a way to reach a verified expert. {guardianName}{" "}
          has asked to help manage yours. Enter the code we texted you to confirm. You can take over
          your own sign-in whenever you're ready.
        </p>
        {view === "confirmed" ? (
          <Banner tone="success">Confirmed. {guardianName} can now help manage your care.</Banner>
        ) : unavailable ? (
          <div className="space-y-3">
            <Banner tone={view === "not_found" ? "error" : "info"}>
              {view === "not_needed"
                ? "This record does not need phone confirmation."
                : view === "no_pending"
                  ? "There is no confirmation code waiting. Ask your guardian to send a new one."
                  : "This confirmation link is no longer available."}
            </Banner>
            <ButtonLink to="/" variant="secondary" full>
              Monovella home
            </ButtonLink>
          </div>
        ) : (
          <>
            {view === "incorrect" ? (
              <Banner tone="error">
                That code is not correct. Check the latest message from your guardian.
              </Banner>
            ) : null}
            {locked ? (
              <Banner tone="info">
                Too many attempts. Ask your guardian to send a new confirmation code when you are
                ready.
              </Banner>
            ) : null}
            <OtpInput value={code} onChange={setCode} disabled={locked} label="Confirmation code" />
            <Button
              full
              disabled={code.length < 6 || locked || view === "submitting"}
              onClick={() => {
                setView("default");
                update((draft) => {
                  confirmPrototypeDependant(draft, id, code);
                });
              }}
            >
              {view === "submitting" ? "Confirming…" : "Confirm"}
            </Button>
          </>
        )}
        <ScreenStates
          states={[
            { value: "default", label: "Default" },
            { value: "submitting", label: "Submitting" },
            { value: "confirmed", label: "Confirmed" },
            { value: "not_needed", label: "400 confirmation not needed" },
            { value: "no_pending", label: "400 no code pending" },
            { value: "incorrect", label: "400 incorrect code" },
            { value: "not_found", label: "404 expired link" },
            { value: "locked", label: "423 locked" },
          ]}
          value={view}
          onChange={(value) => {
            setView(value as typeof view);
            if (value === "incorrect") setCode("");
          }}
        />
      </div>
    </MobileScreen>
  );
}

/** P18 — Verify Dependant's NIN. */
export function VerifyDependantNin() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "conflict"],
    "this dependant's verification",
  );
  const { id } = useParams();
  const { data, update, toast } = usePrototype();
  const navigate = useNavigate();
  const dep = data.patients.find(
    (patient) => patient.id === id && patient.guardian_user_id === data.user.id,
  );
  const [nin, setNin] = useState("");
  const [consent, setConsent] = useState(false);

  if (!dep) {
    return (
      <MobileScreen title="Not found" back="/app/dependants" tabs="none">
        <EmptyState title="Dependant not found" body="This link may have expired." />
      </MobileScreen>
    );
  }

  return (
    <MobileScreen title={`Verify ${dep.first_name}'s ID`} back="/app/dependants" tabs="none">
      <div data-screen="P18" className="space-y-5">
        {mutation.node}
        <div className="flex items-center gap-3">
          <PatientIdBadge status={dep.status} />
          <span className="font-mono text-record text-base-content/70">{dep.monovella_id}</span>
        </div>
        <Card>
          <p className="measure text-body-sm text-base-content/75">
            You're verifying on {dep.first_name}'s behalf. We check the number once and keep only
            the result: <strong className="font-medium">the number itself isn't stored.</strong>
          </p>
        </Card>
        <Field label={`${dep.first_name}'s National Identity Number`}>
          {(p) => (
            <Input
              {...p}
              numeric
              inputMode="numeric"
              maxLength={11}
              value={nin}
              onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
            />
          )}
        </Field>
        <Checkbox
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          label={`I consent to Monovella verifying this NIN on ${dep.first_name}'s behalf.`}
          description={
            <>
              This records you as the acting guardian for this identity check only. Read the{" "}
              <Link to="/legal/privacy" target="_blank" rel="noreferrer" className="underline">
                Data and Privacy Policy
              </Link>{" "}
              before deciding.
            </>
          }
        />
        <Button
          full
          disabled={nin.length < 11 || !consent}
          onClick={() => {
            update((d) => {
              recordConsent(d.consentRecords, {
                actingUserId: data.user.id,
                patientId: dep.id,
                actorCapacity: "GUARDIAN",
                guardianRelationship: dep.guardian_reason,
                purpose: "NIN_VERIFICATION",
                version: CONSENT_VERSIONS.ninVerification,
                occurredAt: now().toISOString(),
              });
              d.patients = d.patients.map((p) =>
                p.id === dep.id
                  ? { ...p, status: "VERIFIED" as const, verified_at: now().toISOString() }
                  : p,
              );
            });
            toast(`${dep.first_name}'s Monovella ID is verified.`);
            navigate("/app/dependants");
          }}
        >
          Verify
        </Button>
      </div>
    </MobileScreen>
  );
}

/** A dependant's own record, scoped by dependant_id (reuses P19/P31). */
export function DependantDetail() {
  const { id } = useParams();
  const { data, setSession } = usePrototype();
  const navigate = useNavigate();
  const dep = data.patients.find(
    (patient) => patient.id === id && patient.guardian_user_id === data.user.id,
  );
  if (!dep) {
    return (
      <MobileScreen title="Not found" back="/app/dependants" tabs="none">
        <EmptyState title="Dependant not found" body="This record isn't on your account." />
      </MobileScreen>
    );
  }
  return (
    <MobileScreen title={`${dep.first_name} ${dep.last_name}`} back="/app/dependants">
      <div className="space-y-4">
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <PatientIdBadge status={dep.status} />
            <Badge>{guardianReasonLabel[dep.guardian_reason as GuardianReason]}</Badge>
          </div>
          <dl className="mt-3 space-y-1 text-body-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-base-content/60">Monovella ID</dt>
              <dd className="font-mono text-record">{dep.monovella_id}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-base-content/60">Age</dt>
              <dd className="font-mono text-data">{ageFrom(dep.date_of_birth)}</dd>
            </div>
          </dl>
        </Card>

        {dep.status === "PROVISIONAL" ? (
          <ButtonLink to={`/app/dependants/${dep.id}/verify`} full>
            Verify {dep.first_name}'s Monovella ID
          </ButtonLink>
        ) : null}

        <ListGroup label="Their record">
          <ListRow
            onClick={() => {
              setSession({ viewingPatientId: dep.id });
              navigate("/app");
            }}
            title="Their home"
            meta="Open loops and next steps for them"
          />
          <ListRow
            onClick={() => {
              setSession({ viewingPatientId: dep.id });
              navigate("/app/experts");
            }}
            title="Find a specialist"
            meta="Book on their behalf"
          />
        </ListGroup>

        <Button
          variant="ghost"
          full
          onClick={() => {
            setSession({ viewingPatientId: dep.id });
            navigate("/app");
          }}
        >
          Switch to {dep.first_name}'s record
        </Button>
        <p className="text-center text-body-sm text-base-content/55">
          <Link to="/app/dependants" className="text-primary">
            Back to everyone you manage
          </Link>
        </p>
      </div>
    </MobileScreen>
  );
}
