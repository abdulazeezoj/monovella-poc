# Monovella Privacy Notice

This notice describes the controls Monovella applies once CAC business
registration, NDPC (Nigeria Data Protection Commission) compliance
registration under the NDPA, and clinical governance sign-off are
complete. None are complete yet (see [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md)).

**Monovella Technologies Limited** (RC2349780) ("**Monovella**," "**we**,")
is the controller responsible for the personal data described in this notice.

**Jurisdiction:** Federal Republic of Nigeria

**Effective:** 2026-09-11

**Contact:** dpo@monovella.com

This notice applies to Monovella's open-sign-up service and
is written for the Nigeria Data Protection Act 2023 (NDPA) and the Nigeria Data
Protection Commission's General Application and Implementation Directive 2025
(GAID).

## 1. What Monovella does

Monovella coordinates a patient's specialist consultation and the next actions
that follow it (a laboratory booking, prescription-based pharmacy order,
referral, follow-up, instruction, or document) inside one Care Journey. Anyone
with the sign-up link can create an account. The link may be forwarded;
Monovella limits exposure through partner verification and operating-capacity
controls, not an invitation or allowlist.

Consultations, payments, prescriptions, laboratory requests, pharmacy orders,
and laboratory results are real. Dummy clinical data is used only
in internal development and rehearsal environments and is not shown as a real
patient's record.

## 2. What we collect and why

| Category | Examples | Purpose and lawful basis |
|---|---|---|
| Identity and contact | Full legal name, date of birth, verified email address, Monovella ID | Create and secure the account, confirm adult eligibility, and identify the patient; consent and contract performance |
| Consent records | Notice/consent version, scope, time, and withdrawal | Demonstrate the patient's choices and comply with recordkeeping obligations; consent and legal obligation |
| Care Journey data | Assigned providers, bookings, appointment times, status, and next actions | Coordinate the service requested by the patient; contract performance |
| Discovery locality | Optional city, LGA, or district code selected by the patient | Offer explainable coarse proximity ordering; consent and contract performance |
| Payment records | Nomba order/transaction reference, amount, currency, and payment status | Confirm bookings and reconcile payments; contract performance and applicable financial recordkeeping obligations |
| Health information | Concern used for non-diagnostic matching, consultation notes and original captures, Care Plan, lab request, prescription record, pharmacy order, and lab result | Provide and coordinate care; separate explicit consent and the applicable medical-care condition for sensitive personal data |
| Provider information | Organization, credentials, provider-specialty offering, fee/currency, availability/activation state, routing-policy version, operations owner, and Nomba payout destination | Verify providers, publish eligible services, coordinate bookings, recover safely from a pause/stop, and pay the selected provider; contract performance and legitimate interests in safe operations |
| Consultation context and communications | A short note or private image/PDF the patient chooses to share during a live consultation, plus delivery/acknowledgment status for approved notifications | Support and document the consultation and deliver Care Journey notices; separate explicit health-information consent, contract performance, and legitimate interests in reliable operations |
| Technical and security data | Device/browser data, IP address, login and security logs, event identifiers | Secure the service, prevent misuse, diagnose failures, and maintain an audit trail; legitimate interests and legal obligation where applicable |

Monovella does not receive or store the card or bank credentials a patient enters
into Nomba Checkout. Monovella does not require a government
ID, home address, precise GPS location, or emergency contact at patient sign-up.
For optional proximity ordering, Monovella records only the canonical code of
the city, LGA, or district the patient selects. A pharmacy receives a
delivery address only when delivery is selected and only to fulfil that order.

## 3. How health information is used

Health information is sensitive personal data. Monovella asks for a separate,
affirmative health-information consent at sign-up and records the version and
scope of that consent.

- A concern first passes through a clinically reviewed fixed-rule safety
  intercept. It records the ruleset and matched rule, assigns no urgency score,
  and either shows approved support/emergency copy or allows the separate
  non-diagnostic current-launch GP/gynecology match, then the server confirms
  that the specialty, routing policy, and provider offering are active. It is
  not diagnosis, triage, or a guarantee of suitability.
- The specialist assigned to a consultation can create and read its clinical
  record. A later Monovella specialist assigned to the same patient may read
  prior consultation notes for continuity of care. A specialist with no
  assignment to that patient cannot browse or open those notes.
- The assigned laboratory receives only the request and booking information it
  needs and can access the result it produces. It does not receive SOAP notes.
