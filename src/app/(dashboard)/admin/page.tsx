"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserProfile } from "@/components/auth/user-profile";
import { RoleGate } from "@/components/auth/role-gate";
import { 
  ShoppingCart, Package, Banknote, AlertTriangle, 
  LayoutDashboard, LogOut, Loader2, ShieldCheck, Clock, 
  Users, ChevronLeft, QrCode, MapPin, Database, LifeBuoy,
  Award, TrendingUp, ChevronRight
} from "lucide-react";
import Link from 'next/link';
import { toast } from 'sonner';

const MapWithNoSSR = dynamic<any>(() => import('../../../components/MapComponent').then((mod) => mod.default), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-50 animate-pulse flex flex-col items-center justify-center font-bold text-slate-300 gap-2 rounded-[3rem]">
      <Loader2 className="animate-spin" size={20} />
      <span className="text-[10px] uppercase tracking-widest text-center text-slate-400">Syncing Indicator Feed...</span>
    </div>
  )
});

interface DashboardStats {
  todaySales: number;
  lowStockCount: number;
  lateStaff: any[];
  overtimeCount: number;
  totalStockValue: number;
  pendingIssuesCount: number; 
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({ 
    todaySales: 0, lowStockCount: 0, lateStaff: [], 
    overtimeCount: 0, totalStockValue: 0, pendingIssuesCount: 0
  });
  const [activeStaff, setActiveStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const getMasterData = async () => {
    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const todayStr = now.toISOString().split('T')[0];
      
      const [sales, stock, attendance, issues] = await Promise.all([
        supabase.from('sales').select('total_amount').gte('created_at', todayStart),
        supabase.from('product_variants').select('stock_quantity, cost_price'),
        supabase.from('attendance').select('*').eq('Date', todayStr),
        supabase.from('terminal_issues').select('id').eq('resolved', false)
      ]);
      
      let val = 0;
      stock.data?.forEach(i => val += (i.stock_quantity * (i.cost_price || 0)));

      // 1. FILTER CLOCKED-IN STAFF FOR THE MAP
      // We look for records today where "Time Out" is empty/null
      const currentDuty = attendance.data?.filter(r => !r["Time Out"]) || [];
      const mappedStaff = currentDuty.map(staff => ({
        name: staff["Employee Name"],
        lat: Number(staff.lat) || -1.286389, // Default to Nairobi if no GPS
        lng: Number(staff.lng) || 36.817223,
        status: 'Active'
      }));

      setActiveStaff(mappedStaff);

      setStats({
        todaySales: sales.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0,
        lowStockCount: stock.data?.filter(i => i.stock_quantity < 10).length || 0,
        lateStaff: attendance.data?.filter(r => r.Notes === 'Late Arrival') || [],
        overtimeCount: attendance.data?.filter(r => r.status === 'Overtime').length || 0,
        totalStockValue: val,
        pendingIssuesCount: issues.data?.length || 0
      });
    } catch (error) {
      console.error("HQ Sync Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getMasterData();

    // 2. ATTENDANCE REALTIME LISTENER
    // This updates the count immediately when someone clocks in/out
    const attendanceSub = supabase
      .channel('live-attendance-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance' }, () => {
        getMasterData();
      })
      .subscribe();

    const issueSubscription = supabase
      .channel('hq-issue-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'terminal_issues' }, (payload) => {
        toast.error(`NEW SUPPORT TICKET: ${payload.new.issue_type}`, {
          description: payload.new.staff_name,
          duration: 10000,
        });
        getMasterData();
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(attendanceSub);
      supabase.removeChannel(issueSubscription);
    };
  }, []);

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-white">
      <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
      <p className="text-slate-900 font-black uppercase text-xs tracking-widest">Kenstar HQ Booting...</p>
    </div>
  );

  return (
    <RoleGate allowedRoles={['founder', 'admin']}>
      <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
        <aside className="w-72 bg-slate-900 text-white flex flex-col shrink-0 shadow-2xl">
          <div className="p-8">
            <h1 className="text-2xl font-black tracking-tighter italic leading-none">KENSTAR <span className="text-[#007a43]">HQ</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">Master Controller</p>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
              <Link href="/admin"><NavItem icon={<LayoutDashboard size={18}/>} label="HQ Overview" active /></Link>
              <Link href="/admin/terminal-issues" className="relative group">
                <NavItem 
                  icon={<LifeBuoy size={18} className={stats.pendingIssuesCount > 0 ? "text-red-500 animate-pulse" : "text-slate-400"} />} 
                  label="Terminal Support" 
                />
                {stats.pendingIssuesCount > 0 && (
                  <span className="absolute right-6 top-1/2 -translate-y-1/2 bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg">
                    {stats.pendingIssuesCount}
                  </span>
                )}
              </Link>
              <Link href="/admin/performance"><NavItem icon={<Award size={18} className="text-amber-400" />} label="Performance Card" /></Link>
              <Link href="/admin/attendance"><NavItem icon={<Database size={18} className="text-blue-400" />} label="Staff Records Terminal" /></Link>
              <div className="h-px bg-white/5 my-4 mx-4" />
              <Link href="/pos"><NavItem icon={<ShoppingCart size={18}/>} label="POS Terminal" /></Link>
              <Link href="/qr-station"><NavItem icon={<QrCode size={18} className="text-purple-400" />} label="QR Station" /></Link>
              <Link href="/inventory"><NavItem icon={<Package size={18}/>} label="Inventory Master" /></Link>
              <Link href="/admin/users"><NavItem icon={<ShieldCheck size={18} className="text-amber-400" />} label="Security" /></Link>
          </nav>

          <div className="p-6 border-t border-white/5 bg-black/20">
              <button onClick={handleSignOut} className="flex items-center gap-3 text-red-400 font-black p-4 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-2xl w-full transition-all text-[11px] uppercase tracking-widest">
                <LogOut size={16} /> Exit System
              </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-10 space-y-8">
          <header className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200">
                <LayoutDashboard size={20} className="text-[#007a43]" />
              </div>
              <div>
                <h2 className="font-black text-slate-900 uppercase text-xl tracking-tighter italic leading-none">Command Center</h2>
                <p className="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse mr-2" /> Live Analytics
                </p>
              </div>
            </div>
            <UserProfile />
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Today's Revenue" value={`KES ${stats.todaySales.toLocaleString()}`} icon={<Banknote />} color="bg-green-600" />
            <StatCard title="Total Stock Value" value={`KES ${stats.totalStockValue.toLocaleString()}`} icon={<Package />} color="bg-blue-600" />
            <StatCard title="Overtime Sessions" value={stats.overtimeCount.toString()} icon={<Clock />} color="bg-slate-900" />
          </div>

          <Link href="/admin/performance" className="block group">
            <div className="bg-gradient-to-r from-[#007a43] to-green-500 p-8 rounded-[3rem] shadow-xl shadow-green-100 flex items-center justify-between transition-all hover:scale-[1.01] active:scale-[0.99]">
              <div className="flex items-center gap-8">
                <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center text-white backdrop-blur-md">
                  <Award size={40} />
                </div>
                <div>
                  <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Quality Management</p>
                  <h3 className="text-white text-3xl font-black uppercase italic leading-none mt-1">Staff Performance Scoring</h3>
                  <p className="text-white/80 text-[11px] font-bold mt-2 flex items-center gap-2 uppercase"><TrendingUp size={14} /> Tap here to log daily ratings and view leaderboard</p>
                </div>
              </div>
              <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-[#007a43] shadow-lg group-hover:translate-x-2 transition-transform">
                <ChevronRight size={32} />
              </div>
            </div>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
            <div className="lg:col-span-2 bg-white rounded-[3rem] shadow-xl overflow-hidden border-4 border-white relative">
              <div className="absolute top-6 left-6 z-[400] bg-white/90 backdrop-blur-md border border-slate-200 text-slate-900 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
                <MapPin size={14} className="text-blue-600" /> Signal Indicator Panel
              </div>
              <MapWithNoSSR staffLocations={activeStaff} />
            </div>

            <div className="bg-white rounded-[3rem] shadow-xl p-8 border border-slate-200 flex flex-col">
              <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-6 border-b pb-4 shrink-0">Live Presence ({activeStaff.length})</h3>
              <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                {activeStaff.length > 0 ? activeStaff.map((staff, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-black text-xs shadow-md uppercase">
                      {staff.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-[11px] uppercase tracking-tight">{staff.name}</p>
                      <p className="text-[9px] text-green-600 font-bold uppercase tracking-tighter italic mt-1">Status: Active</p>
                    </div>
                  </div>
                )) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-40 grayscale text-center">
                    <Users size={40} className="mb-2 text-slate-400 mx-auto" />
                    <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest leading-tight">No Active Signals</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-200">
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" /> Violation Log (Late Arrival)
                </h3>
                {stats.lateStaff.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stats.lateStaff.map((s, i) => (
                      <div key={i} className="bg-red-50 p-4 rounded-2xl border border-red-100 flex justify-between items-center">
                         <span className="font-black text-red-900 uppercase text-[10px]">{s["Employee Name"]}</span>
                         <span className="bg-red-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase">{s["Time In"]}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10"><p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] italic text-center">Operational Status: All Staff on Schedule</p></div>
                )}
            </div>

            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-200">
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest mb-6 flex items-center gap-2">
                  <LifeBuoy size={16} className="text-[#007a43]" /> Support Queue
                </h3>
                {stats.pendingIssuesCount > 0 ? (
                  <Link href="/admin/terminal-issues" className="block group">
                    <div className="bg-green-50 p-6 rounded-[2rem] border-2 border-green-100 flex flex-col items-center justify-center gap-2 group-hover:bg-[#007a43] transition-all duration-300">
                       <span className="text-3xl font-black text-[#007a43] group-hover:text-white">{stats.pendingIssuesCount}</span>
                       <span className="text-[10px] font-black text-[#007a43]/60 group-hover:text-white uppercase tracking-widest text-center">Active Support Tickets Needs Attention</span>
                    </div>
                  </Link>
                ) : (
                  <div className="text-center py-10 opacity-40"><p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] italic text-center">System Health: Normal</p></div>
                )}
            </div>
          </div>
        </main>
      </div>
    </RoleGate>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-slate-900 mt-2 tracking-tighter leading-none">{value}</p>
      </div>
      <div className={`w-14 h-14 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>{icon}</div>
    </div>
  );
}

function NavItem({ icon, label, active = false, className = "" }: any) {
  return (
    <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-bold transition-all cursor-pointer ${
      active ? 'bg-[#007a43] text-white shadow-lg shadow-green-900/40' : 'text-slate-400 hover:bg-white/5 hover:text-white'
    } ${className}`}>
      {icon} <span className="text-[11px] uppercase tracking-wider">{label}</span>
    </div>
  );
}