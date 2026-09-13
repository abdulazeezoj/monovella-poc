import { beforeAll, expect, it } from "vitest";
import { buildDataset, loadPrototypeData } from "../../app/data";
import { notificationPrefsFor, twoFactorFor } from "../../app/data/selectors";
import { accessStatusOf, decideGovernanceApplication } from "../../app/lib/governance-lifecycle";
import {
  createProviderApplication,
  type ProviderApplicationInput,
} from "../../app/lib/provider-onboarding";
import { ensureProviderSettings } from "../../app/lib/provider-settings";

beforeAll(loadPrototypeData);
const input: ProviderApplicationInput = {
  providerId: "new_provider",
  applicationId: "new_application",
  credentialId: "new_licence",
  providerType: "PHARMACY",
  businessName: "Applicant Pharmacy",
  address: "10 Demo Road",
  city: "Lagos",
  localGovernmentArea: "Ikeja",
  state: "Lagos",
  contactName: "Applicant Contact",
  contactEmail: "applicant@example.test",
  contactPhone: "08012345678",
  cacNumber: "RC-DEMO-NEW",
  licenceNumber: "PCN-DEMO-NEW",
  licenceExpiry: "2028-01-31",
  documentFilename: "applicant-licence.pdf",
  services: [],
  bankCode: "058",
  bankAccountNumber: "1234567890",
};

it.each(["PHARMACY", "LAB"] as const)(
  "keeps a new %s applicant separate through staff approval",
  (providerType) => {
    const data = buildDataset();
    const existing = structuredClone(data.providers);
    const requests = structuredClone(data.providerRequests);
    expect(
      createProviderApplication(data, { ...input, providerType, services: ["Chemistry"] }),
    ).toBe(true);
    expect(data.providers.slice(0, existing.length)).toEqual(existing);
    expect(data.providerRequests).toEqual(requests);
    expect(accessStatusOf(data, input.providerId)).toBe("PENDING");
    expect(data.applicationDetails.find((row) => row.id === input.applicationId)).toMatchObject({
      business_name: input.businessName,
      contact_person: input.contactName,
      cac_number: input.cacNumber,
      license_document_url: input.documentFilename,
      premises_address: input.address,
      status: "PENDING",
    });
    const pending = structuredClone(data);
    expect(createProviderApplication(data, input)).toBe(false);
    expect(data).toEqual(pending);
    expect(decideGovernanceApplication(data, input.applicationId, 1, "APPROVED", "").ok).toBe(true);
    expect(accessStatusOf(data, input.providerId)).toBe("ACTIVE");
    expect(
      data.providerCredentials.find((c) => c.id === input.credentialId)?.verification_status,
    ).toBe("VERIFIED");
    expect(data.providers.find((p) => p.id === input.providerId)?.payout_verified_at).toBeNull();
    expect(data.providers.slice(0, existing.length)).toEqual(existing);
  },
);
it("rejects incomplete or invalid applications without leaving a partial business", () => {
  const data = buildDataset();
  const before = structuredClone(data);
  for (const patch of [
    { bankAccountNumber: "123" },
    { documentFilename: "" },
    { licenceExpiry: "2027-02-30" },
  ]) {
    expect(createProviderApplication(data, { ...input, ...patch })).toBe(false);
    expect(data).toEqual(before);
  }
});

it("resolves account email without adding it to the patient directory or sharing demo access", () => {
  const data = buildDataset();
  expect(createProviderApplication(data, input)).toBe(true);
  expect(data.providerAccounts).toEqual([
    { providerId: input.providerId, email: input.contactEmail },
  ]);
  expect(data.providers.find((item) => item.id === input.providerId)).not.toHaveProperty(
    "contact_email",
  );
  const before = structuredClone(data);
  expect(
    createProviderApplication(data, {
      ...input,
      providerId: "second",
      applicationId: "second_application",
      credentialId: "second_licence",
    }),
  ).toBe(false);
  expect(data).toEqual(before);
});

it("a rejected applicant resubmits within the same account and keeps the original decision", () => {
  const data = buildDataset();
  createProviderApplication(data, input);
  decideGovernanceApplication(
    data,
    input.applicationId,
    1,
    "REJECTED",
    "Upload the complete licence.",
  );
  const original = structuredClone(
    data.applicationDetails.find((item) => item.id === input.applicationId),
  );
  const count = data.providers.length;
  const resubmission = {
    ...input,
    previousApplicationId: input.applicationId,
    applicationId: "corrected_application",
    credentialId: "corrected_licence",
    documentFilename: "complete-licence.pdf",
  };
  expect(createProviderApplication(data, resubmission)).toBe(true);
  expect(data.providers).toHaveLength(count);
  expect(data.providerAccounts).toHaveLength(1);
  expect(data.applicationDetails.find((item) => item.id === input.applicationId)).toEqual(original);
  expect(
    data.applicationDetails.find((item) => item.id === resubmission.applicationId),
  ).toMatchObject({
    status: "PENDING",
    license_document_url: "complete-licence.pdf",
    prior_rejection_reason: "Upload the complete licence.",
  });
  expect(
    data.providerCredentials.find((item) => item.id === input.credentialId)?.verification_status,
  ).toBe("REJECTED");
  const pending = structuredClone(data);
  expect(
    createProviderApplication(data, {
      ...resubmission,
      applicationId: "second_attempt",
      credentialId: "second_credential",
    }),
  ).toBe(false);
  expect(data).toEqual(pending);
  expect(decideGovernanceApplication(data, resubmission.applicationId, 1, "APPROVED", "").ok).toBe(
    true,
  );
  expect(accessStatusOf(data, input.providerId)).toBe("ACTIVE");
});

it.each(["PHARMACY", "LAB"] as const)("isolates settings for a new %s account", (providerType) => {
  const data = buildDataset();
  const originalPreferences = structuredClone(data.notificationPreferences);
  const originalFactors = structuredClone(data.twoFactorSettings);
  expect(createProviderApplication(data, { ...input, providerType })).toBe(true);
  const seat = providerType === "PHARMACY" ? "pharmacy" : "lab";
  const prefs = notificationPrefsFor(data, seat);
  const factor = twoFactorFor(data, seat);
  expect(prefs.subject_id).toBe(input.providerId);
  expect(factor.subject_id).toBe(input.providerId);
  expect(prefs.product_updates).toBe(false);
  expect(factor.enabled).toBe(false);
  prefs.incoming_request_alerts = false;
  factor.enabled = true;
  expect(data.notificationPreferences.slice(0, originalPreferences.length)).toEqual(
    originalPreferences,
  );
  expect(data.twoFactorSettings.slice(0, originalFactors.length)).toEqual(originalFactors);
});

it("restores missing provider settings without overwriting existing choices", () => {
  const data = buildDataset();
  createProviderApplication(data, input);
  const prefs = notificationPrefsFor(data, "pharmacy");
  prefs.incoming_request_alerts = false;
  data.twoFactorSettings = data.twoFactorSettings.filter(
    (row) => row.subject_id !== input.providerId,
  );
  ensureProviderSettings(data, input.providerId);
  expect(notificationPrefsFor(data, "pharmacy").incoming_request_alerts).toBe(false);
  expect(twoFactorFor(data, "pharmacy").enabled).toBe(false);
  const snapshot = structuredClone(data);
  ensureProviderSettings(data, input.providerId);
  expect(data).toEqual(snapshot);
});
