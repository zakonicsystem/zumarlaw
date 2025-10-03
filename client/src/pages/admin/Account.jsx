import React, { useState, useEffect } from 'react';
import AccountStatsModal from '../../components/AccountStatsModal';
import axios from 'axios';
import { FaUsers, FaBoxOpen, FaChartLine, FaClock } from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';


const data = [
    { name: 'Active', value: 70 },
    { name: 'In Hold', value: 20 },
    { name: 'Done', value: 30 },
];
const COLORS = ['#10b981', '#facc15', '#6366f1'];


const stats = [
    {
        title: "New Leads",
        value: "150",
        icon: <FaUsers className="text-[#57123f]" />,
        change: "8.5%",
        color: "text-green-500",
        direction: "up",
    },
    {
        title: "Services Booked",
        value: "60",
        icon: <FaBoxOpen className="text-[#57123f]" />,
        change: "1.3%",
        color: "text-green-500",
        direction: "up",
    },
    {
        title: "Total Sales",
        value: "Rs 60,000",
        icon: <FaChartLine className="text-[#57123f]" />,
        change: "1.8%",
        color: "text-green-500",
        direction: "up",
    },
    {
        title: "Pending Certificates",
        value: "20",
        icon: <FaClock className="text-[#57123f]" />,
        change: "1.8%",
        color: "text-red-500",
        direction: "down",
    },
];


