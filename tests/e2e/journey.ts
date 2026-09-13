/**
 * How an end-to-end test claims a documented journey path.
 *
 * `mise run e2e` has to be able to answer "is every happy and sad path in
 * USER_JOURNEY.md covered?" without anybody maintaining a second list. It does
 * that by having each test say which checklist bullet it walks, and having the
 * reporter compare those claims against the document.
 *
 *   journey("C8", "sad", "a failed card payment can be retried", async ({ app }) => {
 *     ...
 *   });
 *
 * The @happy / @sad tag comes from the `kind` argument, so `--grep @sad` and the
 * coverage table are always reading the same thing. The path ids are checked
 * against the document at declaration time: a typo or a bullet that has since
 * moved fails immediately rather than quietly covering nothing.
 */

import { test } from "./fixtures";
import { lookupPath } from "./journeys";

export type JourneyKind = "happy" | "sad";

type TestBody = Parameters<typeof test>[2];

/**
 * Declare a test that walks one or more documented journey paths.
 *
 * @param paths  One path id, or several when a single walk genuinely covers
 *               more than one bullet. Prefer one: a test that claims five
 *               bullets is usually five tests wearing a coat, and when it fails
 *               nobody can tell which of the five broke.
 * @param kind   "happy" when the test walks the honest route to the end,
 *               "sad" when it walks a refusal, a failure, a conflict or a
 *               recovery. A test that does both should be split.
 * @param title  What the test proves, in the words a failure line should use.
 */
export function journey(
  paths: string | string[],
  kind: JourneyKind,
  title: string,
  body: TestBody,
) {
  const ids = Array.isArray(paths) ? paths : [paths];
  // Resolve now, at collection time. An id that no longer exists is a mapping
  // that has rotted, and finding that out when the suite is collected is much
  // better than finding it out in a coverage table nobody reads closely.
  const resolved = ids.map(lookupPath);

  test(
    `${ids.join("+")} ${title}`,
    {
      tag: `@${kind}`,
      annotation: [
        ...resolved.map((path) => ({ type: "journey", description: path.id })),
        { type: "journey-kind", description: kind },
      ],
    },
    body,
  );
}

/** `journey()` for a path walked to its honest end. */
journey.happy = (paths: string | string[], title: string, body: TestBody) =>
  journey(paths, "happy", title, body);

/** `journey()` for a refusal, failure, conflict or recovery. */
journey.sad = (paths: string | string[], title: string, body: TestBody) =>
  journey(paths, "sad", title, body);

export { expect, test } from "./fixtures";
