import { useEffect, useRef } from "react";
import { usePrototype } from "~/store/prototype";

/**
 * Declares the states this screen can be put into. Renders nothing.
 *
 * PRODUCT_SCREEN_V0.md enumerates every distinct condition each screen must
 * design for — loading, empty, each status-enum value, each documented error
 * code — and a prototype that only ever shows the happy path hides exactly the
 * work that matters. So screens declare their states here, and the control for
 * switching between them lives in the prototype bar: a reviewer can reach every
 * state, and no page ever renders a control that isn't Monovella's.
 */
export function ScreenStates<T extends string>({
  states,
  value,
  onChange,
}: {
  states: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { registerScreenStates, setScreenStateValue } = usePrototype();

  // Screens declare these inline, so both `states` and `onChange` get a new
  // identity every render. Register on what the states actually *are*, and
  // reach the current handler through a ref.
  const signature = states.map((s) => `${s.value} ${s.label}`).join(" / ");
  const latestStates = useRef(states);
  const latestOnChange = useRef(onChange);
  latestStates.current = states;
  latestOnChange.current = onChange;

  // biome-ignore lint/correctness/useExhaustiveDependencies: `signature` is the value-identity of `states`, which the effect reads through a ref.
  useEffect(() => {
    registerScreenStates(
      latestStates.current.map((s) => ({ value: s.value, label: s.label })),
      (next) => latestOnChange.current(next as T),
    );
    return () => registerScreenStates(null, null);
  }, [signature, registerScreenStates]);

  useEffect(() => {
    setScreenStateValue(value);
  }, [value, setScreenStateValue]);

  return null;
}
