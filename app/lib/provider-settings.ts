import type { Dataset } from "~/data";

/** Each portal account owns its settings, including accounts restored from an older demo. */
export function ensureProviderSettings(data: Dataset, providerId: string) {
  const provider = data.providers.find((row) => row.id === providerId);
  if (!provider || (provider.provider_type !== "PHARMACY" && provider.provider_type !== "LAB"))
    return;
  if (
    !data.notificationPreferences.some(
      (row) => row.subject_id === providerId && row.scope === provider.provider_type,
    )
  )
    data.notificationPreferences.push({
      id: `${providerId}_preferences`,
      scope: provider.provider_type,
      subject_id: providerId,
      appointment_reminders: null,
      incoming_request_alerts: true,
      payment_fee_updates: true,
      credential_licence_reminders: true,
      queue_overdue_alerts: null,
      product_updates: false,
    });
  if (
    !data.twoFactorSettings.some(
      (row) => row.subject_id === providerId && row.subject_type === "PROVIDER",
    )
  )
    data.twoFactorSettings.push({
      id: `${providerId}_2fa`,
      subject_type: "PROVIDER",
      subject_id: providerId,
      enabled: false,
      method: null,
      recovery_codes_remaining: 0,
    });
}
