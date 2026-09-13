import { Fingerprint } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { MobileScreen } from "~/components/shell/mobile-shell";
import { ScreenStates } from "~/components/shell/state-switcher";
import { Banner, Button, Card, Countdown, Field, Input, OtpInput, PinInput } from "~/components/ui";
import { twoFactorFor } from "~/data/selectors";
import { DEMO_CODES, readAuthJourney, updateAuthJourney } from "~/lib/auth-journey";
import { now } from "~/lib/clock";
import { usePrototype } from "~/store/prototype";

type Variant =
  | "default"
  | "submitting"
  | "wrong"
  | "must_change"
  | "recovery_review"
  | "locked"
  | "rate_limited"
  | "biometric"
  | "biometric_checking"
  | "biometric_failed";

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
}

/** P5 — Sign In. Phone + PIN; no password, no third-party auth. */
export default function SignIn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data, setSession, update, toast } = usePrototype();
  const [variant, setVariant] = useState<Variant>("default");
  const [phone, setPhone] = useState("0802 411 9034");
  const [pin, setPin] = useState("");
  const [secondFactor, setSecondFactor] = useState("");
  const [secondFactorError, setSecondFactorError] = useState(false);
  const [awaitingSecondFactor, setAwaitingSecondFactor] = useState(false);
  const lockedUntil = new Date(now().getTime() + 272_000).toISOString();
  const biometricEnabled = variant.startsWith("biometric");
  const checkingBiometric = variant === "biometric_checking";
  const failedBiometric = variant === "biometric_failed";
  const retryBlocked =
    variant === "locked" || variant === "rate_limited" || variant === "recovery_review";

  const finishSignIn = () => {
    const auth = readAuthJourney();
    const forced = params.get("force-change") === "1" || auth.force_credential_change;
    setSession({
      authenticated: true,
      access: forced ? "CREDENTIAL_CHANGE_REQUIRED" : "GRANTED",
    });
    if (forced) {
      navigate("/app/account/change-pin?forced=1");
      return;
    }
    updateAuthJourney((draft) => {
      draft.mobile_return_to = null;
    });
    navigate(auth.mobile_return_to?.startsWith("/app/") ? auth.mobile_return_to : "/app");
  };

  const submitCredentials = () => {
    const auth = readAuthJourney();
    if (auth.recovery.status === "MANUAL_REVIEW") {
      setVariant("recovery_review");
      return;
    }
    if (auth.sign_in.locked_until && Date.parse(auth.sign_in.locked_until) > now().getTime()) {
      setVariant("locked");
      return;
    }
    const enteredPhone = normalizePhone(phone);
    const accountPhone = normalizePhone(data.user.phone);
    if (enteredPhone !== accountPhone || pin !== auth.pin) {
      const next = updateAuthJourney((draft) => {
        draft.sign_in.failed_attempts += 1;
        if (draft.sign_in.failed_attempts >= 3) {
          draft.sign_in.locked_until = new Date(now().getTime() + 5 * 60_000).toISOString();
        }
      });
      setPin("");
      setVariant(next.sign_in.locked_until ? "locked" : "wrong");
      return;
    }
    updateAuthJourney((draft) => {
      draft.sign_in.failed_attempts = 0;
      draft.sign_in.locked_until = null;
      if (variant === "must_change") draft.force_credential_change = true;
    });
    if (twoFactorFor(data, "mobile")?.enabled) {
      setAwaitingSecondFactor(true);
      return;
    }
    finishSignIn();
  };

  const submitSecondFactor = () => {
    if (secondFactor === DEMO_CODES.authenticatorOtp) {
      finishSignIn();
      return;
    }
    if (secondFactor.toUpperCase() === DEMO_CODES.recoveryCode) {
      update((draft) => {
        const row = twoFactorFor(draft, "mobile");
        row.recovery_codes_remaining = Math.max(0, row.recovery_codes_remaining - 1);
      });
      toast("Recovery code used. It cannot be used again.");
      finishSignIn();
      return;
    }
    setSecondFactorError(true);
    setSecondFactor("");
  };

  const unlockWithFaceId = () => {
    setVariant("biometric_checking");
    window.setTimeout(finishSignIn, 700);
  };

  return (
    <MobileScreen title="Sign in" back="/app/welcome" tabs="none" contentPlacement="center">
      <div data-screen="P5" className="mx-auto w-full max-w-128 space-y-5 py-6">
        <ScreenStates
          states={[
            { value: "default", label: "Default" },
            { value: "submitting", label: "Submitting" },
            { value: "biometric", label: "Biometric ready" },
            { value: "biometric_checking", label: "Biometric checking" },
            { value: "biometric_failed", label: "Biometric not recognised" },
            { value: "wrong", label: "401 incorrect" },
            { value: "must_change", label: "PIN change required" },
            { value: "recovery_review", label: "Recovery under manual review" },
            { value: "locked", label: "423 locked" },
            { value: "rate_limited", label: "429" },
          ]}
          value={variant}
          onChange={(value) => {
            setVariant(value as Variant);
            if (value === "wrong") setPin("");
          }}
        />

        <p className="measure text-body text-base-content/75">
          Use the phone number and six-digit PIN you chose for your Monovella ID.
        </p>

        <Field
          label="Phone number"
          hint="Use your Nigerian mobile number as you normally write it."
        >
          {(p) => (
            <Input
              {...p}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              numeric
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={retryBlocked}
            />
          )}
        </Field>
        <PinInput
          label="PIN"
          error={variant === "wrong" ? "Incorrect phone or PIN." : null}
          disabled={retryBlocked}
          value={variant === "wrong" ? "" : pin}
          onChange={setPin}
        />

        {variant === "locked" ? (
          <Banner tone="warning">
            Too many incorrect attempts. Try again in{" "}
            <Countdown deadline={lockedUntil} elapsedText="now" />.
          </Banner>
        ) : null}
        {variant === "rate_limited" ? (
          <Banner tone="warning">Too many requests. Wait a moment before trying again.</Banner>
        ) : null}
        {variant === "recovery_review" ? (
          <Banner tone="warning">
            Sign-in is paused while support verifies your recovery request. Your records are
            unchanged.
          </Banner>
        ) : null}
        {checkingBiometric ? (
          <Banner tone="info">Face ID is checking this sign-in on your device.</Banner>
        ) : null}
        {failedBiometric ? (
          <Banner tone="warning">
            Face ID did not recognise you. Try again, or sign in with your PIN.
          </Banner>
        ) : null}

        {awaitingSecondFactor ? (
          <Card>
            <p className="font-heading text-h3">Enter your second step</p>
            <p className="mt-1 text-body-sm text-base-content/70">
              Use the current six-digit authenticator code, or your unused demo recovery code.
            </p>
            <div className="mt-4">
              <OtpInput
                value={secondFactor}
                onChange={(value) => {
                  setSecondFactor(value);
                  setSecondFactorError(false);
                }}
              />
            </div>
            {secondFactorError ? (
              <Banner tone="error">That verification code is not valid.</Banner>
            ) : null}
            <Button
              full
              className="mt-4"
              disabled={secondFactor.length < 6}
              onClick={submitSecondFactor}
            >
              Verify
            </Button>
            <Field label="Recovery code" hint={`Prototype code: ${DEMO_CODES.recoveryCode}`}>
              {(p) => (
                <Input
                  {...p}
                  value={secondFactor}
                  onChange={(event) => setSecondFactor(event.target.value)}
                />
              )}
            </Field>
          </Card>
        ) : (
          <Button
            full
            disabled={retryBlocked || variant === "submitting" || pin.length < 6}
            onClick={submitCredentials}
          >
            {variant === "submitting" ? "Signing in…" : "Sign in"}
          </Button>
        )}
        {biometricEnabled ? (
          <Button full variant="secondary" disabled={checkingBiometric} onClick={unlockWithFaceId}>
            <Fingerprint aria-hidden className="size-4" strokeWidth={1.5} />
            {checkingBiometric
              ? "Checking Face ID…"
              : failedBiometric
                ? "Try Face ID again"
                : "Use Face ID"}
          </Button>
        ) : null}
        <p className="text-center">
          <Link
            to="/app/recover"
            className="inline-flex min-h-11 items-center text-label text-primary underline underline-offset-2"
          >
            Forgot your PIN or lost your phone?
          </Link>
        </p>
      </div>
    </MobileScreen>
  );
}
