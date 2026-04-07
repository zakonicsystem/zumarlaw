import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from '../utils/api';

const EmployeeProtectedRoute = ({ children }) => {
  const location = useLocation();
  const [status, setStatus] = useState('checking');
  const [assignedPages, setAssignedPages] = useState([]);

  useEffect(() => {
    let active = true;

    const verifyAccess = async () => {
      const employeeToken = localStorage.getItem('employeeToken');

      if (!employeeToken) {
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
          setAssignedPages(pages);
          // Check if current path is in assigned pages
          const isAllowed = Boolean(role === 'employee' && pages.includes(location.pathname));
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

  return status === 'authorized' ? children : <Navigate to="/admin/employee-login" replace />;
};

export default EmployeeProtectedRoute;
