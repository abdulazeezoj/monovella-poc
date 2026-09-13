/**
 * Shared setup for the unit and integration layers.
 *
 * The prototype's own clock is frozen to an anchor date (app/lib/clock.ts) so a
 * demo does not go stale, and the fixtures are generated from that same anchor.
 * A test that reads the host clock would therefore be comparing generated data
 * against today, which is exactly the drift the frozen clock exists to prevent.
 * Nothing here fakes timers: it just makes the anchor available by name so a
 * test states which date it means.
 */
export const ANCHOR_ISO = "2026-08-29T09:15:00Z";
export const ANCHOR_MS = Date.parse(ANCHOR_ISO);
