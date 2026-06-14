/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { DollarSign, Percent, TrendingUp, AlertCircle, Eye, BadgeAlert, Sparkles, Send, ShieldPlus, Check, ChevronRight, Ban, Mail, Sliders, RefreshCw, CheckCircle, Database, HelpCircle, X, Image as ImageIcon, UploadCloud, BarChart2, PieChart, Megaphone, BellRing } from "lucide-react";
import { Vendor, Order, AdminTeamMember, Product, Category, FlashDealProposal } from "../types";
import { MOCK_VENDORS, MOCK_ORDERS, MOCK_TEAM_MEMBERS, MOCK_PRODUCTS, MOCK_CATEGORIES } from "../data/mockData";
import { formatNaira } from "./CustomerViews";
import { uploadToCloudinary, convertFileToBase64 } from "../cloudinaryService";
import SalesAnalyticsDashboard from "./SalesAnalyticsDashboard";
import { sendVendorApproval } from "../emailService";
import { requestPushPermissionAndSubscribe } from "../pushService";


interface VendorAdminProps {
  orders: Order[];
  onReviewOrderFlag: (orderId: string, status: Order["status"]) => void;
  products: Product[];
  onAddNewProduct?: (product: Product) => void;
  vendors?: Vendor[];
  onUpdateVendor?: (updatedVendor: Vendor) => void;
  categories?: Category[];
  onUpdateCategories?: (categories: Category[]) => void;
  
  // Resend Email Integration supporting controls
  mailLogs?: any[];
  onSendTestEmail?: (to: string, type: "payment_confirmation" | "delivery_confirmation" | "status_change" | "flagged", orderId: string) => Promise<any>;
  autoSendEmails?: boolean;
  onToggleAutoSend?: () => void;
  onRefreshMailLogs?: () => void;
  userEmail?: string;

  flashDeals?: FlashDealProposal[];
  onProposeFlashDeal?: (proposal: FlashDealProposal) => void;
  onApproveFlashDeal?: (id: string) => void;
  onRejectFlashDeal?: (id: string) => void;
}

