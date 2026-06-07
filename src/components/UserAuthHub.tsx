import React, { useState, useEffect } from "react";
import { UserCircle, Mail, Lock, ShieldCheck, MapPin, User, Edit3, Key, LogOut, ArrowLeft, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "../supabase";

interface UserAuthHubProps {
  currentEmail: string;
  onNavigateHome: () => void;
  onUpdateEmail: (email: string) => void;
}

export default function UserAuthHub({ currentEmail, onNavigateHome, onUpdateEmail }: UserAuthHubProps) {
  // Session states
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<{
    fullName: string;
    role: string;
    location: string;
    shopName: string;
    phone: string;
  }>({
    fullName: "",
    role: "customer",
    location: "Lagos Mainland, Lagos",
    shopName: "",
    phone: ""
  });

  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  
  // Auth Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("customer");
  const [location, setLocation] = useState("Lagos Mainland, Lagos");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");

  // Edit Security/Credentials state
  const [newPassword, setNewPassword] = useState("");
  
  // Status feedback state
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Load current user profile from session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
      if (activeSession?.user) {
        syncProfile(activeSession.user);
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
          phone: ""
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const syncProfile = (user: any) => {
    const meta = user.user_metadata || {};
    const emailPrefix = user.email ? user.email.split("@")[0].toUpperCase() : "SHOEPPER";
    
    setProfile({
      fullName: meta.fullName || emailPrefix,
      role: meta.role || "customer",
      location: meta.location || "Lagos Mainland, Lagos",
      shopName: meta.shopName || "",
      phone: meta.phone || ""
    });
    onUpdateEmail(user.email || "");
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Failed to initiate Google authentication" });
      setIsLoading(false);
    }
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
        
        onUpdateEmail(data.user?.email || "");
        setFeedback({ type: "success", msg: "Reconciliation successful! Session synchronized." });
      } else if (authMode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              fullName,
              role,
              location,
              shopName: role === "vendor" ? shopName : "",
              phone
            }
          }
        });
        if (error) throw error;

        // Optionally, register a public records entry if user is a vendor
        if (role === "vendor" && data.user) {
          try {
            await supabase.from("vendors").insert({
              id: data.user.id,
              name: shopName || `${fullName}'s Store`,
              ownerName: fullName,
              avatar: "https://lh3.googleusercontent.com/v_alaba",
              rating: 5.0,
              salesToday: 0,
              ordersPending: 0,
              stockAlerts: 0,
              email: email,
              phone: phone,
              location: location
            });
          } catch (tabErr) {
            console.warn("Table sync skipped during initial signup: ", tabErr);
          }
        }

        setFeedback({ type: "success", msg: "Account registered! Check email for verification link (or proceed to log in if auto-approved)." });
        setAuthMode("login");
      } else if (authMode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        setFeedback({ type: "success", msg: "Password recovery link dispatched successfully via our verified mail servers." });
      }
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Auth processing error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          fullName: profile.fullName,
          location: profile.location,
          shopName: profile.shopName,
          phone: profile.phone
        }
      });
      if (error) throw error;

      // Update public vendors list too if vendor role
      if (profile.role === "vendor") {
        try {
          await supabase.from("vendors").upsert({
            id: session.user.id,
            name: profile.shopName || `${profile.fullName}'s Store`,
            ownerName: profile.fullName,
            email: session.user.email,
            phone: profile.phone,
            location: profile.location
          });
        } catch (tabErr) {
          console.warn("Vendors tables sync failure: ", tabErr);
        }
      }

      setFeedback({ type: "success", msg: "Profile synchronized with cloud ledger successfully!" });
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Failure to update metadata credentials" });
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
      setFeedback({ type: "success", msg: "Security credentials updated! Your password has been hardened." });
    } catch (err: any) {
      setFeedback({ type: "error", msg: err.message || "Could not update credentials" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setIsLoading(false);
    onUpdateEmail("nigerian.developer@gmail.com");
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
          <div className={`p-4 rounded-2xl mb-6 flex items-start space-x-3 text-xs leading-normal font-medium border ${
            feedback.type === "success" 
              ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
              : "bg-red-50 text-red-850 text-red-700 border-red-100"
          }`}>
            {feedback.type === "success" ? (
              <CheckCircle className="w-5 h-5 shrink-0 text-emerald-500 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-red-550 text-red-500 mt-0.5" />
            )}
            <span>{feedback.msg}</span>
          </div>
        )}

        {/* IF USER LOGGED IN: SHOW HUB */}
        {session ? (
          <div className="space-y-8 animate-fade-in">
            {/* Top Info Shield card */}
            <div className="p-6 bg-slate-50/70 border border-neutral-100 rounded-2xl flex items-center space-x-4">
              <div className="w-14 h-14 bg-neutral-900 rounded-2xl flex items-center justify-center text-white relative">
                <UserCircle className="w-8 h-8 text-orange-400" />
                <span className="absolute -bottom-1.5 -right-1.5 px-2 py-0.5 bg-orange-500 text-[8px] font-extrabold uppercase rounded-md tracking-wider border border-white">
                  {profile.role}
                </span>
              </div>
              <div className="space-y-0.5 text-left leading-tight min-w-0 flex-1">
                <p className="font-extrabold text-neutral-900 text-lg sm:text-xl truncate">{profile.fullName}</p>
                <p className="text-xs font-bold text-neutral-400 font-mono truncate">{session.user.email}</p>
              </div>
            </div>

            {/* Profile Modification Ledger Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center space-x-2">
                <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                <span>Update Account Ledger metadata</span>
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
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Settlement State Region</label>
                <select
                  value={profile.location}
                  onChange={(e) => setProfile(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-2.5 text-xs font-bold border border-neutral-200 bg-white rounded-xl outline-none"
                >
                  <option value="Lagos Mainland, Lagos">Lagos Mainland, Lagos</option>
                  <option value="Lekki Phase 1, Lagos">Lekki Phase 1, Lagos</option>
                  <option value="Maitama, Abuja (FCT)">Maitama, Abuja (FCT)</option>
                  <option value="Wuse II, Abuja (FCT)">Wuse II, Abuja (FCT)</option>
                  <option value="GRA, Port Harcourt (Rivers)">GRA, Port Harcourt (Rivers)</option>
                  <option value="Kano City, Kano">Kano City, Kano</option>
                </select>
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
                className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl font-bold text-xs hover:bg-neutral-800 disabled:opacity-50 transition-all cursor-pointer shadow-sm active:scale-95"
              >
                {isLoading ? "Synchronizing ledger..." : "Update Profile Ledger"}
              </button>
            </form>

            <hr className="border-neutral-100" />

            {/* Hardening password credentials */}
            <form onSubmit={handleUpdateCredentials} className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 flex items-center space-x-2">
                <Key className="w-3.5 h-3.5 text-orange-400" />
                <span>Harden account credentials</span>
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">New Secure Password</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters long"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs border border-neutral-200 bg-white rounded-xl outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || newPassword.length < 6}
                className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-xs hover:bg-orange-600 disabled:opacity-50 transition-all cursor-pointer shadow-sm active:scale-95"
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
                <span>Terminate Session (Sign Out)</span>
              </button>
            </div>
          </div>
        ) : (
          /* IF GUEST: SHOW REGISTRATION / LOGIN FORMS */
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-orange-100/70 border border-orange-200 text-orange-600 rounded-2xl flex items-center justify-center font-black text-2xl mx-auto shadow-md">₦</div>
              <h2 className="text-2xl font-black text-neutral-905 text-neutral-900 tracking-tight">
                {authMode === "login" && "Shopper Authentication"}
                {authMode === "register" && "Create Shopper Account"}
                {authMode === "forgot" && "Recover Security Credentials"}
              </h2>
              <p className="text-xs text-neutral-400">
                {authMode === "login" && "Specify email and password to securely authorize your Paystack merchant checkout"}
                {authMode === "register" && "Join millions of shoppers and vendors across Lagos and all of Nigeria."}
                {authMode === "forgot" && "Input registering email. A recovery security hash will be compiled."}
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

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">System Role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-3 py-3 text-xs border border-neutral-200 rounded-xl outline-none bg-white font-bold"
                      >
                        <option value="customer">Shopper / Customer</option>
                        <option value="vendor">Merchant / Vendor</option>
                        <option value="admin">Platform Admin</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">State / FCT</label>
                      <select
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-3 py-3 text-xs border border-neutral-200 rounded-xl outline-none bg-white font-semibold"
                      >
                        <option>Lagos Mainland, Lagos</option>
                        <option>Lekki Phase 1, Lagos</option>
                        <option>Maitama, Abuja (FCT)</option>
                        <option>Wuse II, Abuja (FCT)</option>
                        <option>GRA, Port Harcourt (Rivers)</option>
                        <option>Kano City, Kano</option>
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
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest pl-1">Secure Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 text-xs border border-neutral-200 rounded-xl outline-none bg-neutral-50/50 focus:bg-white text-black"
                    />
                    <Lock className="w-4 h-4 text-neutral-400 absolute right-4 top-1/2 -translate-y-1/2" />
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 font-extrabold text-xs tracking-wider uppercase text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-1"
              >
                {isLoading && <RefreshCw className="w-4 h-4 animate-spin mr-1.5" />}
                <span>
                  {authMode === "login" && "Authorize Secure Session"}
                  {authMode === "register" && "Complete Sign Up Ledger"}
                  {authMode === "forgot" && "Dispatch Recovery Mail"}
                </span>
              </button>
            </form>

            {authMode !== "forgot" && (
              <>
                <div className="relative my-4 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-neutral-100"></div>
                  </div>
                  <span className="relative bg-white px-3 text-[10px] font-black uppercase tracking-widest text-neutral-400">or</span>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full py-3.5 border border-neutral-200 hover:bg-neutral-50/50 bg-white font-extrabold text-xs tracking-wider uppercase text-neutral-800 rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <span className="font-sans font-black text-sm tracking-normal capitalize flex items-center space-x-0.5">
                    <span className="text-blue-500">G</span>
                    <span className="text-red-500">o</span>
                    <span className="text-yellow-500">o</span>
                    <span className="text-blue-500">g</span>
                    <span className="text-green-500">l</span>
                    <span className="text-red-500">e</span>
                  </span>
                  <span>Continue with Google</span>
                </button>
              </>
            )}

            <div className="text-center border-t border-neutral-100 pt-5 flex flex-col gap-2.5">
              {authMode === "login" && (
                <p className="text-xs text-neutral-500 font-medium">
                  New to NaijaStores online plazas?
                  <button
                    onClick={() => {
                      setFeedback(null);
                      setAuthMode("register");
                    }}
                    className="ml-1.5 font-bold text-neutral-900 hover:underline text-orange-600 transition-colors cursor-pointer"
                  >
                    Register an Account
                  </button>
                </p>
              )}

              {authMode === "register" && (
                <p className="text-xs text-neutral-500 font-medium">
                  Already have a shopper account?
                  <button
                    onClick={() => {
                      setFeedback(null);
                      setAuthMode("login");
                    }}
                    className="ml-1.5 font-bold text-neutral-900 hover:underline text-orange-600 transition-colors cursor-pointer"
                  >
                    Log In Here
                  </button>
                </p>
              )}

              {authMode === "forgot" && (
                <p className="text-xs text-neutral-500 font-medium">
                  Remembered credentials?
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
