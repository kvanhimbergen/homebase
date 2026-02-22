import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  PiggyBank,
  BarChart3,
  FileText,
  Settings,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { path: "/accounts", label: "Accounts", icon: Landmark },
  { path: "/budgets", label: "Budgets", icon: PiggyBank },
  { path: "/reports", label: "Reports", icon: BarChart3 },
  { path: "/documents", label: "Documents", icon: FileText },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function MobileSidebar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
        <SheetHeader className="p-4 border-b border-sidebar-border">
          <SheetTitle className="text-lg font-bold text-white tracking-tight">HomeBase</SheetTitle>
        </SheetHeader>
        <nav className="py-4 space-y-0.5 px-2">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive =
              path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(path);

            return (
              <Link
                key={path}
                to={path}
                onClick={() => setOpen(false)}
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
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
