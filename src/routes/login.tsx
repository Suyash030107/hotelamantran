import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarCheck, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Admin Sign In — StaffLedger Attendance Manager" },
      {
        name: "description",
        content:
          "Secure admin sign in for StaffLedger: manage staff records, attendance, working hours and salary from one dashboard.",
      },
      { property: "og:title", content: "Admin Sign In — StaffLedger" },
      {
        property: "og:description",
        content: "Sign in to manage staff, attendance and payroll for your business.",
      },
    ],
  }),
  component: LoginPage,
});

const credentials = z.object({
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
});

const signUpSchema = credentials.extend({
  fullName: z.string().trim().min(2, { message: "Enter your name" }).max(100),
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    const parsed = credentials.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid details");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    navigate({ to: "/dashboard", replace: true });
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    const parsed = signUpSchema.safeParse({ email, password, fullName });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid details");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: parsed.data.fullName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setNotice("Account created. Check your email to confirm it, then sign in.");
      toast.success("Confirmation email sent");
      return;
    }
    toast.success("Account ready");
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <CalendarCheck className="size-5" />
          </span>
          <span className="text-lg font-semibold text-sidebar-accent-foreground">
            StaffLedger
          </span>
        </div>
        <div className="max-w-md space-y-4">
          <h2 className="text-4xl leading-tight font-semibold text-sidebar-accent-foreground">
            Every shift, hour and rupee accounted for.
          </h2>
          <p className="text-sm text-sidebar-foreground/70">
            Staff records, camera check-ins, working hours and monthly salary summaries — one
            simple dashboard built for busy business owners.
          </p>
          <ul className="space-y-2 text-sm text-sidebar-foreground/80">
            <li>• Camera-assisted check-in and check-out</li>
            <li>• Automatic salary calculation from attendance</li>
            <li>• Monthly reports you can export any time</li>
          </ul>
        </div>
        <p className="text-xs text-sidebar-foreground/50">
          Staff and salary data is protected and only visible to signed-in admins.
        </p>
      </section>

      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground">
              <CalendarCheck className="size-5" />
            </span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
          <p className="mt-1 mb-6 text-sm text-muted-foreground">
            Sign in to manage staff, attendance and payroll.
          </p>

          <Tabs defaultValue="signin">
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">
                Create admin
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@business.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                  Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Business owner"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-up">Email</Label>
                  <Input
                    id="email-up"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-up">Password</Label>
                  <Input
                    id="password-up"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                  Create admin account
                </Button>
                <p className="text-xs text-muted-foreground">
                  The first account created becomes the business admin.
                </p>
              </form>
            </TabsContent>
          </Tabs>

          {notice ? (
            <p className="mt-4 rounded-lg bg-info-soft p-3 text-sm text-info">{notice}</p>
          ) : null}

          <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Protected area — staff and salary data requires
            an admin account.
          </p>
        </div>
      </section>
    </div>
  );
}
