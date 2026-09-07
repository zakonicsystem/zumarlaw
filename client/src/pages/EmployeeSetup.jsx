import { useState } from 'react';
import axios from 'axios';
export default function EmployeeSetup() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async event => {
    event.preventDefault(); setBusy(true);
    try { const { data } = await axios.post((import.meta.env.VITE_API_URL || '') + '/api/employee-setup', { token: new URLSearchParams(window.location.search).get('token'), newPassword: password }); setMessage(data.message); }
    catch (error) { setMessage(error.response?.data?.message || 'Setup failed'); }
    finally { setBusy(false); }
  };
  return <form onSubmit={submit} className="max-w-md mx-auto p-8 space-y-4"><h1 className="text-xl font-bold">Set your employee password</h1><input type="password" autoComplete="new-password" minLength={10} required value={password} onChange={e => setPassword(e.target.value)} className="border p-3 w-full" placeholder="At least 10 characters"/><button disabled={busy} className="bg-purple-900 text-white p-3">{busy ? 'Saving...' : 'Set password'}</button><p>{message}</p><a href="/admin/employee-login">Employee login</a></form>;
}
