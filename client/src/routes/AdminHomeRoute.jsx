import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../utils/api';
import Dashboard from '../pages/admin/Dashboard';

const AdminHomeRoute = () => {
  const [status, setStatus] = useState('checking');
  const [targetPath, setTargetPath] = useState(null);

  useEffect(() => {
    let active = true;

    const resolveHome = async () => {
      try {
        const res = await api.get('/auth/whoami');
        const role = res?.data?.user?.role;
        const pages = res?.data?.user?.assignedPages || [];

        if (!active) {
          return;
        }

        if (role === 'admin') {
          setStatus('admin');
          return;
        }

        if (role === 'employee') {
          const firstAssignedPage = Array.isArray(pages) ? pages.find(Boolean) : null;
          setTargetPath(firstAssignedPage || '/admin/employee-login');
          setStatus('employee');
          return;
        }

        setStatus('unauthorized');
      } catch (error) {
        setStatus('unauthorized');
      }
    };

    resolveHome();

    return () => {
      active = false;
    };
  }, []);

  if (status === 'checking') {
    return null;
  }

  if (status === 'admin') {
    return <Dashboard />;
  }

  if (status === 'employee') {
    return <Navigate to={targetPath || '/admin/employee-login'} replace />;
  }

  return <Navigate to="/admin/login" replace />;
};

export default AdminHomeRoute;
