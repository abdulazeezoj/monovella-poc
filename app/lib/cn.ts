import clsx, { type ClassValue } from "clsx";

/** Tiny class joiner. Tailwind v4 + explicit variants means no merge pass is needed. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
