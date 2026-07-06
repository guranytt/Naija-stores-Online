import React, { useState } from "react";
import { ShoppingCart, Search, UserCircle, Menu, X, ChevronDown, Heart, AlignLeft } from "lucide-react";
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
  cartCount, 
  onSearch, 
  userEmail, 
  categories = [],
  isLoggedIn = false,
  onSelectCategory
}: NavbarProps) {
  const [searchVal, setSearchVal] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isMobileCategoryOpen, setIsMobileCategoryOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchVal);
    onNavigate("shop");
  };

  return (
    <header className="w-full sticky top-0 z-50 bg-white font-sans border-b border-neutral-200 shadow-sm">
      {/* 1. Top Announcement Bar */}
      <div className="bg-[#4CAF50] text-white text-xs font-semibold py-2 hidden md:block">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            Welcome to Naija Online Stores! Free Shipping on selected items.
          </div>
          <div className="flex items-center space-x-6">
            <button onClick={() => onNavigate("sell")} className="hover:text-orange-200 transition-colors">Become a Seller</button>
            <button onClick={() => onNavigate("stores")} className="hover:text-orange-200 transition-colors">Vendor Directory</button>
            <button onClick={() => onNavigate("contact")} className="hover:text-orange-200 transition-colors">Contact Support</button>
            <button onClick={() => onNavigate("faq")} className="hover:text-orange-200 transition-colors">FAQ</button>
          </div>
        </div>
      </div>

      {/* 2. Main Header */}
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4 lg:gap-8">
          
          {/* Logo & Mobile Toggle */}
          <div className="flex items-center space-x-4 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-neutral-800 hover:bg-neutral-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div
              onClick={() => onNavigate("home")}
              className="flex items-center space-x-3 cursor-pointer select-none group"
            >
              <img src="https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png" className="h-10 w-auto" alt="Naija Stores Logo" />
              <span className="font-extrabold text-xl tracking-tight hidden sm:block">
                <span className="text-[#4CAF50]">Naija </span>
                <span className="text-[#FF9800]">Online Stores</span>
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-8 text-sm font-bold text-neutral-800">
            <div 
              className="relative h-20 flex items-center"
              onMouseEnter={() => setIsCategoryMenuOpen(true)}
              onMouseLeave={() => setIsCategoryMenuOpen(false)}
            >
              <button className="flex items-center space-x-2 hover:text-orange-500 transition-colors h-full">
                <AlignLeft className="w-4 h-4" />
                <span>Categories</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              
              {isCategoryMenuOpen && categories && categories.length > 0 && (
                <div className="absolute top-20 left-0 w-64 bg-white border border-neutral-200 shadow-ambient rounded-b-xl py-2 overflow-hidden z-50">
                  <ul className="flex flex-col">
                    {categories.slice(0, 10).map((cat) => (
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
                          className="w-full text-left px-5 py-3 text-sm font-semibold text-neutral-700 hover:text-orange-500 hover:bg-orange-50 transition-colors flex items-center space-x-3"
                        >
                          <span className="truncate">{cat.name}</span>
                        </button>
                      </li>
                    ))}
                    <li className="px-5 pt-3 pb-1 border-t border-neutral-100 mt-2">
                       <button 
                         onClick={() => { onNavigate("shop"); setIsCategoryMenuOpen(false); }}
                         className="text-orange-500 text-sm font-bold w-full text-center hover:underline"
                       >
                         View All Categories
                       </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
            <button onClick={() => onNavigate("home")} className={`hover:text-orange-500 transition-colors ${currentScreen === "home" ? "text-orange-500" : ""}`}>Home</button>
            <button onClick={() => onNavigate("shop")} className={`hover:text-orange-500 transition-colors ${currentScreen === "shop" ? "text-orange-500" : ""}`}>Shop</button>
            <button onClick={() => onNavigate("stores")} className={`hover:text-orange-500 transition-colors ${currentScreen === "stores" ? "text-orange-500" : ""}`}>Stores</button>
          </nav>

          {/* Search Bar Center */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-lg relative">
            <div className={`flex w-full h-11 border transition-all duration-200 rounded-lg overflow-hidden bg-[#F9FAFB] ${isSearchFocused ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-neutral-200'}`}>
              <input
                type="text"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                placeholder="Search products, brands and categories..."
                className="flex-1 px-4 bg-transparent text-neutral-900 placeholder-neutral-500 font-medium outline-none text-sm"
              />
              <button
                type="submit"
                className="bg-orange-500 hover:bg-orange-600 transition-colors text-white px-5 flex items-center justify-center cursor-pointer"
              >
                <Search className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>
          </form>

          {/* Action Icons Right */}
          <div className="flex items-center space-x-6 shrink-0 select-none">
            <button onClick={() => onNavigate("auth")} className="hidden md:flex items-center space-x-2 group cursor-pointer text-left">
              <UserCircle className="w-8 h-8 text-neutral-700 stroke-[1.5] group-hover:text-orange-500 transition-colors" />
              <div className="leading-tight">
                <p className="text-xs text-neutral-500 font-semibold">{isLoggedIn ? "Account" : "Sign in"}</p>
                <p className="text-sm font-bold text-neutral-900 group-hover:text-orange-500 transition-colors">{isLoggedIn ? userEmail.split('@')[0] : "My Profile"}</p>
              </div>
            </button>

            <button onClick={() => onNavigate("cart")} className="flex items-center space-x-2 group cursor-pointer">
              <div className="relative">
                <ShoppingCart className="w-8 h-8 text-neutral-700 group-hover:text-orange-500 stroke-[1.5] transition-colors" />
                <span className="absolute -top-1 -right-2 bg-orange-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">{cartCount}</span>
              </div>
              <div className="leading-tight hidden lg:block">
                <p className="text-xs text-neutral-500 font-semibold">My Cart</p>
                <p className="text-sm font-bold text-neutral-900 group-hover:text-orange-500 transition-colors">Checkout</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden px-4 pb-4">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className={`flex w-full h-11 border transition-all duration-200 rounded-lg overflow-hidden bg-[#F9FAFB] ${isSearchFocused ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-neutral-200'}`}>
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search products..."
              className="flex-1 px-4 bg-transparent text-neutral-900 placeholder-neutral-500 font-medium outline-none text-sm"
            />
            <button type="submit" className="bg-orange-500 text-white px-4"><Search className="w-5 h-5" /></button>
          </div>
        </form>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex">
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative w-4/5 max-w-sm bg-white h-full flex flex-col z-10 shadow-2xl overflow-y-auto">
             <div className="flex justify-between items-center p-4 border-b border-neutral-100 bg-[#F9FAFB]">
                <div className="flex items-center space-x-3">
                  <img src="https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png" className="h-8 w-auto" alt="Naija Stores Logo" />
                  <span className="font-extrabold text-lg tracking-tight">
                    <span className="text-[#4CAF50]">Naija </span>
                    <span className="text-[#FF9800]">Online Stores</span>
                  </span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg bg-white shadow-sm border border-neutral-200">
                  <X className="w-5 h-5 text-neutral-600" />
                </button>
             </div>
             
             <div className="flex flex-col py-4 font-bold text-base text-neutral-800">
                <button className="text-left px-6 py-4 border-b border-neutral-100 hover:text-orange-500 hover:bg-orange-50" onClick={() => { onNavigate("home"); setMobileMenuOpen(false); }}>Home</button>
                <button className="text-left px-6 py-4 border-b border-neutral-100 hover:text-orange-500 hover:bg-orange-50" onClick={() => { onNavigate("shop"); setMobileMenuOpen(false); }}>Shop All</button>
                
                {/* Mobile Categories Dropdown */}
                <div className="border-b border-neutral-100">
                  <button 
                    className="w-full text-left px-6 py-4 flex items-center justify-between hover:text-orange-500 hover:bg-orange-50" 
                    onClick={() => setIsMobileCategoryOpen(!isMobileCategoryOpen)}
                  >
                    <span>Categories</span>
                    <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isMobileCategoryOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isMobileCategoryOpen && categories && categories.length > 0 && (
                    <div className="bg-neutral-50 py-2 flex flex-col">
                      {categories.map((cat) => (
                        <button 
                          key={cat.id}
                          className="text-left px-10 py-3 text-sm font-semibold text-neutral-600 hover:text-orange-500 hover:bg-orange-100/50"
                          onClick={() => {
                            if (onSelectCategory) {
                              onSelectCategory(cat.id);
                            } else {
                              onSearch(cat.name);
                              onNavigate("shop");
                            }
                            setMobileMenuOpen(false);
                          }}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button className="text-left px-6 py-4 border-b border-neutral-100 hover:text-orange-500 hover:bg-orange-50" onClick={() => { onNavigate("stores"); setMobileMenuOpen(false); }}>Vendor Directory</button>
                <button className="text-left px-6 py-4 border-b border-neutral-100 hover:text-orange-500 hover:bg-orange-50" onClick={() => { onNavigate("sell"); setMobileMenuOpen(false); }}>Sell on Naija</button>
                <button className="text-left px-6 py-4 border-b border-neutral-100 hover:text-orange-500 hover:bg-orange-50" onClick={() => { onNavigate("about"); setMobileMenuOpen(false); }}>About Us</button>
                <button className="text-left px-6 py-4 border-b border-neutral-100 hover:text-orange-500 hover:bg-orange-50" onClick={() => { onNavigate("faq"); setMobileMenuOpen(false); }}>FAQ</button>
                <button className="text-left px-6 py-4 hover:text-orange-500 hover:bg-orange-50" onClick={() => { onNavigate("auth"); setMobileMenuOpen(false); }}>{isLoggedIn ? "My Account" : "Sign In / Register"}</button>
             </div>
          </div>
        </div>
      )}
    </header>
  );
}
