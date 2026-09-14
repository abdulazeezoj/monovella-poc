# Customer Journey

## Scope

This is the self-service journey for a working adult seeking GP or gynecology care. The laboratory-result loop is the primary validation path. Pharmacy fulfilment is used only when a verified partner and the approved capability gate permit it.

| Stage | Patient action | Monovella responsibility | Owner of next action | Success signal | Failure recovery |
|---|---|---|---|---|---|
| 1. Need and entry | Opens Monovella and signs up with a verified phone number | Explain service and health-information consent in plain language | Patient | Valid consent and verified account | Preserve input, request a new code, or show a support route |
| 2. Find care | Describes a concern or selects an approved tag, then compares verified specialists | Run the fixed safety intercept, show only approved specialist options, disclosed fee, and available slots | Patient | Patient selects a specialist and slot | Route unclear or unsafe cases to approved support without diagnosis |
| 3. Book and pay | Selects a slot and completes Nomba checkout | Hold capacity, verify the transaction server-side, apply the disclosed platform commission, and store payment evidence | Monovella payment command | Confirmed booking after payment verification | Preserve payment evidence and create a rebooking or refund exception if the hold expired |
| 4. Consultation | Meets the assigned specialist in the in-app consultation; may share a short note or image/PDF while the call is live | Restrict the room and shared context to the assigned consultation | Specialist | Structured note and Care Plan completed | Offer WhatsApp only as a documented fallback if the in-app call cannot connect |
| 5. Next action | Reviews a lab request, prescription, referral, or follow-up in the Care Journey | Show one patient-readable next action, owner, timing, and safe recovery action | Specialist, laboratory, pharmacy, or patient | Next action accepted by its accountable partner | Show a delay or block clearly and create a deadline-bound exception |
| 6. Laboratory loop | Selects a verified laboratory slot and completes the requested test | Link the request, booking, payment evidence, and result to the same journey | Laboratory | Result released to the patient and requesting specialist | Escalate delayed booking or result; use non-diagnostic patient copy for critical results |
| 7. Pharmacy loop, where enabled | Chooses a verified pharmacy after it confirms availability, final price, and fulfilment method | Expose the minimum prescription and fulfilment context only after confirmation | Pharmacy | Paid order progresses to pickup, delivery, or fulfilment | Do not create checkout from an unconfirmed order; retain evidence and route refund or reselection to support |
| 8. Follow-up | Reviews the Care Plan and completed result or fulfilment status | Keep the patient-owned record linked for authorised future care | Patient and specialist | Patient understands the next step and specialist can review the released result | Make ownership, deadline, and support route explicit for unresolved items |

## Measurement Plan

Record every handoff, owner, timestamp, payment attempt, self-service checkout, support intervention, and result-review outcome. The first live self-service consultations should measure completion rate, slot-confirmation time, payment conversion, result-return reliability, and handoff time before the team scales acquisition volume.

## Sources

- [Product flow](../product/PRODUCT_FLOW.md)
- [Product specification](../product/PRODUCT_SPEC.md)
- [CEO review record](../../refs/CEO_Review_Chat.md)
