import React, { useState } from "react";
import { Store, Mail, Lock, ChevronRight, Package, TrendingUp, ShieldCheck, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "../supabase";

interface VendorAuthProps {
  onLoginSuccess: () => void;
  onNavigateHome: () => void;
}

export default function VendorAuth({ onLoginSuccess, onNavigateHome }: VendorAuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (isSignUp) {
        // Register vendor in Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: "vendor",
              shopName: shopName,
              fullName: shopName,
              location: "Lagos Mainland, Lagos"
            }
          }
        });

        if (error) {
          setErrorMsg(error.message);
          setIsLoading(false);
          return;
        }

        // Try to insert vendor metadata into public.vendors if table exists
        try {
          const newVendorEntry = {
            id: data.user?.id || `v_${Date.now()}`,
            name: shopName,
            ownerName: email.split("@")[0].toUpperCase(),
            avatar: "https://lh3.googleusercontent.com/v_alaba",
            rating: 4.8,
            ratingCount: 1,
            salesToday: 0,
            ordersPending: 0,
            stockAlerts: 0,
            email: email,
            phone: "+234 800 000 0000",
            location: "Lagos Mainland, Lagos"
          };
          
          await supabase.from("vendors").insert(newVendorEntry);
        } catch (vErr) {
          console.warn("Could not insert vendor to tables, table might not be active yet.", vErr);
        }

        setSuccessMsg("Merchant account created successfully! Signing in...");
        setTimeout(() => {
          setIsLoading(false);
          onLoginSuccess();
        }, 1500);

      } else {
        // Sign in via Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          setErrorMsg(error.message);
          setIsLoading(false);
          return;
        }

        const userMeta = data.user?.user_metadata || {};
        const role = userMeta.role || "customer";

        if (role !== "vendor" && role !== "admin") {
          setErrorMsg("Access Deny: This account is registered as Customer. Vendor Portal restricted.");
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }

        setSuccessMsg("Welcome Back! Authorizing merchant cockpit...");
        setTimeout(() => {
          setIsLoading(false);
          onLoginSuccess();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Auth server synchronization failed.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 md:p-10 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-neutral-100 relative overflow-hidden">
        
        {/* Subtle decorative background blur */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-400/10 rounded-full blur-3xl" />

        <div className="relative">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-neutral-900 rounded-2xl overflow-hidden flex items-center justify-center shadow-lg transform -rotate-3 hover:rotate-0 transition-transform cursor-pointer border-2 border-orange-400" onClick={onNavigateHome}>
              <img
                src="https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png"
                alt="NaijaStores Logo"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-neutral-900">
            {isSignUp ? "Open your shop" : "Vendor Portal"}
          </h2>
          <p className="mt-2 text-center text-sm font-medium text-neutral-500">
            {isSignUp ? "Connect with millions of shoppers across Naija." : "Welcome back to your merchant dashboard."}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-2.5 text-xs text-red-750 text-red-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start space-x-2.5 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        <form className="mt-8 space-y-5 relative" onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Shop Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Package className="h-4 w-4 text-neutral-400" />
                </div>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-neutral-200 rounded-xl bg-neutral-50/50 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
                  placeholder="e.g. Lagos Tech Hub"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-neutral-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-neutral-200 rounded-xl bg-neutral-50/50 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
                placeholder="vendor@naijastores.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-neutral-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-neutral-200 rounded-xl bg-neutral-50/50 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {!isSignUp && (
            <div className="flex items-center justify-end">
              <div className="text-xs font-bold text-neutral-500 hover:text-neutral-900 cursor-pointer transition-colors">
                Forgot password?
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-70 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 shadow-md transform hover:-translate-y-0.5"
          >
            {isLoading ? (
              <span className="flex items-center">
                <Sparkles className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                Authenticating...
              </span>
            ) : (
              <span className="flex items-center">
                {isSignUp ? "Create Vendor Account" : "Access Dashboard"}
                <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </button>
        </form>

        {isSignUp && (
          <div className="pt-6 border-t border-neutral-100 flex flex-col gap-3">
             <div className="flex items-center gap-3 text-xs text-neutral-500 font-medium">
               <ShieldCheck className="w-4 h-4 text-orange-500 flex-shrink-0" />
               <span className="leading-tight">Bank-grade security and direct payout facilitation for all transactions.</span>
             </div>
             <div className="flex items-center gap-3 text-xs text-neutral-500 font-medium">
               <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0" />
               <span className="leading-tight">Access analytics, manage inventory, and grow your audience.</span>
             </div>
          </div>
        )}

        <div className="mt-8 text-center border-t border-neutral-100 pt-6">
          <p className="text-sm text-neutral-500 font-medium">
            {isSignUp ? "Already have a vendor account?" : "Ready to sell on NaijaStores?"}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="ml-2 font-bold text-neutral-900 hover:underline hover:text-orange-600 transition-colors"
            >
              {isSignUp ? "Sign In here" : "Open a Shop"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
