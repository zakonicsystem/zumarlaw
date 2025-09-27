import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const NewEmployee = ({ onEmployeeAdded }) => {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    cnic: '',
    role: 'Employee',
    salary: '', // new field
    branch: '', // new field
    assignedPages: [],
    tasks: []
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const roles = ['CEO', 'Director', 'Branch Manager', 'PRO', 'Assistant Branch Manager', 'IT Manager', 'Employee'];
  const pages = [
    {
      label: 'Leads',
      path: '/admin/leads',
      children: [
        { label: 'New Leads', path: '/admin/leads/new' },
        { label: 'Mature Leads', path: '/admin/leads/mature' },
        { label: 'Contacted Leads', path: '/admin/leads/contacted' },
        { label: 'Followup Leads', path: '/admin/leads/followup' },
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
        { label: 'Add Manual Service', path: '/admin/add-service' },
      ]
    },
    { label: 'Payroll', path: '/admin/payroll',
      children:[
        { label: 'AddPayroll', path:'/admin/payroll/add' },
        { label: 'Account', path: '/admin/account' }
      ]
     },
    { label: 'Expense', path: '/admin/expense', },
    { label: 'Attendance', path: '/admin/attendance', },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePageSelection = (e) => {
    const { value, checked } = e.target;

    setForm(prev => {
      let updatedPages = [...prev.assignedPages];

      if (value === '/admin/leads') {
        const leadPages = ['/admin/leads', '/admin/leads/add', '/admin/leads/import'];
        if (checked) {
          updatedPages = Array.from(new Set([...updatedPages, ...leadPages]));
        } else {
          updatedPages = updatedPages.filter(p => !leadPages.includes(p));
        }
      } else {
        if (checked) {
          updatedPages.push(value);
        } else {
          updatedPages = updatedPages.filter(p => p !== value);
        }
      }

      return { ...prev, assignedPages: updatedPages };
    });
  };

  const validateForm = () => {
    if (!form.name || !form.phone || !form.email || !form.cnic || !form.salary || !form.branch) {
      toast.error('Please fill all required fields');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(form.email)) {
      toast.error('Please enter a valid email');
      return false;
    }
    if (!/^\d{5}-\d{7}-\d{1}$/.test(form.cnic)) {
      toast.error('Please enter a valid CNIC (format: xxxxx-xxxxxxx-x)');
      return false;
    }
    return true;
  };

  // Store the last created employee credentials for display in Roles.jsx (optional: you can lift this state up)
  const [lastCreatedEmployee, setLastCreatedEmployee] = useState(null);

  const handleAddEmployee = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const endpoint = isEditing
        ? `https://app.zumarlawfirm.com/admin/roles/${editId}`
        : 'https://app.zumarlawfirm.com/admin/roles';

      const method = isEditing ? 'put' : 'post';

      const res = await axios[method](endpoint, form, {
        withCredentials: true
      });

      // If backend returns the created employee with plainPassword, store it for display and pass to parent
      if (!isEditing && res.data && res.data.email && res.data.plainPassword) {
        setLastCreatedEmployee({
          email: res.data.email,
          password: res.data.plainPassword
        });
        if (onEmployeeAdded) onEmployeeAdded({
          email: res.data.email,
          password: res.data.plainPassword
        });
      } else {
        if (onEmployeeAdded) onEmployeeAdded();
      }

      toast.success(isEditing ? 'Employee updated successfully!' : 'Employee added successfully!');
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
      setIsEditing(false);
      setEditId(null);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      phone: '',
      email: '',
      cnic: '',
      role: 'Employee',
      salary: '', // new field
      branch: '', // new field
      assignedPages: [],
      tasks: []
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Roles Management Panel</h2>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Add New Employee</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="border px-3 py-2 rounded" />
          <input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" className="border px-3 py-2 rounded" />
          <input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="border px-3 py-2 rounded" />
          <input name="cnic" value={form.cnic} onChange={handleChange} placeholder="CNIC (xxxxx-xxxxxxx-x)" className="border px-3 py-2 rounded" />
          <select name="role" value={form.role} onChange={handleChange} className="border px-3 py-2 rounded">
            {roles.map((role, i) => <option key={i} value={role}>{role}</option>)}
          </select>
          <input name="salary" value={form.salary} onChange={handleChange} placeholder="Salary" className="border px-3 py-2 rounded" />
          <input name="branch" value={form.branch} onChange={handleChange} placeholder="Branch" className="border px-3 py-2 rounded" />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-2">Assign Pages:</label>
          <div className="grid grid-cols-2 gap-2">
            {pages.map((page, i) => (
              <div key={i}>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    value={page.path}
                    checked={form.assignedPages.includes(page.path)}
                    onChange={e => {
                      const checked = e.target.checked;
                      setForm(prev => {
                        let updatedPages = [...prev.assignedPages];
                        if (checked) {
                          if (!updatedPages.includes(page.path)) updatedPages.push(page.path);
                          // If parent has children, add all children
                          if (page.children) {
                            page.children.forEach(child => {
                              if (!updatedPages.includes(child.path)) updatedPages.push(child.path);
                            });
                          }
                        } else {
                          updatedPages = updatedPages.filter(p => p !== page.path);
                          // Also remove all children if parent is unchecked
                          if (page.children) {
                            updatedPages = updatedPages.filter(p => !page.children.some(child => child.path === p));
                          }
                        }
                        return { ...prev, assignedPages: updatedPages };
                      });
                    }}
                  />
                  <span>{page.label}</span>
                </label>
                {/* Children checkboxes: only show if parent is checked */}
                {page.children && form.assignedPages.includes(page.path) && (
                  <div className="ml-6 mt-1 flex flex-col gap-1">
                    {page.children.map((child, j) => (
                      <label key={j} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          value={child.path}
                          checked={form.assignedPages.includes(child.path)}
                          onChange={e => {
                            const checked = e.target.checked;
                            setForm(prev => {
                              let updatedPages = [...prev.assignedPages];
                              if (checked) {
                                if (!updatedPages.includes(child.path)) updatedPages.push(child.path);
                                // If any child is checked, ensure parent is checked
                                if (!updatedPages.includes(page.path)) updatedPages.push(page.path);
                              } else {
                                updatedPages = updatedPages.filter(p => p !== child.path);
                                // If no children are checked, uncheck parent
                                if (!page.children.some(c => updatedPages.includes(c.path))) {
                                  updatedPages = updatedPages.filter(p => p !== page.path);
                                }
                              }
                              return { ...prev, assignedPages: updatedPages };
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
          onClick={handleAddEmployee}
          disabled={loading}
          className="bg-[#57123f] text-white px-4 py-2 rounded hover:bg-opacity-90 disabled:opacity-50"
        >
          {loading ? 'Processing...' : isEditing ? 'Update Employee' : 'Add Employee'}
        </button>
      </div>
    </div>
  );
};

export default NewEmployee;
