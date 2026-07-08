import React, { useState, useMemo } from "react";
import { 
  Truck, CheckCircle, Clock, AlertTriangle, Download, BarChart2, Package
} from "lucide-react";
import { Order, Vendor } from "../types";
import { formatNaira } from "./CustomerViews";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface DeliveryReportsDashboardProps {
  orders: Order[];
  vendors?: Vendor[];
}

const COLORS = ["#10b981", "#f59e0b", "#f43f5e", "#6366f1"];

export default function DeliveryReportsDashboard({ orders = [], vendors = [] }: DeliveryReportsDashboardProps) {
  const [timeMode, setTimeMode] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  
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
    let completed = 0;
    let pending = 0;
    let cancelled = 0;
    let deliveryFees = 0;

    filteredOrders.forEach(o => {
      const isCancelled = o.status === "Flagged" || (o.status as any) === "Cancelled" || (o.status as any) === "Returned";
      
      if (o.status === "Delivered") completed++;
      else if (o.status === "Processing" || o.status === "Shipped") pending++;
      else if (isCancelled) cancelled++;
      
      // Calculate a mock delivery fee based on value if not present in order
      const fee = (o as any).deliveryFee || Math.floor(o.value * 0.05);
      if (!isCancelled) deliveryFees += fee;
    });

    return {
      totalDeliveries: filteredOrders.length,
      completed,
      pending,
      cancelled,
      deliveryFees,
      avgDeliveryTime: "2.4 days" // Mock average
    };
  }, [filteredOrders]);

  const statusStats = [
    { name: "Delivered", value: stats.completed, color: COLORS[0] },
    { name: "Pending", value: stats.pending, color: COLORS[1] },
    { name: "Cancelled", value: stats.cancelled, color: COLORS[2] }
  ];

  const compiledData = useMemo(() => {
    const groups: Record<string, Record<string, number>> = {};
    filteredOrders.forEach(o => {
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
        groups[tKey] = { time: tKey as any, Delivered: 0, Pending: 0, Cancelled: 0 };
      }
      
      const isCancelled = o.status === "Flagged" || (o.status as any) === "Cancelled" || (o.status as any) === "Returned";
      if (o.status === "Delivered") groups[tKey].Delivered++;
      else if (o.status === "Processing" || o.status === "Shipped") groups[tKey].Pending++;
      else if (isCancelled) groups[tKey].Cancelled++;
    });
    return Object.values(groups);
  }, [filteredOrders, timeMode]);

  const handleExportCSV = () => {
    const header = "Order ID,Customer,Date,Status,Delivery Fee\n";
    const rows = filteredOrders.map(o => `${o.id},"${o.customerName}",${o.date},${o.status},${(o as any).deliveryFee || Math.floor(o.value * 0.05)}`).join("\n");
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'delivery_report.csv');
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight flex items-center space-x-2">
            <Truck className="w-6 h-6 text-indigo-600" />
            <span>Delivery Operations Reports</span>
          </h2>
          <p className="text-xs text-neutral-450 font-semibold mt-0.5">
            Monitor fulfillment metrics, delivery times, and fees collected.
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
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Total Logs</p>
          <h3 className="text-lg font-black text-neutral-900 tracking-tight mt-1">{stats.totalDeliveries}</h3>
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
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Fees Collected</p>
          <h3 className="text-lg font-black text-neutral-900 tracking-tight mt-1">{formatNaira(stats.deliveryFees)}</h3>
        </div>
        <div className="bg-white p-4 border border-neutral-150 rounded-2xl shadow-xs">
          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Avg Time</p>
          <h3 className="text-lg font-black text-neutral-900 tracking-tight mt-1">{stats.avgDeliveryTime}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs">
          <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight mb-4">Delivery Volume Over Time</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compiledData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="time" stroke="#a3a3a3" fontSize={10} fontWeight="bold" tickLine={false} />
                <YAxis stroke="#a3a3a3" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                <Bar dataKey="Delivered" stackId="a" fill={COLORS[0]} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Pending" stackId="a" fill={COLORS[1]} radius={[0, 0, 0, 0]} />
                <Bar dataKey="Cancelled" stackId="a" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight border-b border-neutral-100 pb-2">Status Breakdown</h3>
          <div className="h-48 my-4">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusStats.filter(s => s.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                    {statusStats.filter(s => s.value > 0).map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
             {statusStats.map(stat => (
                <div key={stat.name} className="flex justify-between items-center py-1 px-2 rounded">
                   <div className="flex items-center space-x-2">
                     <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.color }} />
                     <span className="text-[10px] font-bold text-neutral-700">{stat.name}</span>
                   </div>
                   <span className="text-[10px] font-black text-neutral-900">{stat.value}</span>
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
