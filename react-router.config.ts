import type { Config } from "@react-router/dev/config";

export default {
  // The prototype is a pure client-side showcase: no server, no API.
  // SPA mode makes the whole thing a static bundle that installs as a PWA.
  ssr: false,
} satisfies Config;
