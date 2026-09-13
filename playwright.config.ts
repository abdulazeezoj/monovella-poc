import { defineConfig } from "@playwright/test";

/**
 * The prototype's end-to-end layer: the sixteen demonstration journeys in
 * USER_JOURNEY.md, plus the three manifest sweeps.
 *
 * Everything runs against a dev server this config starts itself, so no task
 * needs "run `mise run dev` in another terminal" any more. A developer who
 * already has one open gets it reused; CI always gets a fresh one.
 *
 * There is no browser matrix. The prototype's shells respond to their
 * container rather than the viewport (mobile-shell and the web console both use
 * CSS container queries), so a second viewport project would re-run the same
 * code path rather than a different one. The Phone/Tablet control in the
 * prototype bar is what varies the frame, and the sweeps drive it directly.
 */
const baseURL = process.env.PROTOTYPE_BASE_URL ?? "http://127.0.0.1:5173";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // A test that only passes on a retry is a flaky test, and a flaky test that
  // is allowed to pass locally becomes a flaky test nobody fixes.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { open: "never" }], ["./tests/e2e/journey-reporter.ts"]]
    : [["list"], ["html", { open: "never" }], ["./tests/e2e/journey-reporter.ts"]],
  // Generous, because the app opens a WebAssembly Postgres before it renders
  // anything. This is the budget gotoReady already used as a script.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // The default frame. Every screen in the mobile app is designed at this
    // size first, and the web shells reflow to their container anyway.
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    launchOptions: { args: ["--no-sandbox", "--disable-dev-shm-usage"] },
  },
  webServer: {
    // seed-db skips the rebuild when the fixtures and schema already match what
    // is seeded, so this is near-free on a warm tree and correct on a cold one.
    // Without it a fixture edit would be silently invisible to the whole suite.
    command:
      "pnpm exec vite-node scripts/seed-db.ts && pnpm run dev --host 127.0.0.1 --port 5173",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
  projects: [
    {
      // The sixteen journeys. This is the project the coverage reporter cares
      // about.
      name: "journeys",
      testIgnore: "**/sweeps/**",
    },
    {
      // Manifest sweeps: every declared state, the accessibility smoke test and
      // the browser half of traceability. These enumerate the screen manifest
      // rather than assert a journey, so they carry no journey annotation.
      name: "sweeps",
      testMatch: "**/sweeps/**",
    },
  ],
});
