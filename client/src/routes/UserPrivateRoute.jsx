// src/routes/UserPrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const UserPrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

export default UserPrivateRoute;
