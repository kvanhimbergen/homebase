import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import { useNavigate } from "react-router-dom";
import { LogOut, User, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { MobileSidebar } from "./MobileSidebar";

export function Header() {
  const { user, signOut } = useAuth();
  const { currentHousehold, memberships, switchHousehold } = useHousehold();
  const navigate = useNavigate();

  const initials = user?.user_metadata?.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase() ??
    user?.email?.[0]?.toUpperCase() ??
    "?";

  return (
    <header className="h-14 border-b border-border/60 flex items-center justify-between px-4 md:px-6 bg-background">
      <div className="flex items-center gap-2">
        <MobileSidebar />
        {memberships.length > 1 && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-semibold hover:text-foreground text-muted-foreground">
              {currentHousehold?.name ?? "Select household"}
              <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Households</DropdownMenuLabel>
              {memberships.map((m) => (
                <DropdownMenuItem
                  key={m.household_id}
                  onClick={() => switchHousehold.mutate(m.household_id)}
                >
                  {m.households.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {memberships.length <= 1 && currentHousehold && (
          <span className="text-sm font-semibold hidden md:inline">
            {currentHousehold.name}
          </span>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{user?.user_metadata?.full_name ?? "User"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/settings")}>
            <User className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
