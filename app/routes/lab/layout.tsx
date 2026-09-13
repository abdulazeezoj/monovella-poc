import { Navigate, useLocation } from "react-router";
import { readAuthJourney, updateAuthJourney } from "~/lib/auth-journey";
import { LAB, PortalLayout } from "~/routes/provider/shared";

export default function Layout() {
  const { pathname, search } = useLocation();
  if (!readAuthJourney().web_sessions.LAB.authenticated) {
    updateAuthJourney((draft) => {
      draft.web_sessions.LAB.return_to = `${pathname}${search}`;
    });
    return <Navigate to="/lab/sign-in" replace />;
  }
  return <PortalLayout config={LAB} />;
}
