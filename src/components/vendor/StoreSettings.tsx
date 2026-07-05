import React, { useState, useRef } from "react";
import { Vendor } from "../../types";
import { Store, Camera, Save, MapPin, Phone, RefreshCw } from "lucide-react";
import { saveSupabaseRecord } from "../../supabase";
import { convertFileToBase64, uploadToCloudinary } from "../../cloudinaryService";

interface Props {
  vendor: Vendor;
}

export default function StoreSettings({ vendor }: Props) {
  const [formData, setFormData] = useState<Partial<Vendor>>({
    name: vendor.name,
    description: vendor.description || "",
    phone: vendor.phone || "",
    location: vendor.location || "",
    avatar: vendor.avatar || "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus("idle");
    
    try {
      const success = await saveSupabaseRecord("vendors", {
        ...vendor,
        ...formData
      });
      
      if (success) setSaveStatus("success");
      else setSaveStatus("error");
    } catch (err) {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const base64 = await convertFileToBase64(file);
      const res = await uploadToCloudinary(base64);
      if (res.success && res.url) {
        setFormData({ ...formData, avatar: res.url });
      } else {
        alert("Image upload failed. Please try again.");
      }
    } catch (err) {
      console.error("Upload error", err);
      alert("An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Store Settings</h2>
          <p className="text-sm text-neutral-500 font-medium">Update your public profile and contact details.</p>
        </div>
      </div>

      {saveStatus !== "idle" && (
        <div className={`p-4 rounded-xl text-sm font-bold ${saveStatus === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {saveStatus === 'success' ? "Store profile updated successfully!" : "Failed to update store profile."}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-ambient border border-neutral-100 space-y-8">
        
        {/* Profile Image */}
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 rounded-full bg-neutral-100 border-2 border-dashed border-neutral-300 flex items-center justify-center overflow-hidden relative group">
            {isUploading ? (
               <RefreshCw className="w-6 h-6 text-neutral-400 animate-spin" />
            ) : formData.avatar ? (
              <img src={formData.avatar} alt="Store logo" className="w-full h-full object-cover" />
            ) : (
              <Store className="w-8 h-8 text-neutral-400" />
            )}
            <div 
              className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-all"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-6 h-6 text-white" />
            </div>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
          </div>
          <div>
            <h3 className="font-bold text-neutral-900">Store Logo</h3>
            <p className="text-xs text-neutral-500 mt-1">Recommended size: 512x512px. Max 2MB.</p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">Store Name</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name || ''} 
              onChange={handleChange}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-neutral-900" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">Owner Name</label>
            <input 
              type="text" 
              name="ownerName" 
              value={formData.ownerName || ''} 
              onChange={handleChange}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-neutral-900" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">Phone Number</label>
            <input 
              type="text" 
              name="phone" 
              value={formData.phone || ''} 
              onChange={handleChange}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-neutral-900" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">WhatsApp Number</label>
            <input 
              type="text" 
              name="whatsappNumber" 
              value={formData.whatsappNumber || ''} 
              onChange={handleChange}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-neutral-900" 
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">Physical Address</label>
            <textarea 
              name="location" 
              rows={3}
              value={formData.location || ''} 
              onChange={handleChange}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-neutral-900 resize-none" 
            />
          </div>
        </div>

        {/* Financial Info */}
        <div className="pt-6 border-t border-neutral-100 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <h3 className="font-bold text-neutral-900">Financial & Legal</h3>
            <p className="text-xs text-neutral-500 mt-1">Required for payouts and store verification.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">Bank Name</label>
            <input 
              type="text" 
              name="bankName" 
              value={formData.bankName || ''} 
              onChange={handleChange}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-neutral-900" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">Account Number</label>
            <input 
              type="text" 
              name="accountNumber" 
              value={formData.accountNumber || ''} 
              onChange={handleChange}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-neutral-900" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 uppercase tracking-wider">CAC Registration (Optional)</label>
            <input 
              type="text" 
              name="cacNumber" 
              value={formData.cacNumber || ''} 
              onChange={handleChange}
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all text-neutral-900" 
            />
          </div>
        </div>

        <div className="pt-6 border-t border-neutral-100 flex justify-end">
          <button 
            type="submit"
            disabled={isSaving}
            className="px-8 py-3 bg-primary-dark hover:bg-primary text-white rounded-xl font-bold tracking-wide shadow-md shadow-primary-dark/20 flex items-center space-x-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            <span>{isSaving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
