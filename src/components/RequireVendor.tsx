import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { supabase } from '../supabase';

export default function RequireVendor({ children, onNavigate }: { children: React.ReactNode, onNavigate?: (screen: string) => void }) {
  const { isLoaded: authLoaded, userId } = useAuth();
  const { isLoaded: userLoaded, user } = useUser();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authLoaded || !userLoaded) return;
    if (!userId) {
      setIsAuthorized(false);
      return;
    }
    
    const uEmail = user?.primaryEmailAddress?.emailAddress;
    if (uEmail?.toLowerCase() === "adminnaijastoresonline@gmail.com") {
      setIsAuthorized(true);
      return;
    }
    
    const checkRole = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("clerk_id", userId)
          .single();
          
        if (!error && data && (data.role === "vendor" || data.role === "admin")) {
          // Admins can also view vendor pages as superusers
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (e) {
        setIsAuthorized(false);
      }
    };
    
    checkRole();
  }, [authLoaded, userLoaded, userId, user]);

  if (!authLoaded || !userLoaded || isAuthorized === null) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    window.location.hash = "register-vendor";
    if (onNavigate) {
      onNavigate("auth");
    } else {
      window.location.replace("/auth#register-vendor");
    }
    return null;
  }

  return <>{children}</>;
}
