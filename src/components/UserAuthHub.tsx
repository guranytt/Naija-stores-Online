import React, { useState, useEffect } from "react";
import { UserCircle, Edit3, ArrowLeft, RefreshCw, AlertCircle, CheckCircle, LogOut } from "lucide-react";
import { supabase } from "../supabase";
import { sanitizeFields } from "../sanitize";
import { getOptimizedImageUrl } from "../utils/imageTransforms";
import { SignIn, SignUp, useAuth, useUser } from '@clerk/clerk-react';

interface UserAuthHubProps {
  currentEmail: string;
  onNavigateHome?: () => void;
  onNavigate?: (screen: string) => void;
  onUpdateEmail: (email: string) => void;
  vendorOnly?: boolean;
}

export default function UserAuthHub({ currentEmail, onNavigateHome, onNavigate, onUpdateEmail, vendorOnly = false }: UserAuthHubProps) {
  const { isLoaded, userId, signOut } = useAuth();
  const { user } = useUser();

  const [profile, setProfile] = useState<{
    fullName: string;
    role: string;
    location: string;
    shopName: string;
    phone: string;
    deliveryAddress: string;
  }>({
    fullName: "",
    role: "customer",
    location: "Lagos Mainland, Lagos",
    shopName: "",
    phone: "",
    deliveryAddress: ""
  });

  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Sync hash changes to toggle authMode
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === "#register") {
        setAuthMode("register");
      } else if (hash === "#login") {
        setAuthMode("login");
      }
    };
    window.addEventListener("hashchange", handleHash);
    handleHash();
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Load profile from Clerk and Supabase
  useEffect(() => {
    if (isLoaded && userId && user) {
      syncProfile(userId, user);
    }
  }, [isLoaded, userId, user]);

  const syncProfile = async (clerkId: string, clerkUser: any) => {
    const meta = clerkUser.unsafeMetadata || {};
    const email = clerkUser.primaryEmailAddress?.emailAddress || "";
    const emailPrefix = email ? email.split("@")[0].toUpperCase() : "SHOEPPER";
    
    // Default role based on context if not explicitly set
    const defaultRole = vendorOnly ? "vendor" : "customer";
    
    try {
      const { data, error } = await supabase.from("users").select("full_name, role").eq("clerk_id", clerkId).single();
      if (!error && data) {
        let vendorData: any = null;
        if (data.role === "vendor") {
          try {
            const { data: vData } = await supabase.from("vendors").select("business_name, physical_location, phone").eq("email", email).single();
            if (vData) vendorData = vData;
          } catch(e) {}
        }
        setProfile({
          fullName: data.full_name || meta.fullName || emailPrefix,
          role: data.role || meta.role || defaultRole,
          location: vendorData?.physical_location || meta.location || "Lagos Mainland, Lagos",
          shopName: vendorData?.business_name || meta.shopName || "",
          phone: vendorData?.phone || meta.phone || "",
          deliveryAddress: meta.deliveryAddress || ""
        });
        onUpdateEmail(email);
        return;
      }
    } catch (e) {
      console.warn("Table load fail from public users:", e);
    }

    setProfile({
      fullName: meta.fullName || emailPrefix,
      role: meta.role || defaultRole,
      location: meta.location || "Lagos Mainland, Lagos",
      shopName: meta.shopName || "",
      phone: meta.phone || "",
      deliveryAddress: meta.deliveryAddress || ""
    });
    onUpdateEmail(email);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !user) return;
    setIsLoading(true);
    setFeedback(null);

    try {
      const sanitizedProfile = sanitizeFields({
        fullName: profile.fullName,
        location: profile.location,
        shopName: profile.shopName,
        phone: profile.phone,
        deliveryAddress: profile.deliveryAddress
      });

      // Update metadata in Clerk
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          fullName: sanitizedProfile.fullName,
          location: sanitizedProfile.location,
          shopName: sanitizedProfile.shopName,
          phone: sanitizedProfile.phone,
          deliveryAddress: sanitizedProfile.deliveryAddress,
          role: profile.role
        }
      });

      // Sync local users table in Supabase
      const { error: userError } = await supabase.from("users").upsert({
        clerk_id: userId,
        full_name: sanitizedProfile.fullName,
        email: user.primaryEmailAddress?.emailAddress,
        role: profile.role as any,
        updated_at: new Date().toISOString()
      }, { onConflict: 'clerk_id' });

      if (userError) throw userError;

      // Fetch the UUID of the newly updated row in Supabase
      const { data: userData } = await supabase.from("users").select("id").eq("clerk_id", userId).single();
      const dbUserId = userData?.id;

      if (profile.role === "vendor" && dbUserId) {
        const { error: vendorError } = await supabase.from("vendors").upsert({
          id: dbUserId,
          user_id: dbUserId,
          business_name: sanitizedProfile.shopName || `${sanitizedProfile.fullName}'s Store`,
          business_address: sanitizedProfile.deliveryAddress || "Address provided via profile",
          phone: sanitizedProfile.phone,
          physical_location: profile.location,
          email: user.primaryEmailAddress?.emailAddress,
          whatsapp_number: sanitizedProfile.phone,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

        if (vendorError) throw vendorError;
      }

      setFeedback({ type: "success", msg: "Profile saved successfully!" });
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Could not update profile" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut();
    setIsLoading(false);
    onUpdateEmail("adminnaijastoresonline@gmail.com");
    if (onNavigateHome) onNavigateHome();
  };

  if (!isLoaded) {
    return (
      <div className="max-w-xl mx-auto p-12 bg-white rounded-3xl text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-orange-500" />
        <p className="text-xs text-neutral-400 mt-2 font-bold uppercase tracking-wider">Loading Session...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl border border-neutral-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.03)] overflow-hidden text-left relative">
      <div className="p-8 md:p-10">
        
        {/* Headline */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-100">
          <button onClick={onNavigateHome} className="flex items-center space-x-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors uppercase tracking-wider">
            <ArrowLeft className="w-4 h-4 text-orange-400" />
            <span>Plaza Marketplace</span>
          </button>
          
          <span className="px-3 py-1 bg-neutral-100 rounded-full text-[9px] font-black uppercase tracking-widest text-neutral-600">
            {userId ? "User Connected" : "Secure Gateways"}
          </span>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div className={`p-4 rounded-2xl mb-6 flex items-start space-x-3 text-xs leading-normal font-medium border ${feedback.type === "error" ? "bg-red-50 text-red-800 border-red-100" : "bg-emerald-50 text-emerald-800 border-emerald-100"}`}>
            {feedback.type === "error" ? (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
            )}
            <span>{feedback.msg}</span>
          </div>
        )}

        {/* IF USER LOGGED IN: SHOW HUB */}
        {userId && user ? (
          vendorOnly && profile.role === "customer" ? (
             <div className="space-y-6 flex flex-col items-center text-center animate-fade-in py-6">
               <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
               <h3 className="text-xl font-black text-neutral-900">Access Denied</h3>
               <p className="text-sm text-neutral-500">
                 You are logged in as a Customer. One session cannot host both a customer and a vendor account.
               </p>
               <p className="text-xs text-neutral-400 font-medium">
                 To access the Vendor Admin portal, please sign out of your customer account, then log in or sign up with your merchant account.
               </p>
               <div className="pt-4 w-full">
                 <button onClick={handleSignOut} className="w-full py-3 bg-neutral-900 text-white rounded-xl font-bold text-xs hover:bg-neutral-800 shadow-md flex items-center justify-center transition-all cursor-pointer">
                   <LogOut className="w-4 h-4 mr-2" /> Sign Out & Switch Account
                 </button>
               </div>
             </div>
          ) : (
          <div className="space-y-8 animate-fade-in">
            <div className="p-6 bg-slate-50/70 border border-neutral-100 rounded-2xl flex items-center space-x-4">
              <div className="w-14 h-14 bg-neutral-50 rounded-2xl flex items-center justify-center relative shadow-inner">
                <UserCircle className="w-8 h-8 text-[#4CAF50]" />
                <span className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 bg-[#FF9800] text-white text-[8px] font-extrabold uppercase rounded-md tracking-wider border-2 border-white">
                  {profile.role}
                </span>
              </div>
              <div className="space-y-0.5 text-left leading-tight min-w-0 flex-1">
                <p className="font-extrabold text-neutral-900 text-lg sm:text-xl truncate">{profile.fullName}</p>
                <p className="text-xs font-bold text-neutral-400 font-mono truncate">{user.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>

            {/* Profile Modification Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#FF9800] flex items-center space-x-2">
                <Edit3 className="w-3.5 h-3.5 text-[#4CAF50]" />
                <span>Update Account Information</span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Display Name</label>
                  <input
                    type="text"
                    required
                    value={profile.fullName}
                    onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-4 py-2.5 text-xs font-semibold border border-neutral-200 bg-white rounded-xl outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+234 803 000 0000"
                    value={profile.phone}
                    onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 text-xs border border-neutral-200 bg-white rounded-xl outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">State Region</label>
                  <select
                    value={profile.location}
                    onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-2.5 text-xs font-bold border border-neutral-200 bg-white rounded-xl outline-none"
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

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Delivery Street Address</label>
                <textarea
                  placeholder="Enter your complete street door physical address for logistics deliveries"
                  value={profile.deliveryAddress}
                  onChange={(e) => setProfile(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  className="w-full px-4 py-2 text-xs border border-neutral-200 bg-white rounded-xl outline-none min-h-[60px] font-semibold"
                />
              </div>

              {profile.role === "vendor" && (
                <div className="space-y-1 animate-fade-in">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Shop Name / Merchant Title</label>
                  <input
                    type="text"
                    required
                    value={profile.shopName}
                    onChange={(e) => setProfile(prev => ({ ...prev, shopName: e.target.value }))}
                    className="w-full px-4 py-2.5 text-xs border border-neutral-200 bg-white rounded-xl outline-none text-black font-semibold"
                    placeholder="e.g. Alaba Digital Depot"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 bg-[#4CAF50] text-white rounded-xl font-bold text-xs hover:bg-[#388E3C] disabled:opacity-50 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center"
              >
                {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                <span>{isLoading ? "Saving..." : "Save Profile"}</span>
              </button>
            </form>

            <hr className="border-neutral-100" />

            {/* Actions block */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={onNavigateHome}
                className="text-xs font-extrabold text-orange-500 hover:underline cursor-pointer"
              >
                &lsaquo; Return Marketplace
              </button>

              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1.5 text-xs font-bold text-red-650 hover:text-red-700 hover:underline cursor-pointer text-red-600"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
          )
        ) : (
          /* IF GUEST: SHOW REGISTRATION / LOGIN FORMS */
          <div className="space-y-6 flex flex-col items-center">
            <div className="text-center space-y-2 w-full">
              <img src={getOptimizedImageUrl("https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png", { width: 300, quality: "auto" })} className="h-16 w-auto mx-auto drop-shadow-sm mb-4" alt="Naija Stores Logo" />
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                {authMode === "login" ? (vendorOnly ? "Vendor Log In" : "Welcome Back") : (vendorOnly ? "Create Vendor Account" : "Create Account")}
              </h2>
              <p className="text-xs text-neutral-400">
                {authMode === "login" ? "Sign in using Clerk Secure Gateways" : "Register a new secure account"}
              </p>
            </div>

            <div className="w-full flex justify-center py-2">
              {authMode === "login" ? (
                <SignIn 
                  routing="hash"
                  signUpUrl="#register"
                />
              ) : (
                <SignUp 
                  routing="hash"
                  signInUrl="#login"
                />
              )}
            </div>

            <div className="text-center border-t border-neutral-100 pt-5 w-full">
              {authMode === "login" ? (
                <p className="text-xs text-neutral-500 font-medium">
                  New here?
                  <button
                    onClick={() => {
                      setFeedback(null);
                      setAuthMode("register");
                      window.location.hash = "register";
                    }}
                    className="ml-1.5 font-bold hover:underline text-orange-650 text-orange-600 transition-colors cursor-pointer"
                  >
                    Sign Up
                  </button>
                </p>
              ) : (
                <p className="text-xs text-neutral-500 font-medium">
                  Already have an account?
                  <button
                    onClick={() => {
                      setFeedback(null);
                      setAuthMode("login");
                      window.location.hash = "login";
                    }}
                    className="ml-1.5 font-bold hover:underline text-orange-650 text-orange-600 transition-colors cursor-pointer"
                  >
                    Log In
                  </button>
                </p>
              )}
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
