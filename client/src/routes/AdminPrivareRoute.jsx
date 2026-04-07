import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../utils/api';

const AdminPrivateRoute = ({ children }) => {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let active = true;

    const verifyAccess = async () => {
      const adminToken = localStorage.getItem('adminToken');
      const employeeToken = localStorage.getItem('employeeToken');

      if (!adminToken && !employeeToken) {
        if (active) {
          setStatus('unauthorized');
        }
        return;
      }

      try {
        const res = await api.get('/auth/whoami');
        const role = res?.data?.user?.role;
        const allowed = Boolean(role && ['admin', 'employee'].includes(role));

        if (active) {
          setStatus(allowed ? 'authorized' : 'unauthorized');
        }
      } catch (error) {
        try {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('employeeToken');
          localStorage.removeItem('token');
        } catch (e) {
          // ignore
        }

        if (active) {
          setStatus('unauthorized');
        }
      }
    };

    verifyAccess();

    return () => {
      active = false;
    };
  }, []);

  if (status === 'checking') {
    return null;
  }

  return status === 'authorized' ? children : <Navigate to="/admin/login" replace />;
};

export default AdminPrivateRoute;
