/**
 * Provider and back-office governance lifecycles, against the real dataset.
 *
 * This is the integration layer because `buildDataset()` reads the seeded
 * PGlite database: the rows here came through prisma/postgres.sql and its
 * foreign keys and check constraints, not from a hand-built object. The
 * decisions themselves are pure functions over that dataset, so no browser is
 * involved; the console screens that surface them are covered in
 * tests/e2e/console/.
 *
 * Ported from the first two hundred lines of scripts/governance-lifecycle.ts.
 * The browser half of that script became tests/e2e/console/governance.spec.ts.
 *
 * The checks run in sequence against one dataset and mutate it as they go,
 * which is deliberate: a stale decision returning 409 only means anything after
 * the first decision has landed.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { buildDataset, loadPrototypeData } from "../../app/data";
import { updateDataset } from "../../app/lib/dataset-update";
import {
  accessStatusOf,
  deactivateStaff,
  decideDispute,
  decideGovernanceApplication,
  decideStanding,
  provisionStaff,
  submitExpertGovernance,
  submitProviderGovernance,
} from "../../app/lib/governance-lifecycle";
// The fixtures carry real UUIDs. `uid()` is the same slug-to-UUID mapping the
// generators use, so a row can still be named by the slug it was written from
// rather than by a literal UUID nobody can read.
import { uid } from "../../scripts/prisma-common";

type Dataset = ReturnType<typeof buildDataset>;

let data: Dataset;

beforeAll(async () => {
  await loadPrototypeData();
  data = buildDataset();
});

describe("governance lifecycles", () => {
  it("rejects general practice and non-doctor specialties in fellowship submissions", () => {
    const current = buildDataset();
    const before = structuredClone(current);
    for (const specialty of [
      "GENERAL_PRACTICE",
      "PHYSIOTHERAPY",
      "CHRONIC_DISEASE_MONITORING",
      "WOUND_CARE_GUIDANCE",
      "MATERNAL_CHILD_HEALTH",
      "POST_OP_FOLLOW_UP",
      "MEDICATION_THERAPY_MANAGEMENT",
      "OTC_WELLNESS_COUNSELING",
      "RESULT_INTERPRETATION_REFERRAL",
    ] as const) {
      expect(
        submitExpertGovernance(current, {
          id: `invalid_${specialty}`,
          kind: "ADDITIONAL_CREDENTIAL",
          credentialId: `invalid_credential_${specialty}`,
          tier: "SPECIALIST",
          specialty,
          licenceNumber: "INVALID",
          expiryDate: "2028-01-31",
          feeKobo: 400000,
        }),
      ).toBe(false);
    }
    expect(current).toEqual(before);
  });

  it("rejects fellowship submissions from every non-doctor without changing records", () => {
    const current = buildDataset();
    const before = structuredClone(current);
    for (const expert of current.experts.filter((item) => item.professional_type !== "DOCTOR")) {
      expect(
        submitExpertGovernance(current, {
          id: `invalid_${expert.id}`,
          kind: "ADDITIONAL_CREDENTIAL",
          expertId: expert.id,
          credentialId: `invalid_credential_${expert.id}`,
          tier: "GP",
          specialty: "GENERAL_PRACTICE",
          licenceNumber: "INVALID",
          expiryDate: "2028-01-31",
          feeKobo: 400000,
        }),
      ).toBe(false);
    }
    expect(current).toEqual(before);
  });

  it("can replay an expert application update without changing the original snapshot", () => {
    const current = buildDataset();
    const original = structuredClone(current);
    const apply = (draft: Dataset) => {
      submitExpertGovernance(draft, {
        id: "replayed_application",
        kind: "INITIAL",
        expertId: uid("exp_etim"),
        credentialId: "replayed_credential",
        tier: "GENERAL",
        specialty: "WOUND_CARE_GUIDANCE",
        licenceNumber: "NMCN/TEST/REPLAY",
        expiryDate: "2028-01-31",
        feeKobo: 400000,
      });
    };
    const first = updateDataset(current, apply);
    expect(current).toEqual(original);
    const replayed = updateDataset(current, apply);
    expect(replayed.experts).toEqual(first.experts);
    expect(replayed.applicationDetails.map((item) => item.id)).toEqual(
      first.applicationDetails.map((item) => item.id),
    );
    expect(
      replayed.experts
        .find((expert) => expert.id === uid("exp_etim"))
        ?.credentials.filter((credential) => credential.id === "replayed_credential"),
    ).toHaveLength(1);
    expect(
      replayed.applicationDetails.filter(
        (application) => application.id === "replayed_application",
      ),
    ).toHaveLength(1);
  });
  it("refuses duplicate pending submissions without adding records, then permits a rejected applicant to retry", () => {
    const fresh = buildDataset();
    const expertId = uid("exp_etim");
    const input = {
      id: "duplicate_initial",
      kind: "INITIAL" as const,
      expertId,
      credentialId: "duplicate_credential",
      tier: "GENERAL" as const,
      specialty: "WOUND_CARE_GUIDANCE" as const,
      licenceNumber: "NMCN/TEST/DUP",
      expiryDate: "2028-01-31",
      feeKobo: 400000,
    };
    expect(submitExpertGovernance(fresh, input)).toBe(true);
    const snapshot = structuredClone(fresh);
    expect(
      submitExpertGovernance(fresh, {
        ...input,
        id: "duplicate_retry",
        credentialId: "duplicate_retry_credential",
      }),
    ).toBe(false);
    expect(fresh).toEqual(snapshot);
    expect(
      decideGovernanceApplication(
        fresh,
        input.id,
        1,
        "REJECTED",
        "Please attach the complete certificate.",
      ).ok,
    ).toBe(true);
    expect(
      submitExpertGovernance(fresh, {
        ...input,
        id: "corrected_application",
        credentialId: "corrected_credential",
      }),
    ).toBe(true);
  });
  it("preserves the submitted applicant and activates that initial credential only after approval", () => {
    const fresh = buildDataset();
    const expertId = uid("exp_etim");
    const expert = fresh.experts.find((item) => item.id === expertId)!;
    const before = structuredClone(expert);
    const applicant = {
      first_name: "Ada",
      last_name: "Test",
      gender: "FEMALE" as const,
      professional_type: "NURSE" as const,
      email: "ada@example.com",
      address: "12 Test Road",
      city: "Ikeja",
      local_government_area: "Ikeja",
      state: "Lagos",
    };
    expect(
      submitExpertGovernance(fresh, {
        id: "initial_test",
        kind: "INITIAL",
        expertId,
        credentialId: "initial_credential",
        tier: "GENERAL",
        specialty: "WOUND_CARE_GUIDANCE",
        licenceNumber: "NMCN/TEST/12",
        expiryDate: "2028-01-31",
        feeKobo: 400000,
        documentFilename: "ada-certificate.pdf",
        applicant,
      }),
    ).toBe(true);
    const application = fresh.applicationDetails.find((item) => item.id === "initial_test")!;
    expect(application.expert).toMatchObject({
      first_name: "Ada",
      last_name: "Test",
      gender: "FEMALE",
      professional_type: "NURSE",
      email: "ada@example.com",
    });
    expect(application).toMatchObject({
      premises_address: applicant.address,
      city: applicant.city,
      state: applicant.state,
      license_document_url: "ada-certificate.pdf",
    });
    expect(expert.first_name).toBe(before.first_name);
    expect(
      expert.credentials.find((item) => item.id === "initial_credential")?.verification_status,
    ).toBe("PENDING");
    expect(accessStatusOf(fresh, expertId)).toBe("PENDING");
    expect(decideGovernanceApplication(fresh, "initial_test", 1, "APPROVED", null).ok).toBe(true);
    expect(expert).toMatchObject({
      first_name: "Ada",
      last_name: "Test",
      professional_type: "NURSE",
      address: "12 Test Road",
      consultation_fee_kobo: 400000,
    });
    expect(expert.credentials[0]).toMatchObject({
      id: "initial_credential",
      verification_status: "VERIFIED",
      licence_or_fellowship_number: "NMCN/TEST/12",
    });
    expect(accessStatusOf(fresh, expertId)).toBe("ACTIVE");
  });
  it("keeps a rejected renewal on its applicant without revoking the existing credential", () => {
    const fresh = buildDataset();
    const expertId = uid("exp_etim");
    const expert = fresh.experts.find((item) => item.id === expertId)!;
    const credentials = structuredClone(expert.credentials);
    const doctor = structuredClone(fresh.experts.find((item) => item.id === uid("exp_adeyemi"))!);
    const id = uid("app_nurse_renewal_review");
    expect(
      submitExpertGovernance(fresh, {
        id,
        kind: "LICENCE_RENEWAL",
        expertId,
        credentialId: credentials[0].id,
        targetCredentialId: credentials[0].id,
        tier: credentials[0].tier,
        specialty: credentials[0].specialty,
        licenceNumber: "NMCN/TEST/RENEWAL",
        expiryDate: "2028-01-31",
        feeKobo: credentials[0].consultation_fee_kobo,
        documentFilename: "nurse-renewal.pdf",
      }),
    ).toBe(true);
    expect(fresh.governanceApplications.find((item) => item.application_id === id)?.actor_id).toBe(
      expertId,
    );
    expect(fresh.applicationDetails.find((item) => item.id === id)).toMatchObject({
      license_number: "NMCN/TEST/RENEWAL",
      license_document_url: "nurse-renewal.pdf",
      expert: { first_name: expert.first_name, professional_type: "NURSE" },
    });
    expect(
      decideGovernanceApplication(
        fresh,
        id,
        1,
        "REJECTED",
        "Upload the complete certificate; page two is missing.",
      ).ok,
    ).toBe(true);
    expect(expert.credentials).toEqual(credentials);
    expect(fresh.experts.find((item) => item.id === doctor.id)).toEqual(doctor);
    expect(accessStatusOf(fresh, expertId)).toBe("ACTIVE");
  });

  it("carries first application, additional credential and licence renewal to a decision", () => {
    const applications = [
      {
        id: uid("app_test_expert_initial"),
        submit: () =>
          submitExpertGovernance(data, {
            id: uid("app_test_expert_initial"),
            kind: "INITIAL",
            credentialId: "cred_unused",
            tier: "GENERAL",
            specialty: "GENERAL_PRACTICE",
            licenceNumber: "MDCN/TEST/1",
            expiryDate: "2027-09-05",
            feeKobo: 900_000,
          }),
        decision: "APPROVED" as const,
      },
      {
        id: uid("app_test_expert_additional"),
        submit: () =>
          submitExpertGovernance(data, {
            id: uid("app_test_expert_additional"),
            kind: "ADDITIONAL_CREDENTIAL",
            credentialId: "cred_test_additional",
            tier: "SPECIALIST",
            specialty: "CARDIOLOGY",
            licenceNumber: "WACP/TEST/2",
            expiryDate: "2028-09-05",
            feeKobo: 1_500_000,
          }),
        decision: "REJECTED" as const,
      },
      {
        id: uid("app_test_pharmacy_initial"),
        submit: () =>
          submitProviderGovernance(data, {
            id: uid("app_test_pharmacy_initial"),
            providerType: "PHARMACY",
            providerId: uid("prv_ph_greenlife"),
            kind: "INITIAL",
            licenceNumber: "PCN/TEST/3",
            expiryDate: "2027-09-05",
          }),
        decision: "APPROVED" as const,
      },
      {
        id: uid("app_test_pharmacy_additional"),
        submit: () =>
          submitProviderGovernance(data, {
            id: uid("app_test_pharmacy_additional"),
            providerType: "PHARMACY",
            providerId: uid("prv_ph_greenlife"),
            kind: "ADDITIONAL_CREDENTIAL",
            credentialId: uid("pcred_test_pharmacy"),
            licenceNumber: "PCN-CERT/TEST/4",
            expiryDate: "2028-09-05",
          }),
        decision: "APPROVED" as const,
      },
      {
        id: uid("app_test_lab_initial"),
        submit: () =>
          submitProviderGovernance(data, {
            id: uid("app_test_lab_initial"),
            providerType: "LAB",
            providerId: uid("prv_lab_lagosdiag"),
            kind: "INITIAL",
            licenceNumber: "MLSCN/TEST/5",
            expiryDate: "2027-09-05",
          }),
        decision: "REJECTED" as const,
      },
      {
        id: uid("app_test_lab_additional"),
        submit: () =>
          submitProviderGovernance(data, {
            id: uid("app_test_lab_additional"),
            providerType: "LAB",
            providerId: uid("prv_lab_lagosdiag"),
            kind: "ADDITIONAL_CREDENTIAL",
            credentialId: uid("pcred_test_lab"),
            licenceNumber: "ISO/TEST/6",
            expiryDate: "2028-09-05",
          }),
        decision: "APPROVED" as const,
      },
    ];

    for (const application of applications) {
      expect(application.submit(), `${application.id} did not submit`).toBeTruthy();
      const result = decideGovernanceApplication(
        data,
        application.id,
        1,
        application.decision,
        application.decision === "REJECTED" ? "The supplied record could not be verified." : null,
      );
      expect(result.ok, `${application.id} was not decided`).toBe(true);
      expect(
        data.applicationsQueue.some((item) => item.id === application.id),
        `${application.id} remained in the queue`,
      ).toBe(false);
      expect(
        data.governanceAudit.some(
          (event) => event.subject_id === application.id && event.action === application.decision,
        ),
        `${application.id} decision was not audited`,
      ).toBe(true);
    }
  });

  it("restores the credential and lifts only the linked standing on an approved renewal", () => {
    const renewal = decideGovernanceApplication(data, uid("app_009"), 1, "APPROVED", null);
    expect(renewal.ok, "expired expert renewal was not approved").toBe(true);

    const renewedCredential = data.experts
      .find((expert) => expert.id === uid("exp_ogunleye"))
      ?.credentials.find((credential) => credential.id === "exp_ogunleye_cred_1");
    expect(renewedCredential?.expiry_date, "renewal did not restore the credential").toBe(
      "2027-02-01",
    );
    expect(
      data.standingQueue.some((item) => item.id === uid("std_005")),
      "linked expiry standing remained",
    ).toBe(false);
    // A behavioural case is a separate judgement and needs its own decision.
    expect(
      data.standingQueue.some((item) => item.id === uid("std_001")),
      "behavioural standing was lifted by a credential renewal",
    ).toBe(true);
  });

  it("decides a payment dispute once, and 409s a second decision without auditing it", () => {
    const dispute = data.disputeQueue[0];
    expect(dispute, "payment-dispute fixture missing").toBeTruthy();
    expect(
      decideDispute(data, dispute.id, 1, "PATIENT", "Checkout evidence supports the patient.").ok,
      "dispute decision failed",
    ).toBe(true);

    const auditCount = data.governanceAudit.length;
    expect(
      decideDispute(data, dispute.id, 1, "PROVIDER", "Stale decision.").ok,
      "stale dispute decision did not 409",
    ).toBe(false);
    expect(data.governanceAudit.length, "409 wrote a duplicate audit event").toBe(auditCount);
  });

  it("upholds and lifts standing cases, and 409s a stale decision", () => {
    expect(
      decideStanding(data, uid("std_001"), 1, "UPHELD", "Behavioural review remains open.").ok,
      "standing uphold failed",
    ).toBe(true);
    expect(
      data.standingQueue.some((item) => item.id === uid("std_001")),
      "upheld standing left its queue",
    ).toBe(true);
    expect(
      decideStanding(data, uid("std_001"), 1, "LIFTED", "Stale lift.").ok,
      "stale standing decision did not 409",
    ).toBe(false);

    expect(
      decideStanding(data, uid("std_002"), 1, "LIFTED", "Evidence supports restoration.").ok,
      "standing lift failed",
    ).toBe(true);
    expect(
      data.standingQueue.some((item) => item.id === uid("std_002")),
      "lifted standing remained queued",
    ).toBe(false);
  });

  it("provisions a staff account, deactivates it, and removes its access", () => {
    expect(
      provisionStaff(data, {
        id: uid("stf_test"),
        name: "Governance Reviewer",
        email: "governance.reviewer@monovella.com",
        phone: "+234 803 000 1099",
        role: "PLATFORM_ADMIN",
        revoked_at: null,
        must_change_password: true,
      }),
      "staff provisioning failed",
    ).toBeTruthy();

    expect(deactivateStaff(data, uid("stf_test"), 1).ok, "staff deactivation failed").toBe(true);
    expect(
      deactivateStaff(data, uid("stf_test"), 1).ok,
      "stale staff deactivation did not 409",
    ).toBe(false);
    expect(accessStatusOf(data, uid("stf_test")), "deactivated staff retained access").toBe(
      "RESTRICTED",
    );
  });

  it("refuses an operational decision from staff the case is not assigned to", () => {
    expect(
      decideStanding(data, uid("std_003"), 1, "LIFTED", "Wrong reviewer.", uid("stf_002")).ok,
      "unassigned staff mutated an operational case",
    ).toBe(false);
  });
});
