import {
  Bell,
  CreditCard,
  Eye,
  FileText,
  Fingerprint,
  Gift,
  KeyRound,
  LifeBuoy,
  LogOut,
  Mail,
  Share2,
  ShieldCheck,
  Smartphone,
  Trash2,
  User,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { useMutationStates } from "~/components/shell/mutation-states";
import { ScreenStates } from "~/components/shell/state-switcher";
import {
  Badge,
  Banner,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  CopyButton,
  DataRow,
  EmptyState,
  Field,
  FileDrop,
  Input,
  ListGroup,
  ListRow,
  Modal,
  OtpInput,
  PatientIdBadge,
  PinInput,
  StandingBanner,
  Textarea,
} from "~/components/ui";
import { profilePhotoDataUrl } from "~/components/ui/profile-photo";
import {
  accountCanManagePatient,
  consultationForPatient,
  EXPERT_ID,
  expertById,
  expertName,
  notificationPrefsFor,
  patientById,
  referralCodeFor,
  selfPatient,
  twoFactorFor,
} from "~/data/selectors";
import type { NotificationPreferenceRead } from "~/data/types";
import {
  challengeStatus,
  DEMO_CODES,
  issueOtp,
  readAuthJourney,
  recordFailedOtp,
  updateAuthJourney,
} from "~/lib/auth-journey";
import { now } from "~/lib/clock";
import { formatDate, formatDateTime, naira } from "~/lib/format";
import { ensurePatientInvitation } from "~/lib/patient-invitations";
import { usePrototype, useTick } from "~/store/prototype";

/** P58 — Account Settings. A plain settings list; no need to reinvent it. */
export default function AccountSettings() {
  const { data, session, setSession } = usePrototype();
  const navigate = useNavigate();
  const patient = selfPatient(data)!;

  return (
    <MobileScreen title="Account">
      <div data-screen="P58" className="space-y-4">
        <ScreenStates
          states={[
            { value: "normal", label: "Normal" },
            { value: "suspended", label: "Standing suspended" },
          ]}
          value={session.standingSuspended ? "suspended" : "normal"}
          onChange={(v) => setSession({ standingSuspended: v === "suspended" })}
        />
        {session.standingSuspended ? <StandingBanner audience="patient" /> : null}

        <Card>
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-primary text-h3 text-primary-content">
              {patient.photo_url ? (
                <img src={patient.photo_url} alt="" className="size-12 object-cover" />
              ) : (
                `${patient.first_name?.[0] ?? ""}${patient.last_name?.[0] ?? ""}`
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-heading text-h3">
                {patient.first_name} {patient.last_name}
              </p>
              <p className="font-mono text-record text-base-content/60">{patient.monovella_id}</p>
            </div>
          </div>
          <div className="mt-3 border-t border-base-300 pt-3">
            <PatientIdBadge status={patient.status} />
          </div>
        </Card>

        <ListGroup label="Your record">
          <ListRow
            to="/app/account/personal"
            leading={<User aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />}
            title="Personal information"
            meta="Name, phone and photo"
          />
          <ListRow
            to={`/app/patients/${patient.id}/clinical-safety`}
            leading={
              <ShieldCheck aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Medicines and reactions"
            meta="Patient or guardian supplied, with amendment history"
          />
          <ListRow
            to="/app/reports"
            leading={
              <FileText aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Reports"
            meta="Signed copies you can share"
          />
          <ListRow
            to="/app/account/access-history"
            leading={<Eye aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />}
            title="Care-team access"
            meta="Who has access, why, and whether it is current"
          />
          <ListRow
            to="/app/dependants"
            leading={
              <UserPlus aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="People you manage"
            meta="Dependants on your account"
          />
          <ListRow
            to="/app/verify-id"
            leading={
              <UserRound aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Monovella ID"
            meta="Identity verification"
          />
        </ListGroup>

        <ListGroup label="Payments & notifications">
          <ListRow
            to="/app/account/payment-methods"
            leading={
              <CreditCard aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Payment methods"
            meta="Saved cards"
          />
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
            meta="Face ID or fingerprint instead of your PIN"
          />
          <ListRow
            to="/app/account/two-factor"
            leading={
              <ShieldCheck aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Two-step verification"
            meta="An authenticator code on new sign-ins"
          />
          <ListRow
            to="/app/account/recovery-email"
            leading={<Mail aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />}
            title="Recovery email"
            meta="How you get back in if you lose your phone"
          />
          <ListRow
            to="/app/account/privacy-consents"
            leading={
              <ShieldCheck aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Privacy and consent"
            meta="Versioned acknowledgements and sharing decisions"
          />
        </ListGroup>

        <ListGroup label="Monovella">
          <ListRow
            to="/app/account/invite"
            leading={<Gift aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />}
            title="Invite a friend"
          />
          <ListRow
            to="/app/expert/apply"
            leading={
              <UserRound aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Apply to practise"
            meta="If you're a licensed expert"
          />
        </ListGroup>

        <ListGroup>
          <ListRow
            to="/app/account/close"
            leading={<Trash2 aria-hidden className="size-4 text-error" strokeWidth={1.5} />}
            title={<span className="text-error">Close my account</span>}
          />
          <ListRow
            onClick={() => {
              setSession({ authenticated: false, access: "SESSION_REVOKED" });
              navigate("/app/sign-in");
            }}
            leading={
              <LogOut aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Sign out"
          />
        </ListGroup>

        {/* The support lifecycle gives a reference, a status and a response
            window. Email stays a fallback, not the route in. */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 pt-2 text-body-sm text-base-content/55">
          <Link
            to="/app/support"
            className="inline-flex min-h-11 items-center gap-2 text-label text-primary underline-offset-2 hover:underline"
          >
            <LifeBuoy aria-hidden className="size-4" strokeWidth={1.5} />
            Get help and track your request
          </Link>
          <span>
            or email <span className="font-mono">support@monovella.com</span>
          </span>
        </p>
      </div>
    </MobileScreen>
  );
}

/** P59 — Device Sessions. One action anyone actually needs: get out. */
export function Devices() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "conflict", "forbidden"],
    "this device change",
  );
  const { data, update, toast, setSession } = usePrototype();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const others = data.deviceSessions.filter((d) => !d.is_current);

  return (
    <MobileScreen title="Where you're signed in" back="/app/account" tabs="none">
      <div data-screen="P59" className="space-y-4">
        {mutation.node}
        <Card>
          <p className="text-body">
            You're signed in on this device
            {others.length ? ` and ${others.length} other${others.length === 1 ? "" : "s"}` : ""}.
          </p>
          {others.length ? (
            <p className="measure mt-2 text-body-sm text-base-content/65">
              If one of them is a phone you no longer have, sign it out.
            </p>
          ) : null}
        </Card>

        <ListGroup label="Active sessions">
          {data.deviceSessions.map((device) => (
            <ListRow
              key={device.id}
              chevron={false}
              title={device.is_current ? "This device" : `Device ${device.id.slice(-3)}`}
              meta={`Last seen ${formatDateTime(device.last_seen_at ?? device.created_at)}`}
              trailing={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    update((draft) => {
                      draft.deviceSessions = draft.deviceSessions.filter(
                        (item) => item.id !== device.id,
                      );
                    });
                    if (device.is_current) {
                      setSession({ authenticated: false, access: "SESSION_REVOKED" });
                      navigate("/app/sign-in");
                    } else {
                      toast("Device signed out.");
                    }
                  }}
                >
                  Sign out
                </Button>
              }
            />
          ))}
        </ListGroup>

        {others.length ? (
          <Button variant="secondary" full onClick={() => setConfirm(true)}>
            Sign out everywhere
          </Button>
        ) : null}

        <Modal
          open={confirm}
          onClose={() => setConfirm(false)}
          title="Sign out everywhere?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  update((d) => {
                    d.deviceSessions = [];
                  });
                  setConfirm(false);
                  setSession({ authenticated: false, access: "SESSION_REVOKED" });
                  navigate("/app/sign-in");
                }}
              >
                Sign out everywhere
              </Button>
            </>
          }
        >
          Every device, including this one, will need your phone number, PIN, and second step to get
          back in.
        </Modal>
      </div>
    </MobileScreen>
  );
}

/** P60 — Recovery Email. */
export function RecoveryEmail() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "rate_limited"],
    "your recovery email",
  );
  const { data, update, toast } = usePrototype();
  const [state, setState] = useState<"none" | "pending" | "verified">(
    data.user.recovery_email_verified_at
      ? "verified"
      : data.user.recovery_email
        ? "pending"
        : "none",
  );
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [removing, setRemoving] = useState(false);

  return (
    <MobileScreen title="Recovery email" back="/app/account" tabs="none">
      <div data-screen="P60" className="space-y-4">
        {mutation.node}
        <ScreenStates
          states={[
            { value: "none", label: "None set" },
            { value: "pending", label: "Pending code" },
            { value: "verified", label: "Verified" },
          ]}
          value={state}
          onChange={setState}
        />

        <p className="measure text-body text-base-content/75">
          This is how you get back in if you lose access to your phone. Without it, recovery falls
          back to your NIN or a support request that takes longer.
        </p>

        {state === "verified" ? (
          <>
            <Card>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-record">{data.user.recovery_email}</p>
                <Badge tone="success">Verified</Badge>
              </div>
              <p className="mt-2 text-body-sm text-base-content/60">
                Added {formatDate("2026-02-14T10:00:00")}
              </p>
            </Card>
            <Button variant="ghost" full onClick={() => setRemoving(true)}>
              Remove this email
            </Button>
          </>
        ) : state === "pending" ? (
          <>
            <p className="measure text-body-sm text-base-content/70">
              We sent a code to <span className="font-mono">{email || "a•••a@gmail.com"}</span>.
            </p>
            <OtpInput value={code} onChange={setCode} />
            <Button
              full
              disabled={mutation.blocked || code.length < 6}
              onClick={() => {
                if (code !== DEMO_CODES.recoveryEmailOtp) {
                  toast("That recovery-email code is not correct.");
                  setCode("");
                  return;
                }
                update((draft) => {
                  draft.user.recovery_email = email || draft.user.recovery_email;
                  draft.user.recovery_email_verified_at = now().toISOString().slice(0, 19);
                });
                setState("verified");
                toast("Recovery email verified.");
              }}
            >
              Verify
            </Button>
          </>
        ) : (
          <>
            <Field label="Email address">
              {(p) => (
                <Input
                  {...p}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>
            <Button
              full
              disabled={mutation.blocked || !email.includes("@")}
              onClick={() => {
                update((draft) => {
                  draft.user.recovery_email = email;
                  draft.user.recovery_email_verified_at = null;
                });
                setState("pending");
              }}
            >
              Send a code
            </Button>
          </>
        )}

        <Modal
          open={removing}
          onClose={() => setRemoving(false)}
          title="Remove your recovery email?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setRemoving(false)}>
                Keep it
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setState("none");
                  update((draft) => {
                    draft.user.recovery_email = null;
                    draft.user.recovery_email_verified_at = null;
                  });
                  setRemoving(false);
                  toast("Recovery email removed.");
                }}
              >
                Remove it
              </Button>
            </>
          }
        >
          Email recovery stops being available. You'd fall back to your NIN, or a support request
          that takes longer.
        </Modal>
      </div>
    </MobileScreen>
  );
}

