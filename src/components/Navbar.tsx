/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { ShoppingCart, Search, Store, Map, LayoutDashboard, UserCircle, Menu, X, Landmark, BadgeCheck, ChevronDown, ChevronUp, Package, ShoppingBag } from "lucide-react";
import { Category } from "../types";
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from "../data/mockData";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

interface NavbarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onSelectProduct?: (id: string) => void;
  cartCount: number;
  onSearch: (query: string) => void;
  userEmail: string;
  categories?: Category[];
  products?: import("../types").Product[];
  isLoggedIn?: boolean;
}

export default function Navbar({ 
  currentScreen, 
  onNavigate, 
  onSelectProduct,
  cartCount, 
  onSearch, 
  userEmail, 
  categories = MOCK_CATEGORIES,
  products = [],
  isLoggedIn = false
}: NavbarProps) {
  const [searchVal, setSearchVal] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesMenuOpen, setCategoriesMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [cartBounced, setCartBounced] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  useEffect(() => {
    if (isSearchFocused) {
      const key = `recent_searches_${isLoggedIn ? userEmail : "guest"}`;
      setRecentSearches(JSON.parse(localStorage.getItem(key) || "[]"));
    }
  }, [isSearchFocused, isLoggedIn, userEmail]);

  // Debounce search effect (optional, because search is triggered on submit)
  // Let's implement real-time dropdown search
  const [debouncedSearchVal, setDebouncedSearchVal] = useState("");
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(-1);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchVal(searchVal);
      setSelectedSearchIndex(-1);
    }, 200);
    return () => clearTimeout(handler);
  }, [searchVal]);

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  // Wiggle / bounce search/cart updates
  useEffect(() => {
    if (cartCount > 0) {
      setCartBounced(true);
      const timer = setTimeout(() => setCartBounced(false), 450);
      return () => clearTimeout(timer);
    }
  }, [cartCount]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchVal);
    setIsSearchFocused(false);
    setMobileMenuOpen(false);
    onNavigate("shop"); // Navigate to shop to see search results
  };

  const menuItems = [
    { id: "home", label: "Marketplace", icon: Store },
    { id: "shop", label: "Categories", icon: Store },
    { id: "map", label: "My Orders", icon: Package },
    { id: "admin", label: "Vendor Admin", icon: LayoutDashboard },
  ];

  return (
    <motion.header
      initial={shouldReduceMotion ? { opacity: 0 } : { y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="sticky top-0 z-50 w-full bg-secondary dark:bg-emerald-950 text-white shadow-ambient font-sans"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full hover:bg-emerald-800 transition-colors"
              id="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-emerald-500" /> : <Menu className="w-6 h-6 text-emerald-500" />}
            </button>
            <div
              onClick={() => onNavigate("home")}
              className="flex items-center space-x-2 cursor-pointer select-none group"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-500 overflow-hidden flex items-center justify-center font-extrabold text-white text-lg tracking-tighter group-hover:scale-105 transition-transform shadow-md border-2 border-orange-400">
                <img
                  src="https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png"
                  alt="Naija Online Stores Logo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-left leading-none">
                <span className="font-extrabold text-sm sm:text-base tracking-tight block animate-fade-in">
                  <span className="text-emerald-400">Naija</span><span className="text-orange-400"> Online Stores</span>
                </span>
              </div>
            </div>
          </div>

          {/* Search bar Desktop (Expanding and smart dropdown recommendations list) */}
          <motion.form
            onSubmit={handleSearchSubmit}
            animate={{ maxWidth: isSearchFocused ? 485 : 360 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="hidden md:flex flex-1 mx-8 relative"
          >
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 220)}
              onKeyDown={(e) => {
                 if (e.key === "Escape") {
                    setIsSearchFocused(false);
                 } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSelectedSearchIndex(prev => Math.min(prev + 1, 10)); // rough max
                 } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSelectedSearchIndex(prev => Math.max(prev - 1, -1));
                 } else if (e.key === "Enter" && selectedSearchIndex >= 0) {
                    // Handled implicitly if they tabbed, but complex if they just used arrows without DOM focus.
                    // Tab navigation is supported natively so we don't strictly need to force DOM click here if we assume standard focus.
                 }
              }}
              placeholder="Search products, brands, local spices..."
              className="w-full h-11 pl-11 pr-4 rounded-full border-2 border-orange-400 bg-white text-neutral-900 placeholder-neutral-500 font-bold focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none text-xs transition-all shadow-sm"
              id="search-input"
            />
            <button
              type="submit"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-orange-500 active:scale-90 transition-all font-black p-1 rounded-full cursor-pointer"
              title="Search"
            >
              <Search className="w-4.5 h-4.5 stroke-[3.5]" />
            </button>

            <AnimatePresence>
              {isSearchFocused && (() => {
                const sVal = debouncedSearchVal.toLowerCase();
                const matchedProducts = products.filter(p =>
                  p.title.toLowerCase().includes(sVal) ||
                  p.category.toLowerCase().includes(sVal) ||
                  (p.tags && p.tags.some(t => t.toLowerCase().includes(sVal))) ||
                  (p.subCategory && p.subCategory.toLowerCase().includes(sVal)) ||
                  p.vendorName.toLowerCase().includes(sVal)
                ).slice(0, 5);

                const currentSuggestionsCount = debouncedSearchVal.trim() === "" 
                  ? ((isLoggedIn ? recentSearches.length : 0) + 4) // 4 popular searches
                  : matchedProducts.length;

                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute left-0 right-0 top-12 bg-white rounded-2xl shadow-premium border border-neutral-150 overflow-hidden text-neutral-800 z-50 text-left p-3 .shadow-ambient max-h-80 overflow-y-auto"
                  >
                  {debouncedSearchVal.trim() === "" ? (
                    <div>
                      {isLoggedIn && recentSearches.length > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <p className="text-[9px] font-black tracking-widest text-neutral-400 uppercase pl-2">Recent Searches</p>
                            <button 
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const key = `recent_searches_${isLoggedIn ? userEmail : "guest"}`;
                                localStorage.removeItem(key);
                                setRecentSearches([]);
                              }}
                              className="text-[9px] text-orange-500 font-bold px-2 hover:underline"
                            >
                              Clear
                            </button>
                          </div>
                          <div className="space-y-1">
                            {recentSearches.map((kw) => (
                              <button
                                key={kw}
                                type="button"
                                onClick={() => {
                                  setSearchVal(kw);
                                  onSearch(kw);
                                  setIsSearchFocused(false);
                                  onNavigate("shop");
                                }}
                                className="w-full flex items-center space-x-2 px-2.5 py-2 hover:bg-neutral-50 rounded-xl transition-all cursor-pointer font-bold text-xs text-neutral-700 hover:text-emerald-800 text-left"
                              >
                                <Search className="w-3.5 h-3.5 text-neutral-400" />
                                <span>{kw}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className="text-[9px] font-black tracking-widest text-neutral-400 uppercase mb-2 pl-2">Popular Searches</p>
                      <div className="space-y-1">
                        {["Agbada", "Shea Butter", "Suya Sauce", "Ankara Art Fabric"].map((kw) => (
                          <button
                            key={kw}
                            type="button"
                            onClick={() => {
                              setSearchVal(kw);
                              onSearch(kw);
                              setIsSearchFocused(false);
                              onNavigate("shop");
                            }}
                            className="w-full flex items-center space-x-2 px-2.5 py-2 hover:bg-neutral-50 rounded-xl transition-all cursor-pointer font-bold text-xs text-neutral-700 hover:text-emerald-800 text-left"
                          >
                            <Search className="w-3.5 h-3.5 text-neutral-400" />
                            <span>{kw}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Matching Categories & Products */}
                      {(() => {
                        const sVal = debouncedSearchVal.toLowerCase();
                        const matchedProducts = products.filter(p =>
                          p.title.toLowerCase().includes(sVal) ||
                          p.category.toLowerCase().includes(sVal) ||
                          (p.tags && p.tags.some(t => t.toLowerCase().includes(sVal))) ||
                          (p.subCategory && p.subCategory.toLowerCase().includes(sVal)) ||
                          p.vendorName.toLowerCase().includes(sVal)
                        ).slice(0, 5);

                        return matchedProducts.length > 0 ? (
                          <div className="space-y-2">
                            <p className="text-[9px] font-black tracking-widest text-neutral-400 uppercase pl-2">Suggested Products & categories</p>
                            <div className="space-y-1">
                              {matchedProducts.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => {
                                    setSearchVal("");
                                    setIsSearchFocused(false);
                                    if (onSelectProduct) {
                                      onSelectProduct(p.id);
                                    }
                                    onNavigate("details");
                                  }}
                                  className="w-full flex items-start space-x-3 px-2 py-2 hover:bg-neutral-50 rounded-xl transition-all cursor-pointer text-left"
                                >
                                  {p.image ? (
                                    <div className="w-7 h-7 rounded-md overflow-hidden bg-neutral-100 shrink-0">
                                      <img src={p.image} className="w-full h-full object-cover" alt="" />
                                    </div>
                                  ) : (
                                    <div className="w-7 h-7 rounded-md bg-emerald-50 shrink-0 flex items-center justify-center">
                                      <Store className="w-3.5 h-3.5 text-emerald-800" />
                                    </div>
                                  )}
                                  <div className="leading-tight">
                                    <p className="font-extrabold text-xs text-neutral-800 line-clamp-1">{p.title}</p>
                                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-wide">{p.category} &bull; {p.vendorName}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="py-4 text-center space-y-1 text-neutral-400">
                            <p className="text-xs font-bold">No suggestions found</p>
                            <p className="text-[10px]">Press Enter to perform global market search</p>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </motion.form>

          {/* Navigation Links Desktop */}
          <nav className="hidden lg:flex items-center space-x-1 select-none">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold tracking-wide transition-all relative ${
                    isActive
                      ? "text-white font-extrabold"
                      : "text-emerald-100 hover:text-white"
                  }`}
                  id={`nav-link-${item.id}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavHighlight"
                      className="absolute inset-0 bg-white/10 rounded-lg border border-white/5 -z-10"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon className="w-4 h-4 text-orange-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action widgets (Cart, Auth) */}
          <div className="flex items-center space-x-2 select-none">
            {/* Shopping Cart Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              animate={cartBounced ? { scale: [1, 1.3, 0.95, 1.15, 1], rotate: [0, -10, 10, -5, 0] } : { scale: 1, rotate: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              onClick={() => onNavigate("cart")}
              className={`p-2.5 rounded-full hover:bg-emerald-800 transition-colors relative cursor-pointer ${
                currentScreen === "cart" ? "bg-white/10" : ""
              }`}
              id="cart-badge-trigger"
            >
              <ShoppingCart className="w-5 h-5" />
              <AnimatePresence mode="popLayout">
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 15 }}
                    className="absolute top-1 right-1 bg-orange-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full border-2 border-secondary flex items-center justify-center shadow-lg"
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Profile Avatar widget and Sign Up */}
            <div className="flex items-center space-x-2 pl-2 border-l border-emerald-800">
              <button
                onClick={() => onNavigate("auth")}
                className="inline-flex items-center justify-center px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-[10px] sm:text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                id="header-signup-btn"
              >
                Sign Up
              </button>
              <span className="hidden xl:inline text-xs text-emerald-100 truncate max-w-32">{userEmail}</span>
              <button
                onClick={() => onNavigate("auth")}
                className="w-8 h-8 rounded-full bg-emerald-800 border-2 border-orange-400 flex items-center justify-center overflow-hidden hover:scale-105 active:scale-95 transition-transform"
                id="profile-dropdown-trigger"
              >
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCMPnqiNP_zFe0I-OIb5g1D56zCAyCYav1Ls0CGueaETuM9xKcg2Ge4Rq1pcuX8FrA6bjr7zkH3Czt9Eo-Pg3CERV9yf3nThT2tqFyQkDnMpwsmVseioTwPuEL1vYwCnSquQPkHjOyRI2RfSaHSdDrTvnslBe_NRcndbaCOoYkA5nhDdAc7nSApUSdQ2hzzTQdaSfty7BEM14fdkHRICnDs3x26ykAw4y_FeMf-_UBUaMSXbZ9i8kwz0UD6QEvw7DHp30ibCVJHf-b"
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Slide Navigation Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-55 flex">
            {/* Transparent Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs animate-none"
            />

            {/* Panel Sheet */}
            <motion.div
              initial={shouldReduceMotion ? { opacity: 0 } : { x: "-100%" }}
              animate={shouldReduceMotion ? { opacity: 1 } : { x: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { x: "-100%" }}
              transition={{ type: "spring", damping: 24, stiffness: 220 }}
              className="relative flex flex-col w-72 bg-emerald-950 text-white p-6 border-r border-emerald-800 h-full"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-500 overflow-hidden flex items-center justify-center font-extrabold text-white text-base shadow-inner">
                    <img
                      src="https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png"
                      alt="Naija Online Stores Logo"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <span className="font-extrabold text-sm tracking-tight text-white">Naija Online Stores</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-full hover:bg-emerald-800">
                  <X className="w-5 h-5 text-neutral-400" />
                </button>
              </div>

              {/* Mobile Search inside Panel */}
              <form onSubmit={handleSearchSubmit} className="relative mb-6">
                <input
                  type="text"
                  value={searchVal}
                  placeholder="Search Plaza items..."
                  onChange={(e) => setSearchVal(e.target.value)}
                  className="w-full py-2.5 pl-10 pr-4 bg-white/10 rounded-xl outline-none border-none text-white placeholder-white/60 focus:bg-white/15 text-sm"
                />
                <Search className="w-4 h-4 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
              </form>

              {/* Menu options list */}
              <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3 text-left">Main Navigation</h3>
              <div className="space-y-1.5 p-0.5">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentScreen === item.id;
                  
                  if (item.id === "shop") {
                    return (
                      <div key={item.id} className="w-full flex flex-col">
                        <button
                          onClick={() => setCategoriesMenuOpen(!categoriesMenuOpen)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all ${
                            currentScreen === "shop"
                              ? "bg-orange-500/20 text-orange-400 font-extrabold"
                              : "text-emerald-100 hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <Icon className="w-5 h-5 text-white/50" />
                            <span>{item.label}</span>
                          </div>
                          {categoriesMenuOpen ? <ChevronUp className="w-4 h-4 text-orange-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400/80" />}
                        </button>

                        <AnimatePresence initial={false}>
                          {categoriesMenuOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="pl-6 pr-2 py-1.5 space-y-2 flex flex-col items-stretch text-left border-l-2 border-orange-500/30 ml-6 mt-1 overflow-hidden"
                            >
                              {categories.map((cat) => {
                                const isCatExpanded = !!expandedCategories[`mob_shop_${cat.id}`];
                                return (
                                  <div key={cat.id} className="flex flex-col">
                                    <button
                                      onClick={() => {
                                        setExpandedCategories(prev => ({
                                          ...prev,
                                          [`mob_shop_${cat.id}`]: !prev[`mob_shop_${cat.id}`]
                                        }));
                                      }}
                                      className="w-full flex items-center justify-between py-1 text-xs font-semibold text-emerald-200 hover:text-white transition-colors text-left"
                                    >
                                      <span>{cat.name}</span>
                                      {isCatExpanded ? <ChevronUp className="w-3.5 h-3.5 text-orange-400" /> : <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />}
                                    </button>

                                    {isCatExpanded && (
                                      <div className="pl-3 py-1 space-y-1 border-l border-emerald-800/60 mt-0.5 flex flex-col items-stretch">
                                        <button
                                          onClick={() => {
                                            onSearch(cat.name);
                                            setSearchVal(cat.name);
                                            onNavigate("shop");
                                            setMobileMenuOpen(false);
                                          }}
                                          className="text-left text-[10px] text-orange-400 hover:text-white font-bold tracking-wider py-0.5"
                                        >
                                          ⚡ All {cat.name}
                                        </button>
                                        {cat.subcategories && cat.subcategories.map((subcat) => (
                                          <button
                                            key={subcat}
                                            onClick={() => {
                                              onSearch(subcat);
                                              setSearchVal(subcat);
                                              onNavigate("shop");
                                              setMobileMenuOpen(false);
                                            }}
                                            className="text-left text-[11px] text-zinc-300 hover:text-white hover:underline py-0.5"
                                          >
                                            • {subcat}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-bold tracking-wide transition-all ${
                        isActive
                          ? "bg-orange-500 text-white shadow-md font-extrabold"
                          : "text-emerald-100 hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-5 h-5 text-white/50" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Shopping Categories List inside Hamburger Menu */}
              <div className="mt-6 flex-1 flex flex-col min-h-0 overflow-hidden">
                <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3 text-left shrink-0">Shop by Category</h3>
                <div className="space-y-2 overflow-y-auto pr-1 flex-grow">
                  {categories.map((cat) => {
                    const isExpanded = !!expandedCategories[cat.id];
                    return (
                      <div key={cat.id} className="bg-white/5 rounded-xl border border-white/5 overflow-hidden transition-all">
                        <button
                          onClick={() => toggleCategoryExpand(cat.id)}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-emerald-100 hover:bg-white/5 hover:text-white transition-all text-left"
                        >
                          <span className="truncate mr-2">{cat.name}</span>
                          <span className="flex items-center space-x-1.5 shrink-0">
                            <span className="text-[9px] bg-emerald-950 text-orange-400 font-black px-1.5 py-0.5 rounded-full">
                              {cat.itemCount || 0}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-emerald-300" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-emerald-400/80" />
                            )}
                          </span>
                        </button>

                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="bg-emerald-950/45 px-2 pb-2 space-y-1 text-left border-t border-white/5"
                            >
                              {/* "Show All in Category" header link */}
                              <button
                                onClick={() => {
                                  onSearch(cat.name);
                                  setSearchVal(cat.name);
                                  onNavigate("shop");
                                  setMobileMenuOpen(false);
                                }}
                                className="w-full text-left px-2 py-1.5 text-[10px] text-orange-400 font-extrabold hover:text-white select-none block transition-colors"
                              >
                                ⚡ ALL {cat.name.toUpperCase()} PRODUCTS
                              </button>
                              
                              {cat.subcategories && cat.subcategories.map((subcat) => (
                                <button
                                  key={subcat}
                                  onClick={() => {
                                    onSearch(subcat);
                                    setSearchVal(subcat);
                                    onNavigate("shop");
                                    setMobileMenuOpen(false);
                                  }}
                                  className="w-full text-left px-2 py-1.5 text-[11px] text-emerald-200/90 hover:text-white hover:bg-white/5 rounded transition-colors block"
                                >
                                  • {subcat}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* User Session details footer inside mobile panel */}
              <div className="pt-6 border-t border-emerald-800/80 space-y-3">
                <div className="flex items-center space-x-3">
                  <img
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCMPnqiNP_zFe0I-OIb5g1D56zCAyCYav1Ls0CGueaETuM9xKcg2Ge4Rq1pcuX8FrA6bjr7zkH3Czt9Eo-Pg3CERV9yf3nThT2tqFyQkDnMpwsmVseioTwPuEL1vYwCnSquQPkHjOyRI2RfSaHSdDrTvnslBe_NRcndbaCOoYkA5nhDdAc7nSApUSdQ2hzzTQdaSfty7BEM14fdkHRICnDs3x26ykAw4y_FeMf-_UBUaMSXbZ9i8kwz0UD6QEvw7DHp30ibCVJHf-b"
                    alt="Avatar"
                    className="w-10 h-10 rounded-full border-2 border-orange-400"
                  />
                  <div className="text-left leading-tight min-w-0">
                    <p className="font-bold text-xs truncate text-white">{userEmail}</p>
                    <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider block">Shopper Profile</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onNavigate("auth");
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 bg-neutral-900/40 hover:bg-neutral-900/60 rounded-lg text-xs font-bold text-emerald-200 border border-emerald-800"
                >
                  Sign Out / Swap Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
