import { now } from "~/lib/clock";

export const AUTH_JOURNEY_STORAGE_KEY = "mv-auth-journey-v1";

export const DEMO_CODES = {
  signUpOtp: "246810",
  recoveryEmailOtp: "135790",
  phoneChangeOtp: "864200",
  authenticatorOtp: "112233",
  recoveryCode: "MVRC-2026",
  webPassword: "Monovella2026!",
} as const;

export type AuthOtpPurpose = "SIGN_UP" | "RECOVERY_EMAIL" | "PHONE_CHANGE";
export type RecoveryStatus =
  | "IDLE"
  | "AWAITING_VERIFICATION"
  | "VERIFIED"
  | "MANUAL_REVIEW"
  | "CONSUMED";

export interface PersistedOtpChallenge {
  purpose: AuthOtpPurpose;
  destination: string;
  issued_at: string;
  expires_at: string;
  resend_available_at: string;
  failed_attempts: number;
  resend_count: number;
  locked_until: string | null;
}

export interface AuthJourneyState {
  providerSignInAttempts?: Record<string, { failedAttempts: number; lockedUntil: string | null }>;
  providerFactors?: Record<
    string,
    {
      recoveryCodes: string[];
      generation: number;
      failedAttempts: number;
      lockedUntil: string | null;
    }
  >;
  providerPasswords?: Record<
    string,
    { password: string; reset?: { token: string; expiresAt: string } }
  >;
  version: 1;
  pin: string;
  force_credential_change: boolean;
  mobile_return_to: string | null;
  sign_in: { failed_attempts: number; locked_until: string | null };
  sign_up: {
    first_name: string;
    last_name: string;
    phone: string;
    referral_code: string;
    referral_region: string | null;
    terms_acknowledged: boolean;
    terms_version: string | null;
    privacy_acknowledged: boolean;
    privacy_version: string | null;
    step: "FORM" | "OTP" | "PIN" | "COMPLETE";
    challenge: PersistedOtpChallenge | null;
  };
  recovery: {
    reference: string | null;
    identifier: string;
    method: "EMAIL" | "NIN" | "MANUAL" | null;
    status: RecoveryStatus;
    challenge: PersistedOtpChallenge | null;
  };
  phone_change: {
    phone: string;
    challenge: PersistedOtpChallenge | null;
  };
  two_factor: {
    recovery_codes: string[];
    biometric_result: "IDLE" | "CANCELLED" | "UNAVAILABLE";
  };
  web_sessions: Record<
    "STAFF" | "PHARMACY" | "LAB",
    {
      authenticated: boolean;
      force_password_change: boolean;
      return_to: string | null;
    }
  >;
}

const DEFAULT_STATE: AuthJourneyState = {
  version: 1,
  pin: "123456",
  force_credential_change: false,
  mobile_return_to: null,
  sign_in: { failed_attempts: 0, locked_until: null },
  sign_up: {
    first_name: "",
    last_name: "",
    phone: "",
    referral_code: "",
    referral_region: null,
    terms_acknowledged: false,
    terms_version: null,
    privacy_acknowledged: false,
    privacy_version: null,
    step: "FORM",
    challenge: null,
  },
  recovery: {
    reference: null,
    identifier: "",
    method: null,
    status: "IDLE",
    challenge: null,
  },
  phone_change: { phone: "", challenge: null },
  two_factor: { recovery_codes: [], biometric_result: "IDLE" },
  web_sessions: {
    STAFF: { authenticated: true, force_password_change: false, return_to: null },
    PHARMACY: { authenticated: true, force_password_change: false, return_to: null },
    LAB: { authenticated: true, force_password_change: false, return_to: null },
  },
};

function cloneDefault(): AuthJourneyState {
  return structuredClone(DEFAULT_STATE);
}

export function readAuthJourney(): AuthJourneyState {
  if (typeof window === "undefined") return cloneDefault();
  try {
    const raw = window.sessionStorage.getItem(AUTH_JOURNEY_STORAGE_KEY);
    if (!raw) return cloneDefault();
    const value = JSON.parse(raw) as Partial<AuthJourneyState>;
    if (value.version !== 1) return cloneDefault();
    return {
      ...cloneDefault(),
      ...value,
      sign_in: { ...DEFAULT_STATE.sign_in, ...value.sign_in },
      sign_up: { ...DEFAULT_STATE.sign_up, ...value.sign_up },
      recovery: { ...DEFAULT_STATE.recovery, ...value.recovery },
      phone_change: { ...DEFAULT_STATE.phone_change, ...value.phone_change },
      two_factor: { ...DEFAULT_STATE.two_factor, ...value.two_factor },
      web_sessions: {
        STAFF: { ...DEFAULT_STATE.web_sessions.STAFF, ...value.web_sessions?.STAFF },
        PHARMACY: { ...DEFAULT_STATE.web_sessions.PHARMACY, ...value.web_sessions?.PHARMACY },
        LAB: { ...DEFAULT_STATE.web_sessions.LAB, ...value.web_sessions?.LAB },
      },
    };
  } catch {
    return cloneDefault();
  }
}

export function updateAuthJourney(mutate: (draft: AuthJourneyState) => void): AuthJourneyState {
  const draft = readAuthJourney();
  mutate(draft);
  window.sessionStorage.setItem(AUTH_JOURNEY_STORAGE_KEY, JSON.stringify(draft));
  return draft;
}

export function clearAuthJourney() {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(AUTH_JOURNEY_STORAGE_KEY);
}

export function abandonRecovery() {
  return updateAuthJourney((draft) => {
    draft.recovery = cloneDefault().recovery;
  });
}

export function issueOtp(
  purpose: AuthOtpPurpose,
  destination: string,
  issuedAt = now(),
): PersistedOtpChallenge {
  return {
    purpose,
    destination,
    issued_at: issuedAt.toISOString(),
    expires_at: new Date(issuedAt.getTime() + 10 * 60_000).toISOString(),
    resend_available_at: new Date(issuedAt.getTime() + 30_000).toISOString(),
    failed_attempts: 0,
    resend_count: 0,
    locked_until: null,
  };
}

export function challengeStatus(challenge: PersistedOtpChallenge, at = now()) {
  if (challenge.locked_until && Date.parse(challenge.locked_until) > at.getTime()) return "LOCKED";
  if (Date.parse(challenge.expires_at) <= at.getTime()) return "EXPIRED";
  return "READY";
}

export function resendStatus(challenge: PersistedOtpChallenge, at = now()) {
  if (challenge.resend_count >= 3) return "RATE_LIMITED";
  if (Date.parse(challenge.resend_available_at) > at.getTime()) return "COOLDOWN";
  return "READY";
}

export function recordFailedOtp(challenge: PersistedOtpChallenge, at = now()) {
  challenge.failed_attempts += 1;
  if (challenge.failed_attempts >= 3) {
    challenge.locked_until = new Date(at.getTime() + 5 * 60_000).toISOString();
  }
}

export function renewOtp(challenge: PersistedOtpChallenge, at = now()) {
  challenge.issued_at = at.toISOString();
  challenge.expires_at = new Date(at.getTime() + 10 * 60_000).toISOString();
  challenge.resend_available_at = new Date(at.getTime() + 30_000).toISOString();
  challenge.resend_count += 1;
  challenge.failed_attempts = 0;
  challenge.locked_until = null;
}
