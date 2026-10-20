import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import ComplaintForm from '../components/ComplaintForm';
import TicketAttachments from '../components/TicketAttachments';
import { ticketSubmitter } from '../utils/ticketSubmitter';
const url = `${(import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')}/api/support-tickets`;
const statuses = { pending: 'Pending', under_review: 'Under reviewing', resolved: 'Resolved', completed: 'Completed' };
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
  const canManage = admin && !!localStorage.getItem('adminToken');
  const [selectedId, setSelectedId] = useState(null);
  const [attachmentTicket, setAttachmentTicket] = useState(null);
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
  async function update(e) {
    e.preventDefault(); setBusy(true);
    try {
      await axios.patch(`${url}/${selectedId}`, { status, resolution });
      toast.success(closed(status) ? 'Ticket closed. Customer SMS and email queued.' : 'Ticket status updated');
      await load(); close();
    } catch (e) { fail(e); } finally { setBusy(false); }
  }
  async function remove(ticket) {
    if (!window.confirm(`Delete complaint ${ticket.reference}?`)) return;
    setBusy(true);
    try { await axios.delete(`${url}/${ticket._id}`); close(); toast.success('Complaint deleted'); await load(); }
    catch (e) { fail(e); } finally { setBusy(false); }
  }
  const query = search.trim().toLowerCase();
  const visible = tickets.filter(t => (filter === 'all' || t.status === filter) &&
    (!query || [t.reference, t.subject, t.category, t.name, t.cnic, t.serviceName, t.email, t.phone, t.description, t.resolution, ticketSubmitter(t).name]
      .some(value => String(value || '').toLowerCase().includes(query))));
  const input = 'border border-gray-300 rounded-lg p-3 w-full mt-1 bg-white';
  return <main className="max-w-7xl mx-auto   space-y-6">

    <ComplaintForm url={url} staff={admin} onSubmitted={load} />
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex flex-wrap justify-between items-center gap-3 p-5 border-b border-gray-200">
        <h2 className="text-xl font-semibold">{admin ? 'Client complaints' : 'Your complaints'} <span className="text-sm font-normal text-gray-500" aria-live="polite">({visible.length})</span></h2>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 min-w-[220px] md:w-80">
            <input type="search" aria-label="Search support tickets" placeholder="Search ticket, subject, client or issue…" maxLength={200} value={search} onChange={e => setSearch(e.target.value)} className="w-full border border-gray-300 rounded-lg py-2.5 pl-3 pr-16 text-sm focus:outline-none focus:ring-2 focus:ring-[#57123f]/30" />
            {search && <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#57123f]">Clear</button>}
          </div>
          <select aria-label="Filter ticket status" className="border border-gray-300 rounded-lg p-2.5 text-sm" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All statuses</option>{Object.entries(statuses).map(([s, label]) => <option key={s} value={s}>{label}</option>)}</select>
        </div>
      </div>
      {error ? <div role="alert" className="p-6 text-red-700">{error} <button className="underline" onClick={load}>Retry</button></div> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-[#faf5f8] text-gray-600"><tr>{['Ticket', 'Subject', ...(admin ? ['Client'] : []), 'Submitted by / Date', 'Status', 'Action'].map(h => <th key={h} scope="col" className="px-5 py-4 font-semibold">{h}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{loading ? <tr><td colSpan={admin ? 6 : 5} className="p-8 text-center">Loading tickets…</td></tr> : !visible.length ? <tr><td colSpan={admin ? 6 : 5} className="p-8 text-center text-gray-500">No tickets in this view.</td></tr> : visible.map(t => <tr key={t._id} className="hover:bg-gray-50"><td className="px-5 py-4 font-medium whitespace-nowrap">{t.reference}</td><td className="px-5 py-4"><div className="max-w-xs truncate" title={t.subject}>{t.subject}</div></td>{admin && <td className="px-5 py-4">{t.name || 'Client'}</td>}<td className="px-5 py-4"><p className="font-medium whitespace-nowrap">{ticketSubmitter(t).name}</p><p className="text-xs text-gray-500 mt-1">{ticketSubmitter(t).role}</p><p className="text-xs text-gray-500 mt-1 whitespace-nowrap">{date(t.createdAt)}</p></td><td className="px-5 py-4"><span className={badge(t.status)}>{statuses[t.status]}</span></td><td className="px-5 py-4"><button className="text-[#57123f] font-semibold underline whitespace-nowrap" onClick={() => open(t)}>View details</button>{!!t.attachments?.length && <button className="block mt-2 text-xs font-medium text-[#57123f] underline whitespace-nowrap" onClick={() => setAttachmentTicket(t)}>Show attachments ({t.attachments.length})</button>}</td></tr>)}</tbody></table></div>}
    </section>
    <dialog ref={dialog} aria-labelledby="ticket-detail-title" onClose={() => setSelectedId(null)} onCancel={() => setSelectedId(null)} className="m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] rounded-2xl p-0 shadow-2xl backdrop:bg-black/50">
      {selected && <div className="p-6 space-y-5"><div className="flex justify-between items-start gap-4"><div><p className="text-sm text-gray-500">{selected.reference}</p><h2 className="text-xl font-semibold" id="ticket-detail-title">{selected.subject}</h2></div><button aria-label="Close ticket details" className="border rounded-lg px-3 py-1" onClick={close}>✕</button></div><span className={badge(selected.status)}>{statuses[selected.status]}</span>
        <dl className="grid sm:grid-cols-2 gap-4 text-sm">{[['Person name', selected.name], ['CNIC', selected.cnic], ['Service', selected.serviceName], ['Submitted by', ticketSubmitter(selected).name + ' (' + ticketSubmitter(selected).role + ')'], ['Submitted', date(selected.createdAt)], ['Email', selected.email], ['Phone', selected.phone], ['Category', selected.category || 'Other']].map(([label, value]) => <div key={label}><dt className="text-gray-500">{label}</dt><dd className="break-words mt-1">{value || '—'}</dd></div>)}</dl>
        <div><h3 className="font-semibold mb-2">Issue details</h3><p className="whitespace-pre-wrap break-words bg-gray-50 p-4 rounded-lg">{selected.description}</p></div>
        {!!selected.attachments?.length && <button className="border border-purple-200 bg-purple-50 text-[#57123f] rounded-lg px-4 py-2 font-semibold" onClick={() => setAttachmentTicket(selected)}>Show attachments ({selected.attachments.length})</button>}
        {selected.resolution && <div className="bg-green-50 p-4 rounded-lg"><h3 className="font-semibold">Resolution</h3><p className="whitespace-pre-wrap break-words mt-2">{selected.resolution}</p>{selected.resolvedAt && <p className="text-xs mt-2 text-gray-500">Closed {date(selected.resolvedAt)}</p>}</div>}
        <div><h3 className="font-semibold text-sm">Notifications</h3><p className="text-xs mt-1 text-gray-500">{selected.deliveries?.map(d => `${d.channel}: ${d.status}`).join(' · ') || 'Queued'}</p></div>
        {canManage && !closed(selected.status) && <form onSubmit={update} className="border-t border-gray-200 pt-4 space-y-4"><label className="block">Update status<select className={input} value={status} onChange={e => setStatus(e.target.value)}>{Object.entries(statuses).map(([s, label]) => <option key={s} value={s}>{label}</option>)}</select></label><label className="block">Resolution {closed(status) ? '(required)' : '(optional)'}<textarea required={closed(status)} maxLength={6000} rows={3} className={input} value={resolution} onChange={e => setResolution(e.target.value)} /></label><button disabled={busy} className="bg-[#57123f] text-white rounded-lg px-5 py-3 disabled:opacity-50">{busy ? 'Saving…' : closed(status) ? 'Save & notify customer' : 'Save status'}</button></form>}
        {canManage && <div className="border-t border-gray-200 pt-4"><button disabled={busy} className="text-red-700 border border-red-200 rounded-lg px-4 py-2 disabled:opacity-50" onClick={() => remove(selected)}>Delete complaint</button></div>}
      </div>}
    </dialog>
    {attachmentTicket && <TicketAttachments ticket={attachmentTicket} url={url} onClose={() => setAttachmentTicket(null)} />}
  </main>;
}
