import { useState } from 'react';
import { getAuthToken } from '../supabase';
import { Vendor } from '../types';
import { mutate } from 'swr';

export const useUpdateVendorProfile = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = async (vendorData: Partial<Vendor>) => {
    setIsUpdating(true);
    setError(null);
    
    try {
      const token = await getAuthToken();
      if (!token) {
         throw new Error("Authentication session expired. Please log in again.");
      }



      const res = await fetch('/api/vendor/upsert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(vendorData)
      });

      const json = await res.json();
      
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to update profile. Server rejected the request.");
      }

      // Globally revalidate vendor lists using SWR
      mutate(["vendors", { limit: 100 }]);
      mutate(["vendors", { limit: 1000 }]);

      return { success: true };
    } catch (err: any) {
      console.error("[useUpdateVendorProfile] Error:", err);
      setError(err.message || "An unexpected error occurred.");
      return { success: false, error: err.message };
    } finally {
      setIsUpdating(false);
    }
  };

  return { updateProfile, isUpdating, error };
};