const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
const Account = () => {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalDataByType, setModalDataByType] = useState({ converted: [], manual: [], processing: [] });

    const topStatsPieData = [
        { name: 'Total Revenue', value: summary.totalRevenue || 0 },
        { name: 'Pending Amount', value: summary.pendingAmount || 0 },
        { name: 'Salary Paid', value: summary.salaryPaid || 0 },
        { name: 'Total Profit', value: summary.totalProfit || 0 }
    ];
    const TOP_STATS_COLORS = ['#6366f1', '#facc15', '#10b981', '#ef4444', '#a21caf']; // 5 unique colors

    useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            try {
                // Send month and year as query params for filtering
                const res = await axios.get(`http://localhost:5000/accounts/summary?month=${selectedMonth + 1}&year=${new Date().getFullYear()}`);
                setSummary(res.data);
            } catch (err) {
                setSummary({});
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, [selectedMonth]);

    const totalRevenue = summary.totalRevenue || 0;
    const pendingAmount = summary.pendingAmount || 0;
    const salaryPaid = summary.salaryPaid || 0;
    const totalProfit = summary.totalProfit || 0;
    const revenueByServices = summary.revenueByServices ? Object.entries(summary.revenueByServices).map(([title, price]) => ({ title, price })) : [];
    const payrolls = summary.latestPayrolls || [];

    // Handler for top card click

    const handleTopCardClick = () => {
        setModalOpen(true);
    };

    useEffect(() => {
        if (!modalOpen) return;
        const fetchModalData = async () => {
            try {
                const res = await axios.get('http://localhost:5000/accounts/services-stats');
                setModalDataByType(res.data);
            } catch (err) {
                setModalDataByType({ converted: [], manual: [], processing: [] });
            }
        };
        fetchModalData();
    }, [modalOpen]);

    return (
        <>
            <div className='flex justify-between items-center'>
                <p className="font-semibold text-lg text-gray-700">Accounts Summary</p>
                <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57123f] focus:border-transparent"
                >
                    {months.map((month, index) => (
                        <option key={month} value={index}>
                            {month}
                        </option>
                    ))}
                </select>
            </div>
            {/* Top 5 blocks: Revenue, Received, Pending, Salary Paid, Profit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 my-6">
                {/* Total Revenue (sum of all totalPayment) */}
                <div className="bg-white rounded-xl shadow-md px-6 py-4 flex flex-col justify-between h-32 cursor-pointer" onClick={() => handleTopCardClick('Total Revenue')}>
                    <div className="flex items-center justify-between">
                        <p className="text-gray-500 text-sm font-medium">Total Revenue</p>
                        <FaChartLine className="text-[#57123f] text-xl" />
                    </div>
                    <h2 className="text-2xl font-bold mt-1">{summary.totalRevenue || 0} PKR</h2>
                </div>
                {/* Total Received Amount */}
                <div className="bg-white rounded-xl shadow-md px-6 py-4 flex flex-col justify-between h-32 cursor-pointer" onClick={() => handleTopCardClick('Total Received')}>
                    <div className="flex items-center justify-between">
                        <p className="text-gray-500 text-sm font-medium">Total Received</p>
                        <FaUsers className="text-[#57123f] text-xl" />
                    </div>
                    <h2 className="text-2xl font-bold mt-1">{summary.totalReceived || 0} PKR</h2>
                </div>
                {/* Pending/Remaining Amount */}
                <div className="bg-white rounded-xl shadow-md px-6 py-4 flex flex-col justify-between h-32 cursor-pointer" onClick={() => handleTopCardClick('Pending Amount')}>
                    <div className="flex items-center justify-between">
                        <p className="text-gray-500 text-sm font-medium">Pending/Remaining Amount</p>
                        <FaClock className="text-[#57123f] text-xl" />
                    </div>
                    <h2 className="text-2xl font-bold mt-1">{summary.remainingAmount || summary.totalPending || 0} PKR</h2>
                </div>
                {/* Salary Paid */}
                <div className="bg-white rounded-xl shadow-md px-6 py-4 flex flex-col justify-between h-32 cursor-pointer" onClick={() => handleTopCardClick('Salary Paid')}>
                    <div className="flex items-center justify-between">
                        <p className="text-gray-500 text-sm font-medium">Salary Paid</p>
                        <FaBoxOpen className="text-[#57123f] text-xl" />
                    </div>
                    <h2 className="text-2xl font-bold mt-1">{summary.salaryPaid || 0} PKR</h2>
                </div>
                {/* Profit */}
                <div className="bg-white rounded-xl shadow-md px-6 py-4 flex flex-col justify-between h-32 cursor-pointer" onClick={() => handleTopCardClick('Total Profit')}>
                    <div className="flex items-center justify-between">
                        <p className="text-gray-500 text-sm font-medium">Profit</p>
                        <FaChartLine className="text-[#57123f] text-xl" />
                    </div>
                    <h2 className="text-2xl font-bold mt-1">{summary.totalProfit || 0} PKR</h2>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 mt-6">
                {/* Pie Chart (30%) for Top 5 Blocks */}
                <div className="bg-white p-6 rounded-[20px] shadow-md w-full lg:w-[40%] flex flex-col items-center justify-center">
                    <h2 className="font-semibold text-lg text-gray-700 mb-4">Financial Overview</h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Total Revenue', value: summary.totalRevenue || 0 },
                                    { name: 'Total Received', value: summary.totalReceived || 0 },
                                    { name: 'Pending/Remaining', value: summary.remainingAmount || summary.totalPending || 0 },
                                    { name: 'Salary Paid', value: summary.salaryPaid || 0 },
                                    { name: 'Profit', value: summary.totalProfit || 0 }
                                ]}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                fill="#6366f1"
                                paddingAngle={5}
                                dataKey="value"
                                label
                            >
                                {[0,1,2,3,4].map((index) => (
                                    <Cell key={`cell-topstats-${index}`} fill={TOP_STATS_COLORS[index % TOP_STATS_COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-1 w-full flex gap-2 text-[8px] text-gray-600 justify-center">
                        {[
                            { name: 'Total Revenue', value: summary.totalRevenue || 0 },
                            { name: 'Total Received', value: summary.totalReceived || 0 },
                            { name: 'Pending', value: summary.remainingAmount || summary.totalPending || 0 },
                            { name: 'Salary Paid', value: summary.salaryPaid || 0 },
                            { name: 'Profit', value: summary.totalProfit || 0 }
                        ].map((item, i) => (
                            <div key={i} className="flex gap-3 items-center">
                                <span
                                    className="w-3 h-3 inline-block rounded-full"
                                    style={{ backgroundColor: TOP_STATS_COLORS[i % TOP_STATS_COLORS.length] }}
                                ></span>
                                {item.name}: {item.value} PKR
                            </div>
                        ))}
                    </div>
                </div>

                {/* Table (70%) */}
                <div className="bg-white p-6 rounded-[20px] shadow-md w-full lg:w-[60%]">
                    <h2 className="text-lg font-semibold mb-6 text-gray-800">Revenue by services</h2>
                    {revenueByServices.map((service, index) => (
                        <div key={index} className="mb-4">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-gray-700">{service.title}</span>
                                <span className="text-sm font-semibold text-gray-800">{service.price} PKR</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (service.price / totalRevenue) * 100)}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Latest 2 payrolls at bottom */}
            <div className="bg-white p-6 rounded-[20px] shadow-md w-full overflow-x-auto mt-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Latest Payrolls</h2>
                <table className="min-w-full text-sm text-left text-gray-700">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-2">Employee</th>
                            <th className="px-4 py-2">Month</th>
                            <th className="px-4 py-2">Branch</th>
                            <th className="px-4 py-2">Salary</th>
                            <th className="px-4 py-2">Paid By</th>
                            <th className="px-4 py-2">Payment Date</th>
                            <th className="px-4 py-2">Payment Method</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payrolls.map((p, idx) => (
                            <tr key={idx} className="border-t hover:bg-gray-50">
                                <td className="px-4 py-3">{p.employee}</td>
                                <td className="px-4 py-3">{p.payrollMonth}</td>
                                <td className="px-4 py-3">{p.branch}</td>
                                <td className="px-4 py-3">{p.salary} PKR</td>
                                <td className="px-4 py-3">{p.paidBy}</td>
                                <td className="px-4 py-3">{new Date(p.paymentDate).toLocaleDateString()}</td>
                                <td className="px-4 py-3">{p.paymentMethod}</td>
                            </tr>
                        ))}
                        {payrolls.length === 0 && (
                            <tr><td colSpan={7} className="text-center py-6 text-gray-400">No payrolls found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <AccountStatsModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                dataByType={modalDataByType}
                onEdit={handleEdit}
            />


        </>
    )
}

function handleClose() {}
function handleEdit() {}
export default Account
