import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
const url = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')}/api/support-tickets`;
const statuses = { pending: 'Pending', under_review: 'Under reviewing', resolved: 'Resolved', completed: 'Completed' };
const subjects = ['Employee Behaviour', 'Service Related Problem', 'Refund Service Fee', 'Other'];
const emptyForm = () => ({ category: '', subject: '', description: '', phone: '', email: '' });
const closed = status => ['resolved', 'completed'].includes(status);
const badge = status => `inline-flex rounded-full px-3 py-1 text-xs font-semibold ${closed(status) ? 'bg-green-100 text-green-800' : status === 'under_review' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`;
const date = value => new Date(value).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' });
export default function SupportTickets({ admin = false }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState('pending');
  const [resolution, setResolution] = useState('');
  const dialog = useRef(null);
  const selected = tickets.find(t => t._id === selectedId);
  const fail = e => toast.error(e.response?.data?.message || 'Request failed. Please try again.');
  async function load() {
    try { setTickets((await axios.get(url)).data); setError(''); }
    catch { setError('Could not load tickets. Please retry.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { if (selectedId) dialog.current?.showModal(); }, [selectedId]);
  function open(ticket) { setStatus(ticket.status); setResolution(ticket.resolution || ''); setSelectedId(ticket._id); }
  function close() { dialog.current?.close(); setSelectedId(null); }
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    try { await axios.post(url, form); setForm(emptyForm()); toast.success('Ticket submitted. SMS and email notifications queued.'); await load(); }
    catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function update(e) {
    e.preventDefault(); setBusy(true);
    try {
      await axios.patch(`${url}/${selectedId}`, { status, resolution });
      toast.success(closed(status) ? 'Ticket closed. Customer SMS and email queued.' : 'Ticket status updated');
      await load(); close();
    } catch (e) { fail(e); } finally { setBusy(false); }
  }
  const query = search.trim().toLowerCase();
  const visible = tickets.filter(t => (filter === 'all' || t.status === filter) &&
    (!query || [t.reference, t.subject, t.category, t.name, t.email, t.phone, t.description, t.resolution]
      .some(value => String(value || '').toLowerCase().includes(query))));
  const input = 'border border-gray-300 rounded-lg p-3 w-full mt-1 bg-white';
  return <main className="max-w-7xl mx-auto   space-y-6">

    {!admin && <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl p-6 grid md:grid-cols-2 gap-4">
      <h2 className="md:col-span-2 text-xl font-semibold">Create a support ticket</h2>
      <label className="md:col-span-2">Ticket subject<select required className={input} value={form.category} onChange={e => setForm({ ...form, category: e.target.value, subject: '' })}><option value="">Select a subject</option>{subjects.map(s => <option key={s}>{s}</option>)}</select></label>
      {form.category === 'Other' && <label className="md:col-span-2">Your ticket subject<input required maxLength={180} className={input} placeholder="Enter the subject of your ticket" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></label>}
      {['email', 'phone'].map(key => <label key={key}><span className="capitalize">{key}</span><input className={input} type={key === 'email' ? 'email' : 'tel'} required maxLength={160} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}
      <label className="md:col-span-2">Describe your issue<textarea required maxLength={6000} rows={4} className={input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
      <button disabled={busy} className="bg-[#57123f] text-white rounded-lg p-3 disabled:opacity-50">{busy ? 'Submitting…' : 'Submit ticket'}</button>
    </form>}
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex flex-wrap justify-between items-center gap-3 p-5 border-b border-gray-200">
        <h2 className="text-xl font-semibold">{admin ? 'Client tickets' : 'Your tickets'} <span className="text-sm font-normal text-gray-500" aria-live="polite">({visible.length})</span></h2>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 min-w-[220px] md:w-80">
            <input type="search" aria-label="Search support tickets" placeholder="Search ticket, subject, client or issue…" maxLength={200} value={search} onChange={e => setSearch(e.target.value)} className="w-full border border-gray-300 rounded-lg py-2.5 pl-3 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-[#57123f]/30" />
            {search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#57123f]">Clear</button>}
          </div>
          <select aria-label="Filter ticket status" className="border border-gray-300 rounded-lg p-2.5 text-sm" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All statuses</option>{Object.entries(statuses).map(([s, label]) => <option key={s} value={s}>{label}</option>)}</select>
        </div>
      </div>
      {error ? <div role="alert" className="p-6 text-red-700">{error} <button className="underline" onClick={load}>Retry</button></div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#faf5f8] text-gray-600"><tr>{['Ticket', 'Subject', ...(admin ? ['Client'] : []), 'Submitted', 'Status', 'Action'].map(h => <th key={h} scope="col" className="px-5 py-4 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{loading ? <tr><td colSpan={admin ? 6 : 5} className="p-8 text-center">Loading tickets…</td></tr> : !visible.length ? <tr><td colSpan={admin ? 6 : 5} className="p-8 text-center text-gray-500">No tickets in this view.</td></tr> : visible.map(t => <tr key={t._id} className="hover:bg-gray-50"><td className="px-5 py-4 font-medium whitespace-nowrap">{t.reference}</td><td className="px-5 py-4"><div className="max-w-xs truncate" title={t.subject}>{t.subject}</div></td>{admin && <td className="px-5 py-4">{t.name || 'Client'}</td>}<td className="px-5 py-4 whitespace-nowrap text-gray-500">{date(t.createdAt)}</td><td className="px-5 py-4"><span className={badge(t.status)}>{statuses[t.status]}</span></td><td className="px-5 py-4"><button className="text-[#57123f] font-semibold underline whitespace-nowrap" onClick={() => open(t)}>View details</button></td></tr>)}</tbody></table></div>}
    </section>
    <dialog ref={dialog} aria-labelledby="ticket-detail-title" onClose={() => setSelectedId(null)} onCancel={() => setSelectedId(null)} className="m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] rounded-2xl p-0 shadow-2xl backdrop:bg-black/50">
      {selected && <div className="p-6 space-y-5"><div className="flex justify-between items-start gap-4"><div><p className="text-sm text-gray-500">{selected.reference}</p><h2 className="text-xl font-semibold" id="ticket-detail-title">{selected.subject}</h2></div><button aria-label="Close ticket details" className="border rounded-lg px-3 py-1" onClick={close}>✕</button></div><span className={badge(selected.status)}>{statuses[selected.status]}</span>
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">{[['Client', selected.name], ['Submitted', date(selected.createdAt)], ['Email', selected.email], ['Phone', selected.phone], ['Category', selected.category || 'Other']].map(([label, value]) => <div key={label}><dt className="text-gray-500">{label}</dt><dd className="break-words mt-1">{value || '—'}</dd></div>)}</dl>
        <div><h3 className="font-semibold mb-2">Issue details</h3><p className="whitespace-pre-wrap break-words bg-gray-50 p-4 rounded-lg">{selected.description}</p></div>
        {selected.resolution && <div className="bg-green-50 p-4 rounded-lg"><h3 className="font-semibold">Resolution</h3><p className="whitespace-pre-wrap break-words mt-2">{selected.resolution}</p>{selected.resolvedAt && <p className="text-xs mt-2 text-gray-500">Closed {date(selected.resolvedAt)}</p>}</div>}
        <div><h3 className="font-semibold text-sm">Notifications</h3><p className="text-xs mt-1 text-gray-500">{selected.deliveries?.map(d => `${d.channel}: ${d.status}`).join(' · ') || 'Queued'}</p></div>
        {admin && !closed(selected.status) && <form onSubmit={update} className="border-t border-gray-200 pt-4 space-y-4"><label className="block">Update status<select className={input} value={status} onChange={e => setStatus(e.target.value)}>{Object.entries(statuses).map(([s, label]) => <option key={s} value={s}>{label}</option>)}</select></label><label className="block">Resolution {closed(status) ? '(required)' : '(optional)'}<textarea required={closed(status)} maxLength={6000} rows={3} className={input} value={resolution} onChange={e => setResolution(e.target.value)} /></label><button disabled={busy} className="bg-[#57123f] text-white rounded-lg px-5 py-3 disabled:opacity-50">{busy ? 'Saving…' : closed(status) ? 'Save & notify customer' : 'Save status'}</button></form>}
      </div>}
    </dialog>
  </main>;
}
