import { useState } from 'react';
import axios from 'axios';

const ForgetPassword = () => {
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleCheckEmail = async () => {
    try {
      const res = await axios.post('https://app.zumarlawfirm.com/auth/forgot-password', { email });
      setEmailVerified(true);
      setMessage('✅ Email verified. Enter your new password.');
    } catch (error) {
      setMessage(error.response?.data?.message || '❌ Email not found.');
    }
  };

  const handleResetPassword = async () => {
    try {
      await axios.post('https://app.zumarlawfirm.com/auth/reset-password', {
        email,
        newPassword,
      });
      setMessage('✅ Password reset successful. Redirecting...');
      setTimeout(() => (window.location.href = '/login'), 2000);
    } catch (error) {
      setMessage(error.response?.data?.message || '❌ Error resetting password.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Forgot Password</h2>

      {!emailVerified ? (
        <>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCheckEmail}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-300"
          >
            Verify Email
          </button>
        </>
      ) : (
        <>
          <input
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            onClick={handleResetPassword}
            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 transition duration-300"
          >
            Reset Password
          </button>
        </>
      )}

      {message && (
        <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
      )}
    </div>
  );
};

export default ForgetPassword;

