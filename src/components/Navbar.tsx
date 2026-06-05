/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ShoppingCart, Search, Store, Map, LayoutDashboard, UserCircle, Menu, X, Landmark, BadgeCheck } from "lucide-react";
import { Category } from "../types";

interface NavbarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  cartCount: number;
  onSearch: (query: string) => void;
  userEmail: string;
  onToggleDevConfig?: () => void;
}

export default function Navbar({ currentScreen, onNavigate, cartCount, onSearch, userEmail, onToggleDevConfig }: NavbarProps) {
  const [searchVal, setSearchVal] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchVal);
    onNavigate("shop"); // Navigate to shop to see search results
  };

  const menuItems = [
    { id: "home", label: "Marketplace", icon: Store },
    { id: "shop", label: "Departments", icon: Store },
    { id: "map", label: "Integrated Map", icon: Map },
    { id: "admin", label: "Vendor Admin", icon: LayoutDashboard },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-secondary dark:bg-emerald-950 text-white shadow-ambient font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo Brand Brand */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-full hover:bg-emerald-800 transition-colors"
              id="mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div
              onClick={() => onNavigate("home")}
              className="flex items-center space-x-2 cursor-pointer select-none group"
            >
              <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center font-extrabold text-white text-lg tracking-tighter group-hover:scale-105 transition-transform shadow-md">
                ₦
              </div>
              <div className="text-left leading-none">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight block text-white">
                  NaijaStores<span className="text-orange-400">.</span>
                </span>
                <span className="text-[9px] font-bold text-emerald-300 uppercase tracking-widest block">
                  Online Plaza
                </span>
              </div>
            </div>
          </div>

          {/* Search bar Desktop (300px to 500px wide) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-md mx-8 relative"
          >
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Search local Agbada, tech parts, shea butter..."
              className="w-full h-10 pl-11 pr-4 rounded-full border-none bg-white/10 text-white placeholder-white/70 focus:placeholder-white/40 focus:bg-white/15 focus:ring-2 focus:ring-orange-500 outline-none text-sm transition-all"
              id="search-input"
            />
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
          </form>

          {/* Navigation Links Desktop */}
          <nav className="hidden lg:flex items-center space-x-1 select-none">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentScreen === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold tracking-wide transition-all ${
                    isActive
                      ? "bg-white/10 text-white shadow-xs border border-white/5"
                      : "text-emerald-100 hover:text-white hover:bg-white/5"
                  }`}
                  id={`nav-link-${item.id}`}
                >
                  <Icon className="w-4 h-4 text-orange-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action widgets (Cart, Auth, Dev trigger) */}
          <div className="flex items-center space-x-2 select-none">
            {/* Quick Dev Toggle info */}
            {onToggleDevConfig && (
              <button
                onClick={onToggleDevConfig}
                className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-neutral-900/35 hover:bg-neutral-900/50 text-[10px] font-bold tracking-widest uppercase rounded-md border border-neutral-700/20 text-orange-300 mr-2 active:scale-95"
              >
                <span>⚙ Settings</span>
              </button>
            )}

            {/* Shopping Cart Button */}
            <button
              onClick={() => onNavigate("cart")}
              className={`p-2.5 rounded-full hover:bg-emerald-800 transition-colors relative ${
                currentScreen === "cart" ? "bg-white/10" : ""
              }`}
              id="cart-badge-trigger"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-orange-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full border-2 border-secondary flex items-center justify-center animate-bounce">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Profile Avatar widget */}
            <div className="flex items-center space-x-2 pl-2 border-l border-emerald-800">
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
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-55 flex">
          {/* Transparent Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs"
          />

          {/* Panel Sheet */}
          <div className="relative flex flex-col w-72 bg-emerald-950 text-white p-6 border-r border-emerald-800 h-full">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-2">
                <span className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center font-extrabold text-white text-base">₦</span>
                <span className="font-extrabold text-lg tracking-tight">NaijaStores</span>
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
            <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3 text-left">Main Departments</h3>
            <div className="space-y-1.5 flex-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentScreen === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold tracking-wide transition-all ${
                      isActive
                        ? "bg-orange-500 text-white shadow-md font-extrabold"
                        : "text-emerald-100 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-5 h-5 text-white/80" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
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
          </div>
        </div>
      )}
    </header>
  );
}
