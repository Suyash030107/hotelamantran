import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarCheck, Clock, Pencil, ScanFace, Wallet } from "lucide-react";

import { FaceRegisterDialog } from "@/components/face-register-dialog";
import { StaffAvatar } from "@/components/staff-avatar";
import { StaffFormDialog } from "@/components/staff-form-dialog";
import { EmptyState, ErrorNotice, LoadingRows, StatCard } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDepartments, useSettings, useStaffAttendance, useStaffMember } from "@/lib/api";
import {
  currencyFormatter,
  formatDate,
  formatTime,
  monthKey,
  STATUS_CLASS,
  STATUS_LABEL,
} from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/staff/$id")({
  head: () => ({
    meta: [
      { title: "Staff Profile — StaffLedger" },
      {
        name: "description",
        content:
          "Full employment record for a staff member: contact details, salary setup and recent attendance history.",
      },
      { property: "og:title", content: "Staff Profile — StaffLedger" },
      {
        property: "og:description",
        content: "Contact details, salary setup and attendance history for one staff member.",
      },
    ],
  }),
  component: StaffDetailPage,
});

function StaffDetailPage() {
  const { id } = Route.useParams();
  const staffQuery = useStaffMember(id);
  const { data: departments } = useDepartments();
  const { data: settings } = useSettings();
  const month = monthKey(new Date());
  const attendanceQuery = useStaffAttendance(id, `${month}-01`, `${month}-31`);

  const money = currencyFormatter(settings?.currency ?? "INR");
  const staff = staffQuery.data;
  const rows = attendanceQuery.data ?? [];

  if (staffQuery.isError) return <ErrorNotice />;
  if (staffQuery.isLoading) return <LoadingRows />;
  if (!staff) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="Staff member not found"
        description="This record may have been deleted."
        action={
          <Button asChild variant="outline">
            <Link to="/staff">Back to staff</Link>
          </Button>
        }
      />
    );
  }

  const presentDays = rows.filter((r) => r.status !== "absent" && r.status !== "leave").length;
  const totalHours = rows.reduce((sum, r) => sum + Number(r.worked_hours), 0);
  const overtime = rows.reduce((sum, r) => sum + Number(r.overtime_hours), 0);

  const details: Array<[string, string]> = [
    ["Staff ID", staff.staff_code],
    ["Designation", staff.designation || "—"],
    ["Department", departments?.find((d) => d.id === staff.department_id)?.name ?? "—"],
    ["Mobile", staff.mobile || "—"],
    ["Email", staff.email || "—"],
    ["Address", staff.address || "—"],
    ["Date of joining", formatDate(staff.date_of_joining)],
    ["Working hours / day", `${Number(staff.working_hours)}h`],
    [
      "Salary",
      `${money(Number(staff.salary_amount))} ${staff.salary_type === "monthly" ? "per month" : "per day"}`,
    ],
  ];

  return (
    <>
      <div className="mb-4">
        <Button asChild variant="ghost" size="sm">
          <Link to="/staff">
            <ArrowLeft className="size-4" /> All staff
          </Link>
        </Button>
      </div>

      <div className="surface-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <StaffAvatar name={staff.full_name} path={staff.photo_path} className="size-16 text-lg" />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold">{staff.full_name}</h1>
            <Badge
              variant="secondary"
              className={
                staff.is_active
                  ? "bg-success-soft text-success"
                  : "bg-secondary text-muted-foreground"
              }
            >
              {staff.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="num text-sm text-muted-foreground">
            {staff.staff_code}
            {staff.designation ? ` · ${staff.designation}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <FaceRegisterDialog
            staff={staff}
            trigger={
              <Button variant={staff.face_descriptor ? "outline" : "default"}>
                <ScanFace className="size-4" /> Register Face
              </Button>
            }
          />
          <StaffFormDialog
            staff={staff}
            trigger={
              <Button variant="outline">
                <Pencil className="size-4" /> Edit
              </Button>
            }
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Days worked this month" value={presentDays} icon={CalendarCheck} tone="success" />
        <StatCard label="Hours this month" value={`${Math.round(totalHours * 10) / 10}h`} icon={Clock} tone="info" />
        <StatCard label="Overtime hours" value={`${Math.round(overtime * 10) / 10}h`} icon={Wallet} tone="warning" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <section className="surface-panel lg:col-span-2">
          <header className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Employee record</h2>
          </header>
          <dl className="divide-y divide-border">
            {details.map(([label, value]) => (
              <div key={label} className="flex gap-3 px-4 py-2.5 text-sm">
                <dt className="w-40 shrink-0 text-muted-foreground">{label}</dt>
                <dd className="min-w-0 flex-1 break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="surface-panel lg:col-span-3">
          <header className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Attendance this month</h2>
          </header>
          {attendanceQuery.isLoading ? (
            <LoadingRows />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No attendance this month"
              description="Records will appear here once attendance is marked."
            />
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li key={row.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="num w-28 shrink-0">{formatDate(row.date)}</span>
                  <span className="num flex-1 text-xs text-muted-foreground">
                    In {formatTime(row.check_in)} · Out {formatTime(row.check_out)} ·{" "}
                    {Number(row.worked_hours)}h
                  </span>
                  <Badge variant="secondary" className={STATUS_CLASS[row.status]}>
                    {STATUS_LABEL[row.status]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
