/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "motion/react";
import { X, Lock, CreditCard, Landmark, ArrowRight, CheckCircle2, ShieldCheck, AlertCircle } from "lucide-react";
import { CartItem } from "../types";
import GracefulErrorScreen from "./GracefulErrorScreen";

function AnimatedCurrency({ value }: { value: number }) {
  const count = useMotionValue(value);
  const rounded = useTransform(count, (latest) =>
    new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(latest)
  );

  useEffect(() => {
    const controls = animate(count, value, { duration: 0.5, ease: "easeOut" });
    return () => controls.stop();
  }, [value, count]);

  return <motion.span>{rounded}</motion.span>;
}

interface PaystackOptions {
  key: string;
  email: string;
  amount: number;
  currency?: string;
  ref?: string;
  metadata?: any;
  callback: (response: { reference: string; status: string }) => void;
  onClose: () => void;
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (options: PaystackOptions) => {
        openIframe: () => void;
      };
    };
  }
}

interface PaystackCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (method: string, order?: any, checkoutEmail?: string) => void;
  amount: number; // In Naira (₦)
  email: string;
  cart: CartItem[];
  userId?: string;
  deliveryAddress?: string;
  deliveryZones?: any[];
}

export default function PaystackCheckout({ isOpen, onClose, onSuccess, amount, email, cart, userId, deliveryAddress: initialDeliveryAddress, deliveryZones = [] }: PaystackCheckoutProps) {
  const [step, setStep] = useState<"address" | "method" | "card" | "bank" | "transfer" | "otp" | "success">("address");
  const [deliveryAddress, setDeliveryAddress] = useState(initialDeliveryAddress || "");
  const [checkoutEmail, setCheckoutEmail] = useState(email || "");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [country, setCountry] = useState("Nigeria");
  const [stateLoc, setStateLoc] = useState("");
  const [city, setCity] = useState("");
  const [lga, setLga] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  const calculatedDeliveryFee = React.useMemo(() => {
    if (!deliveryZones || deliveryZones.length === 0) return 0;
    if (!stateLoc) return 0;
    const exactMatch = deliveryZones.find(z => z.state.toLowerCase() === stateLoc.toLowerCase() && z.city.toLowerCase() === city.toLowerCase());
    if (exactMatch) return exactMatch.fee;
    const stateMatch = deliveryZones.find(z => z.state.toLowerCase() === stateLoc.toLowerCase() && z.city === "*");
    if (stateMatch) return stateMatch.fee;
    return 1500;
  }, [stateLoc, city, deliveryZones]);

  const totalAmount = amount + calculatedDeliveryFee;

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");

  useEffect(() => {
    try {
      const savedPhone = localStorage.getItem("naija_customer_phone");
      if (savedPhone) setCheckoutPhone(savedPhone);
      const savedEmail = localStorage.getItem("naija_customer_email");
      if (savedEmail) setCheckoutEmail(savedEmail);
      else if (email) setCheckoutEmail(email);
    } catch(e) {}
  }, [email]);
  const [cvv, setCvv] = useState("");
  const [otp, setOtp] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [loading, setLoading] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState("Verifying connection...");
  const [paystackLoaded, setPaystackLoaded] = useState(false);
  const [paystackEnv, setPaystackEnv] = useState("live");
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const [paystackConfig, setPaystackConfig] = useState<any>(null);

  // Fetch configuration on load to show correct environment badge early and avoid async popup blocking
  useEffect(() => {
    // Check client-side environment variables first
    const clientSideKey = import.meta.env.VITE_PAYSTACK_LIVE_PUBLIC_KEY || import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (clientSideKey) {
      setPaystackEnv("live");
      setPaystackConfig({ success: true, publicKey: clientSideKey, env: "live" });
      return;
    }

    fetch("/api/paystack/config")
      .then(async res => {
        if (!res.ok) return {};
        const text = await res.text();
        return text ? JSON.parse(text) : {};
      })
      .then(data => {
        if (data.success && data.publicKey) {
          setPaystackEnv(data.env || "live");
          setPaystackConfig(data);
        }
      })
      .catch(err => console.warn("[PAYSTACK] Failed to fetch server config early:", err));
  }, []);

  // Load Paystack Inline SDK dynamically
  useEffect(() => {
    if ((window as any).PaystackPop) {
      setPaystackLoaded(true);
      return;
    }

    const existingScript = document.getElementById("paystack-inline-js");
    if (existingScript) {
      setPaystackLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.id = "paystack-inline-js";
    script.async = true;
    script.onload = () => {
      setPaystackLoaded(true);
      console.log("[PAYSTACK] SDK script loaded successfully");
    };
    script.onerror = () => {
      console.warn("[PAYSTACK] Failed to load SDK script");
      // Fallback
      if ((window as any).PaystackPop) {
        setPaystackLoaded(true);
      } else {
        setSdkError("Failed to load Paystack payment gateway. Please disable your adblocker or check your internet connection.");
      }
    };
    document.body.appendChild(script);
  }, []);

  const handleRealPaystackPayment = (isBankTransferOnly = false) => {
    if (!paystackLoaded || !window.PaystackPop) {
      alert("Paystack secure gateway script is initializing. Please try again in a few seconds.");
      return;
    }

    setLoading(true);
    setLoaderMessage("Establishing secure connection with Paystack...");

    try {
      const configData = paystackConfig;

      if (!configData || !configData.success || !configData.publicKey) {
        throw new Error(configData?.error || "Could not retrieve secure paystack config. Please refresh the page.");
      }

      console.log(`[PAYSTACK SECURE LAUNCH] Gateway initialized with environment: '${configData.env}'`);
      setPaystackEnv(configData.env);
      setLoading(false);

      const referenceCode = "NJS-PSTK-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
      const paymentAmountKobo = Math.round(totalAmount * 100);

      const handleSuccess = (response: any) => {
        const transactionRef = response.reference || response.trxref;
        console.log("[PAYSTACK INLINE SUCCESS] Reference Received:", transactionRef);
        setLoading(true);
        setLoaderMessage("Verifying secure transaction statement...");

        fetch(`/api/paystack/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: transactionRef,
            amount: totalAmount,
            email: checkoutEmail,
            userId: userId,
            cart: cart,
            deliveryAddress: deliveryAddress,
            phoneNumber: checkoutPhone,
            buyerName,
            country,
            state: stateLoc,
            city,
            lga,
            postalCode,
            deliveryNotes,
            deliveryFee: calculatedDeliveryFee
          })
        })
          .then(async res => {
            const text = await res.text();
            if (!text) return { success: false, error: "Empty response from server" };
            try {
              return JSON.parse(text);
            } catch (e) {
              return { success: false, error: "Invalid response format from server" };
            }
          })
          .then(verifyData => {
            if (verifyData.success) {
              if (verifyData.order) {
                setCreatedOrder(verifyData.order);
              }
              setStep("success");
            } else {
              setSdkError(`Transaction Integrity Violation: ${verifyData.error || "Verification failed"}`);
            }
          })
          .catch(verifyErr => {
            console.warn("[PAYSTACK VERIFY ERR] Network/parse error during verification:", verifyErr);
            // Do NOT silently advance to success — the order may not have been created.
            // Show an actionable error so the user can retry or contact support.
            setSdkError(`Payment verification could not be reached: ${verifyErr?.message || "Network error"}. If you were charged, please contact support with your transaction reference.`);
          })
          .finally(() => {
            setLoading(false);
          });
      };

      const handleClose = () => {
        console.log("[PAYSTACK SECURE WINDOW CLOSED]");
      };

      const simplifiedCart = cart.map(item => ({ id: item.product?.id, q: item.quantity, size: item.selectedSize, color: item.selectedColor }));

      // Check whether modern constructor is available (Paystack Inline SDK V2)
      let initializedWithNewSdk = false;
      try {
        if (typeof window.PaystackPop !== "undefined" && typeof (window.PaystackPop as any) === "function") {
          const paystackPopInstance = new (window.PaystackPop as any)();
          if (paystackPopInstance && typeof paystackPopInstance.newTransaction === "function") {
            const txConfig: any = {
              key: configData.publicKey,
              email: checkoutEmail || email || "customer@example.com",
              amount: paymentAmountKobo,
              currency: "NGN",
              reference: referenceCode,
              ref: referenceCode,
              metadata: {
                customer_id: String(userId || ""),
                cart_items: simplifiedCart,
                shipping_address: {
                  address: String(deliveryAddress || ""),
                  city: city,
                  state: stateLoc,
                  country: country,
                  postalCode: postalCode
                },
                custom_fields: [
                  { display_name: "User ID", variable_name: "userId", value: String(userId || "") },
                  { display_name: "Phone Number", variable_name: "phoneNumber", value: String(checkoutPhone || "") }
                ]
              },
              onSuccess: handleSuccess,
              onCancel: handleClose
            };
            if (isBankTransferOnly === true) {
              txConfig.channels = ['bank_transfer'];
            }
            paystackPopInstance.newTransaction(txConfig);
            initializedWithNewSdk = true;
            setLoading(false);
          }
        }
      } catch (sdkErr) {
        console.warn("[PAYSTACK NEW SDK CHECK] Failed or not supported, falling back to setup API:", sdkErr);
      }

      if (!initializedWithNewSdk) {
        console.log("[PAYSTACK DEBUG] Initializing V1 setup with config:", {
          key: configData.publicKey,
          email: checkoutEmail || email || "customer@example.com",
          amount: paymentAmountKobo,
          currency: "NGN",
          ref: referenceCode
        });
        // Fallback to legacy window.PaystackPop.setup API (Paystack Inline SDK V1)
        const v1Config: any = {
          key: configData.publicKey,
          email: checkoutEmail || email || "customer@example.com",
          amount: paymentAmountKobo,
          currency: "NGN",
          reference: referenceCode,
          ref: referenceCode,
          metadata: {
            customer_id: String(userId || ""),
            cart_items: simplifiedCart,
            shipping_address: {
              address: String(deliveryAddress || ""),
              city: city,
              state: stateLoc,
              country: country,
              postalCode: postalCode
            },
            custom_fields: [
              { display_name: "User ID", variable_name: "userId", value: String(userId || "") },
              { display_name: "Phone Number", variable_name: "phoneNumber", value: String(checkoutPhone || "") }
            ]
          },
          callback: handleSuccess,
          onClose: handleClose
        };
        if (isBankTransferOnly === true) {
          v1Config.channels = ['bank_transfer'];
        }
        const handler = window.PaystackPop.setup(v1Config);
        handler.openIframe();
        setLoading(false);
      }
    } catch (err: any) {
      console.warn("[PAYSTACK ERROR]", err);
      setLoading(false);
      setSdkError(`Payment initialization failed: ${err.message || "Please contact administrator"}`);
    }
  };


  // Rotate secure pipeline loading checkpoints
  useEffect(() => {
    if (loading) {
      const messages = [
        "Verifying connection...",
        "Connecting to bank...",
        "Processing payment...",
        "Securing transaction...",
        "Finalizing payment..."
      ];
      let msgIndex = 0;
      setLoaderMessage(messages[0]);
      const interval = setInterval(() => {
        msgIndex = (msgIndex + 1) % messages.length;
        setLoaderMessage(messages[msgIndex]);
      }, 700);
      return () => clearInterval(interval);
    }
  }, [loading]);

  const formattedAmount = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2
  }).format(totalAmount);

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
      setStep("address");
      setDeliveryAddress(initialDeliveryAddress || "");
      setCardNumber("");
      setExpiry("");
      setCvv("");
      setOtp("");
      setSelectedBank("");
      setLoading(false);
    }
  }, [isOpen]);

  const processSimulatedVerification = async (prefix: string) => {
    setLoading(true);
    setLoaderMessage("Reconciling secure transaction statements...");
    const reference = `${prefix}-${Date.now()}`;
    try {
      const verifyRes = await fetch(`/api/paystack/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference,
          amount: totalAmount,
          email: checkoutEmail,
          userId,
          cart,
          deliveryAddress,
          phoneNumber: checkoutPhone,
          buyerName,
          country,
          state: stateLoc,
          city,
          lga,
          postalCode,
          deliveryNotes,
          deliveryFee: calculatedDeliveryFee
        })
      });
      let verifyData: any = {};
      try {
        const text = await verifyRes.text();
        if (text) {
          verifyData = JSON.parse(text);
        }
      } catch (e) {
        throw new Error("Invalid response format from server");
      }
      
      if (verifyData.success) {
        if (verifyData.order) {
          setCreatedOrder(verifyData.order);
        }
        setStep("success");
      } else {
        setSdkError(`Secure Verification Failed: ${verifyData.error || "Please check inputs."}`);
      }
    } catch (err: any) {
      console.warn("[SIMULATOR VERIFY ERR]", err);
      // Do NOT silently advance to success — order may not have been created server-side.
      setSdkError(`Payment verification failed: ${err?.message || "Network error"}. If you were charged, please contact support.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardNumber || !expiry || !cvv) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
    }, 1000);
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) return;
    processSimulatedVerification("NJS-SIM-CARD");
  };

  const handleBankSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBank) return;
    processSimulatedVerification("NJS-SIM-BANK");
  };

  const handleTransferComplete = () => {
    processSimulatedVerification("NJS-SIM-TRANSFER");
  };

  const handleFinalSuccess = () => {
    onSuccess(step === "success" ? "Paystack Standard" : "Direct Paystack", createdOrder, checkoutEmail);
    onClose();
  };  // Stepper state points representation
  let activeStepperIndex = 1;
  if (step === "method") activeStepperIndex = 1;
  else if (step === "card" || step === "bank" || step === "transfer") activeStepperIndex = 2;
  else if (step === "otp") activeStepperIndex = 2.5;
  else if (step === "success") activeStepperIndex = 3;

  if (!isOpen) return null;

  if (sdkError) {
    return (
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs" onClick={onClose} />
        <div className="relative z-10 w-full max-w-md">
          <GracefulErrorScreen reset={() => { setSdkError(null); onClose(); }} />
        </div>
      </div>
    );
  }

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
          className="relative w-full max-w-md max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-premium overflow-hidden text-neutral-800 z-10 font-sans"
        >
          {/* Paystack Top Ribbon */}
          <div className="shrink-0 bg-cyan-500 text-white px-4 py-3 flex justify-between items-center bg-radial from-cyan-600 to-cyan-500">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <p className="text-xs font-bold tracking-widest uppercase">Paystack Secure Portal</p>
            </div>
            {step !== "success" && (
              <button
                onClick={onClose}
                className="hover:bg-white/15 p-1 rounded-full transition-colors text-white"
                id="close-paystack"
                aria-label="Close Paystack"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="p-6 overflow-y-auto flex-1 min-h-0">
            {/* Amount / Header */}
            {step !== "success" && (
              <div className="text-center mb-6">
                <p className="text-xs text-neutral-400 font-semibold tracking-wide uppercase">Pay NaijaStores Online</p>
                <h3 className="text-2xl font-extrabold text-neutral-900 tracking-tight mt-1"><AnimatedCurrency value={totalAmount} /></h3>
                <p className="text-xs text-neutral-500 mt-0.5">{email}</p>
              </div>
            )}

            {/* PROGRESS INDICATOR STEPPER */}
            {step !== "success" && (
              <div className="relative flex items-center justify-between w-full max-w-xs mx-auto mb-6 px-1 select-none">
                {/* Connector Line behind */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-neutral-100 w-full" />
                
                {/* Progressive Animated active line */}
                <motion.div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-cyan-500"
                  initial={{ width: "0%" }}
                  animate={{
                    width:
                      activeStepperIndex === 1
                        ? "0%"
                        : activeStepperIndex === 2
                        ? "50%"
                        : activeStepperIndex === 2.5
                        ? "75%"
                        : "100%"
                  }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                />

                {/* Step 1 Circle */}
                <div className="relative z-10 flex flex-col items-center">
                  <motion.div
                    animate={{
                      backgroundColor: activeStepperIndex >= 1 ? "#06b6d4" : "#e5e5e5",
                      scale: activeStepperIndex === 1 ? 1.15 : 1
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 20 }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                  >
                    1
                  </motion.div>
                  <span className="text-[9px] font-extrabold uppercase mt-1 text-neutral-400 tracking-wider">Gateway</span>
                </div>

                {/* Step 2 Circle */}
                <div className="relative z-10 flex flex-col items-center">
                  <motion.div
                    animate={{
                      backgroundColor: activeStepperIndex >= 2 ? "#06b6d4" : "#e5e5e5",
                      scale: activeStepperIndex >= 2 && activeStepperIndex < 3 ? 1.15 : 1
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 20 }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                  >
                    2
                  </motion.div>
                  <span className="text-[9px] font-extrabold uppercase mt-1 text-neutral-400 tracking-wider">Details</span>
                </div>

                {/* Step 3 Circle */}
                <div className="relative z-10 flex flex-col items-center">
                  <motion.div
                    animate={{
                      backgroundColor: activeStepperIndex >= 3 ? "#10b981" : "#e5e5e5",
                      scale: activeStepperIndex === 3 ? 1.15 : 1
                    }}
                    transition={{ type: "spring", stiffness: 350, damping: 20 }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-xs"
                  >
                    3
                  </motion.div>
                  <span className="text-[9px] font-extrabold uppercase mt-1 text-neutral-400 tracking-wider">Verified</span>
                </div>
              </div>
            )}

            {/* STEP-BY-STEP VIEW TRANSITIONS */}
            <AnimatePresence mode="wait">
              {loading ? (
                <motion.div
                  key="checkout-loading-state"
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col items-center justify-center py-12 space-y-6"
                >
                  {/* Concentric visual rings indicator loaders */}
                  <div className="relative flex items-center justify-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
                      className="w-14 h-14 border-4 border-cyan-500 border-t-transparent rounded-full"
                    />
                    <motion.div
                      animate={{ rotate: -360 }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
                      className="absolute w-8 h-8 border-2 border-dashed border-cyan-200 rounded-full"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.25, 1], opacity: [0.15, 0.4, 0.15] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute w-20 h-20 bg-cyan-500/10 rounded-full"
                    />
                  </div>

                  <div className="space-y-1.5 text-center">
                    <motion.p
                      key={loaderMessage}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-sm font-extrabold text-neutral-700 tracking-tight h-5 min-w-[240px]"
                    >
                      {loaderMessage}
                    </motion.p>
                    <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Do not refresh your dashboard</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                >
                  {step === "address" && (
                    <div className="space-y-4">
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 text-left">Contact & Delivery Information</p>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-neutral-700">Email Address</label>
                          <input
                            type="email"
                            value={checkoutEmail}
                            onChange={(e) => setCheckoutEmail(e.target.value)}
                            placeholder="your.email@example.com"
                            className="w-full p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm bg-neutral-50/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-neutral-700">Buyer Name</label>
                          <input
                            type="text"
                            value={buyerName}
                            onChange={(e) => setBuyerName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm bg-neutral-50/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-neutral-700">Phone Number</label>
                          <input
                            type="tel"
                            value={checkoutPhone}
                            onChange={(e) => setCheckoutPhone(e.target.value)}
                            placeholder="+234..."
                            className="w-full p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm bg-neutral-50/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-neutral-700">Delivery Address</label>
                          <textarea
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            placeholder="Enter your full delivery address..."
                            className="w-full p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 min-h-[60px] resize-none text-sm bg-neutral-50/50"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-neutral-700">Country</label>
                            <input type="text" value={country} onChange={e => setCountry(e.target.value)} className="w-full p-3 border border-neutral-200 rounded-xl text-sm" placeholder="Country" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-neutral-700">State</label>
                            <input type="text" value={stateLoc} onChange={e => setStateLoc(e.target.value)} className="w-full p-3 border border-neutral-200 rounded-xl text-sm" placeholder="State" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-neutral-700">City</label>
                            <input type="text" value={city} onChange={e => setCity(e.target.value)} className="w-full p-3 border border-neutral-200 rounded-xl text-sm" placeholder="City" />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-neutral-700">Postal Code</label>
                            <input type="text" value={postalCode} onChange={e => setPostalCode(e.target.value)} className="w-full p-3 border border-neutral-200 rounded-xl text-sm" placeholder="Zip/Postal Code" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-neutral-700">LGA / Region</label>
                          <input type="text" value={lga} onChange={e => setLga(e.target.value)} className="w-full p-3 border border-neutral-200 rounded-xl text-sm" placeholder="Local Government Area" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-neutral-700">Delivery Notes</label>
                          <input type="text" value={deliveryNotes} onChange={e => setDeliveryNotes(e.target.value)} className="w-full p-3 border border-neutral-200 rounded-xl text-sm" placeholder="Any special instructions..." />
                        </div>
                      </div>

                      <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl">
                        <div className="flex justify-between text-xs text-neutral-500 mb-1">
                          <span>Subtotal</span>
                          <AnimatedCurrency value={amount} />
                        </div>
                        <div className="flex justify-between text-xs text-neutral-500 mb-2 border-b border-neutral-200 pb-2">
                          <span>Delivery Fee (Dynamic)</span>
                          <AnimatedCurrency value={calculatedDeliveryFee} />
                        </div>
                        <div className="flex justify-between font-bold text-neutral-900">
                          <span>Total Payable</span>
                          <AnimatedCurrency value={totalAmount} />
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          if (!checkoutEmail.trim() || !checkoutEmail.includes("@")) {
                            alert("Please enter a valid email address");
                            return;
                          }
                          if (!checkoutPhone.trim() || checkoutPhone.length < 8) {
                            alert("Please enter a valid phone number");
                            return;
                          }
                          if (!deliveryAddress.trim()) {
                            alert("Please enter a delivery address");
                            return;
                          }
                          
                          try {
                            localStorage.setItem("naija_customer_phone", checkoutPhone);
                            localStorage.setItem("naija_customer_email", checkoutEmail);
                          } catch(e) {}
                          
                          setStep("method");
                        }}
                        className="w-full p-4 rounded-xl bg-neutral-900 text-white font-bold tracking-wide mt-4 shadow-xl shadow-neutral-900/20"
                      >
                        Continue to Payment
                      </motion.button>
                    </div>
                  )}

                  {step === "method" && (
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2 text-left">Choose Payment Method</p>

                      {/* Real Live Sandbox Gateway Gateway Option */}
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.025, borderColor: "#0284c7" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleRealPaystackPayment(false)}
                        className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-cyan-500 bg-cyan-50/20 hover:bg-cyan-50/40 transition-all text-left bg-white cursor-pointer group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-cyan-100 rounded-lg text-cyan-600 transition-colors">
                            <ShieldCheck className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-extrabold text-sm text-cyan-900 flex items-center gap-1.5">
                              <span>Official Paystack Checkout</span>
                              <span className="text-[9px] font-bold bg-amber-400 text-neutral-950 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                {paystackEnv === "live" ? "Live" : "Sandbox"}
                              </span>
                            </p>
                            <p className="text-xs text-neutral-500 font-medium">Pay securely via Cards, Bank Transfer, USSD, or Bank App</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-cyan-600 group-hover:translate-x-0.5 transition-all" />
                      </motion.button>

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02, borderColor: "#06b6d4" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleRealPaystackPayment(true)}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-neutral-200 hover:border-cyan-500 hover:bg-cyan-50/20 transition-all text-left bg-white cursor-pointer group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-neutral-100 rounded-lg group-hover:bg-cyan-100/50 text-neutral-700 group-hover:text-cyan-600 transition-colors">
                            <Landmark className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">Direct Bank Transfer</p>
                            <p className="text-xs text-neutral-400">Complete transfer manually and upload success code</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-cyan-500 group-hover:translate-x-0.5 transition-all" />
                      </motion.button>
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
                          <motion.input
                            whileFocus={{ scale: 1.01, borderColor: "#06b6d4", boxShadow: "0 0 0 3px rgba(6, 182, 212, 0.15)" }}
                            transition={{ duration: 0.2 }}
                            type="text"
                            required
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value.replace(/\s+/g, "").replace(/(\d{4})/g, "$1 ").trim().slice(0, 19))}
                            placeholder="5061 0000 0000 0000"
                            className="w-full px-4 py-3 border border-neutral-200 bg-white rounded-xl outline-none text-base font-mono transition-shadow"
                            id="paystack-card-number"
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">Verve / Visa</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Expiry Date</label>
                          <motion.input
                            whileFocus={{ scale: 1.01, borderColor: "#06b6d4", boxShadow: "0 0 0 3px rgba(6, 182, 212, 0.15)" }}
                            transition={{ duration: 0.2 }}
                            type="text"
                            required
                            value={expiry}
                            onChange={(e) => setExpiry(e.target.value.replace(/[^0-9]/g, "").replace(/^(\d{2})/, "$1/").slice(0, 5))}
                            placeholder="MM/YY"
                            className="w-full px-4 py-3 border border-neutral-200 bg-white rounded-xl outline-none text-base font-mono transition-shadow"
                            id="paystack-card-expiry"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">CVV</label>
                          <motion.input
                            whileFocus={{ scale: 1.01, borderColor: "#06b6d4", boxShadow: "0 0 0 3px rgba(6, 182, 212, 0.15)" }}
                            transition={{ duration: 0.2 }}
                            type="password"
                            required
                            maxLength={3}
                            value={cvv}
                            onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ""))}
                            placeholder="123"
                            className="w-full px-4 py-3 border border-neutral-200 bg-white rounded-xl outline-none text-base font-mono transition-shadow"
                            id="paystack-card-cvv"
                          />
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.025 }}
                        whileTap={{ scale: 0.97 }}
                        type="submit"
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3.5 rounded-xl mt-4 transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2"
                        id="paystack-submit"
                      >
                        <span>Process Payment</span>
                      </motion.button>
                    </form>
                  )}

                  {step === "bank" && (
                    <form onSubmit={handleBankSubmit} className="space-y-4 text-left">
                      <p className="text-xs font-bold text-neutral-400 cursor-pointer hover:underline mb-2 inline-block" onClick={() => setStep("method")}>
                        &larr; Choose another method
                      </p>
                      
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Select Bank</label>
                        <motion.select
                          whileFocus={{ scale: 1.01, borderColor: "#06b6d4", boxShadow: "0 0 0 3px rgba(6, 182, 212, 0.15)" }}
                          transition={{ duration: 0.2 }}
                          required
                          value={selectedBank}
                          onChange={(e) => setSelectedBank(e.target.value)}
                          className="w-full px-4 py-3 border border-neutral-200 rounded-xl outline-none bg-white text-base font-semibold"
                          id="paystack-bank-select"
                        >
                          <option value="">-- Choose your bank --</option>
                          {banks.map((b) => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </motion.select>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.025 }}
                        whileTap={{ scale: 0.97 }}
                        type="submit"
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3.5 rounded-xl mt-4 transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <span>Authenticate with Bank App</span>
                      </motion.button>
                    </form>
                  )}

                  {step === "transfer" && (
                    <div className="space-y-4 text-left">
                      <p className="text-xs font-bold text-neutral-400 cursor-pointer hover:underline mb-1 inline-block" onClick={() => setStep("method")}>
                        &larr; Choose another method
                      </p>
                      <div className="p-4 bg-cyan-50/40 border border-cyan-100 rounded-2xl flex flex-col space-y-3">
                        <p className="text-sm font-semibold text-neutral-600">Wema/Providus Store Settlement Account</p>
                        
                        <div className="border-t border-neutral-100 pt-3">
                          <p className="text-xs text-neutral-400 font-bold tracking-wider">BANK NAME</p>
                          <p className="text-sm font-extrabold text-neutral-800">Providus Bank (Naija Online Stores)</p>
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

                      <motion.button
                        whileHover={{ scale: 1.025 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleTransferComplete}
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3.5 rounded-xl mt-2 transition-all shadow-md cursor-pointer flex items-center justify-center"
                      >
                        <span>I have made this bank transfer</span>
                      </motion.button>
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
                        <motion.input
                          whileFocus={{ scale: 1.01, borderColor: "#06b6d4", boxShadow: "0 0 0 3px rgba(6, 182, 212, 0.15)" }}
                          transition={{ duration: 0.2 }}
                          type="text"
                          required
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ""))}
                          placeholder="123456"
                          className="w-full text-center px-4 py-3 border border-neutral-200 rounded-xl outline-none text-2xl font-mono tracking-widest font-extrabold bg-white"
                          id="paystack-otp"
                        />
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.025 }}
                        whileTap={{ scale: 0.97 }}
                        type="submit"
                        className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3.5 rounded-xl mt-4 transition-all shadow-md cursor-pointer flex items-center justify-center space-x-2"
                        id="paystack-otp-submit"
                      >
                        <span>Authenticate Credentials</span>
                      </motion.button>
                    </form>
                  )}

                  {step === "success" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="py-6 text-center space-y-6"
                    >
                      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto stroke-[2.5px] animate-bounce" />
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

                      <motion.button
                        whileHover={{ scale: 1.025 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleFinalSuccess}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center"
                        id="paystack-confirm-success"
                      >
                        <span>Return to NaijaStores</span>
                      </motion.button>
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
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
