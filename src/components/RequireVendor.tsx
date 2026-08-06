import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { AlertCircle, LogOut, Store } from 'lucide-react';
import { MASTER_ADMIN_EMAILS } from '../utils/adminConfig';
import { useAuth, useUser, useClerk } from '@clerk/clerk-react';

interface RequireVendorProps {
  children: React.ReactNode;
  onNavigate?: (screen: string) => void;
}

export default function RequireVendor({ children, onNavigate }: RequireVendorProps) {
  const { isLoaded, userId } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [status, setStatus] = useState<'loading' | 'authorized' | 'customer' | 'guest'>('loading');

  useEffect(() => {
    if (!isLoaded) return;

    if (!userId || !user) {
      setStatus('guest');
      return;
    }

    const checkAuth = async () => {
      try {
        const email = user.primaryEmailAddress?.emailAddress || '';
        
        // Master admin bypass
        if (MASTER_ADMIN_EMAILS.includes(email.toLowerCase())) {
          setStatus('authorized');
          return;
        }

        // Check role in Supabase using clerk_id
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('clerk_id', userId)
          .single();

        if (!error && data && (data.role === 'vendor' || data.role === 'admin')) {
          setStatus('authorized');
        } else {
          setStatus('customer');
        }
      } catch (e) {
        console.error('RequireVendor auth check failed:', e);
        setStatus('customer');
      }
    };

    checkAuth();
  }, [isLoaded, userId, user]);

  // --- Guest: redirect to vendor login ---
  useEffect(() => {
    if (status === 'guest') {
      window.location.hash = 'login-vendor';
      if (onNavigate) {
        onNavigate('auth');
      } else {
        window.location.replace('/auth#login-vendor');
      }
    }
  }, [status, onNavigate]);

  // Loading spinner
  if (!isLoaded || status === 'loading') {
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
      window.location.hash = 'login-vendor';
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
            Your account does not have vendor privileges.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            onClick={handleSignOut}
            className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
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
