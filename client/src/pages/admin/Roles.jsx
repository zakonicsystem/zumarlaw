
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Edit, Trash2, Eye, UserX, RotateCcw } from 'lucide-react';
import { FaTasks, FaListAlt } from 'react-icons/fa';
import NewEmployee from './NewEmployee';

// Define the pages structure for label mapping
const pages = [
  {
    label: 'Leads',
    path: '/admin/leads',
    children: [
      { label: 'New Leads', path: '/admin/leads/new' },
      { label: 'Mature Leads', path: '/admin/leads/mature' },
      { label: 'Contacted Leads', path: '/admin/leads/contacted' },
      { label: 'Followup Leads', path: '/admin/leads/followup' },
      { label: 'Refusal Leads', path: '/admin/leads/refusal' },
      { label: 'Add Lead', path: '/admin/leads/add' },
      { label: 'Import Leads', path: '/admin/leads/import' },
    ]
  },
  {
    label: 'Services',
    path: '/admin/services',
    children: [
      { label: 'Service Processing', path: '/admin/services' },
      { label: 'Converted Services', path: '/admin/services/converted' },
      { label: 'Manual Services', path: '/admin/services/manual' },
      { label: 'Merged Services', path: '/admin/services/merged' },
      { label: 'Add Manual Service', path: '/admin/add-service' },
      { label: 'Refunds Admin', path: '/admin/refunds' },
    ]
  },
  {
    label: 'Payroll', path: '/admin/payroll',
    children: [{
      label: 'AddPayroll', path: '/admin/payroll/add'
    },
    { label: 'Account', path: '/admin/account' }
    ]
  },
  {
    label: 'Roles', path: '/admin/roles',
    children: [
      { label: 'Add New Employee', path: '/admin/roles/add', },
    ]
  },
  { label: 'Customers', path: '/admin/customers' },
  { label: 'Client History', path: '/admin/client-history' },
  {
    label: 'Account', path: '/admin/account',
    children: [
      { label: 'Expense', path: '/admin/expense' },
      { label: 'Expense Submissions', path: '/admin/expense-submissions' },
    ]
  },
];

