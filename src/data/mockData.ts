/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Category, Vendor, Order, AdminTeamMember, Advertisement } from "../types";

export const NIGERIAN_CITIES = [
  { name: "Lagos", x: 120, y: 480, labelPos: "bottom" },
  { name: "Ibadan", x: 155, y: 430, labelPos: "top-left" },
  { name: "Abuja", x: 380, y: 320, labelPos: "top" },
  { name: "Kano", x: 440, y: 140, labelPos: "top" },
  { name: "Port Harcourt", x: 300, y: 520, labelPos: "bottom" },
  { name: "Ilorin", x: 210, y: 360, labelPos: "left" },
  { name: "Kaduna", x: 390, y: 230, labelPos: "left" },
  { name: "Maiduguri", x: 680, y: 130, labelPos: "right" },
  { name: "Enugu", x: 340, y: 420, labelPos: "right" }
];

export const MOCK_CATEGORIES: Category[] = [
  {
    id: "fashion",
    name: "Fashion",
    description: "Premium Nigerian fashion, traditional designs, apparel, and footwear.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA5oKFaFjimFRNiVk4ZskPyQaFdOoNcwqZ5kTVXhQhdFSQwmwThUya_xriBWtqNlsA0tAGEfiOXj40jbXeTeYWNTX0ZXVbm8ZrQ79ghOlxVVjghOVrVtRN5QYsuC2QQwjmFB6HyCoIhHpIuYUgcV1Fi29ryLiY8-gKc6z53SUXNB-kkDKa0qeclc7byrYDhK0gFAdSThBzKmj9oZILEcqvesze3sJwTZ_Ek3C4YdAEM3jgckByMxoiP8LRD_kTwhomV49xmPu-USntl",
    iconName: "Shirt",
    itemCount: 84,
    subcategories: ["Traditional Sets", "Streetwear", "Footwear", "Accessories"]
  },
  {
    id: "electronics",
    name: "Electronics",
    description: "High-fidelity tech, devices, smartphones, headphones, and computer accessories.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDy5GOD9-1WbSSbfqRQffobk20mSWZoV1dLV1ZXP2lENmb-STvXnzfC8OpXBmqoAF3XKdZ2zr38GMFs2YbrwhOcUFxUSnoNg43X3HRDQSfpFFZlz5_nnk-3iA03XfWQ0-YJA1WS9ytK4nkxFP3l03r7H7qE8KyKRySzJkCv87TXYqTQ90rtN-FZM2ZVh2anbHYhZhE9AkFFy80FOXuRS5RNbYh2R8uwkL7qfCkYf0xy95TZThfgpI4V1Y0uOgZtNp6KWyB0IB6c4ltB",
    iconName: "Laptop",
    itemCount: 84,
    subcategories: ["Wireless Audio", "Laptops & PCs", "Fast Chargers", "Smart Accessories", "Fairly Used Electronics"]
  },
  {
    id: "phones",
    name: "Phones",
    description: "Latest smartphones and fairly used mobile devices.",
    image: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=500&q=80",
    iconName: "Smartphone",
    itemCount: 120,
    subcategories: ["Smartphones", "Fairly Used Phones", "New Phones"]
  },
  {
    id: "cars",
    name: "Cars",
    description: "New and fairly used cars from trusted dealers.",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=500&q=80",
    iconName: "Car",
    itemCount: 50,
    subcategories: ["New Cars", "Fairly Used Cars"]
  },
  {
    id: "phone-accessories",
    name: "Phone Accessories",
    description: "Essential accessories for your mobile devices.",
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?auto=format&fit=crop&w=500&q=80",
    iconName: "Headphones",
    itemCount: 200,
    subcategories: ["Chargers", "Power Banks", "Earbuds", "Phone Cases", "Screen Protectors", "Cables"]
  },
  {
    id: "home-kitchen",
    name: "Home and Kitchen",
    description: "Modern cookware, household essentials, appliances, and kitchen helpers.",
    image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=500&q=80",
    iconName: "Home",
    itemCount: 83,
    subcategories: ["Cooking Utensils", "Appliances", "Accent Lighting", "Dining Ware"]
  },
  {
    id: "beauty",
    name: "Beauty",
    description: "Natural Nigerian body oils, organic cosmetics, skincare routines, and wellness products.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCXcNrYLLAD2B0Jdg4rSvx49n-hyrX2ZsfZjp4ynE8d3wKmxxRMEnWCEEBvxLSrFsmC0yJEgYZoqlEThCW48fz8y5D9b_XcW76yxnNBILOQ8TVr_YWBdpMRY72JdwHF8hWs_Wnhopje6KR-bWZH9mReWxQBBMDHvLo_NIUEeY5m-Z4KLRfd9QpVuLlrLWUIakCKJu3nWjrEfH9y3QX-b_A6-M5izgMKDxoLc-hNpbqTHH_uP8TdLh-AdBfTzE0GPql74NRa6pIyvGxG",
    iconName: "Sparkles",
    itemCount: 83,
    subcategories: ["Skincare", "Body Oils", "Hair Care", "African Black Soaps"]
  },
  {
    id: "sports",
    name: "Sports",
    description: "Athletic wear, native football jerseys, outdoor gear, and fitness accessories.",
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=500&q=80",
    iconName: "Trophy",
    itemCount: 83,
    subcategories: ["Activewear", "Naija Jerseys", "Fitness Accessories", "Outdoor Gear"]
  },
  {
    id: "grocery",
    name: "Grocery",
    description: "Fresh locally processed Nigerian foods, spices, raw provisions, daily snacks, and flours.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAu683NWIz41rf9BrFcqAl9nUQGkGXSJnWAws_BUjK-cHIRa7BmKNrrx0q03hMwVFCyfW9_JhFD0AGtZfw1f9b9xyea7gNryucoXeCll39GbyowyFVPtKthcjfwD-eWJ5kifJrVU26WPp4WMoUcCgCb2IRpedtK5MrngzO08UHXByPr6S1qpY0uk6EunXxc8M9N7ym1mF7PldkseWVx_KHgtueakc9-NxIAlfj52hLPsfPBq11FiQyddU58uyOfHwJiekvXimImHQyA",
    iconName: "ShoppingBag",
    itemCount: 83,
    subcategories: ["Local Snacks", "Nigerian Staples", "Oils & Spices", "Cocoas & Teas"]
  }
];

