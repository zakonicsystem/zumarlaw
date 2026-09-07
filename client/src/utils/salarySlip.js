// Round after attendance deductions, never round the daily rate first.
export function salarySlipTotals(rec, monthDays, cutDays) {
  const baseSalary = Number(rec.baseSalary ?? rec.salary ?? rec.finalSalary ?? 0);
  const dailyRate = monthDays ? baseSalary / monthDays : 0;
  const attendanceSalary = Math.round(baseSalary - dailyRate * cutDays);
  const cutDeduction = baseSalary - attendanceSalary;
  const medical = Number(rec.medicalAllowance ?? rec.medical ?? 0);
  const traveling = Number(rec.travelingAllowance ?? rec.travellingAllowance ?? 0);
  const overtime = Number(rec.overtimePay ?? 0);
  const holiday = Number(rec.holidayPay ?? 0);
  const payTax = Number(rec.payTax ?? 0);
  // 'leaves' is an attendance count, never a currency deduction.
  const leaveDeductions = Number(rec.leaveDeductions ?? 0);
  const loan = Number(rec.loan ?? rec.loanDeduction ?? 0);
  const gross = baseSalary + medical + traveling + overtime + holiday;
  const totalDeductions = cutDeduction + payTax + leaveDeductions + loan;
  return { baseSalary, dailyRate, cutDeduction, medical, traveling, overtime, holiday, payTax, leaveDeductions, loan, gross, totalDeductions, netPay: Math.round(gross - totalDeductions) };
}
