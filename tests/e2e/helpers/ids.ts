/**
 * Fixture identifiers, resolved from their generator slugs.
 *
 * `scripts/gen-fixtures.ts` writes every row with a UUID derived from a stable
 * slug, so "pat_amara" is not an id in the data: it is the name the generator
 * used, and `uid("pat_amara")` is the id it produced. A test that passes the
 * slug straight into `session.expertId` or a route parameter is naming a row
 * that does not exist, and the prototype fails closed on it — which looks
 * exactly like a passing "this is correctly refused" assertion.
 *
 * Everything here goes through `uid()` for that reason. Never write a slug
 * string into a URL or the session.
 */
export { uid } from "../../../scripts/prisma-common";

import { uid } from "../../../scripts/prisma-common";

/**
 * The five expert seats a reviewer can actually occupy.
 *
 * USER_JOURNEY.md's Mechanics section is explicit that the rest of the
 * directory exists only as counterparties: browsable and bookable from the
 * patient side, never a seat to sit in. `exp_adeyemi` is the demo account's own
 * expert identity and the default.
 */
export const SEAT_SLUGS = {
  doctor: "exp_adeyemi",
  nurse: "exp_etim",
  pharmacist: "exp_adisa",
  labScientist: "exp_garba",
  physiotherapist: "exp_nwosu",
} as const;

export const SEATS = {
  doctor: uid(SEAT_SLUGS.doctor),
  nurse: uid(SEAT_SLUGS.nurse),
  pharmacist: uid(SEAT_SLUGS.pharmacist),
  labScientist: uid(SEAT_SLUGS.labScientist),
  physiotherapist: uid(SEAT_SLUGS.physiotherapist),
} as const;

/** One representative active case per professional type. */
export const SEAT_CASES = {
  doctor: uid("con_106"),
  nurse: uid("con_121"),
  pharmacist: uid("con_122"),
  labScientist: uid("con_123"),
  physiotherapist: uid("con_124"),
} as const;

/** The account holder, and the two dependants the guardian journeys use. */
export const PATIENTS = {
  /** Amara Okonkwo, the demo account's own patient identity. */
  self: uid("pat_amara"),
  /** Kelechi, a verified dependant with a health condition. */
  verifiedDependant: uid("pat_kelechi"),
  /** Tobi, a provisional minor. */
  provisionalMinor: uid("pat_tobi"),
  /** Zainab, a provisional dependant with no NIN. */
  noNinDependant: uid("pat_zainab"),
} as const;

/**
 * The one consultation where both sides of a live interaction are performable.
 *
 * An expert may not treat their own account's patient identity, so a live
 * two-party test cannot be built from Amara to her own expert seat. con_106
 * pairs that seat with the dependant Tobi, a distinct patient identity.
 */
export const TWO_PARTY_CONSULTATION = SEAT_CASES.doctor;

/** A directory expert who is only ever a counterparty, never a seat. */
export const COUNTERPARTY_EXPERT = uid("exp_eze");
