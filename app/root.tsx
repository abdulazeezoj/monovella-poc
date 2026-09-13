import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useNavigation,
} from "react-router";
import { Button, ButtonLink, PageStatus } from "~/components/ui";

import type { Route } from "./+types/root";
import { PrototypeProvider } from "./store/prototype";
import "./app.css";

export const links: Route.LinksFunction = () => [
  // Self-hosted so the prototype renders identically offline and installs as a
  // real PWA — no third-party request on the critical path.
  { rel: "stylesheet", href: "/fonts/fonts.css" },
  {
    rel: "preload",
    href: "/fonts/eb-garamond-400-latin.woff2",
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: "/fonts/fira-mono-400-latin.woff2",
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
  { rel: "icon", href: "/brand/favicon.svg", type: "image/svg+xml" },
  { rel: "apple-touch-icon", href: "/brand/app-icon-colored.png" },
  { rel: "manifest", href: "/manifest.webmanifest" },
];

export const meta: Route.MetaFunction = () => [
  { title: "Monovella: Product Prototype" },
  {
    name: "description",
    content:
      "A clickable prototype of Monovella: one verified expert network and one patient-owned health record, across the mobile app and the web console.",
  },
  { name: "theme-color", content: "#a8461f" },
];

/**
 * Registers the service worker that makes the prototype installable as a PWA —
 * production only. Its cache-first rule is right for content-hashed build
 * assets and wrong for Vite's dev modules, which keep their filenames across
 * edits, so registering it in dev would serve a stale bundle after every change.
 */
const SW_SCRIPT = import.meta.env.PROD
  ? `if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  });
}`
  : `if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (rs) {
    rs.forEach(function (r) { r.unregister(); });
  });
}`;

// Applied before first paint so the prototype never flashes the wrong mode.
const THEME_SCRIPT = `(function(){try{
  var s = localStorage.getItem('mv-theme') || 'system';
  var dark = s === 'dark' || (s === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}catch(e){}})();`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    // The theme script below stamps `class="dark"` on this element before
    // React hydrates, which is the whole point of running it pre-paint — so the
    // resulting attribute mismatch is expected, not a bug to be patched up.
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <Meta />
        <Links />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: pre-paint theme sync */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <PrototypeProvider>{children}</PrototypeProvider>
        <ScrollRestoration />
        <Scripts />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: service worker registration */}
        <script dangerouslySetInnerHTML={{ __html: SW_SCRIPT }} />
      </body>
    </html>
  );
}

export default function App() {
  const navigation = useNavigation();

  if (navigation.state !== "idle") {
    return (
      <main className="flex min-h-dvh bg-base-100">
        <PageStatus
          kind="loading"
          title="Loading your next screen"
          body="Your place is saved while Monovella gets everything ready."
          className="min-h-dvh"
        />
      </main>
    );
  }

  return <Outlet />;
}

export function HydrateFallback() {
  return (
    <main className="flex min-h-dvh bg-base-100">
      <PageStatus
        kind="loading"
        title="Loading Monovella"
        body="Getting the prototype and demo records ready."
        className="min-h-dvh"
      />
    </main>
  );
}

function recoveryDestination(pathname: string) {
  if (pathname.startsWith("/app"))
    return { to: "/app", label: "Go to Home", support: "/app/support" };
  if (pathname.startsWith("/console"))
    return { to: "/console", label: "Go to console home", support: null };
  if (pathname.startsWith("/pharmacy"))
    return { to: "/pharmacy", label: "Go to pharmacy home", support: "/pharmacy/support" };
  if (pathname.startsWith("/lab"))
    return { to: "/lab", label: "Go to lab home", support: "/lab/support" };
  return { to: "/tour", label: "Back to the prototype tour", support: null };
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const { pathname } = useLocation();
  const recovery = recoveryDestination(pathname);
  let message = "We couldn't open this screen";
  let details = "The prototype hit an unexpected problem. Retry once, or return to a safe screen.";
  let notFound = false;

  if (isRouteErrorResponse(error)) {
    notFound = error.status === 404;
    message = notFound ? "Screen not found" : `We couldn't open this screen (${error.status})`;
    details = notFound
      ? "That address doesn't match a screen in this part of Monovella."
      : error.statusText || details;
  }

  return (
    <main className="flex min-h-dvh bg-base-100">
      <PageStatus
        kind={notFound ? "not-found" : "error"}
        title={message}
        body={details}
        className="min-h-dvh"
        action={
          <>
            {!notFound ? <Button onClick={() => window.location.reload()}>Try again</Button> : null}
            <ButtonLink to={recovery.to} variant={notFound ? "primary" : "secondary"}>
              {recovery.label}
            </ButtonLink>
            {/* A retry that keeps failing needs a way out that is not another
                retry, so the error state always offers a person to talk to. */}
            {!notFound && recovery.support ? (
              <ButtonLink to={recovery.support} variant="ghost">
                Contact support
              </ButtonLink>
            ) : null}
          </>
        }
      />
    </main>
  );
}
