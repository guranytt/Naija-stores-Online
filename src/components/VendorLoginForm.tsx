import React, { useState } from "react";
import { Mail, Lock, RefreshCw, LogIn } from "lucide-react";
import { useSignIn } from "@clerk/clerk-react";

export default function VendorLoginForm({ onRegisterClick }: { onRegisterClick: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isLoaded, signIn, setActive } = useSignIn();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        
        // Wait a moment for session to fully establish, then redirect
        setTimeout(() => {
          window.location.href = "/admin";
        }, 500);
      } else {
        console.log("SignIn result:", result);
        throw new Error("Login incomplete or requires additional steps.");
      }

    } catch (err: any) {
      console.error("Login Error:", err);
      const errMsg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || err?.message || "Invalid login credentials.";
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="space-y-5 animate-fade-in text-center mb-6">
        <h3 className="text-2xl font-black text-neutral-900 mb-2">Vendor Log In</h3>
        <p className="text-sm font-medium text-neutral-500">Sign in to manage your store</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-semibold border border-red-100 flex items-center">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1 text-left block">Email Address</label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full pl-11 pr-4 py-3 text-sm font-semibold border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
              placeholder="merchant@example.com" 
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1 text-left block">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full pl-11 pr-4 py-3 text-sm font-semibold border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none" 
              placeholder="••••••••" 
            />
          </div>
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            disabled={isLoading || !isLoaded} 
            className="w-full py-3.5 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all flex items-center justify-center disabled:opacity-70"
          >
            {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Log In
              </>
            )}
          </button>
          
          <p className="text-center text-xs text-neutral-500 mt-5">
            Don't have a vendor account? <button type="button" onClick={onRegisterClick} className="font-bold text-orange-600 hover:underline">Sign up</button>
          </p>
        </div>
      </form>
    </div>
  );
}
