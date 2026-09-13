import {
  AlertTriangle,
  BadgeCheck,
  HeartPulse,
  LayoutDashboard,
  Receipt,
  Scale,
  Users,
} from "lucide-react";
import { Navigate, useLocation } from "react-router";
import { WebShell } from "~/components/shell/web-shell";
import { pendingApplications } from "~/data/selectors";
import { readAuthJourney, updateAuthJourney } from "~/lib/auth-journey";
import { usePrototype } from "~/store/prototype";

export default function ConsoleLayout() {
  const { data } = usePrototype();
  const { pathname, search } = useLocation();
  if (!readAuthJourney().web_sessions.STAFF.authenticated) {
    updateAuthJourney((draft) => {
      draft.web_sessions.STAFF.return_to = `${pathname}${search}`;
    });
    return <Navigate to="/console/sign-in" replace />;
  }
  const applications = pendingApplications(data);
  const payoutSupport = data.payoutSupportRequests.filter(
    (request) => request.status !== "REVERSED",
  );

  return (
    <WebShell
      productName="Back-Office Console"
      accountLine="Abdulazeez Ojimoh"
      accountRole="Platform admin"
      accountHref="/console/profile"
      supportHref="/console/support"
      nav={[
        { to: "/console", label: "Home", icon: LayoutDashboard, end: true },
        {
          to: "/console/applications",
          label: "Applications",
          shortLabel: "Apps",
          icon: BadgeCheck,
          count: applications.length,
          overdue: applications.filter((a) => a.overdue).length,
        },
        {
          to: "/console/disputes",
          label: "Exceptions",
          icon: Scale,
          count: data.disputeQueue.length + payoutSupport.length,
          overdue:
            data.disputeQueue.filter((d) => d.overdue).length +
            payoutSupport.filter((request) => request.overdue).length,
        },
        {
          to: "/console/refunds",
          label: "Refunds",
          icon: Receipt,
          count: data.refundQueue.length,
          overdue: data.refundQueue.filter((r) => r.overdue).length,
        },
        {
          to: "/console/clinical-safety",
          label: "Clinical safety",
          shortLabel: "Safety",
          icon: HeartPulse,
          count: data.clinicalComplaintReferrals.filter((item) => item.status !== "CLOSED").length,
          overdue: data.clinicalComplaintReferrals.filter(
            (item) => item.status !== "CLOSED" && item.overdue,
          ).length,
        },
        {
          to: "/console/standing",
          label: "Standing",
          icon: AlertTriangle,
          count: data.standingQueue.length,
          overdue: data.standingQueue.filter((s) => s.overdue).length,
        },
        { to: "/console/staff", label: "Staff", icon: Users },
      ]}
    />
  );
}
