import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Two of the prototype's three test layers live here. The third is elsewhere on
 * purpose: end-to-end is Playwright (playwright.config.ts), because it needs a
 * real browser against a running dev server.
 *
 * There is deliberately no load layer. Product/api, Product/web and
 * Product/mobile each have one because they serve traffic. The prototype never
 * deploys and reads a WebAssembly Postgres opened inside the tab, so there is
 * nothing to put load on.
 *
 * The React Router Vite plugin is deliberately absent from this config. It
 * rewrites the module graph for routing, which is exactly what a unit test
 * should not be running through. Vitest loads this file instead of
 * vite.config.ts.
 */
/**
 * The app imports itself as `~/...`, which the React Router Vite plugin
 * normally provides. That plugin is absent here (see above), so the alias has
 * to be declared, or any test that reaches app/lib fails to resolve. A project
 * does not inherit the root `resolve`, so each one declares it.
 */
const alias = { "~": fileURLToPath(new URL("./app", import.meta.url)) };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        // Unit: a pure function, a selector, a fixture relationship or a
        // document-versus-code contract, with nothing running at all. This is
        // the layer that has to stay fast enough to keep in a watcher, so it
        // never opens a database and never reaches the network.
        test: {
          name: "unit",
          root: import.meta.dirname,
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          setupFiles: ["tests/setup.ts"],
          globals: true,
          // Most of these finish in milliseconds. The clock contract reads every
          // source file under app/ and the layer check walks tests/, and a
          // recursive read of a few hundred files on Windows can take seconds
          // when the machine is also running a browser suite. Vitest's 5s
          // default turns that into a flake rather than a finding.
          testTimeout: 30_000,
        },
      },
      {
        resolve: { alias },
        // Integration: the real PGlite database built from the generated
        // Postgres DDL. This is the prototype's only actual infrastructure, and
        // the layer that proves the constraints reject what they should rather
        // than only that a good row goes in.
        test: {
          name: "integration",
          root: import.meta.dirname,
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["tests/setup.ts"],
          globals: true,
          // Opening PGlite and applying the whole schema is not instant, and a
          // cold first run pays for the WebAssembly compile as well.
          testTimeout: 120_000,
          hookTimeout: 180_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["app/**/*.{ts,tsx}"],
      exclude: ["app/**/*.d.ts", "app/root.tsx", "app/data/*.json"],
    },
  },
});
