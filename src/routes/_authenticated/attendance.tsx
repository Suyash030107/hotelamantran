import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Camera, Check, Download, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { CameraAttendanceDialog } from "@/components/camera-attendance";
import { StaffAvatar } from "@/components/staff-avatar";
import { EmptyState, ErrorNotice, LoadingRows, PageHeader, StatCard } from "@/components/ui-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  useAttendanceByDate,
  useCreateLeave,
  useDeleteAttendance,
  useDeleteLeave,
  useLeaveRecords,
  useSettings,
  useStaffList,
  useUpsertAttendance,
} from "@/lib/api";
import { downloadCsv } from "@/lib/export";
import {
  ATTENDANCE_STATUSES,
  formatDate,
  formatTime,
  STATUS_CLASS,
  STATUS_LABEL,
  todayKey,
  type AttendanceStatus,
} from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — StaffLedger" },
      {
        name: "description",
        content:
          "Mark daily attendance with camera check-in, edit records, track working hours and manage staff leave.",
      },
      { property: "og:title", content: "Attendance — StaffLedger" },
      {
        property: "og:description",
        content: "Daily attendance marking, camera check-in and leave management.",
      },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const [date, setDate] = useState(todayKey());

  const staffQuery = useStaffList();
  const { data: settings } = useSettings();
  const dayQuery = useAttendanceByDate(date);
  const upsert = useUpsertAttendance();
  const removeRow = useDeleteAttendance();

  const staff = (staffQuery.data ?? []).filter((s) => s.is_active);
  const rows = dayQuery.data ?? [];
  const byStaff = new Map(rows.map((row) => [row.staff_id, row]));

  const present = rows.filter((r) => r.status === "present" || r.status === "late").length;
  const onLeave = rows.filter((r) => r.status === "leave").length;
  const marked = rows.length;

  async function setStatus(staffId: string, status: AttendanceStatus) {
    const existing = byStaff.get(staffId);
    try {
      await upsert.mutateAsync({
        staff_id: staffId,
        date,
        status,
        check_in: existing?.check_in ?? null,
        check_out: existing?.check_out ?? null,
        worked_hours: existing?.worked_hours ?? 0,
        overtime_hours: existing?.overtime_hours ?? 0,
        photo_path: existing?.photo_path ?? null,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save attendance");
    }
  }

  async function markAllPresent() {
    try {
      for (const member of staff) {
        if (!byStaff.has(member.id)) {
          await upsert.mutateAsync({ staff_id: member.id, date, status: "present" });
        }
      }
      toast.success("Remaining staff marked present");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not mark attendance");
    }
  }

  function exportDay() {
    downloadCsv(`attendance-${date}.csv`, [
      ["Staff ID", "Name", "Status", "Check in", "Check out", "Hours", "Overtime"],
      ...staff.map((member) => {
        const row = byStaff.get(member.id);
        return [
          member.staff_code,
          member.full_name,
          row ? STATUS_LABEL[row.status] : "Not marked",
          formatTime(row?.check_in ?? null),
          formatTime(row?.check_out ?? null),
          Number(row?.worked_hours ?? 0),
          Number(row?.overtime_hours ?? 0),
        ];
      }),
    ]);
  }

  if (staffQuery.isError || dayQuery.isError) return <ErrorNotice />;

  return (
    <>
      <PageHeader
        title="Attendance"
        description="Mark attendance for any date, capture camera check-ins and manage leave."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportDay} disabled={staff.length === 0}>
              <Download className="size-4" /> Export CSV
            </Button>
            {settings && staff.length > 0 ? (
              <CameraAttendanceDialog
                staff={staff}
                settings={settings}
                trigger={
                  <Button size="lg" className="shadow-sm">
                    <Camera className="size-4" /> 📸 Mark Attendance
                  </Button>
                }
              />
            ) : null}
          </div>
        }
      />

      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Daily marking</TabsTrigger>
          <TabsTrigger value="leave">Leave records</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Staff" value={staff.length} icon={CalendarCheck} />
            <StatCard label="Present / late" value={present} icon={Check} tone="success" />
            <StatCard label="On leave" value={onLeave} icon={CalendarCheck} tone="info" />
            <StatCard
              label="Not marked"
              value={Math.max(0, staff.length - marked)}
              icon={CalendarCheck}
              tone="warning"
            />
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="attendance-date">Date</Label>
              <Input
                id="attendance-date"
                type="date"
                value={date}
                max={todayKey()}
                onChange={(e) => setDate(e.target.value || todayKey())}
                className="num w-44"
              />
            </div>
            <Button variant="outline" onClick={() => void markAllPresent()} disabled={!staff.length}>
              <Check className="size-4" /> Mark rest present
            </Button>
          </div>

          <div className="surface-panel overflow-hidden">
            {dayQuery.isLoading || staffQuery.isLoading ? (
              <LoadingRows />
            ) : staff.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No active staff"
                description="Add staff members before marking attendance."
              />
            ) : (
              <ul className="divide-y divide-border">
                {staff.map((member) => {
                  const row = byStaff.get(member.id);
                  return (
                    <li
                      key={member.id}
                      className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
                    >
                      <StaffAvatar name={member.full_name} path={member.photo_path} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{member.full_name}</p>
                        <p className="num text-xs text-muted-foreground">
                          {member.staff_code} · In {formatTime(row?.check_in ?? null)} · Out{" "}
                          {formatTime(row?.check_out ?? null)} · {Number(row?.worked_hours ?? 0)}h
                        </p>
                      </div>
                      {row ? (
                        <Badge variant="secondary" className={STATUS_CLASS[row.status]}>
                          {STATUS_LABEL[row.status]}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Not marked</Badge>
                      )}
                      <Select
                        value={row?.status ?? ""}
                        onValueChange={(value) => void setStatus(member.id, value as AttendanceStatus)}
                      >
                        <SelectTrigger className="w-36" aria-label={`Status for ${member.full_name}`}>
                          <SelectValue placeholder="Set status" />
                        </SelectTrigger>
                        <SelectContent>
                          {ATTENDANCE_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {STATUS_LABEL[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {row ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Clear record"
                          className="text-destructive"
                          onClick={() => void removeRow.mutateAsync(row.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="leave">
          <LeaveSection />
        </TabsContent>
      </Tabs>
    </>
  );
}

function LeaveSection() {
  const { data: staff } = useStaffList();
  const leaveQuery = useLeaveRecords();
  const createLeave = useCreateLeave();
  const deleteLeave = useDeleteLeave();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    staff_id: "",
    leave_type: "paid",
    start_date: todayKey(),
    end_date: todayKey(),
    reason: "",
  });

  async function submit() {
    if (!form.staff_id) {
      toast.error("Select a staff member");
      return;
    }
    if (form.end_date < form.start_date) {
      toast.error("End date cannot be before the start date");
      return;
    }
    try {
      await createLeave.mutateAsync({
        staff_id: form.staff_id,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason.trim() || null,
        status: "approved",
      });
      toast.success("Leave recorded");
      setOpen(false);
      setForm({ ...form, staff_id: "", reason: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save leave");
    }
  }

  const records = leaveQuery.data ?? [];

  return (
    <div className="surface-panel overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Leave records</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" /> Add leave
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record leave</DialogTitle>
              <DialogDescription>
                Approved leave is used by the salary engine when paid leave is enabled in settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="leave-staff">Staff member</Label>
                <Select
                  value={form.staff_id}
                  onValueChange={(value) => setForm({ ...form, staff_id: value })}
                >
                  <SelectTrigger id="leave-staff">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {(staff ?? []).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.full_name} · {s.staff_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="leave-type">Type</Label>
                  <Select
                    value={form.leave_type}
                    onValueChange={(value) => setForm({ ...form, leave_type: value })}
                  >
                    <SelectTrigger id="leave-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leave-start">From</Label>
                  <Input
                    id="leave-start"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leave-end">To</Label>
                  <Input
                    id="leave-end"
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-reason">Reason</Label>
                <Textarea
                  id="leave-reason"
                  value={form.reason}
                  maxLength={500}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Optional note"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void submit()} disabled={createLeave.isPending}>
                Save leave
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {leaveQuery.isLoading ? (
        <LoadingRows />
      ) : records.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No leave recorded"
          description="Add leave so salary calculations account for approved days off."
        />
      ) : (
        <ul className="divide-y divide-border">
          {records.map((record) => {
            const member = staff?.find((s) => s.id === record.staff_id);
            return (
              <li key={record.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{member?.full_name ?? "Unknown staff"}</p>
                  <p className="num text-xs text-muted-foreground">
                    {formatDate(record.start_date)} → {formatDate(record.end_date)}
                    {record.reason ? ` · ${record.reason}` : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {record.leave_type}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Delete leave"
                  className="text-destructive"
                  onClick={() => void deleteLeave.mutateAsync(record.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
