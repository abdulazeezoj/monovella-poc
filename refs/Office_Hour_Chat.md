# Monovella Office-Hours Chat

Date: 2026-09-08  
Purpose: Product diagnostic and scope decision record  
Sensitivity: Contains personal names, healthcare-related details, payment amounts, and partner locations at the founder's request. Do not publish or share this file without appropriate consent.

## Product request

Monovella is a connected healthcare coordination platform for patients, specialists, laboratories, and pharmacies. Its principle is continuity of care: a consultation should remain linked to prescriptions, pharmacy fulfilment, lab requests, bookings, payments, results, and notifications.

## Startup context

- Goal: build a startup.
- Stage: pre-product.
- Initial clinical focus: gynecology and GP care.
- Patient is the payer; specialists, laboratories, and pharmacies are supply-side partners.

## Demand evidence shared

The founder described three paid, manually coordinated care journeys:

1. **Cherish** is a Project Manager at **Digital Jewels Limited**. She needed to see a gynecologist, **Dr. Hameedat**, and paid **NGN14,800 (NGN12,000 + NGN2,800)**. She was happy that she did not have to queue at LUTH to wait for a specialist. The founder stated that delay causes her pain and affects her work; seeing a hospital specialist can take a whole day or multiple days and is stressful.
2. **Elijah**, in Lagos, was connected to psychiatrist **Dr. Ope-ewe** and paid **NGN12,000 (NGN10,000 + NGN2,000)**. After the prescription, the founder arranged for someone to get the drugs; Elijah picked them up from that person on his way home from work.
3. **Dabiri** was connected to GP **Dr. Jimoh**. Dr. Jimoh wrote a lab test; the founder contacted **BioLab in Abeokuta**, arranged the test, and brought the result to Dr. Jimoh. Dabiri paid **NGN6,000 for consultation (NGN5,000 + NGN1,000)** and **NGN9,600 for the lab test (NGN8,000 + NGN1,600)**.

Office-hours conclusion: these cases are real evidence that patients pay for trusted coordination. They do not yet prove that a self-serve four-sided marketplace will work, or that supply-side partners will pay.

## Current workaround

The current service runs through WhatsApp and calls:

1. A trusted referrer or patient contacts the coordinator.
2. The coordinator confirms specialist availability and connects the patient to the specialist.
3. The specialist issues a prescription or lab request.
4. The coordinator contacts a partner pharmacy or laboratory, confirms the next action, supports payment, and follows up.
5. For lab work, the coordinator ensures the result reaches the requesting clinician.

The founder's detailed description: they talk to **Habeebat** to identify patients needing a specialist, without necessarily telling the patient that the founder is doing the running. When the patient chats with the founder or Habeebat, the founder confirms whether and when the specialist has a slot and connects the patient and specialist on WhatsApp. After the call, the doctor drops a lab test or prescription. For a test, the founder coordinates with the lab Habeebat knows and books a slot to prevent queuing. For a prescription, the founder searches pharmacies, sends someone to get the drug, and asks whether the patient wants pickup or delivery.

The founder has explained Monovella to the laboratory, pharmacy, and specialist partners. They are willing to onboard when the solution is ready; this is treated as supply-side interest, not yet as proof of provider willingness to pay.

Office-hours conclusion: Monovella should productize this care-navigation workflow rather than begin as a directory or wait for hospital integrations.

## First customer and wedge

**First customer:** a working adult in pain or under time pressure who needs a verified gynecology or GP consultation and cannot lose a workday to hospital queues.

**First offer:** a paid, connected-care journey from specialist booking through the immediate next clinical action. The result-return loop makes laboratory completion the strongest clinical proof point; basic pharmacy fulfilment remains in the first product scope.

## Product decisions

1. Build the **functional connected-care vertical slice**.
2. Support all four operating roles: patient, specialist, laboratory, and pharmacy.
3. Keep the first release simple: curated partners, manual verification, partner-entered availability, basic search and payments, explicit statuses, and linked records.
4. Use one canonical **Care Journey** for every consultation and all related clinical and fulfilment actions.
5. Defer real-time inventory, delivery-fleet dispatch, hospital/LIS/EHR integrations, advanced matching, and clinical triage.
6. Require verification before a specialist, laboratory, or pharmacy can serve patients. Specialists may only offer and price approved specialties.
7. Before live clinical use, define consent, role-based access, auditability, payment ownership/refunds, and applicable Nigerian legal and healthcare obligations.

## Proposed functional flows

### Patient

- Receive a unique Monovella ID.
- Find verified gynecology or GP specialists, book and pay for consultations.
- Receive a prescription or lab request linked to the consultation.
- Search pharmacies by medication, location, or name; view partner-provided availability, price, hours, and pickup/delivery options; pay and track fulfilment.
- Search labs by requested test, location, or name; view slots and prices; book and pay; view the uploaded result in the same journey.

### Specialist

- Upload credentials and specialty evidence for verification.
- Manage verified-specialty pricing, availability, capacity, notes, and attachments.
- Issue prescriptions and lab requests.
- Receive and review results for tests they requested.

### Laboratory

- Verify organisation credentials.
- Manage tests, pricing, slots, capacity, and availability.
- Process bookings and upload results linked to the original request.

### Pharmacy

- Verify organisation credentials.
- Manage hours, pickup/delivery support, and order acceptance.
- Confirm medication availability and price; fulfil pickup or delivery orders.

## Success measures agreed

- Run five paid, concierge-assisted care journeys.
- At least three reach fulfilled prescription or completed lab test without patients chasing providers by phone.
- In each completed lab case, the patient and requesting specialist receive the result in the same journey.
- Measure slot-confirmation time, next-action completion rate, payment conversion, handoff time, and manual coordinator interventions.
- Capture one observed surprise from each actor type before expanding scope.

## Assignment

Run five concierge lab-first care journeys with a simple internal care-journey checklist. Record every handoff, owner, timestamp, payment, manual intervention, and whether the requesting clinician reviewed the result.

## Approved design

The approved design is available at:

- `docs/designs/monovella-connected-care-vertical-slice.md`
