"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, 
  MapPinOff, 
  CheckCircle2, 
  Clock, 
  WifiOff, 
  RefreshCw, 
  Database,
  UserCheck 
} from 'lucide-react'; 
import { toast } from 'sonner';

// Verified Kenstar Uniforms Branch Data
const SHOP_DATA: Record<string, { lat: number; lng: number; name: string; color: string }> = {
  '315': { lat: -1.283519, lng: 36.887452, name: 'Kenstar 315', color: 'bg-green-700' },
  '172': { lat: -1.283215, lng: 36.887374, name: 'Kenstar 172', color: 'bg-slate-900' },
  'Stage': { lat: -1.283971, lng: 36.887177, name: 'Stage Outlet', color: 'bg-[#007a43]' }
};

export default function TerminalPage() {
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
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
  const [selectedShift, setSelectedShift] = useState<string | null>(null);

  // --- AUTOMATIC SYNC ENGINE ---
  const syncOfflineRecords = useCallback(async () => {
    const queue = JSON.parse(localStorage.getItem('kenstar_offline_queue') || '[]');
    setQueueCount(queue.length);
    
    if (queue.length === 0 || !navigator.onLine) return;

    setIsSyncing(true);
    let successCount = 0;

    for (const record of queue) {
      // Upsert ensures we don't create duplicates for the same ID/Date
      const { error } = await supabase.from('attendance').upsert(record, { onConflict: 'Employee Id, Date' });
      if (!error) successCount++;
    }

    if (successCount > 0) {
      toast.success(`Kenstar Cloud Sync: ${successCount} records uploaded`);
      localStorage.setItem('kenstar_offline_queue', '[]');
      setQueueCount(0);
    }
    setIsSyncing(false);
  }, []);

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    const goOnline = () => { 
      setIsOnline(true); 
      syncOfflineRecords(); 
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const saved = localStorage.getItem('kenstar_saved_branch');
    if (saved && SHOP_DATA[saved]) {
      setActiveBranch(saved);
      setTargetCoords({ lat: SHOP_DATA[saved].lat, lng: SHOP_DATA[saved].lng });
    }

    // Pre-cache staff list for offline logins
    if (navigator.onLine) {
       supabase.from('staff').select('*').then(({ data }) => {
         if (data) localStorage.setItem('kenstar_staff_cache', JSON.stringify(data));
       });
       syncOfflineRecords();
    }

    // Initial queue check
    const q = JSON.parse(localStorage.getItem('kenstar_offline_queue') || '[]');
    setQueueCount(q.length);

    return () => {
      clearInterval(timer);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [syncOfflineRecords]);

  const handleVerify = async () => {
    if (!formData.staffId || !formData.pin) return toast.error("Enter Credentials");
    setLoading(true);
    
    const inputId = formData.staffId.trim().toUpperCase();
    const inputPin = formData.pin.trim();

    if (!isOnline) {
      const cached = JSON.parse(localStorage.getItem('kenstar_staff_cache') || '[]');
      const user = cached.find((s: any) => s["Employee Id"] === inputId && String(s.pin) === inputPin);
      if (user) {
        setStaffMember(user);
        setStep(2);
        toast.info("Offline Verification Successful");
        checkLocation();
      } else {
        toast.error("Credentials not found in offline cache");
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.from('staff').select('*').eq('Employee Id', inputId).eq('pin', inputPin).single();
      if (error || !data) {
        toast.error("Invalid ID or PIN");
      } else {
        setStaffMember(data);
        setStep(2);
        checkLocation();
      }
    } catch (err) { toast.error("Network connection failed"); } finally { setLoading(false); }
  };

  const checkLocation = () => {
    if (!targetCoords || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat1 = pos.coords.latitude;
      const lon1 = pos.coords.longitude;
      setUserCoords({ lat: lat1, lng: lon1 });
      const R = 6371e3; 
      const dLat = (targetCoords.lat - lat1) * Math.PI / 180;
      const dLon = (targetCoords.lng - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(targetCoords.lat * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      setDistanceInfo(Math.round(distance));
      setGeoError(distance > 150); 
    }, () => setGeoError(true), { enableHighAccuracy: true });
  };

  const processClock = async (type: 'In' | 'Out') => {
    if (type === 'In' && !selectedShift) return toast.error("Please select a shift first");
    
    setLoading(true);
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { hour12: false });
    const dateString = now.toISOString().split('T')[0];
    
    const record = {
      "Employee Id": staffMember["Employee Id"],
      "Employee Name": staffMember["Employee Name"],
      "Shop": SHOP_DATA[activeBranch!]?.name,
      "Date": dateString,
      "status": isOnline ? "Online" : "Offline Log",
      "lat": userCoords?.lat || 0,
      "lng": userCoords?.lng || 0,
      "Worked At": type === 'In' ? selectedShift : "Clock Out",
      [type === 'In' ? "Time In" : "Time Out"]: timeString
    };

    if (!isOnline) {
      const queue = JSON.parse(localStorage.getItem('kenstar_offline_queue') || '[]');
      queue.push(record);
      localStorage.setItem('kenstar_offline_queue', JSON.stringify(queue));
      setQueueCount(queue.length);
      toast.warning("Stored locally. Will sync when WiFi returns.");
      resetTerminal();
    } else {
      const { error } = await supabase.from('attendance').upsert(record, { onConflict: 'Employee Id, Date' });
      if (!error) {
        toast.success(`Success: Clocked ${type}`);
        resetTerminal();
      } else {
        toast.error("Database sync failed");
      }
    }
    setLoading(false);
  };

  const resetTerminal = () => {
    setStep(1);
    setFormData({ staffId: '', pin: '' });
    setSelectedShift(null);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* STATUS OVERLAYS */}
      {!isOnline && (
        <div className="fixed top-0 inset-x-0 bg-orange-600 text-white text-[10px] font-black uppercase py-2 flex items-center justify-center gap-2 z-[60]">
          <WifiOff size={12} /> Local Storage Mode: {queueCount} records pending
        </div>
      )}
      {isSyncing && (
        <div className="fixed top-0 inset-x-0 bg-[#007a43] text-white text-[10px] font-black uppercase py-2 flex items-center justify-center gap-2 z-[70]">
          <RefreshCw size={12} className="animate-spin" /> Auto-Syncing with Kenstar Cloud...
        </div>
      )}

      {geoError && (
        <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center p-6 text-center">
            <div className="bg-white p-10 rounded-[3rem] max-w-sm">
              <MapPinOff size={60} className="text-red-600 mx-auto mb-4" />
              <h1 className="text-2xl font-black text-slate-900 uppercase">Range Error</h1>
              <p className="text-sm font-bold text-slate-400 mb-4 tracking-tight">You must be at the shop to clock in.</p>
              <p className="text-5xl font-black text-red-600 my-6">{distanceInfo ?? '?'}m</p>
              <button onClick={() => window.location.reload()} className="bg-slate-900 text-white w-full py-4 rounded-2xl font-black uppercase tracking-tighter">Retry GPS</button>
            </div>
        </div>
      )}

      <div className="w-full max-w-md bg-white rounded-[3.5rem] shadow-2xl p-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black uppercase italic text-slate-900 leading-none tracking-tighter">
            Kenstar <span className="text-[#007a43]">Uniforms</span>
          </h1>
          <p className="text-[10px] font-black uppercase text-slate-400 mt-4 tracking-[0.25em]">{SHOP_DATA[activeBranch!]?.name}</p>
          <div className="mt-6 bg-slate-100 text-slate-900 py-4 px-8 rounded-3xl inline-block font-mono text-3xl font-black border-2 border-slate-200">
            {currentTime.toLocaleTimeString('en-KE', { hour12: false })}
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">ID Reference</label>
              <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 font-black uppercase outline-none focus:border-[#007a43] transition-all" placeholder="ID NUMBER" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-4 tracking-widest">Security PIN</label>
              <input type="password" placeholder="••••" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 font-black outline-none focus:border-[#007a43] transition-all text-center text-2xl tracking-widest" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value})} />
            </div>
            <button onClick={handleVerify} disabled={loading} className="w-full bg-[#007a43] text-white py-6 rounded-2xl font-black uppercase shadow-lg shadow-green-900/20 active:scale-[0.98] transition-all mt-4 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <UserCheck size={20} />}
              {loading ? 'Verifying...' : 'Identify Staff'}
            </button>
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full text-[10px] font-black text-slate-300 uppercase underline mt-4">Terminal Settings</button>
          </div>
        ) : (
          <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-green-50 py-5 rounded-2xl border-2 border-green-100">
              <p className="text-[10px] font-black text-[#007a43] uppercase mb-1">Staff Member Identified</p>
              <h2 className="text-xl font-black text-slate-900 uppercase">{staffMember["Employee Name"]}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setSelectedShift("7AM Shift")} className={`py-4 rounded-2xl font-black uppercase text-xs transition-all border-2 ${selectedShift === '7AM Shift' ? 'bg-[#007a43] text-white border-[#007a43] shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}>7:00 AM</button>
              <button onClick={() => setSelectedShift("8AM Shift")} className={`py-4 rounded-2xl font-black uppercase text-xs transition-all border-2 ${selectedShift === '8AM Shift' ? 'bg-[#007a43] text-white border-[#007a43] shadow-md' : 'bg-white text-slate-400 border-slate-100'}`}>8:00 AM</button>
            </div>

            <div className="grid gap-4 pt-4">
              <button onClick={() => processClock('In')} className="bg-[#007a43] text-white py-10 rounded-[2.5rem] font-black text-2xl uppercase shadow-xl active:scale-95 transition-all flex flex-col items-center justify-center">
                Clock In
                <span className="text-[10px] opacity-60 font-medium tracking-widest">Start Daily Shift</span>
              </button>
              <button onClick={() => processClock('Out')} className="bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl uppercase shadow-lg active:scale-95 transition-all">
                Clock Out
              </button>
            </div>
            <button onClick={() => setStep(1)} className="text-slate-300 font-black uppercase underline text-[10px] tracking-widest">Cancel / Log Out</button>
          </div>
        )}
      </div>
      
      {/* Footer Branding */}
      <div className="mt-8 flex flex-col items-center gap-2 opacity-40">
        <div className="flex items-center gap-2">
          <Database size={12} className="text-white" />
          <span className="text-white text-[10px] font-black uppercase tracking-widest">Kenstar Ops v1.1.2</span>
        </div>
        {queueCount > 0 && (
          <p className="text-orange-500 text-[9px] font-black uppercase tracking-[0.2em]">
             {queueCount} Local Records Waiting
          </p>
        )}
      </div>
    </div>
  );
}