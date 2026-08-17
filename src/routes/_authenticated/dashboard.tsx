import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BarChart3,
  Camera,
  CalendarCheck,
  Clock,
  UserMinus,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CameraAttendanceDialog } from "@/components/camera-attendance";
import { StaffAvatar } from "@/components/staff-avatar";
import { EmptyState, ErrorNotice, LoadingRows, PageHeader, StatCard } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAttendanceRange, useSettings, useStaffList } from "@/lib/api";
import {
  currencyFormatter,
  formatTime,
  STATUS_CLASS,
  STATUS_LABEL,
  toDateKey,
  todayKey,
} from "@/lib/domain";
import { estimateMonthlyCost } from "@/lib/salary";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — StaffLedger Staff & Attendance" },
      {
        name: "description",
        content:
          "Live view of total staff, today's presence, late arrivals and monthly salary cost for your business.",
      },
      { property: "og:title", content: "Dashboard — StaffLedger" },
      {
        property: "og:description",
        content: "Track today's attendance and monthly payroll at a glance.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const today = todayKey();
  const weekStart = toDateKey(new Date(Date.now() - 6 * 86400000));

  const staffQuery = useStaffList();
  const settingsQuery = useSettings();
  const weekQuery = useAttendanceRange(weekStart, today);

  const staff = staffQuery.data ?? [];
  const activeStaff = staff.filter((s) => s.is_active);
  const week = weekQuery.data ?? [];
  const todayRows = week.filter((row) => row.date === today);

  const presentToday = todayRows.filter(
    (r) => r.status === "present" || r.status === "late" || r.status === "half_day",
  ).length;
  const lateToday = todayRows.filter((r) => r.status === "late").length;
  const absentToday = Math.max(
    0,
    activeStaff.length - todayRows.filter((r) => r.status !== "absent").length,
  );

  const settings = settingsQuery.data;
  const money = currencyFormatter(settings?.currency ?? "INR");
  const monthlyCost = settings ? estimateMonthlyCost(staff, settings) : 0;

  const chartData = Array.from({ length: 7 }).map((_, index) => {
    const date = toDateKey(new Date(Date.now() - (6 - index) * 86400000));
    const rows = week.filter((r) => r.date === date);
    return {
      day: new Date(date).toLocaleDateString(undefined, { weekday: "short" }),
      Present: rows.filter((r) => r.status === "present" || r.status === "late").length,
      Absent: rows.filter((r) => r.status === "absent").length,
    };
  });

  if (staffQuery.isError || settingsQuery.isError) {
    return <ErrorNotice />;
  }

  return (
    <>
      <PageHeader
        title={`Good day${settings?.business_name ? `, ${settings.business_name}` : ""}`}
        description={new Date().toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
        actions={
          settings && activeStaff.length > 0 ? (
            <CameraAttendanceDialog
              staff={activeStaff}
              settings={settings}
              trigger={
                <Button>
                  <Camera className="size-4" /> Camera attendance
                </Button>
              }
            />
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total staff" value={activeStaff.length} icon={Users} hint={`${staff.length} records`} />
        <StatCard label="Present today" value={presentToday} icon={CalendarCheck} tone="success" />
        <StatCard label="Absent today" value={absentToday} icon={UserMinus} tone="destructive" />
        <StatCard label="Late today" value={lateToday} icon={Clock} tone="warning" />
        <StatCard
          label="Monthly salary"
          value={money(monthlyCost)}
          icon={Wallet}
          tone="info"
          hint="Estimated payroll cost"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <section className="surface-panel lg:col-span-3">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Today's attendance</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/attendance">View all</Link>
            </Button>
          </header>
          {weekQuery.isLoading ? (
            <LoadingRows />
          ) : todayRows.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No attendance recorded yet today"
              description="Use camera attendance or mark attendance manually."
            />
          ) : (
            <ul className="divide-y divide-border">
              {todayRows.map((row) => {
                const member = staff.find((s) => s.id === row.staff_id);
                return (
                  <li key={row.id} className="flex items-center gap-3 px-4 py-3">
                    <StaffAvatar name={member?.full_name ?? "?"} path={member?.photo_path} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {member?.full_name ?? "Unknown staff"}
                      </p>
                      <p className="num text-xs text-muted-foreground">
                        In {formatTime(row.check_in)} · Out {formatTime(row.check_out)} ·{" "}
                        {Number(row.worked_hours)}h
                      </p>
                    </div>
                    <Badge className={STATUS_CLASS[row.status]} variant="secondary">
                      {STATUS_LABEL[row.status]}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="surface-panel lg:col-span-2">
          <header className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Last 7 days</h2>
          </header>
          <div className="h-56 p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                  }}
                />
                <Bar dataKey="Present" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Absent" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/staff">
                <UserPlus className="size-4" /> Manage staff
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/salary">
                <Wallet className="size-4" /> Salary
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/attendance">
                <CalendarCheck className="size-4" /> Attendance
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/reports">
                <BarChart3 className="size-4" /> Reports
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
