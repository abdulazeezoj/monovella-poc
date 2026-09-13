/**
 * Captures every screen in the manifest at each device width, in both themes,
 * and in every state the screen declares.
 *
 * PRODUCT_SCREEN_V0.md enumerates the conditions each screen must design for,
 * and screens declare them through `<ScreenStates>`. Shooting only the default
 * meant the 409, the rate limit, the empty list and the suspended banner were
 * the states nobody ever looked at, which is backwards: those are the ones most
 * likely to be broken. This drives the real switcher in the prototype bar
 * through its accessible roles rather than reaching into the store, so a state
 * that a reviewer cannot reach is not captured here either.
 *
 * Run `mise run dev` first, then `mise run shots`.
 *
 *   mise run shots -- --filter=/app/experts --theme=dark --device=tablet --frame=tablet
 *   mise run shots -- --states=off        # default state only, for a quick pass
 */
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { type Browser, chromium, type Page } from "playwright";
import { SCREEN_SECTIONS } from "../app/data/screen-manifest";
// The same navigate-and-wait the end-to-end layer uses. One definition: a
// screenshot taken before the database finishes opening is a picture of the
// loading state, which is exactly the failure this waits out.
import { Prototype } from "../tests/e2e/fixtures";

// One base URL for the whole prototype. SHOT_BASE is kept as a fallback so an
// existing invocation does not break; before this, twenty-four scripts read
// SHOT_BASE and eight read BASE_URL, with different defaults.
const BASE = process.env.PROTOTYPE_BASE_URL ?? process.env.SHOT_BASE ?? "http://127.0.0.1:5173";
const OUT = process.env.SHOT_OUT ?? path.resolve(import.meta.dirname, "..", "screenshots");

const DEVICES = {
  phone: { width: 430, height: 932 },
  tablet: { width: 834, height: 1112 },
  desktop: { width: 1440, height: 1000 },
} as const;

type DeviceName = keyof typeof DEVICES;

function arg(name: string, fallback?: string) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
}

const filter = arg("filter");
const themes = (arg("theme", "light,dark") as string).split(",");
const devices = (arg("device", "phone,tablet,desktop") as string).split(",") as DeviceName[];
const requestedFrame = arg("frame");
const withStates = arg("states", "on") !== "off";

function frameFor(device: DeviceName): "phone" | "tablet" {
  if (requestedFrame === "phone" || requestedFrame === "tablet") return requestedFrame;
  if (requestedFrame) throw new Error("--frame must be phone or tablet");
  return device === "tablet" ? "tablet" : "phone";
}

interface Target {
  id: string;
  slug: string;
  path: string;
  app: string;
}

/**
 * These surfaces render in the shared web mockup. Their toolbar must always
 * let a reviewer switch between phone, tablet and laptop frames, including
 * the otherwise-navless sign-in and application pages.
 */
function requiresDesktopDeviceControl(path: string) {
  return (
    path === "/" ||
    path.startsWith("/legal/") ||
    path === "/console" ||
    path.startsWith("/console/") ||
    path === "/pharmacy" ||
    path.startsWith("/pharmacy/") ||
    path === "/lab" ||
    path.startsWith("/lab/")
  );
}

function targets(): Target[] {
  const seen = new Set<string>();
  const out: Target[] = [];
  for (const section of SCREEN_SECTIONS) {
    for (const screen of section.screens) {
      if (!screen.path) continue;
      const key = `${screen.id}-${screen.path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (filter && !screen.path.includes(filter)) continue;
      out.push({
        id: screen.id,
        app: section.app,
        path: screen.path,
        slug: `${section.key}-${screen.id}-${screen.name}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      });
    }
  }
  out.push(
    { id: "TOUR", app: "Public", path: "/", slug: "00-tour" },
    { id: "INDEX", app: "Public", path: "/screens", slug: "00-screen-index" },
  );
  return out;
}

/** The prototype bar's state switcher. Absent when a screen declares fewer than two states. */
const STATE_TRIGGER = 'button[title="Switch this screen\'s state"]';

