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
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [rejectionImage, setRejectionImage] = useState(null);
    const [showProcessingModal, setShowProcessingModal] = useState(false);
    const [processingNotes, setProcessingNotes] = useState('');
    const [processingImage, setProcessingImage] = useState(null);
    const [showRefundedModal, setShowRefundedModal] = useState(false);
    const [refundedNotes, setRefundedNotes] = useState('');
    const [refundedImage, setRefundedImage] = useState(null);


    // Fetch refunds
    useEffect(() => {
        fetchRefunds();
    }, []);

    // No client-side authorization gating: page is accessible to all users

    const fetchRefunds = async () => {
        try {
            setLoading(true);
            const response = await api.get('/api/refund');
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

        // If rejecting, open rejection modal
        if (status === 'rejected') {
            setSelectedRefund(refunds.find(r => r._id === refundId));
            setStatusUpdate({ status, notes: '' });
            setShowRejectionModal(true);
            return;
        }

        // If processing, open processing modal
        if (status === 'processing') {
            setSelectedRefund(refunds.find(r => r._id === refundId));
            setStatusUpdate({ status, notes: '' });
            setShowProcessingModal(true);
            return;
        }

        // If refunded, open refunded modal
        if (status === 'refunded') {
            setSelectedRefund(refunds.find(r => r._id === refundId));
            setStatusUpdate({ status, notes: '' });
            setShowRefundedModal(true);
            return;
        }

        try {
            const response = await api.put(`/api/refund/${refundId}/status`, {
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

    // Handle rejection with reason and optional image
    const handleRejectionSubmit = async () => {
        if (!rejectionReason.trim()) {
            toast.error('Please provide a rejection reason');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('status', 'rejected');
            formData.append('notes', rejectionReason);
            if (rejectionImage) {
                formData.append('rejectionImage', rejectionImage);
            }

            const response = await api.put(
                `/api/refund/${selectedRefund._id}/status`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            setRefunds(refunds.map(r => r._id === selectedRefund._id ? response.data : r));
            toast.success('Refund request rejected successfully');

            // Reset modal state
            setShowRejectionModal(false);
            setRejectionReason('');
            setRejectionImage(null);
            setSelectedRefund(null);
            setShowDetails(false);
        } catch (err) {
            console.error('Error rejecting refund:', err);
            const errorMsg = err.response?.data?.error || 'Failed to reject refund request';
            toast.error(errorMsg);
        }
    };

    // Handle processing with notes and optional image
    const handleProcessingSubmit = async () => {
        if (!processingNotes.trim()) {
            toast.error('Please provide processing notes');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('status', 'processing');
            formData.append('notes', processingNotes);
            if (processingImage) {
                formData.append('processingImage', processingImage);
            }

            const response = await api.put(
                `/api/refund/${selectedRefund._id}/status`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            setRefunds(refunds.map(r => r._id === selectedRefund._id ? response.data : r));
            toast.success('Refund marked as processing successfully');

            // Reset modal state
            setShowProcessingModal(false);
            setProcessingNotes('');
            setProcessingImage(null);
            setSelectedRefund(null);
            setShowDetails(false);
        } catch (err) {
            console.error('Error updating refund to processing:', err);
            const errorMsg = err.response?.data?.error || 'Failed to update refund status';
            toast.error(errorMsg);
        }
    };

    // Handle refunded with notes and optional image
    const handleRefundedSubmit = async () => {
        if (!refundedNotes.trim()) {
            toast.error('Please provide refund notes');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('status', 'refunded');
            formData.append('notes', refundedNotes);
            if (refundedImage) {
                formData.append('refundedImage', refundedImage);
            }

            const response = await api.put(
                `/api/refund/${selectedRefund._id}/status`,
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            setRefunds(refunds.map(r => r._id === selectedRefund._id ? response.data : r));
            toast.success('Refund marked as refunded successfully');

            // Reset modal state
            setShowRefundedModal(false);
            setRefundedNotes('');
            setRefundedImage(null);
            setSelectedRefund(null);
            setShowDetails(false);
        } catch (err) {
            console.error('Error updating refund to refunded:', err);
            const errorMsg = err.response?.data?.error || 'Failed to update refund status';
            toast.error(errorMsg);
        }
    };

    // Handle delete
    const handleDelete = async (refundId) => {
        if (!window.confirm('Are you sure you want to delete this refund request?')) return;

        try {
            await api.delete(`/api/refund/${refundId}`);
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
        link.href = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${filePath}`;
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
                       
                    </div>

                    ${selectedRefund.rejectionNotes ? `
                    <div class="section">
                        <h3>Rejection Details</h3>
                        <div style="margin: 10px 0;">
                            <p style="margin: 5px 0;"><strong>Rejection Reason:</strong></p>
                            <p style="margin: 5px 0; background: #fff3cd; padding: 10px; border-left: 3px solid #ffc107;">${selectedRefund.rejectionNotes}</p>
                        </div>
                        ${selectedRefund.rejectionImage ? `
                        <div style="margin: 10px 0;">
                            <p style="margin: 5px 0;"><strong>Evidence Image:</strong></p>
                            <img src="${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${selectedRefund.rejectionImage}" style="max-width: 100%; height: auto; border: 1px solid #ddd; padding: 5px; margin-top: 10px;" />
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}

                    ${selectedRefund.processingNotes ? `
                    <div class="section">
                        <h3>Processing Details</h3>
                        <div style="margin: 10px 0;">
                            <p style="margin: 5px 0;"><strong>Processing Notes:</strong></p>
                            <p style="margin: 5px 0; background: #e7f3ff; padding: 10px; border-left: 3px solid #2196F3;">${selectedRefund.processingNotes}</p>
                        </div>
                        ${selectedRefund.processingImage ? `
                        <div style="margin: 10px 0;">
                            <p style="margin: 5px 0;"><strong>Evidence Image:</strong></p>
                            <img src="${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${selectedRefund.processingImage}" style="max-width: 100%; height: auto; border: 1px solid #ddd; padding: 5px; margin-top: 10px;" />
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}

                    ${selectedRefund.refundedNotes ? `
                    <div class="section">
                        <h3>Refund Completion Details</h3>
                        <div style="margin: 10px 0;">
                            <p style="margin: 5px 0;"><strong>Refund Notes:</strong></p>
                            <p style="margin: 5px 0; background: #e8f5e9; padding: 10px; border-left: 3px solid #4CAF50;">${selectedRefund.refundedNotes}</p>
                        </div>
                        ${selectedRefund.refundedImage ? `
                        <div style="margin: 10px 0;">
                            <p style="margin: 5px 0;"><strong>Receipt/Proof Image:</strong></p>
                            <img src="${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${selectedRefund.refundedImage}" style="max-width: 100%; height: auto; border: 1px solid #ddd; padding: 5px; margin-top: 10px;" />
                        </div>
                        ` : ''}
                    </div>
                    ` : ''}

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
            case 'under review':
                return 'bg-orange-100 text-orange-800';
            case 'processing':
                return 'bg-purple-100 text-purple-800';
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
                <div className="mb-6 flex gap-2 flex-wrap">
                    {['all', 'pending', 'under review', 'processing', 'approved', 'refunded', 'rejected'].map(status => (
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
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-700 font-medium text-sm">Pending</p>
                        <p className="text-2xl font-bold text-yellow-800">{refunds.filter(r => r.status === 'pending').length}</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <p className="text-orange-700 font-medium text-sm">Under Review</p>
                        <p className="text-2xl font-bold text-orange-800">{refunds.filter(r => r.status === 'under review').length}</p>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-purple-700 font-medium text-sm">Processing</p>
                        <p className="text-2xl font-bold text-purple-800">{refunds.filter(r => r.status === 'processing').length}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <p className="text-green-700 font-medium text-sm">Approved</p>
                        <p className="text-2xl font-bold text-green-800">{refunds.filter(r => r.status === 'approved').length}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-red-700 font-medium text-sm">Rejected</p>
                        <p className="text-2xl font-bold text-red-800">{refunds.filter(r => r.status === 'rejected').length}</p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-blue-700 font-medium text-sm">Refunded</p>
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
                                                    <option value="pending">Pending</option>
                                                    <option value="under review">Under Review</option>
                                                    <option value="processing">Processing</option>
                                                    <option value="approved">Approved</option>
                                                    <option value="rejected">Rejected</option>
                                                    <option value="refunded">Refunded</option>
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

                                {/* Rejection Details */}
                                {selectedRefund.rejectionNotes && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Rejection Details</h3>
                                        <div className="mb-4">
                                            <p className="text-sm text-gray-600">Rejection Reason</p>
                                            <p className="font-medium text-gray-900 bg-yellow-50 p-3 rounded-lg border-l-4 border-yellow-400">{selectedRefund.rejectionNotes}</p>
                                        </div>
                                        {selectedRefund.rejectionImage && (
                                            <div>
                                                <p className="text-sm text-gray-600 mb-2">Evidence Image</p>
                                                <div className="bg-gray-100 p-2 rounded-lg">
                                                    <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${selectedRefund.rejectionImage}`} alt="Rejection Evidence" className="max-w-full h-auto rounded" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Processing Details */}
                                {selectedRefund.processingNotes && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Processing Details</h3>
                                        <div className="mb-4">
                                            <p className="text-sm text-gray-600">Processing Notes</p>
                                            <p className="font-medium text-gray-900 bg-blue-50 p-3 rounded-lg border-l-4 border-blue-400">{selectedRefund.processingNotes}</p>
                                        </div>
                                        {selectedRefund.processingImage && (
                                            <div>
                                                <p className="text-sm text-gray-600 mb-2">Evidence Image</p>
                                                <div className="bg-gray-100 p-2 rounded-lg">
                                                    <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${selectedRefund.processingImage}`} alt="Processing Evidence" className="max-w-full h-auto rounded" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Refunded Details */}
                                {selectedRefund.refundedNotes && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Refund Completion Details</h3>
                                        <div className="mb-4">
                                            <p className="text-sm text-gray-600">Refund Notes</p>
                                            <p className="font-medium text-gray-900 bg-green-50 p-3 rounded-lg border-l-4 border-green-400">{selectedRefund.refundedNotes}</p>
                                        </div>
                                        {selectedRefund.refundedImage && (
                                            <div>
                                                <p className="text-sm text-gray-600 mb-2">Receipt/Proof Image</p>
                                                <div className="bg-gray-100 p-2 rounded-lg">
                                                    <img src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/${selectedRefund.refundedImage}`} alt="Refunded Proof" className="max-w-full h-auto rounded" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Rejection Modal */}
                {showRejectionModal && selectedRefund && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
                            {/* Modal Header */}
                            <div className="bg-[#57123f] text-white p-4 flex items-center justify-between rounded-t-lg">
                                <div className="flex items-center gap-3">
                                    <FaTimes size={20} />
                                    <h2 className="text-lg font-bold">Reject Refund Request</h2>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowRejectionModal(false);
                                        setRejectionReason('');
                                        setRejectionImage(null);
                                    }}
                                    className="text-white hover:bg-[#57123f] p-1 rounded"
                                >
                                    <FaTimes size={18} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6">
                                {/* Refund Information */}
                                <div className="mb-4 pb-4 border-b">
                                    <p className="text-sm text-gray-600">Refund ID</p>
                                    <p className="font-medium text-gray-900">{selectedRefund._id}</p>
                                    <p className="text-sm text-gray-600 mt-2">Client Name</p>
                                    <p className="font-medium text-gray-900">{selectedRefund.clientDetails?.fullName}</p>
                                </div>

                                {/* Reason Textarea */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Rejection Reason <span className="text-red-600">*</span>
                                    </label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Enter the reason for rejection..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 resize-none"
                                        rows="4"
                                    />
                                </div>

                                {/* Image Upload (Optional) */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Evidence Image (Optional)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setRejectionImage(e.target.files?.[0] || null)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg cursor-pointer"
                                    />
                                    {rejectionImage && (
                                        <p className="text-sm text-gray-600 mt-2">Selected: {rejectionImage.name}</p>
                                    )}
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowRejectionModal(false);
                                            setRejectionReason('');
                                            setRejectionImage(null);
                                        }}
                                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRejectionSubmit}
                                        className="flex-1 px-4 py-2 bg-[#57123f] text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                                    >
                                        Confirm Rejection
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Processing Modal */}
                {showProcessingModal && selectedRefund && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
                            {/* Modal Header */}
                            <div className="bg-[#57123f] text-white p-4 flex items-center justify-between rounded-t-lg">
                                <div className="flex items-center gap-3">
                                    <FaCheck size={20} />
                                    <h2 className="text-lg font-bold">Mark as Processing</h2>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowProcessingModal(false);
                                        setProcessingNotes('');
                                        setProcessingImage(null);
                                    }}
                                    className="text-white hover:bg-[#57123f] p-1 rounded"
                                >
                                    <FaTimes size={18} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6">
                                {/* Refund Information */}
                                <div className="mb-4 pb-4 border-b">
                                    <p className="text-sm text-gray-600">Refund ID</p>
                                    <p className="font-medium text-gray-900">{selectedRefund._id}</p>
                                    <p className="text-sm text-gray-600 mt-2">Client Name</p>
                                    <p className="font-medium text-gray-900">{selectedRefund.clientDetails?.fullName}</p>
                                </div>

                                {/* Notes Textarea */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Processing Notes <span className="text-red-600">*</span>
                                    </label>
                                    <textarea
                                        value={processingNotes}
                                        onChange={(e) => setProcessingNotes(e.target.value)}
                                        placeholder="Enter processing notes..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
                                        rows="4"
                                    />
                                </div>

                                {/* Image Upload (Optional) */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Evidence Image (Optional)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setProcessingImage(e.target.files?.[0] || null)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg cursor-pointer"
                                    />
                                    {processingImage && (
                                        <p className="text-sm text-gray-600 mt-2">Selected: {processingImage.name}</p>
                                    )}
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowProcessingModal(false);
                                            setProcessingNotes('');
                                            setProcessingImage(null);
                                        }}
                                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleProcessingSubmit}
                                        className="flex-1 px-4 py-2 bg-[#57123f] text-white rounded-lg font-medium hover:bg-[#57123f] transition-colors"
                                    >
                                        Confirm Processing
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Refunded Modal */}
                {showRefundedModal && selectedRefund && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
                            {/* Modal Header */}
                            <div className="bg-[#57123f] text-white p-4 flex items-center justify-between rounded-t-lg">
                                <div className="flex items-center gap-3">
                                    <FaCheck size={20} />
                                    <h2 className="text-lg font-bold">Mark as Refunded</h2>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowRefundedModal(false);
                                        setRefundedNotes('');
                                        setRefundedImage(null);
                                    }}
                                    className="text-white hover:bg-[#57123f] p-1 rounded"
                                >
                                    <FaTimes size={18} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6">
                                {/* Refund Information */}
                                <div className="mb-4 pb-4 border-b">
                                    <p className="text-sm text-gray-600">Refund ID</p>
                                    <p className="font-medium text-gray-900">{selectedRefund._id}</p>
                                    <p className="text-sm text-gray-600 mt-2">Client Name</p>
                                    <p className="font-medium text-gray-900">{selectedRefund.clientDetails?.fullName}</p>
                                </div>

                                {/* Notes Textarea */}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Refund Notes <span className="text-red-600">*</span>
                                    </label>
                                    <textarea
                                        value={refundedNotes}
                                        onChange={(e) => setRefundedNotes(e.target.value)}
                                        placeholder="Enter refund completion notes..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
                                        rows="4"
                                    />
                                </div>

                                {/* Image Upload (Optional) */}
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Receipt/Proof Image (Optional)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setRefundedImage(e.target.files?.[0] || null)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg cursor-pointer"
                                    />
                                    {refundedImage && (
                                        <p className="text-sm text-gray-600 mt-2">Selected: {refundedImage.name}</p>
                                    )}
                                </div>

                                {/* Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setShowRefundedModal(false);
                                            setRefundedNotes('');
                                            setRefundedImage(null);
                                        }}
                                        className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleRefundedSubmit}
                                        className="flex-1 px-4 py-2 bg-[#57123f] text-white rounded-lg font-medium hover:bg-[#57123f] transition-colors"
                                    >
                                        Confirm Refunded
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}            </div>
        </div>
    );
}