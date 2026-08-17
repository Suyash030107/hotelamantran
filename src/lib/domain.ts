import type { Tables } from "@/integrations/supabase/types";

export type Staff = Tables<"staff">;
export type Attendance = Tables<"attendance">;
export type Department = Tables<"departments">;
export type SalaryRecord = Tables<"salary_records">;
export type LeaveRecord = Tables<"leave_records">;
export type AppSettings = Tables<"settings">;
export type AttendanceStatus = Attendance["status"];
export type SalaryKind = Staff["salary_type"];

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "present",
  "late",
  "half_day",
  "leave",
  "absent",
];

export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  half_day: "Half Day",
  leave: "Leave",
  absent: "Absent",
};

/** Semantic badge class per attendance status (design-token driven). */
export const STATUS_CLASS: Record<AttendanceStatus, string> = {
  present: "bg-success-soft text-success",
  late: "bg-warning-soft text-accent-foreground",
  half_day: "bg-info-soft text-info",
  leave: "bg-secondary text-secondary-foreground",
  absent: "bg-destructive-soft text-destructive",
};

export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** First day of a month as YYYY-MM-01 */
export function monthKey(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}-01`;
}

export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(y!, (m ?? 1) - 1, 1);
  const end = new Date(y!, m ?? 1, 0);
  return { start: toDateKey(start), end: toDateKey(end) };
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function formatTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function hoursBetween(from: string, to: string): number {
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.round((diff / 3600000) * 100) / 100);
}

export function currencyFormatter(currency: string) {
  return (value: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      return `${currency} ${Math.round(value).toLocaleString()}`;
    }
  };
}

/** Is a check-in late, given settings? */
export function isLateCheckIn(
  checkIn: Date,
  workStart: string,
  graceMinutes: number,
): boolean {
  const [h, m] = workStart.split(":").map(Number);
  const threshold = new Date(checkIn);
  threshold.setHours(h ?? 9, (m ?? 0) + graceMinutes, 0, 0);
  return checkIn.getTime() > threshold.getTime();
}
