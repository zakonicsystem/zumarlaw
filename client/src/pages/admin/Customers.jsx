import React, { useEffect, useState } from 'react';
import axios from 'axios';

const Customers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
  // Use Vite env var if provided (for VPS/deployment), otherwise default to localhost:5000 for dev
  const base = import.meta.env.VITE_API_URL || 'https://app.zumarlawfirm.com';
  const url = `${base.replace(/\/$/, '')}/admin/customers`;
  const res = await axios.get(url);
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
                <th className="py-2 px-4 text-left">Phone</th>
                <th className="py-2 px-4 text-left">Date Joined</th>
                <th className="py-2 px-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-4">{user.name}</td>
                  <td className="py-2 px-4">{user.email}</td>
                  <td className="py-2 px-4">{user.phone}</td>
                  <td className="py-2 px-4">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-4">
                    {user.isActive ? (
                      <span className="text-green-600 font-semibold">Active</span>
                    ) : (
                      <span className="text-red-600 font-semibold">Inactive</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Customers;
