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
import { Info, Settings2, Sparkles, X, Mail, ShieldAlert } from "lucide-react";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<string>("home");
  const [selectedProductId, setSelectedProductId] = useState<string>("p1");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [vendors, setVendors] = useState<Vendor[]>(MOCK_VENDORS);

  const handleRateVendor = (vendorId: string, starRating: number) => {
    setVendors(prevVendors =>
      prevVendors.map(v => {
        if (v.id === vendorId) {
          const currentCount = v.ratingCount || 10;
          const newCount = currentCount + 1;
          const newRating = Number(((v.rating * currentCount + starRating) / newCount).toFixed(1));
          triggerToast(`Thank you! Rated ${v.name} with ${starRating} Stars. Average is now ${newRating}.`, "success");
          return {
            ...v,
            rating: newRating,
            ratingCount: newCount
          };
        }
        return v;
      })
    );
  };
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("nigerian.developer@gmail.com");
  const [checkoutAmount, setCheckoutAmount] = useState<number>(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState<boolean>(false);

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

    setOrders([newOrder, ...orders]);
    setCart([]); // Clear cart
    triggerToast("Security Code 200: Transaction reconciled. Shipments logged successfully!");
    
    // Automatically redirect to the interactive map dashboard so they can track it live
    setCurrentScreen("map");
  };

  // Admin order flag modifier
  const handleReviewOrderFlag = (orderId: string, status: Order["status"]) => {
    setOrders(
      orders.map((o) =>
        o.id === orderId ? { ...o, status, deliveryProgress: status === "Delivered" ? 100 : o.deliveryProgress } : o
      )
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
          return {
            ...o,
            deliveryProgress: progress,
            currentCity,
            status: updatedStatus
          };
        }
        return o;
      })
    );
  };

  // Creator for newly published merchant items
  const handleAddNewProduct = (prod: Product) => {
    setProducts([prod, ...products]);
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
          <div className="relative w-80 sm:w-96 bg-white shadow-premium p-6 flex flex-col justify-between border-l border-neutral-200 h-full font-sans text-neutral-800 text-left">
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
            <div className="p-3 bg-neutral-50 border border-neutral-100 rounded-xl flex items-center space-x-2 text-[10px] text-neutral-400 justify-center">
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

