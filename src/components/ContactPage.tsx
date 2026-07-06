import React, { useState } from "react";
import { motion } from "motion/react";
import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-6xl mx-auto py-12 px-4 grid grid-cols-1 md:grid-cols-2 gap-12"
    >
      <div>
        <h1 className="text-4xl font-extrabold text-neutral-900 mb-6">Contact Us</h1>
        <p className="text-lg text-neutral-600 mb-8">
          Have a question about an order, want to become a vendor, or need support? Our dedicated team is here to help you.
        </p>
        
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-[#4CAF50]">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900">Phone Support</h3>
              <p className="text-neutral-600">08035237665</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-[#4CAF50]">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900">Email Address</h3>
              <p className="text-neutral-600">adminnaijastoresonline@gmail.com</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-[#4CAF50]">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900">Head Office</h3>
              <p className="text-neutral-600">Petrocam Plaza, Opposite Guru Maharaji, Obawole, 12 Victor Olaleye Ave, Ishaga, Iju, Lagos 100216, Lagos</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100">
        <h2 className="text-2xl font-black mb-6 text-neutral-900">Send us a Message</h2>
        {submitted ? (
          <div className="p-4 bg-[#4CAF50]/10 text-[#4CAF50] font-bold rounded-xl border border-green-100">
            Thank you for reaching out! We'll get back to you shortly.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">Full Name</label>
              <input type="text" required className="w-full border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">Email Address</label>
              <input type="email" required className="w-full border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] transition-all" />
            </div>
            <div>
              <label className="block text-sm font-bold text-neutral-700 mb-1">Message</label>
              <textarea rows={4} required className="w-full border border-neutral-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#4CAF50] transition-all"></textarea>
            </div>
            <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors tracking-wide shadow-sm">
              Send Message
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
}
