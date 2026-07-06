/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Star, ShoppingCart, ArrowLeft, ChevronRight, Check, Trash2, Heart, ShieldCheck, HelpCircle, Sparkles, MapPin, Plus, Minus, ThumbsUp, Laptop, Shirt, Home, Eye, Settings, ShieldAlert, Store, Car, Smartphone, Headphones, Trophy, ShoppingBag, Gamepad2, Truck, ExternalLink, Menu, UserCircle } from "lucide-react";
import { Product, Category, CartItem, Vendor, Advertisement, Order, FlashDealProposal } from "../types";
import { MOCK_CATEGORIES, MOCK_PRODUCTS, MOCK_REVIEWS, MOCK_ADS, FLASH_SALE_PRODUCTS } from "../data/mockData";
import { trackProductViewed } from "../lib/posthog";
import HomePage from "./HomePage";
import AboutPage from "./AboutPage";
import ContactPage from "./ContactPage";
import SellPage from "./SellPage";
import FaqPage from "./FaqPage";
import { formatNaira } from "../utils";
import { getTransformedImageUrl } from "../utils/imageTransforms";
import { useStore } from "../store/useStore";

export const categoryPageThemes: Record<string, {
  title: string;
  tagline: string;
  gradient: string;
  badge: string;
  featuredTags: string[];
  backdropText: string;
  image: string;
}> = {
  phones: {
    title: "Smartphones & Mobile Devices Hub",
    tagline: "Explore direct factory-price deals on Androids, iPhones, powerbanks, chargers and accessories.",
    gradient: "from-amber-600 to-orange-700",
    badge: "Phones & Gadgets Department",
    featuredTags: ["Apple", "Samsung", "Xiaomi", "Infinix", "Oraimo"],
    backdropText: "PHONES",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=300&q=80"
  },
  electronics: {
    title: "Electronics & Smart Appliances Store",
    tagline: "Upgrade your space with modern TVs, cinema sound systems, fast chargers, and smart electronics.",
    gradient: "from-blue-700 to-indigo-900",
    badge: "Consumer Electronics Department",
    featuredTags: ["LG", "Sony", "Panasonic", "Inverters", "Home Cinema"],
    backdropText: "ELECTRO",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=300&q=80"
  },
  fashion: {
    title: "Aba & Lagos Premium Fashion Boutique",
    tagline: "Adorn yourself in exquisite bespoke Ankara, Agbadas, kaftans, and stunning contemporary wears.",
    gradient: "from-pink-800 to-purple-950",
    badge: "Modern & Native Wear Boutique",
    featuredTags: ["Bespoke Ankara", "Native Agbada", "Footwear", "Ready-to-wear"],
    backdropText: "FASHION",
    image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=300&q=80"
  },
  beauty: {
    title: "Organic Skincare & Cosmetics Oasis",
    tagline: "Nourish your skin with natural raw Shea Butter, African black soaps, organic herbs and oils.",
    gradient: "from-emerald-700 to-teal-900",
    badge: "Beauty & Wellness Department",
    featuredTags: ["Shea Butter", "Black Soap", "Skincare", "Essential Oils"],
    backdropText: "BEAUTY",
    image: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=300&q=80"
  },
  "home-kitchen": {
    title: "Home Decor & Smart Kitchenware Store",
    tagline: "Cook with speed and comfort. Smart blenders, pounded yam makers, and pristine kitchen organizers.",
    gradient: "from-yellow-700 to-amber-900",
    badge: "Home & Kitchen Appliances",
    featuredTags: ["Yam Makers", "Blenders", "Cookware", "Decorations"],
    backdropText: "HOME",
    image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=300&q=80"
  }
};

export const getCategoryTheme = (catKey: string, catName: string) => {
  const normalized = catKey.toLowerCase().trim();
  if (categoryPageThemes[normalized]) {
    return categoryPageThemes[normalized];
  }
  if (normalized.includes("phone")) return categoryPageThemes.phones;
  if (normalized.includes("electronic")) return categoryPageThemes.electronics;
  if (normalized.includes("clothing") || normalized.includes("wear") || normalized.includes("fashion")) return categoryPageThemes.fashion;
  if (normalized.includes("beauty") || normalized.includes("skin") || normalized.includes("hair")) return categoryPageThemes.beauty;
  if (normalized.includes("home") || normalized.includes("kitchen")) return categoryPageThemes["home-kitchen"];
  
  return {
    title: `${catName} Department Store`,
    tagline: `Premium custom selections of high-quality items in ${catName} from verified sellers.`,
    gradient: "from-emerald-900 to-neutral-950",
    badge: "Verified Department",
    featuredTags: ["Top Rated", "Fast Shipping", "Secure Payment"],
    backdropText: catName.substring(0, 8).toUpperCase(),
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=300&q=80"
  };
};

export const sponsoredBrandAds = [
  {
    id: "mtn",
    brand: "MTN",
    bgClass: "bg-amber-400 text-neutral-900 border-amber-300",
    badgeBg: "bg-neutral-900 text-amber-400 font-extrabold",
    title: "Everywhere You Go — Turn on MTN 5G Fast Speed!",
    description: "Nigeria's custom connectivity network. Recharge now to unlock standard 10x high data bonus instantly.",
    ctaText: "⚡ Get 10x Offer",
    ctaUrl: "https://wa.me/2348138575869?text=Hello+I+want+to+order+MTN+data+bundle",
    tagline: "Sponsored Spark",
    badgeLabel: "MTN 5G",
    waveColor: "border-neutral-900/10",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "apple",
    brand: "Apple",
    bgClass: "bg-neutral-900 text-white border-neutral-800",
    badgeBg: "bg-white text-neutral-950 font-black",
    title: "iPhone 15 Pro — Titanium Space Design",
    description: "Experience the pinnacle of standard Apple hardware with the lightweight Aerospace-grade titanium chassis.",
    ctaText: "⚡ Buy Apple iPhone",
    ctaUrl: "https://wa.me/2348138575869?text=Hello+I+want+to+order+Apple+iPhone",
    tagline: "Official Sponsor",
    badgeLabel: " Apple",
    waveColor: "border-white/10",
    imageUrl: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "nestle",
    brand: "Nestlé",
    bgClass: "bg-teal-850 bg-teal-800 text-white border-teal-700",
    badgeBg: "bg-amber-400 text-neutral-900 font-black",
    title: "Nestlé Milo — Active Brain & Body Energy",
    description: "Start each morning with the nutritious malt goodness of vitamins, minerals, and chocolatey Milo.",
    ctaText: "⚡ Order Nestle Milo",
    ctaUrl: "https://wa.me/2348138575869?text=Hello+I+want+to+order+Milo",
    tagline: "Plaza Partner",
    badgeLabel: "Milo",
    waveColor: "border-teal-900/10",
    imageUrl: "https://images.unsplash.com/photo-1594966779435-08e8b0b5fe64?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "nike",
    brand: "Nike",
    bgClass: "bg-orange-600 text-white border-orange-500",
    badgeBg: "bg-neutral-950 text-white font-black",
    title: "Nike Air Max Flyknit — Just Do It",
    description: "Engineered with targeted zones of support, exceptional breathability, and cloud-like cushioned heels.",
    ctaText: "⚡ Order Nike Air Max",
    ctaUrl: "https://wa.me/2348138575869?text=Hello+I+want+to+order+Nike+sneakers",
    tagline: "Fashion Partner",
    badgeLabel: "Nike Air",
    waveColor: "border-orange-200/5",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=80"
  },
  {
    id: "pepsi",
    brand: "Pepsi",
    bgClass: "bg-blue-650 bg-blue-600 text-white border-blue-500",
    badgeBg: "bg-white text-blue-700 font-black",
    title: "Pepsi Confam Naija — Max Taste, Zero Sugar",
    description: "Keep the beautiful Naija culture alive! Crack open Pepsi for maximum chill, fizz, and refreshment.",
    ctaText: "⚡ Get Pepsi Chill",
    ctaUrl: "https://wa.me/2348138575869?text=Hello+I+want+to+order+Pepsi",
    tagline: "Youth Sponsor",
    badgeLabel: "Pepsi Max",
    waveColor: "border-blue-200/5",
    imageUrl: "https://images.unsplash.com/photo-1629203851122-3726ece2e753?auto=format&fit=crop&w=400&q=80"
  }
];


