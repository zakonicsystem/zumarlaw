import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const AuthRedirectHandler = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
      // ✅ Only store token, not full user object
      localStorage.setItem('token', token);
      navigate('/home', { replace: true });
    }
  }, [location, navigate]);

  return null;
};

export default AuthRedirectHandler;
