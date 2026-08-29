import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMembership } from "@/lib/api";

/** Routes only an organization admin may open. */
const ADMIN_ONLY_PREFIXES = ["/staff", "/salary", "/reports", "/settings"];

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: membership, isLoading } = useMembership();

  const adminOnly = ADMIN_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const noOrg = !isLoading && !membership;
  const blocked = !isLoading && !!membership && adminOnly && membership.role !== "admin";

  return (
    <AppShell>
      {isLoading ? null : noOrg || blocked ? (
        <div className="surface-panel mx-auto mt-10 max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold">
            {noOrg ? "No business linked to this account" : "Admin access required"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {noOrg
              ? "This account is signed in but is not a member of any business yet. Ask the business owner to invite this account."
              : "This page holds staff, salary and report data for your business and is limited to admins. Ask your business admin for access."}
          </p>
          <Button asChild className="mt-5">
            <Link to="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      ) : (
        <Outlet />
      )}
    </AppShell>
  );
}
