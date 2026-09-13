import type { Dataset } from "~/data";
import { LAB_ID, PHARMACY_ID } from "~/data/selectors";
import type { ProviderDirectoryRead } from "~/data/types";
import {
  accessStatusOf,
  applicationLink,
  submitProviderGovernance,
} from "~/lib/governance-lifecycle";
import { ensureProviderSettings } from "~/lib/provider-settings";

export interface ProviderApplicationInput {
  providerId: string;
  previousApplicationId?: string;
  applicationId: string;
  credentialId: string;
  providerType: "PHARMACY" | "LAB";
  businessName: string;
  address: string;
  city: string;
  localGovernmentArea: string;
  state: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  cacNumber: string;
  licenceNumber: string;
  licenceExpiry: string;
  documentFilename: string;
  services: string[];
  bankCode: string;
  bankAccountNumber: string;
}

/** A new applicant starts with no orders, verified credentials or assumed bank verification. */
export function createProviderApplication(data: Dataset, input: ProviderApplicationInput) {
  const priorLink = input.previousApplicationId
    ? applicationLink(data, input.previousApplicationId)
    : undefined;
  const priorApplication = input.previousApplicationId
    ? data.applicationDetails.find((item) => item.id === input.previousApplicationId)
    : undefined;
  const existing = data.providers.find((item) => item.id === input.providerId);
  const resubmitting = !!input.previousApplicationId;
  if (
    resubmitting &&
    (!priorLink ||
      priorLink.actor_id !== input.providerId ||
      priorLink.application_kind !== "INITIAL" ||
      priorApplication?.status !== "REJECTED" ||
      existing?.provider_type !== input.providerType ||
      data.accountProviderIds?.[input.providerType] !== input.providerId ||
      accessStatusOf(data, input.providerId) !== "REJECTED")
  )
    return false;
  const email = input.contactEmail.trim().toLowerCase();
  const emailAccount = providerAccountForEmail(data, input.providerType, email);
  if (resubmitting && emailAccount?.id !== input.providerId) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (!resubmitting && emailAccount)) return false;
  if (input.contactPhone.replace(/\D/g, "").length < 10) return false;
  const required = [
    input.providerId,
    input.applicationId,
    input.credentialId,
    input.businessName,
    input.address,
    input.city,
    input.localGovernmentArea,
    input.state,
    input.contactName,
    input.cacNumber,
    input.licenceNumber,
    input.documentFilename,
    input.bankCode,
  ];
  if (
    required.some((value) => !value.trim()) ||
    !/^\d{10}$/.test(input.bankAccountNumber) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input.licenceExpiry) ||
    !Number.isFinite(Date.parse(input.licenceExpiry)) ||
    new Date(input.licenceExpiry).toISOString().slice(0, 10) !== input.licenceExpiry ||
    (!resubmitting && !!existing) ||
    data.applicationDetails.some((item) => item.id === input.applicationId) ||
    data.governanceApplications.some((item) => item.application_id === input.applicationId) ||
    data.providerCredentials.some((item) => item.id === input.credentialId)
  )
    return false;

  const provider: ProviderDirectoryRead = {
    id: input.providerId,
    provider_type: input.providerType,
    business_name: input.businessName.trim(),
    availability_status: "OUT_OF_OFFICE",
    distance_km: null,
    services_offered: input.providerType === "LAB" ? [...input.services] : null,
    premises_address: input.address.trim(),
    city: input.city.trim(),
    local_government_area: input.localGovernmentArea,
    state: input.state,
    contact_name: input.contactName.trim(),
    contact_phone: input.contactPhone?.trim(),
    cac_number: input.cacNumber.trim(),
    license_number: input.licenceNumber.trim(),
    payout_bank_code: input.bankCode,
    payout_bank_account_number: input.bankAccountNumber,
    payout_account_name: null,
    payout_verified_at: null,
    logo_url: null,
  };
  if (resubmitting && existing) Object.assign(existing, provider);
  else data.providers.push(provider);
  data.providerCredentials.push({
    id: input.credentialId,
    provider_id: input.providerId,
    credential_type: "OPERATING_LICENCE",
    title: "Operating licence",
    reference_number: input.licenceNumber.trim(),
    document_filename: input.documentFilename,
    expires_at: input.licenceExpiry,
    verification_status: "PENDING",
    verified_at: null,
    retired_at: null,
  });
  submitProviderGovernance(data, {
    id: input.applicationId,
    providerType: input.providerType,
    providerId: input.providerId,
    kind: "INITIAL",
    targetCredentialId: input.credentialId,
    licenceNumber: input.licenceNumber.trim(),
    expiryDate: input.licenceExpiry,
    documentFilename: input.documentFilename,
  });
  if (email) {
    data.providerAccounts ??= [];
    if (!resubmitting) data.providerAccounts.push({ providerId: input.providerId, email });
    const application = data.applicationDetails.find((item) => item.id === input.applicationId)!;
    if (priorApplication)
      application.prior_rejection_reason = priorApplication.prior_rejection_reason;
    application.contact_email = email;
    application.contact_phone = input.contactPhone?.trim();
  }
  ensureProviderSettings(data, input.providerId);
  data.accountProviderIds = { ...data.accountProviderIds, [input.providerType]: input.providerId };
  return true;
}

/** The account email stays outside patient-facing provider directory records. */
export function providerAccountEmail(data: Dataset, providerId: string) {
  return (
    data.providerAccounts?.find((item) => item.providerId === providerId)?.email ??
    (providerId === PHARMACY_ID
      ? "counter@greenlifepharmacy.ng"
      : providerId === LAB_ID
        ? "reception@lagosdiagnostics.ng"
        : undefined)
  );
}
export function providerAccountForEmail(
  data: Dataset,
  providerType: "PHARMACY" | "LAB",
  email: string,
) {
  const normalized = email.trim().toLowerCase();
  return data.providers.find(
    (provider) =>
      provider.provider_type === providerType &&
      providerAccountEmail(data, provider.id) === normalized,
  );
}
