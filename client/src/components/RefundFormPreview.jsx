import React from 'react';
import { caseClosureUndertaking, refundUndertaking } from '../utils/refundSlips';

const Field = ({ label, value, type = 'text', full = false }) => (
  <div className={full ? 'md:col-span-2' : ''}>
    <label className="block mb-1 font-medium text-gray-700">{label}</label>
    <input
      type={type}
      value={value || ''}
      readOnly
      className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50 text-gray-900 focus:outline-none"
    />
  </div>
);

const SectionTitle = ({ icon, children }) => (
  <h3 className="text-xl font-semibold text-[#57123f] mb-4 flex items-center gap-2">
    <div className="w-6 h-6 bg-[#57123f] text-white rounded-full flex items-center justify-center text-sm font-bold">
      {icon}
    </div>
    {children}
  </h3>
);

const ReadOnlyCheckbox = ({ checked, label }) => (
  <label className="flex items-center gap-3">
    <input
      type="checkbox"
      checked={Boolean(checked)}
      readOnly
      className="w-5 h-5 rounded border-gray-300 text-[#57123f]"
    />
    <span className="text-sm font-medium text-gray-700">{label}</span>
  </label>
);

export const CaseClosureFormPreview = ({ refund }) => {
  const data = refund?.caseClosure || {};
  const accepted = data.undertakingApproved || data.undertakingAccepted || data.tAndCAccepted;

  return (
    <div className="bg-white rounded-2xl p-8 space-y-8">
      <h2 className="text-3xl font-bold text-[#57123f] mb-6">Case Closure Request</h2>

      <div>
        <SectionTitle icon="1">Person Details</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Name" value={data.name} />
          <Field label="CNIC" value={data.cnic} />
          <Field label="Phone" value={data.phone} />
          <Field label="Email" value={data.email} type="email" />
        </div>
      </div>

      <div>
        <SectionTitle icon="2">Case Details</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Case Type" value={data.caseType} />
          <Field label="Case Submit Date" value={data.caseSubmitDate ? new Date(data.caseSubmitDate).toISOString().slice(0, 10) : ''} type="date" />
          <Field label="Consultant Name" value={data.consultantName} />
          <Field label="Case Close Reason" value={data.caseCloseReason} />
        </div>
      </div>

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

      <div className="bg-[#f9f5fc] border border-[#ecd4bc] rounded-lg p-4">
        <h4 className="font-semibold text-[#57123f] mb-3">Undertaking</h4>
        <p className="text-sm text-gray-700 mb-4">{caseClosureUndertaking}</p>
        <ReadOnlyCheckbox checked={accepted} label="I accept the Case Closure Policy and Undertaking" />
      </div>
    </div>
  );
};

export const RefundDetailsFormPreview = ({ refund }) => {
  const data = refund?.refundDetails || {};
  const accepted = data.undertakingApproved || data.undertakingAccepted || data.refundPolicyAccepted;

  return (
    <div className="bg-white rounded-2xl p-8 space-y-8">
      <h2 className="text-3xl font-bold text-[#57123f] mb-6">Refund Details</h2>

      <div>
        <SectionTitle icon="1">Payment Paid Details</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Total Case Payment" value={data.totalCasePayment} type="number" />
          <Field label="Paid Payment Type" value={data.paidPaymentType} />
          <Field label="Paid Payment" value={data.paidPayment} type="number" />
          <Field label="Receiver Account No" value={data.receiverAccountNo} />
          <Field label="Attached Paid Payment Avoidance" value={data.paymentEvidence || 'Not attached'} full />
        </div>
      </div>

      <div>
        <SectionTitle icon="2">Bank Account Details for Refund</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Bank Name" value={data.bankName} />
          <Field label="Account Title" value={data.accountTitle} />
          <Field label="Account No" value={data.accountNo} />
          <Field label="IBAN No" value={data.ibanNo} />
        </div>
      </div>

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

      <div className="bg-[#f9f5fc] border border-[#ecd4bc] rounded-lg p-4">
        <h4 className="font-semibold text-[#57123f] mb-3">Undertaking</h4>
        <p className="text-sm text-gray-700 mb-4">{refundUndertaking}</p>
        <ReadOnlyCheckbox checked={accepted} label="I accept the Refund Policy and Undertaking" />
      </div>
    </div>
  );
};
