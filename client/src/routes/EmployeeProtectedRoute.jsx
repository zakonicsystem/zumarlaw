import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from '../utils/api';

const EmployeeProtectedRoute = ({ children }) => {
  const location = useLocation();
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
        const pages = res?.data?.user?.assignedPages || [];

        if (active) {
          const isAdmin = role === 'admin';
          const isEmployeeAllowed = role === 'employee' && pages.includes(location.pathname);
          const isAllowed = Boolean(isAdmin || isEmployeeAllowed);
          setStatus(isAllowed ? 'authorized' : 'unauthorized');
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
  }, [location.pathname]);

  if (status === 'checking') {
    return null;
  }

  return status === 'authorized'
    ? children
    : <Navigate to={localStorage.getItem('adminToken') ? '/admin/login' : '/admin/employee-login'} replace />;
};

export default EmployeeProtectedRoute;