export default function VendorAdmin({ 
  orders, 
  onReviewOrderFlag, 
  products, 
  onAddNewProduct, 
  vendors = [],
  onUpdateVendor,
  mailLogs = [],
  onSendTestEmail,
  autoSendEmails = true,
  onToggleAutoSend = () => {},
  onRefreshMailLogs = () => {},
  userEmail = "nigerian.developer@gmail.com",
  categories = [],
  onUpdateCategories,
  flashDeals = [],
  onProposeFlashDeal = () => {},
  onApproveFlashDeal = () => {},
  onRejectFlashDeal = () => {}
}: VendorAdminProps) {
  const [adminTab, setAdminTab] = useState<"vendor" | "dashboard" | "platform" | "emails" >("vendor");
  const [approvalFeedback, setApprovalFeedback] = useState<string | null>(null);

  // Categories Master Admin Control block states
  const [localCategories, setLocalCategories] = useState<Category[]>(categories.length ? categories : MOCK_CATEGORIES);

  React.useEffect(() => {
    if (categories && categories.length) {
      setLocalCategories(categories);
    }
  }, [categories]);

  const handleUpdateCategoriesState = (updated: Category[]) => {
    setLocalCategories(updated);
    if (onUpdateCategories) {
      onUpdateCategories(updated);
    }
  };

  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("Package");
  
  const [selectedParentId, setSelectedParentId] = useState("");
  const [newSubcatName, setNewSubcatName] = useState("");

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const newId = newCatName.toLowerCase().trim().replace(/[^a-z0-9]/g, "-");
    
    if (localCategories.some((c) => c.id === newId)) {
      alert("A category with this name already exists!");
      return;
    }

    const newCat: Category = {
      id: newId,
      name: newCatName.trim(),
      description: newCatDesc.trim() || `${newCatName.trim()} description`,
      image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=60&w=600",
      iconName: newCatIcon,
      itemCount: 0,
      subcategories: []
    };

    const updated = [...localCategories, newCat];
    handleUpdateCategoriesState(updated);
    
    setNewCatName("");
    setNewCatDesc("");
    setNewCatIcon("Package");
  };

  const handleAddSubcategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParentId || !newSubcatName.trim()) return;
    
    const updated = localCategories.map((c) => {
      if (c.id === selectedParentId) {
        const trimmedSub = newSubcatName.trim();
        if (c.subcategories.some(s => s.toLowerCase() === trimmedSub.toLowerCase())) {
          return c;
        }
        return {
          ...c,
          subcategories: [...c.subcategories, trimmedSub]
        };
      }
      return c;
    });

    handleUpdateCategoriesState(updated);
    setNewSubcatName("");
  };

  const handleDeleteCategory = (catId: string) => {
    const updated = localCategories.filter(c => c.id !== catId);
    handleUpdateCategoriesState(updated);
  };

  const handleDeleteSubcategory = (catId: string, subcatToDelete: string) => {
    const updated = localCategories.map(c => {
      if (c.id === catId) {
        return {
          ...c,
          subcategories: c.subcategories.filter(s => s !== subcatToDelete)
        };
      }
      return c;
    });
    handleUpdateCategoriesState(updated);
  };

  const handleSendVendorApprovalEmail = async (email: string, businessName: string) => {
    setApprovalFeedback(null);
    try {
      const response = await sendVendorApproval(email, businessName);
      if (response && response.success) {
        setApprovalFeedback(`🎉 Vendor approval email dispatched to ${email}! Status: ${response.status}`);
        setTimeout(() => setApprovalFeedback(null), 5000);
      } else {
        setApprovalFeedback(`❌ Failed: ${response?.error || 'Unknown transport issue'}`);
      }
    } catch (err: any) {
      setApprovalFeedback(`❌ Error: ${err.message || 'Verification failure'}`);
    }
    onRefreshMailLogs?.();
  };

  
  // States for adding a customized new product
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("Fashion");
  const [newStock, setNewStock] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newImage, setNewImage] = useState("");
  const [newCondition, setNewCondition] = useState<"New" | "Fairly Used">("New");
  const [newCommissionPercent, setNewCommissionPercent] = useState<string>("5");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // States for updating vendor profile and branding picture
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editShopName, setEditShopName] = useState("");
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editCacNumber, setEditCacNumber] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [isProfileUploading, setIsProfileUploading] = useState(false);
  const [profileUploadError, setProfileUploadError] = useState("");

  // States for Vendor Flash Deal Proposals
  const [fdProductId, setFdProductId] = useState("");
  const [fdReducedAmt, setFdReducedAmt] = useState("");
  const [fdTimeFrame, setFdTimeFrame] = useState("6 Hours Storefront Special");
  const [fdSuccess, setFdSuccess] = useState<string | null>(null);
  const [fdError, setFdError] = useState<string | null>(null);

  const vendorsList = vendors && vendors.length > 0 ? vendors : MOCK_VENDORS;
  const activeVendor = vendorsList.find(v => v.email?.toLowerCase() === userEmail?.toLowerCase()) || 
                       vendorsList.find(v => v.id === "v_heritage") || 
                       vendorsList[0];

  const isMasterAdmin = userEmail?.toLowerCase() === "mcgigimeshai@gmail.com" ||
                        userEmail?.toLowerCase() === "nigerian.developer@gmail.com" ||
                        userEmail?.toLowerCase()?.includes("admin") ||
                        userEmail?.toLowerCase()?.includes("@naijastores.ng");

  // Keep adminTab state synced if standard vendor tries to access platform tabs
  React.useEffect(() => {
    if (!isMasterAdmin && ["platform", "commissions", "ads", "emails"].includes(adminTab)) {
      setAdminTab("vendor");
    }
  }, [adminTab, isMasterAdmin]);

  // Filter products and orders dynamically for real, active vendor statistics
  const vendorProducts = products.filter(p => {
    const vId = p.vendorId || (p as any).vendor_id;
    return vId === activeVendor.id;
  });

  const vendorOrders = orders.filter(o => {
    const oVendorId = (o as any).vendorId || (o as any).vendor_id;
    if (oVendorId) {
      return oVendorId === activeVendor.id;
    }
    if (o.productIds && o.productIds.length > 0) {
      return o.productIds.some(pId => vendorProducts.some(vp => vp.id === pId));
    }
    return false;
  });

  const totalSalesValue = vendorOrders
    .filter(o => {
      const s = o.status as string;
      return s === "Success" || s === "Delivered" || s === "Paid" || s === "Shipped" || s === "Processing";
    })
    .reduce((acc, curr) => acc + (curr.value || 0), 0);

  const pendingOrdersCount = vendorOrders.filter(o => {
    const s = o.status as string;
    return s === "Pending" || s === "Processing" || s === "Manifested";
  }).length;
  const lowStockThreshold = 15;
  const stockAlertsCount = vendorProducts.filter(p => (p.stock || 0) < lowStockThreshold).length;

  const vendorRating = activeVendor.rating || 5.0;
  const vendorRatingCount = activeVendor.ratingCount || 1;

  // Real, dynamic weekly sales activity bar charts
  const dayTotals: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  vendorOrders.forEach(o => {
    let day = "Fri";
    if (o.date) {
      try {
        const dateObj = new Date(o.date);
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        day = dayNames[dateObj.getDay()] || "Fri";
      } catch (err) {
        day = "Fri";
      }
    }
    if (dayTotals[day] !== undefined) {
      dayTotals[day] += o.value || 0;
    }
  });

  // Fallback to activeVendor.salesToday if there's no dynamic order value yet, to ensure a smooth transition
  const baseSales = totalSalesValue > 0 ? totalSalesValue : (activeVendor.salesToday || 0);

  const maxDayVal = Math.max(...Object.values(dayTotals), 50000);
  const barData = Object.keys(dayTotals).map(day => {
    const val = dayTotals[day];
    const pct = val > 0 ? Math.min(100, Math.round((val / maxDayVal) * 100)) : (day === "Fri" && baseSales > 0 ? 50 : 5);
    return {
      d: day,
      v: val > 0 ? val : (day === "Fri" && baseSales > 0 ? baseSales : 0),
      h: `${pct}%`
    };
  });

  const handleProposeFlashSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFdError(null);
    setFdSuccess(null);

    const targetProd = products.find(p => p.id === fdProductId);
    if (!targetProd) {
      setFdError("Please select a valid product first!");
      return;
    }

    const amt = parseFloat(fdReducedAmt);
    if (isNaN(amt) || amt <= 0) {
      setFdError("Please enter a valid amount reduced off the price!");
      return;
    }

    if (amt >= targetProd.price) {
      setFdError(`How much is reduced (₦${amt}) cannot be greater than or equal to product's current price (₦${targetProd.price})!`);
      return;
    }

    const proposal: FlashDealProposal = {
      id: "fd-" + Date.now(),
      productId: fdProductId,
      productName: targetProd.title,
      productImage: targetProd.image,
      priceBefore: targetProd.price,
      reducedAmount: amt,
      priceAfter: targetProd.price - amt,
      timeFrame: fdTimeFrame,
      vendorId: activeVendor.id,
      vendorName: activeVendor.name,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    onProposeFlashDeal(proposal);
    setFdSuccess("Flash deal proposal submitted successfully for Admin review!");
    setFdProductId("");
    setFdReducedAmt("");
    setFdTimeFrame("6 Hours Storefront Special");

    setTimeout(() => {
      setFdSuccess(null);
    }, 5000);
  };

  React.useEffect(() => {
    if (activeVendor) {
      setEditShopName(activeVendor.name);
      setEditOwnerName(activeVendor.ownerName || "");
      setEditLocation(activeVendor.location || "");
      setEditAvatar(activeVendor.avatar || "");
      setEditCacNumber(activeVendor.cacNumber || "");
      setEditWhatsapp(activeVendor.whatsappNumber || "");
    }
  }, [activeVendor]);

  const handleProfilePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setProfileUploadError("Store logo image exceeds maximum 8MB file size.");
      return;
    }

    setIsProfileUploading(true);
    setProfileUploadError("");

    try {
      const base64 = await convertFileToBase64(file);
      const res = await uploadToCloudinary(base64);
      if (res.success && res.url) {
        setEditAvatar(res.url);
      } else {
        setProfileUploadError(res.error || "Custom image upload returned an error code.");
      }
    } catch (err: any) {
      setProfileUploadError(err.message || "Failed to parse local image stream.");
    } finally {
      setIsProfileUploading(false);
    }
  };

  const handleSaveProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editShopName.trim()) return;

    if (onUpdateVendor) {
      onUpdateVendor({
        ...activeVendor,
        name: editShopName,
        ownerName: editOwnerName,
        location: editLocation,
        avatar: editAvatar,
        cacNumber: editCacNumber,
        whatsappNumber: editWhatsapp
      });
    }
    setShowEditProfileModal(false);
  };
  const averageVendorRating = vendorsList.reduce((acc, curr) => acc + curr.rating, 0) / vendorsList.length;

  // Raw mock stats for platform view
  const platformStats = {
    totalGMV: 4859000,
    activeUsers: "124,800",
    activeVendors: "432",
    pendingVerifications: 4
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setUploadError("Asset exceeds maximum 8MB file size ceiling.");
      return;
    }

    setIsUploading(true);
    setUploadError("");

    try {
      const base64 = await convertFileToBase64(file);
      const res = await uploadToCloudinary(base64);
      if (res.success && res.url) {
        setNewImage(res.url);
      } else {
        setUploadError(res.error || "Uploader returned an invalid state.");
      }
    } catch (err: any) {
      setUploadError(err.message || "Failed to parse local file system stream.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPrice || !newStock) return;
    
    if (onAddNewProduct) {
      const prod: Product = {
        id: "p_" + Date.now(),
        title: newTitle,
        description: newDesc || "High-quality item customized for Nigerian markets.",
        price: Number(newPrice),
        stock: Number(newStock),
        category: newCategory,
        condition: newCondition,
        commissionPercentage: Number(newCommissionPercent),
        image: newImage || "https://lh3.googleusercontent.com/aida-public/AB6AXuBXHHRDhnfXAPzOsfwJAJsaalg4cWfRii5vBleuGOxKrptM-qmw3JgFBhmDSeXClxBlfi3YbQJiQs13dl3CJxFMTrEsoeKAI1JkXEckU88mcDf64zuwrUdWJW8NNuhXEbmbimeAKXSCpzoTENrA7IaXi3jzD_WCPb-on3IiWMAikNItCyKkPDuCIxGIIFS30rf-qvm-aGDzOiKqproxCid4Yu_VB_ycleJTW0iXWyz1WZUzAk_v-gZdvKW2YKJet89-kA4ee4AC0u9d",
        vendorId: activeVendor.id,
        vendorName: activeVendor.name,
        rating: 5.0,
        reviewsCount: 1,
        isNew: true
      };
      onAddNewProduct(prod);
    }

    setNewTitle("");
    setNewPrice("");
    setNewStock("");
    setNewDesc("");
    setNewImage("");
    setNewCondition("New");
    setNewCommissionPercent("5");
    setUploadError("");
    setShowAddProductModal(false);
  };

  return (
    <div className="space-y-6 font-sans text-neutral-800 text-left">
      
      {/* Tab Selectors Row */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center p-1.5 bg-neutral-100 rounded-2xl gap-2 shadow-xs select-none border border-neutral-150">
        <div className="flex flex-wrap gap-1.5 w-full xl:w-auto">
          <button
            onClick={() => setAdminTab("vendor")}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              adminTab === "vendor"
                ? "bg-white text-neutral-900 shadow-sm font-extrabold"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <span>Alex's Merchant Cabin</span>
          </button>

          <button
            onClick={() => setAdminTab("dashboard")}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              adminTab === "dashboard"
                ? "bg-white text-neutral-900 shadow-sm font-extrabold"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            <span>Visual Analytics Board</span>
          </button>
          
          {isMasterAdmin && (
            <>
              <button
                onClick={() => setAdminTab("platform")}
                className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  adminTab === "platform"
                    ? "bg-white text-neutral-900 shadow-sm font-extrabold"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <ShieldPlus className="w-4 h-4 text-emerald-600" />
                <span>Master Administrator Admin Console</span>
              </button>

              <button
                onClick={() => setAdminTab("commissions")}
                className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  adminTab === "commissions"
                    ? "bg-white text-neutral-900 shadow-sm font-extrabold"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <PieChart className="w-4 h-4 text-purple-500" />
                <span>Commission & Payouts</span>
              </button>

              <button
                onClick={() => setAdminTab("ads")}
                className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  adminTab === "ads"
                    ? "bg-white text-neutral-900 shadow-sm font-extrabold"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <Megaphone className="w-4 h-4 text-pink-500" />
                <span>Ad Campaigns</span>
              </button>

              <button
                onClick={() => setAdminTab("emails")}
                className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  adminTab === "emails"
                    ? "bg-white text-neutral-900 shadow-sm font-extrabold font-black"
                    : "text-neutral-500 hover:text-neutral-950"
                }`}
              >
                <Mail className="w-4 h-4 text-orange-500" />
                <span>Resend Mail Automation Hub</span>
                <span className="bg-orange-100 text-orange-850 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold">AUTO</span>
              </button>
            </>
          )}
        </div>
        <div className="px-3 py-1 bg-white border border-neutral-200 rounded-lg text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
          Currency: NGN (₦)
        </div>
      </div>

      {/* ---------------- A. ALEX'S MERCHANT PANEL ---------------- */}
      {adminTab === "vendor" && (
        <div className="space-y-6">
          
          {/* Header context */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs">
            <div className="flex items-center space-x-4">
              <div className="relative group cursor-pointer" onClick={() => setShowEditProfileModal(true)}>
                {activeVendor.avatar ? (
                  <img 
                    src={activeVendor.avatar} 
                    alt={activeVendor.name} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-orange-500 shadow-sm"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // fallback if image url is broken or default
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : null}
                <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-600 font-black text-lg flex items-center justify-center border-2 border-orange-500 shadow-sm uppercase">
                  {activeVendor.name.charAt(0)}
                </div>
                {/* Micro hover interaction badge */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neutral-900 border border-white text-white rounded-full flex items-center justify-center text-[10px] shadow-xs">
                  ⚙️
                </div>
              </div>
              <div className="text-left">
                <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight flex items-center space-x-2">
                  <span>Welcome back, {activeVendor.ownerName}</span>
                </h2>
                <p className="text-xs text-neutral-400 font-bold">{activeVendor.name} &bull; 📍 {activeVendor.location}</p>
                <button 
                  onClick={() => setShowEditProfileModal(true)}
                  className="text-[10px] text-orange-500 hover:text-orange-600 font-black tracking-wider uppercase underline mt-1 block"
                >
                  Edit Logo & Shop Details
                </button>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={async () => {
                  const success = await requestPushPermissionAndSubscribe(activeVendor.id);
                  if (success) {
                    alert('Sale push notifications are now enabled! You will be alerted for every successful payment.');
                  } else {
                    alert('Could not enable push notifications. Please check your browser permissions.');
                  }
                }}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center space-x-1.5 border border-indigo-200"
              >
                <BellRing className="w-4 h-4" />
                <span>Enable Alerts</span>
              </button>
              <button
                onClick={() => setShowEditProfileModal(true)}
                className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center space-x-1.5 border border-neutral-200"
              >
                <span>⚙️ Edit Brand Profile</span>
              </button>
              <button
                onClick={() => {
                  if (!activeVendor.cacNumber || !activeVendor.whatsappNumber) {
                    alert("Please complete your vendor profile verification (CAC Number and WhatsApp Mobile) before publishing products.");
                    setShowEditProfileModal(true);
                  } else {
                    setShowAddProductModal(true);
                  }
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center space-x-1.5 shadow-xs"
                id="add-custom-product-trigger"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Publish New Product</span>
              </button>
            </div>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sales */}
            <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Today's Store Sales</p>
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight mt-1.5">{formatNaira(totalSalesValue > 0 ? totalSalesValue : (activeVendor.salesToday || 0))}</h3>
              <p className="text-[10px] text-emerald-600 font-bold mt-1 inline-flex items-center space-x-1">
                <span>&uarr; 12.5%</span> 
                <span className="text-neutral-400 font-normal">from yesterday</span>
              </p>
            </div>

            {/* Pending Orders */}
            <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-sans">Active Orders Needs Shipping</p>
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight mt-1">{pendingOrdersCount} orders</h3>
              <p className="text-[10px] text-orange-500 font-bold mt-1 inline-flex items-center space-x-1">
                <span>● Urgent Delivery queue</span>
              </p>
            </div>

            {/* Custom stock warnings */}
            <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Stock Alert Limits</p>
              <div className="flex items-center space-x-2.5 mt-1.5">
                <h3 className="text-2xl font-black text-red-600 tracking-tight">{stockAlertsCount} items</h3>
                <span className="bg-red-50 text-red-600 font-extrabold text-[9px] px-1.5 py-0.5 rounded border border-red-100 uppercase tracking-wide">Danger Limit</span>
              </div>
              <p className="text-[10px] text-neutral-400 font-semibold mt-1">Re-ordering coordinates advised</p>
            </div>

            {/* Ratings summary */}
            <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Net Rating Factor</p>
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight mt-1">{vendorRating.toFixed(1)} ★</h3>
              <p className="text-[10px] text-emerald-600 font-bold mt-1 inline-flex items-center space-x-1">
                <span>Verified by {vendorRatingCount} customers</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Hand-drawn CSS Graphic Chart for Sales Performance (8 cols) */}
            <div className="lg:col-span-8 bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-neutral-50">
                <div className="text-left">
                  <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight">Sales Outlets Metrics</h3>
                  <p className="text-[10px] font-semibold text-neutral-400">Weekly revenue performance in Naira</p>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 bg-orange-500 rounded-full inline-block" />
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Active Store Sales</span>
                </div>
              </div>

              {/* Vector Bar Layout */}
              <div className="h-60 flex items-end justify-between pt-6 px-4">
                {barData.map((bar) => (
                  <div key={bar.d} className="flex flex-col items-center space-y-2 w-10 group relative cursor-pointer">
                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 bg-neutral-900 text-white text-[9px] font-bold px-2 py-1 rounded hidden group-hover:block transition-all shadow-md z-15 font-mono">
                      {formatNaira(bar.v)}
                    </div>
                    
                    {/* Bar vector */}
                    <div className="w-full bg-neutral-100 rounded-t-lg h-44 flex items-end overflow-hidden">
                      <div
                        className="bg-orange-500 group-hover:bg-orange-600 rounded-t-lg w-full transition-all duration-500"
                        style={{ height: bar.h }}
                      />
                    </div>
                    <span className="text-[10px] font-extrabold text-neutral-400 tracking-wide">{bar.d}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stock Alerts Widget Column (4 cols) */}
            <div className="lg:col-span-4 bg-white border border-neutral-155 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight border-b border-neutral-50 pb-2 flex items-center justify-between">
                <span>Restock Alerts</span>
                <span className="text-[10px] uppercase font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded border border-red-100">Pending Actions</span>
              </h3>

              <div className="space-y-4">
                {vendorProducts.filter(p => (p.stock || 0) <= 12).slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 text-xs justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="w-9 h-9 bg-neutral-50 border border-neutral-100 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="font-bold text-neutral-800 truncate max-w-40">{item.title}</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">Rating: {item.rating} ★</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold font-mono text-red-600 block bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
                        {item.stock} left
                      </span>
                    </div>
                  </div>
                ))}
                {vendorProducts.filter(p => (p.stock || 0) <= 12).length === 0 && (
                  <p className="text-xs text-neutral-400 py-6 text-center">All catalog listings currently healthy.</p>
                )}
              </div>

              {/* Quick Actions grids */}
              <div className="pt-2 border-t border-neutral-100 space-y-2">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest text-left">Quick Admin Actions</p>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
                  <button className="p-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-700 text-center uppercase tracking-wide">
                    Start Promo
                  </button>
                  <button className="p-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg text-neutral-700 text-center uppercase tracking-wide">
                    Excel Report
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* ⚡ VENDOR FLASH DEALS PROPOSAL AREA */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-7 mt-6 border-t border-neutral-200">
            {/* Column 1: Propose Form */}
            <div className="lg:col-span-5 bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-neutral-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
                    <span>⚡ Propose Flash Sale</span>
                  </h3>
                  <p className="text-[10px] text-neutral-450 mt-0.5">Set up custom price reduced metrics</p>
                </div>
                <span className="text-[9px] uppercase font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded border border-orange-100">Requires Admin Approval</span>
              </div>

              <form onSubmit={handleProposeFlashSubmit} className="space-y-4 text-left">
                {fdSuccess && (
                  <p className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="leading-tight">{fdSuccess}</span>
                  </p>
                )}

                {fdError && (
                  <p className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span className="leading-tight">{fdError}</span>
                  </p>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1 block">1. Select Custom Listing</label>
                  <select
                    required
                    value={fdProductId}
                    onChange={(e) => setFdProductId(e.target.value)}
                    className="w-full text-xs p-3 border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-neutral-805 font-bold"
                  >
                    <option value="">-- Choose Store Listing --</option>
                    {products.filter(p => !p.vendorId || p.vendorId === activeVendor.id).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({formatNaira(p.price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1 block">2. How much reduced off (₦)</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 5000"
                      value={fdReducedAmt}
                      onChange={(e) => setFdReducedAmt(e.target.value)}
                      className="w-full text-xs p-3 border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-neutral-805 font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1 block">3. Time Frame Context</label>
                    <select
                      value={fdTimeFrame}
                      onChange={(e) => setFdTimeFrame(e.target.value)}
                      className="w-full text-xs p-3 border border-neutral-200 bg-white rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-neutral-805 font-medium"
                    >
                      <option value="6 Hours (Midday Express)">6 Hours (Midday Express)</option>
                      <option value="12 Hours (Saturday Lightning)">12 Hours (Saturday Lightning)</option>
                      <option value="24 Hours (Full day special)">24 Hours (Full day special)</option>
                      <option value="48 Hours Clearance Bonanza">48 Hours Clearance Bonanza</option>
                    </select>
                  </div>
                </div>

                {fdProductId && fdReducedAmt && (
                  <div className="bg-neutral-50 border border-neutral-100 p-4 rounded-xl space-y-1.5 text-xs">
                    <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Pricing Calculation</p>
                    <p className="flex justify-between font-medium">
                      <span>Standard Catalog List Price:</span>
                      <span className="font-bold">{formatNaira(products.find(p => p.id === fdProductId)?.price || 0)}</span>
                    </p>
                    <p className="flex justify-between font-medium text-orange-600">
                      <span>Amount Reduced Off:</span>
                      <span className="font-extrabold">- {formatNaira(parseFloat(fdReducedAmt) || 0)}</span>
                    </p>
                    <div className="border-t border-dotted border-neutral-200 pt-2 flex justify-between font-bold text-neutral-900 text-[13px]">
                      <span>Effective Campaign Price:</span>
                      <span>
                        {formatNaira(
                          Math.max(0, (products.find(p => p.id === fdProductId)?.price || 0) - (parseFloat(fdReducedAmt) || 0))
                        )}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 font-extrabold text-[11px] uppercase tracking-widest text-white rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-1.5 group"
                >
                  <Send className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  <span>Request Flash Deal Listing</span>
                </button>
              </form>
            </div>

            {/* Column 2: Status Hub Section */}
            <div className="lg:col-span-7 bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs flex flex-col justify-start">
              <div className="border-b border-neutral-105 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-neutral-700" />
                    <span>Active Flash Deals Proposal Ledger</span>
                  </h3>
                  <p className="text-[10px] text-neutral-450 mt-0.5">Interactive status review log of all deal proposals</p>
                </div>
              </div>

              <div className="divide-y divide-neutral-100 max-h-[350px] overflow-y-auto mt-3 pr-2 space-y-3">
                {flashDeals.filter(fd => fd.vendorId === activeVendor.id).length === 0 ? (
                  <div className="py-16 text-center text-neutral-400 text-xs font-medium">
                    No active flash deal campaigns registered. Submit one using the form on the left!
                  </div>
                ) : (
                  flashDeals.filter(fd => fd.vendorId === activeVendor.id).map(fd => (
                    <div key={fd.id} className="pt-3 flex items-start justify-between gap-3 text-left">
                      <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-50 shadow-xs border border-neutral-100 flex-shrink-0">
                          <img src={fd.productImage} alt={fd.productName} className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-900 line-clamp-1">{fd.productName}</p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">Time Frame: <span className="font-bold text-neutral-600">{fd.timeFrame}</span></p>
                          <div className="flex items-center gap-2 mt-1 px-1 py-0.5 text-xs text-neutral-500">
                            <span className="line-through">{formatNaira(fd.priceBefore)}</span>
                            <span className="text-orange-600 font-black">{formatNaira(fd.priceAfter)}</span>
                            <span className="text-[9px] bg-red-50 text-red-600 px-1 font-extrabold rounded">₦{fd.reducedAmount} OFF</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0 text-right">
                        {fd.status === "pending" && (
                          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 rounded border border-amber-100 select-none">
                            Pending Review
                          </span>
                        )}
                        {fd.status === "approved" && (
                          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 rounded border border-emerald-100 select-none">
                            Approved & Active
                          </span>
                        )}
                        {fd.status === "rejected" && (
                          <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-600 bg-red-50 rounded border border-red-100 select-none">
                            Rejected
                          </span>
                        )}
                        <span className="text-[8px] font-mono text-neutral-400 uppercase tracking-widest">{new Date(fd.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Add custom product modular mock popup */}
          {showAddProductModal && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs" onClick={() => setShowAddProductModal(false)} />
              <div className="relative w-full max-w-md bg-white rounded-2xl shadow-premium p-6 overflow-hidden z-10">
                <h3 className="text-lg font-black text-neutral-900 tracking-tight mb-4">Publish Custom Shop Product</h3>
                
                <form onSubmit={handleCreateProductSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Product Title</label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Ankara Velvet Evening Gown"
                      className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Price (₦)</label>
                      <input
                        type="number"
                        required
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        placeholder="₦ 45000"
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Stock Level</label>
                      <input
                        type="number"
                        required
                        value={newStock}
                        onChange={(e) => setNewStock(e.target.value)}
                        placeholder="18"
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Market Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white font-bold text-neutral-700"
                    >
                      <option value="Phones">Phones</option>
                      <option value="Cars">Cars</option>
                      <option value="Phone Accessories">Phone Accessories</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Home and Kitchen">Home and Kitchen</option>
                      <option value="Beauty">Beauty</option>
                      <option value="Sports">Sports</option>
                      <option value="Grocery">Grocery</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Condition</label>
                      <select
                        value={newCondition}
                        onChange={(e: any) => setNewCondition(e.target.value)}
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white font-bold text-neutral-700"
                      >
                        <option value="New">New</option>
                        <option value="Fairly Used">Fairly Used</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Commission (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={newCommissionPercent}
                        onChange={(e) => setNewCommissionPercent(e.target.value)}
                        placeholder="5"
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                      />
                    </div>
                  </div>
                  
                  {newPrice && newCommissionPercent && (
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex justify-between items-center text-xs">
                      <span className="font-bold text-neutral-600">Expected Earnings:</span>
                      <span className="font-black text-emerald-800 font-mono">
                        {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(newPrice) * (1 - Number(newCommissionPercent) / 100))}
                      </span>
                    </div>
                  )}

                  {/* Cloudinary CDN Image Upload Asset Manager */}
                  <div className="space-y-1.5 p-3.5 bg-neutral-50/70 border border-neutral-150 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-neutral-600 uppercase tracking-widest flex items-center gap-1.5">
                        <UploadCloud className="w-4 h-4 text-orange-500" />
                        <span>Cloudinary Image CDN</span>
                      </label>
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-850 text-[9px] font-black uppercase rounded-md tracking-wider">
                        ACTIVE CDN
                      </span>
                    </div>
                    
                    <p className="text-[10px] text-neutral-400 font-medium leading-relaxed">
                      Optimize, compress, and deliver ultra-fast product media instantly with Cloudinary cloud storage.
                    </p>

                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          disabled={isUploading}
                          className="file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-orange-500 file:text-white hover:file:bg-orange-600 text-neutral-500 file:cursor-pointer text-[11px] font-mono cursor-pointer block w-full bg-white border border-neutral-200 p-1.5 rounded-xl disabled:opacity-45"
                        />
                      </div>

                      {newImage && (
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-neutral-250 flex-shrink-0 relative group">
                          <img src={newImage} alt="Cloudinary Thumbnail Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setNewImage("")}
                            className="absolute inset-0 bg-neutral-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      )}
                    </div>

                    {isUploading && (
                      <div className="flex items-center space-x-1.5 text-[11px] font-bold text-orange-600 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading media stream...</span>
                      </div>
                    )}

                    {uploadError && (
                      <div className="text-[10px] font-bold text-red-600 bg-red-50 p-2 rounded-xl border border-red-100 flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    {newImage && !isUploading && (
                      <div className="text-[10px] text-emerald-600 bg-emerald-50 p-2 rounded-xl border border-emerald-100 font-bold flex items-center space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="truncate">Active link assigned!</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Detailed Features</label>
                    <textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      rows={3}
                      placeholder="Specify size tolerances, fabric details, or audio constraints..."
                      className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-neutral-700"
                    />
                  </div>

                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddProductModal(false)}
                      className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-neutral-600 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold shadow"
                    >
                      Publish Item
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Edit Brand Profile settings modal popup */}
          {showEditProfileModal && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs" onClick={() => setShowEditProfileModal(false)} />
              <div className="relative w-full max-w-md bg-white rounded-3xl shadow-premium p-6 overflow-hidden z-10 border border-neutral-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-black text-neutral-900 tracking-tight">Edit Store Brand Profile</h3>
                  <button onClick={() => setShowEditProfileModal(false)} className="text-neutral-400 hover:text-neutral-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Highly simple guidance instructions */}
                <div className="bg-amber-50 border border-amber-200/60 p-3.5 rounded-2xl text-[11px] text-neutral-800 space-y-1 mb-4 leading-relaxed">
                  <span className="font-extrabold text-amber-950 uppercase tracking-wider block mb-1">💡 Super Simple Instructions:</span>
                  <p>1. Tap <strong>Choose Brand File</strong> below to select and upload your brand logo or photo instantly. No complicated crop tools required!</p>
                  <p>2. Fill out your simple shop name, contact location, and bank credentials.</p>
                  <p>3. Tap <strong>Save Brand Settings</strong>. The changes propagate live across your custom site pages.</p>
                </div>

                <form onSubmit={handleSaveProfileSubmit} className="space-y-4">
                  {/* Brand Profile Pic Upload Input */}
                  <div className="space-y-1.5 p-3.5 bg-neutral-50 border border-neutral-150 rounded-2xl">
                    <label className="text-xs font-bold text-neutral-700 uppercase tracking-widest flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-orange-500" />
                      <span>Shop Brand Logo / Picture</span>
                    </label>
                    
                    <div className="flex gap-4 items-center mt-2">
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePictureUpload}
                          disabled={isProfileUploading}
                          className="file:mr-2.5 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-orange-500 file:text-white hover:file:bg-orange-600 text-neutral-500 file:cursor-pointer text-[10px] font-mono cursor-pointer block w-full bg-white border border-neutral-200 p-1 rounded-xl disabled:opacity-45"
                        />
                      </div>

                      {editAvatar ? (
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-500 flex-shrink-0 relative group">
                          <img src={editAvatar} alt="Store logo preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <button
                            type="button"
                            onClick={() => setEditAvatar("")}
                            className="absolute inset-0 bg-neutral-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                          >
                            <X className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-250 flex items-center justify-center font-bold text-neutral-400 text-xs flex-shrink-0">
                          No Pic
                        </div>
                      )}
                    </div>

                    {isProfileUploading && (
                      <div className="flex items-center space-x-1 mt-1 text-[10px] font-bold text-orange-600 animate-pulse">
                        <RefreshCw className="w-3 animate-spin" />
                        <span>Uploading logo to cloud...</span>
                      </div>
                    )}

                    {profileUploadError && (
                      <p className="text-[10px] text-red-600 font-bold bg-red-50 p-2 rounded-lg border border-red-100 flex items-center space-x-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{profileUploadError}</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Store / Shop Name</label>
                    <input
                      type="text"
                      required
                      value={editShopName}
                      onChange={(e) => setEditShopName(e.target.value)}
                      placeholder="e.g. Balogun Trendsetters"
                      className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Owner Full Name</label>
                      <input
                        type="text"
                        required
                        value={editOwnerName}
                        onChange={(e) => setEditOwnerName(e.target.value)}
                        placeholder="Alimi Oladipupo"
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Location / Plaza Address (Optional)</label>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        placeholder="Balogun Market, Lagos"
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">CAC Registration No.</label>
                      <input
                        type="text"
                        required
                        value={editCacNumber}
                        onChange={(e) => setEditCacNumber(e.target.value)}
                        placeholder="e.g. RC 1234567"
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">WhatsApp Mobile</label>
                      <input
                        type="text"
                        required
                        value={editWhatsapp}
                        onChange={(e) => setEditWhatsapp(e.target.value)}
                        placeholder="e.g. +23481234567"
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowEditProfileModal(false)}
                      className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-xl text-neutral-600 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isProfileUploading}
                      className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-transform disabled:opacity-50"
                    >
                      Save Brand Settings
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ---------------- INTERACTIVE SALES ANALYTICS DASHBOARD ---------------- */}
      {adminTab === "dashboard" && (
        <SalesAnalyticsDashboard orders={orders} />
      )}

      {/* ---------------- B. MASTER SYSTEM ADMINISTRATOR VIEW ---------------- */}
      {adminTab === "platform" && (
        <div className="space-y-6">
          
          {/* Header context */}
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">Master Platform Overview</h2>
            <p className="text-xs text-neutral-450 font-semibold">Consolidated cross-country financial, vendor, and courier flow data metrics</p>
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Platform GMV */}
            <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs animate-fade-in">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Gross Settlement Value (GMV)</p>
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight mt-1.5">{formatNaira(platformStats.totalGMV)}</h3>
              <p className="text-[10px] text-emerald-600 font-bold mt-1 inline-flex items-center space-x-1">
                <span>&uarr; 14.2% block growth</span>
              </p>
            </div>

            {/* Users */}
            <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs animate-fade-in">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Active Platform Shoppers</p>
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight mt-1">{platformStats.activeUsers} Shoppers</h3>
              <p className="text-[10px] text-emerald-600 font-bold mt-1">Target threshold: 150k</p>
            </div>

            {/* Vendors count */}
            <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs animate-fade-in">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Onboarded Traders</p>
              <div className="flex items-center space-x-2 mt-1">
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight">{vendorsList.length} merchants</h3>
                <span className="bg-emerald-50 text-emerald-600 font-extrabold text-[9px] px-2 py-0.5 rounded border border-emerald-100 uppercase">+432 Dynamic</span>
              </div>
            </div>

            {/* Compliance validations alert limits */}
            <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs animate-fade-in">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Pending Shop Verifications</p>
              <h3 className="text-2xl font-black text-orange-600 tracking-tight">{platformStats.pendingVerifications} shops</h3>
              <p className="text-[10px] text-orange-500 font-bold mt-1">Awaiting compliance audits</p>
            </div>

            {/* Average Vendor Rating Card */}
            <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs animate-fade-in">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Average Vendor Rating</p>
              <div className="flex items-center space-x-2 mt-1.5">
                <h3 className="text-2xl font-black text-amber-500 tracking-tight">
                  {averageVendorRating.toFixed(2)} ★
                </h3>
                <span className="bg-amber-50 text-amber-600 font-extrabold text-[9px] px-1.5 py-0.5 rounded border border-amber-100 uppercase tracking-wide">
                  Excellent
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-semibold mt-1">
                Avg across all {vendorsList.length} active sellers
              </p>
            </div>
          </div>

          {/* Platform system incidents */}
          <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl flex items-start space-x-3 text-xs leading-relaxed text-red-800">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-1 text-left">
              <p className="font-extrabold text-red-900">Urgent Critical Network Updates & Gateway Alerts:</p>
              <ul className="list-disc leading-loose pl-4 font-semibold text-neutral-600">
                <li className="text-red-700">Abuja courier pathway experiencing flash highway detours due to Lokoja river overflows. Relogging ETAs dynamically.</li>
                <li>Lagoon traffic warning: Peak congestion predicted along Lekki tollgate paths between 4:00 PM and 7:00 PM.</li>
              </ul>
            </div>
          </div>

          {/* ⚡ Platform Admin Flash Sale Audit Console */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden text-left">
            <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-orange-50/20 select-none animate-fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500 fill-orange-500" />
                <p className="font-extrabold text-sm text-neutral-850 tracking-tight">Flash Sale Proposal Inbox (Awaiting Admin Audit)</p>
              </div>
              <span className="text-[10px] bg-orange-100 font-bold text-orange-850 border border-orange-200 px-2.5 py-1 rounded">Subject to Admin Approval</span>
            </div>

            <div className="p-6">
              {flashDeals.filter(fd => fd.status === "pending").length === 0 ? (
                <div className="py-6 text-center text-neutral-500 font-semibold text-xs flex flex-col items-center justify-center space-y-2">
                  <div className="w-10 h-10 bg-emerald-50 rounded-full border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span>All active vendor flash sale proposal queues are fully audited and cleared.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {flashDeals.filter(fd => fd.status === "pending").map((fd) => (
                    <div key={fd.id} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-150 flex flex-col justify-between gap-4">
                      <div className="flex gap-3 text-left">
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-white border border-neutral-200 flex-shrink-0 shadow-xs">
                          <img src={fd.productImage} alt={fd.productName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold uppercase text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded">
                            {fd.vendorName}
                          </span>
                          <h4 className="text-xs font-black text-neutral-900 line-clamp-1 truncate">{fd.productName}</h4>
                          <p className="text-[10px] text-neutral-500">Proposed timeframe: <span className="font-extrabold text-neutral-700">{fd.timeFrame}</span></p>
                          <div className="flex items-center gap-2 pt-1 text-xs">
                            <span className="line-through text-neutral-400">{formatNaira(fd.priceBefore)}</span>
                            <span className="text-orange-600 font-black">{formatNaira(fd.priceAfter)}</span>
                            <span className="text-[9px] bg-red-50 text-red-600 font-extrabold px-1 rounded">₦{fd.reducedAmount} OFF</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-neutral-200/60">
                        <button
                          onClick={() => onApproveFlashDeal(fd.id)}
                          className="flex-1 py-12 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1 !py-2.5 shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Approve &amp; Publish</span>
                        </button>
                        <button
                          onClick={() => onRejectFlashDeal(fd.id)}
                          className="py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Orders log database table list with actions */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/55 select-none">
              <p className="font-extrabold text-sm text-neutral-800 tracking-tight">Recent Direct Order Dispatches</p>
              <span className="text-[10px] bg-neutral-200 font-bold text-neutral-600 px-2 py-1 rounded">Telemetry database Logs</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left" id="order-logs-table">
                <thead className="bg-neutral-50 text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-100">
                  <tr>
                    <th className="px-6 py-3.5">Order ID</th>
                    <th className="px-6 py-3.5">Shopper Name</th>
                    <th className="px-6 py-3.5">Status Check</th>
                    <th className="px-6 py-3.5">Naira value</th>
                    <th className="px-6 py-3.5 text-right font-bold">Order Audit Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium font-sans">
                  {vendorOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-neutral-50/50">
                      <td className="px-6 py-4 font-bold text-neutral-800 text-[11px] font-mono">{o.id}</td>
                      <td className="px-6 py-4 text-neutral-705">{o.customerName}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-block font-extrabold text-[10px] uppercase px-2 py-0.5 rounded border ${
                          o.status === "Delivered" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          o.status === "Shipped" ? "bg-blue-50 text-blue-600 border-blue-105" :
                          o.status === "Flagged" ? "bg-red-50 text-red-600 border-red-101 animate-pulse" :
                          "bg-yellow-50 text-yellow-600 border-yellow-101"
                        }`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-neutral-700">{formatNaira(o.value)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end space-x-1.5 select-none">
                          {o.status === "Flagged" ? (
                            <button
                              onClick={() => {
                                onReviewOrderFlag(o.id, "Shipped");
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition-colors"
                            >
                              Audit Approve
                            </button>
                          ) : (
                            <button
                              disabled={o.status === "Delivered"}
                              onClick={() => {
                                onReviewOrderFlag(o.id, "Flagged");
                              }}
                              className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-[10px] rounded-lg disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
                            >
                              Hold / Flag
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {vendorOrders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-neutral-400 text-xs font-semibold">
                        No orders currently registered for your products in the transaction ledger.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Vendor Reputation Section */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/55 select-none animate-fade-in">
              <p className="font-extrabold text-sm text-neutral-800 tracking-tight">Active Vendor Trust Indexes & Completed Dispatches</p>
              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2.5 py-1 rounded">Dynamic Star Rating Averages</span>
            </div>

            {/* Live Email Approval Toast */}
            {approvalFeedback && (
              <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100 text-xs text-emerald-800 font-semibold animate-fade-in flex items-center justify-between">
                <span>{approvalFeedback}</span>
                <button onClick={() => setApprovalFeedback(null)} className="text-emerald-550 hover:text-emerald-800 font-bold">dismiss</button>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-100">
                  <tr>
                    <th className="px-6 py-3.5">Vendor / Hub ID</th>
                    <th className="px-6 py-3.5">Managing Partner</th>
                    <th className="px-6 py-3.5">Operational Center</th>
                    <th className="px-6 py-3.5">Feedback Weight</th>
                    <th className="px-6 py-3.5">Reputation Index</th>
                    <th className="px-6 py-3.5 text-right">Approval Alerts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {vendorsList.map((v) => (
                    <tr key={v.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-700 font-mono font-black text-xs flex items-center justify-center">
                            {v.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-neutral-800">{v.name}</p>
                            <p className="text-[9px] text-neutral-400 font-mono font-bold uppercase">{v.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-neutral-700">{v.ownerName}</td>
                      <td className="px-6 py-4 text-neutral-500">{v.location}</td>
                      <td className="px-6 py-4 text-neutral-450">{v.ratingCount || 10} verified submissions</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-sm text-amber-600 font-mono">{v.rating.toFixed(1)} ★</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <svg
                                key={s}
                                className={`w-3 h-3 ${s <= Math.round(v.rating) ? "text-amber-400 fill-amber-400" : "text-neutral-200"}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleSendVendorApprovalEmail(v.email, v.name)}
                          className="font-sans px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 font-bold text-[10px] rounded-lg border border-orange-200 transition-colors inline-flex items-center space-x-1"
                        >
                          <Mail className="w-3 h-3" />
                          <span>Approve &amp; Send email</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* User & Staff Credentials Column list */}
          <div className="bg-white border border-neutral-155 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight border-b border-neutral-50 pb-2">
              Privileged Administrator Credentials & 2FA Toggles
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MOCK_TEAM_MEMBERS.map((worker) => (
                <div key={worker.id} className="p-4 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-950 text-emerald-300 font-extrabold flex items-center justify-center font-mono select-none">
                      {worker.initials}
                    </div>
                    <div className="text-left font-sans">
                      <p className="font-extrabold text-neutral-900">{worker.name}</p>
                      <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">{worker.role}</p>
                    </div>
                  </div>

                  <div className="text-right space-y-1 font-mono">
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider ${
                      worker.status === "Online" ? "text-emerald-600" :
                      worker.status === "Away" ? "text-amber-500" : "text-neutral-400"
                    }`}>
                      ● {worker.status}
                    </span>
                    <p className="text-[9px] text-neutral-400 font-semibold">2FA: {worker.twoFactorEnabled ? "Active" : "Disabled"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Taxonomy Manager: Categories & Subcategories Administration */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
            <div className="px-6 py-4.5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/55 select-none">
              <div>
                <p className="font-extrabold text-sm text-neutral-800 tracking-tight text-left">Category & Subcategory Taxonomy Management</p>
                <p className="text-[10px] text-neutral-450 mt-0.5 text-left font-semibold">Define core marketplace categories, icons, and nested brand or variant subcategories</p>
              </div>
              <span className="text-[9px] bg-emerald-900 font-extrabold text-white px-2.5 py-1 rounded uppercase tracking-wider">Marketplace Schema</span>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Form builders */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Form 1: Add Category */}
                <form onSubmit={handleAddCategory} className="bg-neutral-50 p-4 border border-neutral-150 rounded-xl space-y-3 text-left">
                  <h4 className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider flex items-center space-x-1.5 mb-2">
                    <Database className="w-3.5 h-3.5 text-orange-500" />
                    <span>Create Parent Category</span>
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-450 block">Category Name *</label>
                    <input
                      type="text"
                      required
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-white outline-none focus:ring-1.5 focus:ring-neutral-900 font-semibold"
                      placeholder="e.g. Computers"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-450 block">Short Description</label>
                    <input
                      type="text"
                      value={newCatDesc}
                      onChange={(e) => setNewCatDesc(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-white outline-none focus:ring-1.5 focus:ring-neutral-900 font-medium"
                      placeholder="e.g. Laptops, desktops and accessories"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-450 block">Lucide Icon Representation</label>
                    <select
                      value={newCatIcon}
                      onChange={(e) => setNewCatIcon(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 bg-white rounded-lg text-xs outline-none focus:ring-1.5 focus:ring-neutral-900 font-bold"
                    >
                      <option value="Package">Package</option>
                      <option value="Laptop">Laptop</option>
                      <option value="Shirt">Shirt</option>
                      <option value="Home">Home</option>
                      <option value="Sparkles">Sparkles</option>
                      <option value="Sliders">Sliders</option>
                      <option value="Megaphone">Megaphone</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer text-center"
                  >
                    + Create Category
                  </button>
                </form>

                {/* Form 2: Add Subcategory */}
                <form onSubmit={handleAddSubcategory} className="bg-neutral-50 p-4 border border-neutral-150 rounded-xl space-y-3 text-left">
                  <h4 className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider flex items-center space-x-1.5 mb-2">
                    <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Add nested subcategory</span>
                  </h4>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-450 block">Select Parent Category *</label>
                    <select
                      required
                      value={selectedParentId}
                      onChange={(e) => setSelectedParentId(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 bg-white rounded-lg text-xs outline-none focus:ring-1.5 focus:ring-neutral-900 font-bold"
                    >
                      <option value="">-- Choose Category --</option>
                      {localCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-450 block">Subcategory Name *</label>
                    <input
                      type="text"
                      required
                      value={newSubcatName}
                      onChange={(e) => setNewSubcatName(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-white outline-none focus:ring-1.5 focus:ring-neutral-900 font-semibold"
                      placeholder="e.g. Dell (for laptops) or iPhone (for phones)"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer text-center"
                  >
                    + Nest Subcategory
                  </button>
                </form>

              </div>

              {/* Right Column: Taxonomy Grid mapping with delete actions */}
              <div className="lg:col-span-7 space-y-4">
                <h4 className="text-xs font-extrabold uppercase text-neutral-400 tracking-wider text-left pl-1">
                  Active Marketplace schema tree ({localCategories.length})
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {localCategories.map((cat) => (
                    <div key={cat.id} className="border border-neutral-150 rounded-xl p-4 bg-white shadow-xs flex flex-col justify-between text-left relative min-h-[140px]">
                      
                      {/* Delete parent action */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${cat.name}" category and all its nested subcategories?`)) {
                            handleDeleteCategory(cat.id);
                          }
                        }}
                        className="absolute top-3 right-3 text-neutral-350 hover:text-red-500 transition-colors w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 cursor-pointer"
                        title="Delete category"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-100">
                            {cat.iconName}
                          </span>
                        </div>
                        <h5 className="font-extrabold text-xs text-neutral-900 pr-5">{cat.name}</h5>
                        <p className="text-[10px] text-neutral-400 leading-normal line-clamp-2">{cat.description}</p>
                      </div>

                      {/* Subcategories bullet pills block */}
                      <div className="mt-4 pt-3 border-t border-neutral-105">
                        <p className="text-[9px] font-black uppercase text-neutral-400 tracking-wider mb-2">Nested Subcategories:</p>
                        {cat.subcategories && cat.subcategories.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {cat.subcategories.map((sub) => (
                              <span
                                key={sub}
                                className="inline-flex items-center bg-neutral-100 text-neutral-700 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-neutral-150 hover:border-red-200 hover:bg-red-50/50 group cursor-pointer transition-colors"
                                onClick={() => {
                                  if (confirm(`Remove subcategory "${sub}" from "${cat.name}"?`)) {
                                    handleDeleteSubcategory(cat.id, sub);
                                  }
                                }}
                                title="Click to remove subcategory"
                              >
                                <span>{sub}</span>
                                <span className="ml-1 text-[8px] text-neutral-400 hover:text-red-500 font-extrabold">&times;</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[9px] text-neutral-400 italic font-medium">No nested subcategories defined yet.</p>
                        )}
                      </div>

                    </div>
                  ))}
                </div>

              </div>
              
            </div>
          </div>

        </div>
      )}

      {/* ---------------- C. RESEND AUTOMATION PANEL ---------------- */}
      {adminTab === "emails" && (
        <React.Fragment>
          {/* Internal state managers inside the emails tab scope */}
          <EmailAutomationTabContent
            orders={orders}
            mailLogs={mailLogs}
            autoSendEmails={autoSendEmails}
            onToggleAutoSend={onToggleAutoSend}
            onSendTestEmail={onSendTestEmail}
            onRefreshMailLogs={onRefreshMailLogs}
            userEmail={userEmail}
          />
        </React.Fragment>
      )}

      {/* ---------------- D. COMMISSION TAB ---------------- */}
      {adminTab === "commissions" && (
        <CommissionAnalyticsTab products={products} vendors={vendorsList} orders={orders} />
      )}

      {/* ---------------- E. ADS TAB ---------------- */}
      {adminTab === "ads" && (
        <AdsManagementTab />
      )}

    </div>
  );
}

// Separate component scope for Email Automation to avoid massive state bloat in master function
function EmailAutomationTabContent({
  orders,
  mailLogs,
  autoSendEmails,
  onToggleAutoSend,
  onSendTestEmail,
  onPreviewEmail,
  onRefreshMailLogs,
  userEmail
}: {
  orders: Order[];
  mailLogs: any[];
  autoSendEmails: boolean;
  onToggleAutoSend: () => void;
  onSendTestEmail?: (to: string, type: string, orderId: string) => Promise<any>;
  onPreviewEmail?: (type: string, orderId: string) => Promise<string | null>;
  onRefreshMailLogs: () => void;
  userEmail: string;
}) {
  const [testRecipient, setTestRecipient] = useState(userEmail);
  const [testMailType, setTestMailType] = useState<string>("payment_confirmation");
  const [testOrderId, setTestOrderId] = useState(orders[0]?.id || "NS-9942");
  const [isDispatching, setIsDispatching] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [selectedPreviewLog, setSelectedPreviewLog] = useState<any | null>(null);
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);

  // Sync recipient state when user changes email in App
  React.useEffect(() => {
    setTestRecipient(userEmail);
  }, [userEmail]);

  const triggerPreview = async () => {
    if (!onPreviewEmail) return;
    setIsPreviewing(true);
    setLocalFeedback(null);
    try {
      const html = await onPreviewEmail(testMailType, testOrderId);
      if (html) {
        setPreviewHtml(html);
        setLocalFeedback(`green:Generated preview for "${testMailType}" template.`);
      } else {
        setLocalFeedback(`red:Failed to generate preview.`);
      }
    } catch (err: any) {
      setLocalFeedback(`red:Error generating preview: ${err.message}`);
    } finally {
      setIsPreviewing(false);
    }
  };

  const triggerDirectFire = async () => {
    if (!testRecipient) {
      setLocalFeedback("⚠️ Recipient email is required!");
      return;
    }
    if (!onSendTestEmail) return;

    setIsDispatching(true);
    setLocalFeedback(null);
    try {
      const response = await onSendTestEmail(testRecipient, testMailType, testOrderId);
      if (response && response.success) {
        setLocalFeedback(`green:Successfully dispatched "${testMailType}" structure to ${testRecipient}!`);
      } else {
        setLocalFeedback(`red:Dispatch error: ${response?.error || "Unknown network transport error"}`);
      }
    } catch (err: any) {
      setLocalFeedback(`red:${err.message || "Failed dispatch chain"}`);
    } finally {
      setIsDispatching(false);
      onRefreshMailLogs();
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Resend connection and settings bar */}
      <div className="bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-orange-100 rounded-xl text-orange-600 block">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-neutral-900 text-base flex items-center space-x-2">
                <span>Resend Gateway Core Integration</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-100 text-emerald-850 font-black uppercase tracking-wider">
                  Live Engine
                </span>
              </h3>
              <p className="text-[11px] text-neutral-450 mt-0.5">
                Transactional messaging framework synced to local sales checkouts and direct dispatcher operations.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-950">Auto-Email Service</span>
            <button
              onClick={onToggleAutoSend}
              className="focus:outline-none transition-transform active:scale-95"
            >
              <div className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${autoSendEmails ? "bg-orange-500" : "bg-neutral-300"}`}>
                <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${autoSendEmails ? "translate-x-6" : "translate-x-0"}`} />
              </div>
            </button>
          </div>
          <p className="text-[10px] text-neutral-600 leading-relaxed">
            {autoSendEmails 
              ? "Emails will automatically fire to customers when payments settle or order tracking updates are written." 
              : "Auto-trigger is suspended. Transactions will log locally only."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 2. Manual Dispatcher form tool */}
        <div className="bg-white border border-neutral-155 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-neutral-50 pb-2 flex justify-between items-center">
              <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-orange-500" />
                <span>Operational Delivery Sandbox</span>
              </h3>
              <span className="text-[10px] font-extrabold uppercase text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md">test suite</span>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed">
              Use this sandbox form to manually trigger transactional emails via the Resend backend server. Put in your own real email to test actual delivery!
            </p>

            <div className="space-y-3 pt-2 text-xs">
              
              {/* Recipient Input */}
              <div className="space-y-1">
                <label className="font-bold text-neutral-500 uppercase tracking-wide">Recipient Email (Send to your inbox!)</label>
                <div className="relative">
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="e.g. shopper@gmail.com"
                    className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                  />
                  <Mail className="w-4.5 h-4.5 text-neutral-450 absolute right-4 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Template selector */}
              <div className="space-y-1">
                <label className="font-bold text-neutral-500 uppercase tracking-wide">Select Email Layout Template</label>
                <select
                  value={testMailType}
                  onChange={(e: any) => setTestMailType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-neutral-700"
                >
                  <optgroup label="Customer Onboarding">
                    <option value="welcome">Welcome Email (User Signup)</option>
                    <option value="first_login">First Login Confirmation</option>
                  </optgroup>
                  <optgroup label="Account Security">
                    <option value="confirm_email">Email Verification Required</option>
                    <option value="password_reset">Account Recovery (Password Reset)</option>
                  </optgroup>
                  <optgroup label="E-Commerce Flows">
                    <option value="payment_confirmation">Invoice Paid (Payment Successful)</option>
                    <option value="delivery_confirmation">Order Shipped & Out for Dispatch</option>
                    <option value="status_change">Generic Order Status Update</option>
                  </optgroup>
                  <optgroup label="Vendor Administration">
                    <option value="vendor_signup">Vendor Registration Received</option>
                    <option value="vendor_approved">Vendor Approved</option>
                    <option value="flagged">⚠️ Security Risk Alert (Compliance Review)</option>
                  </optgroup>
                </select>
              </div>

              {/* Order mapper */}
              <div className="space-y-1">
                <label className="font-bold text-neutral-500 uppercase tracking-wide">Bind to Order Context Reference</label>
                <select
                  value={testOrderId}
                  onChange={(e) => setTestOrderId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold text-neutral-700 font-mono"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.id} - {o.customerName} (₦{o.value.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          <div className="pt-6 space-y-3">
            {localFeedback && (
              <div className={`p-3 rounded-xl border text-[11px] font-bold ${
                localFeedback.startsWith("green:") 
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                  : "bg-red-50 text-red-800 border-red-200"
              }`}>
                {localFeedback.replace("green:", "").replace("red:", "")}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={triggerPreview}
                disabled={isPreviewing}
                className="flex-1 py-3 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-800 font-extrabold uppercase rounded-xl tracking-wider text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50"
              >
                {isPreviewing ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-neutral-500" />
                ) : (
                  <Eye className="w-4 h-4 text-neutral-500" />
                )}
                <span>Preview Template HTML</span>
              </button>

              <button
                onClick={triggerDirectFire}
                disabled={isDispatching}
                className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-extrabold uppercase rounded-xl tracking-wider text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-md disabled:opacity-50"
              >
                {isDispatching ? (
                  <React.Fragment>
                    <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
                    <span>Transmitting...</span>
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <Send className="w-4 h-4 text-orange-400" />
                    <span>Send Payload</span>
                  </React.Fragment>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Preview Modal Overlay (rendered conditionally) */}
        {previewHtml && (
          <div className="fixed inset-0 z-[100] bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden relative">
              <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50 shrink-0">
                <h3 className="font-extrabold text-neutral-800 text-sm flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-orange-500" />
                  <span>Email Layout Preview</span>
                </h3>
                <button
                  onClick={() => setPreviewHtml(null)}
                  className="p-1 px-3 bg-white border border-neutral-200 text-neutral-500 hover:bg-neutral-100 rounded-lg text-xs font-bold transition-colors"
                >
                  Close Preview
                </button>
              </div>
              <div className="p-0 flex-1 overflow-auto bg-neutral-50 relative">
                <iframe
                  title="Email Preview"
                  sandbox="allow-same-origin allow-scripts"
                  srcDoc={previewHtml}
                  className="w-full min-h-[500px] border-0"
                />
              </div>
            </div>
          </div>
        )}

        {/* 3. Help guidelines / documentation */}
        <div className="bg-white border border-neutral-155 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="border-b border-neutral-50 pb-2 flex justify-between items-center">
            <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-orange-500" />
              <span>Fullstack Automation System Guide</span>
            </h3>
            <span className="text-[10px] font-extrabold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Direct Delivery</span>
          </div>

          <p className="text-xs text-neutral-500 leading-normal">
            Naija Online Stores incorporates high fidelity server-side email dispatch automation with <strong className="text-neutral-800">Resend</strong>. All dispatches keep your microcredentials perfectly encrypted and protected in backend node processes.
          </p>

          <div className="space-y-3.5 text-xs">
            <div className="flex space-x-3 items-start">
              <span className="w-5 h-5 bg-orange-100 rounded-full text-orange-700 font-bold text-[10px] flex items-center justify-center mt-0.5">1</span>
              <div>
                <strong className="text-neutral-950 font-extrabold block">Optimized Simulated Sandbox</strong>
                <p className="text-neutral-400 text-[11px] leading-relaxed mt-0.5">
                  If the <code className="font-mono bg-neutral-100 px-1 rounded text-orange-600">RESEND_API_KEY</code> is unconfigured, the pipeline operates in client-side high fidelity fallback simulation. No emails are fired, but detailed transaction logs generate within the server database!
                </p>
              </div>
            </div>

            <div className="flex space-x-3 items-start">
              <span className="w-5 h-5 bg-orange-100 rounded-full text-orange-700 font-bold text-[10px] flex items-center justify-center mt-0.5">2</span>
              <div>
                <strong className="text-neutral-950 font-extrabold block">Dynamic Checkouts Setup</strong>
                <p className="text-neutral-400 text-[11px] leading-relaxed mt-0.5">
                  Every time a payer clears Paystack settlements inside our basket, Resend instantly formats premium metadata with country colorways to notify the buyer of receipt status.
                </p>
              </div>
            </div>

            <div className="flex space-x-3 items-start">
              <span className="w-5 h-5 bg-orange-100 rounded-full text-orange-700 font-bold text-[10px] flex items-center justify-center mt-0.5">3</span>
              <div>
                <strong className="text-neutral-950 font-extrabold block">Unlock Real Delivery</strong>
                <p className="text-neutral-400 text-[11px] leading-relaxed mt-0.5">
                  Paste your actual <code className="font-mono bg-neutral-100 px-1 rounded text-orange-600">re_abc...</code> token inside AI Studio Secrets menu, specify your email as the recipient, and receive beautiful physical transactional emails on your phone!
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. Real-time Transmission Feed Logs */}
      <div className="bg-white border border-neutral-155 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-neutral-50 flex flex-wrap justify-between items-center gap-4">
          <div className="text-left">
            <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-orange-500" />
              <span>System Mail Dispatch Logs</span>
            </h3>
            <p className="text-[11px] text-neutral-400 mt-0.5">Real-time status indexes recorded from latest transactions.</p>
          </div>
          <button
            onClick={onRefreshMailLogs}
            className="p-1 px-3 border border-neutral-200 hover:bg-neutral-50 font-bold text-neutral-700 rounded-xl text-[10px] uppercase tracking-wide flex items-center space-x-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-neutral-500" />
            <span>Refresh Mail Feed</span>
          </button>
        </div>

        {mailLogs.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-400 space-y-2">
            <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
              <Mail className="w-5 h-5" />
            </div>
            <p className="font-bold text-neutral-750">No mails transmitted in this session yet.</p>
            <p className="max-w-sm mx-auto text-[11px]">Deploy an order payment or status shift in the marketplace to trigger autonomous live emails from our Resend engine.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-neutral-50 text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-100 select-none">
                <tr>
                  <th className="px-6 py-3.5">Log Reference ID</th>
                  <th className="px-6 py-3.5">Recipient Address</th>
                  <th className="px-6 py-3.5">Subject Heading</th>
                  <th className="px-6 py-3.5">Transmission Mode</th>
                  <th className="px-6 py-3.5">Size/Time</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {mailLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-neutral-500">
                      {log.id}
                    </td>
                    <td className="px-6 py-4 text-neutral-800">
                      <span className="font-bold">{log.to}</span>
                      <span className="text-[10px] text-neutral-400 block font-mono">Order Ref: {log.orderId || "N/A"}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-neutral-700">
                      <span className="truncate max-w-[200px] inline-block">{log.subject}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase ${
                        log.status === "Delivered" 
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                          : log.status === "Simulated" 
                            ? "bg-amber-100 text-amber-800 border border-amber-200" 
                            : "bg-red-100 text-red-800 border border-red-200"
                      }`}>
                        {log.status === "Delivered" ? "● Inbox Delivered" : log.status === "Simulated" ? "◉ Simulated Flow" : "✖ Failed Transmit"}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-neutral-450 leading-tight">
                      <div>{(log.bodyLength / 1024).toFixed(1)} kb</div>
                      <div className="text-[9px] text-neutral-400 mt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedPreviewLog(log)}
                        className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold rounded-lg text-[10px] transition-all cursor-pointer"
                      >
                        Preview Draft Markup
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Render HTML mock preview inside a clean premium overlay modal sheet */}
      {selectedPreviewLog && (
        <div className="fixed inset-0 z-110 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-950/60 backdrop-blur-xs" onClick={() => setSelectedPreviewLog(null)} />
          <div className="relative w-full max-w-3xl bg-neutral-100 rounded-3xl overflow-hidden shadow-2xl border border-neutral-300 flex flex-col h-[85vh]">
            <div className="bg-white p-4 border-b border-neutral-200 flex justify-between items-center text-left">
              <div>
                <h4 className="font-extrabold text-neutral-950 text-sm">Resend Interactive Template Sandbox View</h4>
                <p className="text-[11px] text-neutral-400 font-mono mt-0.5">Subject: {selectedPreviewLog.subject}</p>
              </div>
              <button
                onClick={() => setSelectedPreviewLog(null)}
                className="p-1 rounded-full bg-neutral-100 hover:bg-neutral-250 cursor-pointer"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            {/* Quick stats on the simulation layout */}
            <div className="bg-orange-50/70 border-b border-orange-100 p-3 text-left flex gap-1.5 text-[10px] text-orange-950">
              <span className="font-bold">Dispatch Recipient:</span>
              <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-orange-150 font-extrabold text-orange-850">{selectedPreviewLog.to}</span>
              <span className="font-bold ml-3">Delivery Status:</span>
              <span className="font-mono bg-white px-1.5 py-0.2 rounded border border-orange-150 font-extrabold text-orange-850">{selectedPreviewLog.status}</span>
              <span className="ml-auto text-neutral-400">Close sheet to edit payload parameters</span>
            </div>

            <div className="flex-1 bg-white overflow-hidden p-6 relative">
              <iframe
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                    <body style="margin:0; padding:0; background-color:#f1f5f9;">
                      ${thisHtmlBody(selectedPreviewLog.type, selectedPreviewLog.orderId, selectedPreviewLog.to, selectedPreviewLog.subject)}
                    </body>
                  </html>
                `}
                className="w-full h-full border-none rounded-xl bg-slate-50"
                title="Resend Mail Render Output"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Inline fallback renderer for client preview iframe in absolute high fidelity match to backend
function thisHtmlBody(type: string, orderId: string, to: string, subject: string): string {
  const customerName = to.split("@")[0].toUpperCase() || "Shopper";
  const year = new Date().getFullYear();

  let heading = "Invoice Confirmed";
  let intro = `Hello <strong>${customerName}</strong>, your payment for order <strong>${orderId}</strong> has been cleared. Our secure payment gateway has successfully logged your order.`;
  let detailHtml = "";
  let accentColor = "#10b981";

  if (type === "payment_confirmation") {
    heading = "Payment Confirmed! ₦";
    detailHtml = `
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; margin-top: 15px; text-align: left;">
        <h4 style="margin: 0 0 10px 0; color: #0f172a; font-size: 14px;">Order Details</h4>
        <table style="width: 100%; font-size: 13px; color: #475569; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Order Reference:</td>
            <td style="padding: 4px 0; text-align: right; font-family: monospace;">${orderId}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Settlement Value (USD equivalent via Paystack):</td>
            <td style="padding: 4px 0; text-align: right; color: #10b981; font-weight: bold;">₦185,000.00</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Items Logged:</td>
            <td style="padding: 4px 0; text-align: right;">1 items</td>
          </tr>
        </table>
      </div>
    `;
  } else if (type === "delivery_confirmation") {
    heading = "Shipment Out for Delivery! 🚚";
    accentColor = "#f59e0b";
    intro = `Great news <strong>${customerName}</strong>! Your items from order <strong>${orderId}</strong> are actively in route. The merchant has securely packed and handed off your order.`;
    detailHtml = `
      <div style="background-color: #fffbeb; border-radius: 12px; padding: 16px; border: 1px solid #fef3c7; margin-top: 15px; text-align: left;">
        <h4 style="margin: 0 0 10px 0; color: #78350f; font-size: 14px;">Real-Time Tracking Information</h4>
        <div style="font-size: 13px; color: #475569; margin-bottom: 8px;">Your delivery parcel is in route to your delivery location. Watch live progress on the tracking map inside the web app.</div>
        <div style="text-align: center; margin-top: 10px;">
          <a href="#" style="background-color: #f59e0b; color: white; padding: 10px 18px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 12px; display: inline-block;">View Live Progress Map</a>
        </div>
      </div>
    `;
  } else if (type === "status_change") {
    heading = "Order Status Modified";
    accentColor = "#3b82f6";
    intro = `Hello <strong>${customerName}</strong>, the operational partner has updated the administrative state for your order <strong>${orderId}</strong>.`;
    detailHtml = `
      <div style="background-color: #f0fdf4; border-radius: 12px; padding: 16px; border: 1px solid #dcfce7; margin-top: 15px; text-align: left;">
        <table style="width: 100%; font-size: 13px; color: #475569;">
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Previous Status:</td>
            <td style="padding: 4px 0; text-align: right; text-decoration:line-through; color: #ef4444;">Processing</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">New Updated Status:</td>
            <td style="padding: 4px 0; text-align: right; color: #10b981; font-weight: bold; text-transform: uppercase;">SHIPPED</td>
          </tr>
        </table>
      </div>
    `;
  } else {
    heading = "Order Flagged for Fraud Audit";
    accentColor = "#ef4444";
    intro = `Dear <strong>${customerName}</strong>, your order <strong>${orderId}</strong> has hit one of our security triggers and has been flagged for audit.`;
    detailHtml = `
      <div style="background-color: #fef2f2; border-radius: 12px; padding: 16px; border: 1px solid #fee2e2; margin-top: 15px; text-align: left;">
        <h4 style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;">Compliance Review Queue</h4>
        <div style="font-size: 12px; color: #7f1d1d; line-height: 1.5;">Our operations intelligence department flagged this order for verification review. The order is placed on temporary hold pending team review.</div>
      </div>
    `;
  }

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 20px 10px; font-family: sans-serif;">
      <tr>
        <td align="center">
          <table width="100%" style="max-width: 550px; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <!-- Accent Color Bar -->
            <table width="100%" cellpadding="0" cellspacing="0" style="table-layout: fixed;">
              <tr>
                <td style="background-color: #008751; height: 6px; width: 33.3%;"></td>
                <td style="background-color: #ffffff; height: 6px; width: 33.3%;"></td>
                <td style="background-color: #008751; height: 6px; width: 33.3%;"></td>
              </tr>
            </table>

            <!-- Header banner -->
            <div style="background-color: #0f172a; padding: 25px; text-align: center;">
              <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #10b981; font-weight: 800; display: block; margin-bottom: 6px;">Naija Online Stores Elite Network</span>
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.025em;">Naija Online Stores</h1>
            </div>

            <!-- Content Area -->
            <div style="padding: 25px; text-align: left;">
              <h2 style="color: ${accentColor}; font-size: 18px; font-weight: 855; margin: 0 0 14px 0;">${heading}</h2>
              <p style="font-size: 13.5px; line-height: 1.6; color: #334155; margin-bottom: 15px;">${intro}</p>
              ${detailHtml}
            </div>

            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="font-size: 11px; color: #64748b; margin: 0;">Naija Online Stores Support</p>
              <p style="font-size: 9px; color: #94a3b8; margin: 5px 0 0 0;">© ${迫使年份()} Naija Online Stores.</p>
            </div>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function 迫使年份() {
  return new Date().getFullYear();
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function CommissionAnalyticsTab({ products, vendors, orders }: { products: Product[], vendors: Vendor[], orders: Order[] }) {
  const [filterCategory, setFilterCategory] = useState("All");

  const totalSales = orders.reduce((acc, order) => acc + order.value, 0);

  // Derive commissions from products linked to orders, using a mock average if exact linking is missing
  // Because our mock data structure limits how granular orders align with products, we generate aggregated estimates
  const totalCommission = Math.floor(products.reduce((acc, p) => acc + (p.price * (p.commissionPercentage || 5) / 100), 0) * (totalSales / Math.max(1, products.reduce((acc, p) => acc + p.price, 0))));
  const vendorEarnings = totalSales - totalCommission;
  const pendingPayouts = totalSales * 0.15; // Mock pending

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-neutral-900 tracking-tight">Commission & Earnings Dashboard</h2>
        <p className="text-xs text-neutral-500 font-semibold">Monitor vendor performance, commission cuts, and outstanding funds</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Sales Volume</p>
          <h3 className="text-2xl font-black text-neutral-900 tracking-tight mt-1">{formatNaira(totalSales)}</h3>
        </div>
        <div className="bg-emerald-50 p-5 border border-emerald-100 rounded-2xl shadow-xs">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Vendor Net Earnings</p>
          <h3 className="text-2xl font-black text-emerald-900 tracking-tight mt-1">{formatNaira(vendorEarnings)}</h3>
        </div>
        <div className="bg-orange-50 p-5 border border-orange-100 rounded-2xl shadow-xs">
          <p className="text-xs font-bold text-orange-600 uppercase tracking-wider">Platform Commission</p>
          <h3 className="text-2xl font-black text-orange-900 tracking-tight mt-1">{formatNaira(totalCommission)}</h3>
        </div>
        <div className="bg-neutral-50 p-5 border border-neutral-150 rounded-2xl shadow-xs">
          <p className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Pending Payouts</p>
          <h3 className="text-2xl font-black text-neutral-900 tracking-tight mt-1">{formatNaira(pendingPayouts)}</h3>
        </div>
      </div>
      
      <div className="bg-white border border-neutral-150 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center space-x-4 mb-4">
           <h3 className="text-sm font-bold text-neutral-800">Product Level Commissions</h3>
           <select 
             value={filterCategory} 
             onChange={(e) => setFilterCategory(e.target.value)}
             className="px-3 py-1.5 text-xs border border-neutral-200 rounded-lg outline-none font-bold"
           >
             <option value="All">All Categories</option>
             <option value="Phones">Phones</option>
             <option value="Cars">Cars</option>
             <option value="Phone Accessories">Phone Accessories</option>
             <option value="Fashion">Fashion</option>
           </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase tracking-widest text-[9px]">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Comm. %</th>
                <th className="px-4 py-3 rounded-r-xl text-right">Sys. Split</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {products
                .filter(p => filterCategory === "All" || p.category === filterCategory)
                .slice(0, 8)
                .map(product => {
                const commission = product.commissionPercentage || 5;
                const value = Math.floor(product.price * (commission / 100));
                return (
                  <tr key={product.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-neutral-800 max-w-[200px] truncate">{product.title}</td>
                    <td className="px-4 py-3 text-neutral-600">{product.category}</td>
                    <td className="px-4 py-3 text-neutral-600">{product.vendorName}</td>
                    <td className="px-4 py-3 font-mono">{formatNaira(product.price)}</td>
                    <td className="px-4 py-3 text-emerald-600 font-bold font-mono">{commission}%</td>
                    <td className="px-4 py-3 text-right font-black text-neutral-800 font-mono">{formatNaira(value)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdsManagementTab() {
  const [ads] = useState([
    { id: "a1", name: "Summer iPhone Splash", status: "Active", clicks: 1240, impressions: 45000, position: "Homepage", type: "Banner" },
    { id: "a2", name: "Fairly Used Cars Expo", status: "Scheduled", clicks: 0, impressions: 0, position: "Category: Cars", type: "Sidebar" },
    { id: "a3", name: "Fashion Week Promo", status: "Active", clicks: 4320, impressions: 120000, position: "Homepage", type: "Hero" },
    { id: "a4", name: "Phone Accessories Bundle", status: "Paused", clicks: 890, impressions: 15000, position: "Search Results", type: "Inline" }
  ]);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight">Advertisement Placement System</h2>
          <p className="text-xs text-neutral-500 font-semibold">Organize and monitor cross-platform marketing campaigns</p>
        </div>
        <button className="flex items-center space-x-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md">
          <PlusIcon className="w-4 h-4" />
          <span>New Ad Campaign</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs flex items-center justify-between">
           <div>
             <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Active Campaigns</p>
             <h3 className="text-2xl font-black text-emerald-600 tracking-tight">2</h3>
           </div>
           <Megaphone className="w-8 h-8 text-neutral-200" />
        </div>
        <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs flex items-center justify-between">
           <div>
             <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Total Impressions</p>
             <h3 className="text-2xl font-black text-neutral-900 tracking-tight font-mono">180,000</h3>
           </div>
           <Eye className="w-8 h-8 text-neutral-200" />
        </div>
        <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs flex items-center justify-between">
           <div>
             <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Click Through (Avg)</p>
             <h3 className="text-2xl font-black text-neutral-900 tracking-tight font-mono">3.8%</h3>
           </div>
           <PieChart className="w-8 h-8 text-neutral-200" />
        </div>
      </div>
      
      <div className="bg-white border border-neutral-150 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-neutral-800 mb-4">Ad Placement Roster</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
             <thead className="bg-neutral-50 text-neutral-500 font-bold uppercase tracking-widest text-[9px]">
               <tr>
                 <th className="px-4 py-3 rounded-l-xl">Campaign Name</th>
                 <th className="px-4 py-3">Location / Type</th>
                 <th className="px-4 py-3">Status</th>
                 <th className="px-4 py-3">Impressions</th>
                 <th className="px-4 py-3 rounded-r-xl text-right">Clicks</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-neutral-100">
               {ads.map(ad => (
                 <tr key={ad.id} className="hover:bg-neutral-50 transition-colors">
                   <td className="px-4 py-3 font-bold text-neutral-800">{ad.name}</td>
                   <td className="px-4 py-3 text-neutral-600 font-semibold">{ad.position} <span className="text-neutral-300 mx-1">|</span> {ad.type}</td>
                   <td className="px-4 py-3">
                     <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                        ad.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                        ad.status === 'Scheduled' ? 'bg-amber-100 text-amber-700' : 
                        'bg-neutral-100 text-neutral-600'
                     }`}>
                       {ad.status}
                     </span>
                   </td>
                   <td className="px-4 py-3 font-mono">{ad.impressions.toLocaleString()}</td>
                   <td className="px-4 py-3 text-right font-bold text-orange-500 font-mono">{ad.clicks.toLocaleString()}</td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
