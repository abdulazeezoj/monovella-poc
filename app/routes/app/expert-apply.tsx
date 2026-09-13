import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { LocationFields, type LocationValue } from "~/components/location-fields";
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
  FileDrop,
  Input,
  Select,
} from "~/components/ui";
import { reference } from "~/data";
import { expertById, selfPatient } from "~/data/selectors";
import type {
  CredentialTier,
  ExpertVerificationStatus,
  Gender,
  ProfessionalType,
  Specialty,
} from "~/data/types";
import { canAddFellowship, isFellowshipSpecialty } from "~/lib/expert-credentials";
import {
  credentialTierLabel,
  formatDate,
  genderLabel,
  naira,
  professionalTypeLabel,
  specialtyLabel,
} from "~/lib/format";
import {
  accessStatusOf,
  applicationLink,
  pendingExpertApplication,
  submitExpertGovernance,
} from "~/lib/governance-lifecycle";
import { useExpertSeat, usePrototype } from "~/store/prototype";

/** Which Specialty values each non-doctor ProfessionalType may pick — doctors
 * pick from everything else. Scoped per NMCN/PCN/MLSCN/MRTB research
 * (Market_Research.md); a professional type left out of this map defaults to
 * the doctor list, so it never silently inherits another type's scope. */
const SCOPED_SPECIALTIES: Partial<Record<ProfessionalType, Specialty[]>> = {
  PHYSIOTHERAPIST: ["PHYSIOTHERAPY"],
  NURSE: [
    "CHRONIC_DISEASE_MONITORING",
    "WOUND_CARE_GUIDANCE",
    "MATERNAL_CHILD_HEALTH",
    "POST_OP_FOLLOW_UP",
  ],
  PHARMACIST: ["MEDICATION_THERAPY_MANAGEMENT", "OTC_WELLNESS_COUNSELING"],
  LAB_SCIENTIST: ["RESULT_INTERPRETATION_REFERRAL"],
};
const NON_DOCTOR_SPECIALTIES = new Set(Object.values(SCOPED_SPECIALTIES).flat());

const LICENCE_INFO: Record<ProfessionalType, { label: string; placeholder: string }> = {
  DOCTOR: { label: "MDCN licence number", placeholder: "MDCN/2014/104882" },
  PHYSIOTHERAPIST: { label: "MRTB registration number", placeholder: "MRTB/PT/2017/2288" },
  NURSE: { label: "NMCN licence number", placeholder: "NMCN/RN/2015/034521" },
  PHARMACIST: { label: "PCN licence number", placeholder: "PCN/2016/008847" },
  LAB_SCIENTIST: { label: "MLSCN licence number", placeholder: "MLSCN/2014/002391" },
};
const REGULATOR_NAME: Record<ProfessionalType, string> = {
  DOCTOR: "MDCN",
  PHYSIOTHERAPIST: "MRTB",
  NURSE: "NMCN",
  PHARMACIST: "PCN",
  LAB_SCIENTIST: "MLSCN",
};