// Helper to generate consistent deterministic values
function getDeterministicValue(index: number, min: number, max: number): number {
  const seed = (index * 9301 + 49297) % 233280;
  const random = seed / 233280;
  return Math.floor(min + random * (max - min));
}

const fashionItems = [
  "Men's Cotton Shirt",
  "Slim Fit Chinos Trousers",
  "Classic Leather Belt",
  "Unisex Denim Jacket",
  "Ankara Canvas Sneakers",
  "Premium Leather Slides",
  "Casual Summer Shorts",
  "Linen Short Sleeve Shirt",
  "Running Athletic Socks",
  "Kaftan Traditional Attire",
  "Cozy Knit Sweater",
  "Aviator UV Sunglasses",
  "Cotton Polo T-Shirt",
  "Waterproof Sport Watch"
];

const electronicsItems = [
  "Bluetooth Earbuds",
  "Wireless Charging Pad",
  "Smart Fitness Tracker",
  "Portable Power Bank 20k",
  "Noise Cancelling Headphones",
  "LED Desk Lamp USB",
  "Mechanical Gaming Keyboard",
  "Ergonomic Wireless Mouse",
  "Mini Bluetooth Speaker",
  "4K Ultra HD Dashcam",
  "USB-C Multi-Port Adapter",
  "Smart Home Plug Wi-Fi",
  "LCD Writing Tablet",
  "Dual Port Fast Charger"
];

const homeItems = [
  "Rice Cooker 2L",
  "Electric Kettle 1.8L",
  "Non-Stick Fry Pan 26cm",
  "Stainless Steel Cutleries",
  "Personal Blender 500W",
  "Ceramic Coffee Mug Set",
  "LED Ambient Strip Lights",
  "Storage Container Set",
  "Digital Kitchen Scale",
  "Memory Foam Pillow",
  "Silicone Cooking Utensils",
  "Manual Citrus Juicer",
  "Microfiber Cleaning Cloths",
  "Wall Mounted Key Holder"
];

const beautyItems = [
  "Pure Organic Shea Butter",
  "Hydrating Coconut Body Oil",
  "Natural Herbal Face Wash",
  "Moisturizing Lip Balm",
  "Aloe Vera Soothing Gel",
  "Gentle Exfoliating Scrub",
  "Teatree Acne Clarifier",
  "Nourishing Hair Serum",
  "African Black Soap Liquid",
  "Rosewater Face Toner Spray",
  "Vitamin C Glow Serum",
  "Moisturizing Face Cream",
  "Peppermint Foot Scrub",
  "Lavender Essential Oil"
];

