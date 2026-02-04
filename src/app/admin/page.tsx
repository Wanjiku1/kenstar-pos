"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from "@/components/auth/user-profile";
import { 
  ShoppingCart, Factory, Package, Banknote, 
  AlertTriangle, LayoutDashboard, Settings, LogOut 
} from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [todaySales, setTodaySales] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getDashboardData() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Fetch Sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', today.toISOString());

      if (salesData) {
        const total = salesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
        setTodaySales(total);
      }

      // 2. Fetch Low Stock Items
      const { data: stockData } = await supabase
        .from('product_variants')
        .select('*, products(name)')
        .lt('stock_quantity', 10);

      if (stockData) setLowStockItems(stockData);
      setLoading(false);
    }
    getDashboardData();
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* SIDEBAR - Keep this visible for Admin at all times */}
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
           <button className="flex items-center gap-3 text-red-400 font-bold p-3 hover:bg-red-500/10 w-full rounded-xl transition-all">
             <LogOut size={18} /> EXIT TERMINAL
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
          {/* TOP STAT CARD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border shadow-sm p-6 rounded-3xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Sales Today</p>
                <p className="text-3xl font-black text-slate-900 mt-1">
                   {loading ? "..." : `KES ${todaySales.toLocaleString()}`}
                </p>
              </div>
              <div className="bg-green-100 p-4 rounded-2xl">
                <Banknote className="text-green-600 w-8 h-8" />
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-3xl text-white flex items-center justify-between shadow-xl shadow-slate-200">
               <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Stock Alerts</p>
                 <p className="text-3xl font-black mt-1">{lowStockItems.length} Items Low</p>
               </div>
               <div className="bg-white/10 p-4 rounded-2xl">
                <AlertTriangle className="text-amber-400 w-8 h-8" />
              </div>
            </div>
          </div>

          {/* LOW STOCK TABLE (If any) */}
          {lowStockItems.length > 0 && (
            <div className="mb-8 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Production & Fabric Warnings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{item.products?.name}</p>
                      <p className="text-[10px] text-slate-500 uppercase">{item.size} | {item.sku}</p>
                    </div>
                    <span className="text-red-600 font-black text-xs px-2 py-1 bg-white rounded-lg border shadow-sm">
                      {item.stock_quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODULE LINKS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <QuickLinkCard 
              title="Sales Terminal" 
              desc="Retail & School Orders" 
              icon={<ShoppingCart />} 
              href="/pos" 
              color="bg-blue-600" 
            />
            <QuickLinkCard 
              title="Inventory" 
              desc="Fabric & Store Stock" 
              icon={<Package />} 
              href="/inventory" 
              color="bg-emerald-600" 
            />
            <QuickLinkCard 
              title="Factory Admin" 
              desc="Tailoring & Production" 
              icon={<Factory />} 
              href="/factory" 
              color="bg-orange-600" 
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// Sub-components for cleaner code
function NavItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold cursor-pointer transition-all ${
      active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-white/5'
    }`}>
      {icon} <span>{label}</span>
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
      <p className="text-sm text-slate-500 mb-6">{desc}</p>
      <Link href={href}>
        <Button className={`w-full rounded-xl font-bold ${color}`}>Open Module</Button>
      </Link>
    </div>
  );
}