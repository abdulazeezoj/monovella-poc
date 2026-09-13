import {
  Bell,
  CalendarDays,
  Check,
  ClipboardList,
  CloudOff,
  FlaskConical,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LifeBuoy,
  LoaderCircle,
  LogOut,
  Pill,
  Plus,
  Settings,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { createContext, useContext, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { LocationFields, type LocationValue } from "~/components/location-fields";
import { useMutationStates } from "~/components/shell/mutation-states";
import { ScreenStates } from "~/components/shell/state-switcher";
import {
  HeaderUtilityLink,
  PageHeader,
  WebAuthShell,
  WebShell,
} from "~/components/shell/web-shell";
import {
  AvailabilityBadge,
  Badge,
  Banner,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  CheckoutPaymentBadge,
  Chip,
  Countdown,
  CredentialBanner,
  DataRow,
  EmptyState,
  Field,
  FileDrop,
  Input,
  ListGroup,
  ListRow,
  Modal,
  NumberStepper,
  OrderStatusBadge,
  ProviderRequestBadge,
  SearchablePicker,
  SegmentedControl,
  Select,
  Sheet,
  SkeletonRows,
  StandingBanner,
  Table,
  TableWrap,
  Td,
  Textarea,
  Th,
  type Tone,
  Tr,
} from "~/components/ui";
import { reference } from "~/data";
import { weeklyTimeConflict } from "~/data/schedule-projection";
import {
  LAB_ID,
  notificationPrefsFor,
  PHARMACY_ID,
  patientName,
  providerAvailabilityStatus,
  providerById,
  providerHome,
  providerRequestSubject,
  requestsForProvider,
  slotsForProvider,
  twoFactorFor,
} from "~/data/selectors";
import type {
  AvailabilityStatus,
  LabCollectionMethod,
  ProviderCredentialRead,
  ProviderOrderStatus,
  ProviderType,
} from "~/data/types";
import { DEMO_CODES, readAuthJourney, updateAuthJourney } from "~/lib/auth-journey";
import { now } from "~/lib/clock";
import { cn } from "~/lib/cn";
import {
  availabilityLabel,
  countdown,
  DAY_NAMES,
  formatDate,
  formatDateLong,
  formatDateTime,
  naira,
  providerOrderStatusLabel,
  relativeTime,
} from "~/lib/format";
import {
  accessStatusOf,
  applicationLink,
  submitProviderGovernance,
} from "~/lib/governance-lifecycle";
import {
  canAdvancePharmacyOrder,
  closeProviderRequest,
  fulfilmentComplete,
  quotedNairaToKobo,
} from "~/lib/provider-fulfilment";
import {
  createProviderApplication,
  providerAccountEmail,
  providerAccountForEmail,
} from "~/lib/provider-onboarding";
import {
  changeProviderPassword,
  issueProviderPasswordReset,
  providerPasswordMatches,
  resetProviderPassword,
} from "~/lib/provider-passwords";
import { providerSignInLockedUntil, recordProviderSignIn } from "~/lib/provider-sign-in";
import {
  disableProviderFactor,
  enrollProviderFactor,
  verifyProviderFactor,
} from "~/lib/provider-two-factor";
import { usePrototype, useTick } from "~/store/prototype";

/**
 * BO8 — the Pharmacy and Lab portals are content twins. One set of components,
 * parameterised by `provider_type`, with their own route group, layout and copy.
 */
interface PortalConfig {
  type: Extract<ProviderType, "PHARMACY" | "LAB">;
  providerId: string;
  base: string;
  productName: string;
  /** Which portal this is, carried as a colour in the header/sidebar badge. */
  productTone: Tone;
  council: "PCN" | "MLSCN";
  workNoun: string;
  /** What a licence lapse pauses — Pharmacy has no booking concept at all. */
  pausedNoun: string;
}

export const PHARMACY: PortalConfig = {
  type: "PHARMACY",
  providerId: PHARMACY_ID,
  base: "/pharmacy",
  productName: "Pharmacy Portal",
  productTone: "success",
  council: "PCN",
  workNoun: "prescription",
  pausedNoun: "requests",
};

export const LAB: PortalConfig = {
  type: "LAB",
  providerId: LAB_ID,
  base: "/lab",
  productName: "Lab Portal",
  productTone: "info",
  council: "MLSCN",
  workNoun: "test",
  pausedNoun: "bookings",
};

function useActivePortal(config: PortalConfig): PortalConfig {
  const { data } = usePrototype();
  const providerId = data.accountProviderIds?.[config.type];
  return providerId ? { ...config, providerId } : config;
}

const APPLICATION_STEPS: Array<{ number: 1 | 2 | 3; label: string }> = [
  { number: 1, label: "Business details" },
  { number: 2, label: "Verification" },
  { number: 3, label: "Payout account" },
];

const PortalContext = createContext<PortalConfig>(PHARMACY);
export const usePortal = () => useContext(PortalContext);

/** Keep public web-entry choices visible without asking applicants to backtrack. */
function PortalStartLinks({
  config,
  current,
}: {
  config: PortalConfig;
  current: "apply" | "sign-in";
}) {
  const onApply = current === "apply";
  return (
    <div className="space-y-1 border-t border-base-300 pt-3 text-body-sm text-base-content/70">
      <p>
        {onApply ? "Already have a portal account?" : "New to Monovella as a provider?"}{" "}
        <Link
          to={onApply ? `${config.base}/sign-in` : `${config.base}/apply`}
          className="inline-flex min-h-11 items-center text-primary underline underline-offset-2"
        >
          {onApply ? "Sign in" : "Apply to join"}
        </Link>
      </p>
      <Link
        to="/app/sign-up"
        className="inline-flex min-h-11 items-center text-primary underline underline-offset-2"
      >
        Looking for care? Create a Monovella ID
      </Link>
    </div>
  );
}

function ReturnToPortalSignIn({ config }: { config: PortalConfig }) {
  return (
    <p>
      <Link
        to={`${config.base}/sign-in`}
        className="inline-flex min-h-11 items-center text-label text-primary underline underline-offset-2"
      >
        Back to sign in
      </Link>
    </p>
  );
}

/** The portal shell. Touch-first: this runs on a shared counter tablet. */
export function PortalLayout({ config }: { config: PortalConfig }) {
  config = useActivePortal(config);
  const { data } = usePrototype();
  const home = providerHome(data, config.providerId);
  const provider = providerById(data, config.providerId);

  return (
    <PortalContext.Provider value={config}>
      <WebShell
        productName={config.productName}
        productTone={config.productTone}
        accountLine={provider?.business_name ?? ""}
        accountRole={
          accessStatusOf(data, config.providerId) === "PENDING"
            ? "Application under review"
            : accessStatusOf(data, config.providerId) === "REJECTED"
              ? "Application not approved"
              : config.type === "PHARMACY"
                ? "Pharmacy"
                : "Lab"
        }
        accountHref={`${config.base}/settings`}
        supportHref={`${config.base}/support`}
        nav={[
          { to: config.base, label: "Home", icon: LayoutDashboard, end: true },
          {
            to: `${config.base}/requests`,
            label: "Requests",
            icon: Inbox,
            count: home.new_requests_count,
          },
          ...(config.type === "LAB"
            ? [
                {
                  to: `${config.base}/slots`,
                  label: "Collection windows",
                  shortLabel: "Windows",
                  icon: CalendarDays,
                },
              ]
            : []),
          { to: `${config.base}/payments`, label: "Payments", icon: Wallet },
          { to: `${config.base}/profile`, label: "Profile", icon: Store },
          { to: `${config.base}/credentials`, label: "Credentials", icon: ShieldCheck },
          { to: `${config.base}/settings`, label: "Settings", icon: Settings },
          {
            to: `${config.base}/application`,
            label: "Verification",
            shortLabel: "Status",
            icon: ClipboardList,
          },
        ]}
      />
    </PortalContext.Provider>
  );
}

/** V1 — Provider Sign In. B1's shell, a different account type underneath. */
export function ProviderSignIn({ config }: { config: PortalConfig }) {
  config = useActivePortal(config);
  useTick();
  const navigate = useNavigate();
  const { data, update } = usePrototype();
  const [variant, setVariant] = useState<
    "default" | "wrong" | "locked" | "must_change" | "two_factor" | "factor_wrong" | "factor_locked"
  >("default");
  const expectedEmail = providerAccountEmail(data, config.providerId) ?? "";
  const [email, setEmail] = useState(expectedEmail);
  const [password, setPassword] = useState("");
  const [previewDeadline] = useState(() => new Date(now().getTime() + 205_000).toISOString());
  const lockedUntil = providerSignInLockedUntil(readAuthJourney(), config.type, email);
  const passwordLocked = variant === "locked" || !!lockedUntil;
  const [factorAccount, setFactorAccount] = useState<string | null>(null);
  const [factorCode, setFactorCode] = useState("");
  const [factorError, setFactorError] = useState<string | null>(null);
  const factorPreview = ["two_factor", "factor_wrong", "factor_locked"].includes(variant);
  const stateControls = (
    <ScreenStates
      states={[
        { value: "default", label: "Default" },
        { value: "wrong", label: "401" },
        { value: "locked", label: "423" },
        { value: "must_change", label: "must_change_password" },
        { value: "two_factor", label: "two_factor_required" },
        { value: "factor_wrong", label: "Invalid verification code" },
        { value: "factor_locked", label: "Verification locked" },
      ]}
      value={variant}
      onChange={(next) => {
        setVariant(next);
        setFactorAccount(null);
        setFactorError(null);
        setFactorCode("");
      }}
    />
  );
  const finishSignIn = (accountId: string) => {
    update((draft) => {
      draft.accountProviderIds = { ...draft.accountProviderIds, [config.type]: accountId };
    });
    const role = config.type;
    const newlyApproved =
      data.providerAccounts?.some((item) => item.providerId === accountId) &&
      accessStatusOf(data, accountId) === "ACTIVE" &&
      !readAuthJourney().providerPasswords?.[accountId];
    if (variant === "must_change" || newlyApproved) {
      updateAuthJourney((draft) => {
        draft.web_sessions[role].force_password_change = true;
        draft.web_sessions[role].authenticated = false;
      });
      navigate(`${config.base}/password`);
      return;
    }
    const returnTo = readAuthJourney().web_sessions[role].return_to;
    updateAuthJourney((draft) => {
      draft.web_sessions[role].authenticated = true;
      draft.web_sessions[role].return_to = null;
    });
    navigate(returnTo?.startsWith(config.base) ? returnTo : config.base);
  };
  if (factorAccount || factorPreview)
    return (
      <WebAuthShell productName={config.productName} productTone={config.productTone}>
        <div data-screen="V1" className="space-y-5">
          {stateControls}
          <h1 className="font-heading text-h1">Verify your sign-in</h1>
          <p className="text-body-sm text-base-content/70">
            Enter your authenticator code or an unused recovery code.
          </p>
          <Field
            label="Verification code"
            error={
              variant === "factor_locked"
                ? "Too many incorrect codes. Try again in five minutes."
                : variant === "factor_wrong"
                  ? "That code is invalid or has already been used."
                  : factorError
            }
          >
            {(p) => (
              <Input
                {...p}
                autoComplete="one-time-code"
                value={factorCode}
                onChange={(event) => {
                  setFactorCode(event.target.value);
                  setFactorError(null);
                }}
              />
            )}
          </Field>
          <Button
            full
            disabled={factorPreview || !factorCode}
            onClick={() => {
              if (!factorAccount || factorPreview) return;
              const auth = readAuthJourney();
              let result: string = "INVALID";
              update((draft) => {
                result = verifyProviderFactor(draft, auth, factorAccount, factorCode);
              });
              updateAuthJourney((draft) => {
                draft.providerFactors = auth.providerFactors;
              });
              if (result !== "VERIFIED") {
                setFactorError(
                  result === "LOCKED"
                    ? "Too many incorrect codes. Try again in five minutes."
                    : "That code is invalid or has already been used.",
                );
                return;
              }
              finishSignIn(factorAccount);
            }}
          >
            Verify and sign in
          </Button>
          <Button
            variant="secondary"
            full
            onClick={() => {
              setVariant("default");
              setFactorAccount(null);
              setFactorCode("");
              setPassword("");
            }}
          >
            Use another account
          </Button>
          <p className="text-caption text-base-content/60">
            Demo authenticator code: {DEMO_CODES.authenticatorOtp}. No real authenticator is
            connected.
          </p>
        </div>
      </WebAuthShell>
    );

  return (
    <WebAuthShell productName={config.productName} productTone={config.productTone}>
      <div data-screen="V1" className="space-y-5">
        <h1 className="font-heading text-h1">Sign in</h1>
        {stateControls}
        <Field label="Email" error={variant === "wrong" ? "Incorrect email or password." : null}>
          {(p) => (
            <Input
              {...p}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          )}
        </Field>
        <Field label="Password">
          {(p) => (
            <Input
              {...p}
              type="password"
              autoComplete="current-password"
              disabled={passwordLocked}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </Field>
        {passwordLocked ? (
          <p className="text-body-sm text-base-content/70">
            Too many incorrect attempts, try again in{" "}
            <Countdown deadline={lockedUntil ?? previewDeadline} elapsedText="now" />
          </p>
        ) : null}
        <Button
          full
          disabled={passwordLocked}
          onClick={() => {
            const account = providerAccountForEmail(data, config.type, email);
            const auth = readAuthJourney();
            const result = recordProviderSignIn(
              auth,
              config.type,
              email,
              !!account && providerPasswordMatches(auth, account.id, password),
            );
            updateAuthJourney((draft) => {
              draft.providerSignInAttempts = auth.providerSignInAttempts;
            });
            if (result !== "VERIFIED" || !account) {
              setVariant("wrong");
              setPassword("");
              return;
            }
            if (
              data.twoFactorSettings.some(
                (row) =>
                  row.subject_type === "PROVIDER" && row.subject_id === account.id && row.enabled,
              )
            ) {
              updateAuthJourney((draft) => {
                draft.web_sessions[config.type].authenticated = false;
              });
              setFactorAccount(account.id);
              setFactorCode("");
              setFactorError(null);
              return;
            }
            finishSignIn(account.id);
          }}
        >
          Sign in
        </Button>
        <p>
          <Link
            to={`${config.base}/forgot`}
            className="inline-flex min-h-11 items-center text-label text-primary underline underline-offset-2"
          >
            Forgot your password?
          </Link>
        </p>
        <PortalStartLinks config={config} current="sign-in" />
      </div>
    </WebAuthShell>
  );
}

/** V1a — Forced Password Change, the provider twin of B2. */
export function ProviderPasswordChange({ config }: { config: PortalConfig }) {
  config = useActivePortal(config);
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "rate_limited"],
    "your new password",
  );
  const navigate = useNavigate();
  const { toast } = usePrototype();
  const [next, setNext] = useState("");
  const [current, setCurrent] = useState("");
  const [wrongCurrent, setWrongCurrent] = useState(false);
  return (
    <WebAuthShell productName={config.productName} productTone={config.productTone}>
      <div data-screen="V1a" className="space-y-5">
        {mutation.node}
        <h1 className="font-heading text-h1">Set a new password</h1>
        <p className="measure text-body-sm text-base-content/70">
          This account was provisioned with a temporary password when your application was approved.
        </p>
        <Field label="Current password" error={wrongCurrent ? "Incorrect current password." : null}>
          {(p) => (
            <Input
              {...p}
              type="password"
              value={current}
              onChange={(event) => {
                setCurrent(event.target.value);
                setWrongCurrent(false);
              }}
            />
          )}
        </Field>
        <Field label="New password" hint="At least 12 characters.">
          {(p) => (
            <Input {...p} type="password" value={next} onChange={(e) => setNext(e.target.value)} />
          )}
        </Field>
        <Button
          full
          disabled={mutation.blocked || next.length < 12}
          onClick={() => {
            if (mutation.blocked) return;
            if (!providerPasswordMatches(readAuthJourney(), config.providerId, current)) {
              setWrongCurrent(true);
              return;
            }
            const returnTo = readAuthJourney().web_sessions[config.type].return_to;
            updateAuthJourney((draft) => {
              changeProviderPassword(draft, config.providerId, current, next);
              draft.web_sessions[config.type].authenticated = true;
              draft.web_sessions[config.type].force_password_change = false;
              draft.web_sessions[config.type].return_to = null;
            });
            toast("Password changed.");
            navigate(returnTo?.startsWith(config.base) ? returnTo : config.base);
          }}
        >
          Change password
        </Button>
        <ReturnToPortalSignIn config={config} />
      </div>
    </WebAuthShell>
  );
}

/** V1b — Forgot / Reset Password, the provider twin of B3/B4. Neutral confirmation, no enumeration. */
export function ProviderForgotPassword({ config }: { config: PortalConfig }) {
  config = useActivePortal(config);
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "rate_limited"],
    "your reset request",
  );
  const navigate = useNavigate();
  const { data, update, nextId } = usePrototype();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [email, setEmail] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [issuedToken, setIssuedToken] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const [error, setError] = useState<string | null>(null);

  if (token) {
    return (
      <WebAuthShell productName={config.productName} productTone={config.productTone}>
        <div data-screen="V1b" className="space-y-5">
          {mutation.node}
          <h1 className="font-heading text-h1">Choose a new password</h1>
          <Field label="New password" error={error} hint="At least 12 characters.">
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete="new-password"
                value={nextPassword}
                onChange={(event) => setNextPassword(event.target.value)}
              />
            )}
          </Field>
          <Button
            full
            disabled={mutation.blocked || nextPassword.length < 12 || !!error}
            onClick={() => {
              if (mutation.blocked) return;
              const state = readAuthJourney();
              if (!resetProviderPassword(state, config.providerId, token, nextPassword)) {
                setError("That reset link is invalid or has expired.");
                return;
              }
              updateAuthJourney((draft) => {
                resetProviderPassword(draft, config.providerId, token, nextPassword);
                draft.web_sessions[config.type].authenticated = false;
                draft.web_sessions[config.type].force_password_change = false;
              });
              navigate(`${config.base}/sign-in`);
            }}
          >
            Reset password
          </Button>
          <ReturnToPortalSignIn config={config} />
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
    <WebAuthShell productName={config.productName} productTone={config.productTone}>
      <div data-screen="V1b" className="space-y-5">
        {mutation.node}
        <h1 className="font-heading text-h1">Reset your password</h1>
        {sent ? (
          <>
            <Banner tone="info">
              If that email belongs to a {config.type === "PHARMACY" ? "pharmacy" : "lab"} account,
              a reset link is on its way.
            </Banner>
            <Button
              variant="secondary"
              full
              onClick={() => navigate(`${config.base}/forgot?token=${issuedToken ?? "invalid"}`)}
            >
              Open the link (demo)
            </Button>
          </>
        ) : (
          <>
            <Field label="Email">
              {(p) => (
                <Input
                  {...p}
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              )}
            </Field>
            <Button
              full
              disabled={mutation.blocked || !email.includes("@")}
              onClick={() => {
                const account = providerAccountForEmail(data, config.type, email);
                if (account) {
                  update((draft) => {
                    draft.accountProviderIds = {
                      ...draft.accountProviderIds,
                      [config.type]: account.id,
                    };
                  });
                  const resetToken = nextId("reset");
                  updateAuthJourney((draft) =>
                    issueProviderPasswordReset(draft, account.id, resetToken),
                  );
                  setIssuedToken(resetToken);
                }
                setSent(true);
              }}
            >
              Send reset link
            </Button>
          </>
        )}
        <ReturnToPortalSignIn config={config} />
      </div>
    </WebAuthShell>
  );
}