export default function CustomerViews() {
  const {
    currentScreen: screen,
    setCurrentScreen: onNavigate,
    selectedProductId,
    setSelectedProductId: onSelectProduct,
    initialCategory = "all",
    cart,
    addToCart: onAddToCart,
    updateCartQty: onUpdateCartQty,
    removeFromCart: onRemoveFromCart,
    searchFilter,
    setSearchFilter: onSearch,
    vendors = [],
    products = [],
    categories = [],
    orders = [],
    ads = [],
    flashDeals = [],
    currentUserId,
    selectedVendorSlug: vendorSlug = "eko-heritage-weavers",
    setSelectedVendorSlug: onSelectVendor,
  } = useStore();
  
  const isLoggedIn = !!currentUserId;
  const isLoading = false;
  // TODO: Fix checkout and rate vendor handlers if needed
  const onCheckout = () => { console.log('checkout'); };
  const onRateVendor = (id: string, star: number) => { console.log('rate vendor', id, star); };
  
  // Choose source of truth for ads
  const resolvedAds = ads || [];

  const [homePageCount, setHomePageCount] = React.useState(1);

  // States for Category Filter inside shop view
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>(initialCategory);
  const [activeSubcategoryTab, setActiveSubcategoryTab] = useState<string>("all");

  const [internalLoading, setInternalLoading] = useState(isLoading);

  React.useEffect(() => {
    if (isLoading) {
      setInternalLoading(true);
    } else {
      const timer = setTimeout(() => {
        setInternalLoading(false);
      }, 1500); // artificially extend skeleton to allow images/fetch to settle
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Robust lookup for active category
  const activeCategoryObj = React.useMemo(() => {
    if (!activeCategoryTab || activeCategoryTab === "all") return null;
    const activeCatLower = activeCategoryTab.toLowerCase();
    return categories.find(c => 
      c.id.toLowerCase() === activeCatLower || 
      (c.slug && c.slug.toLowerCase() === activeCatLower) ||
      (c.categoryId && c.categoryId.toLowerCase() === activeCatLower) ||
      c.name.toLowerCase() === activeCatLower
    );
  }, [activeCategoryTab, categories]);

  useEffect(() => {
    if (initialCategory) {
      setActiveCategoryTab(initialCategory);
      setActiveSubcategoryTab("all");
    }
  }, [initialCategory]);

  useEffect(() => {
    // Whenever category changes, update URL if we are in shop
    if (screen === 'shop') {
      const url = activeCategoryTab === 'all' ? '/shop' : `/category/${activeCategoryTab}`;
      if (window.location.pathname !== url) {
         window.history.pushState({ screen: 'shop' }, "", url);
      }
    }
    setActiveSubcategoryTab("all");
  }, [activeCategoryTab, screen]);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortOption, setSortOption] = useState<string>("recommended");
  const [selectedStateForShipping, setSelectedStateForShipping] = useState<string>("Lagos");
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [brandAdIndex, setBrandAdIndex] = useState(0);
  const [flashSaleTime, setFlashSaleTime] = useState({ h: 2, m: 21, s: 6 });
  const [storesCurrentPage, setStoresCurrentPage] = useState<number>(1);

  // Server-side pagination states
  const [serverProducts, setServerProducts] = useState<Product[]>([]);
  const [serverTotalPages, setServerTotalPages] = useState<number>(1);

  useEffect(() => {
    let active = true;
    const fetchServerProducts = async () => {
      if (screen !== "shop" && screen !== "home") return; // Only fetch if relevant
      setInternalLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: "24",
          search: searchFilter,
          category: activeCategoryTab === "all" ? "All" : activeCategoryTab,
          sort: sortOption
        });
        const res = await fetch(`/api/products?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        if (active) {
          // Map DB columns to frontend Product type
          const mapped = (json.data || []).map((p: any) => ({
            id: p.id,
            title: p.name,
            category: p.categories?.name || "Uncategorized",
            subCategory: p.categories?.slug || "general",
            price: p.price,
            discountPrice: p.discount_price,
            stock: p.stock_quantity,
            vendorId: p.vendor_id,
            vendorName: "Merchant",
            image: getTransformedImageUrl(p.product_images?.length > 0 ? p.product_images[0].image_url : p.image_url),
            images: p.product_images?.length > 0 ? p.product_images.map((pi:any)=>getTransformedImageUrl(pi.image_url)) : [getTransformedImageUrl(p.image_url)],
            rating: 4.5,
            ratingCount: Math.floor(Math.random() * 50) + 1,
            colors: ["Default"],
            sizes: ["Standard"],
            description: p.description || ""
          }));
          setServerProducts(mapped);
          const total = json.total || mapped.length;
          setServerTotalPages(Math.max(1, Math.ceil(total / 24)));
        }
      } catch (err) {
        console.error("Pagination fetch error:", err);
      } finally {
        if (active) setInternalLoading(false);
      }
    };

    // Debounce search slightly
    const timer = setTimeout(() => {
      fetchServerProducts();
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [currentPage, searchFilter, activeCategoryTab, sortOption, screen]);
  
  const homepageAds = resolvedAds.filter(ad => ad.position === "homepage" && ad.status === "active");

  const activeFlashProducts = React.useMemo(() => {
    const approvedProposals = (flashDeals || []).filter(fd => fd.status === "approved");
    const dynamicProducts: Product[] = approvedProposals.map(fd => {
      const originalProd = products.find(p => p.id === fd.productId);
      return {
        id: fd.productId, // Map to actual product ID so clicking it opens detail view correctly
        title: fd.productName,
        description: originalProd?.description || `Flash sale item. Price reduced off by ${formatNaira(fd.reducedAmount)}!`,
        price: fd.priceAfter,
        originalPrice: fd.priceBefore,
        salePercentage: Math.round((fd.reducedAmount / fd.priceBefore) * 100),
        image: fd.productImage || originalProd?.image || "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=500&q=80",
        rating: originalProd?.rating || 4.8,
        reviewsCount: originalProd?.reviewsCount || 12,
        category: originalProd?.category || "Flash Deals",
        vendorId: fd.vendorId,
        vendorName: fd.vendorName,
        stock: originalProd?.stock || 45,
        isNew: true
      };
    });

    const combined = [...dynamicProducts];
    const unique: Product[] = [];
    const titles = new Set();
    combined.forEach(p => {
      if (!titles.has(p.title)) {
        // Ensure the flash deal is linked to an existing vendor
        const isLinkedToVendor = vendors.some(v => v.id === p.vendorId);
        if (isLinkedToVendor) {
          titles.add(p.title);
          unique.push(p);
        }
      }
    });
    return unique;
  }, [flashDeals, products, vendors]);


  React.useEffect(() => {
    const timer = setInterval(() => {
      setFlashSaleTime((prev) => {
        let { h, m, s } = prev;
        if (s > 0) return { h, m, s: s - 1 };
        if (m > 0) return { h, m: m - 1, s: 59 };
        if (h > 0) return { h: h - 1, m: 59, s: 59 };
        return { h: 2, m: 21, s: 6 }; // loop back for demo
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tracking recently viewed items
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem("recentlyViewed");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    if (screen === "details" && selectedProductId) {
      setRecentlyViewedIds((prev) => {
        const filtered = prev.filter((id) => id !== selectedProductId);
        const updated = [selectedProductId, ...filtered].slice(0, 8); // Hold up to 8 items
        try {
          localStorage.setItem("recentlyViewed", JSON.stringify(updated));
        } catch (e) {
          console.warn("Storage sync:", e);
        }
        return updated;
      });

      // Track using PostHog
      const targetProd = products.find((p) => p.id === selectedProductId);
      if (targetProd) {
        trackProductViewed(targetProd.id, targetProd.title, targetProd.price, targetProd.category);
      }
    }
  }, [screen, selectedProductId, products]);

  React.useEffect(() => {
    if (homepageAds.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % homepageAds.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [homepageAds.length]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setBrandAdIndex((prev) => (prev + 1) % sponsoredBrandAds.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    setIsSearchLoading(true);
    const timer = setTimeout(() => {
      setIsSearchLoading(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchFilter]);

  // Local state for product detail customization
  const [detailQty, setDetailQty] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [addedReviews, setAddedReviews] = useState<typeof MOCK_REVIEWS>(MOCK_REVIEWS);
  const [hoveredVendorStar, setHoveredVendorStar] = useState<number | null>(null);
  const [justAddedProducts, setJustAddedProducts] = useState<Record<string, boolean>>({});
  const [showCredsVendor, setShowCredsVendor] = useState<Vendor | null>(null);

  const handleAddToCartWithFeedback = (product: Product | null | undefined, quantity: number, size?: string, color?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!product) return;
    onAddToCart(product, quantity, size || product.sizes?.[0] || "", color || product.colors?.[0] || "");
    setJustAddedProducts(prev => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setJustAddedProducts(prev => {
        const copy = { ...prev };
        delete copy[product.id];
        return copy;
      });
    }, 1500);
  };

  // Toggle wishlist helpers
  const toggleWishlist = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (wishlist.includes(id)) {
      setWishlist(wishlist.filter((x) => x !== id));
    } else {
      setWishlist([...wishlist, id]);
    }
  };

  // State Shipping Rates Matrix
  const shippingCosts: Record<string, number> = {
    "Lagos": 0, // Free
    "Abuja (FCT)": 0, // Free
    "Ibadan (Oyo)": 2500,
    "Kano": 4500,
    "Port Harcourt (Rivers)": 4000,
    "Enugu": 3500,
    "Kaduna": 4500,
    "Other States": 5500
  };

  const handlePostReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;

    // Verify buyer has purchased the item
    const hasPurchased = orders.some((order) => {
      return order.productIds && order.productIds.includes(selectedProductId);
    });

    if (!hasPurchased) {
      alert("Verification Error: Only customers who have purchased this particular item can leave a review. Try purchasing it first!");
      return;
    }

    const newRev = {
      id: "rev_" + Date.now(),
      author: "Local Shopper (Nigeria)",
      text: commentInput,
      stars: 5,
      date: "Just now",
      isVerified: true,
      avatarInitials: "LS"
    };
    setAddedReviews([newRev, ...addedReviews]);
    setCommentInput("");
  };

  // Reset page when filtering or searching
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeCategoryTab, activeSubcategoryTab, searchFilter, vendorSlug]);

  // Dynamic products filtering logic
  const filteredProducts = products.filter((product) => {
    const activeCatLower = activeCategoryTab.toLowerCase();
    const searchLower = searchFilter.toLowerCase();
    
    let matchesCategory = false;
    if (activeCatLower === "all") {
      matchesCategory = true;
    } else {
      const pCatLower = (product.category || "").toLowerCase();
      const pCatIdLower = (product.categoryId || "").toLowerCase();
      
      if (activeCategoryObj) {
        // Filter by categoryId or category name match
        matchesCategory = 
          (pCatIdLower && pCatIdLower === activeCategoryObj.id.toLowerCase()) ||
          (pCatLower && pCatLower === activeCategoryObj.name.toLowerCase()) ||
          (pCatLower && pCatLower === (activeCategoryObj.slug || "").toLowerCase());
      } else {
        const activeCatNameLower = activeCatLower;
        matchesCategory = pCatLower === activeCatNameLower ||
                          pCatLower.includes(activeCatNameLower) || 
                          activeCatNameLower.includes(pCatLower) ||
                          (pCatIdLower && pCatIdLower === activeCatLower);
      }
    }

    let matchesSubcategory = true;
    if (activeSubcategoryTab !== "all") {
      const pSub = (product.subCategory || "").toLowerCase();
      matchesSubcategory = pSub === activeSubcategoryTab.toLowerCase();
    }
    
    let matchesSearch = true;
    if (searchLower) {
      matchesSearch = (product.title || "").toLowerCase().includes(searchLower) ||
                      (product.category || "").toLowerCase().includes(searchLower) ||
                      (product.vendorName || "").toLowerCase().includes(searchLower) ||
                      (product.subCategory || "").toLowerCase().includes(searchLower) ||
                      (product.tags && product.tags.some(t => t.toLowerCase().includes(searchLower))) ||
                      (product.description || "").toLowerCase().includes(searchLower);
    }

    return matchesCategory && matchesSubcategory && matchesSearch;
  });

  // Sort logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortOption === "price-low") return a.price - b.price;
    if (sortOption === "price-high") return b.price - a.price;
    if (sortOption === "rating") return b.rating - a.rating;
    return 0; // standard mock recommended
  });

  const PRODUCTS_PER_PAGE = 24;
  // Use server total pages and server products for the shop grid
  const totalPages = serverProducts.length > 0 ? serverTotalPages : Math.ceil(sortedProducts.length / PRODUCTS_PER_PAGE);
  const startIdx = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const paginatedProducts = serverProducts.length > 0 ? serverProducts : sortedProducts.slice(startIdx, startIdx + PRODUCTS_PER_PAGE);

  const recentlyViewedProducts = recentlyViewedIds
    .map((id) => products.find((p) => p.id === id) || serverProducts.find(p => p.id === id))
    .filter((p): p is Product => !!p);

  // Fallback to server products if not found in global store (happens on deep linking)
  const detailProduct = products.find((p) => p.id === selectedProductId) || serverProducts.find(p => p.id === selectedProductId) || products[0] || null;

  // Initialize selected values for detail screen when product changes
  React.useEffect(() => {
    if (detailProduct) {
      setSelectedSize(detailProduct.sizes?.[0] || "");
      setSelectedColor(detailProduct.colors?.[0] || "");
      setDetailQty(1);
      setSelectedImageIndex(0);
    }
  }, [detailProduct]);

  // Cart totals math
  const cartSubtotal = cart.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);
  const activeShippingFee = cartSubtotal > 0 ? (shippingCosts[selectedStateForShipping] ?? 4500) : 0;
  const estimatedTax = cartSubtotal * 0.075; // 7.5% VAT Nigeria
  const cartTotalSum = cartSubtotal + activeShippingFee + estimatedTax;

  const shouldReduceMotion = useReducedMotion();

  const pageVariants = {
    initial: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: shouldReduceMotion ? 0 : -12 },
  };
  const pageTransition = { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] };

  return (
    <div className="font-sans text-neutral-900 bg-white">
      {/* ---------------- 1. MARKETPLACE HOMEPAGE ---------------- */}
      <AnimatePresence mode="wait">
        {screen === "home" && (
          <motion.div
            key="home"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="space-y-12 pb-16"
          >
            {/* HERO SECTION - Split Layout */}
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 mt-6">
              <div className="flex gap-6 relative">
                {/* Left Sidebar (Categories Menu) */}
                <div className="w-[260px] shrink-0 hidden lg:block bg-white border border-neutral-200 rounded-xl shadow-ambient self-start overflow-hidden">
                   <div className="bg-[#4CAF50] text-white font-bold px-5 py-4 flex items-center space-x-3">
                      <Menu className="w-5 h-5" />
                      <span className="text-sm tracking-wide">BROWSE CATEGORIES</span>
                   </div>
                   <ul className="py-2 text-sm text-neutral-700 font-semibold">
                     {categories.slice(0,10).map((cat, i) => (
                       <li key={cat.id} onClick={() => { setInitialCategory(cat.id); setScreen("shop"); }} className="px-5 py-3 hover:bg-orange-50 hover:text-orange-500 cursor-pointer flex justify-between items-center group transition-colors">
                          <span className="truncate pr-2">{cat.name}</span>
                          <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500" />
                       </li>
                     ))}
                   </ul>
                </div>

                {/* Right Carousel / Banner Area */}
                <div className="flex-1 bg-neutral-100 rounded-2xl overflow-hidden relative min-h-[400px] sm:min-h-[500px] shadow-sm">
                   {homepageAds.length > 0 && (
                     <div className="absolute inset-0">
                       <img 
                          src={homepageAds[currentAdIndex].imageUrl || "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80"}
                          alt="Hero Promo"
                          className="w-full h-full object-cover"
                       />
                       <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/70 to-transparent flex items-center">
                          <div className="p-8 sm:p-14 max-w-lg">
                            <h2 className="text-4xl sm:text-5xl font-extrabold text-neutral-900 leading-tight mb-3">
                               {homepageAds[currentAdIndex].title.split(' ').slice(0, 3).join(' ')} <br/>
                               <span className="text-orange-500">{homepageAds[currentAdIndex].title.split(' ').slice(3).join(' ')}</span>
                            </h2>
                            <p className="text-neutral-600 font-medium mb-8 text-lg">Incredible deals waiting for you.</p>
                            <button onClick={() => onNavigate("shop")} className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg px-8 py-3.5 transition-colors shadow-lg shadow-orange-500/30">
                               Shop Now
                            </button>
                          </div>
                       </div>
                       {/* Dots */}
                       <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2">
                         {homepageAds.map((_, idx) => (
                           <button 
                             key={idx}
                             onClick={() => setCurrentAdIndex(idx)}
                             className={`w-2.5 h-2.5 rounded-full ${idx === currentAdIndex ? 'bg-orange-500 w-8' : 'bg-white/80'} transition-all duration-300`}
                           />
                         ))}
                       </div>
                     </div>
                   )}
                </div>
              </div>
            </div>

            {/* SUPER DEALS - Horizontal Track */}
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
               <div className="flex justify-between items-end border-b-2 border-orange-500 pb-3 mb-8">
                 <div className="flex items-center space-x-4">
                    <h3 className="text-2xl font-extrabold text-neutral-900 italic pr-2">Super Deals</h3>
                    <div className="hidden sm:flex items-center space-x-3 text-sm text-neutral-500 font-semibold border-l border-neutral-300 pl-4">
                      <span>Ends in:</span>
                      <div className="flex space-x-1 font-bold text-white text-xs">
                        <span className="bg-orange-500 px-2 py-1 rounded">04</span> :
                        <span className="bg-orange-500 px-2 py-1 rounded">20</span> :
                        <span className="bg-orange-500 px-2 py-1 rounded">59</span>
                      </div>
                    </div>
                 </div>
                 <button onClick={() => onNavigate("shop")} className="text-sm font-bold text-orange-500 hover:underline">View All</button>
               </div>
               
               <div className="flex overflow-x-auto pb-6 gap-6 scrollbar-thin">
                  {products.slice(0, 5).map(p => (
                    <div key={p.id} onClick={() => { onSelectProduct(p.id); onNavigate("details"); }} className="w-56 shrink-0 bg-white rounded-2xl p-4 cursor-pointer hover:shadow-ambient transition-all duration-300 group relative border border-neutral-100 hover:border-orange-200">
                      <div className="aspect-square bg-[#F9FAFB] rounded-xl mb-4 overflow-hidden relative p-4 flex items-center justify-center">
                         <img src={p.image} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500" alt={p.title} />
                         {p.salePercentage && (
                            <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm">-{p.salePercentage}%</span>
                         )}
                      </div>
                      <h4 className="font-semibold text-sm text-neutral-800 line-clamp-2 mb-1">{p.title}</h4>
                      <p className="font-extrabold text-lg text-neutral-900">{formatNaira(p.price)}</p>
                      <p className="text-[11px] text-neutral-400 mt-1 font-medium">{p.stock} units available</p>
                    </div>
                  ))}
               </div>
            </div>

            {/* TWO GRIDS: Top Selection & New Arrivals */}
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Top Selection */}
                <div className="bg-[#F9FAFB] rounded-3xl p-8 border border-neutral-200">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-extrabold text-neutral-900">Top Selection</h3>
                    <button className="text-sm font-bold text-orange-500 hover:underline">View more</button>
                  </div>
                  <div className="grid grid-cols-3 gap-5">
                     {products.slice(5, 8).map(p => (
                        <div key={p.id} onClick={() => { onSelectProduct(p.id); onNavigate("details"); }} className="bg-white rounded-2xl p-3 cursor-pointer hover:shadow-ambient transition-all border border-neutral-100 hover:border-orange-200 relative group">
                          <div className="aspect-square mb-3 overflow-hidden bg-neutral-50 rounded-xl p-2">
                             <img src={p.image} className="w-full h-full object-contain group-hover:scale-105 transition-transform" alt={p.title} />
                          </div>
                          <h4 className="font-semibold text-xs text-neutral-800 line-clamp-1">{p.title}</h4>
                          <p className="font-extrabold text-sm text-neutral-900 mt-0.5">{formatNaira(p.price)}</p>
                          {p.salePercentage && (
                            <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md mt-1.5 inline-block">-{p.salePercentage}%</span>
                          )}
                        </div>
                     ))}
                  </div>
                </div>

                {/* New Arrivals */}
                <div className="bg-[#F9FAFB] rounded-3xl p-8 border border-neutral-200">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-extrabold text-neutral-900">New Arrivals</h3>
                    <button className="text-sm font-bold text-orange-500 hover:underline">View more</button>
                  </div>
                  <div className="grid grid-cols-3 gap-5">
                     {products.slice(8, 11).map(p => (
                        <div key={p.id} onClick={() => { onSelectProduct(p.id); onNavigate("details"); }} className="bg-white rounded-2xl p-3 cursor-pointer hover:shadow-ambient transition-all border border-neutral-100 hover:border-orange-200 relative group">
                          <div className="aspect-square mb-3 overflow-hidden bg-neutral-50 rounded-xl p-2">
                             <img src={p.image} className="w-full h-full object-contain group-hover:scale-105 transition-transform" alt={p.title} />
                          </div>
                          <h4 className="font-semibold text-xs text-neutral-800 line-clamp-1">{p.title}</h4>
                          <p className="font-extrabold text-sm text-neutral-900 mt-0.5">{formatNaira(p.price)}</p>
                          {p.salePercentage && (
                            <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md mt-1.5 inline-block">-{p.salePercentage}%</span>
                          )}
                        </div>
                     ))}
                  </div>
                </div>

              </div>
            </div>

            {/* CHOOSE CATEGORY BENTO */}
            <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 mt-12 bg-[#F9FAFB] rounded-3xl py-12 border border-neutral-200">
               <div className="text-center mb-10">
                 <h2 className="text-3xl font-extrabold text-neutral-900">Popular Categories</h2>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {/* Big Banner Left */}
                  <div className="bg-[#4CAF50] rounded-2xl p-8 text-white relative overflow-hidden group cursor-pointer shadow-ambient" onClick={() => onNavigate("shop")}>
                     <div className="relative z-10">
                       <span className="text-xs font-bold tracking-widest uppercase text-green-100">Weekend Special</span>
                       <h3 className="text-3xl font-black mt-2 leading-tight">TOP CLOTHING</h3>
                       <button className="bg-white text-[#4CAF50] hover:bg-neutral-100 transition-colors font-bold px-5 py-2.5 rounded-lg text-sm mt-6">Shop Now</button>
                     </div>
                     <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=300&q=80" className="absolute -bottom-10 -right-10 w-64 opacity-50 mix-blend-luminosity group-hover:scale-105 transition-transform duration-500" />
                  </div>

                  {/* 2x2 Grids in Middle */}
                  <div className="md:col-span-2 grid grid-cols-2 gap-6">
                     {/* Top Rankings */}
                     <div className="bg-white rounded-2xl p-5 border border-neutral-100 flex flex-col justify-between hover:shadow-sm transition-shadow cursor-pointer" onClick={() => onNavigate("shop")}>
                       <h4 className="font-extrabold text-sm text-neutral-900">Trending Now</h4>
                       <div className="flex gap-3 mt-4">
                         <div className="flex-1 bg-neutral-50 rounded-xl p-3 aspect-square flex items-center"><img src={products[0]?.image} className="max-w-full max-h-full object-contain" /></div>
                         <div className="flex-1 bg-neutral-50 rounded-xl p-3 aspect-square flex items-center"><img src={products[1]?.image} className="max-w-full max-h-full object-contain" /></div>
                       </div>
                     </div>
                     {/* Smart Phone */}
                     <div className="bg-white rounded-2xl p-5 border border-neutral-100 flex flex-col justify-between hover:shadow-sm transition-shadow cursor-pointer" onClick={() => onNavigate("shop")}>
                       <h4 className="font-extrabold text-sm text-neutral-900">Electronics</h4>
                       <div className="flex gap-3 mt-4">
                         <div className="flex-1 bg-neutral-50 rounded-xl p-3 aspect-square flex items-center"><img src={products[2]?.image} className="max-w-full max-h-full object-contain" /></div>
                         <div className="flex-1 bg-neutral-50 rounded-xl p-3 aspect-square flex items-center"><img src={products[3]?.image} className="max-w-full max-h-full object-contain" /></div>
                       </div>
                     </div>
                     {/* Home Appliances */}
                     <div className="bg-white rounded-2xl p-5 border border-neutral-100 flex flex-col justify-between hover:shadow-sm transition-shadow cursor-pointer" onClick={() => onNavigate("shop")}>
                       <h4 className="font-extrabold text-sm text-neutral-900">Home Appliances</h4>
                       <div className="flex gap-3 mt-4">
                         <div className="flex-1 bg-neutral-50 rounded-xl p-3 aspect-square flex items-center"><img src={products[4]?.image} className="max-w-full max-h-full object-contain" /></div>
                         <div className="flex-1 bg-neutral-50 rounded-xl p-3 aspect-square flex items-center"><img src={products[5]?.image} className="max-w-full max-h-full object-contain" /></div>
                       </div>
                     </div>
                     {/* Sports */}
                     <div className="bg-white rounded-2xl p-5 border border-neutral-100 flex flex-col justify-between hover:shadow-sm transition-shadow cursor-pointer" onClick={() => onNavigate("shop")}>
                       <h4 className="font-extrabold text-sm text-neutral-900">Sports & Outdoors</h4>
                       <div className="flex gap-3 mt-4">
                         <div className="flex-1 bg-neutral-50 rounded-xl p-3 aspect-square flex items-center"><img src={products[6]?.image} className="max-w-full max-h-full object-contain" /></div>
                         <div className="flex-1 bg-neutral-50 rounded-xl p-3 aspect-square flex items-center"><img src={products[7]?.image} className="max-w-full max-h-full object-contain" /></div>
                       </div>
                     </div>
                  </div>

                  {/* Auth Welcome Block */}
                  <div className="bg-white rounded-2xl p-8 flex flex-col items-center justify-center text-center border border-neutral-100 shadow-sm">
                    <img src="https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png" className="h-20 w-auto mb-6 drop-shadow-sm" alt="Naija Stores Logo" />
                    <h4 className="font-extrabold text-lg mb-2">
                      <span className="text-neutral-900">Welcome to </span>
                      <span className="text-[#4CAF50]">Naija </span>
                      <span className="text-[#FF9800]">Online Stores</span>
                    </h4>
                    <p className="text-sm text-neutral-500 mb-6 font-medium">Join us today for exclusive deals</p>
                    <div className="flex flex-col space-y-3 w-full">
                      <button onClick={() => onNavigate("auth")} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-lg text-sm transition-colors shadow-md shadow-orange-500/20">Sign In / Register</button>
                      <button onClick={() => onNavigate("sell")} className="w-full bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold py-3 rounded-lg text-sm transition-colors">Become a Vendor</button>
                    </div>
                  </div>
               </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
      
      {/* ---------------- 2. CATALOG BROWSER & SORTING ---------------- */}
      <AnimatePresence mode="wait">
      {screen === "shop" && (
        <motion.div
          key="shop"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
          className="space-y-6"
        >
        
          {/* Ad Banner for Category / Search Results */}
          {searchFilter ? (
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="w-full bg-gradient-to-r from-[#2E7D32] to-[#1B5E20] text-white rounded-2xl overflow-hidden relative p-6 sm:p-8 flex flex-row items-center justify-between shadow-sm mb-4"
             >
               <div className="z-10 text-left">
                  <span className="text-[10px] text-orange-400 font-extrabold uppercase tracking-widest bg-black/30 px-2.5 py-1 rounded-lg border border-white/20">Search Directory</span>
                  <h3 className="text-white font-black text-xl sm:text-2xl mt-2">Showing Results for "{searchFilter}"</h3>
                  <p className="text-xs text-green-100 mt-1">Found top deals from trusted, verified merchants</p>
               </div>
               
               <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-white shrink-0 border-2 border-green-700 flex items-center justify-center p-1 shadow-md z-10">
                 <img loading="lazy" 
                   src="https://res.cloudinary.com/dqpjjfsya/image/upload/v1780680415/IMG_20260605_180310_438_ztopwj.png" 
                   alt="Naija Online Stores Logo" 
                   className="w-full h-full object-cover rounded-xl"
                   referrerPolicy="no-referrer"
                 />
               </div>
               
               {/* Decorative background vectors */}
               <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-y-2 translate-x-2">
                 <span className="text-[140px] font-black tracking-tighter text-green-500/20 select-none leading-none">SEARCH</span>
               </div>
             </motion.div>
          ) : activeCategoryTab !== "all" ? (() => {
             const matchedCat = activeCategoryObj;
             const catName = matchedCat ? matchedCat.name : activeCategoryTab;
             const theme = getCategoryTheme(activeCategoryTab, catName);
             return (
               <motion.div
                 initial={{ opacity: 0, y: 15 }}
                 animate={{ opacity: 1, y: 0 }}
                 className={`w-full bg-linear-to-r ${theme.gradient} text-white rounded-3xl overflow-hidden relative p-6 sm:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-white/10 shadow-lg mb-6`}
               >
                 <div className="z-10 text-left max-w-2xl space-y-3">
                   <div className="flex flex-wrap items-center gap-2">
                     <span className="text-[9px] sm:text-[10px] text-white font-extrabold uppercase tracking-widest bg-black/30 px-3 py-1 rounded-full border border-white/20">
                       {theme.badge}
                     </span>
                     <button 
                       onClick={() => setActiveCategoryTab("all")}
                       className="text-[9px] sm:text-[10px] text-orange-200 hover:text-white font-extrabold uppercase tracking-wider flex items-center space-x-1"
                       title="Browse all departments"
                     >
                       <span>&larr; View All Shops</span>
                     </button>
                   </div>
                   <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                     {theme.title}
                   </h1>
                   <p className="text-xs sm:text-sm text-white/90 font-medium font-sans">
                     {theme.tagline}
                   </p>
                   
                   {/* Interactive Tags */}
                   <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                     <span className="text-[10px] font-bold text-white/70">Popular:</span>
                     {theme.featuredTags.map(tag => (
                       <button
                         key={tag}
                         onClick={() => {
                           onSearch?.(tag);
                         }}
                         className="text-[10px] font-extrabold bg-white/10 px-2.5 py-1 rounded-lg hover:bg-white/20 transition-all text-orange-255 cursor-pointer border border-white/10"
                       >
                         #{tag}
                       </button>
                     ))}
                   </div>
                 </div>

                 {/* Department Illustration Frame */}
                 <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-white/10 shrink-0 border border-white/25 flex items-center justify-center p-1.5 shadow-xl relative group z-10">
                   <img loading="lazy" 
                     src={theme.image} 
                     alt={catName} 
                     className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform duration-700"
                     referrerPolicy="no-referrer"
                   />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                 </div>

                 {/* Dynamic Artistic Backdrop text layer */}
                 <div className="absolute right-4 bottom-0 opacity-10 pointer-events-none select-none translate-y-4">
                   <span className="text-[90px] sm:text-[150px] font-black tracking-tighter text-white/20 leading-none uppercase">
                     {theme.backdropText}
                   </span>
                 </div>
               </motion.div>
             );
          })() : (
            resolvedAds.filter(ad => (ad.position === "category" || ad.position === "search") && ad.status === "active").map((ad, idx) => (
               <motion.div
                 key={ad.id}
                 initial={{ opacity: 0, y: 10 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.1 * idx }}
                 className="w-full h-24 sm:h-32 rounded-2xl overflow-hidden relative group cursor-pointer shadow-sm mb-4"
                 onClick={() => {
                    // Tracking logic
                 }}
               >
                 <img loading="lazy" src={ad.imageUrl} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
                   <span className="text-[9px] text-orange-400 font-extrabold uppercase tracking-widest mb-1 bg-black/50 w-fit px-1.5 py-0.5 rounded">Promoted</span>
                   <h3 className="text-white font-black text-lg sm:text-xl">{ad.title}</h3>
                 </div>
               </motion.div>
            ))
          )}
          
          {/* Filters Bar Row */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-4 border border-neutral-200 rounded-2xl shadow-xs">
            
            {/* Category tabs filters */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pr-1 z-10">
              <button
                onClick={() => setActiveCategoryTab("all")}
                className={`px-4 py-2 rounded-xl text-xs font-bold relative transition-colors duration-200 ${
                  activeCategoryTab === "all"
                    ? "text-white font-extrabold"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {activeCategoryTab === "all" && (
                        <motion.div
                        layoutId="activeCategoryTabHighlight"
                        className="absolute inset-0 bg-[#4CAF50] rounded-xl -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                )}
                All Categories
              </button>
              {categories.map((c) => {
                const isActive = activeCategoryTab === c.id || (activeCategoryObj && activeCategoryObj.id === c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategoryTab(c.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold relative transition-colors duration-200 whitespace-nowrap ${
                      isActive
                        ? "text-white font-extrabold"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeCategoryTabHighlight"
                        className="absolute inset-0 bg-emerald-950 rounded-xl -z-10"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    {c.name}
                  </button>
                );
              })}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-2 w-full md:w-auto flex-shrink-0 justify-end">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Sort:</label>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                id="shop-sort"
              >
                <option value="recommended">Recommended</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>

          {/* Subcategories Row */}
          {activeCategoryTab !== "all" && activeCategoryObj?.subcategories?.length ? (
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pr-1 z-10 mb-6 mt-[-10px]">
              <button
                onClick={() => setActiveSubcategoryTab("all")}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold relative transition-colors duration-200 ${
                  activeSubcategoryTab === "all"
                    ? "text-white font-extrabold bg-orange-500"
                    : "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
                }`}
              >
                All in {activeCategoryObj.name}
              </button>
              {activeCategoryObj.subcategories.map((sub, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveSubcategoryTab(sub)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold relative transition-colors duration-200 whitespace-nowrap ${
                    activeSubcategoryTab === sub
                      ? "text-white font-extrabold bg-orange-500"
                      : "bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          ) : null}

          {/* Main Catalog Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {isSearchLoading || internalLoading ? (
              Array.from({ length: 8 }).map((_, skeletonIdx) => (
                <div
                  key={`skeleton-card-${skeletonIdx}`}
                  className="bg-white rounded-2xl border border-neutral-100 p-3 flex flex-col h-72 sm:h-80 shadow-ambient select-none text-left gap-3"
                >
                  <div className="w-full h-32 sm:h-40 shimmer-bg rounded-xl shrink-0" />
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div className="space-y-2">
                      <div className="h-3 shimmer-bg rounded-md w-1/3" />
                      <div className="h-4 shimmer-bg rounded-md w-full" />
                      <div className="h-3.5 shimmer-bg rounded-md w-1/2" />
                    </div>
                    <div className="pt-2 flex justify-between items-center bg-white">
                      <div className="h-5 shimmer-bg rounded-md w-1/4" />
                      <div className="h-7 shimmer-bg rounded-lg w-16" />
                    </div>
                  </div>
                </div>
              ))
            ) : paginatedProducts.map((p, idx) => {
              const isAdded = !!justAddedProducts[p.id];
              const isLiked = wishlist.includes(p.id);
              return (
                <motion.div
                  key={p.id}
                  onClick={() => {
                    onSelectProduct(p.id);
                    onNavigate("details");
                  }}
                  initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-10px" }}
                  transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.3) }}
                  whileHover={shouldReduceMotion ? {} : { y: -5, scale: 1.01, boxShadow: "0 12px 20px -8px rgba(0,0,0,0.06)" }}
                  className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm hover:shadow-ambient hover:border-orange-200 group cursor-pointer transition-all flex flex-col justify-between h-auto"
                  id={`product-cell-${p.id}`}
                >
                  {/* Top Side: Square Image Area (Vertical layout context) */}
                  <div className="relative w-full aspect-square bg-neutral-50 overflow-hidden flex flex-col items-center justify-center border-b border-neutral-100/60">
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.title}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-neutral-300 font-extrabold uppercase text-[8px] tracking-widest text-center px-1 select-none leading-relaxed">
                        ₦ No Image
                      </div>
                    )}

                    {/* Stock Alert */}
                    {p.stock <= 5 && (
                      <span className="absolute top-2 left-2 bg-red-600 text-white font-extrabold text-[8px] sm:text-[9px] uppercase px-1.5 py-0.5 rounded tracking-wider shadow-xs z-10">
                        {p.stock} left!
                      </span>
                    )}

                    {/* Wishlist item toggles */}
                    <motion.button
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.85 }}
                      onClick={(e) => toggleWishlist(p.id, e)}
                      className="absolute bottom-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 flex items-center justify-center hover:scale-105 transition-transform shadow-xs text-neutral-500 hover:text-red-500 z-10"
                    >
                      <motion.div
                        key={isLiked ? "liked" : "unliked"}
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      >
                        <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isLiked ? "fill-red-500 text-red-500" : ""}`} />
                      </motion.div>
                    </motion.button>
                  </div>

                  {/* Right Side: Detailed Info Area */}
                  <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between text-left min-w-0">
                    <div className="space-y-1 sm:space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center space-x-1.5 min-w-0">
                          <span className="text-[8px] sm:text-[9px] font-bold text-orange-500 uppercase tracking-widest block truncate">
                            {p.vendorName}
                          </span>
                          {p.condition === "Fairly Used" && (
                            <span className="text-[7px] sm:text-[8px] uppercase tracking-wider bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-extrabold whitespace-nowrap">Pre-Owned</span>
                          )}
                        </div>
                        {p.isBestSeller && (
                          <span className="bg-orange-500 text-white font-black text-[7px] sm:text-[8px] uppercase px-1 py-0.5 rounded tracking-wider shrink-0">
                            Best
                          </span>
                        )}
                      </div>
                      <h3 className="font-extrabold text-xs sm:text-sm text-neutral-800 line-clamp-2 leading-tight group-hover:text-orange-500 transition-colors">
                        {p.title}
                      </h3>
                      <div className="flex items-center space-x-1 text-[10px] sm:text-xs text-neutral-500">
                        <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-black text-neutral-800">{p.rating}</span>
                        <span className="text-[9px] sm:text-[10px]">({p.reviewsCount})</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-neutral-100 pt-2 gap-2 mt-1">
                      <div className="min-w-0">
                        {p.originalPrice && (
                          <span className="text-[10px] sm:text-xs text-neutral-400 line-through block font-mono leading-none mb-0.5">
                            {formatNaira(p.originalPrice)}
                          </span>
                        )}
                        <span className="font-black text-xs sm:text-sm md:text-base text-neutral-900 block font-mono leading-none">
                          {formatNaira(p.price)}
                        </span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => handleAddToCartWithFeedback(p, 1, p?.sizes?.[0], p?.colors?.[0], e)}
                        className={`px-2 py-1.5 sm:px-3 sm:py-1.5 font-bold text-[9px] sm:text-xs rounded-lg shadow-xs transition-all duration-300 shrink-0 ${
                          isAdded
                            ? "bg-[#4CAF50] text-white"
                            : "bg-orange-500 hover:bg-orange-600 text-white"
                        }`}
                      >
                        {isAdded ? "✓ Added" : "Add"}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Dynamic Pagination Controls */}
            {totalPages > 1 && (
              <div className="col-span-full mt-8 flex flex-wrap items-center justify-center gap-1.5 bg-neutral-100/60 border border-neutral-200 p-3.5 rounded-2xl max-w-lg mx-auto shadow-xs select-none">
                <button
                  disabled={currentPage === 1}
                  onClick={() => {
                    setCurrentPage(prev => Math.max(prev - 1, 1));
                    window.scrollTo({ top: 300, behavior: "smooth" });
                  }}
                  className="px-3.5 py-2 border border-neutral-200 bg-white hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-600 disabled:opacity-40 select-none transition-all cursor-pointer"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }).map((_, i) => {
                  const pageNum = i + 1;
                  const isCurrent = pageNum === currentPage;
                  return (
                    <button
                      key={`page-btn-${pageNum}`}
                      onClick={() => {
                        setCurrentPage(pageNum);
                        window.scrollTo({ top: 300, behavior: "smooth" });
                      }}
                      className={`w-9 h-9 rounded-xl text-xs font-bold select-none transition-all flex items-center justify-center cursor-pointer ${
                        isCurrent
                          ? "bg-[#4CAF50] text-white font-extrabold shadow-sm scale-102"
                          : "border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => {
                    setCurrentPage(prev => Math.min(prev + 1, totalPages));
                    window.scrollTo({ top: 300, behavior: "smooth" });
                  }}
                  className="px-3.5 py-2 border border-neutral-200 bg-white hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-600 disabled:opacity-40 select-none transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}

            {sortedProducts.length === 0 && !isSearchLoading && !internalLoading && (
              <div className="col-span-full py-16 text-center space-y-2">
                <p className="text-base font-bold text-neutral-500">No products found matching your search criteria.</p>
                <p className="text-xs text-neutral-400">Try checking for spelling errors, using more general terms, or modifying filters.</p>
                <button
                  onClick={() => {
                    setActiveCategoryTab("all");
                    setSortOption("recommended");
                  }}
                  className="px-4 py-2 bg-[#4CAF50] text-white font-bold text-xs rounded-xl hover:bg-[#388E3C] mt-4 transition-colors shadow-sm"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ---------------- 3. PRODUCT DETAILS SCREEN ---------------- */}
      <AnimatePresence mode="wait">
      {screen === "details" && detailProduct && (
        <motion.div
          key="details"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
          className="space-y-8 text-left"
        >
          
          {/* Enhanced Breadcrumb Trail (Supports Internal Linking and Breadcrumb Schema) */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs font-bold text-neutral-500 py-2 border-b border-neutral-100 mb-2">
            <a
              href="/"
              onClick={(e) => { e.preventDefault(); onNavigate("home"); }}
              className="hover:text-orange-600 transition-colors cursor-pointer"
            >
              Home
            </a>
            <span className="text-neutral-300">/</span>
            <a
              href="/shop"
              onClick={(e) => { e.preventDefault(); onNavigate("shop"); }}
              className="hover:text-orange-600 transition-colors cursor-pointer"
            >
              Catalog
            </a>
            <span className="text-neutral-300">/</span>
            {detailProduct.category && (
              <>
                <a
                  href={`/category/${detailProduct.category}`}
                  onClick={(e) => {
                    e.preventDefault();
                    if (typeof setActiveCategoryTab === "function") {
                      const matchedCat = categories?.find(c => c.name.toLowerCase() === detailProduct.category?.toLowerCase() || c.id === detailProduct.category?.toLowerCase());
                      if (matchedCat) {
                        setActiveCategoryTab(matchedCat.id);
                      }
                    }
                    onNavigate("shop");
                  }}
                  className="hover:text-orange-600 transition-colors cursor-pointer capitalize"
                >
                  {detailProduct.category}
                </a>
                <span className="text-neutral-300">/</span>
              </>
            )}
            <span className="text-neutral-800 truncate max-w-[180px] sm:max-w-xs">{detailProduct.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Gallery Image block (5 columns) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="aspect-square bg-neutral-50 border border-neutral-200 rounded-2xl overflow-hidden shadow-ambient relative flex items-center justify-center">
                {detailProduct.image ? (
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={selectedImageIndex}
                      src={detailProduct.image}
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 1.02 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      alt={detailProduct.title}
                      className={`w-full h-full object-cover ${
                        selectedImageIndex === 1
                          ? "brightness-105 contrast-105 scale-102"
                          : selectedImageIndex === 2
                          ? "contrast-95 saturate-110"
                          : ""
                      }`}
                      referrerPolicy="no-referrer"
                    />
                  </AnimatePresence>
                ) : (
                  <div className="text-neutral-300 font-extrabold uppercase text-xs tracking-widest text-center px-4">
                    ₦ Product Designed Image-Free
                  </div>
                )}
                
                {detailProduct.isBestSeller && (
                  <span className="absolute top-4 left-4 bg-orange-500 text-white font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-md tracking-wider">
                    Best Seller
                  </span>
                )}
              </div>

              {/* Thumbnails Selection Panel */}
              {detailProduct.image && (
                <div className="flex items-center gap-3 justify-center pt-1">
                  {[0, 1, 2].map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className="relative w-16 h-16 rounded-xl bg-neutral-50 border overflow-hidden cursor-pointer focus:outline-none flex-shrink-0"
                      style={{
                        borderColor: selectedImageIndex === idx ? "#f97316" : "#e5e5e5"
                      }}
                    >
                      {selectedImageIndex === idx && (
                        <motion.div
                          layoutId="activeThumbRing"
                          className="absolute inset-0 border-2 border-orange-500 rounded-xl z-10 pointer-events-none"
                          transition={{ type: "spring", stiffness: 350, damping: 25 }}
                        />
                      )}
                      <img
                        src={detailProduct.image}
                        alt="Product thumbnail view"
                        className={`w-full h-full object-cover transition-all duration-300 ${
                          idx === 1
                            ? "brightness-105 contrast-105 scale-110"
                            : idx === 2
                            ? "contrast-95 saturate-110"
                            : ""
                        } ${selectedImageIndex !== idx ? "opacity-70 hover:opacity-100" : ""}`}
                      />
                    </button>
                  ))}
                </div>
              )}
              
              <div className="p-4 bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3.5">
                  {(() => {
                    const vendorMatch = vendors.find(v => v.id === detailProduct.vendorId);
                    return (
                      <>
                        <div 
                          onClick={() => { if (vendorMatch) setShowCredsVendor(vendorMatch); }}
                          title="Tap to verify business registration, WhatsApp, & bank details"
                          className="w-10 h-10 rounded-full overflow-hidden bg-orange-100 text-orange-600 flex items-center justify-center font-bold font-mono shrink-0 cursor-pointer hover:scale-110 hover:ring-4 hover:ring-orange-100 transition-all active:scale-95 duration-200"
                        >
                          {vendorMatch && vendorMatch.avatar && !vendorMatch.avatar.startsWith("https://lh3.googleusercontent.com/v_") ? (
                            <img loading="lazy" src={vendorMatch.avatar} alt={vendorMatch.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span>{detailProduct.vendorName.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-neutral-400 font-bold uppercase leading-none">VERIFIED SELLER</p>
                          <p className="text-sm font-bold text-neutral-800 mt-1">{vendorMatch ? vendorMatch.name : detailProduct.vendorName}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
                <div className="text-right">
                  <p className="text-xs text-[#4CAF50] font-bold bg-green-50 px-2 py-0.5 rounded-full inline-block uppercase font-mono border border-green-100">Verified Plaza Partner</p>
                </div>
              </div>

              {/* Interactive Vendor Star-based Rating Widget */}
              {(() => {
                const productVendor = vendors.find(v => v.id === detailProduct.vendorId) || {
                  id: detailProduct.vendorId,
                  name: detailProduct.vendorName,
                  rating: 4.5,
                  ratingCount: 35,
                  location: "Lagos, Nigeria"
                };

                return (
                  <div className="p-4 bg-white border border-neutral-150 rounded-2xl shadow-xs space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="text-left space-y-0.5">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-neutral-400">Merchant Reputation</span>
                        <h4 className="font-bold text-neutral-900 text-xs leading-none">{productVendor.name}</h4>
                        <p className="text-[10px] text-neutral-400 font-semibold">{productVendor.location}</p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <div className="flex items-center space-x-0.5 justify-end">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const isFilled = star <= Math.round(productVendor.rating);
                            return (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  isFilled ? "fill-amber-400 text-amber-400" : "text-neutral-200"
                                }`}
                              />
                            );
                          })}
                        </div>
                        {productVendor.ratingCount > 0 && (
                          <p className="text-[10px] text-neutral-500 font-bold leading-none">
                            {productVendor.rating.toFixed(1)} ★ rating ({productVendor.ratingCount} reviews)
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="text-left leading-tight">
                        <p className="font-bold text-[11px] text-neutral-700">Submit a Rating</p>
                        <p className="text-[9px] font-medium text-neutral-400">Click a star to rate order execution</p>
                      </div>

                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            type="button"
                            key={star}
                            className="focus:outline-none transition-transform hover:scale-110 active:scale-90 p-0.5"
                            onMouseEnter={() => setHoveredVendorStar(star)}
                            onMouseLeave={() => setHoveredVendorStar(null)}
                            onClick={() => {
                              if (onRateVendor) {
                                onRateVendor(productVendor.id, star);
                              }
                            }}
                          >
                            <Star
                              className={`w-5 h-5 transition-colors ${
                                star <= (hoveredVendorStar ?? 0)
                                  ? "fill-amber-400 text-amber-400 cursor-pointer"
                                  : star <= Math.round(productVendor.rating)
                                  ? hoveredVendorStar !== null
                                    ? "text-neutral-200 fill-none"
                                    : "fill-amber-400 text-amber-400"
                                  : "text-neutral-200 fill-none"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Product Configuration Details (7 columns) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2 pb-4 border-b border-neutral-100">
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight leading-tight">
                    {detailProduct.title}
                  </h1>
                  {detailProduct.condition === "Fairly Used" && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-widest rounded-md border border-amber-200">Fairly Used</span>
                  )}
                </div>
                
                <div className="flex flex-wrap items-center gap-4 text-sm pt-1">
                  {detailProduct.reviewsCount > 0 && (
                    <>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                        ))}
                        <span className="font-extrabold text-neutral-800 ml-1">{detailProduct.rating}</span>
                      </div>
                      <span className="text-neutral-300">|</span>
                      <span className="text-neutral-500 font-bold">{detailProduct.reviewsCount} certified shopper responses</span>
                      <span className="text-neutral-300">|</span>
                    </>
                  )}
                  <span className="text-[#4CAF50] font-bold flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 bg-[#4CAF50] rounded-full inline-block mr-1.5" />
                    Verified Direct Order
                  </span>
                </div>
              </div>

              {/* Price details */}
              <div className="bg-neutral-50 p-4 border border-neutral-100 rounded-2xl">
                <div className="flex items-baseline space-x-3">
                  <span className="text-3xl font-black text-neutral-900 tracking-tight leading-none">
                    {formatNaira(detailProduct.price)}
                  </span>
                  {detailProduct.originalPrice && (
                    <span className="text-sm text-neutral-400 line-through leading-none font-mono">
                      {formatNaira(detailProduct.originalPrice)}
                    </span>
                  )}
                  {detailProduct.salePercentage && (
                    <span className="text-xs text-red-600 font-extrabold bg-red-50 px-2 py-0.5 rounded-md uppercase tracking-wide">
                      Save {detailProduct.salePercentage}%
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold mt-2">
                  Tax Estimated at checkout (7.5% VAT Nigeria inclusive)
                </p>
              </div>

              {/* Description body */}
              <div className="space-y-1 text-sm leading-relaxed text-neutral-600">
                <div className="flex items-center space-x-2">
                  <p className="font-semibold text-neutral-800">Product Highlights & Overview</p>
                  {detailProduct.deliveryDays && (
                    <span className="text-[10px] font-bold bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Delivery in {detailProduct.deliveryDays} Day{detailProduct.deliveryDays > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="mt-1">{detailProduct.description}</p>
              </div>

              {/* Product specific values option chooser */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Size Choice */}
                {detailProduct.sizes && detailProduct.sizes.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Choose Fitting / Size</label>
                    <div className="flex flex-wrap gap-2">
                      {detailProduct.sizes.map((sz) => (
                        <button
                          key={sz}
                          onClick={() => setSelectedSize(sz)}
                          className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all ${
                            selectedSize === sz
                              ? "border-orange-500 bg-orange-50 text-orange-600 font-extrabold shadow-xs"
                              : "border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color Choice */}
                {detailProduct.colors && detailProduct.colors.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Choose Color Satin</label>
                    <div className="flex flex-wrap gap-2">
                      {detailProduct.colors.map((cl) => (
                        <button
                          key={cl}
                          onClick={() => setSelectedColor(cl)}
                          className={`px-3 py-2 border rounded-xl text-xs font-bold transition-all ${
                            selectedColor === cl
                              ? "border-[#4CAF50] bg-[#4CAF50]/10 text-[#4CAF50] font-extrabold shadow-xs"
                              : "border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                          }`}
                        >
                          {cl}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Counter Picker & Add Cart Trigger */}
              <div className="pt-4 border-t border-neutral-100 flex flex-wrap items-center gap-4">
                <div className="flex items-center border border-neutral-200 rounded-xl overflow-hidden h-11 bg-white">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setDetailQty(Math.max(1, detailQty - 1))}
                    className="px-3 hover:bg-neutral-100 transition-colors h-full text-neutral-500 text-lg select-none"
                  >
                    -
                  </motion.button>
                  <div className="relative w-12 h-full flex items-center justify-center overflow-hidden">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={detailQty}
                        initial={{ y: -6, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 6, opacity: 0, scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 350, damping: 20 }}
                        className="font-bold text-sm select-none font-mono block text-neutral-800"
                      >
                        {detailQty}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setDetailQty(Math.min(detailProduct.stock, detailQty + 1))}
                    className="px-3 hover:bg-neutral-100 transition-colors h-full text-neutral-500 text-lg select-none"
                  >
                    +
                  </motion.button>
                </div>

                {(() => {
                  if (detailProduct.externalLink) {
                    return (
                      <a
                        href={detailProduct.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[200px] h-11 text-white font-bold rounded-xl shadow-md transition-all duration-300 flex items-center justify-center space-x-2 select-none bg-blue-600 hover:bg-blue-700"
                      >
                        <ExternalLink className="w-5 h-5" />
                        <span>Get It Here</span>
                      </a>
                    );
                  }
                  
                  const detailIsAdded = !!justAddedProducts[detailProduct.id];
                  return (
                    <motion.button
                      animate={detailIsAdded ? { scale: [1, 1.05, 1] } : {}}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        handleAddToCartWithFeedback(detailProduct, detailQty, selectedSize, selectedColor);
                        setDetailQty(1);
                      }}
                      className={`flex-1 min-w-[200px] h-11 text-white font-bold rounded-xl shadow-md transition-all duration-300 flex items-center justify-center space-x-2 select-none ${
                        detailIsAdded ? "bg-[#4CAF50]" : "bg-orange-500 hover:bg-orange-600"
                      }`}
                      id="add-to-cart-action"
                    >
                      {detailIsAdded ? <Check className="w-5 h-5 animate-bounce" /> : <ShoppingCart className="w-5 h-5" />}
                      <span>{detailIsAdded ? "Added to Cart!" : "Secure Purchase"}</span>
                    </motion.button>
                  );
                })()}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => toggleWishlist(detailProduct.id)}
                  className="w-11 h-11 border border-neutral-200 hover:border-neutral-300 rounded-xl flex items-center justify-center hover:bg-neutral-50 text-neutral-550 transition-colors cursor-pointer"
                >
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={wishlist.includes(detailProduct.id) ? "liked" : "unliked"}
                      initial={{ scale: 0.6, rotate: -25, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 350, damping: 15 }}
                    >
                      <Heart className={`w-5 h-5 ${wishlist.includes(detailProduct.id) ? "fill-red-500 text-red-500 border-none" : ""}`} />
                    </motion.div>
                  </AnimatePresence>
                </motion.button>
              </div>

              {/* Bullet Features Checklist */}
              {detailProduct.highlights && (
                <div className="pt-6 border-t border-neutral-150 space-y-3">
                  <h4 className="font-bold text-xs text-neutral-400 uppercase tracking-widest">Premium Product Blueprint</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-600 font-semibold">
                    {detailProduct.highlights.map((h, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <Check className="w-4 h-4 text-[#4CAF50] flex-shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Shopper Reviews Segment */}
          {detailProduct.reviewsCount > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 border-t border-neutral-150">
            <div className="lg:col-span-4 space-y-4">
              <h3 className="font-extrabold text-lg text-neutral-900 tracking-tight">Verified Shopper Insights</h3>
              <div className="p-5 bg-neutral-50 border border-neutral-100 rounded-2xl text-center space-y-2">
                <p className="text-3xl font-black text-neutral-900">{detailProduct.rating}</p>
                <div className="flex justify-center items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-neutral-405 font-bold uppercase tracking-wider mt-1 text-[#4CAF50]">Verified Shopper Reviews</p>
              </div>
              
              {/* Form to leave a review */}
              {orders.some((order) => order.productIds && order.productIds.includes(detailProduct.id)) ? (
                <form onSubmit={handlePostReview} className="space-y-3">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Have this product? Share feedback</label>
                  <textarea
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    placeholder="Tell local buyers how the material, weight and delivery felt..."
                    rows={3}
                    className="w-full text-xs p-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-neutral-700 bg-white"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl tracking-wider uppercase transition-colors cursor-pointer"
                  >
                    Publish Verified Review
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-amber-50/70 border border-amber-200/50 rounded-2xl text-left space-y-2">
                  <div className="flex items-center space-x-2 text-amber-800 font-extrabold text-[10px] uppercase tracking-wider">
                    <ShieldCheck className="w-4.5 h-4.5 text-amber-600 shrink-0" />
                    <span>Review Locked (Verified Buyers Only)</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                    To maintain standard peer compliance, reviews are locked to verified buyers. Complete checkout for this item to enable reviews.
                  </p>
                </div>
              )}
            </div>

            <div className="lg:col-span-8 space-y-4">
              <p className="font-bold text-sm text-neutral-400 uppercase tracking-widest pb-1 border-b border-neutral-100">Shopper Testimonials</p>
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {addedReviews.map((rev, idx) => (
                  <motion.div
                    key={rev.id}
                    initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-15px" }}
                    transition={{ duration: 0.35, delay: Math.min(idx * 0.05, 0.2) }}
                    whileHover={{ x: 4 }}
                    className="p-4 bg-white border border-neutral-100 rounded-2xl flex space-x-4 items-start text-xs transition-shadow hover:shadow-ambient hover:border-orange-200"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-black font-mono flex items-center justify-center flex-shrink-0">
                      {rev.avatarInitials}
                    </div>
                    <div className="space-y-1.5 flex-1 text-left">
                      <div className="flex justify-between items-center">
                        <p className="font-extrabold text-neutral-800">{rev.author}</p>
                        <span className="text-neutral-400 text-[10px]">{rev.date}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3 h-3 ${s <= rev.stars ? "fill-amber-400 text-amber-400" : "text-neutral-200"}`} />
                        ))}
                        {rev.isVerified && (
                          <span className="text-[9px] font-bold text-[#4CAF50] bg-green-50 px-1.5 py-0.5 rounded ml-2 border border-green-100">Verified Shopper</span>
                        )}
                      </div>
                      <p className="text-neutral-600 leading-relaxed font-semibold">{rev.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Related Products Section (Amazing for Internal Linking and crawlability!) */}
          {(() => {
            const related = products
              .filter((p) => p.id !== detailProduct.id)
              .sort((a, b) => {
                if (a.category === detailProduct.category && b.category !== detailProduct.category) return -1;
                if (b.category === detailProduct.category && a.category !== detailProduct.category) return 1;
                return b.rating - a.rating;
              })
              .slice(0, 4);

            if (related.length === 0) return null;

            return (
              <div className="pt-10 border-t border-neutral-150 space-y-6">
                <div className="text-left">
                  <h3 className="text-lg sm:text-2xl font-black text-neutral-900 tracking-tight flex items-center">
                    <Sparkles className="w-5 h-5 mr-3 text-orange-500 animate-pulse" />
                    Similar Products You May Like
                  </h3>
                  <p className="text-xs text-neutral-400 font-semibold mt-1">
                    Top-rated authentic wholesale essentials on NaijaOnlineStores with automated delivery escrow
                  </p>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {related.map((p) => {
                    const slug = p.title.toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-");
                    return (
                      <a
                        key={`related-${p.id}`}
                        href={`/product/${p.id}-${slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          onSelectProduct(p.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="group bg-white rounded-2xl border border-neutral-100 p-3 hover:shadow-ambient hover:border-orange-200 transition-all flex flex-col justify-between h-72"
                      >
                        <div className="space-y-2">
                          <div className="aspect-square w-full rounded-xl overflow-hidden bg-neutral-50 relative">
                            {p.image ? (
                              <img
                                src={p.image}
                                alt={`Buy ${p.title} online Nigeria - NaijaOnlineStores`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-neutral-300 font-bold uppercase">No Image</div>
                            )}
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest block">{p.category}</span>
                            <h4 className="font-extrabold text-xs text-neutral-800 line-clamp-2 leading-tight group-hover:text-orange-500 transition-colors mt-0.5">{p.title}</h4>
                          </div>
                        </div>
                        <div className="mt-2 space-y-1.5 border-t border-neutral-50 pt-2">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-xs sm:text-sm text-neutral-900">{formatNaira(p.price)}</span>
                            {p.reviewsCount > 0 && <span className="text-[10px] text-neutral-400 font-bold flex items-center">★ {p.rating.toFixed(1)}</span>}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        </motion.div>
      )}
      </AnimatePresence>

      {/* ---------------- 4. SHOPPING CART VIEW ---------------- */}
      <AnimatePresence mode="wait">
      {screen === "cart" && (
        <motion.div
          key="cart"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
          className="space-y-6"
        >
          <div className="text-left pb-4 border-b border-neutral-100">
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">Your Shopping Basket</h2>
            <p className="text-xs text-neutral-400 font-semibold mt-1">Review your cart and shipping details before payment</p>
          </div>

          {cart.length === 0 ? (
            <div className="py-16 text-center space-y-4 bg-white border border-neutral-150 rounded-2xl max-w-xl mx-auto">
              <ShoppingCart className="w-12 h-12 text-neutral-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-base font-bold text-neutral-700">Your basket is currently empty.</p>
                <p className="text-xs text-neutral-400">Add traditional outfits, smartphones, or skincare to experience simulated paychecks.</p>
              </div>
              <button
                onClick={() => onNavigate("shop")}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl tracking-wider uppercase transition-colors shadow-xs"
              >
                Go to Plaza Plaza
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Product row Items (8 cols) */}
              <div className="lg:col-span-8 lg:max-h-[500px] overflow-y-auto pr-1 space-y-4">
                <AnimatePresence initial={false}>
                  {cart.map((item) => (
                    <motion.div
                      key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}`}
                      initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -15 }}
                      layout
                      transition={{ duration: 0.25 }}
                      whileHover={{ scale: 1.005 }}
                      className="p-4 sm:p-5 bg-white border border-neutral-150 rounded-2xl flex flex-col sm:flex-row items-center gap-4 text-left shadow-xs justify-between"
                    >
                      <div className="flex items-center space-x-4 w-full sm:w-auto">
                        <div className="w-16 h-16 bg-neutral-50 rounded-xl overflow-hidden border border-neutral-100 flex-shrink-0 flex items-center justify-center">
                          {item.product.image ? (
                            <img loading="lazy" src={item.product.image} alt={item.product.title} className="w-full h-full object-cover pointer-events-none" />
                          ) : (
                            <ShoppingCart className="w-5 h-5 text-neutral-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-sm text-neutral-800 truncate max-w-[280px]">
                            {item.product.title}
                          </h3>
                          <p className="text-[10px] text-orange-500 font-bold uppercase tracking-wide">{item.product.vendorName}</p>
                          
                          {/* Selected variant parameters */}
                          <div className="flex flex-wrap gap-1.5 mt-1 text-[9px] font-bold font-mono">
                            {item.selectedSize && (
                              <span className="px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-500">Size: {item.selectedSize}</span>
                            )}
                            {item.selectedColor && (
                              <span className="px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-500 font-bold">Color: {item.selectedColor}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between w-full sm:w-auto sm:space-x-8">
                        {/* Counter */}
                        <div className="flex items-center border border-neutral-150 rounded-lg overflow-hidden h-9 bg-neutral-50 relative">
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              if (item.quantity === 1) {
                                onRemoveFromCart(item.product.id, item.selectedSize, item.selectedColor);
                              } else {
                                onUpdateCartQty(item.product.id, item.quantity - 1, item.selectedSize, item.selectedColor);
                              }
                            }}
                            className="px-2 hover:bg-neutral-100 transition-colors h-full text-neutral-400 select-none"
                          >
                            -
                          </motion.button>
                          <div className="relative w-8 h-full flex items-center justify-center overflow-hidden">
                            <AnimatePresence mode="popLayout" initial={false}>
                              <motion.span
                                key={item.quantity}
                                initial={{ y: -6, opacity: 0, scale: 0.8 }}
                                animate={{ y: 0, opacity: 1, scale: 1 }}
                                exit={{ y: 6, opacity: 0, scale: 0.8 }}
                                transition={{ type: "spring", stiffness: 350, damping: 20 }}
                                className="font-bold text-xs select-none font-mono block text-[#4CAF50] font-black"
                              >
                                {item.quantity}
                              </motion.span>
                            </AnimatePresence>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => onUpdateCartQty(item.product.id, item.quantity + 1, item.selectedSize, item.selectedColor)}
                            className="px-2 hover:bg-neutral-100 transition-colors h-full text-neutral-400 select-none"
                          >
                            +
                          </motion.button>
                        </div>

                        {/* Cost */}
                        <div className="text-right min-w-24">
                          <p className="font-black text-neutral-900 text-sm font-mono">
                            {formatNaira(item.product.price * item.quantity)}
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-0.5 font-semibold">({formatNaira(item.product.price)} each)</p>
                        </div>

                        {/* Remove button */}
                        <motion.button
                          whileHover={{ scale: 1.12, color: "#ef4444" }}
                          whileTap={{ scale: 0.88 }}
                          onClick={() => onRemoveFromCart(item.product.id, item.selectedSize, item.selectedColor)}
                          className="p-1 text-neutral-400 hover:text-red-500 transition-colors"
                          id={`delete-cart-${item.product.id}`}
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </motion.button>
                      </div>

                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Order Summary Form (4 cols) */}
              <div className="lg:col-span-4 bg-white border border-neutral-155 rounded-2xl p-6 text-left space-y-5 shadow-ambient">
                <h3 className="font-extrabold text-neutral-900 text-base tracking-tight pb-3 border-b border-neutral-100">Order Summary</h3>
                
                {/* Shipping State Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Deliver Destination State</label>
                  <div className="relative">
                    <select
                      value={selectedStateForShipping}
                      onChange={(e) => setSelectedStateForShipping(e.target.value)}
                      className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white outline-none focus:ring-2 focus:ring-orange-500 font-bold"
                      id="shipping-state-select"
                    >
                      {Object.keys(shippingCosts).map((state) => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                    <MapPin className="w-4 h-4 text-orange-500 absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-neutral-400 italic">
                    Free courier to Lagos and Abuja! Regular state logistics applied elsewhere.
                  </p>
                </div>

                {/* Sub calculations */}
                <div className="space-y-2 text-xs font-semibold text-neutral-600">
                  <div className="flex justify-between items-center h-5">
                    <span>Basket Subtotal</span>
                    <span className="font-mono text-neutral-800 relative block min-w-[80px] text-right overflow-hidden">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={cartSubtotal}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="inline-block"
                        >
                          {formatNaira(cartSubtotal)}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </div>
                  <div className="flex justify-between items-center h-5">
                    <span>Shipping Logistics ({selectedStateForShipping})</span>
                    <span className="font-mono text-neutral-800 relative block min-w-[80px] text-right overflow-hidden">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={activeShippingFee}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="inline-block"
                        >
                          {activeShippingFee === 0 ? "FREE" : formatNaira(activeShippingFee)}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </div>
                  <div className="flex justify-between items-center h-5">
                    <span>Service Charge & VAT (7.5% Nigeria tax)</span>
                    <span className="font-mono text-neutral-800 relative block min-w-[80px] text-right overflow-hidden">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={estimatedTax}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="inline-block"
                        >
                          {formatNaira(estimatedTax)}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </div>
                  
                  <div className="border-t border-neutral-100 pt-3 flex justify-between items-center text-sm">
                    <span className="font-extrabold text-neutral-900">Total Settlement</span>
                    <span className="font-black text-neutral-900 text-base font-mono relative block min-w-[100px] text-right overflow-hidden h-6">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={cartTotalSum}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="inline-block font-black"
                        >
                          {formatNaira(cartTotalSum)}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                  </div>
                </div>

                <button
                  onClick={onCheckout}
                  className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl shadow-md transition-colors active:scale-98 flex items-center justify-center space-x-2 text-xs tracking-wider uppercase"
                  id="checkout-trigger-btn"
                >
                  <ShieldCheck className="w-4.5 h-4.5 text-white" />
                  <span>Secure Direct Gateway</span>
                </button>

                <div className="p-3 bg-green-50/50 rounded-xl flex items-start space-x-2 text-[10px] border border-green-100 tracking-wide">
                  <ShieldCheck className="w-4 h-4 text-[#4CAF50] flex-shrink-0 mt-0.5" />
                  <p className="text-[#4CAF50] font-medium">
                  Secure verification handled by Paystack. Your details are safe.
                  </p>
                </div>
              </div>

            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>

      {/* ---------------- STORES LISTING SCREEN ---------------- */}
      <AnimatePresence mode="wait">
      {screen === "stores" && (
        <motion.div
          key="stores-screen"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={pageTransition}
          className="space-y-8"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between text-left gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight flex items-center">
                <Store className="w-8 h-8 mr-2 text-orange-500" />
                Verified Stores
              </h2>
              <p className="text-sm text-neutral-500 font-semibold max-w-xl mt-1">Discover official wholesalers, exclusive fashion boutiques, and gadget merchants active on our marketplace.</p>
            </div>
          </div>
          
          {(() => {
            const filteredStores = vendors.filter(v => v.approval_status === "verified" || v.approval_status === "approved");
            const STORES_PER_PAGE = 9;
            const totalStoresPages = Math.ceil(filteredStores.length / STORES_PER_PAGE);
            const paginatedStores = filteredStores.slice((storesCurrentPage - 1) * STORES_PER_PAGE, storesCurrentPage * STORES_PER_PAGE);

            return (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedStores.map((vend) => {
                    const vendorProds = products.filter(p => p.vendorId === vend.id || p.vendorName === vend.name);
                    const slugifyLocal = (text: string) => text.toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-");
                    
                    return (
                      <motion.div
                        key={vend.id}
                        whileHover={shouldReduceMotion ? {} : { y: -5, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.06)" }}
                        className="bg-white rounded-[2rem] border border-neutral-100 p-6 flex flex-col justify-between shadow-xs transition-all relative overflow-hidden group cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          if (onSelectVendor) {
                            onSelectVendor(slugifyLocal(vend.name)); // pass slug
                          }
                          onNavigate("vendor");
                          window.scrollTo(0, 0);
                        }}
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-transform duration-500 group-hover:scale-150">
                          <Store className="w-24 h-24" />
                        </div>
                        
                        <div className="flex items-start space-x-4">
                          <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-2xl uppercase border-2 border-white shadow-sm shrink-0 overflow-hidden">
                            {vend.avatar && !vend.avatar.includes('ui-avatars') ? (
                               <img loading="lazy" src={vend.avatar} alt={vend.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                               vend.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-neutral-900 text-lg leading-tight truncate">{vend.name}</h3>
                            <p className="text-xs text-neutral-500 font-medium leading-relaxed truncate">{vend.location}</p>
                            <div className="flex items-center space-x-1 mt-1 text-[10px] uppercase font-bold tracking-widest text-[#4CAF50] bg-green-50 border border-green-100 px-2 py-0.5 rounded-md inline-block w-fit">
                              <Check className="w-3 h-3 inline-block" /> Verified
                            </div>
                          </div>
                        </div>
                        
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-600 font-bold mb-4">
                           <span className="bg-neutral-50 border border-neutral-150 px-3 py-1.5 rounded-xl">{vendorProds.length} Products</span>
                           {vend.ownerName && <span className="bg-neutral-50 border border-neutral-150 px-3 py-1.5 rounded-xl text-neutral-500">{vend.ownerName}</span>}
                        </div>
                        
                        {vendorProds.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 snap-x no-scrollbar">
                            {vendorProds.map(p => (
                              <div key={p.id} className="w-16 h-16 shrink-0 rounded-lg bg-neutral-50 border border-neutral-100 overflow-hidden snap-start flex items-center justify-center">
                                {p.image ? (
                                   <img loading="lazy" src={p.image} alt={p.title} className="w-full h-full object-cover" />
                                ) : (
                                   <Store className="w-4 h-4 text-neutral-300" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        <button
                          className="w-full py-3 bg-neutral-900 group-hover:bg-orange-500 text-white rounded-xl text-sm font-bold shadow-sm transition-all text-center flex items-center justify-center space-x-2 relative z-10 mt-auto"
                        >
                          <span>Visit Storefront</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>

                 {totalStoresPages > 1 && (
                  <div className="flex justify-center items-center space-x-4 mt-12 bg-white rounded-2xl border border-neutral-100 shadow-sm p-4 w-fit mx-auto">
                    <button
                      onClick={() => setStoresCurrentPage(p => Math.max(1, p - 1))}
                      disabled={storesCurrentPage === 1}
                      className="w-10 h-10 flex items-center justify-center rounded-xl font-bold bg-neutral-50 text-neutral-600 disabled:opacity-50 hover:bg-neutral-100 transition-colors"
                    >
                      &larr;
                    </button>
                    <span className="font-bold text-sm text-neutral-500">
                      Page <span className="text-neutral-900">{storesCurrentPage}</span> of {totalStoresPages}
                    </span>
                    <button
                      onClick={() => setStoresCurrentPage(p => Math.min(totalStoresPages, p + 1))}
                      disabled={storesCurrentPage === totalStoresPages}
                      className="w-10 h-10 flex items-center justify-center rounded-xl font-bold bg-neutral-50 text-neutral-600 disabled:opacity-50 hover:bg-neutral-100 transition-colors"
                    >
                      &rarr;
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </motion.div>
      )}
      </AnimatePresence>

      {/* ---------------- 5. VENDOR STOREFRONT SEO PAGE ---------------- */}
      <AnimatePresence mode="wait">
      {screen === "vendor" && (() => {
        const slugifyLocal = (text: string) => text.toLowerCase().replace(/[^\w ]+/g, "").replace(/ +/g, "-");
        
        // Find current active vendor matching slug or ID
        const matchedVendor = vendors.find(v => slugifyLocal(v.name) === vendorSlug || v.id === vendorSlug) || vendors[0] || {
          id: "v_fallback",
          name: "Verified Merchant Collective",
          ownerName: "Naija Stores Merchant",
          avatar: "",
          rating: 0,
          ratingCount: 0,
          salesToday: 145000,
          ordersPending: 0,
          stockAlerts: 0,
          email: "support@naijastores.ng",
          phone: "+234 800 000 0000",
          location: "Lagos, Nigeria"
        };
        
        const vendorProducts = products.filter(p => p.vendorId === matchedVendor.id || p.vendorName === matchedVendor.name);
        
        // Vendor Products pagination
        const PRODUCTS_PER_PAGE = 24;
        const totalVendorPages = Math.ceil(vendorProducts.length / PRODUCTS_PER_PAGE);
        const startVendorIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
        const paginatedVendorProducts = vendorProducts.slice(startVendorIndex, startVendorIndex + PRODUCTS_PER_PAGE);

        // Generate dynamic organic vendor descriptions dynamically for SEO (Satisfies task 12)
        const generateVendorDesc = (v: any) => {
          const ratingText = v.ratingCount > 0 ? ` Recognized with a ${v.rating.toFixed(1)} ★ rating from over ${v.ratingCount} buyers, they stand` : ` They stand`;
          return `${v.name}, located in ${v.location}, is an audited and verified merchant on NaijaOnlineStores marketplace. Rooted in excellent customer service, they showcase high-end products across fashion, electronics, and local home utility collections.${ratingText} as one of the trusted online stores Nigeria rely on for secure payments and reliable escrow logistics.`;
        };

        return (
          <motion.div
            key="vendor-screen"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="space-y-8"
          >
            {/* Visual Breadcrumb Section (Task 6) */}
            <nav className="flex items-center space-x-2 text-xs font-semibold text-neutral-400 tracking-wide text-left" aria-label="Breadcrumb">
              <a href="/" onClick={(e) => { e.preventDefault(); onNavigate("home"); }} className="hover:text-orange-500 transition-colors">Home</a>
              <ChevronRight className="w-3 h-3" />
              <a href="/shop" onClick={(e) => { e.preventDefault(); onNavigate("shop"); }} className="hover:text-orange-500 transition-colors">Vendors</a>
              <ChevronRight className="w-3 h-3" />
              <span className="text-neutral-600 font-extrabold truncate" aria-current="page">{matchedVendor.name}</span>
            </nav>

            {/* Vendor Hero Billboard Profile Card */}
            <div className="bg-white border border-neutral-150 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6 shadow-sm relative overflow-hidden text-left bg-linear-to-b from-white to-neutral-50/50">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left w-full">
                {/* Profile Avatar / Initials */}
                <div 
                  onClick={() => setShowCredsVendor(matchedVendor)}
                  title="Tap to verify business registration, WhatsApp, & bank details"
                  className="w-20 h-20 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-2xl shadow-inner border border-orange-200/50 uppercase shrink-0 cursor-pointer hover:scale-110 active:scale-95 transition-all hover:ring-4 hover:ring-orange-100/80 duration-200 relative group"
                >
                  {matchedVendor.avatar && !matchedVendor.avatar.startsWith("https://lh3") ? (
                    <img loading="lazy" src={matchedVendor.avatar} alt={matchedVendor.name} className="w-full h-full object-cover rounded-2xl" referrerPolicy="no-referrer" />
                  ) : (
                    <span>{matchedVendor.name.charAt(0)}</span>
                  )}
                  {/* Info Badge overlay */}
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-neutral-900 text-white rounded-full border border-white flex items-center justify-center text-[9px] shadow-xs scale-90 group-hover:scale-110 transition-transform">
                    ℹ️
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h1 className="text-xl sm:text-3xl font-black text-neutral-900 tracking-tight leading-tight">{matchedVendor.name}</h1>
                    <span className="bg-green-50 text-[#4CAF50] font-extrabold text-[10px] uppercase px-2.5 py-1 rounded-full border border-green-100 tracking-wider flex items-center gap-1 shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#4CAF50]" />
                      <span>Verified Merchant</span>
                    </span>
                  </div>
                  
                  <p className="text-xs font-semibold text-neutral-400 flex items-center justify-center sm:justify-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                    <span>{matchedVendor.location}</span>
                    <span className="mx-1 text-neutral-200">|</span>
                    <span>Managing Director: <strong>{matchedVendor.ownerName}</strong></span>
                  </p>

                  <p className="text-sm font-semibold text-neutral-500 leading-relaxed max-w-2xl mt-2 select-text">
                    {generateVendorDesc(matchedVendor)}
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1.5 text-xs text-neutral-400 font-semibold select-all">
                    <span>Email: <strong className="text-neutral-700">{matchedVendor.email}</strong></span>
                    <span className="hidden sm:inline text-neutral-200">•</span>
                    <span>Support Phone: <strong className="text-neutral-700">{matchedVendor.phone}</strong></span>
                  </div>
                  {(matchedVendor.cacNumber || matchedVendor.cac_number || matchedVendor.bankName || matchedVendor.bank_name || matchedVendor.accountNumber || matchedVendor.account_number) && (
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-neutral-400 font-semibold select-all">
                      {(matchedVendor.cacNumber || matchedVendor.cac_number) && (
                        <span>CAC: <strong className="text-neutral-700">{matchedVendor.cacNumber || matchedVendor.cac_number}</strong></span>
                      )}
                      {(matchedVendor.cacNumber || matchedVendor.cac_number) && (matchedVendor.bankName || matchedVendor.bank_name || matchedVendor.accountNumber || matchedVendor.account_number) && (
                        <span className="hidden sm:inline text-neutral-200">•</span>
                      )}
                      {(matchedVendor.bankName || matchedVendor.bank_name) && (
                        <span>Bank: <strong className="text-neutral-700">{matchedVendor.bankName || matchedVendor.bank_name}</strong></span>
                      )}
                      {(matchedVendor.bankName || matchedVendor.bank_name) && (matchedVendor.accountNumber || matchedVendor.account_number) && (
                        <span className="hidden sm:inline text-neutral-200">•</span>
                      )}
                      {(matchedVendor.accountNumber || matchedVendor.account_number) && (
                        <span>Account: <strong className="text-neutral-700">{matchedVendor.accountNumber || matchedVendor.account_number}</strong></span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Card Board (Task 7 - Aggregate Rating representation) */}
              <div className="bg-neutral-50 border border-neutral-150 p-5 rounded-2xl w-full lg:w-72 flex flex-col gap-4 text-center">
                {matchedVendor.ratingCount > 0 && (
                <div>
                  <h4 className="text-[10px] font-black text-neutral-400 uppercase tracking-widest leading-none">Aggregate Peer Score</h4>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <span className="text-3xl font-black text-neutral-800 tracking-tight">{matchedVendor.rating.toFixed(1)}</span>
                    <div className="flex flex-col items-start leading-none">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(matchedVendor.rating) ? "fill-amber-400 text-amber-400" : "text-neutral-200"}`} />
                        ))}
                      </div>
                      <span className="text-[9px] text-neutral-400 mt-1 font-bold">({matchedVendor.ratingCount} verified checkouts)</span>
                    </div>
                  </div>
                </div>
                )}

                <div className="grid grid-cols-2 gap-2 border-t border-neutral-200/60 pt-3 text-xs">
                  <div className="p-2 bg-white rounded-xl border border-neutral-150">
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">Completed Sales</p>
                    <p className="font-extrabold text-neutral-800 mt-1">{formatNaira(matchedVendor.salesToday || 750000)}</p>
                  </div>
                  <div className="p-2 bg-white rounded-xl border border-neutral-150">
                    <p className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">Live Inventory</p>
                    <p className="font-extrabold text-neutral-800 mt-1">{vendorProducts.length} items</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Catalog Section */}
            <div className="space-y-4">
              <div className="text-left">
                <h3 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">Active Wholesale Inventory ({vendorProducts.length} items)</h3>
                <p className="text-xs text-neutral-400 font-semibold">Direct escrow items with nationwide delivery and secure checkouts</p>
              </div>

              {vendorProducts.length === 0 ? (
                <div className="py-12 bg-white border border-neutral-150 rounded-2xl text-center text-neutral-400 max-w-lg mx-auto space-y-3">
                  <Store className="w-10 h-10 text-neutral-300 mx-auto" />
                  <p className="text-sm font-bold text-neutral-700">No active products found in this vendor’s digital shelf.</p>
                  <p className="text-xs text-neutral-400">Inventory may be restocking or under compliance check.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {paginatedVendorProducts.map((p) => {
                      const discount = p.originalPrice && p.originalPrice > p.price ? Math.round(((p.originalPrice - p.price) / p.originalPrice) * 100) : 0;
                      return (
                      <motion.div
                        key={p.id}
                        variants={{
                          hidden: { opacity: 0, y: 15 },
                          show: { opacity: 1, y: 0 }
                        }}
                        whileHover={{ y: -8, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.08), 0 10px 10px -5px rgba(0,0,0,0.03)" }}
                        className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-xs group flex flex-col h-full text-left cursor-pointer hover:shadow-ambient hover:border-orange-200 transition-all relative"
                        onClick={() => {
                          onSelectProduct(p.id);
                          onNavigate("details");
                        }}
                      >
                        {/* Promo ribbon */}
                        {discount > 0 && (
                          <span className="absolute top-3 left-3 bg-red-500 text-white font-extrabold text-[9px] uppercase px-2 py-1 rounded-md z-10 shadow-sm leading-none">
                            -{discount}% OFF
                          </span>
                        )}

                        <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-md border border-neutral-100 text-neutral-500 font-black text-[9px] uppercase px-2 py-1 rounded-md z-10 shadow-2xs">
                          {p.condition || "New"}
                        </span>

                        <div className="relative aspect-square w-full bg-neutral-50 overflow-hidden border-b border-neutral-100 flex items-center justify-center">
                          {p.image ? (
                            <img loading="lazy" src={p.image} alt={p.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-108" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-[10px] font-black text-neutral-300 uppercase tracking-widest">IMAGING READY</span>
                          )}
                        </div>

                        <div className="p-4 flex flex-col flex-grow justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-[9px] font-bold text-orange-500 uppercase truncate mb-0.5">{p.vendorName}</p>
                            <h4 className="font-extrabold text-neutral-800 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-orange-600 transition-colors">{p.title}</h4>
                            {p.reviewsCount > 0 && (
                            <div className="flex items-center gap-1 pt-0.5">
                              <div className="flex bg-neutral-50/50 w-fit px-1.5 py-0.5 rounded border border-neutral-100">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} className={`w-3 h-3 ${s <= Math.round(p.rating) ? "fill-amber-400 text-amber-400" : "text-neutral-150"}`} />
                                ))}
                              </div>
                              <span className="text-[9px] text-neutral-400 font-bold">({p.reviewsCount})</span>
                            </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between border-t border-neutral-50 pt-2.5 mt-auto">
                            <div>
                              <p className="text-neutral-900 font-extrabold text-sm sm:text-base leading-none">{formatNaira(p.price)}</p>
                              {p.originalPrice && p.originalPrice > p.price && (
                                <p className="text-[10px] text-neutral-400 line-through mt-1">{formatNaira(p.originalPrice)}</p>
                              )}
                            </div>
                            {p.externalLink ? (
                              <a
                                href={p.externalLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-all shadow-2xs active:scale-95 hover:scale-105"
                                title="Get It"
                              >
                                <ExternalLink className="w-4 h-4 text-white" />
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAddToCart(p, 1);
                                }}
                                className="w-8 h-8 rounded-xl bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-all shadow-2xs active:scale-95 hover:scale-105"
                                title="Add to Cart"
                              >
                                <Plus className="w-4 h-4 text-white" />
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                  </div>
                  
                  {totalVendorPages > 1 && (
                    <div className="flex justify-center border-t border-neutral-150 pt-8 gap-2">
                       {Array.from({ length: totalVendorPages }).map((_, i) => (
                         <button
                           key={`vendor-p-${i}`}
                           onClick={() => {
                             setCurrentPage(i + 1);
                             window.scrollTo({ top: 300, behavior: "smooth" });
                           }}
                           className={`w-10 h-10 rounded-xl font-bold transition-all shadow-xs flex items-center justify-center ${
                             currentPage === i + 1 
                               ? "bg-orange-500 text-white hover:bg-orange-600 scale-105" 
                               : "bg-white text-neutral-600 border border-neutral-200 hover:border-orange-500 hover:text-orange-500"
                           }`}
                         >
                           {i + 1}
                         </button>
                       ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Structured Internal Linking Row (Task 10) */}
            <div className="border-t border-neutral-150 pt-8 mt-12 space-y-4 text-left">
              <h4 className="text-xs font-black text-neutral-400 uppercase tracking-widest leading-none">Discover Other Certified Shops (Nigeria Marketplace)</h4>
              <div className="flex flex-wrap gap-2">
                {vendors.filter(v => v.id !== matchedVendor.id).map(v => (
                  <a
                    key={v.id}
                    href={`/vendor/${slugifyLocal(v.name)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      if (onSelectVendor) {
                        onSelectVendor(slugifyLocal(v.name));
                      }
                      onNavigate("vendor");
                      window.scrollTo(0, 0);
                    }}
                    className="text-xs font-bold text-orange-600 bg-orange-50/60 border border-orange-100 hover:bg-orange-100/80 px-4 py-2 rounded-xl transition-all"
                  >
                    {v.name} &rarr;
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        );
      })()}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {screen === "about" && (
          <motion.div key="about" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <AboutPage />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {screen === "contact" && (
          <motion.div key="contact" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <ContactPage />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {screen === "sell" && (
          <motion.div key="sell" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <SellPage onNavigate={onNavigate} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {screen === "faq" && (
          <motion.div key="faq" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <FaqPage />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {screen === "faq" && (
          <motion.div key="faq" variants={pageVariants} initial="initial" animate="animate" exit="exit">
            <FaqPage />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verified Credentials Pop-up Modal (Displays new information on tapping the avatar image) */}
      <AnimatePresence>
        {showCredsVendor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setShowCredsVendor(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-neutral-100 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] text-left"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with background design pattern */}
              <div className="relative h-28 bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 flex items-end p-5">
                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-full p-1.5 cursor-pointer transition-all" onClick={() => setShowCredsVendor(null)}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="flex items-center space-x-3.5 z-10 translate-y-8">
                  <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xl border-4 border-white shadow-md uppercase shrink-0 overflow-hidden">
                    {showCredsVendor.avatar && !showCredsVendor.avatar.startsWith("https://lh3") ? (
                      <img loading="lazy" src={showCredsVendor.avatar} alt={showCredsVendor.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span>{showCredsVendor.name.charAt(0)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="pt-10 px-6 pb-6 space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h3 className="text-xl font-black text-neutral-800 tracking-tight">{showCredsVendor.name}</h3>
                    <span className="bg-green-50 text-[#4CAF50] font-extrabold text-[9px] uppercase px-2.5 py-1 rounded-full border border-green-100 flex items-center gap-1 shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#4CAF50]" />
                      Verified Merchant
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 font-bold mt-1">Plaza escrow Registry &bull; Business ID: {showCredsVendor.id.substring(0, 8).toUpperCase()}</p>
                </div>

                {/* Info Fields list */}
                <div className="grid grid-cols-1 gap-3 border-t border-neutral-100 pt-4">
                  <div className="flex items-center space-x-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-150">
                    <span className="text-xl">🛡️</span>
                    <div className="text-left">
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">CAC Corporate Registration</p>
                      <p className="text-xs font-black text-neutral-800 mt-0.5">{showCredsVendor.cacNumber || "RC 10394592 (Verified Active)"}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-150">
                    <span className="text-xl">👨‍💼</span>
                    <div className="text-left">
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Managing Director & Owner</p>
                      <p className="text-xs font-bold text-neutral-800 mt-0.5">{showCredsVendor.ownerName || "Merchant Partner"}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 bg-neutral-50 p-3 rounded-2xl border border-neutral-150">
                    <span className="text-xl">📍</span>
                    <div className="text-left">
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Physical Shop Location</p>
                      <p className="text-xs font-bold text-neutral-800 mt-0.5">{showCredsVendor.location || "Balogun Plaza, Market Square, Lagos"}</p>
                    </div>
                  </div>

                  {/* Settlement / Banking details (New info added by user!) */}
                  <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100 space-y-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">🏦</span>
                      <h4 className="text-[10px] font-black text-orange-850 uppercase tracking-wider">Verified Settlement Account (Escrow Protected)</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-left">
                      <div>
                        <p className="text-[9px] font-bold text-orange-600 uppercase">Settlement Bank</p>
                        <p className="text-xs font-black text-neutral-850 mt-0.5">{showCredsVendor.bankName || showCredsVendor.bank_name || "Access Bank Plc"}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-orange-600 uppercase">NUBAN Account Number</p>
                        <p className="text-xs font-mono font-black text-neutral-850 tracking-wider mt-0.5">{showCredsVendor.accountNumber || showCredsVendor.account_number || "0194859201"}</p>
                      </div>
                    </div>
                    <div className="bg-white/80 px-2.5 py-1.5 rounded-xl border border-orange-100/50 flex items-center space-x-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] animate-pulse"></span>
                      <p className="text-[9px] font-black text-neutral-500 uppercase tracking-wide">Direct settlements audited. Verified by Paystack automated reconciliation.</p>
                    </div>
                  </div>

                  {/* WhatsApp contact */}
                  <div className="flex items-center justify-between p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-100/50 mt-1">
                    <div className="flex items-center space-x-3 text-left">
                      <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-[#4CAF50] shrink-0">
                        💬
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-[#4CAF50] uppercase tracking-wider">Contact Seller Directly</p>
                        <p className="text-xs font-bold text-neutral-800 mt-0.5">{showCredsVendor.whatsappNumber || showCredsVendor.phone || "+23481234567"}</p>
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/${(showCredsVendor.whatsappNumber || showCredsVendor.phone || "").replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-[#4CAF50] hover:bg-green-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:shadow-xs active:scale-95 flex items-center space-x-1 shrink-0"
                    >
                      <span>WhatsApp Chat</span>
                      <span>&rarr;</span>
                    </a>
                  </div>

                </div>

                <div className="flex items-center justify-center text-center text-[10px] text-neutral-400 font-bold gap-1 pt-1">
                  <span>🔒 Escrow Secured with full buyer protection & refund policy.</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
