/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Category, Vendor, Order, AdminTeamMember } from "../types";

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
    name: "Naija Fashion & Ankara",
    description: "Premium handcrafted Agbada, Ankara kaftans, Aso-Oke, streetwear, and matching accessories.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA5oKFaFjimFRNiVk4ZskPyQaFdOoNcwqZ5kTVXhQhdFSQwmwThUya_xriBWtqNlsA0tAGEfiOXj40jbXeTeYWNTX0ZXVbm8ZrQ79ghOlxVVjghOVrVtRN5QYsuC2QQwjmFB6HyCoIhHpIuYUgcV1Fi29ryLiY8-gKc6z53SUXNB-kkDKa0qeclc7byrYDhK0gFAdSThBzKmj9oZILEcqvesze3sJwTZ_Ek3C4YdAEM3jgckByMxoiP8LRD_kTwhomV49xmPu-USntl",
    iconName: "apparel",
    itemCount: 432,
    subcategories: ["Men's Traditional Set", "Ankara Gowns", "Aso-Oke Heritage", "Lagos Streetwear", "Kola & Leather Crafts"]
  },
  {
    id: "electronics",
    name: "Naija Tech Hub",
    description: "High-performance laptops, noise-cancelling headphones, screens, smart accessories, and developer hardware.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDy5GOD9-1WbSSbfqRQffobk20mSWZoV1dLV1ZXP2lENmb-STvXnzfC8OpXBmqoAF3XKdZ2zr38GMFs2YbrwhOcUFxUSnoNg43X3HRDQSfpFFZlz5_nnk-3iA03XfWQ0-YJA1WS9ytK4nkxFP3l03r7H7qE8KyKRySzJkCv87TXYqTQ90rtN-FZM2ZVh2anbHYhZhE9AkFFy80FOXuRS5RNbYh2R8uwkL7qfCkYf0xy95TZThfgpI4V1Y0uOgZtNp6KWyB0IB6c4ltB",
    iconName: "devices",
    itemCount: 154,
    subcategories: ["Laptops & PCs", "Wireless Audio", "Creatives Tab", "Smart Wearables", "Displays & Accessories"]
  },
  {
    id: "groceries",
    name: "Naija Foods & Raw Goods",
    description: "Fresh farm produce, processed Nigerian food items, chin-chin snacks, plantain chips, and regional commodities.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAu683NWIz41rf9BrFcqAl9nUQGkGXSJnWAws_BUjK-cHIRa7BmKNrrx0q03hMwVFCyfW9_JhFD0AGtZfw1f9b9xyea7gNryucoXeCll39GbyowyFVPtKthcjfwD-eWJ5kifJrVU26WPp4WMoUcCgCb2IRpedtK5MrngzO08UHXByPr6S1qpY0uk6EunXxc8M9N7ym1mF7PldkseWVx_KHgtueakc9-NxIAlfj52hLPsfPBq11FiQyddU58uyOfHwJiekvXimImHQyA",
    iconName: "shopping_bag",
    itemCount: 228,
    subcategories: ["Snacks & Sweets", "Flour & Grains", "Palm Oils & Spices", "Dried Proteins", "Cocoa & Coffees"]
  },
  {
    id: "beauty",
    name: "Shea Butter & Cosmetics",
    description: "Premium organic cosmetic formulations, locally processed shea butter, herbal soaps, and wellness oils.",
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCXcNrYLLAD2B0Jdg4rSvx49n-hyrX2ZsfZjp4ynE8d3wKmxxRMEnWCEEBvxLSrFsmC0yJEgYZoqlEThCW48fz8y5D9b_XcW76yxnNBILOQ8TVr_YWBdpMRY72JdwHF8hWs_Wnhopje6KR-bWZH9mReWxQBBMDHvLo_NIUEeY5m-Z4KLRfd9QpVuLlrLWUIakCKJu3nWjrEfH9y3QX-b_A6-M5izgMKDxoLc-hNpbqTHH_uP8TdLh-AdBfTzE0GPql74NRa6pIyvGxG",
    iconName: "self_care",
    itemCount: 94,
    subcategories: ["Body Creams", "Black Soaps", "Hair Cleansers", "Natural Serums", "Aromas & Incense"]
  }
];

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    title: "Presidential Royal Handwoven Agbada Set",
    description: "A breathtaking Presidential Agbada constructed of masterfully handwoven Aso-Oke by Yoruba heritage weavers. Heavy structural elegance featuring custom embroidery lines. This set comes complete with matching trousers, inner tunic (Buba & Sokoto), and prestige cap (Fila). Expresses ultimate nobility for weddings, kingship titles, and sovereign occasions.",
    price: 185000,
    originalPrice: 220000,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuA5oKFaFjimFRNiVk4ZskPyQaFdOoNcwqZ5kTVXhQhdFSQwmwThUya_xriBWtqNlsA0tAGEfiOXj40jbXeTeYWNTX0ZXVbm8ZrQ79ghOlxVVjghOVrVtRN5QYsuC2QQwjmFB6HyCoIhHpIuYUgcV1Fi29ryLiY8-gKc6z53SUXNB-kkDKa0qeclc7byrYDhK0gFAdSThBzKmj9oZILEcqvesze3sJwTZ_Ek3C4YdAEM3jgckByMxoiP8LRD_kTwhomV49xmPu-USntl",
    rating: 4.9,
    reviewsCount: 124,
    category: "Naija Fashion & Ankara",
    vendorId: "v_heritage",
    vendorName: "Eko Heritage Weavers",
    sizes: ["Medium", "Large", "X-Large"],
    colors: ["Koli Royal Blue", "Alabaster White", "Prestige Black"],
    stock: 8,
    isBestSeller: true,
    highlights: [
      "100% Cotton-Silk blended handspun thread",
      "Traditional 'Asaro' hand-embroidery patterns on chest piece",
      "Breathtaking weight and formal traditional fall",
      "Crafted inside Ibadan heritage hubs"
    ],
    whatsInTheBox: [
      "Outside Agbada Robe",
      "Inner Tunics (Top & Trouser)",
      "Traditional Prestige Fila Cap",
      "Velvet-lined Storage Bag"
    ]
  },
  {
    id: "p2",
    title: "Precision Pro Wireless ANC Headphones (Classic)",
    description: "Next Generation high fidelity over-ear headphones customized with deep noise isolation up to 35dB. Outfitted with 40mm premium drivers tuned for bass and instrumental precision. Features modern dual devices pairing, fast charger with quick 10-minute top-ups for 4 hours playback, and full leather padding for a highly enjoyable wear.",
    price: 135000,
    originalPrice: 180000,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDDYPqYFkjaKdJ3qcGBKO6_Re4LJQhmYSE6kb2HIuIatWoHdHbwSUURYQ1ee05rL4KDv0ZrCYz0HQGFZUpjx5nL8TKNngTvTbZeO2l9efvd3jh14TWcjrlPJqU-5dsg7l6iqZBy-dOdePCJ9W-STY63egQRP70UBdmK8yjiaUjnp3jY-VbnLOgC87pSiXke7xrmDD4eLZUWKT-I607K82i12F8xBkcT4WbnsFyby4hivF13tFwbtMgqa6WsEJlucO3EZ1l_zLsCMpN3",
    rating: 4.8,
    reviewsCount: 1248,
    category: "Naija Tech Hub",
    vendorId: "v_alaba",
    vendorName: "Alaba Digital Hub",
    colors: ["Slate Charcoal", "Silver Satin", "Lagoon Green"],
    stock: 45,
    isBestSeller: true,
    highlights: [
      "Hybrid Active Noise Isolation technology",
      "Full 40-Hour listening lifespan",
      "Sweat and splash rating of IPX4",
      "Built-in 4-mic configuration for crystal calls"
    ],
    whatsInTheBox: [
      "Precision Pro Headphones",
      "Zip-up Hard Travel Case",
      "Type-C Rapid Cord",
      "3.5mm Aux Adapter Cords",
      "Full Operating Guides"
    ]
  },
  {
    id: "p3",
    title: "ProStation X1 Ultra Laptop - 32GB RAM",
    description: "The ultimate computing workstation engineered for Nigerian creatives and software engineers. Empowered with massive 32GB LPDDR5 system RAM and a ultra-fast 1TB NVMe Solid State Drive. It features a bright, eye-safe 16-inch displays and a modern aluminum build designed to withstand heat and fast-paced usage. Supports supercharging so you are never left offline in blackouts.",
    price: 849000,
    originalPrice: 999000,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCbYcKlR0YosM9ximABFoaiSUDMUrUEv5BcUy6aTHGt59PRX17YBnWoLZbRDI56hq1D2Eyl50EEP4j6J6WujpXV9F13MJYvlfYPIDZwdfvCGAxbvtPNR2wjJ17h4Xls3Uqu5Tkot1sk678S9ezX5uIPaBbnVAQljNJtW8HgLk4wUOZ5hRUa_41TIDdR-P3N2FpAK6EHgGGQWnj3ApljvB67Rf00q1xoM9SLfm5DOsbrbZgRmKHYRXJxXw9XskjNr9b-8SxnqLDAq_Hm",
    rating: 4.9,
    reviewsCount: 76,
    category: "Naija Tech Hub",
    vendorId: "v_compvillage",
    vendorName: "Computer Village Depot",
    stock: 4,
    isTrending: true,
    highlights: [
      "Latest Core Processor with peak turbo boots",
      "Immersive 120Hz display refresh rate",
      "Industrial aluminum structural layout",
      "Backlit silent keyboard with spill drainage"
    ],
    whatsInTheBox: [
      "ProStation Laptop workstation",
      "Multi-port Fast Power Adaptor",
      "User Instructions brochure",
      "Velvet Sleeve"
    ]
  },
  {
    id: "p4",
    title: "Handcrafted Eko Calfskin Leather Slides",
    description: "Engineered from exceptionally supple premium Nigerian calfskin, these slides are entirely hand-shaped in the Balogun artisans' quarters. Outfitted with an elegant dual-cross strap with metal rivets and a contoured cushioned cork footbed. Perfect for daily luxury walks through the islands or warm weather styling around Lekki.",
    price: 32000,
    originalPrice: 45000,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBXHHRDhnfXAPzOsfwJAJsaalg4cWfRii5vBleuGOxKrptM-qmw3JgFBhmDSeXClxBlfi3YbQJiQs13dl3CJxFMTrEsoeKAI1JkXEckU88mcDf64zuwrUdWJW8NNuhXEbmbimeAKXSCpzoTENrA7IaXi3jzD_WCPb-on3IiWMAikNItCyKkPDuCIxGIIFS30rf-qvm-aGDzOiKqproxCid4Yu_VB_ycleJTW0iXWyz1WZUzAk_v-gZdvKW2YKJet89-kA4ee4AC0u9d",
    rating: 4.7,
    reviewsCount: 88,
    category: "Naija Fashion & Ankara",
    vendorId: "v_balogun",
    vendorName: "Balogun Leather Craft",
    sizes: ["41", "42", "43", "44", "45"],
    colors: ["Classic Mahogany", "Ebony Black"],
    stock: 12,
    isTrending: true,
    highlights: [
      "100% sourced Nigerian genuine leather",
      "Moisture-wicking contoured footbeds",
      "Reinforced heavy stitching for ultimate longevity",
      "Non-skid flexible rubber outside soles"
    ]
  },
  {
    id: "p5",
    title: "100% Organic Raw Okene Shea Butter (2kg)",
    description: "Pure, grade-A unrefined shea butter sourced directly from local cooperatives in Nigeria. Hand-extracted using age-old organic warm pressing methods that lock in vitamins A, E, and therapeutic skin-loving lipids. Smooth, creamy texture with a natural nutty aroma, perfect for locking in glow, nourishing curls, and treating eczema.",
    price: 14500,
    originalPrice: 18000,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCXcNrYLLAD2B0Jdg4rSvx49n-hyrX2ZsfZjp4ynE8d3wKmxxRMEnWCEEBvxLSrFsmC0yJEgYZoqlEThCW48fz8y5D9b_XcW76yxnNBILOQ8TVr_YWBdpMRY72JdwHF8hWs_Wnhopje6KR-bWZH9mReWxQBBMDHvLo_NIUEeY5m-Z4KLRfd9QpVuLlrLWUIakCKJu3nWjrEfH9y3QX-b_A6-M5izgMKDxoLc-hNpbqTHH_uP8TdLh-AdBfTzE0GPql74NRa6pIyvGxG",
    rating: 4.8,
    reviewsCount: 312,
    category: "Shea Butter & Cosmetics",
    vendorId: "v_sheabeauty",
    vendorName: "Shea & Beauty Enugu",
    stock: 200,
    isBestSeller: true,
    highlights: [
      "No added mineral oils, chemicals or synthetic perfume",
      "Extremely light structural fall on hair and skin pores",
      "Rich in raw anti-inflammatory agents",
      "Packed inside reusable ecological containers"
    ],
    whatsInTheBox: [
      "2kg Tub Unrefined Shea Butter",
      "Mini wooden scoops",
      "Recipe card booklet for DIY hair masques"
    ]
  },
  {
    id: "p6",
    title: "Chin Chin Gourmet Celebration Tub (5kg)",
    description: "Indulge in Naija's most beloved snack! This giant luxury bucket contains 5kg of extremely crunchy, delicious golden chin-chin bites made in a strictly organic bakery in Lagos. Crafted with a premium vanilla-nutmeg infusion, it offers the ultimate high-spirit crunch without greasy residues. Perfect for sharing inside home gatherings, office desks, or child birthday bashes.",
    price: 18000,
    originalPrice: 22000,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAu683NWIz41rf9BrFcqAl9nUQGkGXSJnWAws_BUjK-cHIRa7BmKNrrx0q03hMwVFCyfW9_JhFD0AGtZfw1f9b9xyea7gNryucoXeCll39GbyowyFVPtKthcjfwD-eWJ5kifJrVU26WPp4WMoUcCgCb2IRpedtK5MrngzO08UHXByPr6S1qpY0uk6EunXxc8M9N7ym1mF7PldkseWVx_KHgtueakc9-NxIAlfj52hLPsfPBq11FiQyddU58uyOfHwJiekvXimImHQyA",
    rating: 4.9,
    reviewsCount: 450,
    category: "Naija Foods & Raw Goods",
    vendorId: "v_snacks",
    vendorName: "Naija Sweet Treats",
    stock: 80,
    isNew: true,
    highlights: [
      "No added chemical preservatives",
      "Baked using zero trans-fat high-melting oils",
      "Extremely long three-month crispness lifespan",
      "Airtight handle bucket for absolute safety"
    ]
  },
  {
    id: "p7",
    title: "Aero Shades Pro - Lekki Aviator Edition",
    description: "Turn heads at any island social! Styled with high-performance dark lenses offering total UV shielding. Framed in high-quality tortoise acetate shell with metal accents for absolute strength and lightness. Represents elegant, luxury status for beaches, street walks, and sunset beach parties.",
    price: 45000,
    originalPrice: 65000,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDoArHt2XxArub18bK8PZP0et2kHIVpWH-xP9IFqsowANLgLNqGG3HrSgME17kXvoSzm6cKDRlGg1k2b43xQod7CRvDKu5j5xFRCE1ScPm9ZW3eMvNVWHpATIztNqLeCRsbQp8RdC4L7wW7epyGZJ8DmrIFH09ZpCPzlmXKnAFtvH8VppIoXipnocOYNiki2LHWQg6kl-fyC6gjlGST-vHBXYymZQIZ3nJ8mpKOlCvM8u0szv6xxAnRPcTvY2_P28GIBDoXlUJgAyZm",
    rating: 4.6,
    reviewsCount: 94,
    category: "Naija Fashion & Ankara",
    vendorId: "v_lekki",
    vendorName: "Lekki Elite Optics",
    stock: 22,
    isTrending: true,
    highlights: [
      "Polarized anti-glare shielding",
      "Breakproof lightweight structural acetate",
      "Premium stainless hinges with smooth pivots"
    ]
  },
  {
    id: "p8",
    title: "Yaba Streetwear Premium Heavyweight Hoodie",
    description: "An incredibly thick, luxury graphic streetwear hoodie printed right inside Yaba's creative art centers. Features a massive 450GSM cotton fleece with dropped shoulders, roomy side pouch, and custom Lagos typography across the chest. Combines modern comfort with high-fashion streetwear energy.",
    price: 38000,
    originalPrice: 50000,
    image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCcLaXCLsW43s98ybP73OCEvgJ9RE0FJfsB7gq1pYSS1RNbemeXv2r4tI-NbsnnphK4NE_-6ZZkv7hM0dws1vCm2AP-9YFu-EsLl7nUpPyS5YH6Nkbbjc6TNcl-KKzmYG9VCEde0WxXCNuCHrlh-AaC-eMGEfOqJ_Y-YPpkbNTCF8ysjQe0ny1b6s9Of_uf0MitHtymBND4HNMP_EUCwW6GNfssHw6HefGEl-C7S8GsT_1TaMCqufEuMrgl2MYYbnxKntqqQA0H6Vh9",
    rating: 4.7,
    reviewsCount: 104,
    category: "Naija Fashion & Ankara",
    vendorId: "v_yaba",
    vendorName: "Yaba Streetwear",
    sizes: ["Small", "Medium", "Large", "X-Large"],
    colors: ["Cyber Charcoal", "Abuja Sand"],
    stock: 18,
    isNew: true,
    highlights: [
      "Hyper-dense 450GSM organic brushed cotton",
      "Thick puff printing graphics",
      "Shrinkproof warm washing resistance"
    ]
  }
];

