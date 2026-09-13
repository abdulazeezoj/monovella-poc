/**
 * The shared end-to-end fixture.
 *
 * Before this existed, thirty standalone scripts each launched their own
 * Chromium, defined their own assert(), collected page errors in their own way
 * and read the prototype's sessionStorage with their own copy of the same
 * evaluate block. Four of them waited for the app to finish opening its
 * database; the other twenty-six navigated on networkidle and read whatever was
 * on screen, which for a WebAssembly Postgres is often still the loading state.
 *
 * Everything a journey needs to drive the prototype lives here instead.
 */

import type { Page } from "@playwright/test";
import { test as base, expect } from "@playwright/test";
import { SEATS } from "./helpers/ids";

/** The prototype's own persistence keys. Both are sessionStorage. */
export const STORE_KEY = "mv-prototype-state";
export const AUTH_JOURNEY_KEY = "mv-auth-journey-v1";
const SESSION_PATCH_KEY = "mv-test-pending-session";

/** Theme, frame and zoom are the exception: those persist to localStorage. */
export const THEME_KEY = "mv-theme";
export const FRAME_KEY = "mv-frame";

export {
  COUNTERPARTY_EXPERT,
  PATIENTS,
  SEAT_CASES,
  SEAT_SLUGS,
  SEATS,
  TWO_PARTY_CONSULTATION,
  uid,
} from "./helpers/ids";

export interface SessionPatch {
  authenticated?: boolean;
  access?: "GRANTED" | "CREDENTIAL_CHANGE_REQUIRED" | "SESSION_REVOKED" | "CLOSURE_REQUESTED";
  role?: "patient" | "expert";
  viewingPatientId?: string;
  offline?: boolean;
  standingSuspended?: boolean;
  expertId?: string;
}

/** The shape the prototype persists. Only the parts a test reads are typed. */
export interface PrototypeState {
  // biome-ignore lint/suspicious/noExplicitAny: the dataset is the whole fixture graph
  data?: Record<string, any[]>;
  session?: SessionPatch;
  bookingDraft?: { patientId: string; requestSummary: string; source: string } | null;
}

/** Everything a journey uses to drive the prototype. */
export class Prototype {
  private sessionPatchInstalled = false;

  constructor(readonly page: Page) {}

  /**
   * Navigate, and wait until the screen has actually finished loading.
   *
   * The prototype opens a Postgres database before it renders anything, so a
   * page that has reached network idle can still be showing the loading state.
   * Anything that reads the page immediately after navigating would then be
   * looking at that loading screen: a sweep would find no declared states, an
   * accessibility audit would pass a spinner, and an assertion that something
   * is absent would succeed for the wrong reason.
   *
   * The loading surface carries `data-page-status="loading"`, so waiting for it
   * to detach covers both the initial database open and any in-screen fetch.
   */
  async goto(path: string, timeout = 120_000) {
    // One retry, because the dev server aborts a navigation whenever Vite is
    // reloading a module underneath it, and a fixture regeneration makes that
    // likely. Losing an entire journey to one aborted request is a worse
    // failure than the flake it reports.
    try {
      await this.page.goto(path, { waitUntil: "networkidle" });
    } catch (error) {
      if (!String(error).includes("ERR_ABORTED")) throw error;
      await this.page.waitForTimeout(1000);
      await this.page.goto(path, { waitUntil: "networkidle" });
    }
    await this.ready(timeout);
  }

  /** The wait on its own, for a reload or a client-side navigation. */
  async ready(timeout = 120_000) {
    await this.page.locator('[data-page-status="loading"]').waitFor({
      state: "detached",
      timeout,
    });
  }

  /** Reload and wait for the database to reopen. */
  async reload(timeout = 120_000) {
    await this.page.reload({ waitUntil: "networkidle" });
    await this.ready(timeout);
  }

  /**
   * Open a page and wait until the whole dataset has been persisted.
   *
   * A session patch has to be applied on top of a persisted dataset, not
   * instead of one: the store refuses a stored value whose `data.patients` is
   * not an array and falls back to the shipped fixtures, so seeding a bare
   * session before first paint is silently ignored.
   */
  async bootstrap(path = "/app") {
    await this.goto(path);
    await this.page.waitForFunction(
      (key) => !!JSON.parse(sessionStorage.getItem(key) ?? "null")?.data?.patients,
      STORE_KEY,
    );
  }