/** P61 — Close Account. Real friction, the good kind. */
export function CloseAccount() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "forbidden", "conflict"],
    "your closure request",
  );
  const [typed, setTyped] = useState("");
  const [confirm, setConfirm] = useState(false);
  const navigate = useNavigate();
  const { requestAccountClosure, toast } = usePrototype();

  return (
    <MobileScreen title="Close your account" back="/app/account" tabs="none">
      <div data-screen="P61" className="space-y-4">
        {mutation.node}
        <Banner tone="warning">Access ends as soon as you confirm.</Banner>
        <Card>
          <p className="font-heading text-h3">What happens to your record</p>
          <ul className="measure mt-2 space-y-2 text-body text-base-content/80">
            <li>
              Access closes immediately. The planned service revokes every session and anonymises
              login and contact details first.
            </li>
            <li>
              Clinical and payment records are not erased on request while a retention floor
              applies. The current architecture assumes six years after the record, or age 21 plus
              six years for records made while a patient was a minor. Qualified Nigerian counsel
              must approve the final rule.
            </li>
            <li>
              Dependants keep their own records and are outside closure of the guardian's account.
              Reports already shared remain with their recipient unless you revoke an active share
              before closing.
            </li>
            <li>
              This prototype only records the request, blocks access and preserves fixture data for
              audit and reset. It does not run anonymisation, retention expiry or a deletion worker.
            </li>
          </ul>
        </Card>
        <Field label="Type CLOSE to confirm">
          {(p) => (
            <Input
              {...p}
              value={typed}
              onChange={(e) => setTyped(e.target.value.toUpperCase())}
              className="font-mono"
            />
          )}
        </Field>
        <Button
          variant="destructive"
          full
          disabled={mutation.blocked || typed !== "CLOSE"}
          onClick={() => setConfirm(true)}
        >
          Close my account
        </Button>
        <ButtonLink to="/app/reports" variant="secondary" full>
          Export first
        </ButtonLink>

        <Modal
          open={confirm}
          onClose={() => setConfirm(false)}
          irreversible
          title="Request account closure?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  requestAccountClosure();
                  toast("Account closure requested. You have been signed out.");
                  navigate("/app/welcome", { replace: true });
                }}
              >
                Yes, close it
              </Button>
            </>
          }
        >
          Last check. This immediately blocks protected access in the demo. Retained clinical,
          payment, dependant and shared-report records are not promised to disappear.
        </Modal>
      </div>
    </MobileScreen>
  );
}

/**
 * P67 — Invite a Friend. One thing: hand over a link. Not a rewards programme —
 * no credit, no counter, no leaderboard, ever.
 */
