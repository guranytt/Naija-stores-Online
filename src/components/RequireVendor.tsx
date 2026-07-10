import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { supabase } from '../supabase';

export default function RequireVendor({ children }: { children: React.ReactNode }) {
  const { isLoaded, userId } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!userId) {
      setIsAuthorized(false);
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
  }, [isLoaded, userId]);

  if (!isLoaded || isAuthorized === null) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    if (!userId) {
      window.location.replace("/auth#login");
    } else {
      window.location.replace("/");
    }
    return null;
  }

  return <>{children}</>;
}
