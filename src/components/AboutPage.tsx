import React from "react";
import { motion } from "motion/react";

export default function AboutPage() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-4xl mx-auto py-12 px-4"
    >
      <h1 className="text-4xl font-extrabold text-neutral-900 mb-6">About Naija Online Stores</h1>
      <div className="prose prose-lg text-neutral-700">
        <p className="mb-4">
          Welcome to <strong>Naija Online Stores</strong>, Nigeria's premier multi-vendor e-commerce marketplace. 
          Our mission is to bridge the gap between verified local wholesalers, trusted merchants, and shoppers nationwide.
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-4">Our Vision</h2>
        <p className="mb-4">
          We envision a digital economy where shopping online in Nigeria is safe, secure, and seamless. By enforcing strict 
          vendor verification and automated escrow logistics, we provide peace of mind to both buyers and sellers.
        </p>
        <h2 className="text-2xl font-bold mt-8 mb-4">Why Choose Us?</h2>
        <ul className="list-disc pl-6 mb-4 space-y-2">
          <li><strong>Verified Vendors:</strong> Every merchant on our platform goes through a rigorous verification process.</li>
          <li><strong>Secure Escrow Payments:</strong> Funds are held securely and only released when the buyer confirms receipt of their order.</li>
          <li><strong>Nationwide Delivery:</strong> We partner with top logistics providers to ensure timely and safe delivery to any location in Nigeria.</li>
          <li><strong>Authentic Products:</strong> From electronics and fashion to beauty and home appliances, shop with confidence knowing our products are genuine.</li>
        </ul>
      </div>
    </motion.div>
  );
}