export function Invite() {
  const { data, update, toast } = usePrototype();
  const patientId = selfPatient(data)?.id;
  const referral = referralCodeFor(data, patientId ?? "");
  useEffect(() => {
    if (patientId && !referral)
      update((draft) => {
        ensurePatientInvitation(draft, patientId);
      });
  }, [patientId, referral, update]);
  const referralLink = `https://monovella.com/?ref=${encodeURIComponent(referral?.referral_code ?? "")}`;

  const share = async () => {
    if (!referral) return;
    try {
      if (!navigator.share) {
        if (!navigator.clipboard) {
          toast("Sharing is unavailable. Select and copy the link shown on this page.");
          return;
        }
        await navigator.clipboard.writeText(referralLink);
        toast("Invite link copied. Your browser does not provide a share sheet.");
        return;
      }
      await navigator.share({
        title: "Start your own Monovella ID",
        text: "I invited you to explore Monovella.",
        url: referralLink,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast("Sharing did not finish. Select and copy the link shown on this page.");
    }
  };

  if (!referral)
    return (
      <MobileScreen title="Invite a friend" back="/app/account" tabs="none">
        <p>Preparing your invitation link…</p>
      </MobileScreen>
    );
  return (
    <MobileScreen title="Invite a friend" back="/app/account" tabs="none">
      <div data-screen="P67" className="space-y-4">
        <p className="measure text-body text-base-content/75">
          Anyone who signs up with your link starts their own Monovella ID.
        </p>
        <Card>
          <p className="break-all font-mono text-record text-primary">{referralLink}</p>
        </Card>
        <div className="grid grid-cols-2 gap-2">
          <CopyButton text={referralLink} label="Copy link" copiedLabel="Link copied" />
          <Button variant="secondary" onClick={share}>
            <Share2 aria-hidden className="size-4" strokeWidth={1.5} />
            Share
          </Button>
        </div>
        <p className="measure text-body-sm text-base-content/60">
          This invitation code is separate from your Monovella ID. Sharing it does not share your
          health record or give anyone permission to open it.
        </p>
      </div>
    </MobileScreen>
  );
}

/** P62 — Account Restricted. Never punitive; always says what's still available. */
export function Restricted() {
  return (
    <MobileScreen title="Account under review" back="/app/account" tabs="none">
      <div data-screen="P62" className="space-y-4">
        <StandingBanner audience="patient" />
        <Card>
          <p className="measure text-body">
            Monovella staff are reviewing something on this account. While that's happening you
            can't request a new consultation.
          </p>
          <p className="measure mt-3 text-body">
            Everything else works as normal: logging, your calendar, Teni, your existing
            consultations, your reports, and any prescription or lab order already open.
          </p>
        </Card>
        <p className="text-body-sm text-base-content/60">
          Questions? Email <span className="font-mono">support@monovella.com</span>.
        </p>
      </div>
    </MobileScreen>
  );
}

/**
 * P58a — Personal Information. Shared between Patient and Expert mode — same
 * account, same name and photo either way, so saving here updates both
 * identities at once rather than leaving them to drift apart.
 */
export function PersonalInformation() {
  const { data, session } = usePrototype();
  return (
    <PersonalInformationForm
      key={`${session.role}:${session.expertId}:${data.accountPatientId ?? "demo"}`}
    />
  );
}

function PersonalInformationForm() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "conflict"],
    "your personal details",
  );
  const { data, session, update, toast } = usePrototype();
  const inExpertMode = session.role === "expert";
  const ownExpertId = data.accountExpertId ?? EXPERT_ID;
  const identity = inExpertMode ? expertById(data, session.expertId) : selfPatient(data);
  const backTo = inExpertMode ? "/app/expert/account" : "/app/account";

  const [firstName, setFirstName] = useState(identity?.first_name ?? "");
  const [lastName, setLastName] = useState(identity?.last_name ?? "");
  const [photo, setPhoto] = useState<string | null>(identity?.photo_url ?? null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoRead = useRef(0);
  useEffect(
    () => () => {
      photoRead.current += 1;
    },
    [],
  );
  const [phone] = useState(data.user.phone);
  const [error, setError] = useState(false);

  if (!identity) return null;

  return (
    <MobileScreen title="Personal information" back={backTo} tabs="none">
      <div data-screen="P58a" className="space-y-5">
        {mutation.node}
        <div className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-h2 text-primary-content">
            {photo ? (
              <img src={photo} alt="" className="size-16 rounded-full object-cover" />
            ) : (
              `${firstName[0] ?? ""}${lastName[0] ?? ""}`
            )}
          </span>
          <FileDrop
            label={photo ? "Change photo" : "Add a photo"}
            kind="PROFILE_PHOTO"
            onUploadingChange={setPhotoBusy}
            filename={photo ? "profile-photo.jpg" : null}
            onFile={async (file) => {
              const generation = ++photoRead.current;
              setPhotoBusy(true);
              setPhotoError(null);
              try {
                const preview = await profilePhotoDataUrl(file);
                if (photoRead.current === generation) setPhoto(preview);
              } catch {
                if (photoRead.current === generation)
                  setPhotoError("We could not open that image. Choose another JPG or PNG.");
              } finally {
                if (photoRead.current === generation) setPhotoBusy(false);
              }
            }}
            onRemove={
              photo
                ? () => {
                    photoRead.current += 1;
                    setPhoto(null);
                    setPhotoBusy(false);
                    setPhotoError(null);
                  }
                : undefined
            }
          />
        </div>

        {photoError ? <Banner tone="error">{photoError}</Banner> : null}
        <Field label="First name" error={error && !firstName.trim() ? "Enter a first name." : null}>
          {(p) => <Input {...p} value={firstName} onChange={(e) => setFirstName(e.target.value)} />}
        </Field>
        <Field label="Last name" error={error && !lastName.trim() ? "Enter a last name." : null}>
          {(p) => <Input {...p} value={lastName} onChange={(e) => setLastName(e.target.value)} />}
        </Field>

        <div className="flex items-center justify-between gap-3 rounded-brand border border-base-300 bg-base-200 px-4 py-3">
          <div>
            <p className="text-label font-medium">Phone number</p>
            <p className="mt-0.5 font-mono text-record text-base-content/70">{phone}</p>
          </div>
          <ButtonLink to="/app/account/change-phone" size="sm" variant="secondary">
            Change
          </ButtonLink>
        </div>

        <Button
          full
          disabled={mutation.blocked || photoBusy}
          onClick={() => {
            if (mutation.blocked || photoBusy) return;
            if (!firstName.trim() || !lastName.trim()) {
              setError(true);
              return;
            }
            update((d) => {
              // Only the account's own two identities share personal details.
              // Other demonstration seats are separate people.
              const patient =
                !inExpertMode || session.expertId === ownExpertId ? selfPatient(d) : undefined;
              const expert = expertById(d, inExpertMode ? session.expertId : ownExpertId);
              if (patient) {
                patient.first_name = firstName.trim();
                patient.last_name = lastName.trim();
                patient.photo_url = photo;
              }
              if (expert) {
                expert.first_name = firstName.trim();
                expert.last_name = lastName.trim();
                expert.photo_url = photo;
              }
            });
            toast("Personal information saved.");
          }}
        >
          Save
        </Button>
      </div>
    </MobileScreen>
  );
}

/**
 * P58a sub-flow — Change Phone Number. A re-verification event, not a plain
 * field edit, so it reuses P3's OTP pattern rather than a bare text field.
 */
