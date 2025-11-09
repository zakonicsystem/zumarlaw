import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import axios from 'axios';
import PasswordInput from '../components/PasswordInput';
import toast, { Toaster } from 'react-hot-toast';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(formData.password)) {
      toast.error('Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/auth/signup', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        password: formData.password
      });

      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('token', response.data.token);


      toast.success('Signup successful! Please login.');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Signup failed');
    }
  };


  const handleGoogleSignup = () => {
    toast.loading('Redirecting to Google...');
    window.location.href = 'http://localhost:5000/auth/google';
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const message = urlParams.get('message');

    if (error) {
      toast.error('Google signup failed. Please try again.');
    }
    if (message) {
      toast.success(decodeURIComponent(message));
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Toaster position="top-center" reverseOrder={false} />
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-left text-2xl my-3 font-medium text-gray-800">Create Your Account</h2>
        <p className=''>Add the required details to create your account and get professional tax and law services. </p>


        <button
          type="button"
          onClick={handleGoogleSignup}
          className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-full shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 pointer-cursor-pointer transition duration-200"
        >
          <FcGoogle className="text-xl" />
          Sign up with Google
        </button>
        <div className="flex items-center justify-center my-6">
          <div className="w-full border-t border-gray-300" />
          <span className="px-2 text-sm text-gray-500">Or</span>
          <div className="w-full border-t border-gray-300" />
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-4">
            <input
              name="firstName"
              type="text"
              required
              className="w-full px-3 py-2 border rounded-full"
              placeholder="First Name"
              onChange={handleChange}
            />
            <input
              name="lastName"
              type="text"
              required
              className="w-full px-3 py-2 border rounded-full"
              placeholder="Last Name"
              onChange={handleChange}
            />
            {/* CNIC field removed */}
          </div>
          <input
            name="email"
            type="email"
            required
            className="w-full px-3 py-2 border rounded-full"
            placeholder="Email Address"
            onChange={handleChange}
          />
          <input
            name="phoneNumber"
            type="tel"
            required
            className="w-full px-3 py-2 border rounded-full"
            placeholder="Phone Number"
            onChange={handleChange}
          />
          <PasswordInput
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
          />
          <PasswordInput
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm Password"
          />
          <button
            type="submit"
            className="w-full py-2 px-4 bg-[#57123f]  text-white rounded-full hover:bg-[#ecd4bc] hover:text-black cursor-pointer transition duration-200"
          >
            Sign Up
          </button>
        </form>




  <div className="text-center mt-4">
          <Link to="/login" className="text-[#57123f] hover:text-black transition duration-200">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
