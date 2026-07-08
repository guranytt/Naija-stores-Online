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
  categoryId?: string;
  categorySlug?: string;
  subCategory?: string;
  condition?: "New" | "Fairly Used";
  commissionPercentage?: number;
  vendorId: string;
  vendorName: string;
  sizes?: string[];
  colors?: string[];
  stock: number;
  deliveryDays?: number;
  isBestSeller?: boolean;
  isTrending?: boolean;
  isNew?: boolean;
  salePercentage?: number;
  highlights?: string[];
  whatsInTheBox?: string[];
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  searchKeywords?: string[];
  specifications?: string;
  externalLink?: string;
}

export interface Category {
  id: string;
  categoryId?: string;
  name: string;
  description: string;
  image: string;
  iconName: string; // lucide icon name representation
  itemCount: number;
  subcategories: string[];
  status?: "active" | "pending" | "rejected";
  slug?: string;
  defaultCommissionPercentage?: number;
  sortOrder?: number;
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
  cacNumber?: string;
  whatsappNumber?: string;
  cac_number?: string;
  whatsapp_number?: string;
  bankName?: string;
  accountNumber?: string;
  bank_name?: string;
  account_number?: string;
  userId?: string;
  user_id?: string;
  isVerified?: boolean;
  business_description?: string;
  description?: string;
  business_name?: string;
  owner_name?: string;
  physical_location?: string;
  logo_url?: string;
  approval_status?: string;
}

export interface Order {
  id: string;
  user_id?: string;
  customerName: string;
  deliveryAddress?: string;
  phoneNumber?: string;
  emailAddress?: string;
  status: "Delivered" | "Processing" | "Shipped" | "Flagged";
  date: string;
  value: number; // In Nigerian Naira (₦)
  itemsCount: number;
  trackingId: string;
  routeFrom: string;
  routeTo: string;
  deliveryProgress: number; // 0 to 100
  currentCity: string;
  productIds?: string[];
  receiptPrompted?: boolean;
  receiptConfirmed?: boolean;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  vendor_id: string;
  quantity: number;
  unit_price: number;
  commission_rate_snapshot: number;
  commission_amount: number;
  fulfillment_status: 'not_shipped' | 'shipped' | 'delivered';
  created_at?: string;
  product?: Product;
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

export interface FlashDealProposal {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  priceBefore: number;
  reducedAmount: number; // how much is reduced off the price
  priceAfter: number;
  timeFrame: string; // e.g. "2026-06-10 12:00 to 18:00"
  vendorId: string;
  vendorName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

