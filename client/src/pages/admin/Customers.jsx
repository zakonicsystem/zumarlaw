import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import api from '../../utils/api.js';

const Customers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [visibleHashes, setVisibleHashes] = useState({});
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [confirmResetId, setConfirmResetId] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerServices, setCustomerServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  // Helper to attach admin token from localStorage (same pattern used elsewhere)
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchCustomerServices = async (customer) => {
    setSelectedCustomer(customer);
    setServicesLoading(true);
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const url = base.replace(/\/$/, '');

      // Fetch from all service endpoints
      const [processingRes, manualRes, convertedRes] = await Promise.all([
        axios.get(`${url}/api/service`).catch(() => ({ data: [] })),
        axios.get(`${url}/api/manualService`).catch(() => ({ data: [] })),
        axios.get(`${url}/api/convertedService`).catch(() => ({ data: [] }))
      ]);

      const allServices = [
        ...(Array.isArray(processingRes.data) ? processingRes.data : []).map(s => ({ ...s, sourceType: 'Processing' })),
        ...(Array.isArray(manualRes.data) ? manualRes.data : []).map(s => ({ ...s, sourceType: 'Manual' })),
        ...(Array.isArray(convertedRes.data) ? convertedRes.data : []).map(s => ({ ...s, sourceType: 'Converted' }))
      ];

      // Filter by email or user reference
      const userServices = allServices.filter(s =>
        s.email === customer.email ||
        s.clientEmail === customer.email ||
        s.name?.toLowerCase() === customer.name?.toLowerCase() ||
        s.clientName?.toLowerCase() === customer.name?.toLowerCase()
      );

      setCustomerServices(userServices);
    } catch (err) {
      console.error('Error fetching services:', err);
      toast.error('Failed to load services');
      setCustomerServices([]);
    } finally {
      setServicesLoading(false);
    }
  };

  const fetchSingleUser = async (id) => {
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const url = `${base.replace(/\/$/, '')}/api/admin/customers/${id}`;
      const res = await axios.get(url, { headers: getAuthHeaders() });
      if (res && res.data) {
        // update users state with the returned password
        setUsers((prev) => prev.map(u => (u._id === id ? { ...u, password: res.data.password } : u)));
        setFilteredUsers((prev) => prev.map(u => (u._id === id ? { ...u, password: res.data.password } : u)));
        return res.data;
      }
    } catch (err) {
      console.error('Fetch single user error', err);
      toast.error('Failed to fetch user details');
    }
    return null;
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const url = `${base.replace(/\/$/, '')}/api/admin/customers`;
        const res = await axios.get(url, { headers: getAuthHeaders() });
        console.log('Fetched customers:', res.data);
        const arr = Array.isArray(res.data) ? res.data : [];
        setUsers(arr);
        setFilteredUsers(arr);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = users.filter(
      (user) =>
        user.name?.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.phone?.toLowerCase().includes(term) ||
        user.CNIC?.toLowerCase().includes(term)
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  return (
    <div className="">
      <h2 className="text-2xl font-semibold mb-4">Customers</h2>
      {/* Search Bar */}
      <input
        type="text"
        placeholder="Search by name, email, phone or CNIC..."
        className="w-full max-w-md px-4 py-2 mb-4 border rounded shadow-sm focus:outline-none focus:ring focus:border-blue-300"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* Confirmation modal for Reset & Show */}
      {confirmResetId && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Confirm password reset</h3>
            <p className="text-sm text-gray-600 mb-4">This will set a new temporary password for the user and return it once. Are you sure?</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setConfirmResetId(null)}
                className="px-3 py-1 border rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const userId = confirmResetId;
                  setConfirmResetId(null);
                  try {
                    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                    const url = `/api/admin/customers/${userId}/reset-password`;
                    const res = await api.post(url, {});
                    if (res && res.data && res.data.newPassword) {
                      setRevealedPasswords((s) => ({ ...s, [userId]: res.data.newPassword }));
                      toast.success('Password reset — showing temporary password');
                      // Auto-hide after 60s
                      setTimeout(() => {
                        setRevealedPasswords((s) => {
                          const copy = { ...s };
                          delete copy[userId];
                          return copy;
                        });
                      }, 60000);
                    } else {
                      toast.error(res.data?.message || 'Reset failed: no password returned');
                    }
                  } catch (err) {
                    console.error('Reset error', err);
                    toast.error(err.response?.data?.message || 'Reset failed');
                  }
                }}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
              >
                Confirm & Show
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : filteredUsers.length === 0 ? (
        <p className="text-red-500">No customers found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow border">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-100 text-gray-700 text-sm uppercase">
                <th className="py-2 px-4 text-left">Name</th>
                <th className="py-2 px-4 text-left">Email</th>
                <th className="py-2 px-4 text-left"> Phone</th>
                <th className="py-2 px-4 text-left">Password</th>
                <th className="py-2 px-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isVisible = !!visibleHashes[user._id];
                const masked = user.password ? '*'.repeat(8) : '-';
                return (
                  <tr key={user._id} className="border-t hover:bg-gray-50">
                    <td className="py-2 px-4 font-semibold">{user.name}</td>
                    <td className="py-2 px-4">
                      <div className="text-sm">
                        <p className="font-medium">{user.email}</p>

                      </div>
                    </td>
                    <td className='px-4 py-2' > <div className='text-sm'>
                      <p className="text-gray-600">{user.phone || '-'}</p> </div></td>

                    <td className="py-2 px-4 font-mono text-sm break-all">
                      <button
                        onClick={() => setConfirmResetId(user._id)}
                        className="text-xs bg-orange-600 text-white px-2 py-0.5 rounded hover:bg-orange-700"
                      >
                        Reset Password
                      </button>
                    </td>

                    <td className="py-2 px-4">
                      <button
                        onClick={() => fetchCustomerServices(user)}
                        className="text-xs bg-[#57123f] text-white px-3 py-1.5 rounded hover:bg-opacity-80 transition"
                      >
                        View Services
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Services Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-[#57123f] text-white p-4 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">{selectedCustomer.name}</h2>
                <p className="text-sm opacity-90">{selectedCustomer.email}</p>
              </div>
              <button
                onClick={() => { setSelectedCustomer(null); setCustomerServices([]); }}
                className="text-2xl hover:opacity-80"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {servicesLoading ? (
                <p className="text-center text-gray-500">Loading services...</p>
              ) : customerServices.length === 0 ? (
                <p className="text-center text-gray-500">No services found for this customer.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-200 text-gray-800">
                        <th className="border px-4 py-2 text-left">Service Type</th>
                        <th className="border px-4 py-2 text-left">Source</th>
                        <th className="border px-4 py-2 text-left">Date</th>
                        <th className="border px-4 py-2 text-left">Total Payment</th>
                        <th className="border px-4 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customerServices.map((service, idx) => {
                        const totalPayment = service.pricing?.totalPayment || service.totalPayment || 0;
                        const received = service.pricing?.receivedPayment || service.receivedPayment || 0;
                        const remaining = totalPayment - received;
                        const status = service.status || service.serviceStatus || 'Active';

                        return (
                          <tr key={idx} className="border-t hover:bg-gray-50">
                            <td className="border px-4 py-2">
                              <span className="font-semibold">{service.serviceType || service.type || service.service || service.serviceName || 'N/A'}</span>
                            </td>
                            <td className="border px-4 py-2">
                              <span className={`text-xs px-2 py-1 rounded font-semibold ${service.sourceType === 'Processing' ? 'bg-blue-100 text-blue-800' :
                                service.sourceType === 'Manual' ? 'bg-orange-100 text-orange-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                {service.sourceType || 'Unknown'}
                              </span>
                            </td>
                            <td className="border px-4 py-2 text-xs">
                              {service.createdAt ? new Date(service.createdAt).toLocaleDateString() : '-'}
                            </td>
                            <td className="border px-4 py-2 font-semibold">PKR {totalPayment.toLocaleString()}</td>
                            <td className="border px-4 py-2">
                              <span className={`text-xs px-2 py-1 rounded ${status?.toLowerCase() === 'completed' || status?.toLowerCase() === 'done'
                                ? 'bg-green-100 text-green-800'
                                : status?.toLowerCase() === 'hold' || status?.toLowerCase() === 'on hold'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                                }`}>
                                {status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
