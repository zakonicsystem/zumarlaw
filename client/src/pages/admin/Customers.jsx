import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const Customers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [visibleHashes, setVisibleHashes] = useState({});
  const [revealedPasswords, setRevealedPasswords] = useState({});
  const [confirmResetId, setConfirmResetId] = useState(null);

  // Helper to attach admin token from localStorage (same pattern used elsewhere)
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchSingleUser = async (id) => {
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const url = `${base.replace(/\/$/, '')}/admin/customers/${id}`;
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
  const url = `${base.replace(/\/$/, '')}/admin/customers`;
  const res = await axios.get(url);
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
                    const url = `${base.replace(/\/$/, '')}/admin/customers/${userId}/reset-password`;
                    const res = await axios.post(url, {}, { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } });
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
                      toast.error('Reset failed: no password returned');
                    }
                  } catch (err) {
                    console.error('Reset error', err);
                    toast.error('Reset failed');
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
                <th className="py-2 px-4 text-left">Password</th>
                <th className="py-2 px-4 text-left">Phone</th>
                <th className="py-2 px-4 text-left">Date Joined</th>
                <th className="py-2 px-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isVisible = !!visibleHashes[user._id];
                const masked = user.password ? '*'.repeat(8) : '-';
                return (
                  <tr key={user._id} className="border-t hover:bg-gray-50">
                    <td className="py-2 px-4">{user.name}</td>
                    <td className="py-2 px-4">{user.email}</td>
                    <td className="py-2 px-4 font-mono text-sm break-all">
                      {revealedPasswords[user._id]
                        ? (
                          <span className="inline-flex items-center">
                            <span className="font-mono text-sm mr-2">{revealedPasswords[user._id]}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard?.writeText(revealedPasswords[user._id]);
                                toast.success('Copied to clipboard');
                              }}
                              className="text-xs px-2 py-0.5 bg-gray-200 rounded mr-1"
                            >
                              Copy
                            </button>
                            <button
                              onClick={() => setRevealedPasswords((s) => { const c = { ...s }; delete c[user._id]; return c; })}
                              className="text-xs px-2 py-0.5 bg-gray-200 rounded"
                            >
                              Close
                            </button>
                          </span>
                        ) : isVisible
                        ? user.password || '-'
                        : masked}
                      <div className="inline-block ml-2">
                        {user.password ? (
                          <>
                            <button
                              onClick={async () => {
                                if (!user.password) {
                                  const data = await fetchSingleUser(user._id);
                                  if (!data || !data.password) return; // fetch failed or no password
                                }
                                setVisibleHashes((s) => ({ ...s, [user._id]: !s[user._id] }));
                              }}
                              className={`mr-2 text-xs ${user.password ? 'text-blue-600 hover:underline' : 'text-gray-600 hover:underline'}`}
                            >
                                {isVisible ? 'Hide' : 'Show'}
                            </button>
                              {user.password && (
                                <span className="sr-only">pw-visible-{isVisible ? '1' : '0'}</span>
                              )}
                            <button
                              onClick={() => setConfirmResetId(user._id)}
                              className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded"
                            >
                              Reset & Show
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-4">{user.phone}</td>
                    <td className="py-2 px-4">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-2 px-4">
                      {user.isActive ? (
                        <span className="text-green-600 font-semibold">Active</span>
                      ) : (
                        <span className="text-red-600 font-semibold">Inactive</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Customers;
