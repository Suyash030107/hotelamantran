import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Clock, Download, Printer, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { StaffAvatar } from "@/components/staff-avatar";
import { EmptyState, ErrorNotice, LoadingRows, PageHeader, StatCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAttendanceRange, useDepartments, useSettings, useStaffList } from "@/lib/api";
import { downloadCsv, printPage } from "@/lib/export";
import { currencyFormatter, monthKey, monthRange, STATUS_LABEL } from "@/lib/domain";
import { computeSalary } from "@/lib/salary";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — StaffLedger" },
      {
        name: "description",
        content:
          "Monthly attendance and salary reports by staff member or department, with CSV export and printing.",
      },
      { property: "og:title", content: "Reports — StaffLedger" },
      {
        property: "og:description",
        content: "Attendance summaries, working hours and payroll totals you can export.",
      },
    ],
  }),
  component: ReportsPage,
});

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function ReportsPage() {
  const [month, setMonth] = useState(monthKey(new Date()));
  const [department, setDepartment] = useState("all");
  const range = monthRange(month);

  const staffQuery = useStaffList();
  const attendanceQuery = useAttendanceRange(range.start, range.end);
  const { data: departments } = useDepartments();
  const { data: settings } = useSettings();
  const money = currencyFormatter(settings?.currency ?? "INR");

  const staff = (staffQuery.data ?? []).filter(
    (s) => s.is_active && (department === "all" || s.department_id === department),
  );
  const attendance = attendanceQuery.data ?? [];

  const summary = useMemo(() => {
    if (!settings) return [];
    return staff.map((member) => {
      const rows = attendance.filter((row) => row.staff_id === member.id);
      return {
        member,
        rows,
        hours: rows.reduce((sum, r) => sum + Number(r.worked_hours), 0),
        breakdown: computeSalary(member, rows, settings),
      };
    });
  }, [staff, attendance, settings]);

  const statusData = (["present", "late", "half_day", "leave", "absent"] as const).map(
    (status, index) => ({
      name: STATUS_LABEL[status],
      value: attendance.filter(
        (row) => row.status === status && staff.some((s) => s.id === row.staff_id),
      ).length,
      fill: CHART_COLORS[index] as string,
    }),
  );

  const totalHours = summary.reduce((sum, row) => sum + row.hours, 0);
  const totalPayroll = summary.reduce((sum, row) => sum + row.breakdown.netSalary, 0);

  function exportCsv() {
    downloadCsv(`report-${month}.csv`, [
      [
        "Staff ID",
        "Name",
        "Department",
        "Present",
        "Late",
        "Half days",
        "Leave",
        "Absent",
        "Hours worked",
        "Overtime hrs",
        "Net payable",
      ],
      ...summary.map(({ member, breakdown, hours }) => [
        member.staff_code,
        member.full_name,
        departments?.find((d) => d.id === member.department_id)?.name ?? "—",
        breakdown.presentDays,
        breakdown.lateCount,
        breakdown.halfDays,
        breakdown.leaveDays,
        breakdown.absentDays,
        Math.round(hours * 100) / 100,
        breakdown.overtimeHours,
        breakdown.netSalary,
      ]),
    ]);
  }

  if (staffQuery.isError || attendanceQuery.isError) return <ErrorNotice />;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Monthly attendance, working hours and payroll summary for your team."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={printPage} disabled={!summary.length}>
              <Printer className="size-4" /> Print
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={!summary.length}>
              <Download className="size-4" /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-[11rem_14rem]">
        <div className="space-y-1.5">
          <Label htmlFor="report-month">Month</Label>
          <Input
            id="report-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || monthKey(new Date()))}
            className="num"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="report-dept">Department</Label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger id="report-dept">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {(departments ?? []).map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Staff in report" value={summary.length} icon={Users} />
        <StatCard
          label="Hours worked"
          value={`${Math.round(totalHours * 10) / 10}h`}
          icon={Clock}
          tone="info"
        />
        <StatCard label="Payroll total" value={money(totalPayroll)} icon={BarChart3} tone="success" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <section className="surface-panel lg:col-span-2">
          <header className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Attendance mix</h2>
          </header>
          <div className="h-64 p-3">
            {attendance.length === 0 ? (
              <EmptyState
                icon={BarChart3}
                title="No attendance in this period"
                description="Mark attendance to see the breakdown."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" iconSize={8} wrapperStyle={{ fontSize: "0.75rem" }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.5rem",
                      fontSize: "0.75rem",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="surface-panel overflow-x-auto lg:col-span-3">
          <header className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Per staff summary</h2>
          </header>
          {staffQuery.isLoading || attendanceQuery.isLoading ? (
            <LoadingRows />
          ) : summary.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No staff match this filter"
              description="Choose a different department or add staff members."
            />
          ) : (
            <table className="w-full min-w-2xl text-sm">
              <thead className="bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Staff</th>
                  <th className="px-4 py-3 font-medium">Present</th>
                  <th className="px-4 py-3 font-medium">Absent</th>
                  <th className="px-4 py-3 font-medium">Hours</th>
                  <th className="px-4 py-3 font-medium">Net pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.map(({ member, breakdown, hours }) => (
                  <tr key={member.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <StaffAvatar name={member.full_name} path={member.photo_path} />
                        <div>
                          <p className="font-medium">{member.full_name}</p>
                          <p className="num text-xs text-muted-foreground">{member.staff_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="num px-4 py-3">{breakdown.presentDays}</td>
                    <td className="num px-4 py-3">{breakdown.absentDays}</td>
                    <td className="num px-4 py-3">{Math.round(hours * 10) / 10}h</td>
                    <td className="num px-4 py-3 font-semibold">{money(breakdown.netSalary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
