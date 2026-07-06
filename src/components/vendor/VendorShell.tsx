import React, { useState } from "react";
import { PackageIcon, BarChart2, CheckCircle, Sliders, Database, Menu, X, ArrowLeft, Grid } from "lucide-react";
import { useStore } from "../../store/useStore";
import { Vendor } from "../../types";
import { ensureUUID } from "../../supabase";

import DashboardOverview from "./DashboardOverview";
import ProductManagement from "./ProductManagement";
import OrderManagement from "./OrderManagement";
import StoreSettings from "./StoreSettings";
import CategoryManagement from "./CategoryManagement";

interface Props {
  vendor?: Vendor;
  isSuperAdmin?: boolean;
}

export default function VendorShell({ vendor, isSuperAdmin = false }: Props) {
  const {
    vendors = [],
    userEmail = "adminnaijastoresonline@gmail.com",
    userBankName = "",
    userBankAccountNumber = "",
    userCacNumber = "",
    userStoreName = "",
    userOwnerName = "",
    userAvatar = "",
    userWhatsappNumber = "",
    userLocation = "",
    currentUserId = null,
  } = useStore();

  const vendorsList = vendors && vendors.length > 0 ? vendors : [];
  const emailFallbackIdStr = userEmail ? `v_fallback_${userEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : "v_fallback_temp";
  const stableFallbackId = currentUserId ? ensureUUID(currentUserId) : ensureUUID(emailFallbackIdStr);

  const fallbackVendor = {
    id: stableFallbackId,
    userId: currentUserId || undefined,
    user_id: currentUserId || undefined,
    name: userStoreName || "My Store",
    business_name: userStoreName || "My Store",
    ownerName: userOwnerName || "Vendor Owner",
    email: userEmail || "vendor@naijaonlinestores.com.ng",
    location: userLocation || "Nigeria",
    physical_location: userLocation || "Nigeria",
    rating: 0,
    ratingCount: 0,
    salesToday: 0,
    isVerified: false,
    avatar: userAvatar || "",
    ordersPending: 0,
    stockAlerts: 0,
    phone: userWhatsappNumber || "",
    whatsappNumber: userWhatsappNumber || "",
    whatsapp_number: userWhatsappNumber || "",
    bankName: userBankName || "",
    accountNumber: userBankAccountNumber || "",
    cacNumber: userCacNumber || "",
  } as Vendor;

  const validMatches = vendorsList.filter(v => {
    if (!v) return false;
    if (v.id && (v.id === stableFallbackId || v.id === ensureUUID(stableFallbackId))) return true;
    if (v.id && currentUserId && (String(v.id).toLowerCase() === String(currentUserId).toLowerCase() || v.id === ensureUUID(currentUserId))) return true;
    if (v.id && userEmail && v.id === ensureUUID(emailFallbackIdStr)) return true;
    if (v.user_id && currentUserId && (String(v.user_id).toLowerCase() === String(currentUserId).toLowerCase() || ensureUUID(v.user_id) === ensureUUID(currentUserId))) return true;
    if (v.userId && currentUserId && (String(v.userId).toLowerCase() === String(currentUserId).toLowerCase() || ensureUUID(v.userId) === ensureUUID(currentUserId))) return true;
    if (v.email && userEmail && String(v.email).toLowerCase() === String(userEmail).toLowerCase()) return true;
    return false;
  });

  const activeVendor = vendor || (validMatches.length > 0 ? validMatches.sort((a, b) => {
    let scoreA = (a.cacNumber ? 1 : 0) + (a.bankName ? 1 : 0) + ((a.name && a.name !== "My Store" && a.name !== "Naija Store Merchant") ? 2 : 0) + (a.location && a.location !== "Nigeria" ? 1 : 0);
    let scoreB = (b.cacNumber ? 1 : 0) + (b.bankName ? 1 : 0) + ((b.name && b.name !== "My Store" && b.name !== "Naija Store Merchant") ? 2 : 0) + (b.location && b.location !== "Nigeria" ? 1 : 0);
    return scoreB - scoreA;
  })[0] : fallbackVendor);

  const [activeTab, setActiveTab] = useState<"dashboard" | "inventory" | "orders" | "settings" | "categories">("dashboard");
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const baseTabs = [
    { id: "dashboard", label: "Dashboard", icon: BarChart2 },
    { id: "inventory", label: "Products", icon: PackageIcon },
    { id: "orders", label: "Orders", icon: CheckCircle },
    { id: "settings", label: "Store Settings", icon: Sliders },
  ];

  const TABS = isSuperAdmin 
    ? [...baseTabs, { id: "categories", label: "Categories (Admin)", icon: Grid }]
    : baseTabs;

  const handleReturnToCustomerView = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-surface-light flex flex-col md:flex-row text-gray-900 font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-primary-dark text-white p-4 flex items-center justify-between shadow-md z-20">
        <div className="flex items-center space-x-2">
          <img src="https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png" className="w-6 h-auto drop-shadow-md" alt="Logo" />
          <h1 className="font-bold text-lg truncate max-w-[200px]">
            {activeVendor?.name || "Vendor Portal"}
          </h1>
        </div>
        <button onClick={() => setIsMobileNavOpen(!isMobileNavOpen)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
          {isMobileNavOpen ? <X className="w-5 h-5 text-accent" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 transform ${isMobileNavOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 w-64 bg-primary-dark text-white shadow-xl transition-transform duration-300 ease-in-out z-10 flex flex-col flex-shrink-0`}>
        <div className="p-6 hidden md:flex items-center space-x-3 mb-6 border-b border-white/10 pb-6">
          <img src="https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png" className="w-10 h-auto drop-shadow-md" alt="Logo" />
          <div>
            <h1 className="font-bold text-xl leading-tight">Vendor Portal</h1>
            <p className="text-xs text-white/60 truncate max-w-[150px]">{activeVendor?.name}</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 md:py-0 space-y-2 overflow-y-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setIsMobileNavOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? "bg-accent text-primary-dark font-bold shadow-lg shadow-accent/20 translate-x-1" 
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-primary-dark" : ""}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 mt-auto">
          <button 
            onClick={handleReturnToCustomerView}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-xl text-white/80 hover:bg-white/10 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Store</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto bg-surface-light relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-dark/5 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-[80px] pointer-events-none -z-10" />
        
        <div className="p-6 md:p-10 min-h-full pb-24">
          {activeTab === "dashboard" && <DashboardOverview vendor={activeVendor} />}
          {activeTab === "inventory" && <ProductManagement vendor={activeVendor} />}
          {activeTab === "orders" && <OrderManagement vendor={activeVendor} />}
          {activeTab === "settings" && <StoreSettings vendor={activeVendor} />}
          {activeTab === "categories" && isSuperAdmin && <CategoryManagement />}
        </div>
      </div>
    </div>
  );
}
