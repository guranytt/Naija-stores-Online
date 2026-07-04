/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { DollarSign, Percent, TrendingUp, AlertCircle, Eye, BadgeAlert, Sparkles, Send, ShieldPlus, Check, ChevronRight, Ban, Mail, Sliders, RefreshCw, CheckCircle, Database, HelpCircle, X, Image as ImageIcon, UploadCloud, BarChart2, PieChart, Megaphone, BellRing, Package as PackageIcon, Share2, Pencil, Trash2, ChevronUp, ChevronDown, EyeOff } from "lucide-react";
import { Vendor, Order, AdminTeamMember, Product, Category, FlashDealProposal, Advertisement } from "../types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatNaira } from "../utils";
import { useStore } from "../store/useStore";
import { uploadToCloudinary, convertFileToBase64 } from "../cloudinaryService";
import SalesAnalyticsDashboard from "./SalesAnalyticsDashboard";
import DeliveryReportsDashboard from "./DeliveryReportsDashboard";
import DeliveryZonesManager from "./DeliveryZonesManager";
import { sendVendorApproval } from "../emailService";
import { requestPushPermissionAndSubscribe } from "../pushService";
import { supabase, saveSupabaseRecord, ensureUUID, getSupabaseData } from "../supabase";
import { sanitizeFields } from "../sanitize";
import GracefulErrorScreen from "./GracefulErrorScreen";


// Bulk Upload Product Parsers
function parseCSV(text: string) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return [];

  if (lines.length > 51) {
    throw new Error("Bulk upload limit exceeded. Maximum 50 products allowed per batch.");
  }

  // Detect header columns or standard order
  // Expect columns like: Title, Price, Stock, Category, Description, Condition, Commission
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const parsedProducts: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Split by comma while respecting quotes (simple safe regex or basic splitter)
    const rawCols = line.split(',');
    const cols = rawCols.map(c => {
      let val = c.trim();
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.substring(1, val.length - 1);
      }
      return val;
    });

    if (cols.length === 0 || !cols[0]) continue;

    let title = "";
    let price = 0;
    let stock = 0;
    let category = "Fashion";
    let description = "";
    let condition: "New" | "Fairly Used" = "New";
    let commissionPercentage = 5;

    if (headers.includes("title")) {
      const idx = headers.indexOf("title");
      title = cols[idx] || "";
    } else {
      title = cols[0] || "";
    }

    if (headers.includes("price")) {
      const idx = headers.indexOf("price");
      price = Number(cols[idx]) || 0;
    } else {
      price = Number(cols[1]) || 0;
    }

    if (headers.includes("stock")) {
      const idx = headers.indexOf("stock");
      stock = Number(cols[idx]) || 0;
    } else {
      stock = Number(cols[2]) || 0;
    }

    if (headers.includes("category")) {
      const idx = headers.indexOf("category");
      category = cols[idx] || "Fashion";
    } else if (cols[3]) {
      category = cols[3];
    }

    if (headers.includes("description")) {
      const idx = headers.indexOf("description");
      description = cols[idx] || "";
    } else if (cols[4]) {
      description = cols[4];
    }

    if (headers.includes("condition")) {
      const idx = headers.indexOf("condition");
      const condVal = (cols[idx] || "").toLowerCase();
      if (condVal.includes("used") || condVal.includes("fairly")) {
        condition = "Fairly Used";
      }
    } else if (cols[5]) {
      const condVal = cols[5].toLowerCase();
      if (condVal.includes("used") || condVal.includes("fairly")) {
        condition = "Fairly Used";
      }
    }

    if (headers.includes("commission") || headers.includes("commissionpercentage")) {
      const idx = headers.findIndex(h => h.includes("commission"));
      commissionPercentage = Number(cols[idx]) || 5;
    } else if (cols[6]) {
      commissionPercentage = Number(cols[6]) || 5;
    }

    if (title && price > 0) {
      parsedProducts.push({
        title,
        price,
        stock,
        category,
        description,
        condition,
        commissionPercentage,
        image: ""
      });
    }
  }

  return parsedProducts;
}

function parseJSONProducts(text: string) {
  try {
    const data = JSON.parse(text);
    const list = Array.isArray(data) ? data : [data];
    if (list.length > 50) {
      throw new Error("Bulk upload limit exceeded. Maximum 50 products allowed per batch.");
    }
    return list.map((item: any) => ({
      title: item.title || item.name || "",
      price: Number(item.price) || 0,
      stock: Number(item.stock) || Number(item.quantity) || 0,
      category: item.category || "Fashion",
      description: item.description || "",
      condition: item.condition === "Fairly Used" ? "Fairly Used" : "New",
      commissionPercentage: Number(item.commissionPercentage) || 5,
      image: item.image || item.image_url || ""
    })).filter((p: any) => p.title && p.price > 0);
  } catch (e) {
    throw new Error("Invalid products JSON format. Ensure it is a valid list matching the sample.");
  }
}

