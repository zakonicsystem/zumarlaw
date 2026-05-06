import React from "react";
import { Navigate } from "react-router-dom";

const PrivateAdminRoute = ({ children }) => {
  const adminToken = localStorage.getItem("adminToken");
  const employeeToken = localStorage.getItem("employeeToken");
  // Allow access if either admin or employee is authenticated
  const isAuthenticated = !!adminToken || !!employeeToken;
  return isAuthenticated ? children : <Navigate to="/admin/login" />;
};

export default PrivateAdminRoute;