const sportsItems = [
  "Premium Football Jersey",
  "Resistance Bands Set",
  "High Density Yoga Mat",
  "Stainless Steel Flask 1L",
  "Digital Jump Rope",
  "Sports Gym Duffle Bag",
  "Breathable Running Hat",
  "Compression Knee Sleeve",
  "Adjustable Hand Grip",
  "Lightweight Workout Gloves",
  "Speed Agility Ladder",
  "Microfiber Sports Towel",
  "Elastic Waist Trimmer",
  "Athletic Running Shoes"
];

const groceryItems = [
  "Crunchy Chin Chin Tub 1kg",
  "Premium Long Grain Rice",
  "Whole Wheat Flour 2kg",
  "Organic Palm Oil 1L",
  "Pure Blossom Honey 500g",
  "Gourmet Suya Spice Blend",
  "Dried Plantain Chips Bag",
  "Roasted Cashew Nuts Pack",
  "Rich Cocoa Powder 400g",
  "Instant Custard Powder",
  "Aromatic Camomile Tea",
  "Premium Iodized Salt Bag",
  "Ground Nutmeg Powder",
  "Natural Coconut Flakes"
];

const phonesItems = [
  "Latest Smartphone Pro",
  "Budget Android Phone",
  "Business Enterprise Phone",
  "Photography Centric Device"
];

const carsItems = [
  "Luxury Executive Sedan",
  "Compact Family SUV",
  "Economy Daily Hatchback",
  "Premium Hybrid Auto"
];

const accessoriesItems = [
  "Super Fast Charger 20W",
  "High Capacity 10000mAh Power Bank",
  "True Wireless Stereo Earbuds",
  "Shockproof Silicone Phone Case",
  "Tempered Glass Screen Protector",
  "Durable Braided USB-C Cable",
  "Magnetic Car Mount Holder",
  "Bluetooth Audio Receiver"
];

const categoriesInfo = [
  { id: "fashion", name: "Fashion", minPrice: 5000, maxPrice: 35000, items: fashionItems },
  { id: "electronics", name: "Electronics", minPrice: 10000, maxPrice: 250000, items: electronicsItems },
  { id: "phones", name: "Phones", minPrice: 50000, maxPrice: 1500000, items: phonesItems },
  { id: "cars", name: "Cars", minPrice: 2000000, maxPrice: 45000000, items: carsItems },
  { id: "phone-accessories", name: "Phone Accessories", minPrice: 1500, maxPrice: 25000, items: accessoriesItems },
  { id: "home-kitchen", name: "Home and Kitchen", minPrice: 3000, maxPrice: 80000, items: homeItems },
  { id: "beauty", name: "Beauty", minPrice: 2000, maxPrice: 45000, items: beautyItems },
  { id: "sports", name: "Sports", minPrice: 4000, maxPrice: 60000, items: sportsItems },
  { id: "grocery", name: "Grocery", minPrice: 1000, maxPrice: 25000, items: groceryItems }
];

export const MOCK_PRODUCTS: Product[] = [];

