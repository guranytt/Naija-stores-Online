import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { supabase } from '../supabase';
import { AlertCircle, LogOut, Store } from 'lucide-react';

interface RequireVendorProps {
  children: React.ReactNode;
  onNavigate?: (screen: string) => void;
}

export default function RequireVendor({ children, onNavigate }: RequireVendorProps) {
  const { isLoaded: authLoaded, userId, signOut } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const [status, setStatus] = useState<'loading' | 'authorized' | 'customer' | 'guest'>('loading');

  useEffect(() => {
    if (!authLoaded || !userLoaded) return;

    // Not logged in at all
    if (!userId) {
      setStatus('guest');
      return;
    }

    // Master admin bypass
    const uEmail = user?.primaryEmailAddress?.emailAddress;
    if (uEmail?.toLowerCase() === 'adminnaijastoresonline@gmail.com') {
      setStatus('authorized');
      return;
    }

    // Check role in Supabase
    const checkRole = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('clerk_id', userId)
          .single();

        if (!error && data && (data.role === 'vendor' || data.role === 'admin')) {
          setStatus('authorized');
        } else {
          // Logged in but not a vendor — show access denied
          setStatus('customer');
        }
      } catch (e) {
        setStatus('customer');
      }
    };

    checkRole();
  }, [authLoaded, userLoaded, userId, user]);

  // --- Guest: redirect to vendor sign-up ---
  useEffect(() => {
    if (status === 'guest') {
      // Set the hash FIRST so UserAuthHub picks it up when it mounts
      window.location.hash = 'register-vendor';
      if (onNavigate) {
        onNavigate('auth');
      } else {
        window.location.replace('/auth#register-vendor');
      }
    }
  }, [status, onNavigate]);

  // Loading spinner
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    );
  }

  // Guest — returning null while redirect happens
  if (status === 'guest') {
    return null;
  }

  // Authenticated customer (wrong role) — show inline access-denied panel
  if (status === 'customer') {
    const handleSignOut = async () => {
      await signOut();
      window.location.hash = 'register-vendor';
      if (onNavigate) onNavigate('auth');
    };

    return (
      <div className="max-w-md mx-auto mt-16 bg-white rounded-3xl shadow-xl border border-neutral-100 p-10 text-center space-y-6 animate-fade-in">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-9 h-9 text-red-500" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
            Vendor Access Only
          </h2>
          <p className="text-sm text-neutral-500 leading-relaxed">
            You're currently signed in as a <span className="font-bold text-orange-500">customer</span>. The Vendor Admin dashboard requires a merchant account.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-left space-y-1">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">To become a vendor:</p>
          <p className="text-xs text-amber-600 leading-relaxed">
            Sign out of your customer account, then return here to create a separate vendor account.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={handleSignOut}
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out &amp; Create Vendor Account
          </button>
          <button
            onClick={() => onNavigate && onNavigate('home')}
            className="w-full py-2.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Store className="w-4 h-4 text-emerald-500" />
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  // Authorized vendor / admin — render children
  return <>{children}</>;
}
