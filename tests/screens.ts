/**
 * Screen traceability, shared by the layer that can check it without a browser
 * and the layer that needs one.
 *
 * The document-versus-manifest half is static: it reads
 * PRODUCT_SCREEN_V0.md and app/data/screen-manifest.ts and needs nothing
 * running, so it belongs in the unit layer where it costs milliseconds. The
 * declared-states half has to open each route and read the prototype bar, so it
 * is an end-to-end sweep. Both read STATIC_BY_DESIGN from here.
 *
 * This lives under tests/ rather than in app/ because it is test policy, not
 * product data: nothing the app ships needs to know which screens a reviewer
 * has excused from declaring states.
 */
import { fileURLToPath } from "node:url";
import type { ScreenEntry } from "../app/data/screen-manifest";

export const SCREEN_DOCUMENT_PATH = fileURLToPath(
  new URL("../../../Product_Docs/PRODUCT_SCREEN_V0.md", import.meta.url),
);

/**
 * Screens that legitimately have one state, each with the reason.
 *
 * A screen is allowed to be default-only when it reads without writing and has
 * no documented loading, empty or error condition of its own. Anything else
 * that writes, fetches or can fail has to declare those states so a reviewer
 * can see them. This list is the difference between "genuinely static" and
 * "not done yet", which are otherwise indistinguishable.
 */
export const STATIC_BY_DESIGN: Record<string, string> = {
  P0: "A control folded into Home's header, not a screen with its own conditions.",
  P1: "A static welcome. Every path off it belongs to the screen it opens.",
  P46: "A read-only prescription record. Issuing and correcting belong to X15.",
  P47: "A read-only lab order record. Issuing and correcting belong to X16.",
  P65: "A read-only report viewer. Generation and its failures belong to P64.",
  P62: "The screen is itself an account state; it has no second condition.",
  P67: "A referral link and a copy action, with the copy result shown as a toast.",
  X11: "A paged caseload. Its boundary states are covered by the pagination journey.",
  B6: "A queue dashboard. Each queue and decision screen declares its own states.",
  B24: "A queue list. The decision itself is B25, which declares its states.",
  M1: "The public landing page: static marketing content.",
  M2: "A static legal document.",
  M3: "A static legal document.",
  M4: "A static legal document.",
};

/**
 * A manifest entry can fold several documented screens into one route (a
 * Pharmacy and a Lab variant, a sub-flow), so its id is slash-separated. The
 * later parts inherit the first part's letter when they do not carry one.
 */
export function logicalIds(screen: ScreenEntry): string[] {
  const [first, ...rest] = screen.id.split("/");
  const prefix = first.match(/^[PXBVM]/)?.[0] ?? "";
  return [first, ...rest.map((id) => (id.match(/^[PXBVM]/) ? id : `${prefix}${id}`))];
}

/** Every screen id named in a `### ` heading of PRODUCT_SCREEN_V0.md. */
export function documentedIds(source: string): Set<string> {
  return new Set(
    [...source.matchAll(/^### .+$/gm)].flatMap((heading) =>
      [...heading[0].matchAll(/(?<![A-Za-z0-9])[PXBVM]\d+[a-z]?(?![A-Za-z0-9])/g)].map(
        (id) => id[0],
      ),
    ),
  );
}

/** Expert surfaces fail closed in a patient session, so the seat has to match. */
export function seatFor(path: string): "patient" | "expert" {
  return path.startsWith("/app/expert") ? "expert" : "patient";
}
