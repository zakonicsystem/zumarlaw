import React, { useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
  FaCcVisa,
  FaCcMastercard,
  FaCcDiscover,
  FaMoneyCheckAlt,
  FaMobileAlt,
} from 'react-icons/fa';
import JazzCashLogo from '../assets/jazzcash.png';
import EasypaisaLogo from '../assets/easypaisa.png';
import { serviceData } from '../data/serviceSchemas';

const steps = ['Select Service', 'Add Details', 'Pay Now'];

const PaymentPage = () => {
  const { serviceTitle } = useParams();
  const location = useLocation();

  // Prefer serviceTitle and fee from navigation state if available
  const decodedTitle = location.state?.serviceTitle
    ? location.state.serviceTitle
    : decodeURIComponent(serviceTitle);

  // Payment type: 'full' or 'advance'
  const [paymentType, setPaymentType] = useState('full');

  // Use fee from navigation state if available, else lookup
  const getRawFee = (title) => {
    if (serviceData.prices[title]) return serviceData.prices[title];
    const foundKey = Object.keys(serviceData.prices).find(
      k => k.trim().toLowerCase() === title.trim().toLowerCase()
    );
    return foundKey ? serviceData.prices[foundKey] : 0;
  };

  // If fee is passed in state, use it, else lookup
  const rawFee = location.state?.fee !== undefined ? location.state.fee : getRawFee(decodedTitle);
  const fullFee = Array.isArray(rawFee)
    ? `${rawFee[0].toLocaleString()} – ${rawFee[1].toLocaleString()}`
    : (rawFee || 0).toLocaleString();
  const advanceFee = Array.isArray(rawFee)
    ? `${Math.round(rawFee[0] / 2).toLocaleString()} – ${Math.round(rawFee[1] / 2).toLocaleString()}`
    : Math.round((rawFee || 0) / 2).toLocaleString();
  const fee = paymentType === 'advance' ? advanceFee : fullFee;

  const [method, setMethod] = useState('card');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvc: '' });
  const [mobile, setMobile] = useState('');
  const [mpin, setMpin] = useState('');
  const [agreed, setAgreed] = useState(false);

  const handleCardPay = () => {
    if (!agreed) return alert('Please accept terms.');
    console.log('Charge card:', { card, title: decodedTitle, fee });
    // integrate your card gateway here...
  };

  const handleMobilePay = () => {
    if (!mobile || !mpin) return alert('Enter mobile & MPIN.');
    console.log(`Charge ${method}:`, { mobile, mpin, title: decodedTitle, fee });
    // integrate JazzCash/Easypaisa SDK here...
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Heading */}
        <h1 className="text-4xl font-bold text-center text-gray-800">
          Pay Now
        </h1>

        {/* Service & Fee */}
        <div className="text-center mb-4 text-lg font-medium">
          Selected Service: <span className="text-[#5B2148]">{decodedTitle}</span><br />
          <span className="text-gray-700">Fee: PKR {fee}</span>
        </div>

        {/* Payment Type Selection */}
        <div className="flex justify-center gap-8 my-4">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="radio"
              name="paymentType"
              value="full"
              checked={paymentType === 'full'}
              onChange={() => setPaymentType('full')}
              className="form-radio text-[#57123f]"
            />
            <span className="ml-2 font-medium">Full Payment</span>
          </label>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="radio"
              name="paymentType"
              value="advance"
              checked={paymentType === 'advance'}
              onChange={() => setPaymentType('advance')}
              className="form-radio text-[#57123f]"
            />
            <span className="ml-2 font-medium">Advance Payment (50%)</span>
          </label>
        </div>

        {/* Steps */}
        <div className="flex items-center justify-center space-x-4 text-gray-500">
          {steps.map((label, idx) => (
            <React.Fragment key={idx}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${idx <= 2
                      ? 'bg-[#57123f] border-[#57123f] text-white'
                      : 'border-gray-300'
                    }`}
                >
                  {idx + 1}
                </div>
                <span className="mt-2 text-sm">{label}</span>
              </div>
              {idx < steps.length - 1 && <div className="w-8 h-px bg-gray-300" />}
            </React.Fragment>
          ))}
        </div>

        {/* Notice */}
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
          <p className="font-semibold">
            Complete your payment and then your work will be started.
          </p>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="space-y-3">
            {/* Credit Card Option */}
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="method"
                value="card"
                checked={method === 'card'}
                onChange={() => setMethod('card')}
                className="form-radio text-[#57123f]"
              />
              <span className="ml-2 font-medium">Credit Card</span>
              <FaCcVisa className="ml-4 text-2xl text-gray-400" />
              <FaCcDiscover className="ml-2 text-2xl text-gray-400" />
              <FaCcMastercard className="ml-2 text-2xl text-gray-400" />
            </label>

            {/* JazzCash Option */}
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="method"
                value="jazzcash"
                checked={method === 'jazzcash'}
                onChange={() => setMethod('jazzcash')}
                className="form-radio text-[#57123f]"
              />
              <img src={JazzCashLogo} alt="JazzCash" className="ml-2 h-6" />
              <span className="ml-2 font-medium">JazzCash</span>
            </label>

            {/* Easypaisa Option */}
            <label className="inline-flex items-center">
              <input
                type="radio"
                name="method"
                value="easypaisa"
                checked={method === 'easypaisa'}
                onChange={() => setMethod('easypaisa')}
                className="form-radio text-[#57123f]"
              />
              <img src={EasypaisaLogo} alt="Easypaisa" className="ml-2 h-6" />
              <span className="ml-2 font-medium">Easypaisa</span>
            </label>
          </div>

          {/* Card Fields */}
          {method === 'card' && (
            <div className="grid grid-cols-1 gap-4">
              <input
                type="text"
                placeholder="Card number"
                value={card.number}
                onChange={e => setCard({ ...card, number: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57123f]"
              />
              <input
                type="text"
                placeholder="Name on card"
                value={card.name}
                onChange={e => setCard({ ...card, name: e.target.value })}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57123f]"
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Expiration (MM/YY)"
                  value={card.expiry}
                  onChange={e => setCard({ ...card, expiry: e.target.value })}
                  className="px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                />
                <input
                  type="text"
                  placeholder="CVC"
                  value={card.cvc}
                  onChange={e => setCard({ ...card, cvc: e.target.value })}
                  className="px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57123f]"
                />
              </div>
              <button
                onClick={handleCardPay}
                disabled={!agreed}
                className={`w-full flex justify-center items-center gap-2 px-6 py-3 rounded-lg text-white font-semibold ${agreed
                    ? 'bg-[#57123f] hover:bg-purple-800'
                    : 'bg-gray-400 cursor-not-allowed'
                  }`}
              >
                <FaMoneyCheckAlt /> Pay Now
              </button>
            </div>
          )}

          {/* Mobile Wallet Fields */}
          {(method === 'jazzcash' || method === 'easypaisa') && (
            <div className="grid grid-cols-1 gap-4">
              <input
                type="tel"
                placeholder="Mobile Number"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57123f]"
              />
              <input
                type="password"
                placeholder="Enter MPIN"
                value={mpin}
                onChange={e => setMpin(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#57123f]"
              />
              <button
                onClick={handleMobilePay}
                className="w-full flex justify-center items-center gap-2 px-6 py-3 rounded-lg bg-[#57123f] text-white font-semibold hover:bg-purple-800"
              >
                <FaMobileAlt /> Verify &amp; Pay
              </button>
            </div>
          )}
        </div>

        {/* Total & Terms */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex justify-between items-center text-lg font-medium">
            <span>Total</span>
            <span>PKR {fee}</span>
          </div>
          <label className="inline-flex items-center space-x-2">
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              className="form-checkbox text-[#57123f]"
            />
            <span className="text-sm text-gray-600">
              I agree to the{' '}
              <a href="/privacy" className="text-[#57123f] underline">
                terms &amp; privacy policy
              </a>
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;
