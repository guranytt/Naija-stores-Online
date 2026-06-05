/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, ShoppingCart, ArrowLeft, ChevronRight, Check, Trash2, Heart, ShieldCheck, HelpCircle, Sparkles, MapPin, Plus, Minus, ThumbsUp } from "lucide-react";
import { Product, Category, CartItem, Vendor } from "../types";
import { MOCK_CATEGORIES, MOCK_PRODUCTS, MOCK_REVIEWS } from "../data/mockData";

// Naira formatter helper
export const formatNaira = (value: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0
  }).format(value);
};

interface CustomerViewsProps {
  screen: "home" | "shop" | "cart" | "details";
  onNavigate: (screen: string) => void;
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
  cart: CartItem[];
  onAddToCart: (product: Product, quantity: number, size?: string, color?: string) => void;
  onUpdateCartQty: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onCheckout: () => void;
  searchFilter: string;
  vendors?: Vendor[];
  onRateVendor?: (vendorId: string, rating: number) => void;
}

export default function CustomerViews({
  screen,
  onNavigate,
  selectedProductId,
  onSelectProduct,
  cart,
  onAddToCart,
  onUpdateCartQty,
  onRemoveFromCart,
  onCheckout,
  searchFilter,
  vendors = [],
  onRateVendor
}: CustomerViewsProps) {
  
  // States for Category Filter inside shop view
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("all");
  const [sortOption, setSortOption] = useState<string>("recommended");
  const [selectedStateForShipping, setSelectedStateForShipping] = useState<string>("Lagos");

  // Local state for product detail customization
  const [detailQty, setDetailQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [addedReviews, setAddedReviews] = useState<typeof MOCK_REVIEWS>(MOCK_REVIEWS);
  const [hoveredVendorStar, setHoveredVendorStar] = useState<number | null>(null);

  // Toggle wishlist helpers
  const toggleWishlist = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (wishlist.includes(id)) {
      setWishlist(wishlist.filter((x) => x !== id));
    } else {
      setWishlist([...wishlist, id]);
    }
  };

  // State Shipping Rates Matrix
  const shippingCosts: Record<string, number> = {
    "Lagos": 0, // Free
    "Abuja (FCT)": 0, // Free
    "Ibadan (Oyo)": 2500,
    "Kano": 4500,
    "Port Harcourt (Rivers)": 4000,
    "Enugu": 3500,
    "Kaduna": 4500,
    "Other States": 5500
  };

  const handlePostReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    const newRev = {
      id: "rev_" + Date.now(),
      author: "Local Shopper (Nigeria)",
      text: commentInput,
      stars: 5,
      date: "Just now",
      isVerified: true,
      avatarInitials: "LS"
    };
    setAddedReviews([newRev, ...addedReviews]);
    setCommentInput("");
  };

  // Dynamic products filtering logic
  const filteredProducts = MOCK_PRODUCTS.filter((product) => {
    const matchesCategory = activeCategoryTab === "all" || product.category.toLowerCase().includes(activeCategoryTab.toLowerCase()) || activeCategoryTab.toLowerCase().includes(product.category.toLowerCase());
    const matchesSearch = product.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          product.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          product.vendorName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          product.description.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sort logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortOption === "price-low") return a.price - b.price;
    if (sortOption === "price-high") return b.price - a.price;
    if (sortOption === "rating") return b.rating - a.rating;
    return 0; // standard mock recommended
  });

  const detailProduct = MOCK_PRODUCTS.find((p) => p.id === selectedProductId) || MOCK_PRODUCTS[0];

  // Initialize selected values for detail screen when product changes
  React.useEffect(() => {
    setSelectedSize(detailProduct.sizes?.[0] || "");
    setSelectedColor(detailProduct.colors?.[0] || "");
    setDetailQty(1);
  }, [detailProduct]);

  // Cart totals math
  const cartSubtotal = cart.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);
  const activeShippingFee = cartSubtotal > 0 ? (shippingCosts[selectedStateForShipping] ?? 4500) : 0;
  const estimatedTax = cartSubtotal * 0.075; // 7.5% VAT Nigeria
  const cartTotalSum = cartSubtotal + activeShippingFee + estimatedTax;

  return (
    <div className="font-sans text-neutral-800">
      
      {/* ---------------- 1. MARKETPLACE HOMEPAGE ---------------- */}
      {screen === "home" && (
        <div className="space-y-8">
          
          {/* Animated Hero Mega Banner */}
          <section className="relative rounded-2xl overflow-hidden bg-emerald-950 text-white min-h-[340px] flex items-center shadow-premium bg-radial from-emerald-900 to-emerald-950 border border-emerald-800 p-8 sm:p-12">
            {/* Background design accents */}
            <div className="absolute right-0 bottom-0 opacity-15 pointer-events-none select-none">
              <span className="text-[250px] font-extrabold text-white leading-none tracking-tighter">₦</span>
            </div>

            <div className="max-w-xl text-left space-y-5 z-10">
              <div className="inline-flex items-center space-x-2 bg-emerald-800/60 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold text-emerald-300">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span>NIGERIA'S SEAMLESS ESCROW HUB</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-white">
                Premium Shopping, <br />
                <span className="text-orange-400">Homegrown Trust.</span>
              </h1>
              <p className="text-sm text-emerald-100/90 leading-relaxed max-w-md">
                Connecting top-tier local artisans, electronic vendors and raw organic cooperatives directly to your doorstep. Secure real-time delivery with full Nigeria map telemetry.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={() => {
                    setActiveCategoryTab("all");
                    onNavigate("shop");
                  }}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold px-6 py-3 rounded-full transition-all text-xs tracking-wider uppercase active:scale-95 shadow-md"
                  id="hero-shop-all"
                >
                  Explore Departments &rarr;
                </button>
                <button
                  onClick={() => onNavigate("map")}
                  className="bg-transparent hover:bg-white/5 border border-emerald-500 text-white font-extrabold px-5 py-3 rounded-full transition-all text-xs tracking-wider uppercase"
                >
                  View Active Shipments
                </button>
              </div>
            </div>
          </section>

          {/* Shop by Category Bento layout */}
          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="text-left">
                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">Shop by Department</h2>
                <p className="text-xs text-neutral-400 font-semibold mt-1">Verified merchant collectives across geographic hubs</p>
              </div>
              <button
                onClick={() => {
                  setActiveCategoryTab("all");
                  onNavigate("shop");
                }}
                className="text-orange-600 font-bold text-xs hover:underline flex items-center space-x-1"
              >
                <span>View All</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {MOCK_CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => {
                    setActiveCategoryTab(cat.id);
                    onNavigate("shop");
                  }}
                  className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer shadow-ambient border border-neutral-150 flex flex-col justify-end p-5 transition-all hover:shadow-premium hover:-translate-y-1"
                  id={`cat-card-${cat.id}`}
                >
                  {/* Background cover */}
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent opacity-85" />
                  
                  <div className="relative text-left text-white z-10 space-y-1">
                    <span className="text-[10px] font-extrabold tracking-widest text-orange-400 uppercase">
                      {cat.itemCount} items
                    </span>
                    <h3 className="font-extrabold text-base leading-snug tracking-tight">{cat.name}</h3>
                    <p className="text-[10px] text-neutral-300 line-clamp-1 truncate">{cat.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Trending Deals of the week (Asymmetric Bento layout) */}
          <section className="space-y-4">
            <div className="text-left pb-2 border-b border-neutral-100">
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">Trending Weekly Deals</h2>
              <p className="text-xs text-neutral-400 font-semibold">Top performing products from Computer Village, Balogun and Alaba markets</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {MOCK_PRODUCTS.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectProduct(p.id);
                    onNavigate("details");
                  }}
                  className="bg-white rounded-2xl border border-neutral-150 overflow-hidden shadow-ambient hover:shadow-premium group cursor-pointer transition-all flex flex-col"
                >
                  <div className="relative aspect-square bg-neutral-50 overflow-hidden">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Badge */}
                    {p.isBestSeller && (
                      <span className="absolute top-3 left-3 bg-orange-500 text-white font-extrabold text-[9px] uppercase px-2 py-1 rounded-md tracking-wider">
                        Best Seller
                      </span>
                    )}
                    {p.salePercentage && (
                      <span className="absolute top-3 right-3 bg-red-600 text-white font-extrabold text-[9px] uppercase px-2 py-1 rounded-md tracking-wider">
                        SAVE {p.salePercentage}%
                      </span>
                    )}

                    {/* Wishlist toggle */}
                    <button
                      onClick={(e) => toggleWishlist(p.id, e)}
                      className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center hover:scale-105 transition-transform shadow-xs text-neutral-500 hover:text-red-500"
                    >
                      <Heart className={`w-4.5 h-4.5 ${wishlist.includes(p.id) ? "fill-red-500 text-red-500" : ""}`} />
                    </button>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between text-left space-y-2">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{p.vendorName}</p>
                      <h3 className="font-extrabold text-sm text-neutral-800 line-clamp-1 truncate group-hover:text-orange-500 transition-colors">
                        {p.title}
                      </h3>
                      {/* Rating details */}
                      <div className="flex items-center space-x-1.5 text-xs text-neutral-500">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-bold text-neutral-800">{p.rating}</span>
                        <span>({p.reviewsCount})</span>
                      </div>
                    </div>

                    <div className="flex items-end justify-between pt-2 border-t border-neutral-50">
                      <div>
                        {p.originalPrice && (
                          <p className="text-xs text-neutral-400 line-through leading-none mb-0.5">
                            {formatNaira(p.originalPrice)}
                          </p>
                        )}
                        <p className="font-black text-base text-neutral-900 leading-none">
                          {formatNaira(p.price)}
                        </p>
                      </div>

                      <span className="text-[10px] bg-neutral-100 hover:bg-orange-100 font-bold px-2.5 py-1.5 rounded-lg text-neutral-600 hover:text-orange-600 transition-colors">
                        Buy Now
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Secure Assurance Banner */}
          <section className="bg-neutral-50 rounded-2xl border border-neutral-150 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h4 className="font-extrabold text-neutral-900">100% Secure Escrow Checkout</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  NaijaStores holds shopper payments securely in escrow. Vendors are only paid upon delivery verification.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-xs font-bold bg-white px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600">
              <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse" />
              <span>Verified Paystack Integration</span>
            </div>
          </section>

        </div>
      )}

      {/* ---------------- 2. CATALOG BROWSER & SORTING ---------------- */}
      {screen === "shop" && (
        <div className="space-y-6">
          
          {/* Filters Bar Row */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 border border-neutral-200 rounded-2xl shadow-xs">
            
            {/* Category tabs filters */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pr-1">
              <button
                onClick={() => setActiveCategoryTab("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeCategoryTab === "all"
                    ? "bg-emerald-950 text-white shadow-xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                All Departments
              </button>
              {MOCK_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategoryTab(c.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeCategoryTab === c.id
                      ? "bg-emerald-950 text-white shadow-xs"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2 w-full md:w-auto flex-shrink-0 justify-end">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Sort:</label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                id="shop-sort"
              >
                <option value="recommended">Recommended</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>

          {/* Main Catalog Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {sortedProducts.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onSelectProduct(p.id);
                  onNavigate("details");
                }}
                className="bg-white rounded-2xl border border-neutral-150 overflow-hidden shadow-ambient hover:shadow-premium group cursor-pointer transition-all flex flex-col justify-between"
                id={`product-cell-${p.id}`}
              >
                <div>
                  <div className="relative aspect-square bg-neutral-50 overflow-hidden">
                    <img
                      src={p.image}
                      alt={p.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                      referrerPolicy="no-referrer"
                    />

                    {/* Stock Alert */}
                    {p.stock <= 5 && (
                      <span className="absolute top-3 left-3 bg-red-600 text-white font-extrabold text-[9px] uppercase px-2 py-0.5 rounded tracking-wider">
                        Only {p.stock} left!
                      </span>
                    )}

                    {/* Wishlist item toggles */}
                    <button
                      onClick={(e) => toggleWishlist(p.id, e)}
                      className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/95 flex items-center justify-center hover:scale-105 transition-transform shadow-xs text-neutral-500 hover:text-red-500"
                    >
                      <Heart className={`w-4.5 h-4.5 ${wishlist.includes(p.id) ? "fill-red-500 text-red-500" : ""}`} />
                    </button>
                  </div>

                  <div className="p-4 text-left space-y-1">
                    <span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest block">{p.vendorName}</span>
                    <h3 className="font-extrabold text-sm text-neutral-800 line-clamp-2 leading-snug truncate">
                      {p.title}
                    </h3>
                    <div className="flex items-center space-x-1.5 text-xs text-neutral-505 pt-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="font-bold text-neutral-800">{p.rating}</span>
                      <span>({p.reviewsCount} reviews)</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-neutral-50 flex items-center justify-between text-left mt-2">
                  <div>
                    {p.originalPrice && (
                      <span className="text-xs text-neutral-400 line-through block font-mono">
                        {formatNaira(p.originalPrice)}
                      </span>
                    )}
                    <span className="font-black text-neutral-900 text-base block font-mono">
                      {formatNaira(p.price)}
                    </span>
                  </div>
                  <span className="px-3 py-1.5 bg-orange-500 text-white font-bold text-xs rounded-lg hover:bg-orange-600 shadow-xs transition-colors">
                    Add Cart
                  </span>
                </div>
              </div>
            ))}

            {sortedProducts.length === 0 && (
              <div className="col-span-full py-16 text-center space-y-2">
                <p className="text-base font-bold text-neutral-500">No products match your criteria inside this department.</p>
                <p className="text-xs text-neutral-400">Try modifying search inputs or choosing another category block above.</p>
                <button
                  onClick={() => {
                    setActiveCategoryTab("all");
                    setSortOption("recommended");
                  }}
                  className="px-4 py-2 bg-emerald-900 text-white font-bold text-xs rounded-xl hover:bg-emerald-800 mt-4 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---------------- 3. PRODUCT DETAILS SCREEN ---------------- */}
      {screen === "details" && detailProduct && (
        <div className="space-y-8 text-left">
          
          {/* Breadcrumb row */}
          <button
            onClick={() => onNavigate("shop")}
            className="flex items-center space-x-2 text-xs font-bold text-neutral-505 hover:text-orange-500 select-none cursor-pointer"
            id="back-to-shop-nav"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>&larr; Back to Plaza Catalog</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Gallery Image block (5 columns) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="aspect-square bg-neutral-50 border border-neutral-200 rounded-2xl overflow-hidden shadow-ambient relative">
                <img
                  src={detailProduct.image}
                  alt={detailProduct.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                
                {detailProduct.isBestSeller && (
                  <span className="absolute top-4 left-4 bg-orange-500 text-white font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-md tracking-wider">
                    Best Seller
                  </span>
                )}
              </div>
              
              <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold font-mono">
                    {detailProduct.vendorName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs text-neutral-400 font-bold uppercase leading-none">VERIFIED SELLER</p>
                    <p className="text-sm font-bold text-neutral-800 mt-1">{detailProduct.vendorName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block uppercase font-mono">Verified Plaza Partner</p>
                </div>
              </div>

              {/* Interactive Vendor Star-based Rating Widget */}
              {(() => {
                const productVendor = vendors.find(v => v.id === detailProduct.vendorId) || {
                  id: detailProduct.vendorId,
                  name: detailProduct.vendorName,
                  rating: 4.5,
                  ratingCount: 35,
                  location: "Lagos, Nigeria"
                };

                return (
                  <div className="p-4 bg-white border border-neutral-150 rounded-2xl shadow-xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="text-left space-y-0.5">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-neutral-400">Merchant Reputation</span>
                        <h4 className="font-bold text-neutral-900 text-xs leading-none">{productVendor.name}</h4>
                        <p className="text-[10px] text-neutral-400 font-semibold">{productVendor.location}</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="flex items-center space-x-0.5 justify-end">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const isFilled = star <= Math.round(productVendor.rating);
                            return (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  isFilled ? "fill-amber-400 text-amber-400" : "text-neutral-200"
                                }`}
                              />
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-neutral-500 font-bold leading-none">
                          {productVendor.rating.toFixed(1)} ★ rating ({productVendor.ratingCount || 10} reviews)
                        </p>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-left leading-tight">
                        <p className="font-bold text-[11px] text-neutral-700">Submit a Rating</p>
                        <p className="text-[9px] font-medium text-neutral-400">Click a star to rate order execution</p>
                      </div>

                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            className="focus:outline-none transition-transform hover:scale-110 active:scale-90 p-0.5"
                            onMouseEnter={() => setHoveredVendorStar(star)}
                            onMouseLeave={() => setHoveredVendorStar(null)}
                            onClick={() => {
                              if (onRateVendor) {
                                onRateVendor(productVendor.id, star);
                              }
                            }}
                          >
                            <Star
                              className={`w-5 h-5 transition-colors ${
                                star <= (hoveredVendorStar ?? 0)
                                  ? "fill-amber-400 text-amber-400 cursor-pointer"
                                  : star <= Math.round(productVendor.rating)
                                  ? hoveredVendorStar !== null
                                    ? "text-neutral-200 fill-none"
                                    : "fill-amber-400 text-amber-400"
                                  : "text-neutral-200 fill-none"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Product Configuration Details (7 columns) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2 pb-4 border-b border-neutral-100">
                <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight leading-tight">
                  {detailProduct.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-sm pt-1">
                  <div className="flex items-center space-x-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                    <span className="font-extrabold text-neutral-800 ml-1">{detailProduct.rating}</span>
                  </div>
                  <span className="text-neutral-300">|</span>
                  <span className="text-neutral-500 font-bold">{detailProduct.reviewsCount} certified shopper responses</span>
                  <span className="text-neutral-300">|</span>
                  <span className="text-emerald-600 font-bold flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block mr-1.5" />
                    In Escrow Safe Guard
                  </span>
                </div>
              </div>

              {/* Price details */}
              <div className="bg-neutral-50 p-4 border border-neutral-100 rounded-2xl">
                <div className="flex items-baseline space-x-3">
                  <span className="text-3xl font-black text-neutral-900 tracking-tight leading-none">
                    {formatNaira(detailProduct.price)}
                  </span>
                  {detailProduct.originalPrice && (
                    <span className="text-sm text-neutral-400 line-through leading-none font-mono">
                      {formatNaira(detailProduct.originalPrice)}
                    </span>
                  )}
                  {detailProduct.salePercentage && (
                    <span className="text-xs text-red-600 font-extrabold bg-red-50 px-2 py-0.5 rounded-md uppercase tracking-wide">
                      Save {detailProduct.salePercentage}%
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold mt-2">
                  Tax Estimated at checkout (7.5% VAT Nigeria inclusive)
                </p>
              </div>

              {/* Description body */}
              <div className="space-y-1 text-sm leading-relaxed text-neutral-600">
                <p className="font-semibold text-neutral-800">Product Highlights & Overview</p>
                <p className="mt-1">{detailProduct.description}</p>
              </div>

              {/* Product specific values option chooser */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Size Choice */}
                {detailProduct.sizes && detailProduct.sizes.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Choose Fitting / Size</label>
                    <div className="flex flex-wrap gap-2">
                      {detailProduct.sizes.map((sz) => (
                        <button
                          key={sz}
                          onClick={() => setSelectedSize(sz)}
                          className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all ${
                            selectedSize === sz
                              ? "border-orange-500 bg-orange-50 text-orange-600 font-extrabold shadow-xs"
                              : "border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color Choice */}
                {detailProduct.colors && detailProduct.colors.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Choose Color Satin</label>
                    <div className="flex flex-wrap gap-2">
                      {detailProduct.colors.map((cl) => (
                        <button
                          key={cl}
                          onClick={() => setSelectedColor(cl)}
                          className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all ${
                            selectedColor === cl
                              ? "border-emerald-950 bg-emerald-50 text-emerald-900 font-extrabold shadow-xs"
                              : "border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                          }`}
                        >
                          {cl}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Counter Picker & Add Cart Trigger */}
              <div className="pt-4 border-t border-neutral-100 flex flex-wrap items-center gap-4">
                <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden h-11">
                  <button
                    onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                    className="px-3 hover:bg-neutral-100 transition-colors h-full text-neutral-500 text-lg"
                  >
                    -
                  </button>
                  <span className="px-4 font-bold text-sm w-12 text-center select-none font-mono">
                    {detailQty}
                  </span>
                  <button
                    onClick={() => setDetailQty(Math.min(detailProduct.stock, detailQty + 1))}
                    className="px-3 hover:bg-neutral-100 transition-colors h-full text-neutral-500 text-lg"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={() => {
                    onAddToCart(detailProduct, detailQty, selectedSize, selectedColor);
                    setDetailQty(1);
                  }}
                  className="flex-1 min-w-[200px] h-11 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md transition-colors active:scale-98 flex items-center justify-center space-x-2"
                  id="add-to-cart-action"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Secure Escrow Purchase</span>
                </button>

                <button
                  onClick={() => toggleWishlist(detailProduct.id)}
                  className="w-11 h-11 border border-neutral-200 hover:border-neutral-300 rounded-xl flex items-center justify-center hover:bg-neutral-50 text-neutral-550 transition-colors"
                >
                  <Heart className={`w-5 h-5 ${wishlist.includes(detailProduct.id) ? "fill-red-500 text-red-500 border-none" : ""}`} />
                </button>
              </div>

              {/* Bullet Features Checklist */}
              {detailProduct.highlights && (
                <div className="pt-6 border-t border-neutral-150 space-y-3">
                  <h4 className="font-bold text-xs text-neutral-400 uppercase tracking-widest">Premium Product Blueprint</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-600 font-semibold">
                    {detailProduct.highlights.map((h, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Shopper Reviews Segment */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 border-t border-neutral-150">
            <div className="lg:col-span-4 space-y-4">
              <h3 className="font-extrabold text-lg text-neutral-900 tracking-tight">Verified Shopper Insights</h3>
              <div className="p-5 bg-neutral-50 border border-neutral-100 rounded-2xl text-center space-y-2">
                <p className="text-3xl font-black text-neutral-900">{detailProduct.rating}</p>
                <div className="flex justify-center items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-neutral-450 font-bold uppercase tracking-wider mt-1">Naija Escrow Protected Reviews</p>
              </div>
              
              {/* Form to leave a review */}
              <form onSubmit={handlePostReview} className="space-y-3">
                <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Have this product? Share feedback</label>
                <textarea
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Tell local buyers how the material, weight and delivery felt..."
                  rows={3}
                  className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-neutral-700 bg-white"
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs rounded-xl tracking-wider uppercase transition-colors"
                >
                  Publish Verified Review
                </button>
              </form>
            </div>

            <div className="lg:col-span-8 space-y-4">
              <p className="font-bold text-sm text-neutral-400 uppercase tracking-widest pb-1 border-b border-neutral-100">Shopper Testimonials</p>
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {addedReviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-white border border-neutral-155 rounded-2xl flex space-x-4 items-start text-xs">
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-black font-mono flex items-center justify-center flex-shrink-0">
                      {rev.avatarInitials}
                    </div>
                    <div className="space-y-1.5 flex-1 text-left">
                      <div className="flex justify-between items-center">
                        <p className="font-extrabold text-neutral-800">{rev.author}</p>
                        <span className="text-neutral-400 text-[10px]">{rev.date}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3 h-3 ${s <= rev.stars ? "fill-amber-400 text-amber-400" : "text-neutral-200"}`} />
                        ))}
                        {rev.isVerified && (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-2">Verified Shopper</span>
                        )}
                      </div>
                      <p className="text-neutral-600 leading-relaxed font-semibold">{rev.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ---------------- 4. SHOPPING CART VIEW ---------------- */}
      {screen === "cart" && (
        <div className="space-y-6">
          <div className="text-left pb-4 border-b border-neutral-100">
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">Your Escrow Shopping Basket</h1>
            <p className="text-xs text-neutral-400 font-semibold mt-1">Verify cart configurations and secure shipment details before gateway routing</p>
          </div>

          {cart.length === 0 ? (
            <div className="py-16 text-center space-y-4 bg-white border border-neutral-150 rounded-2xl max-w-xl mx-auto">
              <ShoppingCart className="w-12 h-12 text-neutral-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-base font-bold text-neutral-700">Your basket is currently empty.</p>
                <p className="text-xs text-neutral-400">Add traditional outfits, smartphones, or skincare to experience simulated paychecks.</p>
              </div>
              <button
                onClick={() => onNavigate("shop")}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl tracking-wider uppercase transition-colors shadow-xs"
              >
                Go to Plaza Plaza
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Product row Items (8 cols) */}
              <div className="lg:col-span-8 lg:max-h-[500px] overflow-y-auto pr-1 space-y-4">
                {cart.map((item) => (
                  <div
                    key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`}
                    className="p-4 sm:p-5 bg-white border border-neutral-150 rounded-2xl flex flex-col sm:flex-row items-center gap-4 text-left shadow-xs justify-between"
                  >
                    <div className="flex items-center space-x-4 w-full sm:w-auto">
                      <div className="w-16 h-16 bg-neutral-50 rounded-xl overflow-hidden border border-neutral-100 flex-shrink-0">
                        <img src={item.product.image} alt={item.product.title} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm text-neutral-800 truncate max-w-[280px]">
                          {item.product.title}
                        </h3>
                        <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wide">{item.product.vendorName}</p>
                        
                        {/* Selected variant parameters */}
                        <div className="flex flex-wrap gap-1.5 mt-1 text-[9px] font-bold font-mono">
                          {item.selectedSize && (
                            <span className="px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-500">Size: {item.selectedSize}</span>
                          )}
                          {item.selectedColor && (
                            <span className="px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-500 font-bold">Color: {item.selectedColor}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-8">
                      {/* Counter */}
                      <div className="flex items-center border border-neutral-150 rounded-lg overflow-hidden h-9 bg-neutral-50">
                        <button
                          onClick={() => {
                            if (item.quantity === 1) {
                              onRemoveFromCart(item.product.id);
                            } else {
                              onUpdateCartQty(item.product.id, item.quantity - 1);
                            }
                          }}
                          className="px-2 hover:bg-neutral-100 transition-colors h-full text-neutral-400"
                        >
                          -
                        </button>
                        <span className="px-3 font-semibold text-xs font-mono w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateCartQty(item.product.id, item.quantity + 1)}
                          className="px-2 hover:bg-neutral-100 transition-colors h-full text-neutral-400"
                        >
                          +
                        </button>
                      </div>

                      {/* Cost */}
                      <div className="text-right min-w-24">
                        <p className="font-black text-neutral-900 text-sm font-mono">
                          {formatNaira(item.product.price * item.quantity)}
                        </p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">({formatNaira(item.product.price)} each)</p>
                      </div>

                      {/* Remove button */}
                      <button
                        onClick={() => onRemoveFromCart(item.product.id)}
                        className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                        id={`delete-cart-${item.product.id}`}
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>

                  </div>
                ))}
              </div>

              {/* Order Summary Form (4 cols) */}
              <div className="lg:col-span-4 bg-white border border-neutral-155 rounded-2xl p-6 text-left space-y-5 shadow-ambient">
                <h3 className="font-extrabold text-neutral-900 text-base tracking-tight pb-3 border-b border-neutral-100">Order Summary</h3>
                
                {/* Shipping State Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Deliver Destination State</label>
                  <div className="relative">
                    <select
                      value={selectedStateForShipping}
                      onChange={(e) => setSelectedStateForShipping(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                      id="shipping-state-select"
                    >
                      {Object.keys(shippingCosts).map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                    <MapPin className="w-4 h-4 text-orange-500 absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-neutral-400 italic">
                    Free courier to Lagos and Abuja! Regular state logistics applied elsewhere.
                  </p>
                </div>

                {/* Sub calculations */}
                <div className="space-y-2 text-xs font-semibold text-neutral-600">
                  <div className="flex justify-between">
                    <span>Basket Subtotal</span>
                    <span className="font-mono text-neutral-800">{formatNaira(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping Logistics ({selectedStateForShipping})</span>
                    <span className="font-mono text-neutral-800">
                      {activeShippingFee === 0 ? "FREE" : formatNaira(activeShippingFee)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Escrow Service & VAT (7.5% Nigeria tax)</span>
                    <span className="font-mono text-neutral-800">{formatNaira(estimatedTax)}</span>
                  </div>
                  
                  <div className="border-t border-neutral-100 pt-3 flex justify-between text-sm">
                    <span className="font-extrabold text-neutral-900">Total Settlement</span>
                    <span className="font-black text-neutral-900 text-base font-mono">{formatNaira(cartTotalSum)}</span>
                  </div>
                </div>

                <button
                  onClick={onCheckout}
                  className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl shadow-md transition-colors active:scale-98 flex items-center justify-center space-x-2 text-xs tracking-wider uppercase"
                  id="checkout-trigger-btn"
                >
                  <ShieldCheck className="w-4.5 h-4.5 text-white" />
                  <span>Secure Escrow Gateway</span>
                </button>

                <div className="p-3 bg-cyan-50/50 rounded-xl flex items-start space-x-2 text-[10px] border border-cyan-100 tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <p className="text-cyan-800 font-medium">
                    Secure verification handled by Paystack. Card details are fully tokenized. Shopper security guaranteed.
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  );
}
