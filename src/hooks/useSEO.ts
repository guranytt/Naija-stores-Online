import { useEffect } from "react";
import { Product, Vendor, Category } from "../types";

export function useSEO(
  currentScreen: string,
  selectedProductId: string | null,
  initialCategory: string,
  selectedVendorSlug: string | null,
  products: Product[],
  vendors: Vendor[],
  categories: Category[]
) {
  useEffect(() => {
    const isPublic = !["admin", "tracking", "checkout", "auth"].includes(currentScreen);
    
    let title = "Naija Online Stores - #1 Online Shopping Marketplace in Nigeria";
    let desc = "Experience secure, verified online shopping Nigeria. Buy electronics online Nigeria, high-quality fashion wear, devices, and cosmetics on Naija Online Stores — Nigeria's trusted online stores with automated escrow checks.";
    let keywords = "Naija online stores, naija online store, online shopping in Nigeria, buy online Nigeria, Nigerian marketplace, E-commerce Nigeria, online store Nigeria, Lagos shopping, Abuja shopping, Nigeria online shops";
    let robots = isPublic ? "index, follow" : "noindex, nofollow";
    let imageUrl = "https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png";
    let ogType = "website";

    const slugifyLocal = (text: string) => text.toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-");

    // Dynamic Title & Description customization
    if (currentScreen === "shop") {
      if (initialCategory && initialCategory !== "all") {
        const catObj = categories.find(c => c.id === initialCategory);
        if (catObj) {
          title = `${catObj.name} | Buy Authentic Products Online | Naija Online Stores`;
          desc = `Shop premium ${catObj.name.toLowerCase()} collections online in Nigeria. Verified merchants, escrow logistics protection, and nationwide delivery supported on Naija Online Stores.`;
          keywords = `${catObj.name.toLowerCase()} nigeria, buy ${catObj.name.toLowerCase()} online nigeria, naija online stores ${catObj.name.toLowerCase()}, shop ${catObj.name.toLowerCase()} online`;
        } else {
          title = `${initialCategory.charAt(0).toUpperCase() + initialCategory.slice(1)} | Shop Online Nigeria | Naija Online Stores`;
        }
      } else {
        title = "Shop Direct From Verified Local Wholesalers | Naija Online Stores";
      }
    } else if (currentScreen === "details" && selectedProductId) {
      const prod = products.find(p => p.id === selectedProductId);
      if (prod) {
        title = `Buy ${prod.title} Online Nigeria | Best Wholesale Price - Naija Online Stores`;
        desc = `Order ${prod.title} by ${prod.vendorName} on Naija Online Stores. Rating: ${prod.rating} ★ (${prod.reviewsCount} verified reviews). Secure escrow payment, prompt shipping. Shop now!`;
        keywords = `${prod.title.toLowerCase()}, buy ${prod.title.toLowerCase()} nigeria, naija online stores ${prod.title.toLowerCase()}, ${prod.category?.toLowerCase() || 'products'} nigeria`;
        if (prod.image) imageUrl = prod.image;
        ogType = "product";
      }
    } else if (currentScreen === "vendor" && selectedVendorSlug) {
      const vend = vendors.find(v => slugifyLocal(v.name) === selectedVendorSlug || v.id === selectedVendorSlug);
      if (vend) {
        title = `${vend.name} Storefront | Verified Wholesale Merchant | Naija Online Stores`;
        desc = `Shop directly from ${vend.name} official store in ${vend.location}. Browse wholesale catalog and purchase with automated delivery escrow on Naija Online Stores.`;
        keywords = `${vend.name.toLowerCase()}, ${vend.name.toLowerCase()} nigeria, naija online stores ${vend.name.toLowerCase()}, buy from ${vend.name.toLowerCase()}`;
        if (vend.avatar) imageUrl = vend.avatar;
      }
    } else if (currentScreen === "admin" || currentScreen === "tracking") {
      title = "Dashboard | Naija Online Stores";
    } else if (currentScreen === "about") {
      title = "About Naija Online Stores | Nigeria's #1 Online Shopping Marketplace";
      desc = "Learn about Naija Online Stores, Nigeria's premier ecommerce platform. We connect buyers with verified local sellers, providing secure payments, buyer protection, and nationwide delivery.";
      keywords = "about naija online stores, who we are, naija online marketplace, trusted nigerian ecommerce, sell online nigeria";
    } else if (currentScreen === "contact") {
      title = "Contact Naija Online Stores | 24/7 Customer Support";
      desc = "Get in touch with Naija Online Stores for customer support, seller inquiries, and partnerships. We're here to make your online shopping experience in Nigeria seamless.";
      keywords = "contact naija online stores, customer care, support, nigerian ecommerce support";
    } else if (currentScreen === "sell") {
      title = "Sell on Naija Online Stores | Start Selling Online in Nigeria";
      desc = "Join thousands of verified merchants selling on Naija Online Stores. Open your online store today, reach millions of buyers across Nigeria, and grow your business.";
      keywords = "sell on naija online stores, merchant signup, open online store nigeria, sell online, seller center";
    } else if (currentScreen === "faq") {
      title = "Frequently Asked Questions | Naija Online Stores Help Center";
      desc = "Find answers to frequently asked questions about shopping, payments, buyer protection, delivery, and returns on Naija Online Stores.";
      keywords = "faq, help center, how to buy, naija online stores help, delivery questions";
    }

    // Update <title>
    document.title = title;

    // Update Meta Tags
    const setMeta = (name: string, content: string, property: boolean = false) => {
      let el = document.querySelector(property ? `meta[property="${name}"]` : `meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        if (property) el.setAttribute("property", name);
        else el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", desc);
    setMeta("keywords", keywords);
    setMeta("robots", robots);
    setMeta("og:title", title, true);
    setMeta("og:description", desc, true);
    setMeta("og:url", window.location.href, true);
    setMeta("og:image", imageUrl, true);
    setMeta("og:type", ogType, true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", desc);
    setMeta("twitter:image", imageUrl);

    // Update Canonical
    let canonical = document.querySelector("link[rel='canonical']");
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href.split("?")[0]);
    
    // Structured Data (JSON-LD)
    let jsonLd = document.querySelector("#json-ld-seo");
    if (!jsonLd) {
      jsonLd = document.createElement("script");
      jsonLd.id = "json-ld-seo";
      jsonLd.setAttribute("type", "application/ld+json");
      document.head.appendChild(jsonLd);
    }
    
    // Base Schema defaults to Organization & Website (Tasks 4 & 5)
    let schemaObj: any = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Organization",
          "@id": "https://www.naijaonlinestores.com.ng/#organization",
          "name": "Naija Online Stores",
          "url": "https://www.naijaonlinestores.com.ng",
          "logo": "https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png",
          "sameAs": [
            "https://facebook.com/naijaonlinestores",
            "https://twitter.com/naijaonlinestores"
          ]
        },
        {
          "@type": "WebSite",
          "@id": "https://www.naijaonlinestores.com.ng/#website",
          "url": "https://www.naijaonlinestores.com.ng",
          "name": "Naija Online Stores",
          "description": "Multi-vendor ecommerce marketplace in Nigeria connecting shoppers to verified wholesale merchants"
        },
        {
          "@type": "WebPage",
          "@id": `${window.location.href}#webpage`,
          "url": window.location.href,
          "name": title,
          "description": desc,
          "isPartOf": { "@id": "https://www.naijaonlinestores.com.ng/#website" },
          "about": { "@id": "https://www.naijaonlinestores.com.ng/#organization" }
        }
      ]
    };

    if (currentScreen === "home") {
      schemaObj["@graph"].push({
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What is Naija Online Stores?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Naija Online Stores is a premium multi-vendor e-commerce marketplace in Nigeria where you can buy electronics, fashion, and more securely from verified local wholesalers."
            }
          },
          {
            "@type": "Question",
            "name": "How does secure payment work?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We use an automated escrow system. Your payment is held securely and only released to the vendor after you confirm successful delivery."
            }
          },
          {
            "@type": "Question",
            "name": "Do you offer nationwide delivery in Nigeria?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, we partner with top logistics providers to ensure fast and secure nationwide delivery across Nigeria."
            }
          }
        ]
      });
    }

    // Product Schema (Task 2 & 5) and Breadcrumb Schema (Task 6)
    if (currentScreen === "details" && selectedProductId) {
       const prod = products.find(p => p.id === selectedProductId);
       if (prod) {
          schemaObj = {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Product",
                "@id": `https://www.naijaonlinestores.com.ng/product/${prod.id}#product`,
                "name": prod.title,
                "description": prod.description || desc,
                "image": prod.image || "https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png",
                "sku": prod.id,
                "offers": {
                  "@type": "Offer",
                  "priceCurrency": "NGN",
                  "price": prod.price,
                  "itemCondition": prod.condition === "New" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
                  "availability": prod.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                  "url": window.location.href,
                  "seller": {
                    "@type": "Organization",
                    "name": prod.vendorName
                  }
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": prod.rating || 4.7,
                  "reviewCount": prod.reviewsCount || 15
                }
              },
              {
                "@type": "BreadcrumbList",
                "@id": `https://www.naijaonlinestores.com.ng/product/${prod.id}#breadcrumb`,
                "itemListElement": [
                  { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.naijaonlinestores.com.ng" },
                  { "@type": "ListItem", "position": 2, "name": prod.category || "Shop", "item": `https://www.naijaonlinestores.com.ng/${prod.category ? slugifyLocal(prod.category) : "shop"}` },
                  { "@type": "ListItem", "position": 3, "name": prod.title, "item": window.location.href }
                ]
              }
            ]
          };
       }
    } 
    // Category Breadcrumb Schema
    else if (currentScreen === "shop" && initialCategory && initialCategory !== "all") {
       const catObj = categories.find(c => c.id === initialCategory);
       const catName = catObj ? catObj.name : (initialCategory.charAt(0).toUpperCase() + initialCategory.slice(1));
       schemaObj = {
         "@context": "https://schema.org",
         "@graph": [
           {
             "@type": "CollectionPage",
             "name": catName,
             "description": desc,
             "url": window.location.href
           },
           {
             "@type": "BreadcrumbList",
             "@id": `${window.location.href}#breadcrumb`,
             "itemListElement": [
               { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.naijaonlinestores.com.ng" },
               { "@type": "ListItem", "position": 2, "name": catName, "item": window.location.href }
             ]
           }
         ]
       };
    }
    // Vendor Storefront & Aggregate Rating Schema (Task 3 & Task 7)
    else if (currentScreen === "vendor" && selectedVendorSlug) {
       const vend = vendors.find(v => slugifyLocal(v.name) === selectedVendorSlug || v.id === selectedVendorSlug);
       if (vend) {
         schemaObj = {
           "@context": "https://schema.org",
           "@graph": [
             {
               "@type": "Store",
               "@id": `https://www.naijaonlinestores.com.ng/vendor/${selectedVendorSlug}#store`,
               "name": vend.name,
               "description": desc,
               "image": vend.avatar || "https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png",
               "telephone": vend.phone,
               "email": vend.email,
               "address": {
                 "@type": "PostalAddress",
                 "addressLocality": vend.location,
                 "addressCountry": "NG"
               },
               "aggregateRating": {
                 "@type": "AggregateRating",
                 "ratingValue": vend.rating || 4.7,
                 "ratingCount": vend.ratingCount || 100
               }
             },
             {
               "@type": "BreadcrumbList",
               "@id": `https://www.naijaonlinestores.com.ng/vendor/${selectedVendorSlug}#breadcrumb`,
               "itemListElement": [
                 { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.naijaonlinestores.com.ng" },
                 { "@type": "ListItem", "position": 2, "name": "Vendors", "item": "https://www.naijaonlinestores.com.ng/shop" },
                 { "@type": "ListItem", "position": 3, "name": vend.name, "item": window.location.href }
               ]
             }
           ]
         };
       }
    } else if (currentScreen === "faq") {
      schemaObj["@graph"].push({
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Is Naija Online Stores secure?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, we use a secure escrow payment system to ensure buyers are protected. Funds are only released to sellers after successful delivery."
            }
          },
          {
            "@type": "Question",
            "name": "How long does delivery take?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Delivery times vary depending on the seller and location, but generally range from 1 to 5 business days within Nigeria."
            }
          },
          {
            "@type": "Question",
            "name": "How do I become a seller?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "You can register as a seller by navigating to our 'Sell on Naija Online Stores' page, creating an account, and verifying your business."
            }
          }
        ]
      });
      schemaObj["@graph"].push({
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.naijaonlinestores.com.ng" },
          { "@type": "ListItem", "position": 2, "name": "FAQ", "item": window.location.href }
        ]
      });
    } else if (["about", "contact", "sell"].includes(currentScreen)) {
       const screenNameMap: Record<string, string> = {
         about: "About Us",
         contact: "Contact Us",
         sell: "Sell on Naija Online Stores"
       };
       schemaObj["@graph"].push({
         "@type": "WebPage",
         "name": screenNameMap[currentScreen],
         "description": desc,
         "url": window.location.href
       });
       schemaObj["@graph"].push({
         "@type": "BreadcrumbList",
         "itemListElement": [
           { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.naijaonlinestores.com.ng" },
           { "@type": "ListItem", "position": 2, "name": screenNameMap[currentScreen], "item": window.location.href }
         ]
       });
    }

    jsonLd.textContent = JSON.stringify(schemaObj);
    
  }, [currentScreen, selectedProductId, initialCategory, selectedVendorSlug, products, vendors, categories]);
}
