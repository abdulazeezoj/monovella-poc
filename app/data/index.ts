import type { DependantConfirmation } from "~/lib/dependant-onboarding";
/**
 * Typed access to the prototype's data.
 *
 * The data is a Postgres data directory (`public/prototype.pgdata`), built by
 * `mise run seed` from the fixtures through `prisma/postgres.sql` with foreign
 * keys and check constraints enforced, and opened in the tab with PGlite.
 * `buildDataset()` returns a fresh, mutable copy of it, so the store can advance
 * state (accept a request, mark a fee paid) without ever writing back to the
 * shipped file. Reset returns to the seeded bytes.
 */
import { openPrototypeDatabase, readDataset } from "./database";
import { EXPERT_ID } from "./identities.generated";
import metaJson from "./meta.json";
// The reference catalogue (states, LGAs, specialties, symptom labels) is read at
// module scope by components that cannot await anything, so it stays a direct
// import. It is seeded into the database too, so the schema still covers it; the
// database is the record store, and this is a lookup table that never changes
// during a session.
import referenceJson from "./reference.json";

import type {
  CareAccessGrantRead,
  ChatMessageRead,
  CheckoutPaymentRead,
  ClinicalComplaintReferral,
  ClinicalSafetyContextRead,
  CompanionMemoryRead,
  CompanionMessageRead,
  ConsentRecordRead,
  ConsultationRead,
  DeviceSessionRead,
  ExpertAvailabilitySlotRead,
  ExpertPayoutDetailsRead,
  ExpertPayoutHistoryRead,
  ExpertRead,
  ExpertScheduleExceptionRead,
  ExpertScheduleSlotRead,
  ExpertSchedulingRulesRead,
  FeedbackRead,
  GovernanceAccessRead,
  GovernanceApplicationLinkRead,
  GovernanceAssignmentRead,
  GovernanceAuditEventRead,
  GovernanceRevisionRead,
  HistoryReadEventRead,
  InsightRead,
  LabOrderDetailRead,
  LogEntryDetailRead,
  NotificationPreferenceRead,
  PatientRead,
  PatientReferralCodeRead,
  PaymentDisputeQueueItem,
  PaymentDisputeRead,
  PaymentMethodRead,
  PayoutSupportRequestRead,
  PrescriptionDetailRead,
  PrivacyRequestRead,
  ProviderApplicationDetail,
  ProviderApplicationQueueItem,
  ProviderCredentialRead,
  ProviderDirectoryRead,
  ProviderPayoutRead,
  ProviderRequestRead,
  ProviderScheduleExceptionRead,
  ProviderScheduleSlotRead,
  RefundRequestQueueItem,
  RefundRequestRead,
  ReportRead,
  SoapNoteRead,
  StaffAccountRead,
  StandingQueueItem,
  SupportCaseRead,
  TwoFactorSettingsRead,
  UserRead,
} from "./types";

