import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cookie, Check, ShieldCheck } from "lucide-react";

interface CookiePopupProps {
  onOpenPolicy: (type: "privacy" | "terms") => void;
}

export default function CookiePopup({ onOpenPolicy }: CookiePopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("naija_cookie_consent");
    if (!consent) {
      // Show immediately
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("naija_cookie_consent", "accepted");
    setIsVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("naija_cookie_consent", "declined");
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md z-[999] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.9, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 15, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 22 }}
            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-[32px] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.25)] border border-neutral-100 dark:border-neutral-800 relative overflow-hidden text-left"
          >
            {/* Top gradient highlight banner */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500" />

            <div className="space-y-6">
              {/* Header Icon & Title */}
              <div className="space-y-4">
                <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/40 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <Cookie className="w-6 h-6 animate-pulse" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                    Storage & Cookie Consent
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold leading-relaxed">
                    Naija Stores uses essential local storage and security tokens to save your shopping cart, authenticate your account, and route paystack transactions.
                  </p>
                </div>
              </div>

              {/* GDPR/Compliance badge */}
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-widest">
                    Bank-Grade Security
                  </p>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-medium">
                    Strictly NDPR & GDPR compliant. No marketing trackers or ads.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-md shadow-orange-500/10 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4" /> Accept All
                </button>
                <button
                  type="button"
                  onClick={handleDecline}
                  className="py-3 px-4 bg-neutral-100 dark:bg-neutral-855 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 text-neutral-700 dark:text-neutral-250 rounded-2xl font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
                >
                  Essential Only
                </button>
              </div>

              {/* Policies Footer Links */}
              <div className="text-center pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => onOpenPolicy("privacy")}
                  className="text-[10px] font-bold text-neutral-400 hover:text-orange-500 uppercase tracking-widest cursor-pointer transition-colors"
                >
                  Privacy Policy
                </button>
                <span className="text-neutral-300 dark:text-neutral-750">•</span>
                <button
                  type="button"
                  onClick={() => onOpenPolicy("terms")}
                  className="text-[10px] font-bold text-neutral-400 hover:text-orange-500 uppercase tracking-widest cursor-pointer transition-colors"
                >
                  Terms of Service
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
