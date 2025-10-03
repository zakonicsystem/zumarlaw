import { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNavigate } from "react-router-dom";

const EmployeeLogin = () => {
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
            const res = await axios.post("https://app.zumarlawfirm.com/employee-login", {
                email,
                password
            });

            console.log('EmployeeLogin: login response', res.data);
            const { token, assignedPages } = res.data;

            if (token) {
                localStorage.setItem("employeeToken", token);
                if (assignedPages) {
                    localStorage.setItem("assignedPages", JSON.stringify(assignedPages));
                    console.log('EmployeeLogin: assignedPages saved to localStorage', assignedPages);
                }
                toast.success("Login successful");
                // Force reload so Sidebar picks up assignedPages from localStorage
                window.location.href = "/admin";
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
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-2xl relative">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">
                        Employee Panel
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Enter your login to access assigned modules
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                placeholder="you@example.com"
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
                                className="w-full px-3 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-9 text-gray-600"
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </button>
                            <div className="text-xs text-gray-500 mt-1">
                                Default password is <span className="font-mono">welcomezumarlaw</span>
                            </div>
                            <div className="text-xs text-blue-600 mt-1 cursor-pointer hover:underline" onClick={() => setShowResetModal(true)}>
                                Forgot password?
                            </div>
            {/* Password Reset Modal */}
            {showResetModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                    <div className="bg-white p-6 rounded shadow-lg min-w-[320px] relative">
                        <button onClick={() => { setShowResetModal(false); setResetStep(1); setResetEmail(""); setResetToken(""); setNewPassword(""); }} className="absolute top-2 right-2 text-gray-500 hover:text-black">&times;</button>
                        <h3 className="text-lg font-bold mb-2">Reset Password</h3>
                        {resetStep === 1 && (
                            <>
                                <label className="block mb-2 text-sm">Enter your email address</label>
                                <input
                                    type="email"
                                    className="border px-3 py-2 rounded w-full mb-3"
                                    value={resetEmail}
                                    onChange={e => setResetEmail(e.target.value)}
                                    placeholder="you@example.com"
                                />
                                <button
                                    className="bg-[#57123f] text-white px-4 py-2 rounded w-full"
                                    onClick={async () => {
                                        if (!resetEmail) return toast.error('Enter your email');
                                        try {
                                            const res = await axios.post('https://app.zumarlawfirm.com/employee-forgot-password', { email: resetEmail });
                                            setResetToken(res.data.resetToken);
                                            setResetStep(2);
                                            toast.success('Reset token generated. Check your email or paste below.');
                                        } catch (err) {
                                            toast.error(err.response?.data?.message || 'Failed to request reset');
                                        }
                                    }}
                                >Request Reset</button>
                            </>
                        )}
                        {resetStep === 2 && (
                            <>
                                <label className="block mb-2 text-sm">Enter reset token (from email)</label>
                                <input
                                    type="text"
                                    className="border px-3 py-2 rounded w-full mb-3"
                                    value={resetToken}
                                    onChange={e => setResetToken(e.target.value)}
                                    placeholder="Paste reset token"
                                />
                                <label className="block mb-2 text-sm">New Password</label>
                                <input
                                    type="password"
                                    className="border px-3 py-2 rounded w-full mb-3"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Enter new password"
                                />
                                <button
                                    className="bg-[#57123f] text-white px-4 py-2 rounded w-full"
                                    onClick={async () => {
                                        if (!resetToken || !newPassword) return toast.error('Fill all fields');
                                        try {
                                            await axios.post('https://app.zumarlawfirm.com/employee-reset-password', { resetToken, newPassword });
                                            toast.success('Password reset! You can now log in.');
                                            setShowResetModal(false);
                                            setResetStep(1);
                                            setResetEmail("");
                                            setResetToken("");
                                            setNewPassword("");
                                        } catch (err) {
                                            toast.error(err.response?.data?.message || 'Failed to reset');
                                        }
                                    }}
                                >Reset Password</button>
                            </>
                        )}
                    </div>
                </div>
            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-2 px-4 bg-[#57123f] text-white font-semibold rounded-full transition duration-200 ${loading ? "opacity-50 cursor-not-allowed" : "hover:text-black hover:bg-[#ecd4bc]"}`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Logging in...
                            </span>
                        ) : (
                            "Sign In"
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EmployeeLogin;
