import { useState } from "react";
import { ScreenStates } from "~/components/shell/state-switcher";
import { Banner } from "~/components/ui";

/**
 * The conditions a screen that writes something has to design for.
 *
 * `PRODUCT_SCREEN_V0.md` enumerates these per screen and `openapi.json` gives
 * them status codes. Declaring one here is a commitment that the screen really
 * behaves differently in it: the reviewer sees the message a person would see,
 * and the action that must not run is actually blocked. A state that changes
 * nothing on screen would be decoration, which the prototype bar exists to
 * avoid.
 */
export type MutationState =
  | "default"
  | "submitting"
  | "offline"
  | "failed"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "validation"
  | "rate_limited";

const LABELS: Record<MutationState, string> = {
  default: "Default",
  submitting: "Submitting",
  offline: "Offline",
  failed: "Request failed",
  forbidden: "403 not permitted",
  not_found: "404 not found",
  conflict: "409 already changed",
  validation: "422 validation",
  rate_limited: "429 too many attempts",
};

/**
 * Wording is deliberately about what happened and what to do next, never a
 * status code on its own. `subject` names the thing being changed, so one
 * shared message reads naturally on a schedule, a payout account or a refund
 * decision.
 */
function message(
  state: MutationState,
  subject: string,
): { tone: "info" | "warning"; text: string } {
  switch (state) {
    case "submitting":
      return { tone: "info", text: `Saving ${subject}. This usually takes a moment.` };
    case "offline":
      return {
        tone: "warning",
        text: `You are offline, so ${subject} cannot be saved yet. What you entered is kept here until the connection returns.`,
      };
    case "failed":
      return {
        tone: "warning",
        text: `We could not save ${subject}. Nothing was changed. Try again, and contact support if it keeps failing.`,
      };
    case "forbidden":
      return {
        tone: "warning",
        text: `This account cannot change ${subject}. Nothing here was altered.`,
      };
    case "not_found":
      return {
        tone: "warning",
        text: `${subject.charAt(0).toUpperCase()}${subject.slice(1)} is no longer available. It may have been removed or completed elsewhere.`,
      };
    case "conflict":
      return {
        tone: "warning",
        text: `Someone else already changed ${subject}. Reload before deciding again, so you are acting on the current version.`,
      };
    case "validation":
      return {
        tone: "warning",
        text: `Some details need fixing before ${subject} can be saved. The fields below show what is missing.`,
      };
    case "rate_limited":
      return {
        tone: "warning",
        text: "Too many attempts in a short time. Wait a moment before trying again.",
      };
    default:
      return { tone: "info", text: "" };
  }
}

const isMutationState = (value: string): value is MutationState => value in LABELS;

/**
 * Declares a write screen's states to the prototype bar and returns what the
 * screen needs to honour them.
 *
 * - `node` renders the declaration and, when the state is not default, the
 *   message a person would actually see.
 * - `pending` is true while submitting, for a busy label on the primary action.
 * - `blocked` is true whenever the write must not proceed, so the screen can
 *   disable its primary action rather than pretend the write succeeded.
 *
 * `extra` adds states that belong to the screen rather than to the write, for
 * the case where the same route renders two genuinely different screens and
 * only one of them is reachable from the seeded data. P47d is the example: the
 * collection-time picker only exists while a request is accepted and not yet
 * scheduled, so without a declared state nobody can reach it, `mise run shots`
 * never captures it, and the traceability sweep still passes because the write
 * states are declared. The same rule applies as to a `MutationState`: declare
 * one only if the screen really renders differently in it. There is a single
 * `ScreenStates` registration per screen, so extras belong here rather than in
 * a second declaration, which would deregister this one on unmount.
 * An optional onSelect runs a reviewer simulation (such as payment verification)
 * and returns the screen to its live state. It never adds an in-page control.
 */
export function useMutationStates<Extra extends string = never>(
  states: MutationState[],
  subject: string,
  extra?: { value: Extra; label: string; onSelect?: () => void }[],
): {
  state: MutationState | Extra;
  setState: (next: MutationState | Extra) => void;
  node: React.ReactNode;
  pending: boolean;
  blocked: boolean;
} {
  const [state, setState] = useState<MutationState | Extra>("default");
  const options = states.includes("default") ? states : (["default", ...states] as MutationState[]);
  const { tone, text } = isMutationState(state)
    ? message(state, subject)
    : ({ tone: "info", text: "" } as const);

  return {
    state,
    setState,
    pending: state === "submitting",
    // An extra state is a different screen, not a failed write, so it must not
    // block the action the way an error state does.
    blocked: isMutationState(state) && state !== "default",
    node: (
      <>
        <ScreenStates
          value={state}
          onChange={(next) => {
            const action = extra?.find((option) => option.value === next)?.onSelect;
            if (action) {
              setState("default");
              action();
            } else setState(next as MutationState | Extra);
          }}
          states={[
            ...options.map((value) => ({
              value: value as MutationState | Extra,
              label: LABELS[value],
            })),
            ...(extra ?? []),
          ]}
        />
        {text ? (
          <div data-mutation-state={state}>
            <Banner tone={tone}>{text}</Banner>
          </div>
        ) : null}
      </>
    ),
  };
}
