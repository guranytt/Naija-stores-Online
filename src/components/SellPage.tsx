import React from "react";
import { motion } from "motion/react";
import { Store, ShieldCheck, TrendingUp, Truck } from "lucide-react";

export default function SellPage({ onNavigate }: { onNavigate: (screen: string) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-6xl mx-auto py-12 px-4"
    >
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-neutral-900 mb-6 tracking-tight">Sell on <span className="text-[#4CAF50]">Naija</span><span className="text-orange-500">OnlineStores</span></h1>
        <p className="text-lg font-medium text-neutral-600 mb-8">
          Join thousands of verified vendors and wholesalers across Nigeria. Reach millions of customers, boost your sales, and grow your business securely.
        </p>
        <button 
          onClick={() => { window.location.hash = "register-vendor"; onNavigate("auth"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-extrabold text-sm uppercase tracking-wider shadow-lg hover:shadow-xl transition-all"
        >
          Register as a Vendor Today
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 text-center hover:shadow-ambient hover:border-orange-200 transition-all">
          <div className="w-16 h-16 bg-green-50 text-[#4CAF50] border border-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h3 className="font-black text-lg mb-2 text-neutral-900">Massive Reach</h3>
          <p className="text-neutral-500 font-medium text-sm">Access a nationwide customer base actively looking for high-quality products.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 text-center hover:shadow-ambient hover:border-orange-200 transition-all">
          <div className="w-16 h-16 bg-orange-50 text-orange-500 border border-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="font-black text-lg mb-2 text-neutral-900">Secure Escrow</h3>
          <p className="text-neutral-500 font-medium text-sm">Guaranteed payments. Funds are safely held until the customer receives their order.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 text-center hover:shadow-ambient hover:border-orange-200 transition-all">
          <div className="w-16 h-16 bg-green-50 text-[#4CAF50] border border-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8" />
          </div>
          <h3 className="font-black text-lg mb-2 text-neutral-900">Your Own Storefront</h3>
          <p className="text-neutral-500 font-medium text-sm">Get a dedicated URL and digital storefront to build your brand identity online.</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 text-center hover:shadow-ambient hover:border-orange-200 transition-all">
          <div className="w-16 h-16 bg-orange-50 text-orange-500 border border-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8" />
          </div>
          <h3 className="font-black text-lg mb-2 text-neutral-900">Logistics Support</h3>
          <p className="text-neutral-500 font-medium text-sm">We integrate with top delivery partners so you don't have to worry about fulfillment.</p>
        </div>
      </div>
      
      <div className="bg-neutral-900 rounded-[2.5rem] p-8 md:p-14 text-center text-white border border-neutral-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#4CAF50]/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <h2 className="text-3xl md:text-4xl font-black mb-4 relative z-10 tracking-tight">Ready to start selling?</h2>
        <p className="text-neutral-400 mb-8 max-w-2xl mx-auto font-medium relative z-10">
          Sign up now to get your products listed on Nigeria's fastest-growing e-commerce platform. It only takes a few minutes to set up your shop.
        </p>
        <button 
          onClick={() => { window.location.hash = "login-vendor"; onNavigate("auth"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="bg-white text-neutral-900 px-8 py-4 rounded-xl font-extrabold text-sm uppercase tracking-wider hover:bg-orange-500 hover:text-white transition-colors relative z-10 shadow-lg"
        >
          Go to Vendor Portal
        </button>
      </div>
    </motion.div>
  );
}
