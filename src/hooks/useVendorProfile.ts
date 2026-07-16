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

      const payload = {
        id: vendorData.id,
        business_name: vendorData.business_name || vendorData.name,
        business_description: vendorData.business_description || vendorData.description,
        business_address: vendorData.business_address || vendorData.address,
        logo_url: vendorData.logo_url,
        bank_account_name: vendorData.bank_account_name,
        bank_account_number: vendorData.bank_account_number,
        bank_code: vendorData.bank_code,
        whatsapp_number: vendorData.whatsapp_number,
        cac_number: vendorData.cac_number,
        phone: vendorData.phone,
        email: vendorData.email,
        owner_name: vendorData.owner_name
      };

      const res = await fetch('/api/vendor/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
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
