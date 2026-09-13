import type { AuthJourneyState } from "~/lib/auth-journey";
import { now } from "~/lib/clock";

const keyFor = (portal: "PHARMACY" | "LAB", email: string) =>
  `${portal}:${email.trim().toLowerCase()}`;

export function providerSignInLockedUntil(
  auth: AuthJourneyState,
  portal: "PHARMACY" | "LAB",
  email: string,
) {
  const until = auth.providerSignInAttempts?.[keyFor(portal, email)]?.lockedUntil;
  return until && Date.parse(until) > now().getTime() ? until : null;
}

/** Simulates the same lock response for registered and unrecognised account emails. */
export function recordProviderSignIn(
  auth: AuthJourneyState,
  portal: "PHARMACY" | "LAB",
  email: string,
  valid: boolean,
) {
  if (providerSignInLockedUntil(auth, portal, email)) return "LOCKED";
  auth.providerSignInAttempts ??= {};
  const key = keyFor(portal, email);
  const prior = auth.providerSignInAttempts[key];
  if (valid) {
    delete auth.providerSignInAttempts[key];
    return "VERIFIED";
  }
  const failedAttempts = (prior?.lockedUntil ? 0 : (prior?.failedAttempts ?? 0)) + 1;
  auth.providerSignInAttempts[key] = {
    failedAttempts,
    lockedUntil: failedAttempts >= 5 ? new Date(now().getTime() + 5 * 60_000).toISOString() : null,
  };
  return failedAttempts >= 5 ? "LOCKED" : "INVALID";
}
