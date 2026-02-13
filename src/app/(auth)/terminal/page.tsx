"use client";

export const dynamic = 'force-dynamic';

import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  User, Lock, Loader2, MapPinOff, RefreshCw
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
  const [mounted, setMounted] = useState(false);
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const [targetCoords, setTargetCoords] = useState<{lat: number, lng: number} | null>(null);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState<number | null>(null);
  const [formData, setFormData] = useState({ staffId: '', pin: '' });
  const [staffMember, setStaffMember] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  // 1. Critical: Mount check first
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', () => setIsOnline(true));
      window.addEventListener('offline', () => setIsOnline(false));
    }

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
    return () => clearInterval(timer);
  }, [searchParams]);

  const handleManualBranchSelect = (id: string) => {
    const shop = SHOP_DATA[id];
    setActiveBranch(id);
    setTargetCoords({ lat: shop.lat, lng: shop.lng });
    localStorage.setItem('kenstar_saved_branch', id);
  };

  // BACKGROUND SYNC
  useEffect(() => {
    if (!mounted || !isOnline) return;
    const sync = async () => {
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
    sync();
  }, [isOnline, mounted]);

  useEffect(() => {
    if (mounted && targetCoords) checkLocation();
  }, [mounted, targetCoords]);

  const checkLocation = () => {
    if (!targetCoords || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
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
    }, () => setGeoError(true), { enableHighAccuracy: true });
  };

  const handleVerify = async () => {
    if (!formData.staffId || !formData.pin) return toast.error("Enter credentials");
    setLoading(true);
    const staffList = JSON.parse(localStorage.getItem('kenstar_staff_list') || '[]');
    const user = staffList.find((s: any) => 
      s["Employee Id"]?.toUpperCase() === formData.staffId.toUpperCase() && 
      s["pin"]?.toString() === formData.pin.toString()
    );
    if (user) { setStaffMember(user); setStep(2); } 
    else { toast.error("Invalid ID or PIN"); }
    setLoading(false);
  };

  const processClock = async (type: 'In' | 'Out') => {
    setLoading(true);
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { hour12: false });
    const dateString = now.toISOString().split('T')[0];
    
    const record = {
      "Employee Id": staffMember["Employee Id"],
      "Employee Name": staffMember["Employee Name"],
      "Shop": SHOP_DATA[activeBranch!]?.name,
      "Date": dateString,
      "status": "Logged",
      [type === 'In' ? "Time In" : "Time Out"]: timeString,
      "lat": userCoords?.lat || 0,
      "lng": userCoords?.lng || 0
    };

    const queue = JSON.parse(localStorage.getItem('kenstar_offline_sync') || '[]');
    queue.push(record);
    localStorage.setItem('kenstar_offline_sync', JSON.stringify(queue));
    setPendingCount(queue.length);
    toast.success(`${type} Logged`);
    setStep(1);
    setFormData({ staffId: '', pin: '' });
    setLoading(false);
  };

  // CRITICAL: Return null if not mounted to prevent Hydration Error
  if (!mounted) return null;

  if (!activeBranch) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-white text-2xl font-black uppercase mb-8 italic">Select Branch</h1>
        <div className="grid gap-4 w-full max-w-xs">
          {Object.entries(SHOP_DATA).map(([id, data]) => (
            <button key={id} onClick={() => handleManualBranchSelect(id)} className={`${data.color} text-white py-6 rounded-3xl font-black uppercase shadow-xl`}>
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
          <h1 className="text-3xl font-black uppercase text-slate-900 tracking-tighter">Access Denied</h1>
          <p className="text-4xl font-black text-red-600 mt-4">{distanceInfo}m</p>
          <button onClick={() => window.location.reload()} className="mt-8 w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase">
             Refresh GPS
          </button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border-t-8 border-blue-600">
        <div className="p-10 text-center">
          <h1 className="text-3xl font-black uppercase italic text-slate-900">Kenstar <span className="text-blue-600">Terminal</span></h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">{SHOP_DATA[activeBranch]?.name}</p>
          <div className="mt-6 bg-slate-900 rounded-[2rem] py-4 px-8 inline-block">
            <span className="text-3xl font-mono font-black text-white">{currentTime.toLocaleTimeString('en-KE', { hour12: false })}</span>
          </div>
        </div>

        <div className="p-10">
          {step === 1 ? (
            <div className="space-y-6">
              <input type="text" className="w-full bg-slate-50 border-2 rounded-[2rem] py-5 px-8 font-black uppercase" placeholder="Staff ID" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})} />
              <input type="password" placeholder="PIN" className="w-full bg-slate-50 border-2 rounded-[2rem] py-5 px-8 font-black tracking-widest" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value})} />
              <button onClick={handleVerify} disabled={loading} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase">
                {loading ? 'Verifying...' : 'Identify Staff'}
              </button>
            </div>
          ) : (
            <div className="text-center space-y-8">
              <h2 className="text-3xl font-black text-slate-900 uppercase">{staffMember["Employee Name"]}</h2>
              <div className="grid gap-4">
                <button onClick={() => processClock('In')} className="bg-green-500 text-white py-10 rounded-[2.5rem] font-black uppercase text-xl">Clock In</button>
                <button onClick={() => processClock('Out')} className="bg-red-600 text-white py-10 rounded-[2.5rem] font-black uppercase text-xl">Clock Out</button>
              </div>
              <button onClick={() => setStep(1)} className="text-[10px] font-black text-slate-300 uppercase underline">End Session</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// THE FIX: High-level suspense boundary
export default function TerminalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>}>
      <TerminalContent />
    </Suspense>
  );
}