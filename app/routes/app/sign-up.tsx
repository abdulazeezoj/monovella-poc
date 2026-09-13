import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { OnboardingProgress } from "~/components/shell/onboarding";
import { ScreenStates } from "~/components/shell/state-switcher";
import {
  Banner,
  Button,
  Checkbox,
  Countdown,
  Field,
  Input,
  OtpInput,
  PinInput,
} from "~/components/ui";
import { EXPERT_ID, expertName, PATIENT_ID, patientById, referralCodeFor } from "~/data/selectors";
import {
  challengeStatus,
  DEMO_CODES,
  issueOtp,
  readAuthJourney,
  recordFailedOtp,
  renewOtp,
  resendStatus,
  updateAuthJourney,
} from "~/lib/auth-journey";
import { now } from "~/lib/clock";
import { CONSENT_VERSIONS } from "~/lib/consent-ledger";
import { usePrototype } from "~/store/prototype";

type Step = "form" | "otp" | "pin";
type Variant =
  | "default"
  | "submitting"
  | "already_registered"
  | "invalid_phone"
  | "rate_limited"
  | "sms_failed";
type OtpVariant = "default" | "submitting" | "incorrect" | "expired" | "locked" | "rate_limited";
type PinVariant =
  | "default"
  | "submitting"
  | "mismatch"
  | "validation"
  | "unverified"
  | "conflict"
  | "rate_limited";

