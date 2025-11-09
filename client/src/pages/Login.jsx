import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import axios from 'axios';
import { Toaster, toast } from 'react-hot-toast';
import { jwtDecode } from 'jwt-decode'; // ✅ CORRECT

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(
        'http://localhost:5000/auth/login',
        formData,
        {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        }
      );

      const { token } = response.data;

      if (token) {
        localStorage.setItem('token', token);

        const decodedUser = jwtDecode(token);
        localStorage.setItem('user', JSON.stringify(decodedUser));

        toast.success('Welcome to Zumar Law Firm!');
        navigate('/');
      } else {
        toast.error('Invalid response from server');
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        (error.response?.status === 401
          ? 'Invalid email or password'
          : 'Connection error. Please try again.');
      toast.error(msg);
      console.error('Login error:', error.response || error);
    }
  };

  const handleGoogleLogin = () => {
    toast.loading('Redirecting to Google...');
    window.location.href = 'http://localhost:5000/auth/google';
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');

    if (token && userParam) {
      try {
        // Decode and parse the user data
        const userData = JSON.parse(decodeURIComponent(userParam));
        console.log('Received user data:', userData); // Debug log
        
        // Store token in localStorage
        localStorage.setItem('token', token);
        
        // Store the complete user data
        localStorage.setItem('user', JSON.stringify(userData));
        
        toast.success('Logged in with Google successfully!');
        window.history.replaceState({}, '', '/');
        navigate('/');
      } catch (error) {
        console.error('Error processing login data:', error);
        toast.error('Error logging in with Google');
        navigate('/login');
      }
    }
  }, [location.search, navigate]);

  return (
    <div className="min-h-screen flex items-left justify-center bg-gray-50">
      <Toaster position="top-center" />
      <div className="max-w-md w-full space-y-8 p-8 rounded-md">
        <h2 className="text-left text-2xl my-2 font-medium text-gray-800">Login Here</h2>
        <p>Enter your login details here and start your operational work right now.</p>

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 pointer-cursor-pointer transition duration-200"
        >
          <FcGoogle className="text-xl" />
          Log in with Google
        </button>

        <div className="flex items-center justify-center my-6">
          <div className="w-full border-t border-gray-300" />
          <span className="px-2 text-sm text-gray-500">Or</span>
          <div className="w-full border-t border-gray-300" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            name="email"
            type="email"
            required
            placeholder="Email address"
            className="w-full px-3 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={handleChange}
          />

          <div className="relative">
            <input
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Password"
              className="w-full px-3 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onChange={handleChange}
            />
            <button
              type="button"
              className="absolute right-3 top-3 text-gray-600"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center text-sm text-gray-700">
              <input type="checkbox" className="mr-2" />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-sm text-[#57123f] hover:underline">
              Forgot your password?
            </Link>
          </div>

          <button
            type="submit"
            className="w-full py-2 px-4 bg-[#57123f] text-white hover:text-black font-semibold rounded-full hover:bg-[#ecd4bc] transition duration-200 cursor-pointer"
          >
            Sign in
          </button>

          <p className="text-center text-sm text-black mt-4">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#57123f] font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
