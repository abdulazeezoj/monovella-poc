import { expect, it } from "vitest";
import { readAuthJourney } from "../../app/lib/auth-journey";
import { providerSignInLockedUntil, recordProviderSignIn } from "../../app/lib/provider-sign-in";

it("normalizes email, separates portals and refuses a valid password until the lock expires", () => {
  const auth = readAuthJourney();
  for (let i = 0; i < 4; i++)
    expect(recordProviderSignIn(auth, "PHARMACY", " USER@EXAMPLE.TEST ", false)).toBe("INVALID");
  expect(recordProviderSignIn(auth, "PHARMACY", "user@example.test", false)).toBe("LOCKED");
  expect(providerSignInLockedUntil(auth, "PHARMACY", "user@example.test")).toBeTruthy();
  expect(recordProviderSignIn(auth, "PHARMACY", "user@example.test", true)).toBe("LOCKED");
  expect(recordProviderSignIn(auth, "LAB", "user@example.test", true)).toBe("VERIFIED");
  expect(recordProviderSignIn(auth, "PHARMACY", "another@example.test", true)).toBe("VERIFIED");
  auth.providerSignInAttempts!["PHARMACY:user@example.test"].lockedUntil = "2020-01-01T00:00:00Z";
  expect(recordProviderSignIn(auth, "PHARMACY", "user@example.test", true)).toBe("VERIFIED");
  expect(auth.providerSignInAttempts!["PHARMACY:user@example.test"]).toBeUndefined();
});
