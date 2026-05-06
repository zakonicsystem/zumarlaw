import axios from 'axios';

export const fetchEmployees = async () => {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const response = await axios.get(`${apiUrl}/api/admin/roles`);
  return response.data;
};