let idCounter = 1;
categoriesInfo.forEach((catInfo, catIdx) => {
  const count = (catIdx < 2) ? 60 : 40; // Reduced count to keep overall realistic
  for (let i = 0; i < count; i++) {
    const baseItemIndex = i % catInfo.items.length;
    const baseItem = catInfo.items[baseItemIndex];
    const variationNum = Math.floor(i / catInfo.items.length) + 1;
    let title = baseItem;
    if (variationNum > 1) {
      const extraSpecifiers = [
        "Pro Edition", "Premium Brand", "Eco Selection", "Classic Fit", "New Edition",
        "Ultra Durable", "Smart Comfort", "Export Quality", "Home Choice", "Special Blend"
      ];
      const specifier = extraSpecifiers[i % extraSpecifiers.length];
      title = `${baseItem} (${specifier} #${variationNum})`;
    }

    const price = getDeterministicValue(idCounter, catInfo.minPrice, catInfo.maxPrice);
    const stock = getDeterministicValue(idCounter + 200, 5, 200);
    const ratingRaw = 4 + (getDeterministicValue(idCounter + 400, 4, 9) / 10);
    const reviewsCount = getDeterministicValue(idCounter + 600, 10, 350);
    
    // Add fairly used and commission logic
    let condition: "New" | "Fairly Used" = "New";
    let subCategory = "Miscellaneous";

    if (catInfo.id === "phones") {
      condition = i % 2 === 0 ? "New" : "Fairly Used";
      subCategory = condition === "New" ? "New Phones" : "Fairly Used Phones";
    } else if (catInfo.id === "cars") {
      condition = i % 3 === 0 ? "New" : "Fairly Used";
      subCategory = condition === "New" ? "New Cars" : "Fairly Used Cars";
    } else if (catInfo.id === "phone-accessories") {
      subCategory = "Chargers"; 
      if (title.includes("Power Bank")) subCategory = "Power Banks";
      if (title.includes("Earbuds")) subCategory = "Earbuds";
      if (title.includes("Case")) subCategory = "Phone Cases";
      if (title.includes("Protector")) subCategory = "Screen Protectors";
      if (title.includes("Cable")) subCategory = "Cables";
    } else if (catInfo.id === "electronics" && i % 4 === 0) {
       condition = "Fairly Used";
       subCategory = "Fairly Used Electronics";
    }

    const commissionPercentage = getDeterministicValue(idCounter + 800, 5, 20); // 5% to 20% commission

    // Keep product cards image-free and leave image slots empty
    const image = "";

    MOCK_PRODUCTS.push({
      id: `p${idCounter}`,
      title,
      description: `A reliable and highly rated ${title.toLowerCase()} from our premium ${catInfo.name} line. Offers exceptional durability, high utility, and superior local quality. Designed for performance.`,
      price,
      image,
      rating: Number(ratingRaw.toFixed(1)),
      reviewsCount,
      category: catInfo.name,
      subCategory,
      condition,
      commissionPercentage,
      vendorId: i % 3 === 0 ? "v_heritage" : i % 3 === 1 ? "v_alaba" : "v_compvillage",
      vendorName: i % 3 === 0 ? "Eko Heritage Weavers" : i % 3 === 1 ? "Alaba Digital Hub" : "Computer Village Depot",
      stock,
      isBestSeller: idCounter % 15 === 0,
      isTrending: idCounter % 17 === 0,
      isNew: idCounter % 19 === 0,
    });
    idCounter++;
  }
});

export const FLASH_SALE_PRODUCTS: Product[] = [
  {
    id: "fs1",
    title: "Zealot 80W Super Bass Bluetooth Speaker With 16000mAh Battery S97",
    description: "Experience premium super bass sound with the Zealot 80W Bluetooth Speaker. Comes with massive 16000mAh battery for extended playback.",
    price: 98490,
    originalPrice: 120109, // ~18% off
    salePercentage: 18,
    image: "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=500&q=80",
    rating: 4.8,
    reviewsCount: 324,
    category: "Electronics",
    subCategory: "Wireless Audio",
    condition: "New",
    commissionPercentage: 10,
    vendorId: "v_alaba",
    vendorName: "Alaba Digital Hub",
    stock: 37,
    isBestSeller: true,
    isTrending: true,
    isNew: false
  },
  {
    id: "fs2",
    title: "itel 100,000mAh 320Wh Power Go Portable Power Station 130W, LiFePO4 Battery IESS-320T",
    description: "Never run out of power with the massive 100,000mAh portable power station. Reliable, durable LiFePO4 battery perfect for emergencies.",
    price: 108990,
    originalPrice: 160279, // ~32% off
    salePercentage: 32,
    image: "https://images.unsplash.com/photo-1619642055663-aa248380e2d3?auto=format&fit=crop&w=500&q=80",
    rating: 4.9,
    reviewsCount: 156,
    category: "Electronics",
    subCategory: "Power Banks",
    condition: "New",
    commissionPercentage: 8,
    vendorId: "v_compvillage",
    vendorName: "Computer Village Depot",
    stock: 34,
    isBestSeller: true,
    isTrending: true,
    isNew: true
  },
  {
    id: "fs3",
    title: 'Binatone 18" Rechargeable Fan With Lithium-Ion Batteries (RCF-1865)_2',
    description: "Stay cool during power outages with the original Binatone 18-inch rechargeable fan. Long-lasting lithium-ion batteries included.",
    price: 45000,
    originalPrice: 55000,
    salePercentage: 18,
    image: "https://images.unsplash.com/photo-1549281899-7f9e8020e544?auto=format&fit=crop&w=500&q=80",
    rating: 4.6,
    reviewsCount: 89,
    category: "Home and Kitchen",
    subCategory: "Appliances",
    condition: "New",
    commissionPercentage: 12,
    vendorId: "v_heritage",
    vendorName: "Eko Heritage Weavers",
    stock: 15,
    isBestSeller: false,
    isTrending: true,
    isNew: false
  }
];