/** P2 — Sign Up: Name & Phone, then P3 — OTP, then P4 — Set PIN. */
export default function SignUp() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data, toast, setSession } = usePrototype();
  const saved = readAuthJourney().sign_up;
  const [step, setStep] = useState<Step>(
    saved.step === "OTP" ? "otp" : saved.step === "PIN" ? "pin" : "form",
  );
  const [variant, setVariant] = useState<Variant>("default");
  const [otpVariant, setOtpVariant] = useState<OtpVariant>("default");
  const [pinVariant, setPinVariant] = useState<PinVariant>("default");

  const [first, setFirst] = useState(saved.first_name);
  const [last, setLast] = useState(saved.last_name);
  const [phone, setPhone] = useState(saved.phone);
  const incomingCode = params.get("ref") ?? params.get("code") ?? saved.referral_code;
  const incomingRegion = params.get("region") ?? saved.referral_region;
  const [code, setCode] = useState(incomingCode);
  const [otp, setOtp] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [termsAcknowledged, setTermsAcknowledged] = useState(saved.terms_acknowledged);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(saved.privacy_acknowledged);
  const [policyStale, setPolicyStale] = useState(false);

  const canSubmit = first.trim() && last.trim() && phone.trim();
  const lockedUntil = new Date(now().getTime() + 4 * 60_000 + 32_000).toISOString();

  if (step === "otp") {
    const otpLocked = otpVariant === "locked";
    const otpRateLimited = otpVariant === "rate_limited";
    return (
      <MobileScreen
        title="Check your messages"
        back={{
          label: "Edit phone number",
          onBack: () => {
            setOtpVariant("default");
            setStep("form");
          },
        }}
        tabs="none"
        contentPlacement="center"
      >
        <div data-screen="P3" className="mx-auto w-full max-w-128 space-y-5 py-6">
          <OnboardingProgress current={2} total={5} label="Confirm your phone number" />
          <p className="measure text-body text-base-content/75">
            We sent a 6-digit code to{" "}
            <span className="font-mono text-record">{maskPhoneLocal(phone)}</span>. This confirms
            the number you will use to sign in.
          </p>
          <OtpInput value={otp} onChange={setOtp} disabled={otpLocked} />
          {otpVariant === "incorrect" ? (
            <Banner tone="error">That code is not correct. Enter the newest code we sent.</Banner>
          ) : null}
          {otpVariant === "expired" ? (
            <Banner tone="warning">That code has expired. Request a new code to continue.</Banner>
          ) : null}
          {otpLocked ? (
            <p className="text-body-sm text-base-content/70">
              Too many incorrect attempts. Try again in{" "}
              <Countdown deadline={lockedUntil} elapsedText="now" />
            </p>
          ) : null}
          {otpRateLimited ? (
            <p className="text-body-sm text-base-content/70">
              Too many codes requested. You can try again in{" "}
              <Countdown deadline={lockedUntil} elapsedText="now" />
            </p>
          ) : null}
          <Button
            full
            disabled={otp.length < 6 || otpLocked || otpRateLimited || otpVariant === "submitting"}
            onClick={() => {
              const challenge = readAuthJourney().sign_up.challenge;
              if (!challenge || challengeStatus(challenge, now()) === "EXPIRED") {
                setOtpVariant("expired");
                return;
              }
              if (challengeStatus(challenge, now()) === "LOCKED") {
                setOtpVariant("locked");
                return;
              }
              if (otp !== DEMO_CODES.signUpOtp) {
                const updated = updateAuthJourney((draft) => {
                  if (draft.sign_up.challenge) recordFailedOtp(draft.sign_up.challenge, now());
                });
                setOtp("");
                setOtpVariant(updated.sign_up.challenge?.locked_until ? "locked" : "incorrect");
                return;
              }
              const pending = readAuthJourney().sign_up;
              if (
                pending.terms_version !== CONSENT_VERSIONS.terms ||
                pending.privacy_version !== CONSENT_VERSIONS.privacyNotice
              ) {
                setPolicyStale(true);
                setTermsAcknowledged(false);
                setPrivacyAcknowledged(false);
                updateAuthJourney((draft) => {
                  draft.sign_up.terms_acknowledged = false;
                  draft.sign_up.privacy_acknowledged = false;
                });
                setStep("form");
                return;
              }
              updateAuthJourney((draft) => {
                draft.sign_up.step = "PIN";
              });
              setStep("pin");
            }}
          >
            {otpVariant === "submitting" ? "Verifying code…" : "Verify code"}
          </Button>
          <div className="grid grid-cols-2 gap-2 text-label">
            <button
              type="button"
              disabled={otpLocked || otpRateLimited}
              className="min-h-11 rounded-brand px-3 text-left text-primary hover:bg-base-200 disabled:text-base-content/40"
              onClick={() => {
                const challenge = readAuthJourney().sign_up.challenge;
                if (!challenge) return;
                const status = resendStatus(challenge, now());
                if (status === "RATE_LIMITED") {
                  setOtpVariant("rate_limited");
                  return;
                }
                if (status === "COOLDOWN") {
                  toast("Please wait 30 seconds before requesting another code.");
                  return;
                }
                updateAuthJourney((draft) => {
                  if (draft.sign_up.challenge) renewOtp(draft.sign_up.challenge, now());
                });
                setOtpVariant("default");
                toast("A new demo code was sent.");
              }}
            >
              Resend code
            </button>
            <button
              type="button"
              className="min-h-11 rounded-brand px-3 text-right text-base-content/65 hover:bg-base-200"
              onClick={() => {
                setOtpVariant("default");
                setStep("form");
              }}
            >
              Edit number
            </button>
          </div>
          <ScreenStates
            states={[
              { value: "default", label: "Default" },
              { value: "submitting", label: "Submitting" },
              { value: "incorrect", label: "400 incorrect code" },
              { value: "expired", label: "400 expired code" },
              { value: "locked", label: "423 locked out" },
              { value: "rate_limited", label: "429 resend limit" },
            ]}
            value={otpVariant}
            onChange={(value) => {
              setOtpVariant(value as OtpVariant);
              if (value === "incorrect") setOtp("");
            }}
          />
        </div>
      </MobileScreen>
    );
  }

  if (step === "pin") {
    const mismatch =
      pinVariant === "mismatch" || (pin.length === 6 && pin2.length === 6 && pin !== pin2);
    return (
      <MobileScreen
        title="Set your PIN"
        back={{ label: "Back to verification code", onBack: () => setStep("otp") }}
        tabs="none"
        contentPlacement="center"
      >
        <div data-screen="P4" className="mx-auto w-full max-w-128 space-y-5 py-6">
          <OnboardingProgress current={3} total={5} label="Make your sign-in secure" />
          <p className="measure text-body text-base-content/75">
            This replaces a password. Choose six digits you can use alongside your phone number.
          </p>
          {pinVariant === "unverified" ? (
            <Banner
              tone="info"
              action={
                <Button size="sm" variant="secondary" onClick={() => setStep("otp")}>
                  Return to code
                </Button>
              }
            >
              Confirm your phone number before choosing a PIN.
            </Banner>
          ) : null}
          {pinVariant === "conflict" ? (
            <Banner tone="info">
              This phone number already has a Monovella ID.{" "}
              <Link to="/app/sign-in">Sign in instead.</Link>
            </Banner>
          ) : null}
          {pinVariant === "rate_limited" ? (
            <p className="text-body-sm text-base-content/70">
              Too many attempts. Try again in <Countdown deadline={lockedUntil} elapsedText="now" />
              .
            </p>
          ) : null}
          <PinInput
            label="Choose a PIN"
            autoComplete="new-password"
            error={pinVariant === "validation" ? "Choose a six-digit PIN." : null}
            disabled={pinVariant === "rate_limited"}
            value={pin}
            onChange={setPin}
          />
          <PinInput
            label="Confirm your PIN"
            autoComplete="new-password"
            error={mismatch ? "Those two PINs don't match." : null}
            disabled={pinVariant === "rate_limited"}
            value={pin2}
            onChange={setPin2}
          />
          <Button
            full
            disabled={
              pin.length < 6 ||
              pin !== pin2 ||
              pinVariant === "rate_limited" ||
              pinVariant === "submitting"
            }
            onClick={() => {
              if (pinVariant === "conflict") {
                navigate("/app/sign-in");
                return;
              }
              updateAuthJourney((draft) => {
                draft.pin = pin;
                draft.sign_up.step = "COMPLETE";
              });
              // Creating the PIN is the moment the account exists and the person
              // is signed in. Without this a brand-new account reached the rest
              // of onboarding as an unauthenticated session, which only went
              // unnoticed because the demo session starts already signed in.
              setSession({ authenticated: true, access: "GRANTED" });
              navigate("/app/profile/create");
            }}
          >
            {pinVariant === "submitting" ? "Creating your Monovella ID…" : "Create my Monovella ID"}
          </Button>
          <ScreenStates
            states={[
              { value: "default", label: "Default" },
              { value: "submitting", label: "Submitting" },
              { value: "mismatch", label: "PIN mismatch" },
              { value: "validation", label: "422 PIN validation" },
              { value: "unverified", label: "400 phone not verified" },
              { value: "conflict", label: "409 account exists" },
              { value: "rate_limited", label: "429" },
            ]}
            value={pinVariant}
            onChange={(value) => setPinVariant(value as PinVariant)}
          />
        </div>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen title="Create your Monovella ID" back="/app/welcome" tabs="none">
      <div data-screen="P2" className="mx-auto w-full max-w-128 space-y-5">
        <OnboardingProgress current={1} total={5} label="Start with a few details" />
        <ScreenStates
          states={[
            { value: "default", label: "Default" },
            { value: "submitting", label: "Submitting" },
            { value: "already_registered", label: "200 already_registered" },
            { value: "invalid_phone", label: "422 phone" },
            { value: "rate_limited", label: "429" },
            { value: "sms_failed", label: "502 SMS" },
          ]}
          value={variant}
          onChange={setVariant}
        />

        <p className="measure text-body text-base-content/75">
          We will confirm this number before you choose a six-digit PIN for signing in.
        </p>

        {code === "EXP-ADEYEMI" ? (
          <Banner tone="info">
            Invited by {expertName(data, EXPERT_ID)}
            {incomingRegion ? `, with ${incomingRegion} as your starting area` : ""}. You still
            choose your own care. The invite does not promise availability, endorsement, or free
            care.
          </Banner>
        ) : code === referralCodeFor(data, PATIENT_ID)?.referral_code ? (
          <Banner tone="info">
            Invited by {patientById(data, PATIENT_ID)?.first_name}{" "}
            {patientById(data, PATIENT_ID)?.last_name}. You are creating a separate account that you
            control.
          </Banner>
        ) : null}

        {variant === "already_registered" ? (
          <Banner tone="info">
            This number already has a Monovella ID:{" "}
            <Link to="/app/sign-in" className="underline underline-offset-2">
              sign in instead
            </Link>
            .
          </Banner>
        ) : null}
        {policyStale ? (
          <Banner tone="warning">
            The policy version changed while you were signing up. Review both current documents and
            acknowledge them again. Nothing was recorded from the older version.
          </Banner>
        ) : null}
        {variant === "sms_failed" ? (
          <Banner
            tone="error"
            action={
              <Button size="sm" variant="secondary" onClick={() => setVariant("default")}>
                Retry
              </Button>
            }
          >
            Could not send verification code.
          </Banner>
        ) : null}

        <Field label="First name">
          {(p) => (
            <Input
              {...p}
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              autoComplete="given-name"
            />
          )}
        </Field>
        <Field label="Last name">
          {(p) => (
            <Input
              {...p}
              value={last}
              onChange={(e) => setLast(e.target.value)}
              autoComplete="family-name"
            />
          )}
        </Field>
        <Field
          label="Phone number"
          hint="Use your Nigerian mobile number as you normally write it."
          error={
            variant === "invalid_phone" ? "That phone number isn't a valid Nigerian number." : null
          }
        >
          {(p) => (
            <Input
              {...p}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              numeric
              placeholder="0801 234 5678"
              disabled={variant === "rate_limited"}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          )}
        </Field>

        <section className="space-y-3 rounded-brand border border-base-300 p-4">
          <p className="font-heading text-h3">Before we create your account</p>
          <p className="text-body-sm text-base-content/70">
            These are separate acknowledgements. They do not grant permission for NIN checks, remote
            consultations, referrals, or Pharmacy or Lab disclosure.
          </p>
          <Checkbox
            checked={termsAcknowledged}
            onChange={(event) => setTermsAcknowledged(event.target.checked)}
            label={
              <>
                I have read and agree to the{" "}
                <Link to="/legal/terms" target="_blank" rel="noreferrer" className="underline">
                  Terms
                </Link>
                .
              </>
            }
          />
          <Checkbox
            checked={privacyAcknowledged}
            onChange={(event) => setPrivacyAcknowledged(event.target.checked)}
            label={
              <>
                I have read the{" "}
                <Link to="/legal/privacy" target="_blank" rel="noreferrer" className="underline">
                  Data and Privacy Policy
                </Link>
                .
              </>
            }
          />
          <p className="text-body-sm text-base-content/60">
            Prototype wording only. Qualified Nigerian counsel must approve the final documents and
            evidence rules before launch.
          </p>
        </section>
        {variant === "rate_limited" ? (
          <p className="text-body-sm text-base-content/70">
            Too many codes requested for this number. Try again in{" "}
            <Countdown deadline={lockedUntil} elapsedText="now" />
          </p>
        ) : null}

        {/* The one field allowed to look skippable: it measures a channel, it
            never gates one (§11). */}
        <Field
          label="Have a referral code?"
          optional
          hint="From a friend who invited you. Nothing changes if you skip it."
          className="rounded-brand border border-dashed border-base-300 p-3"
        >
          {(p) => (
            <Input
              {...p}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono text-record"
              placeholder="AMARA-7QK2"
            />
          )}
        </Field>

        <Button
          full
          disabled={
            !canSubmit ||
            !termsAcknowledged ||
            !privacyAcknowledged ||
            variant === "rate_limited" ||
            variant === "submitting"
          }
          onClick={() => {
            if (variant === "already_registered") {
              navigate("/app/sign-in");
              return;
            }
            updateAuthJourney((draft) => {
              draft.sign_up = {
                first_name: first.trim(),
                last_name: last.trim(),
                phone,
                referral_code: code.trim(),
                referral_region: code === "EXP-ADEYEMI" ? incomingRegion : null,
                terms_acknowledged: termsAcknowledged,
                terms_version: CONSENT_VERSIONS.terms,
                privacy_acknowledged: privacyAcknowledged,
                privacy_version: CONSENT_VERSIONS.privacyNotice,
                step: "OTP",
                challenge: issueOtp("SIGN_UP", phone, now()),
              };
            });
            setStep("otp");
          }}
        >
          {variant === "submitting" ? "Sending code…" : "Send code"}
        </Button>
        <p className="text-center text-body-sm text-base-content/65">
          Already have an account?{" "}
          <Link
            to="/app/sign-in"
            className="inline-flex min-h-11 items-center text-primary underline underline-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>
    </MobileScreen>
  );
}

function maskPhoneLocal(phone: string) {
  const digits = phone.replace(/\s/g, "");
  if (digits.length < 6) return digits || "your phone";
  return `${digits.slice(0, 4)}••••${digits.slice(-3)}`;
}
