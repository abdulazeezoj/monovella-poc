import { beforeAll, expect, it } from "vitest";
import { buildDataset, loadPrototypeData } from "../../app/data";
import {
  addPrototypeDependant,
  confirmPrototypeDependant,
} from "../../app/lib/dependant-onboarding";

beforeAll(loadPrototypeData);
const input = {
  id: "new_dependent",
  firstName: "Ada",
  lastName: "Test",
  dateOfBirth: "2018-04-09",
  gender: "FEMALE" as const,
  reason: "MINOR" as const,
  phone: "",
  guardianName: "Amara",
};
it("adds a separate provisional child without taking over another record", () => {
  const data = buildDataset();
  const previous = structuredClone(data.patients);
  expect(addPrototypeDependant(data, input)).toBe("ADDED");
  expect(data.patients.slice(0, -1)).toEqual(previous);
  expect(data.patients.at(-1)).toMatchObject({
    id: input.id,
    first_name: "Ada",
    status: "PROVISIONAL",
    guardian_user_id: data.user.id,
    guardian_reason: "MINOR",
    verified_at: null,
  });
  expect(addPrototypeDependant(data, input)).toBe("EXISTS");
});
it("keeps a pending adult out of care records until the correct code, across serialization", () => {
  let data = buildDataset();
  expect(
    addPrototypeDependant(data, {
      ...input,
      reason: "NO_NIN_YET",
      dateOfBirth: "1994-04-09",
      phone: "08062223344",
    }),
  ).toBe("PENDING");
  expect(data.patients.some((p) => p.id === input.id)).toBe(false);
  expect(confirmPrototypeDependant(data, input.id, "000000")).toBe("INCORRECT");
  data = JSON.parse(JSON.stringify(data));
  expect(confirmPrototypeDependant(data, input.id, "246810")).toBe("CONFIRMED");
  expect(confirmPrototypeDependant(data, input.id, "246810")).toBe("CONFIRMED");
  expect(data.patients.filter((p) => p.id === input.id)).toHaveLength(1);
});
it("locks after five wrong attempts and rejects unknown confirmation references", () => {
  const data = buildDataset();
  addPrototypeDependant(data, { ...input, reason: "NO_NIN_YET", phone: "08062223344" });
  for (let attempt = 0; attempt < 5; attempt++) confirmPrototypeDependant(data, input.id, "000000");
  expect(confirmPrototypeDependant(data, input.id, "246810")).toBe("LOCKED");
  expect(confirmPrototypeDependant(data, "unknown", "246810")).toBe("NOT_FOUND");
  expect(data.patients.some((p) => p.id === input.id)).toBe(false);
});
