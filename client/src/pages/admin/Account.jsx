import React, { useState, useEffect } from 'react';
import AccountStatsModal from '../../components/AccountStatModal';
import axios from 'axios';
import { FaUsers, FaBoxOpen, FaChartLine, FaClock, FaReceipt, FaUser } from 'react-icons/fa';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';


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
    // Use -1 for month to indicate "All" (no month filter). Empty string for year means "All" years.
    const [selectedMonth, setSelectedMonth] = useState(-1);
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalDataByType, setModalDataByType] = useState({ converted: [], manual: [], processing: [] });
    const [modalMode, setModalMode] = useState(''); // 'totalRevenue' | 'totalReceived' | 'remaining' | ''
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [totalFees, setTotalFees] = useState(0);
    const [totalChallanFees, setTotalChallanFees] = useState(0);
    const [totalConsultancyFees, setTotalConsultancyFees] = useState(0);

    const topStatsPieData = [
        { name: 'Total Revenue', value: summary.totalRevenue || 0 },
        { name: 'Total Received', value: summary.totalReceived || 0 },
        { name: 'Pending/Remaining', value: summary.remainingAmount || summary.totalPending || 0 },
        { name: 'Salary Paid', value: summary.salaryPaid || 0 },
        { name: 'Net Profit (After Challan Fees)', value: Math.max(0, (summary.totalProfit || 0) - totalChallanFees) },
        { name: 'Challan Fees', value: totalChallanFees || 0 },
        { name: 'Consultancy Fees', value: totalConsultancyFees || 0 }
    ];
    // 7 colors for all data slices (both fees now visible)
    const TOP_STATS_COLORS = ['#6366f1', '#facc15', '#10b981', '#ef4444', '#a21caf', '#8b5cf6', '#f97316'];

    useEffect(() => {
        const fetchSummary = async () => {
            setLoading(true);
            try {
                // Build query params based on selected filters
                const params = new URLSearchParams();
                if (selectedDate) {
                    params.append('date', selectedDate);
                }
                // month expected as 1..12. Only include if a specific month is selected (>=0)
                if (typeof selectedMonth === 'number' && selectedMonth >= 0) {
                    params.append('month', String(selectedMonth + 1));
                }
                // year: include only when set (non-empty)
                if (selectedYear) params.append('year', String(selectedYear));
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const url = `${apiUrl}/api/accounts/summary?${params.toString()}`;
                const res = await axios.get(url);
                setSummary(res.data);
            } catch (err) {
                setSummary({});
            } finally {
                setLoading(false);
            }
        };
        fetchSummary();
    }, [selectedMonth, selectedDate, selectedYear]);

    const totalRevenue = summary.totalRevenue || 0;
    const pendingAmount = summary.pendingAmount || 0;
    const salaryPaid = summary.salaryPaid || 0;
    const totalProfit = summary.totalProfit || 0;
    const fmt = (v) => (Number.isFinite(v) ? v.toLocaleString() : v);
    const revenueByServices = summary.revenueByServices ? Object.entries(summary.revenueByServices).map(([title, price]) => ({ title, price })) : [];
    const payrolls = summary.latestPayrolls || [];

    // Handler for top card click

    const navigate = useNavigate();

    const handleTopCardClick = (type) => {
        // If Salary Paid block is clicked, navigate to payrolls page
        if (type === 'Salary Paid') {
            navigate('/admin/payroll');
            return;
        }
        // fallback: open modal for other types
        // set modal mode based on clicked card
        if (type === 'Total Revenue') setModalMode('totalRevenue');
        else if (type === 'Total Received') setModalMode('totalReceived');
        else if (type === 'Pending Amount' || type === 'Pending/Remaining Amount' || type === 'Remaining') setModalMode('remaining');
        else setModalMode('');
        setModalOpen(true);
    };

    useEffect(() => {
        if (!modalOpen) return;
        const fetchModalData = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const res = await axios.get(`${apiUrl}/api/accounts/services-stats`);
                setModalDataByType(res.data);
            } catch (err) {
                setModalDataByType({ converted: [], manual: [], processing: [] });
            }
        };
        fetchModalData();
    }, [modalOpen]);

    // Fetch challan fees summary
    useEffect(() => {
        const fetchChallans = async () => {
            try {
                const params = new URLSearchParams();
                if (selectedDate) params.append('date', selectedDate);
                if (typeof selectedMonth === 'number' && selectedMonth >= 0) {
                    params.append('month', String(selectedMonth + 1));
                }
                if (selectedYear) params.append('year', String(selectedYear));

                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const res = await axios.get(`${apiUrl}/api/challans?${params.toString()}`);
                const challans = res.data.challans || [];

                const challanTotal = challans.reduce((sum, c) => sum + (c.challanFee?.amount || 0), 0);
                const consultancyTotal = challans.reduce((sum, c) => sum + (c.consultancyFee?.amount || 0), 0);
                const totalFeesAmount = challanTotal + consultancyTotal;

                setTotalChallanFees(challanTotal);
                setTotalConsultancyFees(consultancyTotal);
                setTotalFees(totalFeesAmount);
            } catch (err) {
                setTotalChallanFees(0);
                setTotalConsultancyFees(0);
                setTotalFees(0);
            }
        };
        fetchChallans();
    }, [selectedMonth, selectedDate, selectedYear]);

    // Carousel blocks data
    const carouselBlocks = [
        {
            title: 'Total Revenue',
            value: fmt(summary.totalRevenue || 0),
            icon: <FaChartLine className="text-xl" />,
            bgColor: '#57123f',
            onClick: () => { setModalMode('totalRevenue'); setModalOpen(true); }
        },
        {
            title: 'Total Received',
            value: fmt(summary.totalReceived || 0),
            icon: <FaUsers className="text-xl" />,
            bgColor: '#10b981',
            onClick: () => { setModalMode('totalReceived'); setModalOpen(true); }
        },
        {
            title: 'Pending/Remaining',
            value: fmt(summary.remainingAmount || summary.totalPending || 0),
            icon: <FaClock className="text-xl" />,
            bgColor: '#f59e0b',
            onClick: () => { setModalMode('remaining'); setModalOpen(true); }
        },
        {
            title: 'Total Challan Fees',
            value: fmt(totalChallanFees || 0),
            icon: <FaReceipt className="text-xl" />,
            bgColor: '#6366f1',
            onClick: () => navigate('/admin/challan')
        },
        {
            title: 'Total Consultancy Fees',
            value: fmt(totalConsultancyFees || 0),
            icon: <FaUser className="text-xl" />,
            bgColor: '#8b5cf6',
            onClick: () => navigate('/admin/challan')
        },
        {
            title: 'Net Profit (After Fees)',
            value: fmt((summary.totalProfit || 0) - totalChallanFees),
            icon: <FaChartLine className="text-xl" />,
            bgColor: '#ec4899',
            onClick: () => { setModalMode('profit'); setModalOpen(true); }
        },
        {
            title: 'Salary Paid',
            value: fmt(summary.salaryPaid || 0),
            icon: <FaBoxOpen className="text-xl" />,
            bgColor: '#14b8a6',
            onClick: () => navigate('/admin/payroll')
        }
    ];

    const visibleBlocks = carouselBlocks.slice(carouselIndex, carouselIndex + 4);
    const maxIndex = Math.max(0, carouselBlocks.length - 4);

    const handlePrev = () => {
        setCarouselIndex(Math.max(0, carouselIndex - 1));
    };

    const handleNext = () => {
        setCarouselIndex(Math.min(maxIndex, carouselIndex + 1));
    };

    return (
        <>
            <div className='flex justify-between items-center'>
                <p className="font-semibold text-lg text-gray-700">Accounts Summary</p>
                <div className="flex gap-2 items-center">

                    <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg">
                        <option value="">All</option>
                        {Array.from({ length: 7 }).map((_, i) => {
                            const y = new Date().getFullYear() - 3 + i; // +/-3 years window
                            return <option key={y} value={y}>{y}</option>;
                        })}
                    </select>
                </div>
            </div>
            {/* Carousel Slider */}
            <div className="relative my-6 group">
                <div className="flex items-center gap-0">
                    {/* Carousel Container */}
                    <div className="flex-grow overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {visibleBlocks.map((block, idx) => (
                                <div
                                    key={idx}
                                    onClick={block.onClick}
                                    className="rounded-xl shadow-md px-6 py-4 flex flex-col justify-between h-32 cursor-pointer transition transform hover:scale-105 bg-white"
                                    style={{ borderLeft: `4px solid ${block.bgColor}` }}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs sm:text-sm font-medium" style={{ color: '#57123f' }}>{block.title}</p>
                                        <div style={{ color: block.bgColor }}>{block.icon}</div>
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-bold mt-1" style={{ color: '#57123f' }}>{block.value} PKR</h2>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Previous Button - Overlay on Left */}
                <button
                    onClick={handlePrev}
                    disabled={carouselIndex === 0}
                    className="absolute left-0 top-1/2 -translate-y-1/2 p-2 bg-[#57123f] text-white rounded-full hover:bg-opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition opacity-0 group-hover:opacity-100 z-10"
                    style={{ marginLeft: '-12px' }}
                >
                    ❮
                </button>

                {/* Next Button - Overlay on Right */}
                <button
                    onClick={handleNext}
                    disabled={carouselIndex === maxIndex}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-2 bg-[#57123f] text-white rounded-full hover:bg-opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition opacity-0 group-hover:opacity-100 z-10"
                    style={{ marginRight: '-12px' }}
                >
                    ❯
                </button>

                {/* Carousel Indicators */}
                <div className="flex justify-center gap-2 mt-4">
                    {Array.from({ length: Math.ceil(carouselBlocks.length / 4) }).map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCarouselIndex(idx * 4)}
                            className={`w-2 h-2 rounded-full transition ${idx === Math.floor(carouselIndex / 4)
                                ? 'bg-[#57123f] w-6'
                                : 'bg-gray-300'
                                }`}
                        />
                    ))}
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 mt-6">
                {/* Pie Chart (30%) for Top 5 Blocks */}
                <div className="bg-white p-6 rounded-[20px] shadow-md w-full lg:w-[40%] flex flex-col items-center justify-center">
                    <h2 className="font-semibold text-lg text-gray-700 mb-4">Financial Overview</h2>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={topStatsPieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                fill="#6366f1"
                                paddingAngle={5}
                                dataKey="value"
                                label
                            >
                                {topStatsPieData.map((_, index) => (
                                    <Cell key={`cell-topstats-${index}`} fill={TOP_STATS_COLORS[index % TOP_STATS_COLORS.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-4 space-y-1 w-full flex gap-2 text-[8px] text-gray-600 justify-center">
                        {topStatsPieData.map((item, i) => (
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


            <AccountStatsModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setModalMode(''); }}
                dataByType={modalDataByType}
                onEdit={handleEdit}
                summary={summary}
                mode={modalMode}
            />


        </>
    )
}

function handleClose() { }
function handleEdit() { }
export default Account
