import { index, layout, prefix, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/landing.tsx"),
  route("tour", "routes/tour.tsx"),
  route("screens", "routes/screens.tsx"),
  route("verify/:code", "routes/verify.tsx"),
  route("legal/terms", "routes/legal/terms.tsx"),
  route("legal/privacy", "routes/legal/privacy.tsx"),
  route("legal/cookies", "routes/legal/cookies.tsx"),

  // ── Mobile app (Expo): Patient + Expert, one app, switchable context ──
  layout("routes/app/layout.tsx", [
    ...prefix("app", [
      index("routes/app/home.tsx"),
      route("notifications/:notificationId?", "routes/app/notifications.tsx"),
      route("support/:supportId?", "routes/app/support.tsx"),
      route("privacy-request", "routes/app/privacy-request.tsx"),
      route("feedback/:kind/:interactionId", "routes/app/feedback.tsx"),

      // A1 · Onboarding, authentication and recovery
      route("welcome", "routes/app/welcome.tsx"),
      route("sign-up", "routes/app/sign-up.tsx"),
      route("sign-in", "routes/app/sign-in.tsx"),
      route("recover", "routes/app/recover.tsx"),

      // A2 · Patient identity
      route("profile/create", "routes/app/identity/create-profile.tsx"),
      route("verify-id", "routes/app/identity/verify-id.tsx"),
      route("claim", "routes/app/identity/claim.tsx"),
      route("dependants", "routes/app/identity/dependants.tsx"),
      route("dependants/new", "routes/app/identity/add-dependant.tsx"),
      route("dependants/confirm", "routes/app/identity/dependant-confirm.tsx"),
      route("dependants/:id", "routes/app/identity/dependant-detail.tsx"),
      route("dependants/:id/verify", "routes/app/identity/verify-dependant.tsx"),
      route("patients/:patientId/clinical-safety", "routes/app/clinical-safety.tsx"),

      // A4 Logging, A5 Calendar and insights, and A6 Teni are deferred out of
      // V0. They are patient self-tracking and the AI companion, not the loop
      // V0 exists to test: book, consult, prescribe, fulfil, result, pay,
      // history. See PRODUCT_SPEC_V0.md section 9.

      // A7 · Expert discovery and booking
      route("find", "routes/app/discovery/find.tsx"),
      route("experts", "routes/app/discovery/browse.tsx"),
      route("experts/:id", "routes/app/discovery/profile.tsx"),
      route("experts/:id/book", "routes/app/discovery/book.tsx"),
      route("card", "routes/app/discovery/card.tsx"),
      route("consultations", "routes/app/care-history.tsx"),
      route("consultations/:id/booking", "routes/app/consult/booking.tsx"),
      route("consultations/:id/reschedule", "routes/app/consult/reschedule.tsx"),
      route("consultations/:id/consent", "routes/app/consult/consent.tsx"),
      route("consultations/:id/referral", "routes/app/consult/referral.tsx"),
      route("consultations/:id/guest-checkout", "routes/app/pay/guest-checkout.tsx"),

      // A8 · Active consultation
      route("consultations/:id", "routes/app/consultation.tsx"),
      route("consultations/:id/chat", "routes/app/consult/chat.tsx"),
      route("consultations/:id/call", "routes/app/consult/call.tsx"),
      route("consultations/:id/record", "routes/app/consult/record.tsx"),

      // A8 / A8a · Prescriptions and pharmacy fulfillment
      route("prescriptions/:id", "routes/app/fulfil/prescription.tsx"),
      route("prescriptions/:id/self-report", "routes/app/fulfil/prescription-self-report.tsx"),
      route("prescriptions/:id/pharmacies", "routes/app/fulfil/pharmacies.tsx"),
      route(
        "prescriptions/:id/pharmacies/:providerId/consent",
        "routes/app/fulfil/pharmacy-consent.tsx",
      ),
      route("prescriptions/:id/request", "routes/app/fulfil/pharmacy-request.tsx"),
      route("prescriptions/:id/order", "routes/app/fulfil/pharmacy-order.tsx"),

      // A8 / A8a · Lab orders and lab fulfillment
      route("lab-orders/:id", "routes/app/fulfil/lab-order.tsx"),
      route("lab-orders/:id/self-report", "routes/app/fulfil/lab-self-report.tsx"),
      route("lab-orders/:id/labs", "routes/app/fulfil/labs.tsx"),
      route("lab-orders/:id/labs/:providerId/consent", "routes/app/fulfil/lab-consent.tsx"),
      route("lab-orders/:id/request", "routes/app/fulfil/lab-request.tsx"),
      route("lab-orders/:id/schedule", "routes/app/fulfil/lab-schedule.tsx"),
      route("lab-orders/:id/result", "routes/app/fulfil/lab-result.tsx"),

      // A9 · Payments
      route("consultations/:id/checkout", "routes/app/pay/checkout.tsx"),
      route("checkout-payments/:id/refund", "routes/app/pay/bank-refund.tsx"),

      // A10 · Refunds and complaints
      route("refunds/new/:consultationId", "routes/app/pay/file-refund.tsx"),
      route("refunds/:id", "routes/app/pay/refund-status.tsx"),
      route("complaints/new/:consultationId", "routes/app/pay/file-complaint.tsx"),
      route("complaints/:id", "routes/app/pay/complaint-status.tsx"),

      // A11 · Account and settings
      route("account", "routes/app/account.tsx"),
      route("account/personal", "routes/app/settings/personal.tsx"),
      route("account/change-phone", "routes/app/settings/change-phone.tsx"),
      route("account/payment-methods", "routes/app/settings/payment-methods.tsx"),
      route("account/notifications", "routes/app/settings/notifications.tsx"),
      route("account/devices", "routes/app/settings/devices.tsx"),
      route("account/change-pin", "routes/app/settings/change-pin.tsx"),
      route("account/biometric", "routes/app/settings/biometric.tsx"),
      route("account/two-factor", "routes/app/settings/two-factor.tsx"),
      route("account/recovery-email", "routes/app/settings/recovery-email.tsx"),
      route("account/privacy-consents", "routes/app/account/privacy-consents.tsx"),
      route("account/access-history", "routes/app/account/access-history.tsx"),
      route("account/close", "routes/app/settings/close.tsx"),
      route("account/invite", "routes/app/settings/invite.tsx"),
      route("account/restricted", "routes/app/settings/restricted.tsx"),

      // A12 · Records and portability
      route("reports", "routes/app/reports.tsx"),
      route("reports/new", "routes/app/report/new.tsx"),
      route("reports/:id", "routes/app/report/detail.tsx"),

      // A13-A16 · Expert mode
      route("expert", "routes/app/expert.tsx"),
      route("expert/notifications/:notificationId?", "routes/app/expert-notifications.tsx"),
      route("expert/support/:supportId?", "routes/app/expert-support.tsx"),
      route("expert/account", "routes/app/expert/account.tsx"),
      route("expert/apply", "routes/app/expert-apply.tsx"),
      route("expert/application", "routes/app/expert/application.tsx"),
      route("expert/invite-patients", "routes/app/expert/invite-patients.tsx"),
      route("expert/add-credential", "routes/app/expert/add-credential.tsx"),
      route("expert/credentials", "routes/app/expert/credentials.tsx"),
      route("expert/renew-licence", "routes/app/expert/renew-licence.tsx"),
      route("expert/availability", "routes/app/expert/availability.tsx"),
      route("expert/payout", "routes/app/expert/payout.tsx"),
      route("expert/payout-history", "routes/app/expert/payout-history.tsx"),
      route("expert/schedule", "routes/app/expert/schedule.tsx"),
      route("expert/requests", "routes/app/expert-cases.tsx"),
      route("expert/consultations", "routes/app/expert/consultations.tsx"),
      route("expert/consultations/:id", "routes/app/expert/workspace.tsx"),
      route("expert/consultations/:id/call", "routes/app/expert/call.tsx"),
      route("expert/guest-examinations", "routes/app/expert/guest-examinations.tsx"),
      route("expert/guest-examinations/:id", "routes/app/expert/guest-examination.tsx"),
      route("expert/payouts", "routes/app/expert-money.tsx"),
      route("expert/payouts/:id", "routes/app/expert/payout-detail.tsx"),
      route("expert/payouts/:id/support", "routes/app/expert/payout-support.tsx"),
      route("*", "routes/app/not-found.tsx"),
    ]),
  ]),

  // ── Web app (Next.js PWA): Back-Office console ──
  route("console/sign-in", "routes/console/auth.tsx"),
  route("console/password", "routes/console/password.tsx"),
  route("console/forgot", "routes/console/forgot.tsx"),

  layout("routes/console/layout.tsx", [
    ...prefix("console", [
      index("routes/console/home.tsx"),
      route("notifications/:notificationId?", "routes/console/notifications.tsx"),
      route("support/:supportId?", "routes/console/support.tsx"),
      route("applications", "routes/console/applications.tsx"),
      route("applications/:id", "routes/console/application-detail.tsx"),
      route("disputes", "routes/console/disputes.tsx"),
      route("disputes/:id", "routes/console/dispute-detail.tsx"),
      route("refunds", "routes/console/refunds.tsx"),
      route("refunds/:id", "routes/console/refund-detail.tsx"),
      route("standing", "routes/console/standing.tsx"),
      route("standing/:id", "routes/console/standing-detail.tsx"),
      route("clinical-safety", "routes/console/clinical-safety.tsx"),
      route("clinical-safety/:id", "routes/console/clinical-safety-detail.tsx"),
      route("staff", "routes/console/staff.tsx"),
      route("profile", "routes/console/profile.tsx"),
      route("*", "routes/console/not-found.tsx"),
    ]),
  ]),

  // ── Web app (Next.js PWA): Provider Portal — Pharmacy ──
  route("pharmacy/sign-in", "routes/pharmacy/sign-in.tsx"),
  route("pharmacy/password", "routes/pharmacy/password.tsx"),
  route("pharmacy/forgot", "routes/pharmacy/forgot.tsx"),
  route("pharmacy/apply", "routes/pharmacy/apply.tsx"),
  layout("routes/pharmacy/layout.tsx", [
    ...prefix("pharmacy", [
      index("routes/pharmacy/home.tsx"),
      route("notifications/:notificationId?", "routes/pharmacy/notifications.tsx"),
      route("support/:supportId?", "routes/pharmacy/support.tsx"),
      route("requests", "routes/pharmacy/requests.tsx"),
      route("requests/:id", "routes/pharmacy/request-detail.tsx"),
      route("payments", "routes/pharmacy/payments.tsx"),
      route("profile", "routes/pharmacy/profile.tsx"),
      route("credentials", "routes/pharmacy/credentials.tsx"),
      route("settings", "routes/pharmacy/settings.tsx"),
      route("renew-licence", "routes/pharmacy/renew-licence.tsx"),
      route("application", "routes/pharmacy/application.tsx"),
      route("*", "routes/pharmacy/not-found.tsx"),
    ]),
  ]),

  // ── Web app (Next.js PWA): Provider Portal — Lab ──
  route("lab/sign-in", "routes/lab/sign-in.tsx"),
  route("lab/password", "routes/lab/password.tsx"),
  route("lab/forgot", "routes/lab/forgot.tsx"),
  route("lab/apply", "routes/lab/apply.tsx"),
  layout("routes/lab/layout.tsx", [
    ...prefix("lab", [
      index("routes/lab/home.tsx"),
      route("notifications/:notificationId?", "routes/lab/notifications.tsx"),
      route("support/:supportId?", "routes/lab/support.tsx"),
      route("requests", "routes/lab/requests.tsx"),
      route("requests/:id", "routes/lab/request-detail.tsx"),
      route("slots", "routes/lab/slots.tsx"),
      route("payments", "routes/lab/payments.tsx"),
      route("profile", "routes/lab/profile.tsx"),
      route("credentials", "routes/lab/credentials.tsx"),
      route("settings", "routes/lab/settings.tsx"),
      route("renew-licence", "routes/lab/renew-licence.tsx"),
      route("application", "routes/lab/application.tsx"),
      route("*", "routes/lab/not-found.tsx"),
    ]),
  ]),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
