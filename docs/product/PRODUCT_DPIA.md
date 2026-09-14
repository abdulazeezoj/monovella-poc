# Monovella Data Protection Impact Assessment

This DPIA assesses the processing Monovella is built to run once CAC
business registration, NDPC compliance registration, and clinical
governance sign-off are complete. None are complete yet (see
[`PRODUCT_SPEC.md`](PRODUCT_SPEC.md)).

**Controller:** Monovella Technologies Limited (RC2349780)

**Privacy contact:** dpo@monovella.com

**Jurisdiction:** Federal Republic of Nigeria

**Framework:** Nigeria Data Protection Act 2023 (NDPA) and the Nigeria Data
Protection Commission's General Application and Implementation Directive 2025
(GAID)

**Assessment date:** 2026-09-11

**Assessment scope:** Monovella's open-sign-up Care Journey service,
including public browsing of verified provider profiles before sign-up, with
real consultations, payments, prescriptions, laboratory requests, pharmacy
orders, and laboratory results

## 1. Purpose and decision

Monovella processes health information, a sensitive category of personal data,
and links it to identifiable patients, providers, communications, and payment
records. A DPIA is therefore necessary to document the processing, test whether
it is necessary and proportionate, identify high-impact failure modes, and
record the controls and evidence used to reduce them.

The product decision is to operate only the bounded workflow assessed here.
Monovella publishes a public directory of verified provider profiles, browsable
without an account, so a specialist, laboratory, or pharmacy can be found or
shared before a patient signs up. Monovella does not provide clinical triage,
diagnose a patient's concern, expose any patient's identity or clinical data to
that directory, or authorize general provider access to clinical records.
Materially broader processing requires a fresh DPIA review.

## 2. Processing description

### 2.1 People and scale

- Any visitor, signed in or not, who browses the public provider directory or
  opens a shared provider profile link.
- Adult patients in Nigeria who receive the sign-up link. Sign-up
  is open to anyone with the link; there is no invitation or allowlist check.
- Pre-verified specialists, laboratories, pharmacies, and narrowly authorized
  Monovella operations personnel.
- Distribution remains open while a server-side capacity switch pauses new
  patient sign-ups or new journeys when the approved operating limit is
  reached.

Patients may be in pain or under time pressure. Consent is consequently short,
layered, separately affirmative for health data, and available before account
creation without losing entered form data.

### 2.2 Purposes

1. Create and secure patient and provider accounts and record consent.
2. Make a reviewed, non-diagnostic current-launch GP or gynecology match from
   a concern the patient chooses to provide, then evaluate whether the
   specialty, routing policy, and provider offering are active.
3. Coordinate consultation, Care Plan, laboratory, pharmacy, referral, and
   follow-up activity in one Care Journey.
4. Process and reconcile real Nomba payments without Monovella receiving card
   or bank credentials.
5. Provide an in-app consultation through LiveKit and let the patient share a
   short note or private image/PDF only while that call is live. Monovella does
   not provide standalone or asynchronous chat.
6. Return a real laboratory result to the patient and requesting specialist and
   track acknowledgment of a lab-classified critical result.
7. Secure the service, investigate incidents, and maintain an accountability
   record of consent, clinical access, and material state changes.
8. Detect a payment, booking, or handoff that can't complete on its own, and
   either recover it automatically or raise it as an Alert for the
   operations owner to resolve.

### 2.3 Data and lawful basis

| Category | Examples | Basis used |
|---|---|---|
| Identity/contact | Name, birth date, verified email address, Monovella ID | Consent and contract performance |
| Consent/accountability | Notice version, scope, time, withdrawal, audit event | Consent and legal obligation |
| Journey/booking | Provider, service, time, status, next action | Contract performance |
| Discovery locality | Optional patient-selected city, LGA, or district code and provider locality code | Consent and contract performance for explainable proximity ordering |
| Payment | Nomba reference, amount, currency, verification/refund state | Contract performance and applicable recordkeeping obligation |
| Health information | Concern, SOAP note and original captures, Care Plan, lab request, prescription, pharmacy order, result | Separate explicit consent and the applicable medical-care condition for sensitive personal data |
| Provider records | Organization, credentials, provider-specialty offering, fee/currency, availability/activation state, routing-policy version, operations owner, payout destination | Contract performance and legitimate interests in verification and safe operation |
| Consultation context/security | Patient-shared live-call note or image/PDF, notification delivery state, IP/device/security logs | Separate explicit health-information consent, contract performance, and legitimate interests in reliable and secure operation |

