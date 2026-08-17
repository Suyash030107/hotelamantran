import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

import type {
  AppSettings,
  Attendance,
  Department,
  LeaveRecord,
  SalaryRecord,
  Staff,
} from "./domain";

function unwrap<T>({ data, error }: { data: T | null; error: unknown }): T {
  if (error) throw error;
  return data as T;
}

/* ---------------------------------- auth --------------------------------- */

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  });
}

/* -------------------------------- settings ------------------------------- */

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () =>
      unwrap<AppSettings>(
        await supabase
          .from("settings")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ),
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: TablesUpdate<"settings"> & { id: string }) => {
      const { error } = await supabase.from("settings").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
}

/* ------------------------------ departments ------------------------------ */

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () =>
      unwrap<Department[]>(
        await supabase.from("departments").select("*").order("name"),
      ),
  });
}

export function useCreateDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: TablesInsert<"departments">) => {
      const { error } = await supabase.from("departments").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

export function useDeleteDepartment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["departments"] });
    },
  });
}

/* --------------------------------- staff --------------------------------- */

export function useStaffList() {
  return useQuery({
    queryKey: ["staff"],
    queryFn: async () =>
      unwrap<Staff[]>(
        await supabase.from("staff").select("*").order("full_name"),
      ),
  });
}

export function useStaffMember(id: string) {
  return useQuery({
    queryKey: ["staff", id],
    queryFn: async () =>
      unwrap<Staff>(
        await supabase.from("staff").select("*").eq("id", id).maybeSingle(),
      ),
    enabled: Boolean(id),
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: TablesInsert<"staff">) => {
      const { data, error } = await supabase
        .from("staff")
        .insert(values)
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: TablesUpdate<"staff"> & { id: string }) => {
      const { error } = await supabase.from("staff").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["staff"] });
      void qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

/* ------------------------------- attendance ------------------------------ */

export function useAttendanceByDate(date: string) {
  return useQuery({
    queryKey: ["attendance", "date", date],
    queryFn: async () =>
      unwrap<Attendance[]>(
        await supabase.from("attendance").select("*").eq("date", date),
      ),
  });
}

export function useAttendanceRange(start: string, end: string) {
  return useQuery({
    queryKey: ["attendance", "range", start, end],
    queryFn: async () =>
      unwrap<Attendance[]>(
        await supabase
          .from("attendance")
          .select("*")
          .gte("date", start)
          .lte("date", end)
          .order("date"),
      ),
  });
}

export function useStaffAttendance(staffId: string, start: string, end: string) {
  return useQuery({
    queryKey: ["attendance", "staff", staffId, start, end],
    queryFn: async () =>
      unwrap<Attendance[]>(
        await supabase
          .from("attendance")
          .select("*")
          .eq("staff_id", staffId)
          .gte("date", start)
          .lte("date", end)
          .order("date"),
      ),
    enabled: Boolean(staffId),
  });
}

export function useUpsertAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: TablesInsert<"attendance">) => {
      const { data, error } = await supabase
        .from("attendance")
        .upsert(values, { onConflict: "staff_id,date" })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

export function useDeleteAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("attendance").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["attendance"] });
    },
  });
}

/* --------------------------------- leave --------------------------------- */

export function useLeaveRecords() {
  return useQuery({
    queryKey: ["leave"],
    queryFn: async () =>
      unwrap<LeaveRecord[]>(
        await supabase
          .from("leave_records")
          .select("*")
          .order("start_date", { ascending: false }),
      ),
  });
}

export function useCreateLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: TablesInsert<"leave_records">) => {
      const { error } = await supabase.from("leave_records").insert(values);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["leave"] });
    },
  });
}

export function useDeleteLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leave_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["leave"] });
    },
  });
}

/* --------------------------------- salary -------------------------------- */

export function useSalaryRecords(month: string) {
  return useQuery({
    queryKey: ["salary", month],
    queryFn: async () =>
      unwrap<SalaryRecord[]>(
        await supabase.from("salary_records").select("*").eq("month", month),
      ),
  });
}

export function useSaveSalaryRecords() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: TablesInsert<"salary_records">[]) => {
      const { error } = await supabase
        .from("salary_records")
        .upsert(rows, { onConflict: "staff_id,month" });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["salary"] });
    },
  });
}

export function useUpdateSalaryStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payment_status }: { id: string; payment_status: string }) => {
      const { error } = await supabase
        .from("salary_records")
        .update({ payment_status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["salary"] });
    },
  });
}

/* -------------------------------- storage -------------------------------- */

export async function uploadPhoto(folder: string, file: Blob, ext = "jpg") {
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("photos").upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export function usePhotoUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["photo", path],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("photos")
        .createSignedUrl(path as string, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: Boolean(path),
    staleTime: 50 * 60 * 1000,
  });
}
