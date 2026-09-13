import { useEffect, useState } from "react";

/**
 * Whether this is a desktop browser (a mouse or trackpad, i.e. `pointer: fine`)
 * rather than a real phone or tablet — a touch-only device always answers
 * `false`, no matter how wide its screen is. Unlike a viewport-width
 * breakpoint, resizing a desktop browser window never flips this, which is
 * the point: the mockup keeps its own fixed size on a desktop browser
 * regardless of how the window is resized, rather than reflowing like the
 * page around it — scroll the window to see the rest of it.
 */
export function usePointerFine() {
  const [fine, setFine] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches,
  );
  useEffect(() => {
    const mql = window.matchMedia("(pointer: fine)");
    const onChange = () => setFine(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return fine;
}
