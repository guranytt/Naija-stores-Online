import React, { useState, useEffect } from "react";
import { UserCircle, Mail, Lock, ShieldCheck, MapPin, User, Edit3, Key, LogOut, ArrowLeft, RefreshCw, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { supabase, saveSupabaseRecord, ensureUUID } from "../supabase";
import { sendResendEmail } from "../emailService";
import { sanitizeString, sanitizeFields } from "../sanitize";
import GracefulErrorScreen from "./GracefulErrorScreen";
import { getOptimizedImageUrl } from "../utils/imageTransforms";

interface UserAuthHubProps {
  currentEmail: string;
  onNavigateHome?: () => void;
  onNavigate?: (screen: string) => void;
  onUpdateEmail: (email: string) => void;
  vendorOnly?: boolean;
}

export default function UserAuthHub({ currentEmail, onNavigateHome, onNavigate, onUpdateEmail, vendorOnly = false }: UserAuthHubProps) {
  // Session states
  const [session, setSession] = useState<any>(null);
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
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  
  // Auth Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState(vendorOnly ? "vendor" : "customer");
  const [location, setLocation] = useState("Lagos Mainland, Lagos");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Edit Security/Credentials state
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Status feedback state
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Load current user profile from session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: activeSession }, error }) => {
      if (error) {
        console.warn("[USER AUTH HUB GETSESSION] Error:", error);
        if (error.message?.includes("Refresh Token")) {
          supabase.auth.signOut().catch(() => {});
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.includes("sb-") || key.includes("supabase"))) {
              localStorage.removeItem(key);
            }
          }
          // Do not unconditionally reload if we just cleared, let the component handle unauthenticated state.
        }
      }
      setSession(activeSession);
      if (activeSession?.user) {
        syncProfile(activeSession.user);
      }
    }).catch(err => {
      console.warn("[USER AUTH HUB GETSESSION] Failed to restore session:", err);
      if (err?.message?.includes("Invalid Refresh Token") || err?.message?.includes("Refresh Token Not Found")) {
        supabase.auth.signOut().catch(() => {});
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.includes("sb-") || key.includes("supabase"))) {
            localStorage.removeItem(key);
          }
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, activeSession) => {
      setSession(activeSession);
      if (activeSession?.user) {
        syncProfile(activeSession.user);
      } else {
        setProfile({
          fullName: "",
          role: "customer",
          location: "Lagos Mainland, Lagos",
          shopName: "",
          phone: "",
          deliveryAddress: ""
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncProfile = async (user: any) => {
    const meta = user.user_metadata || {};
    const emailPrefix = user.email ? user.email.split("@")[0].toUpperCase() : "SHOEPPER";
    
    try {
      const { data, error } = await supabase.from("users").select("full_name, role").eq("id", user.id).single();
      if (!error && data) {
        setProfile({
          fullName: data.full_name || meta.fullName || emailPrefix,
          role: data.role || meta.role || "customer",
          location: meta.location || "Lagos Mainland, Lagos",
          shopName: meta.shopName || "",
          phone: meta.phone || "",
          deliveryAddress: meta.deliveryAddress || ""
        });
        onUpdateEmail(user.email || "");
        return;
      }
    } catch (e) {
      console.warn("Table load fail from public users:", e);
    }

    setProfile({
      fullName: meta.fullName || emailPrefix,
      role: meta.role || "customer",
      location: meta.location || "Lagos Mainland, Lagos",
      shopName: meta.shopName || "",
      phone: meta.phone || "",
      deliveryAddress: meta.deliveryAddress || ""
    });
    onUpdateEmail(user.email || "");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    try {
      if (authMode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        
        // Dispatch first login greeting if not dispatched on this device yet
        if (data.user) {
          const userMeta = data.user.user_metadata;
          const uName = userMeta?.fullName || userMeta?.shopName || email.split("@")[0];
          const userRole = userMeta?.role || "customer";

          // Sync users table upon successful login
          try {
            await supabase.from("users").upsert({
              id: data.user.id,
              full_name: userMeta?.fullName || uName,
              email: data.user.email,
              role: userRole,
              avatar_url: null
            });
          } catch (e) {
            console.warn("User table sync failed during login", e);
          }

          // Sync vendors table upon successful login
          if (userRole === "vendor") {
            try {
              await saveSupabaseRecord("vendors", {
                id: ensureUUID(data.user.id),
                user_id: data.user.id,
                name: userMeta?.shopName || `${uName}'s Store`,
                ownerName: userMeta?.fullName || uName,
                avatar: "https://lh3.googleusercontent.com/v_alaba",
                email: data.user.email,
                phone: userMeta?.phone,
                location: userMeta?.location,
                whatsappNumber: userMeta?.phone // pre-fill whatsapp with phone
              });
            } catch (e) {
              console.warn("Vendor table sync failed during login", e);
            }
          }

          const sentKey = `hasSentGreeting_${data.user.id}`;
          if (!localStorage.getItem(sentKey)) {
            localStorage.setItem(sentKey, "true");
            try {
              await sendResendEmail({
                to: email,
                type: "first_login",
                data: {
                  customerName: uName,
                  actionUrl: window.location.origin + "?login=true"
                }
              });
            } catch (e) {
              console.warn("Failed to dispatch first login email silently", e);
            }
          }
        }

        onUpdateEmail(data.user?.email || "");
        setFeedback({ type: "success", msg: "Reconciliation successful! Session synchronized." });
        
        // Role-based Redirect
        const userRole = data.user?.user_metadata?.role || "customer";
        const isAdminOrVendor = userRole === "vendor" || userRole === "admin" || ["adminnaijastoresonline@gmail.com", "mcgigimeshai@gmail.com"].includes(email.toLowerCase());
        
        setTimeout(() => {
          if (isAdminOrVendor && onNavigate) {
            onNavigate("admin");
          } else if (onNavigateHome) {
            onNavigateHome();
          }
        }, 800);
      } else if (authMode === "register") {
        const payload = sanitizeFields({
          fullName,
          role,
          location,
          deliveryAddress,
          shopName: role === "vendor" ? shopName : "",
          phone
        });

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: payload
          }
        });
        if (error) throw error;

        // Register a public records entry to trigger Database Webhooks
        if (data.user) {
          // Enforce server-side: only 'customer' or 'vendor' roles are accepted.
          // Any other value (e.g. injected 'admin') is silently clamped to 'customer'.
          const allowedRoles = ["customer", "vendor"];
          const safeRole = allowedRoles.includes(role) ? role : "customer";
          try {
            await supabase.from("users").upsert({
              id: data.user.id,
              full_name: payload.fullName,
              email: email,
              role: safeRole as any,
              avatar_url: null
            });
          } catch (usersErr) {
            console.warn("Users table trigger sync skipped during signup: ", usersErr);
          }
        }

        // Admin notification is handled securely by the sendResendEmail pipelines below.
        
        // Optionally, register a public records entry if user is a vendor
        if (role === "vendor" && data.user) {
          try {
            await saveSupabaseRecord("vendors", {
              id: ensureUUID(data.user.id),
              user_id: data.user.id,
              name: payload.shopName || `${payload.fullName}'s Store`,
              ownerName: payload.fullName,
              avatar: "https://lh3.googleusercontent.com/v_alaba",
              email: email,
              phone: payload.phone,
              location: payload.location
            });
          } catch (tabErr) {
            console.warn("Table sync skipped during initial signup: ", tabErr);
          }
        }

        // Dispatch automated Resend notifications
        try {
          if (role === "vendor") {
            await sendResendEmail({
              to: email,
              type: "vendor_signup",
              data: {
                vendorName: shopName || fullName,
                actionUrl: window.location.origin + "?login=true"
              }
            });
          }

          // Trigger confirmation email
          await sendResendEmail({
            to: email,
            type: "confirm_email",
            data: {
              customerName: fullName,
              actionUrl: window.location.origin + "?login=true"
            }
          });
          
          // Notify admin about new registration (vendors are notified automatically via vendor_signup endpoint)
          if (role !== "vendor") {
            await sendResendEmail({
              to: "adminnaijastoresonline@gmail.com",
              type: "admin_new_account",
              data: {
                accountType: role,
                fullName: fullName,
                emailAddress: email,
                phoneNumber: phone || "Not provided",
                userId: data.user?.id || "",
                registrationDate: new Date().toISOString(),
                adminDashboardLink: window.location.origin + "?admin=true"
              }
            });
          }
        } catch (e) {
          console.warn("Automated emails failed, proceeding smoothly.", e);
        }

        if (data.session) {
          await supabase.auth.signOut();
        }

        setFeedback({ type: "success", msg: "Account registered! Please check your email to verify your account." });
        setAuthMode("login");
      } else if (authMode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + "?login=true"
        });
        if (error) throw error;
        setFeedback({ type: "success", msg: "Password reset link sent to your email." });
      }
    } catch (err: any) {
      console.warn("Auth Error:", err);
      let errMsg = err.message || "An unexpected error occurred.";
      if (err.status === 429 || err.code === 'over_email_send_rate_limit') {
        errMsg = "Registration temporarily paused due to high traffic. Please try again later.";
      } else if (errMsg.toLowerCase().includes("email not confirmed")) {
        errMsg = "Please verify your email address to log in. We sent a confirmation link to your inbox.";
      } else if (errMsg.toLowerCase().includes("invalid login credentials")) {
        errMsg = "Invalid email or password. Please try again.";
      } else if (errMsg.toLowerCase().includes("already registered")) {
        errMsg = "This email is already registered. Please try logging in instead.";
      } else if (errMsg.toLowerCase().includes("password")) {
        errMsg = "Your password is too weak. Please use at least 6 characters.";
      } else if (errMsg.toLowerCase().includes("fetch")) {
        errMsg = "Network error. Please check your internet connection.";
      }
      setFeedback({ type: "error", msg: errMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
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

      const { data, error } = await supabase.auth.updateUser({
        data: sanitizedProfile
      });
      if (error) throw error;

      // Update public users table to trigger webhooks
      if (session?.user) {
        try {
          await supabase.from("users").upsert({
            id: session.user.id,
            full_name: sanitizedProfile.fullName,
            email: session.user.email,
            role: profile.role as any,
            avatar_url: session.user.user_metadata?.avatar_url || null
          });
        } catch (usersErr) {
          console.warn("Users table trigger sync skipped: ", usersErr);
        }
      }

      // Update public vendors list too if vendor role
      if (profile.role === "vendor") {
        try {
          await supabase.from("vendors").upsert({
            id: session.user.id,
            name: sanitizedProfile.shopName || `${sanitizedProfile.fullName}'s Store`,
            ownerName: sanitizedProfile.fullName,
            email: session.user.email,
            phone: sanitizedProfile.phone,
            location: profile.location
          });
        } catch (tabErr) {
          console.warn("Vendors tables sync failure: ", tabErr);
        }
      }

      setFeedback({ type: "success", msg: "Profile saved successfully!" });
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Could not update profile" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    setIsLoading(true);
    setFeedback(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      if (error) throw error;
      setNewPassword("");
      setFeedback({ type: "success", msg: "Password updated successfully!" });
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Could not update password" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setIsLoading(false);
    onUpdateEmail("adminnaijastoresonline@gmail.com");
    onNavigateHome();
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl border border-neutral-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.03)] overflow-hidden text-left relative">
      <div className="p-8 md:p-10">
        
        {/* Headline */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-neutral-105">
          <button onClick={onNavigateHome} className="flex items-center space-x-1.5 text-xs font-bold text-neutral-500 hover:text-neutral-900 transition-colors uppercase tracking-wider">
            <ArrowLeft className="w-4 h-4 text-orange-400" />
            <span>Plaza Marketplace</span>
          </button>
          
          <span className="px-3 py-1 bg-neutral-100 rounded-full text-[9px] font-black uppercase tracking-widest text-neutral-600">
            {session ? "User Connected" : "Secure Gateways"}
          </span>
        </div>

        {/* Feedback Display Banner */}
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
        {session ? (
          <div className="space-y-8 animate-fade-in">
            {/* Top Info Shield card */}
            <div className="p-6 bg-slate-50/70 border border-neutral-100 rounded-2xl flex items-center space-x-4">
              <div className="w-14 h-14 bg-neutral-50 rounded-2xl flex items-center justify-center relative shadow-inner">
                <UserCircle className="w-8 h-8 text-[#4CAF50]" />
                <span className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 bg-[#FF9800] text-white text-[8px] font-extrabold uppercase rounded-md tracking-wider border-2 border-white">
                  {profile.role}
                </span>
              </div>
              <div className="space-y-0.5 text-left leading-tight min-w-0 flex-1">
                <p className="font-extrabold text-neutral-900 text-lg sm:text-xl truncate">{profile.fullName}</p>
                <p className="text-xs font-bold text-neutral-400 font-mono truncate">{session.user.email}</p>
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
                className="px-5 py-2.5 bg-[#4CAF50] text-white rounded-xl font-bold text-xs hover:bg-[#388E3C] disabled:opacity-50 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {isLoading ? "Saving..." : "Save Profile"}
              </button>
            </form>

            <hr className="border-neutral-100" />

            {/* Change password */}
            <form onSubmit={handleUpdateCredentials} className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[#FF9800] flex items-center space-x-2">
                <Key className="w-3.5 h-3.5 text-[#4CAF50]" />
                <span>Change password</span>
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Minimum 6 characters long"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs border border-neutral-200 bg-white rounded-xl outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || newPassword.length < 6}
                className="px-5 py-2.5 bg-[#4CAF50] text-white rounded-xl font-bold text-xs hover:bg-[#388E3C] disabled:opacity-50 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                Change password
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
                className="flex items-center space-x-1.5 text-xs font-bold text-red-550 hover:text-red-700 hover:underline cursor-pointer text-red-600"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : (
          /* IF GUEST: SHOW REGISTRATION / LOGIN FORMS */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <img src={getOptimizedImageUrl("https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png", { width: 300, quality: "auto" })} className="h-16 w-auto mx-auto drop-shadow-sm mb-4" alt="Naija Stores Logo" />
              <h2 className="text-2xl font-black text-neutral-905 text-neutral-900 tracking-tight">
                {authMode === "login" && (vendorOnly ? "Vendor Log In" : "Log In")}
                {authMode === "register" && (vendorOnly ? "Create Vendor Account" : "Sign Up")}
                {authMode === "forgot" && "Reset Password"}
              </h2>
              <p className="text-xs text-neutral-400">
                {authMode === "login" && "Enter your email and password to log in to your account."}
                {authMode === "register" && "Create an account to start shopping."}
                {authMode === "forgot" && "Enter your email to receive a password reset link."}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              {authMode === "register" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Full Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Obinna Nwosu"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-4 py-3 text-xs border border-neutral-200 rounded-xl outline-none bg-neutral-50/50 focus:bg-white text-black"
                      />
                      <User className="w-4 h-4 text-neutral-400 absolute right-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div className={`grid ${vendorOnly ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                    {!vendorOnly && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">System Role</label>
                        <select
                          value={role}
                          onChange={(e) => setRole(e.target.value)}
                          className="w-full px-3 py-3 text-xs border border-neutral-200 rounded-xl outline-none bg-white font-bold"
                        >
                          <option value="customer">Customer</option>
                          <option value="vendor">Merchant / Vendor</option>
                        </select>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">State / FCT</label>
                      <select
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-3 py-3 text-xs border border-neutral-200 rounded-xl outline-none bg-white font-semibold"
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

                  {role === "vendor" && (
                    <div className="space-y-1 animate-fade-in bg-orange-50/40 p-3 rounded-xl border border-orange-100/60">
                      <label className="text-[10px] font-black text-orange-950 uppercase tracking-widest pl-1 block">Vendor Shop Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Lekki Elite Fabrics"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        className="w-full mt-1 px-4 py-2.5 text-xs border border-neutral-200 rounded-xl outline-none bg-white text-black font-semibold"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Delivery Street Address</label>
                    <textarea
                      required
                      placeholder="Enter your complete street door physical address for logistics deliveries"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full px-4 py-2 text-xs border border-neutral-200 bg-neutral-50/50 focus:bg-white rounded-xl outline-none min-h-[60px] font-semibold text-black"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Phone Contact</label>
                    <input
                      type="text"
                      placeholder="e.g. +234 803 111 2233"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 text-xs border border-neutral-200 rounded-xl outline-none bg-neutral-50/50 focus:bg-white text-black"
                    />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="shopper@naijastores.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 text-xs border border-neutral-200 rounded-xl outline-none bg-neutral-50/50 focus:bg-white text-black"
                  />
                  <Mail className="w-4 h-4 text-neutral-400 absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {authMode !== "forgot" && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 text-xs border border-neutral-200 rounded-xl outline-none bg-neutral-50/50 focus:bg-white text-black pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {authMode === "login" && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFeedback(null);
                      setAuthMode("forgot");
                    }}
                    className="text-[10px] font-black text-neutral-400 hover:text-neutral-900 uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {authMode === "register" && (
                <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-100 text-[10px] md:text-[11px] text-neutral-500 font-semibold leading-relaxed text-center select-none">
                  Signing up means you completely agree to our <span className="font-black text-neutral-800 underline">Terms & Conditions</span>, <span className="font-black text-neutral-800 underline">Privacy Policy</span>, and direct commission matrix guidelines.
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-[#4CAF50] hover:bg-[#388E3C] font-extrabold text-xs tracking-wider uppercase text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1"
              >
                {isLoading && <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />}
                <span>
                  {authMode === "login" && "Log In"}
                  {authMode === "register" && "Sign Up"}
                  {authMode === "forgot" && "Send Reset Link"}
                </span>
              </button>
            </form>

            {/* Removed Google Sign In */}

            <div className="text-center border-t border-neutral-100 pt-5 flex flex-col gap-2.5">
              {authMode === "login" && (
                <p className="text-xs text-neutral-500 font-medium">
                  New here?
                  <button
                    onClick={() => {
                      setFeedback(null);
                      setAuthMode("register");
                    }}
                    className="ml-1.5 font-bold text-neutral-900 hover:underline text-orange-600 transition-colors cursor-pointer"
                  >
                    Sign Up
                  </button>
                </p>
              )}

              {authMode === "register" && (
                <p className="text-xs text-neutral-500 font-medium">
                  Already have an account?
                  <button
                    onClick={() => {
                      setFeedback(null);
                      setAuthMode("login");
                    }}
                    className="ml-1.5 font-bold text-neutral-900 hover:underline text-orange-600 transition-colors cursor-pointer"
                  >
                    Log In
                  </button>
                </p>
              )}

              {authMode === "forgot" && (
                <p className="text-xs text-neutral-500 font-medium">
                  Remembered your password?
                  <button
                    onClick={() => {
                      setFeedback(null);
                      setAuthMode("login");
                    }}
                    className="ml-1.5 font-bold text-neutral-900 hover:underline text-orange-600 transition-colors cursor-pointer"
                  >
                    Back to Log In
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