MOCK_PRODUCTS.push(...FLASH_SALE_PRODUCTS);

export const MOCK_REVIEWS = [
  {
    id: "r1",
    author: "Fatima Abubakar",
    text: "Excellent product quality. Fast delivery and exactly what was described. Highly recommended!",
    stars: 5,
    date: "2 days ago",
    isVerified: true,
    avatarInitials: "FA"
  },
  {
    id: "r2",
    author: "Chinedu Okafor",
    text: "Fast logistics to Enugu, got it within 48 hours in perfect condition! Excellent support.",
    stars: 5,
    date: "1 week ago",
    isVerified: true,
    avatarInitials: "CO"
  },
  {
    id: "r3",
    author: "Olumide Johnson",
    text: "Perfect purchase. Unbeatable value and exceptional quality. Will definitely order again.",
    stars: 4,
    date: "3 weeks ago",
    isVerified: true,
    avatarInitials: "OJ"
  }
];

export const MOCK_ORDERS: Order[] = [
  {
    id: "NS-9941",
    customerName: "Obinna Igwe",
    status: "Delivered",
    date: "2026-06-04",
    value: 185000,
    itemsCount: 1,
    trackingId: "TRACK-9941",
    routeFrom: "Kano",
    routeTo: "Lagos",
    deliveryProgress: 100,
    currentCity: "Lagos"
  },
  {
    id: "NS-9942",
    customerName: "Amina Yusuf",
    status: "Processing",
    date: "2026-06-05",
    value: 135000,
    itemsCount: 1,
    trackingId: "TRACK-9942",
    routeFrom: "Lagos",
    routeTo: "Abuja",
    deliveryProgress: 45,
    currentCity: "Ilorin"
  },
  {
    id: "NS-9943",
    customerName: "Kelechi Nwosu",
    status: "Shipped",
    date: "2026-06-05",
    value: 45000,
    itemsCount: 1,
    trackingId: "TRACK-9943",
    routeFrom: "Lagos",
    routeTo: "Port Harcourt",
    deliveryProgress: 75,
    currentCity: "Enugu"
  },
  {
    id: "NS-9944",
    customerName: "Tolu Oyelese",
    status: "Flagged",
    date: "2026-06-03",
    value: 849000,
    itemsCount: 1,
    trackingId: "TRACK-9944",
    routeFrom: "Lagos",
    routeTo: "Kano",
    deliveryProgress: 15,
    currentCity: "Ibadan"
  }
];

