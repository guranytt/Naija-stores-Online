/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Lock, CreditCard, Landmark, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

interface PaystackCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (method: string) => void;
  amount: number; // In Naira (₦)
  email: string;
}

export default function PaystackCheckout({ isOpen, onClose, onSuccess, amount, email }: PaystackCheckoutProps) {
  const [step, setStep] = useState<"method" | "card" | "bank" | "transfer" | "otp" | "success">("method");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [otp, setOtp] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [loading, setLoading] = useState(false);

  const formattedAmount = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2
  }).format(amount);

  const banks = [
    "Guaranty Trust Bank (GTB)",
    "Zenith Bank",
    "United Bank for Africa (UBA)",
    "Access Bank",
    "Kuda Microfinance Bank",
    "Sterling Bank",
    "Wema Bank"
  ];

  useEffect(() => {
    if (isOpen) {
      setStep("method");
      setCardNumber("");
      setExpiry("");
      setCvv("");
      setOtp("");
      setSelectedBank("");
      setLoading(false);
    }
  }, [isOpen]);

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !expiry || !cvv) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
    }, 1500);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("success");
    }, 1800);
  };

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("success");
    }, 1500);
  };

  const handleTransferComplete = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("success");
    }, 1800);
  };

  const handleFinalSuccess = () => {
    onSuccess(step === "success" ? "Paystack Standard" : "Direct Paystack");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={step !== "success" ? onClose : undefined}
          className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-md bg-white rounded-2xl shadow-premium overflow-hidden text-neutral-800 z-10 font-sans"
        >
          {/* Paystack Top Ribbon */}
          <div className="bg-cyan-500 text-white px-4 py-3 flex justify-between items-center bg-radial from-cyan-600 to-cyan-500">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <p className="text-xs font-bold tracking-widest uppercase">Paystack Secure Portal</p>
            </div>
            {step !== "success" && (
              <button
                onClick={onClose}
                className="hover:bg-white/15 p-1 rounded-full transition-colors text-white"
                id="close-paystack"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="p-6">
            {/* Amount / Header */}
            {step !== "success" && (
              <div className="text-center mb-6">
                <p className="text-xs text-neutral-400 font-semibold tracking-wide uppercase">Pay NaijaStores Online</p>
                <h3 className="text-2xl font-extrabold text-neutral-900 tracking-tight mt-1">{formattedAmount}</h3>
                <p className="text-xs text-neutral-500 mt-0.5">{email}</p>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-semibold text-neutral-600">Verifying secure pipeline...</p>
              </div>
            ) : (
              <>
                {step === "method" && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 text-left">Choose Payment Gateway Method</p>
                    
                    <button
                      onClick={() => setStep("card")}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-neutral-200 hover:border-cyan-500 hover:bg-cyan-50/20 transition-all text-left group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-neutral-100 rounded-lg group-hover:bg-cyan-100/50 text-neutral-700 group-hover:text-cyan-600 transition-colors">
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Pay with Card</p>
                          <p className="text-xs text-neutral-400">Visa, Mastercard, Verve</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all" />
                    </button>

                    <button
                      onClick={() => setStep("bank")}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-neutral-200 hover:border-cyan-500 hover:bg-cyan-50/20 transition-all text-left group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-neutral-100 rounded-lg group-hover:bg-cyan-100/50 text-neutral-700 group-hover:text-cyan-600 transition-colors">
                          <Landmark className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Bank App Checkout</p>
                          <p className="text-xs text-neutral-400">Simulate direct login verification</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all" />
                    </button>

                    <button
                      onClick={() => setStep("transfer")}
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-neutral-200 hover:border-cyan-500 hover:bg-cyan-50/20 transition-all text-left group"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-neutral-100 rounded-lg group-hover:bg-cyan-100/50 text-neutral-700 group-hover:text-cyan-600 transition-colors">
                          <Landmark className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm">Pay with Bank Transfer</p>
                          <p className="text-xs text-neutral-400">Generate virtual Naira account</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </div>
                )}

                {step === "card" && (
                  <form onSubmit={handleCardSubmit} className="space-y-4 text-left">
                    <p className="text-xs font-bold text-neutral-400 cursor-pointer hover:underline mb-2 inline-block" onClick={() => setStep("method")}>
                      &larr; Choose another method
                    </p>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Card Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value.replace(/\s+/g, "").replace(/(\d{4})/g, "$1 ").trim().slice(0, 19))}
                          placeholder="5061 0000 0000 0000"
                          className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none text-base font-mono"
                          id="paystack-card-number"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">Verve / Visa</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Expiry Date</label>
                        <input
                          type="text"
                          required
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value.replace(/[^0-9]/g, "").replace(/^(\d{2})/, "$1/").slice(0, 5))}
                          placeholder="MM/YY"
                          className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none text-base font-mono"
                          id="paystack-card-expiry"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">CVV</label>
                        <input
                          type="password"
                          required
                          maxLength={3}
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="123"
                          className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none text-base font-mono"
                          id="paystack-card-cvv"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3.5 rounded-xl mt-4 transition-all shadow-md active:scale-98"
                      id="paystack-submit"
                    >
                      Process Payment
                    </button>
                  </form>
                )}

                {step === "bank" && (
                  <form onSubmit={handleBankSubmit} className="space-y-4 text-left">
                    <p className="text-xs font-bold text-neutral-400 cursor-pointer hover:underline mb-2 inline-block" onClick={() => setStep("method")}>
                      &larr; Choose another method
                    </p>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Select Bank</label>
                      <select
                        required
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none bg-white text-base"
                        id="paystack-bank-select"
                      >
                        <option value="">-- Choose your bank --</option>
                        {banks.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3.5 rounded-xl mt-4 transition-all shadow-md active:scale-98"
                    >
                      Authenticate with Bank App
                    </button>
                  </form>
                )}

                {step === "transfer" && (
                  <div className="space-y-4 text-left">
                    <p className="text-xs font-bold text-neutral-400 cursor-pointer hover:underline mb-1 inline-block" onClick={() => setStep("method")}>
                      &larr; Choose another method
                    </p>
                    <div className="p-4 bg-cyan-50/40 border border-cyan-100 rounded-2xl flex flex-col space-y-3">
                      <p className="text-sm font-semibold text-neutral-600">Simulated Wema/Providus Virtual Account</p>
                      
                      <div className="border-t border-neutral-100 pt-3">
                        <p className="text-xs text-neutral-400 font-bold tracking-wider">BANK NAME</p>
                        <p className="text-sm font-extrabold text-neutral-800">Providus Bank (NaijaStores Escrow)</p>
                      </div>

                      <div>
                        <p className="text-xs text-neutral-400 font-bold tracking-wider">ACCOUNT NUMBER</p>
                        <p className="text-lg font-mono font-extrabold text-cyan-700 bg-cyan-50 px-3 py-1.5 rounded-lg inline-block select-all tracking-widest mt-1">
                          1029485763
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-neutral-400 font-bold tracking-wider">AMOUNT TO PAY</p>
                        <p className="text-base font-extrabold text-neutral-800">{formattedAmount}</p>
                      </div>
                    </div>

                    <div className="text-center text-xs text-neutral-400 italic">
                      Transfer exactly {formattedAmount} to this generated account.
                    </div>

                    <button
                      onClick={handleTransferComplete}
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3.5 rounded-xl mt-2 transition-all shadow-md active:scale-98"
                    >
                      I have made this bank transfer
                    </button>
                  </div>
                )}

                {step === "otp" && (
                  <form onSubmit={handleOtpSubmit} className="space-y-4 text-left">
                    <div className="text-center space-y-2 mb-4">
                      <ShieldCheck className="w-10 h-10 text-cyan-500 mx-auto" />
                      <p className="text-sm font-bold text-neutral-800">Two-Factor OTP Security Challenge</p>
                      <p className="text-xs text-neutral-400">We sent a verification code to {email.slice(0, 3)}****@{email.split("@")[1] || "mail.com"}</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1 text-center block">Enter 6-Digit OTP</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="123456"
                        className="w-full text-center px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none text-2xl font-mono tracking-widest font-extrabold"
                        id="paystack-otp"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3.5 rounded-xl mt-4 transition-all shadow-md active:scale-98"
                      id="paystack-otp-submit"
                    >
                      Authenticate Credentials
                    </button>
                  </form>
                )}

                {step === "success" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-6 text-center space-y-6"
                  >
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto stroke-[2.5px]" />
                    <div>
                      <h4 className="text-xl font-extrabold text-neutral-900 tracking-tight">Payment Verified</h4>
                      <p className="text-sm text-neutral-500 font-semibold mt-1">Naira Transaction Hash resolved through Paystack API.</p>
                      <p className="text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full inline-block mt-3 uppercase tracking-wide">
                        Secure Code: 200 OK
                      </p>
                    </div>

                    <div className="bg-neutral-50 rounded-xl p-4 text-left space-y-2 border border-neutral-100">
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-400 font-bold">TRANSACTION REFERENCE:</span>
                        <span className="font-mono font-bold text-neutral-700">PSTK-NJS-{Math.floor(Math.random() * 900000 + 100000)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-400 font-bold">SETTLEMENT VALUE:</span>
                        <span className="font-bold text-neutral-700">{formattedAmount}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleFinalSuccess}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-98"
                      id="paystack-confirm-success"
                    >
                      Return to NaijaStores
                    </button>
                  </motion.div>
                )}
              </>
            )}
          </div>

          {/* Secure lock footer */}
          {step !== "success" && (
            <div className="bg-neutral-50 px-6 py-4 flex items-center justify-center space-x-2 border-t border-neutral-100">
              <Lock className="w-4 h-4 text-neutral-400" />
              <p className="text-xs text-neutral-400 font-bold uppercase tracking-widest">
                AES-256 Bit Secure Gateway Encrypted
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