No solely automated match makes a diagnosis or a decision with legal or
similarly significant effect. A versioned, clinically reviewed fixed-rule
safety intercept checks explicit allow-listed terms, phrases, and tags before
matching; it records the rule but assigns no urgency score. A rule match exits
to approved safety/support copy, and ambiguity or ruleset failure fails closed
to support. Only cleared input reaches the separate GP/gynecology map, then the
server evaluates specialty activation, reviewed routing policy, and active
provider offering before explaining a non-diagnostic result and leaving
selection to the patient.

### 2.4 Recipients and access boundaries

- An unauthenticated visitor sees only a verified provider's own
  admin-approved public profile fields (name, specialty, and
  provider-submitted public content); no patient data, credential
  documents, or payout details are exposed.
- An assigned specialist sees the current consultation and, while assigned to
  the patient, prior consultation notes needed for continuity of care.
- An assigned laboratory sees the lab request, booking, and result it produces;
  it does not see SOAP notes.
- A selected pharmacy sees the documented prescription and the minimum contact
  or delivery data needed to confirm and fulfil the order; it does not see SOAP
  notes or unrelated results.
- Monovella operations sees status, deadlines, delivery, and alert metadata
  by default. Exceptional clinical-content access is specifically authorized,
  time-limited, and audited.
- LiveKit provides the call; Nomba processes payment; ZeptoMail sends the
  MVP's content-minimized identity and service notices. Termii is not used for
  patient identity until its approved sender ID is available. Hosting/security
  processors act only on documented instructions and under the processor register.

## 3. Data flow

1. A visitor may browse the public provider directory or open a shared
   profile link before any account exists; only the provider's own
   admin-approved profile fields render, with standard technical/security
   logging.
2. Patient submits identity and two separate consents; the account and both
   consent grants are committed together.
3. Patient provides a concern, selects a verified active provider-specialty
   offering and available slot, and pays through Nomba; a verified server event
   confirms the booking.
4. The patient and specialist join an assigned LiveKit room. While its call
   session is live, the patient may share a short note or private image/PDF.
   PostgreSQL records the consultation-linked item; Redis is not involved.
5. The specialist retains original SOAP captures alongside any editable
   transcription and sends a plain-language Care Plan or a documented
   no-further-action completion summary.
6. A lab request can lead to a paid booking and a private result draft. Release
   requires content, checksum, malware, assignment, and status checks.
7. A prescription can lead to a pharmacy submission. The pharmacy confirms
   availability and a time-limited final price before the patient chooses
   pickup/delivery and pays.
8. Authorized actors read one server-composed Care Journey view. Every clinical
   read re-evaluates assignment and consent and creates an audit event.

## 4. Necessity, proportionality, and retention

Each data category in § 2.3 supports a named purpose. Government ID, home
address, precise GPS location, emergency contact, broad demographic profiling,
advertising analytics, and general provider access are excluded. Discovery may
retain only a patient-selected canonical city/LGA/district code, which is
cleared within 90 days of specialist selection or the last discovery activity.
A delivery address is collected only when a patient chooses delivery.

The operating retention schedule is maintained in `PRODUCT_PRIVACY.md`: 30 days
for abandoned sign-up data; no more than 90 days for the optional discovery
locality code; seven years for the Care Journey clinical/account record,
payment record, and material audit trail; and 90 days for routine technical
logs unless an active investigation requires a limited hold. At
expiry, records are deleted or irreversibly anonymized unless a documented legal
hold, dispute, complaint, or safety incident applies. Nigerian health-data
counsel must confirm the seven-year policy during sign-off; it is an operating
choice, not presented as a statute-prescribed period.

## 5. Risk assessment and controls

Likelihood is the residual likelihood when the named operating control is
verified. A missing or failed control reopens the risk and triggers the pause
rule in § 7.

