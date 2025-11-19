import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';
import { FaDownload, FaCheck, FaTimes, FaTrash, FaEye, FaPrint } from 'react-icons/fa';

export default function RefundManagement() {
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedRefund, setSelectedRefund] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [statusUpdate, setStatusUpdate] = useState({ status: '', notes: '' });
    

    // Fetch refunds
    useEffect(() => {
        fetchRefunds();
    }, []);

    // No client-side authorization gating: page is accessible to all users

    const fetchRefunds = async () => {
        try {
            setLoading(true);
            const response = await api.get('/refund');
            setRefunds(response.data);
        } catch (err) {
            console.error('Error fetching refunds:', err);
            toast.error('Failed to fetch refunds');
        } finally {
            setLoading(false);
        }
    };

    // Filter refunds by status
    const filteredRefunds = statusFilter === 'all'
        ? refunds
        : refunds.filter(r => r.status === statusFilter);
    // Handle status update (supports both inline and modal)
    const handleStatusUpdate = async (refundId, newStatus = null) => {
        const status = newStatus || statusUpdate.status;
        if (!status) {
            toast.error('Please select a status');
            return;
        }

        try {
            const response = await api.put(`/refund/${refundId}/status`, {
                status,
                notes: statusUpdate.notes
            });
            setRefunds(refunds.map(r => r._id === refundId ? response.data : r));
            toast.success('Refund status updated successfully');

            // Only close modal if called from modal (newStatus is null)
            if (!newStatus) {
                setShowDetails(false);
                setSelectedRefund(null);
                setStatusUpdate({ status: '', notes: '' });
            }
        } catch (err) {
            console.error('Error updating refund:', err);

            // Handle specific error responses
            if (err.response?.status === 401) {
                toast.error('Session expired. Please log in again.');
                // Redirect to admin login
                window.location.href = '/admin/login';
                return;
            }

            if (err.response?.status === 403) {
                toast.error('You are not authorized to update refund status');
                return;
            }

            const errorMsg = err.response?.data?.error || 'Failed to update refund status';
            toast.error(errorMsg);
        }
    };

    // Handle delete
    const handleDelete = async (refundId) => {
        if (!window.confirm('Are you sure you want to delete this refund request?')) return;

        try {
            await api.delete(`/refund/${refundId}`);
            setRefunds(refunds.filter(r => r._id !== refundId));
            toast.success('Refund deleted');
        } catch (err) {
            console.error('Error deleting refund:', err);
            toast.error('Failed to delete refund');
        }
    };

    // Download evidence file
    const handleDownloadEvidence = (filePath) => {
        if (!filePath) return;
        const link = document.createElement('a');
        link.href = `${import.meta.env.VITE_API_URL || 'https://app.zumarlawfirm.com'}/${filePath}`;
        link.download = filePath.split('/').pop();
        link.click();
    };

    // Print refund slip
    const handlePrintSlip = () => {
        if (!selectedRefund) return;
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Refund Slip - ${selectedRefund.caseClosure?.name}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; background: white; }
                    .slip { max-width: 600px; margin: 0 auto; border: 2px solid #57123f; padding: 20px; }
                    .header { text-align: center; border-bottom: 2px solid #57123f; margin-bottom: 20px; }
                    .header h1 { margin: 0; color: #57123f; }
                    .header p { margin: 5px 0; }
                    .section { margin: 15px 0; }
                    .section h3 { color: #57123f; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
                    .row { display: flex; justify-content: space-between; margin: 8px 0; }
                    .label { font-weight: bold; width: 40%; }
                    .value { width: 60%; text-align: right; }
                    .status { text-align: center; margin-top: 20px; padding: 10px; background: #f9f5fc; border-radius: 5px; }
                    .approved { color: green; }
                    .pending { color: orange; }
                    .rejected { color: red; }
                    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
                    @media print { body { margin: 0; padding: 0; } }
                </style>
            </head>
            <body>
                <div class="slip">
                    <div class="header">
                        <h1>REFUND SLIP</h1>
                        <p>Zumar Law Firm</p>
                        <p>Date: ${new Date(selectedRefund.createdAt).toLocaleDateString()}</p>
                    </div>

                    <div class="section">
                        <h3>Case Closure Details</h3>
                        <div class="row">
                            <span class="label">Name:</span>
                            <span class="value">${selectedRefund.caseClosure?.name || 'N/A'}</span>
                        </div>
                        <div class="row">
                            <span class="label">CNIC:</span>
                            <span class="value">${selectedRefund.caseClosure?.cnic || 'N/A'}</span>
                        </div>
                        <div class="row">
                            <span class="label">Phone:</span>
                            <span class="value">${selectedRefund.caseClosure?.phone || 'N/A'}</span>
                        </div>
                        <div class="row">
                            <span class="label">Email:</span>
                            <span class="value">${selectedRefund.caseClosure?.email || 'N/A'}</span>
                        </div>
                        <div class="row">
                            <span class="label">Case Type:</span>
                            <span class="value">${selectedRefund.caseClosure?.caseType || 'N/A'}</span>
                        </div>
                        <div class="row">
                            <span class="label">Case Close Reason:</span>
                            <span class="value">${selectedRefund.caseClosure?.caseCloseReason || 'N/A'}</span>
                        </div>
                        <div class="row">
                            <span class="label">Undertaking Approved:</span>
                            <span class="value">${selectedRefund.caseClosure?.undertakingApproved ? '✓ YES' : '✗ NO'}</span>
                        </div>
                    </div>

                    <div class="section">
                        <h3>Refund Details</h3>
                        <div class="row">
                            <span class="label">Total Case Payment:</span>
                            <span class="value">Rs. ${selectedRefund.refundDetails?.totalCasePayment?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div class="row">
                            <span class="label">Paid Payment Type:</span>
                            <span class="value">${selectedRefund.refundDetails?.paidPaymentType || 'N/A'}</span>
                        </div>
                        <div class="row">
                            <span class="label">Paid Amount:</span>
                            <span class="value">Rs. ${selectedRefund.refundDetails?.paidPayment?.toLocaleString() || 'N/A'}</span>
                        </div>
                        <div class="row">
                            <span class="label">Bank Name:</span>
                            <span class="value">${selectedRefund.refundDetails?.bankName || 'N/A'}</span>
                        </div>
                        <div class="row">
                            <span class="label">Account Title:</span>
                            <span class="value">${selectedRefund.refundDetails?.accountTitle || 'N/A'}</span>
                        </div>
                        <div class="row">
                            <span class="label">Account No:</span>
                            <span class="value">${selectedRefund.refundDetails?.accountNo || 'N/A'}</span>
                        </div>
                        <div class="row">
                            <span class="label">IBAN:</span>
                            <span class="value">${selectedRefund.refundDetails?.ibanNo || 'N/A'}</span>
                        </div>
                        <div class="row">
                            <span class="label">Undertaking Approved:</span>
                            <span class="value">${selectedRefund.refundDetails?.undertakingApproved ? '✓ YES' : '✗ NO'}</span>
                        </div>
                    </div>

                    <div class="section">
                        <h3>Status Information</h3>
                        <div class="row">
                            <span class="label">Current Status:</span>
                            <span class="value ${selectedRefund.status === 'approved' ? 'approved' : selectedRefund.status === 'pending' ? 'pending' : 'rejected'}">${selectedRefund.status.toUpperCase()}</span>
                        </div>
                        <div class="row">
                            <span class="label">Processed By:</span>
                            <span class="value">${selectedRefund.processedBy?.email || 'Pending'}</span>
                        </div>
                    </div>

                    <div class="footer">
                        <p>This is an official refund slip from Zumar Law Firm</p>
                        <p>Generated on ${new Date().toLocaleString()}</p>
                    </div>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    // Status badge color
    const getStatusColor = (status) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'approved':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            case 'refunded':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };


    return (
        <div className=" bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-800">Refund Management</h1>
                    <p className="text-gray-600 mt-1">Manage and process refund requests</p>
                </div>

                {/* Filters */}
                <div className="mb-6 flex gap-2">
                    {['all', 'approved', 'refunded', 'pending', 'rejected'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg font-medium capitalize transition-all ${statusFilter === status
                                ? 'bg-[#57123f] text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-700 font-medium">Pending</p>
                        <p className="text-2xl font-bold text-yellow-800">{refunds.filter(r => r.status === 'pending').length}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-green-700 font-medium">Approved</p>
                        <p className="text-2xl font-bold text-green-800">{refunds.filter(r => r.status === 'approved').length}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-700 font-medium">Rejected</p>
                        <p className="text-2xl font-bold text-red-800">{refunds.filter(r => r.status === 'rejected').length}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-blue-700 font-medium">Refunded</p>
                        <p className="text-2xl font-bold text-blue-800">{refunds.filter(r => r.status === 'refunded').length}</p>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="bg-white rounded-lg p-8 text-center">
                        <p className="text-gray-600">Loading refunds...</p>
                    </div>
                ) : filteredRefunds.length === 0 ? (
                    <div className="bg-white rounded-lg p-8 text-center">
                        <p className="text-gray-600">No refund requests found</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-100 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Case Type</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Submitted</th>
                                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRefunds.map((refund) => (
                                        <tr key={refund._id} className="border-b hover:bg-gray-50">
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                <div>
                                                    <p className="font-medium">{refund.caseClosure?.name}</p>
                                                    <p className="text-gray-600 text-xs">{refund.caseClosure?.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{refund.caseClosure?.caseType}</td>
                                            <td className="px-6 py-4 text-sm text-gray-700">{refund.caseClosure?.phone}</td>
                                            <td className="px-6 py-4 text-sm">
                                                <select
                                                    value={refund.status}
                                                    onChange={(e) => handleStatusUpdate(refund._id, e.target.value)}
                                                    className={`px-3 py-1 rounded-full font-medium text-xs capitalize border-0 focus:outline-none focus:ring-2 focus:ring-[#57123f] cursor-pointer ${getStatusColor(refund.status)}`}
                                                >
                                                    <option value="approved">Approved</option>
                                                    <option value="refunded">Refunded</option>
                                                    <option value="pending">Pending</option>
                                                    <option value="rejected">Rejected</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {new Date(refund.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedRefund(refund);
                                                            setShowDetails(true);
                                                        }}
                                                        className="text-[#57123f] hover:text-[#57123f] font-medium"
                                                        title="View & Update"
                                                    >
                                                        <FaEye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(refund._id)}
                                                        className="text-[#57123f] font-medium"
                                                        title="Delete"
                                                    >
                                                        <FaTrash size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Details Modal */}
                {showDetails && selectedRefund && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-gray-100 px-6 py-4 border-b flex justify-between items-center">
                                <h2 className="text-xl font-bold text-gray-800">Refund Details</h2>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handlePrintSlip}
                                        className="text-[#57123f] hover:text-[#57123f] font-medium"
                                        title="Print Refund Slip"
                                    >
                                        <FaPrint size={18} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowDetails(false);
                                            setSelectedRefund(null);
                                            setStatusUpdate({ status: '', notes: '' });
                                        }}
                                        className="text-gray-600 hover:text-gray-800 text-2xl leading-none"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            <div className="px-6 py-6 space-y-6">
                                {/* Step 1 Details */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Step 1: Case Closure</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600">Name</p>
                                            <p className="font-medium text-gray-900">{selectedRefund.caseClosure?.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">CNIC</p>
                                            <p className="font-medium text-gray-900">{selectedRefund.caseClosure?.cnic}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Phone</p>
                                            <p className="font-medium text-gray-900">{selectedRefund.caseClosure?.phone}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Email</p>
                                            <p className="font-medium text-gray-900">{selectedRefund.caseClosure?.email}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Case Type</p>
                                            <p className="font-medium text-gray-900">{selectedRefund.caseClosure?.caseType}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Consultant Name</p>
                                            <p className="font-medium text-gray-900">{selectedRefund.caseClosure?.consultantName}</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-sm text-gray-600">Case Submit Date</p>
                                            <p className="font-medium text-gray-900">
                                                {new Date(selectedRefund.caseClosure?.caseSubmitDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-sm text-gray-600">Case Close Reason</p>
                                            <p className="font-medium text-gray-900">{selectedRefund.caseClosure?.caseCloseReason}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Step 2 Details */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Step 2: Refund Details</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600">Total Case Payment</p>
                                            <p className="font-medium text-gray-900">Rs. {selectedRefund.refundDetails?.totalCasePayment?.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Paid Payment Type</p>
                                            <p className="font-medium text-gray-900">{selectedRefund.refundDetails?.paidPaymentType}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Paid Payment Amount</p>
                                            <p className="font-medium text-gray-900">Rs. {selectedRefund.refundDetails?.paidPayment?.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Receiver Account No</p>
                                            <p className="font-medium text-gray-900">{selectedRefund.refundDetails?.receiverAccountNo}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Bank Name</p>
                                            <p className="font-medium text-gray-900">{selectedRefund.refundDetails?.bankName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Account Title</p>
                                            <p className="font-medium text-gray-900">{selectedRefund.refundDetails?.accountTitle}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">Account Number</p>
                                            <p className="font-medium text-gray-900">{selectedRefund.refundDetails?.accountNo}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600">IBAN</p>
                                            <p className="font-medium text-gray-900">{selectedRefund.refundDetails?.ibanNo}</p>
                                        </div>
                                    </div>

                                    {/* Payment Evidence */}
                                    {selectedRefund.refundDetails?.paymentEvidence && (
                                        <div className="mt-4">
                                            <button
                                                onClick={() => handleDownloadEvidence(selectedRefund.refundDetails.paymentEvidence)}
                                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                <FaDownload size={16} />
                                                Download Payment Evidence
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
