/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Star, ShoppingCart, ArrowLeft, ChevronRight, Check, Trash2, Heart, ShieldCheck, HelpCircle, Sparkles, MapPin, Plus, Minus, ThumbsUp, Laptop, Shirt, Home, Eye } from "lucide-react";
import { Product, Category, CartItem, Vendor, Advertisement } from "../types";
import { MOCK_CATEGORIES, MOCK_PRODUCTS, MOCK_REVIEWS, MOCK_ADS, FLASH_SALE_PRODUCTS } from "../data/mockData";

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
  products?: Product[];
  categories?: Category[];
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
  onRateVendor,
  products = MOCK_PRODUCTS,
  categories = MOCK_CATEGORIES
}: CustomerViewsProps) {
  
  // States for Category Filter inside shop view
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortOption, setSortOption] = useState<string>("recommended");
  const [selectedStateForShipping, setSelectedStateForShipping] = useState<string>("Lagos");
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [flashSaleTime, setFlashSaleTime] = useState({ h: 2, m: 21, s: 6 });
  
  const homepageAds = MOCK_ADS.filter(ad => ad.position === "homepage" && ad.status === "active");

  React.useEffect(() => {
    const timer = setInterval(() => {
      setFlashSaleTime((prev) => {
        let { h, m, s } = prev;
        if (s > 0) return { h, m, s: s - 1 };
        if (m > 0) return { h, m: m - 1, s: 59 };
        if (h > 0) return { h: h - 1, m: 59, s: 59 };
        return { h: 2, m: 21, s: 6 }; // loop back for demo
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tracking recently viewed items
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("recentlyViewed");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    if (screen === "details" && selectedProductId) {
      setRecentlyViewedIds((prev) => {
        const filtered = prev.filter((id) => id !== selectedProductId);
        const updated = [selectedProductId, ...filtered].slice(0, 8); // Hold up to 8 items
        try {
          localStorage.setItem("recentlyViewed", JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
    }
  }, [screen, selectedProductId]);

  React.useEffect(() => {
    if (homepageAds.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % homepageAds.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [homepageAds.length]);

  React.useEffect(() => {
    setIsSearchLoading(true);
    const timer = setTimeout(() => {
      setIsSearchLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchFilter]);

  // Local state for product detail customization
  const [detailQty, setDetailQty] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [addedReviews, setAddedReviews] = useState<typeof MOCK_REVIEWS>(MOCK_REVIEWS);
  const [hoveredVendorStar, setHoveredVendorStar] = useState<number | null>(null);
  const [justAddedProducts, setJustAddedProducts] = useState<Record<string, boolean>>({});

  const handleAddToCartWithFeedback = (product: Product, quantity: number, size?: string, color?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onAddToCart(product, quantity, size || product.sizes?.[0] || "", color || product.colors?.[0] || "");
    setJustAddedProducts(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setJustAddedProducts(prev => {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      });
    }, 1500);
  };

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

  // Reset page when filtering or searching
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeCategoryTab, searchFilter]);

  // Dynamic products filtering logic
  const filteredProducts = products.filter((product) => {
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

  const PRODUCTS_PER_PAGE = 30;
  const totalPages = Math.ceil(sortedProducts.length / PRODUCTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);

  const recentlyViewedProducts = recentlyViewedIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => !!p);

  const detailProduct = products.find((p) => p.id === selectedProductId) || products[0];

  // Initialize selected values for detail screen when product changes
  React.useEffect(() => {
    setSelectedSize(detailProduct.sizes?.[0] || "");
    setSelectedColor(detailProduct.colors?.[0] || "");
    setDetailQty(1);
    setSelectedImageIndex(0);
  }, [detailProduct]);

  // Cart totals math
  const cartSubtotal = cart.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);
  const activeShippingFee = cartSubtotal > 0 ? (shippingCosts[selectedStateForShipping] ?? 4500) : 0;
  const estimatedTax = cartSubtotal * 0.075; // 7.5% VAT Nigeria
  const cartTotalSum = cartSubtotal + activeShippingFee + estimatedTax;

  const shouldReduceMotion = useReducedMotion();

  const pageVariants = {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: shouldReduceMotion ? 0 : -12 },
  };
  const pageTransition = { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] };

  return (
    <div className="font-sans text-neutral-800">
      
      {/* ---------------- 1. MARKETPLACE HOMEPAGE ---------------- */}
      <AnimatePresence mode="wait">
        {screen === "home" && (
          <motion.div
            key="home"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="space-y-8"
          >
            
            {/* Animated Hero Mega Banner Carousel */}
            {homepageAds.length > 0 && (
              <div className="relative w-full h-32 sm:h-48 rounded-2xl overflow-hidden shadow-md mb-6 group cursor-pointer" onClick={() => onNavigate("shop")}>
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    key={homepageAds[currentAdIndex].id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="absolute inset-0 w-full h-full"
                  >
                    <img 
                      src={homepageAds[currentAdIndex].imageUrl} 
                      alt={homepageAds[currentAdIndex].title} 
                      className="w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-110 ease-out" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6">
                      <span className="text-[10px] text-orange-400 font-extrabold uppercase tracking-widest mb-1 bg-black/50 backdrop-blur-sm w-fit px-2 py-0.5 rounded">Sponsored</span>
                      <h3 className="text-white font-black text-xl sm:text-2xl drop-shadow-md">{homepageAds[currentAdIndex].title}</h3>
                    </div>
                  </motion.div>
                </AnimatePresence>
                
                {/* Carousel Indicators */}
                {homepageAds.length > 1 && (
                  <div className="absolute bottom-4 right-4 flex space-x-1.5 z-10">
                    {homepageAds.map((_, idx) => (
                      <div 
                        key={idx} 
                        className={`transition-all duration-300 rounded-full h-1.5 ${idx === currentAdIndex ? 'w-4 bg-orange-400' : 'w-1.5 bg-white/50'}`}
                        onClick={(e) => { e.stopPropagation(); setCurrentAdIndex(idx); }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MTN Animated Brand Banner */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="relative w-full overflow-hidden rounded-2xl bg-amber-400 text-neutral-900 px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm border border-amber-300"
            >
              {/* Left connectivity waves animation */}
              <div className="absolute left-0 top-0 h-full w-40 pointer-events-none overflow-hidden opacity-10">
                <span className="absolute -left-10 -top-10 w-28 h-28 rounded-full border-4 border-neutral-900 animate-ping"></span>
                <span className="absolute -left-16 -top-16 w-44 h-44 rounded-full border-4 border-neutral-900 animate-pulse"></span>
              </div>

              <div className="flex items-center space-x-4 z-10 w-full md:w-auto">
                {/* Yellow and Black Oval brand badge */}
                <div className="w-14 h-10 rounded-full bg-neutral-900 text-amber-400 font-black flex items-center justify-center text-[10px] uppercase tracking-tighter shrink-0 border border-neutral-800 shadow-sm">
                  MTN
                </div>
                <div className="text-left">
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <span className="text-[8px] bg-neutral-900/15 text-neutral-900 font-extrabold uppercase px-1.5 py-0.5 rounded tracking-widest leading-none">Sponsored Offer</span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-900 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-600"></span>
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm sm:text-base text-neutral-900 mt-0.5 leading-tight">
                    Everywhere You Go — Turn on MTN 5G Fast Speed!
                  </h4>
                  <p className="text-[11px] text-neutral-800 font-medium max-w-lg mt-0.5">
                    Nigeria's premium connectivity network. Recharge now to unlock standard 10x high data bonus instantly.
                  </p>
                </div>
              </div>

              {/* Action trigger Call To Order or Promo link */}
              <a
                href="tel:08138575869"
                className="bg-neutral-950 text-amber-400 hover:bg-neutral-900 transition-all font-black text-xs px-4.5 py-2.5 rounded-xl flex items-center space-x-2 shrink-0 z-10 hover:shadow-md hover:scale-105"
              >
                <span>⚡ Get Data Bonus</span>
              </a>
            </motion.div>

            <motion.section
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative rounded-2xl overflow-hidden bg-emerald-950 text-white min-h-[340px] flex items-center shadow-premium bg-radial from-emerald-900 to-emerald-950 border border-emerald-800 p-8 sm:p-12"
            >
              {/* Background design accents */}
              <motion.div
                animate={shouldReduceMotion ? {} : { y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                className="absolute right-0 bottom-0 opacity-15 pointer-events-none select-none"
              >
                <span className="text-[250px] font-extrabold text-white leading-none tracking-tighter">₦</span>
              </motion.div>
  
              <div className="max-w-xl text-left space-y-5 z-10">
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  className="inline-flex items-center space-x-2 bg-emerald-800/60 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold text-emerald-300"
                >
                  <Sparkles className="w-4 h-4 text-orange-400" />
                  <span>NIGERIA'S SEAMLESS MARKET HUB</span>
                </motion.div>
                
                <motion.h1
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="text-3xl sm:text-5xl font-black tracking-tight leading-none text-white"
                >
                  Premium Shopping, <br />
                  <span className="text-orange-400">Homegrown Trust.</span>
                </motion.h1>
                
                <motion.p
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="text-sm text-emerald-100/90 leading-relaxed max-w-md"
                >
                  Connecting local vendors to your doorstep with direct checkout.
                </motion.p>
                
                <motion.div
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  className="flex flex-wrap items-center gap-3 pt-2"
                >
                  <motion.button
                    whileHover={shouldReduceMotion ? {} : { scale: 1.03 }}
                    whileTap={shouldReduceMotion ? {} : { scale: 0.97 }}
                    onClick={() => {
                      setActiveCategoryTab("all");
                      onNavigate("shop");
                    }}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-extrabold px-6 py-3 rounded-full transition-all text-xs tracking-wider uppercase active:scale-95 shadow-md cursor-pointer"
                    id="hero-shop-all"
                  >
                    Explore Categories &rarr;
                  </motion.button>
                </motion.div>
              </div>
            </motion.section>

          {/* Shop by Category Bento layout */}
          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="text-left">
                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">Shop by Category</h2>
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

            <motion.div
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.1
                  }
                }
              }}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-10px" }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {MOCK_CATEGORIES.map((cat, idx) => (
                <motion.div
                  key={cat.id}
                  onClick={() => {
                    setActiveCategoryTab(cat.id);
                    onNavigate("shop");
                  }}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
                  }}
                  whileHover={shouldReduceMotion ? {} : { y: -10, scale: 1.025, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)" }}
                  className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer shadow-ambient border border-neutral-150 flex flex-col justify-end p-5 transition-all hover:shadow-premium"
                  id={`cat-card-${cat.id}`}
                >
                  {/* Category animated icon on top-right */}
                  <div className="absolute top-4 right-4 p-2.5 rounded-xl bg-white/10 backdrop-blur-md text-white border border-white/15 z-10 opacity-90 transition-all duration-300 group-hover:bg-orange-500 group-hover:border-orange-400 group-hover:scale-110 group-hover:-rotate-3">
                    {cat.id === "electronics" ? <Laptop className="w-4.5 h-4.5" /> :
                     cat.id === "fashion" ? <Shirt className="w-4.5 h-4.5" /> :
                     cat.id === "beauty" ? <Sparkles className="w-4.5 h-4.5" /> :
                     <Home className="w-4.5 h-4.5" />}
                  </div>

                  {/* Background cover */}
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-112"
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
                </motion.div>
              ))}
            </motion.div>
          </section>

          {/* Flash Sales Section */}
          <section className="space-y-4 bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between pb-3 border-b border-orange-200/60 gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl sm:text-2xl font-black text-orange-600 tracking-tight flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 fill-orange-500" />
                    Flash Sales
                  </h2>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Time Left:</span>
                  <div className="flex items-center space-x-1.5 text-orange-600 font-black text-sm">
                    <div className="bg-orange-100 px-2 py-0.5 rounded">{flashSaleTime.h.toString().padStart(2, '0')}h</div>
                    <span>:</span>
                    <div className="bg-orange-100 px-2 py-0.5 rounded">{flashSaleTime.m.toString().padStart(2, '0')}m</div>
                    <span>:</span>
                    <div className="bg-orange-100 px-2 py-0.5 rounded">{flashSaleTime.s.toString().padStart(2, '0')}s</div>
                  </div>
                </div>
              </div>
              <button className="text-sm font-bold text-orange-500 hover:text-orange-600 transition-colors uppercase tracking-widest self-start sm:self-auto flex items-center">
                See All <ChevronRight className="w-4 h-4 ml-0.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FLASH_SALE_PRODUCTS.map((p, idx) => {
                const isAdded = !!justAddedProducts[p.id];
                const stockLeft = p.stock;
                return (
                  <motion.div
                    key={`fs-${p.id}`}
                    onClick={() => {
                      onSelectProduct(p.id);
                      onNavigate("details");
                    }}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ y: -4, scale: 1.01 }}
                    className="bg-white rounded-2xl border border-orange-100 p-3 flex flex-row h-40 shadow-sm hover:shadow-md cursor-pointer transition-all relative overflow-hidden"
                  >
                    {/* Left: Image */}
                    <div className="w-[35%] h-full bg-neutral-50 rounded-xl overflow-hidden relative shrink-0">
                      {p.image ? (
                        <img src={p.image} className="w-full h-full object-cover transition-transform hover:scale-110" alt={p.title} referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex w-full h-full items-center justify-center text-[9px] uppercase font-bold text-neutral-300">No Img</div>
                      )}
                      {p.salePercentage && (
                        <span className="absolute top-2 left-2 bg-red-600 text-white font-extrabold text-[9px] uppercase px-2 py-1 rounded shadow-sm z-10">
                          -{p.salePercentage}%
                        </span>
                      )}
                    </div>
                    {/* Right: Info */}
                    <div className="flex-1 pl-4 py-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-extrabold text-sm text-neutral-800 line-clamp-2 leading-snug">{p.title}</h3>
                        <div className="flex items-end space-x-2 mt-1">
                          <p className="font-black text-lg text-neutral-900 leading-none">{formatNaira(p.price)}</p>
                          {p.originalPrice && <p className="text-[10px] text-neutral-400 line-through leading-none mb-1">{formatNaira(p.originalPrice)}</p>}
                        </div>
                      </div>

                      <div className="space-y-2 mt-2">
                        <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                          <div className="bg-orange-500 h-full rounded-full" style={{ width: `${(stockLeft / (stockLeft + 50)) * 100}%` }} />
                        </div>
                        <div className="flex items-end justify-between">
                          <span className="text-[10px] text-neutral-500 font-bold">{stockLeft} items left</span>
                          <button 
                            onClick={(e) => handleAddToCartWithFeedback(p, 1, p.sizes?.[0], p.colors?.[0], e)}
                            className={`text-[10px] font-bold px-3 py-1.5 rounded transition-all ${isAdded ? "bg-emerald-600 text-white" : "bg-orange-500 hover:bg-orange-600 text-white"}`}
                          >
                            {isAdded ? "Added" : "Add to Cart"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Featured Rectangular Products (Added to Homepage) */}
          <section className="space-y-4">
            <div className="text-left pb-2 border-b border-neutral-100 flex justify-between items-end">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">Featured Selections</h2>
                <p className="text-xs text-neutral-400 font-semibold mt-1">Handpicked quality items delivered fast</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MOCK_PRODUCTS.slice(4, 8).map((p, idx) => {
                const isAdded = !!justAddedProducts[p.id];
                return (
                  <motion.div
                    key={`feat-rect-${p.id}`}
                    onClick={() => {
                      onSelectProduct(p.id);
                      onNavigate("details");
                    }}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    whileHover={{ y: -4, scale: 1.01 }}
                    className="bg-white rounded-2xl border border-neutral-150 p-3 flex flex-row h-36 shadow-sm hover:shadow-md cursor-pointer transition-all"
                  >
                    {/* Left: Image */}
                    <div className="w-[35%] h-full bg-neutral-50 rounded-xl overflow-hidden relative shrink-0">
                      {p.image ? (
                        <img src={p.image} className="w-full h-full object-cover transition-transform hover:scale-110" alt={p.title} />
                      ) : (
                        <div className="flex w-full h-full items-center justify-center text-[9px] uppercase font-bold text-neutral-300">No Img</div>
                      )}
                      {p.salePercentage && (
                        <span className="absolute top-2 left-2 bg-red-600 text-white font-extrabold text-[8px] uppercase px-1.5 py-0.5 rounded shadow-sm z-10">
                          -{p.salePercentage}%
                        </span>
                      )}
                    </div>
                    {/* Right: Info */}
                    <div className="flex-1 pl-4 py-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[9px] font-extrabold text-orange-500 uppercase tracking-widest">{p.vendorName}</p>
                        <h3 className="font-extrabold text-sm text-neutral-800 line-clamp-2 leading-snug mt-1">{p.title}</h3>
                        <div className="flex items-center space-x-1 text-[10px] text-neutral-500 mt-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="font-bold">{p.rating}</span>
                          <span>({p.reviewsCount})</span>
                        </div>
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          {p.originalPrice && <p className="text-[10px] text-neutral-400 line-through leading-none">{formatNaira(p.originalPrice)}</p>}
                          <p className="font-black text-sm text-neutral-900 leading-none">{formatNaira(p.price)}</p>
                        </div>
                        <button 
                          onClick={(e) => handleAddToCartWithFeedback(p, 1, p.sizes?.[0], p.colors?.[0], e)}
                          className={`text-[9px] font-bold px-2 py-1 rounded transition-all ${isAdded ? "bg-emerald-600 text-white" : "bg-neutral-100 hover:bg-orange-500 text-neutral-700 hover:text-white"}`}
                        >
                          {isAdded ? "Added" : "Buy Now"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Recently Viewed Products Section */}
          {recentlyViewedProducts.length > 0 && (
            <section className="space-y-4">
              <div className="text-left pb-2 border-b border-neutral-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight flex items-center">
                    <Eye className="w-5 h-5 mr-2 text-orange-500 animate-pulse" />
                    Recently Viewed
                  </h2>
                  <p className="text-xs text-neutral-400 font-semibold mt-1">Pick up right where you left off in your shopping trip</p>
                </div>
                {recentlyViewedProducts.length > 1 && (
                  <button 
                    onClick={() => {
                      localStorage.removeItem("recentlyViewed");
                      setRecentlyViewedIds([]);
                    }}
                    className="text-[10px] text-neutral-400 font-bold hover:text-red-500 uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="flex overflow-x-auto pb-4 gap-4 scrollbar-thin snap-x snap-mandatory">
                {recentlyViewedProducts.map((p, idx) => {
                  const isAdded = !!justAddedProducts[p.id];
                  return (
                    <motion.div
                      key={`recent-${p.id}`}
                      onClick={() => {
                        onSelectProduct(p.id);
                        onNavigate("details");
                      }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.05 }}
                      whileHover={{ y: -4 }}
                      className="bg-white rounded-2xl border border-neutral-150 p-3 flex flex-row h-28 w-72 shrink-0 shadow-xs hover:shadow-md cursor-pointer transition-all snap-start"
                    >
                      {/* Left: Image */}
                      <div className="w-[30%] h-full bg-neutral-50 rounded-xl overflow-hidden relative shrink-0">
                        {p.image ? (
                          <img src={p.image} className="w-full h-full object-cover transition-transform hover:scale-110" alt={p.title} referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex w-full h-full items-center justify-center text-[9px] uppercase font-bold text-neutral-300">No Img</div>
                        )}
                      </div>
                      {/* Right: Info */}
                      <div className="flex-1 pl-3 py-0.5 flex flex-col justify-between min-w-0">
                        <div>
                          <p className="text-[9px] font-bold text-orange-500 uppercase truncate">{p.vendorName}</p>
                          <h3 className="font-extrabold text-xs text-neutral-800 line-clamp-2 leading-tight mt-1">{p.title}</h3>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="font-black text-xs text-neutral-900 leading-none">{formatNaira(p.price)}</p>
                          <button 
                            onClick={(e) => handleAddToCartWithFeedback(p, 1, p.sizes?.[0], p.colors?.[0], e)}
                            className={`text-[9px] font-bold px-2.5 py-1 rounded transition-all shrink-0 ${isAdded ? "bg-emerald-600 text-white" : "bg-neutral-50 hover:bg-orange-500 text-neutral-700 hover:text-white border border-neutral-200"}`}
                          >
                            {isAdded ? "Added" : "Buy Now"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Trending Deals of the week (Asymmetric Bento layout) */}
          <section className="space-y-4">
            <div className="text-left pb-2 border-b border-neutral-100">
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">Trending Weekly Deals</h2>
              <p className="text-xs text-neutral-400 font-semibold">Top performing products from Computer Village, Balogun and Alaba markets</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {MOCK_PRODUCTS.slice(0, 4).map((p, idx) => {
                const isAdded = !!justAddedProducts[p.id];
                const isLiked = wishlist.includes(p.id);
                return (
                  <motion.div
                    key={p.id}
                    onClick={() => {
                      onSelectProduct(p.id);
                      onNavigate("details");
                    }}
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-10px" }}
                    transition={{ duration: 0.4, delay: idx * 0.08 }}
                    whileHover={shouldReduceMotion ? {} : { y: -8, scale: 1.015, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.06), 0 8px 10px -6px rgba(0,0,0,0.06)" }}
                    className="bg-white rounded-2xl border border-neutral-150 overflow-hidden shadow-ambient hover:shadow-premium group cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div className="relative aspect-square bg-neutral-50 overflow-hidden flex items-center justify-center border-b border-neutral-100/60">
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.title}
                          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-neutral-300 font-extrabold uppercase text-[9px] tracking-widest text-center px-4 self-center">
                          ₦ Image-Free Classic
                        </div>
                      )}
                      
                      {/* Badge */}
                      {p.isBestSeller && (
                        <span className="absolute top-3 left-3 bg-orange-500 text-white font-extrabold text-[9px] uppercase px-2 py-1 rounded-md tracking-wider shadow-sm z-10">
                          Best Seller
                        </span>
                      )}
                      {p.salePercentage && (
                        <span className="absolute top-3 right-3 bg-red-600 text-white font-extrabold text-[9px] uppercase px-2 py-1 rounded-md tracking-wider shadow-sm z-10">
                          SAVE {p.salePercentage}%
                        </span>
                      )}

                      {/* Wishlist toggle */}
                      <motion.button
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.85 }}
                        onClick={(e) => toggleWishlist(p.id, e)}
                        className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/95 backdrop-blur-xs flex items-center justify-center shadow-xs text-neutral-500 hover:text-red-500 z-10"
                      >
                        <motion.div
                          key={isLiked ? "liked" : "unliked"}
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 15 }}
                        >
                          <Heart className={`w-4.5 h-4.5 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                        </motion.div>
                      </motion.button>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between text-left space-y-2">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-1">
                          <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{p.vendorName}</p>
                          {p.condition === "Fairly Used" && (
                            <span className="text-[8px] uppercase tracking-wider bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-extrabold whitespace-nowrap">Fairly Used</span>
                          )}
                        </div>
                        <h3 className="font-extrabold text-sm text-neutral-800 line-clamp-1 truncate group-hover:text-orange-500 transition-colors">
                          {p.title}
                        </h3>
                        {/* Rating details */}
                        <div className="flex items-center space-x-1.5 text-xs text-neutral-500">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 animate-none" />
                          <span className="font-bold text-neutral-800">{p.rating}</span>
                          <span>({p.reviewsCount})</span>
                        </div>
                      </div>

                      <div className="flex items-end justify-between pt-2 border-t border-neutral-50">
                        <div>
                          {p.originalPrice && (
                            <p className="text-xs text-neutral-400 line-through leading-none mb-0.5 font-mono">
                              {formatNaira(p.originalPrice)}
                            </p>
                          )}
                          <p className="font-black text-base text-neutral-900 leading-none font-mono">
                            {formatNaira(p.price)}
                          </p>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => handleAddToCartWithFeedback(p, 1, p.sizes?.[0], p.colors?.[0], e)}
                          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all duration-300 ${
                            isAdded
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-neutral-100 hover:bg-orange-500 text-neutral-700 hover:text-white"
                          }`}
                        >
                          {isAdded ? "✓ Added" : "Buy Now"}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Secure Assurance Banner */}
          <motion.section
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-neutral-50 rounded-2xl border border-neutral-150 p-6 flex flex-col md:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-left">
                <h4 className="font-extrabold text-neutral-900">100% Secure Direct Checkout</h4>
                <p className="text-xs text-neutral-500 mt-1">
                  Naija Online Stores processes payments securely. Purchases are sent directly to vendors for quick delivery.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-xs font-bold bg-white px-4 py-2 rounded-xl border border-neutral-200 text-neutral-600">
              <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse" />
              <span>Verified Paystack Integration</span>
            </div>
          </motion.section>

        </motion.div>
      )}
      </AnimatePresence>

      {/* ---------------- 2. CATALOG BROWSER & SORTING ---------------- */}
      <AnimatePresence mode="wait">
      {screen === "shop" && (
        <motion.div
          key="shop"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
          className="space-y-6"
        >
        
          {/* Ad Banner for Category / Search Results */}
          {MOCK_ADS.filter(ad => (ad.position === "category" || ad.position === "search") && ad.status === "active").map((ad, idx) => (
             <motion.div
               key={ad.id}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.1 * idx }}
               className="w-full h-24 sm:h-32 rounded-2xl overflow-hidden relative group cursor-pointer shadow-sm mb-4"
               onClick={() => {
                  // Tracking logic
               }}
             >
               <img src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
                 <span className="text-[9px] text-orange-400 font-extrabold uppercase tracking-widest mb-1 bg-black/50 w-fit px-1.5 py-0.5 rounded">Promoted</span>
                 <h3 className="text-white font-black text-lg sm:text-xl">{ad.title}</h3>
               </div>
             </motion.div>
          ))}
          
          {/* Filters Bar Row */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 border border-neutral-200 rounded-2xl shadow-xs">
            
            {/* Category tabs filters */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pr-1 z-10">
              <button
                onClick={() => setActiveCategoryTab("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold relative transition-colors duration-200 ${
                  activeCategoryTab === "all"
                    ? "text-white font-extrabold"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {activeCategoryTab === "all" && (
                  <motion.div
                    layoutId="activeCategoryTabHighlight"
                    className="absolute inset-0 bg-emerald-950 rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                All Categories
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategoryTab(c.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold relative transition-colors duration-200 whitespace-nowrap ${
                    activeCategoryTab === c.id
                      ? "text-white font-extrabold"
                      : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                  }`}
                >
                  {activeCategoryTab === c.id && (
                    <motion.div
                      layoutId="activeCategoryTabHighlight"
                      className="absolute inset-0 bg-emerald-950 rounded-xl -z-10"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {isSearchLoading ? (
              Array.from({ length: 8 }).map((_, skeletonIdx) => (
                <div
                  key={`skeleton-card-${skeletonIdx}`}
                  className="bg-white rounded-2xl border border-neutral-150 p-3 flex flex-col h-72 sm:h-80 shadow-ambient select-none text-left gap-3"
                >
                  <div className="w-full h-32 sm:h-40 shimmer-bg rounded-xl shrink-0" />
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div className="space-y-2">
                      <div className="h-3 shimmer-bg rounded-md w-1/3" />
                      <div className="h-4 shimmer-bg rounded-md w-full" />
                      <div className="h-3.5 shimmer-bg rounded-md w-1/2" />
                    </div>
                    <div className="pt-2 flex justify-between items-center bg-white">
                      <div className="h-5 shimmer-bg rounded-md w-1/4" />
                      <div className="h-7 shimmer-bg rounded-lg w-16" />
                    </div>
                  </div>
                </div>
              ))
            ) : paginatedProducts.map((p, idx) => {
              const isAdded = !!justAddedProducts[p.id];
              const isLiked = wishlist.includes(p.id);
              return (
                <motion.div
                  key={p.id}
                  onClick={() => {
                    onSelectProduct(p.id);
                    onNavigate("details");
                  }}
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-10px" }}
                  transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.3) }}
                  whileHover={shouldReduceMotion ? {} : { y: -5, scale: 1.01, boxShadow: "0 12px 20px -8px rgba(0,0,0,0.06)" }}
                  className="bg-white rounded-2xl border border-neutral-150 overflow-hidden shadow-sm hover:shadow-md group cursor-pointer transition-all flex flex-col justify-between h-auto"
                  id={`product-cell-${p.id}`}
                >
                  {/* Top Side: Square Image Area (Vertical layout context) */}
                  <div className="relative w-full aspect-square bg-neutral-50 overflow-hidden flex flex-col items-center justify-center border-b border-neutral-100/60">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.title}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-neutral-300 font-extrabold uppercase text-[8px] tracking-widest text-center px-1 select-none leading-relaxed">
                        ₦ No Image
                      </div>
                    )}

                    {/* Stock Alert */}
                    {p.stock <= 5 && (
                      <span className="absolute top-2 left-2 bg-red-600 text-white font-extrabold text-[8px] sm:text-[9px] uppercase px-1.5 py-0.5 rounded tracking-wider shadow-xs z-10">
                        {p.stock} left!
                      </span>
                    )}

                    {/* Wishlist item toggles */}
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => toggleWishlist(p.id, e)}
                      className="absolute bottom-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 flex items-center justify-center hover:scale-105 transition-transform shadow-xs text-neutral-500 hover:text-red-500 z-10"
                    >
                      <motion.div
                        key={isLiked ? "liked" : "unliked"}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      >
                        <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                      </motion.div>
                    </motion.button>
                  </div>

                  {/* Right Side: Detailed Info Area */}
                  <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between text-left min-w-0">
                    <div className="space-y-1 sm:space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span className="text-[8px] sm:text-[9px] font-bold text-orange-500 uppercase tracking-widest block truncate">
                            {p.vendorName}
                          </span>
                          {p.condition === "Fairly Used" && (
                            <span className="text-[7px] sm:text-[8px] uppercase tracking-wider bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-extrabold whitespace-nowrap">Pre-Owned</span>
                          )}
                        </div>
                        {p.isBestSeller && (
                          <span className="bg-orange-500 text-white font-black text-[7px] sm:text-[8px] uppercase px-1 py-0.5 rounded tracking-wider shrink-0">
                            Best
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-xs sm:text-sm text-neutral-800 line-clamp-2 leading-tight group-hover:text-orange-500 transition-colors">
                        {p.title}
                      </h3>
                      <div className="flex items-center space-x-1 text-[10px] sm:text-xs text-neutral-500">
                        <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-black text-neutral-800">{p.rating}</span>
                        <span className="text-[9px] sm:text-[10px]">({p.reviewsCount})</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-neutral-100 pt-2 gap-2 mt-1">
                      <div className="min-w-0">
                        {p.originalPrice && (
                          <span className="text-[10px] sm:text-xs text-neutral-400 line-through block font-mono leading-none mb-0.5">
                            {formatNaira(p.originalPrice)}
                          </span>
                        )}
                        <span className="font-black text-xs sm:text-sm md:text-base text-neutral-900 block font-mono leading-none">
                          {formatNaira(p.price)}
                        </span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => handleAddToCartWithFeedback(p, 1, p.sizes?.[0], p.colors?.[0], e)}
                        className={`px-2 py-1.5 sm:px-3 sm:py-1.5 font-bold text-[9px] sm:text-xs rounded-lg shadow-xs transition-all duration-300 shrink-0 ${
                          isAdded
                            ? "bg-emerald-600 text-white"
                            : "bg-orange-500 hover:bg-orange-600 text-white"
                        }`}
                      >
                        {isAdded ? "✓ Added" : "Add"}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Dynamic Pagination Controls */}
            {totalPages > 1 && (
              <div className="col-span-full mt-8 flex flex-wrap items-center justify-center gap-1.5 bg-neutral-100/60 border border-neutral-200 p-3.5 rounded-2xl max-w-lg mx-auto shadow-xs select-none">
                <button
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage(prev => Math.max(prev - 1, 1));
                    window.scrollTo({ top: 300, behavior: "smooth" });
                  }}
                  className="px-3.5 py-2 border border-neutral-200 bg-white hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-600 disabled:opacity-40 select-none transition-all cursor-pointer"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  const isCurrent = pageNum === currentPage;
                  return (
                    <button
                      key={`page-btn-${pageNum}`}
                      onClick={() => {
                        setCurrentPage(pageNum);
                        window.scrollTo({ top: 300, behavior: "smooth" });
                      }}
                      className={`w-9 h-9 rounded-xl text-xs font-bold select-none transition-all flex items-center justify-center cursor-pointer ${
                        isCurrent
                          ? "bg-emerald-800 text-white font-extrabold shadow-sm scale-102"
                          : "border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentPage(prev => Math.min(prev + 1, totalPages));
                    window.scrollTo({ top: 300, behavior: "smooth" });
                  }}
                  className="px-3.5 py-2 border border-neutral-200 bg-white hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-600 disabled:opacity-40 select-none transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}

            {sortedProducts.length === 0 && !isSearchLoading && (
              <div className="col-span-full py-16 text-center space-y-2">
                <p className="text-base font-bold text-neutral-500">No products match your criteria inside this category.</p>
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
        </motion.div>
      )}
      </AnimatePresence>

      {/* ---------------- 3. PRODUCT DETAILS SCREEN ---------------- */}
      <AnimatePresence mode="wait">
      {screen === "details" && detailProduct && (
        <motion.div
          key="details"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
          className="space-y-8 text-left"
        >
          
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
              <div className="aspect-square bg-neutral-50 border border-neutral-200 rounded-2xl overflow-hidden shadow-ambient relative flex items-center justify-center">
                {detailProduct.image ? (
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={selectedImageIndex}
                      src={detailProduct.image}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.02 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      alt={detailProduct.title}
                      className={`w-full h-full object-cover ${
                        selectedImageIndex === 1
                          ? "brightness-105 contrast-105 scale-102"
                          : selectedImageIndex === 2
                          ? "contrast-95 saturate-110"
                          : ""
                      }`}
                      referrerPolicy="no-referrer"
                    />
                  </AnimatePresence>
                ) : (
                  <div className="text-neutral-300 font-extrabold uppercase text-xs tracking-widest text-center px-4">
                    ₦ Product Designed Image-Free
                  </div>
                )}
                
                {detailProduct.isBestSeller && (
                  <span className="absolute top-4 left-4 bg-orange-500 text-white font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-md tracking-wider">
                    Best Seller
                  </span>
                )}
              </div>

              {/* Thumbnails Selection Panel */}
              {detailProduct.image && (
                <div className="flex items-center gap-3 justify-center pt-1">
                  {[0, 1, 2].map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className="relative w-16 h-16 rounded-xl bg-neutral-50 border overflow-hidden cursor-pointer focus:outline-none flex-shrink-0"
                      style={{
                        borderColor: selectedImageIndex === idx ? "#f97316" : "#e5e5e5"
                      }}
                    >
                      {selectedImageIndex === idx && (
                        <motion.div
                          layoutId="activeThumbRing"
                          className="absolute inset-0 border-2 border-orange-500 rounded-xl z-10 pointer-events-none"
                          transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        />
                      )}
                      <img
                        src={detailProduct.image}
                        alt="Product thumbnail view"
                        className={`w-full h-full object-cover transition-all duration-300 ${
                          idx === 1
                            ? "brightness-105 contrast-105 scale-110"
                            : idx === 2
                            ? "contrast-95 saturate-110"
                            : ""
                        } ${selectedImageIndex !== idx ? "opacity-70 hover:opacity-100" : ""}`}
                      />
                    </button>
                  ))}
                </div>
              )}
              
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
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight leading-tight">
                    {detailProduct.title}
                  </h1>
                  {detailProduct.condition === "Fairly Used" && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-widest rounded-md border border-amber-200">Fairly Used</span>
                  )}
                </div>
                
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
                    Verified Direct Order
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
                <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden h-11 bg-white">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                    className="px-3 hover:bg-neutral-100 transition-colors h-full text-neutral-500 text-lg select-none"
                  >
                    -
                  </motion.button>
                  <div className="relative w-12 h-full flex items-center justify-center overflow-hidden">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={detailQty}
                        initial={{ y: -6, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 6, opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 350, damping: 20 }}
                        className="font-bold text-sm select-none font-mono block text-neutral-800"
                      >
                        {detailQty}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setDetailQty(Math.min(detailProduct.stock, detailQty + 1))}
                    className="px-3 hover:bg-neutral-100 transition-colors h-full text-neutral-500 text-lg select-none"
                  >
                    +
                  </motion.button>
                </div>

                {(() => {
                  const detailIsAdded = !!justAddedProducts[detailProduct.id];
                  return (
                    <motion.button
                      animate={detailIsAdded ? { scale: [1, 1.05, 1] } : {}}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        handleAddToCartWithFeedback(detailProduct, detailQty, selectedSize, selectedColor);
                        setDetailQty(1);
                      }}
                      className={`flex-1 min-w-[200px] h-11 text-white font-bold rounded-xl shadow-md transition-all duration-300 flex items-center justify-center space-x-2 select-none ${
                        detailIsAdded ? "bg-emerald-600" : "bg-orange-500 hover:bg-orange-600"
                      }`}
                      id="add-to-cart-action"
                    >
                      {detailIsAdded ? <Check className="w-5 h-5 animate-bounce" /> : <ShoppingCart className="w-5 h-5" />}
                      <span>{detailIsAdded ? "Added to Cart!" : "Secure Purchase"}</span>
                    </motion.button>
                  );
                })()}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleWishlist(detailProduct.id)}
                  className="w-11 h-11 border border-neutral-200 hover:border-neutral-300 rounded-xl flex items-center justify-center hover:bg-neutral-50 text-neutral-550 transition-colors cursor-pointer"
                >
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={wishlist.includes(detailProduct.id) ? "liked" : "unliked"}
                      initial={{ scale: 0.6, rotate: -25, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 350, damping: 15 }}
                    >
                      <Heart className={`w-5 h-5 ${wishlist.includes(detailProduct.id) ? "fill-red-500 text-red-500 border-none" : ""}`} />
                    </motion.div>
                  </AnimatePresence>
                </motion.button>
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
                <p className="text-xs text-neutral-405 font-bold uppercase tracking-wider mt-1 text-emerald-600">Verified Shopper Reviews</p>
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
                {addedReviews.map((rev, idx) => (
                  <motion.div
                    key={rev.id}
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-15px" }}
                    transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.2) }}
                    whileHover={{ x: 4 }}
                    className="p-4 bg-white border border-neutral-155 rounded-2xl flex space-x-4 items-start text-xs transition-shadow hover:shadow-xs"
                  >
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
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

        </motion.div>
      )}
      </AnimatePresence>

      {/* ---------------- 4. SHOPPING CART VIEW ---------------- */}
      <AnimatePresence mode="wait">
      {screen === "cart" && (
        <motion.div
          key="cart"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
          className="space-y-6"
        >
          <div className="text-left pb-4 border-b border-neutral-100">
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">Your Shopping Basket</h1>
            <p className="text-xs text-neutral-400 font-semibold mt-1">Review your cart and shipping details before payment</p>
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
                <AnimatePresence initial={false}>
                  {cart.map((item) => (
                    <motion.div
                      key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`}
                      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -15 }}
                      layout
                      transition={{ duration: 0.25 }}
                      whileHover={{ scale: 1.005 }}
                      className="p-4 sm:p-5 bg-white border border-neutral-150 rounded-2xl flex flex-col sm:flex-row items-center gap-4 text-left shadow-xs justify-between"
                    >
                      <div className="flex items-center space-x-4 w-full sm:w-auto">
                        <div className="w-16 h-16 bg-neutral-50 rounded-xl overflow-hidden border border-neutral-100 flex-shrink-0 flex items-center justify-center">
                          {item.product.image ? (
                            <img src={item.product.image} alt={item.product.title} className="w-full h-full object-cover pointer-events-none" />
                          ) : (
                            <ShoppingCart className="w-5 h-5 text-neutral-300" />
                          )}
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
                        <div className="flex items-center border border-neutral-150 rounded-lg overflow-hidden h-9 bg-neutral-50 relative">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              if (item.quantity === 1) {
                                onRemoveFromCart(item.product.id);
                              } else {
                                onUpdateCartQty(item.product.id, item.quantity - 1);
                              }
                            }}
                            className="px-2 hover:bg-neutral-100 transition-colors h-full text-neutral-400 select-none"
                          >
                            -
                          </motion.button>
                          <div className="relative w-8 h-full flex items-center justify-center overflow-hidden">
                            <AnimatePresence mode="popLayout" initial={false}>
                              <motion.span
                                key={item.quantity}
                                initial={{ y: -6, opacity: 0, scale: 0.8 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ y: 6, opacity: 0, scale: 0.8 }}
                                transition={{ type: "spring", stiffness: 350, damping: 20 }}
                                className="font-bold text-xs select-none font-mono block text-emerald-600 font-black"
                              >
                                {item.quantity}
                              </motion.span>
                            </AnimatePresence>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onUpdateCartQty(item.product.id, item.quantity + 1)}
                            className="px-2 hover:bg-neutral-100 transition-colors h-full text-neutral-400 select-none"
                          >
                            +
                          </motion.button>
                        </div>

                        {/* Cost */}
                        <div className="text-right min-w-24">
                          <p className="font-black text-neutral-900 text-sm font-mono">
                            {formatNaira(item.product.price * item.quantity)}
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-0.5 font-semibold">({formatNaira(item.product.price)} each)</p>
                        </div>

                        {/* Remove button */}
                        <motion.button
                          whileHover={{ scale: 1.12, color: "#ef4444" }}
                          whileTap={{ scale: 0.88 }}
                          onClick={() => onRemoveFromCart(item.product.id)}
                          className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                          id={`delete-cart-${item.product.id}`}
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </motion.button>
                      </div>

                    </motion.div>
                  ))}
                </AnimatePresence>
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
                  <div className="flex justify-between items-center h-5">
                    <span>Basket Subtotal</span>
                    <span className="font-mono text-neutral-800 relative block min-w-[80px] text-right overflow-hidden">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={cartSubtotal}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="inline-block"
                        >
                          {formatNaira(cartSubtotal)}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </div>
                  <div className="flex justify-between items-center h-5">
                    <span>Shipping Logistics ({selectedStateForShipping})</span>
                    <span className="font-mono text-neutral-800 relative block min-w-[80px] text-right overflow-hidden">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={activeShippingFee}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="inline-block"
                        >
                          {activeShippingFee === 0 ? "FREE" : formatNaira(activeShippingFee)}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </div>
                  <div className="flex justify-between items-center h-5">
                    <span>Service Charge & VAT (7.5% Nigeria tax)</span>
                    <span className="font-mono text-neutral-800 relative block min-w-[80px] text-right overflow-hidden">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={estimatedTax}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="inline-block"
                        >
                          {formatNaira(estimatedTax)}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </div>
                  
                  <div className="border-t border-neutral-100 pt-3 flex justify-between items-center text-sm">
                    <span className="font-extrabold text-neutral-900">Total Settlement</span>
                    <span className="font-black text-neutral-900 text-base font-mono relative block min-w-[100px] text-right overflow-hidden h-6">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={cartTotalSum}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="inline-block font-black"
                        >
                          {formatNaira(cartTotalSum)}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </div>
                </div>

                <button
                  onClick={onCheckout}
                  className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl shadow-md transition-colors active:scale-98 flex items-center justify-center space-x-2 text-xs tracking-wider uppercase"
                  id="checkout-trigger-btn"
                >
                  <ShieldCheck className="w-4.5 h-4.5 text-white" />
                  <span>Secure Direct Gateway</span>
                </button>

                <div className="p-3 bg-cyan-50/50 rounded-xl flex items-start space-x-2 text-[10px] border border-cyan-100 tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-cyan-600 flex-shrink-0 mt-0.5" />
                  <p className="text-cyan-800 font-medium">
                  Secure verification handled by Paystack. Your details are safe.
                  </p>
                </div>
              </div>

            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
}
