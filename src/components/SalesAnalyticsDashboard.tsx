/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from "react";
import { 
  TrendingUp, TrendingDown, DollarSign, Layers, 
  BarChart3, PieChart as PieIcon, LineChart as LineIcon, Calendar, Filter, Eye, Check, ChevronRight, BarChart2 
} from "lucide-react";
import { Order } from "../types";
import { formatNaira } from "./CustomerViews";
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
}

const BASELINE_DATA = [
  { month: "Jan", "Naija Fashion": 320000, "Naija Tech Hub": 480000, "Beauty & Wellness": 180000, "Local Groceries": 120000, "Home Crafts": 90000 },
  { month: "Feb", "Naija Fashion": 450000, "Naija Tech Hub": 590000, "Beauty & Wellness": 220000, "Local Groceries": 140000, "Home Crafts": 110000 },
  { month: "Mar", "Naija Fashion": 680000, "Naija Tech Hub": 730000, "Beauty & Wellness": 290000, "Local Groceries": 190000, "Home Crafts": 150000 },
  { month: "Apr", "Naija Fashion": 550000, "Naija Tech Hub": 680000, "Beauty & Wellness": 250000, "Local Groceries": 170000, "Home Crafts": 130000 },
  { month: "May", "Naija Fashion": 890000, "Naija Tech Hub": 910000, "Beauty & Wellness": 380000, "Local Groceries": 280000, "Home Crafts": 220000 },
  { month: "Jun", "Naija Fashion": 1250000, "Naija Tech Hub": 1480000, "Beauty & Wellness": 490000, "Local Groceries": 360000, "Home Crafts": 310000 },
  { month: "Jul", "Naija Fashion": 950000, "Naija Tech Hub": 1100000, "Beauty & Wellness": 410000, "Local Groceries": 320000, "Home Crafts": 280000 },
  { month: "Aug", "Naija Fashion": 880000, "Naija Tech Hub": 1050000, "Beauty & Wellness": 390000, "Local Groceries": 290000, "Home Crafts": 260000 },
  { month: "Sep", "Naija Fashion": 1020000, "Naija Tech Hub": 1220000, "Beauty & Wellness": 430000, "Local Groceries": 340000, "Home Crafts": 290000 },
  { month: "Oct", "Naija Fashion": 1150000, "Naija Tech Hub": 1350000, "Beauty & Wellness": 480000, "Local Groceries": 390000, "Home Crafts": 330000 },
  { month: "Nov", "Naija Fashion": 1350000, "Naija Tech Hub": 1600000, "Beauty & Wellness": 550000, "Local Groceries": 450000, "Home Crafts": 380500 },
  { month: "Dec", "Naija Fashion": 1850000, "Naija Tech Hub": 2100000, "Beauty & Wellness": 720000, "Local Groceries": 610000, "Home Crafts": 520000 }
];

const CATEGORIES_META = [
  { key: "Naija Fashion", name: "Fashion", color: "#6366f1", bg: "bg-indigo-50", border: "border-indigo-100", text: "text-indigo-600" },
  { key: "Naija Tech Hub", name: "Tech & Devices", color: "#10b981", bg: "bg-emerald-50", border: "border-emerald-100", text: "text-emerald-600" },
  { key: "Beauty & Wellness", name: "Beauty & Cosmetics", color: "#f43f5e", bg: "bg-rose-50", border: "border-rose-100", text: "text-rose-600" },
  { key: "Local Groceries", name: "Groceries & Farm", color: "#f97316", bg: "bg-orange-50", border: "border-orange-100", text: "text-orange-600" },
  { key: "Home Crafts", name: "Home & Art", color: "#0ea5e9", bg: "bg-sky-50", border: "border-sky-100", text: "text-sky-600" }
];

