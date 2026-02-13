"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, MapPinOff, CheckCircle2, Clock, WifiOff, 
  RefreshCw, Database, UserCheck, Settings2, AlertTriangle 
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
  const [punchResult, setPunchResult] = useState<{status: string, message: string} | null>(null);

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
      toast.success(`Synced ${successCount} records`);
      localStorage.setItem('kenstar_offline_queue', '[]');
      setQueueCount(0);
    }
    setIsSyncing(false);
  }, []);

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
      setStep(0); // Force branch selection if none saved
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

    if (!isOnline) {
      const cached = JSON.parse(localStorage.getItem('kenstar_staff_cache') || '[]');
      const user = cached.find((s: any) => s["Employee Id"] === inputId && String(s.pin) === inputPin);
      if (user) { setStaffMember(user); setStep(2); checkLocation(); } 
      else { toast.error("Credentials not in cache"); }
      setLoading(false); return;
    }

    const { data, error } = await supabase.from('staff').select('*').eq('Employee Id', inputId).eq('pin', inputPin).single();
    if (error || !data) { toast.error("Invalid Credentials"); } 
    else { setStaffMember(data); setStep(2); checkLocation(); }
    setLoading(false);
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
    if (type === 'In' && !selectedShift) return toast.error("Select Shift");
    setLoading(true);
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { hour12: false });
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Lateness Logic
    let punctuality = "On Time";
    if (type === 'In') {
      const limit = selectedShift === "7AM Shift" ? 7 : 8;
      if (hours > limit || (hours === limit && minutes > 5)) {
        punctuality = "Late Arrival";
      }
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
      "Notes": type === 'In' ? punctuality : ""
    };

    if (!isOnline) {
      const queue = JSON.parse(localStorage.getItem('kenstar_offline_queue') || '[]');
      queue.push(record);
      localStorage.setItem('kenstar_offline_queue', JSON.stringify(queue));
      setPunchResult({ status: punctuality, message: `Clocked ${type} (Stored Offline)` });
      setStep(3);
    } else {
      const { error } = await supabase.from('attendance').upsert(record, { onConflict: 'Employee Id, Date' });
      if (!error) {
        setPunchResult({ status: punctuality, message: `Clocked ${type} Successfully` });
        setStep(3);
      } else { toast.error("Sync Error"); }
    }
    setLoading(false);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans">
      {/* STATUS OVERLAYS */}
      {!isOnline && <div className="fixed top-0 inset-x-0 bg-orange-600 text-white text-[10px] font-black uppercase py-2 flex items-center justify-center gap-2 z-[60]"><WifiOff size={12}/> Offline Mode</div>}

      <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl p-8">
        {/* STEP 0: BRANCH SELECTION */}
        {step === 0 && (
          <div className="space-y-6">
            <h1 className="text-2xl font-black text-center uppercase tracking-tighter">Setup Terminal</h1>
            <p className="text-center text-slate-400 text-sm">Select the current shop location:</p>
            <div className="grid gap-4">
              {Object.entries(SHOP_DATA).map(([id, data]) => (
                <button key={id} onClick={() => selectBranch(id)} className="w-full p-6 rounded-2xl border-2 border-slate-100 hover:border-[#007a43] text-left font-black uppercase flex justify-between items-center group">
                  {data.name} <Settings2 className="opacity-0 group-hover:opacity-100 text-[#007a43]" />
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
            </div>
            <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 font-black uppercase" placeholder="STAFF ID" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})} />
            <input type="password" placeholder="PIN" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 font-black text-center text-2xl tracking-widest" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value})} />
            <button onClick={handleVerify} disabled={loading} className="w-full bg-[#007a43] text-white py-6 rounded-2xl font-black uppercase flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <UserCheck size={20} />} Identify Staff
            </button>
            <button onClick={() => setStep(0)} className="w-full text-[10px] font-black text-slate-300 uppercase underline mt-4 flex items-center justify-center gap-1">
              <Settings2 size={12}/> Terminal Settings (Switch Branch)
            </button>
          </div>
        )}

        {/* STEP 2: CLOCKING */}
        {step === 2 && (
          <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
             <div className="bg-green-50 py-5 rounded-2xl border-2 border-green-100">
              <p className="text-[10px] font-black text-[#007a43] uppercase mb-1">Identified</p>
              <h2 className="text-xl font-black text-slate-900 uppercase">{staffMember["Employee Name"]}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setSelectedShift("7AM Shift")} className={`py-4 rounded-2xl font-black uppercase text-xs border-2 ${selectedShift === '7AM Shift' ? 'bg-[#007a43] text-white border-[#007a43]' : 'bg-white text-slate-400'}`}>7:00 AM</button>
              <button onClick={() => setSelectedShift("8AM Shift")} className={`py-4 rounded-2xl font-black uppercase text-xs border-2 ${selectedShift === '8AM Shift' ? 'bg-[#007a43] text-white border-[#007a43]' : 'bg-white text-slate-400'}`}>8:00 AM</button>
            </div>
            <div className="grid gap-4">
              <button onClick={() => processClock('In')} className="bg-[#007a43] text-white py-10 rounded-[2.5rem] font-black text-2xl uppercase">Clock In</button>
              <button onClick={() => processClock('Out')} className="bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl uppercase">Clock Out</button>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS / FEEDBACK */}
        {step === 3 && (
          <div className="text-center space-y-6 py-4 animate-in zoom-in duration-500">
            {punchResult?.status === "On Time" ? (
              <CheckCircle2 size={80} className="text-green-500 mx-auto" />
            ) : (
              <AlertTriangle size={80} className="text-orange-500 mx-auto" />
            )}
            <div>
              <h2 className={`text-3xl font-black uppercase ${punchResult?.status === "On Time" ? 'text-green-600' : 'text-orange-600'}`}>
                {punchResult?.status}
              </h2>
              <p className="text-slate-400 font-bold mt-2">{punchResult?.message}</p>
            </div>
            <button onClick={() => { setStep(1); setFormData({staffId:'', pin:''}); }} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase mt-4">Close Terminal</button>
          </div>
        )}
      </div>

      <div className="mt-8 text-white/40 flex flex-col items-center gap-1">
        <div className="font-mono text-2xl font-black">{currentTime.toLocaleTimeString('en-KE', { hour12: false })}</div>
        <p className="text-[9px] font-black uppercase tracking-widest">Kenstar Uniforms ERP v1.2.0</p>
      </div>
    </div>
  );
}