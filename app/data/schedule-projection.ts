import type { Dataset } from "~/data";
import type { ProviderScheduleSlotRead } from "~/data/types";
import { now } from "~/lib/clock";

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const FORTNIGHT_DAYS = 14;

type WeeklyTimeRange = {
  id: string;
  day_of_week: number | null;
  start_time: string;
  end_time: string;
  collection_method?: string | null;
};

/**
 * Keeps published recurring supply unambiguous. Experts cannot overlap any
 * working blocks. Labs may run branch and home collection in parallel, but
 * cannot accidentally publish two overlapping windows for the same method.
 */
export function weeklyTimeConflict<T extends WeeklyTimeRange>(
  slots: readonly T[],
  candidate: WeeklyTimeRange,
  options: { matchCollectionMethod?: boolean } = {},
) {
  return slots.find(
    (slot) =>
      slot.id !== candidate.id &&
      slot.day_of_week === candidate.day_of_week &&
      (!options.matchCollectionMethod ||
        (slot.collection_method ?? null) === (candidate.collection_method ?? null)) &&
      slot.start_time < candidate.end_time &&
      candidate.start_time < slot.end_time,
  );
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function timeOnDay(day: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(
    Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hours, minutes, 0, 0),
  );
}

function dateKey(day: Date) {
  return day.toISOString().slice(0, 10);
}

/** Returns the concrete date a patient sees for a recurring or one-off Lab window. */
export function providerSlotDate(slot: ProviderScheduleSlotRead, from = now()) {
  if (slot.specific_date) return slot.specific_date;
  const day = startOfDay(from);
  const productDay = (day.getUTCDay() + 6) % 7;
  const distance = ((slot.day_of_week ?? productDay) - productDay + 7) % 7;
  day.setUTCDate(day.getUTCDate() + distance);
  return dateKey(day);
}

/** A closure hides a matching window from future patient choice, never an accepted booking. */
export function providerSlotIsBookable(draft: Dataset, slot: ProviderScheduleSlotRead) {
  const slotDate = providerSlotDate(slot);
  return !draft.providerScheduleExceptions.some(
    (exception) =>
      exception.provider_id === slot.provider_id &&
      exception.kind === "UNAVAILABLE" &&
      exception.date === slotDate &&
      (exception.collection_method == null ||
        exception.collection_method === slot.collection_method) &&
      (exception.start_time == null ||
        (exception.start_time < slot.end_time &&
          slot.start_time < (exception.end_time ?? "24:00"))),
  );
}

/**
 * Mirrors the fixture generator's bounded weekly projection. It preserves a
 * booked concrete slot even if its weekly source block is changed or removed,
 * but closes all unbooked supply that no longer belongs to the weekly schedule.
 */
export function reprojectExpertAvailability(draft: Dataset, expertId: string) {
  const start = startOfDay(now());
  const end = new Date(start.getTime() + FORTNIGHT_DAYS * DAY_MS);
  const rules = (draft.expertSchedulingRules ?? []).find(
    (candidate) => candidate.expert_id === expertId,
  );
  // Safe legacy defaults for data created before the rules record existed.
  const durationMinutes = rules?.appointment_duration_minutes ?? 60;
  const bufferMinutes = rules?.buffer_minutes ?? 0;
  const minimumNoticeMinutes = rules?.minimum_notice_minutes ?? 0;
  const maxBookingsPerDay = rules?.max_bookings_per_day ?? Number.POSITIVE_INFINITY;
  const earliestStart = now().getTime() + minimumNoticeMinutes * MINUTE_MS;
  const existing = draft.expertAvailability.filter((slot) => slot.expert_id === expertId);
  const booked = existing.filter((slot) => slot.taken);
  const keyed = new Map(existing.map((slot) => [`${slot.start}|${slot.end}`, slot]));
  const projected = new Map<string, (typeof existing)[number]>();
  const blocks = draft.expertSchedule.filter((slot) => slot.expert_id === expertId);
  const exceptions = draft.expertScheduleExceptions.filter(
    (exception) => exception.expert_id === expertId,
  );

  for (let offset = 0; offset < FORTNIGHT_DAYS; offset += 1) {
    const day = new Date(start.getTime() + offset * DAY_MS);
    // Product day_of_week is Monday=0; Date#getUTCDay is Sunday=0.
    const productDay = (day.getUTCDay() + 6) % 7;
    let slotsForDay = 0;
    const exceptionsToday = exceptions.filter((exception) => exception.date === dateKey(day));
    const blocksToday = [
      ...blocks.filter((slot) => slot.day_of_week === productDay),
      ...exceptionsToday
        .filter(
          (exception) =>
            exception.kind === "EXTRA_HOURS" &&
            exception.start_time != null &&
            exception.end_time != null,
        )
        .map((exception) => ({ start_time: exception.start_time!, end_time: exception.end_time! })),
    ];
    for (const block of blocksToday) {
      const blockStart = timeOnDay(day, block.start_time);
      const blockEnd = timeOnDay(day, block.end_time);
      for (
        let cursor = blockStart;
        cursor.getTime() + durationMinutes * MINUTE_MS <= blockEnd.getTime();
        cursor = new Date(cursor.getTime() + (durationMinutes + bufferMinutes) * MINUTE_MS)
      ) {
        if (cursor.getTime() < earliestStart || slotsForDay >= maxBookingsPerDay) continue;
        const slotEnd = new Date(cursor.getTime() + durationMinutes * MINUTE_MS);
        const unavailable = exceptionsToday.some(
          (exception) =>
            exception.kind === "UNAVAILABLE" &&
            (exception.start_time == null ||
              (timeOnDay(day, exception.start_time).getTime() < slotEnd.getTime() &&
                cursor.getTime() < timeOnDay(day, exception.end_time ?? "23:59").getTime())),
        );
        if (unavailable) continue;
        const startIso = cursor.toISOString().slice(0, 19);
        const endIso = slotEnd.toISOString().slice(0, 19);
        const key = `${startIso}|${endIso}`;
        const preserved = keyed.get(key);
        projected.set(
          key,
          preserved ?? {
            id: `avl_${expertId}_${startIso.replace(/[^0-9]/g, "")}`,
            expert_id: expertId,
            start: startIso,
            end: endIso,
            taken: false,
          },
        );
        slotsForDay += 1;
      }
    }
  }

  for (const slot of booked) {
    const slotTime = new Date(`${slot.start}Z`).getTime();
    if (slotTime >= start.getTime() && slotTime < end.getTime()) {
      projected.set(`${slot.start}|${slot.end}`, slot);
    }
  }

  draft.expertAvailability = [
    ...draft.expertAvailability.filter((slot) => slot.expert_id !== expertId),
    ...[...projected.values()].sort((a, b) => a.start.localeCompare(b.start)),
  ];
  const expert = draft.experts.find((candidate) => candidate.id === expertId);
  if (expert) {
    expert.next_available_start =
      draft.expertAvailability.find((slot) => slot.expert_id === expertId && !slot.taken)?.start ??
      null;
  }
}
