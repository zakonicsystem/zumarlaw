import React from 'react';

const ConvertLeadModal = ({
  open,
  lead,
  convertFields,
  convertFiles,
  memberCnics,
  memberDetails,
  submittingConvert,
  onClose,
  onFieldChange,
  onFileChange,
  onMemberCnicFileChange,
  onAddMemberCnic,
  onRemoveMemberCnic,
  onAddMemberDetail,
  onRemoveMemberDetail,
  onMemberDetailChange,
  onSubmit,
  getServiceFields,
}) => {
  if (!open || !lead) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-4xl relative"
        style={{ maxHeight: '90vh', overflow: 'auto', padding: '2rem', minWidth: '600px' }}
      >
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
          onClick={onClose}
          title="Close"
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4 text-[#57123f]">Convert Lead into Client</h2>
         <form onSubmit={onSubmit} encType="multipart/form-data" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="font-semibold">Name:</span> {lead.name}</div>
                <div><span className="font-semibold">Phone:</span> {lead.phone}</div>
                <div><span className="font-semibold">Service:</span> {lead.service}</div>
                <div>
                  <label className="font-semibold">Total Payment:</label>
                  <input
                    type="number"
                    name="totalPayment"
                    value={convertFields.totalPayment || ''}
                    onChange={onFieldChange}
                    className="border rounded px-2 py-1 w-full"
                    placeholder="Enter total payment for this service"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold">Current Receiving Payment:</label>
                  <input
                    type="number"
                    name="currentPayment"
                    value={convertFields.currentPayment || ''}
                    onChange={onFieldChange}
                    className="border rounded px-2 py-1 w-full"
                    placeholder="Enter current payment received"
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold">Remaining Amount:</label>
                  <input
                    type="number"
                    name="remainingAmount"
                    value={
                      (convertFields.totalPayment && convertFields.currentPayment)
                        ? Math.max(Number(convertFields.totalPayment) - Number(convertFields.currentPayment), 0)
                        : ''
                    }
                    className="border rounded px-2 py-1 w-full bg-gray-100"
                    placeholder="Auto-calculated"
                    readOnly
                  />
                </div>
                <div>
                  <label className="font-semibold">Payment Method:</label>
                  <select
                    name="paymentMethod"
                    value={convertFields.paymentMethod || ''}
                    onChange={onFieldChange}
                    className="border rounded px-2 py-1 w-full"
                    required
                  >
                    <option value="">Select method</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Bank">Bank</option>
                    <option value="Easypaisa">Easypaisa</option>
                    <option value="Jazzcash">Jazzcash</option>
                  </select>
                </div>
                {(convertFields.paymentMethod === 'Bank' || convertFields.paymentMethod === 'Easypaisa' || convertFields.paymentMethod === 'Jazzcash') && (
                  <div>
                    <label className="font-semibold">Account Number:</label>
                    <input
                      type="text"
                      name="accountNumber"
                      value={convertFields.accountNumber || ''}
                      onChange={onFieldChange}
                      className="border rounded px-2 py-1 w-full"
                      placeholder="Enter account number"
                      required
                    />
                  </div>
                )}
                <div className="col-span-1">
                  <label className="font-semibold">Person Name (who accepted payment):</label>
                  <input
                    type="text"
                    name="personName"
                    value={convertFields.personName || ''}
                    onChange={onFieldChange}
                    className="border rounded px-2 py-1 w-full"
                    placeholder="Enter person name"
                    required
                  />
                </div>
                <div className="col-span-1">
                  <label className="font-semibold">Payment Date:</label>
                  <input
                    type="date"
                    name="paymentReceivedDate"
                    value={convertFields.paymentReceivedDate || ''}
                    onChange={onFieldChange}
                    className="border rounded px-2 py-1 w-full"
                    required
                  />
                </div>
              </div>
              <hr className="my-2" />
              <div className="font-semibold mb-2">Required Documents/Fields:</div>
              {getServiceFields(lead.service).length === 0 && (
                <div className="text-gray-500">No extra fields required for this service.</div>
              )}
              {getServiceFields(lead.service).map((field) => (
                <div key={field.name} className="flex flex-col gap-1">
                  <label className="font-medium text-sm">
                    {field.label || field.name}
                    {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'file' ? (
                    <input
                      type="file"
                      name={field.name}
                      accept={field.accept || '*'}
                      required={field.required}
                      onChange={onFileChange}
                    />
                  ) : field.type === 'checkbox' ? (
                    <input
                      type="checkbox"
                      name={field.name}
                      checked={!!convertFields[field.name]}
                      onChange={onFieldChange}
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      name={field.name}
                      value={convertFields[field.name] || ''}
                      required={field.required}
                      onChange={onFieldChange}
                      className="border rounded px-2 py-1"
                    />
                  )}
                </div>
              ))}

              {/* Dynamic Member CNICs Section */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Member CNICs (if required)</span>
                  <button
                    type="button"
                    className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-semibold hover:bg-green-200"
                    onClick={onAddMemberCnic}
                  >
                    + Add Member CNIC
                  </button>
                </div>
                <div style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: 4 }} className="custom-scrollbar pr-1">
                  {memberCnics.length === 0 && (
                    <div className="text-xs text-gray-400">No member CNICs added yet.</div>
                  )}
                  {memberCnics.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-2 mb-2 bg-gray-50 rounded p-2 relative">
                      <button
                        type="button"
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-lg font-bold"
                        onClick={() => onRemoveMemberCnic(idx)}
                        title="Remove"
                      >
                        &times;
                      </button>
                      <div>
                        <label className="block text-xs font-medium">Front</label>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={e => onMemberCnicFileChange(idx, 'front', e.target.files[0])}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium">Back</label>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={e => onMemberCnicFileChange(idx, 'back', e.target.files[0])}
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Member Details Section */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Additional Member Details (if required)</span>
                  <button
                    type="button"
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs font-semibold hover:bg-blue-200"
                    onClick={onAddMemberDetail}
                  >
                    + Add Member Detail
                  </button>
                </div>
                <div style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: 4 }} className="custom-scrollbar pr-1">
                  {memberDetails.length === 0 && (
                    <div className="text-xs text-gray-400">No member details added yet.</div>
                  )}
                  {memberDetails.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-2 mb-2 bg-blue-50 rounded p-2 relative">
                      <button
                        type="button"
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-lg font-bold"
                        onClick={() => onRemoveMemberDetail(idx)}
                        title="Remove"
                      >
                        &times;
                      </button>
                      <div>
                        <label className="block text-xs font-medium">Email</label>
                        <input
                          type="email"
                          value={item.email}
                          onChange={e => onMemberDetailChange(idx, 'email', e.target.value)}
                          className="border rounded px-2 py-1"
                          placeholder="Enter member email"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium">Phone</label>
                        <input
                          type="tel"
                          value={item.phone}
                          onChange={e => onMemberDetailChange(idx, 'phone', e.target.value)}
                          className="border rounded px-2 py-1"
                          placeholder="Enter member phone"
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Custom scrollbar styles for modal */}
              <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e5e7eb;
          border-radius: 4px;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #e5e7eb #fff;
        }
      `}</style>

              <div className="flex justify-end mt-4">
                <button
                  type="submit"
                  className="bg-[#57123f] text-white px-6 py-2 rounded-lg font-semibold"
                  disabled={submittingConvert}
                >
                  {submittingConvert ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            </form>
      </div>
    </div>
  );
};

export default ConvertLeadModal;
