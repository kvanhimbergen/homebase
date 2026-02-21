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
      <SheetContent side="left" className="w-60 p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="text-lg font-bold">HomeBase</SheetTitle>
        </SheetHeader>
        <nav className="py-4 space-y-1 px-2">
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
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