function stateSlug(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * The labels this screen offers, in declared order. The first is the state the
 * screen loads in, so it is what the plain `<slug>.png` already shows.
 */
async function declaredStates(page: Page): Promise<string[]> {
  const trigger = page.locator(STATE_TRIGGER);
  if ((await trigger.count()) === 0) return [];
  await trigger.first().click();
  const labels = (await page.getByRole("menuitemradio").allInnerTexts()).map((t) => t.trim());
  await trigger.first().click();
  return labels.filter(Boolean);
}

async function selectState(page: Page, index: number) {
  const trigger = page.locator(STATE_TRIGGER);
  if ((await trigger.count()) === 0) return false;
  await trigger.first().click();
  const items = page.getByRole("menuitemradio");
  if ((await items.count()) <= index) return false;
  await items.nth(index).click();
  await page.waitForTimeout(250);
  return true;
}

/**
 * Put the app in the Expert seat before shooting an `/app/expert/*` screen.
 *
 * Every capture clears the persisted session, so those screens were being shot
 * in the Patient seat and rendering "Consultation not found". The seat is
 * switched the way a person switches it, through the context pill in the mobile
 * shell, so a screen a reviewer cannot reach is not captured here either.
 */
async function ensureExpertSeat(page: Page) {
  await new Prototype(page).goto(`${BASE}/app`);
  const pill = page.locator('button[aria-haspopup="dialog"]');
  if ((await pill.count()) === 0) throw new Error("/app has no context pill to switch seats with");
  await pill.first().click();
  const expert = page.getByRole("button", { name: /^Expert/ });
  await expert.first().waitFor({ state: "visible", timeout: 5000 });
  await expert.first().click();
  await page.waitForURL(/\/app\/expert/, { timeout: 5000 });
}

async function capture(
  page: Page,
  target: Target,
  theme: string,
  device: DeviceName,
): Promise<{ shots: number; error: string | null }> {
  const frame = frameFor(device);
  await page.setViewportSize(DEVICES[device]);
  await page.addInitScript(
    ({ theme, frame }) => {
      try {
        window.localStorage.setItem("mv-theme", theme);
        // The mobile app responds to this frame, not the outer browser viewport.
        // Set it before navigation so a tablet image is never a phone layout in
        // a wider screenshot directory.
        window.localStorage.setItem("mv-frame", frame);
        window.sessionStorage.removeItem("mv-prototype-state");
      } catch {
        /* private mode */
      }
    },
    { theme, frame },
  );
  if (target.path.startsWith("/app/expert")) {
    await ensureExpertSeat(page);
    await page.evaluate((to) => {
      window.history.pushState({}, "", to);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, target.path);
    await page.waitForTimeout(600);
  } else {
    await new Prototype(page).goto(`${BASE}${target.path}`);
  }
  await page.waitForTimeout(350);

  if (device === "desktop" && requiresDesktopDeviceControl(target.path)) {
    const deviceControl = page.getByRole("radio", { name: "Device: Phone" });
    if ((await deviceControl.count()) === 0) {
      return { shots: 0, error: `${target.path}: missing the shared Device frame control` };
    }
  }

  if (target.app === "Mobile app" && device !== "desktop") {
    await page.waitForFunction((expectedFrame) => {
      return document.documentElement.dataset.prototypeFrame === expectedFrame;
    }, frame);
    const actualFrame = await page.getAttribute("html", "data-prototype-frame");
    if (actualFrame !== frame) {
      return {
        shots: 0,
        error: `${target.path} — expected ${frame} frame, rendered ${actualFrame ?? "none"}`,
      };
    }
  }
  const dir = path.join(OUT, theme, device);
  await mkdir(dir, { recursive: true });
  await page.screenshot({ path: path.join(dir, `${target.slug}.png`) });

  // A blank capture used to pass silently. Every screen in this product renders
  // text, so an empty body means the page never got there.
  const text = ((await page.textContent("body")) ?? "").trim();
  if (text.length < 40)
    return { shots: 1, error: `${target.path} — rendered ${text.length} characters` };
  if (!withStates) return { shots: 1, error: null };

  // The first declared state is the one already captured above.
  const states = await declaredStates(page);
  let shots = 1;
  for (let index = 1; index < states.length; index += 1) {
    if (!(await selectState(page, index))) break;
    await page.screenshot({
      path: path.join(dir, `${target.slug}__${stateSlug(states[index])}.png`),
    });
    shots += 1;
  }
  return { shots, error: null };
}

async function main() {
  const list = targets();
  console.log(
    `Capturing ${list.length} screens × ${themes.length} themes × ${devices.length} devices` +
      (withStates ? ", every declared state" : ", default state only"),
  );
  if (!filter) await rm(OUT, { recursive: true, force: true });

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    // Both kinds: an uncaught exception, and anything React or the app logs as
    // an error. A hydration mismatch only shows up in the second.
    const errors: string[] = [];

    for (const device of devices) {
      // A phone or tablet is a touch device: with touch emulated the mockup
      // never renders and the shot documents the app itself at that width.
      // Desktop keeps `pointer: fine` and captures the framed mockup.
      const context = await browser.newContext({
        deviceScaleFactor: 2,
        hasTouch: device !== "desktop",
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(`${page.url()} — ${e.message}`));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(`${page.url()} — ${m.text().split("\n")[0]}`);
      });

      for (const theme of themes) {
        let taken = 0;
        for (const target of list) {
          // The mobile app ships as a mobile app. At a desktop width it renders
          // inside a device frame — the same layout as the tablet shot on a
          // different ground — so it is captured at phone and tablet only.
          if (device === "desktop" && target.app === "Mobile app") continue;
          const result = await capture(page, target, theme, device);
          if (result.error) errors.push(result.error);
          taken += result.shots;
        }
        console.log(`  ✓ ${device}/${theme} — ${taken} shots`);
      }
      await context.close();
    }

    if (errors.length) {
      console.error(`\n${errors.length} page errors:`);
      for (const e of errors.slice(0, 20)) console.error(`  ${e}`);
      process.exitCode = 1;
    } else {
      console.log("\nNo page errors.");
    }
    console.log(`Screenshots in ${OUT}`);
  } finally {
    await browser?.close();
  }
}

main();