export const MOCK_VENDORS: Vendor[] = [
  {
    id: "v_heritage",
    name: "Eko Heritage Weavers",
    ownerName: "Alimi Oladipupo",
    avatar: "https://lh3.googleusercontent.com/v_heritage",
    rating: 4.9,
    ratingCount: 145,
    salesToday: 342050,
    ordersPending: 8,
    stockAlerts: 3,
    email: "heritage@naijastores.ng",
    phone: "+234 803 111 2233",
    location: "Isale Eko, Lagos State"
  },
  {
    id: "v_alaba",
    name: "Alaba Digital Hub",
    ownerName: "Emeka Okafor",
    avatar: "https://lh3.googleusercontent.com/v_alaba",
    rating: 4.8,
    ratingCount: 320,
    salesToday: 540000,
    ordersPending: 5,
    stockAlerts: 1,
    email: "alabadigital@naijastores.ng",
    phone: "+234 812 333 4455",
    location: "Alaba Int'l Market, Ojo, Lagos"
  },
  {
    id: "v_compvillage",
    name: "Computer Village Depot",
    ownerName: "Ngozi Adebayo",
    avatar: "https://lh3.googleusercontent.com/v_compvillage",
    rating: 4.6,
    ratingCount: 210,
    salesToday: 1250000,
    ordersPending: 12,
    stockAlerts: 4,
    email: "computervillage@naijastores.ng",
    phone: "+234 809 444 5566",
    location: "Yaba-Ikeja Axis, Lagos State"
  },
  {
    id: "v_balogun",
    name: "Balogun Leather Craft",
    ownerName: "Yakubu Bello",
    avatar: "https://lh3.googleusercontent.com/v_balogun",
    rating: 4.7,
    ratingCount: 95,
    salesToday: 180000,
    ordersPending: 4,
    stockAlerts: 2,
    email: "balogunleather@naijastores.ng",
    phone: "+234 705 555 6677",
    location: "Balogun Market, Lagos Mainland"
  },
  {
    id: "v_sheabeauty",
    name: "Shea & Beauty Enugu",
    ownerName: "Chioma Nze",
    avatar: "https://lh3.googleusercontent.com/v_sheabeauty",
    rating: 4.8,
    ratingCount: 150,
    salesToday: 95000,
    ordersPending: 2,
    stockAlerts: 0,
    email: "sheabeauty@naijastores.ng",
    phone: "+234 802 777 8899",
    location: "GRA Division, Enugu State"
  },
  {
    id: "v_snacks",
    name: "Naija Sweet Treats",
    ownerName: "Tunde Oshinowo",
    avatar: "https://lh3.googleusercontent.com/v_snacks",
    rating: 4.5,
    ratingCount: 88,
    salesToday: 110000,
    ordersPending: 3,
    stockAlerts: 1,
    email: "sweettreats@naijastores.ng",
    phone: "+234 815 888 9900",
    location: "Surulere, Lagos"
  },
  {
    id: "v_lekki",
    name: "Lekki Elite Optics",
    ownerName: "Bassey Albert",
    avatar: "https://lh3.googleusercontent.com/v_lekki",
    rating: 4.7,
    ratingCount: 64,
    salesToday: 240000,
    ordersPending: 1,
    stockAlerts: 2,
    email: "lekkioptics@naijastores.ng",
    phone: "+234 901 222 3344",
    location: "Phase 1, Lekki, Lagos"
  },
  {
    id: "v_yaba",
    name: "Yaba Streetwear",
    ownerName: "Segun Arinze",
    avatar: "https://lh3.googleusercontent.com/v_yaba",
    rating: 4.4,
    ratingCount: 112,
    salesToday: 152000,
    ordersPending: 6,
    stockAlerts: 5,
    email: "yabastreetwear@naijastores.ng",
    phone: "+234 818 444 3322",
    location: "Herbert Macaulay Way, Yaba"
  }
];

export const MOCK_ADS: Advertisement[] = [
  { id: "a1", title: "Summer iPhone Splash", imageUrl: "https://images.unsplash.com/photo-1605236453806-6ff368528bb7?auto=format&fit=crop&w=1200&q=80", linkUrl: "/", position: "homepage", status: "active", metrics: { impressions: 45000, clicks: 1240 }, startDate: "2026-06-01", endDate: "2026-06-30" },
  { id: "a3", title: "Fashion Week Promo", imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1200&q=80", linkUrl: "/", position: "homepage", status: "active", metrics: { impressions: 120000, clicks: 4320 }, startDate: "2026-06-01", endDate: "2026-06-30" },
  { id: "a2", title: "Fairly Used Cars Expo", imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=1200&q=80", linkUrl: "/", position: "category", targetCategory: "Cars", status: "scheduled", metrics: { impressions: 0, clicks: 0 }, startDate: "2026-07-01", endDate: "2026-07-15" }
];

export const MOCK_TEAM_MEMBERS: AdminTeamMember[] = [
  {
    id: "t1",
    name: "Alex Rivers",
    email: "alex.r@naijastores.ng",
    role: "Platform Lead Administrator",
    status: "Online",
    lastActive: "Just now",
    twoFactorEnabled: true,
    initials: "AR"
  },
  {
    id: "t2",
    name: "Folake Balogun",
    email: "folake.b@naijastores.ng",
    role: "Finance & Reconciliation",
    status: "Online",
    lastActive: "Just now",
    twoFactorEnabled: true,
    initials: "FB"
  },
  {
    id: "t3",
    name: "Musa Yaradua",
    email: "musa.y@naijastores.ng",
    role: "Logistics Specialist",
    status: "Away",
    lastActive: "15 min ago",
    twoFactorEnabled: true,
    initials: "MY"
  },
  {
    id: "t4",
    name: "Ngozi Nwankwo",
    email: "ngozi@naijastores.ng",
    role: "Vendor Onboarding & Verification",
    status: "Offline",
    lastActive: "2 days ago",
    twoFactorEnabled: false,
    initials: "NN"
  }
];
