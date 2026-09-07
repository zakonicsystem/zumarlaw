// Calendar-month salary: two paid leaves; holidays and leave relief are paid.
export function calculateSalary(salary, records, year, month) {
  const recMap = new Map(records.map(record => [record.date, record]));
  const workingDays = new Date(year, month, 0).getDate();
  let sundays = 0, present = 0, leave = 0, leaveRelief = 0, holiday = 0, absent = 0, halfDay = 0;
  for (let day = 1; day <= workingDays; day++) {
    const isSunday = new Date(year, month - 1, day).getDay() === 0;
    const date = [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
    if (isSunday) sundays++;
    const rec = recMap.get(date);
    if (rec) {
      if (rec.holiday) holiday++;
      else if (rec.leaveRelief) leaveRelief++;
      else if (rec.halfDay) halfDay++;
      else if (rec.leave) leave++;
      else if (rec.present) present++;
      else absent++;
    } else if (!isSunday) {
      absent++;
    }
  }
  const baseSalary = parseFloat(salary || '0') || 0;
  const perDaySalary = baseSalary / workingDays;
  const extraLeaves = Math.max(0, leave - 2);
  const cutDays = absent + extraLeaves + halfDay * 0.5;
  const finalSalary = Math.round(baseSalary - cutDays * perDaySalary);
  return { baseSalary, workingDays, perDaySalary, extraLeaves, present, absent, halfDay, leave, holiday, leaveRelief, sundays, cutDays, finalSalary };
}
