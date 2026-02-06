"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { UserProfile } from "@/components/auth/user-profile";
import { RoleGate } from "@/components/auth/role-gate"; // Enforcing the gate
import { 
  ShoppingCart, Factory, Package, Banknote, 
  AlertTriangle, LayoutDashboard, LogOut, 
  Loader2, RefreshCcw, ShieldCheck
} from "lucide-react";
import Link from 'next/link';
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [todaySales, setTodaySales] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  const getDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Fetch User Role for Sidebar filtering
      const { data: profile } = await supabase
        .from('staff')
        .select('role')
        .eq('email', session.user.email)
        .single();
      
      setUserRole(profile?.role);

      // 2. Fetch Operational Data (Only Managers/Founders get this far)
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      const [salesRes, stockRes] = await Promise.all([
        supabase.from('sales').select('total_amount').gte('created_at', todayStart),
        supabase.from('product_variants').select('*, products(name)').lt('stock_quantity', 10).order('stock_quantity', { ascending: true })
      ]);

      if (salesRes.error) throw salesRes.error;
      if (stockRes.error) throw stockRes.error;

      const total = salesRes.data?.reduce((sum, sale) => sum + (sale.total_amount || 0), 0) || 0;
      setTodaySales(total);
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

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="font-black text-slate-900 tracking-tight uppercase text-xs">Syncing HQ Data...</p>
      </div>
    );
  }

  return (
    <RoleGate allowedRoles={['founder', 'admin', 'manager']}>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 shadow-2xl">
          <div className="p-6">
            <h1 className="text-xl font-black tracking-tighter italic">KENSTAR <span className="text-blue-400">ERP</span></h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-blue-400/80">Command Center</p>
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-4">
            <NavItem icon={<LayoutDashboard size={20}/>} label="Overview" active />
            <Link href="/pos"><NavItem icon={<ShoppingCart size={20}/>} label="Retail POS" /></Link>
            <Link href="/inventory"><NavItem icon={<Package size={20}/>} label="Inventory" /></Link>
            <Link href="/factory"><NavItem icon={<Factory size={20}/>} label="Factory Ops" /></Link>
            
            {/* FOUNDER/ADMIN ONLY SECURE LINK */}
            {(userRole === 'founder' || userRole === 'admin') && (
              <Link href="/admin/users">
                <NavItem icon={<ShieldCheck size={20} className="text-amber-400" />} label="Staff Rites" />
              </Link>
            )}
          </nav>

          <div className="p-4 border-t border-white/10">
             <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 text-red-400 font-bold p-3 hover:bg-red-500/10 w-full rounded-xl transition-all">
               <LogOut size={18} /> EXIT SYSTEM
             </button>
          </div>
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 overflow-y-auto">
          <header className="h-16 bg-white border-b px-8 flex items-center justify-between sticky top-0 z-20">
            <h2 className="font-bold text-slate-800 uppercase text-xs tracking-widest">HQ Overview</h2>
            <UserProfile />
          </header>

          <div className="p-8 max-w-6xl mx-auto">
            {/* STAT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white border shadow-sm p-6 rounded-3xl flex items-center justify-between transition-transform hover:scale-[1.01]">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Revenue Today</p>
                  <p className="text-3xl font-black text-slate-900 mt-1">KES {todaySales.toLocaleString()}</p>
                </div>
                <div className="bg-green-100 p-4 rounded-2xl"><Banknote className="text-green-600 w-8 h-8" /></div>
              </div>

              <div className="bg-slate-900 p-6 rounded-3xl text-white flex items-center justify-between shadow-xl shadow-slate-200 transition-transform hover:scale-[1.01]">
                 <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Operational Alerts</p>
                   <p className="text-3xl font-black mt-1">{lowStockItems.length} Low Stock</p>
                 </div>
                 <div className="bg-white/10 p-4 rounded-2xl"><AlertTriangle className="text-amber-400 w-8 h-8" /></div>
              </div>
            </div>

            {/* LOW STOCK ALERT SECTION */}
            {lowStockItems.length > 0 && (
              <div className="mb-8 p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 uppercase tracking-tight mb-6">
                      <AlertTriangle className="w-5 h-5 text-amber-500" /> Inventory Warnings
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {lowStockItems.map((item) => (
                      <div key={item.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center transition-all hover:border-blue-200">
                          <div>
                          <p className="text-sm font-bold text-slate-800">{item.products?.name}</p>
                          <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">{item.size} • SKU: {item.sku}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-lg font-black text-sm border ${item.stock_quantity === 0 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-white text-amber-600'}`}>
                          {item.stock_quantity}
                          </div>
                      </div>
                      ))}
                  </div>
              </div>
            )}

            {/* QUICK LINKS SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <QuickLinkCard title="Sales" desc="POS Terminal" icon={<ShoppingCart />} href="/pos" color="bg-blue-600" />
              <QuickLinkCard title="Warehouse" desc="Bulk Stock" icon={<Package />} href="/inventory" color="bg-emerald-600" />
              <QuickLinkCard title="Factory" desc="Production" icon={<Factory />} href="/factory" color="bg-orange-600" />
              {(userRole === 'founder' || userRole === 'admin') && (
                <QuickLinkCard title="Staff" desc="Security Rites" icon={<ShieldCheck />} href="/admin/users" color="bg-slate-900" />
              )}
            </div>
          </div>
        </main>
      </div>
    </RoleGate>
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
    <div className="bg-white p-6 rounded-3xl border border-slate-200 hover:shadow-xl transition-all group relative overflow-hidden flex flex-col justify-between">
      <div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-4 ${color} shadow-lg shadow-inherit relative z-10`}>
            {icon}
        </div>
        <h3 className="text-xl font-black text-slate-900 relative z-10">{title}</h3>
        <p className="text-[10px] text-slate-500 mb-6 font-bold uppercase tracking-widest relative z-10">{desc}</p>
      </div>
      <Link href={href}>
        <Button className={`w-full rounded-xl font-black h-11 ${color} hover:opacity-90 transition-opacity uppercase text-[10px] tracking-widest`}>
          Enter
        </Button>
      </Link>
    </div>
  );
}