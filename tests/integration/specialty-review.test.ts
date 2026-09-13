import { beforeAll, expect, it } from "vitest";
import { buildDataset, loadPrototypeData } from "../../app/data";
import {
  decideGovernanceApplication,
  submitExpertGovernance,
} from "../../app/lib/governance-lifecycle";

beforeAll(loadPrototypeData);
it("a nurse's new specialty reaches staff review and approval without replacing the existing claim", () => {
  const data = buildDataset();
  const expert = data.experts.find((e) => e.professional_type === "NURSE")!;
  const original = structuredClone(expert.credentials);
  const input = {
    id: "specialty_review",
    kind: "ADDITIONAL_CREDENTIAL" as const,
    expertId: expert.id,
    targetCredentialId: original[0].id,
    credentialId: "specialty_credential",
    tier: "GENERAL" as const,
    specialty: "MATERNAL_CHILD_HEALTH" as const,
    licenceNumber: "NMCN/TEST/CLAIM",
    documentFilename: "proof.pdf",
    expiryDate: "2028-01-31",
    feeKobo: 400000,
  };
  expect(submitExpertGovernance(data, input)).toBe(true);
  expect(data.applicationsQueue.some((row) => row.id === input.id)).toBe(true);
  expect(data.applicationDetails.find((row) => row.id === input.id)).toMatchObject({
    license_document_url: "proof.pdf",
    expert: expect.objectContaining({
      professional_type: "NURSE",
      specialty: "MATERNAL_CHILD_HEALTH",
    }),
  });
  const pending = structuredClone(data);
  expect(
    submitExpertGovernance(data, {
      ...input,
      id: "duplicate",
      credentialId: "duplicate_credential",
    }),
  ).toBe(false);
  expect(data).toEqual(pending);
  expect(decideGovernanceApplication(data, input.id, 1, "APPROVED", "").ok).toBe(true);
  expect(expert.credentials).toEqual(expect.arrayContaining(original));
  expect(expert.credentials.find((c) => c.id === input.credentialId)?.verification_status).toBe(
    "VERIFIED",
  );
});
it("a source credential cannot be used to claim a specialty outside its profession", () => {
  const data = buildDataset();
  const expert = data.experts.find((e) => e.professional_type === "NURSE")!;
  const before = structuredClone(data);
  expect(
    submitExpertGovernance(data, {
      id: "invalid",
      kind: "ADDITIONAL_CREDENTIAL",
      expertId: expert.id,
      targetCredentialId: expert.credentials[0].id,
      credentialId: "invalid_claim",
      tier: "GENERAL",
      specialty: "CARDIOLOGY",
      licenceNumber: "INVALID",
      expiryDate: "2028-01-31",
      feeKobo: 400000,
    }),
  ).toBe(false);
  expect(data).toEqual(before);
});
