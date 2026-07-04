import React, { useState, useEffect } from "react";
import { Store, Mail, Lock, ChevronRight, Package as PackageIcon, TrendingUp, ShieldCheck, Sparkles, AlertCircle, CheckCircle2, Landmark, User, Phone, MapPin, Landmark as BankIcon, Eye, EyeOff } from "lucide-react";
import { supabase, saveSupabaseRecord, ensureUUID } from "../supabase";
import { sanitizeFields } from "../sanitize";
import GracefulErrorScreen from "./GracefulErrorScreen";
import { sendResendEmail } from "../emailService";

interface VendorAuthProps {
  onLoginSuccess: () => void;
  onNavigateHome: () => void;
}

export default function VendorAuth({ onLoginSuccess, onNavigateHome }: VendorAuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("Lagos Mainland, Lagos");
  const [cacNumber, setCacNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    async function checkExistingCustomerSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const role = session.user.user_metadata?.role;
          const isMaster = session.user.email?.toLowerCase() === "adminnaijastoresonline@gmail.com";
          
          if (role !== "vendor" && role !== "admin" && !isMaster) {
            const { data: vendorData } = await supabase.from("vendors").select("id").eq("user_id", session.user.id).limit(1);
            if (!vendorData || vendorData.length === 0) {
              await supabase.auth.signOut();
              setErrorMsg("Access Denied: Your account is registered as a customer. To sell on Naija Online Stores, you must register a merchant account.");
            }
          }
        }
      } catch (e) {
        // Ignore
      } finally {
        setIsLoading(false);
      }
    }
    checkExistingCustomerSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "?login=true"
        });
        if (error) throw error;
        setSuccessMsg("Password reset link sent to your email.");
        setIsLoading(false);
      } else if (isSignUp) {
        // Register vendor in Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/admin",
            data: {
              full_name: ownerName || shopName,
              role: "vendor"
            }
          }
        });

        if (error) {
          throw error;
        }

        if (data.user) {
          try {
            await fetch("/api/resend/send-custom", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: "adminnaijastoresonline@gmail.com",
                subject: `New Vendor Registration - Naija Online Stores`,
                html: `
                  <h2>New Vendor Registered</h2>
                  <p><strong>Owner Name:</strong> ${ownerName || shopName}</p>
                  <p><strong>Shop/Business Name:</strong> ${shopName}</p>
                  <p><strong>Email:</strong> ${email}</p>
                  <p><strong>Phone:</strong> ${phone}</p>
                  <p><strong>Address:</strong> ${location}</p>
                `
              })
            });
          } catch (e) {
            console.warn("Failed to notify admin of new vendor:", e);
          }

          if (data.user.identities?.length === 0 || !data.session) {
             setVerifyingEmail(true);
             setSuccessMsg("Verification dispatched! Please click the confirmation link sent to: " + email);
          } else {
             await finalizeSignupFlow(data.user.id);
          }
        }
        setIsLoading(false);

      } else {
        // Sign in via Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          const role = data.user.user_metadata?.role;
          const isMaster = email.toLowerCase() === "adminnaijastoresonline@gmail.com";
          
          if (role !== "vendor" && role !== "admin" && !isMaster) {
            // Check fallback vendors table just in case
            const { data: vendorData } = await supabase.from("vendors").select("id").eq("user_id", data.user.id).limit(1);
            if (!vendorData || vendorData.length === 0) {
              await supabase.auth.signOut();
              throw new Error("Access Denied: Your account is registered as a customer. To sell on Naija Online Stores, you must register a merchant account.");
            }
          }
          
          setSuccessMsg("Welcome Back! Authorizing merchant cockpit...");
          setTimeout(() => {
            setIsLoading(false);
            onLoginSuccess();
          }, 1200);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Auth server synchronization failed.");
      setIsLoading(false);
    }
  };

  const finalizeSignupFlow = async (userId: string) => {
     let assignedVendorId = userId;
        
     try {
       const newVendorEntry = sanitizeFields({
         name: shopName,
         ownerName: ownerName || email.split("@")[0].toUpperCase(),
         avatar: "https://ui-avatars.com/api/?name=" + encodeURIComponent(shopName),
         rating: 4.8,
         ratingCount: 1,
         salesToday: 0,
         ordersPending: 0,
         stockAlerts: 0,
         email: email,
         phone: phone || "+234 800 000 0000",
         location: location || "Lagos Mainland, Lagos",
         cacNumber: cacNumber || "",
         bankName: bankName || "",
         accountNumber: accountNumber || "",
         whatsappNumber: phone || "",
         user_id: userId,
         userId: userId
       });
       
       const { data, error } = await supabase.from("vendors").upsert(newVendorEntry).select("id").single();
       if (data && data.id) {
         assignedVendorId = data.id;
       } else if (error) {
         console.warn("Could not insert vendor to tables: ", error);
       }
       
       // Notify admin about new vendor registration
       try {
         await sendResendEmail({
           to: "adminnaijastoresonline@gmail.com",
           type: "admin_new_account",
           data: {
             accountType: "vendor",
             fullName: ownerName || email.split("@")[0].toUpperCase(),
             emailAddress: email,
             phoneNumber: phone || "Not provided",
             businessName: shopName,
             userId: userId,
             registrationDate: new Date().toISOString(),
             adminDashboardLink: window.location.origin + "?admin=true"
           }
         });
       } catch (emailErr) {
         console.warn("Failed to dispatch admin notification email", emailErr);
       }
     } catch (vErr) {
       console.warn("Could not insert vendor to tables, table might not be active yet.", vErr);
     }

     setSuccessMsg("Welcome aboard! Booting your dashboard...");
     setTimeout(() => {
       setIsLoading(false);
       onLoginSuccess();
     }, 1500);
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'signup'
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        await finalizeSignupFlow(data.user.id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid or expired authorization sequence.");
      setIsLoading(false);
    }
  };

  // Remove early return for errorMsg so it can be displayed inline

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
            {isForgotPassword ? "Reset Password" : (isSignUp ? "Open your shop" : "Vendor Portal")}
          </h2>
          <p className="mt-2 text-center text-sm font-medium text-neutral-500">
            {isForgotPassword ? "Enter your email to receive a password reset link." : (isSignUp ? "Connect with millions of shoppers across Naija." : "Welcome back to your merchant dashboard.")}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-2.5 text-xs text-red-800 font-medium">
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

        {verifyingEmail ? (
          <div className="mt-8 space-y-5 text-center">
            <div className="space-y-2 select-none">
              <Mail className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-xl font-black text-neutral-900">Check Your Email</h3>
              <p className="text-sm text-neutral-500">
                We've sent a magic link to <strong className="text-neutral-700">{email}</strong>. Please click the link to confirm your address and activate your account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setVerifyingEmail(false);
                setIsLoading(false);
              }}
              className="block w-full text-center text-xs text-neutral-500 hover:text-neutral-900 font-bold mt-2"
            >
              Change email / Back to registration
            </button>
          </div>
        ) : (
          <form className="mt-8 space-y-5 relative" onSubmit={handleSubmit}>
          {isSignUp ? (
            <div className="max-h-[380px] overflow-y-auto pr-1.5 space-y-4 select-none">
              {/* Shop / Business Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Shop Name / Business Title</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <PackageIcon className="h-4 w-4 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50/50 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all font-semibold"
                    placeholder="e.g. Alaba Electronics Hub"
                  />
                </div>
              </div>

              {/* Owner Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Merchant Owner / Full Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50/50 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all font-semibold"
                    placeholder="e.g. Alhaji Ibrahim Musa"
                  />
                </div>
              </div>

              {/* Contact Phone / WhatsApp */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Phone / WhatsApp Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-neutral-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50/50 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
                    placeholder="+234 803 123 4567"
                  />
                </div>
              </div>

              {/* Physical Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">State / Region</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-4 w-4 text-neutral-400" />
                  </div>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50/50 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all font-medium"
                  >
                    {[
                      "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", 
                      "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", 
                      "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", 
                      "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", 
                      "Taraba", "Yobe", "Zamfara"
                    ].map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* CAC Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">CAC Enterprise Number (RC/BN)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ShieldCheck className="h-4 w-4 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={cacNumber}
                    onChange={(e) => setCacNumber(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50/50 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all font-mono"
                    placeholder="e.g. BN 140925"
                  />
                </div>
              </div>

              {/* Bank Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Payout Bank Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BankIcon className="h-4 w-4 text-neutral-400" />
                  </div>
                  <select
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50/50 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all font-medium"
                  >
                    <option value="">-- Choose Payout Bank --</option>
                    <option value="Access Bank">Access Bank</option>
                    <option value="Guaranty Trust Bank (GTBank)">Guaranty Trust Bank (GTBank)</option>
                    <option value="Zenith Bank">Zenith Bank</option>
                    <option value="United Bank for Africa (UBA)">United Bank for Africa (UBA)</option>
                    <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                    <option value="Sterling Bank">Sterling Bank</option>
                    <option value="Stanbic IBTC">Stanbic IBTC</option>
                    <option value="Wema Bank">Wema Bank</option>
                    <option value="OPay">OPay</option>
                    <option value="Palmpay">Palmpay</option>
                    <option value="Moniepoint">Moniepoint MFB</option>
                    <option value="Kuda MFB">Kuda MFB</option>
                  </select>
                </div>
              </div>

              {/* Bank Account Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">10-Digit Payout Account Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Landmark className="h-4 w-4 text-neutral-400" />
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                    className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50/50 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all font-mono"
                    placeholder="e.g. 0122345678"
                  />
                </div>
              </div>

              {/* Email Address */}
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
                     className="block w-full pl-10 pr-3 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50/50 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
                     placeholder="vendor@naijastores.com"
                   />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Password</label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Lock className="h-4 w-4 text-neutral-400" />
                   </div>
                   <input
                     type={showPassword ? "text" : "password"}
                     required
                     value={password}
                     onChange={(e) => setPassword(e.target.value)}
                     className="block w-full pl-10 pr-10 py-2.5 border border-neutral-200 rounded-xl bg-neutral-50/50 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
                     placeholder="••••••••"
                   />
                   <button
                     type="button"
                     onClick={() => setShowPassword(!showPassword)}
                     className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 focus:outline-none"
                   >
                     {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                   </button>
                </div>
              </div>
            </div>
          ) : (
            <>
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

              {!isForgotPassword && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-4 w-4 text-neutral-400" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-10 py-3 border border-neutral-200 rounded-xl bg-neutral-50/50 text-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {!isSignUp && !isForgotPassword && (
            <div className="flex items-center justify-end">
              <div 
                className="text-xs font-bold text-neutral-500 hover:text-neutral-900 cursor-pointer transition-colors"
                onClick={() => setIsForgotPassword(true)}
              >
                Forgot password?
              </div>
            </div>
          )}

          {isSignUp && (
            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-[10px] md:text-[11px] text-neutral-550 font-medium leading-relaxed text-center select-none">
              Signing up means you completely agree to our <span className="font-black text-neutral-800 underline">Terms & Conditions</span>, <span className="font-black text-neutral-800 underline">Privacy Policy</span>, and administrative escrow terms.
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-70 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 shadow-md transform hover:-translate-y-0.5 cursor-pointer"
          >
            {isLoading ? (
              <span className="flex items-center animate-pulse">
                <Sparkles className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                Processing...
              </span>
            ) : (
              <span className="flex items-center">
                {isForgotPassword ? "Send Reset Link" : (isSignUp ? "Submit Merchant Application" : "Access Dashboard")}
                <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </span>
            )}
          </button>
        </form>
        )}

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
          {isForgotPassword ? (
            <p className="text-sm text-neutral-500 font-medium">
              Remember your password?
              <button
                onClick={() => setIsForgotPassword(false)}
                className="ml-2 font-bold text-neutral-900 hover:underline hover:text-orange-600 transition-colors"
              >
                Back to Login
              </button>
            </p>
          ) : (
            <p className="text-sm text-neutral-500 font-medium">
              {isSignUp ? "Already have a vendor account?" : "Ready to sell on NaijaStores?"}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setIsForgotPassword(false); }}
                className="ml-2 font-bold text-neutral-900 hover:underline hover:text-orange-600 transition-colors"
              >
                {isSignUp ? "Sign In here" : "Open a Shop"}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
