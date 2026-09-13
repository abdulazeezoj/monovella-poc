import { Navigate, useLocation } from "react-router";
import { readAuthJourney, updateAuthJourney } from "~/lib/auth-journey";
import { PHARMACY, PortalLayout } from "~/routes/provider/shared";

export default function Layout() {
  const { pathname, search } = useLocation();
  if (!readAuthJourney().web_sessions.PHARMACY.authenticated) {
    updateAuthJourney((draft) => {
      draft.web_sessions.PHARMACY.return_to = `${pathname}${search}`;
    });
    return <Navigate to="/pharmacy/sign-in" replace />;
  }
  return <PortalLayout config={PHARMACY} />;
}
