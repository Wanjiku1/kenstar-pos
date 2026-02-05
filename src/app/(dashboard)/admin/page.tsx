"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from "@/components/auth/user-profile";
import { 
  ShoppingCart, Factory, Package, Banknote, 
  AlertTriangle, LayoutDashboard, LogOut, 
  Loader2, RefreshCcw
} from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [todaySales, setTodaySales] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Session check to prevent data fetching before auth is ready
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 2. Fetch Sales and Low Stock in parallel for speed
      const [salesRes, stockRes] = await Promise.all([
        supabase
          .from('sales')
          .select('total_amount')
          .gte('created_at', today.toISOString()),
        supabase
          .from('product_variants')
          .select('*, products(name)')
          .lt('stock_quantity', 10)
      ]);

      if (salesRes.error) throw salesRes.error;
      if (stockRes.error) throw stockRes.error;

      // 3. Process Sales
      const total = salesRes.data?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
      setTodaySales(total);

      // 4. Process Stock
      setLowStockItems(stockRes.data || []);

    } catch (err: any) {
      console.error("Dashboard Load Error:", err);
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDashboardData();
  }, []);

  // LOADING STATE: Prevents the "Hang" feel by giving immediate visual feedback
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <div className="text-center">
          <p className="font-black text-slate-900 tracking-tight">KENSTAR OPS</p>
          <p className="text-sm text-slate-500 font-medium">Syncing Command Center...</p>
        </div>
      </div>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <div className="h-screen w-full flex items-center justify-center p-6">
        <div className="bg-red-50 border border-red-200 p-8 rounded-3xl max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">Connection Issue</h2>
          <p className="text-red-700 text-sm mb-6">{error}</p>
          <Button onClick={getDashboardData} className="bg-red-600 hover:bg-red-700 w-full rounded-xl">
            <RefreshCcw className="mr-2 w-4 h-4" /> Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-6">
          <h1 className="text-xl font-black tracking-tighter">KENSTAR <span className="text-blue-400">ERP</span></h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Admin Command Center</p>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem icon={<LayoutDashboard size={20}/>} label="Executive Overview" active />
          <Link href="/pos"><NavItem icon={<ShoppingCart size={20}/>} label="Retail POS" /></Link>
          <Link href="/inventory"><NavItem icon={<Package size={20}/>} label="Inventory" /></Link>
          <Link href="/factory"><NavItem icon={<Factory size={20}/>} label="Factory Ops" /></Link>
        </nav>

        <div className="p-4 border-t border-white/10">
           <button 
             onClick={() => supabase.auth.signOut()}
             className="flex items-center gap-3 text-red-400 font-bold p-3 hover:bg-red-500/10 w-full rounded-xl transition-all"
           >
             <LogOut size={18} /> EXIT SYSTEM
           </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 bg-white border-b px-8 flex items-center justify-between sticky top-0 z-10">
          <h2 className="font-bold text-slate-800">Operational Overview</h2>
          <UserProfile />
        </header>

        <div className="p-8 max-w-6xl mx-auto">
          {/* STAT CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border shadow-sm p-6 rounded-3xl flex items-center justify-between transition-transform hover:scale-[1.01]">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Sales Today</p>
                <p className="text-3xl font-black text-slate-900 mt-1">
                   KES {todaySales.toLocaleString()}
                </p>
              </div>
              <div className="bg-green-100 p-4 rounded-2xl">
                <Banknote className="text-green-600 w-8 h-8" />
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-3xl text-white flex items-center justify-between shadow-xl shadow-slate-200 transition-transform hover:scale-[1.01]">
               <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stock Alerts</p>
                 <p className="text-3xl font-black mt-1">{lowStockItems.length} Items Low</p>
               </div>
               <div className="bg-white/10 p-4 rounded-2xl">
                <AlertTriangle className="text-amber-400 w-8 h-8" />
              </div>
            </div>
          </div>

          {/* LOW STOCK TABLE */}
          {lowStockItems.length > 0 && (
            <div className="mb-8 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-800">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Production & Fabric Warnings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center hover:bg-white hover:shadow-md transition-all">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.products?.name || 'Unknown Product'}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-medium">{item.size || 'N/A'} | {item.sku || 'No SKU'}</p>
                    </div>
                    <span className={`font-black text-xs px-2 py-1 rounded-lg border shadow-sm ${item.stock_quantity === 0 ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-white'}`}>
                      {item.stock_quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUICK LINKS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <QuickLinkCard title="Sales Terminal" desc="Retail & School Orders" icon={<ShoppingCart />} href="/pos" color="bg-blue-600" />
            <QuickLinkCard title="Inventory" desc="Fabric & Store Stock" icon={<Package />} href="/inventory" color="bg-emerald-600" />
            <QuickLinkCard title="Factory Admin" desc="Tailoring & Production" icon={<Factory />} href="/factory" color="bg-orange-600" />
          </div>
        </div>
      </main>
    </div>
  );
}

// SUB-COMPONENTS
function NavItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold cursor-pointer transition-all ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-white/5'
    }`}>
      {icon} <span className="text-sm">{label}</span>
    </div>
  );
}

function QuickLinkCard({ title, desc, icon, href, color }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 hover:shadow-xl transition-all group">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4 ${color} shadow-lg shadow-inherit`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      <p className="text-sm text-slate-500 mb-6 font-medium">{desc}</p>
      <Link href={href}>
        <Button className={`w-full rounded-xl font-bold h-11 ${color} hover:opacity-90 transition-opacity`}>Open Module</Button>
      </Link>
    </div>
  );
}