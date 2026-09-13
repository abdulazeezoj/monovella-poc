import { useState } from "react";
import { useNavigate } from "react-router";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { OnboardingProgress } from "~/components/shell/onboarding";
import { ScreenStates } from "~/components/shell/state-switcher";
import { Banner, Button, Card, Countdown, Field, Input, OtpInput, PinInput } from "~/components/ui";
import {
  abandonRecovery,
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
import { usePrototype } from "~/store/prototype";

type Step = "start" | "email" | "nin" | "support" | "reset";
type StartVariant = "default" | "submitting" | "notfound" | "rate_limited";
type EmailVariant =
  | "default"
  | "submitting"
  | "incorrect"
  | "expired"
  | "not_found"
  | "locked"
  | "rate_limited";
type NinVariant =
  | "default"
  | "submitting"
  | "failed"
  | "mismatch"
  | "unavailable"
  | "not_found"
  | "locked"
  | "rate_limited";
type SupportVariant = "request" | "submitting" | "submitted" | "notfound" | "rate_limited";
type ResetVariant =
  | "default"
  | "submitting"
  | "conflict"
  | "verification_required"
  | "not_found"
  | "validation"
  | "rate_limited";
type VerificationMethod = "email" | "nin";

/** P6-P10, one calm recovery flow with every documented branch reachable. */
export default function Recover() {
  const navigate = useNavigate();
  const { data, update, toast } = usePrototype();
  const savedRecovery = readAuthJourney().recovery;
  const [step, setStep] = useState<Step>(
    savedRecovery.status === "VERIFIED"
      ? "reset"
      : savedRecovery.status === "MANUAL_REVIEW"
        ? "support"
        : savedRecovery.status === "AWAITING_VERIFICATION"
          ? savedRecovery.method === "NIN"
            ? "nin"
            : "email"
          : "start",
  );
  const [identifier, setIdentifier] = useState(savedRecovery.identifier);
  const [code, setCode] = useState("");
  const [nin, setNin] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [startVariant, setStartVariant] = useState<StartVariant>("default");
  const [emailVariant, setEmailVariant] = useState<EmailVariant>("default");
  const [ninVariant, setNinVariant] = useState<NinVariant>("default");
  const [supportVariant, setSupportVariant] = useState<SupportVariant>("request");
  const [resetVariant, setResetVariant] = useState<ResetVariant>("default");
  const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>("email");

  const lockedUntil = new Date(now().getTime() + 190_000).toISOString();
  const cancelRecovery = () => {
    abandonRecovery();
    toast("Recovery cancelled. No sign-in details were changed.");
    navigate("/app/sign-in");
  };

  if (step === "email") {
    const blocked =
      emailVariant === "locked" || emailVariant === "rate_limited" || emailVariant === "not_found";
    return (
      <MobileScreen
        title="Check your email"
        back={{ label: "Back to account search", onBack: () => setStep("start") }}
        tabs="none"
      >
        <div data-screen="P7" className="space-y-5">
          <OnboardingProgress current={2} total={3} label="Confirm it is you" />
          <p className="measure text-body text-base-content/75">
            We sent a code to <span className="font-mono text-record">a•••a@gmail.com</span>. It can
            take a minute or two.
          </p>
          {emailVariant === "incorrect" ? (
            <Banner tone="error">That code is not correct. Enter the latest code we sent.</Banner>
          ) : null}
          {emailVariant === "expired" ? (
            <Banner tone="warning">That code has expired. Request a new code to continue.</Banner>
          ) : null}
          {emailVariant === "not_found" ? (
            <Banner tone="error">
              This recovery request is no longer available. Start again to request a new code.
            </Banner>
          ) : null}
          <OtpInput
            value={code}
            onChange={setCode}
            disabled={blocked}
            label="Email verification code"
          />
          {emailVariant === "locked" ? (
            <p className="text-body-sm text-base-content/70">
              Too many incorrect attempts. Try again in{" "}
              <Countdown deadline={lockedUntil} elapsedText="now" />.
            </p>
          ) : null}
          {emailVariant === "rate_limited" ? (
            <p className="text-body-sm text-base-content/70">
              Too many codes requested. Try again in{" "}
              <Countdown deadline={lockedUntil} elapsedText="now" />.
            </p>
          ) : null}
          <Button
            full
            disabled={code.length < 6 || blocked || emailVariant === "submitting"}
            onClick={() => {
              const challenge = readAuthJourney().recovery.challenge;
              if (!challenge || challengeStatus(challenge, now()) === "EXPIRED") {
                setEmailVariant("expired");
                return;
              }
              if (challengeStatus(challenge, now()) === "LOCKED") {
                setEmailVariant("locked");
                return;
              }
              if (code !== DEMO_CODES.recoveryEmailOtp) {
                const next = updateAuthJourney((draft) => {
                  if (draft.recovery.challenge) recordFailedOtp(draft.recovery.challenge, now());
                });
                setCode("");
                setEmailVariant(next.recovery.challenge?.locked_until ? "locked" : "incorrect");
                return;
              }
              updateAuthJourney((draft) => {
                draft.recovery.method = "EMAIL";
                draft.recovery.status = "VERIFIED";
              });
              setVerificationMethod("email");
              setStep("reset");
            }}
          >
            {emailVariant === "submitting" ? "Checking code…" : "Continue"}
          </Button>
          <div className="grid gap-1 text-label">
            <button
              type="button"
              disabled={blocked}
              className="min-h-11 rounded-brand px-3 text-left text-primary hover:bg-base-200 disabled:text-base-content/40"
              onClick={() => {
                const challenge = readAuthJourney().recovery.challenge;
                if (!challenge) return;
                const status = resendStatus(challenge, now());
                if (status === "RATE_LIMITED") {
                  setEmailVariant("rate_limited");
                  return;
                }
                if (status === "COOLDOWN") {
                  toast("Please wait 30 seconds before requesting another code.");
                  return;
                }
                updateAuthJourney((draft) => {
                  if (draft.recovery.challenge) renewOtp(draft.recovery.challenge, now());
                });
                setEmailVariant("default");
                toast("A new demo code was sent.");
              }}
            >
              Resend the code
            </button>
            <button
              type="button"
              className="min-h-11 rounded-brand px-3 text-left text-primary hover:bg-base-200"
              onClick={() => setStep("nin")}
            >
              Use my National ID number instead
            </button>
            <button
              type="button"
              className="min-h-11 rounded-brand px-3 text-left text-base-content/65 hover:bg-base-200"
              onClick={() => setStep("support")}
            >
              Neither of these works
            </button>
            <button
              type="button"
              className="min-h-11 rounded-brand px-3 text-left text-base-content/65 hover:bg-base-200"
              onClick={cancelRecovery}
            >
              Cancel recovery
            </button>
          </div>
          {emailVariant === "not_found" ? (
            <Button variant="secondary" full onClick={() => setStep("start")}>
              Start recovery again
            </Button>
          ) : null}
          <ScreenStates
            states={[
              { value: "default", label: "Default" },
              { value: "submitting", label: "Submitting" },
              { value: "incorrect", label: "400 incorrect code" },
              { value: "expired", label: "400 expired code" },
              { value: "not_found", label: "404 recovery not found" },
              { value: "locked", label: "423 locked" },
              { value: "rate_limited", label: "429" },
            ]}
            value={emailVariant}
            onChange={(value) => {
              setEmailVariant(value as EmailVariant);
              if (value === "incorrect") setCode("");
            }}
          />
        </div>
      </MobileScreen>
    );
  }

  if (step === "nin") {
    const blocked =
      ninVariant === "locked" || ninVariant === "rate_limited" || ninVariant === "not_found";
    return (
      <MobileScreen
        title="Verify it is you"
        back={{ label: "Back to email verification", onBack: () => setStep("email") }}
        tabs="none"
      >
        <div data-screen="P8" className="space-y-5">
          <OnboardingProgress current={2} total={3} label="Confirm it is you" />
          <p className="measure text-body text-base-content/75">
            Enter the National Identity Number this account was verified with. We check it and keep
            the result: the number itself is not stored.
          </p>
          {ninVariant === "unavailable" ? (
            <Banner
              tone="info"
              action={
                <Button size="sm" variant="secondary" onClick={() => setStep("support")}>
                  Ask for help
                </Button>
              }
            >
              This account cannot use National ID recovery. A person can help instead.
            </Banner>
          ) : null}
          {ninVariant === "not_found" ? (
            <Banner tone="error">This recovery request is no longer available. Start again.</Banner>
          ) : null}
          <Field
            label="National Identity Number (NIN)"
            error={
              ninVariant === "failed"
                ? "NIN verification failed. Check the number and try again."
                : ninVariant === "mismatch"
                  ? "That NIN does not match this account."
                  : null
            }
          >
            {(p) => (
              <Input
                {...p}
                numeric
                inputMode="numeric"
                maxLength={11}
                disabled={blocked || ninVariant === "unavailable"}
                value={nin}
                onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
              />
            )}
          </Field>
          {ninVariant === "locked" ? (
            <p className="text-body-sm text-base-content/70">
              Too many incorrect attempts. Try again in{" "}
              <Countdown deadline={lockedUntil} elapsedText="now" />.
            </p>
          ) : null}
          {ninVariant === "rate_limited" ? (
            <p className="text-body-sm text-base-content/70">
              Too many requests. Try again in <Countdown deadline={lockedUntil} elapsedText="now" />
              .
            </p>
          ) : null}
          <Button
            full
            disabled={
              nin.length < 11 ||
              blocked ||
              ninVariant === "submitting" ||
              ninVariant === "unavailable"
            }
            onClick={() => {
              if (nin !== "12345678901") {
                setNinVariant("mismatch");
                return;
              }
              updateAuthJourney((draft) => {
                draft.recovery.method = "NIN";
                draft.recovery.status = "VERIFIED";
              });
              setVerificationMethod("nin");
              setStep("reset");
            }}
          >
            {ninVariant === "submitting" ? "Checking your ID…" : "Verify"}
          </Button>
          <button
            type="button"
            className="min-h-11 rounded-brand px-3 text-left text-label text-base-content/65 hover:bg-base-200"
            onClick={() => setStep("support")}
          >
            I cannot do this. Ask a person for help
          </button>
          <Button variant="secondary" full onClick={cancelRecovery}>
            Cancel recovery
          </Button>
          {ninVariant === "not_found" ? (
            <Button variant="secondary" full onClick={() => setStep("start")}>
              Start recovery again
            </Button>
          ) : null}
          <ScreenStates
            states={[
              { value: "default", label: "Default" },
              { value: "submitting", label: "Submitting" },
              { value: "failed", label: "400 verification failed" },
              { value: "mismatch", label: "400 no match" },
              { value: "unavailable", label: "400 path unavailable" },
              { value: "not_found", label: "404 recovery not found" },
              { value: "locked", label: "423 locked" },
              { value: "rate_limited", label: "429" },
            ]}
            value={ninVariant}
            onChange={(value) => setNinVariant(value as NinVariant)}
          />
        </div>
      </MobileScreen>
    );
  }

  if (step === "support") {
    const submitted = supportVariant === "submitted";
    return (
      <MobileScreen
        title={submitted ? "We have this" : "Ask for help"}
        back={{ label: "Try another recovery method", onBack: () => setStep("start") }}
        tabs="none"
      >
        <div data-screen="P9" className="space-y-5 py-4">
          {submitted ? (
            <>
              <OnboardingProgress
                current={3}
                total={3}
                label="A person will help with the next step"
              />
              <h1 className="font-heading text-h1">We have this</h1>
              <p className="measure text-body text-base-content/75">
                Your request is with a person at Monovella. They will use the details already held
                for this account and ask you to prove who you are before anything changes.
              </p>
              <Card>
                <p className="text-body-sm text-base-content/70">
                  Nothing on the account changes in the meantime, and nobody else can sign in while
                  this recovery is open.
                </p>
              </Card>
              <Button variant="secondary" full onClick={() => navigate("/app/sign-in")}>
                Back to sign in
              </Button>
              <Button variant="ghost" full onClick={cancelRecovery}>
                Cancel request
              </Button>
            </>
          ) : (
            <>
              <OnboardingProgress current={2} total={3} label="Get the help you need" />
              <p className="measure text-body text-base-content/75">
                If neither recovery option works, ask Monovella for help. We will never change your
                sign-in details until we have confirmed it is you.
              </p>
              {supportVariant === "notfound" ? (
                <Banner tone="error">
                  This recovery request is no longer available. Start again.
                </Banner>
              ) : null}
              {supportVariant === "rate_limited" ? (
                <p className="text-body-sm text-base-content/70">
                  Too many requests. Try again in{" "}
                  <Countdown deadline={lockedUntil} elapsedText="now" />.
                </p>
              ) : null}
              <Button
                full
                disabled={supportVariant === "submitting" || supportVariant === "rate_limited"}
                onClick={() => {
                  updateAuthJourney((draft) => {
                    draft.recovery.method = "MANUAL";
                    draft.recovery.status = "MANUAL_REVIEW";
                  });
                  setSupportVariant("submitted");
                }}
              >
                {supportVariant === "submitting" ? "Sending request…" : "Ask for recovery help"}
              </Button>
              <button
                type="button"
                className="min-h-11 rounded-brand px-3 text-left text-label text-base-content/65 hover:bg-base-200"
                onClick={() => setStep("start")}
              >
                Try another recovery method
              </button>
            </>
          )}
          <ScreenStates
            states={[
              { value: "request", label: "Default" },
              { value: "submitting", label: "Submitting" },
              { value: "submitted", label: "Submitted" },
              { value: "notfound", label: "404 expired" },
              { value: "rate_limited", label: "429" },
            ]}
            value={supportVariant}
            onChange={(value) => setSupportVariant(value as SupportVariant)}
          />
        </div>
      </MobileScreen>
    );
  }

  if (step === "reset") {
    const unavailable = resetVariant === "not_found";
    return (
      <MobileScreen
        title="New phone and PIN"
        back={{
          label: "Back to identity verification",
          onBack: () => setStep(verificationMethod),
        }}
        tabs="none"
      >
        <div data-screen="P10" className="space-y-5">
          <OnboardingProgress current={3} total={3} label="Secure your account again" />
          <p className="measure text-body text-base-content/75">
            This replaces how you sign in. Your record is untouched.
          </p>
          {resetVariant === "verification_required" ? (
            <Banner
              tone="info"
              action={
                <Button size="sm" variant="secondary" onClick={() => setStep("nin")}>
                  Verify identity
                </Button>
              }
            >
              Confirm your identity before replacing your sign-in details.
            </Banner>
          ) : null}
          {unavailable ? (
            <Banner tone="error">This recovery request is no longer available. Start again.</Banner>
          ) : null}
          <Button variant="secondary" full onClick={cancelRecovery}>
            Cancel recovery
          </Button>
          <Field
            label="New phone number"
            hint="Use your Nigerian mobile number as you normally write it."
            error={
              resetVariant === "conflict"
                ? "This phone number is already in use."
                : resetVariant === "validation"
                  ? "Enter a valid Nigerian mobile number."
                  : null
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
                disabled={resetVariant === "rate_limited" || unavailable}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            )}
          </Field>
          <PinInput
            label="New PIN"
            autoComplete="new-password"
            disabled={resetVariant === "rate_limited" || unavailable}
            value={pin}
            onChange={setPin}
          />
          {resetVariant === "rate_limited" ? (
            <p className="text-body-sm text-base-content/70">
              Too many attempts. Try again in <Countdown deadline={lockedUntil} elapsedText="now" />
              .
            </p>
          ) : null}
          <Button
            full
            disabled={
              !phone ||
              pin.length < 6 ||
              resetVariant === "submitting" ||
              resetVariant === "rate_limited" ||
              unavailable
            }
            onClick={() => {
              if (resetVariant === "verification_required") {
                setStep("nin");
                return;
              }
              update((draft) => {
                draft.user.phone = phone;
              });
              updateAuthJourney((draft) => {
                draft.pin = pin;
                draft.force_credential_change = false;
                draft.recovery.status = "CONSUMED";
                draft.recovery.challenge = null;
              });
              toast("Your account is secured again. Sign in with the new details.");
              navigate("/app/sign-in");
            }}
          >
            {resetVariant === "submitting" ? "Saving your sign-in…" : "Save and sign in"}
          </Button>
          {unavailable ? (
            <Button variant="secondary" full onClick={() => setStep("start")}>
              Start recovery again
            </Button>
          ) : null}
          <ScreenStates
            states={[
              { value: "default", label: "Default" },
              { value: "submitting", label: "Submitting" },
              { value: "verification_required", label: "400 verification required" },
              { value: "not_found", label: "404 recovery not found" },
              { value: "conflict", label: "409 phone in use" },
              { value: "validation", label: "422 phone validation" },
              { value: "rate_limited", label: "429" },
            ]}
            value={resetVariant}
            onChange={(value) => setResetVariant(value as ResetVariant)}
          />
        </div>
      </MobileScreen>
    );
  }

  return (
    <MobileScreen
      title="Recover your account"
      back="/app/sign-in"
      tabs="none"
      contentPlacement="center"
    >
      <div data-screen="P6" className="mx-auto w-full max-w-128 space-y-5 py-6">
        <OnboardingProgress current={1} total={3} label="Find your account" />
        <p className="measure text-body text-base-content/75">
          Take your time. Nothing is lost. We just need to confirm it is you before moving your
          account to a new phone.
        </p>
        {startVariant === "notfound" ? (
          <Banner tone="error">No matching account found.</Banner>
        ) : null}
        {savedRecovery.status === "CONSUMED" ? (
          <Banner tone="warning">
            That recovery link has already been used. Start again for a new one.
          </Banner>
        ) : null}
        {startVariant === "rate_limited" ? (
          <p className="text-body-sm text-base-content/70">
            Too many recovery attempts. Try again in{" "}
            <Countdown deadline={lockedUntil} elapsedText="now" />.
          </p>
        ) : null}
        <Field label="Recovery email or Monovella ID">
          {(p) => (
            <Input
              {...p}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or MV-3K7P-2QX9"
              disabled={startVariant === "rate_limited"}
            />
          )}
        </Field>
        <Button
          full
          disabled={
            !identifier.trim() || startVariant === "submitting" || startVariant === "rate_limited"
          }
          onClick={() => {
            if (
              !identifier.includes("@") &&
              !data.patients.some((patient) => patient.monovella_id === identifier.toUpperCase())
            ) {
              setStartVariant("notfound");
              return;
            }
            updateAuthJourney((draft) => {
              draft.recovery = {
                reference: `REC-${now().getTime().toString(36).toUpperCase()}`,
                identifier: identifier.trim(),
                method: "EMAIL",
                status: "AWAITING_VERIFICATION",
                challenge: issueOtp(
                  "RECOVERY_EMAIL",
                  data.user.recovery_email ?? "a•••a@gmail.com",
                  now(),
                ),
              };
            });
            setStep("email");
          }}
        >
          {startVariant === "submitting" ? "Finding your account…" : "Continue"}
        </Button>
        <ScreenStates
          states={[
            { value: "default", label: "Default" },
            { value: "submitting", label: "Submitting" },
            { value: "notfound", label: "404 no match" },
            { value: "rate_limited", label: "429" },
          ]}
          value={startVariant}
          onChange={(value) => setStartVariant(value as StartVariant)}
        />
      </div>
    </MobileScreen>
  );
}