/** V3 — Provider Application. */
export function ProviderApplication({ config }: { config: PortalConfig }) {
  config = useActivePortal(config);
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation"],
    "your application",
  );
  const navigate = useNavigate();
  const { data, toast, update, nextId } = usePrototype();
  const [searchParams] = useSearchParams();
  const previousApplicationId = searchParams.get("reapply");
  const priorLink = previousApplicationId
    ? applicationLink(data, previousApplicationId)
    : undefined;
  const prior =
    priorLink?.actor_id === config.providerId && priorLink.application_kind === "INITIAL"
      ? data.applicationDetails.find(
          (item) => item.id === previousApplicationId && item.status === "REJECTED",
        )
      : undefined;
  const existing = prior ? providerById(data, config.providerId) : undefined;
  const [applicationStep, setApplicationStep] = useState<1 | 2 | 3>(1);
  const [businessName, setBusinessName] = useState(existing?.business_name ?? "");
  const [location, setLocation] = useState<LocationValue>({
    address: existing?.premises_address ?? "",
    city: existing?.city ?? "",
    localGovernmentArea: existing?.local_government_area ?? "",
    state: existing?.state ?? "",
  });
  const [contactName, setContactName] = useState(existing?.contact_name ?? "");
  const [contactEmail, setContactEmail] = useState(prior?.contact_email ?? "");
  const [contactPhone, setContactPhone] = useState(existing?.contact_phone ?? "");
  const [licence, setLicence] = useState(prior?.license_number ?? "");
  const [licenceExpiry, setLicenceExpiry] = useState(prior?.license_expiry_date ?? "");
  const [cac, setCac] = useState(existing?.cac_number ?? "");
  const [file, setFile] = useState<string | null>(null);
  const [services, setServices] = useState<string[]>(existing?.services_offered ?? []);
  const [bankCode, setBankCode] = useState(existing?.payout_bank_code ?? "");
  const [bankAccountNumber, setBankAccountNumber] = useState(
    existing?.payout_bank_account_number ?? "",
  );
  const [error, setError] = useState(false);

  if (previousApplicationId && (!prior || accessStatusOf(data, config.providerId) !== "REJECTED"))
    return (
      <WebAuthShell productName={config.productName} productTone={config.productTone}>
        <EmptyState
          title="Application unavailable"
          body="Open the latest decision for this business to see the next step."
          action={<ButtonLink to={`${config.base}/application`}>View application</ButtonLink>}
        />
      </WebAuthShell>
    );

  return (
    <WebAuthShell productName={config.productName} productTone={config.productTone}>
      <div data-screen="V3" className="space-y-5">
        {mutation.node}
        {prior ? (
          <Banner tone="warning">
            {prior.prior_rejection_reason ?? "Review and correct your application details."} Upload
            a new licence document before submitting again.
          </Banner>
        ) : null}
        <h1 className="font-heading text-h1">Apply to join Monovella</h1>
        <p className="measure text-body-sm text-base-content/70">
          Your CAC registration is checked automatically. Your {config.council} licence number and
          premises are checked by a person against the {config.council} register. That part takes
          longer than instant, and it's the part that makes "verified" mean something.
        </p>
        <PortalStartLinks config={config} current="apply" />
        <ol className="grid grid-cols-3 gap-2" aria-label="Application steps">
          {APPLICATION_STEPS.map(({ number, label }) => {
            const active = applicationStep === number;
            const complete = applicationStep > number;
            return (
              <li
                key={number}
                className={cn(
                  "rounded-brand border px-2.5 py-2 text-body-sm",
                  active
                    ? "border-primary bg-primary/10 text-base-content"
                    : complete
                      ? "border-success/40 bg-success/10 text-base-content"
                      : "border-base-300 text-base-content/60",
                )}
              >
                <span className="block font-mono text-label">{number}</span>
                <span className="mt-0.5 block leading-tight">{label}</span>
              </li>
            );
          })}
        </ol>

        {applicationStep === 1 ? (
          <section className="space-y-4" aria-labelledby="application-business-heading">
            <div>
              <h2 id="application-business-heading" className="font-heading text-h2">
                Tell us about the business
              </h2>
              <p className="mt-1 text-body-sm text-base-content/70">
                Start with the details patients and the verification team need to recognise you.
              </p>
            </div>
            <Field label="Business name">
              {(p) => (
                <Input
                  {...p}
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                />
              )}
            </Field>
            <LocationFields
              value={location}
              onChange={setLocation}
              addressLabel="Premises address"
            />
            <Field label="Contact person">
              {(p) => (
                <Input
                  {...p}
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  placeholder={
                    config.type === "PHARMACY"
                      ? "Superintendent Pharmacist"
                      : "Lab Scientist in charge"
                  }
                />
              )}
            </Field>
            <Field
              label="Account email"
              hint="Use this email to sign in and recover your portal account."
            >
              {(p) => (
                <Input
                  {...p}
                  type="email"
                  autoComplete="email"
                  value={contactEmail}
                  readOnly={!!prior}
                  onChange={(event) => setContactEmail(event.target.value)}
                />
              )}
            </Field>
            <Field label="Contact phone">
              {(p) => (
                <Input
                  {...p}
                  type="tel"
                  autoComplete="tel"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                />
              )}
            </Field>
            <Button
              full
              disabled={
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim()) ||
                contactPhone.replace(/\D/g, "").length < 10 ||
                !businessName.trim() ||
                !location.address.trim() ||
                !location.city.trim() ||
                !location.localGovernmentArea ||
                !location.state ||
                !contactName.trim()
              }
              onClick={() => setApplicationStep(2)}
            >
              Continue to verification
            </Button>
          </section>
        ) : null}

        {applicationStep === 2 ? (
          <section className="space-y-4" aria-labelledby="application-verification-heading">
            <div>
              <h2 id="application-verification-heading" className="font-heading text-h2">
                Share your verification details
              </h2>
              <p className="mt-1 text-body-sm text-base-content/70">
                CAC is checked automatically. Your licence is checked against the {config.council}{" "}
                register.
              </p>
            </div>
            <Field label="CAC registration number" hint="Verified automatically.">
              {(p) => (
                <Input
                  {...p}
                  className="font-mono"
                  value={cac}
                  onChange={(event) => setCac(event.target.value)}
                  placeholder="RC-2884190"
                />
              )}
            </Field>
            <Field
              label={`${config.council} licence number`}
              error={error ? `A ${config.council} licence number is required.` : null}
              hint="Checked manually against the register."
            >
              {(p) => (
                <Input
                  {...p}
                  className="font-mono"
                  value={licence}
                  onChange={(event) => {
                    setLicence(event.target.value);
                    setError(false);
                  }}
                  placeholder={
                    config.type === "PHARMACY" ? "PCN/PRM/LA/2021/04417" : "MLSCN/LAB/2020/1188"
                  }
                />
              )}
            </Field>
            <Field label="Licence expiry date">
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  numeric
                  value={licenceExpiry}
                  onChange={(event) => {
                    setLicenceExpiry(event.target.value);
                    setError(false);
                  }}
                />
              )}
            </Field>
            <div>
              <p className="mb-2 text-label font-medium">Licence document</p>
              <FileDrop
                label="Upload your licence"
                filename={file}
                onFile={(chosen) => setFile(chosen.name)}
                onRemove={() => setFile(null)}
                pendingVerification={!!file}
              />
            </div>
            {config.type === "LAB" ? (
              <div>
                <p className="mb-2 text-label font-medium">
                  Tests you offer <span className="font-normal text-base-content/50">Optional</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {LAB_SERVICES.map((service) => (
                    <Chip
                      key={service}
                      selected={services.includes(service)}
                      onClick={() =>
                        setServices((value) =>
                          value.includes(service)
                            ? value.filter((item) => item !== service)
                            : [...value, service],
                        )
                      }
                    >
                      {service}
                    </Chip>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setApplicationStep(1)}>
                Back
              </Button>
              <Button
                disabled={!cac.trim() || !licence.trim() || !licenceExpiry || !file}
                onClick={() => setApplicationStep(3)}
              >
                Continue
              </Button>
            </div>
          </section>
        ) : null}

        {applicationStep === 3 ? (
          <section className="space-y-4" aria-labelledby="application-payout-heading">
            <div>
              <h2 id="application-payout-heading" className="font-heading text-h2">
                Add the business payout account
              </h2>
              <p className="mt-1 text-body-sm text-base-content/70">
                This is where Monovella sends your service price after a verified patient payment.
              </p>
            </div>
            <Card>
              <p className="measure text-body-sm text-base-content/70">
                Patients never see these bank details. We verify the account before any payout.
              </p>
              <div className="mt-3 space-y-3">
                <Field label="Bank">
                  {(p) => (
                    <Select
                      {...p}
                      value={bankCode}
                      onChange={(event) => setBankCode(event.target.value)}
                    >
                      <option value="">Select a bank</option>
                      {reference.banks.map((bank) => (
                        <option key={bank.code} value={bank.code}>
                          {bank.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field label="Account number">
                  {(p) => (
                    <Input
                      {...p}
                      numeric
                      maxLength={10}
                      value={bankAccountNumber}
                      onChange={(event) => setBankAccountNumber(event.target.value)}
                    />
                  )}
                </Field>
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={() => setApplicationStep(2)}>
                Back
              </Button>
              <Button
                disabled={mutation.blocked || !bankCode || !/^\d{10}$/.test(bankAccountNumber)}
                onClick={() => {
                  if (!licence.trim() || !licenceExpiry.trim()) {
                    setError(true);
                    setApplicationStep(2);
                    return;
                  }
                  const applicationId = nextId("app");
                  const providerId = existing?.id ?? nextId("provider");
                  const credentialId = nextId("credential");
                  const submission = {
                    applicationId,
                    previousApplicationId: previousApplicationId ?? undefined,
                    providerId,
                    credentialId,
                    providerType: config.type,
                    businessName,
                    address: location.address,
                    city: location.city,
                    localGovernmentArea: location.localGovernmentArea,
                    state: location.state,
                    contactName,
                    contactEmail,
                    contactPhone,
                    cacNumber: cac,
                    licenceNumber: licence,
                    licenceExpiry,
                    documentFilename: file ?? "",
                    services,
                    bankCode,
                    bankAccountNumber,
                  };
                  if (mutation.blocked) return;
                  if (!createProviderApplication(structuredClone(data), submission)) {
                    toast("Check the application details and licence expiry date.");
                    return;
                  }
                  update((draft) => {
                    createProviderApplication(draft, submission);
                  });
                  toast("Application submitted.");
                  navigate(`${config.base}/application?id=${applicationId}`);
                }}
              >
                Submit application
              </Button>
            </div>
          </section>
        ) : null}
      </div>
    </WebAuthShell>
  );
}

/** V15 — Renew Your Licence. V3's narrow re-verification subset, X24's provider-side twin. */
export function ProviderRenewLicence({ config }: { config: PortalConfig }) {
  config = useActivePortal(config);
  const navigate = useNavigate();
  const { toast, data, update, nextId } = usePrototype();
  const provider = providerById(data, config.providerId);
  const [licence, setLicence] = useState("");
  const [licenceExpiry, setLicenceExpiry] = useState("");
  const [file, setFile] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <>
      <PageHeader title="Renew your licence" />
      <div data-screen="V15" className="max-w-2xl space-y-5">
        <ScreenStates
          states={[
            { value: "none", label: "Default" },
            { value: "pending", label: "400 renewal pending" },
          ]}
          value={pending ? "pending" : "none"}
          onChange={(v) => setPending(v === "pending")}
        />

        {pending ? (
          <Banner
            tone="info"
            action={
              <Link
                to={`${config.base}/application`}
                className="text-label text-primary underline underline-offset-2"
              >
                See it
              </Link>
            }
          >
            A renewal is already pending review.
          </Banner>
        ) : null}

        <p className="measure text-body-sm text-base-content/70">
          Keep serving patients without interruption: confirm your {config.council} licence details
          and upload a current licence document. Your business name, CAC registration and premises
          stay exactly as they are.
        </p>

        <Card>
          <dl className="divide-y divide-base-300">
            <DataRow mono={false} label="Business name" value={provider?.business_name ?? "-"} />
            <DataRow
              mono={false}
              align="left"
              label="Premises address"
              value={provider?.premises_address ?? "-"}
            />
          </dl>
        </Card>

        <Field label={`${config.council} licence number`}>
          {(p) => (
            <Input
              {...p}
              className="font-mono"
              value={licence}
              onChange={(e) => setLicence(e.target.value)}
              placeholder={
                config.type === "PHARMACY" ? "PCN/PRM/LA/2021/04417" : "MLSCN/LAB/2020/1188"
              }
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
        <div>
          <p className="mb-2 text-label font-medium">Licence document</p>
          <FileDrop
            label="Upload a current licence"
            filename={file}
            onFile={(chosen) => setFile(chosen.name)}
            onRemove={() => setFile(null)}
            pendingVerification={!!file}
          />
        </div>

        <Button
          full
          disabled={pending || !licence.trim() || !licenceExpiry.trim() || !file}
          onClick={() => {
            const operatingLicence = data.providerCredentials.find(
              (item) =>
                item.provider_id === config.providerId &&
                item.credential_type === "OPERATING_LICENCE",
            );
            const applicationId = nextId("app");
            update((draft) => {
              submitProviderGovernance(draft, {
                id: applicationId,
                providerType: config.type,
                providerId: config.providerId,
                kind: "LICENCE_RENEWAL",
                targetCredentialId: operatingLicence?.id,
                licenceNumber: licence,
                expiryDate: licenceExpiry,
              });
            });
            toast("Renewal submitted.");
            navigate(`${config.base}/application?renewal=1&id=${applicationId}`);
          }}
        >
          Submit renewal
        </Button>
      </div>
    </>
  );
}

/** V4 — Application Status. X3's pattern, reused for a business account. */
export function ProviderApplicationStatus({ config }: { config: PortalConfig }) {
  config = useActivePortal(config);
  const { data } = usePrototype();
  const [searchParams] = useSearchParams();
  const requestedId = searchParams.get("id");
  const link = requestedId
    ? applicationLink(data, requestedId)
    : data.governanceApplications.find((item) => item.actor_id === config.providerId);
  const application =
    link?.actor_id === config.providerId
      ? data.applicationDetails.find((item) => item.id === link.application_id)
      : undefined;
  const key = `${config.providerId}:${application?.id ?? "none"}`;
  const [preview, setPreview] = useState<{
    key: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
  } | null>(null);
  const status = preview?.key === key ? preview.status : application?.status;
  const access = accessStatusOf(data, config.providerId);
  if (!application)
    return (
      <>
        <PageHeader title={requestedId ? "Application unavailable" : "No application yet"} />
        <div data-screen="V4" className="max-w-2xl">
          <EmptyState
            title={requestedId ? "Application unavailable" : "No application yet"}
            body={
              requestedId
                ? "This reference is not available in this provider workspace."
                : "Submit your business details and licence to start the review."
            }
            action={<ButtonLink to={`${config.base}/apply`}>Start application</ButtonLink>}
          />
        </div>
      </>
    );
  return (
    <>
      <PageHeader
        title="Verification"
        description={application.business_name ?? "Your application"}
      />
      <div data-screen="V4" className="max-w-2xl space-y-4">
        <ScreenStates
          states={[
            { value: "PENDING", label: "Pending" },
            { value: "APPROVED", label: "Approved" },
            { value: "REJECTED", label: "Rejected" },
          ]}
          value={status ?? "PENDING"}
          onChange={(value) =>
            setPreview({ key, status: value as "PENDING" | "APPROVED" | "REJECTED" })
          }
        />
        <Card>
          <Badge
            tone={status === "APPROVED" ? "success" : status === "REJECTED" ? "error" : "warning"}
          >
            {status === "APPROVED"
              ? "Verified"
              : status === "REJECTED"
                ? "Not approved"
                : "Under review"}
          </Badge>
          <h2 className="mt-3 font-heading text-h2">
            {status === "APPROVED"
              ? "Your application is approved"
              : status === "REJECTED"
                ? "Your application was not approved"
                : "Under review by Monovella"}
          </h2>
          <p className="measure mt-2 text-body text-base-content/80">
            {status === "APPROVED"
              ? "Review your payout account and availability before taking new requests."
              : status === "REJECTED"
                ? (application.prior_rejection_reason ??
                  "Review the supporting details before submitting a new application.")
                : "Your business details and supporting licence are waiting for a staff review. You can return here to check the decision."}
          </p>
          <dl className="mt-4 divide-y divide-base-300 border-t border-base-300 pt-2">
            <DataRow label="Reference" value={application.id} />
            <DataRow label="CAC" value={application.cac_number ?? "Not supplied"} />
            <DataRow
              label={`${config.council} licence`}
              value={application.license_number ?? "Not supplied"}
            />
            <DataRow
              label="Licence document"
              value={application.license_document_url ?? "Not supplied"}
            />
            <DataRow label="Premises" value={application.premises_address ?? "Not supplied"} />
            <DataRow label="Submitted" value={formatDateTime(application.submitted_at)} />
            {access ? <DataRow label="Workspace access" value={access} mono={false} /> : null}
          </dl>
        </Card>
        {status === "APPROVED" ? (
          <ButtonLink
            to={
              data.providerAccounts?.some((item) => item.providerId === config.providerId) &&
              !readAuthJourney().providerPasswords?.[config.providerId]
                ? `${config.base}/sign-in`
                : config.base
            }
          >
            Open your portal
          </ButtonLink>
        ) : null}
        {status === "REJECTED" ? (
          <ButtonLink to={`${config.base}/apply?reapply=${application.id}`}>
            Correct and resubmit
          </ButtonLink>
        ) : null}
      </div>
    </>
  );
}

const LAB_SERVICES = [
  "Haematology",
  "Chemistry",
  "Microbiology",
  "Hormones",
  "Serology",
  "Histopathology",
  "Home sample collection",
  "Culture and sensitivity",
  "Imaging",
  "Genetics",
];

/** V14 — Business Profile. The operational fields a provider can keep current on its own. */
export function ProviderProfile({ config }: { config: PortalConfig }) {
  config = useActivePortal(config);
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "conflict"],
    "your business profile",
  );
  const { data, update, toast } = usePrototype();
  const provider = providerById(data, config.providerId);
  const [location, setLocation] = useState<LocationValue>({
    address: provider?.premises_address ?? "",
    city: provider?.city ?? "",
    localGovernmentArea: provider?.local_government_area ?? "",
    state: provider?.state ?? "",
  });
  const [contactName, setContactName] = useState(provider?.contact_name ?? "");
  const [contactPhone, setContactPhone] = useState(provider?.contact_phone ?? "");
  const [bank, setBank] = useState<{ code: string; name: string } | null>(
    reference.banks.find((candidate) => candidate.code === provider?.payout_bank_code) ?? null,
  );
  const [payoutAccount, setPayoutAccount] = useState(provider?.payout_bank_account_number ?? "");
  const [payoutName, setPayoutName] = useState(provider?.payout_account_name ?? "");
  const [payoutState, setPayoutState] = useState<"idle" | "checking" | "verified" | "failed">(
    provider?.payout_verified_at ? "verified" : "idle",
  );
  const [bankPicker, setBankPicker] = useState(false);
  const [note, setNote] = useState(provider?.profile_note ?? "");
  const [services, setServices] = useState<string[]>(provider?.services_offered ?? []);
  const [serviceFees, setServiceFees] = useState<Record<string, number>>(
    Object.fromEntries((provider?.service_fees ?? []).map((item) => [item.service, item.fee_kobo])),
  );
  const [logo, setLogo] = useState<string | null>(provider?.logo_url ?? null);
  const [error, setError] = useState(false);

  if (!provider) {
    return (
      <>
        <PageHeader title="Business profile" />
        <EmptyState title="No provider identity on this account" body="" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Business profile"
        description="Keep the details patients and Monovella staff see current."
      />
      <div data-screen="V14" className="max-w-2xl space-y-5">
        {mutation.node}
        <div className="flex items-center gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-brand border border-base-300 bg-base-200 text-h3 text-base-content/50">
            {logo ? (
              <img src={logo} alt="" className="size-16 object-cover" />
            ) : (
              <Store aria-hidden className="size-6" strokeWidth={1.5} />
            )}
          </span>
          <FileDrop
            label={logo ? "Change logo" : "Add a logo"}
            accept="JPG or PNG"
            filename={logo ? "logo.png" : null}
            onFile={() => setLogo("/avatars/placeholder.svg")}
            onRemove={logo ? () => setLogo(null) : undefined}
          />
        </div>

        <Card>
          <p className="font-heading text-h3">Verified details</p>
          <p className="measure mt-1.5 text-body-sm text-base-content/70">
            These came from your application and were checked by Monovella. Changing any of them
            needs a fresh check, not a quick edit here.
          </p>
          <dl className="mt-3 divide-y divide-base-300 border-t border-base-300 pt-2">
            <DataRow label="Business name" value={provider.business_name} mono={false} />
            <DataRow label="CAC" value={provider.cac_number ?? "Verified registration"} />
            <DataRow
              label={`${config.council} licence`}
              value={provider.license_number ?? "Verified licence"}
            />
          </dl>
          <Link
            to={`${config.base}/renew-licence`}
            className="mt-3 inline-block text-label text-primary underline underline-offset-2"
          >
            Renew your licence
          </Link>
        </Card>

        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-heading text-h3">Credentials & certificates</p>
            <p className="mt-1 text-body-sm text-base-content/65">
              Upload supporting documents and see what is verified, pending, or retired.
            </p>
          </div>
          <ButtonLink variant="secondary" to={`${config.base}/credentials`}>
            Manage documents
          </ButtonLink>
        </Card>

        <LocationFields
          value={location}
          onChange={setLocation}
          addressLabel="Premises address"
          errors={
            error
              ? {
                  address: !location.address.trim() ? "Premises address is required." : "",
                  city: !location.city.trim() ? "City is required." : "",
                  state: !location.state ? "State is required." : "",
                  localGovernmentArea: !location.localGovernmentArea
                    ? "Local Government Area is required."
                    : "",
                }
              : undefined
          }
        />
        <Field label="Contact person">
          {(p) => (
            <Input {...p} value={contactName} onChange={(e) => setContactName(e.target.value)} />
          )}
        </Field>
        <Field label="Contact phone">
          {(p) => (
            <Input
              {...p}
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          )}
        </Field>

        {config.type === "LAB" ? (
          <div>
            <p className="mb-2 text-label font-medium">
              Tests you offer <span className="font-normal text-base-content/50">Optional</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {LAB_SERVICES.map((s) => (
                <Chip
                  key={s}
                  selected={services.includes(s)}
                  onClick={() => {
                    setServices((current) =>
                      current.includes(s) ? current.filter((item) => item !== s) : [...current, s],
                    );
                    if (!serviceFees[s]) {
                      setServiceFees((current) => ({ ...current, [s]: 500000 }));
                    }
                  }}
                >
                  {s}
                </Chip>
              ))}
            </div>
            {services.length ? (
              <div className="mt-4 space-y-3">
                <p className="measure text-body-sm text-base-content/65">
                  Indicative prices patients see before they send a test request. A specific order
                  can still need a confirmed quote.
                </p>
                {services.map((service) => (
                  <Field key={service} label={`${service} price (₦)`}>
                    {(p) => (
                      <NumberStepper
                        {...p}
                        step={100}
                        min={0}
                        value={String((serviceFees[service] ?? 0) / 100)}
                        onValueChange={(nextValue) => {
                          const value = Number(nextValue);
                          setServiceFees((current) => ({
                            ...current,
                            [service]: Number.isFinite(value) ? Math.round(value * 100) : 0,
                          }));
                        }}
                      />
                    )}
                  </Field>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <Field
          label="Profile note"
          optional
          hint="The short line patients see when browsing the directory."
        >
          {(p) => <Textarea {...p} value={note} onChange={(e) => setNote(e.target.value)} />}
        </Field>

        <Card>
          <p className="font-heading text-h3">Payout account</p>
          <p className="measure mt-1.5 text-body-sm text-base-content/70">
            This is where Monovella sends your share after a patient’s verified Nomba checkout. It
            is never shown to patients.
          </p>
          <div className="mt-3 space-y-3">
            <Field label="Bank">
              {() => (
                <button
                  type="button"
                  onClick={() => setBankPicker(true)}
                  className="min-h-11 w-full rounded-brand border border-base-300 bg-base-200 px-3 text-left text-body"
                >
                  {bank ? (
                    bank.name
                  ) : (
                    <span className="text-base-content/45">Choose your bank</span>
                  )}
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
                  value={payoutAccount}
                  onChange={(event) => {
                    setPayoutAccount(event.target.value.replace(/\D/g, "").slice(0, 10));
                    setPayoutName("");
                    setPayoutState("idle");
                  }}
                />
              )}
            </Field>
            <Button
              variant="secondary"
              disabled={!bank || payoutAccount.length !== 10 || payoutState === "checking"}
              onClick={() => {
                setPayoutState("checking");
                window.setTimeout(() => {
                  if (payoutAccount === "0000000000") {
                    setPayoutState("failed");
                    return;
                  }
                  setPayoutName(provider.business_name);
                  setPayoutState("verified");
                }, 600);
              }}
            >
              {payoutState === "checking" ? "Checking account…" : "Verify account"}
            </Button>
            {payoutState === "verified" ? (
              <Banner tone="success">Verified recipient: {payoutName}</Banner>
            ) : null}
            {payoutState === "failed" ? (
              <Banner tone="error">
                We couldn't verify this account. Check the bank and number.
              </Banner>
            ) : null}
          </div>
        </Card>

        <Button
          full
          onClick={() => {
            if (
              !location.address.trim() ||
              !location.city.trim() ||
              !location.localGovernmentArea ||
              !location.state
            ) {
              setError(true);
              return;
            }
            if (payoutState !== "verified" || !bank || !payoutName) {
              toast("Verify the payout account before saving.");
              return;
            }
            update((draft) => {
              const target = draft.providers.find((pr) => pr.id === config.providerId);
              if (!target) return;
              target.premises_address = location.address;
              target.city = location.city;
              target.local_government_area = location.localGovernmentArea;
              target.state = location.state;
              target.contact_name = contactName;
              target.contact_phone = contactPhone;
              target.payout_bank_account_number = payoutAccount;
              target.payout_bank_code = bank.code;
              target.payout_account_name = payoutName;
              target.payout_verified_at = now().toISOString().slice(0, 19);
              target.profile_note = note || undefined;
              target.logo_url = logo;
              if (config.type === "LAB") {
                target.services_offered = services;
                target.service_fees = services.map((service) => ({
                  service,
                  fee_kobo: serviceFees[service] ?? 0,
                }));
              }
            });
            toast("Profile updated.");
          }}
        >
          Save changes
        </Button>
        <Sheet open={bankPicker} onClose={() => setBankPicker(false)} title="Choose your bank">
          <SearchablePicker
            items={reference.banks}
            value={bank?.code}
            getKey={(candidate) => candidate.code}
            getLabel={(candidate) => candidate.name}
            getMeta={(candidate) => candidate.code}
            placeholder="Search Nigerian banks"
            onSelect={(candidate) => {
              setBank(candidate);
              setPayoutName("");
              setPayoutState("idle");
              setBankPicker(false);
            }}
          />
        </Sheet>
      </div>
    </>
  );
}

/** V14a — auditable credential and certificate management for verified providers. */
export function ProviderCredentials({ config }: { config: PortalConfig }) {
  config = useActivePortal(config);
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation"],
    "this credential",
  );
  const { data, update, toast, nextId } = usePrototype();
  const credentials = data.providerCredentials.filter(
    (item) => item.provider_id === config.providerId,
  );
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ProviderCredentialRead | null>(null);
  const [removing, setRemoving] = useState<ProviderCredentialRead | null>(null);
  const [retiring, setRetiring] = useState<ProviderCredentialRead | null>(null);
  const [title, setTitle] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [document, setDocument] = useState<string | null>(null);

  const resetForm = () => {
    setAdding(false);
    setEditing(null);
    setTitle("");
    setReferenceNumber("");
    setExpiryDate("");
    setDocument(null);
  };

  const openNew = () => {
    resetForm();
    setAdding(true);
  };

  const editCredential = (credential: ProviderCredentialRead) => {
    setEditing(credential);
    setTitle(credential.title);
    setReferenceNumber(credential.reference_number);
    setExpiryDate(credential.expires_at ?? "");
    setDocument(credential.document_filename);
  };

  const saveCredential = () => {
    if (!title.trim() || !referenceNumber.trim() || !document) return;
    const credentialId = nextId("pcred");
    const applicationId = nextId("app");
    update((draft) => {
      if (editing) {
        const target = draft.providerCredentials.find((item) => item.id === editing.id);
        if (!target) return;
        target.title = title.trim();
        target.reference_number = referenceNumber.trim();
        target.document_filename = document;
        target.expires_at = expiryDate || null;
        // A replacement must be checked again; the previous verification is not reused.
        target.verification_status = "PENDING";
        target.verified_at = null;
        target.retired_at = null;
      } else {
        submitProviderGovernance(draft, {
          id: applicationId,
          providerType: config.type,
          providerId: config.providerId,
          kind: "ADDITIONAL_CREDENTIAL",
          credentialId,
          licenceNumber: referenceNumber.trim(),
          expiryDate: expiryDate || "2099-12-31",
        });
        const created = draft.providerCredentials.find((item) => item.id === credentialId);
        if (created) {
          created.title = title.trim();
          created.document_filename = document;
          created.expires_at = expiryDate || null;
        }
      }
    });
    toast(
      editing ? "Updated certificate submitted for review." : "Certificate submitted for review.",
    );
    resetForm();
  };

  const status = (credential: ProviderCredentialRead) => {
    if (credential.retired_at) return { label: "Retired", tone: "neutral" as Tone };
    if (credential.verification_status === "VERIFIED")
      return { label: "Verified", tone: "success" as Tone };
    if (credential.verification_status === "REJECTED")
      return { label: "Needs attention", tone: "error" as Tone };
    return { label: "Under review", tone: "warning" as Tone };
  };

  return (
    <>
      <PageHeader
        title="Credentials & certificates"
        description="Documents stay traceable while Monovella verifies what patients can rely on."
        action={
          <Button onClick={openNew}>
            <Plus aria-hidden className="size-4" strokeWidth={1.5} />
            Add certificate
          </Button>
        }
      />
      <div data-screen="V14a" className="max-w-3xl space-y-4">
        {mutation.node}
        <Banner tone="info">
          Your {config.council} operating licence is renewed separately. New or replacement
          certificates are not patient-facing until Monovella verifies them.
        </Banner>

        {credentials.length ? (
          <div className="space-y-3">
            {credentials.map((credential) => {
              const currentStatus = status(credential);
              const canEdit =
                credential.credential_type === "CERTIFICATION" && !credential.retired_at;
              const canDelete = canEdit && credential.verification_status !== "VERIFIED";
              return (
                <Card key={credential.id} className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-h3">{credential.title}</p>
                      <p className="mt-1 text-body-sm text-base-content/60">
                        {credential.credential_type === "OPERATING_LICENCE"
                          ? `${config.council} operating licence`
                          : "Supporting certificate"}
                      </p>
                    </div>
                    <Badge tone={currentStatus.tone}>{currentStatus.label}</Badge>
                  </div>

                  <dl className="divide-y divide-base-300 border-y border-base-300">
                    <DataRow label="Reference" value={credential.reference_number} />
                    <DataRow label="Document" value={credential.document_filename} mono={false} />
                    <DataRow
                      label="Expires"
                      value={
                        credential.expires_at
                          ? formatDate(credential.expires_at)
                          : "No expiry supplied"
                      }
                      mono={false}
                    />
                  </dl>

                  {credential.credential_type === "OPERATING_LICENCE" ? (
                    <Link
                      to={`${config.base}/renew-licence`}
                      className="inline-block text-label text-primary underline underline-offset-2"
                    >
                      Renew this licence
                    </Link>
                  ) : canEdit ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => editCredential(credential)}
                      >
                        {credential.verification_status === "VERIFIED"
                          ? "Replace document"
                          : "Edit upload"}
                      </Button>
                      {canDelete ? (
                        <Button size="sm" variant="ghost" onClick={() => setRemoving(credential)}>
                          Delete upload
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => setRetiring(credential)}>
                          Retire certificate
                        </Button>
                      )}
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="No documents yet"
            body="Add the certificates Monovella needs to check for this business."
            action={<Button onClick={openNew}>Add certificate</Button>}
          />
        )}
      </div>

      <Sheet
        open={adding || editing !== null}
        onClose={resetForm}
        title={editing ? "Replace or update certificate" : "Add certificate"}
        footer={
          <Button
            full
            disabled={!title.trim() || !referenceNumber.trim() || !document}
            onClick={saveCredential}
          >
            {editing ? "Submit update for review" : "Submit for review"}
          </Button>
        }
      >
        <div className="space-y-4">
          <Banner tone="info">
            Use this for a supporting certificate. Licence changes belong in the renewal flow so the
            verified operating record remains clear.
          </Banner>
          <Field label="Certificate title">
            {(p) => (
              <Input {...p} value={title} onChange={(event) => setTitle(event.target.value)} />
            )}
          </Field>
          <Field label="Certificate or registration number">
            {(p) => (
              <Input
                {...p}
                className="font-mono"
                value={referenceNumber}
                onChange={(event) => setReferenceNumber(event.target.value)}
              />
            )}
          </Field>
          <Field label="Expiry date" optional>
            {(p) => (
              <Input
                {...p}
                type="date"
                value={expiryDate}
                onChange={(event) => setExpiryDate(event.target.value)}
              />
            )}
          </Field>
          <FileDrop
            label="Upload certificate"
            accept="PDF, JPG or PNG"
            filename={document}
            onFile={(chosen) => setDocument(chosen.name)}
            onRemove={() => setDocument(null)}
            pendingVerification={!!document}
          />
        </div>
      </Sheet>

      <Modal
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Delete this upload?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!removing) return;
                update((draft) => {
                  draft.providerCredentials = draft.providerCredentials.filter(
                    (item) => item.id !== removing.id,
                  );
                });
                setRemoving(null);
                toast("Upload deleted.");
              }}
            >
              Delete upload
            </Button>
          </>
        }
      >
        This document has not been verified. Deleting it removes the pending upload from this
        prototype session.
      </Modal>

      <Modal
        open={!!retiring}
        onClose={() => setRetiring(null)}
        title="Retire this certificate?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRetiring(null)}>
              Keep current
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!retiring) return;
                update((draft) => {
                  const target = draft.providerCredentials.find((item) => item.id === retiring.id);
                  if (target) target.retired_at = now().toISOString();
                });
                setRetiring(null);
                toast("Certificate retired from current business details.");
              }}
            >
              Retire certificate
            </Button>
          </>
        }
      >
        Verified documents stay in the audit record. Retiring one only removes it from the current
        business profile.
      </Modal>
    </>
  );
}

/**
 * V16 — Portal Settings. Account-level controls for whoever's signed into the
 * shared counter login — distinct from V14's business-level operational fields.
 */
export function ProviderSettings({ config }: { config: PortalConfig }) {
  config = useActivePortal(config);
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "validation", "conflict"],
    "these settings",
  );
  const { data, update, toast } = usePrototype();
  const navigate = useNavigate();
  const scope = config.type === "LAB" ? "lab" : "pharmacy";
  const prefs = notificationPrefsFor(data, scope);
  const twoFactor = twoFactorFor(data, scope);
  const [changingPassword, setChangingPassword] = useState(false);
  const [managingTwoFactor, setManagingTwoFactor] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [factorPassword, setFactorPassword] = useState("");
  const [factorError, setFactorError] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [wrong, setWrong] = useState(false);

  const toggle = (
    key:
      | "incoming_request_alerts"
      | "payment_fee_updates"
      | "credential_licence_reminders"
      | "product_updates",
  ) => {
    update((draft) => {
      const setting = notificationPrefsFor(draft, scope);
      setting[key] = !setting[key];
    });
    toast("Saved.");
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your own account, not the business record (that's Profile)."
      />
      <div data-screen="V16" className="max-w-2xl space-y-5">
        {mutation.node}
        <ListGroup label="Account">
          <ListRow
            onClick={() => setChangingPassword(true)}
            leading={
              <KeyRound aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Change password"
          />
          <ListRow
            onClick={() => setManagingTwoFactor(true)}
            leading={
              <ShieldCheck aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Two-step verification"
            meta={twoFactor.enabled ? "Authenticator app on" : "Not set up"}
          />
          <ListRow
            onClick={() => {
              updateAuthJourney((draft) => {
                draft.web_sessions[config.type].authenticated = false;
              });
              navigate(`${config.base}/sign-in`);
            }}
            leading={
              <LogOut aria-hidden className="size-4 text-base-content/45" strokeWidth={1.5} />
            }
            title="Sign out"
          />
        </ListGroup>

        <div>
          <p className="mb-2 px-1 text-label font-medium text-base-content/60">Notifications</p>
          <ListGroup>
            <Checkbox
              label="Incoming request alerts"
              description={`When a patient sends a new ${config.workNoun} request.`}
              checked={!!prefs.incoming_request_alerts}
              onChange={() => toggle("incoming_request_alerts")}
              className="px-4 py-3"
            />
            <Checkbox
              label="Payment & fee updates"
              description="Confirmations and disputes."
              checked={!!prefs.payment_fee_updates}
              onChange={() => toggle("payment_fee_updates")}
              className="px-4 py-3"
            />
            <Checkbox
              label="Licence reminders"
              description="Before your licence expires."
              checked={!!prefs.credential_licence_reminders}
              onChange={() => toggle("credential_licence_reminders")}
              className="px-4 py-3"
            />
            <Checkbox
              label="Product updates"
              description="Occasional news about Monovella itself."
              checked={!!prefs.product_updates}
              onChange={() => toggle("product_updates")}
              className="px-4 py-3"
            />
          </ListGroup>
        </div>

        <Modal
          open={changingPassword}
          onClose={() => setChangingPassword(false)}
          title="Change password"
          footer={
            <>
              <Button variant="secondary" onClick={() => setChangingPassword(false)}>
                Cancel
              </Button>
              <Button
                disabled={mutation.blocked || !current || next.length < 12}
                onClick={() => {
                  if (mutation.blocked) return;
                  if (!providerPasswordMatches(readAuthJourney(), config.providerId, current)) {
                    setWrong(true);
                    return;
                  }
                  updateAuthJourney((draft) => {
                    changeProviderPassword(draft, config.providerId, current, next);
                  });
                  setWrong(false);
                  setChangingPassword(false);
                  setCurrent("");
                  setNext("");
                  toast("Password changed.");
                }}
              >
                Save
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Current password" error={wrong ? "Incorrect current password." : null}>
              {(p) => (
                <Input
                  {...p}
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => {
                    setCurrent(e.target.value);
                    setWrong(false);
                  }}
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
          </div>
        </Modal>

        <Modal
          open={managingTwoFactor}
          onClose={() => {
            setManagingTwoFactor(false);
            setFactorError(null);
            setTwoFactorCode("");
            setFactorPassword("");
            setRecoveryCodes([]);
          }}
          title="Two-step verification"
          footer={
            recoveryCodes.length > 0 ? (
              <Button
                onClick={() => {
                  setRecoveryCodes([]);
                  setManagingTwoFactor(false);
                }}
              >
                Done
              </Button>
            ) : (
              <Button
                disabled={
                  mutation.blocked || !twoFactorCode || (twoFactor.enabled && !factorPassword)
                }
                variant={twoFactor.enabled ? "destructive" : "primary"}
                onClick={() => {
                  if (mutation.blocked) return;
                  const auth = readAuthJourney();
                  let ok = false;
                  update((draft) => {
                    ok = twoFactor.enabled
                      ? disableProviderFactor(
                          draft,
                          auth,
                          config.providerId,
                          factorPassword,
                          twoFactorCode,
                        )
                      : enrollProviderFactor(draft, auth, config.providerId, twoFactorCode);
                  });
                  updateAuthJourney((draft) => {
                    draft.providerFactors = auth.providerFactors;
                  });
                  if (!ok) {
                    setFactorError(
                      twoFactor.enabled
                        ? "Check your password and verification code. Repeated incorrect codes pause verification for five minutes."
                        : "That authenticator code is not valid.",
                    );
                    return;
                  }
                  setFactorError(null);
                  setTwoFactorCode("");
                  setFactorPassword("");
                  if (twoFactor.enabled) {
                    setRecoveryCodes([]);
                    setManagingTwoFactor(false);
                    toast("Two-step verification is off.");
                  } else {
                    setRecoveryCodes(
                      auth.providerFactors?.[config.providerId]?.recoveryCodes ?? [],
                    );
                    toast("Two-step verification is on.");
                  }
                }}
              >
                {twoFactor.enabled ? "Turn it off" : "Confirm and turn on"}
              </Button>
            )
          }
        >
          <div className="space-y-4">
            <p className="measure text-body-sm text-base-content/70">
              {twoFactor.enabled
                ? `Authenticator app connected. ${twoFactor.recovery_codes_remaining} recovery codes remain. Turning it off requires your current password and an authenticator or unused recovery code.`
                : "Connect your authenticator, then enter its six-digit code to finish setup."}
            </p>
            <p className="text-caption text-base-content/60">
              Demo authenticator code: {DEMO_CODES.authenticatorOtp}. This prototype does not create
              a real secret.
            </p>
            {recoveryCodes.length > 0 ? (
              <div className="space-y-2">
                <p className="text-label font-medium">Save your demo recovery codes</p>
                <p className="text-caption text-base-content/60">
                  Each works once. These simulated codes are shown only during this setup.
                </p>
                <ul className="space-y-1">
                  {recoveryCodes.map((code) => (
                    <li key={code} className="break-all font-mono text-caption">
                      {code}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {factorError ? <Banner tone="error">{factorError}</Banner> : null}
            {twoFactor.enabled && recoveryCodes.length === 0 ? (
              <Field label="Current password">
                {(p) => (
                  <Input
                    {...p}
                    type="password"
                    autoComplete="current-password"
                    value={factorPassword}
                    onChange={(event) => setFactorPassword(event.target.value)}
                  />
                )}
              </Field>
            ) : null}
            {recoveryCodes.length === 0 ? (
              <Field
                label={twoFactor.enabled ? "Verification code" : "Six-digit authenticator code"}
              >
                {(p) => (
                  <Input
                    {...p}
                    autoComplete="one-time-code"
                    value={twoFactorCode}
                    onChange={(event) => setTwoFactorCode(event.target.value)}
                  />
                )}
              </Field>
            ) : null}
          </div>
        </Modal>
      </div>
    </>
  );
}

/** V5 — Provider Home. What needs attention right now. */
const PROVIDER_LICENCE_EXPIRING_SOON_LABEL = "5 November 2026";
const PROVIDER_LICENCE_EXPIRED_LABEL = "3 August 2026";

type V5DemoState = "normal" | "loading" | "failed" | "suspended" | "expiring_soon" | "expired";

export function ProviderHome({ config }: { config: PortalConfig }) {
  config = useActivePortal(config);
  useTick();
  const { data, session, setSession, update, toast } = usePrototype();
  const home = providerHome(data, config.providerId);
  const provider = providerById(data, config.providerId);
  const rows = requestsForProvider(data, config.providerId);
  const [demoState, setDemoState] = useState<V5DemoState>("normal");
  const [expiryBannerDismissed, setExpiryBannerDismissed] = useState(false);
  const rawStatus = providerAvailabilityStatus(data, config.providerId);
  const payoutSet = Boolean(
    provider?.payout_bank_account_number &&
      provider?.payout_bank_code &&
      provider?.payout_verified_at,
  );
  const access = accessStatusOf(data, config.providerId);
  const blockedOnline =
    (access !== undefined && access !== "ACTIVE") ||
    !payoutSet ||
    session.standingSuspended ||
    demoState === "expired";
  // A restriction can temporarily suppress Online without overwriting the
  // provider's deliberate choice. Removing the restriction makes it visible
  // again; no booked request or collection is altered either way.
  const status = blockedOnline && rawStatus === "ONLINE" ? "AWAY" : rawStatus;
  // "Respond next" is a promise about order. Nearest deadline first.
  const pending = rows
    .filter((r) => r.status === "REQUESTED")
    .sort((a, b) => ((a.respond_by ?? "") < (b.respond_by ?? "") ? -1 : 1));

  const allClear = !home.new_requests_count && !home.in_progress_count;

  const setStatus = (next: AvailabilityStatus) => {
    update((d) => {
      const target = d.providers.find((candidate) => candidate.id === config.providerId);
      if (target) target.availability_status = next;
    });
    toast(`You're now ${availabilityLabel[next]}.`);
  };

  const explainBlockedOnline = () =>
    toast(
      !payoutSet
        ? "Verify a payout account before going Online."
        : session.standingSuspended
          ? "Standing suspended, you can't go Online right now."
          : "Renew your licence before going Online.",
    );

  return (
    <>
      <PageHeader
        utility={
          <>
            {/* Mirrors the identity shown in the sidebar footer, so the seat you
                are working in is stated where the eye lands first. */}
            <Badge tone="success">
              {config.type === "PHARMACY" ? "Verified pharmacy" : "Verified lab"}
            </Badge>
            <div className="flex flex-wrap items-center gap-2">
              <HeaderUtilityLink
                to={`${config.base}/notifications`}
                icon={Bell}
                label={
                  config.type === "PHARMACY"
                    ? "Licence and request updates"
                    : "Request and result updates"
                }
              />
              <HeaderUtilityLink
                to={`${config.base}/support`}
                icon={LifeBuoy}
                label="Help and support"
              />
            </div>
          </>
        }
        title={provider?.business_name ?? config.productName}
        description={provider?.premises_address}
      />

      <div data-screen="V5" className="space-y-5">
        <ScreenStates
          states={[
            { value: "normal", label: "Normal" },
            { value: "loading", label: "Loading" },
            { value: "failed", label: "Load failed" },
            { value: "suspended", label: "Standing suspended (V12)" },
            { value: "expiring_soon", label: "Licence expiring soon" },
            { value: "expired", label: "Licence expired" },
          ]}
          value={session.standingSuspended ? "suspended" : demoState}
          onChange={(v) => {
            setDemoState(v);
            setSession({ standingSuspended: v === "suspended" });
          }}
        />
        {session.standingSuspended ? <StandingBanner audience="provider" /> : null}
        {demoState === "expired" ? (
          <CredentialBanner
            status="EXPIRED"
            expiryDate={PROVIDER_LICENCE_EXPIRED_LABEL}
            renewTo={`${config.base}/renew-licence`}
            pausedNoun={config.pausedNoun}
          />
        ) : demoState === "expiring_soon" && !expiryBannerDismissed ? (
          <CredentialBanner
            status="EXPIRING_SOON"
            expiryDate={PROVIDER_LICENCE_EXPIRING_SOON_LABEL}
            renewTo={`${config.base}/renew-licence`}
            onDismiss={() => setExpiryBannerDismissed(true)}
          />
        ) : null}

        {/* A dashboard reads before it shows anything, so it has a load and a
            failure of its own. Only the domain states (suspension, licence)
            were declared here, which left the two conditions a provider is most
            likely to actually hit undeclared and unreviewable. */}
        {demoState === "loading" ? (
          <EmptyState
            icon={LoaderCircle}
            spin
            title="One moment"
            body="Pulling your dashboard together."
          />
        ) : null}
        {demoState === "failed" ? (
          <EmptyState
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-label font-medium">Taking new {config.pausedNoun}</p>
                  <p className="mt-1 text-body-sm text-base-content/65">
                    {config.type === "LAB"
                      ? "This does not change your published collection windows."
                      : "Change whether patients can send you new requests."}
                  </p>
                </div>
                <AvailabilityBadge status={status} audience="Provider" />
              </div>
              {!payoutSet ? (
                <Banner tone="warning" className="mt-3">
                  Verify a payout account before this business can go Online.
                </Banner>
              ) : null}
              <div className="mt-3">
                <SegmentedControl
                  label="Taking new work"
                  value={status}
                  onChange={setStatus}
                  onBlockedChange={explainBlockedOnline}
                  options={[
                    { value: "ONLINE", label: "Online", tone: "success", disabled: blockedOnline },
                    { value: "AWAY", label: "Away", tone: "warning" },
                    { value: "OUT_OF_OFFICE", label: "Out of office", tone: "error" },
                  ]}
                />
              </div>
              <p className="measure mt-3 text-body-sm text-base-content/60">
                {status === "ONLINE"
                  ? `Patients can send new ${config.workNoun} requests now.`
                  : status === "AWAY"
                    ? `Patients can still send a new ${config.workNoun} request, but should expect a slower response.`
                    : `No new ${config.workNoun} requests or collection bookings can start. Existing requests and confirmed work stay exactly as they are.`}
              </p>
            </Card>

            {allClear ? (
              <EmptyState
                title="Nothing new right now"
                body={`New ${config.workNoun} requests from patients appear here, with the time you have to respond.`}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to={`${config.base}/requests`}
                  className="rounded-brand border border-base-300 bg-base-200 p-4 transition-colors hover:border-primary/40"
                >
                  <Inbox aria-hidden className="size-5 text-primary" strokeWidth={1.5} />
                  <p className="mt-2 font-mono text-h1 leading-none tabular">
                    {home.new_requests_count}
                  </p>
                  <p className="mt-2 font-heading text-h3">Waiting on you</p>
                  <p className="mt-1 text-body-sm text-base-content/60">
                    Each has its own response deadline.
                  </p>
                </Link>
                <Link
                  to={`${config.base}/requests`}
                  className="rounded-brand border border-base-300 bg-base-200 p-4 transition-colors hover:border-primary/40"
                >
                  {config.type === "PHARMACY" ? (
                    <Pill aria-hidden className="size-5 text-secondary" strokeWidth={1.5} />
                  ) : (
                    <FlaskConical aria-hidden className="size-5 text-secondary" strokeWidth={1.5} />
                  )}
                  <p className="mt-2 font-mono text-h1 leading-none tabular">
                    {home.in_progress_count}
                  </p>
                  <p className="mt-2 font-heading text-h3">In progress</p>
                  <p className="mt-1 text-body-sm text-base-content/60">
                    {config.type === "PHARMACY"
                      ? "Accepted, not yet handed over."
                      : "Accepted, result not yet uploaded."}
                  </p>
                </Link>
              </div>
            )}

            {pending.length ? (
              <section>
                <h2 className="mb-2 font-heading text-h2">Respond next</h2>
                <div className="hidden @lg:block">
                  <TableWrap>
                    <Table className="min-w-152">
                      <thead>
                        <tr>
                          <Th>Patient</Th>
                          <Th>{config.type === "PHARMACY" ? "Medication" : "Test"}</Th>
                          <Th>Received</Th>
                          <Th>Respond within</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {pending.map((r) => (
                          <Tr key={r.id} overdue={countdown(r.respond_by).elapsed}>
                            <Td>
                              <Link
                                to={`${config.base}/requests/${r.id}`}
                                className="inline-flex min-h-6 items-center font-medium text-primary"
                              >
                                {patientName(data, r.patient_identity_id ?? "")}
                              </Link>
                            </Td>
                            <Td>{providerRequestSubject(data, r)}</Td>
                            <Td numeric>{formatDateTime(r.requested_at)}</Td>
                            <Td>
                              <Countdown deadline={r.respond_by} elapsedText="Expired" />
                            </Td>
                          </Tr>
                        ))}
                      </tbody>
                    </Table>
                  </TableWrap>
                </div>
                <div className="grid gap-3 @lg:hidden">
                  {pending.map((r) => (
                    <Card
                      key={r.id}
                      className={cn(
                        "space-y-2",
                        countdown(r.respond_by).elapsed && "border-l-[3px] border-l-error",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Link
                          to={`${config.base}/requests/${r.id}`}
                          className="inline-flex min-h-6 items-center font-medium text-primary"
                        >
                          {patientName(data, r.patient_identity_id ?? "")}
                        </Link>
                        <Countdown deadline={r.respond_by} elapsedText="Expired" />
                      </div>
                      <DataRow
                        label={config.type === "PHARMACY" ? "Medication" : "Test"}
                        value={providerRequestSubject(data, r)}
                        mono={false}
                        align="left"
                      />
                      <DataRow label="Received" value={formatDateTime(r.requested_at)} />
                    </Card>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </>
  );
}

/** V6 — Incoming Requests. Same queue pattern, touch-sized rows. */
export function ProviderRequests({ config }: { config: PortalConfig }) {
  config = useActivePortal(config);
  useTick();
  const { data } = usePrototype();
  const navigate = useNavigate();
  const [view, setView] = useState<"populated" | "loading" | "empty">("populated");
  // Two queues in one table. A request still waiting on a decision outranks
  // anything already decided, and among those the one closest to expiring is
  // the one the counter should pick up next — so `respond_by` sorts the top
  // of the list and `requested_at` sorts the settled tail.
  const rows = (view === "empty" ? [] : requestsForProvider(data, config.providerId))
    .slice()
    .sort((a, b) => {
      const pendingA = a.status === "REQUESTED";
      const pendingB = b.status === "REQUESTED";
      if (pendingA !== pendingB) return pendingA ? -1 : 1;
      if (pendingA) return (a.respond_by ?? "") < (b.respond_by ?? "") ? -1 : 1;
      return a.requested_at > b.requested_at ? -1 : 1;
    });

  return (
    <>
      <PageHeader
        title="Requests"
        description={`Patients who chose you for one ${config.workNoun}. One request, one provider, never a broadcast.`}
      />
      <div data-screen="V6" className="space-y-4">
        <ScreenStates
          states={[
            { value: "populated", label: "Populated" },
            { value: "loading", label: "Loading" },
            { value: "empty", label: "Empty" },
          ]}
          value={view}
          onChange={setView}
        />
        {view === "loading" ? <SkeletonRows rows={5} /> : null}
        {view !== "loading" && rows.length ? (
          <>
            <div className="hidden @lg:block">
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th>
                        {config.type === "PHARMACY" ? "Patient and medication" : "Patient and test"}
                      </Th>
                      <Th>Status</Th>
                      <Th>{config.type === "PHARMACY" ? "Order" : "Result"}</Th>
                      <Th>Payment</Th>
                      <Th>When</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const waiting = r.status === "REQUESTED";
                      const late = waiting && countdown(r.respond_by).elapsed;
                      return (
                        <Tr
                          key={r.id}
                          overdue={late}
                          onClick={() => navigate(`${config.base}/requests/${r.id}`)}
                        >
                          {/* The medication is what the counter actually walks to the
                              shelf for, so it rides with the name rather than in a
                              column that falls off the side of a tablet. */}
                          <Td className="py-4">
                            <Link
                              to={`${config.base}/requests/${r.id}`}
                              className="inline-flex min-h-6 items-center font-medium text-primary"
                            >
                              {patientName(data, r.patient_identity_id ?? "")}
                            </Link>
                            <span className="block text-base-content/70">
                              {providerRequestSubject(data, r)}
                            </span>
                          </Td>
                          <Td>
                            <ProviderRequestBadge status={r.status} />
                          </Td>
                          <Td>
                            {config.type === "PHARMACY" ? (
                              r.order_status ? (
                                <OrderStatusBadge status={r.order_status} />
                              ) : (
                                "—"
                              )
                            ) : r.result_status ? (
                              <Badge tone={r.result_status === "UPLOADED" ? "success" : "warning"}>
                                {r.result_status === "UPLOADED" ? "Uploaded" : "Awaiting"}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </Td>
                          <Td>
                            {data.checkoutPayments.find(
                              (payment) => payment.provider_request_id === r.id,
                            ) ? (
                              <CheckoutPaymentBadge
                                status={
                                  data.checkoutPayments.find(
                                    (payment) => payment.provider_request_id === r.id,
                                  )!.status
                                }
                              />
                            ) : (
                              <Badge tone="warning">Checkout pending</Badge>
                            )}
                          </Td>
                          {/* `respond_by` is the whole point of this queue and it was
                              missing: a counter could not tell which request was about
                              to expire. Once a request is decided the deadline is spent,
                              so the cell falls back to when it arrived. */}
                          <Td className="whitespace-nowrap">
                            <span className="block text-body-sm text-base-content/55">
                              {waiting ? "Respond within" : "Received"}
                            </span>
                            {waiting ? (
                              <Countdown deadline={r.respond_by} elapsedText="Overdue" />
                            ) : (
                              <span className="font-mono text-data tabular text-base-content/70">
                                {relativeTime(r.requested_at)}
                              </span>
                            )}
                          </Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
              </TableWrap>
            </div>
            <div className="grid gap-3 @lg:hidden">
              {rows.map((r) => {
                const waiting = r.status === "REQUESTED";
                const late = waiting && countdown(r.respond_by).elapsed;
                return (
                  <Link
                    key={r.id}
                    to={`${config.base}/requests/${r.id}`}
                    className={cn(
                      "block space-y-2 rounded-brand border border-base-300 bg-base-200 p-4 transition-colors duration-(--motion-fast) hover:border-primary/40",
                      late && "border-l-[3px] border-l-error",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-primary">
                          {patientName(data, r.patient_identity_id ?? "")}
                        </p>
                        <p className="text-body-sm text-base-content/70">
                          {providerRequestSubject(data, r)}
                        </p>
                      </div>
                      <ProviderRequestBadge status={r.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {config.type === "PHARMACY"
                        ? r.order_status && <OrderStatusBadge status={r.order_status} />
                        : r.result_status && (
                            <Badge tone={r.result_status === "UPLOADED" ? "success" : "warning"}>
                              {r.result_status === "UPLOADED" ? "Uploaded" : "Awaiting"}
                            </Badge>
                          )}
                      {data.checkoutPayments.find(
                        (payment) => payment.provider_request_id === r.id,
                      ) ? (
                        <CheckoutPaymentBadge
                          status={
                            data.checkoutPayments.find(
                              (payment) => payment.provider_request_id === r.id,
                            )!.status
                          }
                        />
                      ) : (
                        <Badge tone="warning">Checkout pending</Badge>
                      )}
                    </div>
                    <DataRow
                      label={waiting ? "Respond within" : "Received"}
                      value={
                        waiting ? (
                          <Countdown deadline={r.respond_by} elapsedText="Overdue" />
                        ) : (
                          relativeTime(r.requested_at)
                        )
                      }
                      mono={false}
                    />
                  </Link>
                );
              })}
            </div>
          </>
        ) : null}
        {view !== "loading" && !rows.length ? (
          <EmptyState
            title="No requests yet"
            body={`When a patient picks you to fill a ${config.workNoun}, it lands here with a response deadline.`}
          />
        ) : null}
      </div>
    </>
  );
}

/** V7 / V8 / V10 / V11 — Request Detail, order progress, result upload, payment. */
export function ProviderRequestDetail({ config }: { config: PortalConfig }) {
  config = useActivePortal(config);
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "conflict", "not_found", "validation"],
    "your response to this request",
  );
  useTick();
  const { id } = useParams();
  const { data, update, toast } = usePrototype();
  const navigate = useNavigate();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [resultFile, setResultFile] = useState<string | null>(null);
  const [summary, setSummary] = useState("");
  const [quotedPrice, setQuotedPrice] = useState(() => {
    const existing = data.providerRequests.find(
      (item) => item.id === id && item.provider_id === config.providerId,
    )?.amount_kobo;
    return existing != null
      ? String(existing / 100)
      : config.type === "PHARMACY"
        ? "6500"
        : "12500";
  });
  const quoteKobo = quotedNairaToKobo(quotedPrice);

  const request = data.providerRequests.find(
    (item) => item.id === id && item.provider_id === config.providerId,
  );
  if (!request) {
    return <EmptyState title="Request not found" body="It may have expired or been cancelled." />;
  }

  const patient = patientName(data, request.patient_identity_id ?? "");
  const providerBusiness =
    data.providers.find((item) => item.id === config.providerId)?.business_name ??
    config.productName;
  const subject = providerRequestSubject(data, request);
  const rx = request.prescription_id
    ? data.prescriptions.find((p) => p.id === request.prescription_id)
    : undefined;
  const lab = request.lab_order_id
    ? data.labOrders.find((l) => l.id === request.lab_order_id)
    : undefined;
  const slot = request.slot_id
    ? data.providerSlots.find((s) => s.id === request.slot_id)
    : undefined;
  const checkout = data.checkoutPayments.find(
    (payment) => payment.provider_request_id === request.id,
  );
  const payout = checkout
    ? data.providerPayouts.find((transfer) => transfer.checkout_payment_id === checkout.id)
    : undefined;
  const responseExpired =
    request.status === "REQUESTED" &&
    !!request.respond_by &&
    new Date(`${request.respond_by}Z`).getTime() <= now().getTime();
  const obsolete = !!(rx?.corrected_by_id || lab?.corrected_by_id);
  const displayStatus = responseExpired
    ? ("EXPIRED" as const)
    : obsolete && ["REQUESTED", "ACCEPTED"].includes(request.status)
      ? ("OBSOLETE" as const)
      : request.status;

  const closeRequest = (
    status: "WITHDRAWN" | "UNABLE_TO_FULFIL" | "OBSOLETE",
    terminalReason: string,
    missedCollection = false,
  ) => {
    update((draft) => {
      const live = draft.providerRequests.find(
        (item) => item.id === request.id && item.provider_id === config.providerId,
      );
      if (!live || fulfilmentComplete(live) || !["REQUESTED", "ACCEPTED"].includes(live.status))
        return;
      closeProviderRequest(draft, live.id, status, terminalReason);
      if (missedCollection) {
        const closed = draft.providerRequests.find((item) => item.id === live.id);
        if (closed) closed.order_status = "MISSED_COLLECTION";
      }
    });
    toast(
      checkout?.status === "PAID"
        ? "Request closed. The patient refund is pending and payout is reversed."
        : "Request closed before payment.",
    );
  };

  const setOrderStatus = (next: ProviderOrderStatus) => {
    let changed = false;
    update((d) => {
      const live = d.providerRequests.find(
        (item) => item.id === request.id && item.provider_id === config.providerId,
      );
      const payment = d.checkoutPayments.find((item) => item.provider_request_id === request.id);
      if (!live || obsolete || !canAdvancePharmacyOrder(live, next, payment?.status === "PAID"))
        return;
      changed = true;
      d.providerRequests = d.providerRequests.map((r) =>
        r.id === request.id ? { ...r, order_status: next } : r,
      );
      if (next === "FULFILLED" && checkout?.status === "PAID") {
        if (request.prescription_id) {
          d.prescriptions = d.prescriptions.map((item) =>
            item.id === request.prescription_id
              ? {
                  ...item,
                  fulfillment_status: "FILLED" as const,
                  filled_at: now().toISOString().slice(0, 19),
                  pharmacy_name: providerBusiness,
                }
              : item,
          );
        }
      }
    });
    toast(
      changed
        ? `Marked ${providerOrderStatusLabel[next].toLowerCase()}.`
        : "This order changed. Reload before trying again.",
    );
  };

  return (
    <>
      <PageHeader
        back={{ to: `${config.base}/requests`, label: "All requests" }}
        title={patient}
        description={`Requested ${formatDateTime(request.requested_at)}`}
        action={<ProviderRequestBadge status={displayStatus} />}
      />

      <div data-screen="V7" className="max-w-4xl space-y-4">
        {mutation.node}
        {obsolete && ["REQUESTED", "ACCEPTED"].includes(request.status) ? (
          <Banner tone="error">
            This request contains an obsolete order version. Stop it before any preparation,
            collection or checkout continues.
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => closeRequest("OBSOLETE", "Order replaced by a corrected version.")}
            >
              Stop obsolete request
            </Button>
          </Banner>
        ) : null}
        <div className="grid gap-4 @3xl:grid-cols-2">
          <Card>
            <p className="font-heading text-h3">
              {config.type === "PHARMACY" ? "What was prescribed" : "What was ordered"}
            </p>
            <p className="mt-2 font-heading text-h2">{subject}</p>
            {rx ? (
              <p className="measure mt-2 text-body text-base-content/80">{rx.instructions}</p>
            ) : null}
            {lab?.instructions ? (
              <p className="measure mt-2 text-body text-base-content/80">{lab.instructions}</p>
            ) : null}
            <p className="measure mt-3 border-t border-base-300 pt-3 text-body-sm text-base-content/60">
              This is everything Monovella shares for a fulfilment request. You don't see the rest
              of the patient's clinical record, and you don't need to.
            </p>
          </Card>

          <Card className="folio-surface-primary">
            <p className="font-heading text-h3">Response</p>
            {request.status === "REQUESTED" && responseExpired ? (
              <Banner tone="warning" className="mt-3">
                The response window expired. The patient can now choose another provider. You can no
                longer accept this request.
              </Banner>
            ) : request.status === "REQUESTED" ? (
              <>
                <div className="mt-3 flex items-baseline justify-between gap-3">
                  <span className="text-body-sm text-base-content/60">Respond within</span>
                  <Countdown deadline={request.respond_by} elapsedText="Expired" />
                </div>
                <div className="mt-3 max-w-sm">
                  <Field
                    label="Your confirmed price (₦)"
                    error={
                      quoteKobo === null
                        ? "Enter a positive amount with no more than two decimal places."
                        : null
                    }
                  >
                    {(props) => (
                      <Input
                        {...props}
                        inputMode="decimal"
                        value={quotedPrice}
                        onChange={(event) => setQuotedPrice(event.target.value)}
                      />
                    )}
                  </Field>
                </div>
                {/* Equal weight. The spec is explicit that declining is not a
                    penalty here — "out of stock today" is a normal answer. */}
                <div className="mt-4 grid max-w-sm grid-cols-2 gap-2">
                  <Button
                    full
                    disabled={obsolete || mutation.blocked || quoteKobo === null}
                    onClick={() => {
                      if (quoteKobo === null || obsolete || mutation.blocked) return;
                      update((d) => {
                        d.providerRequests = d.providerRequests.map((r) =>
                          r.id === request.id &&
                          r.provider_id === config.providerId &&
                          r.status === "REQUESTED"
                            ? {
                                ...r,
                                status: "ACCEPTED" as const,
                                responded_at: now().toISOString().slice(0, 19),
                                order_status:
                                  config.type === "PHARMACY" ? ("PREPARING" as const) : null,
                                result_status: config.type === "LAB" ? ("AWAITING" as const) : null,
                                amount_kobo: quoteKobo,
                              }
                            : r,
                        );
                      });
                      toast("Accepted.");
                    }}
                  >
                    <Check aria-hidden className="size-4" strokeWidth={1.5} />
                    Accept
                  </Button>
                  <Button full variant="secondary" onClick={() => setDeclining(true)}>
                    <X aria-hidden className="size-4" strokeWidth={1.5} />
                    Decline
                  </Button>
                </div>
              </>
            ) : (
              <dl className="mt-3 divide-y divide-base-300">
                <DataRow label="Responded" value={formatDateTime(request.responded_at)} />
                {request.decline_reason ? (
                  <DataRow label="Reason given" value={request.decline_reason} mono={false} />
                ) : null}
                {slot ? (
                  <DataRow
                    label="Appointment"
                    value={`${DAY_NAMES[slot.day_of_week ?? 0]} ${slot.start_time}`}
                  />
                ) : null}
              </dl>
            )}
          </Card>
        </div>

        {request.status === "ACCEPTED" && !obsolete && !fulfilmentComplete(request) ? (
          <Card>
            <p className="font-heading text-h3">Fulfilment exceptions</p>
            <dl className="mt-3 divide-y divide-base-300">
              <DataRow label="Accepted price" value={naira(request.amount_kobo ?? 0)} />
              {request.original_amount_kobo ? (
                <DataRow label="Original price" value={naira(request.original_amount_kobo)} />
              ) : null}
            </dl>
            {!checkout ? (
              <div className="mt-4 space-y-3">
                <Field
                  label="Revised price before checkout (₦)"
                  error={
                    quoteKobo === null
                      ? "Enter a positive amount with no more than two decimal places."
                      : null
                  }
                >
                  {(props) => (
                    <Input
                      {...props}
                      inputMode="decimal"
                      value={quotedPrice}
                      onChange={(event) => setQuotedPrice(event.target.value)}
                    />
                  )}
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    disabled={mutation.blocked || quoteKobo === null}
                    onClick={() => {
                      const revised = quoteKobo;
                      if (revised === null || mutation.blocked || obsolete) return;
                      update((draft) => {
                        if (
                          draft.checkoutPayments.some(
                            (item) => item.provider_request_id === request.id,
                          )
                        )
                          return;
                        draft.providerRequests = draft.providerRequests.map((item) =>
                          item.id === request.id &&
                          item.provider_id === config.providerId &&
                          item.status === "ACCEPTED"
                            ? {
                                ...item,
                                original_amount_kobo:
                                  item.original_amount_kobo ?? item.amount_kobo ?? null,
                                amount_kobo: revised,
                                price_changed_at: now().toISOString().slice(0, 19),
                              }
                            : item,
                        );
                      });
                      toast("Price updated before patient checkout.");
                    }}
                  >
                    Update price
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => closeRequest("WITHDRAWN", "Provider withdrew before checkout.")}
                  >
                    Withdraw offer
                  </Button>
                </div>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-base-300 pt-4">
              <Button
                variant="destructive"
                onClick={() =>
                  closeRequest("UNABLE_TO_FULFIL", "Provider became unable to fulfil the order.")
                }
              >
                Unable to fulfil
              </Button>
              {config.type === "LAB" && request.slot_id ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    closeRequest(
                      "UNABLE_TO_FULFIL",
                      "Patient missed the booked collection window.",
                      true,
                    )
                  }
                >
                  Mark missed collection
                </Button>
              ) : null}
            </div>
          </Card>
        ) : null}

        {/* V8 — Prepare Order, pharmacy only. */}
        {config.type === "PHARMACY" && request.status === "ACCEPTED" ? (
          <Card>
            <p className="font-heading text-h3">Order</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {request.order_status ? <OrderStatusBadge status={request.order_status} /> : null}
              {request.delivery_or_pickup ? (
                <Badge>{request.delivery_or_pickup === "DELIVERY" ? "Delivery" : "Pickup"}</Badge>
              ) : null}
            </div>
            {request.delivery_note ? (
              <p className="measure mt-3 rounded-brand bg-base-100 p-3 text-body-sm">
                {request.delivery_note}
              </p>
            ) : null}
            {/* Full-size (44px) targets with real spacing between them: this
                is the control a counter worker taps live in front of a
                customer, repeatedly, in a hurry — the smallest button size
                and an 8px gap is exactly the mis-tap setup to avoid here. */}
            <div className="mt-4 flex flex-wrap gap-3">
              {(
                [
                  "PREPARING",
                  "READY_FOR_PICKUP",
                  "OUT_FOR_DELIVERY",
                  "FULFILLED",
                ] as ProviderOrderStatus[]
              ).map((s) => (
                <Button
                  key={s}
                  variant={request.order_status === s ? "primary" : "secondary"}
                  disabled={
                    mutation.blocked ||
                    obsolete ||
                    !canAdvancePharmacyOrder(request, s, checkout?.status === "PAID")
                  }
                  onClick={() => setOrderStatus(s)}
                >
                  {providerOrderStatusLabel[s]}
                </Button>
              ))}
            </div>
            <p className="measure mt-3 text-body-sm text-base-content/60">
              You and the patient arrange the actual handoff between you. Monovella records the
              status; it doesn't dispatch couriers.
            </p>
          </Card>
        ) : null}

        {/* V10 — Upload Result, lab only. */}
        {config.type === "LAB" && request.status === "ACCEPTED" ? (
          <Card>
            <p className="font-heading text-h3">Result</p>
            {request.result_status === "UPLOADED" || request.result_status === "CORRECTED" ? (
              <>
                <Badge tone="success" className="mt-3">
                  {request.result_status === "CORRECTED" ? "Corrected result sent" : "Uploaded"}
                </Badge>
                <p className="measure mt-2 text-body">{request.result_summary}</p>
                <dl className="mt-3 divide-y divide-base-300 border-t border-base-300 pt-2">
                  <DataRow label="File" value={request.result_file_name ?? "Laboratory report"} />
                  <DataRow
                    label="Source"
                    value={request.result_source ?? providerBusiness}
                    mono={false}
                  />
                  <DataRow label="Sent" value={formatDateTime(request.result_uploaded_at)} />
                </dl>
                <p className="measure mt-3 text-body-sm text-base-content/60">
                  This is already on the patient's record and visible to the ordering expert.
                  Nothing for the patient to photograph.
                </p>
                {request.result_status === "UPLOADED" ? (
                  <Button
                    variant="secondary"
                    className="mt-3"
                    onClick={() => {
                      const correctedAt = now().toISOString().slice(0, 19);
                      const correctedSummary = `${request.result_summary ?? "Result attached."} Corrected report issued by the lab.`;
                      update((draft) => {
                        draft.providerRequests = draft.providerRequests.map((item) =>
                          item.id === request.id
                            ? {
                                ...item,
                                result_status: "CORRECTED" as const,
                                result_summary: correctedSummary,
                                result_file_name: "corrected-laboratory-report.pdf",
                                result_corrected_at: correctedAt,
                              }
                            : item,
                        );
                        draft.labOrders = draft.labOrders.map((item) =>
                          item.id === request.lab_order_id
                            ? {
                                ...item,
                                result_summary: correctedSummary,
                                result_file_name: "corrected-laboratory-report.pdf",
                                result_corrected_at: correctedAt,
                              }
                            : item,
                        );
                      });
                      toast("Corrected result replaced the earlier report.");
                    }}
                  >
                    Send corrected result
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                {request.result_status === "DELAYED" ? (
                  <Banner tone="warning" className="mt-3">
                    Result delayed. The patient and ordering expert can see this status.
                  </Banner>
                ) : null}
                {request.result_status === "PHYSICAL_COPY_ONLY" ? (
                  <Banner tone="warning" className="mt-3">
                    Physical copy only. The patient has been directed to add the printed result.
                  </Banner>
                ) : null}
                {request.result_status === "INCORRECT_FILE" ? (
                  <Banner tone="error" className="mt-3">
                    The previous file was rejected and never attached. Upload the correct
                    replacement.
                  </Banner>
                ) : null}
                <p className="measure mt-1.5 text-body-sm text-base-content/70">
                  Uploading here puts the result straight into the patient's case and in front of
                  the expert who ordered it — the whole reason a verified lab beats a photo.
                </p>
                <div className="mt-4 space-y-3">
                  <FileDrop
                    label="Upload the report"
                    accept="PDF, JPG or PNG"
                    filename={resultFile}
                    onFile={(chosen) => setResultFile(chosen.name)}
                    onRemove={() => setResultFile(null)}
                  />
                  <Field label="Summary" hint="A line the patient and the expert both read first.">
                    {(p) => (
                      <Textarea
                        {...p}
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        placeholder="Haemoglobin 9.8 g/dL, ferritin 8 ng/mL — iron deficiency anaemia."
                      />
                    )}
                  </Field>
                  <Button
                    disabled={
                      mutation.blocked ||
                      checkout?.status !== "PAID" ||
                      (!resultFile && !summary.trim())
                    }
                    onClick={() => {
                      const uploadedAt = now().toISOString().slice(0, 19);
                      update((d) => {
                        d.providerRequests = d.providerRequests.map((r) =>
                          r.id === request.id
                            ? {
                                ...r,
                                result_status: "UPLOADED" as const,
                                result_summary: summary || "Result attached.",
                                result_file_name: resultFile ?? "laboratory-report.pdf",
                                result_source: providerBusiness,
                                result_uploaded_at: uploadedAt,
                              }
                            : r,
                        );
                        if (request.lab_order_id) {
                          d.labOrders = d.labOrders.map((l) =>
                            l.id === request.lab_order_id
                              ? {
                                  ...l,
                                  result_status: "ATTACHED" as const,
                                  result_at: uploadedAt,
                                  result_summary: summary || "Result attached.",
                                  result_file_name: resultFile ?? "laboratory-report.pdf",
                                  result_source: providerBusiness,
                                }
                              : l,
                          );
                        }
                      });
                      toast("Result sent to the patient's record.");
                    }}
                  >
                    <Upload aria-hidden className="size-4" strokeWidth={1.5} />
                    Send to the patient's record
                  </Button>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        update((draft) => {
                          draft.providerRequests = draft.providerRequests.map((item) =>
                            item.id === request.id
                              ? { ...item, result_status: "DELAYED" as const }
                              : item,
                          );
                        });
                        toast("Delay shared with the patient and ordering expert.");
                      }}
                    >
                      Mark delayed
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        update((draft) => {
                          draft.providerRequests = draft.providerRequests.map((item) =>
                            item.id === request.id
                              ? { ...item, result_status: "PHYSICAL_COPY_ONLY" as const }
                              : item,
                          );
                        });
                        toast("Physical-copy-only status shared.");
                      }}
                    >
                      Physical copy only
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        update((draft) => {
                          draft.providerRequests = draft.providerRequests.map((item) =>
                            item.id === request.id
                              ? {
                                  ...item,
                                  result_status: "INCORRECT_FILE" as const,
                                  result_file_name: null,
                                }
                              : item,
                          );
                        });
                        setResultFile(null);
                        toast("Incorrect file rejected. No clinical record was changed.");
                      }}
                    >
                      Reject wrong file
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
        ) : null}

        {/* V11 — Managed checkout and automated provider payout. */}
        {request.status === "ACCEPTED" ? (
          <Card>
            <p className="font-heading text-h3">Checkout & payout</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Badge tone={checkout?.status === "PAID" ? "success" : "warning"}>
                {checkout?.status === "PAID" ? "Checkout paid" : "Awaiting checkout"}
              </Badge>
              {checkout ? (
                <span className="font-mono text-data tabular">
                  {naira(checkout.provider_amount_kobo)} due to you
                </span>
              ) : null}
            </div>

            {checkout ? (
              <>
                <dl className="mt-3 divide-y divide-base-300 border-t border-base-300 pt-2">
                  <DataRow
                    label={checkout.status === "PAID" ? "Patient paid" : "Checkout total"}
                    value={naira(checkout.total_amount_kobo)}
                  />
                  <DataRow label="Your price" value={naira(checkout.provider_amount_kobo)} />
                  <DataRow label="Service fee" value={naira(checkout.commission_amount_kobo)} />
                  <DataRow
                    label="Payout"
                    value={payout?.status ? payout.status.toLowerCase() : "Preparing"}
                    mono={false}
                  />
                  {payout?.transfer_reference ? (
                    <DataRow label="Transfer reference" value={payout.transfer_reference} />
                  ) : null}
                </dl>
                {payout?.status === "FAILED" ? (
                  <Banner tone="warning" className="mt-3">
                    The transfer needs attention. Your verified payout account is unchanged while
                    Monovella retries or reviews it.
                  </Banner>
                ) : (
                  <p className="measure mt-3 text-body-sm text-base-content/70">
                    Payment is verified automatically. You never need to match a patient transfer or
                    confirm a receipt manually.
                  </p>
                )}
              </>
            ) : (
              <p className="measure mt-3 text-body-sm text-base-content/70">
                A patient sees one secure checkout, including your price and Monovella's service
                fee. We create your payout after the payment is verified.
              </p>
            )}
          </Card>
        ) : null}
      </div>

      <Sheet
        open={declining}
        onClose={() => setDeclining(false)}
        title="Decline this request"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setDeclining(false)}>
              Cancel
            </Button>
            <Button
              full
              onClick={() => {
                update((d) => {
                  d.providerRequests = d.providerRequests.map((r) =>
                    r.id === request.id
                      ? {
                          ...r,
                          status: "DECLINED" as const,
                          decline_reason: reason || null,
                          responded_at: now().toISOString().slice(0, 19),
                        }
                      : r,
                  );
                });
                toast("Declined.");
                setDeclining(false);
                navigate(`${config.base}/requests`);
              }}
            >
              Decline
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="measure text-body">
            Declining is normal. The patient is prompted to pick someone else straight away, and
            nothing was charged.
          </p>
          <Field label="Reason" optional hint="Out of stock today doesn't need a justification.">
            {(p) => <Input {...p} value={reason} onChange={(e) => setReason(e.target.value)} />}
          </Field>
        </div>
      </Sheet>
    </>
  );
}

/** V9 — Manage Test Slots, lab only. X7's exact interaction, generalised. */
export function ProviderSlots({ config }: { config: PortalConfig }) {
  config = useActivePortal(config);
  const mutation = useMutationStates(
    ["submitting", "offline", "failed", "conflict", "validation"],
    "your test slots",
  );
  const { data, update, toast, nextId } = usePrototype();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [day, setDay] = useState("0");
  const [from, setFrom] = useState("08:00");
  const [to, setTo] = useState("12:00");
  const [collectionMethod, setCollectionMethod] = useState<LabCollectionMethod>("BRANCH");
  const [capacity, setCapacity] = useState("1");
  const [slotError, setSlotError] = useState<string | null>(null);
  const [windowScope, setWindowScope] = useState<"RECURRING" | "ONE_OFF">("RECURRING");
  const [specificDate, setSpecificDate] = useState(now().toISOString().slice(0, 10));
  const [exceptionAdding, setExceptionAdding] = useState(false);
  const [exceptionEditing, setExceptionEditing] = useState<string | null>(null);
  const [exceptionRemoving, setExceptionRemoving] = useState<string | null>(null);
  const [exceptionDate, setExceptionDate] = useState(now().toISOString().slice(0, 10));
  const [exceptionScope, setExceptionScope] = useState<"CLOSED" | "PART_DAY">("CLOSED");
  const [exceptionFrom, setExceptionFrom] = useState("08:00");
  const [exceptionTo, setExceptionTo] = useState("12:00");
  const [exceptionMethod, setExceptionMethod] = useState<LabCollectionMethod | "ALL">("ALL");
  const [exceptionNote, setExceptionNote] = useState("");
  const [exceptionError, setExceptionError] = useState<string | null>(null);
  const slots = slotsForProvider(data, config.providerId);
  const recurringSlots = slots.filter((slot) => slot.specific_date == null);
  const datedSlots = slots.filter((slot) => slot.specific_date != null);
  const exceptions = data.providerScheduleExceptions
    .filter((exception) => exception.provider_id === config.providerId)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.start_time?.localeCompare(b.start_time ?? "") || 0,
    );
  const target = slots.find((s) => s.id === (editing ?? removing));
  const removedException = exceptions.find((exception) => exception.id === exceptionRemoving);
  const bookedCount = target?.booked_count ?? 0;
  const minimumCapacity = Math.max(1, bookedCount);
  const publishedCapacity = slots.reduce((total, current) => total + (current.capacity ?? 1), 0);
  const totalBooked = slots.reduce((total, current) => total + (current.booked_count ?? 0), 0);
  const remainingCapacity = Math.max(0, publishedCapacity - totalBooked);

  const openAdd = () => {
    setDay("0");
    setWindowScope("RECURRING");
    setSpecificDate(now().toISOString().slice(0, 10));
    setFrom("08:00");
    setTo("12:00");
    setCollectionMethod("BRANCH");
    setCapacity("1");
    setSlotError(null);
    setAdding(true);
  };

  const openEdit = (s: (typeof slots)[number]) => {
    setEditing(s.id);
    setDay(String(s.day_of_week ?? 0));
    setWindowScope(s.specific_date ? "ONE_OFF" : "RECURRING");
    setSpecificDate(s.specific_date ?? now().toISOString().slice(0, 10));
    setFrom(s.start_time);
    setTo(s.end_time);
    setCollectionMethod(s.collection_method ?? "BRANCH");
    setCapacity(String(s.capacity ?? 1));
    setSlotError(null);
  };

  const resetExceptionForm = () => {
    setExceptionDate(now().toISOString().slice(0, 10));
    setExceptionScope("CLOSED");
    setExceptionFrom("08:00");
    setExceptionTo("12:00");
    setExceptionMethod("ALL");
    setExceptionNote("");
    setExceptionError(null);
  };

  const openAddException = () => {
    resetExceptionForm();
    setExceptionAdding(true);
  };

  const openEditException = (exception: (typeof exceptions)[number]) => {
    setExceptionDate(exception.date);
    setExceptionScope(exception.start_time == null ? "CLOSED" : "PART_DAY");
    setExceptionFrom(exception.start_time ?? "08:00");
    setExceptionTo(exception.end_time ?? "12:00");
    setExceptionMethod(exception.collection_method ?? "ALL");
    setExceptionNote(exception.note);
    setExceptionError(null);
    setExceptionEditing(exception.id);
  };

  const validateException = () => {
    if (exceptionDate < now().toISOString().slice(0, 10)) {
      return "Choose today or a future date.";
    }
    if (exceptionScope === "PART_DAY" && exceptionTo <= exceptionFrom) {
      return "End time must be after start time.";
    }
    return null;
  };

  const exceptionFields = (id: string) => ({
    id,
    provider_id: config.providerId,
    date: exceptionDate,
    kind: "UNAVAILABLE" as const,
    start_time: exceptionScope === "CLOSED" ? null : exceptionFrom,
    end_time: exceptionScope === "CLOSED" ? null : exceptionTo,
    collection_method: exceptionMethod === "ALL" ? null : exceptionMethod,
    note: exceptionNote.trim(),
  });

  return (
    <>
      <PageHeader
        title="Collection windows"
        description="Publish the branch and home-collection windows patients can plan around after you accept a test request."
        action={
          <Button onClick={openAdd}>
            <Plus aria-hidden className="size-4" strokeWidth={1.5} />
            Add a window
          </Button>
        }
      />

      <div data-screen="V9" className="max-w-3xl space-y-3">
        {mutation.node}
        <p className="measure text-body-sm text-base-content/70">
          Keep branch and home collection capacity separate. Each row is the public window patients
          can choose, with its remaining places kept visible here.
        </p>
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-heading text-h3">Published capacity</p>
            <p className="text-body-sm text-base-content/55">Across published windows</p>
          </div>
          <dl className="mt-3 grid grid-cols-3 divide-x divide-base-300 border-y border-base-300 py-2">
            <div className="min-w-0 pr-2">
              <dt className="text-label text-base-content/55">Windows</dt>
              <dd className="mt-1 font-mono text-data tabular">{slots.length}</dd>
            </div>
            <div className="min-w-0 px-2">
              <dt className="text-label text-base-content/55">Booked</dt>
              <dd className="mt-1 font-mono text-data tabular">{totalBooked}</dd>
            </div>
            <div className="min-w-0 pl-2">
              <dt className="text-label text-base-content/55">Places left</dt>
              <dd className="mt-1 font-mono text-data tabular">{remainingCapacity}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-heading text-h3">Dated changes</p>
              <p className="measure mt-1 text-body-sm text-base-content/65">
                Record a closure without rewriting your recurring collection windows.
              </p>
            </div>
            <Button size="sm" variant="secondary" onClick={openAddException}>
              Add change
            </Button>
          </div>
          <p className="measure mt-3 text-body-sm text-base-content/55">
            A closure hides new patient choices for that date. It never cancels a collection that
            has already been accepted.
          </p>
          {exceptions.length ? (
            <div className="mt-3 space-y-2 border-t border-base-300 pt-3">
              {exceptions.map((exception) => (
                <div
                  key={exception.id}
                  className="flex min-h-12 items-center gap-3 rounded-brand border border-base-300 bg-base-200 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-body-sm">
                      {formatDateLong(`${exception.date}T00:00:00`)} ·{" "}
                      {exception.start_time
                        ? `${exception.start_time}-${exception.end_time}`
                        : "Closed all day"}
                    </p>
                    <p className="truncate text-body-sm text-base-content/60">
                      {exception.collection_method === "HOME"
                        ? "Home collection"
                        : exception.collection_method === "BRANCH"
                          ? "At the lab"
                          : "All collection methods"}
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
              ))}
            </div>
          ) : null}
        </Card>
        {recurringSlots.length ? (
          DAY_NAMES.map((name, index) => {
            const rows = recurringSlots.filter((s) => s.day_of_week === index);
            return (
              <div
                key={name}
                className="rounded-brand border border-base-300 bg-base-200 px-4 py-3"
              >
                <p className="mb-2 text-body-sm font-medium">{name}</p>
                <div className="space-y-2">
                  {rows.length ? (
                    rows.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => openEdit(s)}
                        aria-label={`Edit ${name}, ${s.start_time} to ${s.end_time}, ${s.collection_method === "HOME" ? "home collection" : "at the lab"}, ${s.booked_count ?? 0} of ${s.capacity ?? 1} booked`}
                        className="flex min-h-12 w-full items-center gap-3 rounded-brand border border-base-300 bg-base-100 px-3 text-left transition-colors hover:border-primary/40"
                      >
                        <span className="font-mono text-data tabular">
                          {s.start_time}-{s.end_time}
                        </span>
                        <span className="text-body-sm text-base-content/65">
                          {s.collection_method === "HOME" ? "Home collection" : "At the lab"}
                        </span>
                        <span
                          className={cn(
                            "ml-auto shrink-0 rounded-full px-2 py-1 font-mono text-body-sm tabular",
                            s.taken
                              ? "bg-primary-tint text-primary"
                              : "bg-base-200 text-base-content/65",
                          )}
                        >
                          {s.taken
                            ? "Full"
                            : `${Math.max(0, (s.capacity ?? 1) - (s.booked_count ?? 0))} left`}
                        </span>
                      </button>
                    ))
                  ) : (
                    <span className="self-center text-body-sm text-base-content/40">Closed</span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            title="No collection windows published"
            body="Until you publish collection windows, patients can send you a request but have nothing to book into."
            action={<Button onClick={openAdd}>Add window</Button>}
          />
        )}
        {datedSlots.length ? (
          <Card>
            <p className="font-heading text-h3">One-off windows</p>
            <p className="mt-1 text-body-sm text-base-content/65">
              These additional hours appear to patients only on their stated date.
            </p>
            <div className="mt-3 space-y-2">
              {datedSlots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => openEdit(slot)}
                  aria-label={`Edit one-off window for ${formatDateLong(`${slot.specific_date}T00:00:00`)}`}
                  className="flex min-h-12 w-full items-center gap-3 rounded-brand border border-base-300 bg-base-200 px-3 text-left transition-colors hover:border-primary/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-body-sm">
                      {formatDateLong(`${slot.specific_date}T00:00:00`)}
                    </span>
                    <span className="text-body-sm text-base-content/65">
                      {slot.start_time}-{slot.end_time} ·{" "}
                      {slot.collection_method === "HOME" ? "Home collection" : "At the lab"}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-body-sm tabular text-base-content/65">
                    {Math.max(0, (slot.capacity ?? 1) - (slot.booked_count ?? 0))} left
                  </span>
                </button>
              ))}
            </div>
          </Card>
        ) : null}
      </div>

      <Sheet
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit this collection window"
        footer={
          <div className="flex gap-2">
            <Button
              variant="ghost"
              disabled={mutation.blocked || bookedCount > 0}
              onClick={() => {
                setRemoving(editing);
                setEditing(null);
              }}
            >
              <Trash2 aria-hidden className="size-4" strokeWidth={1.5} />
              Remove
            </Button>
            <Button
              full
              onClick={() => {
                const nextCapacity = Number(capacity);
                if (!Number.isInteger(nextCapacity) || nextCapacity < minimumCapacity) {
                  setSlotError(
                    `Capacity cannot be lower than the ${bookedCount} booking${bookedCount === 1 ? "" : "s"} already accepted.`,
                  );
                  return;
                }
                if (from >= to) {
                  setSlotError("End time must be after the start time.");
                  return;
                }
                if (
                  bookedCount > 0 &&
                  ((windowScope === "ONE_OFF" ? null : Number(day)) !== target?.day_of_week ||
                    (windowScope === "ONE_OFF" ? specificDate : null) !== target?.specific_date ||
                    from !== target.start_time ||
                    to !== target.end_time ||
                    collectionMethod !== target.collection_method)
                ) {
                  setSlotError(
                    "This window has booked collections. Keep its day, time and collection method; you may only increase capacity.",
                  );
                  return;
                }
                const conflict = weeklyTimeConflict(
                  slots.filter((candidate) =>
                    windowScope === "ONE_OFF"
                      ? candidate.specific_date === specificDate
                      : candidate.specific_date == null,
                  ),
                  {
                    id: editing ?? "draft-collection-window",
                    day_of_week: windowScope === "ONE_OFF" ? null : Number(day),
                    start_time: from,
                    end_time: to,
                    collection_method: collectionMethod,
                  },
                  { matchCollectionMethod: true },
                );
                if (conflict) {
                  setSlotError(
                    `This overlaps ${DAY_NAMES[conflict.day_of_week ?? 0]} ${conflict.start_time}-${conflict.end_time} for ${collectionMethod === "HOME" ? "home collection" : "branch collection"}. Use a non-overlapping window so capacity stays accurate.`,
                  );
                  return;
                }
                const closureConflict =
                  windowScope === "ONE_OFF"
                    ? data.providerScheduleExceptions.find(
                        (exception) =>
                          exception.provider_id === config.providerId &&
                          exception.date === specificDate &&
                          (exception.collection_method == null ||
                            exception.collection_method === collectionMethod) &&
                          (exception.start_time == null ||
                            (exception.start_time < to && from < (exception.end_time ?? "23:59"))),
                      )
                    : undefined;
                if (closureConflict) {
                  setSlotError(
                    "This one-off window overlaps a dated closure. Edit the closure or choose another time.",
                  );
                  return;
                }
                update((d) => {
                  const t = d.providerSlots.find((s) => s.id === editing);
                  if (t) {
                    t.day_of_week = windowScope === "ONE_OFF" ? null : Number(day);
                    t.specific_date = windowScope === "ONE_OFF" ? specificDate : null;
                    t.start_time = from;
                    t.end_time = to;
                    t.collection_method = collectionMethod;
                    t.capacity = nextCapacity;
                    t.taken = (t.booked_count ?? 0) >= t.capacity;
                  }
                });
                setEditing(null);
                toast("Collection window updated.");
              }}
            >
              Save
            </Button>
          </div>
        }
      >
        {target ? (
          <div className="space-y-4">
            {target.booked_count ? (
              <Banner tone="warning">
                {target.booked_count} of {target.capacity ?? 1} already booked in this window.
                Capacity cannot go below {target.booked_count}; keep this window until those
                collections have been handled.
              </Banner>
            ) : null}
            <Field label="Schedule">
              {(p) => (
                <Select
                  {...p}
                  disabled={mutation.blocked || bookedCount > 0}
                  value={windowScope}
                  onChange={(event) =>
                    setWindowScope(event.target.value as "RECURRING" | "ONE_OFF")
                  }
                >
                  <option value="RECURRING">Repeat each week</option>
                  <option value="ONE_OFF">One specific date</option>
                </Select>
              )}
            </Field>
            {windowScope === "RECURRING" ? (
              <Field label="Day">
                {(p) => (
                  <Select
                    {...p}
                    disabled={mutation.blocked || bookedCount > 0}
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                  >
                    {DAY_NAMES.map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : (
              <Field label="Date">
                {(p) => (
                  <Input
                    {...p}
                    type="date"
                    numeric
                    disabled={mutation.blocked || bookedCount > 0}
                    value={specificDate}
                    onChange={(event) => setSpecificDate(event.target.value)}
                  />
                )}
              </Field>
            )}
            <Field label="Collection method">
              {(p) => (
                <Select
                  {...p}
                  disabled={mutation.blocked || bookedCount > 0}
                  value={collectionMethod}
                  onChange={(event) =>
                    setCollectionMethod(event.target.value as LabCollectionMethod)
                  }
                >
                  <option value="BRANCH">At the lab</option>
                  <option value="HOME">Home collection</option>
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
                    disabled={mutation.blocked || bookedCount > 0}
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
                    disabled={mutation.blocked || bookedCount > 0}
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  />
                )}
              </Field>
            </div>
            <Field
              label="Capacity"
              hint="How many patients or samples this collection window can take at once."
            >
              {(p) => (
                <NumberStepper
                  {...p}
                  min={minimumCapacity}
                  value={capacity}
                  onValueChange={setCapacity}
                />
              )}
            </Field>
            {slotError ? <p className="text-body-sm text-error">{slotError}</p> : null}
          </div>
        ) : null}
      </Sheet>

      <Sheet
        open={adding}
        onClose={() => setAdding(false)}
        title="Add a collection window"
        footer={
          <Button
            full
            onClick={() => {
              const nextCapacity = Number(capacity);
              if (!Number.isInteger(nextCapacity) || nextCapacity < 1) {
                setSlotError("Set capacity to at least one patient.");
                return;
              }
              if (from >= to) {
                setSlotError("End time must be after the start time.");
                return;
              }
              const conflict = weeklyTimeConflict(
                slots.filter((candidate) =>
                  windowScope === "ONE_OFF"
                    ? candidate.specific_date === specificDate
                    : candidate.specific_date == null,
                ),
                {
                  id: "draft-collection-window",
                  day_of_week: windowScope === "ONE_OFF" ? null : Number(day),
                  start_time: from,
                  end_time: to,
                  collection_method: collectionMethod,
                },
                { matchCollectionMethod: true },
              );
              if (conflict) {
                setSlotError(
                  `This overlaps ${DAY_NAMES[conflict.day_of_week ?? 0]} ${conflict.start_time}-${conflict.end_time} for ${collectionMethod === "HOME" ? "home collection" : "branch collection"}. Use a non-overlapping window so capacity stays accurate.`,
                );
                return;
              }
              const closureConflict =
                windowScope === "ONE_OFF"
                  ? data.providerScheduleExceptions.find(
                      (exception) =>
                        exception.provider_id === config.providerId &&
                        exception.date === specificDate &&
                        (exception.collection_method == null ||
                          exception.collection_method === collectionMethod) &&
                        (exception.start_time == null ||
                          (exception.start_time < to && from < (exception.end_time ?? "23:59"))),
                    )
                  : undefined;
              if (closureConflict) {
                setSlotError(
                  "This one-off window overlaps a dated closure. Edit the closure or choose another time.",
                );
                return;
              }
              update((d) => {
                d.providerSlots = [
                  ...d.providerSlots,
                  {
                    id: nextId("pslot"),
                    provider_id: config.providerId,
                    day_of_week: windowScope === "ONE_OFF" ? null : Number(day),
                    specific_date: windowScope === "ONE_OFF" ? specificDate : null,
                    start_time: from,
                    end_time: to,
                    collection_method: collectionMethod,
                    capacity: nextCapacity,
                    booked_count: 0,
                    taken: false,
                  },
                ];
              });
              toast("Collection window added.");
              setAdding(false);
            }}
          >
            Add
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Schedule">
            {(p) => (
              <Select
                {...p}
                value={windowScope}
                onChange={(event) => setWindowScope(event.target.value as "RECURRING" | "ONE_OFF")}
              >
                <option value="RECURRING">Repeat each week</option>
                <option value="ONE_OFF">One specific date</option>
              </Select>
            )}
          </Field>
          {windowScope === "RECURRING" ? (
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
          ) : (
            <Field label="Date">
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  numeric
                  value={specificDate}
                  onChange={(event) => setSpecificDate(event.target.value)}
                />
              )}
            </Field>
          )}
          <Field label="Collection method">
            {(p) => (
              <Select
                {...p}
                value={collectionMethod}
                onChange={(event) => setCollectionMethod(event.target.value as LabCollectionMethod)}
              >
                <option value="BRANCH">At the lab</option>
                <option value="HOME">Home collection</option>
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
          <Field
            label="Capacity"
            hint="How many patients or samples this collection window can take at once."
          >
            {(p) => <NumberStepper {...p} min={1} value={capacity} onValueChange={setCapacity} />}
          </Field>
          {slotError ? <p className="text-body-sm text-error">{slotError}</p> : null}
        </div>
      </Sheet>

      <Sheet
        open={exceptionAdding || !!exceptionEditing}
        onClose={() => {
          setExceptionAdding(false);
          setExceptionEditing(null);
        }}
        title={exceptionEditing ? "Edit dated closure" : "Add dated closure"}
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
              full
              onClick={() => {
                const validation = validateException();
                if (validation) {
                  setExceptionError(validation);
                  return;
                }
                update((draft) => {
                  if (exceptionEditing) {
                    draft.providerScheduleExceptions = draft.providerScheduleExceptions.map(
                      (exception) =>
                        exception.id === exceptionEditing
                          ? exceptionFields(exception.id)
                          : exception,
                    );
                  } else {
                    draft.providerScheduleExceptions = [
                      ...draft.providerScheduleExceptions,
                      exceptionFields(nextId("pse")),
                    ];
                  }
                });
                const action = exceptionEditing ? "updated" : "added";
                setExceptionAdding(false);
                setExceptionEditing(null);
                toast(`Dated closure ${action}.`);
              }}
            >
              {exceptionEditing ? "Save closure" : "Add closure"}
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
          <Field label="Closure">
            {(p) => (
              <Select
                {...p}
                value={exceptionScope}
                onChange={(event) => setExceptionScope(event.target.value as "CLOSED" | "PART_DAY")}
              >
                <option value="CLOSED">Closed all day</option>
                <option value="PART_DAY">Closed for part of the day</option>
              </Select>
            )}
          </Field>
          <Field label="Collection method">
            {(p) => (
              <Select
                {...p}
                value={exceptionMethod}
                onChange={(event) =>
                  setExceptionMethod(event.target.value as LabCollectionMethod | "ALL")
                }
              >
                <option value="ALL">All collection methods</option>
                <option value="BRANCH">At the lab</option>
                <option value="HOME">Home collection</option>
              </Select>
            )}
          </Field>
          {exceptionScope === "PART_DAY" ? (
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
            hint="For your operating plan, for example a public holiday or equipment closure."
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
            Patients will not see new collection choices affected by this closure. Accepted
            collections remain on the schedule.
          </Banner>
          {exceptionError ? <p className="text-body-sm text-error">{exceptionError}</p> : null}
        </div>
      </Sheet>

      <Modal
        open={!!exceptionRemoving}
        onClose={() => setExceptionRemoving(null)}
        title="Remove this dated closure?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setExceptionRemoving(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                update((draft) => {
                  draft.providerScheduleExceptions = draft.providerScheduleExceptions.filter(
                    (exception) => exception.id !== exceptionRemoving,
                  );
                });
                setExceptionRemoving(null);
                toast("Dated closure removed.");
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="measure text-body">
          {removedException
            ? `New patient choices can return on ${formatDateLong(`${removedException.date}T00:00:00`)} where the published window still has capacity.`
            : "New patient choices can return where the published window still has capacity."}
        </p>
      </Modal>

      <Sheet
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Remove this collection window?"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Keep it
            </Button>
            <Button
              full
              variant="destructive"
              onClick={() => {
                if (target?.booked_count) {
                  setRemoving(null);
                  toast("This collection window has accepted bookings and cannot be removed.");
                  return;
                }
                update((d) => {
                  d.providerSlots = d.providerSlots.filter((s) => s.id !== removing);
                });
                toast("Collection window removed.");
                setRemoving(null);
              }}
            >
              Remove
            </Button>
          </div>
        }
      >
        <p className="measure text-body">
          {target?.booked_count
            ? "This collection window has accepted bookings and cannot be removed. Keep it until those collections have been handled."
            : "Patients will no longer see appointments in this window."}
        </p>
      </Sheet>
    </>
  );
}

/** V13 — Provider payouts. Nomba settles after checkout verification, never by patient proof. */
export function ProviderPayments({ config }: { config: PortalConfig }) {
  config = useActivePortal(config);
  const { data } = usePrototype();
  const [view, setView] = useState<"populated" | "empty">("populated");
  const rows =
    view === "empty"
      ? []
      : data.providerPayouts.filter((payout) => payout.provider_id === config.providerId);
  const settled = rows.filter((payout) => payout.status === "PAID");
  const total = settled.reduce((sum, payout) => sum + payout.amount_kobo, 0);
  const statusLabel = (status: (typeof rows)[number]["status"]) =>
    status === "PAID" ? "Settled" : status === "PROCESSING" ? "Processing" : status;
  const statusTone = (status: (typeof rows)[number]["status"]) =>
    status === "PAID" ? "success" : status === "FAILED" ? "error" : "warning";

  return (
    <>
      <PageHeader
        title="Payouts"
        description="Settlements generated after a patient’s verified checkout, sent to your verified account."
      />
      <div data-screen="V13" className="space-y-4">
        <ScreenStates
          states={[
            { value: "populated", label: "Populated" },
            { value: "empty", label: "Empty" },
          ]}
          value={view}
          onChange={setView}
        />

        {rows.length ? (
          <>
            <Card className="max-w-sm">
              <p className="text-body-sm text-base-content/60">Settled to your account</p>
              <p className="mt-1 font-mono text-h1 tabular">{naira(total)}</p>
              <p className="mt-2 text-body-sm text-base-content/65">
                A transfer can be processing even after checkout succeeds. We show it as settled
                only after its final Nomba result.
              </p>
            </Card>

            <div className="hidden @lg:block">
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th>Patient</Th>
                      <Th>{config.type === "PHARMACY" ? "Medication" : "Test"}</Th>
                      <Th numeric>Payout</Th>
                      <Th>Status</Th>
                      <Th>Destination</Th>
                      <Th>Date</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((payout) => {
                      const checkout = data.checkoutPayments.find(
                        (payment) => payment.id === payout.checkout_payment_id,
                      );
                      const request = checkout?.provider_request_id
                        ? data.providerRequests.find(
                            (item) => item.id === checkout.provider_request_id,
                          )
                        : undefined;
                      return (
                        <Tr key={payout.id}>
                          <Td>{patientName(data, request?.patient_identity_id ?? "")}</Td>
                          <Td>{request ? providerRequestSubject(data, request) : "Checkout"}</Td>
                          <Td numeric>{naira(payout.amount_kobo)}</Td>
                          <Td>
                            <Badge tone={statusTone(payout.status)}>
                              {statusLabel(payout.status)}
                            </Badge>
                          </Td>
                          <Td>
                            {payout.account_name} ····{payout.bank_account_last4}
                          </Td>
                          <Td numeric>{formatDate(payout.completed_at ?? payout.initiated_at)}</Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
              </TableWrap>
            </div>
            <div className="grid gap-3 @lg:hidden">
              {rows.map((payout) => (
                <Card key={payout.id} className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">Verified checkout</p>
                      <p className="text-body-sm text-base-content/70">
                        {payout.account_name} ····{payout.bank_account_last4}
                      </p>
                    </div>
                    <p className="font-mono text-data tabular">{naira(payout.amount_kobo)}</p>
                  </div>
                  <div>
                    <Badge tone={statusTone(payout.status)}>{statusLabel(payout.status)}</Badge>
                  </div>
                  <DataRow label="Reference" value={payout.transfer_reference ?? "Preparing"} />
                  <DataRow
                    label="Date"
                    value={formatDate(payout.completed_at ?? payout.initiated_at)}
                  />
                </Card>
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            title="No payouts yet"
            body="A verified patient checkout splits at payment, and your share is recorded here."
          />
        )}
      </div>
    </>
  );
}
