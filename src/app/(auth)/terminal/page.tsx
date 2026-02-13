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
  UserCheck,
  Settings2,
  AlertTriangle
} from 'lucide-react'; 
import { toast } from 'sonner';

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
  const [step, setStep] = useState(1); // 0: Select Branch, 1: Login, 2: Action, 3: Success
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState<number | null>(null);
  const [formData, setFormData] = useState({ staffId: '', pin: '' });
  const [staffMember, setStaffMember] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [punchResult, setPunchResult] = useState<{status: string, message: string, type: string} | null>(null);

  const syncOfflineRecords = useCallback(async () => {
    const queue = JSON.parse(localStorage.getItem('kenstar_offline_queue') || '[]');
    setQueueCount(queue.length);
    if (queue.length === 0 || !navigator.onLine) return;
    setIsSyncing(true);
    let successCount = 0;
    for (const record of queue) {
      const { error } = await supabase.from('attendance').upsert(record, { onConflict: 'Employee Id, Date' });
      if (!error) successCount++;
    }
    if (successCount > 0) {
      toast.success(`Cloud Sync: ${successCount} records uploaded`);
      localStorage.setItem('kenstar_offline_queue', '[]');
      setQueueCount(0);
    }
    setIsSyncing(false);
  }, []);

  const resetTerminal = useCallback(() => {
    setStep(1);
    setFormData({ staffId: '', pin: '' });
    setSelectedShift(null);
    setPunchResult(null);
  }, []);

  // Auto-close timer for Success Screen
  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => {
        resetTerminal();
      }, 5000); // 5 Seconds
      return () => clearTimeout(timer);
    }
  }, [step, resetTerminal]);

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);
    const goOnline = () => { setIsOnline(true); syncOfflineRecords(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const saved = localStorage.getItem('kenstar_saved_branch');
    if (saved && SHOP_DATA[saved]) {
      setActiveBranch(saved);
      setTargetCoords({ lat: SHOP_DATA[saved].lat, lng: SHOP_DATA[saved].lng });
    } else {
      setStep(0); // If no branch, force select
    }

    if (navigator.onLine) {
       supabase.from('staff').select('*').then(({ data }) => {
         if (data) localStorage.setItem('kenstar_staff_cache', JSON.stringify(data));
       });
       syncOfflineRecords();
    }
    return () => { clearInterval(timer); window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, [syncOfflineRecords]);

  const selectBranch = (id: string) => {
    localStorage.setItem('kenstar_saved_branch', id);
    setActiveBranch(id);
    setTargetCoords({ lat: SHOP_DATA[id].lat, lng: SHOP_DATA[id].lng });
    setStep(1);
  };

  const handleVerify = async () => {
    if (!formData.staffId || !formData.pin) return toast.error("Enter Credentials");
    setLoading(true);
    const inputId = formData.staffId.trim().toUpperCase();
    const inputPin = formData.pin.trim();

    const processLogin = (user: any) => {
      setStaffMember(user);
      setStep(2);
      checkLocation();
    };

    if (!isOnline) {
      const cached = JSON.parse(localStorage.getItem('kenstar_staff_cache') || '[]');
      const user = cached.find((s: any) => s["Employee Id"] === inputId && String(s.pin) === inputPin);
      if (user) processLogin(user);
      else toast.error("Offline login failed");
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.from('staff').select('*').eq('Employee Id', inputId).eq('pin', inputPin).single();
      if (error || !data) toast.error("Invalid ID or PIN");
      else processLogin(data);
    } catch (err) { toast.error("Network Error"); } finally { setLoading(false); }
  };

  const checkLocation = () => {
    if (!targetCoords || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat1 = pos.coords.latitude; const lon1 = pos.coords.longitude;
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
    if (type === 'In' && !selectedShift) return toast.error("Select Shift First");
    setLoading(true);
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { hour12: false });
    const [hours, mins] = timeString.split(':').map(Number);
    
    // Lateness detection
    let status = "On Time";
    if (type === 'In') {
      const hourLimit = selectedShift === "7AM Shift" ? 7 : 8;
      if (hours > hourLimit || (hours === hourLimit && mins > 5)) status = "Late Arrival";
    }

    const record = {
      "Employee Id": staffMember["Employee Id"],
      "Employee Name": staffMember["Employee Name"],
      "Shop": SHOP_DATA[activeBranch!]?.name,
      "Date": now.toISOString().split('T')[0],
      "status": isOnline ? "Online" : "Offline",
      "lat": userCoords?.lat || 0,
      "lng": userCoords?.lng || 0,
      "Worked At": type === 'In' ? selectedShift : "Clock Out",
      [type === 'In' ? "Time In" : "Time Out"]: timeString,
      "Notes": status
    };

    if (!isOnline) {
      const queue = JSON.parse(localStorage.getItem('kenstar_offline_queue') || '[]');
      queue.push(record);
      localStorage.setItem('kenstar_offline_queue', JSON.stringify(queue));
      setQueueCount(queue.length);
      setPunchResult({ status, message: "Recorded Offline", type });
      setStep(3);
    } else {
      const { error } = await supabase.from('attendance').upsert(record, { onConflict: 'Employee Id, Date' });
      if (!error) {
        setPunchResult({ status, message: "Success", type });
        setStep(3);
      } else toast.error("Sync Error");
    }
    setLoading(false);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* STATUS OVERLAYS */}
      {!isOnline && <div className="fixed top-0 inset-x-0 bg-orange-600 text-white text-[10px] font-black uppercase py-2 flex items-center justify-center gap-2 z-[60]"><WifiOff size={12} /> Local Mode: {queueCount} records pending</div>}
      
      {geoError && (
        <div className="fixed inset-0 bg-slate-950 z-[100] flex items-center justify-center p-6 text-center">
          <div className="bg-white p-10 rounded-[3rem] max-w-sm">
            <MapPinOff size={60} className="text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-slate-900 uppercase">Range Error</h1>
            <p className="text-5xl font-black text-red-600 my-6">{distanceInfo ?? '?'}m</p>
            <button onClick={() => window.location.reload()} className="bg-slate-900 text-white w-full py-4 rounded-2xl font-black uppercase">Retry GPS</button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-white rounded-[3.5rem] shadow-2xl p-10 min-h-[500px] flex flex-col justify-center">
        {/* STEP 0: BRANCH SELECTION */}
        {step === 0 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <h1 className="text-2xl font-black text-center uppercase tracking-tighter italic">Kenstar <span className="text-[#007a43]">Setup</span></h1>
            <div className="grid gap-3">
              {Object.entries(SHOP_DATA).map(([id, data]) => (
                <button key={id} onClick={() => selectBranch(id)} className="p-6 rounded-2xl border-2 border-slate-100 hover:border-[#007a43] font-black uppercase flex justify-between items-center group">
                  {data.name} <Settings2 className="text-[#007a43] opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1: LOGIN */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black uppercase italic text-slate-900 leading-none">Kenstar <span className="text-[#007a43]">Uniforms</span></h1>
              <p className="text-[10px] font-black uppercase text-slate-400 mt-4 tracking-[0.2em]">{SHOP_DATA[activeBranch!]?.name}</p>
              <div className="mt-4 bg-slate-100 text-slate-900 py-2 px-6 rounded-2xl inline-block font-mono font-black border border-slate-200">
                {currentTime.toLocaleTimeString('en-KE', { hour12: false })}
              </div>
            </div>
            <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 font-black uppercase outline-none focus:border-[#007a43]" placeholder="STAFF ID" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})} />
            <input type="password" placeholder="PIN" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 font-black text-center text-2xl" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value})} />
            <button onClick={handleVerify} disabled={loading} className="w-full bg-[#007a43] text-white py-6 rounded-2xl font-black uppercase flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <UserCheck size={20} />} Identify Staff
            </button>
            <button onClick={() => setStep(0)} className="w-full text-[10px] font-black text-slate-300 uppercase underline mt-4">Switch Branch / Shop Settings</button>
          </div>
        )}

        {/* STEP 2: CLOCKING (WELCOME SCREEN) */}
        {step === 2 && (
          <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-green-50 py-5 rounded-2xl border-2 border-green-100">
              <p className="text-[11px] font-black text-[#007a43] uppercase mb-1">Welcome,</p>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{staffMember["Employee Name"]}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setSelectedShift("7AM Shift")} className={`py-4 rounded-2xl font-black uppercase text-xs border-2 transition-all ${selectedShift === '7AM Shift' ? 'bg-[#007a43] text-white border-[#007a43]' : 'bg-white text-slate-400 border-slate-100'}`}>7:00 AM</button>
              <button onClick={() => setSelectedShift("8AM Shift")} className={`py-4 rounded-2xl font-black uppercase text-xs border-2 transition-all ${selectedShift === '8AM Shift' ? 'bg-[#007a43] text-white border-[#007a43]' : 'bg-white text-slate-400 border-slate-100'}`}>8:00 AM</button>
            </div>

            <div className="grid gap-4 pt-4">
              <button onClick={() => processClock('In')} className="bg-[#007a43] text-white py-10 rounded-[2.5rem] font-black text-3xl uppercase shadow-xl active:scale-95 transition-all">Clock In</button>
              <button onClick={() => processClock('Out')} className="bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl uppercase active:scale-95 transition-all">Clock Out</button>
            </div>
            <button onClick={() => setStep(1)} className="text-slate-300 font-black uppercase underline text-[10px]">Cancel / Log Out</button>
          </div>
        )}

        {/* STEP 3: SUCCESS (GOODBYE/GREETING SCREEN) */}
        {step === 3 && (
          <div className="text-center space-y-6 animate-in zoom-in duration-500">
            {punchResult?.status === "On Time" ? (
               <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                 <CheckCircle2 size={80} className="text-green-500 z-10" />
                 <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
               </div>
            ) : (
              <AlertTriangle size={80} className="text-orange-500 mx-auto" />
            )}
            
            <div className="space-y-1">
              <h2 className={`text-3xl font-black uppercase italic ${punchResult?.status === "On Time" ? 'text-green-600' : 'text-orange-600'}`}>
                {punchResult?.status}
              </h2>
              <p className="text-2xl font-black text-slate-800 uppercase tracking-tighter py-2">
                {punchResult?.type === 'In' ? "Have a good day!" : "Goodbye & Stay Safe!"}
              </p>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">
                System will reset in 5 seconds
              </p>
            </div>

            <button onClick={resetTerminal} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase">Finish Now</button>
          </div>
        )}
      </div>
      
      <div className="mt-8 flex flex-col items-center gap-2 opacity-40">
        <div className="flex items-center gap-2 text-white">
          <Database size={12} />
          <span className="text-[10px] font-black uppercase tracking-widest">Kenstar Ops v1.2.0</span>
        </div>
      </div>
    </div>
  );
}