import { createFileRoute } from "@tanstack/react-router";
import { Building2, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { EmptyState, ErrorNotice, LoadingRows, PageHeader } from "@/components/ui-bits";
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
import { Switch } from "@/components/ui/switch";
import {
  useCreateDepartment,
  useDeleteDepartment,
  useDepartments,
  useSettings,
  useUpdateSettings,
} from "@/lib/api";
import type { AppSettings } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — StaffLedger" },
      {
        name: "description",
        content:
          "Configure business name, currency, work hours, late grace period, overtime rate, deduction rules and departments.",
      },
      { property: "og:title", content: "Settings — StaffLedger" },
      {
        property: "og:description",
        content: "Business rules that drive attendance status and salary calculation.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const settingsQuery = useSettings();
  const updateSettings = useUpdateSettings();
  const [form, setForm] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (settingsQuery.data) setForm(settingsQuery.data);
  }, [settingsQuery.data]);

  async function save() {
    if (!form) return;
    if (!form.business_name.trim()) {
      toast.error("Business name is required");
      return;
    }
    if (form.monthly_working_days < 1 || form.monthly_working_days > 31) {
      toast.error("Monthly working days must be between 1 and 31");
      return;
    }
    try {
      await updateSettings.mutateAsync({
        id: form.id,
        business_name: form.business_name.trim(),
        currency: form.currency,
        work_start: form.work_start,
        work_end: form.work_end,
        daily_working_hours: Number(form.daily_working_hours),
        monthly_working_days: Number(form.monthly_working_days),
        late_grace_minutes: Number(form.late_grace_minutes),
        late_deduction_amount: Number(form.late_deduction_amount),
        overtime_rate_per_hour: Number(form.overtime_rate_per_hour),
        deduct_absent: form.deduct_absent,
        paid_leave: form.paid_leave,
      });
      toast.success("Settings saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save settings");
    }
  }

  if (settingsQuery.isError) return <ErrorNotice />;
  if (!form) return <LoadingRows />;

  return (
    <>
      <PageHeader
        title="Settings"
        description="These rules drive late marking, overtime pay and salary deductions."
        actions={
          <Button onClick={() => void save()} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save changes
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface-panel p-5">
          <h2 className="text-sm font-semibold">Business</h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business-name">Business name</Label>
              <Input
                id="business-name"
                value={form.business_name}
                maxLength={120}
                onChange={(e) => setForm({ ...form, business_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={form.currency}
                onValueChange={(value) => setForm({ ...form, currency: value })}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["INR", "USD", "EUR", "GBP", "AED", "AUD", "CAD"].map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="surface-panel p-5">
          <h2 className="text-sm font-semibold">Working hours</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="work-start">Work start</Label>
              <Input
                id="work-start"
                type="time"
                value={form.work_start.slice(0, 5)}
                onChange={(e) => setForm({ ...form, work_start: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="work-end">Work end</Label>
              <Input
                id="work-end"
                type="time"
                value={form.work_end.slice(0, 5)}
                onChange={(e) => setForm({ ...form, work_end: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="daily-hours">Daily working hours</Label>
              <Input
                id="daily-hours"
                type="number"
                min={1}
                max={24}
                step={0.5}
                value={form.daily_working_hours}
                onChange={(e) =>
                  setForm({ ...form, daily_working_hours: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly-days">Working days per month</Label>
              <Input
                id="monthly-days"
                type="number"
                min={1}
                max={31}
                value={form.monthly_working_days}
                onChange={(e) =>
                  setForm({ ...form, monthly_working_days: Number(e.target.value) })
                }
              />
            </div>
          </div>
        </section>

        <section className="surface-panel p-5">
          <h2 className="text-sm font-semibold">Salary rules</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="grace">Late grace period (minutes)</Label>
              <Input
                id="grace"
                type="number"
                min={0}
                max={240}
                value={form.late_grace_minutes}
                onChange={(e) => setForm({ ...form, late_grace_minutes: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="late-deduction">Deduction per late day</Label>
              <Input
                id="late-deduction"
                type="number"
                min={0}
                step={1}
                value={form.late_deduction_amount}
                onChange={(e) =>
                  setForm({ ...form, late_deduction_amount: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="overtime-rate">Overtime rate per hour</Label>
              <Input
                id="overtime-rate"
                type="number"
                min={0}
                step={1}
                value={form.overtime_rate_per_hour}
                onChange={(e) =>
                  setForm({ ...form, overtime_rate_per_hour: Number(e.target.value) })
                }
              />
            </div>
            <label className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 sm:col-span-2">
              <span>
                <span className="block text-sm font-medium">Deduct pay for absent days</span>
                <span className="block text-xs text-muted-foreground">
                  Monthly-salary staff lose one day's pay per absent day.
                </span>
              </span>
              <Switch
                checked={form.deduct_absent}
                onCheckedChange={(checked) => setForm({ ...form, deduct_absent: checked })}
              />
            </label>
            <label className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 sm:col-span-2">
              <span>
                <span className="block text-sm font-medium">Paid leave</span>
                <span className="block text-xs text-muted-foreground">
                  Approved leave days are counted as payable days.
                </span>
              </span>
              <Switch
                checked={form.paid_leave}
                onCheckedChange={(checked) => setForm({ ...form, paid_leave: checked })}
              />
            </label>
          </div>
        </section>

        <DepartmentsCard />
      </div>
    </>
  );
}

function DepartmentsCard() {
  const departmentsQuery = useDepartments();
  const createDepartment = useCreateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const [name, setName] = useState("");

  async function add() {
    const value = name.trim();
    if (!value) {
      toast.error("Enter a department name");
      return;
    }
    try {
      await createDepartment.mutateAsync({ name: value });
      setName("");
      toast.success("Department added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add department");
    }
  }

  const departments = departmentsQuery.data ?? [];

  return (
    <section className="surface-panel p-5">
      <h2 className="text-sm font-semibold">Departments</h2>
      <div className="mt-4 flex gap-2">
        <Input
          value={name}
          maxLength={60}
          placeholder="e.g. Kitchen, Sales, Housekeeping"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void add();
          }}
        />
        <Button onClick={() => void add()} disabled={createDepartment.isPending}>
          <Plus className="size-4" /> Add
        </Button>
      </div>

      <div className="mt-4">
        {departmentsQuery.isLoading ? (
          <LoadingRows />
        ) : departments.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No departments yet"
            description="Departments let you group staff and filter reports."
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {departments.map((department) => (
              <li key={department.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="flex-1">{department.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${department.name}`}
                  className="text-destructive"
                  onClick={() => void deleteDepartment.mutateAsync(department.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
