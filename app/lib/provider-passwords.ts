import { type AuthJourneyState, DEMO_CODES } from "~/lib/auth-journey";
import { now } from "~/lib/clock";

/** Session-local simulation only. These values are never credentials for a real service. */
export function providerPasswordMatches(
  state: AuthJourneyState,
  providerId: string,
  password: string,
) {
  return password === (state.providerPasswords?.[providerId]?.password ?? DEMO_CODES.webPassword);
}
export function changeProviderPassword(
  state: AuthJourneyState,
  providerId: string,
  current: string,
  next: string,
) {
  if (next.length < 12 || !providerPasswordMatches(state, providerId, current)) return false;
  state.providerPasswords ??= {};
  state.providerPasswords[providerId] = { password: next };
  return true;
}
export function issueProviderPasswordReset(
  state: AuthJourneyState,
  providerId: string,
  token: string,
) {
  state.providerPasswords ??= {};
  const prior = state.providerPasswords[providerId];
  state.providerPasswords[providerId] = {
    password: prior?.password ?? DEMO_CODES.webPassword,
    reset: { token, expiresAt: new Date(now().getTime() + 30 * 60_000).toISOString() },
  };
}
export function resetProviderPassword(
  state: AuthJourneyState,
  providerId: string,
  token: string,
  next: string,
) {
  const credential = state.providerPasswords?.[providerId];
  if (
    !credential?.reset ||
    credential.reset.token !== token ||
    next.length < 12 ||
    new Date(credential.reset.expiresAt).getTime() <= now().getTime()
  )
    return false;
  state.providerPasswords![providerId] = { password: next };
  return true;
}
