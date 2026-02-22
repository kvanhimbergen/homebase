import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  PiggyBank,
  BarChart3,
  FileText,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui-store";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { path: "/accounts", label: "Accounts", icon: Landmark },
  { path: "/budgets", label: "Budgets", icon: PiggyBank },
  { path: "/reports", label: "Reports", icon: BarChart3 },
  { path: "/documents", label: "Documents", icon: FileText },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen sticky top-0 transition-all duration-200",
        sidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!sidebarCollapsed && (
          <span className="text-lg font-bold text-white tracking-tight">HomeBase</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground/60 hover:text-white hover:bg-sidebar-accent"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive =
            path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(path);

          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative",
                isActive
                  ? "bg-sidebar-primary/15 text-white"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-white"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" />
              )}
              <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-sidebar-primary")} />
              {!sidebarCollapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
