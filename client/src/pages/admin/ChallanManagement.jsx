import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaReceipt, FaUserTie } from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const FeeModal = ({ visible, onClose, onSubmit, type, item, existingFee }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && existingFee) {
      setAmount(existingFee.amount || '');
      setDescription(existingFee.description || '');
    } else {
      setAmount('');
      setDescription('');
    }
  }, [visible, existingFee]);

  if (!visible) return null;

  const handleSubmit = async () => {
    const n = parseFloat(amount);
    // Allow 0 or empty (sets fee to 0 = delete)
    const finalAmount = !amount || n === 0 ? 0 : n;
    if (n < 0) return toast.error('Enter a valid amount');
    setLoading(true);
    await onSubmit({ amount: finalAmount, type, description });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#57123f]">
            {existingFee ? 'Edit' : 'Add'} {type === 'challan' ? 'Challan' : 'Consultancy'} Fee
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
        </div>

        <div className="mb-3 text-sm text-gray-700">
          <div className="font-medium">Service: {item?.clientName || item?.name || 'Unknown'}</div>
          <div className="text-xs text-gray-500">Type: {item?.serviceName || item?.serviceType || 'N/A'}</div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-1">Amount (PKR)</label>
          <input
            type="number"
            className="w-full px-3 py-2 border rounded-md focus:outline-none"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-1">Description (Optional)</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-md focus:outline-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded bg-gray-100" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-[#57123f] text-white disabled:opacity-50"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
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
  const [challans, setChallans] = useState({});
  const [loading, setLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedChallan, setSelectedChallan] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Fetch all services
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [sRes, mRes, cRes] = await Promise.all([
          axios.get(`${apiUrl}/api/service`).catch(() => ({ data: [] })),
          axios.get(`${apiUrl}/api/manualService`).catch(() => ({ data: [] })),
          axios.get(`${apiUrl}/api/convertedService`).catch(() => ({ data: [] })),
        ]);
        setServices(Array.isArray(sRes.data) ? sRes.data : []);
        setManual(Array.isArray(mRes.data) ? mRes.data : []);
        setConverted(Array.isArray(cRes.data) ? cRes.data : []);

        // Fetch all challans
        const chRes = await axios.get(`${apiUrl}/api/challans`).catch(() => ({ data: { challans: [] } }));
        const challansByKey = {};
        (chRes.data.challans || []).forEach((c) => {
          const key = `${c.serviceSource}:${c.serviceId}`;
          challansByKey[key] = c;
        });
        setChallans(challansByKey);
      } catch (err) {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const combined = React.useMemo(() => {
    const items = [];
    services.forEach((item) => {
      items.push({ ...item, source: 'ServiceDetail', sourceLabel: 'Processing' });
    });
    manual.forEach((item) => {
      items.push({ ...item, source: 'ManualServiceSubmission', sourceLabel: 'Manual' });
    });
    converted.forEach((item) => {
      items.push({ ...item, source: 'ConvertedLead', sourceLabel: 'Converted' });
    });
    return items;
  }, [services, manual, converted]);

  const getChallanForItem = (item) => {
    const key = `${item.source}:${item._id}`;
    return challans[key];
  };

  const getListForTab = () => {
    if (activeTab === 'all') return combined;
    if (activeTab === 'converted') return combined.filter((i) => i.sourceLabel === 'Converted');
    if (activeTab === 'manual') return combined.filter((i) => i.sourceLabel === 'Manual');
    if (activeTab === 'processing') return combined.filter((i) => i.sourceLabel === 'Processing');
    return combined;
  };

  const openModal = (item, type, existingChallan) => {
    setSelectedItem(item);
    setSelectedChallan(existingChallan);
    setModalType(type);
    setIsEditing(!!existingChallan);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
    setSelectedChallan(null);
    setModalType(null);
    setIsEditing(false);
  };

  const submitFee = async ({ amount, type, description }) => {
    if (!selectedItem) return toast.error('No item selected');

    try {
      let response;
      if (isEditing && selectedChallan) {
        // Update existing challan - expects challanFee or consultancyFee fields
        const updatePayload = {
          [type === 'challan' ? 'challanFee' : 'consultancyFee']: amount,
        };
        response = await axios.patch(`${apiUrl}/api/challans/${selectedChallan._id}`, updatePayload);
      } else {
        // Create or add fee - expects different field names
        const addFeePayload = {
          serviceId: selectedItem._id,
          serviceSource: selectedItem.source,
          feeType: type,
          amount: amount,
          description,
        };
        response = await axios.post(`${apiUrl}/api/challans/add-fee`, addFeePayload);
      }

      if (response.data.success) {
        toast.success(`${type === 'challan' ? 'Challan' : 'Consultancy'} fee saved!`);
        setChallans((prev) => {
          const key = `${selectedItem.source}:${selectedItem._id}`;
          return { ...prev, [key]: response.data.challan };
        });
        closeModal();
      } else {
        toast.error(response.data.message || 'Failed to save fee');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save fee');
    }
  };

  const deleteFee = async (challanId, feeType) => {
    if (!window.confirm(`Delete ${feeType === 'challan' ? 'Challan' : 'Consultancy'} fee?`)) return;

    try {
      const payload = {
        [feeType === 'challan' ? 'challanFee' : 'consultancyFee']: 0,
      };
      const response = await axios.patch(`${apiUrl}/api/challans/${challanId}`, payload);

      if (response.data.success) {
        toast.success('Fee deleted!');
        setChallans((prev) => {
          const key = Object.keys(prev).find((k) => prev[k]._id === challanId);
          if (key) prev[key] = response.data.challan;
          return prev;
        });
      }
    } catch (err) {
      toast.error('Failed to delete fee');
    }
  };

  const list = getListForTab();

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#57123f] mb-2">Challan Management</h1>
          <p className="text-gray-600">Manage Challan & Consultancy Fees across all services</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b">
          {['all', 'converted', 'manual', 'processing'].map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`pb-3 px-4 font-medium border-b-2 transition-colors ${activeTab === key
                ? 'border-[#57123f] text-[#57123f]'
                : 'border-transparent text-gray-600 hover:text-[#57123f]'
                }`}
            >
              {key === 'all' ? 'All Services' : key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg shadow-sm border border-gray-200">
          <table className="w-full text-sm text-left text-gray-800">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-gray-600 uppercase tracking-wide text-xs font-semibold">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Service Type</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Total Payment</th>
                <th className="px-4 py-3">Challan Fee</th>
                <th className="px-4 py-3">Consultancy Fee</th>
                <th className="px-4 py-3">Total Fees</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-400">
                    Loading services...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-400">
                    No services found
                  </td>
                </tr>
              ) : (
                list.map((item) => {
                  const challan = getChallanForItem(item);
                  const totalFees = (challan?.challanFee?.amount || 0) + (challan?.consultancyFee?.amount || 0);

                  return (
                    <tr key={`${item.source}:${item._id}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{item.name || item.clientName || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{item.phone || item.clientPhone || ''}</div>
                      </td>
                      <td className="px-4 py-3">{item.serviceType || item.type || item.service || item.serviceTitle || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${item.sourceLabel === 'Processing'
                          ? 'bg-blue-100 text-blue-800'
                          : item.sourceLabel === 'Manual'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-green-100 text-green-800'
                          }`}>
                          {item.sourceLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">{item.pricing?.totalPayment || item.totalPayment || '-'}</td>
                      <td className="px-4 py-3 font-semibold">{challan?.challanFee?.amount || '-'}</td>
                      <td className="px-4 py-3 font-semibold">{challan?.consultancyFee?.amount || '-'}</td>
                      <td className="px-4 py-3 font-bold text-[#57123f]">
                        {totalFees > 0 ? `${totalFees}` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal(item, 'challan', challan)}
                            className="p-2 rounded hover:bg-opacity-80 transition"
                            style={{ backgroundColor: '#57123f', color: 'white' }}
                            title={challan?.challanFee?.amount ? 'Edit Challan Fee' : 'Add Challan Fee'}
                          >
                            <FaReceipt size={16} />
                          </button>
                          <button
                            onClick={() => openModal(item, 'consultancy', challan)}
                            className="p-2 rounded hover:bg-opacity-80 transition"
                            style={{ backgroundColor: '#57123f', color: 'white' }}
                            title={challan?.consultancyFee?.amount ? 'Edit Consultancy Fee' : 'Add Consultancy Fee'}
                          >
                            <FaUserTie size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fee Modal */}
      <FeeModal
        visible={modalVisible}
        onClose={closeModal}
        onSubmit={submitFee}
        type={modalType}
        item={selectedItem}
        existingFee={
          modalType === 'challan'
            ? selectedChallan?.challanFee
            : selectedChallan?.consultancyFee
        }
      />
    </div>
  );
};

export default ChallanManagement;
