import { FileText, Home, Inbox, Stethoscope, User, Wallet } from "lucide-react";
import { NavLink } from "react-router";
import { cn } from "~/lib/cn";

interface Tab {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>;
  end?: boolean;
}

// Home, Care, Reports, Account. Calendar and Teni left with logging when V0 tightened
// to the loop, and a tab bar should name what the product does: reach a
// verified expert, and keep the record of it.
const PATIENT: Tab[] = [
  { to: "/app", label: "Home", icon: Home, end: true },
  { to: "/app/consultations", label: "Care", icon: Stethoscope },
  { to: "/app/reports", label: "Reports", icon: FileText },
  { to: "/app/account", label: "Account", icon: User },
];

const EXPERT: Tab[] = [
  { to: "/app/expert", label: "Practice", icon: Home, end: true },
  { to: "/app/expert/requests", label: "Requests", icon: Inbox },
  { to: "/app/expert/consultations", label: "Cases", icon: Stethoscope },
  { to: "/app/expert/payouts", label: "Payments", icon: Wallet },
];

function TabBar({ tabs }: { tabs: Tab[] }) {
  return (
    <nav
      aria-label="Main"
      className="shrink-0 border-t border-base-300 bg-base-100 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-[46rem]">
        {tabs.map((t) => (
          <li key={t.to} className="flex-1">
            <NavLink
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-1.5 text-body-sm transition-colors duration-(--motion-fast)",
                  isActive ? "text-primary" : "text-base-content/55 hover:text-base-content",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <t.icon aria-hidden className="size-5" strokeWidth={isActive ? 2 : 1.5} />
                  <span>{t.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PatientTabs() {
  return <TabBar tabs={PATIENT} />;
}

export function ExpertTabs() {
  return <TabBar tabs={EXPERT} />;
}
