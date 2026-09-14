# Monovella Product Technology

The technology Monovella is built on, and why. This should still hold true
even as the implementation evolves; for how the pieces are wired together
today, read the codebase, not this document.

## Non-Negotiable

Monovella is a modular monolith. No frontend route, Redis key, object
store, or payment callback is authoritative for clinical access, booking
capacity, payment status, or workflow state. PostgreSQL owns every
decision.

## Stack

| Concern | Chosen service | Why |
| --- | --- | --- |
| Web experience | React Router, shadcn/ui (Base UI), TanStack Form with Zod, TanStack Table | Mobile-first, responsive; the server stays authoritative for every workflow decision. Forms validate with Zod through TanStack Form, and a genuinely tabular view uses TanStack Table; neither replaces the server's own validation or state authority. |
| Auth and application API | FastAPI | One backend owns every role's identity, sessions, and clinical commands. |
| System of record | PostgreSQL | Clinical access, consent, capacity, payment, and state transitions live here. Nothing else is authoritative. |
| Cache | Redis | Rate limits and public discovery cache only. Never clinical truth or consultation content. |
| Private files | RustFS | S3-compatible private storage behind server authorization. The app stores no public URL. |
| Consultation | LiveKit Cloud | Managed video and voice. Current call volume doesn't justify running our own SFU. |
| Payments | Nomba Checkout | Server-verified payment split to each provider's own Nomba sub-account under Monovella's Nomba merchant account. Monovella never touches card or bank credentials, and settlement sits with Nomba, not a Monovella-run wallet, but the sub-account structure is what lets Monovella trigger a refund on its own instead of depending on the provider. |
| Email and SMS | ZeptoMail and Termii | Notices carrying no diagnosis, result, prescription, or attachment content. |

## Sources

- [Product spec](PRODUCT_SPEC.md)
