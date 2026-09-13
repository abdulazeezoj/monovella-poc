import { MobileScreen } from "~/components/shell/mobile-shell";
import { RouteStatus } from "~/components/shell/page-status-states";

export default function AppNotFound() {
  return (
    <MobileScreen tabs="none" contentPlacement="center">
      <RouteStatus
        home="/app"
        homeLabel="Go to Home"
        support="/app/support"
        scope="the mobile app"
      />
    </MobileScreen>
  );
}
