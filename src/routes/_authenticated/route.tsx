import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/lib/api";

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
  const { data: isAdmin, isLoading } = useIsAdmin();

  return (
    <AppShell>
      {isLoading ? null : isAdmin === false ? (
        <div className="surface-panel mx-auto mt-10 max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This account is signed in but does not have admin permissions, so staff and salary
            data stays hidden. Ask the business owner to grant you admin access.
          </p>
          <Button asChild className="mt-5">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <Outlet />
      )}
    </AppShell>
  );
}
