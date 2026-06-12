import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, Cookie, Check, X, ShieldCheck } from "lucide-react";

interface CookiePopupProps {
  onOpenPolicy: (type: "privacy" | "terms") => void;
}

export default function CookiePopup({ onOpenPolicy }: CookiePopupProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("naija_cookie_consent");
    if (!consent) {
      // Small timeout to give entering vibes
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
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
          initial={{ y: 50, scale: 0.9, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 50, scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 20, mass: 0.8 }}
          className="fixed bottom-6 left-6 right-6 md:left-auto md:right-6 md:w-[460px] bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] border-2 border-orange-500/20 dark:border-orange-500/10 z-[100] relative overflow-hidden"
        >
          {/* Small subtle amber highlight border accent */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-orange-500 to-amber-500" />

          <div className="space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-orange-50 dark:bg-orange-950/40 rounded-2xl text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0">
                <Cookie className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                  Cookie & Storage Consent
                </h4>
                <p className="text-[11px] md:text-xs text-neutral-500 dark:text-neutral-400 font-medium leading-relaxed">
                  Naija Online Store utilizes local storage and essential web cookies to orchestrate your secure shopping cart, store session tokens, and authorize real-time checkout through Paystack.
                </p>
              </div>
            </div>

            <div className="text-[10px] text-neutral-400 dark:text-neutral-500 font-bold uppercase tracking-widest flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/60 p-2 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bank-grade security & GDPR/NDPR compliant.</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex-1 py-2.5 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-950 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Check className="w-3.5 h-3.5" /> Accept All
              </button>
              <button
                type="button"
                onClick={handleDecline}
                className="py-2.5 px-4 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer transition-all"
              >
                Reject Non-Essential
              </button>
            </div>

            <div className="text-center pt-1 border-t border-neutral-100 dark:border-neutral-800/80">
              <button
                type="button"
                onClick={() => onOpenPolicy("privacy")}
                className="text-[10px] font-bold text-neutral-400 hover:text-orange-500 uppercase tracking-widest cursor-pointer transition-colors"
              >
                Review Privacy & Cookies Statement
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
