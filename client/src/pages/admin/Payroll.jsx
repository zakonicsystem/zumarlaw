import { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Edit, Trash2 } from "lucide-react";
import { FaMoneyBillWave, FaFilePdf } from "react-icons/fa";
import jsPDF from 'jspdf';
import ZumarLogo from '../../assets/Zumar Logo.jpg';
import { toast } from "react-hot-toast";

const tabs = [
  { name: "This Month", count: 0 },
  { name: "All Records", count: 0 },
];

export default function Payroll() {

  const [activeTab, setActiveTab] = useState("This Month");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [payrolls, setPayrolls] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentRec, setPaymentRec] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentAccount, setPaymentAccount] = useState('');
  const [paymentCheque, setPaymentCheque] = useState('');
  const [paymentPaidBy, setPaymentPaidBy] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  // Removed Auto Pay state variables
  const perPage = 5;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoading(true);
      try {
        const res = await axios.get("http://localhost:5000/admin/roles", { withCredentials: true });
        setEmployeeList(res.data);
      } catch (err) {
        setEmployeeList([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchPayrolls = async () => {
      setLoading(true);
      try {
        // If filterMonth is provided (YYYY-MM), pass as query param
        const url = filterMonth ? `http://localhost:5000/payrolls?month=${encodeURIComponent(filterMonth)}` : 'http://localhost:5000/payrolls';
        const res = await axios.get(url);
        setPayrolls(res.data || []);
      } catch (err) {
        console.error('Failed to fetch payrolls', err);
        setPayrolls([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPayrolls();
  }, [filterMonth]);

  const statusColor = {
    Paid: "bg-green-100 text-green-700",
    Pending: "bg-yellow-100 text-yellow-700",
    Unpaid: "bg-red-100 text-red-700",
  };

  // Filtering logic
  const filtered = payrolls.filter((rec) => {
    const matchSearch =
      rec.employee?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec._id?.includes(searchTerm);
    const matchDate = filterDate ? rec.paymentDate?.slice(0, 10) === filterDate : true;
    return matchSearch && matchDate;
  });

  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payroll?")) return;
    try {
      setLoading(true);
      await axios.delete(`http://localhost:5000/payrolls/${id}`);
      setPayrolls((prev) => prev.filter((p) => p._id !== id));
      toast.success("Payroll deleted successfully!");
    } catch (err) {
      console.error("Delete payroll error:", err);
      toast.error(err?.response?.data?.error || "Failed to delete payroll");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rec) => {
    setEditData(rec);
    setEditModal(true);
  };

  const openPaymentModal = (rec) => {
    setPaymentRec(rec);
    setPaymentMethod(rec.paymentMethod || 'Cash');
    setPaymentAccount(rec.accountNumber || '');
    setPaymentCheque(rec.chequeNumber || '');
    setPaymentPaidBy(rec.paidBy || '');
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setPaymentRec(null);
    setPaymentMethod('Cash');
    setPaymentAccount('');
    setPaymentCheque('');
    setPaymentPaidBy('');
    setPaymentLoading(false);
  };

  const handleMarkPaid = async () => {
    if (!paymentRec) return;
    setPaymentLoading(true);
    try {
      const updated = {
        ...paymentRec,
        status: 'Paid',
        paymentMethod,
        accountNumber: paymentMethod === 'Bank' ? paymentAccount : paymentRec.accountNumber,
        chequeNumber: paymentMethod === 'Cheque' ? paymentCheque : paymentRec.chequeNumber,
        paidBy: paymentPaidBy || paymentRec.paidBy,
        paymentDate: new Date().toISOString(),
      };
      // Update server (PUT replaces the payroll object)
      await axios.put(`http://localhost:5000/payrolls/${paymentRec._id}`, updated);
      setPayrolls((prev) => prev.map((p) => (p._id === paymentRec._id ? updated : p)));
      toast.success('Payment recorded and status set to Paid');
      closePaymentModal();
    } catch (err) {
      console.error('Mark paid error', err);
      toast.error('Failed to record payment');
    }
    setPaymentLoading(false);
  };

  const formatCurrency = (v) => {
    const n = Number(v) || 0;
    return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  // Minimal number-to-words helper (used for Amount in words)
  const numberToWords = {
    toWords: (num) => {
      if (num === 0) return 'zero';
      const a = ['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
      const b = ['','', 'twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
      const thousand = (n) => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n/10)] + (n%10 ? ' ' + a[n%10] : '');
        if (n < 1000) return a[Math.floor(n/100)] + ' hundred' + (n%100 ? ' ' + thousand(n%100) : '');
        for (let i = 0, p = ['','thousand','million','billion']; i < p.length; i++) {
          const pow = Math.pow(1000, i+1);
          if (n < pow) {
            const high = Math.floor(n / Math.pow(1000, i));
            const rem = n % Math.pow(1000, i);
            return thousand(high) + ' ' + p[i] + (rem ? ' ' + thousand(rem) : '');
          }
        }
        return '';
      };
      return thousand(Math.abs(Math.floor(num)));
    }
  };

  const handleSalarySlip = async (rec) => {
    // Ensure we have cutDays and base salary. If missing, call server autoSalary/calculate for the payroll month
    let enhancedRec = { ...rec };
    try {
      const pm = rec.payrollMonth || (rec.paymentDate ? (rec.paymentDate + '').slice(0,7) : null); // YYYY-MM
      if (pm) {
        const [yStr, mStr] = pm.split('-');
        const year = Number(yStr);
        const month = Number(mStr);
        if ((!enhancedRec.cutDays && enhancedRec.cutDays !== 0) || (!enhancedRec.baseSalary && enhancedRec.baseSalary !== 0)) {
          const resp = await axios.post('http://localhost:5000/autoSalary/calculate', { year, month }).catch(() => null);
          if (resp && Array.isArray(resp.data)) {
            const found = resp.data.find(r => String(r.employee).toLowerCase() === String(rec.employee).toLowerCase());
            if (found) {
              // Map fields from autoSalary result - merge all attendance counts so the payslip can display them
              enhancedRec.cutDays = enhancedRec.cutDays ?? (found.cutDays ?? 0);
              enhancedRec.baseSalary = enhancedRec.baseSalary ?? (found.baseSalary ?? 0);
              enhancedRec.present = enhancedRec.present ?? (found.present ?? 0);
              enhancedRec.absent = enhancedRec.absent ?? (found.absent ?? 0);
              enhancedRec.leave = enhancedRec.leave ?? (found.leave ?? 0);
              enhancedRec.halfDay = enhancedRec.halfDay ?? (found.halfDay ?? 0);
              // autoSalary returns `holiday` (singular) for count
              enhancedRec.holiday = enhancedRec.holiday ?? (found.holiday ?? 0);
              enhancedRec.leaveRelief = enhancedRec.leaveRelief ?? (found.leaveRelief ?? 0);
              enhancedRec.sundays = enhancedRec.sundays ?? (found.sundays ?? 0);
              enhancedRec.finalSalary = enhancedRec.finalSalary ?? (found.finalSalary ?? 0);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to fetch salary breakdown, proceeding with available data', e);
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.src = ZumarLogo;
    const generate = (dataUrl) => {
      try {
        const pdf = new jsPDF('p', 'pt', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 40;

        // Top header (name + contact) and PAYSLIP title on right
        pdf.setFontSize(22);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(87, 18, 63);
        pdf.text('ZUMAR LAW FIRM', margin, 40);
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(0,0,0);
        pdf.text('Office No 8B 5th Floor Rizwan Arcade Adam Jee Road Rawalpindi', margin, 56);
        pdf.text('Phone: 051-8445595, Email: team@zumarlawfirm.com', margin, 70);

        pdf.setFontSize(26);
        pdf.setFont(undefined,'bold');
        pdf.setTextColor(87,18,63);
        pdf.text('PAYSLIP', pageWidth - margin - 100, 48);

        // Employee information box (left)
        const infoY = 90;
        pdf.setFillColor(87,18,63);
        pdf.rect(margin, infoY, 160, 18, 'F');
        pdf.setFontSize(9);
        pdf.setTextColor(255,255,255);
        pdf.text('EMPLOYEE INFORMATION', margin + 6, infoY + 13);

        pdf.setTextColor(0,0,0);
        pdf.setFontSize(11);
        pdf.setFont(undefined,'bold');
        pdf.text(rec.employee || '-', margin, infoY + 36);
        pdf.setFont(undefined,'normal');
        pdf.text(`Branch: ${rec.branch || '-'}`, margin, infoY + 52);
        pdf.text(`Payroll #: ${rec._id?.slice(-8) || '-'}`, margin, infoY + 68);

        // Right small info table (3 columns) under title
        const infoTableX = pageWidth / 2;
        const infoW = pageWidth - margin - infoTableX;
        const cellH = 18;
        const headerY = infoY;
        pdf.setFillColor(139,34,54);
        pdf.setTextColor(255,255,255);
        const iw = infoW / 3 - 6;
        pdf.rect(infoTableX, headerY, iw, cellH, 'F');
        pdf.rect(infoTableX + iw, headerY, iw, cellH, 'F');
        pdf.rect(infoTableX + iw*2, headerY, iw, cellH, 'F');
        pdf.setFontSize(9);
        pdf.text('PAY DATE', infoTableX + 6, headerY + 12);
        pdf.text('PAY TYPE', infoTableX + iw + 6, headerY + 12);
        pdf.text('PERIOD', infoTableX + iw*2 + 6, headerY + 12);

        // values
        pdf.setFillColor(240,240,240);
        pdf.setTextColor(0,0,0);
        pdf.rect(infoTableX, headerY + cellH, iw, cellH, 'F');
        pdf.rect(infoTableX + iw, headerY + cellH, iw, cellH, 'F');
        pdf.rect(infoTableX + iw*2, headerY + cellH, iw, cellH, 'F');
        pdf.setFontSize(10);
        pdf.text(rec.paymentDate ? (rec.paymentDate + '').slice(0,10) : '-', infoTableX + 6, headerY + cellH + 12);
        pdf.text(rec.paymentMethod || '-', infoTableX + iw + 6, headerY + cellH + 12);
        pdf.text(rec.payrollMonth || '-', infoTableX + iw*2 + 6, headerY + cellH + 12);

        // Payment method line and account/cheque details
        pdf.setFontSize(10);
        pdf.text(`Payment Method: ${rec.paymentMethod || '-'}`, margin, infoY + 82);
        const pm = (rec.paymentMethod || '').toString().toLowerCase();
        if (pm === 'bank' && rec.accountNumber) {
          pdf.text(`Account No: ${rec.accountNumber}`, infoTableX, infoY + 82);
        } else if (pm === 'cheque' || pm === 'check') {
          if (rec.chequeNumber) pdf.text(`Cheque No: ${rec.chequeNumber}`, infoTableX, infoY + 92);
        } else {
          // if cheque number exists even when method isn't exclusively cheque, still show it
          if (rec.chequeNumber) pdf.text(`Cheque No: ${rec.chequeNumber}`, infoTableX, infoY + 92);
        }

        // Attendance & Earnings setup
    pdf.setFont(undefined,'normal');
    // present: try multiple possible field names (autoSalary returns `present`)
    const present = Number(rec.present ?? rec.presentDays ?? rec.daysPresent ?? 0);
    // cutDays: canonical field is cutDays from autoSalary/Salary model
    const cutDays = Number(rec.cutDays ?? rec.daysCut ?? rec.cut ?? 0);
    // totalDays prefer explicit workingDays/totalWorkingDays, otherwise fallback to present+cutDays
    const totalDays = Number((rec.workingDays ?? rec.totalWorkingDays ?? (present + cutDays)) || 0);
    const salary = Number(rec.baseSalary ?? rec.salary ?? rec.finalSalary ?? 0) || 0;
    const perDay = totalDays ? Math.round(salary / totalDays) : 0;
        // compute days in month from payrollMonth (YYYY-MM) or paymentDate
        let monthDays = totalDays;
        try {
          const pm = rec.payrollMonth || (rec.paymentDate ? (rec.paymentDate + '').slice(0,7) : null);
          if (pm) {
            const [yy, mm] = pm.split('-').map(Number);
            if (yy && mm) {
              monthDays = new Date(yy, mm, 0).getDate();
            }
          }
        } catch (e) {
          // fallback to totalDays already set
        }

  // Attendance counts (use rec fields or fallbacks from autoSalary/Salary model)
  const absent = Number(rec.absent ?? rec.absentDays ?? rec.daysAbsent ?? 0);
  const leave = Number(rec.leave ?? rec.leaves ?? 0);
  const holidayCount = Number(rec.holiday ?? rec.holidays ?? 0);
  const halfDay = Number(rec.halfDay ?? rec.halfDays ?? 0);
  const leaveRelief = Number(rec.leaveRelief ?? 0);
  const sundays = Number(rec.sundays ?? rec.sunday ?? 0);
  // (cutDays already computed above)

        // Draw attendance box below employee info and above earnings as a clean 2-column table
        const attendanceY = infoY + 92; // place under the info section
        // rows to display (label, value)
        const attendanceRows = [
          ['Working Days', monthDays],
          ['Present', present],
          ['Absent', absent],
          ['Leave', leave],
          ['Holidays', holidayCount],
          ['Half Day', halfDay],
          ['Leave Relief', leaveRelief],
          ['Sunday', sundays],
          ['Cut Days', cutDays],
        ];
        const rowH = 18;
        const headerH = 22;
        const attendanceH = headerH + (attendanceRows.length * rowH) + 12;
        pdf.setFillColor(245,245,245);
        pdf.rect(margin, attendanceY, pageWidth - margin*2, attendanceH, 'F');

        // Header
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.text('ATTENDANCE DETAILS', margin + 8, attendanceY + 14);

  // Table columns (names prefixed to avoid collision with earnings table variables)
  const attTableX = margin + 6;
  const attTableW = pageWidth - margin*2 - 12;
  const valueColW = 70;
  const valueColX = attTableX + attTableW - valueColW;
  const labelColX = attTableX;

        // Column header background for value column (light) and divider
        pdf.setFillColor(255,255,255);
        // draw rows
        pdf.setFont(undefined, 'normal');
        for (let i = 0; i < attendanceRows.length; i++) {
          const y = attendanceY + headerH + i * rowH + 6;
          const label = attendanceRows[i][0];
          const value = attendanceRows[i][1] ?? '';
          // row background (alternating subtle shading)
          if (i % 2 === 1) {
            pdf.setFillColor(250,250,250);
            pdf.rect(margin, y - 8, pageWidth - margin*2, rowH, 'F');
          }
          // label
          pdf.setTextColor(0,0,0);
          pdf.setFontSize(10);
          pdf.text(label + ':', labelColX, y + 6);
          // right-aligned numeric value in value column
          const vStr = String(value);
          const w = pdf.getTextWidth(vStr);
          pdf.text(vStr, valueColX + valueColW - 8 - w, y + 6);
          // bottom border
          pdf.setDrawColor(220);
          pdf.setLineWidth(0.5);
          pdf.line(margin, y + rowH - 2, margin + attTableW + 6, y + rowH - 2);
        }

        // After attendance, start earnings table below it
        const tableTop = attendanceY + attendanceH + 12;
        const tableW = pageWidth - margin*2;
        const colA = margin;
        const colB = margin + tableW*0.25;
        const colC = margin + tableW*0.45;
        const colD = margin + tableW*0.65;
        const colE = margin + tableW*0.85;

        pdf.setFillColor(255,204,153);
        pdf.rect(colA, tableTop, tableW, 26, 'F');
        pdf.setTextColor(0,0,0);
        pdf.setFontSize(11);
        pdf.setFont(undefined,'bold');
        pdf.text('EARNINGS', colA + 6, tableTop + 18);
        pdf.text('Days', colB + 6, tableTop + 18);
        // RATE column removed as requested
        pdf.text('CURRENT', colD + 6, tableTop + 18);
        pdf.text('PKR', colE + 6, tableTop + 18);

        

        let ry = tableTop + 36;
        const gap = 18;
        const basicCurrent = Math.round(perDay * present);

        // column widths & right-edge helpers for better alignment
        const colWidth1 = colB - colA;
        const colWidth2 = colC - colB;
        const colWidth3 = colD - colC;
        const colWidth4 = colE - colD;
        const colWidth5 = margin + tableW - colE;
        const daysX = colB + colWidth2 / 2;
        const rateRight = colC + colWidth3 - 6;
        const currentRight = colD + colWidth4 - 6;
        const pkrRight = colE + colWidth5 - 6;

        const drawRight = (text, xRight, y) => {
          const w = pdf.getTextWidth(text + '');
          pdf.text(text + '', xRight - w, y);
        };

        const drawRow = (y, desc, daysVal, rateVal, currentVal, amountVal) => {
          pdf.setFont(undefined,'normal');
          pdf.text(desc, colA + 6, y);
          // days centered
          pdf.text(daysVal === undefined ? '' : String(daysVal), daysX, y, { align: 'center' });
          // rate, current, amount right aligned
          drawRight(formatCurrency(rateVal), rateRight, y);
          drawRight(formatCurrency(currentVal), currentRight, y);
          drawRight(formatCurrency(amountVal), pkrRight, y);
          // bottom border
          pdf.setDrawColor(220);
          pdf.setLineWidth(0.4);
          pdf.line(colA, y + 4, colA + tableW, y + 4);
        };

    // Rows
  const baseMonthly = Number(rec.baseSalary ?? 0) || salary || 0;
  drawRow(ry, 'Basic Salary', String(monthDays), '', baseMonthly, baseMonthly);
        ry += gap;
  // show Monthly Basic Salary (from model if available) as small right-aligned note under the basic row
  pdf.setFontSize(9);
  pdf.setFont(undefined,'normal');

        const medical = Number(rec.medicalAllowance ?? rec.medical ?? 0);
  drawRow(ry, 'Medical Allowance', '0', '', medical, medical);
        ry += gap;

        const traveling = Number(rec.travelingAllowance ?? rec.travellingAllowance ?? 0);
  drawRow(ry, 'Traveling Allowance', '0', '', traveling, traveling);
        ry += gap;

        const overtime = Number(rec.overtimePay ?? 0);
  drawRow(ry, 'Overtime Pay', '0', '', overtime, overtime);
        ry += gap;

        const holiday = Number(rec.holidayPay ?? 0);
  drawRow(ry, 'Holiday pay', '0', '', holiday, holiday);
        ry += gap;

  // Gross (show Basic Salary clearly and Gross total) - use monthly base (without deductions)
  const gross = baseMonthly + medical + traveling + overtime + holiday;
        pdf.setFillColor(255,204,153);
        pdf.rect(colA, ry + 6, tableW, 24, 'F');
        pdf.setFont(undefined,'bold');
        pdf.text('GROSS PAY', colA + 6, ry + 22);
        // show Basic Salary (monthly base from Salary model if available)
        pdf.setFont(undefined,'normal');
  drawRight(`Basic: ${formatCurrency(baseMonthly || basicCurrent)}`, currentRight, ry + 22);
        pdf.setFont(undefined,'bold');
        drawRight(formatCurrency(gross), pkrRight, ry + 22);

        // Deductions (show cut days deduction and apply before net)
        let dy = ry + 44;
        pdf.setFillColor(255,204,153);
        pdf.rect(colA, dy, tableW, 24, 'F');
        pdf.setFont(undefined,'bold');
        pdf.setTextColor(0,0,0);
        pdf.text('DEDUCTIONS', colA + 6, dy + 16);
        dy += 26;
        pdf.setFont(undefined,'normal');

  const payTax = Number(rec.payTax ?? 0);
  const leaves = Number(rec.leaves ?? rec.leaveDeductions ?? 0);
  const loan = Number(rec.loan ?? rec.loanDeduction ?? 0);
  // calculate per-day based on monthly base and monthDays, then compute cut deduction
  const perDayBase = monthDays ? Math.round(baseMonthly / monthDays) : 0;
  const cutDeduction = Math.round(perDayBase * cutDays);

  // Cut Days deduction row (show number of cut days under Days column and deduction amount)
  // add a small top margin so this deduction row is visually separated from the GROSS block
  dy += 8;
  drawRow(dy, 'Cut Days Deduction', cutDays, '', 0, cutDeduction);
        dy += gap;

  // Pay Tax
  drawRow(dy, 'Pay Tax', '0', '', payTax, payTax);
        dy += gap;

        // Other leave deductions (if any separate from cut days)
        if (leaves && leaves !== 0) {
          drawRow(dy, 'Leave Deductions', leave, '', 0, leaves);
          dy += gap;
        }

  // Loan
  drawRow(dy, 'Loan', '0', '', 0, loan);
        dy += gap;

        const totalDeductions = Math.round(cutDeduction + payTax + leaves + loan);
        pdf.setFillColor(245,245,245);
        pdf.rect(colA, dy + 6, tableW, 20, 'F');
        pdf.setFont(undefined,'bold');
        pdf.text('TOTAL DEDUCTIONS', colA + 6, dy + 20);
        drawRight(formatCurrency(totalDeductions), pkrRight, dy + 20);

        // Net pay bar
        const netY = dy + 46;
        pdf.setFillColor(87,18,63);
        pdf.rect(colA + tableW*0.25, netY, tableW*0.5, 32, 'F');
        pdf.setTextColor(255,255,255);
        pdf.setFont(undefined,'bold');
        const netPay = gross - totalDeductions;
        pdf.text('NET PAY', colA + tableW*0.28, netY + 21);
        pdf.text(`PKR ${formatCurrency(netPay)}`, colA + tableW*0.58, netY + 21);

        // Amount in words
        pdf.setTextColor(0,0,0);
        pdf.setFont(undefined,'normal');
        pdf.setFontSize(9);
        const amountInWords = numberToWords.toWords(Math.round(netPay)).replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
        pdf.text(`Amount in words: ${amountInWords} Rupees Only`, colA, netY + 44);

        // Signatures
        const signY = netY + 80;
        pdf.setLineWidth(0.8);
        pdf.line(colA, signY, colA + 120, signY);
        pdf.text('Branch Manager', colA, signY + 12);
        pdf.line(colA + tableW*0.45, signY, colA + tableW*0.45 + 120, signY);
        pdf.text('Employee Sign', colA + tableW*0.45, signY + 12);
        pdf.line(colA + tableW - 120, signY, colA + tableW, signY);
        pdf.text('Chief Executive Officer', colA + tableW - 120, signY + 12);

        // Footer
        pdf.setFontSize(8);
        pdf.text('This is a computer generated salary slip.', pageWidth / 2, pageHeight - 40, { align: 'center' });

        const fileName = `salary_slip_${(rec.employee || 'employee').replace(/[^a-z0-9]+/gi, '_')}_${rec._id?.slice(-6)}.pdf`;
        pdf.save(fileName);
        toast.success('Salary slip downloaded');
      } catch (err) {
        console.error('Salary slip error', err);
        toast.error('Failed to generate salary slip');
      }
    };

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        // pass enhancedRec to closure by replacing rec variable used in generate
        rec = enhancedRec;
        generate(dataUrl);
      } catch (e) {
        console.warn('Logo conversion failed, generating without logo', e);
        generate(null);
      }
    };
    img.onerror = (e) => {
      console.warn('Logo load failed, generating PDF without logo', e);
      // ensure generate uses enhancedRec
      rec = enhancedRec;
      generate(null);
    };
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await axios.put(`http://localhost:5000/payrolls/${editData._id}`, editData);
      setPayrolls((prev) => prev.map((p) => (p._id === editData._id ? editData : p)));
      toast.success("Payroll updated successfully!");
      setEditModal(false);
      setEditData(null);
    } catch (err) {
      toast.error("Failed to update payroll");
    } finally {
      setLoading(false);
    }
  };
  // Auto Pay removed

  return (
    <div className="w-auto space-y-5 py-6 bg-white">
      <div className="text-sm text-gray-500 mb-2 px-2">
        <Link to="/admin" className="hover:underline">Dashboard</Link> &gt;{" "}
        <span className="text-[#57123f] font-semibold">Payroll</span>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Payroll Management</h2>
        <div className="space-x-2 flex">
          <Link
            to="/admin/payroll/add"
            className="bg-[#57123f] hover:bg-[#7a1a59] text-white px-4 py-2 rounded-full flex items-center gap-2"
          >
            <FaMoneyBillWave size={18} />
            Add New Salary
          </Link>
          {/* Auto Pay button removed */}
          <Link
            to="/admin/salary"
            className="bg-[#57123f] hover:bg-[#7a1a59] text-white px-4 py-2 rounded-full flex items-center gap-2"
          >
            Salary Page
          </Link>
      {/* Payment method modal removed with Auto Pay feature */}
        </div>
      </div>

      {/* Quick Salary Pay removed */}

      <div className="flex gap-3 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={`px-4 py-2 rounded-full border ${activeTab === tab.name ? "bg-[#57123f] text-white" : "bg-gray-100 text-gray-800"
              }`}
          >
            {tab.name} <span className="ml-1">({tab.count})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 items-center px-2">
        <input
          type="text"
          placeholder="Search by employee name or ID"
          className="border px-4 py-2 rounded w-96"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <input
          type="date"
          className="border px-4 py-2 rounded"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
      </div>

      <div className="overflow-auto rounded border">
        <table className="w-full min-w-[957px] text-sm text-left">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-1"><input type="checkbox" /></th>
              <th className="p-2">Employee</th>
              <th className="p-2">Date</th>
              <th className="p-2">Amount</th>
              <th className="p-2">Status</th>
              <th className="p-2">Branch</th>
              <th className="p-2">Method</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-4 text-center text-gray-500">Loading...</td></tr>
            ) : paginated.length > 0 ? (
              paginated.map((rec, idx) => (
                <tr key={rec._id || idx} className="border-b hover:bg-gray-50">
                  <td className="p-2"><input type="checkbox" /></td>
                  <td className="p-2">
                    <div className="font-medium">{rec.employee}</div>
                    <div className="text-gray-500 text-xs">{rec._id?.slice(-6)}</div>
                  </td>
                  <td className="p-2">{rec.paymentDate ? rec.paymentDate.slice(0, 10) : ''}</td>
                  <td className="p-2">Rs {formatCurrency(rec.salary)}</td>
                  <td className="p-2">
                    {/* Status is always clickable to view/edit payment details */}
                    <button
                      className={`px-2 cursor-pointer py-1 rounded text-xs font-medium ${rec.status === 'Paid' ? statusColor['Paid'] : statusColor['Unpaid']}`}
                      onClick={() => openPaymentModal(rec)}
                    >
                      {rec.status || 'Unpaid'}
                    </button>
                  </td>
                  <td className="p-2">{rec.branch}</td>
                  <td className="p-2">{rec.paymentMethod}</td>
                  <td className="p-2 flex items-center gap-2 text-[#57123f]">
                    <button
                      className="btn btn-sm btn-outline-secondary cursor-pointer p-1"
                      onClick={() => handleSalarySlip(rec)}
                      title="Download Salary Slip"
                    >
                      <FaFilePdf size={16} />
                    </button>
                    <Edit size={18} className="cursor-pointer" onClick={() => navigate(`/admin/payroll/add/${rec._id}`)} />
                    <Trash2 size={18} className="cursor-pointer" onClick={() => handleDelete(rec._id)} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="p-4 text-center text-gray-500">No records found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-end gap-2 px-2 pt-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded border ${currentPage === i + 1 ? "bg-[#57123f] text-white" : "bg-white text-gray-700"
                }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {paymentModalOpen && paymentRec && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Record Payment for {paymentRec.employee}</h3>
              <button className="text-gray-500" onClick={closePaymentModal}>&times;</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full border p-2 rounded">
                  <option>Cash</option>
                  <option>Bank</option>
                  <option>Cheque</option>
                </select>
              </div>
              {paymentMethod === 'Bank' && (
                <div>
                  <label className="block text-sm font-medium">Account Number</label>
                  <input value={paymentAccount} onChange={(e) => setPaymentAccount(e.target.value)} className="w-full border p-2 rounded" />
                </div>
              )}
              {paymentMethod === 'Cheque' && (
                <div>
                  <label className="block text-sm font-medium">Cheque Number</label>
                  <input value={paymentCheque} onChange={(e) => setPaymentCheque(e.target.value)} className="w-full border p-2 rounded" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium">Paid By (Label)</label>
                <input value={paymentPaidBy} onChange={(e) => setPaymentPaidBy(e.target.value)} placeholder="e.g., Cashier Name or Bank Name" className="w-full border p-2 rounded" />
              </div>
              <div>
                <label className="block text-sm font-medium">Amount</label>
                <input value={paymentRec.salary || ''} readOnly className="w-full border p-2 rounded bg-gray-50" />
              </div>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2 rounded border" onClick={closePaymentModal}>Cancel</button>
                <button className="px-4 py-2 rounded bg-[#57123f] text-white" onClick={handleMarkPaid} disabled={paymentLoading}>{paymentLoading ? 'Saving...' : 'Mark as Paid'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editModal && editData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <form onSubmit={handleEditSubmit} className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md space-y-4 relative">
            <button type="button" className="absolute top-2 right-2 text-gray-400 hover:text-black text-xl" onClick={() => setEditModal(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-4 text-[#57123f]">Edit Payroll</h2>
            <div>
              <label className="block mb-1 font-medium">Employee</label>
              <input name="employee" value={editData.employee} onChange={handleEditChange} className="w-full border p-2 rounded" required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Date</label>
              <input type="date" name="paymentDate" value={editData.paymentDate?.slice(0,10) || ''} onChange={handleEditChange} className="w-full border p-2 rounded" required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Amount</label>
              <input name="salary" value={editData.salary} onChange={handleEditChange} className="w-full border p-2 rounded" required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Status</label>
              <select name="status" value={editData.status} onChange={handleEditChange} className="w-full border p-2 rounded">
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Unpaid">Unpaid</option>
              </select>
            </div>
            <div>
              <label className="block mb-1 font-medium">Branch</label>
              <input name="branch" value={editData.branch} onChange={handleEditChange} className="w-full border p-2 rounded" required />
            </div>
            <div>
              <label className="block mb-1 font-medium">Method</label>
              <input name="paymentMethod" value={editData.paymentMethod} onChange={handleEditChange} className="w-full border p-2 rounded" required />
            </div>
            <button type="submit" className="w-full bg-[#57123f] text-white py-2 rounded font-semibold hover:bg-[#7a1a59]">Update Payroll</button>
          </form>
        </div>
      )
      }
    </div>
  );
}
