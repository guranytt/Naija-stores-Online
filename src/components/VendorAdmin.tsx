/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { DollarSign, Percent, TrendingUp, AlertCircle, Eye, BadgeAlert, Sparkles, Send, ShieldPlus, Check, ChevronRight, Ban, Mail, Sliders, RefreshCw, CheckCircle, Database, HelpCircle, X, Image as ImageIcon, UploadCloud, BarChart2 } from "lucide-react";
import { Vendor, Order, AdminTeamMember, Product } from "../types";
import { MOCK_VENDORS, MOCK_ORDERS, MOCK_TEAM_MEMBERS, MOCK_PRODUCTS } from "../data/mockData";
import { formatNaira } from "./CustomerViews";
import { uploadToCloudinary, convertFileToBase64 } from "../cloudinaryService";
import SalesAnalyticsDashboard from "./SalesAnalyticsDashboard";

interface VendorAdminProps {
  orders: Order[];
  onReviewOrderFlag: (orderId: string, status: Order["status"]) => void;
  products: Product[];
  onAddNewProduct?: (product: Product) => void;
  vendors?: Vendor[];
  
  // Resend Email Integration supporting controls
  mailLogs?: any[];
  onSendTestEmail?: (to: string, type: "payment_confirmation" | "delivery_confirmation" | "status_change" | "flagged", orderId: string) => Promise<any>;
  autoSendEmails?: boolean;
  onToggleAutoSend?: () => void;
  onRefreshMailLogs?: () => void;
  userEmail?: string;
}

export default function VendorAdmin({ 
  orders, 
  onReviewOrderFlag, 
  products, 
  onAddNewProduct, 
  vendors = [],
  mailLogs = [],
  onSendTestEmail,
  autoSendEmails = true,
  onToggleAutoSend = () => {},
  onRefreshMailLogs = () => {},
  userEmail = "nigerian.developer@gmail.com"
}: VendorAdminProps) {
  const [adminTab, setAdminTab] = useState<"vendor" | "dashboard" | "platform" | "emails">("vendor");
  
  // States for adding a customized new product
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newCategory, setNewCategory] = useState("fashion");
  const [newStock, setNewStock] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newImage, setNewImage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

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
        category: newCategory === "fashion" ? "Naija Fashion & Ankara" : "Naija Tech Hub",
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
  onRefreshMailLogs,
  userEmail
}: {
  orders: Order[];
  mailLogs: any[];
  autoSendEmails: boolean;
  onToggleAutoSend: () => void;
  onSendTestEmail?: (to: string, type: "payment_confirmation" | "delivery_confirmation" | "status_change" | "flagged", orderId: string) => Promise<any>;
  onRefreshMailLogs: () => void;
  userEmail: string;
}) {
  const [testRecipient, setTestRecipient] = useState(userEmail);
  const [testMailType, setTestMailType] = useState<"payment_confirmation" | "delivery_confirmation" | "status_change" | "flagged">("payment_confirmation");
  const [testOrderId, setTestOrderId] = useState(orders[0]?.id || "NS-9942");
  const [isDispatching, setIsDispatching] = useState(false);
  const [selectedPreviewLog, setSelectedPreviewLog] = useState<any | null>(null);
  const [localFeedback, setLocalFeedback] = useState<string | null>(null);

  // Sync recipient state when user changes email in App
  React.useEffect(() => {
    setTestRecipient(userEmail);
  }, [userEmail]);

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
                Transactional messaging framework synced to local sales checkouts and Escrow modifications.
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
                  <option value="payment_confirmation">Invoice Paid &amp; Checked Out (Escrow Receipt)</option>
                  <option value="delivery_confirmation">🚚 Out for Dispatch (Shipping Map Update)</option>
                  <option value="status_change">System Notification (Status Modified)</option>
                  <option value="flagged">⚠️ Security Risk Alert (Compliance Escrow Hold)</option>
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

            <button
              onClick={triggerDirectFire}
              disabled={isDispatching}
              className="w-full py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-extrabold uppercase rounded-xl tracking-wider text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-md disabled:opacity-50"
            >
              {isDispatching ? (
                <React.Fragment>
                  <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
                  <span>Transmitting Payload...</span>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <Send className="w-4 h-4 text-orange-400" />
                  <span>Transmit Email Payload</span>
                </React.Fragment>
              )}
            </button>
          </div>

        </div>

        {/* 3. Help guidelines / documentation */}
        <div className="bg-white border border-neutral-155 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="border-b border-neutral-50 pb-2 flex justify-between items-center">
            <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-orange-500" />
              <span>Fullstack Automation System Guide</span>
            </h3>
            <span className="text-[10px] font-extrabold uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Escrow Certified</span>
          </div>

          <p className="text-xs text-neutral-500 leading-normal">
            NaijaStores incorporates high fidelity server-side email dispatch automation with <strong className="text-neutral-800">Resend</strong>. All dispatches keep your microcredentials perfectly encrypted and protected in backend node processes.
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
  let intro = `Hello <strong>${customerName}</strong>, your payment for order <strong>${orderId}</strong> has been cleared. Our escrow vault has successfully logged the payment.`;
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
        <div style="font-size: 13px; color: #475569; margin-bottom: 8px;">Your delivery parcel is in route to your local Escrow state tracker. Watch live progress on the mapping screen inside the web app.</div>
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
        <div style="font-size: 12px; color: #7f1d1d; line-height: 1.5;">Our operations intelligence department flagged this order because checkout details crossed threshold benchmarks. Escrow funds will remain safely locked in hold.</div>
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
              <span style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #10b981; font-weight: 800; display: block; margin-bottom: 6px;">NaijaStores Elite Network</span>
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.025em;">NaijaStores Plaza</h1>
            </div>

            <!-- Content Area -->
            <div style="padding: 25px; text-align: left;">
              <h2 style="color: ${accentColor}; font-size: 18px; font-weight: 855; margin: 0 0 14px 0;">${heading}</h2>
              <p style="font-size: 13.5px; line-height: 1.6; color: #334155; margin-bottom: 15px;">${intro}</p>
              ${detailHtml}
            </div>

            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 20px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="font-size: 11px; color: #64748b; margin: 0;">NaijaStores Support &amp; Escrow Security Division</p>
              <p style="font-size: 9px; color: #94a3b8; margin: 5px 0 0 0;">© ${迫使年份()} NaijaStores Online Plaza.</p>
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
