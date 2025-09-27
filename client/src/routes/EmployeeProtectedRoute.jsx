import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

const EmployeeProtectedRoute = ({ children }) => {
  const location = useLocation();
  const employeeToken = localStorage.getItem('employeeToken');
  let assignedPages = [];
  if (employeeToken) {
    try {
      const decoded = jwtDecode(employeeToken);
      assignedPages = decoded.assignedPages || [];
    } catch (e) {
      // ignore
    }
  }
  // If the current path is not in assignedPages, redirect to /employee-login
  if (employeeToken && !assignedPages.includes(location.pathname)) {
    return <Navigate to="/employee-login" replace />;
  }
  return children;
};

export default EmployeeProtectedRoute;
