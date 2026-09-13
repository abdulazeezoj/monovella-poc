import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useMutationStates } from "~/components/shell/mutation-states";
import { ScreenStates } from "~/components/shell/state-switcher";
import { WebAuthShell } from "~/components/shell/web-shell";
import { Banner, Button, Countdown, Field, Input } from "~/components/ui";
import { DEMO_CODES, readAuthJourney, updateAuthJourney } from "~/lib/auth-journey";
import { now } from "~/lib/clock";
import { usePrototype } from "~/store/prototype";

type Variant = "default" | "wrong" | "locked" | "must_change";

/** B1 — Staff Sign In. Deliberately plainer than the patient auth screens. */
export default function StaffSignIn() {
  const navigate = useNavigate();
  const [variant, setVariant] = useState<Variant>("default");
  const [email, setEmail] = useState("abdulazeez@monovella.com");
  const [password, setPassword] = useState("");
  const lockedUntil = new Date(now().getTime() + 218_000).toISOString();

  return (
    <WebAuthShell productName="Back-Office Console">
      <div data-screen="B1" className="space-y-5">
        <h1 className="font-heading text-h1">Sign in</h1>

        <ScreenStates
          states={[
            { value: "default", label: "Default" },
            { value: "wrong", label: "401" },
            { value: "locked", label: "423" },
            { value: "must_change", label: "must_change_password" },
          ]}
          value={variant}
          onChange={setVariant}
        />

        <Field label="Email" error={variant === "wrong" ? "Incorrect email or password." : null}>
          {(p) => (
            <Input
              {...p}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>
        <Field label="Password">
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="current-password"
              disabled={variant === "locked"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>

        {variant === "locked" ? (
          <p className="text-body-sm text-base-content/70">
            Too many incorrect attempts: try again in{" "}
            <Countdown deadline={lockedUntil} elapsedText="now" />
          </p>
        ) : null}

        <Button
          full
          disabled={variant === "locked"}
          onClick={() => {
            if (email !== "abdulazeez@monovella.com" || password !== DEMO_CODES.webPassword) {
              setVariant("wrong");
              setPassword("");
              return;
            }
            if (variant === "must_change") {
              updateAuthJourney((draft) => {
                draft.web_sessions.STAFF.force_password_change = true;
                draft.web_sessions.STAFF.authenticated = false;
              });
              navigate("/console/password");
              return;
            }
            const returnTo = readAuthJourney().web_sessions.STAFF.return_to;
            updateAuthJourney((draft) => {
              draft.web_sessions.STAFF.authenticated = true;
              draft.web_sessions.STAFF.return_to = null;
            });
            navigate(returnTo?.startsWith("/console") ? returnTo : "/console");
          }}
        >
          Sign in
        </Button>
        <p>
          <Link
            to="/console/forgot"
            className="inline-flex min-h-11 items-center text-label text-primary underline underline-offset-2"
          >
            Forgot your password?
          </Link>
        </p>
      </div>
    </WebAuthShell>
  );
}

/** B2 — Forced Password Change. A hard gate; no "later". */
export function ForcedPasswordChange() {
  const navigate = useNavigate();
  const { toast } = usePrototype();
  const [next, setNext] = useState("");
  const [current, setCurrent] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <WebAuthShell productName="Back-Office Console">
      <div data-screen="B2" className="space-y-5">
        <h1 className="font-heading text-h1">Set a new password</h1>
        <p className="measure text-body-sm text-base-content/70">
          Your account was provisioned with a temporary password. Choose your own before going any
          further.
        </p>
        <Field label="Current password" error={error}>
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
            />
          )}
        </Field>
        <Field label="New password" hint="At least 12 characters.">
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          )}
        </Field>
        <Button
          full
          disabled={next.length < 12}
          onClick={() => {
            if (current !== DEMO_CODES.webPassword) {
              setError("Incorrect current password.");
              return;
            }
            const returnTo = readAuthJourney().web_sessions.STAFF.return_to;
            updateAuthJourney((draft) => {
              draft.web_sessions.STAFF.authenticated = true;
              draft.web_sessions.STAFF.force_password_change = false;
              draft.web_sessions.STAFF.return_to = null;
            });
            toast("Password changed.");
            navigate(returnTo?.startsWith("/console") ? returnTo : "/console");
          }}
        >
          Change password
        </Button>
        <p>
          <Link
            to="/console/sign-in"
            className="inline-flex min-h-11 items-center text-label text-primary underline underline-offset-2"
          >
            Back to sign in
          </Link>
        </p>
        <ScreenStates
          states={[
            { value: "ok", label: "Default" },
            { value: "wrong", label: "401 incorrect" },
          ]}
          value={error ? "wrong" : "ok"}
          onChange={(v) => setError(v === "wrong" ? "Incorrect current password." : null)}
        />
      </div>
    </WebAuthShell>
  );
}

/** B3 / B4 — Forgot / Reset Password. Neutral confirmation, no enumeration. */
export function ForgotPassword() {
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "rate_limited"],
    "your reset request",
  );
  const [sent, setSent] = useState(false);
  const [step, setStep] = useState<"request" | "reset">("request");
  const [error, setError] = useState<string | null>(null);

  if (step === "reset") {
    return (
      <WebAuthShell productName="Back-Office Console">
        <div data-screen="B4" className="space-y-5">
          <h1 className="font-heading text-h1">Choose a new password</h1>
          <Field label="New password" error={error} hint="At least 12 characters.">
            {(p) => <Input {...p} type="password" autoComplete="new-password" />}
          </Field>
          <Button full>Reset password</Button>
          <p>
            <Link
              to="/console/sign-in"
              className="inline-flex min-h-11 items-center text-label text-primary underline underline-offset-2"
            >
              Back to sign in
            </Link>
          </p>
          <ScreenStates
            states={[
              { value: "ok", label: "Default" },
              { value: "expired", label: "400 bad token" },
            ]}
            value={error ? "expired" : "ok"}
            onChange={(v) =>
              setError(v === "expired" ? "That reset link is invalid or has expired." : null)
            }
          />
        </div>
      </WebAuthShell>
    );
  }

  return (
    <WebAuthShell productName="Back-Office Console">
      <div data-screen="B3" className="space-y-5">
        {mutation.node}
        <h1 className="font-heading text-h1">Reset your password</h1>
        {sent ? (
          <>
            <Banner tone="info">
              If that email belongs to a staff account, a reset link is on its way.
            </Banner>
            <Button variant="secondary" full onClick={() => setStep("reset")}>
              Open the link (demo)
            </Button>
          </>
        ) : (
          <>
            <Field label="Email">
              {(p) => <Input {...p} type="email" autoComplete="username" />}
            </Field>
            <Button full onClick={() => setSent(true)}>
              Send reset link
            </Button>
          </>
        )}
        <p>
          <Link
            to="/console/sign-in"
            className="inline-flex min-h-11 items-center text-label text-primary underline underline-offset-2"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </WebAuthShell>
  );
}
