import type { AppSettings, Attendance, Staff } from "./domain";

export type SalaryBreakdown = {
  workingDays: number;
  presentDays: number;
  lateCount: number;
  halfDays: number;
  leaveDays: number;
  absentDays: number;
  payableDays: number;
  overtimeHours: number;
  perDayRate: number;
  grossSalary: number;
  overtimeAmount: number;
  absentDeduction: number;
  lateDeduction: number;
  deductions: number;
  netSalary: number;
};

/**
 * Salary engine. Uses attendance rows for a single staff member in one month
 * plus the business rules stored in settings.
 */
export function computeSalary(
  staff: Pick<Staff, "salary_type" | "salary_amount">,
  records: Attendance[],
  settings: AppSettings,
): SalaryBreakdown {
  const configuredWorkingDays = settings.monthly_working_days || 26;

  let presentDays = 0;
  let lateCount = 0;
  let halfDays = 0;
  let leaveDays = 0;
  let absentDays = 0;
  let overtimeHours = 0;

  for (const row of records) {
    overtimeHours += Number(row.overtime_hours ?? 0);
    switch (row.status) {
      case "present":
        presentDays += 1;
        break;
      case "late":
        presentDays += 1;
        lateCount += 1;
        break;
      case "half_day":
        halfDays += 1;
        break;
      case "leave":
        leaveDays += 1;
        break;
      case "absent":
        absentDays += 1;
        break;
    }
  }

  const paidLeaveDays = settings.paid_leave ? leaveDays : 0;
  const payableDays = presentDays + halfDays * 0.5 + paidLeaveDays;

  const salaryAmount = Number(staff.salary_amount ?? 0);
  const perDayRate =
    staff.salary_type === "monthly"
      ? salaryAmount / configuredWorkingDays
      : salaryAmount;

  const unpaidDays =
    absentDays + halfDays * 0.5 + (settings.paid_leave ? 0 : leaveDays);

  let grossSalary: number;
  let absentDeduction = 0;

  if (staff.salary_type === "monthly") {
    grossSalary = salaryAmount;
    absentDeduction = settings.deduct_absent ? perDayRate * unpaidDays : 0;
  } else {
    grossSalary = perDayRate * payableDays;
  }

  const lateDeduction = lateCount * Number(settings.late_deduction_amount ?? 0);
  const overtimeAmount =
    overtimeHours * Number(settings.overtime_rate_per_hour ?? 0);
  const deductions = absentDeduction + lateDeduction;
  const netSalary = Math.max(0, grossSalary - deductions + overtimeAmount);

  const round = (n: number) => Math.round(n * 100) / 100;

  return {
    workingDays: configuredWorkingDays,
    presentDays,
    lateCount,
    halfDays,
    leaveDays,
    absentDays,
    payableDays: round(payableDays),
    overtimeHours: round(overtimeHours),
    perDayRate: round(perDayRate),
    grossSalary: round(grossSalary),
    overtimeAmount: round(overtimeAmount),
    absentDeduction: round(absentDeduction),
    lateDeduction: round(lateDeduction),
    deductions: round(deductions),
    netSalary: round(netSalary),
  };
}

export function estimateMonthlyCost(
  staff: Pick<Staff, "salary_type" | "salary_amount" | "is_active">[],
  settings: AppSettings,
): number {
  return staff
    .filter((s) => s.is_active)
    .reduce((sum, s) => {
      const amount = Number(s.salary_amount ?? 0);
      return (
        sum +
        (s.salary_type === "monthly"
          ? amount
          : amount * (settings.monthly_working_days || 26))
      );
    }, 0);
}
