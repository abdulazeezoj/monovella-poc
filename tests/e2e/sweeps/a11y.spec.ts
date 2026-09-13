/**
 * Automated WCAG 2.2 AA smoke test, at the 320px reflow floor.
 *
 * Checks the claims in PRODUCT_SPEC_V0.md section 10 that can be checked
 * automatically: reflow at 320px, target size, accessible names, label
 * association, heading order and image alternatives.
 *
 * It does not — and cannot — replace assistive-technology and device testing,
 * which the specification commits to separately before launch. Describing a
 * green run here as "WCAG 2.2 AA verified" would be a false claim.
 *
 * Ported from scripts/a11y.ts. The rules are the same hand-written checks,
 * deliberately not axe-core: they carry exceptions this product has decided on
 * (a screen-reader-only native input behind a visible RadioCard label, a 44px
 * floor for the public-return lockup, the inline-text exception to 2.5.8) that
 * a general-purpose engine would report as failures.
 *
 * One test per screen, so a finding names the screen it is on.
 */
import { SCREEN_SECTIONS } from "../../../app/data/screen-manifest";
import { expect, test } from "../fixtures";

interface Finding {
  rule: string;
  detail: string;
}

const CHECKS = `() => {
  const out = [];
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    // RadioCard-style labels intentionally retain a screen-reader-only native
    // input while the visible, correctly sized label is the pointer target.
    // Measuring that 1px semantic input would falsely report a target-size
    // failure despite the labelled card being the interactive control.
    if (el.matches("input.sr-only")) return false;
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const name = (el) =>
    (el.getAttribute("aria-label") ||
      el.getAttribute("title") ||
      (el.getAttribute("aria-labelledby") &&
        document.getElementById(el.getAttribute("aria-labelledby"))?.textContent) ||
      el.textContent ||
      el.getAttribute("alt") ||
      "").trim();

  // WCAG 2.2 - 4.1.2 Name, Role, Value
  for (const el of document.querySelectorAll("button, a[href], [role=button], [role=radio], [role=tab]")) {
    if (visible(el) && !name(el)) {
      out.push({ rule: "no-accessible-name", detail: el.outerHTML.slice(0, 120) });
    }
  }

  // WCAG 2.2 - 3.3.2 Labels or Instructions
  for (const el of document.querySelectorAll("input, textarea, select")) {
    if (!visible(el)) continue;
    const id = el.getAttribute("id");
    const labelled =
      (id && document.querySelector('label[for="' + CSS.escape(id) + '"]')) ||
      el.closest("label") ||
      el.getAttribute("aria-label") ||
      el.getAttribute("aria-labelledby");
    if (!labelled) out.push({ rule: "unlabelled-field", detail: el.outerHTML.slice(0, 120) });
  }

  // WCAG 2.2 - 1.1.1 Non-text Content
  for (const el of document.querySelectorAll("img")) {
    if (el.getAttribute("alt") === null) {
      out.push({ rule: "img-without-alt", detail: el.getAttribute("src") ?? "" });
    }
  }

  // WCAG 2.2 - 2.5.8 Target Size (Minimum), 24x24 CSS px absolute floor.
  // The brand system is stricter for the public-return lockup on touch: 44x44.
  for (const el of document.querySelectorAll("button, a[href], [role=button], [role=radio], input[type=checkbox], input[type=radio]")) {
    if (!visible(el)) continue;
    const r = el.getBoundingClientRect();
    const returnsToLanding = el.getAttribute("aria-label") === "Return to Monovella landing page";
    if (returnsToLanding && (r.width < 44 || r.height < 44)) {
      out.push({
        rule: "landing-link-target-too-small",
        detail: Math.round(r.width) + "x" + Math.round(r.height),
      });
    }
    // 2.5.8 inline exception: a target in a sentence or block of text is exempt.
    const parent = el.parentElement;
    const inline = getComputedStyle(el).display.startsWith("inline");
    const sentence =
      inline && parent && parent.textContent.trim().length > (el.textContent ?? "").trim().length + 3;
    if (!sentence && (r.width < 24 || r.height < 24)) {
      out.push({
        rule: "target-too-small",
        detail: Math.round(r.width) + "x" + Math.round(r.height) + " — " + name(el).slice(0, 50),
      });
    }
  }

  // WCAG 2.2 - 1.3.1 Info and Relationships (heading order)
  let last = 0;
  for (const h of document.querySelectorAll("h1, h2, h3, h4")) {
    if (!visible(h)) continue;
    const level = Number(h.tagName[1]);
    if (last && level > last + 1) {
      out.push({ rule: "heading-skips-level", detail: "h" + last + " to h" + level + ": " + h.textContent.slice(0, 50) });
    }
    last = level;
  }

  // WCAG 2.2 - 1.4.10 Reflow: no horizontal scroll at 320px
  if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) {
    out.push({
      rule: "horizontal-scroll",
      detail: document.documentElement.scrollWidth + " > " + document.documentElement.clientWidth,
    });
  }
  return out;
}`;

// The landing page and the screen index are audited too. Both may already be
// in the manifest, so the Set wraps the whole list rather than only its first
// part.
const paths = [
  ...new Set([
    ...SCREEN_SECTIONS.flatMap((section) =>
      section.screens.map((screen) => screen.path).filter((path): path is string => !!path),
    ),
    "/",
    "/screens",
  ]),
];

test.describe("accessibility at 320px", () => {
  // A 320px screen is a touch device: with touch emulated, `(pointer: fine)` is
  // false, so the device mockup never renders and the audit measures the app
  // itself at 320px, not a zoomed-out picture of a phone body.
  test.use({ viewport: { width: 320, height: 900 }, hasTouch: true });

  for (const path of paths) {
    test(path, async ({ app, page }) => {
      await app.goto(path);
      // Let any entrance transition settle before measuring target sizes.
      await page.waitForTimeout(250);

      // Playwright evaluates a string as an expression, so invoke it explicitly.
      const findings = (await page.evaluate(`(${CHECKS})()`)) as Finding[];

      expect(
        findings.map((finding) => `${finding.rule}: ${finding.detail}`),
        `${path} has automated accessibility findings`,
      ).toEqual([]);
    });
  }
});
