import React from "react";
import { X, ShieldCheck, FileText, Truck, RefreshCw } from "lucide-react";

interface PolicyOverlayProps {
  policyType: "privacy" | "terms" | "shipping" | "refund" | null;
  onClose: () => void;
}

export default function PolicyOverlay({ policyType, onClose }: PolicyOverlayProps) {
  if (!policyType) return null;

  const contentMap = {
    privacy: {
      title: "Privacy Policy & Information Safety",
      icon: <ShieldCheck className="w-8 h-8 text-emerald-500" />,
      tagline: "How we collect, utilize, and protect your shopper and vendor information.",
      sections: [
        {
          heading: "1. Information Consents & Tracking",
          text: "We utilize cookies, local storage, and secure connection tokens solely to organize active carts, maintain shopper/vendor authentication states, and streamline your persistent checkout progress. No third-party ad-tracking cookies are loaded."
        },
        {
          heading: "2. Secure Payment Gateways",
          text: "Payments are processed directly by Paystack secure inline scripts. No raw credit card digits, CVV codes, or PINs ever touch or reside on our servers. All transaction details are verified securely in real-time."
        },
        {
          heading: "3. Account and Shipping Parameters",
          text: "To ship orders successfully, we store physical shipping address structures and name records inside secure cloud datastores. E-mails are preserved specifically to send tracking status updates and notifications."
        },
        {
          heading: "4. Information Control & Deletion",
          text: "Both users and vendors hold the fundamental right to review, update, or completely purge their personal records. Contact our support desk, and your cloud profile states are wiped within 48 hours."
        }
      ]
    },
    terms: {
      title: "Terms and Conditions of Use",
      icon: <FileText className="w-8 h-8 text-orange-500" />,
      tagline: "The binding agreement orchestrating operations for merchants and shoppers.",
      sections: [
        {
          heading: "1. Shopping Agreement",
          text: "By placing orders on Naija Online Store, you acknowledge that prices are denominated in Nigerian Naira (₦). Every purchase goes through our official Paystack inline verification checkout. Verification happens before order generation."
        },
        {
          heading: "2. Vendor Multi-Store Ecosystem",
          text: "All registered verified vendors conform to accurate representation of stock quantities and pricing. Unauthorized replication of duplicate shops, deceptive listings, or delivery bypass is restricted."
        },
        {
          heading: "3. Platform Fees & Commission Matrix",
          text: "To maintain server infrastructures and facilitate instant verification systems, an admin commission of exactly 10% is deducted from completion invoices. Payouts are made directly to the vendor's bank on file."
        },
        {
          heading: "4. Account Registration Rules",
          text: "Shopper and vendor registration requires providing true, accurate identities. Registration constitutes official permission to generate transactional tracking paths. Automated spam activities are blocked immediately."
        }
      ]
    },
    shipping: {
      title: "Shipping & Delivery Protocols",
      icon: <Truck className="w-8 h-8 text-blue-500" />,
      tagline: "Fast, reliable, nationwide logistics pipelines tracking your parcels.",
      sections: [
        {
          heading: "1. Delivery Locations & Partners",
          text: "We ship parcels to all states in Nigeria using verified, top-tier domestic shipping partners. Large scale logistics are supported across major terminals in Lagos, Abuja, Port Harcourt, Enugu, and Kano."
        },
        {
          heading: "2. Estimated Safe Timeframes",
          text: "• Lagos & Surroundings: 1 to 2 Working Days\n• Port Harcourt & Abuja: 2 to 3 Working Days\n• Other National Locations: 3 to 5 Working Days\n• Flash delivery items may sometimes ship even sooner."
        },
        {
          heading: "3. Interactive Map Tracking",
          text: "Every order generated through paystack inline checkouts gets stamped with an automated Tracking ID. Customers can enter this tracking key directly in their Dashboard to see simulated visual updates in route tracking."
        },
        {
          heading: "4. Package Damaged in Transit",
          text: "If a package arrives compromised, do not accept the package from the delivery rider. Please take clear photos and alert us instantly to start the replacement flow."
        }
      ]
    },
    refund: {
      title: "Refunds & Returns Policy",
      icon: <RefreshCw className="w-8 h-8 text-cyan-500" />,
      tagline: "Ensuring risk-free shopper interactions with absolute confidence.",
      sections: [
        {
          heading: "1. Eligibility for Returns",
          text: "We offer a flexible 7-day return grace period. Items must be in their original packaging, completely unused, with all labels and vendor seals untouched. Perishable food products or custom wears are excluded."
        },
        {
          heading: "2. How to File an Inspection Refund",
          text: "Go to your customer profile view, select your active transaction history item, and click 'Initiate Verification Refund'. Select the reason for returns, and our dispatch rider will reach out for item pick-up."
        },
        {
          heading: "3. Secure Settlement Channels",
          text: "Refunds are processed securely. Once the vendor inspects the integrity of returned items, verification signals go to Paystack API to release funds directly to the customer's payment source (bank card/account)."
        },
        {
          heading: "4. Disputes & Escrow Rules",
          text: "Admin operates as a reliable mediator. If a vendor reports a return item is damaged while a customer claims otherwise, official escrow policies take hold. Decisions are finalized within 3 working days."
        }
      ]
    }
  };

  const selectedPolicy = contentMap[policyType];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dimmed backdrop */}
      <div 
        className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Styled card context sheet */}
      <div className="relative bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-3xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] border border-neutral-100 dark:border-neutral-800 animate-fade-in flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-neutral-100 dark:border-neutral-800 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-2xl">
              {selectedPolicy.icon}
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-neutral-900 dark:text-white tracking-tight">
                {selectedPolicy.title}
              </h2>
              <p className="text-xs md:text-sm text-neutral-500 font-medium mt-1">
                {selectedPolicy.tagline}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body with scrolling */}
        <div className="p-6 md:p-8 overflow-y-auto space-y-6 md:space-y-8 flex-1">
          {selectedPolicy.sections.map((sec, i) => (
            <div key={i} className="space-y-2">
              <h3 className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                {sec.heading}
              </h3>
              <p className="text-xs md:text-sm text-neutral-600 dark:text-neutral-300 font-medium leading-relaxed whitespace-pre-line pl-3.5 border-l border-neutral-100 dark:border-neutral-800">
                {sec.text}
              </p>
            </div>
          ))}
        </div>

        {/* Action Footer */}
        <div className="p-6 md:p-8 bg-neutral-50 dark:bg-neutral-800/50 border-t border-neutral-100 dark:border-neutral-850 flex items-center justify-between">
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest pl-1">
            NaijaStores Policy System v1.5
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-neutral-950 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-100 text-white dark:text-neutral-950 font-black text-xs uppercase tracking-wider rounded-xl shadow transition-all cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