/** X1 — Apply to Practice. This form *is* the verification gate. */
export default function ApplyToPractice() {
  const navigate = useNavigate();
  const { toast, data, update, nextId } = usePrototype();
  // Applying to practise doesn't create a new person — it's the same account
  // adding an Expert identity, so the form starts from the account's own name.
  const applicant = selfPatient(data);
  const expertId = useExpertSeat();
  const pendingApplication = pendingExpertApplication(data, expertId, "INITIAL");
  const [firstName, setFirstName] = useState(applicant?.first_name ?? "");
  const [lastName, setLastName] = useState(applicant?.last_name ?? "");
  const [gender, setGender] = useState<Gender | "">(applicant?.gender ?? "");
  const [type, setType] = useState<ProfessionalType>("DOCTOR");
  const [specialty, setSpecialty] = useState<Specialty | "">("");
  const [licence, setLicence] = useState("");
  const [licenceExpiry, setLicenceExpiry] = useState("");
  const [email, setEmail] = useState("");
  const [fee, setFee] = useState("12000");
  const [file, setFile] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationValue>({
    address: "",
    city: "",
    localGovernmentArea: "",
    state: "",
  });
  const [error, setError] = useState<"none" | "upload" | "mismatch" | "exists">("none");

  const specialties = SCOPED_SPECIALTIES[type]
    ? reference.specialties.filter((s) => SCOPED_SPECIALTIES[type]!.includes(s.value as Specialty))
    : reference.specialties.filter((s) => !NON_DOCTOR_SPECIALTIES.has(s.value as Specialty));

  return (
    <MobileScreen title="Apply to practise" back="/app/account" tabs="none">
      <div data-screen="X1" className="space-y-5">
        <ScreenStates
          states={[
            { value: "none", label: "Default" },
            { value: "upload", label: "400 upload" },
            { value: "mismatch", label: "400 specialty" },
            { value: "exists", label: "409 exists" },
          ]}
          value={error}
          onChange={setError}
        />

        {error === "exists" || pendingApplication ? (
          <Banner
            tone="info"
            action={
              <ButtonLink
                size="sm"
                variant="secondary"
                to={
                  pendingApplication
                    ? `/app/expert/application?new=1&id=${pendingApplication.application_id}`
                    : "/app/expert/application"
                }
              >
                See it
              </ButtonLink>
            }
          >
            You already have an application on this account.
          </Banner>
        ) : null}

        <p className="measure text-body text-base-content/75">
          Monovella verifies every expert individually (your licence against your council's
          register, and your indemnity cover) before you can take a single case. A person reviews
          this, not a script.
        </p>
        <Card>
          <p className="font-heading text-h3">What happens after you apply</p>
          <ol className="mt-3 space-y-2 text-body-sm text-base-content/70">
            <li>1. Monovella checks your licence and indemnity documents.</li>
            <li>2. You see the decision here. Submission does not guarantee approval.</li>
            <li>3. If approved, publish your hours before inviting patients.</li>
          </ol>
        </Card>

        <section className="space-y-4">
          <h2 className="font-heading text-h3">You</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name">
              {(p) => (
                <Input {...p} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              )}
            </Field>
            <Field label="Last name">
              {(p) => (
                <Input {...p} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              )}
            </Field>
          </div>
          <Field label="Email">
            {(p) => (
              <Input
                {...p}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@practice.ng"
              />
            )}
          </Field>
          <Field label="Gender">
            {(p) => (
              <Select {...p} value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                <option value="">Select</option>
                {(["FEMALE", "MALE", "OTHER", "PREFER_NOT_TO_SAY"] as Gender[]).map((g) => (
                  <option key={g} value={g}>
                    {genderLabel[g]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="border-t border-base-300 pt-4">
            <p className="font-heading text-h3">Your practice location</p>
            <p className="mt-1 text-body-sm text-base-content/65">
              This lets Monovella verify where you practise. Patients only use your state when
              browsing remote care.
            </p>
          </div>
          <LocationFields value={location} onChange={setLocation} addressLabel="Practice address" />
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-h3">Your credentials</h2>
          <Field label="Professional type">
            {(p) => (
              <Select
                {...p}
                value={type}
                onChange={(e) => {
                  setType(e.target.value as ProfessionalType);
                  setSpecialty("");
                }}
              >
                {(
                  [
                    "DOCTOR",
                    "PHYSIOTHERAPIST",
                    "NURSE",
                    "PHARMACIST",
                    "LAB_SCIENTIST",
                  ] as ProfessionalType[]
                ).map((t) => (
                  <option key={t} value={t}>
                    {professionalTypeLabel[t]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label="Specialty"
            error={
              error === "mismatch" ? "That specialty doesn't match your professional type." : null
            }
            hint={
              SCOPED_SPECIALTIES[type]
                ? `${professionalTypeLabel[type]}s practise under ${specialties
                    .map((s) => s.label)
                    .join(" or ")}.`
                : undefined
            }
          >
            {(p) => (
              <Select
                {...p}
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value as Specialty)}
              >
                <option value="">Select</option>
                {specialties.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={LICENCE_INFO[type].label}>
            {(p) => (
              <Input
                {...p}
                className="font-mono"
                value={licence}
                onChange={(e) => setLicence(e.target.value)}
                placeholder={LICENCE_INFO[type].placeholder}
              />
            )}
          </Field>
          <Field
            label="Licence expiry date"
            hint="The date printed on your practising licence. We'll remind you well before it lapses."
          >
            {(p) => (
              <Input
                {...p}
                type="date"
                numeric
                value={licenceExpiry}
                onChange={(e) => setLicenceExpiry(e.target.value)}
              />
            )}
          </Field>
        </section>

        <section className="space-y-4">
          <h2 className="font-heading text-h3">Your fee</h2>
          <Field
            label="Consultation fee (₦)"
            hint="Patients pay you this directly. Monovella adds its own capped fee on top (20%, never more than ₦3,000) so they see both numbers before booking."
          >
            {(p) => (
              <Input
                {...p}
                numeric
                inputMode="numeric"
                value={fee}
                onChange={(e) => setFee(e.target.value.replace(/\D/g, ""))}
              />
            )}
          </Field>
          {fee ? (
            <Card>
              <dl className="divide-y divide-base-300">
                <DataRow label="You receive" value={naira(Number(fee) * 100)} />
                <DataRow
                  label="Monovella's fee to them"
                  value={naira(Math.min(Number(fee) * 100 * 0.2, 300000))}
                />
                <DataRow
                  label="They pay in total"
                  value={naira(Number(fee) * 100 + Math.min(Number(fee) * 100 * 0.2, 300000))}
                />
              </dl>
            </Card>
          ) : null}
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-h3">Indemnity certificate</h2>
          <FileDrop
            label="Upload your certificate"
            filename={file}
            onFile={(chosen) => setFile(chosen.name)}
            onRemove={() => setFile(null)}
            pendingVerification={!!file}
          />
          {error === "upload" ? (
            <p className="text-body-sm text-error">
              Indemnity certificate upload not found: try uploading again.
            </p>
          ) : null}
        </section>

        <Button
          full
          disabled={
            !!pendingApplication ||
            error === "exists" ||
            !firstName.trim() ||
            !lastName.trim() ||
            !gender ||
            !Number(fee) ||
            !specialty ||
            !licence ||
            !licenceExpiry ||
            !email ||
            !file ||
            !location.address.trim() ||
            !location.city.trim() ||
            !location.localGovernmentArea ||
            !location.state
          }
          onClick={() => {
            const applicationId = nextId("app");
            update((draft) => {
              submitExpertGovernance(draft, {
                id: applicationId,
                kind: "INITIAL",
                expertId,
                documentFilename: file ?? undefined,
                applicant: {
                  first_name: firstName.trim(),
                  last_name: lastName.trim(),
                  gender: gender as Gender,
                  professional_type: type,
                  email: email.trim(),
                  address: location.address.trim(),
                  city: location.city.trim(),
                  local_government_area: location.localGovernmentArea,
                  state: location.state,
                },
                credentialId: nextId("cred"),
                tier: type === "DOCTOR" ? "GP" : "GENERAL",
                specialty: specialty as Specialty,
                licenceNumber: licence,
                expiryDate: licenceExpiry,
                feeKobo: Number(fee) * 100,
              });
            });
            toast("Application submitted.");
            navigate(`/app/expert/application?new=1&id=${applicationId}`);
          }}
        >
          Submit application
        </Button>
      </div>
    </MobileScreen>
  );
}

const TIER_ORDER: CredentialTier[] = ["GP", "SPECIALIST", "SUPER_SPECIALIST"];

/** X1a — Add Another Credential. Additive: existing credentials keep working, unaffected. */
export function AddCredential() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation"],
    "this credential",
  );
  const navigate = useNavigate();
  const { toast, data, update, nextId } = usePrototype();
  const expertId = useExpertSeat();
  const expert = expertById(data, expertId)!;
  const verified = expert.credentials.filter((c) => c.verification_status === "VERIFIED");
  const highestIndex = Math.max(...verified.map((c) => TIER_ORDER.indexOf(c.tier)), -1);
  const nextTier = TIER_ORDER[highestIndex + 1];
  const specialistCredential = verified.find((c) => c.tier === "SPECIALIST");

  const [specialty, setSpecialty] = useState<Specialty | "">(
    nextTier === "SUPER_SPECIALIST" ? (specialistCredential?.specialty ?? "") : "",
  );
  const [number, setNumber] = useState("");
  const [fee, setFee] = useState("");
  const [file, setFile] = useState<string | null>(null);

  if (!verified.length) {
    return (
      <MobileScreen title="Apply to practise first" back="/app/account" tabs="none">
        <EmptyState
          title="Start with your first credential"
          body="Submit your initial application and wait for its decision before adding another credential."
          action={<ButtonLink to="/app/expert/apply">Apply to practise</ButtonLink>}
        />
      </MobileScreen>
    );
  }
  if (!canAddFellowship(expert)) {
    return (
      <MobileScreen title="Add another credential" back="/app/expert" tabs="none">
        <EmptyState
          title="Fellowship tiers are for doctors"
          body="Manage your existing credentials and fees, or renew your professional licence."
          action={<ButtonLink to="/app/expert/credentials">Manage credentials</ButtonLink>}
        />
      </MobileScreen>
    );
  }
  if (!nextTier) {
    return (
      <MobileScreen title="Add another credential" back="/app/expert" tabs="none">
        <div data-screen="X1a" className="space-y-4">
          {mutation.node}
          <Banner tone="info">
            You already hold every tier this account supports: General Practice, Specialist and
            Super-Specialist.
          </Banner>
        </div>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen title="Add another credential" back="/app/expert" tabs="none">
      <div data-screen="X1a" className="space-y-5">
        {mutation.node}
        <p className="measure text-body text-base-content/75">
          Adding a {credentialTierLabel[nextTier].toLowerCase()} credential is additive. Every
          credential you already hold keeps earning bookings at its own rate while this one is
          reviewed.
        </p>

        <Card>
          <p className="font-heading text-h3">What you already hold</p>
          <dl className="mt-3 divide-y divide-base-300">
            {verified.map((c) => (
              <DataRow
                key={c.id}
                label={credentialTierLabel[c.tier]}
                value={`${specialtyLabel(c.specialty)} · ${naira(c.consultation_fee_kobo)}`}
                mono={false}
              />
            ))}
          </dl>
        </Card>

        <section className="space-y-4">
          <h2 className="font-heading text-h3">{credentialTierLabel[nextTier]} credential</h2>
          <Field
            label="Specialty"
            hint={
              nextTier === "SUPER_SPECIALIST"
                ? "A super-specialty stays under your existing Specialist field."
                : undefined
            }
          >
            {(p) =>
              nextTier === "SUPER_SPECIALIST" ? (
                <Input {...p} disabled value={specialtyLabel(specialty)} />
              ) : (
                <Select
                  {...p}
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value as Specialty)}
                >
                  <option value="">Select</option>
                  {reference.specialties
                    .filter((s) => isFellowshipSpecialty(s.value))
                    .map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                </Select>
              )
            }
          </Field>
          <Field label="Fellowship certificate number">
            {(p) => (
              <Input
                {...p}
                className="font-mono"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="WACS/2024/00812"
              />
            )}
          </Field>
          <Field
            label={`${credentialTierLabel[nextTier]} consultation fee (₦)`}
            hint="Independent of your other credentials: set what this tier of care is worth on its own."
          >
            {(p) => (
              <Input
                {...p}
                numeric
                inputMode="numeric"
                value={fee}
                onChange={(e) => setFee(e.target.value.replace(/\D/g, ""))}
              />
            )}
          </Field>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-h3">Fellowship certificate</h2>
          <FileDrop
            label="Upload your certificate"
            filename={file}
            onFile={(chosen) => setFile(chosen.name)}
            onRemove={() => setFile(null)}
            pendingVerification={!!file}
          />
        </section>

        <Button
          full
          disabled={!specialty || !number || !fee || !file}
          onClick={() => {
            const applicationId = nextId("app");
            const credentialId = nextId("cred");
            update((draft) => {
              submitExpertGovernance(draft, {
                id: applicationId,
                kind: "ADDITIONAL_CREDENTIAL",
                expertId,
                documentFilename: file ?? undefined,
                credentialId,
                tier: nextTier,
                specialty: specialty as Specialty,
                licenceNumber: number,
                expiryDate: "2027-12-31",
                feeKobo: Number(fee) * 100,
              });
            });
            toast("Credential submitted for review.");
            navigate(`/app/expert/application?credential=1&id=${applicationId}`);
          }}
        >
          Submit credential
        </Button>
      </div>
    </MobileScreen>
  );
}

/** X24 — Renew Your Licence. X1's narrow re-verification subset, not the whole form again. */
export function RenewLicence() {
  const navigate = useNavigate();
  const { toast, data, update, nextId } = usePrototype();
  const expertId = useExpertSeat();
  const expert = expertById(data, expertId)!;
  const pendingApplication = pendingExpertApplication(
    data,
    expertId,
    "LICENCE_RENEWAL",
    expert.credentials[0]?.id,
  );
  const [licence, setLicence] = useState(expert.licence_number ?? "");
  const [licenceExpiry, setLicenceExpiry] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!expert.credentials.length) {
    return (
      <MobileScreen title="No licence to renew" back="/app/account" tabs="none">
        <EmptyState
          title="Apply to practise first"
          body="Your initial application creates the credential you can renew later."
          action={<ButtonLink to="/app/expert/apply">Apply to practise</ButtonLink>}
        />
      </MobileScreen>
    );
  }
  return (
    <MobileScreen title="Renew your licence" back="/app/expert" tabs="none">
      <div data-screen="X24" className="space-y-5">
        <ScreenStates
          states={[
            { value: "none", label: "Default" },
            { value: "pending", label: "400 renewal pending" },
          ]}
          value={pending ? "pending" : "none"}
          onChange={(v) => setPending(v === "pending")}
        />

        {pending || pendingApplication ? (
          <Banner
            tone="info"
            action={
              <ButtonLink
                size="sm"
                variant="secondary"
                to={
                  pendingApplication
                    ? `/app/expert/application?renewal=1&id=${pendingApplication.application_id}`
                    : "/app/expert/application?renewal=1"
                }
              >
                See it
              </ButtonLink>
            }
          >
            A renewal is already pending review.
          </Banner>
        ) : null}

        <p className="measure text-body text-base-content/75">
          Keep practising without interruption: confirm your licence details and upload a current
          indemnity certificate. Monovella re-checks these, but your fee, specialty and practice
          history all stay exactly as they are.
        </p>

        <Card>
          <dl className="divide-y divide-base-300 text-body-sm">
            <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <dt className="text-base-content/60">Professional type</dt>
              <dd className="font-medium">{professionalTypeLabel[expert.professional_type]}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
              <dt className="text-base-content/60">Consultation fee</dt>
              <dd className="font-mono tabular">{naira(expert.consultation_fee_kobo)}</dd>
            </div>
          </dl>
        </Card>

        <section className="space-y-4">
          <h2 className="font-heading text-h3">Your licence</h2>
          <Field label={LICENCE_INFO[expert.professional_type].label}>
            {(p) => (
              <Input
                {...p}
                className="font-mono"
                value={licence}
                onChange={(e) => setLicence(e.target.value)}
              />
            )}
          </Field>
          <Field label="New expiry date">
            {(p) => (
              <Input
                {...p}
                type="date"
                numeric
                value={licenceExpiry}
                onChange={(e) => setLicenceExpiry(e.target.value)}
              />
            )}
          </Field>
        </section>

        <section className="space-y-3">
          <h2 className="font-heading text-h3">Indemnity certificate</h2>
          <FileDrop
            label="Upload a current certificate"
            filename={file}
            onFile={(chosen) => setFile(chosen.name)}
            onRemove={() => setFile(null)}
            pendingVerification={!!file}
          />
        </section>

        <Button
          full
          disabled={!!pendingApplication || pending || !licence || !licenceExpiry || !file}
          onClick={() => {
            const applicationId = nextId("app");
            update((draft) => {
              submitExpertGovernance(draft, {
                id: applicationId,
                kind: "LICENCE_RENEWAL",
                expertId,
                documentFilename: file ?? undefined,
                credentialId: expert.credentials[0].id,
                targetCredentialId: expert.credentials[0].id,
                tier: expert.credentials[0].tier,
                specialty: expert.credentials[0].specialty,
                licenceNumber: licence,
                expiryDate: licenceExpiry,
                feeKobo: expert.credentials[0].consultation_fee_kobo,
              });
            });
            toast("Renewal submitted.");
            navigate(`/app/expert/application?renewal=1&id=${applicationId}`);
          }}
        >
          Submit renewal
        </Button>
      </div>
    </MobileScreen>
  );
}

/** X3 — Application Status. It's the expert's whole app until Verified. */
export function ApplicationStatus() {
  const { data } = usePrototype();
  const expertId = useExpertSeat();
  const [searchParams] = useSearchParams();
  const requestedId = searchParams.get("id");
  const latestOwned = data.governanceApplications.find((item) => item.actor_id === expertId);
  const applicationId = requestedId ?? latestOwned?.application_id;
  const link = applicationId ? applicationLink(data, applicationId) : undefined;
  const isRenewal = link
    ? link.application_kind === "LICENCE_RENEWAL"
    : searchParams.get("renewal") === "1";
  const isCredential = link
    ? link.application_kind === "ADDITIONAL_CREDENTIAL"
    : searchParams.get("credential") === "1";
  const isNew = searchParams.get("new") === "1";
  const ownedApplication = link?.actor_id === expertId ? link : undefined;
  const application = ownedApplication
    ? data.applicationDetails.find((item) => item.id === ownedApplication.application_id)
    : undefined;
  const previewKey = `${expertId}:${applicationId ?? "unlinked"}`;
  const [preview, setPreview] = useState<{
    key: string;
    status: ExpertVerificationStatus;
  } | null>(null);
  const recordedStatus: ExpertVerificationStatus = application
    ? application.status === "APPROVED"
      ? "VERIFIED"
      : application.status
    : isRenewal || isCredential || isNew
      ? "PENDING"
      : "VERIFIED";
  // The prototype bar previews a state without changing the staff decision.
  const status = preview?.key === previewKey ? preview.status : recordedStatus;
  const expert = expertById(data, expertId);
  const access = accessStatusOf(data, expertId);
  const professionalType =
    application?.expert?.professional_type ?? expert?.professional_type ?? "DOCTOR";
  const regulator = Object.hasOwn(REGULATOR_NAME, professionalType)
    ? REGULATOR_NAME[professionalType as ProfessionalType]
    : "professional regulator";

  if (
    !applicationId &&
    !expert?.credentials.some((credential) => credential.verification_status === "VERIFIED")
  ) {
    return (
      <MobileScreen title="No application yet" back="/app/account" tabs="none">
        <EmptyState
          title="Apply to practise"
          body="Submit your professional details and credential documents to start verification."
          action={<ButtonLink to="/app/expert/apply">Start application</ButtonLink>}
        />
      </MobileScreen>
    );
  }

  if (applicationId && !application) {
    return (
      <MobileScreen title="Application unavailable" back="/app/expert" tabs="none">
        <EmptyState
          title="Application unavailable"
          body="This reference is not linked to your expert account. Return to your workspace and open your own application from there."
          action={<ButtonLink to="/app/expert">Workspace</ButtonLink>}
        />
      </MobileScreen>
    );
  }

  return (
    <MobileScreen
      title={isRenewal ? "Your renewal" : isCredential ? "Your new credential" : "Your application"}
      back="/app/expert"
      tabs="none"
    >
      <div data-screen="X3" className="space-y-4">
        <ScreenStates
          states={[
            { value: "PENDING", label: "Pending" },
            { value: "VERIFIED", label: "Verified" },
            { value: "REJECTED", label: "Rejected" },
          ]}
          value={status}
          onChange={(status) => setPreview({ key: previewKey, status })}
        />

        {isCredential ? (
          <Banner tone="info">
            Your other credentials are unaffected and keep earning bookings while this one is
            reviewed.
          </Banner>
        ) : null}

        <Card>
          <Badge
            tone={status === "VERIFIED" ? "success" : status === "REJECTED" ? "error" : "warning"}
          >
            {status === "VERIFIED"
              ? "Verified"
              : status === "REJECTED"
                ? "Not approved"
                : "Under review"}
          </Badge>

          {status === "PENDING" ? (
            <>
              <p className="mt-3 font-heading text-h2 leading-snug">
                {isRenewal
                  ? "Your renewal is under review"
                  : isCredential
                    ? "Your new credential is under review"
                    : "Under review by Monovella"}
              </p>
              <p className="measure mt-2 text-body text-base-content/80">
                {isRenewal
                  ? `A person is re-checking your licence number against the ${regulator} register and reading your new indemnity certificate. Your fee, specialty and practice history are unaffected either way.`
                  : isCredential
                    ? "A person is checking the supporting credential documents for this specialty. Your existing verified credentials remain bookable while this request is reviewed."
                    : `A person is checking your licence number against the ${regulator} register and reading your indemnity certificate. We don't put a countdown on that, because rushing it is exactly what the check exists to prevent.`}
              </p>
              <p className="measure mt-3 text-body text-base-content/80">
                You'll get an email the moment it's decided, either way.
              </p>
            </>
          ) : null}

          {status === "VERIFIED" ? (
            <>
              <p className="mt-3 font-heading text-h2 leading-snug">You're verified</p>
              <p className="measure mt-2 text-body text-base-content/80">
                Your licence and indemnity cover have been checked. Publish your hours and patients
                can book you.
              </p>
            </>
          ) : null}

          {status === "REJECTED" ? (
            <>
              <p className="mt-3 font-heading text-h2 leading-snug">We couldn't approve this</p>
              <p className="measure mt-2 text-body text-base-content/80">
                {application?.prior_rejection_reason ??
                  "Open your application decision or contact support to confirm what needs correcting."}
              </p>
            </>
          ) : null}

          <dl className="mt-4 divide-y divide-base-300 border-t border-base-300 pt-2">
            <DataRow
              label="Submitted"
              value={application ? formatDate(application.submitted_at) : "No application selected"}
            />
            {applicationId ? <DataRow label="Reference" value={applicationId} /> : null}
            {access ? <DataRow label="Workspace access" value={access} mono={false} /> : null}
            <DataRow
              label="Licence"
              value={application?.license_number ?? expert?.licence_number ?? "Not supplied"}
            />
          </dl>
        </Card>

        {status === "VERIFIED" ? (
          <>
            <Card>
              <p className="font-heading text-h3">Start with the useful basics</p>
              <ol className="mt-3 space-y-2 text-body-sm text-base-content/70">
                <li>1. Publish the hours you can reliably keep.</li>
                <li>2. Confirm where Monovella should send your payouts.</li>
                <li>3. Share a location-aware invite only when it helps a patient.</li>
              </ol>
              <p className="mt-3 text-body-sm text-base-content/60">
                An invite is not an endorsement, a promise of availability, or an offer of free
                care.
              </p>
            </Card>
            <ButtonLink to="/app/expert/schedule" full>
              Publish hours
            </ButtonLink>
            <ButtonLink to="/app/expert/invite-patients" variant="secondary" full>
              Patient invite
            </ButtonLink>
          </>
        ) : null}
        {status === "REJECTED" ? (
          <ButtonLink
            to={
              isRenewal
                ? "/app/expert/renew-licence"
                : isCredential
                  ? "/app/expert/add-credential"
                  : "/app/expert/apply"
            }
            full
          >
            Reapply
          </ButtonLink>
        ) : null}
      </div>
    </MobileScreen>
  );
}
