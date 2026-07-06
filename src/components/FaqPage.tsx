import React from "react";
import { motion } from "motion/react";
import { HelpCircle } from "lucide-react";

export default function FaqPage() {
  const faqs = [
    {
      question: "What is Naija Online Stores?",
      answer: "Naija Online Stores is Nigeria's trusted online marketplace. We connect buyers directly with verified local wholesalers to shop for electronics, fashion, beauty products, and more securely."
    },
    {
      question: "How does secure payment work?",
      answer: "We use an automated escrow system. When you place an order, your payment is held securely in escrow. It is only released to the vendor after you confirm successful delivery."
    },
    {
      question: "Do you offer nationwide delivery in Nigeria?",
      answer: "Yes, we partner with top logistics providers to ensure fast, reliable, and trackable delivery to any state across Nigeria."
    },
    {
      question: "Are the vendors on the platform verified?",
      answer: "Absolutely. Every merchant goes through a rigorous verification process, including identity checks, business registration checks (CAC), and physical location confirmation to ensure you get authentic products."
    },
    {
      question: "How do I become a vendor?",
      answer: "You can click on the 'Sell on Naija Online Stores' or 'Vendor Portal' link in the footer to register your business. Our team will review your application and approve it once you pass our verification checks."
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-4xl mx-auto py-12 px-4"
    >
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-green-50 text-[#4CAF50] rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100 shadow-sm">
          <HelpCircle className="w-8 h-8" />
        </div>
        <h1 className="text-4xl font-black text-neutral-900 mb-4 tracking-tight">Frequently Asked Questions</h1>
        <p className="text-lg font-medium text-neutral-600">Find answers to the most common questions about shopping on Naija Online Stores.</p>
      </div>

      <div className="space-y-6">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-white p-6 rounded-3xl shadow-sm border border-neutral-100 hover:border-orange-200 transition-colors">
            <h3 className="text-xl font-bold text-neutral-900 mb-3 flex items-start">
              <span className="text-orange-500 mr-2">Q.</span>
              {faq.question}
            </h3>
            <p className="text-neutral-600 leading-relaxed font-medium pl-7">{faq.answer}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
