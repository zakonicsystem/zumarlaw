import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { FaEye, FaDownload, FaSync, FaPrint, FaArrowCircleRight } from 'react-icons/fa';

export default function MyRefundRequests() {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();

  // Fetch refunds on mount
  useEffect(() => {
    fetchMyRefunds();
  }, []);

  const fetchMyRefunds = async () => {
    try {
      setLoading(true);
      const response = await api.get('/refund');
      // Filter refunds for current user (optional - backend can handle this)
      setRefunds(response.data);
      toast.success('Refund requests loaded');
    } catch (err) {
      console.error('Error fetching refunds:', err);
      toast.error('Failed to load refund requests');
    } finally {
      setLoading(false);
    }
  };

  // Refresh refunds
  const handleRefresh = () => {
    fetchMyRefunds();
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
                .refunded { color: blue; }
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
                        <span class="value ${selectedRefund.status === 'approved' ? 'approved' : selectedRefund.status === 'pending' ? 'pending' : selectedRefund.status === 'refunded' ? 'refunded' : 'rejected'}">${selectedRefund.status.toUpperCase()}</span>
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
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'approved':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border border-red-300';
      case 'refunded':
        return 'bg-blue-100 text-blue-800 border border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'approved':
        return '✅';
      case 'rejected':
        return '❌';
      case 'refunded':
        return '✔️';
      default:
        return '📋';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8e6f2] via-[#f3f0fa] to-[#f7f7fa] py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-[#57123f] mb-2">My Refund Requests</h1>
              <p className="text-gray-600">Track your case closure and refund requests</p>
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 bg-[#57123f] text-white px-4 py-2 rounded-lg hover:opacity-90 transition"
            >
              <FaSync size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 shadow">
            <p className="text-yellow-700 font-semibold text-sm">PENDING</p>
            <p className="text-3xl font-bold text-yellow-800">{refunds.filter(r => r.status === 'pending').length}</p>
          </div>
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4 shadow">
            <p className="text-green-700 font-semibold text-sm">APPROVED</p>
            <p className="text-3xl font-bold text-green-800">{refunds.filter(r => r.status === 'approved').length}</p>
          </div>
          <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 shadow">
            <p className="text-red-700 font-semibold text-sm">REJECTED</p>
            <p className="text-3xl font-bold text-red-800">{refunds.filter(r => r.status === 'rejected').length}</p>
          </div>
          <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 shadow">
            <p className="text-blue-700 font-semibold text-sm">REFUNDED</p>
            <p className="text-3xl font-bold text-blue-800">{refunds.filter(r => r.status === 'refunded').length}</p>
          </div>
        </div>

        {/* Refund Requests Table */}
        {loading ? (
          <div className="bg-white rounded-lg p-12 text-center shadow">
            <p className="text-gray-600 text-lg">Loading your refund requests...</p>
          </div>
        ) : refunds.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow">
            <p className="text-gray-600 text-lg">No refund requests found</p>
            <p className="text-gray-500 mt-2">Submit a new case closure request to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-[#57123f] to-[#3d0c2a] text-white">
                    <th className="px-6 py-4 text-left text-sm font-semibold">Submitted Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">CNIC</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Case Type</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Case Reason</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Amount</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((refund, idx) => (
                    <tr key={refund._id} className={`border-b ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {new Date(refund.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {refund.caseClosure?.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {refund.caseClosure?.cnic}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        {refund.caseClosure?.caseType}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {refund.caseClosure?.caseCloseReason}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        Rs. {refund.refundDetails?.totalCasePayment?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getStatusIcon(refund.status)}</span>
                          <span className={`px-3 py-1 rounded-full font-semibold text-xs capitalize ${getStatusColor(refund.status)}`}>
                            {refund.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2 mx-auto">
                          <button
                            onClick={() => {
                              setSelectedRefund(refund);
                              setShowDetails(true);
                            }}
                            className="text-[#57123f] font-semibold cursor-pointer flex items-center justify-center gap-1"
                            title="View Details"
                          >
                            <FaEye size={16} />
                        
                          </button>
                          {refund.status === 'approved' && refund.isEligibleForRefundDetails && !(refund.refundDetails && refund.refundDetails.totalCasePayment) && (
                            <button
                              onClick={() => navigate(`/refund?id=${refund._id}`)}
                              className="ml-2 text-[#57123f] px-1 py-1 rounded-lg text-sm font-semibold cursor-pointer hover:opacity-90 flex gap-1"
                              
                              title="Enter Refund Details"
                            >
                              <FaArrowCircleRight size={16} />
                              Click
                            </button>
                          )}
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
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-[#57123f] to-[#3d0c2a] px-6 py-4 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Refund Request Details</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintSlip}
                    className="text-white hover:bg-white hover:text-[#57123f] text-lg rounded-full w-8 h-8 flex items-center justify-center transition"
                    title="Print Refund Slip"
                  >
                    <FaPrint size={16} />
                  </button>
                  <button
                    onClick={() => {
                      setShowDetails(false);
                      setSelectedRefund(null);
                    }}
                    className="text-white hover:bg-white hover:text-[#57123f] text-3xl leading-none rounded-full w-8 h-8 flex items-center justify-center transition"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="px-6 py-6 space-y-6">
                {/* Status Banner */}
                <div className={`p-4 rounded-lg border-2 ${getStatusColor(selectedRefund.status)}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">Request Status</p>
                      <p className="text-2xl font-bold capitalize mt-1">{selectedRefund.status}</p>
                    </div>
                    <span className="text-5xl">{getStatusIcon(selectedRefund.status)}</span>
                  </div>
                  {selectedRefund.notes && (
                    <p className="mt-3 text-sm font-medium">Admin Notes: {selectedRefund.notes}</p>
                  )}
                </div>

                {/* Step 1: Case Closure */}
                <div className="bg-gradient-to-br from-[#f8e6f2] to-[#f0f0fa] p-4 rounded-lg border-2 border-[#57123f]">
                  <h3 className="text-lg font-bold text-[#57123f] mb-4 flex items-center gap-2">
                    <span className="bg-[#57123f] text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">1</span>
                    Case Closure Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold">Name</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedRefund.caseClosure?.name}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold">CNIC</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedRefund.caseClosure?.cnic}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold">Phone</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedRefund.caseClosure?.phone}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold">Email</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedRefund.caseClosure?.email}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold">Case Type</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedRefund.caseClosure?.caseType}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold">Consultant</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedRefund.caseClosure?.consultantName}</p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold">Case Submit Date</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">
                        {new Date(selectedRefund.caseClosure?.caseSubmitDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 font-semibold">Close Reason</p>
                      <p className="text-sm font-medium text-gray-900 mt-1">{selectedRefund.caseClosure?.caseCloseReason}</p>
                    </div>
                  </div>
                </div>

                {/* Step 2: Refund Details - Only Show if APPROVED */}
                {selectedRefund.status === 'approved' && selectedRefund.isEligibleForRefundDetails && (
                  <div className="bg-gradient-to-br from-[#f0faf7] to-[#f0f8ff] p-4 rounded-lg border-2 border-green-400">
                    <h3 className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
                      <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">2</span>
                      Refund Details (You are now eligible!)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-lg border border-green-200">
                        <p className="text-xs text-gray-600 font-semibold">Total Payment</p>
                        <p className="text-sm font-medium text-green-700 mt-1">Rs. {selectedRefund.refundDetails?.totalCasePayment?.toLocaleString()}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-green-200">
                        <p className="text-xs text-gray-600 font-semibold">Paid Amount</p>
                        <p className="text-sm font-medium text-green-700 mt-1">Rs. {selectedRefund.refundDetails?.paidPayment?.toLocaleString()}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-green-200">
                        <p className="text-xs text-gray-600 font-semibold">Payment Type</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{selectedRefund.refundDetails?.paidPaymentType}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-green-200">
                        <p className="text-xs text-gray-600 font-semibold">Receiver Account</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{selectedRefund.refundDetails?.receiverAccountNo}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-green-200">
                        <p className="text-xs text-gray-600 font-semibold">Bank Name</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{selectedRefund.refundDetails?.bankName}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-green-200">
                        <p className="text-xs text-gray-600 font-semibold">Account Title</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{selectedRefund.refundDetails?.accountTitle}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-green-200">
                        <p className="text-xs text-gray-600 font-semibold">Account Number</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{selectedRefund.refundDetails?.accountNo}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-green-200">
                        <p className="text-xs text-gray-600 font-semibold">IBAN</p>
                        <p className="text-sm font-medium text-gray-900 mt-1">{selectedRefund.refundDetails?.ibanNo}</p>
                      </div>
                    </div>

                    {/* Payment Evidence Download */}
                    {selectedRefund.refundDetails?.paymentEvidence && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <button
                          onClick={() => handleDownloadEvidence(selectedRefund.refundDetails.paymentEvidence)}
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          <FaDownload size={16} />
                          Download Payment Evidence
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Pending Message */}
                {selectedRefund.status === 'pending' && (
                  <div className="bg-yellow-50 border-2 border-yellow-300 p-4 rounded-lg">
                    <p className="text-yellow-800 font-semibold text-center">
                      ⏳ Your request is pending review. Refund details will appear once approved.
                    </p>
                  </div>
                )}

                {/* Rejected Message */}
                {selectedRefund.status === 'rejected' && (
                  <div className="bg-red-50 border-2 border-red-300 p-4 rounded-lg">
                    <p className="text-red-800 font-semibold text-center">❌ Your request has been rejected.</p>
                    {selectedRefund.notes && (
                      <p className="text-red-700 text-sm mt-2">Reason: {selectedRefund.notes}</p>
                    )}
                  </div>
                )}

                {/* Completed Message */}
                {selectedRefund.status === 'refunded' && (
                  <div className="bg-blue-50 border-2 border-blue-300 p-4 rounded-lg">
                    <p className="text-blue-800 font-semibold text-center">✔️ Your refund has been refunded!</p>
                    {selectedRefund.notes && (
                      <p className="text-blue-700 text-sm mt-2">Details: {selectedRefund.notes}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <div className="sticky bottom-0 bg-gray-100 px-6 py-4 flex justify-end border-t">
                <button
                  onClick={() => {
                    setShowDetails(false);
                    setSelectedRefund(null);
                  }}
                  className="bg-[#57123f] text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
