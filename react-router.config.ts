import type { Config } from "@react-router/dev/config";

// Must track vite.config.ts's `base` — the router's basename and the asset
// base path have to agree, or every route match is off by the sub-path.
const basename = process.env.GITHUB_PAGES ? "/monovella-poc/" : "/";

export default {
	// The prototype is a pure client-side showcase: no server, no API.
	// SPA mode makes the whole thing a static bundle that installs as a PWA.
	ssr: false,
	basename,
} satisfies Config;
