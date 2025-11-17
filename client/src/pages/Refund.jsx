import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { serviceData } from '../data/serviceSchemas';
import api from '../utils/api';
import { FaArrowRight } from 'react-icons/fa';

const Refund = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1); // Step 1: Case Closed, Step 2: Refund Details
  const [submitting, setSubmitting] = useState(false);
  const [caseClosureAccepted, setCaseClosureAccepted] = useState(false);
  const [refundPolicyAccepted, setRefundPolicyAccepted] = useState(false);

  // Step 1: Case Closure Data
  const [caseClosure, setCaseClosure] = useState({
    // Person Details
    name: '',
    cnic: '',
    phone: '',
    email: '',
    // Case Details
    caseType: '',
    caseSubmitDate: '',
    consultantName: '',
    caseCloseReason: ''
  });

  // Step 2: Refund Details Data
  const [refundDetails, setRefundDetails] = useState({
    // Payment Paid Details
    totalCasePayment: '',
    paidPaymentType: '',
    paidPayment: '',
    receiverAccountNo: '',
    paidPaymentAvoidance: null, // file
    // Bank Account Details for Refund
    bankName: '',
    accountTitle: '',
    accountNo: '',
    ibanNo: ''
  });

  // Handle Step 1 form input changes
  const handleCaseClosureChange = (e) => {
    const { name, value } = e.target;
    setCaseClosure(prev => ({ ...prev, [name]: value }));
  };

  // Handle Step 2 form input changes
  const handleRefundDetailsChange = (e) => {
    const { name, value } = e.target;
    setRefundDetails(prev => ({ ...prev, [name]: value }));
  };

  // Handle file input
  const handleFileChange = (e) => {
    setRefundDetails(prev => ({ ...prev, paidPaymentAvoidance: e.target.files[0] }));
  };

  // Validate Step 1
  const validateStep1 = () => {
    if (!caseClosure.name) {
      toast.error('Name is required');
      return false;
    }
    if (!caseClosure.cnic) {
      toast.error('CNIC is required');
      return false;
    }
    if (!caseClosure.phone) {
      toast.error('Phone is required');
      return false;
    }
    if (!caseClosure.email) {
      toast.error('Email is required');
      return false;
    }
    if (!caseClosure.caseType) {
      toast.error('Case Type is required');
      return false;
    }
    if (!caseClosure.caseSubmitDate) {
      toast.error('Case Submit Date is required');
      return false;
    }
    if (!caseClosure.consultantName) {
      toast.error('Consultant Name is required');
      return false;
    }
    if (!caseClosure.caseCloseReason) {
      toast.error('Case Close Reason is required');
      return false;
    }
    if (!caseClosureAccepted) {
      toast.error('You must accept the Terms & Conditions and Undertaking');
      return false;
    }
    return true;
  };

  // Validate Step 2
  const validateStep2 = () => {
    if (!refundDetails.totalCasePayment) {
      toast.error('Total Case Payment is required');
      return false;
    }
    if (!refundDetails.paidPaymentType) {
      toast.error('Paid Payment Type is required');
      return false;
    }
    if (!refundDetails.paidPayment) {
      toast.error('Paid Payment is required');
      return false;
    }
    if (!refundDetails.receiverAccountNo) {
      toast.error('Receiver Account No is required');
      return false;
    }
    if (!refundDetails.bankName) {
      toast.error('Bank Name is required');
      return false;
    }
    if (!refundDetails.accountTitle) {
      toast.error('Account Title is required');
      return false;
    }
    if (!refundDetails.accountNo) {
      toast.error('Account No is required');
      return false;
    }
    if (!refundDetails.ibanNo) {
      toast.error('IBAN No is required');
      return false;
    }
    if (!refundPolicyAccepted) {
      toast.error('You must accept the Refund Policy and Undertaking');
      return false;
    }
    return true;
  };

  // Submit only Step 1 (Case Closure) to create the refund request, then navigate to My Requests
  const handleSubmitCaseClosure = async () => {
    if (!validateStep1()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: caseClosure.name,
        cnic: caseClosure.cnic,
        phone: caseClosure.phone,
        email: caseClosure.email,
        caseType: caseClosure.caseType,
        caseSubmitDate: caseClosure.caseSubmitDate,
        consultantName: caseClosure.consultantName,
        caseCloseReason: caseClosure.caseCloseReason,
        tAndCAccepted: caseClosureAccepted,
        undertakingAccepted: caseClosureAccepted,
        undertakingApproved: caseClosureAccepted
      };

      await api.post('/refund', payload);
      toast.success('Case closure submitted. You can track it in My Requests.');
      navigate('/my-refund-requests');
    } catch (err) {
      console.error('Error submitting case closure:', err);
      const errorMsg = err.response?.data?.error || 'Submission failed. Please try again.';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit refund details (when editing an existing refund after approval)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;

    // Expect editing an existing refund (loaded via ?id=)
    const search = new URLSearchParams(location.search);
    const refundId = search.get('id');
    if (!refundId) {
      toast.error('No refund selected to add details.');
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('totalCasePayment', refundDetails.totalCasePayment);
      fd.append('paidPaymentType', refundDetails.paidPaymentType);
      fd.append('paidPayment', refundDetails.paidPayment);
      fd.append('receiverAccountNo', refundDetails.receiverAccountNo);
      fd.append('bankName', refundDetails.bankName);
      fd.append('accountTitle', refundDetails.accountTitle);
      fd.append('accountNo', refundDetails.accountNo);
      fd.append('ibanNo', refundDetails.ibanNo);
      fd.append('refundPolicyAccepted', refundPolicyAccepted);
      fd.append('undertakingAccepted', refundPolicyAccepted);
      fd.append('undertakingApproved', refundPolicyAccepted);
      if (refundDetails.paidPaymentAvoidance) {
        fd.append('paymentEvidence', refundDetails.paidPaymentAvoidance);
      }

      const res = await api.put(`/refund/${refundId}/details`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Refund details added successfully!');
      navigate('/my-refund-requests');
    } catch (err) {
      console.error('Error updating refund details:', err);
      const errorMsg = err.response?.data?.error || 'Submission failed. Please try again.';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const caseCloseReasons = [
    'End Frame Time',
    'Government Rejected',
    'Misrepresentation',
    'Impossibility of Performance'
  ];

  // Get service list from serviceSchemas
  const serviceList = serviceData && serviceData.prices ? Object.keys(serviceData.prices) : [];

  // If loaded with ?id=, fetch refund and allow adding details only when approved
  const [loadedRefund, setLoadedRefund] = useState(null);
  const [loadingRefund, setLoadingRefund] = useState(false);
  const [detailsEditable, setDetailsEditable] = useState(false);

  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const id = search.get('id');
    if (!id) return;
    (async () => {
      setLoadingRefund(true);
      try {
        const res = await api.get(`/refund/${id}`);
        setLoadedRefund(res.data);
        // populate caseClosure so user sees what they are adding details for
        if (res.data.caseClosure) {
          const cc = res.data.caseClosure;
          setCaseClosure({
            name: cc.name || '',
            cnic: cc.cnic || '',
            phone: cc.phone || '',
            email: cc.email || '',
            caseType: cc.caseType || '',
            caseSubmitDate: cc.caseSubmitDate ? new Date(cc.caseSubmitDate).toISOString().slice(0, 10) : '',
            consultantName: cc.consultantName || '',
            caseCloseReason: cc.caseCloseReason || ''
          });
        }

        // If approved and eligible, allow filling refund details
        if (res.data.status === 'approved' && res.data.isEligibleForRefundDetails) {
          setDetailsEditable(true);
          setStep(2);
        } else {
          setDetailsEditable(false);
          // show Step 1 but user likely won't submit details until approved
        }
      } catch (err) {
        console.error('Failed to load refund:', err);
        toast.error('Failed to load refund.');
      } finally {
        setLoadingRefund(false);
      }
    })();
  }, [location.search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8e6f2] via-[#f3f0fa] to-[#f7f7fa] py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header with My Requests Button */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#57123f]">Refund Request</h1>
          <button
            type="button"
            onClick={() => navigate('/my-refund-requests')}
            className="flex items-center gap-2 bg-[#57123f] text-white px-4 py-2 rounded-lg hover:opacity-90 transition font-semibold"
            title="View all your refund requests"
          >
            My Requests
            <FaArrowRight size={16} />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white transition ${step === 1 ? 'bg-[#57123f]' : 'bg-green-500'}`}>
            1
          </div>
          <div className={`w-12 h-1 ${step === 2 ? 'bg-[#57123f]' : 'bg-gray-300'}`}></div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition ${step === 2 ? 'bg-[#57123f] text-white' : 'bg-gray-300 text-gray-500'}`}>
            2
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); }}>
          {/* STEP 1: CASE CLOSED */}
          {step === 1 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
              <h2 className="text-3xl font-bold text-[#57123f] mb-6">Case Closure Request</h2>

              {/* Person Details */}
              <div>
                <h3 className="text-xl font-semibold text-[#57123f] mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#57123f] text-white rounded-full flex items-center justify-center text-sm font-bold">👤</div>
                  Person Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={caseClosure.name}
                      onChange={handleCaseClosureChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">CNIC *</label>
                    <input
                      type="text"
                      name="cnic"
                      value={caseClosure.cnic}
                      onChange={handleCaseClosureChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                      placeholder="Enter CNIC"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={caseClosure.phone}
                      onChange={handleCaseClosureChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={caseClosure.email}
                      onChange={handleCaseClosureChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                      placeholder="Enter email"
                    />
                  </div>
                </div>
              </div>

              {/* Case Details */}
              <div>
                <h3 className="text-xl font-semibold text-[#57123f] mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#57123f] text-white rounded-full flex items-center justify-center text-sm font-bold">📋</div>
                  Case Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Case Type *</label>
                    <select
                      name="caseType"
                      value={caseClosure.caseType}
                      onChange={handleCaseClosureChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                    >
                      <option value="">Select a service</option>
                      {serviceList.map(service => (
                        <option key={service} value={service}>{service}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Case Submit Date (Optional)</label>
                    <input
                      type="date"
                      name="caseSubmitDate"
                      value={caseClosure.caseSubmitDate}
                      onChange={handleCaseClosureChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Consultant Name (Optional)</label>
                    <input
                      type="text"
                      name="consultantName"
                      value={caseClosure.consultantName}
                      onChange={handleCaseClosureChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                      placeholder="Enter consultant name"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Case Close Reason *</label>
                    <select
                      name="caseCloseReason"
                      value={caseClosure.caseCloseReason}
                      onChange={handleCaseClosureChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                    >
                      <option value="">Select a reason</option>
                      {caseCloseReasons.map(reason => (
                        <option key={reason} value={reason}>{reason}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="bg-[#f9f5fc] border border-[#ecd4bc] rounded-lg p-4">
                <h4 className="font-semibold text-[#57123f] mb-3">Case Closure Policy</h4>
                <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
                  <li>Both the client and the consultancy agree that the case will not be pursued any further.</li>
                  <li>If the client himself admits that he had given false information and now wants to close the case.</li>
                  <li>The client has decided to shift from one service to another.</li>
                  <li>If a service is banned by the government.</li>
                  <li>If the time given to the client by the company expires.</li>
                  <li>If the government raises objections to the case that make it impossible to proceed with the case.</li>
                  <li className="font-semibold">The Case Closure Request will be processed within five (5) working days.</li>
                </ul>
              </div>

              {/* Undertaking Checkbox */}
              <div className="bg-[#f9f5fc] border border-[#ecd4bc] rounded-lg p-4">
                <h4 className="font-semibold text-[#57123f] mb-3">Undertaking</h4>
                <p className="text-sm text-gray-700 mb-4">
                  I, do hereby solemnly affirm and declare that I have thoroughly read and understood the "Case Closure Policy" of Zumar Law Firm and am fully aware of all its terms and conditions. I, therefore, of my own free will and consent, hereby request Zumar Law Firm to proceed with the closure of my case based on the stated reasons. The Case Closure Request will be processed within five (5) working days.
                </p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={caseClosureAccepted}
                    onChange={(e) => setCaseClosureAccepted(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-[#57123f] cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700">I accept the Case Closure Policy and Undertaking *</span>
                </label>
              </div>

              {/* Proceed Button */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleSubmitCaseClosure}
                  disabled={submitting}
                  className="flex-1 bg-[#57123f] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-95 transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Case Closure'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: REFUND DETAILS */}
          {step === 2 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
              <h2 className="text-3xl font-bold text-[#57123f] mb-6">Refund Details</h2>

              {/* Payment Paid Details */}
              <div>
                <h3 className="text-xl font-semibold text-[#57123f] mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#57123f] text-white rounded-full flex items-center justify-center text-sm font-bold">💳</div>
                  Payment Paid Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Total Case Payment *</label>
                    <input
                      type="number"
                      name="totalCasePayment"
                      value={refundDetails.totalCasePayment}
                      onChange={handleRefundDetailsChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Paid Payment Type *</label>
                    <input
                      type="text"
                      name="paidPaymentType"
                      value={refundDetails.paidPaymentType}
                      onChange={handleRefundDetailsChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                      placeholder="e.g., Bank Transfer, Cash"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Paid Payment *</label>
                    <input
                      type="number"
                      name="paidPayment"
                      value={refundDetails.paidPayment}
                      onChange={handleRefundDetailsChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Receiver Account No *</label>
                    <input
                      type="text"
                      name="receiverAccountNo"
                      value={refundDetails.receiverAccountNo}
                      onChange={handleRefundDetailsChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                      placeholder="Enter account number"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-1 font-medium text-gray-700">Attached Paid Payment Avoidance (Optional)</label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                    />
                  </div>
                </div>
              </div>

              {/* Bank Account Details */}
              <div>
                <h3 className="text-xl font-semibold text-[#57123f] mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-[#57123f] text-white rounded-full flex items-center justify-center text-sm font-bold">🏦</div>
                  Bank Account Details for Refund
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Bank Name *</label>
                    <input
                      type="text"
                      name="bankName"
                      value={refundDetails.bankName}
                      onChange={handleRefundDetailsChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                      placeholder="Enter bank name"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Account Title *</label>
                    <input
                      type="text"
                      name="accountTitle"
                      value={refundDetails.accountTitle}
                      onChange={handleRefundDetailsChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                      placeholder="Enter account title"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">Account No *</label>
                    <input
                      type="text"
                      name="accountNo"
                      value={refundDetails.accountNo}
                      onChange={handleRefundDetailsChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                      placeholder="Enter account number"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 font-medium text-gray-700">IBAN No *</label>
                    <input
                      type="text"
                      name="ibanNo"
                      value={refundDetails.ibanNo}
                      onChange={handleRefundDetailsChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                      placeholder="Enter IBAN number"
                    />
                  </div>
                </div>
              </div>

              {/* Refund Policy */}
              <div className="bg-[#f9f5fc] border border-[#ecd4bc] rounded-lg p-4">
                <h4 className="font-semibold text-[#57123f] mb-3">Easy Return and Refund Policy</h4>
                <ul className="text-sm text-gray-700 space-y-2 list-disc list-inside">
                  <li>A refund request can be submitted after the case completion time given by the institution is over.</li>
                  <li>A refund request may be made by the government for dismissal of the case or ground for objection.</li>
                  <li>Refund Government fee will be applicable only as per government rules.</li>
                  <li className="font-semibold">Tax payment of 18% of the total payment amount will be non-refundable.</li>
                  <li>The refund application will be processed within 15 working days.</li>
                  <li>If the payment is not confirmed in company account. The request will be considered null and void.</li>
                  <li>After the refund request has been approved the amount will be transferred to the client provided account no within five (5) working Days.</li>
                </ul>
              </div>

              {/* Undertaking Checkbox */}
              <div className="bg-[#f9f5fc] border border-[#ecd4bc] rounded-lg p-4">
                <h4 className="font-semibold text-[#57123f] mb-3">Undertaking</h4>
                <p className="text-sm text-gray-700 mb-4">
                  I hereby confirm that I have read and understood the refund terms and conditions, and I accept that refunds will be processed only as per company and government rules, with 18% tax being non-refundable; requests will be valid only after case completion and payment confirmation, and once approved, the refund amount will be transferred to my provided account within five (5) working days.
                </p>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={refundPolicyAccepted}
                    onChange={(e) => setRefundPolicyAccepted(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-[#57123f] cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700">I accept the Refund Policy and Undertaking *</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate('/my-refund-requests')}
                  className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:opacity-95 transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-[#57123f] text-white px-6 py-3 rounded-lg font-semibold hover:opacity-95 transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Refund Details'}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Refund Eligibility Checker removed - eligibility is handled via admin approval and MyRefundRequests */}
      </div>
    </div>
  );
};

// Eligibility checker removed - eligibility is now determined by admin status updates

export default Refund;
