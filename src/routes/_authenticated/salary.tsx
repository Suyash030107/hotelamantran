import { createFileRoute } from "@tanstack/react-router";
import { Calculator, Download, Printer, Save, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { StaffAvatar } from "@/components/staff-avatar";
import { EmptyState, ErrorNotice, LoadingRows, PageHeader, StatCard } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
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
import {
  useAttendanceRange,
  useSalaryRecords,
  useSaveSalaryRecords,
  useSettings,
  useStaffList,
  useUpdateSalaryStatus,
} from "@/lib/api";
import { downloadCsv, printPage } from "@/lib/export";
import { currencyFormatter, monthKey, monthLabel, monthRange } from "@/lib/domain";
import { computeSalary } from "@/lib/salary";

export const Route = createFileRoute("/_authenticated/salary")({
  head: () => ({
    meta: [
      { title: "Salary — StaffLedger" },
      {
        name: "description",
        content:
          "Automatic monthly salary calculation from attendance: gross pay, overtime, deductions, net payable and payment status.",
      },
      { property: "og:title", content: "Salary — StaffLedger" },
      {
        property: "og:description",
        content: "Attendance-driven payroll with overtime, deductions and payment tracking.",
      },
    ],
  }),
  component: SalaryPage,
});

function SalaryPage() {
  const [month, setMonth] = useState(monthKey(new Date()));
  const range = monthRange(month);

  const staffQuery = useStaffList();
  const { data: settings } = useSettings();
  const attendanceQuery = useAttendanceRange(range.start, range.end);
  const savedQuery = useSalaryRecords(month);
  const saveRecords = useSaveSalaryRecords();
  const updateStatus = useUpdateSalaryStatus();

  const money = currencyFormatter(settings?.currency ?? "INR");
  const staff = (staffQuery.data ?? []).filter((s) => s.is_active);
  const attendance = attendanceQuery.data ?? [];
  const saved = savedQuery.data ?? [];

  const rows = useMemo(() => {
    if (!settings) return [];
    return staff.map((member) => ({
      member,
      breakdown: computeSalary(
        member,
        attendance.filter((row) => row.staff_id === member.id),
        settings,
      ),
      record: saved.find((r) => r.staff_id === member.id),
    }));
  }, [staff, attendance, settings, saved]);

  const totalNet = rows.reduce((sum, row) => sum + row.breakdown.netSalary, 0);
  const totalPaid = rows
    .filter((row) => row.record?.payment_status === "paid")
    .reduce((sum, row) => sum + row.breakdown.netSalary, 0);

  async function saveAll() {
    try {
      await saveRecords.mutateAsync(
        rows.map(({ member, breakdown, record }) => ({
          staff_id: member.id,
          month,
          working_days: breakdown.workingDays,
          present_days: breakdown.presentDays,
          half_days: breakdown.halfDays,
          leave_days: breakdown.leaveDays,
          absent_days: breakdown.absentDays,
          late_count: breakdown.lateCount,
          overtime_hours: breakdown.overtimeHours,
          overtime_amount: breakdown.overtimeAmount,
          gross_salary: breakdown.grossSalary,
          deductions: breakdown.deductions,
          net_salary: breakdown.netSalary,
          payment_status: record?.payment_status ?? "pending",
        })),
      );
      toast.success(`Salary sheet saved for ${monthLabel(month)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save salary sheet");
    }
  }

  function exportCsv() {
    downloadCsv(`salary-${month}.csv`, [
      [
        "Staff ID",
        "Name",
        "Working days",
        "Present",
        "Half days",
        "Leave",
        "Absent",
        "Late",
        "Overtime hrs",
        "Gross",
        "Overtime pay",
        "Deductions",
        "Net payable",
        "Status",
      ],
      ...rows.map(({ member, breakdown, record }) => [
        member.staff_code,
        member.full_name,
        breakdown.workingDays,
        breakdown.presentDays,
        breakdown.halfDays,
        breakdown.leaveDays,
        breakdown.absentDays,
        breakdown.lateCount,
        breakdown.overtimeHours,
        breakdown.grossSalary,
        breakdown.overtimeAmount,
        breakdown.deductions,
        breakdown.netSalary,
        record?.payment_status ?? "pending",
      ]),
    ]);
  }

  if (staffQuery.isError || attendanceQuery.isError) return <ErrorNotice />;

  return (
    <>
      <PageHeader
        title="Salary"
        description="Calculated from attendance, working days, overtime and your deduction rules."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={printPage} disabled={!rows.length}>
              <Printer className="size-4" /> Print
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
              <Download className="size-4" /> Export CSV
            </Button>
            <Button onClick={() => void saveAll()} disabled={!rows.length || saveRecords.isPending}>
              <Save className="size-4" /> Save sheet
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="salary-month">Month</Label>
          <Input
            id="salary-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || monthKey(new Date()))}
            className="num w-44"
          />
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Staff on payroll" value={rows.length} icon={Wallet} />
        <StatCard label="Total net payable" value={money(totalNet)} icon={Calculator} tone="info" />
        <StatCard label="Marked paid" value={money(totalPaid)} icon={Wallet} tone="success" />
      </div>

      <div className="surface-panel overflow-x-auto">
        {staffQuery.isLoading || attendanceQuery.isLoading ? (
          <LoadingRows />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No active staff to pay"
            description="Add staff members and mark their attendance to generate a salary sheet."
          />
        ) : (
          <table className="w-full min-w-3xl text-sm">
            <thead className="bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Staff</th>
                <th className="px-4 py-3 font-medium">Present / Working</th>
                <th className="px-4 py-3 font-medium">Overtime</th>
                <th className="px-4 py-3 font-medium">Gross</th>
                <th className="px-4 py-3 font-medium">Deductions</th>
                <th className="px-4 py-3 font-medium">Net payable</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(({ member, breakdown, record }) => (
                <tr key={member.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <StaffAvatar name={member.full_name} path={member.photo_path} />
                      <div>
                        <p className="font-medium">{member.full_name}</p>
                        <p className="num text-xs text-muted-foreground">
                          {member.staff_code} ·{" "}
                          {member.salary_type === "monthly" ? "Monthly" : "Daily"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="num px-4 py-3">
                    {breakdown.payableDays} / {breakdown.workingDays}
                    <span className="block text-xs text-muted-foreground">
                      {breakdown.absentDays} absent · {breakdown.lateCount} late
                    </span>
                  </td>
                  <td className="num px-4 py-3">
                    {breakdown.overtimeHours}h
                    <span className="block text-xs text-muted-foreground">
                      {money(breakdown.overtimeAmount)}
                    </span>
                  </td>
                  <td className="num px-4 py-3">{money(breakdown.grossSalary)}</td>
                  <td className="num px-4 py-3 text-destructive">
                    −{money(breakdown.deductions)}
                  </td>
                  <td className="num px-4 py-3 font-semibold">{money(breakdown.netSalary)}</td>
                  <td className="px-4 py-3">
                    {record ? (
                      <Select
                        value={record.payment_status}
                        onValueChange={(value) =>
                          void updateStatus.mutateAsync({ id: record.id, payment_status: value })
                        }
                      >
                        <SelectTrigger className="w-32" aria-label="Payment status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">Not saved</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Save the sheet to lock this month's figures and track payment status per staff member.
      </p>
    </>
  );
}
