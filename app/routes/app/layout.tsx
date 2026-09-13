import { Navigate, useLocation } from "react-router";
import { MobileShell } from "~/components/shell/mobile-shell";
import { updateAuthJourney } from "~/lib/auth-journey";
import { usePrototype } from "~/store/prototype";

const PUBLIC_APP_ROUTES = new Set([
  "/app/welcome",
  "/app/sign-up",
  "/app/sign-in",
  "/app/recover",
  "/app/dependants/confirm",
]);

export default function AppLayout() {
  const { session } = usePrototype();
  const { pathname, search } = useLocation();
  const protectedRoute = !PUBLIC_APP_ROUTES.has(pathname);
  const credentialChangeRoute = pathname === "/app/account/change-pin";

  if (
    (!session.authenticated ||
      (session.access !== "GRANTED" &&
        !(session.access === "CREDENTIAL_CHANGE_REQUIRED" && credentialChangeRoute))) &&
    protectedRoute
  ) {
    if (session.access !== "CLOSURE_REQUESTED") {
      updateAuthJourney((draft) => {
        draft.mobile_return_to = `${pathname}${search}`;
      });
    }
    return <Navigate to="/app/welcome" replace />;
  }

  return <MobileShell />;
}