const Roles = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});

  // Modal state for viewing credentials
  const [viewModal, setViewModal] = useState(false);
  const [viewEmployee, setViewEmployee] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState(null);
  const [terminateModal, setTerminateModal] = useState(false);
  const [terminateEmployee, setTerminateEmployee] = useState(null);
  const [terminateReason, setTerminateReason] = useState('');
  const [terminateDate, setTerminateDate] = useState(new Date().toISOString().slice(0, 10));
  // Function to handle Eye button click
  const handleViewCredentials = (emp) => {
    // Only show plain password if available, never show hashed password
    let email = emp.email;
    let password = '';
    if (emp.credentials && emp.credentials.email && emp.credentials.password) {
      email = emp.credentials.email;
      password = emp.credentials.password;
    } else if (emp.plainPassword) {
      password = emp.plainPassword;
    } else {
      password = 'Not available (only shown immediately after creation or on password reset)';
    }
    setViewEmployee({ email, password });
    setViewModal(true);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await axios.get(`${apiUrl}/api/admin/roles`, {
        withCredentials: true
      });
      setEmployees(response.data);
    } catch (error) {
      toast.error('Failed to fetch employees');
    } finally {
      setLoading(false);
    }
  };


  // Edit handler: set form state and editing mode
  const handleEdit = (employee) => {
    setForm({ ...employee });
    setIsEditing(true);
    setEditId(employee._id);
  };


  // Handler for when a new employee is added from NewEmployee.jsx
  const handleEmployeeAdded = (credentials) => {
    if (credentials && credentials.email && credentials.password) {
      setViewEmployee(credentials);
      setViewModal(true);
    }
    fetchEmployees();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;

    try {
      setLoading(true); // Start loading
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.delete(`${apiUrl}/api/admin/roles/${id}`, {
        withCredentials: true,
      });

      toast.success('Employee deleted successfully');
      await fetchEmployees(); // Refresh the list after deletion
    } catch (error) {
      console.error('Delete Error:', error);
      toast.error('Failed to delete employee');
    } finally {
      setLoading(false); // End loading
    }
  };

  const openTerminateModal = (employee) => {
    if (employee.employmentStatus === 'terminated') {
      toast.error('Employee is already terminated');
      return;
    }
    setTerminateEmployee(employee);
    setTerminateReason('');
    setTerminateDate(new Date().toISOString().slice(0, 10));
    setTerminateModal(true);
  };

  const closeTerminateModal = () => {
    setTerminateModal(false);
    setTerminateEmployee(null);
    setTerminateReason('');
    setTerminateDate(new Date().toISOString().slice(0, 10));
  };

  const handleTerminateSubmit = async (event) => {
    event.preventDefault();
    if (!terminateEmployee) return;
    if (!terminateReason.trim()) {
      toast.error('Termination reason is required');
      return;
    }

    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.patch(`${apiUrl}/api/admin/roles/${terminateEmployee._id}/terminate`, {
        terminatedAt: terminateDate,
        reason: terminateReason.trim()
      }, {
        withCredentials: true,
      });

      toast.success('Employee terminated successfully');
      closeTerminateModal();
      await fetchEmployees();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to terminate employee');
    } finally {
      setLoading(false);
    }
  };

  const handleUnterminate = async (employee) => {
    if (!window.confirm(`Restore ${employee.name} as an active employee?`)) return;

    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      await axios.patch(`${apiUrl}/api/admin/roles/${employee._id}/unterminate`, {}, {
        withCredentials: true,
      });

      toast.success('Employee restored successfully');
      await fetchEmployees();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to restore employee');
    } finally {
      setLoading(false);
    }
  };




  {/* Add NewEmployee component for adding employees and showing password */ }
  <NewEmployee onEmployeeAdded={handleEmployeeAdded} />

  {/* ...existing code... */ }

  useEffect(() => {
    if (!isEditing) setForm({});
  }, [isEditing]);

  const pageMap = {
    '/admin/services': 'Service Processing',
    '/admin/leads': 'Leads Management',
    '/admin/leads/add': 'Leads Management',
    '/admin/leads/import': 'Leads Management',
    '/admin/services/merged': 'Service Processing',
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        {/* Modal for viewing credentials */}
        {viewModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
            <div className="bg-white p-6 rounded shadow-lg min-w-[300px] relative">
              <button onClick={() => setViewModal(false)} className="absolute top-2 right-2 text-gray-500 hover:text-black">&times;</button>
              <h3 className="text-lg font-bold mb-2">Employee Credentials</h3>
              {viewLoading ? (
                <div>Loading...</div>
              ) : viewError ? (
                <div className="text-red-500">{viewError}</div>
              ) : viewEmployee ? (
                <>
                  <div className="mb-2"><b>Email:</b> {viewEmployee.email}</div>
                  <div className="mb-4"><b>Password:</b> {viewEmployee.password}</div>
                </>
              ) : null}
              <button
                className="bg-[#57123f] text-white px-4 py-2 rounded mt-2"
                onClick={() => setViewModal(false)}
              >Close</button>
            </div>
          </div>
        )}
        <h3 className="text-lg font-semibold mb-4">Employee List</h3>
        {terminateModal && terminateEmployee && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 p-4">
            <form onSubmit={handleTerminateSubmit} className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Terminate Employee</h3>
                  <p className="text-sm text-gray-600">{terminateEmployee.name}</p>
                </div>
                <button type="button" onClick={closeTerminateModal} className="text-gray-500 hover:text-gray-800 text-xl leading-none">&times;</button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Termination Date</label>
                  <input
                    type="date"
                    value={terminateDate}
                    onChange={(e) => setTerminateDate(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea
                    value={terminateReason}
                    onChange={(e) => setTerminateReason(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                    placeholder="Write termination reason"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={closeTerminateModal} className="px-4 py-2 rounded border border-gray-300 text-gray-700">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-red-600 text-white disabled:opacity-50">
                  {loading ? 'Terminating...' : 'Terminate'}
                </button>
              </div>
            </form>
          </div>
        )}
        {employees.length === 0 ? (
          <p className="text-gray-500">No employees added.</p>
        ) : (
          <table className="w-full rounded border text-sm ">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 text-xs">Name & CNIC</th>
                <th className="p-2 text-xs">Phone & Email</th>
                <th className="p-2 text-xs">Roles</th>
                <th className="p-2 text-xs">Salary</th>
                <th className="p-2 text-xs">Branch</th>
                <th className="p-2 text-xs">Data Access</th>
                <th className="p-2 text-xs">Assign Pages</th>
                <th className="p-2 text-xs"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, index) => (
                <tr key={index} className="text-left hover:bg-gray-50 border-b">
                  <td className="p-2 text-xs" title={emp.name}>
                    <div className="font-semibold text-gray-800 flex items-center gap-2">
                      <span>{emp.name}</span>
                      {emp.employmentStatus === 'terminated' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">Terminated</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{emp.cnic}</div>
                    {emp.employmentStatus === 'terminated' && emp.terminatedAt && (
                      <div className="text-[10px] text-red-600">Terminated: {new Date(emp.terminatedAt).toLocaleDateString()}</div>
                    )}
                    {emp.employmentStatus === 'terminated' && emp.terminatedReason && (
                      <div className="text-[10px] text-gray-500 truncate" title={emp.terminatedReason}>Reason: {emp.terminatedReason}</div>
                    )}
                  </td>
                  <td className="p-2 text-xs" title={emp.phone}>
                    <div className="text-gray-700">{emp.phone}</div>
                    <div className="text-xs text-gray-500">{emp.email}</div>
                  </td>
                  <td className="p-2 text-xs" title={emp.role}>{emp.role}</td>
                  <td className="p-2 text-xs" title={emp.salary}>{emp.salary}</td>
                  <td className="p-2 text-xs" title={emp.branch}>{emp.branch}</td>
                  <td className="p-2 text-xs">
                    {emp.canViewAllLeadsAndServices ? (
                      <span className="rounded-full bg-purple-100 px-2 py-1 text-purple-700">All leads & services</span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">Assigned only</span>
                    )}
                  </td>
                  <td className="p-2 text-xs">
                    {emp.assignedPages?.length ? (
                      (() => {
                        // Map path to label using pages structure
                        const getLabel = (path) => {
                          for (const page of pages) {
                            if (page.path === path) return page.label;
                            if (page.children) {
                              const child = page.children.find(c => c.path === path);
                              if (child) return child.label;
                            }
                          }
                          return path;
                        };
                        const names = Array.from(new Set(emp.assignedPages.map(getLabel)));
                        return (
                          <span title={names.join(', ')}>
                            {names.join(', ')}
                          </span>
                        );
                      })()
                    ) : '-'}
                  </td>
                  <td className="p-2 text-xs ">
                    <div className="flex justify-center gap-2">
                      <button
                        className="text-[#57123f] hover:bg-blue-100 rounded-full p-2"
                        title="View"
                        onClick={() => handleViewCredentials(emp)}
                      >
                        <Eye size={20} />
                      </button>
                      <button onClick={() => handleEdit(emp)} className="text-[#57123f] hover:bg-indigo-100 rounded-full p-2" title="Edit">
                        <Edit size={20} />
                      </button>
                      {emp.employmentStatus === 'terminated' ? (
                        <button
                          onClick={() => handleUnterminate(emp)}
                          className="text-[#57123f] hover:bg-green-100 rounded-full p-2"
                          title="Un-terminate Employee"
                        >
                          <RotateCcw size={20} />
                        </button>
                      ) : (
                        <button
                          onClick={() => openTerminateModal(emp)}
                          className="text-[#57123f] hover:bg-orange-100 rounded-full p-2"
                          title="Terminate Employee"
                        >
                          <UserX size={20} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(emp._id)} className="text-[#57123f] hover:bg-red-100 rounded-full p-2" title="Delete">
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal for viewing credentials */}
      {viewModal && viewEmployee && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-6 rounded shadow-lg min-w-[300px] relative">
            <button onClick={() => setViewModal(false)} className="absolute top-2 right-2 text-gray-500 hover:text-black">&times;</button>
            <h3 className="text-lg font-bold mb-2">Employee Credentials</h3>
            <div className="mb-2"><b>Email:</b> {viewEmployee.email}</div>
            <div className="mb-4"><b>Password:</b> {viewEmployee.password}</div>
            <button
              className="bg-[#57123f] text-white px-4 py-2 rounded mt-2"
              onClick={() => setViewModal(false)}
            >Close</button>
          </div>
        </div>
      )}

      {/* Add a form for editing below the table */}
      {isEditing && (
        <div className="bg-white p-4 rounded shadow mb-6 mt-4">
          <h3 className="text-lg font-semibold mb-4">Edit Employee</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <input name="name" value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" className="border px-3 py-2 rounded" />
            <input name="phone" value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" className="border px-3 py-2 rounded" />
            <input name="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" className="border px-3 py-2 rounded" />
            <input name="cnic" value={form.cnic || ''} onChange={e => setForm(f => ({ ...f, cnic: e.target.value }))} placeholder="CNIC" className="border px-3 py-2 rounded" />
            {/* Role dropdown for editing role */}
            <select
              name="role"
              value={form.role || ''}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="border px-3 py-2 rounded"
            >
              <option value="">Select Role</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Employee">Employee</option>
              <option value="Sales">Sales</option>
              <option value="Accounts">Accounts</option>
              <option value="HR">HR</option>
              <option value="Support">Support</option>
              <option value="Other">Other</option>
            </select>
            <input name="salary" value={form.salary || ''} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="Salary" className="border px-3 py-2 rounded" />
            <input name="branch" value={form.branch || ''} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))} placeholder="Branch" className="border px-3 py-2 rounded" />
          </div>
          <label className="mb-4 flex items-start gap-3 rounded border border-purple-200 bg-purple-50 p-3">
            <input
              type="checkbox"
              checked={form.canViewAllLeadsAndServices === true}
              onChange={e => setForm(f => ({ ...f, canViewAllLeadsAndServices: e.target.checked }))}
              className="mt-1"
            />
            <span>
              <span className="block font-medium text-[#57123f]">View all leads and services</span>
              <span className="block text-sm text-gray-600">When disabled, the employee can only access records assigned to them.</span>
            </span>
          </label>
          <div className="mb-4">
            <label className="font-medium mb-2 flex items-center gap-2 text-[#57123f] text-base">
              <FaTasks className="inline text-orange-600" /> Assign Pages
            </label>
            <div className="grid grid-cols-2 gap-2">
              {pages.map((page, i) => (
                <div key={page.path} className="bg-gray-50 rounded px-2 py-1 mb-1">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={form.assignedPages?.includes(page.path) || false}
                      onChange={e => {
                        setForm(f => {
                          let assigned = f.assignedPages ? [...f.assignedPages] : [];
                          if (e.target.checked) {
                            // Add parent and all children if not present
                            assigned.push(page.path);
                            if (page.children) {
                              page.children.forEach(child => {
                                if (!assigned.includes(child.path)) assigned.push(child.path);
                              });
                            }
                          } else {
                            // Remove parent and all children
                            assigned = assigned.filter(p => p !== page.path && !(page.children && page.children.some(child => child.path === p)));
                          }
                          return { ...f, assignedPages: assigned };
                        });
                      }}
                    />
                    <span className="font-semibold">{page.label}</span>
                  </label>
                  {/* Render children if any */}
                  {page.children && (
                    <div className="ml-6 mt-1">
                      {page.children.map(child => (
                        <label key={child.path} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={form.assignedPages?.includes(child.path) || false}
                            onChange={e => {
                              setForm(f => {
                                let assigned = f.assignedPages ? [...f.assignedPages] : [];
                                if (e.target.checked) {
                                  if (!assigned.includes(child.path)) assigned.push(child.path);
                                } else {
                                  assigned = assigned.filter(p => p !== child.path);
                                }
                                return { ...f, assignedPages: assigned };
                              });
                            }}
                          />
                          <span>{child.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                setLoading(true);
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                await axios.put(`${apiUrl}/api/admin/roles/${editId}`, form, { withCredentials: true });
                toast.success('Employee updated successfully!');
                setIsEditing(false);
                setEditId(null);
                fetchEmployees();
              } catch (error) {
                toast.error('Failed to update employee');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="bg-[#57123f] text-white px-4 py-2 rounded hover:bg-opacity-90 disabled:opacity-50 mr-2"
          >
            {loading ? 'Updating...' : 'Update Employee'}
          </button>
          <button
            onClick={() => { setIsEditing(false); setEditId(null); }}
            className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-opacity-90"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default Roles;
