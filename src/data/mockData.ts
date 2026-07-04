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
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80",
    iconName: "Shirt",
    itemCount: 84,
    subcategories: ["Traditional Sets", "Streetwear", "Footwear", "Accessories"]
  },
  {
    id: "electronics",
    name: "Electronics",
    description: "High-fidelity tech, devices, smartphones, headphones, and computer accessories.",
    image: "https://images.unsplash.com/photo-1496181130204-755241544e3f?auto=format&fit=crop&w=800&q=80",
    iconName: "Laptop",
    itemCount: 84,
    subcategories: ["Wireless Audio", "Laptops & PCs", "Fast Chargers", "Smart Accessories", "Fairly Used Electronics"]
  },
  {
    id: "phones",
    name: "Phones",
    description: "Latest smartphones and fairly used mobile devices.",
    image: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=800&q=80",
    iconName: "Smartphone",
    itemCount: 120,
    subcategories: ["Xiaomi", "Apple", "Tecno", "Samsung", "Infinix"]
  },
  {
    id: "cars",
    name: "Cars",
    description: "New and fairly used cars from trusted dealers.",
    image: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80",
    iconName: "Car",
    itemCount: 50,
    subcategories: ["New Cars", "Fairly Used Cars"]
  },
  {
    id: "phone-accessories",
    name: "Phone Accessories",
    description: "Essential accessories for your mobile devices.",
    image: "https://images.unsplash.com/photo-1584006682522-dc17d6c0d9ac?auto=format&fit=crop&w=800&q=80",
    iconName: "Headphones",
    itemCount: 200,
    subcategories: ["Chargers", "Power Banks", "Earbuds", "Phone Cases", "Screen Protectors", "Cables"]
  },
  {
    id: "home-kitchen",
    name: "Home and Kitchen",
    description: "Modern cookware, household essentials, appliances, and kitchen helpers.",
    image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80",
    iconName: "Home",
    itemCount: 83,
    subcategories: ["Cooking Utensils", "Appliances", "Accent Lighting", "Dining Ware"]
  },
  {
    id: "beauty",
    name: "Beauty",
    description: "Natural Nigerian body oils, organic cosmetics, skincare routines, and wellness products.",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
    iconName: "Sparkles",
    itemCount: 83,
    subcategories: ["Skincare", "Body Oils", "Hair Care", "African Black Soaps"]
  },
  {
    id: "sports",
    name: "Sports",
    description: "Athletic wear, native football jerseys, outdoor gear, and fitness accessories.",
    image: "https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=800&q=80",
    iconName: "Trophy",
    itemCount: 83,
    subcategories: ["Activewear", "Naija Jerseys", "Fitness Accessories", "Outdoor Gear"]
  },
  {
    id: "grocery",
    name: "Grocery",
    description: "Fresh locally processed Nigerian foods, spices, raw provisions, daily snacks, and flours.",
    image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80",
    iconName: "ShoppingBag",
    itemCount: 83,
    subcategories: ["Local Snacks", "Nigerian Staples", "Oils & Spices", "Cocoas & Teas"]
  },
  {
    id: "laptops",
    name: "Laptops",
    description: "Shop high-performance laptops, notebooks, ultrabooks, and workstations in Nigeria. Perfect configurations for developers, students, and businesses from top brands.",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
    iconName: "Laptop",
    itemCount: 45,
    subcategories: ["MacBook", "HP Laptops", "Dell Inspiron", "Lenovo ThinkPad", "Asus Workstations"]
  },
  {
    id: "gaming",
    name: "Gaming",
    description: "Immersive video game consoles, high-end graphics cards, virtual reality headsets, controllers, and premium gaming gear online in Nigeria.",
    image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80",
    iconName: "Gamepad2",
    itemCount: 65,
    subcategories: ["PlayStation 5", "Xbox Series X", "Nintendo Switch", "Gaming Accessories", "VR headsets"]
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

const laptopsItems = [
  "HP Pavilion Slim Laptop",
  "Apple MacBook Air M3 Ultra",
  "Dell Inspiron Workstation Pro",
  "Lenovo ThinkPad Developer Duo",
  "Asus ROG Strix Gaming Laptop"
];

const gamingItems = [
  "Sony PlayStation 5 Console Extreme",
  "Xbox Series X Wireless Bundle",
  "Nintendo Switch OLED Screen Setup",
  "Mechanical Retro Gaming Controller",
  "VR Headset Quest 3 Pro Bundle"
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
  { id: "grocery", name: "Grocery", minPrice: 1000, maxPrice: 25000, items: groceryItems },
  { id: "laptops", name: "Laptops", minPrice: 150000, maxPrice: 1200000, items: laptopsItems },
  { id: "gaming", name: "Gaming", minPrice: 15000, maxPrice: 650000, items: gamingItems }
];

export const MOCK_PRODUCTS: Product[] = [];
export const FLASH_SALE_PRODUCTS: Product[] = [];
// Product mock generation was cleared per user request.

export const MOCK_REVIEWS: any[] = [];

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
  { id: "a1", title: "Apple iPhone 17 Summer Splash", imageUrl: "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?auto=format&fit=crop&w=1200&q=80", linkUrl: "/", position: "homepage", status: "active", metrics: { impressions: 45000, clicks: 1240 }, startDate: "2026-06-01", endDate: "2026-06-30" },
  { id: "a3", title: "Premium Laptops Showcase", imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80", linkUrl: "/", position: "homepage", status: "active", metrics: { impressions: 120000, clicks: 4320 }, startDate: "2026-06-01", endDate: "2026-06-30" },
  { id: "a2", title: "Fairly Used Cars Expo", imageUrl: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80", linkUrl: "/", position: "homepage", targetCategory: "Cars", status: "active", metrics: { impressions: 0, clicks: 0 }, startDate: "2026-07-01", endDate: "2026-07-15" }
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
