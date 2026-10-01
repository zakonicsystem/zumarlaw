import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Navigate } from 'react-router-dom';

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function ApiControls() {
  const [authorized, setAuthorized] = useState(null);
  const [controls, setControls] = useState({});
  const [groups, setGroups] = useState({});
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem('adminToken');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${apiUrl}/api/system/api-controls`, { headers })
      .then(({ data }) => { setAuthorized(true); setControls(data.controls || {}); setGroups(data.groups || {}); })
      .catch(() => setAuthorized(false));
  }, []);

  if (authorized === null) return <div>Loading controls...</div>;
  if (!authorized) return <Navigate to="/admin" replace />;

  const save = async (next) => {
    setSaving(true);
    try { const { data } = await axios.put(`${apiUrl}/api/system/api-controls`, { controls: next }, { headers }); setControls(data.controls); }
    finally { setSaving(false); }
  };

  return <div className="max-w-4xl">
    <h1 className="text-2xl font-bold text-[#57123f]">Super Admin API Controls</h1>
    <p className="mt-1 mb-6 text-sm text-gray-600">Only the Super Admin can view or change these switches. Disabled API groups return a maintenance response to all other users.</p>
    <div className="grid gap-3 md:grid-cols-2">
      {Object.entries(groups).map(([key, group]) => <div key={key} className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-sm">
        <div><div className="font-semibold">{group.label}</div><div className="text-xs text-gray-500">{group.prefixes.join(', ')}</div></div>
        <button disabled={saving} onClick={() => save({ ...controls, [key]: controls[key] === false })} className={`rounded-full px-4 py-2 text-xs font-bold text-white ${controls[key] === false ? 'bg-red-600' : 'bg-green-600'}`}>{controls[key] === false ? 'BLOCKED' : 'OPEN'}</button>
      </div>)}
    </div>
  </div>;
}
