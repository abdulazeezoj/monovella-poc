/**
 * Every screen `PRODUCT_SCREEN_V0.md` enumerates, with where it lives in this
 * prototype. `path: null` means the spec folds that screen into another one and
 * says so — those are listed with the screen that absorbed them, never quietly
 * dropped.
 */
import { FIXTURE_IDS } from "./identities.generated";

export interface ScreenEntry {
  id: string;
  name: string;
  path: string | null;
  note?: string;
}

export interface ScreenSection {
  key: string;
  app: "Mobile app" | "Web app" | "Public";
  audience: string;
  title: string;
  screens: ScreenEntry[];
}

export const SCREEN_SECTIONS: ScreenSection[] = [
  {
    key: "A0",
    app: "Mobile app",
    audience: "Patient + Expert",
    title: "Shared shell",
    screens: [
      { id: "P0", name: "Context Switcher", path: "/app", note: "The pill in Home's top bar" },
    ],
  },
  {
    key: "A1",
    app: "Mobile app",
    audience: "Patient",
    title: "Onboarding, authentication & recovery",
    screens: [
      { id: "P1", name: "Welcome / Get Started", path: "/app/welcome" },
      { id: "P2", name: "Sign Up: Name & Phone", path: "/app/sign-up" },
      { id: "P3", name: "OTP Verification", path: "/app/sign-up", note: "Step two of sign-up" },
      { id: "P4", name: "Set PIN", path: "/app/sign-up", note: "Step three of sign-up" },
      { id: "P5", name: "Sign In", path: "/app/sign-in" },
      { id: "P6", name: "Recover Account: Start", path: "/app/recover" },
      { id: "P7", name: "Recover: Email Verification", path: "/app/recover" },
      { id: "P8", name: "Recover: NIN Verification", path: "/app/recover" },
      { id: "P9", name: "Recover: Manual Support", path: "/app/recover" },
      { id: "P10", name: "Recover: Set New Phone & PIN", path: "/app/recover" },
    ],
  },
  {
    key: "A2",
    app: "Mobile app",
    audience: "Patient",
    title: "Patient identity",
    screens: [
      { id: "P12", name: "Create Patient Profile", path: "/app/profile/create" },
      { id: "P13", name: "Verify Your Monovella ID (NIN)", path: "/app/verify-id" },
      {
        id: "P70",
        name: "Medicines and Reactions",
        path: `/app/patients/${FIXTURE_IDS.pat_amara}/clinical-safety`,
      },
      { id: "P14", name: "Claim Independent Sign-In", path: "/app/claim" },
      { id: "P15", name: "Dependants", path: "/app/dependants" },
      { id: "P16", name: "Add Dependant", path: "/app/dependants/new" },
      { id: "P17", name: "Dependant OTP Confirmation", path: "/app/dependants/confirm" },
      {
        id: "P18",
        name: "Verify Dependant's NIN",
        path: `/app/dependants/${FIXTURE_IDS.pat_zainab}/verify`,
      },
    ],
  },
  {
    key: "A3",
    app: "Mobile app",
    audience: "Patient",
    title: "Home",
    screens: [
      { id: "P19", name: "Home", path: "/app" },
      { id: "P19a", name: "Care history", path: "/app/consultations" },
    ],
  },
  {
    key: "A7",
    app: "Mobile app",
    audience: "Patient",
    title: "Expert discovery & booking",
    screens: [
      { id: "P35", name: "Tell Us What's Going On", path: "/app/find" },
      { id: "P36", name: "Browse Experts", path: "/app/experts" },
      { id: "P37", name: "Expert Profile", path: `/app/experts/${FIXTURE_IDS.exp_lawal}` },
      { id: "P38", name: "Add & Verify a Card", path: "/app/card" },
      { id: "P39", name: "Pick a Time & Book", path: `/app/experts/${FIXTURE_IDS.exp_lawal}/book` },
      {
        id: "P40",
        name: "Booking Status",
        path: `/app/consultations/${FIXTURE_IDS.con_007}/booking`,
      },
      {
        id: "P41",
        name: "Telemedicine Consent",
        path: `/app/consultations/${FIXTURE_IDS.con_009}/consent`,
      },
      {
        id: "P42",
        name: "Referral Received",
        path: `/app/consultations/${FIXTURE_IDS.con_007}/referral`,
      },
    ],
  },
  {
    key: "A8",
    app: "Mobile app",
    audience: "Patient",
    title: "Active consultation",
    screens: [
      { id: "P43", name: "Consultation Hub", path: `/app/consultations/${FIXTURE_IDS.con_003}` },
      { id: "P44", name: "Chat", path: `/app/consultations/${FIXTURE_IDS.con_003}/chat` },
      {
        id: "P44a",
        name: "Voice/Video Call",
        path: `/app/consultations/${FIXTURE_IDS.con_003}/call`,
      },
      { id: "P45", name: "Case Record", path: `/app/consultations/${FIXTURE_IDS.con_002}/record` },
      { id: "P46", name: "Prescription Detail", path: `/app/prescriptions/${FIXTURE_IDS.rx_003}` },
      { id: "P47", name: "Lab Order Detail", path: `/app/lab-orders/${FIXTURE_IDS.lab_003}` },
      {
        id: "P46a",
        name: "Self-Report: Complete Prescription",
        path: `/app/prescriptions/${FIXTURE_IDS.rx_003}/self-report`,
      },
      {
        id: "P47a",
        name: "Self-Report: Attach Your Result",
        path: `/app/lab-orders/${FIXTURE_IDS.lab_003}/self-report`,
      },
    ],
  },
  {
    key: "A8a",
    app: "Mobile app",
    audience: "Patient",
    title: "In-network fulfillment: pharmacy & lab",
    screens: [
      {
        id: "P46b",
        name: "Find a Pharmacy",
        path: `/app/prescriptions/${FIXTURE_IDS.rx_003}/pharmacies`,
      },
      {
        id: "P46b",
        name: "Pharmacy Disclosure Consent",
        path: `/app/prescriptions/${FIXTURE_IDS.rx_003}/pharmacies/${FIXTURE_IDS.prv_ph_greenlife}/consent`,
      },
      {
        id: "P46c",
        name: "Pharmacy Request Status",
        path: `/app/prescriptions/${FIXTURE_IDS.rx_002}/request`,
      },
      {
        id: "P46d",
        name: "Pharmacy Order: Payment & Handoff",
        path: `/app/prescriptions/${FIXTURE_IDS.rx_002}/order`,
      },
      { id: "P47b", name: "Find a Lab", path: `/app/lab-orders/${FIXTURE_IDS.lab_003}/labs` },
      {
        id: "P47b",
        name: "Lab Disclosure Consent",
        path: `/app/lab-orders/${FIXTURE_IDS.lab_006}/labs/${FIXTURE_IDS.prv_lab_pathcare}/consent`,
      },
      {
        id: "P47c",
        name: "Lab Request Status",
        path: `/app/lab-orders/${FIXTURE_IDS.lab_003}/request`,
      },
      {
        id: "P47d",
        name: "Schedule & Pay for Lab Test",
        path: `/app/lab-orders/${FIXTURE_IDS.lab_002}/schedule`,
      },
      { id: "P47e", name: "Lab Result", path: `/app/lab-orders/${FIXTURE_IDS.lab_002}/result` },
    ],
  },
  {
    key: "A9",
    app: "Mobile app",
    audience: "Patient",
    title: "Payments",
    screens: [
      {
        id: "P48",
        name: "Checkout Receipt",
        path: `/app/consultations/${FIXTURE_IDS.con_005}/checkout`,
      },
      {
        id: "P54",
        name: "Bank Account Refund Opt-In",
        path: `/app/checkout-payments/${FIXTURE_IDS.chk_006}/refund`,
      },
    ],
  },
  {
    key: "A10",
    app: "Mobile app",
    audience: "Patient",
    title: "Refunds & complaints",
    screens: [
      { id: "P55", name: "File a Refund Request", path: `/app/refunds/new/${FIXTURE_IDS.con_002}` },
      { id: "P56", name: "Refund Request Status", path: `/app/refunds/${FIXTURE_IDS.rfd_001}` },
      {
        id: "P57",
        name: "File a Clinical Complaint",
        path: `/app/complaints/new/${FIXTURE_IDS.con_002}`,
      },
    ],
  },
  {
    key: "A11",
    app: "Mobile app",
    audience: "Patient",
    title: "Account & settings",
    screens: [
      { id: "P58", name: "Account Settings", path: "/app/account" },
      { id: "P58a", name: "Personal Information", path: "/app/account/personal" },
      {
        id: "P58a",
        name: "Change Phone Number",
        path: "/app/account/change-phone",
        note: "Sub-flow of P58a",
      },
      { id: "P58b", name: "Payment Methods", path: "/app/account/payment-methods" },
      { id: "P58c", name: "Notification Preferences", path: "/app/account/notifications" },
      { id: "P59", name: "Device Sessions", path: "/app/account/devices" },
      { id: "P59a", name: "Change PIN", path: "/app/account/change-pin" },
      { id: "P59b", name: "Biometric Unlock", path: "/app/account/biometric" },
      { id: "P59c", name: "Two-step Verification", path: "/app/account/two-factor" },
      { id: "P60", name: "Recovery Email", path: "/app/account/recovery-email" },
      { id: "P61", name: "Close Account", path: "/app/account/close" },
      { id: "P67", name: "Invite a Friend", path: "/app/account/invite" },
      { id: "P68", name: "Privacy and Consent", path: "/app/account/privacy-consents" },
      { id: "P69", name: "Care-Team Access", path: "/app/account/access-history" },
      { id: "P62", name: "Account Restricted", path: "/app/account/restricted" },
    ],
  },
  {
    key: "A12",
    app: "Mobile app",
    audience: "Patient",
    title: "Records & portability",
    screens: [
      { id: "P63", name: "My Reports", path: "/app/reports" },
      { id: "P64", name: "Generate a Report", path: "/app/reports/new" },
      { id: "P65", name: "Report Detail / Viewer", path: `/app/reports/${FIXTURE_IDS.rep_001}` },
      { id: "P66", name: "Report Verification (public)", path: "/verify/MV-RPT-4K7Q-2XN8" },
    ],
  },
  {
    key: "A13",
    app: "Mobile app",
    audience: "Expert",
    title: "Application & verification",
    screens: [
      { id: "X1", name: "Apply to Practice", path: "/app/expert/apply" },
      { id: "X1a", name: "Add Another Credential", path: "/app/expert/add-credential" },
      { id: "X1b", name: "Credentials, Specialties & Fees", path: "/app/expert/credentials" },
      { id: "X3", name: "Application Status", path: "/app/expert/application" },
    ],
  },
  {
    key: "A14",
    app: "Mobile app",
    audience: "Expert",
    title: "Practice home & management",
    screens: [
      { id: "X4", name: "Expert Home", path: "/app/expert" },
      { id: "X4a", name: "Account (Expert)", path: "/app/expert/account" },
      { id: "X5", name: "Availability Control", path: "/app/expert/availability" },
      { id: "X6", name: "Payment Details", path: "/app/expert/payout" },
      { id: "X7", name: "Weekly Schedule", path: "/app/expert/schedule" },
      {
        id: "X7a",
        name: "Edit Schedule Slot",
        path: "/app/expert/schedule",
        note: "Sheet over X7",
      },
      {
        id: "X7b",
        name: "Remove Schedule Slot",
        path: "/app/expert/schedule",
        note: "Confirm over X7",
      },
      {
        id: "X8",
        name: "Standing Notice (Expert)",
        path: "/app/expert",
        note: "Pick “Standing suspended” in the bar",
      },
    ],
  },
  {
    key: "A15",
    app: "Mobile app",
    audience: "Expert",
    title: "Consultation requests & lifecycle",
    screens: [
      { id: "X9", name: "Incoming Requests & Appointments", path: "/app/expert/requests" },
      {
        id: "X10",
        name: "Request Detail (Accept/Decline)",
        path: "/app/expert/requests",
        note: "Expandable card in X9",
      },
      { id: "X11", name: "My Consultations", path: "/app/expert/consultations" },
      {
        id: "X12",
        name: "Consultation Workspace",
        path: `/app/expert/consultations/${FIXTURE_IDS.con_106}`,
      },
      {
        id: "X12h",
        name: "Consultation Workspace: Patient History",
        path: `/app/expert/consultations/${FIXTURE_IDS.con_106}?tab=history`,
      },
      {
        id: "X14",
        name: "SOAP Note Editor",
        path: `/app/expert/consultations/${FIXTURE_IDS.con_106}`,
        note: "Workspace tab",
      },
      {
        id: "X15",
        name: "Prescriptions (Issue / Correct)",
        path: `/app/expert/consultations/${FIXTURE_IDS.con_106}`,
        note: "Workspace tab",
      },
      {
        id: "X16",
        name: "Lab Orders (Issue / Correct)",
        path: `/app/expert/consultations/${FIXTURE_IDS.con_106}`,
        note: "Workspace tab",
      },
      {
        id: "X17",
        name: "Create Referral",
        path: `/app/expert/consultations/${FIXTURE_IDS.con_106}`,
        note: "Workspace tab",
      },
      {
        id: "X13a",
        name: "Voice/Video Call",
        path: `/app/expert/consultations/${FIXTURE_IDS.con_106}/call`,
      },
      {
        id: "X19",
        name: "Complete Consultation",
        path: `/app/expert/consultations/${FIXTURE_IDS.con_106}`,
        note: "Confirm modal",
      },
      {
        id: "X25",
        name: "Invite a Guest Expert",
        path: `/app/expert/consultations/${FIXTURE_IDS.con_106}`,
        note: "Workspace tab",
      },
      { id: "X26", name: "Guest Examination Request", path: "/app/expert/guest-examinations" },
      {
        id: "X27",
        name: "Guest Examination Notes",
        // con_012, not con_003: this seat's expert is the invited guest there.
        // con_003's guest is a different expert, so this seat correctly gets the
        // not-found response and would declare no states at all.
        path: `/app/expert/guest-examinations/${FIXTURE_IDS.con_012}`,
      },
    ],
  },
  {
    key: "A16",
    app: "Mobile app",
    audience: "Expert",
    title: "Fee & earnings",
    screens: [
      { id: "X20", name: "My Payouts", path: "/app/expert/payouts" },
      { id: "X21", name: "Payout Detail", path: `/app/expert/payouts/${FIXTURE_IDS.po_102}` },
      {
        id: "X22",
        name: "Payout Support",
        path: `/app/expert/payouts/${FIXTURE_IDS.po_102}/support`,
      },
      { id: "X23", name: "Payout History", path: "/app/expert/payout-history" },
      { id: "X24", name: "Renew Your Licence", path: "/app/expert/renew-licence" },
    ],
  },
  {
    key: "BO1",
    app: "Web app",
    audience: "Back office",
    title: "Staff auth",
    screens: [
      { id: "B1", name: "Staff Sign In", path: "/console/sign-in" },
      { id: "B2", name: "Forced Password Change", path: "/console/password" },
      { id: "B3/B4", name: "Forgot / Reset Password", path: "/console/forgot" },
    ],
  },
  {
    key: "BO2",
    app: "Web app",
    audience: "Back office",
    title: "Console shell",
    screens: [{ id: "B6", name: "Console Home", path: "/console" }],
  },
  {
    key: "BO3",
    app: "Web app",
    audience: "Back office",
    title: "Provider applications queue",
    screens: [
      { id: "B7", name: "Applications Queue", path: "/console/applications" },
      {
        id: "B8",
        name: "Application Detail",
        path: `/console/applications/${FIXTURE_IDS.app_002}`,
      },
      {
        id: "B9",
        name: "Decision",
        path: `/console/applications/${FIXTURE_IDS.app_002}`,
        note: "Panel over B8",
      },
    ],
  },
  {
    key: "BO4",
    app: "Web app",
    audience: "Back office",
    title: "Payment disputes queue",
    screens: [
      { id: "B11", name: "Disputes Queue", path: "/console/disputes" },
      { id: "B12", name: "Dispute Detail", path: `/console/disputes/${FIXTURE_IDS.dsp_002}` },
      {
        id: "B13",
        name: "Dispute Decision",
        path: `/console/disputes/${FIXTURE_IDS.dsp_002}`,
        note: "Panel over B12",
      },
    ],
  },
  {
    key: "BO5",
    app: "Web app",
    audience: "Back office",
    title: "Refund requests queue",
    screens: [
      { id: "B14", name: "Refund Requests Queue", path: "/console/refunds" },
      { id: "B15", name: "Refund Request Detail", path: `/console/refunds/${FIXTURE_IDS.rfd_003}` },
      {
        id: "B16",
        name: "Refund Decision",
        path: `/console/refunds/${FIXTURE_IDS.rfd_003}`,
        note: "Panel over B15",
      },
    ],
  },
  {
    key: "BO6",
    app: "Web app",
    audience: "Back office",
    title: "Standing / suspension queue",
    screens: [
      { id: "B17", name: "Standing Queue", path: "/console/standing" },
      { id: "B18", name: "Standing Detail", path: `/console/standing/${FIXTURE_IDS.std_001}` },
      {
        id: "B19",
        name: "Standing Decision",
        path: `/console/standing/${FIXTURE_IDS.std_001}`,
        note: "Panel over B18",
      },
    ],
  },
  {
    key: "BO7",
    app: "Web app",
    audience: "Back office",
    title: "Staff account management",
    screens: [
      { id: "B20", name: "Staff Accounts", path: "/console/staff" },
      {
        id: "B21",
        name: "Provision Staff Account",
        path: "/console/staff",
        note: "Sheet over B20",
      },
      {
        id: "B22",
        name: "Deactivate Staff Account",
        path: "/console/staff",
        note: "Confirm over B20",
      },
      { id: "B23", name: "My Profile", path: "/console/profile" },
    ],
  },
  {
    key: "BO7A",
    app: "Web app",
    audience: "Back office",
    title: "Clinical safety review",
    screens: [
      { id: "B24", name: "Clinical Safety Queue", path: "/console/clinical-safety" },
      {
        id: "B25",
        name: "Clinical Safety Detail",
        path: `/console/clinical-safety/${FIXTURE_IDS.ccr_001}`,
        note: "Create a complaint from P57 first",
      },
    ],
  },
  {
    key: "BO8-PH",
    app: "Web app",
    audience: "Pharmacy",
    title: "Provider portal: Pharmacy",
    screens: [
      { id: "V1", name: "Provider Sign In", path: "/pharmacy/sign-in" },
      { id: "V1a", name: "Forced Password Change", path: "/pharmacy/password" },
      { id: "V1b", name: "Forgot / Reset Password", path: "/pharmacy/forgot" },
      { id: "V3", name: "Provider Application", path: "/pharmacy/apply" },
      { id: "V4", name: "Application Status", path: "/pharmacy/application" },
      { id: "V5", name: "Provider Home", path: "/pharmacy" },
      { id: "V6", name: "Incoming Requests", path: "/pharmacy/requests" },
      {
        id: "V7",
        name: "Request Detail (Accept / Decline)",
        path: `/pharmacy/requests/${FIXTURE_IDS.preq_101}`,
      },
      { id: "V8", name: "Prepare Order", path: `/pharmacy/requests/${FIXTURE_IDS.preq_103}` },
      {
        id: "V11",
        name: "Confirm Payment / Raise Dispute",
        path: `/pharmacy/requests/${FIXTURE_IDS.preq_103}`,
      },
      {
        id: "V12",
        name: "Standing Notice (Provider)",
        path: "/pharmacy",
        note: "Pick “Standing suspended” in the bar",
      },
      { id: "V13", name: "Payment History", path: "/pharmacy/payments" },
      { id: "V14", name: "Business Profile", path: "/pharmacy/profile" },
      { id: "V14a", name: "Credentials & Certificates", path: "/pharmacy/credentials" },
      { id: "V16", name: "Portal Settings", path: "/pharmacy/settings" },
      { id: "V15", name: "Renew Your Licence", path: "/pharmacy/renew-licence" },
    ],
  },
  {
    key: "BO8-LAB",
    app: "Web app",
    audience: "Lab",
    title: "Provider portal: Lab",
    screens: [
      { id: "V1", name: "Provider Sign In", path: "/lab/sign-in" },
      { id: "V1a", name: "Forced Password Change", path: "/lab/password" },
      { id: "V1b", name: "Forgot / Reset Password", path: "/lab/forgot" },
      { id: "V3", name: "Provider Application", path: "/lab/apply" },
      { id: "V4", name: "Application Status", path: "/lab/application" },
      { id: "V5", name: "Provider Home", path: "/lab" },
      { id: "V6", name: "Incoming Requests", path: "/lab/requests" },
      {
        id: "V7",
        name: "Request Detail (Accept / Decline)",
        path: `/lab/requests/${FIXTURE_IDS.preq_201}`,
      },
      { id: "V9", name: "Manage Test Slots", path: "/lab/slots" },
      { id: "V10", name: "Upload Result", path: `/lab/requests/${FIXTURE_IDS.preq_202}` },
      { id: "V13", name: "Payment History", path: "/lab/payments" },
      { id: "V14", name: "Business Profile", path: "/lab/profile" },
      { id: "V14a", name: "Credentials & Certificates", path: "/lab/credentials" },
      { id: "V16", name: "Portal Settings", path: "/lab/settings" },
      { id: "V15", name: "Renew Your Licence", path: "/lab/renew-licence" },
    ],
  },
  {
    key: "C",
    app: "Public",
    audience: "Everyone",
    title: "Public marketing site",
    screens: [
      { id: "M1", name: "Landing Page", path: "/" },
      { id: "M2", name: "Terms of Service", path: "/legal/terms" },
      { id: "M3", name: "Data & Privacy Policy", path: "/legal/privacy" },
      { id: "M4", name: "Cookie Policy", path: "/legal/cookies" },
    ],
  },
];

const SCREEN_ENTRIES = SCREEN_SECTIONS.flatMap((section) => section.screens);

/** Manifest rows, including repeated IDs for sub-flows and provider variants. */
export const SCREEN_ENTRY_COUNT = SCREEN_ENTRIES.length;

/** Distinct logical IDs after expanding combined entries such as `B3/B4`. */
export const SCREEN_ID_COUNT = new Set(SCREEN_ENTRIES.flatMap((screen) => screen.id.split("/")))
  .size;

/** Unique routed surfaces declared by the manifest. */
export const SCREEN_ROUTE_COUNT = new Set(
  SCREEN_ENTRIES.flatMap((screen) => (screen.path ? [screen.path] : [])),
).size;

/** Manifest routes plus the two reviewer-only surfaces used by the traceability sweep. */
export const REVIEWER_SURFACE_COUNT = SCREEN_ROUTE_COUNT + 2;

/** @deprecated Prefer the explicit taxonomy constants above. */
export const SCREEN_COUNT = SCREEN_ENTRY_COUNT;
