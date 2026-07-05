import React, { useState, useEffect } from "react";
import { ShoppingCart, Search, Store, Map, LayoutDashboard, UserCircle, Menu, X, ChevronDown, Heart, RefreshCcw, AlignLeft } from "lucide-react";
import { Category, Product } from "../types";

interface NavbarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  onSelectProduct?: (id: string) => void;
  cartCount: number;
  onSearch: (query: string) => void;
  userEmail: string;
  categories?: Category[];
  products?: Product[];
  isLoggedIn?: boolean;
  onSelectCategory?: (catId: string) => void;
}

export default function Navbar({ 
  currentScreen, 
  onNavigate, 
  onSelectProduct,
  cartCount, 
  onSearch, 
  userEmail, 
  categories = [],
  products = [],
  isLoggedIn = false,
  onSelectCategory
}: NavbarProps) {
  const [searchVal, setSearchVal] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchVal);
    onNavigate("shop");
  };

  return (
    <header className="w-full bg-white font-sans border-b border-neutral-200">
      {/* 1. Top Announcement Bar */}
      <div className="bg-emerald-600 text-white text-[11px] font-medium py-1.5 hidden md:block">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            Welcome! Free Shipping on orders over <span className="font-bold">US$25.00</span>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={() => onNavigate("sell")} className="hover:text-orange-300 transition-colors">Become a Vendor</button>
            <span className="text-emerald-400">|</span>
            <button onClick={() => onNavigate("contact")} className="hover:text-orange-300 transition-colors">Contact Us</button>
          </div>
        </div>
      </div>

      {/* 2. Main Header (Logo, Search, Icons) */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex justify-between items-center gap-6">
          
          {/* Logo */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-md text-neutral-800 hover:bg-neutral-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div
              onClick={() => onNavigate("home")}
              className="flex items-center space-x-2 cursor-pointer select-none group"
            >
              <img src="https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png" className="h-10 w-auto" alt="Naija Stores Logo" />
              <span className="font-bold text-xl text-neutral-800 tracking-tight hidden sm:block">Naija Online Stores</span>
            </div>
          </div>

          {/* Search Bar Center */}
          <form onSubmit={handleSearchSubmit} className="hidden lg:flex flex-1 max-w-2xl mx-8 relative">
            <div className="flex w-full h-11 border-2 border-orange-500 rounded-full overflow-hidden bg-neutral-100">
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder="Search for product..."
                className="flex-1 px-4 bg-neutral-100 text-neutral-900 placeholder-neutral-500 font-medium outline-none text-sm"
              />
              <div className="w-px bg-neutral-300 my-2"></div>
              <div className="relative flex items-center px-3 bg-neutral-100 min-w-[140px] text-sm text-neutral-700 cursor-pointer">
                 <span className="truncate flex-1 font-medium">{selectedCategory}</span>
                 <ChevronDown className="w-4 h-4 ml-2 text-neutral-500" />
                 <select 
                   className="absolute inset-0 opacity-0 cursor-pointer"
                   value={selectedCategory}
                   onChange={(e) => setSelectedCategory(e.target.value)}
                 >
                   <option value="All Categories">All Categories</option>
                   {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                 </select>
              </div>
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 transition-colors text-white px-6 flex items-center justify-center cursor-pointer"
              >
                <Search className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </form>

          {/* Action Icons Right */}
          <div className="flex items-center space-x-5 shrink-0 select-none">
            <button className="hidden md:flex flex-col items-center group">
              <div className="relative">
                <Heart className="w-6 h-6 text-neutral-700 group-hover:text-orange-500 stroke-[1.5] transition-colors" />
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">0</span>
              </div>
              <span className="text-[10px] text-neutral-500 mt-1">Wishlist</span>
            </button>

            <button className="hidden md:flex flex-col items-center group">
              <div className="relative">
                <RefreshCcw className="w-6 h-6 text-neutral-700 group-hover:text-orange-500 stroke-[1.5] transition-colors" />
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">0</span>
              </div>
              <span className="text-[10px] text-neutral-500 mt-1">Compare</span>
            </button>

            <button onClick={() => onNavigate("cart")} className="flex flex-col items-center group cursor-pointer">
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-neutral-700 group-hover:text-orange-500 stroke-[1.5] transition-colors" />
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{cartCount}</span>
              </div>
              <span className="text-[10px] text-neutral-500 mt-1 hidden md:block">Cart</span>
            </button>

            <div className="h-8 w-px bg-neutral-200 hidden md:block mx-1"></div>

            <button onClick={() => onNavigate("auth")} className="hidden lg:flex items-center space-x-2 group cursor-pointer text-left">
              <UserCircle className="w-7 h-7 text-neutral-700 stroke-[1.5] group-hover:text-orange-500 transition-colors" />
              <div className="leading-tight">
                <p className="text-[10px] text-neutral-500 font-medium">{isLoggedIn ? "Hello," : "Hello, Sign in"}</p>
                <p className="text-xs font-bold text-neutral-900 group-hover:text-orange-500 transition-colors">{isLoggedIn ? userEmail.split('@')[0] : "My Account"}</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Dark Navigation Bar */}
      <div className="bg-neutral-900 text-white hidden md:block">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          
          <div className="flex items-center space-x-8 h-12">
            {/* Browse Categories Dropdown Trigger */}
            <div 
              className="relative h-full z-50"
              onMouseEnter={() => setIsCategoryMenuOpen(true)}
              onMouseLeave={() => setIsCategoryMenuOpen(false)}
            >
              <button className="bg-orange-500 hover:bg-orange-600 transition-colors text-white h-full px-5 flex items-center space-x-3 w-[250px] cursor-pointer">
                <AlignLeft className="w-5 h-5" />
                <span className="font-bold text-sm tracking-wide">BROWSE CATEGORIES</span>
                <ChevronDown className="w-4 h-4 ml-auto" />
              </button>
              
              {isCategoryMenuOpen && categories && categories.length > 0 && (
                <div className="absolute top-full left-0 w-[250px] bg-white border border-neutral-200 shadow-xl py-2">
                  <ul className="flex flex-col">
                    {categories.slice(0, 12).map((cat) => (
                      <li key={cat.id}>
                        <button 
                          onClick={() => {
                            if (onSelectCategory) {
                              onSelectCategory(cat.id);
                            } else {
                              onSearch(cat.name);
                              onNavigate("shop");
                            }
                            setIsCategoryMenuOpen(false);
                          }}
                          className="w-full text-left px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:text-orange-500 hover:bg-orange-50 transition-colors flex items-center space-x-3"
                        >
                          {cat.image ? (
                            <img src={cat.image} className="w-5 h-5 object-cover rounded-full bg-neutral-100 shrink-0" alt="" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-neutral-200 shrink-0" />
                          )}
                          <span className="truncate">{cat.name}</span>
                        </button>
                      </li>
                    ))}
                    <li className="px-5 pt-3 pb-1 border-t border-neutral-100 mt-2">
                       <button 
                         onClick={() => { onNavigate("shop"); setIsCategoryMenuOpen(false); }}
                         className="text-orange-500 text-xs font-bold w-full text-center hover:underline"
                       >
                         VIEW ALL
                       </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Nav Links */}
            <nav className="flex items-center space-x-8 text-xs font-bold tracking-wide">
              <button onClick={() => onNavigate("home")} className={`hover:text-orange-400 transition-colors uppercase ${currentScreen === "home" ? "text-orange-500" : ""}`}>HOME</button>
              <button onClick={() => onNavigate("shop")} className={`hover:text-orange-400 transition-colors uppercase ${currentScreen === "shop" ? "text-orange-500" : ""}`}>SHOP</button>
              <button onClick={() => { if(onSelectCategory) { onSelectCategory("Flash Deals"); onNavigate("shop"); } else { onSearch("Flash Deals"); onNavigate("shop"); } }} className="hover:text-orange-400 transition-colors uppercase">PROMOTIONS</button>
              <button onClick={() => onNavigate("about")} className="hover:text-orange-400 transition-colors uppercase">PAGES</button>
              <button onClick={() => onNavigate("stores")} className={`hover:text-orange-400 transition-colors uppercase ${currentScreen === "stores" ? "text-orange-500" : ""}`}>VENDOR STORE LIST</button>
            </nav>
          </div>

          {/* Right Tag */}
          <div className="flex items-center space-x-2 text-xs font-bold">
            <span className="uppercase text-neutral-300">SUPER DISCOUNT</span>
            <span className="bg-orange-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] animate-pulse">🔥</span>
          </div>

        </div>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative w-72 bg-white h-full flex flex-col p-4 z-10 shadow-2xl">
             <div className="flex justify-between items-center mb-6">
                <img src="https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png" className="h-8 w-auto" alt="Naija Stores Logo" />
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded bg-neutral-100">
                  <X className="w-5 h-5 text-neutral-600" />
                </button>
             </div>
             
             <form onSubmit={handleSearchSubmit} className="mb-6">
                <div className="flex border border-neutral-300 rounded-lg overflow-hidden">
                  <input
                    type="text"
                    value={searchVal}
                    onChange={(e) => setSearchVal(e.target.value)}
                    placeholder="Search for product..."
                    className="flex-1 px-3 py-2 text-sm outline-none"
                  />
                  <button type="submit" className="bg-orange-500 text-white px-3"><Search className="w-4 h-4" /></button>
                </div>
             </form>

             <div className="space-y-4 flex flex-col items-start font-bold text-sm text-neutral-800">
                <button onClick={() => { onNavigate("home"); setMobileMenuOpen(false); }}>HOME</button>
                <button onClick={() => { onNavigate("shop"); setMobileMenuOpen(false); }}>SHOP</button>
                <button onClick={() => { onNavigate("stores"); setMobileMenuOpen(false); }}>VENDOR LIST</button>
                <button onClick={() => { onNavigate("sell"); setMobileMenuOpen(false); }}>SELL ON NAIJA</button>
                <button onClick={() => { onNavigate("auth"); setMobileMenuOpen(false); }}>MY ACCOUNT</button>
             </div>
          </div>
        </div>
      )}
    </header>
  );
}
