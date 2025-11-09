import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import logo from '../../assets/ZumarLogo.png';
import {
    FaTachometerAlt, FaUsers, FaTasks, FaSignOutAlt, FaBars, FaMoneyCheckAlt,
    FaUserShield, FaUserFriends, FaUserCog, FaChevronDown, FaPlus,
    FaFileImport, FaExchangeAlt, FaPhoneVolume, FaStar, FaClipboardCheck
} from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';

// ... [imports remain the same]

const Sidebar = () => {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [openAccordion, setOpenAccordion] = useState('');
    const [assignedPages, setAssignedPages] = useState([]);
    const [assignedPagesError, setAssignedPagesError] = useState(null);
    const navigate = useNavigate();

    // Ensure only one role is active at a time
    const adminToken = localStorage.getItem('adminToken');
    const employeeToken = localStorage.getItem('employeeToken');
    // If both tokens exist, prefer admin (or clear one on login logic)
    const isAdmin = !!adminToken && !employeeToken;
    const isEmployee = !!employeeToken && !adminToken;

    // assignedPages is fetched from the Roles model via /employee/me endpoint
    useEffect(() => {
        // Defensive: if both tokens exist, clear adminToken (employee login should always clear adminToken)
        if (employeeToken && adminToken) {
            localStorage.removeItem('adminToken');
        }
        const fetchAssignedPages = async () => {
            if (isEmployee) {
                try {
                    const res = await axios.get('https://app.zumarlawfirm.com/employee/me', {
                        headers: { Authorization: `Bearer ${employeeToken}` },
                        withCredentials: true
                    });
                    if (res.data && Array.isArray(res.data.assignedPages)) {
                        setAssignedPages(res.data.assignedPages);
                        setAssignedPagesError(null);
                    } else {
                        setAssignedPages([]);
                        setAssignedPagesError('No assigned pages returned');
                    }
                } catch (err) {
                    setAssignedPages([]);
                    if (err?.response?.status === 401) {
                        setAssignedPagesError('Unauthorized: Please log in again.');
                    } else {
                        setAssignedPagesError('Error fetching assigned pages: ' + (err?.response?.status || err.message));
                    }
                    // Fallback: Try to decode assignedPages from token if present
                    try {
                        const decoded = jwtDecode(employeeToken);
                        if (decoded && Array.isArray(decoded.assignedPages)) {
                            setAssignedPages(decoded.assignedPages);
                        }
                    } catch (decodeErr) {
                        // Ignore decode errors
                    }
                }
            }
        };
        fetchAssignedPages();
    }, [employeeToken, adminToken]);

    // Always log assignedPages to the console when it changes (for employees)
    useEffect(() => {
        if (isEmployee) {
            console.log('Assigned Pages (from Roles model):', assignedPages);
            if (assignedPagesError) console.error(assignedPagesError);
        }
    }, [assignedPages, assignedPagesError, isEmployee]);

    const handleLogout = async () => {
        try {
            await axios.get('https://app.zumarlawfirm.com/admin/logout', { withCredentials: true });
            localStorage.removeItem('adminToken');
            localStorage.removeItem('employeeToken');
            toast.success('Successfully logged out');
            if (isEmployee) {
                navigate('/admin/employee-login');
            } else {
                navigate('/admin/login');
            }
        } catch (err) {
            toast.error('Logout failed');
        }
    };

    const allMenuItems = [
        { name: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
        {
            name: 'Lead Management', icon: <FaUserFriends />, path: '/admin/leads',
            children: [
                { name: 'Add Lead', path: '/admin/leads/add', icon: <FaPlus /> },
                { name: 'Import Lead', path: '/admin/leads/import', icon: <FaFileImport /> },
                { name: 'Followup Leads', path: '/admin/leads/followup', icon: <FaClipboardCheck /> },
                { name: 'Mature Leads', path: '/admin/leads/mature', icon: <FaStar /> },
                { name: 'Contacted Leads', path: '/admin/leads/contacted', icon: <FaPhoneVolume /> },
            ]
        },
        {
            name: 'Service Processing', icon: <FaTasks />, path: '/admin/services',
            children: [
                { name: 'Converted Service', path: '/admin/services/converted', icon: <FaExchangeAlt /> },
                { name: 'Manual Service', path: '/admin/services/manual', icon: <FaFileImport /> },
                { name: 'Add Manual Service', path: '/admin/add-service', icon: <FaPlus /> },
                        { name: 'Refunds Admin', path: '/admin/refunds', icon: <FaMoneyCheckAlt /> },

            ]
        },
        {
            name: 'Payroll', icon: <FaMoneyCheckAlt />, path: '/admin/payroll',
            children: [
                { name: 'New Payroll', path: '/admin/payroll/add', icon: <FaPlus /> },
                { name: 'Salary', path: '/admin/salary', icon: <FaMoneyCheckAlt /> },
                { name: 'Attendance', path: '/admin/attendance', icon: <FaMoneyCheckAlt /> }
            ]
        },
        {
            name: 'Roles', icon: <FaUserShield />, path: '/admin/roles',
            children: [
                { name: 'Add New Employee', path: '/admin/roles/add', icon: <FaPlus /> },
            ]
        },
        { name: 'Customers', icon: <FaUsers />, path: '/admin/customers' },
        {
            name: 'Account', icon: <FaUserCog />, path: '/admin/account',
            children: [
                { name: 'Expense', icon: <FaMoneyCheckAlt />, path: '/admin/expense' },
                { name: 'Expense Submissions', icon: <FaMoneyCheckAlt />, path: '/admin/expense-submissions' }
            ]
        },

    ];

    const menuItems = allMenuItems.map(item => {
        if (isAdmin) {
            // Admins see all menu items and all children
            return {
                ...item,
                enabled: true,
                children: (item.children || []).map(child => ({ ...child, enabled: true }))
            };
        }

        // Employees see only assigned pages
        const isParentEnabled = assignedPages.includes(item.path);
        const childItems = (item.children || []).map(child => ({
            ...child,
            enabled: assignedPages.includes(child.path)
        }));
        const hasVisibleChildren = childItems.some(c => c.enabled);

        return {
            ...item,
            enabled: isParentEnabled || hasVisibleChildren,
            children: childItems
        };
    });

    return (
        <>
            {/* Debug: Show assignedPages for employees */}
            <button className="md:hidden fixed top-4 left-4 z-50 bg-white p-2 rounded shadow-md" onClick={() => setSidebarOpen(!sidebarOpen)}>
                <FaBars size={20} />
            </button>

            {sidebarOpen && <div className="fixed inset-0 bg-black opacity-40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

            <aside className={`fixed top-0 left-0 z-50 transform transition-transform duration-300 w-64 bg-white shadow-md flex flex-col h-screen ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:flex`}>
                <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex-shrink-0 flex items-center justify-center py-2 px-4 bg-[#57123f]">
                        <img width={170} src={logo} alt="logo" />
                    </div>
                    <nav className="mt-6 flex-1 overflow-y-auto">
                        <ul className="space-y-2 px-2">
                            {menuItems.map(item => {
                                if (!item.enabled) return null;

                                const isOpen = openAccordion === item.name;
                                const visibleChildren = item.children?.filter(child => child.enabled) || [];

                                return (
                                    <li key={item.name}>
                                        <div className="relative">
                                            <Link
                                                to={item.path}
                                                onClick={() => setSidebarOpen(false)}
                                                className={`flex items-center gap-2 p-2 w-full rounded-lg transition-colors text-[1.1rem] font-medium ${location.pathname.startsWith(item.path)
                                                    ? 'bg-[#57123f] text-white'
                                                    : 'text-gray-600 hover:bg-[#57123f] hover:text-white'}`}
                                            >
                                                {item.icon}
                                                {item.name}
                                            </Link>
                                            {visibleChildren.length > 0 && (
                                                <button
                                                    type="button"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                                                    onClick={() => setOpenAccordion(isOpen ? '' : item.name)}
                                                    tabIndex={-1}
                                                >
                                                    <FaChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                            )}
                                        </div>

                                        {visibleChildren.length > 0 && (
                                            <ul className={`ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`} style={{ transitionProperty: 'max-height, opacity' }}>
                                                {visibleChildren.map(child => (
                                                    <li key={child.name}>
                                                        <Link to={child.path}
                                                            onClick={() => setSidebarOpen(false)}
                                                            className={`flex items-center gap-2 p-2 rounded-lg transition-colors text-[0.9rem] font-normal ${location.pathname === child.path
                                                                ? 'bg-[#57123f] text-white'
                                                                : 'text-gray-600 hover:bg-[#57123f] hover:text-white'}`}
                                                        >
                                                            {child.icon}
                                                            {child.name}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </nav>
                </div>
                <div className="flex-shrink-0 p-4 border-t">
                    {/* <Link to="/admin/attendance" className="w-full flex items-center gap-2 px-4 py-2 mb-2 bg-green-100 text-green-800 rounded hover:bg-green-200 justify-center">
                        <FaClipboardCheck /> Attendance
                    </Link> */}
                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 bg-[#57123f] text-white rounded hover:bg-primary/90">
                        <FaSignOutAlt /> Logout
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
