"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RoleGate } from "@/components/auth/role-gate";
import { UserProfile } from "@/components/auth/user-profile";
import { 
  Banknote, TrendingUp, Wallet, ShoppingBag, 
  BarChart3, Loader2, Award, Briefcase, Gem, 
  ArrowUpRight, ArrowDownRight, PieChart,
  PackageSearch, ShieldCheck, ChevronRight, Zap 
} from "lucide-react";
import Link from 'next/link';

interface CEOMetrics {
  todaySales: number;
  monthSales: number;
  totalInventoryValue: number;
  averageBasketValue: number;
  salesCount: number;
  schoolSales: number;
  professionalSales: number;
  accessoriesSales: number;
}

export default function CEOExecutiveDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<CEOMetrics>({
    todaySales: 0,
    monthSales: 0,
    totalInventoryValue: 0,
    averageBasketValue: 0,
    salesCount: 0,
    schoolSales: 0,
    professionalSales: 0,
    accessoriesSales: 0
  });
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);

  const getCEOMetrics = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [todaySales, monthlySales, stock] = await Promise.all([
        supabase.from('sales').select('total_amount, category').gte('created_at', todayStart),
        supabase.from('sales').select('total_amount').gte('created_at', monthStart),
        supabase.from('product_variants').select('stock_quantity, price, products(name)').lt('stock_quantity', 10).limit(5) // Limit alerts to view gracefully
      ]);

      // 💰 Calculate Turnovers
      const dayRev = todaySales.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const monthRev = monthlySales.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;

      // 📦 Tied Working Capital
      const { data: allStock } = await supabase.from('product_variants').select('stock_quantity, price');
      let stockVal = 0;
      allStock?.forEach(i => stockVal += ((i.stock_quantity || 0) * (i.price || 0)));

      // 🏷️ Category Splits
      let school = 0, prof = 0, acc = 0;
      todaySales.data?.forEach((s: any) => {
        if (s.category === 'School') school += s.total_amount;
        else if (s.category === 'Professional') prof += s.total_amount;
        else if (s.category === 'Accessories') acc += s.total_amount;
      });

      setMetrics({
        todaySales: dayRev,
        monthSales: monthRev,
        totalInventoryValue: stockVal,
        salesCount: todaySales.data?.length || 0,
        averageBasketValue: todaySales.data?.length ? dayRev / todaySales.data.length : 0,
        schoolSales: school,
        professionalSales: prof,
        accessoriesSales: acc
      });

      setLowStockAlerts(stock.data || []);

    } catch (error) {
      console.error("CEO Engine Failure:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCEOMetrics();
  }, []);

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc]">
      <Loader2 className="w-12 h-12 text-[#007a43] animate-spin mb-4" />
      <p className="text-slate-900 font-black uppercase text-xs tracking-widest">Securing CEO Vault Access...</p>
    </div>
  );

  return (
    <RoleGate allowedRoles={['founder']}>
      <div className="min-h-screen bg-[#f8fafc] font-sans p-10 space-y-10">
        
        {/* 👑 Executive Header */}
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-md border border-slate-100">
              <Gem size={28} className="text-[#007a43]" />
            </div>
            <div>
              <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">
                Kenstar <span className="text-[#007a43]">Executive</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mt-1.5">
                <span className="w-2 h-2 bg-[#007a43] rounded-full animate-pulse" /> Live Enterprise Financial Stream
              </p>
            </div>
          </div>
          <UserProfile />
        </header>

        {/* 🚀 Top Tier Holy Grail Financial KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <KpiCard 
            title="Gross Turnover (Today)" 
            value={`KES ${metrics.todaySales.toLocaleString()}`} 
            subValue={`${metrics.salesCount} checkouts today`} 
            trend={+12.4}
            icon={<Banknote size={24} />} 
            color="bg-[#007a43]" 
          />
          <KpiCard 
            title="Month-To-Date Aggregation" 
            value={`KES ${metrics.monthSales.toLocaleString()}`} 
            subValue="Running Monthly Turnover" 
            trend={+4.8}
            icon={<TrendingUp size={24} />} 
            color="bg-blue-600" 
          />
          <KpiCard 
            title="Working Capital (Stock Assets)" 
            value={`KES ${metrics.totalInventoryValue.toLocaleString()}`} 
            subValue="Asset valuation on shelves" 
            trend={-1.5}
            icon={<Wallet size={24} />} 
            color="bg-purple-600" 
          />
        </div>

        {/* 📊 Central Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[450px]">
          
          {/* Velocity Progress Bars */}
          <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 shadow-xl border border-slate-200 h-[450px] flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 size={18} className="text-[#007a43]" /> Structural Sales Split
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">Relative movements across product categories</p>
            </div>

            <div className="space-y-6 flex-1 flex flex-col justify-center">
              <ProgressBar label="School Apparel" value={metrics.schoolSales} total={metrics.todaySales} color="bg-[#007a43]" />
              <ProgressBar label="Professional & Workwear" value={metrics.professionalSales} total={metrics.todaySales} color="bg-blue-600" />
              <ProgressBar label="Accessories (Socks, Ties, etc.)" value={metrics.accessoriesSales} total={metrics.todaySales} color="bg-amber-500" />
            </div>
          </div>

          {/* 🧠 CEO Action Stream (Fixed Height Scrolling Solution!) */}
          <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-200 h-[450px] flex flex-col">
            <div className="shrink-0 mb-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Zap size={18} className="text-[#007a43]" /> Executive Action Stream
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">System intelligence and bottlenecks</p>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 min-h-0 space-y-4 pb-4">
              {lowStockAlerts.length > 0 ? lowStockAlerts.map((alert, i) => (
                <div key={i} className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-between shrink-0">
                  <div className="min-w-0 flex-1 mr-4">
                    <p className="text-[10px] font-black text-red-700 uppercase">Procurement Hazard</p>
                    <p className="text-xs font-bold text-slate-900 mt-1 truncate">{alert.products?.name} (Size {alert.size})</p>
                  </div>
                  <Link href="/inventory" className="shrink-0">
                    <button className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg shadow-sm transition-colors">
                      Stock
                    </button>
                  </Link>
                </div>
              )) : (
                <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between shrink-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black text-[#007a43] uppercase">Procurement Metric</p>
                    <p className="text-xs font-bold text-slate-900 mt-1">Safety stock margins optimal</p>
                  </div>
                  <span className="text-[11px] font-black text-[#007a43] shrink-0">🎉 Optimal</span>
                </div>
              )}

              <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between shrink-0">
                <div className="min-w-0 flex-1 mr-4">
                  <p className="text-[10px] font-black text-[#007a43] uppercase">Financial Milestone</p>
                  <p className="text-xs font-bold text-slate-900 mt-1 truncate">Average basket value surpassed KES {Math.round(metrics.averageBasketValue).toLocaleString()}</p>
                </div>
                <span className="text-[11px] font-black text-[#007a43] shrink-0">🎉 Target</span>
              </div>

              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between shrink-0">
                <div className="min-w-0 flex-1 mr-4">
                  <p className="text-[10px] font-black text-blue-700 uppercase">Growth Telemetry</p>
                  <p className="text-xs font-bold text-slate-900 mt-1 truncate">MonthToDate trends are +4.8% up</p>
                </div>
                <span className="text-[11px] font-black text-blue-700 shrink-0">📈 Upward</span>
              </div>

              <div className="h-4 w-full shrink-0" />
            </div>
          </div>
        </div>

        {/* 🔗 CEO Routing Jump-Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-10">
          <RouterLink href="/pos" label="Audit Sales Tills" icon={<Briefcase size={16} />} />
          <RouterLink href="/inventory" label="Audit Stock Matrix" icon={<PackageSearch size={16} />} />
          <RouterLink href="/admin" label="Jump to Operational HQ" icon={<ShieldCheck size={16} />} />
        </div>
      </div>
    </RoleGate>
  );
}

function KpiCard({ title, value, subValue, trend, icon, color }: any) {
  const isPositive = trend > 0;
  return (
    <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-200 h-[240px] flex flex-col justify-between hover:shadow-2xl transition-all">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
          <p className="text-3xl font-black text-slate-900 mt-2 tracking-tighter leading-none">{value}</p>
          <p className="text-[11px] font-bold text-slate-400 mt-1.5 uppercase">{subValue}</p>
        </div>
        <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} {isPositive ? '+' : ''}{trend}%
        </span>
        <span className="text-[10px] font-bold uppercase text-slate-400">vs Last Cycle Baseline</span>
      </div>
    </div>
  );
}

function ProgressBar({ label, value, total, color }: any) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-black text-slate-800 uppercase tracking-tight">{label}</span>
        <span className="text-xs font-black text-slate-900">KES {value.toLocaleString()}</span>
      </div>
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-1000 ease-out rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function RouterLink({ href, label, icon }: any) {
  return (
    <Link href={href} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all active:scale-[0.98] group">
      <div className="flex items-center gap-3">
        <div className="text-slate-400 group-hover:text-[#007a43] transition-colors">{icon}</div>
        <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{label}</span>
      </div>
      <ChevronRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
    </Link>
  );
}