export interface Dataset {
  /** Runtime identities for a newly created account; absent in the shipped demo. */
  accountPatientId?: string;
  dependantConfirmations?: DependantConfirmation[];
  accountExpertId?: string;
  providerAccounts?: Array<{ providerId: string; email: string }>;
  accountProviderIds?: Partial<Record<"PHARMACY" | "LAB", string>>;
  user: UserRead;
  patients: PatientRead[];
  experts: ExpertRead[];
  expertSchedule: ExpertScheduleSlotRead[];
  expertScheduleExceptions: ExpertScheduleExceptionRead[];
  expertSchedulingRules: ExpertSchedulingRulesRead[];
  expertAvailability: ExpertAvailabilitySlotRead[];
  consultations: ConsultationRead[];
  careAccessGrants: CareAccessGrantRead[];
  historyReadEvents: HistoryReadEventRead[];
  clinicalSafetyContexts: ClinicalSafetyContextRead[];
  consentRecords: ConsentRecordRead[];
  soapNotes: SoapNoteRead[];
  prescriptions: PrescriptionDetailRead[];
  labOrders: LabOrderDetailRead[];
  chatMessages: ChatMessageRead[];
  logEntries: LogEntryDetailRead[];
  insights: InsightRead[];
  companionMessages: CompanionMessageRead[];
  companionMemory: CompanionMemoryRead[];
  providers: ProviderDirectoryRead[];
  providerCredentials: ProviderCredentialRead[];
  providerRequests: ProviderRequestRead[];
  providerScheduleExceptions: ProviderScheduleExceptionRead[];
  providerSlots: ProviderScheduleSlotRead[];
  paymentMethods: PaymentMethodRead[];
  checkoutPayments: CheckoutPaymentRead[];
  clinicalComplaintReferrals: ClinicalComplaintReferral[];
  providerPayouts: ProviderPayoutRead[];
  payoutSupportRequests: PayoutSupportRequestRead[];
  expertPayoutDetails: ExpertPayoutDetailsRead[];
  payoutHistory: ExpertPayoutHistoryRead[];
  disputes: PaymentDisputeRead[];
  refundRequests: RefundRequestRead[];
  reports: ReportRead[];
  deviceSessions: DeviceSessionRead[];
  notificationPreferences: NotificationPreferenceRead[];
  twoFactorSettings: TwoFactorSettingsRead[];
  referralCodes: PatientReferralCodeRead[];
  applicationsQueue: ProviderApplicationQueueItem[];
  applicationDetails: (ProviderApplicationDetail & {
    expert?: Record<string, string | number>;
  })[];
  disputeQueue: PaymentDisputeQueueItem[];
  refundQueue: RefundRequestQueueItem[];
  standingQueue: StandingQueueItem[];
  staffAccounts: StaffAccountRead[];
  supportCases: SupportCaseRead[];
  privacyRequests: PrivacyRequestRead[];
  feedbackEntries: FeedbackRead[];
  governanceApplications: GovernanceApplicationLinkRead[];
  governanceAudit: GovernanceAuditEventRead[];
  governanceAccess: GovernanceAccessRead[];
  governanceRevisions: GovernanceRevisionRead[];
  governanceAssignments: GovernanceAssignmentRead[];
  /** Entries the patient logged offline that have not synced yet (P29). */
  offlineQueue: LogEntryDetailRead[];
  /** Expert-side availability status, mutable from X5. */
  expertAvailabilityStatus: Record<string, ExpertRead["availability_status"]>;
}

export const meta = metaJson;
export const reference = referenceJson;

let loaded: Record<string, unknown> | null = null;

/**
 * Opens `public/prototype.pgdata`, reads every table once, and closes it again.
 *
 * The prototype's data is a Postgres data directory, built by `mise run seed`
 * from the fixtures through `prisma/postgres.sql` with foreign keys and check
 * constraints enforced, and opened here with PGlite. This has to run before any
 * screen renders, which is why `PrototypeProvider` shows the loading screen
 * until it resolves.
 *
 * The handle is closed as soon as the read finishes. Nothing needs it
 * afterwards: the store works on a mutable clone and never writes back, so the
 * shipped bytes stay the reset point. An open PGlite instance also holds the
 * Node event loop open, which would leave every flow script hanging at exit
 * instead of reporting its verdict.
 */
export async function loadPrototypeData(): Promise<void> {
  if (loaded) return;
  const database = await openPrototypeDatabase();
  try {
    loaded = await readDataset(database);
  } finally {
    await database.close();
  }
}

export function isPrototypeDataLoaded(): boolean {
  return loaded !== null;
}

/**
 * A fresh, mutable copy of the shipped data.
 *
 * Screens advance state by mutating this working copy, exactly as before. The
 * database is the source and the reset point; it is never written back to from
 * the browser, so the prototype bar's reset returns to the seeded bytes.
 */
export function buildDataset(): Dataset {
  if (!loaded) {
    throw new Error(
      "buildDataset() was called before loadPrototypeData(). The prototype's data lives in Postgres now.",
    );
  }
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  return {
    ...(clone(loaded) as unknown as Dataset),
    offlineQueue: [],
    expertAvailabilityStatus: { [EXPERT_ID]: "ONLINE" },
  };
}
