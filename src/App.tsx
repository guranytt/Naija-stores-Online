/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Navbar from "./components/Navbar";

const CustomerViews = lazy(() => import("./components/CustomerViews"));
const MapTracking = lazy(() => import("./components/MapTracking"));
const VendorAdmin = lazy(() => import("./components/VendorAdmin"));
const VendorAuth = lazy(() => import("./components/VendorAuth"));
const UserAuthHub = lazy(() => import("./components/UserAuthHub"));
const PaystackCheckout = lazy(() => import("./components/PaystackCheckout"));
const CookiePopup = lazy(() => import("./components/CookiePopup"));
const PolicyOverlay = lazy(() => import("./components/PolicyOverlay"));
const FAQWidget = lazy(() => import("./components/FAQWidget"));

import { initPostHog, trackAddToCart, trackCheckoutStarted, trackPaymentCompleted, trackOrderCompleted } from "./lib/posthog";
import { Product, CartItem, Order, Vendor, Category, FlashDealProposal, Advertisement } from "./types";
import { useSEO } from "./hooks/useSEO";
import { fetchAndEnrichCategories } from "./services/categoriesService";
import { MOCK_PRODUCTS, MOCK_ORDERS, MOCK_VENDORS, MOCK_ADS } from "./data/mockData";
import { formatNaira } from "./utils";
import { useStore } from "./store/useStore";
import { Info, Settings, Sparkles, X, Mail, ShieldAlert, Database, CheckCircle, AlertCircle, Copy, FileText, Store, Bug, RefreshCw } from "lucide-react";
import { supabase, getSupabaseData, saveSupabaseRecord, saveSupabaseBatchRecords, PROVISION_SQL_SCRIPT, ensureUUID, setSupabaseToken } from "./supabase";
import { sendResendEmail, fetchEmailLogs, MailLogEntry } from "./emailService";

// Standard browser cookie helper functions
function getCookie(name: string): string {
  try {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
  } catch (e) {
    console.warn("Fail reading cookie: ", e);
  }
  return "";
}

function setCookie(name: string, value: string, days = 7) {
  try {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
  } catch (e) {
    console.warn("Fail writing cookie: ", e);
  }
}

import GracefulErrorScreen from "./components/GracefulErrorScreen";

const slugifyLocal = (text: string) => text.toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-");

const mockVendorIds = ["v_heritage", "v_alaba", "v_compvillage", "v_balogun", "v_sheabeauty", "v_snacks", "v_lekki", "v_yaba"];
const isVendorIdMock = (id: string) => {
  if (!id) return false;
  const idStr = String(id).trim();
  if (mockVendorIds.includes(idStr)) return true;
  for (const mvId of mockVendorIds) {
    if (ensureUUID(mvId) === idStr) return true;
  }
  return false;
};

const isProductIdMock = (id: string) => {
  if (!id) return false;
  const idStr = String(id).trim();
  if (/^(p|fs)\d+$/i.test(idStr)) return true;
  for (let i = 1; i <= 150; i++) {
    if (ensureUUID(`p${i}`) === idStr || ensureUUID(`fs${i}`) === idStr) {
      return true;
    }
  }
  return false;
};

const isOrderIdMock = (id: string) => {
  if (!id) return false;
  const idStr = String(id).trim();
  if (idStr.startsWith("NS-")) return true;
  for (let i = 9941; i <= 9950; i++) {
    if (ensureUUID(`NS-${i}`) === idStr) return true;
  }
  return false;
};

class ErrorBoundary extends React.Component<{ fallback?: React.ReactNode, children: React.ReactNode }, any> {
  state = { hasError: false, error: null };
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // @ts-ignore
      return this.props.fallback || <GracefulErrorScreen />;
    }
    // @ts-ignore
    return this.props.children;
  }
}

export default function App() {

  const {
    currentScreen, setCurrentScreen,
    selectedProductId, setSelectedProductId,
    selectedVendorSlug, setSelectedVendorSlug,
    initialCategory, setInitialCategory,
    searchFilter, setSearchFilter,
    isCheckoutOpen, setIsCheckoutOpen,
    settingsDrawerOpen, setSettingsDrawerOpen,
    
    currentUserId, setCurrentUserId,
    userEmail, setUserEmail,
    vendorAuthenticated, setVendorAuthenticated,
    authReady, setAuthReady,
    
    products, setProducts,
    vendors, setVendors,
    categories, setCategories,
    orders, setOrders,
    ads, setAds,
    flashDeals, setFlashDeals,
    deliveryZones, setDeliveryZones,
    
    cart, setCart,
    addToCart: handleAddToCart,
    updateCartQty: handleUpdateCartQty,
    removeFromCart: handleRemoveFromCart,
    clearCart,
    checkoutAmount, setCheckoutAmount,
    
    userBankName, setUserBankName,
    userBankAccountNumber, setUserBankAccountNumber,
    userCacNumber, setUserCacNumber,
    userStoreName, setUserStoreName,
    userOwnerName, setUserOwnerName,
    userAvatar, setUserAvatar,
    userWhatsappNumber, setUserWhatsappNumber,
    userLocation, setUserLocation
  } = useStore();
  // replaced by useStore
  // replaced by useStore
  // replaced by useStore
  // replaced by useStore
  // replaced by useStore
  const shouldReduceMotion = useReducedMotion();
  // replaced by useStore
  const [userBankName, setUserBankName] = useState<string>(() => localStorage.getItem("vendor_bank_name") || "");
  const [userBankAccountNumber, setUserBankAccountNumber] = useState<string>(() => localStorage.getItem("vendor_account_number") || "");
  const [userCacNumber, setUserCacNumber] = useState<string>(() => localStorage.getItem("vendor_cac_number") || "");
  const [userStoreName, setUserStoreName] = useState<string>(() => localStorage.getItem("vendor_store_name") || "");
  const [userOwnerName, setUserOwnerName] = useState<string>(() => localStorage.getItem("vendor_owner_name") || "");
  const [userAvatar, setUserAvatar] = useState<string>(() => localStorage.getItem("vendor_avatar") || "");
  const [userWhatsappNumber, setUserWhatsappNumber] = useState<string>(() => localStorage.getItem("vendor_whatsapp_number") || "");
  const [userLocation, setUserLocation] = useState<string>(() => localStorage.getItem("vendor_location") || "");
  const [userDeliveryAddress, setUserDeliveryAddress] = useState<string>("");
  // replaced by useStore
  // replaced by useStore
  const [checkoutAmount, setCheckoutAmount] = useState<number>(0);
  // replaced by useStore
  // replaced by useStore

  // Resend Automation states
  const [mailLogs, setMailLogs] = useState<MailLogEntry[]>([]);
  const [autoSendEmails, setAutoSendEmails] = useState<boolean>(true);

  // replaced by useStore

  // Router logic to interpret URL on first load and back/forward
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      const seoCategories = ["electronics", "fashion", "phones", "laptops", "beauty", "home-kitchen", "sports", "gaming"];
      if (path.startsWith("/cart")) setCurrentScreen("cart");
      else if (path.startsWith("/about")) setCurrentScreen("about");
      else if (path.startsWith("/contact")) setCurrentScreen("contact");
      else if (path.startsWith("/sell")) setCurrentScreen("sell");
      else if (path.startsWith("/faq")) setCurrentScreen("faq");
      else if (path.startsWith("/stores")) setCurrentScreen("stores");
      else if (path.startsWith("/admin") || path.startsWith("/dashboard")) setCurrentScreen("admin");
      else if (path.startsWith("/tracking")) setCurrentScreen("map");
      else if (path.startsWith("/auth")) setCurrentScreen("auth");
      else if (path.startsWith("/shop")) {
        setCurrentScreen("shop");
        setInitialCategory("all");
      }
      else if (path.startsWith("/product/")) {
        const raw = path.split("/product/")[1];
        if (raw) {
          let id = raw.split("-")[0];
          const uuidMatch = raw.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
          if (uuidMatch) {
            id = uuidMatch[0];
          } else if (raw.startsWith("p") || raw.startsWith("v")) {
            // retain existing behavior for mock ids
            id = raw.split("-")[0];
          }
          setSelectedProductId(id);
          setCurrentScreen("details");
        }
      }
      else if (path.startsWith("/vendor/")) {
        const raw = path.split("/vendor/")[1];
        if (raw) {
          let slug = raw;
          const uuidMatch = raw.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
          if (uuidMatch) {
            slug = uuidMatch[0];
          } else if (raw.startsWith("v_") || raw.startsWith("vendor")) {
            slug = raw.split("-")[0];
          } else {
            // Decoding the raw component in case there are encoded characters
            slug = decodeURIComponent(raw);
          }
          setSelectedVendorSlug(slug);
          setCurrentScreen("vendor");
        }
      }
      else if (path.startsWith("/category/")) {
        const cat = path.split("/category/")[1];
        if (cat) {
          setInitialCategory(cat);
          setCurrentScreen("shop");
        }
      }
      else if (seoCategories.includes(path.substring(1))) {
        setInitialCategory(path.substring(1));
        setCurrentScreen("shop");
      }
      else setCurrentScreen("home");
    };

    handleUrlChange();
    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, []);

  // Sync URL with current screen changes
  useEffect(() => {
    let newPath = "/";
    const seoCategories = ["electronics", "fashion", "phones", "laptops", "beauty", "home-kitchen", "sports", "gaming"];
    if (currentScreen === "cart") newPath = "/cart";
    else if (currentScreen === "about") newPath = "/about";
    else if (currentScreen === "contact") newPath = "/contact";
    else if (currentScreen === "sell") newPath = "/sell";
    else if (currentScreen === "faq") newPath = "/faq";
    else if (currentScreen === "stores") newPath = "/stores";
    else if (currentScreen === "admin") newPath = "/dashboard";
    else if (currentScreen === "map") newPath = "/tracking";
    else if (currentScreen === "auth") newPath = "/auth";
    else if (currentScreen === "shop") {
      if (seoCategories.includes(initialCategory)) {
        newPath = `/${initialCategory}`;
      } else {
        newPath = window.location.pathname.startsWith("/category/") ? window.location.pathname : "/shop";
      }
    }
    else if (currentScreen === "details") {
      const prod = products.find(p => p.id === selectedProductId);
      const slug = prod ? slugifyLocal(prod.title) : "";
      newPath = `/product/${selectedProductId}${slug ? `-${slug}` : ""}`;
    }
    else if (currentScreen === "vendor") {
      const vend = vendors.find(v => v.id === selectedVendorSlug || slugifyLocal(v.name) === selectedVendorSlug);
      const slug = vend ? slugifyLocal(vend.name) : selectedVendorSlug;
      newPath = `/vendor/${selectedVendorSlug}${slug && slug !== selectedVendorSlug ? `-${slug}` : ""}`;
    }
    
    if (window.location.pathname !== newPath && currentScreen !== "home") {
       window.history.pushState({ screen: currentScreen }, "", newPath);
    } else if (currentScreen === "home" && window.location.pathname !== "/") {
       window.history.pushState({ screen: "home" }, "", "/");
    }
  }, [currentScreen, selectedProductId, initialCategory, selectedVendorSlug]);

  // Synchronize category state across tabs via BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel('categories_sync_channel');
    channel.onmessage = (event) => {
      if (event.data?.type === 'CATEGORIES_UPDATED' && event.data?.categories) {
        setCategories(event.data.categories);
      } else if (event.data?.type === 'FORCE_REFETCH') {
        fetchAndEnrichCategories().then((data) => {
          if (data) {
            const finalCats = data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            setCategories(finalCats);
            try { localStorage.setItem("NAIJA_CATEGORIES_STATE", JSON.stringify(finalCats)); } catch(e) {}
          }
        });
      }
    };
    return () => channel.close();
  }, []);

  // complex state replaced by useStore


  // complex state replaced by useStore


  // complex state replaced by useStore


  // complex state replaced by useStore

  // complex state replaced by useStore

  // complex state replaced by useStore


  // complex state replaced by useStore


  // Initial PostHog runtime loading
  useEffect(() => {
    initPostHog();
    
    // Redirect parsing for email confirmations
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'true') {
      setCurrentScreen("auth");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useSEO(currentScreen, selectedProductId, initialCategory, selectedVendorSlug, products, vendors, categories);

  const [activePolicy, setActivePolicy] = useState<"privacy" | "terms" | "shipping" | "refund" | null>(null);

  // Durable Client State Persistence For Flash Deals
  // complex state replaced by useStore
dentifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Navbar from "./components/Navbar";

const CustomerViews = lazy(() => import("./components/CustomerViews"));
const MapTracking = lazy(() => import("./components/MapTracking"));
const VendorAdmin = lazy(() => import("./components/VendorAdmin"));
const VendorAuth = lazy(() => import("./components/VendorAuth"));
const UserAuthHub = lazy(() => import("./components/UserAuthHub"));
const PaystackCheckout = lazy(() => import("./components/PaystackCheckout"));
const CookiePopup = lazy(() => import("./components/CookiePopup"));
const PolicyOverlay = lazy(() => import("./components/PolicyOverlay"));
const FAQWidget = lazy(() => import("./components/FAQWidget"));

import { initPostHog, trackAddToCart, trackCheckoutStarted, trackPaymentCompleted, trackOrderCompleted } from "./lib/posthog";
import { Product, CartItem, Order, Vendor, Category, FlashDealProposal, Advertisement } from "./types";
import { useSEO } from "./hooks/useSEO";
import { fetchAndEnrichCategories } from "./services/categoriesService";
import { MOCK_PRODUCTS, MOCK_ORDERS, MOCK_VENDORS, MOCK_ADS } from "./data/mockData";
import { formatNaira } from "./utils";
import { useStore } from "./store/useStore";
import { Info, Settings, Sparkles, X, Mail, ShieldAlert, Database, CheckCircle, AlertCircle, Copy, FileText, Store, Bug, RefreshCw } from "lucide-react";
import { supabase, getSupabaseData, saveSupabaseRecord, saveSupabaseBatchRecords, PROVISION_SQL_SCRIPT, ensureUUID, setSupabaseToken } from "./supabase";
import { sendResendEmail, fetchEmailLogs, MailLogEntry } from "./emailService";

// Standard browser cookie helper functions
function getCookie(name: string): string {
  try {
    const nameEQ = name + "=";
    const ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
  } catch (e) {
    console.warn("Fail reading cookie: ", e);
  }
  return "";
}

function setCookie(name: string, value: string, days = 7) {
  try {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
  } catch (e) {
    console.warn("Fail writing cookie: ", e);
  }
}

import GracefulErrorScreen from "./components/GracefulErrorScreen";

const slugifyLocal = (text: string) => text.toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-");

const mockVendorIds = ["v_heritage", "v_alaba", "v_compvillage", "v_balogun", "v_sheabeauty", "v_snacks", "v_lekki", "v_yaba"];
const isVendorIdMock = (id: string) => {
  if (!id) return false;
  const idStr = String(id).trim();
  if (mockVendorIds.includes(idStr)) return true;
  for (const mvId of mockVendorIds) {
    if (ensureUUID(mvId) === idStr) return true;
  }
  return false;
};

const isProductIdMock = (id: string) => {
  if (!id) return false;
  const idStr = String(id).trim();
  if (/^(p|fs)\d+$/i.test(idStr)) return true;
  for (let i = 1; i <= 150; i++) {
    if (ensureUUID(`p${i}`) === idStr || ensureUUID(`fs${i}`) === idStr) {
      return true;
    }
  }
  return false;
};

const isOrderIdMock = (id: string) => {
  if (!id) return false;
  const idStr = String(id).trim();
  if (idStr.startsWith("NS-")) return true;
  for (let i = 9941; i <= 9950; i++) {
    if (ensureUUID(`NS-${i}`) === idStr) return true;
  }
  return false;
};

class ErrorBoundary extends React.Component<{ fallback?: React.ReactNode, children: React.ReactNode }, any> {
  state = { hasError: false, error: null };
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // @ts-ignore
      return this.props.fallback || <GracefulErrorScreen />;
    }
    // @ts-ignore
    return this.props.children;
  }
}

