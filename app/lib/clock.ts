import meta from "~/data/meta.json";

/**
 * The prototype's demo clock.
 *
 * Fixtures are anchored to a fixed instant so the story on screen is the same
 * today as it is in six months — but countdowns still need to tick, or a
 * response deadline reads as a dead label. So `now()` returns the anchor plus
 * however long this browser tab has been open.
 */
const ANCHOR_MS = new Date(`${meta.anchor}Z`).getTime();
const BOOT_MS = Date.now();

export function now(): Date {
  return new Date(ANCHOR_MS + (Date.now() - BOOT_MS));
}

export function nowMs(): number {
  return ANCHOR_MS + (Date.now() - BOOT_MS);
}

/** Fixture timestamps are naive UTC (PRODUCT_ARCH_V0.md §3). */
export function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  return new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`);
}

export const ANCHOR_ISO = meta.anchor;
