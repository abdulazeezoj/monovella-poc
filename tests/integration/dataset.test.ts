/**
 * The dataset contract: opening the seeded database, and what a caller gets.
 *
 * `loadPrototypeData()` opens public/prototype.pgdata — a real Postgres data
 * directory built by `mise run seed` — and `buildDataset()` hands out a fresh
 * mutable copy of it. The store calls the second one on every reset, so if the
 * copy were shared rather than fresh, one walkthrough's mutations would leak
 * into the next and the reset control would quietly stop working.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { buildDataset, isPrototypeDataLoaded, loadPrototypeData, meta } from "../../app/data";
import { ANCHOR_ISO } from "../setup";

beforeAll(async () => {
  await loadPrototypeData();
}, 180_000);

describe("prototype dataset", () => {
  it("reports itself loaded once the database is open", () => {
    expect(isPrototypeDataLoaded()).toBe(true);
  });

  it("carries the frozen anchor the fixtures were generated from", () => {
    // Naive UTC, per PRODUCT_ARCH_V0.md section 3.
    expect(`${meta.anchor}Z`).toBe(ANCHOR_ISO);
  });

  it("returns a fresh copy each time, so a reset really resets", () => {
    const first = buildDataset();
    const second = buildDataset();

    expect(first).not.toBe(second);
    expect(first.consultations).not.toBe(second.consultations);
    expect(first.consultations.length).toBe(second.consultations.length);

    const before = second.consultations[0].status;
    first.consultations[0].status = "CANCELLED";
    expect(second.consultations[0].status, "the two datasets share rows").toBe(before);
    expect(buildDataset().consultations[0].status, "a later build inherited a mutation").toBe(
      before,
    );
  });

  it("loads every collection the screens read", () => {
    const data = buildDataset();
    for (const collection of [
      "patients",
      "experts",
      "consultations",
      "prescriptions",
      "labOrders",
      "providerRequests",
      "checkoutPayments",
      "logEntries",
      "chatMessages",
    ] as const) {
      expect(Array.isArray(data[collection]), `${collection} did not load`).toBe(true);
      expect(data[collection].length, `${collection} is empty`).toBeGreaterThan(0);
    }
  });

  it("comes back through Postgres with its instants intact", () => {
    const data = buildDataset();
    // Round-tripping through a timestamptz column and back is where an instant
    // most easily becomes a local-time string, which then reads as a deadline
    // hours out from where the demo clock put it.
    for (const consultation of data.consultations.slice(0, 20)) {
      expect(consultation.requested_at, `${consultation.id} lost its timestamp shape`).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
      );
    }
  });
});
