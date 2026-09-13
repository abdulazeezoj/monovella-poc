/**
 * Resolves a path in `public/` to a URL under the build's base path.
 *
 * Vite rewrites base-path-relative URLs automatically for anything in the
 * module graph, but a hand-written reference to a public asset — an `<img
 * src>`, a manifest `href`, a service-worker registration — is just a string,
 * so it needs this to still resolve once the app is deployed under a
 * sub-path (GitHub Pages project sites serve at `/<repo>/`, not `/`).
 */
export function asset(path: string): string {
	return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}
