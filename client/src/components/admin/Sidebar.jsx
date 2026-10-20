import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import logo from '../../assets/ZumarLogo.png';
import {
    FaTachometerAlt, FaUsers, FaTasks, FaSignOutAlt, FaBars, FaMoneyCheckAlt,
    FaUserShield, FaUserFriends, FaUserCog, FaChevronDown, FaPlus,
    FaFileImport, FaExchangeAlt, FaPhoneVolume, FaStar, FaClipboardCheck, FaComments, FaBan, FaHistory, FaTicketAlt, FaFileAlt
} from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';
import { logoutStaff } from '../../utils/staffLogout';

const Sidebar = () => {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [openAccordion, setOpenAccordion] = useState('');
    const [assignedPages, setAssignedPages] = useState([]);
    const [assignedPagesError, setAssignedPagesError] = useState(null);
    const [objectionCount, setObjectionCount] = useState(0);
    const navigate = useNavigate();

    // Ensure only one role is active at a time
    const adminToken = localStorage.getItem('adminToken');
    const employeeToken = localStorage.getItem('employeeToken');
    // If both tokens exist, prefer admin (or clear one on login logic)
    const isAdmin = !!adminToken && !employeeToken;
    const isEmployee = !!employeeToken && !adminToken;

    useEffect(() => {
        if (!isEmployee) { setObjectionCount(0); return; }
        let controller;
        let disposed = false;
        const refresh = () => {
            controller?.abort();
            controller = new AbortController();
            const current = controller;
            const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
            axios.get(`${base}/api/ad-reports/objections-summary`, {
                headers: { Authorization: `Bearer ${employeeToken}` }, signal: current.signal,
            }).then(({ data }) => {
                if (!disposed && !current.signal.aborted) setObjectionCount(data.count || 0);
            }).catch(() => { /* Keep the notification until a successful refresh confirms its state. */ });
        };
        const onVisible = () => { if (!document.hidden) refresh(); };
        refresh();
        const interval = window.setInterval(onVisible, 15000);
        window.addEventListener('focus', refresh);
        window.addEventListener('employee-report-updated', refresh);
        document.addEventListener('visibilitychange', onVisible);
        return () => {
            disposed = true; controller?.abort(); window.clearInterval(interval);
            window.removeEventListener('focus', refresh);
            window.removeEventListener('employee-report-updated', refresh);
            document.removeEventListener('visibilitychange', onVisible);
        };
    }, [isEmployee, employeeToken]);

    // assignedPages is fetched from the Roles model via /employee/me endpoint
    useEffect(() => {
        // Defensive: if both tokens exist, clear adminToken (employee login should always clear adminToken)
        if (employeeToken && adminToken) {
            localStorage.removeItem('adminToken');
        }
        const fetchAssignedPages = async () => {
            if (isEmployee) {
                try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                    const res = await axios.get(`${apiUrl}/api/employee/me`, {
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
        const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
        const token = employeeToken || adminToken;
        await logoutStaff({
            request: () => axios.get(base + '/api/admin/logout', {
                withCredentials: true, timeout: 5000,
                headers: token ? { Authorization: 'Bearer ' + token } : {},
            }),
            storage: localStorage, redirect: navigate, isEmployee,
        });
        toast.success('Successfully logged out');
    };

    const allMenuItems = [
        { name: 'Dashboard', icon: <FaTachometerAlt />, path: '/admin' },
        {
            name: 'Leads', icon: <FaUserFriends />, path: '/admin/leads',
            children: [
                { name: 'New Leads', path: '/admin/leads/new', icon: <FaUserFriends /> },
                { name: 'Add Lead', path: '/admin/leads/add', icon: <FaPlus /> },
                { name: 'Import Lead', path: '/admin/leads/import', icon: <FaFileImport /> },
                { name: 'Followup Leads', path: '/admin/leads/followup', icon: <FaClipboardCheck /> },
                { name: 'Mature Leads', path: '/admin/leads/mature', icon: <FaStar /> },
                { name: 'Contacted Leads', path: '/admin/leads/contacted', icon: <FaPhoneVolume /> },
                { name: 'Refusal Leads', path: '/admin/leads/refusal', icon: <FaBan /> },
            ]
        },
        {
            name: 'Services', icon: <FaTasks />, path: '/admin/services',
            children: [
                { name: 'Converted Service', path: '/admin/services/converted', icon: <FaExchangeAlt /> },
                { name: 'Manual Service', path: '/admin/services/manual', icon: <FaFileImport /> },
                { name: 'Merged Services', path: '/admin/services/merged', icon: <FaFileImport /> },
                { name: 'Add Manual Service', path: '/admin/add-service', icon: <FaPlus /> },
                { name: 'Refund Management', path: '/admin/refund-management', icon: <FaMoneyCheckAlt /> },
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
                { name: 'Employee Reports', path: '/admin/employee-reports', icon: <FaFileAlt />, allEmployees: true },
            ]
        },
        {
            name: 'Clients', icon: <FaUsers />, path: '/admin/customers',
            children: [
                { name: 'Customers', icon: <FaUsers />, path: '/admin/customers' },
                { name: 'Client History', icon: <FaHistory />, path: '/admin/client-history' },
            ]
        },
        {
            name: 'Support', icon: <FaComments />, path: '/admin/chat', groupOnly: true,
            children: [
                { name: 'Support Chat', icon: <FaComments />, path: '/admin/chat' },
                { name: 'Support Tickets', icon: <FaTicketAlt />, path: '/admin/tickets', allEmployees: true },
            ]
        },
        {
            name: 'Account', icon: <FaUserCog />, path: '/admin/account',
            children: [
                { name: 'Expense', icon: <FaMoneyCheckAlt />, path: '/admin/expense' },
                { name: 'Expense Submissions', icon: <FaMoneyCheckAlt />, path: '/admin/expense-submissions' },
                { name: 'Challan', icon: <FaMoneyCheckAlt />, path: '/admin/challan' }
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
        const isParentEnabled = !item.adminOnly && assignedPages.includes(item.path);
        const childItems = (item.children || []).map(child => ({
            ...child,
            enabled: !child.adminOnly && (child.allEmployees || assignedPages.includes(child.path))
        }));
        const hasVisibleChildren = childItems.some(c => c.enabled);

        return {
            ...item,
            enabled: isParentEnabled || hasVisibleChildren,
            children: childItems
        };
    });

    useEffect(() => {
        if (location.pathname === '/admin/employee-reports' || location.pathname.startsWith('/admin/roles')) setOpenAccordion('Roles');
        else if (['/admin/chat', '/admin/tickets'].includes(location.pathname)) setOpenAccordion('Support');
    }, [location.pathname]);



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
                                                onClick={(event) => {
                                                    if (visibleChildren.length && (item.groupOnly || (isEmployee && !assignedPages.includes(item.path)))) {
                                                        event.preventDefault();
                                                        setOpenAccordion(isOpen ? '' : item.name);
                                                    } else {
                                                        setOpenAccordion(item.name);
                                                        setSidebarOpen(false);
                                                    }
                                                }}
                                                aria-current={location.pathname === item.path ? 'page' : undefined}
                                                className={`flex items-center gap-3 p-2 pr-9 w-full rounded-lg transition-colors text-[1.1rem] font-medium ${((item.path === '/admin' ? location.pathname === '/admin' : location.pathname === item.path || location.pathname.startsWith(item.path + '/')) || visibleChildren.some(child => location.pathname === child.path))
                                                    ? 'bg-[#57123f] text-white'
                                                    : 'text-gray-600 hover:bg-[#57123f] hover:text-white'}`}
                                            >
                                                <span className="shrink-0" aria-hidden="true">{item.icon}</span>
                                                <span>{item.name}</span>
                                                {isEmployee && item.name === 'Roles' && objectionCount > 0 && <span role="status" aria-label={`${objectionCount} reports need correction`} title="Report objections need correction" className="ml-auto shrink-0 rounded-full bg-red-600 text-white text-xs font-bold px-2 py-0.5 ring-2 ring-white">{objectionCount > 99 ? '99+' : objectionCount}</span>}
                                            </Link>
                                            {visibleChildren.length > 0 && (
                                                <button
                                                    type="button"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                                                    onClick={() => setOpenAccordion(isOpen ? '' : item.name)}
                                                    aria-label={`Toggle ${item.name} menu`}
                                                    aria-expanded={isOpen}
                                                >
                                                    <FaChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                            )}
                                        </div>

                                        {visibleChildren.length > 0 && (
                                            <ul className={`ml-6 mt-1 space-y-1 overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`} style={{ transitionProperty: 'max-height, opacity' }}>
                                                {visibleChildren.map(child => (
                                                    <li key={child.name}>
                                                        <Link to={isEmployee && child.path === '/admin/employee-reports' && objectionCount > 0 ? `${child.path}?objections=1` : child.path}
                                                            onClick={() => setSidebarOpen(false)}
                                                            className={`flex items-center gap-2 p-2 rounded-lg transition-colors text-[0.9rem] font-normal ${location.pathname === child.path
                                                                ? 'bg-[#57123f] text-white'
                                                                : 'text-gray-600 hover:bg-[#57123f] hover:text-white'}`}
                                                        >
                                                            {child.icon}
                                                            {child.name}
                                                            {isEmployee && child.path === '/admin/employee-reports' && objectionCount > 0 && <span role="status" aria-label={`${objectionCount} reports need correction`} title="Open objections" className="ml-auto shrink-0 rounded-full bg-red-600 text-white text-xs font-bold px-2 py-0.5 ring-2 ring-white">{objectionCount > 99 ? '99+' : objectionCount}</span>}
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
