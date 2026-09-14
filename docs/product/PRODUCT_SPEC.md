# Monovella Product Spec

This is the authoritative product definition for market launch. Product,
engineering, legal, and delivery work all implement what's here. Launch is
gated by CAC business registration, NDPC compliance registration, and
clinical governance sign-off. None are complete yet, and none should ever
be described as complete before they are.

## Problem

Specialist care in Nigeria is fragmented across referrals, consultations,
laboratories, and result return. Today a trusted coordinator bridges this
manually over WhatsApp and phone calls: checking a specialist's slot,
relaying a lab request or prescription to a partner, arranging payment and
collection, and following up until the result reaches the clinician who
asked for it. It works, but it costs the patient time and certainty, and
can leave the requesting specialist without the result they need.

Evidence of demand so far: three patients have paid for exactly this kind
of manually coordinated care, including a working project manager who paid
to avoid losing a full day to hospital queues, and a lab-request case that
needed manual coordination end to end. Specialists interviewed separately
asked for a shareable profile they could hand to their own existing
patients. This proves demand for managed coordination on both sides. It
does not yet prove demand for a self-serve marketplace or provider
willingness to pay.

Monovella's bet: give a working patient one traceable Care Journey from a
verified specialist consultation to a completed lab result, shared with
the requesting specialist, without the patient chasing every handoff
themselves.

## Who It's For

The first user is a working adult in Nigeria who needs verified gynecology
or GP care, is in pain or under time pressure, and can't afford to lose a
workday to queues and follow-up. The pain recurs at every handoff after
the consultation: booking a lab, filling a prescription, and getting the
result back to both the patient and the specialist.

Everyone with a role in a Care Journey:

- **Patient**: browses providers, signs up, books, pays, orders from a
  pharmacy, and follows their Care Journey.
- **Medical specialist**: runs their own availability, holds the
  consultation, and documents it with a note, a Care Plan, any lab
  request, and any prescription. Their verified profile is public and
  shareable with their own patients.
- **Laboratory**: runs its own availability, receives bookings, and
  releases the patient's real result, classified routine or critical.
- **Pharmacy**: confirms availability and a final price before payment,
  then fulfills the order.
- **Platform admin**: verifies a specialist, laboratory, or pharmacy's
  credentials and payout account before they can be booked or paid, and,
  as the operations owner, resolves any Alert the system can't
  recover automatically.

General Practice and Gynecology are the only active specialties at launch,
out of a longer target list (urology, dietetics, physiotherapy,
dermatology). A further specialty goes live only once its routing policy,
operations activation, and a provider's verified offering are all active.

## What Monovella Does

Anyone can browse verified specialists, laboratories, and pharmacies, or
open a provider's own shared profile link, with no account needed. Signing
up is required only to book, pay, or message a provider.

A specialist, laboratory, or pharmacy signs up, gets verified
off-platform, and connects a payout account before it can be booked or
paid.

A patient signs up directly, verifies identity, and consents. A
non-diagnostic safety check runs on their stated concern before they see
any specialist. They pick a verified specialist and slot, pay through
Nomba Checkout, and the booking confirms only once Monovella verifies the
payment server-side.

The consultation happens inside Monovella over LiveKit. The patient may
share one note or image during the live call; if the call can't connect,
Monovella shows a WhatsApp fallback. The specialist documents the visit
and sends a Care Plan: any lab request, prescription, referral, follow-up,
instruction, or document the patient should act on next.

A lab request leads to a paid laboratory booking and, once safety checks
pass, a released result the patient and specialist both see. A
prescription leads to a pharmacy order: the pharmacy confirms availability
and price before the patient pays, then fulfills it.

## Must-Haves

A feature is a must-have only when the patient can't complete the
consultation-to-next-action loop without it. Acceptance-criteria
detail belongs in tests, not here.

1. **Direct self-service admission and consent.** Any patient signs up
   directly, with explicit, separate consent for service and
   health-information processing before the account works.