export default function App() {

  const {
    currentScreen, setCurrentScreen,
    selectedProductId, setSelectedProductId,
    selectedVendorSlug, setSelectedVendorSlug,
    initialCategory, setInitialCategory,
    searchFilter, setSearchFilter,
    isCheckoutOpen, setIsCheckoutOpen,
    settingsDrawerOpen, setSettingsDrawerOpen,
    
    currentUserId, setCurrentUserId,
    userEmail, setUserEmail,
    vendorAuthenticated, setVendorAuthenticated,
    authReady, setAuthReady,
    
    products, setProducts,
    vendors, setVendors,
    categories, setCategories,
    orders, setOrders,
    ads, setAds,
    flashDeals, setFlashDeals,
    deliveryZones, setDeliveryZones,
    
    cart, setCart,
    addToCart: handleAddToCart,
    updateCartQty: handleUpdateCartQty,
    removeFromCart: handleRemoveFromCart,
    clearCart,
    checkoutAmount, setCheckoutAmount,
    
    userBankName, setUserBankName,
    userBankAccountNumber, setUserBankAccountNumber,
    userCacNumber, setUserCacNumber,
    userStoreName, setUserStoreName,
    userOwnerName, setUserOwnerName,
    userAvatar, setUserAvatar,
    userWhatsappNumber, setUserWhatsappNumber,
    userLocation, setUserLocation
  } = useStore();
  // replaced by useStore
  // replaced by useStore
  // replaced by useStore
  // replaced by useStore
  // replaced by useStore
  const shouldReduceMotion = useReducedMotion();
  // replaced by useStore
  const [userBankName, setUserBankName] = useState<string>(() => localStorage.getItem("vendor_bank_name") || "");
  const [userBankAccountNumber, setUserBankAccountNumber] = useState<string>(() => localStorage.getItem("vendor_account_number") || "");
  const [userCacNumber, setUserCacNumber] = useState<string>(() => localStorage.getItem("vendor_cac_number") || "");
  const [userStoreName, setUserStoreName] = useState<string>(() => localStorage.getItem("vendor_store_name") || "");
  const [userOwnerName, setUserOwnerName] = useState<string>(() => localStorage.getItem("vendor_owner_name") || "");
  const [userAvatar, setUserAvatar] = useState<string>(() => localStorage.getItem("vendor_avatar") || "");
  const [userWhatsappNumber, setUserWhatsappNumber] = useState<string>(() => localStorage.getItem("vendor_whatsapp_number") || "");
  const [userLocation, setUserLocation] = useState<string>(() => localStorage.getItem("vendor_location") || "");
  const [userDeliveryAddress, setUserDeliveryAddress] = useState<string>("");
  // replaced by useStore
  // replaced by useStore
  const [checkoutAmount, setCheckoutAmount] = useState<number>(0);
  // replaced by useStore
  // replaced by useStore

  // Resend Automation states
  const [mailLogs, setMailLogs] = useState<MailLogEntry[]>([]);
  const [autoSendEmails, setAutoSendEmails] = useState<boolean>(true);

  // replaced by useStore

  // Router logic to interpret URL on first load and back/forward
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      const seoCategories = ["electronics", "fashion", "phones", "laptops", "beauty", "home-kitchen", "sports", "gaming"];
      if (path.startsWith("/cart")) setCurrentScreen("cart");
      else if (path.startsWith("/about")) setCurrentScreen("about");
      else if (path.startsWith("/contact")) setCurrentScreen("contact");
      else if (path.startsWith("/sell")) setCurrentScreen("sell");
      else if (path.startsWith("/faq")) setCurrentScreen("faq");
      else if (path.startsWith("/stores")) setCurrentScreen("stores");
      else if (path.startsWith("/admin") || path.startsWith("/dashboard")) setCurrentScreen("admin");
      else if (path.startsWith("/tracking")) setCurrentScreen("map");
      else if (path.startsWith("/auth")) setCurrentScreen("auth");
      else if (path.startsWith("/shop")) {
        setCurrentScreen("shop");
        setInitialCategory("all");
      }
      else if (path.startsWith("/product/")) {
        const raw = path.split("/product/")[1];
        if (raw) {
          let id = raw.split("-")[0];
          const uuidMatch = raw.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
          if (uuidMatch) {
            id = uuidMatch[0];
          } else if (raw.startsWith("p") || raw.startsWith("v")) {
            // retain existing behavior for mock ids
            id = raw.split("-")[0];
          }
          setSelectedProductId(id);
          setCurrentScreen("details");
        }
      }
      else if (path.startsWith("/vendor/")) {
        const raw = path.split("/vendor/")[1];
        if (raw) {
          let slug = raw;
          const uuidMatch = raw.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
          if (uuidMatch) {
            slug = uuidMatch[0];
          } else if (raw.startsWith("v_") || raw.startsWith("vendor")) {
            slug = raw.split("-")[0];
          } else {
            // Decoding the raw component in case there are encoded characters
            slug = decodeURIComponent(raw);
          }
          setSelectedVendorSlug(slug);
          setCurrentScreen("vendor");
        }
      }
      else if (path.startsWith("/category/")) {
        const cat = path.split("/category/")[1];
        if (cat) {
          setInitialCategory(cat);
          setCurrentScreen("shop");
        }
      }
      else if (seoCategories.includes(path.substring(1))) {
        setInitialCategory(path.substring(1));
        setCurrentScreen("shop");
      }
      else setCurrentScreen("home");
    };

    handleUrlChange();
    window.addEventListener("popstate", handleUrlChange);
    return () => window.removeEventListener("popstate", handleUrlChange);
  }, []);

  // Sync URL with current screen changes
  useEffect(() => {
    let newPath = "/";
    const seoCategories = ["electronics", "fashion", "phones", "laptops", "beauty", "home-kitchen", "sports", "gaming"];
    if (currentScreen === "cart") newPath = "/cart";
    else if (currentScreen === "about") newPath = "/about";
    else if (currentScreen === "contact") newPath = "/contact";
    else if (currentScreen === "sell") newPath = "/sell";
    else if (currentScreen === "faq") newPath = "/faq";
    else if (currentScreen === "stores") newPath = "/stores";
    else if (currentScreen === "admin") newPath = "/dashboard";
    else if (currentScreen === "map") newPath = "/tracking";
    else if (currentScreen === "auth") newPath = "/auth";
    else if (currentScreen === "shop") {
      if (seoCategories.includes(initialCategory)) {
        newPath = `/${initialCategory}`;
      } else {
        newPath = window.location.pathname.startsWith("/category/") ? window.location.pathname : "/shop";
      }
    }
    else if (currentScreen === "details") {
      const prod = products.find(p => p.id === selectedProductId);
      const slug = prod ? slugifyLocal(prod.title) : "";
      newPath = `/product/${selectedProductId}${slug ? `-${slug}` : ""}`;
    }
    else if (currentScreen === "vendor") {
      const vend = vendors.find(v => v.id === selectedVendorSlug || slugifyLocal(v.name) === selectedVendorSlug);
      const slug = vend ? slugifyLocal(vend.name) : selectedVendorSlug;
      newPath = `/vendor/${selectedVendorSlug}${slug && slug !== selectedVendorSlug ? `-${slug}` : ""}`;
    }
    
    if (window.location.pathname !== newPath && currentScreen !== "home") {
       window.history.pushState({ screen: currentScreen }, "", newPath);
    } else if (currentScreen === "home" && window.location.pathname !== "/") {
       window.history.pushState({ screen: "home" }, "", "/");
    }
  }, [currentScreen, selectedProductId, initialCategory, selectedVendorSlug]);

  // Synchronize category state across tabs via BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel('categories_sync_channel');
    channel.onmessage = (event) => {
      if (event.data?.type === 'CATEGORIES_UPDATED' && event.data?.categories) {
        setCategories(event.data.categories);
      } else if (event.data?.type === 'FORCE_REFETCH') {
        fetchAndEnrichCategories().then((data) => {
          if (data) {
            const finalCats = data.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
            setCategories(finalCats);
            try { localStorage.setItem("NAIJA_CATEGORIES_STATE", JSON.stringify(finalCats)); } catch(e) {}
          }
        });
      }
    };
    return () => channel.close();
  }, []);

  // complex state replaced by useStore


  // complex state replaced by useStore


  // complex state replaced by useStore


  // complex state replaced by useStore

  // complex state replaced by useStore

  // complex state replaced by useStore


  // complex state replaced by useStore


  // Initial PostHog runtime loading
  useEffect(() => {
    initPostHog();
    
    // Redirect parsing for email confirmations
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === 'true') {
      setCurrentScreen("auth");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useSEO(currentScreen, selectedProductId, initialCategory, selectedVendorSlug, products, vendors, categories);

  const [activePolicy, setActivePolicy] = useState<"privacy" | "terms" | "shipping" | "refund" | null>(null);

  // Durable Client State Persistence For Flash Deals
  const [flashDeals, setFlashDeals] = useState<FlashDealProposal[]>(() => {
    try {
      const saved = localStorage.getItem("NAIJA_FLASH_DEALS_PROPOSALS");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const handleProposeFlashDeal = (newProposal: FlashDealProposal) => {
    setFlashDeals(prev => {
      const updated = [newProposal, ...prev];
      localStorage.setItem("NAIJA_FLASH_DEALS_PROPOSALS", JSON.stringify(updated));
      return updated;
    });
  };

  const handleApproveFlashDeal = (id: string) => {
    setFlashDeals(prev => {
      const updated = prev.map(fd => fd.id === id ? { ...fd, status: "approved" as const } : fd);
      localStorage.setItem("NAIJA_FLASH_DEALS_PROPOSALS", JSON.stringify(updated));
      return updated;
    });
  };

  const handleRejectFlashDeal = (id: string) => {
    setFlashDeals(prev => {
      const updated = prev.map(fd => fd.id === id ? { ...fd, status: "rejected" as const } : fd);
      localStorage.setItem("NAIJA_FLASH_DEALS_PROPOSALS", JSON.stringify(updated));
      return updated;
    });
  };

  const handleUpdateCategories = async (newCats: Category[]) => {
    setCategories(newCats);
    try {
      localStorage.setItem("NAIJA_CATEGORIES_STATE", JSON.stringify(newCats));
      const channel = new BroadcastChannel('categories_sync_channel');
      channel.postMessage({ type: 'CATEGORIES_UPDATED', categories: newCats });
      channel.close();
      // Save all categories to Supabase concurrently so they take precedence globally
      await saveSupabaseBatchRecords("categories", newCats);
    } catch (e) {
      console.warn("Error saving categories to Supabase", e);
    }
  };

  // Supabase Sync States
  const [dbSyncStatus, setDbSyncStatus] = useState<{
    connected: boolean;
    syncedTables: string[];
    vendorsSynced: boolean;
    productsSynced: boolean;
    ordersSynced: boolean;
    loading: boolean;
    error?: string;
  }>({
    connected: false,
    syncedTables: [],
    vendorsSynced: false,
    productsSynced: false,
    ordersSynced: false,
    loading: true
  });
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Synchronize standard Supabase Auth
  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.warn("[SUPABASE GETSESSION] Error from getSession:", error);
        if (error.message?.includes("Refresh Token")) {
          supabase.auth.signOut().catch(() => {});
          // Clear local storage aggressively to prevent infinite loops of refresh
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes("sb-") || key.includes("supabase"))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
        }
      }
      if (session?.user) {
        const uEmail = session.user.email || "shopper@example.com";
        setUserEmail(uEmail);
        setCurrentUserId(session.user.id);
        setUserDeliveryAddress(session.user.user_metadata?.deliveryAddress || "");
        setAuthReady(true);
        const role = session.user.user_metadata?.role || "customer";
        
        // Also check if vendor email
        const isMaster = ["adminnaijastoresonline@gmail.com", "mcgigimeshai@gmail.com"].includes(uEmail.toLowerCase());
        if (role === "vendor" || role === "admin" || isMaster) {
          setVendorAuthenticated(true);
        } else {
          const checkVendorFallback = async () => {
            try {
              const { data } = await supabase.from("vendors").select("id").eq("user_id", session.user.id).limit(1);
              if (data && data.length > 0) setVendorAuthenticated(true);
              else setVendorAuthenticated(false);
            } catch (e) {
              setVendorAuthenticated(false);
            }
          };
          checkVendorFallback();
        }
      } else {
        // Not logged in or guest
        setUserEmail("adminnaijastoresonline@gmail.com");
        setCurrentUserId(null);
        setUserDeliveryAddress("");
        setAuthReady(true);
        setUserBankName("");
        setUserBankAccountNumber("");
        setUserCacNumber("");
        setUserStoreName("");
        setUserOwnerName("");
        setUserAvatar("");
        setUserWhatsappNumber("");
        setUserLocation("");
        localStorage.removeItem("vendor_bank_name");
        localStorage.removeItem("vendor_account_number");
        localStorage.removeItem("vendor_cac_number");
        localStorage.removeItem("vendor_store_name");
        localStorage.removeItem("vendor_owner_name");
        localStorage.removeItem("vendor_avatar");
        localStorage.removeItem("vendor_whatsapp_number");
        localStorage.removeItem("vendor_location");
        setVendorAuthenticated(false);
      }
    }).catch(err => {
      console.warn("[SUPABASE GETSESSION] Failed to restore session on initialization:", err);
      if (err?.message?.includes("Invalid Refresh Token") || err?.message?.includes("Refresh Token Not Found")) {
        supabase.auth.signOut().catch(() => {});
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.includes("sb-") || key.includes("supabase"))) {
            localStorage.removeItem(key);
          }
        }
      }
    });

    // Listen for auth level events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const uEmail = session.user.email || "shopper@example.com";
        setUserEmail(uEmail);
        setCurrentUserId(session.user.id);
        setUserDeliveryAddress(session.user.user_metadata?.deliveryAddress || "");
        const role = session.user.user_metadata?.role || "customer";
        if (role === "vendor" || role === "admin" || ["adminnaijastoresonline@gmail.com", "mcgigimeshai@gmail.com"].includes(uEmail.toLowerCase())) {
          setVendorAuthenticated(true);
        } else {
          const checkVendorFallback = async () => {
            try {
              const { data } = await supabase.from("vendors").select("id").eq("user_id", session.user.id).limit(1);
              if (data && data.length > 0) setVendorAuthenticated(true);
              else setVendorAuthenticated(false);
            } catch (e) {
              setVendorAuthenticated(false);
            }
          };
          checkVendorFallback();
        }
      } else {
        setVendorAuthenticated(false);
        setCurrentUserId(null);
        setUserDeliveryAddress("");
        setUserEmail("adminnaijastoresonline@gmail.com");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync Supabase on initial render and on auth state change
  useEffect(() => {
    async function initSupabase() {
      try {
        const timeoutPromise = new Promise<{ data: any[]; synced: boolean; error?: string }>(
          (_, reject) => setTimeout(() => reject(new Error("Fetch timed out")), 30000)
        );

        const safeFetch = <T,>(tableName: string) => Promise.race([
          getSupabaseData<T>(tableName, []),
          timeoutPromise as Promise<{ data: T[]; synced: boolean; error?: string }>
        ]).catch(() => ({ data: [] as T[], synced: false, error: "timeout" }));

        // Load all core datasets concurrently
        const [
          { data: dbVendorsRaw, synced: vSynced, error: vError },
          { data: dbProducts, synced: pSynced, error: pError },
          { data: dbOrders, synced: oSynced, error: oError },
          { data: dbCategories, synced: cSynced, error: cError }
        ] = await Promise.all([
          safeFetch<Vendor>("vendors"),
          safeFetch<Product>("products"),
          safeFetch<Order>("orders"),
          Promise.race([
            fetchAndEnrichCategories().then(data => ({ data, synced: true, error: undefined })),
            timeoutPromise as Promise<{ data: Category[]; synced: boolean; error?: string }>
          ]).catch(() => ({ data: [] as Category[], synced: false, error: "timeout" }))
        ]);
        
        let dbVendors = dbVendorsRaw || [];
        
        // Let the front end always query database for the vendor's credentials based on the user object
        if (currentUserId) {
           try {
             // Query by user_id which is guaranteed to be linked correctly via RLS & Trigger
             const { data: userVendor } = await supabase.from("vendors").select("id, business_name, name, logo_url, avatar, rating, rating_count, sales_today, orders_pending, stock_alerts, bank_name, account_number, cac_number, whatsapp_number, physical_location, location, is_verified, phone, email, owner_name, business_description").eq("user_id", currentUserId).limit(1);
             if (userVendor && userVendor.length > 0) {
               const item = userVendor[0];
               const mappedUserVendor: Vendor = {
                 ...item,
                 name: item.business_name || item.name || "Naija Store Merchant",
                 avatar: item.logo_url || item.avatar || "",
                 rating: item.rating || 0,
                 ratingCount: item.rating_count || item.ratingCount || 0,
                 salesToday: item.sales_today || item.salesToday || 0,
                 ordersPending: item.orders_pending || item.ordersPending || 0,
                 stockAlerts: item.stock_alerts || item.stockAlerts || 0,
                 bankName: item.bank_name || item.bankName || "",
                 accountNumber: item.account_number || item.accountNumber || "",
                 cacNumber: item.cac_number || item.cacNumber || "",
                 whatsappNumber: item.whatsapp_number || item.whatsappNumber || "",
                 location: item.physical_location || item.physicalLocation || item.location || "",
                 isVerified: item.is_verified || item.isVerified || false,
                 phone: item.phone || item.whatsapp_number || item.whatsappNumber || "+234 800 000 0000",
                 email: item.email || "",
                 ownerName: item.owner_name || item.ownerName || "",
                 business_description: item.business_description || "",
               };
               // Combine into dbVendors to guarantee it's in the state
               const exists = dbVendors.some(v => v.id === mappedUserVendor.id);
               if (!exists) {
                 dbVendors = [mappedUserVendor, ...dbVendors];
               } else {
                 dbVendors = dbVendors.map(v => v.id === mappedUserVendor.id ? mappedUserVendor : v);
               }
             }
           } catch (e) {
             console.warn("Could not query direct vendor credentials by email:", e);
           }
        }
        
        if (dbVendors) {
          // Identify active vendor row from Database to synchronize bank and registration details to state & local cache
          const activeDbVendor = dbVendors.find(v => {
            if (userEmail && v.email && String(v.email).toLowerCase() === String(userEmail).toLowerCase()) return true;
            if (currentUserId && (
              v.user_id === currentUserId || 
              v.userId === currentUserId || 
              v.user_id === ensureUUID(currentUserId) ||
              v.userId === ensureUUID(currentUserId) ||
              v.id === ensureUUID(currentUserId)
            )) return true;
            return false;
          });
          if (activeDbVendor) {
            const b = activeDbVendor.bankName || activeDbVendor.bank_name || "";
            const a = activeDbVendor.accountNumber || activeDbVendor.account_number || "";
            const c = activeDbVendor.cacNumber || activeDbVendor.cac_number || "";
            const sName = activeDbVendor.business_name || activeDbVendor.name || "Naija Store Merchant";
            const oName = activeDbVendor.ownerName || activeDbVendor.owner_name || "Vendor Owner";
            const aUrl = activeDbVendor.logo_url || activeDbVendor.avatar || "";
            const wNum = activeDbVendor.whatsapp_number || activeDbVendor.whatsappNumber || activeDbVendor.phone || "";
            const loc = activeDbVendor.physical_location || activeDbVendor.location || "";
            setUserBankName(b);
            setUserBankAccountNumber(a);
            setUserCacNumber(c);
            setUserStoreName(sName);
            setUserOwnerName(oName);
            setUserAvatar(aUrl);
            setUserWhatsappNumber(wNum);
            setUserLocation(loc);
            localStorage.setItem("vendor_bank_name", b);
            localStorage.setItem("vendor_account_number", a);
            localStorage.setItem("vendor_cac_number", c);
            localStorage.setItem("vendor_store_name", sName);
            localStorage.setItem("vendor_owner_name", oName);
            localStorage.setItem("vendor_avatar", aUrl);
            localStorage.setItem("vendor_whatsapp_number", wNum);
            localStorage.setItem("vendor_location", loc);
          }

          setVendors(dbVendors); // Replaced mock seeding with native sync logic
          try { localStorage.setItem("NAIJA_VENDORS_STATE", JSON.stringify(dbVendors)); } catch (e) {}
        }

        // Load Products
        if (dbProducts) {
          // Sort newest first or simply reverse so latest uploaded show first on homepage
          const sortedProducts = [...dbProducts].reverse();
          setProducts(sortedProducts);
          try { localStorage.setItem("NAIJA_PRODUCTS_STATE", JSON.stringify(sortedProducts)); } catch (e) {}
        }

        // Load Orders
        if (dbOrders) {
          const nonMockOrders = dbOrders.filter(o => !isOrderIdMock(o.id));
          setOrders(nonMockOrders);
          try { localStorage.setItem("NAIJA_ORDERS_STATE", JSON.stringify(nonMockOrders)); } catch (e) {}
        }

        // Load Categories
        let localCategories: Category[] | null = null;
        try {
          const stored = localStorage.getItem("NAIJA_CATEGORIES_STATE");
          if (stored) localCategories = JSON.parse(stored);
        } catch (e) {}

        console.log("[CATEGORIES SYNC DEBUG] dbCategories:", dbCategories, "synced:", cSynced, "error:", cError);
        
        let finalCategories: Category[] = [];

        if (cSynced && dbCategories) {
          finalCategories = dbCategories;
        } else {
          if (localCategories && localCategories.length > 0) {
            finalCategories = localCategories;
          }
        }
        
        // Sort by sortOrder
        finalCategories.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        
        setCategories(finalCategories);
        try { localStorage.setItem("NAIJA_CATEGORIES_STATE", JSON.stringify(finalCategories)); } catch(e) {}


        const syncedList: string[] = [];
        if (vSynced) syncedList.push("vendors");
        if (pSynced) syncedList.push("products");
        if (oSynced) syncedList.push("orders");
        if (cSynced) syncedList.push("categories");

        setDbSyncStatus({
          connected: syncedList.length > 0,
          syncedTables: syncedList,
          vendorsSynced: vSynced,
          productsSynced: pSynced,
          ordersSynced: oSynced,
          loading: false,
          error: vError || pError || oError || cError
        });

        if (syncedList.length > 0) {
          console.log(`Successfully connected to Supabase! Synced: ${syncedList.join(", ")}`);
        } else {
          console.log("Supabase: Operating in optimized local fallback simulation.");
        }
      } catch (err: any) {
        setDbSyncStatus(prev => ({ ...prev, loading: false, error: err.message }));
      }
    }
    initSupabase();
  }, [currentUserId, userEmail]);

  // Set up real-time orders sync subscription
  useEffect(() => {
    // Disabled to save egress. Re-enable with proper RLS-filtering for vendors only if needed.
    // Customers do not need a global firehose of all platform orders.
  }, [dbSyncStatus.connected]);

  const handleRateVendor = (vendorId: string, starRating: number) => {
    setVendors(prevVendors => {
      const updated = prevVendors.map(v => {
        if (v.id === vendorId) {
          const currentCount = v.ratingCount || 10;
          const newCount = currentCount + 1;
          const newRating = Number(((v.rating * currentCount + starRating) / newCount).toFixed(1));
          triggerToast(`Thank you! Rated ${v.name} with ${starRating} Stars. Average is now ${newRating}.`, "success");
          
          const updatedVendor = {
            ...v,
            rating: newRating,
            ratingCount: newCount
          };
          
          // Parallel background execution to save updated performance metrics directly to Supabase sandbox
          saveSupabaseRecord("vendors", updatedVendor);
          
          return updatedVendor;
        }
        return v;
      });
      return updated;
    });
  };

  const handleUpdateVendor = async (updatedVendor: Vendor) => {
    const compliantId = ensureUUID(updatedVendor.id);
    const resolvedVendor: Vendor = {
      ...updatedVendor,
      id: compliantId,
      userId: updatedVendor.userId ? ensureUUID(updatedVendor.userId) : undefined,
      user_id: updatedVendor.user_id ? ensureUUID(updatedVendor.user_id) : undefined,
    };

    const bName = resolvedVendor.bankName || resolvedVendor.bank_name || "";
    const accNum = resolvedVendor.accountNumber || resolvedVendor.account_number || "";
    const cacN = resolvedVendor.cacNumber || resolvedVendor.cac_number || "";
    const sName = resolvedVendor.business_name || resolvedVendor.name || "Naija Store Merchant";
    const oName = resolvedVendor.ownerName || resolvedVendor.owner_name || "Vendor Owner";
    const aUrl = resolvedVendor.logo_url || resolvedVendor.avatar || "";
    const wNum = resolvedVendor.whatsapp_number || resolvedVendor.whatsappNumber || resolvedVendor.phone || "";
    const loc = resolvedVendor.physical_location || resolvedVendor.location || "";
    setUserBankName(bName);
    setUserBankAccountNumber(accNum);
    setUserCacNumber(cacN);
    setUserStoreName(sName);
    setUserOwnerName(oName);
    setUserAvatar(aUrl);
    setUserWhatsappNumber(wNum);
    setUserLocation(loc);
    localStorage.setItem("vendor_bank_name", bName);
    localStorage.setItem("vendor_account_number", accNum);
    localStorage.setItem("vendor_cac_number", cacN);
    localStorage.setItem("vendor_store_name", sName);
    localStorage.setItem("vendor_owner_name", oName);
    localStorage.setItem("vendor_avatar", aUrl);
    localStorage.setItem("vendor_whatsapp_number", wNum);
    localStorage.setItem("vendor_location", loc);

    // Optimistically update local vendors list immediately
    setVendors(prevVendors => {
      const exists = prevVendors.some(v => v.id === resolvedVendor.id || (v.user_id && resolvedVendor.user_id && v.user_id === resolvedVendor.user_id));
      if (exists) {
        return prevVendors.map(v => (v.id === resolvedVendor.id || (v.user_id && resolvedVendor.user_id && v.user_id === resolvedVendor.user_id)) ? resolvedVendor : v);
      } else {
        return [...prevVendors, resolvedVendor];
      }
    });

    try {
      // Save changes to Supabase
      await saveSupabaseRecord("vendors", resolvedVendor);
      triggerToast(`Store profile updated successfully!`, "success");

      // Re-fetch vendors from Supabase to guarantee total alignment and persistence
      const { data: dbVendors } = await getSupabaseData<Vendor>("vendors", []);
      if (dbVendors) {
        const nonMockVendors = dbVendors.filter(v => {
          if (updatedVendor.user_id && v.user_id === updatedVendor.user_id) return true;
          if (updatedVendor.userId && v.userId === updatedVendor.userId) return true;
          if (updatedVendor.email && v.email === updatedVendor.email) return true;
          if (currentUserId && (v.user_id === currentUserId || v.userId === currentUserId || v.id === ensureUUID(currentUserId))) return true;
          if (userEmail && v.email && String(v.email).toLowerCase() === String(userEmail).toLowerCase()) return true;
          if (v.bank_name || v.bankName || v.account_number || v.accountNumber || v.cac_number || v.cacNumber || v.whatsapp_number || v.whatsappNumber) return true;
          return !isVendorIdMock(v.id);
        });

        // Always ensure the newly updated vendor remains explicitly if the server lag drops it
        setVendors(prev => {
          let matched = false;
          const updated = nonMockVendors.map(v => {
            if (v.id === resolvedVendor.id || (v.user_id && resolvedVendor.user_id && v.user_id === resolvedVendor.user_id)) {
              matched = true;
              return { ...v, ...resolvedVendor, id: v.id || resolvedVendor.id };
            }
            return v;
          });
          return matched ? updated : [...nonMockVendors, resolvedVendor];
        });
      }
    } catch (err) {
      console.warn("Failed to automatically refresh vendor database:", err);
    }
  };

  const updateMailLogs = async () => {
    const logs = await fetchEmailLogs();
    setMailLogs(logs);
    return logs;
  };

  // Poll server mail logs every 4 seconds to keep dashboard in perfect synchronization
  // Only register interval if the endpoint responds ok (200) to avoid 404 loops in mock/offline setups
  useEffect(() => {
    fetch("/api/resend/logs").then((res) => {
      if (res.ok) {
        updateMailLogs();
        // Remove 4s interval to reduce duplicate calls and egress
      }
    }).catch((err) => {
      console.log("Email logs disabled or endpoint not provisioned:", err.message);
    });
  }, []);

  // Direct dispatcher trigger mapper for manual testers
  const handleSendTestEmail = async (to: string, type: string, orderId: string) => {
    const matchingOrder = orders.find(o => o.id === orderId) || orders[0];
    const payload = {
      to,
      type,
      data: {
        orderId: matchingOrder?.id || orderId,
        customerName: to.split("@")[0].toUpperCase() || "Shopper",
        amount: matchingOrder?.value || 145000,
        itemsCount: matchingOrder?.itemsCount || 1,
        date: matchingOrder?.date || new Date().toISOString().split("T")[0],
        currentCity: matchingOrder?.currentCity || "Lagos",
        items: [
          { name: "Raw Unrefined Shea Butter", qty: 2, price: 14500 },
          { name: "Eko Calfskin slides", qty: 1, price: 32000 }
        ],
        actionUrl: window.location.origin,
        alertReason: "Standard compliance check has triggered validation verification holds on our automated order dispatch queue."
      }
    };
    const response = await sendResendEmail(payload);
    if (response.success) {
      triggerToast("Email dispatch triggered successfully via Edge Functions!", "success");
    } else {
      triggerToast(`Failing dispatch sequence: ${response.error || "Check logs"}`, "info");
    }
    updateMailLogs();
    return response;
  };

  const handlePreviewEmail = async (type: string, orderId: string) => {
    const matchingOrder = orders.find(o => o.id === orderId) || orders.find(o => o.id) || null;
    const payload = {
      to: "preview@naijaonlinestores.com.ng",
      type,
      data: {
        orderId: matchingOrder?.id || orderId || "NS-ORDER",
        customerName: "Shopper",
        amount: matchingOrder?.value || 145000,
        newStatus: "Processing"
      }
    };
    try {
      const response = await fetch("/api/resend/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      return json.html;
    } catch (e) {
      return null;
    }
  };

  // Success message toaster helper
  const [toaster, setToaster] = useState<{ show: boolean; msg: string; type: "success" | "info" }>({
    show: false,
    msg: "",
    type: "success"
  });

  const triggerToast = (msg: string, type: "success" | "info" = "success") => {
    setToaster({ show: true, msg, type });
  };

  useEffect(() => {
    if (toaster.show) {
      const h = setTimeout(() => {
        setToaster(prev => ({ ...prev, show: false }));
      }, 3500);
      return () => clearTimeout(h);
    }
  }, [toaster.show]);

  // Auto-logout feature for 30 minutes of inactivity (1800000ms)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleActivity = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          await supabase.auth.signOut();
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && (key.includes("sb-") || key.includes("supabase"))) {
              localStorage.removeItem(key);
            }
          }
          setCurrentScreen("home");
          triggerToast("You have been logged out due to 30 minutes of inactivity", "info");
        }
      }, 30 * 60 * 1000); // 30 minutes
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity);
    window.addEventListener("click", handleActivity);

    handleActivity();

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("click", handleActivity);
    };
  }, []);

  // Cart operations
  const handleAddToCart = (product: Product, quantity: number, size?: string, color?: string) => {
    const existing = cart.find(
      (item) =>
        item.product.id === product.id &&
        item.selectedSize === size &&
        item.selectedColor === color
    );

    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id &&
          item.selectedSize === size &&
          item.selectedColor === color
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      );
    } else {
      setCart([...cart, { product, quantity, selectedSize: size, selectedColor: color }]);
    }

    // Trigger PostHog event
    trackAddToCart(product.id, product.title, product.price, quantity);

    triggerToast(`Added ${quantity}x ${product.title} containing your specs to Basket.`);
  };

  const handleUpdateCartQty = (productId: string, quantity: number, size?: string, color?: string) => {
    setCart(
      cart.map((item) =>
        item.product.id === productId && item.selectedSize === size && item.selectedColor === color
          ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string, size?: string, color?: string) => {
    setCart(cart.filter((item) => !(item.product.id === productId && item.selectedSize === size && item.selectedColor === color)));
    triggerToast("Removed item from cart.", "info");
  };

  // Checkout launcher
  const handleCheckoutTrigger = () => {
    if (cart.length === 0) return;
    
    // We will collect delivery address via the PaystackCheckout flow.
    const cartSubtotal = cart.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);
    const estimatedTax = cartSubtotal * 0.075; // 7.5% VAT Nigeria
    // Estimate shipping (Lagos is free 0)
    const cartTotalSum = cartSubtotal + estimatedTax;

    setCheckoutAmount(cartTotalSum);
    setIsCheckoutOpen(true);

    // Track checkout starter metrics
    trackCheckoutStarted(
      cart.map((item) => ({
        id: item.product.id,
        title: item.product.title,
        price: item.product.price,
        quantity: item.quantity,
      })),
      cartTotalSum
    );
  };

  // Paystack verification success
  const handlePaymentSuccess = (method: string, serverOrder?: Order, checkoutEmail?: string) => {
    // Generate simulated order fallback if server did not hand back records (e.g. offline fallback modes)
    const orderValue = cart.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);
    const finalEmail = checkoutEmail || userEmail;
    if (checkoutEmail && checkoutEmail !== userEmail) {
      setUserEmail(checkoutEmail);
    }
    
    // Pick destination based on delivery address
    const destinationStates = ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara", "Abuja", "Port Harcourt"];
    
    let actualDest = "Lagos";
    if (userDeliveryAddress) {
      const foundState = destinationStates.find(state => userDeliveryAddress.toLowerCase().includes(state.toLowerCase()));
      if (foundState) {
        actualDest = foundState;
      }
    }

    const startState = actualDest.toLowerCase() === "lagos" ? "Kano" : "Lagos";

    const localOrder: Order = {
      id: "NS-" + Math.floor(Math.random() * 9000 + 1000),
      user_id: currentUserId || undefined,
      customerName: finalEmail.split("@")[0].toUpperCase() || "Shopper",
      deliveryAddress: userDeliveryAddress,
      status: "Processing",
      date: new Date().toISOString().split("T")[0],
      value: orderValue,
      itemsCount: cart.reduce((acc, curr) => acc + curr.quantity, 0),
      trackingId: "TRACK-" + Math.floor(Math.random() * 90000 + 10000),
      routeFrom: startState,
      routeTo: actualDest,
      deliveryProgress: 0,
      currentCity: startState,
      productIds: cart.map((item) => item.product.id)
    };

    const newOrder: Order = serverOrder || localOrder;

    const emailItems = cart.map((item) => ({
      name: item.product.title,
      qty: item.quantity,
      price: item.product.price
    }));

    setOrders((prev) => {
      // Prevent duplicate appending if real-time subscription has already updated state
      if (prev.some((o) => o.id === newOrder.id)) return prev;
      return [newOrder, ...prev];
    });

    // Track using PostHog
    trackPaymentCompleted(
      newOrder.trackingId || "PAY-" + Date.now(),
      checkoutAmount || newOrder.value,
      method || "Paystack Inline"
    );

    trackOrderCompleted(
      newOrder.id,
      newOrder.value,
      newOrder.itemsCount
    );

    setCart([]); // Clear cart
    
    // Persist new order in Supabase table only if it was not already created securely on backend
    if (!serverOrder) {
      saveSupabaseRecord("orders", newOrder);
    }
    
    triggerToast("Security Code 200: Transaction reconciled. Shipments logged successfully!");

    // Automatically trigger Resend payment confirmation emails
    if (autoSendEmails) {
      // 1. Payment confirmation
      sendResendEmail({
        to: finalEmail,
        type: "payment_confirmation",
        data: {
          orderId: newOrder.id,
          customerName: newOrder.customerName,
          amount: newOrder.value,
          actionUrl: window.location.origin
        }
      }).then((res) => {
        if (res.success) {
          triggerToast(`Receipt Dispatch success for order ${newOrder.id}!`, "success");
        }
        updateMailLogs();
      });

      // 2. Order Confirmation
      sendResendEmail({
        to: finalEmail,
        type: "order_confirmation", 
        data: {
          orderId: newOrder.id,
          customerName: newOrder.customerName,
          amount: newOrder.value,
          items: emailItems,
          shippingAddress: newOrder.routeTo,
          paymentMethod: method || "Paystack"
        }
      }).then(() => updateMailLogs());

      // 3. Admin Notification
      sendResendEmail({
        to: "admin@naijaonlinestores.com.ng",
        type: "admin_new_order",
        data: {
          orderId: newOrder.id,
          amount: newOrder.value
        }
      }).then(() => updateMailLogs());

      // 4. Vendor Notifications
      const vendorOrders = new Map<string, any[]>();
      cart.forEach(item => {
        const vName = item.product.vendorName;
        if (!vendorOrders.has(vName)) vendorOrders.set(vName, []);
        vendorOrders.get(vName)?.push(item);
      });

      vendorOrders.forEach((vItems, vName) => {
        const itemsStr = vItems.map(i => `<li>${i.quantity}x ${i.product.title}</li>`).join("");
        sendResendEmail({
          to: `vendor_${vName.replace(/\\s+/g, "").toLowerCase()}@naijaonlinestores.com.ng`, // Mocked vendor email
          type: "vendor_new_order",
          data: {
            vendorName: vName,
            orderId: newOrder.id,
            itemsHtml: itemsStr
          }
        }).then(() => updateMailLogs());
      });
    }
    
    // Automatically redirect to the interactive map dashboard so they can track it live
    setCurrentScreen("map");
  };

  // Admin order flag modifier
  const handleReviewOrderFlag = (orderId: string, status: Order["status"]) => {
    setOrders(
      orders.map((o) => {
        if (o.id === orderId) {
          const updated = { ...o, status, deliveryProgress: status === "Delivered" ? 100 : o.deliveryProgress };
          
          // Persist status modify in Supabase table
          saveSupabaseRecord("orders", updated);

          // Automatically trigger Resend automatic transactional emails
          if (autoSendEmails) {
            let emailType: "status_change" | "delivery_confirmation" | "flagged" = "status_change";
            if (status === "Shipped" || status === "Delivered") {
              emailType = "delivery_confirmation";
            } else if (status === "Flagged") {
              emailType = "flagged";
            }
            
            sendResendEmail({
              to: userEmail,
              type: emailType,
              data: {
                orderId: updated.id,
                customerName: updated.customerName,
                oldStatus: o.status,
                newStatus: status,
                currentCity: updated.currentCity,
                amount: updated.value
              }
            }).then(() => {
              updateMailLogs();
            });
          }
          
          return updated;
        }
        return o;
      })
    );
    triggerToast(`Order ${orderId} administrative status modified to ${status}.`);
  };

  // Live progress adapter from MapTracking
  const handleUpdateOrderProgress = (
    orderId: string,
    progress: number,
    currentCity: string,
    status?: Order["status"]
  ) => {
    setOrders(
      orders.map((o) => {
        if (o.id === orderId) {
          const updatedStatus = status || o.status;
          const updated = {
            ...o,
            deliveryProgress: progress,
            currentCity,
            status: updatedStatus
          };
          
          // Update tracker progress into Supabase table in background
          saveSupabaseRecord("orders", updated);
          
          return updated;
        }
        return o;
      })
    );
  };

  const handleConfirmReceipt = (orderId: string) => {
    setOrders(
      orders.map((o) => {
        if (o.id === orderId) {
          const updated = {
            ...o,
            status: "Delivered" as const,
            deliveryProgress: 100,
            receiptConfirmed: true
          };
          saveSupabaseRecord("orders", updated);
          triggerToast("Receipt confirmed! Thank you for shopping with Naija Stores.", "success");
          return updated;
        }
        return o;
      })
    );
  };

  const handlePromptReceipt = (orderId: string) => {
    setOrders(
      orders.map((o) => {
        if (o.id === orderId) {
          const updated = {
            ...o,
            receiptPrompted: true
          };
          saveSupabaseRecord("orders", updated);
          triggerToast("Confirmation prompt active: Customer must now tap received button manually.", "success");
          return updated;
        }
        return o;
      })
    );
  };

  const handleAddNewProduct = async (prod: Product) => {
    // Attempt to locate real Vendor UUID for Supabase relational schema
    const { data: sessionData } = await supabase.auth.getSession();
    const activeUserId = sessionData?.session?.user?.id || currentUserId;

    if (activeUserId && vendors && vendors.length > 0) {
      // Find the logged-in user's database vendor profile
      const actualVendor = vendors.find(v => 
        (v.user_id && v.user_id === activeUserId) || 
        (v.userId && v.userId === activeUserId) || 
        (v.id && String(v.id).toLowerCase() === String(activeUserId).toLowerCase())
      );
      if (actualVendor && actualVendor.id) {
        prod.vendorId = actualVendor.id;
        prod.vendorName = actualVendor.business_name || actualVendor.name || prod.vendorName || "Naija Vendor";
      }
    }

    try {
      // Push new product into Supabase table
      const success = await saveSupabaseRecord("products", prod);
      if (!success) throw new Error("Failed to save product in database.");
      
      setProducts([prod, ...products]);
      triggerToast(`Successfully published ${prod.title} to NaijaStores Catalog.`, "success");
    } catch (err: any) {
      triggerToast(err.message || "Failed to publish product.");
    }
  };

  const handleUpdateProduct = async (updatedProd: Product) => {
    try {
      const success = await saveSupabaseRecord("products", updatedProd);
      if (!success) throw new Error("Failed to update product in database.");
      
      setProducts(prev => prev.map(p => p.id === updatedProd.id ? updatedProd : p));
      triggerToast(`Successfully updated ${updatedProd.title}.`, "success");
    } catch (err: any) {
      triggerToast(err.message || "Failed to update product.");
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const dbId = ensureUUID(productId);
      const { error } = await supabase.from("products").delete().eq("id", dbId);
      if (error) throw error;

      setProducts(prev => prev.filter(p => p.id !== productId));
      triggerToast(`Listing removed from catalog.`, "success");
    } catch (err: any) {
      triggerToast(err.message || "Failed to delete product.");
    }
  };

  const linkedProducts = products;

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans antialiased text-slate-500">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-slate-200 rounded-full animate-spin"></div>
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0" style={{ animationDuration: '0.8s' }}></div>
          </div>
          <p className="text-sm font-bold tracking-tight text-slate-600 animate-pulse">
             We'll be ready to take your orders in a minute
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none antialiased">
      
      {/* Animated Green Call To Order Banner */}
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-emerald-600 text-white text-[11px] sm:text-xs py-2 px-4 shadow-sm flex items-center justify-center relative overflow-hidden z-25 border-b border-emerald-500/25"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-x-4 gap-y-1.5 w-full text-center">
          <div className="flex items-center space-x-1.5 justify-center">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-100 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            <span className="font-extrabold uppercase tracking-widest text-[9px] bg-emerald-800/40 px-2 py-0.5 rounded text-emerald-300">Ordering Options</span>
          </div>
          
          <p className="font-semibold tracking-wide text-white/95">
            Shop online via secure cart, or optionally call/WhatsApp us to order directly! Nationwide delivery.
          </p>

          <div className="flex items-center space-x-2 mt-0.5 sm:mt-0">
            <a 
              href="tel:+2348035237665" 
              className="bg-white text-emerald-800 hover:bg-emerald-50 px-2.5 py-1 rounded-lg font-bold shadow-xs transition-all hover:scale-105 inline-flex items-center space-x-1 text-[11px]"
            >
              <span>📞</span>
              <span>0803 523 7665</span>
            </a>
            <a 
              href="https://wa.me/2348035237665?text=Hello%20Naija%20Online%20Stores%2C%20I%20want%20to%20place%20an%20order" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-emerald-950 text-white hover:bg-emerald-900 border border-emerald-800 px-2.5 py-1 rounded-lg font-bold shadow-xs transition-all hover:scale-105 inline-flex items-center space-x-1 text-[11px]"
            >
              <span className="w-3.5 h-3.5 inline-block text-[11px]">💬</span>
              <span>WhatsApp Order Option</span>
            </a>
          </div>
        </div>
      </motion.div>

      {/* Prime Header */}
      <Navbar
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen)}
        onSelectProduct={(id) => setSelectedProductId(id)}
        cartCount={cart.reduce((acc, curr) => acc + curr.quantity, 0)}
        onSearch={(query) => {
          setSearchFilter(query);
          if (query) {
             const key = `recent_searches_${currentUserId || "guest"}`;
             const existing = JSON.parse(localStorage.getItem(key) || "[]");
             const updated = [query, ...existing.filter((s: string) => s !== query)].slice(0, 5);
             localStorage.setItem(key, JSON.stringify(updated));
          }
        }}
        userEmail={userEmail}
        categories={categories}
        products={linkedProducts}
        isLoggedIn={!!currentUserId}
        onSelectCategory={(catId) => {
          setInitialCategory(catId);
          setSearchFilter("");
          setCurrentScreen("shop");
        }}
      />

       {/* Main Container Workspace layout */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 transition-all">

        <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>}>
        <AnimatePresence mode="wait">
          {/* Customer views coordination */}
          {(currentScreen === "home" ||
            currentScreen === "shop" ||
            currentScreen === "stores" ||
            currentScreen === "details" ||
            currentScreen === "cart" ||
            currentScreen === "about" ||
            currentScreen === "contact" ||
            currentScreen === "sell" ||
            currentScreen === "faq" ||
            currentScreen === "vendor") && (
            <motion.div
              key="customer-views-block"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <CustomerViews />
            </motion.div>
          )}

          {/* Integrated Nigeria Map tracker Screen */}
          {currentScreen === "map" && (
            <motion.div
              key="map-tracker-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <MapTracking
                orders={orders.filter(o => {
                   const belongsToUser = (currentUserId && o.user_id === currentUserId) || (!o.user_id && o.customerName === (userEmail ? userEmail.split("@")[0].toUpperCase() : "SHOPPER"));
                   return belongsToUser && !o.receiptConfirmed;
                })}
                onUpdateOrderProgress={handleUpdateOrderProgress}
                onConfirmReceipt={handleConfirmReceipt}
              />
            </motion.div>
          )}

          {/* Admin Platform / Merchant Screens - Authentication */}
          {currentScreen === "admin" && !vendorAuthenticated && (
            <motion.div
              key="vendor-auth-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <VendorAuth 
                onLoginSuccess={() => setVendorAuthenticated(true)} 
                onNavigateHome={() => setCurrentScreen("home")}
              />
            </motion.div>
          )}

          {/* Admin Platform / Merchant Screens - Dashboard */}
          {currentScreen === "admin" && vendorAuthenticated && (
            <motion.div
              key="vendor-admin-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {(() => {
                const stableFallbackId = currentUserId || (userEmail ? `v_fallback_${userEmail.replace(/[^a-zA-Z0-9]/g, "_")}` : "v_fallback_temp");
                const foundActive = vendors.find(v => {
                  if (v.id && (v.id === stableFallbackId || v.id === ensureUUID(stableFallbackId))) return true;
                  if (v.id && currentUserId && (String(v.id).toLowerCase() === String(currentUserId).toLowerCase() || v.id === ensureUUID(currentUserId))) return true;
                  if (v.user_id && currentUserId && (String(v.user_id).toLowerCase() === String(currentUserId).toLowerCase() || ensureUUID(v.user_id) === ensureUUID(currentUserId))) return true;
                  if (v.userId && currentUserId && (String(v.userId).toLowerCase() === String(currentUserId).toLowerCase() || ensureUUID(v.userId) === ensureUUID(currentUserId))) return true;
                  if (v.email && userEmail && String(v.email).toLowerCase() === String(userEmail).toLowerCase()) return true;
                  return false;
                });
                const keyStr = foundActive 
                  ? `vendor-admin-${foundActive.id}-${foundActive.name}-${foundActive.avatar || ''}-${foundActive.business_description || foundActive.description || ''}-${foundActive.location || ''}-${foundActive.ownerName || foundActive.owner_name || ''}-${foundActive.whatsappNumber || foundActive.whatsapp_number || ''}-${foundActive.bankName || foundActive.bank_name || ''}-${foundActive.accountNumber || foundActive.account_number || ''}`
                  : `vendor-admin-fallback-${stableFallbackId}`;
                return (
                  <ErrorBoundary>
                    <VendorAdmin
                      key={keyStr}
                      categories={categories}
                      onUpdateCategories={handleUpdateCategories}
                      ads={ads}
                      onUpdateAds={handleUpdateAds}
                      deliveryZones={deliveryZones}
                      onUpdateDeliveryZones={handleUpdateDeliveryZones}
                      orders={orders}
                      products={products}
                      vendors={vendors}
                      currentUserId={currentUserId}
                      onUpdateVendor={handleUpdateVendor}
                      onReviewOrderFlag={handleReviewOrderFlag}
                      onPromptReceipt={handlePromptReceipt}
                      onAddNewProduct={handleAddNewProduct}
                      onUpdateProduct={handleUpdateProduct}
                      onDeleteProduct={handleDeleteProduct}
                      
                      userEmail={userEmail}
                      userBankName={userBankName}
                      userBankAccountNumber={userBankAccountNumber}
                      userCacNumber={userCacNumber}
                      userStoreName={userStoreName}
                      userOwnerName={userOwnerName}
                      userAvatar={userAvatar}
                      userWhatsappNumber={userWhatsappNumber}
                      userLocation={userLocation}

                      flashDeals={flashDeals}
                      onProposeFlashDeal={handleProposeFlashDeal}
                      onApproveFlashDeal={handleApproveFlashDeal}
                      onRejectFlashDeal={handleRejectFlashDeal}
                    />
                  </ErrorBoundary>
                );
              })()}
            </motion.div>
          )}

          {/* Shopper Account Verification Form */}
          {currentScreen === "auth" && (
            <motion.div
              key="shopper-auth-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <UserAuthHub
                currentEmail={userEmail}
                onNavigateHome={() => setCurrentScreen("home")}
                onUpdateEmail={(email) => setUserEmail(email)}
              />
            </motion.div>
          )}
        </AnimatePresence>
        </Suspense>

      </main>

      {/* Paystack Gateways secure Checkout portal */}
      <Suspense fallback={null}>
        <PaystackCheckout
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          amount={checkoutAmount}
          email={userEmail}
          cart={cart}
          userId={currentUserId || undefined}
          deliveryAddress={userDeliveryAddress}
          deliveryZones={deliveryZones}
          onSuccess={handlePaymentSuccess}
        />
      </Suspense>

      {/* Stylized custom Settings drawer/overlay */}
      <AnimatePresence>
        {false && (
          <div className="fixed inset-0 z-100 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs"
              onClick={() => setSettingsDrawerOpen(false)}
            />
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { x: "100%" }}
              animate={shouldReduceMotion ? { opacity: 1 } : { x: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { x: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="relative w-80 sm:w-96 bg-white shadow-premium p-6 flex flex-col justify-between border-l border-neutral-200 h-full font-sans text-neutral-800 text-left overflow-y-auto"
            >
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
                  <div className="flex items-center space-x-2">
                    <Settings className="w-5 h-5 text-orange-500" />
                    <span className="font-extrabold text-neutral-900 leading-none">Simulation Settings</span>
                  </div>
                  <button onClick={() => setSettingsDrawerOpen(false)} className="p-1 rounded-full hover:bg-neutral-100">
                    <X className="w-4 h-4 text-neutral-400" />
                  </button>
                </div>

              {/* Settings content block */}
              <div className="space-y-4 text-xs">
                {/* Supabase Status Panel */}
                <div className="p-4 bg-orange-50/70 border border-orange-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-orange-950 flex items-center space-x-1.5">
                      <Database className="w-4 h-4 text-orange-500" />
                      <span>Supabase Live Sync</span>
                    </p>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                      dbSyncStatus.connected 
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}>
                      {dbSyncStatus.connected ? "Connected" : "Simulated"}
                    </span>
                  </div>

                  <p className="text-neutral-600 text-[11px] leading-relaxed">
                    {dbSyncStatus.connected 
                      ? "Real-time read/write states are synchronized to your live Supabase cloud database instance successfully."
                      : "Operating in client-side high-fidelity fallback because tables aren't yet provisioned in the remote database."}
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Database Schema Status</p>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className={`p-1.5 rounded-lg border text-[9px] font-bold ${
                        dbSyncStatus.vendorsSynced 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-neutral-50 text-neutral-400 border-neutral-200"
                      }`}>
                        vendors
                      </div>
                      <div className={`p-1.5 rounded-lg border text-[9px] font-bold ${
                        dbSyncStatus.productsSynced 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-neutral-50 text-neutral-400 border-neutral-200"
                      }`}>
                        products
                      </div>
                      <div className={`p-1.5 rounded-lg border text-[9px] font-bold ${
                        dbSyncStatus.ordersSynced 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-neutral-50 text-neutral-400 border-neutral-200"
                      }`}>
                        orders
                      </div>
                    </div>
                  </div>

                  {/* SQL Schema provisioner help block */}
                  <div className="pt-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(PROVISION_SQL_SCRIPT);
                        setCopiedSql(true);
                        triggerToast("Supabase SQL queries copied to clipboard!");
                        setTimeout(() => setCopiedSql(false), 2000);
                      }}
                      className="w-full py-2 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-700 font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-colors shadow-2xs"
                    >
                      <Copy className="w-3 h-3 text-neutral-500" />
                      <span>{copiedSql ? "Queries Copied!" : "Copy SQL Database Script"}</span>
                    </button>
                    <p className="text-[9px] text-neutral-400 mt-1 pl-1 leading-normal">
                      Paste this code into the Supabase SQL Editor to spawn tables automatically!
                    </p>
                  </div>
                </div>

                {/* Resend Email Configuration Card */}
                <div className="p-4 bg-orange-50/70 border border-orange-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-orange-950 flex items-center space-x-1.5">
                      <Mail className="w-4 h-4 text-orange-550 text-orange-500" />
                      <span>Resend Email Gateway</span>
                    </p>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[9px] font-extrabold uppercase tracking-wider font-mono">
                      Active
                    </span>
                  </div>

                  <p className="text-neutral-600 text-[11px] leading-relaxed">
                    Real-time transactional receipts and log files are handled securely via our fullstack Resend dispatch middleware.
                  </p>

                  <div className="flex items-center justify-between bg-white border border-neutral-150 p-2.5 rounded-xl">
                    <span className="text-[10px] font-extrabold uppercase text-neutral-400">Trigger Actions</span>
                    <button
                      onClick={() => {
                        setAutoSendEmails(!autoSendEmails);
                        triggerToast(`Email automatic sending ${!autoSendEmails ? "enabled" : "disabled"}.`);
                      }}
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md transition-colors ${
                        autoSendEmails ? "bg-orange-500 text-white" : "bg-neutral-200 text-neutral-600"
                      }`}
                    >
                      {autoSendEmails ? "Auto Firing" : "Manual Only"}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setCurrentScreen("admin");
                      setSettingsDrawerOpen(false);
                    }}
                    className="w-full py-2 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold rounded-xl text-center text-[10px] uppercase tracking-wider block border border-neutral-800"
                  >
                    Configure Mail Hub ↗
                  </button>
                </div>

                {/* Sentry System Health & Error Tracking */}
                <div className="p-4 bg-red-50/70 border border-red-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-red-950 flex items-center space-x-1.5">
                      <Bug className="w-4 h-4 text-red-500" />
                      <span>Sentry Error Suite</span>
                    </p>
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-[9px] font-extrabold uppercase tracking-wider font-mono border border-red-200">
                      Live
                    </span>
                  </div>

                  <p className="text-neutral-600 text-[11px] leading-relaxed">
                    Sentry error and session tracking is active for client browser transactions and NodeJS server telemetry.
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Trigger Verification Errors</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          triggerToast("Triggering client-side error... Check Sentry logs!", "info");
                          setTimeout(() => {
                            throw new Error("Naija Online Store Sentry Verification Error: Sentry React SDK is alive!");
                          }, 100);
                        }}
                        className="p-2 bg-white hover:bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold rounded-xl transition-all shadow-2xs text-center cursor-pointer"
                      >
                        Client Error
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            triggerToast("Calling server-side test endpoint...");
                            const res = await fetch("/api/sentry-error-test");
                            if (!res.ok) {
                              triggerToast("Backend error successfully routed & caught!", "success");
                            } else {
                              triggerToast("Server response OK", "info");
                            }
                          } catch (err: any) {
                            triggerToast("Failed to connect to backend", "info");
                          }
                        }}
                        className="p-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-xl transition-all shadow-xs text-center cursor-pointer"
                      >
                        Backend Error
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2">
                  <p className="font-bold text-emerald-950 flex items-center space-x-1">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <span>Naija Online Stores Protocol</span>
                  </p>
                  <p className="text-emerald-800 leading-normal font-semibold">
                    The platform coordinates e-commerce metrics in Nigerian Naira (₦). Customers, vendors and platform leads can swap, mock, and simulate live triggers seamlessly.
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <p className="font-bold text-neutral-400 uppercase tracking-widest text-[10px]">Session Settings</p>
                  
                  <div className="space-y-1">
                    <label className="font-bold text-neutral-500 uppercase tracking-widest pl-1 block">Active Shopper Alias</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="w-full px-3 py-2 border rounded-xl font-mono text-neutral-700 text-xs bg-white"
                    />
                  </div>

                  <div className="space-y-1 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                    <p className="font-bold text-neutral-700">Quick Reset Action</p>
                    <p className="text-[10px] text-neutral-400">Revert checkout and product database modifications back to initial state.</p>
                    <button
                      onClick={() => {
                        setProducts([]);
                        setOrders([]);
                        setVendors([]);
                        setCart([]);
                        setUserEmail("adminnaijastoresonline@gmail.com");
                        triggerToast("E-commerce persistent database wiped and re-seeded.", "info");
                        setSettingsDrawerOpen(false);
                      }}
                      className="mt-2 text-[10px] font-bold uppercase tracking-wider py-1.5 px-3 bg-red-650 hover:bg-red-700 bg-red-600 text-white rounded-lg block text-center"
                    >
                      Clear database & Seed
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer lock inside setup slider */}
            <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center space-x-2 text-[10px] text-neutral-400 justify-center mt-6">
              <ShieldAlert className="w-4 h-4" />
              <span className="font-bold uppercase tracking-widest">NaijaStores System Admin Suite</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Toaster element */}
      <AnimatePresence>
        {toaster.show && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(4px)" }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="fixed bottom-6 right-6 z-100 max-w-sm"
          >
            <div className={`p-4 rounded-2xl shadow-ambient border flex items-start space-x-3.5 text-xs leading-normal font-semibold text-left transition-colors duration-300 ${
              toaster.type === "success"
                ? "bg-emerald-950/95 backdrop-blur-md border-emerald-800 text-white"
                : "bg-neutral-900/95 backdrop-blur-md border-neutral-800 text-neutral-200"
            }`}>
              <div className="flex-shrink-0 mt-0.5 relative">
                {toaster.type === "success" ? (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 bg-emerald-550/20 rounded-full"
                    />
                    <CheckCircle className="w-5 h-5 text-emerald-400 relative z-10" />
                  </>
                ) : (
                  <Info className="w-5 h-5 text-amber-400" />
                )}
              </div>
              <div>
                <p className="font-extrabold uppercase tracking-wider text-[9px] text-neutral-400">NaijaStores System Alert</p>
                <p className="text-sm font-medium mt-0.5 leading-snug">{toaster.msg}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Global Footer */}
      <footer className="bg-neutral-950 py-12 border-t border-neutral-900 border-opacity-50 mt-auto animate-fade-in relative z-10 w-full overflow-hidden text-neutral-400">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 pb-10 border-b border-neutral-800/50">
            {/* Brand Logo/Info */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-xl font-black tracking-tight text-white leading-none flex items-center">
                <span className="text-emerald-400">Naija</span><span className="text-orange-400 ml-1">Online Store</span>
              </h2>
              <p className="text-xs text-neutral-500 font-medium leading-relaxed max-w-sm">
                Naija Online Store is a trusted Nigerian multi-vendor ecommerce marketplace connecting buyers with verified vendors nationwide through secure payments, fast delivery, and quality products.
              </p>
              
              {/* Address details and Customer contact line */}
              <div className="text-[11px] space-y-2 border-t border-neutral-900 pt-3 max-w-sm">
                <p className="text-neutral-400 leading-relaxed font-semibold">
                  🏢 <span className="text-neutral-300 font-bold uppercase tracking-wider text-[10px] block mb-0.5">Headquarters Address</span>
                  Petrocam Plaza, Opposite Guru Maharaji, Obawole, 12 Victor Olaleye Ave, Ishaga, Iju, Lagos 100216, Lagos
                </p>
                <div className="text-neutral-400 font-semibold pt-1">
                  📞 <span className="text-neutral-300 font-bold uppercase tracking-wider text-[10px] block mb-0.5">WhatsApp / Customer Hotline</span>
                  <a href="https://wa.me/2348035237665" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 transition-colors font-bold text-xs ring-offset-neutral-950 focus:outline-none">08035237665</a>
                </div>
              </div>

              {/* Social Channels Connect */}
              <div className="pt-2">
                <span className="text-white font-bold text-[10px] uppercase tracking-widest block mb-1">Follow Us</span>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a 
                    href="https://www.instagram.com/naijaonliestores/" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-850 hover:border-neutral-700 text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all hover:scale-105 inline-flex items-center space-x-1"
                  >
                    <span>📸 Instagram</span>
                  </a>
                  <a 
                    href="https://www.facebook.com/profile.php?id=61590778524548" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-850 hover:border-neutral-700 text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all hover:scale-105 inline-flex items-center space-x-1"
                  >
                    <span>👥 Facebook</span>
                  </a>
                  <a 
                    href="https://www.youtube.com/channel/UCGI5qBdP-aQDEce9J_hQMvA" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-850 hover:border-neutral-700 text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-md text-[10px] font-bold transition-all hover:scale-105 inline-flex items-center space-x-1"
                  >
                    <span>📺 YouTube</span>
                  </a>
                </div>
              </div>
              
              <div className="pt-2">
                <h3 className="text-white font-bold text-[10px] uppercase tracking-widest mb-3">We Accept</h3>
                <div className="flex flex-wrap gap-2 text-[10px] font-bold text-neutral-400 uppercase">
                  <span className="bg-neutral-900 px-2.5 py-1.5 rounded-md border border-neutral-800">Paystack</span>
                  <span className="bg-neutral-900 px-2.5 py-1.5 rounded-md border border-neutral-800">Visa</span>
                  <span className="bg-neutral-900 px-2.5 py-1.5 rounded-md border border-neutral-800">Mastercard</span>
                  <span className="bg-neutral-900 px-2.5 py-1.5 rounded-md border border-neutral-800">Bank Transfer</span>
                  <span className="bg-neutral-900 px-2.5 py-1.5 rounded-md border border-neutral-800">USSD</span>
                  <span className="bg-neutral-900 px-2.5 py-1.5 rounded-md border border-neutral-800">Pay on Delivery</span>
                </div>
              </div>
            </div>

            {/* Navigation & Policies */}
            <div className="lg:col-span-3 space-y-6">
              <div className="space-y-3">
                <h3 className="text-white font-bold text-xs uppercase tracking-widest">Useful Links</h3>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-semibold text-neutral-400">
                  <button 
                    type="button" 
                    onClick={() => { setCurrentScreen("home"); window.scrollTo({ top: 0, behavior: "smooth" }); }} 
                    className="hover:text-emerald-400 text-left cursor-pointer transition-colors hover:underline focus:outline-none"
                  >
                    Marketplace Home
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setCurrentScreen("about"); window.scrollTo({ top: 0, behavior: "smooth" }); }} 
                    className="hover:text-emerald-400 text-left cursor-pointer transition-colors hover:underline focus:outline-none"
                  >
                    About Us
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setCurrentScreen("contact"); window.scrollTo({ top: 0, behavior: "smooth" }); }} 
                    className="hover:text-emerald-400 text-left cursor-pointer transition-colors hover:underline focus:outline-none"
                  >
                    Contact Us
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setCurrentScreen("shop"); setInitialCategory("all"); window.scrollTo({ top: 0, behavior: "smooth" }); }} 
                    className="hover:text-emerald-400 text-left cursor-pointer transition-colors hover:underline focus:outline-none"
                  >
                    Shop Now
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setCurrentScreen("faq"); window.scrollTo({ top: 0, behavior: "smooth" }); }} 
                    className="hover:text-emerald-400 text-left cursor-pointer transition-colors hover:underline focus:outline-none"
                  >
                    Help Center / FAQ
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-white font-bold text-xs uppercase tracking-widest">Policies</h3>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-semibold">
                  <button
                    type="button"
                    onClick={() => setActivePolicy("privacy")}
                    className="hover:text-emerald-400 text-left text-neutral-400 cursor-pointer transition-colors hover:underline"
                  >
                    Privacy Policy
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePolicy("terms")}
                    className="hover:text-emerald-400 text-left text-neutral-400 cursor-pointer transition-colors hover:underline"
                  >
                    Terms & Conditions
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePolicy("shipping")}
                    className="hover:text-emerald-400 text-left text-neutral-400 cursor-pointer transition-colors hover:underline"
                  >
                    Shipping & Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePolicy("refund")}
                    className="hover:text-emerald-400 text-left text-neutral-400 cursor-pointer transition-colors hover:underline"
                  >
                    Refund & Return Policy
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-white font-bold text-xs uppercase tracking-widest">Sell With Us</h3>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] font-semibold text-neutral-400">
                  <button 
                    type="button" 
                    onClick={() => { setCurrentScreen("sell"); window.scrollTo({ top: 0, behavior: "smooth" }); }} 
                    className="hover:text-emerald-400 text-left cursor-pointer transition-colors hover:underline focus:outline-none flex items-center text-orange-400"
                  >
                    <Store className="w-3 h-3 mr-1.5" /> Sell on Naija Online Stores
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setCurrentScreen("auth"); window.scrollTo({ top: 0, behavior: "smooth" }); }} 
                    className="hover:text-amber-400 text-left cursor-pointer transition-colors hover:underline focus:outline-none"
                  >
                    Vendor Portal Login
                  </button>
                  <span className="text-neutral-500 font-medium ml-auto hidden md:inline">
                    Start selling to customers nationwide today.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-[10px] text-neutral-500 font-medium tracking-wide">
              &copy; 2026 Naija Online Store. All Rights Reserved.
            </p>
            <p className="text-[10px] text-emerald-600/50 font-bold tracking-wide">
              Powered by Dickson Greatman
            </p>
          </div>
        </div>
      </footer>

      {/* Cookie pop up for explicit user storage consent & associated Policies overlay */}
      <Suspense fallback={null}>
        <FAQWidget />
        <CookiePopup onOpenPolicy={(type) => setActivePolicy(type)} />
        <PolicyOverlay policyType={activePolicy} onClose={() => setActivePolicy(null)} />
      </Suspense>

    </div>
  );
}

