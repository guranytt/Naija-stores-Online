import React, { useState, useMemo } from "react";
import { 
  TrendingUp, TrendingDown, DollarSign, Layers, 
  BarChart3, PieChart as PieIcon, LineChart as LineIcon, Calendar, Filter, Eye, Check, ChevronRight, BarChart2, Package, RotateCcw, AlertCircle, ShoppingCart, Download 
} from "lucide-react";
import { Order, Vendor, Product, Category } from "../types";
import { formatNaira } from "../utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface SalesAnalyticsDashboardProps {
  orders: Order[];
  products?: Product[];
  vendors?: Vendor[];
  categories?: Category[];
}

const COLORS = ["#6366f1", "#10b981", "#f43f5e", "#f97316", "#0ea5e9", "#8b5cf6", "#ec4899", "#14b8a6", "#facc15", "#64748b"];

export default function SalesAnalyticsDashboard({ orders = [], products = [], vendors = [], categories = [] }: SalesAnalyticsDashboardProps) {
  const [chartType, setChartType] = useState<"area" | "line" | "bar">("area");
  const [timeMode, setTimeMode] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  
  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (dateRange.start) {
      filtered = filtered.filter(o => new Date(o.date) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      filtered = filtered.filter(o => new Date(o.date) <= new Date(dateRange.end));
    }
    return filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [orders, dateRange]);

  const stats = useMemo(() => {
    let revenue = 0;
    let completed = 0;
    let pending = 0;
    let cancelled = 0;
    let refunds = 0;

    filteredOrders.forEach(o => {
      const isCancelled = o.status === "Flagged" || (o.status as any) === "Cancelled" || (o.status as any) === "Returned";
      if (!isCancelled) {
         revenue += o.value;
      }
      
      if (o.status === "Delivered") completed++;
      else if (o.status === "Processing" || o.status === "Shipped") pending++;
      else if (isCancelled) {
         cancelled++;
         refunds += o.value;
      }
    });

    return {
      revenue,
      orderCount: filteredOrders.length,
      completed,
      pending,
      cancelled,
      refunds,
      averageOrderValue: filteredOrders.length > 0 ? revenue / filteredOrders.length : 0
    };
  }, [filteredOrders]);

  const categoryStats = useMemo(() => {
    const cats: Record<string, number> = {};
    filteredOrders.forEach(o => {
      const isCancelled = o.status === "Flagged" || (o.status as any) === "Cancelled" || (o.status as any) === "Returned";
      if (isCancelled) return;
      
      let oCat = "Uncategorized";
      if (o.productIds && o.productIds.length > 0 && products.length > 0) {
        const p = products.find(prod => prod.id === o.productIds![0]);
        if (p && p.category) oCat = p.category;
      } else {
        if (o.value > 150000) oCat = "Tech & Devices";
        else if (o.value > 75000) oCat = "Fashion";
        else if (o.value > 30000) oCat = "Beauty & Wellness";
        else oCat = "Groceries & Farm";
      }
      cats[oCat] = (cats[oCat] || 0) + o.value;
    });
    
    return Object.entries(cats).map(([name, value], idx) => ({
      name,
      value,
      color: COLORS[idx % COLORS.length],
      key: name
    })).sort((a, b) => b.value - a.value);
  }, [filteredOrders, products]);

  React.useEffect(() => {
    if (activeCategories.length === 0 && categoryStats.length > 0) {
      setActiveCategories(categoryStats.slice(0, 5).map(c => c.key));
    }
  }, [categoryStats, activeCategories.length]);

  const compiledData = useMemo(() => {
    const groups: Record<string, Record<string, number>> = {};
    filteredOrders.forEach(o => {
      const isCancelled = o.status === "Flagged" || (o.status as any) === "Cancelled" || (o.status as any) === "Returned";
      if (isCancelled) return;
      
      const d = new Date(o.date);
      if (isNaN(d.getTime())) return;
      
      let tKey = "";
      if (timeMode === "daily") {
        tKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (timeMode === "weekly") {
        const w = Math.ceil(d.getDate() / 7);
        tKey = `${d.toLocaleDateString('en-US', { month: 'short' })} W${w}`;
      } else {
        tKey = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      
      if (!groups[tKey]) {
        groups[tKey] = { time: tKey as any };
        categoryStats.forEach(c => groups[tKey][c.key] = 0);
      }
      
      let oCat = "Uncategorized";
      if (o.productIds && o.productIds.length > 0 && products.length > 0) {
        const p = products.find(prod => prod.id === o.productIds![0]);
        if (p && p.category) oCat = p.category;
      } else {
        if (o.value > 150000) oCat = "Tech & Devices";
        else if (o.value > 75000) oCat = "Fashion";
        else if (o.value > 30000) oCat = "Beauty & Wellness";
        else oCat = "Groceries & Farm";
      }
      
      groups[tKey][oCat] = (groups[tKey][oCat] || 0) + o.value;
    });
    
    return Object.values(groups);
  }, [filteredOrders, timeMode, categoryStats, products]);

  const toggleCategory = (key: string) => {
    if (activeCategories.includes(key)) {
      if (activeCategories.length > 1) setActiveCategories(activeCategories.filter(c => c !== key));
    } else {
      setActiveCategories([...activeCategories, key]);
    }
  };

  const handleExportCSV = () => {
    const header = "Order ID,Customer,Date,Status,Value\n";
    const rows = filteredOrders.map(o => `${o.id},"${o.customerName}",${o.date},${o.status},${o.value}`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'sales_report.csv');
    a.click();
  };

  const topSellingProducts = useMemo(() => {
    if (!products || products.length === 0) return [];
    const counts: Record<string, number> = {};
    const revenues: Record<string, number> = {};
    
    filteredOrders.forEach(o => {
      const isCancelled = o.status === "Flagged" || (o.status as any) === "Cancelled" || (o.status as any) === "Returned";
      if (isCancelled) return;
      if (o.productIds && o.productIds.length > 0) {
        o.productIds.forEach(id => {
           counts[id] = (counts[id] || 0) + 1;
           revenues[id] = (revenues[id] || 0) + (o.value / o.productIds!.length);
        });
      }
    });

    return products.map(p => ({
      ...p,
      salesCount: counts[p.id] || 0,
      totalRevenue: revenues[p.id] || 0
    })).filter(p => p.salesCount > 0).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
  }, [filteredOrders, products]);

  const topPerformingVendors = useMemo(() => {
    if (!vendors || vendors.length === 0) return [];
    const revenues: Record<string, number> = {};
    const ordersCount: Record<string, number> = {};
    
    filteredOrders.forEach(o => {
      const isCancelled = o.status === "Flagged" || (o.status as any) === "Cancelled" || (o.status as any) === "Returned";
      if (isCancelled) return;
      
      if (o.productIds && o.productIds.length > 0 && products.length > 0) {
        // Track unique vendors for this order to not double-count orderCount
        const vendorIdsForOrder = new Set<string>();
        
        o.productIds.forEach(id => {
           const p = products.find(prod => prod.id === id);
           if (p && p.vendorId) {
             revenues[p.vendorId] = (revenues[p.vendorId] || 0) + (o.value / o.productIds!.length);
             vendorIdsForOrder.add(p.vendorId);
           }
        });
        
        vendorIdsForOrder.forEach(vid => {
          ordersCount[vid] = (ordersCount[vid] || 0) + 1;
        });
      }
    });

    return vendors.map(v => ({
      ...v,
      totalRevenue: revenues[v.id] || 0,
      ordersCount: ordersCount[v.id] || 0
    })).filter(v => v.ordersCount > 0).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
  }, [filteredOrders, vendors, products]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight flex items-center space-x-2">
            <BarChart2 className="w-6 h-6 text-indigo-600" />
            <span>Sales & Revenue Reports</span>
          </h2>
          <p className="text-xs text-neutral-450 font-semibold mt-0.5">
            Accurate revenue, order statuses, and performance tracking.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 select-none">
          <button onClick={handleExportCSV} className="px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-neutral-800 transition flex items-center space-x-1.5">
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <div className="flex items-center space-x-2 border border-neutral-200 p-1 rounded-xl bg-white">
            <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="text-xs outline-none bg-transparent px-1" />
            <span className="text-neutral-300">-</span>
            <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="text-xs outline-none bg-transparent px-1" />
          </div>
          <div className="flex p-0.5 bg-neutral-100 border border-neutral-150 rounded-xl text-xs font-bold text-neutral-500">
            <button onClick={() => setTimeMode("daily")} className={`px-3 py-1.5 rounded-lg transition-all ${timeMode === "daily" ? "bg-white text-neutral-900 shadow-sm" : "hover:text-neutral-950"}`}>Daily</button>
            <button onClick={() => setTimeMode("weekly")} className={`px-3 py-1.5 rounded-lg transition-all ${timeMode === "weekly" ? "bg-white text-neutral-900 shadow-sm" : "hover:text-neutral-950"}`}>Weekly</button>
            <button onClick={() => setTimeMode("monthly")} className={`px-3 py-1.5 rounded-lg transition-all ${timeMode === "monthly" ? "bg-white text-neutral-900 shadow-sm" : "hover:text-neutral-950"}`}>Monthly</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 border border-neutral-150 rounded-2xl shadow-xs">
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Revenue</p>
          <h3 className="text-lg font-black text-neutral-900 tracking-tight mt-1">{formatNaira(stats.revenue)}</h3>
        </div>
        <div className="bg-white p-4 border border-neutral-150 rounded-2xl shadow-xs">
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Orders</p>
          <h3 className="text-lg font-black text-neutral-900 tracking-tight mt-1">{stats.orderCount}</h3>
        </div>
        <div className="bg-white p-4 border border-emerald-100 rounded-2xl shadow-xs bg-emerald-50/30">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Completed</p>
          <h3 className="text-lg font-black text-emerald-700 tracking-tight mt-1">{stats.completed}</h3>
        </div>
        <div className="bg-white p-4 border border-amber-100 rounded-2xl shadow-xs bg-amber-50/30">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Pending</p>
          <h3 className="text-lg font-black text-amber-700 tracking-tight mt-1">{stats.pending}</h3>
        </div>
        <div className="bg-white p-4 border border-rose-100 rounded-2xl shadow-xs bg-rose-50/30">
          <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Cancelled</p>
          <h3 className="text-lg font-black text-rose-700 tracking-tight mt-1">{stats.cancelled}</h3>
        </div>
        <div className="bg-white p-4 border border-neutral-150 rounded-2xl shadow-xs">
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Avg Order</p>
          <h3 className="text-lg font-black text-neutral-900 tracking-tight mt-1">{formatNaira(stats.averageOrderValue)}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight">Revenue Trends</h3>
             <div className="flex space-x-2">
                <button onClick={() => setChartType("area")} className={`p-1.5 rounded ${chartType === "area" ? "bg-neutral-100" : ""}`}><Layers className="w-4 h-4 text-neutral-500" /></button>
                <button onClick={() => setChartType("line")} className={`p-1.5 rounded ${chartType === "line" ? "bg-neutral-100" : ""}`}><LineIcon className="w-4 h-4 text-neutral-500" /></button>
                <button onClick={() => setChartType("bar")} className={`p-1.5 rounded ${chartType === "bar" ? "bg-neutral-100" : ""}`}><BarChart3 className="w-4 h-4 text-neutral-500" /></button>
             </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart data={compiledData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="time" stroke="#a3a3a3" fontSize={10} fontWeight="bold" tickLine={false} />
                  <YAxis stroke="#a3a3a3" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `₦${v >= 1000000 ? (v / 1000000).toFixed(1) + "M" : v / 1000 + "k"}`} />
                  <Tooltip formatter={(value: number) => formatNaira(value)} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  {categoryStats.filter(c => activeCategories.includes(c.key)).map(cat => (
                    <Area key={cat.key} type="monotone" dataKey={cat.key} stroke={cat.color} fill={cat.color} fillOpacity={0.3} strokeWidth={2} stackId="1" />
                  ))}
                </AreaChart>
              ) : chartType === "line" ? (
                <LineChart data={compiledData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="time" stroke="#a3a3a3" fontSize={10} fontWeight="bold" tickLine={false} />
                  <YAxis stroke="#a3a3a3" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `₦${v >= 1000000 ? (v / 1000000).toFixed(1) + "M" : v / 1000 + "k"}`} />
                  <Tooltip formatter={(value: number) => formatNaira(value)} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  {categoryStats.filter(c => activeCategories.includes(c.key)).map(cat => (
                    <Line key={cat.key} type="monotone" dataKey={cat.key} stroke={cat.color} strokeWidth={2.5} />
                  ))}
                </LineChart>
              ) : (
                <BarChart data={compiledData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="time" stroke="#a3a3a3" fontSize={10} fontWeight="bold" tickLine={false} />
                  <YAxis stroke="#a3a3a3" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} tickFormatter={(v) => `₦${v >= 1000000 ? (v / 1000000).toFixed(1) + "M" : v / 1000 + "k"}`} />
                  <Tooltip formatter={(value: number) => formatNaira(value)} />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                  {categoryStats.filter(c => activeCategories.includes(c.key)).map(cat => (
                    <Bar key={cat.key} dataKey={cat.key} stackId="1" fill={cat.color} radius={[0, 0, 0, 0]} />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight border-b border-neutral-100 pb-2">Category Share</h3>
          </div>
          <div className="h-48 my-4">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryStats} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                    {categoryStats.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatNaira(value)} />
                </PieChart>
              </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 overflow-y-auto max-h-32">
             {categoryStats.map(cat => (
                <button key={cat.key} onClick={() => toggleCategory(cat.key)} className={`w-full flex justify-between items-center py-1 px-2 rounded hover:bg-neutral-50 ${activeCategories.includes(cat.key) ? "" : "opacity-50 grayscale"}`}>
                   <div className="flex items-center space-x-2">
                     <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                     <span className="text-[10px] font-bold text-neutral-700 truncate max-w-[120px]">{cat.name}</span>
                   </div>
                   <span className="text-[10px] font-black text-neutral-900">{formatNaira(cat.value)}</span>
                </button>
             ))}
          </div>
        </div>
      </div>
      
      {/* Top Products & Vendors (If Data Provided) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs max-h-80 overflow-y-auto">
            <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight mb-4 border-b pb-2">Top Selling Products</h3>
            <div className="space-y-3">
               {topSellingProducts.length > 0 ? topSellingProducts.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-xs">
                     <div className="flex items-center space-x-3">
                        <img src={p.image} className="w-8 h-8 rounded object-cover" alt="" />
                        <span className="font-bold text-neutral-700 line-clamp-1">{p.title}</span>
                     </div>
                     <span className="font-black text-emerald-600">{formatNaira(p.totalRevenue)}</span>
                  </div>
               )) : <p className="text-xs text-neutral-400">Data not sufficient for products ranking.</p>}
            </div>
         </div>
         <div className="bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs max-h-80 overflow-y-auto">
            <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight mb-4 border-b pb-2">Top Performing Vendors</h3>
            <div className="space-y-3">
               {topPerformingVendors.length > 0 ? topPerformingVendors.map((v: any) => (
                  <div key={v.id} className="flex justify-between items-center text-xs">
                     <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">{v.name ? v.name.charAt(0) : "V"}</div>
                        <span className="font-bold text-neutral-700">{v.name}</span>
                     </div>
                     <span className="font-black text-indigo-600">{formatNaira(v.totalRevenue)}</span>
                  </div>
               )) : <p className="text-xs text-neutral-400">Data not sufficient for vendors ranking.</p>}
            </div>
         </div>
      </div>
    </div>
  );
}
