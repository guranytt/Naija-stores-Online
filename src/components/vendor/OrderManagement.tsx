import React, { useState, useEffect } from "react";
import { Vendor, Order } from "../../types";
import { Search, RefreshCw, Eye, Truck, CheckCircle } from "lucide-react";
import { supabase } from "../../supabase";
import { formatNaira } from "../../utils";

interface Props {
  vendor: Vendor;
}

export default function OrderManagement({ vendor }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchOrders();
  }, [vendor.id, page]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, buyerName, totalAmount, status, paymentMethod, created_at, items")
        .eq("vendorId", vendor.id)
        .order("created_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      setOrders((data as unknown) as Order[] || []);
    } catch (err) {
      console.error("Error fetching vendor orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => 
    o.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.buyerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Order Fulfillment</h2>
          <p className="text-sm text-neutral-500 font-medium">Track and process customer orders.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-ambient border border-neutral-100 overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by order ID or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
            />
          </div>
          <button onClick={fetchOrders} className="p-2 text-neutral-400 hover:text-primary-dark transition-colors">
            <RefreshCw className={`w-5 h-5 ${isLoading ? "animate-spin text-primary" : ""}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50/80 text-neutral-500 font-semibold border-b border-neutral-100">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Loading orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                    No orders found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-neutral-500">{order.id?.substring(0, 8)}...</td>
                    <td className="px-6 py-4 font-medium text-neutral-900">{order.buyerName}</td>
                    <td className="px-6 py-4 font-bold text-neutral-900">{formatNaira(order.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        order.status === 'Delivered' ? 'bg-green-100 text-green-700' : 
                        order.status === 'Dispatched' ? 'bg-blue-100 text-blue-700' : 
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : "N/A"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button className="p-2 text-primary-dark hover:bg-primary-dark/10 rounded-lg transition-all" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-all" title="Update Status">
                          <Truck className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-neutral-100 flex items-center justify-between text-sm text-neutral-500">
          <span>Showing page {page + 1}</span>
          <div className="flex space-x-2">
            <button 
              disabled={page === 0}
              onClick={() => setPage(p => Math.max(0, p - 1))}
              className="px-3 py-1 border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button 
              disabled={orders.length < pageSize}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
