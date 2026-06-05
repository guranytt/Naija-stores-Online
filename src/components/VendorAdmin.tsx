/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { DollarSign, Percent, TrendingUp, AlertCircle, Eye, BadgeAlert, Sparkles, Send, ShieldPlus, Check, ChevronRight, Ban } from "lucide-react";
import { Vendor, Order, AdminTeamMember, Product } from "../types";
import { MOCK_VENDORS, MOCK_ORDERS, MOCK_TEAM_MEMBERS, MOCK_PRODUCTS } from "../data/mockData";
import { formatNaira } from "./CustomerViews";

interface VendorAdminProps {
  orders: Order[];
  onReviewOrderFlag: (orderId: string, status: Order["status"]) => void;
  products: Product[];
  onAddNewProduct?: (product: Product) => void;
  vendors?: Vendor[];
}

export default function VendorAdmin({ orders, onReviewOrderFlag, products, onAddNewProduct, vendors = [] }: VendorAdminProps) {
  const [adminTab, setAdminTab] = useState<"vendor" | "platform">("vendor");
  
  // States for adding a customized new product
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("fashion");
  const [newStock, setNewStock] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const vendorsList = vendors && vendors.length > 0 ? vendors : MOCK_VENDORS;
  const activeVendor = vendorsList.find(v => v.id === "v_heritage") || vendorsList[0];
  const averageVendorRating = vendorsList.reduce((acc, curr) => acc + curr.rating, 0) / vendorsList.length;

  // Raw mock stats for platform view
  const platformStats = {
    totalGMV: 4859000,
    activeUsers: "124,800",
    activeVendors: "432",
    pendingVerifications: 4
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
        category: newCategory === "fashion" ? "Naija Fashion & Ankara" : "Naija Tech Hub",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBXHHRDhnfXAPzOsfwJAJsaalg4cWfRii5vBleuGOxKrptM-qmw3JgFBhmDSeXClxBlfi3YbQJiQs13dl3CJxFMTrEsoeKAI1JkXEckU88mcDf64zuwrUdWJW8NNuhXEbmbimeAKXSCpzoTENrA7IaXi3jzD_WCPb-on3IiWMAikNItCyKkPDuCIxGIIFS30rf-qvm-aGDzOiKqproxCid4Yu_VB_ycleJTW0iXWyz1WZUzAk_v-gZdvKW2YKJet89-kA4ee4AC0u9d",
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
    setShowAddProductModal(false);
  };

  return (
    <div className="space-y-6 font-sans text-neutral-800 text-left">
      
      {/* Tab Selectors Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-1.5 bg-neutral-100 rounded-2xl gap-2 shadow-xs select-none border border-neutral-150">
        <div className="flex space-x-1.5 w-full sm:w-auto">
          <button
            onClick={() => setAdminTab("vendor")}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              adminTab === "vendor"
                ? "bg-white text-neutral-900 shadow-sm font-extrabold"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <span>Alex's Merchant Cabin</span>
          </button>
          
          <button
            onClick={() => setAdminTab("platform")}
            className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              adminTab === "platform"
                ? "bg-white text-neutral-900 shadow-sm font-extrabold"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <ShieldPlus className="w-4 h-4 text-emerald-600" />
            <span>Master Administrator Admin Console</span>
          </button>
        </div>
        <div className="px-3 py-1 bg-white border border-neutral-200 rounded-lg text-[10px] font-bold text-neutral-500 uppercase tracking-widest font-mono">
          Currency: NGN (₦)
        </div>
      </div>

      {/* ---------------- A. ALEX'S MERCHANT PANEL ---------------- */}
      {adminTab === "vendor" && (
        <div className="space-y-6">
          
          {/* Header context */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">Welcome back, {activeVendor.ownerName}</h2>
              <p className="text-xs text-neutral-400 font-semibold">{activeVendor.name} &bull; {activeVendor.location}</p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setShowAddProductModal(true)}
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
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight mt-1.5">{formatNaira(activeVendor.salesToday)}</h3>
              <p className="text-[10px] text-emerald-600 font-bold mt-1 inline-flex items-center space-x-1">
                <span>&uarr; 12.5%</span> 
                <span className="text-neutral-400 font-normal">from yesterday</span>
              </p>
            </div>

            {/* Pending Orders */}
            <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-sans">Active Orders Needs Shipping</p>
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight mt-1">{activeVendor.ordersPending} orders</h3>
              <p className="text-[10px] text-orange-500 font-bold mt-1 inline-flex items-center space-x-1">
                <span>● Urgent Delivery queue</span>
              </p>
            </div>

            {/* Custom stock warnings */}
            <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Stock Alert Limits</p>
              <div className="flex items-center space-x-2.5 mt-1.5">
                <h3 className="text-2xl font-black text-red-600 tracking-tight">{activeVendor.stockAlerts} items</h3>
                <span className="bg-red-50 text-red-600 font-extrabold text-[9px] px-1.5 py-0.5 rounded border border-red-100 uppercase tracking-wide">Danger Limit</span>
              </div>
              <p className="text-[10px] text-neutral-400 font-semibold mt-1">Re-ordering coordinates advised</p>
            </div>

            {/* Ratings summary */}
            <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs">
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Net Rating Factor</p>
              <h3 className="text-2xl font-black text-neutral-900 tracking-tight mt-1">{activeVendor.rating.toFixed(1)} ★</h3>
              <p className="text-[10px] text-emerald-600 font-bold mt-1 inline-flex items-center space-x-1">
                <span>Verified by {activeVendor.ratingCount || 145} customers</span>
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
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Agbada & Craft Sales</span>
                </div>
              </div>

              {/* Vector Bar Layout */}
              <div className="h-60 flex items-end justify-between pt-6 px-4">
                {[
                  { d: "Mon", v: 105000, h: "35%" },
                  { d: "Tue", v: 185000, h: "55%" },
                  { d: "Wed", v: 240000, h: "75%" },
                  { d: "Thu", v: 120000, h: "40%" },
                  { d: "Fri", v: 342050, h: "98%" },
                  { d: "Sat", v: 200000, h: "65%" },
                  { d: "Sun", v: 150000, h: "45%" }
                ].map((bar) => (
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
                {products.filter(p => p.stock <= 12).slice(0, 3).map((item) => (
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
                {products.filter(p => p.stock <= 12).length === 0 && (
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
                      <option value="fashion">Naija Fashion & Ankara</option>
                      <option value="electronics">Naija Tech Hub</option>
                    </select>
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

          {/* Orders log database table list with actions */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/55 select-none">
              <p className="font-extrabold text-sm text-neutral-800 tracking-tight">Recent Escrow Order Dispatches</p>
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
                    <th className="px-6 py-3.5 text-right">Route Escrow Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 font-medium">
                  {orders.map((o) => (
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
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Vendor Reputation Ledger Section */}
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50/55 select-none animate-fade-in">
              <p className="font-extrabold text-sm text-neutral-800 tracking-tight">Active Vendor Trust Indexes & Escrow Dispatches</p>
              <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2.5 py-1 rounded">Dynamic Star Rating Averages</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-neutral-50 text-neutral-400 font-bold uppercase tracking-wider border-b border-neutral-100">
                  <tr>
                    <th className="px-6 py-3.5">Vendor / Hub ID</th>
                    <th className="px-6 py-3.5">Managing Partner</th>
                    <th className="px-6 py-3.5">Operational Center</th>
                    <th className="px-6 py-3.5">Feedback Weight</th>
                    <th className="px-6 py-3.5 text-right">Reputation Index</th>
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
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
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

        </div>
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