  /** Read the persisted prototype state. */
  async state(): Promise<PrototypeState> {
    return this.page.evaluate((key) => {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : {};
    }, STORE_KEY);
  }

  /** Read one fixture collection out of the persisted dataset. */
  // biome-ignore lint/suspicious/noExplicitAny: callers narrow per collection
  async rows(collection: string): Promise<any[]> {
    const state = await this.state();
    return state.data?.[collection] ?? [];
  }

  /**
   * Patch the session, then navigate so the store rehydrates from it.
   *
   * Deliberately not a store action: normalizeSession runs on rehydration and
   * clamps an unmanaged viewingPatientId back to self, which is the fail-closed
   * guard several journeys are actually testing. Going through storage
   * exercises that guard rather than stepping around it.
   */
  async patchSession(patch: SessionPatch, goTo?: string) {
    if (!this.sessionPatchInstalled) {
      // A live page may persist another data update after we patch storage.
      // Apply the queued session once, before the next store is hydrated.
      await this.page.addInitScript(
        ({ key, patchKey }) => {
          const pending = sessionStorage.getItem(patchKey);
          if (!pending) return;
          const value = JSON.parse(sessionStorage.getItem(key) ?? "null");
          if (!value) throw new Error("pending session patch has no prototype dataset");
          value.session = { ...value.session, ...JSON.parse(pending) };
          sessionStorage.setItem(key, JSON.stringify(value));
          sessionStorage.removeItem(patchKey);
        },
        { key: STORE_KEY, patchKey: SESSION_PATCH_KEY },
      );
      this.sessionPatchInstalled = true;
    }
    await this.page.evaluate(
      ({ key, patchKey, patch }) => {
        const value = JSON.parse(sessionStorage.getItem(key) ?? "null");
        if (!value) throw new Error("no persisted prototype state: call bootstrap() first");
        value.session = { ...value.session, ...patch };
        sessionStorage.setItem(key, JSON.stringify(value));
        const pending = JSON.parse(sessionStorage.getItem(patchKey) ?? "{}");
        sessionStorage.setItem(patchKey, JSON.stringify({ ...pending, ...patch }));
      },
      { key: STORE_KEY, patchKey: SESSION_PATCH_KEY, patch },
    );
    if (goTo) await this.goto(goTo);
  }

  /** Occupy one of the five expert seats. */
  async asSeat(expertId: string, goTo = "/app/expert") {
    const known: string[] = Object.values(SEATS);
    if (!known.includes(expertId)) {
      throw new Error(
        `"${expertId}" is not an expert seat a reviewer can occupy. ` +
          `USER_JOURNEY.md lists exactly five: ${known.join(", ")}. ` +
          "Every other directory expert exists only as a counterparty.",
      );
    }
    await this.patchSession({ role: "expert", expertId }, goTo);
  }

  /** Switch the patient context (self, or a dependant). */
  async asPatient(viewingPatientId: string, goTo = "/app") {
    await this.patchSession({ role: "patient", viewingPatientId }, goTo);
  }

  /**
   * Sign one web portal out: the Back-Office Console, Pharmacy or Lab.
   *
   * Those three sessions live in their own key, one flag each, and default to
   * signed in so a reviewer can open a portal straight from /tour. Two traps
   * live here. Removing the key restores that default rather than signing out,
   * and the reader discards any stored value whose `version` is not 1 — so a
   * partial patch without it is silently ignored and the guard keeps letting
   * you through, which reads exactly like a missing guard.
   */
  async signOutWebRole(role: "STAFF" | "PHARMACY" | "LAB") {
    await this.page.evaluate(
      ({ key, role }) => {
        const state = JSON.parse(sessionStorage.getItem(key) ?? "{}");
        state.version = 1;
        state.web_sessions = {
          ...(state.web_sessions ?? {}),
          [role]: { ...(state.web_sessions?.[role] ?? {}), authenticated: false },
        };
        sessionStorage.setItem(key, JSON.stringify(state));
      },
      { key: AUTH_JOURNEY_KEY, role },
    );
  }

