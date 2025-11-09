import React, { useState } from 'react';
import { serviceData } from '../data/serviceSchemas';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const Refund = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    serviceType: '',
    paymentDate: '',
    notes: ''
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('Name is required');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('email', form.email);
      fd.append('phone', form.phone);
      fd.append('serviceType', form.serviceType);
      fd.append('paymentDate', form.paymentDate);
      fd.append('notes', form.notes);
      if (file) fd.append('evidence', file);

      const res = await axios.post('https://app.zumarlawfirm.com/refund', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Refund submitted');
      setForm({ name: '', email: '', phone: '', serviceType: '', paymentDate: '', notes: '' });
      setFile(null);
    } catch (err) {
      console.error(err);
      toast.error('Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // use static client-side service list imported from data/serviceSchemas
  const services = serviceData && serviceData.prices ? Object.keys(serviceData.prices) : [];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4 text-[#57123f]">Refund Request</h2>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
        <div>
          <label className="block mb-1 font-medium">Name</label>
          <input type="text" name="name" value={form.name} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block mb-1 font-medium">Email</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block mb-1 font-medium">Phone</label>
          <input type="text" name="phone" value={form.phone} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block mb-1 font-medium">Service Type</label>
          {services.length > 0 ? (
            <select name="serviceType" value={form.serviceType} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="">Select service</option>
              {services.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <input type="text" name="serviceType" value={form.serviceType} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          )}
        </div>
        <div>
          <label className="block mb-1 font-medium">Payment Date</label>
          <input type="date" name="paymentDate" value={form.paymentDate} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block mb-1 font-medium">Payment Evidence (file)</label>
          <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files[0])} className="w-full" />
        </div>
        <div>
          <label className="block mb-1 font-medium">Notes</label>
          <textarea name="notes" value={form.notes} onChange={handleChange} className="w-full border rounded px-3 py-2" rows={4} />
        </div>
        <div>
          <button type="submit" disabled={submitting} className="bg-[#57123f] text-white px-4 py-2 rounded">{submitting ? 'Submitting...' : 'Submit'}</button>
        </div>
      </form>
    </div>
  );
};

export default Refund;