export function ChangePhoneNumber() {
  useTick();
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "rate_limited", "conflict"],
    "your new phone number",
  );
  const { update, toast } = usePrototype();
  const navigate = useNavigate();
  const savedPhoneChange = readAuthJourney().phone_change;
  const locked =
    !!savedPhoneChange.challenge && challengeStatus(savedPhoneChange.challenge, now()) === "LOCKED";
  const [step, setStep] = useState<"enter" | "code">(savedPhoneChange.challenge ? "code" : "enter");
  const [phone, setPhone] = useState(savedPhoneChange.phone);
  const [code, setCode] = useState("");
  const [inUse, setInUse] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  return (
    <MobileScreen title="Change phone number" back="/app/account/personal" tabs="none">
      <div data-screen="Change Phone Number" className="space-y-5">
        {mutation.node}
        {locked ? (
          <Banner tone="warning">
            Too many incorrect codes. Wait until{" "}
            {formatDateTime(savedPhoneChange.challenge!.locked_until)} to try again.
          </Banner>
        ) : null}
        {step === "enter" ? (
          <>
            <p className="measure text-body text-base-content/75">
              We'll text a code to confirm it's you before this takes effect.
            </p>
            <Field
              label="New phone number"
              error={inUse ? "This phone number is already in use on another account." : null}
            >
              {(p) => (
                <Input
                  {...p}
                  type="tel"
                  inputMode="tel"
                  numeric
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setInUse(false);
                  }}
                />
              )}
            </Field>
            <Button
              full
              disabled={mutation.blocked || locked || phone.length < 10}
              onClick={() => {
                if (mutation.blocked || locked) return;
                if (phone.replace(/\D/g, "").endsWith("119034")) {
                  setInUse(true);
                  return;
                }
                updateAuthJourney((draft) => {
                  draft.phone_change = {
                    phone,
                    challenge: issueOtp("PHONE_CHANGE", phone, now()),
                  };
                });
                setStep("code");
              }}
            >
              Send a code
            </Button>
          </>
        ) : (
          <>
            <p className="measure text-body-sm text-base-content/70">
              Enter the code we sent to <span className="font-mono">{phone}</span>.
            </p>
            <OtpInput value={code} onChange={setCode} />
            {codeError ? <Banner tone="error">{codeError}</Banner> : null}
            <Button
              full
              disabled={mutation.blocked || locked || code.length < 6}
              onClick={() => {
                if (mutation.blocked || locked) return;
                const change = readAuthJourney().phone_change;
                const challenge = change.challenge;
                if (
                  challenge?.purpose !== "PHONE_CHANGE" ||
                  challenge.destination !== phone ||
                  change.phone !== phone
                ) {
                  setCodeError(
                    "This verification no longer matches the phone number. Start again.",
                  );
                  return;
                }
                if (!challenge || challengeStatus(challenge, now()) === "EXPIRED") {
                  setCodeError("That code has expired. Start the phone change again.");
                  return;
                }
                if (challengeStatus(challenge, now()) === "LOCKED") return;
                if (code !== DEMO_CODES.phoneChangeOtp) {
                  updateAuthJourney((draft) => {
                    if (draft.phone_change.challenge)
                      recordFailedOtp(draft.phone_change.challenge, now());
                  });
                  setCode("");
                  setCodeError("That code is not correct.");
                  return;
                }
                update((draft) => {
                  draft.user.phone = phone;
                });
                updateAuthJourney((draft) => {
                  draft.phone_change = { phone: "", challenge: null };
                });
                toast("Phone number updated.");
                navigate("/app/account/personal");
              }}
            >
              Verify
            </Button>
            <Button
              full
              variant="secondary"
              disabled={locked}
              onClick={() => {
                if (locked) return;
                updateAuthJourney((draft) => {
                  draft.phone_change = { phone: "", challenge: null };
                });
                setCode("");
                setCodeError(null);
                setStep("enter");
              }}
            >
              Start again
            </Button>
          </>
        )}
      </div>
    </MobileScreen>
  );
}

/** P58b — Payment Methods. Card entry never touches this API — a hosted Nomba checkout does. */
export function PaymentMethods() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "conflict"],
    "your payment methods",
  );
  const { data, update, toast } = usePrototype();
  const [removing, setRemoving] = useState<string | null>(null);
  const methods = data.paymentMethods;

  return (
    <MobileScreen title="Payment methods" back="/app/account" tabs="none">
      <div data-screen="P58b" className="space-y-4">
        {mutation.node}
        {methods.length ? (
          <ListGroup>
            {methods.map((m) => (
              <ListRow
                key={m.id}
                chevron={false}
                leading={
                  <CreditCard
                    aria-hidden
                    className="size-4 text-base-content/45"
                    strokeWidth={1.5}
                  />
                }
                title={`${m.brand} •••• ${m.last4}`}
                meta={
                  <span className="font-mono text-record">
                    Expires {String(m.expiry_month).padStart(2, "0")}/{m.expiry_year}
                  </span>
                }
                trailing={
                  <button
                    type="button"
                    aria-label={`Remove ${m.brand} ending ${m.last4}`}
                    onClick={() => setRemoving(m.id)}
                    className="flex size-9 items-center justify-center rounded-brand text-base-content/45 hover:bg-base-300 hover:text-error"
                  >
                    <Trash2 aria-hidden className="size-4" strokeWidth={1.5} />
                  </button>
                }
              />
            ))}
          </ListGroup>
        ) : (
          <EmptyState
            title="No saved cards"
            body="Add a card for faster Monovella checkout without re-entering it."
          />
        )}

        <ButtonLink to="/app/card?add=1" full variant="secondary">
          Add a card
        </ButtonLink>

        <p className="measure text-body-sm text-base-content/55">
          Saved cards are optional for a faster Monovella checkout. Card details stay in the hosted
          payment flow, and Transfer remains available when checkout enables it.
        </p>

        <Modal
          open={!!removing}
          onClose={() => setRemoving(null)}
          title="Remove this card?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setRemoving(null)}>
                Keep it
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  update((d) => {
                    d.paymentMethods = d.paymentMethods.filter((m) => m.id !== removing);
                  });
                  setRemoving(null);
                  toast("Card removed.");
                }}
              >
                Remove it
              </Button>
            </>
          }
        >
          You can add it again later if you need to.
        </Modal>
      </div>
    </MobileScreen>
  );
}

/** The switchable rows, as opposed to the row's own id, scope and subject. */
type PreferenceToggle = {
  [K in keyof NotificationPreferenceRead]: NotificationPreferenceRead[K] extends boolean | null
    ? K
    : never;
}[keyof NotificationPreferenceRead];

