import { expect, it } from "vitest";
import { DEMO_CODES, readAuthJourney } from "../../app/lib/auth-journey";
import {
  changeProviderPassword,
  issueProviderPasswordReset,
  providerPasswordMatches,
  resetProviderPassword,
} from "../../app/lib/provider-passwords";

it("changes only the named provider and rejects the former password", () => {
  const state = readAuthJourney();
  expect(changeProviderPassword(state, "pharmacy", "wrong", "NewPassword2026!")).toBe(false);
  expect(
    changeProviderPassword(state, "pharmacy", DEMO_CODES.webPassword, "NewPassword2026!"),
  ).toBe(true);
  expect(providerPasswordMatches(state, "pharmacy", DEMO_CODES.webPassword)).toBe(false);
  expect(providerPasswordMatches(state, "lab", DEMO_CODES.webPassword)).toBe(true);
});
it("reset links are provider-specific, expire and are consumed after success", () => {
  const state = readAuthJourney();
  issueProviderPasswordReset(state, "pharmacy", "token");
  expect(resetProviderPassword(state, "lab", "token", "Replacement2026!")).toBe(false);
  expect(resetProviderPassword(state, "pharmacy", "token", "short")).toBe(false);
  expect(resetProviderPassword(state, "pharmacy", "token", "Replacement2026!")).toBe(true);
  expect(resetProviderPassword(state, "pharmacy", "token", "AnotherPassword!")).toBe(false);
  issueProviderPasswordReset(state, "pharmacy", "expired");
  state.providerPasswords!.pharmacy.reset!.expiresAt = "2020-01-01T00:00:00Z";
  expect(resetProviderPassword(state, "pharmacy", "expired", "AnotherPassword!")).toBe(false);
  expect(providerPasswordMatches(state, "pharmacy", "Replacement2026!")).toBe(true);
});
