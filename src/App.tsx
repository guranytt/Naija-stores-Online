/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


import React, { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Navbar from "./components/Navbar";
import CustomerViews from "./components/CustomerViews";
import MapTracking from "./components/MapTracking";
import VendorAdmin from "./components/VendorAdmin";

import UserAuthHub from "./components/UserAuthHub";
import PaystackCheckout from "./components/PaystackCheckout";
import CookiePopup from "./components/CookiePopup";
import PolicyOverlay from "./components/PolicyOverlay";
import { initPostHog, trackAddToCart, trackCheckoutStarted, trackPaymentCompleted, trackOrderCompleted } from "./lib/posthog";
import { Product, CartItem, Order, Vendor, Category, FlashDealProposal } from "./types";
import { formatNaira } from "./components/CustomerViews";
import { Info, Settings2, Sparkles, X, Mail, ShieldAlert, Database, CheckCircle, AlertCircle, Copy, FileText, Store, Bug } from "lucide-react";
import { supabase, getSupabaseData, saveSupabaseRecord, PROVISION_SQL_SCRIPT, ensureUUID } from "./supabase";
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
    console.error("Fail reading cookie: ", e);
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
    console.error("Fail writing cookie: ", e);
  }
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<string>("home");
  const [vendorAuthenticated, setVendorAuthenticated] = useState<boolean>(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("p1");
  const [initialCategory, setInitialCategory] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const shouldReduceMotion = useReducedMotion();
  const [userEmail, setUserEmail] = useState<string>("adminnaijastoresonline@gmail.com");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [checkoutAmount, setCheckoutAmount] = useState<number>(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState<boolean>(false);

  // Resend Automation states
  const [mailLogs, setMailLogs] = useState<MailLogEntry[]>([]);
  const [autoSendEmails, setAutoSendEmails] = useState<boolean>(true);

  const [selectedVendorSlug, setSelectedVendorSlug] = useState<string>("eko-heritage-weavers");

  // Router logic to interpret URL on first load and back/forward
  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      const seoCategories = ["electronics", "fashion", "phones", "laptops", "beauty", "home-kitchen", "sports", "gaming"];
      if (path.startsWith("/cart")) setCurrentScreen("cart");
      else if (path.startsWith("/admin") || path.startsWith("/dashboard")) setCurrentScreen("admin");
      else if (path.startsWith("/tracking")) setCurrentScreen("map");
      else if (path.startsWith("/auth")) setCurrentScreen("auth");
      else if (path.startsWith("/shop")) {
        setCurrentScreen("shop");
        setInitialCategory("all");
      }
      else if (path.startsWith("/product/")) {
        const id = path.split("/product/")[1];
        if (id) {
          setSelectedProductId(id);
          setCurrentScreen("details");
        }
      }
      else if (path.startsWith("/vendor/")) {
        const slug = path.split("/vendor/")[1];
        if (slug) {
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
    else if (currentScreen === "details") newPath = `/product/${selectedProductId}`;
    else if (currentScreen === "vendor") newPath = `/vendor/${selectedVendorSlug}`;
    
    if (window.location.pathname !== newPath && currentScreen !== "home") {
       window.history.pushState({ screen: currentScreen }, "", newPath);
    } else if (currentScreen === "home" && window.location.pathname !== "/") {
       window.history.pushState({ screen: "home" }, "", "/");
    }
  }, [currentScreen, selectedProductId, initialCategory, selectedVendorSlug]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = getCookie("naija_plaza_cart");
      if (saved) {
        return JSON.parse(decodeURIComponent(saved));
      }
    } catch (e) {
      console.warn("Could not read cart from cookies: ", e);
    }
    return [];
  });

  // Automated cart-to-cookie synchronization effect
  useEffect(() => {
    try {
      setCookie("naija_plaza_cart", encodeURIComponent(JSON.stringify(cart)), 14);
    } catch (e) {
      console.error("Sync error: ", e);
    }
  }, [cart]);

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem("NAIJA_CATEGORIES_STATE");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

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

  // Update SEO metadata dynamically
  useEffect(() => {
    const isPublic = !["admin", "tracking", "checkout", "auth"].includes(currentScreen);
    
    let title = "NaijaOnlineStores | Premium Online Shopping Marketplace Nigeria";
    let desc = "Experience secure, verified online shopping Nigeria. Buy electronics online Nigeria, high-quality fashion wear, devices, and cosmetics on NaijaOnlineStores — Nigeria's trusted online stores with automated escrow checks.";
    let robots = isPublic ? "index, follow" : "noindex, nofollow";

    const slugifyLocal = (text: string) => text.toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-");

    // Dynamic Title & Description customization
    if (currentScreen === "shop") {
      if (initialCategory && initialCategory !== "all") {
        const catObj = categories.find(c => c.id === initialCategory);
        if (catObj) {
          title = `${catObj.name} | Buy Authentic Products Online Nigeria | NaijaOnlineStores`;
          desc = `Shop premium ${catObj.name.toLowerCase()} collections online in Nigeria. Verified merchants, escrow logistics protection, and nationwide delivery supported on NaijaOnlineStores.`;
        } else {
          title = `${initialCategory.charAt(0).toUpperCase() + initialCategory.slice(1)} | Shop Online Nigeria`;
        }
      } else {
        title = "Shop Direct From Verified Local Wholesalers | NaijaOnlineStores";
      }
    } else if (currentScreen === "details" && selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod) {
        title = `${prod.title} | Buy Online Nigeria | NaijaOnlineStores`;
        desc = `Get the best deal on ${prod.title} by ${prod.vendorName} on NaijaOnlineStores. Rating: ${prod.rating} ★ (${prod.reviewsCount} reviews). Secure escrow payment & fast delivery across Nigeria.`;
      }
    } else if (currentScreen === "vendor" && selectedVendorSlug) {
      const vend = vendors.find(v => slugifyLocal(v.name) === selectedVendorSlug || v.id === selectedVendorSlug);
      if (vend) {
        title = `${vend.name} Storefront | Verified Wholesale Merchant | NaijaOnlineStores`;
        desc = `Explore and shop the latest collections from ${vend.name} official store in ${vend.location}. Highly rated merchant (${vend.rating} ★) with secure direct payments on NaijaOnlineStores Nigeria.`;
      }
    } else if (currentScreen === "admin" || currentScreen === "tracking") {
      title = "Dashboard | NaijaOnlineStores";
    }

    // Update <title>
    document.title = title;

    // Update Meta Tags
    const setMeta = (name: string, content: string, property: boolean = false) => {
      let el = document.querySelector(property ? `meta[property="${name}"]` : `meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        if (property) el.setAttribute("property", name);
        else el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", desc);
    setMeta("robots", robots);
    setMeta("og:title", title, true);
    setMeta("og:description", desc, true);
    setMeta("og:url", window.location.href, true);
    setMeta("twitter:title", title);
    setMeta("twitter:description", desc);

    // Update Canonical
    let canonical = document.querySelector("link[rel='canonical']");
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href.split("?")[0]);
    
    // Structured Data (JSON-LD)
    let jsonLd = document.querySelector("#json-ld-seo");
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.id = "json-ld-seo";
      jsonLd.setAttribute("type", "application/ld+json");
      document.head.appendChild(jsonLd);
    }
    
    // Base Schema defaults to Organization & Website (Tasks 4 & 5)
    let schemaObj: any = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://www.naijaonlinestores.com.ng/#organization",
          "name": "NaijaOnlineStores",
          "url": "https://www.naijaonlinestores.com.ng",
          "logo": "https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png",
          "sameAs": [
            "https://facebook.com/naijaonlinestores",
            "https://twitter.com/naijaonlinestores"
          ]
        },
        {
          "@type": "WebSite",
          "@id": "https://www.naijaonlinestores.com.ng/#website",
          "url": "https://www.naijaonlinestores.com.ng",
          "name": "NaijaOnlineStores",
          "description": "Multi-vendor ecommerce marketplace in Nigeria connecting shoppers to verified wholesale merchants"
        }
      ]
    };

    // Product Schema (Task 2 & 5) and Breadcrumb Schema (Task 6)
    if (currentScreen === "details" && selectedProductId) {
       const prod = products.find(p => p.id === selectedProductId);
       if (prod) {
          schemaObj = {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Product",
                "@id": `https://www.naijaonlinestores.com.ng/product/${prod.id}#product`,
                "name": prod.title,
                "description": prod.description || desc,
                "image": prod.image || "https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png",
                "sku": prod.id,
                "offers": {
                  "@type": "Offer",
                  "priceCurrency": "NGN",
                  "price": prod.price,
                  "itemCondition": prod.condition === "New" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
                  "availability": prod.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                  "url": window.location.href,
                  "seller": {
                    "@type": "Organization",
                    "name": prod.vendorName
                  }
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": prod.rating || 4.7,
                  "reviewCount": prod.reviewsCount || 15
                }
              },
              {
                "@type": "BreadcrumbList",
                "@id": `https://www.naijaonlinestores.com.ng/product/${prod.id}#breadcrumb`,
                "itemListElement": [
                  { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.naijaonlinestores.com.ng" },
                  { "@type": "ListItem", "position": 2, "name": prod.category || "Shop", "item": `https://www.naijaonlinestores.com.ng/${prod.category ? slugifyLocal(prod.category) : "shop"}` },
                  { "@type": "ListItem", "position": 3, "name": prod.title, "item": window.location.href }
                ]
              }
            ]
          };
       }
    } 
    // Category Breadcrumb Schema
    else if (currentScreen === "shop" && initialCategory && initialCategory !== "all") {
       const catObj = categories.find(c => c.id === initialCategory);
       const catName = catObj ? catObj.name : (initialCategory.charAt(0).toUpperCase() + initialCategory.slice(1));
       schemaObj = {
         "@context": "https://schema.org",
         "@graph": [
           {
             "@type": "CollectionPage",
             "name": catName,
             "description": desc,
             "url": window.location.href
           },
           {
             "@type": "BreadcrumbList",
             "@id": `${window.location.href}#breadcrumb`,
             "itemListElement": [
               { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.naijaonlinestores.com.ng" },
               { "@type": "ListItem", "position": 2, "name": catName, "item": window.location.href }
             ]
           }
         ]
       };
    }
    // Vendor Storefront & Aggregate Rating Schema (Task 3 & Task 7)
    else if (currentScreen === "vendor" && selectedVendorSlug) {
       const vend = vendors.find(v => slugifyLocal(v.name) === selectedVendorSlug || v.id === selectedVendorSlug);
       if (vend) {
         schemaObj = {
           "@context": "https://schema.org",
           "@graph": [
             {
               "@type": "Store",
               "@id": `https://www.naijaonlinestores.com.ng/vendor/${selectedVendorSlug}#store`,
               "name": vend.name,
               "description": desc,
               "image": vend.avatar || "https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png",
               "telephone": vend.phone,
               "email": vend.email,
               "address": {
                 "@type": "PostalAddress",
                 "addressLocality": vend.location,
                 "addressCountry": "NG"
               },
               "aggregateRating": {
                 "@type": "AggregateRating",
                 "ratingValue": vend.rating || 4.7,
                 "ratingCount": vend.ratingCount || 100
               }
             },
             {
               "@type": "BreadcrumbList",
               "@id": `https://www.naijaonlinestores.com.ng/vendor/${selectedVendorSlug}#breadcrumb`,
               "itemListElement": [
                 { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.naijaonlinestores.com.ng" },
                 { "@type": "ListItem", "position": 2, "name": "Vendors", "item": "https://www.naijaonlinestores.com.ng/shop" },
                 { "@type": "ListItem", "position": 3, "name": vend.name, "item": window.location.href }
               ]
             }
           ]
         };
       }
    }

    jsonLd.textContent = JSON.stringify(schemaObj);
    
  }, [currentScreen, selectedProductId, initialCategory, selectedVendorSlug, products, vendors, categories]);

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

  const handleUpdateCategories = (newCats: Category[]) => {
    setCategories(newCats);
    try {
      localStorage.setItem("NAIJA_CATEGORIES_STATE", JSON.stringify(newCats));
      // Sync to Supabase so vendors can see the newly created categories
      newCats.forEach(cat => {
        saveSupabaseRecord("categories", cat).catch(err => 
          console.warn("Failed to sync category to Supabase:", err)
        );
      });
    } catch (e) {
      console.error(e);
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

  // Synchronize Supabase authentication state changes and roles
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
            if (key && key.includes("supabase")) {
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
        const role = session.user.user_metadata?.role || "customer";
        if (role === "vendor" || role === "admin" || uEmail.toLowerCase() === "adminnaijastoresonline@gmail.com") {
          setVendorAuthenticated(true);
        } else {
          setVendorAuthenticated(false);
        }
      } else {
        setCurrentUserId(null);
      }
    }).catch(err => {
      console.warn("[SUPABASE GETSESSION] Failed to restore session on initialization:", err);
      if (err?.message?.includes("Invalid Refresh Token") || err?.message?.includes("Refresh Token Not Found")) {
        supabase.auth.signOut().catch(() => {});
      }
    });

    // Listen for auth level events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const uEmail = session.user.email || "shopper@example.com";
        setUserEmail(uEmail);
        setCurrentUserId(session.user.id);
        const role = session.user.user_metadata?.role || "customer";
        if (role === "vendor" || role === "admin" || uEmail.toLowerCase() === "adminnaijastoresonline@gmail.com") {
          setVendorAuthenticated(true);
        } else {
          setVendorAuthenticated(false);
        }
      } else {
        setVendorAuthenticated(false);
        setCurrentUserId(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Implement SWR for smart caching and paginated data fetching
  const { data: dbCategories } = useSWR(
    "categories",
    () => getSupabaseData<Category>("categories", [], 1, 100).then(res => res.data),
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const { data: dbVendors } = useSWR(
    ["vendors", { limit: 1000 }],
    ([table]) => getSupabaseData<Vendor>(table as string, [], 1, 1000).then(res => res.data),
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const { data: dbProducts } = useSWR(
    ["products", { limit: 1000 }],
    ([table]) => getSupabaseData<Product>(table as string, [], 1, 1000).then(res => res.data),
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const { data: dbOrders } = useSWR(
    ["orders", currentUserId],
    ([table]) => {
      const isDashboard = currentUserId ? true : false;
      let opts: any = { limit: 100 };
      
      if (isDashboard) {
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        opts.gte = { created_at: last30Days.toISOString() };
      }
      return getSupabaseData<Order>(table as string, [], 1, opts.limit).then(res => res.data);
    },
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  useEffect(() => {
    if (dbCategories) setCategories(dbCategories);
  }, [dbCategories]);

  useEffect(() => {
    if (dbVendors) setVendors(dbVendors);
  }, [dbVendors]);

  useEffect(() => {
    if (dbProducts) setProducts(dbProducts);
  }, [dbProducts]);

  useEffect(() => {
    if (dbOrders) setOrders(dbOrders);
  }, [dbOrders]);

  useEffect(() => {
    if (dbProducts || dbVendors || dbCategories || dbOrders) {
      setDbSyncStatus(prev => ({
        ...prev,
        connected: true,
        loading: false,
        error: undefined
      }));
    }
  }, [dbProducts, dbVendors, dbCategories, dbOrders]);

  // Set up real-time orders sync subscription
  useEffect(() => {
    if (!vendorAuthenticated) return;
    

    const channel = supabase
      .channel("public-orders-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders"
        },
        async (payload) => {

          setOrders(prevOrders => {
            const updatedOrders = [...prevOrders];
            if (payload.eventType === "INSERT") {
              // Ensure we don't duplicate if already present
              if (!updatedOrders.some(o => o.id === payload.new.id)) {
                updatedOrders.unshift(payload.new as any);
              }
            } else if (payload.eventType === "UPDATE") {
              const idx = updatedOrders.findIndex(o => o.id === payload.new.id);
              if (idx !== -1) {
                updatedOrders[idx] = { ...updatedOrders[idx], ...payload.new } as any;
              } else {
                updatedOrders.unshift(payload.new as any);
              }
            } else if (payload.eventType === "DELETE") {
              return updatedOrders.filter(o => o.id !== payload.old?.id);
            }
            return updatedOrders;
          });
        }
      ).subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [vendorAuthenticated]);

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

  const handleUpdateVendor = (updatedVendor: Vendor) => {
    const compliantId = ensureUUID(updatedVendor.id);
    const resolvedVendor: Vendor = {
      ...updatedVendor,
      id: compliantId,
      userId: updatedVendor.userId ? ensureUUID(updatedVendor.userId) : undefined,
      user_id: updatedVendor.user_id ? ensureUUID(updatedVendor.user_id) : undefined,
    };

    setVendors(prevVendors => {
      const exists = prevVendors.some(v => v.id === resolvedVendor.id);
      let updated;
      if (exists) {
        updated = prevVendors.map(v => v.id === resolvedVendor.id ? resolvedVendor : v);
      } else {
        updated = [...prevVendors, resolvedVendor];
      }
      saveSupabaseRecord("vendors", resolvedVendor).then(() => {
        mutate(["vendors", { limit: 1000 }]);
      });
      triggerToast(`Store profile updated successfully!`, "success");
      return updated;
    });
  };


  const updateMailLogs = async () => {
    const logs = await fetchEmailLogs();
    setMailLogs(logs);
  };

  // Poll server mail logs every 4 seconds to keep dashboard in perfect synchronization
  useEffect(() => {
    updateMailLogs();
    const interval = setInterval(updateMailLogs, 4000);
    return () => clearInterval(interval);
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

  const handleUpdateCartQty = (productId: string, quantity: number) => {
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
    triggerToast("Removed item from cart.", "info");
  };

  // Checkout launcher
  const handleCheckoutTrigger = () => {
    if (cart.length === 0) return;
    
    if (!currentUserId) {
      triggerToast("Please log in or sign up to proceed to checkout.", "info");
      setCurrentScreen("auth");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
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
  const handlePaymentSuccess = (method: string, serverOrder?: Order) => {
    // Generate simulated order fallback if server did not hand back records (e.g. offline fallback modes)
    const orderValue = cart.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);
    
    // Pick destination based on Lagos/Abuja/PH etc
    const destinationStates = ["Abuja", "Lagos", "Port Harcourt", "Kano", "Enugu"];
    const randomDest = destinationStates[Math.floor(Math.random() * destinationStates.length)];
    const startState = randomDest === "Lagos" ? "Kano" : "Lagos";

    const localOrder: Order = {
      id: "NS-" + Math.floor(Math.random() * 9000 + 1000),
      user_id: currentUserId || undefined,
      customerName: userEmail.split("@")[0].toUpperCase() || "Shopper",
      status: "Processing",
      date: new Date().toISOString().split("T")[0],
      value: orderValue,
      itemsCount: cart.reduce((acc, curr) => acc + curr.quantity, 0),
      trackingId: "TRACK-" + Math.floor(Math.random() * 90000 + 10000),
      routeFrom: startState,
      routeTo: randomDest,
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

    // Automatically trigger Resend payment confirmation emails if this was a local fallback
    if (autoSendEmails && !serverOrder) {
      // 1. Payment confirmation
      sendResendEmail({
        to: userEmail,
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
        to: userEmail,
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

  // Creator for newly published merchant items
  const handleAddNewProduct = (prod: Product) => {
    setProducts([prod, ...products]);
    
    // Push new product into Supabase table
    saveSupabaseRecord("products", prod).then(() => {
      mutate(["products", { limit: 1000 }]);
    });
    
    triggerToast(`Successfully published ${prod.title} to NaijaStores Catalog.`, "success");
  };

  const linkedProducts = products.filter(p => {
    const vId = p.vendorId || (p as any).vendor_id;
    return vId && vendors.some(v => v.id === vId);
  });

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
      />

       {/* Main Container Workspace layout */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 transition-all">

        <AnimatePresence mode="wait">
          {/* Customer views coordination */}
          {(currentScreen === "home" ||
            currentScreen === "shop" ||
            currentScreen === "details" ||
            currentScreen === "cart" ||
            currentScreen === "vendor") && (
            <motion.div
              key="customer-views-block"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <CustomerViews
                screen={currentScreen as any}
                onNavigate={(s) => setCurrentScreen(s)}
                selectedProductId={selectedProductId}
                onSelectProduct={(id) => setSelectedProductId(id)}
                initialCategory={initialCategory}
                cart={cart}
                onAddToCart={handleAddToCart}
                onUpdateCartQty={handleUpdateCartQty}
                onRemoveFromCart={handleRemoveFromCart}
                onCheckout={handleCheckoutTrigger}
                searchFilter={searchFilter}
                vendors={vendors}
                onRateVendor={handleRateVendor}
                categories={categories}
                products={linkedProducts}
                orders={orders}
                flashDeals={flashDeals}
                isLoggedIn={!!currentUserId}
                vendorSlug={selectedVendorSlug}
                onSelectVendor={setSelectedVendorSlug}
              />
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
                orders={orders}
                onUpdateOrderProgress={handleUpdateOrderProgress}
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
              <UserAuthHub
               currentEmail={userEmail}
               onNavigate={(screen) => setCurrentScreen(screen)}
               onNavigateHome={() => setCurrentScreen("home")}
               onUpdateEmail={(email) => setUserEmail(email)}
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
              <VendorAdmin
                orders={orders}
                products={products}
                vendors={vendors}
                currentUserId={currentUserId}
                onUpdateVendor={handleUpdateVendor}
                onReviewOrderFlag={handleReviewOrderFlag}
                onAddNewProduct={handleAddNewProduct}
                categories={categories}
                onUpdateCategories={handleUpdateCategories}
                
                // Email Automation Props
                mailLogs={mailLogs}
                onSendTestEmail={handleSendTestEmail}
                onPreviewEmail={handlePreviewEmail}
                autoSendEmails={autoSendEmails}
                onToggleAutoSend={() => setAutoSendEmails(!autoSendEmails)}
                onRefreshMailLogs={updateMailLogs}
                userEmail={userEmail}

                flashDeals={flashDeals}
                onProposeFlashDeal={handleProposeFlashDeal}
                onApproveFlashDeal={handleApproveFlashDeal}
                onRejectFlashDeal={handleRejectFlashDeal}
              />
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

      </main>

      {/* Paystack Gateways secure Checkout portal */}
      <PaystackCheckout
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        amount={checkoutAmount}
        email={userEmail}
        cart={cart}
        userId={currentUserId || undefined}
        onSuccess={handlePaymentSuccess}
      />

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
                    <Settings2 className="w-5 h-5 text-orange-500" />
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

            {/* Useful Links */}
            <div className="space-y-4">
              <h3 className="text-white font-bold text-xs uppercase tracking-widest mb-4">Useful Links</h3>
              <div className="flex flex-col space-y-3 text-[11px] font-semibold">
                <a href="#" className="hover:text-emerald-400 transition-colors w-fit">Shop</a>
                <a href="#" className="hover:text-emerald-400 transition-colors w-fit">About Us</a>
                <a href="#" className="hover:text-emerald-400 transition-colors w-fit">Contact Us</a>
                <a href="#" className="hover:text-emerald-400 transition-colors w-fit">FAQs</a>
                <a href="#" className="hover:text-emerald-400 transition-colors w-fit">Track Order</a>
              </div>
            </div>

            {/* Policies */}
            <div className="space-y-4">
              <h3 className="text-white font-bold text-xs uppercase tracking-widest mb-4">Policies</h3>
              <div className="flex flex-col space-y-3 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setActivePolicy("privacy")}
                  className="hover:text-emerald-400 text-left text-neutral-400 font-semibold cursor-pointer transition-colors w-fit hover:underline"
                >
                  Privacy Policy
                </button>
                <button
                  type="button"
                  onClick={() => setActivePolicy("terms")}
                  className="hover:text-emerald-400 text-left text-neutral-400 font-semibold cursor-pointer transition-colors w-fit hover:underline"
                >
                  Terms & Conditions
                </button>
                <button
                  type="button"
                  onClick={() => setActivePolicy("shipping")}
                  className="hover:text-emerald-400 text-left text-neutral-400 font-semibold cursor-pointer transition-colors w-fit hover:underline"
                >
                  Shipping & Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setActivePolicy("refund")}
                  className="hover:text-emerald-400 text-left text-neutral-400 font-semibold cursor-pointer transition-colors w-fit hover:underline"
                >
                  Refund & Return Policy
                </button>
              </div>
            </div>

            {/* Sell With Us */}
            <div className="space-y-4">
              <h3 className="text-white font-bold text-xs uppercase tracking-widest mb-4">Sell With Us</h3>
              <p className="text-[11px] text-neutral-500 font-medium leading-relaxed mb-4">
                Start selling to customers nationwide through our trusted marketplace.
              </p>
              <div className="flex flex-col space-y-3 text-[11px] font-semibold">
                <a href="#" className="hover:text-emerald-400 transition-colors w-fit flex items-center text-orange-400"><Store className="w-3 h-3 mr-1.5" /> Vendor Dashboard</a>
                <a href="#" className="hover:text-emerald-400 transition-colors w-fit">Become a Vendor</a>
                <a href="#" className="hover:text-emerald-400 transition-colors w-fit">Vendor Guide</a>
                <a href="#" className="hover:text-emerald-400 transition-colors w-fit">Store Listing</a>
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
      <CookiePopup onOpenPolicy={(type) => setActivePolicy(type)} />
      <PolicyOverlay policyType={activePolicy} onClose={() => setActivePolicy(null)} />

    </div>
  );
}