  /** Clear both prototype keys, returning the next load to shipped fixtures. */
  async resetStorage() {
    await this.page.evaluate(
      ({ store, auth }) => {
        sessionStorage.removeItem(store);
        sessionStorage.removeItem(auth);
      },
      { store: STORE_KEY, auth: AUTH_JOURNEY_KEY },
    );
  }

  /**
   * Open the prototype bar if it is collapsed.
   *
   * The bar starts collapsed on a narrow surface, so its state switcher is not
   * in the DOM until the disclosure is pressed. Every call that reaches for the
   * switcher goes through here first, rather than each spec remembering.
   */
  async showPrototypeBar() {
    const toggle = this.page.getByRole("button", {
      name: "Show prototype controls",
      exact: true,
    });
    if ((await toggle.count()) > 0 && (await toggle.first().isVisible())) {
      await toggle.first().click();
    }
  }

  /** The states this screen declares through the prototype bar. */
  async declaredStates(): Promise<string[]> {
    await this.showPrototypeBar();
    const control = this.page.getByTitle("Switch this screen's state");
    // The control is hidden entirely when a screen declares fewer than two
    // states, which is how a genuinely static screen reads.
    if ((await control.count()) === 0) return [];
    await control.click();
    const menu = this.page.getByRole("menu", { name: "Screen states" });
    await menu.waitFor();
    const labels = await menu.getByRole("menuitemradio").allInnerTexts();
    await this.page.keyboard.press("Escape");
    return labels.map((label) => label.trim()).filter(Boolean);
  }

  /**
   * Select a declared screen state from the prototype bar.
   *
   * There is no URL parameter for this and the active state is not persisted: a
   * screen holds it as ordinary React state and ScreenStates registers the
   * setter with the store. Driving the real control is therefore the only
   * deterministic route, and it has to happen again after every page load.
   */
  async selectScreenState(label: string) {
    await this.showPrototypeBar();
    await this.page.getByTitle("Switch this screen's state").click();
    const menu = this.page.getByRole("menu", { name: "Screen states" });
    await menu.waitFor();
    await menu.getByRole("menuitemradio", { name: label, exact: true }).click();
    await expect(menu).toBeHidden();
  }

  /** Switch the device frame the prototype bar offers. */
  async withFrame(frame: "phone" | "tablet") {
    await this.page.evaluate(({ key, frame }) => localStorage.setItem(key, frame), {
      key: FRAME_KEY,
      frame,
    });
    await this.reload();
  }

  /** Switch the theme. */
  async withTheme(theme: "light" | "dark") {
    await this.page.evaluate(({ key, theme }) => localStorage.setItem(key, theme), {
      key: THEME_KEY,
      theme,
    });
    await this.reload();
  }
}

interface Fixtures {
  app: Prototype;
  pageErrors: string[];
}

interface Options {
  /**
   * Page and console errors this spec expects. Anything not matched fails the
   * test. Deliberately opt-in per spec: a journey that tolerates errors by
   * default is a journey that stops noticing them.
   */
  allowedPageErrors: (string | RegExp)[];
}

export const test = base.extend<Fixtures & Options>({
  allowedPageErrors: [[], { option: true }],

  pageErrors: [
    async ({ page, allowedPageErrors }, use) => {
      const errors: string[] = [];
      const allowed = (message: string) =>
        allowedPageErrors.some((rule) =>
          typeof rule === "string" ? message.includes(rule) : rule.test(message),
        );

      page.on("pageerror", (error) => {
        if (!allowed(error.message)) errors.push(`pageerror: ${error.message}`);
      });
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const text = message.text();
        if (!allowed(text)) errors.push(`console.error: ${text}`);
      });

      await use(errors);

      // After the test body, so a genuine assertion failure is reported first
      // and a page error does not mask it.
      expect(errors, "the page reported errors").toEqual([]);
    },
    { auto: true },
  ],

  app: async ({ page }, use) => {
    await use(new Prototype(page));
  },
});

export { expect } from "@playwright/test";
