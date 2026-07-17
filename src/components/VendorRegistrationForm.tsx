import React, { useState } from "react";
import { uploadToCloudinary, convertFileToBase64, compressImage } from "../cloudinaryService";
import { supabase, getAuthToken } from "../supabase";
import { 
  Building2, Phone, MapPin, User, Mail, Lock, CheckCircle, 
  ChevronRight, ChevronLeft, UploadCloud, RefreshCw, AlertCircle
} from "lucide-react";

export default function VendorRegistrationForm({ onLoginClick }: { onLoginClick: () => void }) {
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [cacNumber, setCacNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  
  // Logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // OTP
  const [code, setCode] = useState("");

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCreateAccount = async () => {
    setError(null);
    
    // Validate all required fields before proceeding
    if (!email || !password || !ownerName || !businessName || !businessAddress || !phone) {
      setError("Please fill in all required fields (marked with *).");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: "vendor",
            full_name: ownerName,
            shop_name: businessName
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      console.log("Signup created. User:", data.user?.id);
      
      // If email confirmation is required, session will be null
      if (data.user && !data.session) {
        setStep(2); // Move to OTP step
      } else if (data.session) {
        // Logged in directly (email confirmation disabled)
        await completeRegistration(data.user!.id);
      }
    } catch (err: any) {
      console.error("Signup error:", err);
      const errMsg = err?.message || "Failed to start signup";
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup'
      });

      if (verifyError || !data.user) {
        throw verifyError || new Error("Unable to complete verification. Please check the code.");
      }

      await completeRegistration(data.user.id);
    } catch (err: any) {
      console.error("OTP Verification Error:", err);
      const errMsg = err?.message || "Invalid verification code";
      setError(errMsg);
      setIsLoading(false);
    }
  };

  const completeRegistration = async (userId: string) => {
    try {
      // Upload Logo to Cloudinary
      let uploadedLogoUrl = "";
      if (logoFile) {
        try {
          const compressed = await compressImage(logoFile);
          const base64 = await convertFileToBase64(compressed);
          const res = await uploadToCloudinary(base64);
          if (res.success && res.url) {
            uploadedLogoUrl = res.url;
          }
        } catch (uploadErr) {
          console.warn("Logo upload failed, continuing without logo", uploadErr);
        }
      }

      // Post everything to the backend immediately
      const vendorPayload = {
        user_id: userId,
        email,
        owner_name: ownerName,
        business_name: businessName,
        business_description: businessDescription,
        logo_url: uploadedLogoUrl,
        phone,
        whatsapp_number: whatsappNumber,
        business_address: businessAddress,
        cac_number: cacNumber,
        bank_account_name: bankAccountName,
        bank_account_number: bankAccountNumber,
        bank_code: bankCode,
        verification_status: "verified" // Immediately verify new vendors
      };

      const token = await getAuthToken();

      const res = await fetch("/api/vendor/upsert", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify(vendorPayload)
      });

      if (!res.ok) {
        // Even if this fails, they are signed up in Clerk. They can retry in dashboard.
        console.error("Backend sync failed");
      }

      // Wait a moment for session to fully establish, then reload to /admin
      setTimeout(() => {
        window.location.href = "/admin";
      }, 500);

    } catch (err: any) {
      console.error("Registration Completion Error:", err);
      setError(err?.message || "An error occurred during registration");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      {step === 1 && (
        <div className="space-y-5 animate-fade-in">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-black text-neutral-900 mb-2">Create Vendor Account</h3>
            <p className="text-sm font-medium text-neutral-500">Fill in your details below to set up your store</p>
          </div>
          
          <div className="space-y-6">
            {/* Account Details */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-4">
              <h4 className="text-[10px] font-black text-neutral-900 uppercase tracking-widest flex items-center"><User className="w-3.5 h-3.5 mr-1.5 text-neutral-400" /> Admin Credentials</h4>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3 text-sm font-semibold border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="merchant@example.com" />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3 text-sm border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Secure password" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Owner Full Name *</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input type="text" required value={ownerName} onChange={e => setOwnerName(e.target.value)} className="w-full pl-11 pr-4 py-3 text-sm font-semibold border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. John Doe" />
              </div>
            </div>
            </div>
            
            {/* Business Information */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-4">
              <h4 className="text-[10px] font-black text-neutral-900 uppercase tracking-widest flex items-center"><Building2 className="w-3.5 h-3.5 mr-1.5 text-neutral-400" /> Business Information</h4>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Business / Shop Name *</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input type="text" required value={businessName} onChange={e => setBusinessName(e.target.value)} className="w-full pl-11 pr-4 py-3 text-sm font-semibold border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. Alaba Digital Depot" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Business Description</label>
              <textarea value={businessDescription} onChange={e => setBusinessDescription(e.target.value)} className="w-full px-4 py-3 text-xs font-medium border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none min-h-[80px]" placeholder="Briefly describe what you sell..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Phone *</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input type="text" required value={phone} onChange={e => setPhone(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="+234 800..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">WhatsApp</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input type="text" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="+234 800..." />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Physical Business Address *</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-4 top-3 text-neutral-400" />
                <textarea required value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} className="w-full pl-11 pr-4 py-3 text-xs font-medium border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none min-h-[60px]" placeholder="Full street address..." />
              </div>
            </div>
            </div>

            {/* Verification & Banking */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-4">
              <h4 className="text-[10px] font-black text-neutral-900 uppercase tracking-widest flex items-center"><Lock className="w-3.5 h-3.5 mr-1.5 text-neutral-400" /> Verification & Banking</h4>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">CAC Registration Number</label>
              <input type="text" value={cacNumber} onChange={e => setCacNumber(e.target.value)} className="w-full px-4 py-3 text-sm font-semibold border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none uppercase font-mono" placeholder="RC-123456" />
            </div>

            <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 space-y-4">
              <h4 className="text-[10px] font-black text-neutral-900 uppercase tracking-widest flex items-center"><Building2 className="w-3.5 h-3.5 mr-1.5 text-neutral-400" /> Bank Details (For Payouts)</h4>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Bank Name</label>
                <input type="text" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} className="w-full px-3 py-2.5 text-xs font-semibold border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. Guarantee Trust Bank" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Account Number</label>
                  <input type="text" value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} className="w-full px-3 py-2.5 text-xs font-semibold border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-mono" placeholder="10 Digits" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Bank Code</label>
                  <input type="text" value={bankCode} onChange={e => setBankCode(e.target.value)} className="w-full px-3 py-2.5 text-xs font-semibold border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-mono" placeholder="e.g. 058" />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Store Logo (Optional)</label>
              <div className="relative">
                <input type="file" accept="image/*" onChange={handleLogoSelect} className="hidden" id="logo-upload" />
                <label htmlFor="logo-upload" className="w-full py-4 border-2 border-dashed border-neutral-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Preview" className="h-12 w-auto object-contain rounded-md" />
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 text-neutral-400 mb-2" />
                      <span className="text-xs font-bold text-neutral-600">Click to upload logo</span>
                    </>
                  )}
                </label>
              </div>
            </div>

          </div>
          </div>

          <div className="pt-6">
            <button onClick={handleCreateAccount} disabled={isLoading} className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center disabled:opacity-70">
              {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Create Vendor Account"}
            </button>
            <p className="text-center text-xs text-neutral-500 mt-4">
              Already have a vendor account? <button type="button" onClick={onLoginClick} className="font-bold text-orange-600 hover:underline">Log in</button>
            </p>
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={handleVerifyOtp} className="space-y-6 animate-fade-in text-center py-6">
          <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xl font-black text-neutral-900 mb-2">Verify Your Email</h3>
            <p className="text-xs font-medium text-neutral-500 max-w-sm mx-auto">
              We've sent a secure 6-digit verification code to <strong className="text-neutral-800">{email}</strong>. Enter it below to activate your store.
            </p>
          </div>

          <div className="max-w-xs mx-auto">
            <input 
              type="text" 
              required
              value={code} 
              onChange={e => setCode(e.target.value)} 
              className="w-full text-center tracking-[0.5em] text-2xl font-black py-4 border-2 border-neutral-200 rounded-2xl focus:border-orange-500 outline-none font-mono" 
              placeholder="••••••" 
              maxLength={6}
            />
          </div>

          <button type="submit" disabled={isLoading} className="w-full max-w-xs mx-auto py-3.5 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/30 hover:bg-orange-600 transition-all flex items-center justify-center disabled:opacity-70">
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Verify & Setup Profile"}
          </button>
        </form>
      )}

    </div>
  );
}