export default function VendorAdmin() {
  const {
    orders = [],
    products = [],
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
    categories = [],
    ads = [],
    deliveryZones = [],
    flashDeals = [],
  } = useStore();

  // Handlers that used to be passed down - stubbed or simplified for local component logic
  // These will be fully replaced when we move Supabase logic out of App.tsx
  const onReviewOrderFlag = () => {};
  const onPromptReceipt = () => {};
  const onAddNewProduct = () => {};
  const onUpdateProduct = () => {};
  const onDeleteProduct = () => {};
  const onUpdateVendor = () => {};
  const onUpdateCategories = () => {};
  const onUpdateAds = () => {};
  const onUpdateDeliveryZones = () => {};
  const onProposeFlashDeal = () => {};
  const onApproveFlashDeal = () => {};
  const onRejectFlashDeal = () => {};
  const onRefreshMailLogs = () => {};

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
  
    const activeVendor = validMatches.length > 0 ? validMatches.sort((a, b) => {
      let scoreA = (a.cacNumber ? 1 : 0) + (a.bankName ? 1 : 0) + ((a.name && a.name !== "My Store" && a.name !== "Naija Store Merchant") ? 2 : 0) + (a.location && a.location !== "Nigeria" ? 1 : 0);
      let scoreB = (b.cacNumber ? 1 : 0) + (b.bankName ? 1 : 0) + ((b.name && b.name !== "My Store" && b.name !== "Naija Store Merchant") ? 2 : 0) + (b.location && b.location !== "Nigeria" ? 1 : 0);
      return scoreB - scoreA;
    })[0] : fallbackVendor;
  
    const [adminTab, setAdminTab] = useState<"vendor" | "inventory" | "dashboard" | "delivery" | "platform" | "commissions" | "ads">("vendor");
  const [approvalFeedback, setApprovalFeedback] = useState<string | null>(null);
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);

  // Categories Master Admin Control block states
  const [localCategories, setLocalCategories] = useState<Category[]>(categories && categories.length ? categories : []);
  const [hasUnsavedCategoryChanges, setHasUnsavedCategoryChanges] = useState(false);
  const [isSavingCategories, setIsSavingCategories] = useState(false);
  const [isFetchingCategories, setIsFetchingCategories] = useState(false);

  React.useEffect(() => {
    let active = true;
    const fetchCats = async () => {
      setIsFetchingCategories(true);
      try {
        const { data, synced } = await getSupabaseData<Category>("categories", []);
        if (active && synced && data && data.length > 0) {
          const sorted = data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
          if (!hasUnsavedCategoryChanges) {
            setLocalCategories(sorted);
          }
        }
      } catch (err) {
        console.warn("fetch admin cats err", err);
      } finally {
        if (active) setIsFetchingCategories(false);
      }
    };
    if (adminTab === "platform") {
      fetchCats();
    }
    return () => { active = false; };
  }, [adminTab, hasUnsavedCategoryChanges]);

  React.useEffect(() => {
    if (categories && categories.length && !hasUnsavedCategoryChanges) {
      setLocalCategories(categories);
    }
  }, [categories, hasUnsavedCategoryChanges]);

  const handleUpdateCategoriesState = async (updated: Category[], autoSave = true) => {
    setLocalCategories(updated);
    if (autoSave && onUpdateCategories) {
      setIsSavingCategories(true);
      try {
        await onUpdateCategories(updated);
        setHasUnsavedCategoryChanges(false);
      } catch (e) {
        console.warn("Error auto-saving categories", e);
      } finally {
        setIsSavingCategories(false);
      }
    } else {
      setHasUnsavedCategoryChanges(true);
    }
  };

  const handleSaveCategoriesGlobal = async () => {
    if (!onUpdateCategories) return;
    setIsSavingCategories(true);
    try {
      await onUpdateCategories(localCategories);
      setHasUnsavedCategoryChanges(false);
      setLocalFeedback("Categories saved to database globally!");
      setTimeout(() => setLocalFeedback(null), 3000);
    } catch (err) {
      console.warn("Save categories err", err);
      setLocalFeedback("Error saving categories");
      setTimeout(() => setLocalFeedback(null), 3000);
    } finally {
      setIsSavingCategories(false);
    }
  };

  const handleDeleteVendor = async (vendorId: string, vendorName: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete vendor "${vendorName}" and scrub all their data? This action cannot be undone.`)) {
      return;
    }
    
    setApprovalFeedback("Scrubbing vendor data...");
    
    try {
      const { session } = (await supabase.auth.getSession()).data;
      const res = await fetch(`/api/admin/vendors/${vendorId}/delete`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session?.access_token}`,
        }
      });
      
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete vendor");
      
      setApprovalFeedback(`Successfully scrubbed vendor "${vendorName}". Refreshing data...`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setApprovalFeedback(`Error scrubbing vendor: ${err.message}`);
    }
  };

  const [newCatName, setNewCatName] = useState("");
  const [newCatId, setNewCatId] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("Package");
  
  const [selectedParentId, setSelectedParentId] = useState("");
  const [newSubcatName, setNewSubcatName] = useState("");
  
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryForm, setEditingCategoryForm] = useState<Partial<Category>>({});
  
  const handleSaveCategoryEdit = async (id: string) => {
    const updated = localCategories.map((c) => 
      c.id === id ? { ...c, ...editingCategoryForm } : c
    );
    await handleUpdateCategoriesState(updated, true);
    setEditingCategoryId(null);
    setEditingCategoryForm({});
  };

  const [newCatImageFile, setNewCatImageFile] = useState<File | null>(null);
  const [addingCategoryStatus, setAddingCategoryStatus] = useState<{ loading: boolean; type?: 'error' | 'success'; text: string }>({ loading: false, text: "" });

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingCategoryStatus({ loading: true, text: "" });

    if (!newCatName.trim()) {
      setAddingCategoryStatus({ loading: false, type: 'error', text: 'Category name is required.' });
      return;
    }

    const rawSlug = newCatName.toLowerCase().trim().replace(/[\s_]+/g, "-").replace(/[^\w\-]+/g, '').replace(/\-\-+/g, '-');
    const uuidId = newCatId.trim() ? ensureUUID(newCatId.trim()) : ensureUUID(rawSlug);
    
    let imageUrl: string | null = null;

    try {
      // 1. Upload Image to Supabase Storage (if a file was selected)
      if (newCatImageFile) {
        const fileExt = newCatImageFile.name.split('.').pop();
        const fileName = `${rawSlug}-${Date.now()}.${fileExt}`;
        const filePath = `category-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images') // Ensure this bucket exists and is set to "Public"
          .upload(filePath, newCatImageFile);

        if (uploadError) throw uploadError;

        // Retrieve the public URL
        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);
          
        imageUrl = publicUrlData.publicUrl;
      }

      // 2. Insert into Database directly using Supabase client
      const { error: insertError } = await supabase
        .from('categories')
        .insert([{ id: uuidId, name: newCatName.trim(), slug: rawSlug, image_url: imageUrl }]);

      if (insertError) {
        // Handle unique constraint violation for the slug
        if (insertError.code === '23505') {
          throw new Error(`A category with the slug "${rawSlug}" already exists.`);
        }
        throw insertError;
      }

      setAddingCategoryStatus({ loading: false, type: 'success', text: 'Category added successfully!' });
      
      const newCat: Category = {
        id: uuidId,
        categoryId: uuidId,
        name: newCatName.trim(),
        slug: rawSlug,
        description: newCatDesc.trim() || `${newCatName.trim()} description`,
        image: imageUrl || "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=60&w=600",
        iconName: newCatIcon,
        itemCount: 0,
        subcategories: []
      };

      const updated = [...localCategories, newCat];
      handleUpdateCategoriesState(updated);
      
      setNewCatName("");
      setNewCatId("");
      setNewCatDesc("");
      setNewCatIcon("Package");
      setNewCatImageFile(null);
      // Clear visual filename if necessary; file input doesn't clear value automatically without ref, but it's okay for now
      setTimeout(() => setAddingCategoryStatus({ loading: false, text: "" }), 3000);
    } catch (err: any) {
      setAddingCategoryStatus({ loading: false, type: 'error', text: err.message || 'An unexpected error occurred.' });
    }
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
        setApprovalFeedback(`🎉 Vendor approval email dispatched to ${email}!`);
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
  const [uploadMode, setUploadMode] = useState<"single" | "bulk">("single");
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [bulkParsedProducts, setBulkParsedProducts] = useState<any[]>([]);
  const [bulkIsDragging, setBulkIsDragging] = useState(false);
  const [bulkFileError, setBulkFileError] = useState("");
  const [bulkSuccessCount, setBulkSuccessCount] = useState<number | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("Fashion");
  const [proposingCategory, setProposingCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState("");
  const [proposingSubcategory, setProposingSubcategory] = useState(false);
  const [customSubcategoryName, setCustomSubcategoryName] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newDeliveryDays, setNewDeliveryDays] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newImage, setNewImage] = useState("");
  const [newCondition, setNewCondition] = useState<"New" | "Fairly Used">("New");
  const [newBrand, setNewBrand] = useState("");
  const [newFeatures, setNewFeatures] = useState("");
  const [newSpecifications, setNewSpecifications] = useState("");
  const [newExternalLink, setNewExternalLink] = useState("");
  const [newSeoTitle, setNewSeoTitle] = useState("");
  const [newSeoDescription, setNewSeoDescription] = useState("");
  const [newSearchKeywords, setNewSearchKeywords] = useState("");
  const [newProductTags, setNewProductTags] = useState("");
  const [newHighlights, setNewHighlights] = useState("");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState("");

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductForm, setEditingProductForm] = useState<Partial<Product>>({});
  const [isEditingUploading, setIsEditingUploading] = useState(false);

  // States for updating vendor profile and branding picture
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editShopName, setEditShopName] = useState(activeVendor.name && activeVendor.name !== "My Store" ? activeVendor.name : "");
  const [editDescription, setEditDescription] = useState(activeVendor.business_description || activeVendor.description || "");
  const [editOwnerName, setEditOwnerName] = useState(activeVendor.ownerName && activeVendor.ownerName !== "Vendor Owner" ? activeVendor.ownerName : "");
  const [editLocation, setEditLocation] = useState(activeVendor.location && activeVendor.location !== "Nigeria" ? activeVendor.location : "");
  const [editAvatar, setEditAvatar] = useState(activeVendor.avatar || "");
  const [editCacNumber, setEditCacNumber] = useState(activeVendor.cacNumber || userCacNumber || "");
  const [editWhatsapp, setEditWhatsapp] = useState(activeVendor.whatsappNumber || "");
  const [editBankName, setEditBankName] = useState(activeVendor.bankName || userBankName || "");
  const [editAccountNumber, setEditAccountNumber] = useState(activeVendor.accountNumber || userBankAccountNumber || "");
  const [isProfileUploading, setIsProfileUploading] = useState(false);
  const [profileUploadError, setProfileUploadError] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [saveProfileError, setSaveProfileError] = useState<string | null>(null);

  // States for Vendor Flash Deal Proposals
  const [fdProductId, setFdProductId] = useState("");
  const [fdReducedAmt, setFdReducedAmt] = useState("");
  const [fdTimeFrame, setFdTimeFrame] = useState("6 Hours Storefront Special");
  const [fdSuccess, setFdSuccess] = useState<string | null>(null);
  const [fdError, setFdError] = useState<string | null>(null);

  // vendor vars moved up

  const isMasterAdmin = ["adminnaijastoresonline@gmail.com", "mcgigimeshai@gmail.com"].includes(userEmail?.toLowerCase() || "");

  // Keep adminTab state synced if standard vendor tries to access platform tabs
  React.useEffect(() => {
    if (!isMasterAdmin && ["platform", "commissions", "ads"].includes(adminTab)) {
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

  // Fallback to activeVendor.salesToday if there's no dynamic order value yet, to ensure a smooth transition
  const last30DaysData = React.useMemo(() => {
    const data = [];
    const today = new Date();
    // Pre-fill the last 30 days with 0
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      data.push({ date: dayStr, value: 0, fullDate: d });
    }
    
    // Aggregate vendor orders
    vendorOrders.forEach(o => {
      const isCancelled = o.status === "Flagged" || (o.status as any) === "Cancelled" || (o.status as any) === "Returned";
      if (isCancelled) return;
      if (o.date) {
        const oDate = new Date(o.date);
        const timeDiff = today.getTime() - oDate.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        if (daysDiff >= 0 && daysDiff < 30) {
          const idx = 29 - daysDiff;
          if (data[idx]) {
            data[idx].value += o.value || 0;
          }
        }
      }
    });

    return data;
  }, [vendorOrders]);

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

  const handleOpenProfileModal = () => {
    if (activeVendor) {
      const finalStoreName = (activeVendor.name && activeVendor.name !== "My Store" && activeVendor.name !== "Naija Store Merchant") ? activeVendor.name : ((userStoreName && userStoreName !== "My Store" && userStoreName !== "Naija Store Merchant") ? userStoreName : "");
      setEditShopName(finalStoreName);
      setEditDescription(activeVendor.business_description || activeVendor.description || "");
      setEditOwnerName(activeVendor.ownerName && activeVendor.ownerName !== "Vendor Owner" ? activeVendor.ownerName : (userOwnerName && userOwnerName !== "Vendor Owner" ? userOwnerName : ""));
      setEditLocation(activeVendor.location && activeVendor.location !== "Nigeria" && activeVendor.location !== "Lagos Mainland, Lagos" ? activeVendor.location : (userLocation && userLocation !== "Nigeria" && userLocation !== "Lagos Mainland, Lagos" ? userLocation : ""));
      setEditAvatar(activeVendor.avatar || userAvatar || "");
      setEditCacNumber(activeVendor.cacNumber || userCacNumber || "");
      setEditWhatsapp(activeVendor.whatsappNumber || activeVendor.phone || userWhatsappNumber || "");
      setEditBankName(activeVendor.bankName || userBankName || "");
      setEditAccountNumber(activeVendor.accountNumber || userBankAccountNumber || "");
    }
    setShowEditProfileModal(true);
  };

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

  const handleSaveProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editShopName.trim()) return;

    setIsSavingProfile(true);
    setSaveProfileError(null);

    const compliantId = ensureUUID(activeVendor.id);
     const resolvedVendor: Vendor = sanitizeFields({
      ...activeVendor,
     id: compliantId,  // keep the vendor's own ID
      userId: currentUserId ? ensureUUID(currentUserId) : (activeVendor.userId ? ensureUUID(activeVendor.userId) : (activeVendor.user_id ? ensureUUID(activeVendor.user_id) : undefined)),
      user_id: currentUserId ? ensureUUID(currentUserId) : (activeVendor.user_id ? ensureUUID(activeVendor.user_id) : (activeVendor.userId ? ensureUUID(activeVendor.userId) : undefined)),
      name: editShopName,
      ownerName: editOwnerName,
      location: editLocation,
      avatar: editAvatar,
      cacNumber: editCacNumber,
      whatsappNumber: editWhatsapp,
      phone: editWhatsapp,
      email: userEmail || activeVendor.email || "",
      bankName: editBankName,
      accountNumber: editAccountNumber,
      bank_name: editBankName,
      account_number: editAccountNumber,
      business_name: editShopName,
owner_name: editOwnerName,
physical_location: editLocation,
logo_url: editAvatar,
cac_number: editCacNumber,
whatsapp_number: editWhatsapp,
business_description: editDescription,
description: editDescription
    });

    try {
      // Immediately perform a direct PATCH/UPSERT operation to Supabase on submission
      const success = await saveSupabaseRecord("vendors", resolvedVendor);
      if (!success) {
        throw new Error("Unable to save your store profile directly to the backend database.");
      }

      // Keep user connection updated via the same mechanism UserAuthHub uses
      if (currentUserId) {
        try {
          // Sync with Auth metadata
          await supabase.auth.updateUser({
            data: {
              shopName: editShopName,
              fullName: editOwnerName,
              phone: editWhatsapp,
              location: editLocation,
              cacNumber: editCacNumber,
              bankName: editBankName,
              accountNumber: editAccountNumber,
              cac_number: editCacNumber,
              bank_name: editBankName,
              account_number: editAccountNumber
            }
          });
          
          // Sync with public users table
          await supabase.from("users").upsert({
            id: currentUserId,
            full_name: editOwnerName,
            email: userEmail || activeVendor.email || ""
          });
        } catch (syncErr) {
          console.warn("Silent sync to users metadata failed:", syncErr);
        }
      }

      if (onUpdateVendor) {
        await onUpdateVendor(resolvedVendor);
      }
      setShowEditProfileModal(false);
    } catch (err: any) {
      setSaveProfileError(err.message || "An error occurred while saving your store branding choices.");
    } finally {
      setIsSavingProfile(false);
    }
  };
  const averageVendorRating = vendorsList.length > 0 ? (vendorsList.reduce((acc, curr) => acc + curr.rating, 0) / vendorsList.length) : 0;

  // Raw mock stats for platform view
  const platformStats = {
    totalGMV: orders.reduce((acc, curr) => acc + (curr.value || 0), 0),
    activeUsers: 0,
    activeVendors: vendorsList.length,
    pendingVerifications: 0
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



  const handleGenerateWithAI = async () => {
    if (!newTitle || !newCategory) {
      setAiError("Please provide at least a Product Title and Category to generate content.");
      return;
    }
    
    setIsGeneratingAI(true);
    setAiError("");

    try {
      // We assume user is authenticated and the token is valid, so we could pull the auth token, but we can also just call the API.
      // Wait, there is supabase getSession.
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      const res = await fetch("/api/generate-listing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUserId || "mock-user"),
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          productName: newTitle,
          category: proposingCategory ? customCategoryName : newCategory,
          brand: newBrand,
          features: newFeatures,
          specifications: newSpecifications,
          condition: newCondition
        })
      });

      if (!res.ok) {
        let errorMsg = "Failed to generate AI listing";
        try {
          const textData = await res.text();
          if (textData) {
            const errorData = JSON.parse(textData);
            errorMsg = errorData.error || errorMsg;
          }
        } catch(e) {
          console.warn("Error parsing AI error response", e);
        }
        throw new Error(errorMsg);
      }

      let data;
      try {
        const textData = await res.text();
        data = JSON.parse(textData);
      } catch(e) {
        throw new Error("Invalid response format from server");
      }
      
      if (data.productTitle) setNewTitle(data.productTitle);
      if (data.productDescription) setNewDesc(data.productDescription);
      if (data.keyFeatures && Array.isArray(data.keyFeatures)) setNewFeatures(data.keyFeatures.join("\n"));
      if (data.productHighlights && Array.isArray(data.productHighlights)) setNewHighlights(data.productHighlights.join(", "));
      if (data.specifications && Array.isArray(data.specifications)) {
        setNewSpecifications(data.specifications.map((s: any) => `${s.key}: ${s.value}`).join("\n"));
      }
      if (data.seoTitle) setNewSeoTitle(data.seoTitle);
      if (data.seoDescription) setNewSeoDescription(data.seoDescription);
      if (data.searchKeywords && Array.isArray(data.searchKeywords)) setNewSearchKeywords(data.searchKeywords.join(", "));
      if (data.productTags && Array.isArray(data.productTags)) setNewProductTags(data.productTags.join(", "));
      if (data.suggestedCategory && newCategory === "Fashion") setNewCategory(data.suggestedCategory);

    } catch (err: any) {
      setAiError(err.message || "Something went wrong generating your listing.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleGenerateWithAIForEdit = async () => {
    if (!editingProductForm.title || !editingProductForm.category) {
      alert("Please provide at least a Product Title and Category to generate content.");
      return;
    }
    
    setIsGeneratingAI(true);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      
      const res = await fetch("/api/generate-listing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": String(currentUserId || "mock-user"),
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          productName: editingProductForm.title,
          category: editingProductForm.category,
          brand: editingProductForm.brand,
          features: editingProductForm.highlights ? editingProductForm.highlights.join(", ") : undefined,
          specifications: editingProductForm.specifications,
          condition: editingProductForm.condition
        })
      });

      if (!res.ok) {
        let errorMsg = "Failed to generate AI listing";
        try {
          const textData = await res.text();
          if (textData) {
            const errorData = JSON.parse(textData);
            errorMsg = errorData.error || errorMsg;
          }
        } catch(e) {
          console.warn("Error parsing AI error response", e);
        }
        throw new Error(errorMsg);
      }

      let data;
      try {
        const textData = await res.text();
        data = JSON.parse(textData);
      } catch(e) {
        throw new Error("Invalid response format from server");
      }
      
      setEditingProductForm(prev => ({
        ...prev,
        title: data.productTitle || prev.title,
        description: data.productDescription || prev.description,
        category: (data.suggestedCategory && prev.category === "Fashion") ? data.suggestedCategory : prev.category,
        seoTitle: data.seoTitle || prev.seoTitle,
        seoDescription: data.seoDescription || prev.seoDescription,
        searchKeywords: data.searchKeywords ? data.searchKeywords : prev.searchKeywords,
        productTags: data.productTags ? data.productTags : prev.productTags,
        highlights: data.productHighlights ? data.productHighlights : prev.highlights,
        specifications: data.specifications ? data.specifications.map((s: any) => `${s.key}: ${s.value}`).join("\n") : prev.specifications
      }));
    } catch (err: any) {
      alert("Failed to generate AI Listing: " + err.message);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newPrice || !newStock) return;
    
    let resolvedCategory = newCategory;
    
    // Auto-create proposed category
    if (proposingCategory && customCategoryName.trim()) {
      resolvedCategory = customCategoryName.trim();
      const cat: import("../types").Category = {
        id: "cat_" + Date.now().toString(),
        name: resolvedCategory,
        description: "New category proposed by vendor: " + activeVendor.name,
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=500&q=80",
        iconName: "FolderHeart",
        itemCount: 0,
        subcategories: proposingSubcategory && customSubcategoryName.trim() ? [customSubcategoryName.trim()] : [],
        status: "pending"
      };
      const updated = [...localCategories, cat];
      handleUpdateCategoriesState(updated);
    } else if (proposingSubcategory && customSubcategoryName.trim() && !proposingCategory) {
      // Find existing category and add pending subcategory
      const updated = localCategories.map(c => {
         // Optionally you could add it immediately, or flag it.
         // For now, if they propose subcategory to existing category, just inject it locally.
         if (c.name === newCategory) {
           return { ...c, subcategories: [...c.subcategories, customSubcategoryName.trim()] };
         }
         return c;
      });
      handleUpdateCategoriesState(updated);
    }

    if (onAddNewProduct) {
      const activeCat = (categories || localCategories || []).find(c => c.name === resolvedCategory);
      const computedCommission = activeCat?.defaultCommissionPercentage ?? 5;
      const catId = activeCat?.categoryId || activeCat?.id;

      const prod: Product = sanitizeFields({
        id: "p_" + Date.now(),
        title: newTitle,
        description: newDesc || "High-quality item customized for Nigerian markets.",
        price: Number(newPrice),
        stock: Number(newStock),
        deliveryDays: newDeliveryDays ? Number(newDeliveryDays) : undefined,
        category: resolvedCategory,
        categoryId: catId,
        condition: newCondition,
        commissionPercentage: computedCommission,
        image: newImage || "https://lh3.googleusercontent.com/aida-public/AB6AXuBXHHRDhnfXAPzOsfwJAJsaalg4cWfRii5vBleuGOxKrptM-qmw3JgFBhmDSeXClxBlfi3YbQJiQs13dl3CJxFMTrEsoeKAI1JkXEckU88mcDf64zuwrUdWJW8NNuhXEbmbimeAKXSCpzoTENrA7IaXi3jzD_WCPb-on3IiWMAikNItCyKkPDuCIxGIIFS30rf-qvm-aGDzOiKqproxCid4Yu_VB_ycleJTW0iXWyz1WZUzAk_v-gZdvKW2YKJet89-kA4ee4AC0u9d",
        vendorId: activeVendor.id,
        vendorName: activeVendor.name,
        rating: 5.0,
        reviewsCount: 1,
        isNew: true,
        seoTitle: newSeoTitle,
        seoDescription: newSeoDescription,
        searchKeywords: newSearchKeywords ? newSearchKeywords.split(',').map(s => s.trim()) : [],
        productTags: newProductTags ? newProductTags.split(',').map(s => s.trim()) : [],
        highlights: newHighlights ? newHighlights.split(',').map(s => s.trim()) : [],
        specifications: newSpecifications,
        externalLink: newExternalLink,
        tags: newProductTags ? newProductTags.split(',').map(s => s.trim()) : []
      });
      onAddNewProduct(prod);
    }

    setNewTitle("");
    setNewPrice("");
    setNewStock("");
    setNewDeliveryDays("");
    setNewDesc("");
    setNewImage("");
    setNewCondition("New");
    setNewBrand("");
    setNewFeatures("");
    setNewSpecifications("");
    setNewExternalLink("");
    setNewSeoTitle("");
    setNewSeoDescription("");
    setNewSearchKeywords("");
    setNewProductTags("");
    setNewHighlights("");
    setProposingCategory(false);
    setProposingSubcategory(false);
    setCustomCategoryName("");
    setCustomSubcategoryName("");
    setUploadError("");
    setShowAddProductModal(false);
  };

  const handleBulkProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkParsedProducts.length === 0) {
      setBulkFileError("No valid products parsed to upload.");
      return;
    }

    if (onAddNewProduct) {
      const activeCats = categories || localCategories || [];
      bulkParsedProducts.forEach((parsedProd, index) => {
        const activeCat = activeCats.find(c => c.name === (parsedProd.category || "Fashion"));
        const computedCommission = activeCat?.defaultCommissionPercentage ?? 5;
        const catId = activeCat?.categoryId || activeCat?.id;

        const prod: Product = sanitizeFields({
          id: "p_" + (Date.now() + index),
          title: parsedProd.title,
          description: parsedProd.description || "High-quality item customized for Nigerian markets.",
          price: Number(parsedProd.price),
          stock: Number(parsedProd.stock) || 10,
          category: parsedProd.category || "Fashion",
          categoryId: catId,
          condition: parsedProd.condition || "New",
          commissionPercentage: computedCommission,
          image: parsedProd.image || "https://lh3.googleusercontent.com/aida-public/AB6AXuBXHHRDhnfXAPzOsfwJAJsaalg4cWfRii5vBleuGOxKrptM-qmw3JgFBhmDSeXClxBlfi3YbQJiQs13dl3CJxFMTrEsoeKAI1JkXEckU88mcDf64zuwrUdWJW8NNuhXEbmbimeAKXSCpzoTENrA7IaXi3jzD_WCPb-on3IiWMAikNItCyKkPDuCIxGIIFS30rf-qvm-aGDzOiKqproxCid4Yu_VB_ycleJTW0iXWyz1WZUzAk_v-gZdvKW2YKJet89-kA4ee4AC0u9d",
          vendorId: activeVendor.id,
          vendorName: activeVendor.name,
          rating: 5.0,
          reviewsCount: 1,
          isNew: true
        });
        onAddNewProduct(prod);
      });
    }

    setBulkSuccessCount(bulkParsedProducts.length);
    setBulkPasteText("");
    setBulkParsedProducts([]);
    setBulkFileError("");

    setTimeout(() => {
      setBulkSuccessCount(null);
      setUploadMode("single");
      setShowAddProductModal(false);
    }, 2000);
  };

  const handleParseText = (text: string) => {
    setBulkPasteText(text);
    if (!text.trim()) {
      setBulkParsedProducts([]);
      setBulkFileError("");
      return;
    }

    try {
      const trimmed = text.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        const products = parseJSONProducts(trimmed);
        setBulkParsedProducts(products);
        setBulkFileError("");
      } else {
        const products = parseCSV(trimmed);
        setBulkParsedProducts(products);
        setBulkFileError("");
      }
    } catch (err: any) {
      setBulkFileError(err.message || "Failed to parse text. Please double check the format.");
      setBulkParsedProducts([]);
    }
  };

  const processSelectedBulkFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        handleParseText(text);
      }
    };
    reader.onerror = () => {
      setBulkFileError("Failed to read the selected file.");
    };
    reader.readAsText(file);
  };

  const handleBulkFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setBulkIsDragging(false);
    setBulkFileError("");

    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedBulkFile(file);
    }
  };

  const handleBulkFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedBulkFile(file);
    }
  };

  const isApprovalError = approvalFeedback?.includes("Failed") || approvalFeedback?.includes("Error");
  
  // We no longer crash the entire admin console for simple validation errors.
  // Validation errors (uploadError, bulkFileError, saveProfileError, profileUploadError, fdError, aiError)
  // are already displayed inline within their respective UI components.
  // We only log them here for debugging purposes.
  if (uploadError || bulkFileError || saveProfileError || profileUploadError || fdError || isApprovalError) {
    // console.warn("Admin Console caught a validation error, displaying inline:", { uploadError, bulkFileError, saveProfileError });
  }

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
            <span>Merchant Cabin</span>
          </button>

          <button
            onClick={() => setAdminTab("inventory")}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              adminTab === "inventory"
                ? "bg-white text-neutral-900 shadow-sm font-extrabold"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <PackageIcon className="w-4 h-4 text-blue-500" />
            <span>Product Inventory</span>
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

          <button
            onClick={() => setAdminTab("delivery")}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              adminTab === "delivery"
                ? "bg-white text-neutral-900 shadow-sm font-extrabold"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <PackageIcon className="w-4 h-4 text-emerald-500" />
            <span>Delivery Reports</span>
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
              <div className="relative group cursor-pointer" onClick={handleOpenProfileModal}>
                {activeVendor.avatar ? (
                  <img loading="lazy" 
                    src={activeVendor.avatar} 
                    alt={activeVendor.name} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-orange-500 shadow-sm"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // fallback if image url is broken or default
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-600 font-black text-lg flex items-center justify-center border-2 border-orange-500 shadow-sm uppercase">
                    {activeVendor.name.charAt(0)}
                  </div>
                )}
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
                  onClick={handleOpenProfileModal}
                  className="text-[10px] text-orange-500 hover:text-orange-600 font-black tracking-wider uppercase underline mt-1 block"
                >
                  Edit Logo & Shop Details
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex space-x-2 lg:justify-end flex-wrap gap-y-2 sm:flex-nowrap">
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
                  onClick={() => {
                    const slugifyLocal = (text: string) => text.toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-");
                    const storeUrl = `${window.location.origin}/vendor/${slugifyLocal(activeVendor.name)}`;
                    navigator.clipboard.writeText(storeUrl).then(() => {
                      alert(`Store link copied: ${storeUrl}\n\nShare this on your social media to boost sales!`);
                    });
                  }}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center space-x-1.5 border border-emerald-200"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Storefront</span>
                </button>
                <button
                  onClick={handleOpenProfileModal}
                  className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center space-x-1.5 border border-neutral-200"
                >
                  <span>⚙️ Edit Brand Profile</span>
                </button>
              </div>
              <button
                onClick={() => {
                  if (!activeVendor.cacNumber || !activeVendor.whatsappNumber) {
                    alert("Please complete your vendor profile verification (CAC Number and WhatsApp Mobile) before publishing products.");
                    handleOpenProfileModal();
                  } else {
                    setShowAddProductModal(true);
                  }
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-xs w-full"
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

          {/* Brand Settlement & Verification Details */}
          <div className="bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-50 pb-3">
              <div className="text-left">
                <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight flex items-center space-x-2">
                  <span>Merchant Trust, Settlement & Onboarding Profile</span>
                  {activeVendor.isVerified ? (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-emerald-100 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                      <span>Verified Live</span>
                    </span>
                  ) : (
                    <span className="bg-amber-50 text-amber-700 text-[10px] font-extrabold px-2 py-0.5 rounded border border-amber-100 flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                      <span>Verification Pending</span>
                    </span>
                  )}
                </h3>
                <p className="text-[10px] font-semibold text-neutral-400">Verifiable credentials and direct deposit accounts</p>
              </div>
              <button 
                onClick={handleOpenProfileModal}
                className="text-[11px] bg-orange-50 hover:bg-orange-100 text-orange-600 font-extrabold px-3 py-1.5 rounded-xl border border-orange-150"
              >
                ✏️ Edit Brand Credentials
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-left">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Settlement Destination</p>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-xs font-bold text-neutral-800">{activeVendor.bankName || userBankName || "Not Provided"}</p>
                  <p className="text-xs font-mono font-medium text-neutral-500 tracking-wider">Acct: {activeVendor.accountNumber || userBankAccountNumber || "Not Provided"}</p>
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-left">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-sans">Business Trust Seal</p>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-xs font-bold text-neutral-800">CAC Code & Legitimacy</p>
                  <p className="text-xs font-mono font-medium text-neutral-500">Reg: {activeVendor.cacNumber || userCacNumber || "Not Registered"}</p>
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-left">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-sans">Authorized Contact</p>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-xs font-bold text-neutral-800">WhatsApp Sales Mobile</p>
                  <p className="text-xs font-mono font-medium text-neutral-500">WA: {activeVendor.whatsappNumber || activeVendor.whatsapp_number || "Not Coupled"}</p>
                </div>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-left">
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-sans">Corporate Ownership</p>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-xs font-bold text-neutral-800">{activeVendor.ownerName || "Not Configured"}</p>
                  <p className="text-xs font-medium text-neutral-500 truncate">{activeVendor.email || "Not Bound"}</p>
                </div>
              </div>
            </div>

            {activeVendor.business_description && (
              <div className="p-3 bg-orange-50/45 rounded-xl border border-orange-100/40 text-left mt-2">
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Store Overview Statement</p>
                <p className="text-xs mt-1 text-neutral-600 font-medium leading-relaxed italic">"{activeVendor.business_description}"</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Sales Performance Line Chart (8 cols) */}
            <div className="lg:col-span-8 bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-neutral-50">
                <div className="text-left">
                  <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight">30-Day Revenue Trend</h3>
                  <p className="text-[10px] font-semibold text-neutral-400">Daily revenue performance in Naira</p>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="w-2.5 h-2.5 bg-orange-500 rounded-full inline-block" />
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Store Sales</span>
                </div>
              </div>

              {/* Recharts LineChart */}
              <div className="h-60 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={last30DaysData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#a3a3a3" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tickLine={false}
                      minTickGap={30}
                    />
                    <YAxis 
                      stroke="#a3a3a3" 
                      fontSize={10} 
                      fontWeight="bold" 
                      tickLine={false} 
                      axisLine={false} 
                      tickFormatter={(v) => `₦${v >= 1000000 ? (v / 1000000).toFixed(1) + "M" : v >= 1000 ? (v / 1000) + "k" : v}`} 
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatNaira(value), "Revenue"]}
                      labelStyle={{ color: '#525252', fontWeight: 'bold', fontSize: '12px' }}
                      itemStyle={{ color: '#ea580c', fontWeight: 'bold', fontSize: '12px' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#f97316" 
                      strokeWidth={3} 
                      dot={false}
                      activeDot={{ r: 6, fill: '#ea580c', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
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
                        <img loading="lazy" src={item.image} alt={item.title} className="w-full h-full object-cover" />
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
                          <img loading="lazy" src={fd.productImage} alt={fd.productName} className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
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

          {/* Active Orders Tracking */}
          <div className="bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="border-b border-neutral-105 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight flex items-center gap-2">
                  <PackageIcon className="w-4 h-4 text-neutral-700" />
                  <span>Merchant Orders Dispatch Logs</span>
                </h3>
                <p className="text-[10px] text-neutral-450 mt-0.5">Prompt buyers to confirm delivery receipt</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              {vendorOrders.length === 0 ? (
                <div className="py-10 text-center text-neutral-400 text-xs font-medium">
                  No active orders at this time.
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-neutral-50 text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-100">
                    <tr>
                      <th className="px-6 py-3.5">Order ID</th>
                      <th className="px-6 py-3.5">Shopper Name & Address</th>
                      <th className="px-6 py-3.5">Status Check</th>
                      <th className="px-6 py-3.5">Naira value</th>
                      <th className="px-6 py-3.5 text-right font-bold">Proof of Delivery</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-medium font-sans">
                    {vendorOrders.map(o => (
                      <tr key={o.id} className="hover:bg-neutral-50/50">
                        <td className="px-6 py-4 font-bold text-neutral-800 text-[11px] font-mono">{o.id}</td>
                        <td className="px-6 py-4 text-neutral-705">
                          <p className="font-bold">{o.customerName}</p>
                          {o.deliveryAddress && (
                            <p className="text-[10px] text-neutral-500 mt-1">{o.deliveryAddress}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block font-extrabold text-[10px] uppercase px-2 py-0.5 rounded border 
                             ${o.status === "Delivered" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                              o.status === "Shipped" ? "bg-blue-50 text-blue-600 border-blue-105" :
                              o.status === "Flagged" ? "bg-red-50 text-red-600 border-red-101" :
                             "bg-yellow-50 text-yellow-600 border-yellow-101"}`}>
                            {o.status}
                          </span>
                          {o.receiptConfirmed && <p className="text-[9px] text-emerald-600 mt-1 font-bold">✓ User Confirmed Receipt</p>}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-neutral-700">{formatNaira(o.value)}</td>
                        <td className="px-6 py-4 text-right">
                          <button
                            disabled={o.receiptConfirmed || o.receiptPrompted}
                            onClick={() => onPromptReceipt && onPromptReceipt(o.id)}
                            className="bg-neutral-900 hover:bg-neutral-800 text-white px-3 py-1 text-[10px] font-bold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {o.receiptPrompted ? "Customer Prompted" : o.receiptConfirmed ? "Package Received" : "Prompt Customer Receipt"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Vendor Modals (accessible across all vendor tabs) */}
      {/* Add custom product modular mock popup */}
      {showAddProductModal && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs" onClick={() => setShowAddProductModal(false)} />
              <div className={`relative w-full ${uploadMode === 'bulk' ? 'max-w-2xl' : 'max-w-md'} bg-white rounded-2xl shadow-premium p-6 overflow-y-auto max-h-[85vh] z-10 duration-200 transition-all`}>
                <h3 className="text-lg font-black text-neutral-900 tracking-tight mb-2">Publish Custom Shop Product</h3>
                
                {/* Modality Tabs Segment */}
                <div className="flex border-b border-neutral-100 mb-4 select-none">
                  <button
                    type="button"
                    onClick={() => {
                      setUploadMode("single");
                      setBulkFileError("");
                    }}
                    className={`flex-1 pb-2.5 text-xs font-black uppercase tracking-wider border-b-2 text-center transition-all ${uploadMode === 'single' ? 'border-orange-500 text-orange-600' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
                  >
                    Single Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode("bulk")}
                    className={`flex-1 pb-2.5 text-xs font-black uppercase tracking-wider border-b-2 text-center transition-all ${uploadMode === 'bulk' ? 'border-orange-500 text-orange-600' : 'border-transparent text-neutral-400 hover:text-neutral-600'}`}
                  >
                    Bulk Upload (CSV / JSON)
                  </button>
                </div>

                {uploadMode === "bulk" ? (
                  <form onSubmit={handleBulkProductSubmit} className="space-y-4">
                    {bulkSuccessCount !== null ? (
                      <div className="text-center py-6 space-y-2 animate-fade-in">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                          <CheckCircle className="w-6 h-6" />
                        </div>
                        <h4 className="font-extrabold text-neutral-900 text-base">Bulk Publish Successful!</h4>
                        <p className="text-xs text-neutral-500 font-bold">Successfully published {bulkSuccessCount} custom products to your store.</p>
                      </div>
                    ) : (
                      <>
                        <div className="text-neutral-600 text-xs text-left leading-relaxed space-y-1">
                          <p className="font-bold flex items-center gap-1.5 text-neutral-700">
                            <Sparkles className="w-4 h-4 text-orange-500" />
                            <span>Bulk Upload Guidelines</span>
                          </p>
                          <p className="pl-5 text-[11px] text-neutral-500">
                            Paste a JSON list matching our schema or choose/drag in a comma-separated CSV file below.
                          </p>
                        </div>

                        {/* Drag & Drop Area */}
                        <div
                          onDragOver={(e) => { e.preventDefault(); setBulkIsDragging(true); }}
                          onDragLeave={() => setBulkIsDragging(false)}
                          onDrop={handleBulkFileDrop}
                          onClick={() => document.getElementById("bulk-file-input")?.click()}
                          className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer select-none transition-all ${
                            bulkIsDragging 
                              ? "border-orange-500 bg-orange-50/50 scale-[0.98]" 
                              : "border-neutral-200 hover:border-neutral-300 bg-neutral-50/45"
                          }`}
                        >
                          <input
                            id="bulk-file-input"
                            type="file"
                            accept=".csv,.json"
                            onChange={handleBulkFileSelect}
                            className="hidden"
                          />
                          <UploadCloud className="w-9 h-9 text-neutral-400 mx-auto mb-1.5" />
                          <p className="text-xs font-bold text-neutral-700">Drag & Drop .csv or .json here</p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">Or click to browse device storage</p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-center pl-1">
                            <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
                              Raw CSV or JSON Text Paste
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const sampleJson = `[\n  {\n    "title": "Ankara Luxury Silk Robe",\n    "price": 35000,\n    "stock": 15,\n    "category": "Fashion",\n    "description": "Elegant hand-woven premium silk Robe with gold floral motifs."\n  },\n  {\n    "title": "Dual-Band Wi-Fi Router",\n    "price": 18000,\n    "stock": 42,\n    "category": "Electronics"\n  }\n]`;
                                handleParseText(sampleJson);
                              }}
                              className="text-[10px] text-orange-500 font-extrabold hover:underline"
                            >
                              Insert Sample JSON
                            </button>
                          </div>
                          <textarea
                            value={bulkPasteText}
                            onChange={(e) => handleParseText(e.target.value)}
                            placeholder='Title, Price, Stock, Category, Description&#10;Smart Watch, 12000, 5, Fashion, Clean touch screen&#10;Or paste JSON list here...'
                            rows={4}
                            className="w-full text-xs p-3 font-mono border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none placeholder-neutral-400 bg-white"
                          />
                        </div>

                        {bulkFileError && (
                          <div className="text-[11px] font-bold text-red-650 bg-red-50 p-2.5 rounded-xl border border-red-150 flex items-start space-x-1.5 leading-tight">
                            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                            <span>{bulkFileError}</span>
                          </div>
                        )}

                        {bulkParsedProducts.length > 0 && (
                          <div className="space-y-1.5 text-left">
                            <div className="flex justify-between items-center pl-1">
                              <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider">
                                Vetted Items List ({bulkParsedProducts.length})
                              </span>
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase rounded">
                                Ready To Publish
                              </span>
                            </div>

                            <div className="max-h-36 overflow-y-auto border border-neutral-200 rounded-xl divide-y divide-neutral-100 scrollbar-thin">
                              {bulkParsedProducts.map((p, idx) => (
                                <div key={idx} className="p-2.5 flex justify-between items-center text-xs hover:bg-neutral-50/50">
                                  <div className="flex-1 min-w-0 pr-4">
                                    <p className="font-extrabold text-neutral-805 truncate">{p.title}</p>
                                    <p className="text-[10px] text-neutral-400 tracking-wider font-medium font-sans">
                                      {p.category} &bull; {p.condition || "New"}
                                    </p>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="font-black text-neutral-900 font-mono">{formatNaira(p.price)}</p>
                                    <p className="text-[10px] text-neutral-450">Stock: <span className="font-extrabold text-neutral-600">{p.stock}</span></p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 flex justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setBulkPasteText("");
                              setBulkParsedProducts([]);
                              setBulkFileError("");
                            }}
                            className="px-4 py-2 bg-neutral-100 hover:bg-neutral-250 rounded-xl text-neutral-600 text-xs font-bold"
                          >
                            Reset
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowAddProductModal(false)}
                            className="px-4 py-2 bg-neutral-200 hover:bg-neutral-250 text-neutral-700/80 rounded-xl text-xs font-bold"
                          >
                            Close
                          </button>
                          <button
                            type="submit"
                            disabled={bulkParsedProducts.length === 0}
                            className={`px-5 py-2 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all ${
                              bulkParsedProducts.length > 0 
                                ? "bg-orange-500 hover:bg-orange-600 cursor-pointer" 
                                : "bg-neutral-200 cursor-not-allowed opacity-[0.45] text-neutral-400"
                            }`}
                          >
                            Publish {bulkParsedProducts.length} Products
                          </button>
                        </div>
                      </>
                    )}
                  </form>
                ) : (
                  <form onSubmit={handleCreateProductSubmit} className="space-y-4">
                  <div className="mb-4 bg-orange-50/50 p-4 border border-orange-100 rounded-2xl flex flex-col items-center text-center space-y-3">
                    <div>
                      <h4 className="font-extrabold text-orange-900 text-sm">AI Product Listing Assistant</h4>
                      <p className="text-[11px] text-orange-800/80 max-w-[280px] mx-auto mt-0.5">Let Gemini AI write persuasive, SEO-optimized copy for your product.</p>
                    </div>
                    {aiError && (
                      <div className="text-[10px] text-red-600 bg-white px-3 py-1.5 rounded border border-red-200">
                        {aiError}
                      </div>
                    )}
                    <button 
                      type="button" 
                      onClick={handleGenerateWithAI}
                      disabled={isGeneratingAI}
                      className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all border ${isGeneratingAI ? 'bg-orange-100 text-orange-400 border-orange-200 cursor-not-allowed' : 'bg-white text-orange-600 border-orange-200 hover:border-orange-500 hover:bg-orange-50 shadow-sm hover:shadow-md cursor-pointer'}`}
                    >
                      {isGeneratingAI ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      <span>{isGeneratingAI ? "Generating Content..." : "Generate with AI"}</span>
                    </button>
                  </div>

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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Delivery (Days)</label>
                      <input
                        type="number"
                        value={newDeliveryDays}
                        onChange={(e) => setNewDeliveryDays(e.target.value)}
                        placeholder="e.g. 3"
                        min="1"
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Market Category</label>
                    <select
                      value={proposingCategory ? "PROPOSE_NEW" : newCategory}
                      onChange={(e) => {
                        if (e.target.value === "PROPOSE_NEW") {
                          setProposingCategory(true);
                        } else {
                          setProposingCategory(false);
                          setNewCategory(e.target.value);
                          // Reset subcategory proposing state if changing main category
                          setProposingSubcategory(false);
                        }
                      }}
                      className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white font-bold text-neutral-700"
                    >
                      {localCategories.filter(c => c.status !== "pending" && c.status !== "rejected").map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                      <option value="PROPOSE_NEW">+ Propose New Category</option>
                    </select>

                    {proposingCategory && (
                      <div className="mt-2 animate-fade-in space-y-1">
                         <input
                           type="text"
                           placeholder="Type product category name..."
                           value={customCategoryName}
                           onChange={(e) => setCustomCategoryName(e.target.value)}
                           className="w-full px-4 py-2 text-xs border border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none placeholder-neutral-400 bg-orange-50 pl-3 shadow-sm font-bold"
                           required
                         />
                      </div>
                    )}
                  </div>

                  {/* Subcategory Proposal Field */}
                  {!proposingCategory && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center px-1">
                        <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Subcategory</label>
                        <button type="button" onClick={() => setProposingSubcategory(!proposingSubcategory)} className="text-[10px] text-orange-500 font-extrabold hover:underline">
                          {proposingSubcategory ? "Cancel" : "+ Propose Subcategory"}
                        </button>
                      </div>
                      
                      {proposingSubcategory ? (
                         <div className="animate-fade-in space-y-1 pt-1">
                           <input
                             type="text"
                             placeholder={`E.g., Smartphones in ${newCategory}`}
                             value={customSubcategoryName}
                             onChange={(e) => setCustomSubcategoryName(e.target.value)}
                             className="w-full px-4 py-2 text-xs border border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none placeholder-neutral-400 bg-orange-50 shadow-sm font-bold"
                             required
                           />
                         </div>
                      ) : (
                         <select
                           className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white font-bold text-neutral-500"
                         >
                           <option value="">-- Main Category Default --</option>
                           {(localCategories.find(c => c.name === newCategory)?.subcategories || []).map((sub, idx) => (
                             <option key={idx} value={sub}>{sub}</option>
                           ))}
                         </select>
                      )}
                    </div>
                  )}

                  {proposingCategory && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Subcategory (Optional)</label>
                      <input
                        type="text"
                        placeholder="E.g., Smart Phones"
                        value={customSubcategoryName}
                        onChange={(e) => {
                          setCustomSubcategoryName(e.target.value);
                          if (e.target.value.trim().length > 0) {
                            setProposingSubcategory(true);
                          } else {
                            setProposingSubcategory(false);
                          }
                        }}
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none placeholder-neutral-400 bg-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4">
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
                  </div>
                  
                  {newPrice && (
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex justify-between items-center text-xs">
                      <span className="font-bold text-neutral-600">Expected Earnings (After {((categories || localCategories || []).find(c => c.name === (proposingCategory ? customCategoryName : newCategory))?.defaultCommissionPercentage ?? 5)}% Comm.):</span>
                      <span className="font-black text-emerald-800 font-mono">
                        {new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(Number(newPrice) * (1 - ((categories || localCategories || []).find(c => c.name === (proposingCategory ? customCategoryName : newCategory))?.defaultCommissionPercentage ?? 5) / 100))}
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
                          <img loading="lazy" src={newImage} alt="Cloudinary Thumbnail Preview" className="w-full h-full object-cover" />
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
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Detailed Description</label>
                    <textarea
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      rows={3}
                      placeholder="Specify size tolerances, fabric details, or audio constraints..."
                      className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-neutral-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1 flex justify-between">Brand</label>
                      <input
                        type="text"
                        value={newBrand}
                        onChange={(e) => setNewBrand(e.target.value)}
                        placeholder="e.g. Samsung, Nike"
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1 flex justify-between">SEO Title <span className="font-normal text-neutral-400">{newSeoTitle.length}/60</span></label>
                      <input
                        type="text"
                        value={newSeoTitle}
                        onChange={(e) => setNewSeoTitle(e.target.value)}
                        maxLength={60}
                        placeholder="Optimized SEO Title"
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1 flex justify-between">SEO Description <span className="font-normal text-neutral-400">{newSeoDescription.length}/40 words limit</span></label>
                    <textarea
                      value={newSeoDescription}
                      onChange={(e) => setNewSeoDescription(e.target.value)}
                      rows={2}
                      placeholder="Persuasive short meta description for search engines..."
                      className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-neutral-700"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Key Features (Bullet points)</label>
                    <textarea
                      value={newFeatures}
                      onChange={(e) => setNewFeatures(e.target.value)}
                      rows={3}
                      placeholder="• Water resistant\n• 24h battery life"
                      className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-neutral-700 font-mono"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Product Highlights</label>
                    <textarea
                      value={newHighlights}
                      onChange={(e) => setNewHighlights(e.target.value)}
                      rows={2}
                      placeholder="• #1 Best Seller\n• 2 Year Warranty"
                      className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-neutral-700 font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Search Keywords</label>
                      <input
                        type="text"
                        value={newSearchKeywords}
                        onChange={(e) => setNewSearchKeywords(e.target.value)}
                        placeholder="shoes, running, nike"
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Product Tags</label>
                      <input
                        type="text"
                        value={newProductTags}
                        onChange={(e) => setNewProductTags(e.target.value)}
                        placeholder="Summer, Sale, New"
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Specifications</label>
                    <textarea
                      value={newSpecifications}
                      onChange={(e) => setNewSpecifications(e.target.value)}
                      rows={3}
                      placeholder="Weight: 200g\nDimensions: 10x10x5cm"
                      className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-neutral-700 font-mono"
                    />
                  </div>

                  {((proposingCategory ? customCategoryName : newCategory).toLowerCase().includes("software") || (proposingCategory ? customCategoryName : newCategory).toLowerCase().includes("digital")) && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-orange-600 uppercase tracking-widest pl-1">External Link (Required for Software)</label>
                      <input
                        type="url"
                        value={newExternalLink}
                        onChange={(e) => setNewExternalLink(e.target.value)}
                        placeholder="https://example.com/download"
                        required
                        className="w-full px-4 py-2 text-xs border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-orange-50"
                      />
                    </div>
                  )}

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
                )}
              </div>
            </div>
          )}

          {/* Edit Brand Profile settings modal popup */}
          {showEditProfileModal && (
            <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-xs" onClick={() => setShowEditProfileModal(false)} />
              <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-premium p-6 z-10 border border-neutral-100 scrollbar-thin scrollbar-thumb-neutral-200">
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
                          <img loading="lazy" src={editAvatar} alt="Store logo preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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

                    <div className="mt-2">
                      <input
                        type="text"
                        placeholder="Or paste custom logo image URL..."
                        value={editAvatar}
                        onChange={(e) => setEditAvatar(e.target.value)}
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white font-mono"
                      />
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

                    {saveProfileError && (
                      <p className="text-[10px] text-red-600 font-bold bg-red-50 p-2 rounded-lg border border-red-100 flex items-center space-x-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{saveProfileError}</span>
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

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Store Description / Motto</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="e.g. Elegant styles directly sourced from high quality weavers in Lagos"
                      className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-medium h-16 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Settlement Bank</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Access Bank"
                        value={editBankName}
                        onChange={(e) => setEditBankName(e.target.value)}
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none bg-white font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Settlement Account (NUBAN)</label>
                      <input
                        type="text"
                        required
                        maxLength={10}
                        minLength={10}
                        pattern="[0-9]{10}"
                        value={editAccountNumber}
                        onChange={(e) => setEditAccountNumber(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="10 digit account number"
                        className="w-full px-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none font-mono"
                      />
                    </div>
                  </div>

                  {saveProfileError && (
                    <div className="text-[10px] text-red-600 font-bold bg-red-50 p-2 rounded-lg border border-red-100 flex items-center space-x-1 mt-2">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>{saveProfileError}</span>
                    </div>
                  )}

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
                      disabled={isProfileUploading || isSavingProfile}
                      className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-extrabold shadow-sm active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {isSavingProfile && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span>{isSavingProfile ? "Saving Settings..." : "Save Brand Settings"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

      {/* ---------------- INTERACTIVE SALES ANALYTICS DASHBOARD ---------------- */}
      {adminTab === "dashboard" && (
        <SalesAnalyticsDashboard 
          orders={isMasterAdmin ? orders : vendorOrders} 
          products={isMasterAdmin ? products : vendorProducts}
          vendors={isMasterAdmin ? vendors : [activeVendor]}
          categories={localCategories}
        />
      )}

      {/* ---------------- DELIVERY REPORTS DASHBOARD ---------------- */}
      {adminTab === "delivery" && (
        <DeliveryReportsDashboard 
          orders={isMasterAdmin ? orders : vendorOrders} 
          vendors={isMasterAdmin ? vendors : [activeVendor]}
        />
      )}

      {/* ---------------- VENDOR INVENTORY MANAGEMENT ---------------- */}
      {adminTab === "inventory" && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">Product Inventory Management</h2>
              <p className="text-xs text-neutral-450 font-semibold">Track, update, and manage your storefront listings</p>
            </div>
            <button
              onClick={() => {
                setUploadMode("single");
                setShowAddProductModal(true);
              }}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black tracking-wide shadow-sm flex items-center justify-center space-x-1.5 transition-colors uppercase whitespace-nowrap"
            >
              <PackageIcon className="w-4 h-4" />
              <span>Add New Listing</span>
            </button>
          </div>

          {(() => {
            const displayProducts = isMasterAdmin ? products : vendorProducts;
            const inventoryValue = displayProducts.reduce((acc, p) => acc + (Number(p.price) * Number(p.stock)), 0);
            const outOfStock = displayProducts.filter(p => Number(p.stock) === 0).length;
            const lowStock = displayProducts.filter(p => Number(p.stock) > 0 && Number(p.stock) <= 5).length;
            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-4 border border-neutral-150 rounded-2xl shadow-xs">
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Total Inventory Value</p>
                  <h3 className="text-lg font-black text-neutral-900 tracking-tight mt-1">{formatNaira(inventoryValue)}</h3>
                </div>
                <div className="bg-white p-4 border border-neutral-150 rounded-2xl shadow-xs">
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Active Products</p>
                  <h3 className="text-lg font-black text-neutral-900 tracking-tight mt-1">{displayProducts.length}</h3>
                </div>
                <div className="bg-white p-4 border border-rose-100 rounded-2xl shadow-xs bg-rose-50/30">
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Out of Stock</p>
                  <h3 className="text-lg font-black text-rose-700 tracking-tight mt-1">{outOfStock} items</h3>
                </div>
                <div className="bg-white p-4 border border-amber-100 rounded-2xl shadow-xs bg-amber-50/30">
                  <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Low Stock (≤5)</p>
                  <h3 className="text-lg font-black text-amber-700 tracking-tight mt-1">{lowStock} items</h3>
                </div>
              </div>
            );
          })()}

          <div className="bg-white border border-neutral-150 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left whitespace-nowrap text-xs">
                <thead>
                  <tr className="bg-neutral-50/50 border-b border-neutral-150 text-neutral-400 font-bold tracking-widest uppercase">
                    <th className="px-5 py-4 w-12 text-center text-[10px]">Img</th>
                    <th className="px-5 py-4 text-[10px]">Product Details</th>
                    <th className="px-5 py-4 text-[10px]">Price</th>
                    <th className="px-5 py-4 text-[10px]">Stock</th>
                    <th className="px-5 py-4 text-[10px]">Category</th>
                    <th className="px-5 py-4 text-right text-[10px]">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {vendorProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <PackageIcon className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                        <h4 className="text-sm font-bold text-neutral-800">No products found</h4>
                        <p className="text-xs font-semibold text-neutral-400 max-w-sm mx-auto mt-1">
                          You haven't added any listings yet. Create your first product listing to start selling!
                        </p>
                      </td>
                    </tr>
                  ) : (
                    vendorProducts.map((p) => {
                      const isEditing = editingProductId === p.id;
                      return (
                        <tr key={p.id} className="hover:bg-neutral-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="w-10 h-10 bg-neutral-100 rounded-lg overflow-hidden border border-neutral-200">
                              <img loading="lazy" src={p.image} className="w-full h-full object-cover" alt={p.title} referrerPolicy="no-referrer" />
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <input 
                                type="text"
                                className="w-full text-xs font-bold px-2 py-1.5 border border-neutral-300 rounded focus:ring-1 focus:ring-orange-500 outline-none"
                                value={editingProductForm.title || ""}
                                onChange={(e) => setEditingProductForm({...editingProductForm, title: e.target.value})}
                              />
                            ) : (
                              <div className="space-y-0.5 max-w-[200px] sm:max-w-xs">
                                <p className="font-extrabold text-neutral-900 truncate" title={p.title}>{p.title}</p>
                                <p className="text-[10px] text-neutral-400 font-semibold truncate">{p.description || "No description"}</p>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 font-mono font-bold text-neutral-800">
                            {isEditing ? (
                              <input 
                                type="number"
                                className="w-24 text-xs font-bold px-2 py-1.5 border border-neutral-300 rounded focus:ring-1 focus:ring-orange-500 outline-none"
                                value={editingProductForm.price || ""}
                                onChange={(e) => setEditingProductForm({...editingProductForm, price: Number(e.target.value)})}
                              />
                            ) : (
                              formatNaira(p.price)
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {isEditing ? (
                              <input 
                                type="number"
                                className="w-16 text-xs font-bold px-2 py-1.5 border border-neutral-300 rounded focus:ring-1 focus:ring-orange-500 outline-none"
                                value={editingProductForm.stock || 0}
                                onChange={(e) => setEditingProductForm({...editingProductForm, stock: Number(e.target.value)})}
                              />
                            ) : (
                              <span className={`font-black tracking-wider ${p.stock && p.stock < lowStockThreshold ? "text-red-500 bg-red-50 px-1.5 py-0.5 rounded" : "text-neutral-600"}`}>
                                {p.stock}
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-xs font-semibold text-neutral-600">
                            {isEditing ? (
                              <div className="space-y-2">
                                <select 
                                  className="w-24 text-xs font-bold px-2 py-1.5 border border-neutral-300 rounded focus:ring-1 focus:ring-orange-500 outline-none bg-white"
                                  value={editingProductForm.category || ""}
                                  onChange={(e) => setEditingProductForm({...editingProductForm, category: e.target.value})}
                                >
                                  <option value="">Select Category</option>
                                  {(categories || localCategories || []).map(cat => (
                                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                                  ))}
                                </select>
                                {((editingProductForm.category || p.category).toLowerCase().includes("software") || (editingProductForm.category || p.category).toLowerCase().includes("digital")) && (
                                  <input 
                                    type="url"
                                    placeholder="External Link"
                                    className="w-32 text-xs font-bold px-2 py-1.5 border border-orange-300 bg-orange-50 rounded focus:ring-1 focus:ring-orange-500 outline-none"
                                    value={editingProductForm.externalLink || ""}
                                    onChange={(e) => setEditingProductForm({...editingProductForm, externalLink: e.target.value})}
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <div>{p.category}</div>
                                {p.externalLink && (
                                  <a href={p.externalLink} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline inline-block truncate max-w-[100px]" title={p.externalLink}>
                                    Link
                                  </a>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  onClick={handleGenerateWithAIForEdit}
                                  disabled={isGeneratingAI}
                                  className="p-1.5 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded transition-colors disabled:opacity-50"
                                  title="Generate Content with AI"
                                >
                                  {isGeneratingAI ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => setEditingProductId(null)}
                                  className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (onUpdateProduct && editingProductForm) {
                                      let computedCommission = p.commissionPercentage;
                                      let updatedCategoryId = p.categoryId;
                                      if (editingProductForm.category && editingProductForm.category !== p.category) {
                                        const activeCats = categories || [];
                                        const cat = activeCats.find(c => c.name === editingProductForm.category);
                                        computedCommission = cat?.defaultCommissionPercentage ?? 5;
                                        updatedCategoryId = cat?.categoryId || cat?.id;
                                      }

                                      const newProd = sanitizeFields({ ...p, ...editingProductForm, commissionPercentage: computedCommission, categoryId: updatedCategoryId }) as Product;
                                      onUpdateProduct(newProd);
                                    }
                                    setEditingProductId(null);
                                  }}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                  title="Save Changes"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: 1 }}>
                                <button
                                  onClick={() => {
                                    setEditingProductId(p.id);
                                    setEditingProductForm(p);
                                  }}
                                  className="text-[10px] font-bold text-blue-600 uppercase tracking-widest px-2 py-1.5 hover:bg-blue-50 rounded transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Remove ${p.title} from catalog?`)) {
                                      onDeleteProduct?.(p.id);
                                    }
                                  }}
                                  className="text-[10px] font-bold text-red-600 uppercase tracking-widest px-2 py-1.5 hover:bg-red-50 rounded transition-colors"
                                >
                                  Del
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Platform GMV */}
              <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs animate-fade-in">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Gross Settlement Value (GMV)</p>
                <h3 className="text-2xl font-black text-neutral-900 tracking-tight mt-1.5">{formatNaira(platformStats.totalGMV)}</h3>
              </div>

              {/* Vendors count */}
              <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs animate-fade-in">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Onboarded Traders</p>
                <div className="flex items-center space-x-2 mt-1">
                  <h3 className="text-2xl font-black text-neutral-900 tracking-tight">{vendorsList.length} merchants</h3>
                </div>
              </div>

              {/* Average Vendor Rating Card */}
              <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs animate-fade-in">
                <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Average Vendor Rating</p>
                <div className="flex items-center space-x-2 mt-1.5">
                  <h3 className="text-2xl font-black text-amber-500 tracking-tight">
                    {averageVendorRating > 0 ? averageVendorRating.toFixed(2) : "0.00"} ★
                  </h3>
                </div>
                <p className="text-[10px] text-neutral-400 font-semibold mt-1">
                  Avg across all {vendorsList.length} active sellers
                </p>
              </div>
            </div>

            {/* Delivery Zones Configuration */}
            <DeliveryZonesManager deliveryZones={deliveryZones} onUpdateDeliveryZones={onUpdateDeliveryZones!} />

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
                    <th className="px-6 py-3.5">Shopper Name & Address</th>
                    <th className="px-6 py-3.5">Status Check</th>
                    <th className="px-6 py-3.5">Naira value</th>
                    <th className="px-6 py-3.5 text-right font-bold">Order Audit Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium font-sans">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-neutral-50/50">
                      <td className="px-6 py-4 font-bold text-neutral-800 text-[11px] font-mono">{o.id}</td>
                      <td className="px-6 py-4 text-neutral-705">
                        <p className="font-bold">{o.customerName}</p>
                        {o.deliveryAddress && (
                          <p className="text-[10px] text-neutral-500 mt-1">{o.deliveryAddress}</p>
                        )}
                      </td>
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
                  {orders.length === 0 && (
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
                    <th className="px-6 py-3.5">Settlement (CAC / Bank / Acc)</th>
                    <th className="px-6 py-3.5">Managing Partner</th>
                    <th className="px-6 py-3.5">Operational Center</th>
                    <th className="px-6 py-3.5">Feedback Weight</th>
                    <th className="px-6 py-3.5 flex-1">Reputation Index</th>
                    <th className="px-6 py-3.5 text-right w-40">Approval Actions</th>
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
                            <p className="text-[9px] text-neutral-400 font-mono font-bold uppercase">{v.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-neutral-600">
                        <div className="space-y-0.5">
                          <p className="font-mono text-[9px] uppercase tracking-widest text-emerald-700 font-bold">CAC: {v.cacNumber || v.cac_number || "Not Registered"}</p>
                          <p className="text-[10px] text-neutral-800 font-bold">{v.bankName || v.bank_name || "N/A"} - {v.accountNumber || v.account_number || "N/A"}</p>
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
                        <div className="flex justify-end items-center space-x-2">
                          <button
                            onClick={() => handleSendVendorApprovalEmail(v.email, v.name)}
                            className="font-sans px-2 py-1 bg-orange-50 hover:bg-orange-100 text-orange-600 hover:text-orange-700 font-bold text-[10px] rounded-lg border border-orange-200 transition-colors inline-flex items-center space-x-1"
                          >
                            <Mail className="w-3 h-3" />
                            <span>Approve &amp; Send email</span>
                          </button>
                          
                          <button
                            onClick={() => handleDeleteVendor(v.id, v.name)}
                            className="font-sans px-2 py-1 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold text-[10px] rounded-lg border border-red-200 transition-colors inline-flex items-center space-x-1"
                            title="Scrub Vendor Data"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Scrub</span>
                          </button>
                        </div>
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
              {[
                {
                  id: "1",
                  name: "Master Admin",
                  role: "Super Administrator",
                  initials: "MA",
                  status: "Online",
                  twoFactorEnabled: true,
                  email: "adminnaijastoresonline@gmail.com"
                }
              ].map((worker) => (
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
              <div className="flex items-center space-x-3">
                <span className="text-[9px] bg-emerald-900 font-extrabold text-white px-2.5 py-1 rounded uppercase tracking-wider hidden sm:block">Marketplace Schema</span>
                <button
                  onClick={handleSaveCategoriesGlobal}
                  disabled={!hasUnsavedCategoryChanges || isSavingCategories}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                    hasUnsavedCategoryChanges && !isSavingCategories
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                      : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>{isSavingCategories ? "Saving..." : "Save Global Changes"}</span>
                </button>
              </div>
            </div>

            {localFeedback && (
              <div className="px-6 py-2 bg-neutral-800 text-white text-xs font-bold flex items-center justify-between">
                <span>{localFeedback}</span>
                <button onClick={() => setLocalFeedback(null)}>
                  <X className="w-4 h-4 text-neutral-400 hover:text-white" />
                </button>
              </div>
            )}

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Form builders */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Form 1: Add Category */}
                <form onSubmit={handleAddCategory} className="bg-neutral-50 p-4 border border-neutral-150 rounded-xl space-y-3 text-left">
                  <h4 className="text-xs font-extrabold uppercase text-neutral-500 tracking-wider flex items-center space-x-1.5 mb-2">
                    <Database className="w-3.5 h-3.5 text-orange-500" />
                    <span>Create Parent Category</span>
                  </h4>

                  {addingCategoryStatus.text && (
                    <div className={`p-2 rounded text-xs font-bold ${addingCategoryStatus.type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                      {addingCategoryStatus.text}
                    </div>
                  )}

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
                    <label className="text-[10px] font-bold text-neutral-450 block">Category ID</label>
                    <input
                      type="text"
                      value={newCatId}
                      onChange={(e) => setNewCatId(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-xs bg-white outline-none focus:ring-1.5 focus:ring-neutral-900 font-medium"
                      placeholder="e.g. cat_12345 (Optional)"
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

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-450 block">Category Image (Optional)</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setNewCatImageFile(e.target.files[0]);
                        } else {
                          setNewCatImageFile(null);
                        }
                      }} 
                      className="w-full text-xs font-medium text-neutral-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-900 file:text-white hover:file:bg-neutral-800"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={addingCategoryStatus.loading}
                    className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg transition-colors cursor-pointer text-center"
                  >
                    {addingCategoryStatus.loading ? "Adding..." : "+ Create Category"}
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
                  {[...localCategories].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((cat, idx, arr) => (
                    <div key={cat.id} className="border border-neutral-150 rounded-xl p-4 bg-white shadow-xs flex flex-col justify-between text-left relative min-h-[140px]">
                      
                      {editingCategoryId === cat.id ? (
                        <div className="flex flex-col h-full space-y-3">
                          <input 
                            type="text" 
                            value={editingCategoryForm.name || ""} 
                            onChange={(e) => setEditingCategoryForm({...editingCategoryForm, name: e.target.value})}
                            className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs font-bold font-sans outline-none focus:border-orange-500"
                            placeholder="Category Name"
                          />
                          <input 
                            type="text" 
                            value={editingCategoryForm.iconName || ""} 
                            onChange={(e) => setEditingCategoryForm({...editingCategoryForm, iconName: e.target.value})}
                            className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs font-sans outline-none focus:border-orange-500"
                            placeholder="Icon Name (e.g., Shirt)"
                          />
                          <textarea 
                            value={editingCategoryForm.description || ""} 
                            onChange={(e) => setEditingCategoryForm({...editingCategoryForm, description: e.target.value})}
                            className="w-full px-2 py-1.5 border border-neutral-200 rounded text-xs font-sans outline-none focus:border-orange-500 resize-none h-16"
                            placeholder="Description"
                          />
                          <div className="flex gap-2 mt-auto pt-2">
                            <button
                              onClick={() => handleSaveCategoryEdit(cat.id)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] py-1.5 rounded transition-colors"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingCategoryId(null);
                                setEditingCategoryForm({});
                              }}
                              className="flex-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-bold text-[10px] py-1.5 rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="absolute top-3 right-3 flex items-center space-x-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (idx > 0) {
                                  const prevCat = arr[idx - 1];
                                  const updated = localCategories.map(c => {
                                    if (c.id === cat.id) return { ...c, sortOrder: prevCat.sortOrder || 0 };
                                    if (c.id === prevCat.id) return { ...c, sortOrder: (cat.sortOrder || 0) + 1 };
                                    return c;
                                  });
                                  handleUpdateCategoriesState(updated);
                                }
                              }}
                              className="text-neutral-350 hover:text-orange-500 transition-colors w-5 h-5 flex items-center justify-center rounded-lg hover:bg-orange-50 cursor-pointer disabled:opacity-50"
                              disabled={idx === 0}
                              title="Move Up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (idx < arr.length - 1) {
                                  const nextCat = arr[idx + 1];
                                  const updated = localCategories.map(c => {
                                    if (c.id === cat.id) return { ...c, sortOrder: nextCat.sortOrder || 0 };
                                    if (c.id === nextCat.id) return { ...c, sortOrder: (cat.sortOrder || 0) - 1 };
                                    return c;
                                  });
                                  handleUpdateCategoriesState(updated);
                                }
                              }}
                              className="text-neutral-350 hover:text-orange-500 transition-colors w-5 h-5 flex items-center justify-center rounded-lg hover:bg-orange-50 cursor-pointer disabled:opacity-50"
                              disabled={idx === arr.length - 1}
                              title="Move Down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const newStatus = cat.status === "disabled" ? "active" : "disabled";
                                const updated = localCategories.map(c => c.id === cat.id ? { ...c, status: newStatus as any } : c);
                                handleUpdateCategoriesState(updated);
                              }}
                              className={`text-neutral-350 transition-colors w-5 h-5 flex items-center justify-center rounded-lg cursor-pointer ${cat.status === 'disabled' ? 'hover:text-emerald-500 hover:bg-emerald-50' : 'hover:text-amber-500 hover:bg-amber-50'}`}
                              title={cat.status === "disabled" ? "Enable category" : "Disable category"}
                            >
                              {cat.status === "disabled" ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCategoryId(cat.id);
                                setEditingCategoryForm({ name: cat.name, description: cat.description, iconName: cat.iconName });
                              }}
                              className="text-neutral-350 hover:text-blue-500 transition-colors w-6 h-6 flex items-center justify-center rounded-lg hover:bg-blue-50 cursor-pointer"
                              title="Edit category"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            {/* Delete parent action */}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${cat.name}" category and all its nested subcategories?`)) {
                                  handleDeleteCategory(cat.id);
                                }
                              }}
                              className="text-neutral-350 hover:text-red-500 transition-colors w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 cursor-pointer"
                              title="Delete category"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className={`space-y-1.5 ${cat.status === 'disabled' ? 'opacity-50' : ''}`}>
                            <div className="flex items-center space-x-1.5">
                              <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded border ${cat.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" : cat.status === "disabled" ? "bg-neutral-100 text-neutral-500 border-neutral-200" : "bg-emerald-50 text-emerald-700 border-emerald-100"}`}>
                                {cat.status === "pending" ? "PENDING REVIEW" : cat.status === "disabled" ? "DISABLED" : cat.iconName}
                              </span>
                              {cat.categoryId && (
                                <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-100">
                                  ID: {cat.categoryId}
                                </span>
                              )}
                            </div>
                            <h5 className="font-extrabold text-xs text-neutral-900 pr-32">{cat.name}</h5>
                            <p className="text-[10px] text-neutral-400 leading-normal line-clamp-2 pr-32">{cat.description}</p>
                          </div>

                          {cat.status === "pending" && (
                            <div className="mt-3 flex gap-2">
                              <button
                                onClick={() => {
                                   const updated = localCategories.map(c => c.id === cat.id ? { ...c, status: "active" as const } : c);
                                   handleUpdateCategoriesState(updated);
                                }}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] py-1.5 rounded"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                   const updated = localCategories.map(c => c.id === cat.id ? { ...c, status: "rejected" as const } : c);
                                   handleUpdateCategoriesState(updated);
                                }}
                                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black text-[10px] py-1.5 rounded"
                              >
                                Reject
                              </button>
                            </div>
                          )}

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

                        </>
                      )}
                    </div>
                  ))}
                </div>

              </div>
              
            </div>
          </div>

        </div>
      )}

      {/* ---------------- D. COMMISSION TAB ---------------- */}
      {adminTab === "commissions" && (
        <CommissionAnalyticsTab products={products} vendors={vendorsList} orders={orders} categories={categories} onUpdateCategories={onUpdateCategories} />
      )}

      {/* ---------------- E. ADS TAB ---------------- */}
      {adminTab === "ads" && (
        <AdsManagementTab ads={ads} onUpdateAds={onUpdateAds} />
      )}

    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function CommissionAnalyticsTab({ products, vendors, orders, categories, onUpdateCategories }: { products: Product[], vendors: Vendor[], orders: Order[], categories: Category[], onUpdateCategories?: (cats: Category[]) => void }) {
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

      <div className="bg-white border border-neutral-150 rounded-2xl p-5 shadow-xs">
        <div className="mb-4">
           <h3 className="text-sm font-bold text-neutral-800 tracking-tight">Category Commission Rates</h3>
           <p className="text-xs text-neutral-500 font-semibold mb-3">Set dynamic cut percentages for each marketplace category.</p>
           {(!categories || categories.length === 0) && (
             <p className="text-xs text-neutral-400 italic">No custom categories found to configure.</p>
           )}
           {categories && categories.length > 0 && (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
               {categories.map((cat, idx) => (
                 <div key={`catcomm_${cat.name}_${idx}`} className="flex items-center justify-between bg-neutral-50 border border-neutral-150 p-3 rounded-xl shadow-xs">
                   <div className="flex flex-col">
                     <span className="text-xs font-bold text-neutral-700">{cat.name}</span>
                     <span className="text-[10px] text-neutral-400 font-medium">Default: {cat.defaultCommissionPercentage ?? 5}%</span>
                   </div>
                   <input
                     type="number"
                     min="0"
                     max="100"
                     className="w-16 px-2 py-1.5 text-xs font-bold font-mono text-center border border-neutral-200 rounded-lg outline-none bg-white focus:border-orange-500"
                     value={cat.defaultCommissionPercentage ?? 5}
                     onChange={(e) => {
                       if (onUpdateCategories) {
                         const updatedCategories = [...categories];
                         updatedCategories[idx] = {
                           ...updatedCategories[idx],
                           defaultCommissionPercentage: Number(e.target.value) || 0
                         };
                         onUpdateCategories(updatedCategories);
                       }
                     }}
                   />
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function AdsManagementTab({ ads, onUpdateAds }: { ads: Advertisement[], onUpdateAds?: (ads: Advertisement[]) => void }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newPosition, setNewPosition] = useState<'homepage' | 'category' | 'product' | 'search'>("homepage");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleAddCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFile) return;
    setIsUploading(true);

    try {
      const b64 = await convertFileToBase64(newFile);
      const res = await uploadToCloudinary(b64);
      if (res.success && res.url && onUpdateAds) {
        const newAd: Advertisement = {
          id: 'ad_' + Date.now(),
          title: newTitle || 'Untitled Campaign',
          imageUrl: res.url,
          linkUrl: newLinkUrl || '#',
          position: newPosition,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          metrics: { impressions: 0, clicks: 0 }
        };
        onUpdateAds([newAd, ...ads]);
        setShowAddModal(false);
        setNewTitle("");
        setNewLinkUrl("");
        setNewFile(null);
      }
    } catch (err) {
      console.warn("Fallback query error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this advertisement campaign?") && onUpdateAds) {
      onUpdateAds(ads.filter(a => a.id !== id));
    }
  };

  const activeAdsCount = ads.filter(a => a.status === 'active').length;
  const totalImpressions = ads.reduce((acc, a) => acc + (a.metrics?.impressions || 0), 0);
  const totalClicks = ads.reduce((acc, a) => acc + (a.metrics?.clicks || 0), 0);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight">Advertisement Placement System</h2>
          <p className="text-xs text-neutral-500 font-semibold">Organize and monitor cross-platform marketing campaigns</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center space-x-1.5 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Ad Campaign</span>
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs flex items-center justify-between">
           <div>
             <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Active Campaigns</p>
             <h3 className="text-2xl font-black text-emerald-600 tracking-tight">{activeAdsCount}</h3>
           </div>
           <Megaphone className="w-8 h-8 text-neutral-200" />
        </div>
        <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs flex items-center justify-between">
           <div>
             <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Total Impressions</p>
             <h3 className="text-2xl font-black text-neutral-900 tracking-tight font-mono">{totalImpressions.toLocaleString()}</h3>
           </div>
           <Eye className="w-8 h-8 text-neutral-200" />
        </div>
        <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs flex items-center justify-between">
           <div>
             <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Total Clicks</p>
             <h3 className="text-2xl font-black text-neutral-900 tracking-tight font-mono">{totalClicks.toLocaleString()}</h3>
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
                 <th className="px-4 py-3 rounded-l-xl">Preview</th>
                 <th className="px-4 py-3">Campaign Name & Link</th>
                 <th className="px-4 py-3">Location / Position</th>
                 <th className="px-4 py-3">Status</th>
                 <th className="px-4 py-3">Impressions</th>
                 <th className="px-4 py-3 text-right">Clicks</th>
                 <th className="px-4 py-3 rounded-r-xl text-right">Action</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-neutral-100">
               {ads.map(ad => (
                 <tr key={ad.id} className="hover:bg-neutral-50 transition-colors">
                   <td className="px-4 py-3">
                     <img loading="lazy" src={ad.imageUrl} alt={ad.title} className="w-16 h-8 object-cover rounded shadow-sm border border-neutral-200" />
                   </td>
                   <td className="px-4 py-3">
                     <div className="font-bold text-neutral-800">{ad.title}</div>
                     <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline truncate max-w-[150px] inline-block">{ad.linkUrl}</a>
                   </td>
                   <td className="px-4 py-3 text-neutral-600 font-semibold capitalize">{ad.position}</td>
                   <td className="px-4 py-3">
                     <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                        ad.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        ad.status === 'scheduled' ? 'bg-amber-100 text-amber-700' : 
                        'bg-neutral-100 text-neutral-600'
                     }`}>
                       {ad.status}
                     </span>
                   </td>
                   <td className="px-4 py-3 font-mono">{ad.metrics?.impressions?.toLocaleString() || 0}</td>
                   <td className="px-4 py-3 text-right font-bold text-orange-500 font-mono">{ad.metrics?.clicks?.toLocaleString() || 0}</td>
                   <td className="px-4 py-3 text-right">
                     <button onClick={() => handleDelete(ad.id)} className="text-red-500 hover:text-red-700 font-bold uppercase text-[10px] tracking-widest px-2 py-1 bg-red-50 rounded">Delete</button>
                   </td>
                 </tr>
               ))}
               {ads.length === 0 && (
                 <tr>
                   <td colSpan={7} className="px-4 py-6 text-center text-neutral-400 font-medium italic">No active ad campaigns yet.</td>
                 </tr>
               )}
             </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/50">
              <div>
                <h3 className="text-lg font-black text-neutral-900 tracking-tight">Create Ad Campaign</h3>
                <p className="text-xs text-neutral-500 font-semibold">Upload promotional posters or banners</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto">
              <form onSubmit={handleAddCreate} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Campaign Title</label>
                  <input
                    required
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    type="text"
                    placeholder="e.g. Summer Mega Deals Banner"
                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Target URL</label>
                  <input
                    required
                    value={newLinkUrl}
                    onChange={e => setNewLinkUrl(e.target.value)}
                    type="url"
                    placeholder="https://...link to your product or site"
                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Display Position</label>
                  <select
                    value={newPosition}
                    onChange={(e: any) => setNewPosition(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-sm font-bold bg-white"
                  >
                    <option value="homepage">Homepage Hero / Banner</option>
                    <option value="category">Category Sidebar</option>
                    <option value="product">Product Detail Sub-Banner</option>
                    <option value="search">Search Results Inline</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Creative Assets (Image)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => setNewFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:uppercase file:tracking-widest file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 transition-colors"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isUploading || !newFile}
                    className="px-6 py-2.5 bg-orange-500 text-white font-black text-sm rounded-xl hover:bg-orange-600 focus:ring-4 focus:ring-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                  >
                    {isUploading ? "Uploading..." : "Publish Campaign"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
