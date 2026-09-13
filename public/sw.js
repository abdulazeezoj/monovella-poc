/**
 * A deliberately small service worker: enough to make the prototype installable
 * and to survive a flaky connection, without pretending to be an offline-first
 * data layer it isn't.
 */
const CACHE = "monovella-prototype-v3";
// The scope, not "/" — a GitHub Pages project site serves this from a
// "/<repo>/" sub-path, and the cached shell has to be keyed on the URL the
// app is actually installed at.
const SHELL = self.registration.scope;
const PRECACHE = [
  SHELL,
  `${SHELL}manifest.webmanifest`,
  `${SHELL}brand/favicon.svg`,
  `${SHELL}brand/app-icon-colored.png`,
  `${SHELL}fonts/fonts.css`,
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  // Navigations: network first, fall back to the cached shell so an install
  // still opens without a connection.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(SHELL, copy));
          return response;
        })
        .catch(() => caches.match(SHELL).then((r) => r ?? Response.error())),
    );
    return;
  }

  // Static assets: cache first, they are content-hashed by the build.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
