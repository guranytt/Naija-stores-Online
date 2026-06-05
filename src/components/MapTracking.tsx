/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Truck, MapPin, Navigation, Clock, ShieldCheck, RefreshCw, AlertTriangle, CheckCircle, Info, Landmark } from "lucide-react";
import { NIGERIAN_CITIES } from "../data/mockData";
import { Order } from "../types";

interface MapTrackingProps {
  orders: Order[];
  onUpdateOrderProgress: (orderId: string, progress: number, currentCity: string, status?: Order["status"]) => void;
}

export default function MapTracking({ orders, onUpdateOrderProgress }: MapTrackingProps) {
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSpeed, setSimSpeed] = useState<number>(400); // ms per step
  const [trafficUpdate, setTrafficUpdate] = useState<string>("Roads are currently free flowing (Low Traffic congestion)");

  // Filter orders that are ready to be tracked (Shipped, Processing, Flagged)
  const trackableOrders = orders.filter(
    (o) => o.status === "Shipped" || o.status === "Processing" || o.status === "Flagged" || o.status === "Delivered"
  );

  // Set default selected order on load
  useEffect(() => {
    if (trackableOrders.length > 0 && !selectedOrderId) {
      // Find first non-delivered if possible
      const active = trackableOrders.find((o) => o.status !== "Delivered");
      setSelectedOrderId(active ? active.id : trackableOrders[0].id);
    }
  }, [trackableOrders, selectedOrderId]);

  const activeOrder = orders.find((o) => o.id === selectedOrderId);

  // Find start and end city coordinates
  const getCityCoords = (name: string) => {
    const city = NIGERIAN_CITIES.find((c) => c.name.toLowerCase() === name.toLowerCase());
    return city ? { x: city.x, y: city.y } : { x: 380, y: 320 }; // Default to Abuja center
  };

  // Simulate progress
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSimulating && activeOrder && activeOrder.status !== "Delivered" && activeOrder.status !== "Flagged") {
      timer = setInterval(() => {
        const nextProgress = activeOrder.deliveryProgress + 5;
        if (nextProgress >= 100) {
          onUpdateOrderProgress(activeOrder.id, 100, activeOrder.routeTo, "Delivered");
          setIsSimulating(false);
          setTrafficUpdate(`Package successfully delivered to ${activeOrder.customerName} in ${activeOrder.routeTo}!`);
        } else {
          // Identify city threshold based on progress percentage
          let city = activeOrder.currentCity;
          if (nextProgress > 30 && nextProgress < 75) {
            // intermediate
            city = activeOrder.routeFrom === "Lagos" && activeOrder.routeTo === "Abuja" ? "Ilorin" : "Enugu";
          } else if (nextProgress >= 75) {
            city = activeOrder.routeTo;
          }
          onUpdateOrderProgress(activeOrder.id, nextProgress, city, "Shipped");
          
          const updates = [
            "Heavy hold-up heading through Lagos-Ibadan expressway tollgates.",
            "Dispatch rider refueling at local fuel station in Ilorin, moving shortly.",
            "Normal clearance obtained at state security checkpoints, speed maintained.",
            "Lokoja bridge traffic bypass resolved, heading into FCT boundaries.",
            "Local delivery truck dispatch ready for house drop-off."
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
      // RESET
      onUpdateOrderProgress(activeOrder.id, 0, activeOrder.routeFrom, "Processing");
      setTrafficUpdate("Preparing shipment package for transit from " + activeOrder.routeFrom);
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
    setTrafficUpdate("CRITICAL: Route dispatch flagged for administrative auditing. Shipment held at " + activeOrder.currentCity);
  };

  const clearFlag = () => {
    if (!activeOrder) return;
    onUpdateOrderProgress(activeOrder.id, activeOrder.deliveryProgress, activeOrder.currentCity, "Shipped");
    setTrafficUpdate("Flag audit resolved. Shipment release triggered. Route resume allowed.");
  };

  const startCoords = activeOrder ? getCityCoords(activeOrder.routeFrom) : { x: 120, y: 480 };
  const endCoords = activeOrder ? getCityCoords(activeOrder.routeTo) : { x: 380, y: 320 };

  // Calculate vehicle current x, y based on progress
  const progressRatio = activeOrder ? activeOrder.deliveryProgress / 100 : 0;
  const vehicleX = startCoords.x + (endCoords.x - startCoords.x) * progressRatio;
  const vehicleY = startCoords.y + (endCoords.y - startCoords.y) * progressRatio;

  // Dispatch details depending on carrier
  const carrierInfo = {
    driver: "Malam Yusuf Chigozie",
    vehicle: "Suzuki Carry Van (NJS-992-LA)",
    rating: "4.9 ★",
    avatar: "AR"
  };

  return (
    <div className="bg-neutral-900 text-white rounded-2xl p-6 shadow-premium border border-neutral-800 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px] font-sans">
      
      {/* Map Graphical representation column (Desktop: Left 7 cols) */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        <div className="flex justify-between items-center bg-neutral-800/50 p-4 rounded-xl border border-neutral-800">
          <div className="space-y-1">
            <h3 className="font-title-md text-title-md font-bold text-orange-500">Live Logistics & Delivery Map</h3>
            <p className="text-xs text-neutral-400">Integrated GPS tracking network covering hubs across Nigeria State Highways.</p>
          </div>
          <div className="flex items-center space-x-2">
            <RefreshCw className={`w-4 h-4 text-emerald-500 ${isSimulating ? "animate-spin" : ""}`} />
            <span className="text-xs font-bold text-emerald-400 tracking-wider">REAL-TIME GPS LINKED</span>
          </div>
        </div>

        {/* Vector SVG Nigeria Map */}
        <div className="relative flex-grow bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center p-4 select-none min-h-[420px]">
          {/* Legend Details */}
          <div className="absolute top-4 left-4 bg-neutral-900/90 border border-neutral-800 rounded-lg p-3 space-y-1.5 z-20 text-[10px] uppercase font-bold tracking-wider">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-orange-500 rounded-full inline-block" />
              <span>Logistics Hub</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping inline-block" />
              <span>Active Shipments</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="h-0.5 w-4 border-t-2 border-dashed border-neutral-700 inline-block" />
              <span>Transit Highway</span>
            </div>
          </div>

          <svg className="w-full max-w-[700px] h-full min-h-[400px] aspect-[4/3]" viewBox="0 0 800 600">
            {/* Background Map Stylized Outlines of Nigeria Boundaries */}
            <path
              d="M100,50 L250,50 L350,100 L500,80 L650,100 L750,150 L730,300 L680,450 L500,530 L380,560 L280,540 L160,530 L110,480 L150,420 L130,340 L80,240 Z"
              fill="#141416"
              stroke="#2c2c31"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Stylized State Highway Paths */}
            {/* Lagos -> Ibadan -> Ilorin -> Abuja */}
            <path d="M120,480 Q140,450 155,430 T210,360 T380,320" fill="none" stroke="#2a2e35" strokeWidth="2.5" strokeDasharray="5,5" />
            
            {/* Lagos -> Enugu -> Port Harcourt */}
            <path d="M120,480 Q250,500 340,420 T300,520" fill="none" stroke="#2a2e35" strokeWidth="2.5" strokeDasharray="5,5" />
            
            {/* Abuja -> Kaduna -> Kano */}
            <path d="M380,320 T390,230 T440,140" fill="none" stroke="#2a2e35" strokeWidth="2.5" strokeDasharray="5,5" />

            {/* Abuja -> Enugu */}
            <path d="M380,320 T340,420" fill="none" stroke="#2a2e35" strokeWidth="2.5" strokeDasharray="5,5" />

            {/* Kano -> Maiduguri */}
            <path d="M440,140 Q560,130 680,130" fill="none" stroke="#2a2e35" strokeWidth="2.5" strokeDasharray="5,5" />

            {/* Active route highlighting */}
            {activeOrder && (
              <motion.path
                d={`M${startCoords.x},${startCoords.y} L${endCoords.x},${endCoords.y}`}
                fill="none"
                stroke="#f97316"
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.8"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5 }}
                className={isSimulating ? "animate-pulse" : ""}
                id="active-delivery-route-mesh"
              />
            )}

            {/* Draw Cities / Logistics Hub Nodes */}
            {NIGERIAN_CITIES.map((city) => {
              const isActiveNode = activeOrder && (city.name === activeOrder.routeFrom || city.name === activeOrder.routeTo || city.name === activeOrder.currentCity);
              return (
                <g key={city.name} className="cursor-pointer group">
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r={isActiveNode ? 8 : 5}
                    className={`transition-all duration-300 ${
                      isActiveNode
                        ? "fill-orange-500 stroke-orange-300 stroke-2 animate-pulse"
                        : "fill-neutral-700 hover:fill-orange-400"
                    }`}
                  />
                  <circle
                    cx={city.x}
                    cy={city.y}
                    r={isActiveNode ? 16 : 10}
                    fill="transparent"
                    className="stroke-orange-500/20 stroke-1 group-hover:block transition-all"
                  />
                  {/* Labels */}
                  <text
                    x={city.x}
                    y={city.labelPos === "bottom" ? city.y + 16 : city.y - 10}
                    textAnchor="middle"
                    className={`font-sans font-bold select-none text-[10px] tracking-wide transition-colors ${
                      isActiveNode ? "fill-orange-400" : "fill-neutral-400 hover:fill-white"
                    }`}
                  >
                    {city.name}
                  </text>
                </g>
              );
            })}

            {/* Simulated Shipment Vehicle Pulse (Pulsing pointer following coords) */}
            {activeOrder && activeOrder.status !== "Delivered" && (
              <g>
                <circle cx={vehicleX} cy={vehicleY} r="22" fill="none" className="stroke-orange-500 stroke-1 animate-ping" opacity="0.4" />
                <circle cx={vehicleX} cy={vehicleY} r="12" fill="#ea580c" className="stroke-white stroke-2 animate-pulse" />
                {/* Pointer Arrow */}
                <svg x={vehicleX - 10} y={vehicleY - 10} width="20" height="20" viewBox="0 0 24 24">
                  <Navigation className="w-5 h-5 text-white stroke-[2.5px] rotate-45 transform fill-white" />
                </svg>
              </g>
            )}
          </svg>
        </div>

        {/* Live feed info */}
        <div className="bg-neutral-950 p-4 border border-neutral-800 rounded-xl flex items-center space-x-3 text-sm">
          <div className="p-2 rounded-lg bg-orange-600/10 text-orange-500 flex-shrink-0 animate-pulse">
            <Info className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-neutral-300">Live Traffic Dispatch Feed:</p>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">{trafficUpdate}</p>
          </div>
        </div>
      </div>

      {/* Control panel column (Desktop: Right 4 cols) */}
      <div className="lg:col-span-4 flex flex-col space-y-4 border-l border-neutral-800 lg:pl-6">
        <h4 className="font-title-md text-title-md font-bold text-white border-b border-neutral-800 pb-3">Shipment Dispatch Command</h4>

        {/* Shipment Selector list */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-widest pl-1">Select Custom Order to Trace</label>
          <div className="max-h-40 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
            {trackableOrders.map((o) => (
              <button
                key={o.id}
                onClick={() => {
                  setSelectedOrderId(o.id);
                  setTrafficUpdate(`Selected trace for order ${o.id}. Path connects ${o.routeFrom} with ${o.routeTo}`);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                  selectedOrderId === o.id
                    ? "bg-neutral-800 border-orange-500 text-white"
                    : "bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                }`}
                id={`track-btn-${o.id}`}
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs">{o.id}</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-neutral-900 rounded border border-neutral-800">
                      {o.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1 uppercase tracking-wide">
                    {o.routeFrom} &rarr; {o.routeTo}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-xs text-neutral-300 font-mono leading-none">₦{(o.value / 1000).toFixed(0)}k</p>
                  <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{o.deliveryProgress}%</p>
                </div>
              </button>
            ))}
            {trackableOrders.length === 0 && (
              <div className="text-center py-6 text-neutral-500 text-xs">No active orders available to track</div>
            )}
          </div>
        </div>

        {/* Selected Order Stats Card */}
        {activeOrder ? (
          <div className="bg-neutral-950 rounded-xl p-4 border border-neutral-800/80 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-bold">CLIENT NAME</span>
                <span className="font-semibold text-neutral-200">{activeOrder.customerName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-bold">CARRIER ROUTE</span>
                <span className="font-semibold text-orange-400 uppercase">
                  {activeOrder.routeFrom} Hub &rarr; {activeOrder.routeTo} Hub
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-bold">CURRENT CITY</span>
                <span className="font-bold text-neutral-200 uppercase bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
                  {activeOrder.currentCity}
                </span>
              </div>

              {/* Progress Slider */}
              <div className="pt-2">
                <div className="flex justify-between text-[10px] font-bold text-neutral-400 mb-1">
                  <span>DISPATCH</span>
                  <span>PROGRESS - {activeOrder.deliveryProgress}%</span>
                  <span>DESTINATION</span>
                </div>
                <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden relative border border-neutral-900">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      activeOrder.status === "Flagged" ? "bg-red-500" : "bg-orange-500"
                    }`}
                    style={{ width: `${activeOrder.deliveryProgress}%` }}
                  />
                </div>
              </div>

              {/* Dispatch driver specs block */}
              <div className="border-t border-neutral-800/50 pt-2.5 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-orange-600/10 border border-orange-500/20 text-orange-500 flex items-center justify-center font-bold text-[10px]">
                  {carrierInfo.avatar}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-bold text-xs text-neutral-200 truncate">{carrierInfo.driver}</p>
                  <p className="text-[10px] text-neutral-400 truncate">{carrierInfo.vehicle}</p>
                </div>
              </div>
            </div>

            {/* Simulator Triggers */}
            <div className="space-y-2 mt-4">
              <div className="grid grid-cols-2 gap-2">
                {isSimulating ? (
                  <button
                    onClick={stopSim}
                    className="flex items-center justify-center space-x-1 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold rounded-lg transition-colors active:scale-95"
                    id="stop-map-sim"
                  >
                    <span>Pause GPS</span>
                  </button>
                ) : (
                  <button
                    disabled={activeOrder.status === "Flagged"}
                    onClick={startSim}
                    className={`flex items-center justify-center space-x-1 py-2.5 text-white text-xs font-bold rounded-lg transition-colors active:scale-95 ${
                      activeOrder.status === "Flagged"
                        ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                        : "bg-emerald-600 hover:bg-emerald-700"
                    }`}
                    id="start-map-sim"
                  >
                    <span>{activeOrder.status === "Delivered" ? "Re-Route Transit" : "Start Live Track"}</span>
                  </button>
                )}

                {activeOrder.status === "Flagged" ? (
                  <button
                    onClick={clearFlag}
                    className="flex items-center justify-center space-x-1 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-bold rounded-lg transition-colors active:scale-95"
                  >
                    <span>Clear Flag</span>
                  </button>
                ) : (
                  <button
                    disabled={activeOrder.status === "Delivered"}
                    onClick={triggerFlag}
                    className="flex items-center justify-center space-x-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-95"
                    id="flag-map-sim"
                  >
                    <span>Flag Transit</span>
                  </button>
                )}
              </div>

              {/* Adjust Simulation Speed widget */}
              <div className="flex items-center justify-between text-xs bg-neutral-900 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 font-bold uppercase tracking-wider text-[10px]">Refresh Tempo</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSimSpeed(1000)}
                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                      simSpeed === 1000 ? "bg-orange-500 text-white" : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    Slow Cruise
                  </button>
                  <button
                    onClick={() => setSimSpeed(300)}
                    className={`px-2 py-1 rounded text-[10px] font-bold ${
                      simSpeed === 300 ? "bg-orange-500 text-white" : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    Fast Express
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 bg-neutral-950 border border-neutral-800/80 rounded-xl">
            <p className="text-sm text-neutral-500">Pick an active shipment route above to engage manual telemetry controls.</p>
          </div>
        )}
      </div>
    </div>
  );
}
