import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from "react-router-dom";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Password reset modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetStep, setResetStep] = useState(1); // 1: email, 2: token+newpass


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await axios.post(
        `${apiUrl}/api/admin/login`,
        { email, password },
        { withCredentials: true }
      );

      const { token } = res.data;

      if (token) {
        localStorage.setItem('adminToken', token); // Save admin token
        toast.success("Admin login successful");
        navigate("/admin"); // Redirect to admin
      } else {
        toast.error("Unauthorized access");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-2xl">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your credentials to access the dashboard
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="admin@example.com"
                className="w-full px-3 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full px-3 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute right-4 top-10 -translate-y-1/2 text-gray-600"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
              <div className="text-xs text-blue-600 mt-2 cursor-pointer hover:underline" onClick={() => setShowResetModal(true)}>
                Forgot password?
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 bg-[#57123f] text-white hover:text-black font-semibold rounded-full hover:bg-[#ecd4bc] transition duration-200 cursor-pointer ${loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Logging in...
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded shadow-lg min-w-[320px] relative">
            <button 
              onClick={() => { 
                setShowResetModal(false); 
                setResetStep(1); 
                setResetEmail(""); 
                setResetToken(""); 
                setNewPassword(""); 
              }} 
              className="absolute top-2 right-2 text-gray-500 hover:text-black"
            >
              &times;
            </button>
            <h3 className="text-lg font-bold mb-4">Reset Admin Password</h3>
            
            {resetStep === 1 && (
              <>
                <label className="block mb-2 text-sm font-medium">Enter your admin email address</label>
                <input
                  type="email"
                  className="border px-3 py-2 rounded w-full mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
                <button
                  className="bg-[#57123f] text-white px-4 py-2 rounded w-full hover:bg-[#ecd4bc] hover:text-black transition"
                  onClick={async () => {
                    if (!resetEmail) return toast.error('Enter your email');
                    try {
                      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                      const res = await axios.post(`${apiUrl}/api/admin/forgot-password`, { email: resetEmail });
                      setResetToken(res.data.resetToken);
                      setResetStep(2);
                      toast.success('Reset token generated. Check your email or paste below.');
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Failed to request reset');
                    }
                  }}
                >
                  Request Reset
                </button>
              </>
            )}
            
            {resetStep === 2 && (
              <>
                <label className="block mb-2 text-sm font-medium">Reset Token (from email)</label>
                <input
                  type="text"
                  className="border px-3 py-2 rounded w-full mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={resetToken}
                  onChange={e => setResetToken(e.target.value)}
                  placeholder="Paste reset token"
                />
                <label className="block mb-2 text-sm font-medium">New Password</label>
                <input
                  type="password"
                  className="border px-3 py-2 rounded w-full mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <button
                  className="bg-[#57123f] text-white px-4 py-2 rounded w-full hover:bg-[#ecd4bc] hover:text-black transition"
                  onClick={async () => {
                    if (!resetToken || !newPassword) return toast.error('Fill all fields');
                    try {
                      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                      await axios.post(`${apiUrl}/api/admin/reset-password`, { resetToken, newPassword });
                      toast.success('Password reset! You can now log in with your new password.');
                      setShowResetModal(false);
                      setResetStep(1);
                      setResetEmail("");
                      setResetToken("");
                      setNewPassword("");
                    } catch (err) {
                      toast.error(err.response?.data?.message || 'Failed to reset password');
                    }
                  }}
                >
                  Reset Password
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLogin;