/** P58c — Notification Preferences. One channel (push) in V0, so no channel matrix. */
export function NotificationPreferences() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "conflict"],
    "your notification preferences",
  );
  const { data, session, update, toast } = usePrototype();
  const isExpert = session.role === "expert";
  const scope = isExpert ? "expert" : "patient";
  const prefs = notificationPrefsFor(data, scope);

  const toggle = (key: PreferenceToggle) => {
    update((draft) => {
      const row = notificationPrefsFor(draft, scope);
      row[key] = !row[key];
    });
    toast("Saved.");
  };

  return (
    <MobileScreen title="Notification preferences" back="/app/account" tabs="none">
      <div data-screen="P58c" className="space-y-4">
        {mutation.node}
        <ListGroup>
          {!isExpert ? (
            <Checkbox
              label="Appointment reminders"
              description="Before an upcoming consultation."
              checked={prefs.appointment_reminders ?? false}
              onChange={() => toggle("appointment_reminders")}
              className="px-4 py-3"
            />
          ) : (
            <Checkbox
              label="Incoming request alerts"
              description="When a patient requests a consultation."
              checked={prefs.incoming_request_alerts ?? false}
              onChange={() => toggle("incoming_request_alerts")}
              className="px-4 py-3"
            />
          )}
          <Checkbox
            label="Payment & fee updates"
            description="Charges, confirmations and disputes."
            checked={prefs.payment_fee_updates ?? false}
            onChange={() => toggle("payment_fee_updates")}
            className="px-4 py-3"
          />
          {isExpert ? (
            <Checkbox
              label="Credential & licence reminders"
              description="Before a licence expires."
              checked={prefs.credential_licence_reminders ?? false}
              onChange={() => toggle("credential_licence_reminders")}
              className="px-4 py-3"
            />
          ) : null}
          <Checkbox
            label="Product updates"
            description="Occasional news about Monovella itself."
            checked={prefs.product_updates ?? false}
            onChange={() => toggle("product_updates")}
            className="px-4 py-3"
          />
        </ListGroup>
      </div>
    </MobileScreen>
  );
}

/** P59a — Change PIN. Voluntary, from Settings — distinct from P10's recovery reset. */
export function ChangePin() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "rate_limited"],
    "your new PIN",
  );
  const { toast, setSession } = usePrototype();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const forced = params.get("forced") === "1" || readAuthJourney().force_credential_change;
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [wrongCurrent, setWrongCurrent] = useState(false);

  const mismatch = next.length === 6 && confirm.length === 6 && next !== confirm;

  return (
    <MobileScreen title="Change PIN" back={forced ? undefined : "/app/account"} tabs="none">
      <div data-screen="P59a" className="space-y-5">
        {mutation.node}
        {forced ? (
          <Banner tone="warning">
            Your sign-in is paused until you replace this PIN. Your account and records are
            unchanged.
          </Banner>
        ) : null}
        <PinInput
          label="Current PIN"
          error={wrongCurrent ? "Incorrect current PIN." : null}
          value={current}
          onChange={(value) => {
            setCurrent(value);
            setWrongCurrent(false);
          }}
        />
        <PinInput label="New PIN" autoComplete="new-password" value={next} onChange={setNext} />
        <PinInput
          label="Confirm new PIN"
          autoComplete="new-password"
          error={mismatch ? "Those two PINs don't match." : null}
          value={confirm}
          onChange={setConfirm}
        />
        <Button
          full
          disabled={mutation.blocked || current.length < 6 || next.length < 6 || next !== confirm}
          onClick={() => {
            if (current !== readAuthJourney().pin) {
              setWrongCurrent(true);
              return;
            }
            updateAuthJourney((draft) => {
              draft.pin = next;
              draft.force_credential_change = false;
            });
            const returnTo = readAuthJourney().mobile_return_to;
            updateAuthJourney((draft) => {
              draft.mobile_return_to = null;
            });
            setSession({ authenticated: true, access: "GRANTED" });
            toast("PIN changed.");
            navigate(
              forced && returnTo?.startsWith("/app/") ? returnTo : forced ? "/app" : "/app/account",
            );
          }}
        >
          Change PIN
        </Button>
      </div>
    </MobileScreen>
  );
}

/** P59b — Biometric Unlock. A faster way to use the same PIN, never framed as a second factor. */
export function BiometricUnlock() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "forbidden"],
    "biometric unlock",
  );
  const { data, update, toast } = usePrototype();
  const [state, setState] = useState<
    "disabled" | "enabling" | "enabled" | "unsupported" | "cancelled"
  >(data.user.biometric_enabled ? "enabled" : "disabled");
  const timer = useRef<number | null>(null);

  return (
    <MobileScreen title="Biometric unlock" back="/app/account" tabs="none">
      <div data-screen="P59b" className="space-y-4">
        {mutation.node}
        <ScreenStates
          states={[
            { value: "disabled", label: "Disabled" },
            { value: "enabled", label: "Enabled" },
            { value: "unsupported", label: "Unsupported device" },
            { value: "cancelled", label: "Device prompt cancelled" },
          ]}
          value={state === "enabling" ? "disabled" : state}
          onChange={setState}
        />

        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-heading text-h3">Unlock faster</p>
              <p className="measure mt-1 text-body-sm text-base-content/65">
                {state === "unsupported"
                  ? "Your device doesn't support Face ID or fingerprint unlock."
                  : "Use Face ID or your fingerprint instead of your PIN."}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Biometric unlock"
              aria-checked={state === "enabled"}
              disabled={mutation.blocked || state === "unsupported" || state === "enabling"}
              onClick={() => {
                if (state === "enabled") {
                  update((draft) => {
                    draft.user.biometric_enabled = false;
                  });
                  setState("disabled");
                  toast("Biometric unlock turned off.");
                  return;
                }
                setState("enabling");
                timer.current = window.setTimeout(() => {
                  update((draft) => {
                    draft.user.biometric_enabled = true;
                  });
                  setState("enabled");
                  toast("Biometric unlock turned on.");
                }, 700);
              }}
              className="relative h-7 w-12 shrink-0 rounded-full bg-base-300 transition-colors disabled:opacity-40 data-[on=true]:bg-primary"
              data-on={state === "enabled"}
            >
              <span
                className="absolute top-1 left-1 size-5 rounded-full bg-base-100 transition-transform"
                style={{ transform: state === "enabled" ? "translateX(20px)" : "translateX(0)" }}
              />
            </button>
          </div>
        </Card>

        {state === "enabling" ? (
          <>
            <p className="text-center text-body-sm text-base-content/60">
              Confirming with your device…
            </p>
            <Button
              full
              variant="secondary"
              onClick={() => {
                if (timer.current) window.clearTimeout(timer.current);
                updateAuthJourney((draft) => {
                  draft.two_factor.biometric_result = "CANCELLED";
                });
                setState("cancelled");
              }}
            >
              Cancel device check
            </Button>
          </>
        ) : null}
        {state === "cancelled" ? (
          <Banner tone="info">Biometric setup was cancelled. Your PIN still works.</Banner>
        ) : null}
        {state === "unsupported" ? (
          <Banner tone="warning">Biometric unlock is unavailable on this device.</Banner>
        ) : null}
        {state === "enabled" ? (
          <p className="measure text-body-sm text-base-content/60">
            You can still use your PIN any time — this doesn't replace it, just skips typing it.
          </p>
        ) : null}
      </div>
    </MobileScreen>
  );
}

