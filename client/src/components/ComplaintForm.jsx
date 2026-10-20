import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
const subjects = ['Employee Behaviour', 'Service Related Problem', 'Refund Service Fee', 'Other'];
const empty = () => ({ clientId: '', name: '', cnic: '', category: '', subject: '', serviceName: '', description: '', email: '', phone: '' });
export default function ComplaintForm({ url, staff, onSubmitted }) {
  const [open, setOpen] = useState(!staff);
  const [form, setForm] = useState(empty);
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);
  useEffect(() => {
    axios.get(`${url}/options`).then(({ data }) => {
      setServices(data.services);
      if (data.profile) setForm(f => ({ ...f, name: [data.profile.firstName, data.profile.lastName].filter(Boolean).join(' '), email: data.profile.email || '', phone: data.profile.phoneNumber || '' }));
    }).catch(() => toast.error('Could not load complaint form options'));
  }, [url]);
  useEffect(() => {
    if (!staff || !open) { setClients([]); setSearching(false); setSearchError(''); return; }
    const controller = new AbortController();
    setSearching(true); setSearchError('');
    const timer = setTimeout(() => {
      axios.get(url.replace(/\/support-tickets\/?$/, '/admin/customers'), { params: { lookup: 'complaint', search: search.trim() }, signal: controller.signal })
        .then(r => setClients(r.data)).catch(e => { if (e.code !== 'ERR_CANCELED') setSearchError('Client search failed. Please try again.'); })
        .finally(() => { if (!controller.signal.aborted) setSearching(false); });
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, staff, url, open]);
  const set = (key, value) => setForm(f => ({ ...f, [key]: value }));
  function chooseClient(id) {
    const client = clients.find(c => c._id === id);
    setForm(f => ({ ...f, clientId: id, name: client?.name || '', cnic: client?.cnic || '', email: client?.email || '', phone: client?.phone || '' }));
  }
  function addFiles(event) {
    const added = Array.from(event.target.files || []);
    event.target.value = '';
    if (files.length + added.length > 10) return toast.error('Upload up to 10 files per complaint');
    if (added.some(f => f.size > 10 * 1024 * 1024)) return toast.error('Each file must be 10 MB or smaller');
    setFiles(current => [...current, ...added]);
  }
  async function submit(event) {
    event.preventDefault(); setBusy(true);
    try {
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      files.forEach(file => body.append('attachments', file));
      await axios.post(url, body);
      toast.success('Complaint submitted. Customer SMS and email notifications queued.');
      setForm(f => ({ ...empty(), ...(!staff ? { name: f.name, cnic: f.cnic, email: f.email, phone: f.phone } : {}) }));
      setFiles([]); setSearch(''); if (staff) setOpen(false);
      onSubmitted();
    } catch (e) { toast.error(e.response?.data?.message || 'Could not submit complaint'); } finally { setBusy(false); }
  }
  const input = 'mt-1 w-full border border-gray-300 rounded-lg p-3 bg-white';
  return <section className="bg-white border border-gray-200 rounded-2xl p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-xl font-semibold">{staff ? 'Submit a complaint for a client' : 'Submit Complaint'}</h1><p className="text-sm text-gray-500 mt-1">Helpline: <a href="tel:0518445095">051-8445095</a> · <a href="mailto:team@zumarlawfirm.com">team@zumarlawfirm.com</a></p></div>{staff && <button type="button" className="bg-[#57123f] text-white rounded-lg px-4 py-2" onClick={() => setOpen(!open)}>{open ? 'Hide form' : 'Add complaint'}</button>}</div>
    {open && <form onSubmit={submit} className="grid md:grid-cols-2 gap-4 mt-5">
      {staff && <div className="md:col-span-2 bg-purple-50 rounded-xl p-4 space-y-3"><label className="block">Find client<input type="search" maxLength={120} className={input} placeholder="Search customer name, email or phone" value={search} onChange={e => { setSearch(e.target.value); setForm(f => ({ ...f, clientId: '', name: '', email: '', phone: '', cnic: '' })); }} /></label><label className="block">Client account<select required className={input} value={form.clientId} onChange={e => chooseClient(e.target.value)}><option value="">{searching ? 'Searching clients…' : 'Select the client account'}</option>{clients.map(c => <option key={c._id} value={c._id}>{c.name} — {c.email}</option>)}</select></label>{searchError && <p role="alert" className="text-sm text-red-700">{searchError}</p>}{!searching && !clients.length && !searchError && <p className="text-sm text-gray-500">No matching clients found.</p>}</div>}
      <label>Person name<input required maxLength={160} className={input} value={form.name} onChange={e => set('name', e.target.value)} /></label>
      <label>CNIC<input required maxLength={15} pattern="[0-9]{5}-?[0-9]{7}-?[0-9]" title="13 digits, with or without hyphens" placeholder="12345-1234567-1" className={input} value={form.cnic} onChange={e => set('cnic', e.target.value)} /></label>
      <label>Email<input type="email" required maxLength={254} className={input} value={form.email} onChange={e => set('email', e.target.value)} /></label>
      <label>Phone<input type="tel" required maxLength={30} className={input} value={form.phone} onChange={e => set('phone', e.target.value)} /></label>
      <label className="md:col-span-2">Complaint subject<select required className={input} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value, subject: '', serviceName: '' }))}><option value="">Select a subject</option>{subjects.map(s => <option key={s}>{s}</option>)}</select></label>
      {form.category === 'Other' && <label className="md:col-span-2">Your subject<input required maxLength={180} className={input} value={form.subject} onChange={e => set('subject', e.target.value)} /></label>}
      {['Service Related Problem', 'Refund Service Fee'].includes(form.category) && <label className="md:col-span-2">Service name<select required className={input} value={form.serviceName} onChange={e => set('serviceName', e.target.value)}><option value="">Select the service</option>{services.map(s => <option key={s}>{s}</option>)}</select></label>}
      <label className="md:col-span-2">Describe the issue<textarea required maxLength={6000} rows={4} className={input} value={form.description} onChange={e => set('description', e.target.value)} /></label>
      <div className="md:col-span-2 border border-dashed border-purple-200 rounded-xl p-4"><label>Attach supporting files<input ref={fileInput} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.txt,.csv" className="block mt-2 w-full text-sm" onChange={addFiles} /></label><p className="mt-2 text-xs text-gray-500">Up to 10 files, 10 MB each. PDF, images, Word, Excel, CSV or text. You can select more files in another selection.</p><ul className="mt-3 space-y-2">{files.map((file, i) => <li key={`${file.name}-${i}`} className="flex justify-between gap-3 text-sm"><span className="break-all">{file.name} ({Math.ceil(file.size / 1024)} KB)</span><button type="button" className="text-red-700" onClick={() => setFiles(files.filter((_, index) => index !== i))}>Remove</button></li>)}</ul></div>
      <button disabled={busy} className="bg-[#57123f] text-white rounded-lg p-3 disabled:opacity-50">{busy ? 'Submitting…' : 'Submit Complaint'}</button>
    </form>}
  </section>;
}