export default function SalesAnalyticsDashboard({ orders }: SalesAnalyticsDashboardProps) {
  // Config States
  const [chartType, setChartType] = useState<"area" | "line" | "bar">("area");
  const [timeMode, setTimeMode] = useState<"6m" | "12m">("12m");
  const [isStacked, setIsStacked] = useState<boolean>(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("Jun");
  const [activeCategories, setActiveCategories] = useState<string[]>([
    "Naija Fashion",
    "Naija Tech Hub",
    "Beauty & Wellness",
    "Local Groceries",
    "Home Crafts"
  ]);

  // Merge mock data with dynamic order entries
  const compiledData = useMemo(() => {
    const workingData = BASELINE_DATA.map(item => ({ ...item }));
    
    orders.forEach(order => {
      if (!order.date) return;
      const parts = order.date.split("-");
      if (parts.length < 2) return;
      
      const monthIdx = parseInt(parts[1], 10) - 1; // 0-11
      if (monthIdx >= 0 && monthIdx < 12) {
        const val = order.value;
        // Deterministically route items to categories based on valuation
        if (val > 150000) {
          workingData[monthIdx]["Naija Tech Hub"] += val;
        } else if (val > 75000) {
          workingData[monthIdx]["Naija Fashion"] += val;
        } else if (val > 30000) {
          workingData[monthIdx]["Beauty & Wellness"] += val;
        } else if (val > 15000) {
          workingData[monthIdx]["Local Groceries"] += val;
        } else {
          workingData[monthIdx]["Home Crafts"] += val;
        }
      }
    });

    // Handle 6-month subset vs 12-month full set
    if (timeMode === "6m") {
      return workingData.slice(0, 6);
    }
    return workingData;
  }, [orders, timeMode]);

  // Aggregate Category breakdown for Pie Chart
  const pieChartData = useMemo(() => {
    const sums: { [key: string]: number } = {
      "Naija Fashion": 0,
      "Naija Tech Hub": 0,
      "Beauty & Wellness": 0,
      "Local Groceries": 0,
      "Home Crafts": 0
    };

    compiledData.forEach(m => {
      sums["Naija Fashion"] += m["Naija Fashion"];
      sums["Naija Tech Hub"] += m["Naija Tech Hub"];
      sums["Beauty & Wellness"] += m["Beauty & Wellness"];
      sums["Local Groceries"] += m["Local Groceries"];
      sums["Home Crafts"] += m["Home Crafts"];
    });

    return Object.keys(sums).map(k => {
      const meta = CATEGORIES_META.find(c => c.key === k);
      return {
        name: meta ? meta.name : k,
        value: sums[k],
        color: meta ? meta.color : "#d4d4d8",
        key: k
      };
    }).filter(p => activeCategories.includes(p.key));
  }, [compiledData, activeCategories]);

  // Dynamic Statistics
  const stats = useMemo(() => {
    let totalRevenue = 0;
    let fashionTotal = 0;
    let techTotal = 0;
    let beautyTotal = 0;
    let grocTotal = 0;
    let homeTotal = 0;

    compiledData.forEach(d => {
      if (activeCategories.includes("Naija Fashion")) totalRevenue += d["Naija Fashion"];
      if (activeCategories.includes("Naija Tech Hub")) totalRevenue += d["Naija Tech Hub"];
      if (activeCategories.includes("Beauty & Wellness")) totalRevenue += d["Beauty & Wellness"];
      if (activeCategories.includes("Local Groceries")) totalRevenue += d["Local Groceries"];
      if (activeCategories.includes("Home Crafts")) totalRevenue += d["Home Crafts"];

      fashionTotal += d["Naija Fashion"];
      techTotal += d["Naija Tech Hub"];
      beautyTotal += d["Beauty & Wellness"];
      grocTotal += d["Local Groceries"];
      homeTotal += d["Home Crafts"];
    });

    const catsArr = [
      { name: "Fashion", val: fashionTotal, colorText: "text-indigo-600" },
      { name: "Tech", val: techTotal, colorText: "text-emerald-600" },
      { name: "Beauty", val: beautyTotal, colorText: "text-rose-600" },
      { name: "Groceries", val: grocTotal, colorText: "text-orange-600" },
      { name: "Home Art", val: homeTotal, colorText: "text-sky-600" }
    ];
    catsArr.sort((a, b) => b.val - a.val);

    const averageMonthly = Math.round(totalRevenue / compiledData.length);
    
    // Growth rates comparison (last vs second last month)
    const len = compiledData.length;
    let growthRate = 12.5; // Default Baseline Trend
    if (len >= 2) {
      const lastMonthSum = activeCategories.reduce((acc, cat) => acc + (compiledData[len - 1] as any)[cat], 0);
      const prevMonthSum = activeCategories.reduce((acc, cat) => acc + (compiledData[len - 2] as any)[cat], 0);
      if (prevMonthSum > 0) {
        growthRate = Number((((lastMonthSum - prevMonthSum) / prevMonthSum) * 100).toFixed(1));
      }
    }

    return {
      total: totalRevenue,
      topCategory: catsArr[0].name,
      topCategoryColor: catsArr[0].colorText,
      average: averageMonthly,
      growth: growthRate
    };
  }, [compiledData, activeCategories]);

  // Selected single month detail card metrics
  const monthDetail = useMemo(() => {
    const found = compiledData.find(m => m.month === selectedMonth) || compiledData[compiledData.length - 1];
    if (!found) return null;
    
    const fashionVal = found["Naija Fashion"];
    const techVal = found["Naija Tech Hub"];
    const beautyVal = found["Beauty & Wellness"];
    const grocVal = found["Local Groceries"];
    const homeVal = found["Home Crafts"];
    
    const sum = fashionVal + techVal + beautyVal + grocVal + homeVal;
    
    return {
      monthName: found.month,
      fashion: fashionVal,
      tech: techVal,
      beauty: beautyVal,
      groc: grocVal,
      home: homeVal,
      total: sum
    };
  }, [compiledData, selectedMonth]);

  // Handle dynamic checkbox categories toggler
  const toggleCategory = (key: string) => {
    if (activeCategories.includes(key)) {
      if (activeCategories.length > 1) {
        setActiveCategories(activeCategories.filter(c => c !== key));
      }
    } else {
      setActiveCategories([...activeCategories, key]);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Header with statistics snapshot */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight flex items-center space-x-2">
            <BarChart2 className="w-6 h-6 text-indigo-600" />
            <span>Interactive Sales Trend Center</span>
          </h2>
          <p className="text-xs text-neutral-450 font-semibold mt-0.5">
            Realtime revenue visualization with dynamic filters, multi-axis categories, and automated growth rates.
          </p>
        </div>

        {/* Dashboard Configuration Controls */}
        <div className="flex flex-wrap items-center gap-2 select-none">
          {/* Chart Typology Selector Toggle */}
          <div className="flex p-0.5 bg-neutral-100 border border-neutral-150 rounded-xl text-xs font-bold text-neutral-500">
            <button
              onClick={() => setChartType("area")}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                chartType === "area" ? "bg-white text-neutral-900 shadow-sm" : "hover:text-neutral-950"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Area</span>
            </button>
            <button
              onClick={() => setChartType("line")}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                chartType === "line" ? "bg-white text-neutral-900 shadow-sm" : "hover:text-neutral-950"
              }`}
            >
              <LineIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Line</span>
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                chartType === "bar" ? "bg-white text-neutral-900 shadow-sm" : "hover:text-neutral-950"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bar</span>
            </button>
          </div>

          {/* Time Span Toggle */}
          <div className="flex p-0.5 bg-neutral-100 border border-neutral-150 rounded-xl text-xs font-bold text-neutral-500">
            <button
              onClick={() => setTimeMode("6m")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeMode === "6m" ? "bg-white text-neutral-900 shadow-sm" : "hover:text-neutral-950"
              }`}
            >
              6 Months
            </button>
            <button
              onClick={() => setTimeMode("12m")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                timeMode === "12m" ? "bg-white text-neutral-900 shadow-sm" : "hover:text-neutral-950"
              }`}
            >
              Full Year
            </button>
          </div>
        </div>
      </div>

      {/* Main KPI metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Dynamic Gross Sales */}
        <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Active Total Revenue</p>
            <div className="p-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-neutral-900 tracking-tight mt-1">
            {formatNaira(stats.total)}
          </h3>
          <p className="text-[10px] text-neutral-400 font-semibold mt-1">
            Sum of {activeCategories.length} configured active categories
          </p>
        </div>

        {/* Top Category Contributions */}
        <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Leading Store Outlet</p>
            <div className="p-1.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className={`text-2xl font-black tracking-tight mt-1 ${stats.topCategoryColor}`}>
            {stats.topCategory}
          </h3>
          <p className="text-[10px] text-neutral-400 font-semibold mt-1">
            Highest overall sales metric contributions
          </p>
        </div>

        {/* Average Monthly Metrics */}
        <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Monthly Average Sales</p>
            <div className="p-1.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-neutral-900 tracking-tight mt-1">
            {formatNaira(stats.average)}
          </h3>
          <p className="text-[10px] text-neutral-400 font-semibold mt-1">
            Calculated across {timeMode === "6m" ? "6" : "12"} periods
          </p>
        </div>

        {/* Dynamic Growth Factor */}
        <div className="bg-white p-5 border border-neutral-150 rounded-2xl shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Computed Growth MoM</p>
            <div className={`p-1.5 rounded-lg border ${
              stats.growth >= 0 
                ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
                : "bg-rose-50 border-rose-100 text-rose-600"
            }`}>
              {stats.growth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div className="flex items-baseline space-x-2 mt-1">
            <h3 className={`text-2xl font-black tracking-tight ${stats.growth >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
              {stats.growth >= 0 ? "+" : ""}{stats.growth}%
            </h3>
            <span className="text-[9px] font-bold text-neutral-400 uppercase">Trend factor</span>
          </div>
          <p className="text-[10px] text-neutral-400 font-semibold mt-1">
            Comparing current vs preceding cycle index
          </p>
        </div>

      </div>

      {/* Main Categories Pill Filters selector */}
      <div className="bg-white p-4 border border-neutral-150 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-2 shrink-0">
          <Filter className="w-4 h-4 text-neutral-400" />
          <span className="text-[10px] uppercase font-black tracking-wider text-neutral-400">Stream filters:</span>
        </div>

        <div className="flex flex-wrap gap-2 w-full justify-start md:justify-end">
          {CATEGORIES_META.map(cat => {
            const isActive = activeCategories.includes(cat.key);
            return (
              <button
                key={cat.key}
                onClick={() => toggleCategory(cat.key)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 select-none ${
                  isActive 
                    ? `${cat.bg} ${cat.border} ${cat.text} shadow-sm font-extrabold`
                    : "bg-white border-neutral-200 text-neutral-450 hover:border-neutral-300"
                }`}
              >
                {isActive ? (
                  <Check className="w-3.5 h-3.5 font-bold" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                )}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* The Visual Trend Chart and Side breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Recharts Analytics Area (8 columns) */}
        <div className="lg:col-span-8 bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-neutral-100 pb-4 gap-2">
            <div>
              <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight">Revenue Trends & Multi-Category Correlation</h3>
              <p className="text-[10px] font-semibold text-neutral-400">Click a data point to inspect details for that month</p>
            </div>

            {chartType === "area" && (
              <button
                onClick={() => setIsStacked(!isStacked)}
                className="text-[10px] border border-neutral-200 hover:border-neutral-300 rounded-lg px-2.5 py-1 text-neutral-500 hover:text-neutral-900 transition-colors font-bold cursor-pointer"
              >
                Display mode: {isStacked ? "Stacked" : "Overlay Lines"}
              </button>
            )}
          </div>

          <div className="h-80 w-full pt-6">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart
                  data={compiledData}
                  onClick={(e) => {
                    if (e && e.activeLabel) {
                      setSelectedMonth(e.activeLabel);
                    }
                  }}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    {CATEGORIES_META.map(cat => (
                      <linearGradient key={`grad-${cat.key}`} id={`grad-${cat.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={cat.color} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={cat.color} stopOpacity={0.0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#a3a3a3" 
                    fontSize={10} 
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#a3a3a3" 
                    fontSize={10}
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₦${v >= 1000000 ? (v / 1000000).toFixed(1) + "M" : v / 1000 + "k"}`}
                  />
                  <Tooltip 
                    content={<CustomChartTooltip />} 
                    cursor={{ stroke: '#e5e7eb', strokeWidth: 1 }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  />
                  {CATEGORIES_META.map(cat => {
                    if (!activeCategories.includes(cat.key)) return null;
                    return (
                      <Area
                        key={cat.key}
                        type="monotone"
                        dataKey={cat.key}
                        stroke={cat.color}
                        fill={`url(#grad-${cat.key})`}
                        strokeWidth={2}
                        stackId={isStacked ? "1" : undefined}
                      />
                    );
                  })}
                </AreaChart>
              ) : chartType === "line" ? (
                <LineChart
                  data={compiledData}
                  onClick={(e) => {
                    if (e && e.activeLabel) {
                      setSelectedMonth(e.activeLabel);
                    }
                  }}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#a3a3a3" 
                    fontSize={10} 
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#a3a3a3" 
                    fontSize={10}
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₦${v >= 1000000 ? (v / 1000000).toFixed(1) + "M" : v / 1000 + "k"}`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                  />
                  {CATEGORIES_META.map(cat => {
                    if (!activeCategories.includes(cat.key)) return null;
                    return (
                      <Line
                        key={cat.key}
                        type="monotone"
                        dataKey={cat.key}
                        stroke={cat.color}
                        strokeWidth={2.5}
                        activeDot={{ r: 6 }}
                      />
                    );
                  })}
                </LineChart>
              ) : (
                <BarChart
                  data={compiledData}
                  onClick={(e) => {
                    if (e && e.activeLabel) {
                      setSelectedMonth(e.activeLabel);
                    }
                  }}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#a3a3a3" 
                    fontSize={10} 
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#a3a3a3" 
                    fontSize={10}
                    fontFamily="sans-serif"
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `₦${v >= 1000000 ? (v / 1000000).toFixed(1) + "M" : v / 1000 + "k"}`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                  />
                  {CATEGORIES_META.map(cat => {
                    if (!activeCategories.includes(cat.key)) return null;
                    return (
                      <Bar
                        key={cat.key}
                        dataKey={cat.key}
                        stackId={isStacked ? "a" : undefined}
                        fill={cat.color}
                        radius={isStacked ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                      />
                    );
                  })}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Proportions Pie & Month Details (4 columns) */}
        <div className="lg:col-span-4 bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-6">
          <div>
            <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight border-b border-neutral-100 pb-2">Category Market Share</h3>
            <p className="text-[10px] text-neutral-400 font-semibold mt-1">Relative distribution across current view scope</p>
          </div>

          <div className="h-44 relative flex items-center justify-center">
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatNaira(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-neutral-450 font-bold">Select categories to view share</div>
            )}
            
            {/* Center Summary Labels */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-2">
              <span className="text-[9px] font-black uppercase text-neutral-450 tracking-wider">Top Share</span>
              <span className="text-xs font-black text-neutral-800 uppercase mt-0.5">{stats.topCategory}</span>
            </div>
          </div>

          {/* Simple legends table */}
          <div className="space-y-1 text-[10px] font-extrabold text-neutral-500 uppercase">
            {pieChartData.map(slice => {
              const percentage = stats.total > 0 ? ((slice.value / stats.total) * 100).toFixed(1) : "0";
              return (
                <div key={slice.name} className="flex justify-between items-center py-1">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: slice.color }} />
                    <span className="text-neutral-700 font-bold">{slice.name}</span>
                  </div>
                  <span>{percentage}% ({formatNaira(Math.round(slice.value / 1000)) + "k"})</span>
                </div>
              );
            })}
          </div>

        </div>

      </div>

      {/* Under Month Detail Deep Drill & Historical Order Sync */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Drill down module details for selected month */}
        <div className="lg:col-span-5 bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight flex items-center justify-between">
              <span>Drill down: {monthDetail?.monthName || "Selected Month"}</span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">Cycle Review</span>
            </h3>
            <p className="text-[10px] text-neutral-400 font-semibold mt-1">Itemized analytical report of chosen month</p>
          </div>

          {monthDetail ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center py-1.5 border-b border-dashed border-neutral-100">
                <span className="text-xs text-neutral-700 font-bold flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Naija Fashion & Ankara</span>
                </span>
                <span className="text-xs font-black text-neutral-900">{formatNaira(monthDetail.fashion)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-dashed border-neutral-100">
                <span className="text-xs text-neutral-700 font-bold flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Naija Tech Hub</span>
                </span>
                <span className="text-xs font-black text-neutral-900">{formatNaira(monthDetail.tech)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-dashed border-neutral-100">
                <span className="text-xs text-neutral-700 font-bold flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Beauty & Wellness</span>
                </span>
                <span className="text-xs font-black text-neutral-900">{formatNaira(monthDetail.beauty)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-dashed border-neutral-100">
                <span className="text-xs text-neutral-700 font-bold flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span>Local Groceries & Food</span>
                </span>
                <span className="text-xs font-black text-neutral-900">{formatNaira(monthDetail.groc)}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-dashed border-neutral-100">
                <span className="text-xs text-neutral-700 font-bold flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                  <span>Home Crafts & Art</span>
                </span>
                <span className="text-xs font-black text-neutral-900">{formatNaira(monthDetail.home)}</span>
              </div>
              
              <div className="pt-2 flex justify-between items-center">
                <span className="text-xs font-black text-neutral-800 uppercase tracking-wide">Aggregate Sum Value:</span>
                <span className="text-sm font-black text-indigo-600 font-sans">{formatNaira(monthDetail.total)}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-neutral-450 font-bold">Select a node on the chart to generate focus drilldown metrics</div>
          )}
        </div>

        {/* Live synchronization logs - displays how live orders influence charts */}
        <div className="lg:col-span-7 bg-white border border-neutral-150 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="border-b border-neutral-100 pb-3">
            <h3 className="font-extrabold text-neutral-900 text-sm tracking-tight flex items-center justify-between">
              <span>Order Ledger Feed Synchronization (Live)</span>
              <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded text-[9px] uppercase font-mono font-bold tracking-widest inline-flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>DYNAMIC</span>
              </span>
            </h3>
            <p className="text-[10px] text-neutral-400 font-semibold mt-1">Live feed of orders currently enriching trend graphs</p>
          </div>

          <div className="overflow-y-auto max-h-56 pr-1 space-y-2 select-none">
            {orders.map((ord) => (
              <div key={ord.id} className="p-3 bg-neutral-50 rounded-xl border border-neutral-150 flex items-center justify-between transition-all hover:bg-neutral-100 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-black text-neutral-800 uppercase">{ord.id}</span>
                    <span className="text-[9px] bg-neutral-200 text-neutral-600 font-extrabold px-1.5 py-0.2 rounded-full uppercase">{ord.status}</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 font-medium">{ord.customerName} &bull; {ord.date}</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-neutral-800">{formatNaira(ord.value)}</p>
                  <p className="text-[9px] text-neutral-400 font-bold">
                    {ord.value > 150000 
                      ? "Device Segment" 
                      : ord.value > 75000 
                        ? "Fashion Segment" 
                        : "Retail Specialty Feed"}
                  </p>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <div className="py-12 text-center text-xs text-neutral-400 font-bold">No live orders found. Chart displaying baseline predictions.</div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

// Custom tooltip renderer for rich Tailwind layouts in Recharts
function CustomChartTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const total = payload.reduce((acc: number, entry: any) => acc + entry.value, 0);
    return (
      <div className="bg-neutral-900/95 backdrop-blur-md text-white p-4 rounded-2xl border border-neutral-800 shadow-xl font-sans text-left space-y-2.5 max-w-xs leading-none">
        <div className="border-b border-neutral-800 pb-1.5 flex justify-between items-center gap-4">
          <p className="text-[10px] font-black tracking-wider uppercase text-neutral-400">Month: {label}</p>
          <span className="text-[8px] bg-indigo-500/20 text-indigo-300 font-bold px-1.5 py-0.5 rounded uppercase font-mono">Recharts Ledger</span>
        </div>
        <div className="space-y-2">
          {payload.map((entry: any, idx: number) => (
            <div key={`tip-${idx}`} className="flex justify-between items-center text-[11px] font-bold space-x-8">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
                <span className="text-neutral-300">{entry.name}:</span>
              </div>
              <span className="font-mono text-white">{formatNaira(entry.value)}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-neutral-800 flex justify-between items-center text-xs font-black">
            <span className="text-neutral-400">Total Sum:</span>
            <span className="text-indigo-400 font-mono">{formatNaira(total)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
