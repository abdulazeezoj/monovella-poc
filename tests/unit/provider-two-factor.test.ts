import { expect, it } from "vitest";
import type { Dataset } from "../../app/data";
import { DEMO_CODES, readAuthJourney } from "../../app/lib/auth-journey";
import {
  disableProviderFactor,
  enrollProviderFactor,
  verifyProviderFactor,
} from "../../app/lib/provider-two-factor";

function setup() {
  const data = {
    twoFactorSettings: ["pharmacy", "lab"].map((id) => ({
      id,
      subject_type: "PROVIDER",
      subject_id: id,
      enabled: false,
      method: null,
      recovery_codes_remaining: 0,
    })),
  } as Dataset;
  return { data, auth: readAuthJourney() };
}
it("validates enrollment, isolates recovery codes and consumes each only once", () => {
  const { data, auth } = setup();
  expect(enrollProviderFactor(data, auth, "pharmacy", "000000")).toBe(false);
  expect(enrollProviderFactor(data, auth, "pharmacy", DEMO_CODES.authenticatorOtp)).toBe(true);
  expect(enrollProviderFactor(data, auth, "lab", DEMO_CODES.authenticatorOtp)).toBe(true);
  const code = auth.providerFactors!.pharmacy.recoveryCodes[0];
  expect(verifyProviderFactor(data, auth, "lab", code)).toBe("INVALID");
  expect(verifyProviderFactor(data, auth, "pharmacy", code)).toBe("VERIFIED");
  expect(verifyProviderFactor(data, auth, "pharmacy", code)).toBe("INVALID");
  expect(data.twoFactorSettings[0].recovery_codes_remaining).toBe(7);
  expect(data.twoFactorSettings[1].recovery_codes_remaining).toBe(8);
});
it("locks repeated attempts and requires password plus a factor to disable", () => {
  const { data, auth } = setup();
  enrollProviderFactor(data, auth, "pharmacy", DEMO_CODES.authenticatorOtp);
  for (let index = 0; index < 4; index++)
    expect(verifyProviderFactor(data, auth, "pharmacy", "000000")).toBe("INVALID");
  expect(verifyProviderFactor(data, auth, "pharmacy", "000000")).toBe("LOCKED");
  expect(verifyProviderFactor(data, auth, "pharmacy", DEMO_CODES.authenticatorOtp)).toBe("LOCKED");
  auth.providerFactors!.pharmacy.lockedUntil = "2020-01-01T00:00:00Z";
  expect(disableProviderFactor(data, auth, "pharmacy", "wrong", DEMO_CODES.authenticatorOtp)).toBe(
    false,
  );
  expect(
    disableProviderFactor(
      data,
      auth,
      "pharmacy",
      DEMO_CODES.webPassword,
      DEMO_CODES.authenticatorOtp,
    ),
  ).toBe(true);
  expect(verifyProviderFactor(data, auth, "pharmacy", DEMO_CODES.authenticatorOtp)).toBe(
    "NOT_ENABLED",
  );
  expect(auth.providerFactors!.pharmacy.recoveryCodes).toHaveLength(0);
  enrollProviderFactor(data, auth, "pharmacy", DEMO_CODES.authenticatorOtp);
  expect(auth.providerFactors!.pharmacy.generation).toBe(2);
});
