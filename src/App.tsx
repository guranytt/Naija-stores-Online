/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import Navbar from "./components/Navbar";
import CustomerViews from "./components/CustomerViews";
import MapTracking from "./components/MapTracking";
import VendorAdmin from "./components/VendorAdmin";
import VendorAuth from "./components/VendorAuth";
import UserAuthHub from "./components/UserAuthHub";
import PaystackCheckout from "./components/PaystackCheckout";
import { Product, CartItem, Order, Vendor, Category } from "./types";
import { MOCK_PRODUCTS, MOCK_ORDERS, MOCK_VENDORS, MOCK_CATEGORIES } from "./data/mockData";
import { formatNaira } from "./components/CustomerViews";
import { Info, Settings2, Sparkles, X, Mail, ShieldAlert, Database, CheckCircle, AlertCircle, Copy, FileText, Store, Bug } from "lucide-react";
import { supabase, getSupabaseData, saveSupabaseRecord, PROVISION_SQL_SCRIPT } from "./supabase";
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
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>(MOCK_VENDORS);
  const [categories, setCategories] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem("NAIJA_CATEGORIES_STATE");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return MOCK_CATEGORIES;
  });

  const handleUpdateCategories = (newCats: Category[]) => {
    setCategories(newCats);
    try {
      localStorage.setItem("NAIJA_CATEGORIES_STATE", JSON.stringify(newCats));
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email || "shopper@example.com");
        setCurrentUserId(session.user.id);
        const role = session.user.user_metadata?.role || "customer";
        if (role === "vendor" || role === "admin") {
          setVendorAuthenticated(true);
        } else {
          setVendorAuthenticated(false);
        }
      } else {
        setCurrentUserId(null);
      }
    });

    // Listen for auth level events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserEmail(session.user.email || "shopper@example.com");
        setCurrentUserId(session.user.id);
        const role = session.user.user_metadata?.role || "customer";
        if (role === "vendor" || role === "admin") {
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

  // Sync Supabase on initial render
  useEffect(() => {
    async function initSupabase() {
      try {
        // Load Vendors
        const { data: dbVendors, synced: vSynced, error: vError } = await getSupabaseData<Vendor>("vendors", MOCK_VENDORS);
        if (dbVendors) setVendors(dbVendors);

        // Load Products
        const { data: dbProducts, synced: pSynced, error: pError } = await getSupabaseData<Product>("products", MOCK_PRODUCTS);
        if (dbProducts) setProducts(dbProducts);

        // Load Orders
        const { data: dbOrders, synced: oSynced, error: oError } = await getSupabaseData<Order>("orders", []);
        if (dbOrders) setOrders(dbOrders);

        const syncedList: string[] = [];
        if (vSynced) syncedList.push("vendors");
        if (pSynced) syncedList.push("products");
        if (oSynced) syncedList.push("orders");

        setDbSyncStatus({
          connected: syncedList.length > 0,
          syncedTables: syncedList,
          vendorsSynced: vSynced,
          productsSynced: pSynced,
          ordersSynced: oSynced,
          loading: false,
          error: vError || pError || oError
        });

        if (syncedList.length > 0) {
          triggerToast(`Successfully connected to Supabase! Synced: ${syncedList.join(", ")}`, "success");
        } else {
          console.log("Supabase: Operating in optimized local fallback simulation.");
        }
      } catch (err: any) {
        setDbSyncStatus(prev => ({ ...prev, loading: false, error: err.message }));
      }
    }
    initSupabase();
  }, []);

  // Set up real-time orders sync subscription
  useEffect(() => {
    console.log("[SUPABASE REALTIME] Initializing subscription to public:orders");
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
          console.log("[SUPABASE REALTIME] New postgres change received on orders:", payload);
          const { data: dbOrders, synced } = await getSupabaseData<Order>("orders", []);
          if (synced && dbOrders) {
            setOrders(dbOrders);
          }
        }
      )
      .subscribe((status) => {
        console.log(`[SUPABASE REALTIME] Status changed: ${status}`);
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

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
    setVendors(prevVendors => {
      const updated = prevVendors.map(v => v.id === updatedVendor.id ? updatedVendor : v);
      saveSupabaseRecord("vendors", updatedVendor);
      triggerToast(`Store profile updated successfully!`, "success");
      return updated;
    });
  };
  const [searchFilter, setSearchFilter] = useState<string>("");
  const shouldReduceMotion = useReducedMotion();
  const [userEmail, setUserEmail] = useState<string>("nigerian.developer@gmail.com");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [checkoutAmount, setCheckoutAmount] = useState<number>(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState<boolean>(false);

  // Resend Automation states
  const [mailLogs, setMailLogs] = useState<MailLogEntry[]>([]);
  const [autoSendEmails, setAutoSendEmails] = useState<boolean>(true);

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
  const handleSendTestEmail = async (to: string, type: "payment_confirmation" | "delivery_confirmation" | "status_change" | "flagged", orderId: string) => {
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
      triggerToast(response.unconfigured 
        ? "Simulated dispatch created in local logs successfully!" 
        : "Live inbox dispatch triggered successfully via Resend API!", "success");
    } else {
      triggerToast(`Failing dispatch sequence: ${response.error || "Check logs"}`, "info");
    }
    updateMailLogs();
    return response;
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
    const cartSubtotal = cart.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);
    const estimatedTax = cartSubtotal * 0.075; // 7.5% VAT Nigeria
    // Estimate shipping (Lagos is free 0)
    const cartTotalSum = cartSubtotal + estimatedTax;

    setCheckoutAmount(cartTotalSum);
    setIsCheckoutOpen(true);
  };

  // Paystack verification success
  const handlePaymentSuccess = (method: string) => {
    // Generate simulated order
    const firstCartItem = cart[0];
    const orderValue = cart.reduce((acc, curr) => acc + curr.product.price * curr.quantity, 0);
    
    // Pick destination based on Lagos/Abuja/PH etc
    const destinationStates = ["Abuja", "Lagos", "Port Harcourt", "Kano", "Enugu"];
    const randomDest = destinationStates[Math.floor(Math.random() * destinationStates.length)];
    const startState = randomDest === "Lagos" ? "Kano" : "Lagos";

    const newOrder: Order = {
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

    const emailItems = cart.map((item) => ({
      name: item.product.title,
      qty: item.quantity,
      price: item.product.price
    }));

    setOrders([newOrder, ...orders]);
    setCart([]); // Clear cart
    
    // Persist new order in Supabase table
    saveSupabaseRecord("orders", newOrder);
    
    triggerToast("Security Code 200: Transaction reconciled. Shipments logged successfully!");

    // Automatically trigger Resend payment confirmation emails
    if (autoSendEmails) {
      sendResendEmail({
        to: userEmail,
        type: "payment_confirmation",
        data: {
          orderId: newOrder.id,
          customerName: newOrder.customerName,
          amount: newOrder.value,
          itemsCount: newOrder.itemsCount,
          date: newOrder.date,
          items: emailItems,
          actionUrl: window.location.origin
        }
      }).then((res) => {
        if (res.success) {
          triggerToast(res.unconfigured 
            ? "Payment receipt simulation logged successfully." 
            : `Resend Inbox Dispatch success for order ${newOrder.id}!`, "success");
        }
        updateMailLogs();
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
    saveSupabaseRecord("products", prod);
    
    triggerToast(`Successfully published ${prod.title} to NaijaStores Catalog.`, "success");
  };

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
            <span className="font-extrabold uppercase tracking-widest text-[9px] bg-emerald-800/40 px-2 py-0.5 rounded text-emerald-300">Fast Call to Order</span>
          </div>
          
          <p className="font-semibold tracking-wide text-white/95">
            Place your order directly via call or WhatsApp! Instant delivery setup nationwide.
          </p>

          <div className="flex items-center space-x-2 mt-0.5 sm:mt-0">
            <a 
              href="tel:+2348138575869" 
              className="bg-white text-emerald-800 hover:bg-emerald-50 px-2.5 py-1 rounded-lg font-bold shadow-xs transition-all hover:scale-105 inline-flex items-center space-x-1 text-[11px]"
            >
              <span>📞</span>
              <span>0813 857 5869</span>
            </a>
            <a 
              href="https://wa.me/2348138575869?text=Hello%20Naija%20Online%20Store%2C%20I%20want%20to%20place%20an%20order" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-emerald-950 text-white hover:bg-emerald-900 border border-emerald-800 px-2.5 py-1 rounded-lg font-bold shadow-xs transition-all hover:scale-105 inline-flex items-center space-x-1 text-[11px]"
            >
              <span className="w-3.5 h-3.5 inline-block text-[11px]">💬</span>
              <span>WhatsApp Order</span>
            </a>
          </div>
        </div>
      </motion.div>

      {/* Prime Header */}
      <Navbar
        currentScreen={currentScreen}
        onNavigate={(screen) => {
          setCurrentScreen(screen);
          setSearchFilter(""); // Clear query when changing tabs
        }}
        cartCount={cart.reduce((acc, curr) => acc + curr.quantity, 0)}
        onSearch={(query) => setSearchFilter(query)}
        userEmail={userEmail}
        categories={categories}
      />

       {/* Main Container Workspace layout */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 transition-all">

        <AnimatePresence mode="wait">
          {/* Customer views coordination */}
          {(currentScreen === "home" ||
            currentScreen === "shop" ||
            currentScreen === "details" ||
            currentScreen === "cart") && (
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
                cart={cart}
                onAddToCart={handleAddToCart}
                onUpdateCartQty={handleUpdateCartQty}
                onRemoveFromCart={handleRemoveFromCart}
                onCheckout={handleCheckoutTrigger}
                searchFilter={searchFilter}
                vendors={vendors}
                onRateVendor={handleRateVendor}
                categories={categories}
                products={products}
                orders={orders}
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
              <VendorAdmin
                orders={orders}
                products={products}
                vendors={vendors}
                onUpdateVendor={handleUpdateVendor}
                onReviewOrderFlag={handleReviewOrderFlag}
                onAddNewProduct={handleAddNewProduct}
                categories={categories}
                onUpdateCategories={handleUpdateCategories}
                
                // Email Automation Props
                mailLogs={mailLogs}
                onSendTestEmail={handleSendTestEmail}
                autoSendEmails={autoSendEmails}
                onToggleAutoSend={() => setAutoSendEmails(!autoSendEmails)}
                onRefreshMailLogs={updateMailLogs}
                userEmail={userEmail}
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
                        setProducts(MOCK_PRODUCTS);
                        setOrders([]);
                        setVendors(MOCK_VENDORS);
                        setCart([]);
                        setUserEmail("nigerian.developer@gmail.com");
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
                <a href="#" className="hover:text-emerald-400 transition-colors w-fit">Privacy Policy</a>
                <a href="#" className="hover:text-emerald-400 transition-colors w-fit">Terms & Conditions</a>
                <a href="#" className="hover:text-emerald-400 transition-colors w-fit">Shipping & Delivery</a>
                <a href="#" className="hover:text-emerald-400 transition-colors w-fit">Refund & Return Policy</a>
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

    </div>
  );
}

