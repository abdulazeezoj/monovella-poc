# Product

<!-- impeccable:product-schema 1 -->

> **This file is a compliance shim, not a source of truth.** The Impeccable
> design skill requires a root `PRODUCT.md` to exist before it will do design
> work. Monovella's actual, actively maintained product definition lives in
> [`docs/product/PRODUCT_SPEC.md`](docs/product/PRODUCT_SPEC.md) (problem,
> users, scope, must-haves), [`docs/product/PRODUCT_TECH.md`](docs/product/PRODUCT_TECH.md)
> (stack and technical non-negotiables), and the consent/privacy/DPIA
> companions in `docs/product/`. Read those first; this file only carries
> enough of a summary to satisfy Impeccable's schema, and should stay short
> rather than duplicating them. If a fact here starts to contradict those
> docs, fix it here or delete the line; never let this file compete with them.

## Platform

web

## Users

Patients, medical specialists, laboratories, pharmacies, and a platform admin
in Nigeria. Full detail: "Who It's For" in PRODUCT_SPEC.md.

## Product Purpose

One traceable Care Journey from a verified specialist consultation to a
completed lab result, without the patient chasing every handoff themselves.
Full detail: "Problem" and "What Monovella Does" in PRODUCT_SPEC.md.

## Positioning

Real clinical records, real Nomba payments, and pre-verified partners in one
connected workflow, replacing the manual WhatsApp/phone coordination patients
rely on today. Full detail: PRODUCT_SPEC.md.

## Operating Context

General Practice and Gynecology are the only active specialties at launch.
Consultation happens over LiveKit, payment through Nomba Checkout, and lab
and pharmacy handoffs are tracked inside one Care Journey. Full detail: the
Must-Haves and Scope sections of PRODUCT_SPEC.md.

## Capabilities and Constraints

The ten launch must-haves and out-of-scope list are PRODUCT_SPEC.md's
"Must-Haves" and "Scope" sections. Stack choices and non-negotiables
(PostgreSQL as the sole authority for clinical/workflow state) are
PRODUCT_TECH.md. Do not restate either here; they change independently of
this file.

## Brand Commitments

Name meaning, logo/icon usage, and palette: `docs/brand-assets/README.md`.
Full visual identity: `DESIGN.md`.

## Evidence on Hand

See "Problem" in PRODUCT_SPEC.md for the demand evidence on hand and what it
does and doesn't prove.

## Product Principles

See PRODUCT_SPEC.md and PRODUCT_TECH.md. Not restated here.

## Accessibility & Inclusion

No product-specific requirement beyond WCAG 2.2 AA; covered in `DESIGN.md`.