export const MOCK_REVIEWS = [
  {
    id: "r1",
    author: "Fatima Abubakar",
    text: "The fabric of the Aso-Oke was incredibly supple. Standard local designs don't match the weave luxury Eko heritage delivered on this cap! Highly recommended for wedding guests.",
    stars: 5,
    date: "2 days ago",
    isVerified: true,
    avatarInitials: "FA"
  },
  {
    id: "r2",
    author: "Chinedu Okafor",
    text: "Ordered this Prostation laptop to Enugu. I was skeptical about fast courier routing, but the live map map was very accurate. Got it in exactly 48 hours without a single scratch!",
    stars: 5,
    date: "1 week ago",
    isVerified: true,
    avatarInitials: "CO"
  },
  {
    id: "r3",
    author: "Olumide Johnson",
    text: "The vanilla nutmeg crunch of these snacks is phenomenal. My children cleared almost 1kg during our weekend party. Perfect replacement for overseas sweets.",
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
    avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuDyn4B2-V84MePwupfbwkEKhLQZdlL8hNqvy5gdSuuvV5AgNj9_X14xepvm-f6gD-UQQkZeGOYZZEdxKw_OzZojynwLNP9KTtmR-KshlkTAA277e5ltFM8DPGOB0e3XkA2kytARxY1sWjIdPMDcbSru9Prlk3t_P4AF3yHOpEtReItGD1Wm70oBCTEHv04sGxj5gyqoj7PpLIn1fhYHleiFWwqdhGHYt42VwVCVtTTxlNsuctVA5fTkegBH5d48Uxnq7-E3cxEZ7mQR",
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