/** P59c — TOTP enrollment. The prototype models a completed enrollment only. */
export function TwoFactorAuthentication() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "rate_limited", "conflict"],
    "your two-step verification",
  );
  const { data, update, toast } = usePrototype();
  const setting = twoFactorFor(data, "mobile");
  const [enrolling, setEnrolling] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);

  return (
    <MobileScreen title="Two-step verification" back="/app/account" tabs="none">
      <div data-screen="P59c" className="space-y-4">
        {mutation.node}
        <Card>
          <p className="font-heading text-h3">
            {setting.enabled ? "Authenticator app connected" : "Add stronger sign-in protection"}
          </p>
          <p className="measure mt-1 text-body-sm text-base-content/70">
            {setting.enabled
              ? "You'll enter an authenticator code when Monovella needs to verify a new sign-in or a sensitive change."
              : "Use an authenticator app as a second factor after your phone number and PIN."}
          </p>
        </Card>

        {setting.enabled ? (
          <>
            <Card>
              <DataRow label="Method" value="Authenticator app" mono={false} />
              <DataRow
                label="Recovery codes left"
                value={String(setting.recovery_codes_remaining)}
              />
            </Card>
            {showRecoveryCodes ? (
              <Banner tone="info">
                Prototype recovery code:{" "}
                <span className="font-mono">{DEMO_CODES.recoveryCode}</span>. Store real recovery
                codes outside this device.
              </Banner>
            ) : null}
            <Button
              variant="secondary"
              full
              onClick={() => {
                update((draft) => {
                  twoFactorFor(draft, "mobile").recovery_codes_remaining = 8;
                });
                updateAuthJourney((draft) => {
                  draft.two_factor.recovery_codes = [DEMO_CODES.recoveryCode];
                });
                setShowRecoveryCodes(true);
                toast("Previous recovery codes replaced.");
              }}
            >
              Regenerate recovery codes
            </Button>
            <Button variant="destructive" full onClick={() => setConfirmDisable(true)}>
              Turn off two-step verification
            </Button>
          </>
        ) : enrolling ? (
          <>
            <Card>
              <p className="font-heading text-h3">Finish in your authenticator app</p>
              <p className="measure mt-1 text-body-sm text-base-content/70">
                The real product displays a one-time QR code here. This static prototype never
                generates or exposes a real secret.
              </p>
            </Card>
            <div>
              <p className="mb-2 px-1 text-label font-medium">Six-digit code</p>
              <OtpInput value={code} onChange={setCode} />
            </div>
            {codeError ? <Banner tone="error">That authenticator code is not valid.</Banner> : null}
            <Button
              full
              disabled={mutation.blocked || code.length < 6}
              onClick={() => {
                if (code !== DEMO_CODES.authenticatorOtp) {
                  setCode("");
                  setCodeError(true);
                  return;
                }
                update((draft) => {
                  const row = twoFactorFor(draft, "mobile");
                  row.enabled = true;
                  row.method = "TOTP";
                  row.recovery_codes_remaining = 8;
                });
                updateAuthJourney((draft) => {
                  draft.two_factor.recovery_codes = [DEMO_CODES.recoveryCode];
                });
                setCodeError(false);
                setShowRecoveryCodes(true);
                toast("Two-step verification is on.");
                setEnrolling(false);
              }}
            >
              Confirm and turn on
            </Button>
          </>
        ) : (
          <Button full onClick={() => setEnrolling(true)}>
            Set up authenticator app
          </Button>
        )}

        <Modal
          open={confirmDisable}
          onClose={() => setConfirmDisable(false)}
          title="Turn off two-step verification?"
          footer={
            <>
              <Button variant="secondary" onClick={() => setConfirmDisable(false)}>
                Keep it on
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  update((draft) => {
                    const row = twoFactorFor(draft, "mobile");
                    row.enabled = false;
                    row.method = null;
                    row.recovery_codes_remaining = 0;
                  });
                  setConfirmDisable(false);
                  toast("Two-step verification is off.");
                }}
              >
                Turn it off
              </Button>
            </>
          }
        >
          In the real product this needs a fresh PIN and authenticator-code check. That server-side
          rule is represented in the product contract; this is a static prototype state.
        </Modal>
      </div>
    </MobileScreen>
  );
}

/** P55 — File a Refund Request. The 7-day rule is stated before submission. */
export function FileRefund() {
  const { consultationId } = useParams();
  const { data, session, update, toast, nextId } = usePrototype();
  const navigate = useNavigate();
  const patient = patientById(data, session.viewingPatientId);
  const hasAuthority =
    patient?.id === selfPatient(data)?.id || patient?.guardian_user_id === data.user.id;
  const consultation = hasAuthority
    ? consultationForPatient(data, consultationId ?? "", session.viewingPatientId)
    : undefined;
  const checkout = consultation
    ? data.checkoutPayments.find(
        (payment) =>
          payment.consultation_id === consultation.id &&
          payment.provider_type === "SPECIALIST" &&
          payment.provider_request_id == null,
      )
    : undefined;
  const existingRefund = consultation
    ? data.refundRequests.find(
        (request) =>
          request.patient_id === patient?.id && request.consultation_id === consultation.id,
      )
    : undefined;
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<"default" | "window_closed" | "already_pending">("default");
  const effectiveView = existingRefund ? "already_pending" : view;

  if (!consultation) {
    return (
      <MobileScreen title="Refund" back="/app" patientContext>
        <EmptyState title="Consultation not found" body="" />
      </MobileScreen>
    );
  }

  if (!checkout) {
    return (
      <MobileScreen title="Refund" back="/app" patientContext>
        <EmptyState
          title="Payment not found"
          body="A refund request needs the original consultation checkout. No eligible checkout is linked to this consultation."
        />
      </MobileScreen>
    );
  }

  return (
    <MobileScreen title="Ask for a refund" back tabs="none" patientContext>
      <div data-screen="P55" className="space-y-4">
        <ScreenStates
          states={[
            { value: "default", label: "Default" },
            { value: "window_closed", label: "400 window closed" },
            { value: "already_pending", label: "400 already pending" },
          ]}
          value={effectiveView}
          onChange={setView}
        />

        {effectiveView === "window_closed" ? (
          <EmptyState
            title="The 7-day window has closed"
            body="Refund requests have to be filed within a week of the consultation being accepted. Our team can still look at anything that went wrong: email support@monovella.com."
            action={
              <ButtonLink to={`/app/consultations/${consultation.id}`} variant="secondary">
                Go back
              </ButtonLink>
            }
          />
        ) : effectiveView === "already_pending" ? (
          <EmptyState
            title="You already have a request open on this consultation"
            body="We'll decide on the one you filed. Filing a second doesn't speed it up."
            action={
              existingRefund ? (
                <ButtonLink to={`/app/refunds/${existingRefund.id}`} variant="secondary">
                  See it
                </ButtonLink>
              ) : undefined
            }
          />
        ) : (
          <>
            <p className="measure text-body text-base-content/75">
              This is for a consultation that didn't happen as it should have: the expert didn't
              show, or didn't deliver the consultation you paid for. It covers Monovella's own fee.
            </p>
            <Card>
              <dl className="divide-y divide-base-300">
                <DataRow
                  label="Consultation"
                  value={expertName(data, consultation.expert_id)}
                  mono={false}
                />
                <DataRow label="Date" value={formatDate(consultation.scheduled_start)} />
                <DataRow label="Monovella's fee" value={naira(consultation.platform_fee_kobo)} />
              </dl>
              <p className="mt-3 border-t border-base-300 pt-3 text-body-sm text-base-content/65">
                You have 7 days from acceptance to file. Monovella decides within 48 hours.
              </p>
            </Card>
            <Field label="What happened" optional>
              {(p) => (
                <Textarea
                  {...p}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="The appointment time came and went with no message."
                />
              )}
            </Field>
            <Button
              full
              disabled={submitting}
              onClick={() => {
                if (submitting || existingRefund) return;
                const refundId = nextId("rfd");
                const filedAt = now().toISOString().slice(0, 19);
                const decisionDueBy = new Date(now().getTime() + 48 * 60 * 60_000)
                  .toISOString()
                  .slice(0, 19);
                setSubmitting(true);
                update((draft) => {
                  const currentPatient = patientById(draft, session.viewingPatientId);
                  const authorized =
                    currentPatient?.id === selfPatient(draft)?.id ||
                    currentPatient?.guardian_user_id === draft.user.id;
                  const currentConsultation = authorized
                    ? consultationForPatient(draft, consultation.id, session.viewingPatientId)
                    : undefined;
                  const currentCheckout = draft.checkoutPayments.find(
                    (payment) =>
                      payment.id === checkout.id &&
                      payment.consultation_id === currentConsultation?.id &&
                      payment.provider_type === "SPECIALIST" &&
                      payment.provider_request_id == null,
                  );
                  const duplicate = draft.refundRequests.some(
                    (request) =>
                      request.patient_id === currentPatient?.id &&
                      (request.consultation_id === currentConsultation?.id ||
                        request.checkout_payment_id === currentCheckout?.id),
                  );
                  if (!currentPatient || !currentConsultation || !currentCheckout || duplicate)
                    return;
                  draft.refundRequests = [
                    {
                      id: refundId,
                      consultation_id: currentConsultation.id,
                      checkout_payment_id: currentCheckout.id,
                      patient_id: currentPatient.id,
                      reason: "NON_PERFORMANCE",
                      filed_at: filedAt,
                      decision_due_by: decisionDueBy,
                      decided_at: null,
                      decision: null,
                      decision_final: false,
                      refund_issued: null,
                      elaboration: note.trim() || null,
                    },
                    ...draft.refundRequests,
                  ];
                  draft.refundQueue = [
                    {
                      id: refundId,
                      consultation_id: currentConsultation.id,
                      checkout_payment_id: currentCheckout.id,
                      patient_id: currentPatient.id,
                      reason: "NON_PERFORMANCE",
                      filed_at: filedAt,
                      overdue: false,
                      due_soon: false,
                      amount_kobo: currentConsultation.platform_fee_kobo,
                    },
                    ...draft.refundQueue,
                  ];
                });
                toast("Refund request filed.");
                navigate(`/app/refunds/${refundId}`);
              }}
            >
              {submitting ? "Filing…" : "File the request"}
            </Button>
          </>
        )}
      </div>
    </MobileScreen>
  );
}