| Risk | Impact | Residual likelihood | Required operating control and evidence |
|---|---|---|---|
| Unauthorized access to another patient's clinical data | High | Low | Journey-scoped server authorization on every read/write; revoked-consent and cross-patient denial tests; clinical-access audit sample |
| Private clinical file becomes public, malicious, or linked to the wrong journey | High | Low | Private storage, opaque keys, short-lived access, MIME/content/size/checksum checks, malware scan, and release preconditions; file-safety test report |
| Consent is bundled, unclear, or not genuinely informed | High | Medium | Separate unticked health consent, version/scope/time record, accessible notice, emergency exit, withdrawal path, and comprehension observation |
| Critical result is delayed or not acknowledged | High | Low | Lab classification, five-minute notification target, 15-minute acknowledgment deadline/fallback, 30-minute operations follow-up, retry evidence, and named contact |
| Notification exposes clinical detail | High | Low | Allow-listed templates with no diagnosis, test, result, prescription, or attachment; template review and delivery-payload test |
| A provider's public profile or the directory shows more than approved | Medium | Low | Public profile renders only provider-submitted, admin-approved fields; credential documents and payout details never render publicly; publish-time review and a profile-content test |
| Payment is falsely confirmed, duplicated, or arrives after expiry | Medium | Low | Signed webhook plus verification call, idempotency, immutable evidence, and an automatic Nomba-triggered refund or rebooking path, raised to the operations owner as an Alert when it can't self-resolve; payment contract tests |
| Pharmacy charge occurs before stock/final price confirmation | Medium | Low | Submitted → confirmed → awaiting payment → paid state machine, expiring quote, and server rejection of payment against an expired confirmation |
| Audit trail is incomplete or altered | Medium | Low | Append-only application role, separate migration role, event correlation IDs, and periodic integrity check |
| Data is retained indefinitely or deleted while still needed | Medium | Low | Category schedule, deletion job/report, backup rotation, and documented holds |
| Processor handles data outside Monovella's instructions or approved transfer safeguards | High | Medium until agreements are verified | Processor register, terms/DPA review, documented location/transfer assessment, least-data configuration, and termination/deletion terms |
| Sign-up link spreads beyond operating capacity | Medium | Low | No false capacity promise; server-side sign-up/new-journey pause switch, active-journey ceiling, verified-partner capacity, and support route |

## 6. Processor and transfer record

The operations owner maintains a register for Nomba, LiveKit, ZeptoMail,
Termii, hosting, object storage, and any security vendor, including purpose,
data categories, hosting/processing location, transfer safeguard, agreement,
sub-processors, security review, and deletion/return terms.

Nomba's public merchant terms are not treated as proof of a dedicated data
processing agreement. Requesting and executing a DPA or equivalent processor
addendum remains outstanding; the data-protection reviewer records whether the
executed merchant terms and addendum satisfy the NDPA/GAID before closing it.

## 7. Operating verification and pause rule

The named owner records evidence for the following before relying on a
control and after every material release:

- unauthorized, revoked-consent, and cross-patient access tests pass;
- clinical files are private and file-validation/release tests pass;
- payment success, failure, duplicate, expiry, and late-confirmation tests pass;
- critical-result delivery, retry, fallback, and acknowledgment tests pass;
- pharmacy confirmation-before-payment and expiry tests pass;
- consent versions, processor register, retention job, and incident contacts are
  current; and
- each live provider remains credential- and payout-verified.
- each live specialist offering has an active reviewed routing policy and
  operations activation; a paused offering retains confirmed care, while a
  safety stop records idempotent recovery and fresh approval before reopening.

If a required control fails, Monovella pauses the affected capability or new
journeys, preserves existing records and safe patient access, assigns an owner,
and records remediation and re-test evidence. This is a rollback/control action,
not silent deletion or abandonment of an active patient's care.

## 8. Review triggers

Review this DPIA when any of the following occurs: a new data category or
processor; a new specialty or clinical workflow; a material access, retention,
notification, payment, or AI/matching change; a security incident; expansion
beyond the approved capacity; or 12 months after the last sign-off.

## Sources

- [Product spec](PRODUCT_SPEC.md)
- [Product technology](PRODUCT_TECH.md)
- [Consent copy](PRODUCT_CONSENT.md)
- [Privacy notice](PRODUCT_PRIVACY.md)
- [NDPC resources](https://www.ndpc.gov.ng/resources/)
- [NDPC GAID 2025 schedules](https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf)
