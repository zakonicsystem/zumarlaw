import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaReceipt, FaUserTie } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const FeeModal = ({ visible, onClose, onSubmit, type, item }) => {
  const [amount, setAmount] = useState('');

  useEffect(() => { if (!visible) setAmount(''); }, [visible]);

  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#57123f]">Add {type === 'challan' ? 'Challan' : 'Consultancy'} Fee</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>

        <div className="mb-3 text-sm text-gray-700">
          <div className="font-medium">Service</div>
          <div className="text-xs text-gray-500">{item?.name || item?._id || 'Unknown'}</div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-1">Amount</label>
          <input
            type="number"
            className="w-full px-3 py-2 border rounded-md focus:outline-none"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded bg-gray-100" onClick={onClose}>Cancel</button>
          <button
            className="px-4 py-2 rounded bg-[#57123f] text-white"
            onClick={() => {
              const n = parseFloat(amount);
              if (!n || n <= 0) return toast.error('Enter a valid amount');
              onSubmit({ amount: n, type });
            }}
          >Save</button>
        </div>
      </div>
    </div>
  );
};

const ChallanManagement = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [services, setServices] = useState([]);
  const [manual, setManual] = useState([]);
  const [converted, setConverted] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState(null);
  const [modalType, setModalType] = useState(null); // 'challan' | 'consultancy'
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [sRes, mRes, cRes] = await Promise.all([
          axios.get('https://app.zumarlawfirm.com/service').catch(() => ({ data: [] })),
          axios.get('https://app.zumarlawfirm.com/manualService').catch(() => ({ data: [] })),
          axios.get('https://app.zumarlawfirm.com/convertedService').catch(() => ({ data: [] })),
        ]);
        setServices(Array.isArray(sRes.data) ? sRes.data : []);
        setManual(Array.isArray(mRes.data) ? mRes.data : []);
        setConverted(Array.isArray(cRes.data) ? cRes.data : []);
      } catch (err) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const combined = React.useMemo(() => {
    const byId = new Map();
    [...services, ...manual, ...converted].forEach(item => {
      const id = item._id || item.id || JSON.stringify(item);
      if (!byId.has(id)) byId.set(id, { ...item, source: services.includes(item) ? 'service' : manual.includes(item) ? 'manual' : 'converted' });
    });
    return Array.from(byId.values());
  }, [services, manual, converted]);

  const getListForTab = () => {
    if (activeTab === 'all') return combined;
    if (activeTab === 'converted') return converted.map(i => ({ ...i, source: 'converted' }));
    if (activeTab === 'manual') return manual.map(i => ({ ...i, source: 'manual' }));
    if (activeTab === 'processing') return combined.filter(i => (i.status && i.status.toLowerCase().includes('process')) || i.processing);
    return combined;
  };

  const openModal = (item, type) => { setSelectedItem(item); setModalType(type); setModalVisible(true); };
  const closeModal = () => { setModalVisible(false); setSelectedItem(null); setModalType(null); };

  const submitFee = async ({ amount, type }) => {
    if (!selectedItem) return toast.error('No item selected');
    const payload = { serviceId: selectedItem._id || selectedItem.id, amount, feeType: type };
    toast.loading('Saving fee...');
    try {
      // Try a generic endpoint; if it fails it's non-blocking for UI demo
      await axios.post('https://app.zumarlawfirm.com/fees', payload).catch(() => { throw new Error('post-failed'); });
      toast.dismiss();
      toast.success('Fee added');
      // optimistically update local item
      const updateFn = (arr) => arr.map(it => (it._id === selectedItem._id ? { ...it, fees: [...(it.fees || []), { type, amount }] } : it));
      setServices(prev => updateFn(prev));
      setManual(prev => updateFn(prev));
      setConverted(prev => updateFn(prev));
      closeModal();
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to save fee (server may not support endpoint)');
    }
  };

  const list = getListForTab();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[#57123f]">Challan Management</h1>
        </div>

        <div className="mb-4">
          <div className="inline-flex rounded-md bg-gray-100 p-1">
            {['all','converted','manual','processing'].map(key => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 text-sm font-medium ${activeTab===key? 'bg-white shadow rounded' : 'text-gray-600'}`}
              >{key === 'all' ? 'All Services' : key.charAt(0).toUpperCase() + key.slice(1)}</button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="w-full text-sm text-left text-gray-800">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-gray-600 uppercase tracking-wide text-xs">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Primary</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr><td colSpan="6" className="text-center py-6 text-gray-400">Loading...</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-6 text-gray-400">No services found</td></tr>
              ) : list.map(item => (
                <tr key={item._id || item.id || (item.cnic || Math.random())} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs">{(item._id || item.id || '').toString().slice(-8)}</td>
                  <td className="px-4 py-3"><div className="font-semibold">{item.name || item.primaryName || 'N/A'}</div><div className="text-xs text-gray-500">{item.cnic || ''}</div></td>
                  <td className="px-4 py-3">{item.serviceType || item.type || 'N/A'}</td>
                  <td className="px-4 py-3 capitalize">{(item.source || (item.origin || '')).toString()}</td>
                  <td className="px-4 py-3">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openModal(item, 'challan')} className="flex items-center gap-2 px-3 py-1 rounded bg-yellow-100 text-yellow-900 text-sm"><FaReceipt />Challan</button>
                      <button onClick={() => openModal(item, 'consultancy')} className="flex items-center gap-2 px-3 py-1 rounded bg-indigo-100 text-indigo-900 text-sm"><FaUserTie />Consultancy</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <FeeModal
          visible={modalVisible}
          onClose={closeModal}
          onSubmit={submitFee}
          type={modalType}
          item={selectedItem}
        />
      </div>
    </div>
  );
};

export default ChallanManagement;
