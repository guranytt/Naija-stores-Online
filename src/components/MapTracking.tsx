/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Truck, 
  MapPin, 
  Navigation, 
  Clock, 
  ShieldCheck, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  ClipboardList, 
  ShoppingBag,
  ArrowRight,
  Search,
  Check,
  Calendar,
  DollarSign
} from "lucide-react";
import { Order } from "../types";

interface MapTrackingProps {
  orders: Order[];
  onUpdateOrderProgress: (orderId: string, progress: number, currentCity: string, status?: Order["status"]) => void;
  onConfirmReceipt?: (orderId: string) => void;
}

export default function MapTracking({ orders, onUpdateOrderProgress, onConfirmReceipt }: MapTrackingProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState<number>(400); // ms per step
  const [trafficUpdate, setTrafficUpdate] = useState<string>("Package processed at Balogun Transit Hub. Queue clearing smoothly.");
  const [filterTabs, setFilterTabs] = useState<"all" | "Processing" | "Shipped" | "Delivered" | "Flagged">("all");
  const [searchPhrase, setSearchPhrase] = useState("");

  // Filter orders based on tabs
  const filteredOrders = orders.filter((o) => {
    const matchesTab = filterTabs === "all" || o.status === filterTabs;
    const matchesSearch = 
      o.id.toLowerCase().includes(searchPhrase.toLowerCase()) || 
      o.customerName.toLowerCase().includes(searchPhrase.toLowerCase()) ||
      (o.trackingId && o.trackingId.toLowerCase().includes(searchPhrase.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  // Set default selected order on load
  useEffect(() => {
    if (filteredOrders.length > 0) {
      const alreadySelectedValid = filteredOrders.find((o) => o.id === selectedOrderId);
      if (!alreadySelectedValid) {
        // Prefer first non-delivered if possible
        const active = filteredOrders.find((o) => o.status !== "Delivered");
        setSelectedOrderId(active ? active.id : filteredOrders[0].id);
      }
    } else if (orders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(orders[0].id);
    }
  }, [filteredOrders, selectedOrderId, orders]);

  const activeOrder = orders.find((o) => o.id === selectedOrderId);

  // Simulate progress
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSimulating && activeOrder && activeOrder.status !== "Delivered" && activeOrder.status !== "Flagged") {
      timer = setInterval(() => {
        const nextProgress = activeOrder.deliveryProgress + 10;
        if (nextProgress >= 100) {
          onUpdateOrderProgress(activeOrder.id, 100, activeOrder.routeTo, "Delivered");
          setIsSimulating(false);
          setTrafficUpdate(`Package successfully delivered to dispatcher for final door-drop in ${activeOrder.routeTo}!`);
        } else {
          // Identify city threshold based on progress percentage
          let city = activeOrder.currentCity;
          if (nextProgress > 30 && nextProgress < 75) {
            city = activeOrder.routeFrom === "Lagos" && activeOrder.routeTo === "Abuja" ? "Ilorin" : "Enugu";
          } else if (nextProgress >= 75) {
            city = activeOrder.routeTo;
          }
          onUpdateOrderProgress(activeOrder.id, nextProgress, city, "Shipped");
          
          const updates = [
            "Carrier vehicle dispatched from Plaza mainland loading bay.",
            "Normal clearance obtained at regional security checkpoints, speed maintained.",
            "Transit carrier bypassing local heavy traffic hold-ups on state highways.",
            "Shipment arrived at intermediate regional sorting station.",
            "Final sector delivery truck loaded, heading to destination address hub."
          ];
          setTrafficUpdate(updates[Math.floor(nextProgress / 20) % updates.length]);
        }
      }, simSpeed);
    }
    return () => clearInterval(timer);
  }, [isSimulating, activeOrder, onUpdateOrderProgress, simSpeed]);

  const startSim = () => {
    if (!activeOrder) return;
    if (activeOrder.status === "Delivered") {
      onUpdateOrderProgress(activeOrder.id, 0, activeOrder.routeFrom, "Processing");
      setTrafficUpdate("Preparing shipment package for custom transit from " + activeOrder.routeFrom);
    }
    setIsSimulating(true);
  };

  const stopSim = () => {
    setIsSimulating(false);
  };

  const triggerFlag = () => {
    if (!activeOrder) return;
    onUpdateOrderProgress(activeOrder.id, activeOrder.deliveryProgress, activeOrder.currentCity, "Flagged");
    setIsSimulating(false);
    setTrafficUpdate("CRITICAL WARNING: Route dispatch flagged for admin compliance review. Held at " + activeOrder.currentCity);
  };

  const clearFlag = () => {
    if (!activeOrder) return;
    onUpdateOrderProgress(activeOrder.id, activeOrder.deliveryProgress, activeOrder.currentCity, "Shipped");
    setTrafficUpdate("Compliance check resolved. Shipment release triggered. Route resume allowed.");
  };

  // Dispatch details depending on carrier
  const carrierInfo = {
    driver: "Malam Yusuf Chigozie",
    vehicle: "Suzuki Carry Van (NJS-992-LA)",
    rating: "4.9 ★",
    avatar: "AR"
  };

  // Tracking milestones
  const steps = [
    { label: "Ordered & Confirmed", description: "Payment verified successfully", minProgress: 0, status: "Processing" },
    { label: "Regional Assembly", description: "Sorted and prepared by merchant", minProgress: 25, status: "Processing" },
    { label: "Dispatch Highway", description: "In transit with regional carrier", minProgress: 55, status: "Shipped" },
    { label: "Delivery Completed", description: "Successfully arrived at door address", minProgress: 100, status: "Delivered" }
  ];

  return (
    <div className="bg-white text-neutral-900 rounded-3xl p-6 shadow-premium border border-neutral-100 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px] font-sans">
      
      {/* LEFT COLUMN: Customer Order History & Search (Lg: 5 columns) */}
      <div className="lg:col-span-5 flex flex-col space-y-4 border-r border-neutral-100 pr-0 lg:pr-6">
        <div>
          <h2 className="text-xl font-black text-neutral-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5.5 h-5.5 text-orange-500" />
            <span>Order History Ledger</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">Complete archives and status tracking of your custom orders.</p>
        </div>

        {/* Search Field */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search order ID, status or key..."
            value={searchPhrase}
            onChange={(e) => setSearchPhrase(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none placeholder-neutral-400 font-medium"
          />
          <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex flex-wrap gap-1 bg-neutral-50 p-1 rounded-xl">
          {(["all", "Processing", "Shipped", "Delivered", "Flagged"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTabs(tab)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors ${
                filterTabs === tab
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              {tab === "all" ? "All" : tab}
            </button>
          ))}
        </div>

        {/* Orders list */}
        <div className="flex-1 overflow-y-auto max-h-[460px] space-y-2 pr-1 custom-scrollbar">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((o) => {
              const isActive = selectedOrderId === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => {
                    setSelectedOrderId(o.id);
                    setTrafficUpdate(`Selected order ${o.id}. Route matches ${o.routeFrom} to ${o.routeTo}.`);
                  }}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                    isActive
                      ? "bg-neutral-50 border-orange-500 shadow-sm"
                      : "bg-white border-neutral-105 hover:border-neutral-200"
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-xs text-neutral-900 font-mono">#{o.id}</span>
                      <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-full border ${
                        o.status === "Delivered"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                          : o.status === "Flagged"
                          ? "bg-red-50 text-red-700 border-red-200/50"
                          : o.status === "Shipped"
                          ? "bg-blue-50 text-blue-700 border-blue-200/50"
                          : "bg-amber-50 text-amber-700 border-amber-200/50"
                      }`}>
                        {o.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[10px] text-neutral-500 font-medium">
                      <Calendar className="w-3 h-3 text-neutral-400" />
                      <span>{o.date}</span>
                      <span>&bull;</span>
                      <span className="uppercase font-semibold text-neutral-600">{o.routeFrom} &rarr; {o.routeTo}</span>
                    </div>
                  </div>

                  <div className="text-right pl-3">
                    <p className="font-extrabold text-xs text-neutral-800">₦{o.value.toLocaleString()}</p>
                    <p className="text-[10px] text-neutral-400 font-bold mt-0.5">{o.itemsCount} items</p>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-12 bg-neutral-50 rounded-2xl border border-neutral-100 p-6">
              <ShoppingBag className="w-8 h-8 text-neutral-350 mx-auto opacity-40 mb-2" />
              <p className="text-xs text-neutral-500 font-bold">No orders found matching criteria.</p>
              <p className="text-[10px] text-neutral-400 mt-1">Complete shopping checklist checkout steps to register your first active parcel tracking.</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Status milestones (Lg: 7 columns, no map graphics) */}
      <div className="lg:col-span-7 flex flex-col space-y-5 justify-between">
        {activeOrder ? (
          <div className="space-y-6 flex flex-col h-full justify-between">
            {/* Header */}
            <div className="bg-neutral-50 p-4 border border-neutral-150 rounded-2xl flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-0.5 text-left">
                <span className="text-[9px] bg-orange-100 text-orange-700 font-extrabold uppercase px-2 py-0.5 rounded">Live Telemetry Details</span>
                <h3 className="font-black text-sm sm:text-base text-neutral-900 mt-1">
                  Tracking ID: <span className="text-neutral-600 font-mono font-bold">{activeOrder.trackingId}</span>
                </h3>
                <p className="text-xs text-neutral-400">Recipient: <strong className="text-neutral-700 font-bold">{activeOrder.customerName}</strong></p>
              </div>

              <div className="text-right">
                <span className="text-xs text-neutral-400 font-bold uppercase block">Parcel Total</span>
                <p className="font-mono font-black text-base sm:text-lg text-neutral-900 leading-none mt-1">
                  ₦{activeOrder.value.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Custom Milestone Progress steps (Map Alternative) */}
            <div className="space-y-4 py-2">
              <h4 className="text-[10px] font-black text-neutral-400 tracking-wider uppercase pl-1">Shipping Milestone Progress</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
                {steps.map((step, idx) => {
                  const isDone = activeOrder.deliveryProgress >= step.minProgress;
                  const isCurrent = 
                    (activeOrder.deliveryProgress >= step.minProgress && 
                     (idx === steps.length - 1 || activeOrder.deliveryProgress < steps[idx + 1].minProgress)) ||
                    (idx === 0 && activeOrder.deliveryProgress === 0);

                  return (
                    <div 
                      key={step.label}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden ${
                        isCurrent 
                          ? "bg-orange-50 border-orange-350 shadow-xs"
                          : isDone
                          ? "bg-neutral-50 border-neutral-200/70 opacity-90"
                          : "bg-white border-neutral-100 opacity-55"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                          isDone 
                            ? "bg-emerald-500 text-white" 
                            : isCurrent
                            ? "bg-orange-500 text-white animate-pulse"
                            : "bg-neutral-100 text-neutral-400"
                        }`}>
                          {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                        </span>
                        
                        {isCurrent && (
                          <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-600"></span>
                          </span>
                        )}
                      </div>

                      <p className={`text-xs font-black ${isCurrent ? "text-orange-950" : "text-neutral-900"}`}>{step.label}</p>
                      <p className="text-[10px] text-neutral-400 mt-1 leading-snug">{step.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar slider background */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center text-[10px] font-black tracking-wider uppercase pl-1">
                  <span className="text-neutral-400">Dispatch Hub</span>
                  <span className="text-orange-600 font-bold">Transit Progress - {activeOrder.deliveryProgress}% Completed</span>
                  <span className="text-neutral-400">Doorstep</span>
                </div>
                <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden relative border border-neutral-150 p-0.5">
                  <motion.div
                    className={`h-full rounded-full transition-all duration-300 ${
                      activeOrder.status === "Flagged" ? "bg-red-500" : "bg-orange-500"
                    }`}
                    style={{ width: `${activeOrder.deliveryProgress}%` }}
                    animate={{ width: `${activeOrder.deliveryProgress}%` }}
                    transition={{ type: "spring", stiffness: 80, damping: 15 }}
                  />
                </div>
              </div>
            </div>

            {/* Carrier Driver & Route Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-150 text-left">
                <h5 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2.5">Carrier Service Dispatch</h5>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 font-extrabold flex items-center justify-center text-xs">
                    {carrierInfo.avatar}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs text-neutral-800 truncate">{carrierInfo.driver}</p>
                    <p className="text-[10px] text-neutral-400 truncate">{carrierInfo.vehicle} &bull; {carrierInfo.rating}</p>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-150 text-left">
                <h5 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2.5">Logistics Route Cities</h5>
                <p className="text-[11px] font-bold text-neutral-700">
                  📍 Start Node: <span className="uppercase text-neutral-900">{activeOrder.routeFrom}</span>
                </p>
                <p className="text-[11px] font-bold text-neutral-700 mt-1">
                  📍 Last Scanned: <span className="uppercase text-orange-600 bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded text-[10px]">{activeOrder.currentCity}</span>
                </p>
                <p className="text-[11px] font-bold text-neutral-700 mt-1">
                  🏁 Destination: <span className="uppercase text-neutral-900">{activeOrder.routeTo}</span>
                </p>
              </div>
            </div>

            {/* Live logistics ticker */}
            <div className="bg-neutral-900 text-neutral-100 px-4 py-3 rounded-2xl flex items-center space-x-3 text-xs leading-normal font-medium mt-auto">
              <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 shrink-0">
                <Info className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1 text-left">
                <span className="text-[9px] text-orange-400 font-black uppercase tracking-widest leading-none block">Automated Dispatch Logs</span>
                <p className="text-[11px] text-neutral-300 font-mono mt-0.5 truncate">{trafficUpdate}</p>
              </div>
            </div>

            {/* Interactive Dispatcher Controls */}
            <div className="border-t border-neutral-100 pt-4 mt-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider pl-1">Logistics Agent Manual Controls</span>
                
                <div className="flex gap-2">
                  {onConfirmReceipt && activeOrder.receiptPrompted && !activeOrder.receiptConfirmed && (
                    <button
                      onClick={() => onConfirmReceipt(activeOrder.id)}
                      className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-black rounded-xl transition-all shadow shadow-orange-200 active:scale-95 animate-bounce"
                    >
                      Confirm I have received this package
                    </button>
                  )}
                  {isSimulating ? (
                    <button
                      onClick={stopSim}
                      className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
                    >
                      <span>Pause Auto GPS</span>
                    </button>
                  ) : (
                    <button
                      disabled={activeOrder.status === "Flagged"}
                      onClick={startSim}
                      className={`px-4 py-2 text-white text-xs font-black rounded-xl transition-all active:scale-95 ${
                        activeOrder.status === "Flagged"
                          ? "bg-neutral-200 text-neutral-400 cursor-not-allowed border border-neutral-300"
                          : "bg-emerald-600 hover:bg-emerald-700"
                      }`}
                    >
                      <span>{activeOrder.status === "Delivered" ? "Re-Route Transit" : "Start Live Track"}</span>
                    </button>
                  )}

                  {activeOrder.status === "Flagged" ? (
                    <button
                      onClick={clearFlag}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95"
                    >
                      <span>Clear Audit Flag</span>
                    </button>
                  ) : (
                    <button
                      disabled={activeOrder.status === "Delivered"}
                      onClick={triggerFlag}
                      className="px-4 py-2 bg-red-650 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                    >
                      <span>Flag Route Transit</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-neutral-50 border border-neutral-100 rounded-3xl min-h-[480px]">
            <ShoppingBag className="w-12 h-12 text-neutral-300 mb-2 opacity-50" />
            <h4 className="font-bold text-neutral-800 text-sm">No Active Tracking Record Selected</h4>
            <p className="text-xs text-neutral-400 max-w-sm mt-1 text-center">Select any transaction from the order history ledger on the left side to review active timeline scanning logs or simulated dispatcher credentials.</p>
          </div>
        )}
      </div>

    </div>
  );
}