- A selected pharmacy receives the documented prescription and the minimum
  contact or delivery information needed to confirm and fulfil the order. It
  does not receive SOAP notes, unrelated results, or other Care Plan items.
- A documented prescription or lab request in Monovella records what the
  specialist ordered. The specialist's separately signed prescription or lab
  form remains the instrument on which the pharmacy or laboratory acts.
- Monovella operations personnel see workflow metadata by default, not clinical
  content. Any exceptional support access must be necessary, specifically
  authorized, time-limited, and audited.

## 4. Who receives data

Monovella shares only the minimum necessary data with:

- any visitor, for a specialist, laboratory, or pharmacy's own
  admin-approved public profile fields; never a patient's data;
- the assigned specialist, laboratory, or selected pharmacy, within the scope
  above;
- LiveKit, to provide the in-app consultation;
- Nomba, to process and verify payment and allocate the provider's share;
- ZeptoMail, to send the MVP's account-verification and password-reset email,
  plus approved email notices that direct the recipient back to the
  authenticated app and contain no clinical detail or attachment. Termii SMS
  is not used for patient identity until its approved sender ID is available; and
- service providers that host or secure Monovella under documented processing
  instructions and confidentiality safeguards.

Monovella does not sell personal data. The public provider directory shows
only a provider's own admin-approved profile fields; it never carries a
patient's identity or clinical information. The Nomba merchant terms and
processor arrangement are recorded in Monovella's processor register. Any
additional processor agreement or addendum identified during
legal/compliance review is tracked there as an open action; Monovella does
not describe an outstanding agreement as executed or professionally
approved.

## 5. How long we keep data

Monovella uses the following retention schedule. These periods are Monovella's
operating policy, not a claim that Nigerian law prescribes each exact period,
and are subject to confirmation by Nigerian health-data counsel.

| Data | Retention period |
|---|---|
| Incomplete sign-up data with no account | 30 days from the last activity |
| Optional coarse discovery-locality code | No more than 90 days after specialist selection or the last discovery activity; the non-location matching/audit record remains under its applicable schedule |
| Account, identity, consent, Care Journey, consultation, Care Plan, prescription, lab request/result, pharmacy-order, and clinical attachment records | 7 years after the last Care Journey closes |
| Payment, refund, reconciliation, and provider-payout records | 7 years after the transaction |
| Clinical-access and material state-change audit events | 7 years after the related Care Journey closes |
| Routine application, delivery, and security logs not incorporated into an audit record | 90 days, unless retained longer for an active security investigation |

When a period ends, Monovella deletes or irreversibly anonymizes the data unless
a legal hold, unresolved complaint, payment dispute, safety incident, or other
applicable obligation requires a limited extension. Backups expire on their
normal rotation after deletion from active systems. A withdrawal or deletion
request is applied to data that is no longer necessary, while records that must
be retained are restricted to the required purpose.

## 6. Your choices and rights

You may ask Monovella to provide a copy of your data, correct inaccurate data,
delete data that no longer has to be kept, restrict processing, object where
processing relies on legitimate interests, or provide portable data where the
right applies. You may withdraw consent at any time; withdrawal stops future
consent-based processing but does not invalidate processing already completed.

Contact **dpo@monovella.com**. Monovella verifies the requester's identity and
responds within the period required by applicable law. You may also complain to
the Nigeria Data Protection Commission.

## 7. Security

Monovella uses journey-scoped authorization, private file storage, short-lived
file access, encrypted transport, attachment content checks and malware
scanning, restricted audit records, and notifications that exclude diagnosis,
test, result, prescription, and attachment content. Access is re-evaluated when
consent or a provider assignment changes. The named owner records
implementation and test evidence for these controls in the DPIA evidence
register before relying on them and after every material release.

## 8. A personal-data breach

Monovella records and investigates suspected personal-data breaches. Where the
NDPA threshold is met, Monovella notifies the NDPC within 72 hours after becoming
aware of the breach. Where a breach is likely to create a high risk to an
individual, Monovella also informs the affected individual promptly with clear
protective steps.

## 9. Changes and contact

If a material change affects the purpose, recipient, or scope of health-data
processing, Monovella updates this notice and obtains fresh consent where
required. Questions, rights requests, and privacy complaints:
**dpo@monovella.com**. General support: **contact@monovella.com**.

## Sources

- [Product spec](PRODUCT_SPEC.md)
- [Consent copy](PRODUCT_CONSENT.md)
- [Data Protection Impact Assessment](PRODUCT_DPIA.md)
- [NDPC resources](https://www.ndpc.gov.ng/resources/)
