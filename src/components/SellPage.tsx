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
        <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-900 mb-6">Sell on Naija Online Stores</h1>
        <p className="text-lg text-neutral-600 mb-8">
          Join thousands of verified vendors and wholesalers across Nigeria. Reach millions of customers, boost your sales, and grow your business securely.
        </p>
        <button 
          onClick={() => { onNavigate("auth"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-xl font-extrabold text-lg shadow-lg hover:shadow-xl transition-all"
        >
          Register as a Vendor Today
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-xl mb-2">Massive Reach</h3>
          <p className="text-neutral-600">Access a nationwide customer base actively looking for high-quality products.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 text-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-xl mb-2">Secure Escrow</h3>
          <p className="text-neutral-600">Guaranteed payments. Funds are safely held until the customer receives their order.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 text-center">
          <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-xl mb-2">Your Own Storefront</h3>
          <p className="text-neutral-600">Get a dedicated URL and digital storefront to build your brand identity online.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100 text-center">
          <div className="w-16 h-16 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-xl mb-2">Logistics Support</h3>
          <p className="text-neutral-600">We integrate with top delivery partners so you don't have to worry about fulfillment.</p>
        </div>
      </div>
      
      <div className="bg-neutral-900 rounded-3xl p-8 md:p-12 text-center text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to start selling?</h2>
        <p className="text-neutral-400 mb-8 max-w-2xl mx-auto">
          Sign up now to get your products listed on Nigeria's fastest-growing e-commerce platform. It only takes a few minutes to set up your shop.
        </p>
        <button 
          onClick={() => { onNavigate("auth"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          className="bg-white text-neutral-900 px-8 py-3 rounded-xl font-bold hover:bg-neutral-100 transition-colors"
        >
          Go to Vendor Portal
        </button>
      </div>
    </motion.div>
  );
}
