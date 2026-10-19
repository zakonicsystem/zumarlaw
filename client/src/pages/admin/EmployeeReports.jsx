import { useEffect, useRef, useState } from 'react';
import EmployeeReportTable from '../../components/admin/EmployeeReportTable';
import axios from 'axios';
import toast from 'react-hot-toast';
const url = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')}/api/ad-reports`;
const fields = { totalLeads: 'Total no. of leads', fakeLeads: 'Unrelated / fake leads', noResponseLeads: 'No response leads', interestedLeads: 'New / interested leads', matureLeads: 'Mature leads', previousMatureLeads: 'Previous mature leads', followUpLeads: 'Follow up leads', convertedNew: 'Converted clients — new', convertedOld: 'Converted clients — old' };
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });
const initial = () => ({ reportDate: today(), dealingService: '', employeeSignature: '', fakeComments: '', followUpComments: '', convertedClientName: '', ...Object.fromEntries(Object.keys(fields).map(k => [k, 0])) });
export default function EmployeeReports() {
  const admin = !!localStorage.getItem('adminToken');
  const [options, setOptions] = useState({ services: [], employees: [] });
  const [data, setData] = useState({ reports: [], totals: {} });
  const [filters, setFilters] = useState({ period: 'daily', date: today(), employee: '', service: '', review: '', search: '' });
  const [loading, setLoading] = useState(true);
  const latestRequest = useRef(0);
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState(null);
  const fail = e => toast.error(e.response?.data?.message || 'Request failed. Please try again.');
  async function load() {
    const request = ++latestRequest.current;
    setLoading(true);
    try {
      const response = await axios.get(url, { params: filters });
      if (request === latestRequest.current) { setData(response.data); setError(''); }
    } catch (e) { if (request === latestRequest.current) { setError(e.response?.data?.message || 'Could not load reports'); setData({ reports: [], totals: {} }); } }
    finally { if (request === latestRequest.current) setLoading(false); }
  }
  useEffect(() => { axios.get(`${url}/options`).then(r => setOptions(r.data)).catch(fail); }, []);
  useEffect(() => {
    const timer = setTimeout(() => { load(); }, 250);
    return () => { clearTimeout(timer); latestRequest.current++; };
  }, [filters.period, filters.date, filters.employee, filters.service, filters.review, filters.search]);
  async function submit(e) { e.preventDefault(); setBusy(true); try { await axios.post(url, form); toast.success('Daily report sent to admin'); setForm(initial()); await load(); } catch (e) { fail(e); } finally { setBusy(false); } }
  async function pdf(id) { setBusy(true); try { const response = await axios.get(`${url}/pdf`, { params: { ...filters, ...(id ? { id } : {}) }, responseType: 'blob' }); const objectUrl = URL.createObjectURL(response.data); const a = document.createElement('a'); a.href = objectUrl; a.download = `employee-report-${filters.date}.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); } catch { toast.error('Unable to export PDF. Check that reports exist.'); } finally { setBusy(false); } }
  async function saveReview(e) { e.preventDefault(); setBusy(true); try { await axios.patch(`${url}/${review._id}/review`, { supervisorName: review.supervisorName, supervisorSignature: review.supervisorSignature, remark: review.remark }); setReview(null); toast.success('Supervisor review saved'); await load(); } catch (e) { fail(e); } finally { setBusy(false); } }
  const input = 'border border-gray-300 rounded-lg p-2.5 w-full mt-1 bg-white';
  return <main className="  max-w-7xl mx-auto space-y-6">
    {!admin && <form onSubmit={submit} className="bg-white border rounded-2xl p-6 space-y-5"><h2 className="text-xl font-semibold">New daily report</h2><p>{options.employee?.name} · {options.employee?.role} · {options.employee?.phone}</p><div className="grid md:grid-cols-2 gap-4"><label>Report date<input required type="date" max={today()} className={input} value={form.reportDate} onChange={e => setForm({ ...form, reportDate: e.target.value })} /></label><label>Dealing service<select required className={input} value={form.dealingService} onChange={e => setForm({ ...form, dealingService: e.target.value })}><option value="">Select a service</option>{options.services.map(s => <option key={s}>{s}</option>)}</select></label>{Object.entries(fields).map(([key, label]) => <label key={key}>{label}<input type="number" required min="0" max="1000000" step="1" className={input} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value === '' ? '' : Number(e.target.value) })} /></label>)}</div>{[['fakeComments', 'Fake lead comments'], ['followUpComments', 'Follow up lead comments'], ['convertedClientName', 'Converted client name(s)']].map(([key, label]) => <label key={key} className="block">{label}<textarea className={input} rows={2} maxLength={key === 'convertedClientName' ? 2000 : 4000} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}<label className="block">Employee signature (type your full name)<input required maxLength={160} className={input} value={form.employeeSignature} onChange={e => setForm({ ...form, employeeSignature: e.target.value })} /></label><p className="text-sm text-gray-500">The PDF includes spaces for handwritten employee and supervisor signatures.</p><button disabled={busy} className="bg-[#57123f] text-white rounded-lg px-6 py-3 disabled:opacity-50">Send report to admin</button></form>}
    <EmployeeReportTable admin={admin} options={options} data={data} filters={filters}
      onFilter={(key, value) => { setLoading(true); setFilters(current => ({ ...current, [key]: value })); }}
      onReset={() => { const reset = { period: 'daily', date: today(), employee: '', service: '', review: '', search: '' }; if (Object.keys(reset).some(key => filters[key] !== reset[key])) { setLoading(true); setFilters(reset); } }}
      loading={loading} busy={busy} error={error} onPdf={pdf}
      onReview={r => setReview({ ...r, supervisorName: r.supervisorName || '', supervisorSignature: r.supervisorSignature || '', remark: r.remark || '' })} />
    {review && <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4"><form onSubmit={saveReview} className="bg-white rounded-xl p-6 max-w-lg w-full space-y-4"><h2 className="text-xl font-semibold">Supervisor review</h2><p>{review.employeeName} · {review.reportDate}</p>{[['supervisorName', 'Supervisor name'], ['supervisorSignature', 'Supervisor signature (typed name)'], ['remark', 'Remark']].map(([k, label]) => <label key={k} className="block">{label}<textarea required maxLength={k === 'remark' ? 4000 : 160} className={input} value={review[k]} onChange={e => setReview({ ...review, [k]: e.target.value })} /></label>)}<div className="flex gap-3"><button disabled={busy} className="bg-[#57123f] text-white rounded px-5 py-2">Save review</button><button type="button" onClick={() => setReview(null)}>Cancel</button></div></form></div>}
  </main>;
}
