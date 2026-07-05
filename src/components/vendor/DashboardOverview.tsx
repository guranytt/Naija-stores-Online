import React from "react";
import { Vendor } from "../../types";
import { useStore } from "../../store/useStore";
import SalesAnalyticsDashboard from "../SalesAnalyticsDashboard";

interface Props {
  vendor: Vendor;
}

export default function DashboardOverview({ vendor }: Props) {
  const { orders = [], products = [], vendors = [], categories = [] } = useStore();
  
  const vendorOrders = orders.filter(o => (o as any).vendor_id === vendor.id || (o as any).vendorId === vendor.id);
  const vendorProducts = products.filter(p => p.vendorId === vendor.id);

  return (
    <div className="space-y-8 animate-fade-in text-left">
      <div>
        <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Welcome, {vendor.name}</h2>
        <p className="text-sm text-neutral-500 font-medium">Here is what's happening with your store today.</p>
      </div>

      <SalesAnalyticsDashboard 
        orders={vendorOrders} 
        products={vendorProducts}
        vendors={[vendor]}
        categories={categories}
      />
    </div>
  );
}
