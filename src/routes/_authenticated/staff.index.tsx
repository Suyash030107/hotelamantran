import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRoundCheck,
  UserRoundX,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { StaffAvatar } from "@/components/staff-avatar";
import { StaffFormDialog } from "@/components/staff-form-dialog";
import { EmptyState, ErrorNotice, LoadingRows, PageHeader } from "@/components/ui-bits";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDeleteStaff,
  useDepartments,
  useSettings,
  useStaffList,
  useUpdateStaff,
} from "@/lib/api";
import { currencyFormatter, formatDate } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/staff/")({
  head: () => ({
    meta: [
      { title: "Staff Directory — StaffLedger" },
      {
        name: "description",
        content:
          "Add, edit and search staff records with department, designation, salary type and working hours.",
      },
      { property: "og:title", content: "Staff Directory — StaffLedger" },
      {
        property: "og:description",
        content: "Manage your team's employment and salary records in one place.",
      },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState("all");

  const staffQuery = useStaffList();
  const { data: departments } = useDepartments();
  const { data: settings } = useSettings();
  const deleteStaff = useDeleteStaff();
  const updateStaff = useUpdateStaff();
  const money = currencyFormatter(settings?.currency ?? "INR");

  const staff = staffQuery.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return staff.filter((s) => {
      const matchesTerm =
        !term ||
        s.full_name.toLowerCase().includes(term) ||
        s.staff_code.toLowerCase().includes(term) ||
        (s.mobile ?? "").toLowerCase().includes(term) ||
        (s.designation ?? "").toLowerCase().includes(term);
      const matchesDept = department === "all" || s.department_id === department;
      const matchesStatus =
        status === "all" || (status === "active" ? s.is_active : !s.is_active);
      return matchesTerm && matchesDept && matchesStatus;
    });
  }, [staff, search, department, status]);

  // Auto-generated staff ID: one past the highest existing EMP number.
  const nextCode = useMemo(() => {
    const highest = staff.reduce((max, s) => {
      const n = Number(/^EMP(\d+)$/i.exec(s.staff_code.trim())?.[1] ?? 0);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    return `EMP${String(Math.max(highest, staff.length) + 1).padStart(3, "0")}`;
  }, [staff]);

  async function toggleActive(id: string, name: string, isActive: boolean) {
    try {
      await updateStaff.mutateAsync({ id, is_active: !isActive });
      toast.success(`${name} ${isActive ? "deactivated" : "reactivated"}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update staff");
    }
  }

  async function handleDelete(id: string, name: string) {
    try {
      await deleteStaff.mutateAsync(id);
      toast.success(`${name} deleted`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete staff");
    }
  }

  if (staffQuery.isError) return <ErrorNotice />;

  return (
    <>
      <PageHeader
        title="Staff"
        description="Every team member, their employment details and salary setup."
        actions={
          <StaffFormDialog
            suggestedCode={nextCode}
            trigger={
              <Button>
                <Plus className="size-4" /> Add staff
              </Button>
            }
          />
        }
      />

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, staff ID, mobile…"
            className="pl-9"
          />
        </div>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Department" />
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
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="surface-panel overflow-hidden">
        {staffQuery.isLoading ? (
          <LoadingRows />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title={staff.length === 0 ? "No staff added yet" : "No staff match your filters"}
            description={
              staff.length === 0
                ? "Add your first team member to start tracking attendance and salary."
                : "Try a different search term or clear the filters."
            }
            action={
              staff.length === 0 ? (
                <StaffFormDialog
                  suggestedCode={nextCode}
                  trigger={
                    <Button>
                      <Plus className="size-4" /> Add staff
                    </Button>
                  }
                />
              ) : null
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-sm md:table">
              <thead className="bg-muted/60 text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Staff</th>
                  <th className="px-4 py-3 font-medium">Department</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Salary</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <StaffAvatar name={s.full_name} path={s.photo_path} />
                        <div>
                          <p className="font-medium">{s.full_name}</p>
                          <p className="num text-xs text-muted-foreground">
                            {s.staff_code}
                            {s.designation ? ` · ${s.designation}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {departments?.find((d) => d.id === s.department_id)?.name ?? "—"}
                    </td>
                    <td className="num px-4 py-3 text-muted-foreground">
                      {formatDate(s.date_of_joining)}
                    </td>
                    <td className="num px-4 py-3">
                      {money(Number(s.salary_amount))}
                      <span className="text-xs text-muted-foreground">
                        {s.salary_type === "monthly" ? " /mo" : " /day"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={
                          s.is_active
                            ? "bg-success-soft text-success"
                            : "bg-secondary text-muted-foreground"
                        }
                      >
                        {s.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" aria-label="View">
                          <Link to="/staff/$id" params={{ id: s.id }}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <StaffFormDialog
                          staff={s}
                          trigger={
                            <Button variant="ghost" size="icon" aria-label="Edit">
                              <Pencil className="size-4" />
                            </Button>
                          }
                        />
                        <DeleteStaffButton
                          name={s.full_name}
                          onConfirm={() => void handleDelete(s.id, s.full_name)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <ul className="divide-y divide-border md:hidden">
              {filtered.map((s) => (
                <li key={s.id} className="flex items-center gap-3 p-4">
                  <StaffAvatar name={s.full_name} path={s.photo_path} />
                  <Link to="/staff/$id" params={{ id: s.id }} className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.full_name}</p>
                    <p className="num truncate text-xs text-muted-foreground">
                      {s.staff_code} · {money(Number(s.salary_amount))}
                      {s.salary_type === "monthly" ? "/mo" : "/day"}
                    </p>
                  </Link>
                  <Badge
                    variant="secondary"
                    className={
                      s.is_active
                        ? "bg-success-soft text-success"
                        : "bg-secondary text-muted-foreground"
                    }
                  >
                    {s.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <StaffFormDialog
                    staff={s}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label="Edit">
                        <Pencil className="size-4" />
                      </Button>
                    }
                  />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}

export function DeleteStaffButton({
  name,
  onConfirm,
}: {
  name: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Delete" className="text-destructive">
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the staff record and all of their attendance and salary
            history. To keep history, edit the member and mark them inactive instead.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete permanently</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
