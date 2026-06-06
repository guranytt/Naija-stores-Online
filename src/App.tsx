/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import CustomerViews from "./components/CustomerViews";
import MapTracking from "./components/MapTracking";
import VendorAdmin from "./components/VendorAdmin";
import PaystackCheckout from "./components/PaystackCheckout";
import { Product, CartItem, Order, Vendor } from "./types";
import { MOCK_PRODUCTS, MOCK_ORDERS, MOCK_VENDORS } from "./data/mockData";
import { formatNaira } from "./components/CustomerViews";
import { Info, Settings2, Sparkles, X, Mail, ShieldAlert, Database, CheckCircle, AlertCircle, Copy, FileText } from "lucide-react";
import { supabase, getSupabaseData, saveSupabaseRecord, PROVISION_SQL_SCRIPT } from "./supabase";
import { sendResendEmail, fetchEmailLogs, MailLogEntry } from "./emailService";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<string>("home");
  const [selectedProductId, setSelectedProductId] = useState<string>("p1");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [vendors, setVendors] = useState<Vendor[]>(MOCK_VENDORS);

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
        const { data: dbOrders, synced: oSynced, error: oError } = await getSupabaseData<Order>("orders", MOCK_ORDERS);
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
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("nigerian.developer@gmail.com");
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
        alertReason: "Standard compliance check has triggered validation verification holds on the escrow network."
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
      customerName: userEmail.split("@")[0].toUpperCase() || "Shopper",
      status: "Processing",
      date: new Date().toISOString().split("T")[0],
      value: orderValue,
      itemsCount: cart.reduce((acc, curr) => acc + curr.quantity, 0),
      trackingId: "TRACK-" + Math.floor(Math.random() * 90000 + 10000),
      routeFrom: startState,
      routeTo: randomDest,
      deliveryProgress: 0,
      currentCity: startState
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
        onToggleDevConfig={() => setSettingsDrawerOpen(true)}
      />

      {/* Main Container Workspace layout */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 transition-all">
        
        {/* Banner Alert for Interactive Map Navigation */}
        {currentScreen === "home" && orders.some(o => o.status === "Processing" || o.status === "Shipped") && (
          <div className="bg-orange-50 border border-orange-150 p-4 rounded-xl text-left flex items-center justify-between mb-6 shadow-xs animate-pulse">
            <div className="flex items-center space-x-3 text-xs sm:text-sm font-semibold text-orange-800">
              <span className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping" />
              <span>You have active shipments in transit! Track live delivery schedules on the geographical map tracker.</span>
            </div>
            <button
              onClick={() => setCurrentScreen("map")}
              className="text-xs bg-orange-550 text-white font-bold bg-orange-500 px-3.5 py-1.5 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Trace Shipments
            </button>
          </div>
        )}

        <div className="fade-in">
          {/* Customer views coordination */}
          {(currentScreen === "home" ||
            currentScreen === "shop" ||
            currentScreen === "details" ||
            currentScreen === "cart") && (
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
            />
          )}

          {/* Integrated Nigeria Map tracker Screen */}
          {currentScreen === "map" && (
            <MapTracking
              orders={orders}
              onUpdateOrderProgress={handleUpdateOrderProgress}
            />
          )}

          {/* Admin Platform / Merchant Screens */}
          {currentScreen === "admin" && (
            <VendorAdmin
              orders={orders}
              products={products}
              vendors={vendors}
              onReviewOrderFlag={handleReviewOrderFlag}
              onAddNewProduct={handleAddNewProduct}
              
              // Email Automation Props
              mailLogs={mailLogs}
              onSendTestEmail={handleSendTestEmail}
              autoSendEmails={autoSendEmails}
              onToggleAutoSend={() => setAutoSendEmails(!autoSendEmails)}
              onRefreshMailLogs={updateMailLogs}
              userEmail={userEmail}
            />
          )}

          {/* Shopper Account Verification Form */}
          {currentScreen === "auth" && (
            <div className="max-w-md mx-auto bg-white rounded-2xl border border-neutral-200 shadow-premium p-8 text-left space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xl mx-auto">₦</div>
                <h2 className="text-xl font-black text-neutral-900 tracking-tight">Shopper Verification Hub</h2>
                <p className="text-xs text-neutral-400">Specify credentials to synchronize Paystack settlement databases</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Shopper Email</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="e.g. shopper@naija.com"
                      className="w-full px-4 py-3 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-neutral-700 bg-white"
                      id="shopper-email-input"
                    />
                    <Mail className="w-4 h-4 text-neutral-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest pl-1">Escrow Location State</label>
                  <select
                    className="w-full px-4 py-3 text-xs border border-neutral-200 rounded-xl bg-white outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                  >
                    <option>Lagos Mainland, Lagos</option>
                    <option>Lekki Phase 1, Lagos</option>
                    <option>Maitama, Abuja (FCT)</option>
                    <option>Wuse II, Abuja (FCT)</option>
                    <option>GRA, Port Harcourt (Rivers)</option>
                    <option>Kano City, Kano</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    triggerToast(`Synchronized profile as ${userEmail}.`);
                    setCurrentScreen("home");
                  }}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 font-bold text-xs tracking-wider uppercase text-white rounded-xl shadow-xs transition-colors"
                  id="auth-submit"
                >
                  Confirm Escrow Session
                </button>
              </div>
            </div>
          )}
        </div>

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
      {settingsDrawerOpen && (
        <div className="fixed inset-0 z-100 flex justify-end">
          <div className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs" onClick={() => setSettingsDrawerOpen(false)} />
          <div className="relative w-80 sm:w-96 bg-white shadow-premium p-6 flex flex-col justify-between border-l border-neutral-200 h-full font-sans text-neutral-800 text-left overflow-y-auto">
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

                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2">
                  <p className="font-bold text-emerald-950 flex items-center space-x-1">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    <span>NaijaStores Escrow Protocol</span>
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
                        setOrders(MOCK_ORDERS);
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
          </div>
        </div>
      )}

      {/* Toaster element */}
      {toaster.show && (
        <div className="fixed bottom-6 right-6 z-100 max-w-sm">
          <div className={`p-4 rounded-xl shadow-premium border flex items-start space-x-3 text-xs leading-normal font-semibold text-left transition-all duration-300 animate-slide-in ${
            toaster.type === "success"
              ? "bg-emerald-950 border-emerald-800 text-white"
              : "bg-neutral-900 border-neutral-800 text-neutral-200"
          }`}>
            <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${toaster.type === "success" ? "text-orange-400" : "text-neutral-400"}`} />
            <div>
              <p className="font-bold uppercase tracking-widest text-[9px] mb-0.5 text-neutral-400">Notification Link</p>
              <p className="text-sm font-medium">{toaster.msg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Custom Global Footer */}
      <footer className="bg-emerald-950 text-white/50 py-8 border-t border-emerald-900 text-center text-xs select-none mt-auto">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <p className="font-bold text-emerald-300 tracking-wide">₦ NaijaStores Online Plaza Limited</p>
          <p className="leading-relaxed max-w-md mx-auto">
            A high-fidelity sandbox demonstrating real-time Nigerian vendor marketplaces, Paystack payment validations, and animated interstate logistics tracing.
          </p>
          <div className="pt-4 text-[10px] uppercase font-bold tracking-widest border-t border-emerald-900 max-w-xs mx-auto flex justify-between">
            <span>Escrow Guarantee</span>
            <span>&bull;</span>
            <span>Paystack Secured</span>
            <span>&bull;</span>
            <span>State Tracking</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

