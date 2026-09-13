import { RouteStatus } from "~/components/shell/page-status-states";
import { PublicWebShell } from "~/components/shell/web-shell";

/**
 * The public site's own 404. It runs inside `PublicWebShell` like every other
 * public surface, so the prototype bar (and with it every screen state) stays
 * reachable here as well.
 */
export default function NotFound() {
  return (
    <PublicWebShell surface="Public site">
      <main className="flex min-h-dvh flex-col justify-center bg-base-100">
        <RouteStatus
          home="/tour"
          homeLabel="Back to the prototype tour"
          scope="the Monovella prototype"
        />
      </main>
    </PublicWebShell>
  );
}