/** P56 — Refund Request Status. Same family as P53. */
export function RefundStatus() {
  useTick();
  const { id } = useParams();
  const { data, session } = usePrototype();
  const [view, setView] = useState<"live" | "pending" | "decided">("live");
  const request = data.refundRequests.find(
    (item) => item.id === id && item.patient_id === session.viewingPatientId,
  );

  if (!request) {
    return (
      <MobileScreen title="Refund request" back="/app" tabs="none">
        <div data-screen="P56" className="space-y-4">
          <EmptyState
            title="Refund request unavailable"
            body="This request does not exist or is not available for the patient you are viewing."
            action={
              <ButtonLink to="/app/payments" variant="secondary">
                View payments
              </ButtonLink>
            }
          />
        </div>
      </MobileScreen>
    );
  }

  const shown =
    view === "live"
      ? request
      : view === "decided"
        ? {
            ...request,
            decision_final: true,
            refund_issued: true,
            decision:
              request.decision ??
              "Monovella approved the request after reviewing this consultation's record.",
            decided_at: request.decided_at ?? request.decision_due_by,
          }
        : {
            ...request,
            decision_final: false,
            refund_issued: null,
            decision: null,
            decided_at: null,
          };
  const decided = shown.decision_final;

  return (
    <MobileScreen title="Refund request" back="/app" tabs="none">
      <div data-screen="P56" className="space-y-4">
        <ScreenStates
          states={[
            { value: "live", label: "Live" },
            { value: "pending", label: "Pending" },
            { value: "decided", label: "Decided" },
          ]}
          value={view}
          onChange={setView}
        />

        <Card>
          <Badge tone={decided ? (shown.refund_issued ? "success" : "neutral") : "warning"}>
            {decided ? "Decided" : "Under review"}
          </Badge>
          <p className="measure mt-3 text-body">
            {decided
              ? shown.decision
              : "Monovella is reviewing what happened against the consultation's record."}
          </p>
          <dl className="mt-4 divide-y divide-base-300 border-t border-base-300 pt-2">
            <DataRow label="Filed" value={formatDate(shown.filed_at)} />
            <DataRow
              label={decided ? "Decided" : "Monovella will decide by"}
              value={formatDate(decided ? shown.decided_at : shown.decision_due_by)}
            />
            {decided ? (
              <DataRow
                label="Refund issued"
                value={shown.refund_issued ? "Yes" : "No"}
                mono={false}
              />
            ) : null}
          </dl>
          {!decided && shown.decision_due_by ? (
            <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-base-300 pt-3">
              <span className="text-body-sm text-base-content/60">Time remaining</span>
              <Badge tone="neutral">{formatDateTime(shown.decision_due_by)}</Badge>
            </div>
          ) : null}
        </Card>
      </div>
    </MobileScreen>
  );
}

