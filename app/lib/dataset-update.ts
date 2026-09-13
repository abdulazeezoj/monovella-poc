import type { Dataset } from "~/data";

/** Apply one prototype action to an isolated next-state snapshot. */
export function updateDataset(current: Dataset, mutate: (draft: Dataset) => void): Dataset {
  // Actions update nested credentials, case notes, messages and settings too.
  // React can replay an updater, so none of those objects may belong to current.
  const draft = structuredClone(current);
  mutate(draft);
  return draft;
}
