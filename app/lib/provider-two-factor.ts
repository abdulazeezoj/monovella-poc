import type { Dataset } from "~/data";
import { type AuthJourneyState, DEMO_CODES } from "~/lib/auth-journey";
import { now } from "~/lib/clock";
import { providerPasswordMatches } from "~/lib/provider-passwords";

type FactorResult = "VERIFIED" | "INVALID" | "LOCKED" | "NOT_ENABLED";
const rowFor = (data: Dataset, providerId: string) =>
  data.twoFactorSettings.find(
    (row) => row.subject_type === "PROVIDER" && row.subject_id === providerId,
  );

/** A demo factor, not a TOTP secret or a credential for a live service. */
export function enrollProviderFactor(
  data: Dataset,
  auth: AuthJourneyState,
  providerId: string,
  code: string,
) {
  const row = rowFor(data, providerId);
  if (!row || row.enabled || code !== DEMO_CODES.authenticatorOtp) return false;
  auth.providerFactors ??= {};
  const generation = (auth.providerFactors[providerId]?.generation ?? 0) + 1;
  const recoveryCodes = Array.from(
    { length: 8 },
    (_, index) => `DEMO-${data.twoFactorSettings.indexOf(row) + 1}-${generation}-${index + 1}`,
  );
  auth.providerFactors[providerId] = {
    recoveryCodes,
    generation,
    failedAttempts: 0,
    lockedUntil: null,
  };
  Object.assign(row, {
    enabled: true,
    method: "TOTP",
    recovery_codes_remaining: recoveryCodes.length,
  });
  return true;
}

export function verifyProviderFactor(
  data: Dataset,
  auth: AuthJourneyState,
  providerId: string,
  code: string,
): FactorResult {
  const row = rowFor(data, providerId);
  if (!row?.enabled) return "NOT_ENABLED";
  auth.providerFactors ??= {};
  auth.providerFactors[providerId] ??= {
    recoveryCodes: [],
    generation: 0,
    failedAttempts: 0,
    lockedUntil: null,
  };
  const factor = auth.providerFactors[providerId];
  if (factor.lockedUntil && Date.parse(factor.lockedUntil) > now().getTime()) return "LOCKED";
  if (factor.lockedUntil) {
    factor.lockedUntil = null;
    factor.failedAttempts = 0;
  }
  const recoveryIndex = factor.recoveryCodes.indexOf(code.trim());
  if (code !== DEMO_CODES.authenticatorOtp && recoveryIndex < 0) {
    factor.failedAttempts += 1;
    if (factor.failedAttempts >= 5) {
      factor.lockedUntil = new Date(now().getTime() + 5 * 60_000).toISOString();
      return "LOCKED";
    }
    return "INVALID";
  }
  if (recoveryIndex >= 0) factor.recoveryCodes.splice(recoveryIndex, 1);
  factor.failedAttempts = 0;
  row.recovery_codes_remaining = factor.recoveryCodes.length;
  return "VERIFIED";
}

export function disableProviderFactor(
  data: Dataset,
  auth: AuthJourneyState,
  providerId: string,
  password: string,
  code: string,
) {
  if (!providerPasswordMatches(auth, providerId, password)) return false;
  if (verifyProviderFactor(data, auth, providerId, code) !== "VERIFIED") return false;
  Object.assign(rowFor(data, providerId)!, {
    enabled: false,
    method: null,
    recovery_codes_remaining: 0,
  });
  auth.providerFactors![providerId].recoveryCodes = [];
  return true;
}