/** P57 — File a Clinical Complaint. No fee framing at all. */
export function FileComplaint() {
  const { consultationId } = useParams();
  const { data, session, update, toast, nextId } = usePrototype();
  const navigate = useNavigate();
  const consultation = consultationForPatient(data, consultationId ?? "", session.viewingPatientId);
  const [note, setNote] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [attachmentState, setAttachmentState] = useState<"ready" | "failed">("ready");
  const [immediateDanger, setImmediateDanger] = useState(false);

  if (!consultation) {
    return (
      <MobileScreen title="Concern" back="/app" patientContext>
        <EmptyState title="Consultation not found" body="" />
      </MobileScreen>
    );
  }

  const existing = data.clinicalComplaintReferrals.find(
    (complaint) =>
      complaint.consultation_id === consultation.id &&
      complaint.patient_id === session.viewingPatientId,
  );

  if (existing) {
    return (
      <MobileScreen title="" back="/app" tabs="none" patientContext>
        <div className="space-y-4 py-6">
          <h1 className="font-heading text-h1">You already raised this concern</h1>
          <p className="measure text-body text-base-content/80">
            It has one clinical-safety reference. Open it to see its current status and response
            window.
          </p>
          <ButtonLink to={`/app/complaints/${existing.id}`} full>
            Track concern
          </ButtonLink>
        </div>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen title="Raise a concern about the care" back tabs="none" patientContext>
      <div data-screen="P57" className="space-y-4">
        <ScreenStates
          states={[
            { value: "ready", label: "Ready" },
            { value: "failed", label: "Attachment failed" },
          ]}
          value={attachmentState}
          onChange={setAttachmentState}
        />
        <p className="measure text-body text-base-content/80">
          This is different from a refund. It's about the care itself: advice you think was wrong or
          unsafe, something that was missed, or how you were treated. It goes to a person at
          Monovella for review, not to an automated process.
        </p>
        <Card>
          <dl className="divide-y divide-base-300">
            <DataRow
              label="Consultation"
              value={expertName(data, consultation.expert_id)}
              mono={false}
            />
            <DataRow label="Date" value={formatDate(consultation.scheduled_start)} />
          </dl>
        </Card>
        <Field label="What happened">
          {(p) => (
            <Textarea
              {...p}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[160px]"
            />
          )}
        </Field>
        <Checkbox
          checked={immediateDanger}
          onChange={(event) => setImmediateDanger(event.target.checked)}
          label="Someone may be in immediate danger now"
          description="This stops the form and shows urgent in-person care guidance. No case is filed while selected."
        />
        {immediateDanger ? (
          <Banner tone="error">
            Do not wait for this review. Seek immediate in-person emergency care now or contact
            local emergency services. Monovella's support queue is not emergency care or monitoring.
          </Banner>
        ) : null}
        {attachmentState === "failed" ? (
          <Banner tone="error">
            The attachment could not be added. Try again, or send the concern without it. Your text
            is still here.
          </Banner>
        ) : null}
        <FileDrop
          label="Add supporting file (optional)"
          accept="JPG, PNG or PDF"
          filename={attachment}
          onFile={(chosen) => {
            setAttachment(chosen.name);
            setAttachmentState("ready");
          }}
          onRemove={() => setAttachment(null)}
        />
        <Button
          full
          disabled={!note.trim() || immediateDanger}
          onClick={() => {
            const complaintId = nextId("ccr");
            const filedAt = now();
            const filedAtIso = filedAt.toISOString().slice(0, 19);
            const expectedResponseBy = new Date(filedAt.getTime() + 2 * 86_400_000)
              .toISOString()
              .slice(0, 19);
            let reference = complaintId;
            update((draft) => {
              const duplicate = draft.clinicalComplaintReferrals.find(
                (complaint) =>
                  complaint.consultation_id === consultation.id &&
                  complaint.patient_id === session.viewingPatientId,
              );
              if (duplicate) {
                reference = duplicate.id;
                return;
              }
              draft.clinicalComplaintReferrals = [
                {
                  id: complaintId,
                  consultation_id: consultation.id,
                  patient_id: session.viewingPatientId,
                  filed_by_user_id: data.user.id,
                  details: note.trim(),
                  status: "OPEN",
                  triage: "UNASSESSED",
                  filed_at: filedAtIso,
                  expected_response_by: expectedResponseBy,
                  assigned_staff_id: null,
                  reviewed_at: null,
                  resolved_at: null,
                  outcome: null,
                  attachment_name: attachment,
                  escalated_at: null,
                  audit_history: [
                    { at: filedAtIso, actor_type: "PATIENT", action: "FILED", note: null },
                  ],
                  patient_updates: [
                    {
                      at: filedAtIso,
                      message: "Your concern was received for clinical-safety review.",
                    },
                  ],
                  overdue: false,
                  due_soon: false,
                },
                ...draft.clinicalComplaintReferrals,
              ];
            });
            toast(`Clinical-safety concern ${reference} filed.`);
            navigate(`/app/complaints/${reference}`);
          }}
        >
          Send it to Monovella
        </Button>
      </div>
    </MobileScreen>
  );
}

/** P57 status transition: the patient or current guardian can track the clinical-safety referral. */
export function ComplaintStatus() {
  const { id } = useParams();
  const { data, session, update, toast } = usePrototype();
  const complaint = data.clinicalComplaintReferrals.find(
    (item) =>
      item.id === id &&
      item.patient_id === session.viewingPatientId &&
      accountCanManagePatient(data, item.patient_id),
  );

  if (!complaint) {
    return (
      <MobileScreen title="Clinical concern" back="/app" tabs="none" patientContext>
        <EmptyState
          title="Concern not found"
          body="This concern is not available in the current patient record."
        />
      </MobileScreen>
    );
  }

  return (
    <MobileScreen title="Clinical concern" back="/app" tabs="none" patientContext>
      <div data-screen="P57" className="space-y-4">
        <Banner
          tone={
            complaint.triage === "IMMEDIATE_EMERGENCY"
              ? "error"
              : complaint.status === "CLOSED"
                ? "success"
                : "info"
          }
        >
          {complaint.triage === "IMMEDIATE_EMERGENCY"
            ? "Do not wait for this review. Seek immediate in-person emergency care now. This queue is not emergency care or monitoring."
            : complaint.status === "CLOSED"
              ? "Monovella has completed its review."
              : "This is with Monovella's clinical-safety review team."}
        </Banner>
        <Card>
          <dl className="divide-y divide-base-300">
            <DataRow label="Reference" value={complaint.id} />
            <DataRow label="Status" value={complaint.status.replaceAll("_", " ")} mono={false} />
            <DataRow label="Filed" value={formatDateTime(complaint.filed_at)} />
            <DataRow
              label="Expected response by"
              value={formatDateTime(complaint.expected_response_by)}
            />
            <DataRow
              label="Clinical priority"
              value={complaint.triage.replaceAll("_", " ")}
              mono={false}
            />
          </dl>
        </Card>
        {complaint.patient_updates.length ? (
          <Card>
            <p className="font-heading text-h3">Updates</p>
            <div className="mt-2 space-y-3">
              {complaint.patient_updates.map((item) => (
                <div key={`${item.at}-${item.message}`}>
                  <p className="text-body">{item.message}</p>
                  <p className="mt-1 font-mono text-body-sm text-base-content/55">
                    {formatDateTime(item.at)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
        {complaint.status === "CLOSED" ? (
          <Button
            variant="secondary"
            full
            onClick={() => {
              const escalatedAt = now().toISOString().slice(0, 19);
              update((draft) => {
                draft.clinicalComplaintReferrals = draft.clinicalComplaintReferrals.map((item) =>
                  item.id === complaint.id
                    ? {
                        ...item,
                        status: "APPEALED",
                        escalated_at: escalatedAt,
                        audit_history: [
                          ...item.audit_history,
                          {
                            at: escalatedAt,
                            actor_type: "PATIENT",
                            action: "APPEALED",
                            note: null,
                          },
                        ],
                        patient_updates: [
                          ...item.patient_updates,
                          {
                            at: escalatedAt,
                            message: "Your request for escalation was received for another review.",
                          },
                        ],
                      }
                    : item,
                );
              });
              toast("Escalation requested.");
            }}
          >
            Ask for escalation
          </Button>
        ) : null}
        <Card>
          <p className="font-heading text-h3">What you reported</p>
          <p className="measure mt-2 text-body">{complaint.details}</p>
          {complaint.attachment_name ? (
            <p className="mt-3 font-mono text-body-sm text-base-content/65">
              Attachment: {complaint.attachment_name}
            </p>
          ) : null}
          {complaint.outcome ? (
            <p className="measure mt-3 border-t border-base-300 pt-3 text-body">
              Review outcome: {complaint.outcome}
            </p>
          ) : null}
        </Card>
        <p className="measure text-body-sm text-base-content/70">
          If you are worried about your health right now, seek urgent in-person care rather than
          waiting for this review.
        </p>
      </div>
    </MobileScreen>
  );
}
