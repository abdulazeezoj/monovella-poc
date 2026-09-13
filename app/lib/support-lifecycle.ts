import type { Dataset } from "~/data";

export function supportSlices(data: Dataset) {
  return {
    supportCases: data.supportCases,
    privacyRequests: data.privacyRequests,
    feedbackEntries: data.feedbackEntries,
  };
}

export function mutableSupportSlices(data: Dataset) {
  return data;
}

export function nextSupportReference(prefix: "SUP" | "PRV" | "FDB", ids: string[]) {
  const next =
    Math.max(
      0,
      ...ids.map((id) => Number.parseInt(id.split("-").at(-1) ?? "0", 10)).filter(Number.isFinite),
    ) + 1;
  return `${prefix}-2026-${String(next).padStart(4, "0")}`;
}
