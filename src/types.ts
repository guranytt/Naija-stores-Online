/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Review {
  id: string;
  author: string;
  text: string;
  stars: number;
  date: string;
  isVerified: boolean;
  avatarInitials: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number; // In Nigerian Naira (₦)
  originalPrice?: number; // In Nigerian Naira (₦)
  image: string;
  rating: number;
  reviewsCount: number;
  category: string;
  subCategory?: string;
  condition?: "New" | "Fairly Used";
  commissionPercentage?: number;
  vendorId: string;
  vendorName: string;
  sizes?: string[];
  colors?: string[];
  stock: number;
  isBestSeller?: boolean;
  isTrending?: boolean;
  isNew?: boolean;
  salePercentage?: number;
  highlights?: string[];
  whatsInTheBox?: string[];
}

export interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  iconName: string; // lucide icon name representation
  itemCount: number;
  subcategories: string[];
}

export interface Advertisement {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string;
  position: 'homepage' | 'category' | 'product' | 'search';
  targetCategory?: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'scheduled' | 'paused';
  metrics: {
    impressions: number;
    clicks: number;
  };
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
}

export interface Vendor {
  id: string;
  name: string;
  ownerName: string;
  avatar: string;
  rating: number;
  ratingCount?: number;
  salesToday: number;
  ordersPending: number;
  stockAlerts: number;
  email: string;
  phone: string;
  location: string;
}

export interface Order {
  id: string;
  customerName: string;
  status: "Delivered" | "Processing" | "Shipped" | "Flagged";
  date: string;
  value: number; // In Nigerian Naira (₦)
  itemsCount: number;
  trackingId: string;
  routeFrom: string;
  routeTo: string;
  deliveryProgress: number; // 0 to 100
  currentCity: string;
}

export interface AdminTeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "Online" | "Away" | "Offline";
  lastActive: string;
  twoFactorEnabled: boolean;
  initials: string;
}
