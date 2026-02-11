"use client";

import React, { useState, Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { saveAttendanceOffline, getOfflineAttendance, removeSyncedAttendance } from '@/lib/offline-db';
import { 
  ShieldCheck, User, Lock, Loader2, Clock, Wifi, WifiOff, 
  MapPinOff, MapPin, RefreshCw
} from 'lucide-react'; 
import { toast } from 'sonner';

function TerminalContent() {
  const searchParams = useSearchParams();
  const branch = searchParams.get('branch') || 'General';
  const targetLat = parseFloat(searchParams.get('lat') || '0');
  const targetLng = parseFloat(searchParams.get('lng') || '0');

  // --- CRITICAL STATES ---
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [geoError, setGeoError] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState<number | null>(null);
  const [formData, setFormData] = useState({ staffId: '', pin: '' });
  const [staffMember, setStaffMember] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 1. HYDRATION & CLOCK
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. NETWORK & SYNC
  useEffect(() => {
    const handleStatus = () => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) triggerSync();
    };
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    handleStatus(); 
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  // 3. STRICT GEOLOCATION
  useEffect(() => {
    if (!mounted) return;
    checkLocation();
  }, [mounted, targetLat, targetLng]);

  const checkLocation = () => {
    if (targetLat === 0) return;
    
    // Using high accuracy and clear cache for Umoja 1 Market environment
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat1 = pos.coords.latitude;
      const lon1 = pos.coords.longitude;
      const R = 6371e3; 
      const dLat = (targetLat - lat1) * Math.PI / 180;
      const dLon = (targetLng - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI/180) * Math.cos(targetLat * Math.PI/180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      setDistanceInfo(Math.round(distance));

      // BUFFER INCREASED: From 250m to 500m for Market buildings
      if (distance > 500) setGeoError(true);
      else setGeoError(false);
    }, () => setGeoError(true), { 
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0 // Do not use a cached location
    });
  };

  const triggerSync = async () => {
    const offlineItems = await getOfflineAttendance();
    if (offlineItems.length === 0) return;
    for (const item of offlineItems) {
      const { error } = await supabase.from('attendance').upsert({
        "Employee Id": item["Employee Id"],
        "Employee Name": item["Employee Name"],
        "Shop": item.Shop,
        "Date": item.Date,
        "status": item.status,
        "Is Paid": false,
        [item.type === 'In' ? "Time In" : "Time Out"]: item.time
      }, { onConflict: 'Employee Id, Date' });
      if (!error) await removeSyncedAttendance(item.id);
    }
    toast.success(`Synced ${offlineItems.length} records`);
  };

  const handleVerify = async () => {
    if (!formData.staffId || !formData.pin) return toast.error("Enter ID and PIN");
    setLoading(true);
    const { data, error } = await supabase.from('staff')
      .select('*')
      .eq('Employee Id', formData.staffId.toUpperCase())
      .eq('pin', formData.pin)
      .single();

    if (error || !data) {
      toast.error("Access Denied: Invalid Credentials");
    } else {
      setStaffMember(data);
      setStep(2);
    }
    setLoading(false);
  };

  const processClock = async (type: 'In' | 'Out') => {
    setLoading(true);
    const now = new Date();
    const hours = now.getHours();
    const mins = now.getMinutes();
    const timeString = now.toTimeString().split(' ')[0];
    const today = now.toISOString().split('T')[0];

    let currentStatus = "On Time";

    if (type === 'In') {
      if (hours === 7 && mins > 0) currentStatus = "Late";
      else if (hours > 7 && hours < 8) currentStatus = "Late";
      else if (hours === 8 && mins > 0) currentStatus = "Late";
      else if (hours > 8) currentStatus = "Late";
    }

    if (isOnline) {
      const { data: morningRecord } = await supabase
        .from('attendance')
        .select('*')
        .eq('Employee Id', staffMember["Employee Id"])
        .eq('Date', today)
        .single();

      let finalStatus = currentStatus;

      if (type === 'Out' && morningRecord?.["Time In"]) {
        const timeIn = new Date(`${today}T${morningRecord["Time In"]}`);
        const hoursWorked = (now.getTime() - timeIn.getTime()) / (1000 * 60 * 60);
        if (hoursWorked > 11) finalStatus = "Overtime";
        else finalStatus = morningRecord.status;
      }

      await supabase.from('attendance').upsert({
        "Employee Id": staffMember["Employee Id"],
        "Employee Name": staffMember["Employee Name"],
        "Shop": branch,
        "Date": today,
        "status": finalStatus,
        "Is Paid": false,
        [type === 'In' ? "Time In" : "Time Out"]: timeString
      }, { onConflict: 'Employee Id, Date' });

      toast.success(`${type} Success: ${finalStatus}`);
    } else {
      await saveAttendanceOffline({
        "Employee Id": staffMember["Employee Id"],
        "Employee Name": staffMember["Employee Name"],
        "Shop": branch,
        "Date": today,
        "status": currentStatus,
        "type": type,
        "time": timeString
      });
      toast.warning("Offline: Saved to Local Storage");
    }

    setStep(1);
    setFormData({ staffId: '', pin: '' });
    setLoading(false);
  };

  if (!mounted) return <div className="min-h-screen bg-slate-950" />;

  if (geoError) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm border-b-8 border-red-600">
          <MapPinOff size={64} className="text-red-600 mx-auto mb-6 animate-pulse" />
          <h1 className="text-3xl font-black uppercase text-slate-900 tracking-tighter">Out of Range</h1>
          <p className="text-slate-500 font-bold mt-4 text-[10px] uppercase tracking-[0.2em] leading-relaxed">
            Location: <span className="text-red-600">{branch}</span><br/>
            Current: {distanceInfo ?? '...'}m away
          </p>
          <div className="flex flex-col gap-3 mt-8">
            <button onClick={() => window.location.reload()} className="bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2">
                <RefreshCw size={14} /> Retry GPS
            </button>
            <button onClick={() => setGeoError(false)} className="text-slate-300 font-black uppercase text-[8px] tracking-[0.2em] hover:text-red-600 transition-colors">
                Manager Override
            </button>
          </div>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[3.5rem] shadow-[0_0_60px_rgba(0,0,0,0.5)] overflow-hidden relative border-t-8 border-blue-600">
        <div className="absolute top-8 right-8 z-20">
          <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${isOnline ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-600 text-white animate-pulse'}`}>
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />} {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        <div className="bg-white p-10 text-center border-b border-slate-100">
          <div className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-200">
             <ShieldCheck className="text-white" size={24} />
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
            Kenstar <span className="text-blue-600">Terminal</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-3">{branch} Shop</p>
          
          <div className="mt-8 bg-slate-900 rounded-[2rem] py-6 px-10 inline-block shadow-xl shadow-slate-200">
            <span className="text-4xl font-mono font-black tracking-[0.15em] text-white">
                {currentTime.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
            </span>
          </div>
        </div>

        <div className="p-10">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-4">Staff ID</label>
                <div className="relative">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-5 pl-14 font-black uppercase outline-none focus:border-blue-600 focus:bg-white transition-all text-slate-900" placeholder="K-000" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-4">Security PIN</label>
                <div className="relative">
                  <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input type="password" title="PIN" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-5 pl-14 font-black tracking-[1em] outline-none focus:border-blue-600 focus:bg-white transition-all text-slate-900" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value})} />
                </div>
              </div>

              <button onClick={handleVerify} disabled={loading} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-xs shadow-2xl active:scale-95 hover:bg-blue-600 transition-all flex items-center justify-center gap-3 mt-4">
                {loading ? <Loader2 className="animate-spin" /> : 'Open Terminal'}
              </button>
            </div>
          ) : (
            <div className="text-center space-y-8 py-4">
              <div className="animate-in zoom-in duration-300">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-2">Authenticated</p>
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none px-4">{staffMember["Employee Name"]}</h2>
                <div className="h-1.5 w-12 bg-blue-600 mx-auto mt-6 rounded-full" />
              </div>

              <div className="grid grid-cols-1 gap-4 pt-4">
                <button onClick={() => processClock('In')} className="bg-green-500 text-white py-12 rounded-[2.5rem] font-black uppercase text-2xl shadow-xl shadow-green-100 active:scale-95 hover:bg-green-600 transition-all">
                    Clock In
                </button>
                <button onClick={() => processClock('Out')} className="bg-red-600 text-white py-12 rounded-[2.5rem] font-black uppercase text-2xl shadow-xl shadow-red-100 active:scale-95 hover:bg-red-700 transition-all">
                    Clock Out
                </button>
              </div>

              <button onClick={() => setStep(1)} className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-900 transition-colors pt-6 block mx-auto">← Exit Session</button>
            </div>
          )}
        </div>
      </div>
      
      <p className="mt-8 text-[9px] font-bold text-slate-600 uppercase tracking-[0.4em] opacity-40">KenstarOps ERP v3.0</p>
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