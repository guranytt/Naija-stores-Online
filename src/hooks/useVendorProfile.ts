import { useState } from 'react';
import { supabase } from '../supabase';
import { Vendor } from '../types';
import { mutate } from 'swr';

export function useUpdateVendorProfile() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = async (vendorData: Vendor) => {
    setIsUpdating(true);
    setError(null);

    try {
      // Map frontend Vendor interface to Supabase database schema
      const payload = {
        business_name: vendorData.name,
        business_description: (vendorData as any).description || (vendorData as any).business_description || "",
        logo_url: vendorData.avatar || "",
        verification_status: vendorData.approval_status || "verified",
        user_id: vendorData.userId || vendorData.user_id || null,
        bank_account_name: vendorData.bankName || "",
        bank_account_number: vendorData.accountNumber || "",
        bank_code: (vendorData as any).bankCode || "",
        cac_number: vendorData.cacNumber || "",
        whatsapp_number: vendorData.whatsappNumber || "",
        business_address: vendorData.location || "",
        phone: vendorData.phone || vendorData.whatsappNumber || "",
        email: vendorData.email || "",
        owner_name: vendorData.ownerName || "",
      };

      // Direct Supabase JS client call! No Express API fallback needed.
      const { error: sbError } = await supabase
        .from('vendors')
        .update(payload)
        .eq('id', vendorData.id);

      if (sbError) {
        // Handle specific Postgres errors
        if (sbError.code === '23505') {
          if (sbError.message.includes('whatsapp_number')) {
            throw new Error("This WhatsApp number is already registered to another vendor.");
          }
          if (sbError.message.includes('cac_number')) {
            throw new Error("This CAC number is already registered.");
          }
          if (sbError.message.includes('email')) {
             throw new Error("This email is already registered to another vendor.");
          }
        }
        
        // Handle RLS errors explicitly
        if (sbError.code === '42501' || sbError.message.toLowerCase().includes('policy')) {
           throw new Error("You do not have permission to edit this profile. Session may have expired.");
        }

        throw new Error(sbError.message || "Failed to update vendor profile");
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
}
