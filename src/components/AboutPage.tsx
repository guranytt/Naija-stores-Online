import React from "react";
import { motion } from "motion/react";

export default function AboutPage() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-4xl mx-auto py-12 px-4"
    >
      <div className="text-center mb-12">
        <h1 className="text-4xl sm:text-5xl font-black text-neutral-900 tracking-tight">About <span className="text-[#4CAF50]">Naija</span><span className="text-orange-500">OnlineStores</span></h1>
        <p className="text-sm font-bold text-neutral-400 mt-3 uppercase tracking-widest">Nigeria's Premier Multi-Vendor Marketplace</p>
      </div>
      
      <div className="bg-white border border-neutral-100 rounded-3xl p-8 sm:p-12 shadow-sm text-neutral-700 leading-relaxed space-y-8">
        <p className="text-lg font-medium text-neutral-600">
          Welcome to <strong>Naija Online Stores</strong>. Our mission is to bridge the gap between verified local wholesalers, trusted merchants, and shoppers nationwide.
        </p>
        
        <div>
          <h2 className="text-2xl font-black text-neutral-900 mb-4 flex items-center">
            <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center mr-3 text-sm">💡</span>
            Our Vision
          </h2>
          <p className="text-neutral-600">
            We envision a digital economy where shopping online in Nigeria is safe, secure, and seamless. By enforcing strict 
            vendor verification and automated escrow logistics, we provide peace of mind to both buyers and sellers.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-black text-neutral-900 mb-4 flex items-center">
            <span className="w-8 h-8 rounded-full bg-green-50 text-[#4CAF50] flex items-center justify-center mr-3 text-sm">✓</span>
            Why Choose Us?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            <div className="p-5 bg-[#F9FAFB] border border-neutral-100 rounded-2xl">
              <h3 className="font-bold text-neutral-900 mb-2">🛡️ Verified Vendors</h3>
              <p className="text-sm text-neutral-500">Every merchant on our platform goes through a rigorous verification process.</p>
            </div>
            <div className="p-5 bg-[#F9FAFB] border border-neutral-100 rounded-2xl">
              <h3 className="font-bold text-neutral-900 mb-2">💳 Secure Escrow Payments</h3>
              <p className="text-sm text-neutral-500">Funds are held securely and only released when the buyer confirms receipt.</p>
            </div>
            <div className="p-5 bg-[#F9FAFB] border border-neutral-100 rounded-2xl">
              <h3 className="font-bold text-neutral-900 mb-2">🚚 Nationwide Delivery</h3>
              <p className="text-sm text-neutral-500">We partner with top logistics providers to ensure timely and safe delivery.</p>
            </div>
            <div className="p-5 bg-[#F9FAFB] border border-neutral-100 rounded-2xl">
              <h3 className="font-bold text-neutral-900 mb-2">✨ Authentic Products</h3>
              <p className="text-sm text-neutral-500">Shop with confidence knowing our products are genuine.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
