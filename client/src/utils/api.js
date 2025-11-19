import axios from 'axios';
import { toast } from 'react-hot-toast';

// Central axios instance that attaches JWT from localStorage
const backend = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : 'https://app.zumarlawfirm.com';

const api = axios.create({
  baseURL: backend.replace(/\/$/, ''),
  timeout: 15000,
});

// Attach token automatically if present
api.interceptors.request.use((config) => {
  try {
    // Prefer adminToken if present so admin UI actions send the admin JWT.
    const token = localStorage.getItem('adminToken') || localStorage.getItem('token') || localStorage.getItem('employeeToken');
    if (token && token !== 'null') {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return config;
}, (err) => Promise.reject(err));

// Handle auth errors globally: clear tokens and redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('employeeToken');
      } catch (e) {
        // ignore
      }
      toast.error('Session expired, please login again');
      // Redirect to admin login (keep it simple)
      try {
        window.location.href = '/admin/login';
      } catch (e) {
        // ignore
      }
    }
    return Promise.reject(error);
  }
);

export default api;
