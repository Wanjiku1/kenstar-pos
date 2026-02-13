"use client";

export const dynamic = 'force-dynamic';

import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ShieldCheck, User, Lock, Loader2, Wifi, WifiOff, 
  MapPinOff, RefreshCw, MapPin, Settings2
} from 'lucide-react'; 
import { toast } from 'sonner';

const APP_VERSION = "1.0.8";

const SHOP_DATA: Record<string, { lat: number; lng: number; name: string; color: string }> = {
  '315': { lat: -1.283519, lng: 36.887452, name: 'Shop 315', color: 'bg-blue-600' },
  '172': { lat: -1.283215, lng: 36.887374, name: 'Shop 172', color: 'bg-slate-900' },
  'Stage': { lat: -1.283971, lng: 36.887177, name: 'Stage Outlet', color: 'bg-green-600' }
};

function TerminalContent() {
  const searchParams = useSearchParams();
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const [targetCoords, setTargetCoords] = useState<{lat: number, lng: number} | null>(null);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState<number | null>(null);
  const [formData, setFormData] = useState({ staffId: '', pin: '' });
  const [staffMember, setStaffMember] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  // Initialize browser-only data
  useEffect(() => {
    setMounted(true);
    
    // Safety check for navigator
    if (typeof window !== 'undefined' && navigator.onLine !== undefined) {
      setIsOnline(navigator.onLine);
    }

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const updatePending = () => {
      const queue = JSON.parse(localStorage.getItem('kenstar_offline_sync') || '[]');
      setPendingCount(queue.length);
    };
    updatePending();

    const urlBranch = searchParams.get('branch');
    if (urlBranch && SHOP_DATA[urlBranch]) {
      handleManualBranchSelect(urlBranch);
    } else {
      const savedBranch = localStorage.getItem('kenstar_saved_branch');
      if (savedBranch && SHOP_DATA[savedBranch]) {
        setActiveBranch(savedBranch);
        setTargetCoords({ lat: SHOP_DATA[savedBranch].lat, lng: SHOP_DATA[savedBranch].lng });
      }
    }

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [searchParams]);

  const handleManualBranchSelect = (id: string) => {
    const shop = SHOP_DATA[id];
    if (!shop) return;
    setActiveBranch(id);
    setTargetCoords({ lat: shop.lat, lng: shop.lng });
    localStorage.setItem('kenstar_saved_branch', id);
  };

  // BACKGROUND SYNC & CACHE
  useEffect(() => {
    if (!mounted || !isOnline) return;

    const cacheStaffList = async () => {
      try {
        const { data, error } = await supabase.from('staff').select('*');
        if (!error && data) localStorage.setItem('kenstar_staff_list', JSON.stringify(data));
      } catch (e) { console.error("Staff cache failed"); }
    };

    const syncAttendance = async () => {
      const queue = JSON.parse(localStorage.getItem('kenstar_offline_sync') || '[]');
      if (queue.length === 0) return;
      let failed = [];
      for (const record of queue) {
        try {
          const { error } = await supabase.from('attendance').upsert(record, { onConflict: 'Employee Id, Date' });
          if (error) failed.push(record);
        } catch (e) { failed.push(record); }
      }
      localStorage.setItem('kenstar_offline_sync', JSON.stringify(failed));
      setPendingCount(failed.length);
    };

    cacheStaffList();
    syncAttendance();
  }, [isOnline, mounted]);

  useEffect(() => {
    if (mounted && targetCoords) checkLocation();
  }, [mounted, targetCoords]);

  const checkLocation = () => {
    if (!targetCoords || typeof navigator === 'undefined' || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat1 = pos.coords.latitude;
        const lon1 = pos.coords.longitude;
        setUserCoords({ lat: lat1, lng: lon1 });

        const R = 6371e3; 
        const dLat = (targetCoords.lat - lat1) * Math.PI / 180;
        const dLon = (targetCoords.lng - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI/180) * Math.cos(targetCoords.lat * Math.PI/180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const roundedDistance = Math.round(distance);
        
        setDistanceInfo(roundedDistance);
        setGeoError(roundedDistance > 100); 
      }, 
      (err) => {
        console.error("Geo Error:", err);
        setGeoError(true);
      }, 
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleVerify = async () => {
    if (!formData.staffId || !formData.pin) return toast.error("Enter credentials");
    setLoading(true);
    const staffList = JSON.parse(localStorage.getItem('kenstar_staff_list') || '[]');
    const user = staffList.find((s: any) => 
      s["Employee Id"]?.toUpperCase() === formData.staffId.toUpperCase() && 
      s["pin"]?.toString() === formData.pin.toString()
    );

    if (user) {
      setStaffMember(user);
      setStep(2);
    } else {
      toast.error("Invalid ID or PIN");
    }
    setLoading(false);
  };

  const processClock = async (type: 'In' | 'Out') => {
    setLoading(true);
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { hour12: false });
    const dateString = now.toISOString().split('T')[0];
    
    let status = "On Time";
    if (type === 'In') {
      const hrs = now.getHours();
      const mins = now.getMinutes();
      if (now.getDay() === 0) { if (hrs >= 11 && mins > 0) status = "Late"; }
      else if (staffMember["Employee Id"].startsWith('K')) { if (hrs >= 7 && mins > 0) status = "Late"; }
      else { if (hrs >= 8 && mins > 0) status = "Late"; }
    }

    const record = {
      "Employee Id": staffMember["Employee Id"],
      "Employee Name": staffMember["Employee Name"],
      "Shop": SHOP_DATA[activeBranch!]?.name,
      "Date": dateString,
      "status": status,
      [type === 'In' ? "Time In" : "Time Out"]: timeString,
      "Is Paid": false,
      "lat": userCoords?.lat || 0,
      "lng": userCoords?.lng || 0
    };

    const queue = JSON.parse(localStorage.getItem('kenstar_offline_sync') || '[]');
    queue.push(record);
    localStorage.setItem('kenstar_offline_sync', JSON.stringify(queue));
    setPendingCount(queue.length);

    toast.success(`${type} Successful (Logged Offline)`);
    setStep(1);
    setFormData({ staffId: '', pin: '' });
    setLoading(false);
  };

  // PREVENT CRASH: Only render content if mounted
  if (!mounted) return <div className="min-h-screen bg-slate-950" />;

  if (!activeBranch) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-white text-2xl font-black uppercase mb-8 tracking-tighter italic">Select Branch</h1>
        <div className="grid gap-4 w-full max-w-xs">
          {Object.entries(SHOP_DATA).map(([id, data]) => (
            <button key={id} onClick={() => handleManualBranchSelect(id)} className={`${data.color} text-white py-6 rounded-3xl font-black uppercase text-sm shadow-xl active:scale-95`}>
              {data.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (geoError) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm border-b-8 border-red-600">
          <MapPinOff size={64} className="text-red-600 mx-auto mb-6" />
          <h1 className="text-3xl font-black uppercase text-slate-900 tracking-tighter leading-none">Access <br/>Denied</h1>
          <p className="text-sm font-bold text-slate-400 mt-4 uppercase tracking-widest">You must be at the shop to clock in.</p>
          <div className="bg-slate-50 rounded-2xl p-4 mt-6">
             <p className="text-xs font-black text-slate-400 uppercase">Current Distance</p>
             <p className="text-4xl font-black text-red-600">{distanceInfo !== null ? `${distanceInfo}m` : 'Calculating...'}</p>
          </div>
          <button onClick={() => window.location.reload()} className="mt-8 w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2">
            <RefreshCw size={14} /> Refresh GPS
          </button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {pendingCount > 0 && (
        <div className="mb-4 bg-blue-600 text-white px-6 py-2 rounded-full flex items-center gap-2 animate-pulse shadow-lg">
          <RefreshCw size={14} className="animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-widest">{pendingCount} Waiting to Sync</span>
        </div>
      )}

      <div className="w-full max-w-md bg-white rounded-[3.5rem] shadow-2xl overflow-hidden relative border-t-8 border-blue-600">
        <div className="bg-white p-10 text-center border-b border-slate-50">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Kenstar <span className="text-blue-600">Terminal</span></h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-3">{SHOP_DATA[activeBranch!]?.name}</p>
          <div className="mt-6 bg-slate-900 rounded-[2rem] py-4 px-8 inline-block shadow-lg">
            <span className="text-3xl font-mono font-black text-white">{currentTime.toLocaleTimeString('en-KE', { hour12: false })}</span>
          </div>
        </div>

        <div className="p-10">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="relative">
                <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-5 pl-16 pr-8 font-black uppercase placeholder:text-slate-300" placeholder="Staff ID" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})} />
              </div>
              <div className="relative">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input type="password" placeholder="PIN" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-5 pl-16 pr-8 font-black tracking-[0.5em] placeholder:tracking-normal placeholder:text-slate-300" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value})} />
              </div>
              <button onClick={handleVerify} disabled={loading} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95 disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Identify Staff'}
              </button>
              <button onClick={() => { localStorage.removeItem('kenstar_saved_branch'); setActiveBranch(null); setTargetCoords(null); }} className="w-full text-[9px] font-black text-slate-300 uppercase tracking-widest pt-4 block text-center underline">Switch Branch</button>
            </div>
          ) : (
            <div className="text-center space-y-8 py-4">
              <div className="bg-blue-50 py-4 px-2 rounded-2xl">
                 <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{staffMember["Employee Name"]}</h2>
                 <p className="text-[10px] font-black text-blue-600 uppercase mt-1">Authorized for {SHOP_DATA[activeBranch!]?.name}</p>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <button onClick={() => processClock('In')} disabled={loading} className="bg-green-500 text-white py-12 rounded-[2.5rem] font-black uppercase text-2xl shadow-xl active:scale-95 hover:bg-green-600 transition-colors">Clock In</button>
                <button onClick={() => processClock('Out')} disabled={loading} className="bg-red-600 text-white py-12 rounded-[2.5rem] font-black uppercase text-2xl shadow-xl active:scale-95 hover:bg-red-700 transition-colors">Clock Out</button>
              </div>
              <button onClick={() => setStep(1)} className="text-[10px] font-black text-slate-300 uppercase tracking-widest pt-6 block mx-auto hover:text-slate-900 transition-colors">← End Session</button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 opacity-30 text-center flex flex-col items-center gap-2">
        <p className="text-[10px] font-black text-white uppercase tracking-[0.3em]">Kenstar Uniforms • v{APP_VERSION}</p>
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-[8px] font-bold text-white uppercase tracking-widest">{isOnline ? 'System Online' : 'Offline Mode Active'}</span>
        </div>
      </div>
    </div>
  );
}

export default function TerminalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>}>
      <TerminalContent />
    </Suspense>
  );
}