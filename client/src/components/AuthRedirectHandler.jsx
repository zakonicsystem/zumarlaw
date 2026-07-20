import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const AuthRedirectHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const user = params.get('user');

    if (token && user) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('employeeToken');
      localStorage.removeItem('isSuperAdmin');
      localStorage.setItem('token', token);
      try {
        const parsedUser = JSON.parse(decodeURIComponent(user));
        localStorage.setItem('user', JSON.stringify(parsedUser));
      } catch (error) {
        console.error('Could not store Google user data:', error);
      }
      navigate('/', { replace: true });
    }
  }, [location, navigate]);

  return null;
};

export default AuthRedirectHandler;
