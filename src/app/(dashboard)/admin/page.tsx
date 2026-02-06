"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import { UserProfile } from "@/components/auth/user-profile";
import { RoleGate } from "@/components/auth/role-gate";
import { 
  ShoppingCart, Factory, Package, Banknote, AlertTriangle, 
  LayoutDashboard, LogOut, Loader2, ShieldCheck, Clock, 
  Users, TrendingUp, MapPin, QrCode, Receipt
} from "lucide-react";
import Link from 'next/link';

/** * FIXED DYNAMIC IMPORT FOR VERCEL
 * Uses a relative path to ensure the build worker finds the file.
 */
const MapWithNoSSR = dynamic<any>(() => import('../../../components/MapComponent').then((mod) => mod.default), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 animate-pulse flex flex-col items-center justify-center font-bold text-slate-400 gap-2">
      <Loader2 className="animate-spin" size={20} />
      <span className="text-[10px] uppercase tracking-widest">HQ Satellite Connecting...</span>
    </div>
  )
});

// Explicit Types to prevent "never[]" errors
interface DashboardStats {
  todaySales: number;
  lowStockCount: number;
  lateStaff: any[];
  totalStockValue: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({ 
    todaySales: 0, 
    lowStockCount: 0, 
    lateStaff: [], 
    totalStockValue: 0 
  });
  const [activeStaff, setActiveStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getMasterData = async () => {
      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        
        const [sales, stock, attendance] = await Promise.all([
          supabase.from('sales').select('total_amount').gte('created_at', todayStart),
          supabase.from('product_variants').select('stock_quantity, cost_price'),
          supabase.from('attendance').select('*').eq('Date', todayStart).eq('status', 'Late')
        ]);
        
        let val = 0;
        stock.data?.forEach(i => val += (i.stock_quantity * (i.cost_price || 0)));

        setStats({
          todaySales: sales.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0,
          lowStockCount: stock.data?.filter(i => i.stock_quantity < 10).length || 0,
          lateStaff: attendance.data || [],
          totalStockValue: val
        });
      } catch (error) {
        console.error("HQ Sync Error:", error);
      } finally {
        setLoading(false);
      }
    };

    getMasterData();

    // LIVE STAFF TRACKING
    const channel = supabase.channel('active-staff-map', { config: { presence: { key: 'admin' } } });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const staffList: any[] = [];
        Object.keys(state).forEach((key) => {
          state[key].forEach((pres: any) => staffList.push(pres));
        });
        setActiveStaff(staffList);
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, []);

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
      <p className="text-white font-black uppercase text-xs tracking-widest text-center">Kenstar HQ Booting...</p>
    </div>
  );

  return (
    <RoleGate allowedRoles={['founder', 'admin']}>
      <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
        
        {/* SIDEBAR */}
        <aside className="w-72 bg-slate-900 text-white flex flex-col shrink-0 shadow-2xl">
          <div className="p-8">
            <h1 className="text-2xl font-black tracking-tighter italic">KENSTAR <span className="text-blue-400">HQ</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">Master Controller</p>
          </div>
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
             <Link href="/admin"><NavItem icon={<LayoutDashboard size={18}/>} label="HQ Overview" active /></Link>
             <Link href="/pos"><NavItem icon={<ShoppingCart size={18}/>} label="POS Terminal" /></Link>
             <Link href="/qr-station"><NavItem icon={<QrCode size={18}/>} label="QR Station" /></Link>
             <Link href="/terminal"><NavItem icon={<Clock size={18}/>} label="Attendance" /></Link>
             <Link href="/inventory"><NavItem icon={<Package size={18}/>} label="Inventory Master" /></Link>
             <Link href="/admin/users"><NavItem icon={<ShieldCheck size={18} className="text-amber-400" />} label="Security" /></Link>
          </nav>
          <div className="p-6 border-t border-white/5 bg-black/20">
             <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 text-slate-400 font-bold p-3 hover:text-red-400 w-full transition-all text-xs uppercase">
               <LogOut size={16} /> End Session
             </button>
          </div>
        </aside>

        {/* MAIN HQ VIEW */}
        <main className="flex-1 overflow-y-auto p-10 space-y-8">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h2 className="font-black text-slate-900 uppercase text-xl tracking-tighter italic leading-none">Command Center</h2>
              <p className="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" /> System Live
              </p>
            </div>
            <UserProfile />
          </header>

          {/* MAP & FEED */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
            <div className="lg:col-span-2 bg-white rounded-[3rem] shadow-xl overflow-hidden border-4 border-white relative">
              <div className="absolute top-6 left-6 z-[1000] bg-slate-900 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                Live Satellite Feed
              </div>
              <MapWithNoSSR staffLocations={activeStaff} />
            </div>

            <div className="bg-white rounded-[3rem] shadow-xl p-8 border border-slate-200 flex flex-col overflow-hidden">
              <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-6 border-b pb-4">Online Now ({activeStaff.length})</h3>
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                {activeStaff.length > 0 ? activeStaff.map((staff, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black text-xs">
                      {staff.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-[11px] uppercase leading-none">{staff.name || "Unknown Staff"}</p>
                      <p className="text-[9px] text-green-600 font-bold uppercase tracking-tighter mt-1 italic">Active Signal</p>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 italic">
                    <p className="text-slate-500 font-bold text-[10px] uppercase">Waiting for signals...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* KPI STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Today's Revenue" value={`KES ${stats.todaySales.toLocaleString()}`} icon={<Banknote />} color="bg-green-600" />
            <StatCard title="Stock Value" value={`KES ${stats.totalStockValue.toLocaleString()}`} icon={<Package />} color="bg-blue-600" />
            <StatCard title="Late Staff" value={stats.lateStaff.length.toString()} icon={<AlertTriangle />} color="bg-red-600" />
          </div>

          {/* VIOLATIONS LOG */}
          <div className="bg-white p-8 rounded-[3rem] shadow-lg border border-slate-200">
             <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-6">Attendance Violations</h3>
             {stats.lateStaff.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                 {stats.lateStaff.map((s, i) => (
                   <div key={i} className="bg-red-50 p-4 rounded-2xl border border-red-100 flex justify-between items-center">
                      <span className="font-black text-red-900 uppercase text-[10px]">{s["Employee Name"]}</span>
                      <span className="bg-red-600 text-white px-2 py-1 rounded-md text-[9px] font-black">LATE: {s["Time In"]}</span>
                   </div>
                 ))}
               </div>
             ) : (
               <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest text-center py-6 italic">No violations reported today.</p>
             )}
          </div>
        </main>
      </div>
    </RoleGate>
  );
}

// SHARED COMPONENTS
function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-slate-900 mt-2 tracking-tighter">{value}</p>
      </div>
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
        {icon}
      </div>
    </div>
  );
}

function NavItem({ icon, label, active = false }: any) {
  return (
    <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all ${
      active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'
    }`}>
      {icon} <span className="text-[11px] uppercase tracking-wider">{label}</span>
    </div>
  );
}