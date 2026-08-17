import { Loader2, Upload } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { StaffAvatar } from "@/components/staff-avatar";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  uploadPhoto,
  useCreateStaff,
  useDepartments,
  useUpdateStaff,
} from "@/lib/api";
import type { Staff } from "@/lib/domain";

const schema = z.object({
  staff_code: z.string().trim().min(1, "Staff ID is required").max(30),
  full_name: z.string().trim().min(2, "Full name is required").max(120),
  mobile: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9+\-\s()]*$/, "Mobile number looks invalid")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().max(255).email("Invalid email").optional().or(z.literal("")),
  address: z.string().trim().max(400).optional().or(z.literal("")),
  date_of_joining: z.string().optional().or(z.literal("")),
  designation: z.string().trim().max(100).optional().or(z.literal("")),
  salary_amount: z.coerce.number().min(0, "Salary cannot be negative").max(100000000),
  working_hours: z.coerce.number().min(1, "At least 1 hour").max(24),
});

type FormState = {
  staff_code: string;
  full_name: string;
  mobile: string;
  email: string;
  address: string;
  date_of_joining: string;
  department_id: string;
  designation: string;
  salary_type: "monthly" | "daily";
  salary_amount: string;
  working_hours: string;
  is_active: boolean;
  photo_path: string | null;
};

function toState(staff?: Staff | null): FormState {
  return {
    staff_code: staff?.staff_code ?? "",
    full_name: staff?.full_name ?? "",
    mobile: staff?.mobile ?? "",
    email: staff?.email ?? "",
    address: staff?.address ?? "",
    date_of_joining: staff?.date_of_joining ?? "",
    department_id: staff?.department_id ?? "none",
    designation: staff?.designation ?? "",
    salary_type: staff?.salary_type ?? "monthly",
    salary_amount: staff ? String(staff.salary_amount) : "",
    working_hours: staff ? String(staff.working_hours) : "8",
    is_active: staff?.is_active ?? true,
    photo_path: staff?.photo_path ?? null,
  };
}

export function StaffFormDialog({
  staff,
  trigger,
  suggestedCode,
}: {
  staff?: Staff | null;
  trigger: ReactNode;
  suggestedCode?: string;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(() => toState(staff));
  const [uploading, setUploading] = useState(false);
  const { data: departments } = useDepartments();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();
  const saving = createStaff.isPending || updateStaff.isPending;

  useEffect(() => {
    if (open) {
      const next = toState(staff);
      if (!staff && suggestedCode) next.staff_code = suggestedCode;
      setForm(next);
    }
  }, [open, staff, suggestedCode]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be smaller than 5 MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = await uploadPhoto("staff", file, ext);
      set("photo_path", path);
      toast.success("Photo uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Photo upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }

    const payload = {
      staff_code: parsed.data.staff_code,
      full_name: parsed.data.full_name,
      mobile: form.mobile || null,
      email: form.email || null,
      address: form.address || null,
      date_of_joining: form.date_of_joining || null,
      department_id: form.department_id === "none" ? null : form.department_id,
      designation: form.designation || null,
      salary_type: form.salary_type,
      salary_amount: parsed.data.salary_amount,
      working_hours: parsed.data.working_hours,
      is_active: form.is_active,
      photo_path: form.photo_path,
    };

    try {
      if (staff) {
        await updateStaff.mutateAsync({ id: staff.id, ...payload });
        toast.success("Staff updated");
      } else {
        await createStaff.mutateAsync(payload);
        toast.success("Staff added");
      }
      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save staff";
      toast.error(
        message.includes("duplicate") ? "That Staff ID is already in use" : message,
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{staff ? "Edit staff member" : "Add staff member"}</DialogTitle>
          <DialogDescription>
            Employment and salary details are used to calculate attendance and payroll.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-4">
            <StaffAvatar
              name={form.full_name || "New"}
              path={form.photo_path}
              className="size-16 text-base"
            />
            <div>
              <Label htmlFor="photo" className="mb-2 block">
                Profile photo
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  className="max-w-56"
                  onChange={(e) => void handlePhoto(e.target.files?.[0])}
                />
                {uploading ? (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="size-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="staff_code">Staff ID *</Label>
              <Input
                id="staff_code"
                value={form.staff_code}
                onChange={(e) => set("staff_code", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name *</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile number</Label>
              <Input
                id="mobile"
                inputMode="tel"
                value={form.mobile}
                onChange={(e) => set("mobile", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">Email</Label>
              <Input
                id="staff-email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doj">Date of joining</Label>
              <Input
                id="doj"
                type="date"
                value={form.date_of_joining}
                onChange={(e) => set("date_of_joining", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                value={form.department_id}
                onValueChange={(value) => set("department_id", value)}
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No department</SelectItem>
                  {(departments ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={form.designation}
                onChange={(e) => set("designation", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary_type">Salary type</Label>
              <Select
                value={form.salary_type}
                onValueChange={(value) => set("salary_type", value as "monthly" | "daily")}
              >
                <SelectTrigger id="salary_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary_amount">
                Salary amount ({form.salary_type === "monthly" ? "per month" : "per day"})
              </Label>
              <Input
                id="salary_amount"
                inputMode="decimal"
                value={form.salary_amount}
                onChange={(e) => set("salary_amount", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="working_hours">Working hours per day</Label>
              <Input
                id="working_hours"
                inputMode="decimal"
                value={form.working_hours}
                onChange={(e) => set("working_hours", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              rows={2}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <Label htmlFor="is_active">Active staff member</Label>
              <p className="text-xs text-muted-foreground">
                Inactive staff are excluded from attendance and payroll totals.
              </p>
            </div>
            <Switch
              id="is_active"
              checked={form.is_active}
              onCheckedChange={(value) => set("is_active", value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {staff ? "Save changes" : "Add staff"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
