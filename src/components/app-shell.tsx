import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings as SettingsIcon,
  Users,
  Wallet,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import logoAsset from "@/assets/staffsnap-logo.png.asset.json";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/staff", label: "Staff", icon: Users },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/salary", label: "Salary", icon: Wallet },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="size-4.5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function BrandMark({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={logoAsset.url}
        alt={`${name} logo`}
        className="size-9 shrink-0 rounded-lg object-contain"
      />
      <span className="sr-only">{name.slice(0, 1).toUpperCase()}</span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-sidebar-accent-foreground">
          {name}
        </span>
        <span className="block text-xs text-sidebar-foreground/60">Staff & Attendance</span>
      </span>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings } = useSettings();
  const businessName = settings?.business_name ?? "My Business";

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between border-r border-sidebar-border bg-sidebar p-4 lg:flex">
        <div className="space-y-6">
          <BrandMark name={businessName} />
          <NavLinks />
        </div>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </aside>

      <div className="lg:pl-64">
        {/* Mobile top bar */}
        <header className="no-print sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Open menu">
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-4">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="space-y-6 pt-2">
                <BrandMark name={businessName} />
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <span className="truncate text-sm font-semibold">{businessName}</span>
          <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
            <LogOut className="size-4" />
          </Button>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 pt-5 pb-24 sm:px-6 lg:pt-8 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        {NAV.slice(0, 5).map((item) => (
          <MobileNavItem key={item.to} to={item.to} label={item.label} Icon={item.icon} />
        ))}
      </nav>
    </div>
  );
}

function MobileNavItem({
  to,
  label,
  Icon,
}: {
  to: string;
  label: string;
  Icon: typeof Users;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname === to || pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