2. **Verified specialist booking with real payment.** Patients see only
   verified, active offerings, hold a slot, and pay through Nomba Checkout
   before a consultation confirms.
3. **Linked specialist request and paid laboratory booking.** A lab
   request stays linked to its consultation and Care Journey; the patient
   books and pays for a verified laboratory slot against it.
4. **Secure result release and shared Care Journey workspace.** A
   laboratory releases the real result only after safety checks pass; the
   patient and requesting specialist each see only their permitted view.
5. **Critical-result acknowledgment and safe notification.** A
   lab-classified critical result triggers a tracked, tiered
   acknowledgment workflow. Everything else routine stays a manual
   handoff for now.
6. **Specialist and laboratory self-service accounts.** They sign up,
   become discoverable only after off-platform verification, manage their
   own availability, and (specialist) document each consultation.
7. **Pharmacy self-service accounts and fulfillment.** Pharmacies sign
   up, confirm availability and a final price before the patient pays,
   then fulfill the order.
8. **In-app consultation and patient-shared context.** The call happens
   inside Monovella. During a live call the patient may share one note or
   image. There is no standalone or asynchronous chat.
9. **Care Plan.** A specialist finalizes every consultation with one
   patient-visible outcome: a Care Plan of recommended actions, or an
   explicit no-further-action summary.
10. **Alerts and automatic recovery.** When a payment, booking, or
    handoff can't complete on its own (a payment lands after a hold
    expires, a provider can't fulfil after payment), Monovella either
    recovers automatically (a Nomba-triggered refund or a rebooking
    prompt) or raises it as an Alert: a notification to the
    operations owner and an item in their Alerts queue until it's
    resolved.

## Scope

Launch is the consultation-to-next-action loop above, with real clinical
records, real Nomba payments, and pre-verified partners. The ten
must-haves are the complete scope. Live operation begins only once CAC
registration, NDPC compliance registration, and clinical governance
sign-off all clear.

Out of scope for now:

- A wallet, balance, or commission ledger Monovella runs itself. Every
  provider still gets paid through Nomba's own settlement, and a refund
  goes straight back to the patient through Nomba without the provider
  having to act.
- A self-serve provider credential application with automatic or no admin
  review. A provider submits credentials; the platform admin manually
  reviews them and approves or rejects with a reason on their own
  dashboard. That review action is in scope.
- Treating a documented lab order or prescription as the legal
  instrument.
- Native mobile apps.
- EHR, LIS, or insurance integrations.
- Clinical triage or automated result interpretation.
- Dependant or guardian-managed accounts.
- A specialist-or-lab accept-or-decline step on a booking. A booking
  already confirms on verified payment.

A plain referral to another specialist is in scope; a guest-examination or
multi-specialist feature is not.

## Risks

- **Real money and health data move once live.** Consent, privacy,
  retention, and DPIA documents define the controls. Don't claim any
  launch gate is complete before it is.
- **A partner has no verified payout account.** Block its bookings and
  orders until the payout destination is verified.
- **A verified payment arrives after its slot hold expires.**
  Automatically refund through Nomba or prompt rebooking; preserve the
  evidence either way. Never reclaim another patient's slot.
- **A provider's public profile shows more than they expect.** Show only
  what they submitted and approved for public display; credential and
  payout details never appear.
- **A file could be released unsafely.** Require private storage,
  content checks, checksum validation, and malware scanning before
  release.
- **A critical result goes unacknowledged.** Keep live result release
  gated on the acknowledgment workflow and a partner-approved fallback.
- **A specialist runs multiple offerings, or one gets paused.**
  Evaluate the offering at every discovery, hold, booking, and referral
  step; serialize one clinician's capacity across all of them.

## Sources

- [Product technology](PRODUCT_TECH.md)
- [Consent](PRODUCT_CONSENT.md)
- [Privacy notice](PRODUCT_PRIVACY.md)
- [Data Protection Impact Assessment](PRODUCT_DPIA.md)
