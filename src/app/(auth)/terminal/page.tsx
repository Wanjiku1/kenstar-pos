"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, CheckCircle2, UserCheck, Settings2, AlertTriangle, MapPin, WifiOff, Globe 
} from 'lucide-react'; 
import { toast } from 'sonner';

const SHOP_DATA: Record<string, { lat: number; lng: number; name: string }> = {
  '315': { lat: -1.283519, lng: 36.887452, name: 'Kenstar 315' },
  '172': { lat: -1.283215, lng: 36.887374, name: 'Kenstar 172' },
  'Stage': { lat: -1.283971, lng: 36.887177, name: 'Stage Outlet' }
};

function TerminalContent() {
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
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
  const [punchResult, setPunchResult] = useState<{status: string, message: string, type: string} | null>(null);
  
  const [existingRecord, setExistingRecord] = useState<any>(null);

  const isSunday = currentTime.getDay() === 0;

  // --- NEW: PRESENCE TRACKING FOR ADMIN DASHBOARD ---
  useEffect(() => {
    if (staffMember && userCoords && isOnline) {
      const channel = supabase.channel('active-staff-map', {
        config: { presence: { key: staffMember["Employee Id"] } }
      });

      channel
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({
              name: staffMember["Employee Name"],
              lat: userCoords.lat,
              lng: userCoords.lng,
              online_at: new Date().toISOString(),
            });
          }
        });

      return () => { channel.unsubscribe(); };
    }
  }, [staffMember, userCoords, isOnline]);

  useEffect(() => {
    const branch = searchParams.get('branch');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (branch && lat && lng) {
      setActiveBranch(branch);
      setTargetCoords({ lat: parseFloat(lat), lng: parseFloat(lng) });
      setStep(1); 
      localStorage.setItem('kenstar_saved_branch', branch);
    } else {
      const saved = localStorage.getItem('kenstar_saved_branch');
      if (saved) {
        setActiveBranch(saved);
        setTargetCoords({ lat: SHOP_DATA[saved].lat, lng: SHOP_DATA[saved].lng });
      } else {
        setStep(0);
      }
    }
  }, [searchParams]);

  const syncOfflineRecords = useCallback(async () => {
    const queue = JSON.parse(localStorage.getItem('kenstar_offline_queue') || '[]');
    if (queue.length === 0) return;
    let successCount = 0;
    for (const record of queue) {
      const { error } = await supabase.from('attendance').upsert(record, { onConflict: 'Employee Id, Date' });
      if (!error) successCount++;
    }
    if (successCount > 0) {
      toast.success(`Automatically synced ${successCount} offline records!`);
      localStorage.setItem('kenstar_offline_queue', '[]');
    }
  }, []);

  const updateStaffCache = useCallback(async () => {
    if (!navigator.onLine) return;
    const { data } = await supabase.from('staff').select('*');
    if (data) localStorage.setItem('kenstar_staff_cache', JSON.stringify(data));
  }, []);

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);
    const handleOnline = () => { setIsOnline(true); syncOfflineRecords(); updateStaffCache(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    if (navigator.onLine) {
        updateStaffCache();
        syncOfflineRecords();
    }
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(timer);
    };
  }, [syncOfflineRecords, updateStaffCache]);

  const resetTerminal = useCallback(() => {
    setStep(1);
    setFormData({ staffId: '', pin: '' });
    setSelectedShift(null);
    setPunchResult(null);
    setExistingRecord(null);
    setStaffMember(null); // Clear staff member on reset
  }, []);

  useEffect(() => {
    if (step === 3) {
      const timer = setTimeout(() => resetTerminal(), 5000);
      return () => clearTimeout(timer);
    }
  }, [step, resetTerminal]);

  const checkLocation = useCallback(() => {
    if (!targetCoords || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat1 = pos.coords.latitude;
      const lon1 = pos.coords.longitude;
      setUserCoords({ lat: lat1, lng: lon1 });
      const R = 6371e3; 
      const dLat = (targetCoords.lat - lat1) * Math.PI / 180;
      const dLon = (targetCoords.lng - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI/180) * Math.cos(targetCoords.lat * Math.PI/180) * Math.sin(dLon/2) * Math.sin(dLon/2);
      const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      setDistanceInfo(Math.round(d));
      setGeoError(d > 50); 
    }, () => setGeoError(true), { enableHighAccuracy: true });
  }, [targetCoords]);

  const selectBranch = (id: string) => {
    localStorage.setItem('kenstar_saved_branch', id);
    setActiveBranch(id);
    setTargetCoords({ lat: SHOP_DATA[id].lat, lng: SHOP_DATA[id].lng });
    setStep(1);
  };

  const handleVerify = async () => {
    if (!formData.staffId || !formData.pin) return toast.error("Enter Credentials");
    setLoading(true);
    
    setExistingRecord(null);

    const idInput = formData.staffId.trim().toUpperCase();
    const pinInput = formData.pin.trim();
    const today = new Date().toISOString().split('T')[0];

    let matchedStaff = null;

    if (isOnline) {
      try {
        const { data, error } = await supabase.from('staff').select('*').eq('Employee Id', idInput).eq('pin', pinInput).single();
        if (data && !error) {
          matchedStaff = data;
          const { data: attRecord } = await supabase.from('attendance').select('*').eq('Employee Id', idInput).eq('Date', today).single();
          if (attRecord) setExistingRecord(attRecord);
        }
      } catch (e) { }
    }

    if (!matchedStaff) {
      const cache = JSON.parse(localStorage.getItem('kenstar_staff_cache') || '[]');
      matchedStaff = cache.find((s: any) => s["Employee Id"] === idInput && s["pin"] === pinInput);
      
      const queue = JSON.parse(localStorage.getItem('kenstar_offline_queue') || '[]');
      const offlineRecord = queue.find((r: any) => r["Employee Id"] === idInput && r["Date"] === today);
      if (offlineRecord) setExistingRecord(offlineRecord);
    }

    if (matchedStaff) {
      setStaffMember(matchedStaff);
      setStep(2);
      checkLocation();
      if (!isOnline) toast.info("Login successful (Offline Mode)");
    } else {
      toast.error("Invalid Credentials");
    }
    setLoading(false);
  };

  const processClock = async (type: 'In' | 'Out') => {
    if (type === 'In' && !selectedShift) return toast.error("Select Shift First");
    if (distanceInfo && distanceInfo > 50) return toast.error(`Too far (${distanceInfo}m).`);

    if (type === 'In' && existingRecord?.["Time In"]) {
        return toast.error("You are already clocked in for today.");
    }

    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { hour12: false });
    const [hours, mins] = timeString.split(':').map(Number);
    
    let status = "On Time";
    let hoursWorked = 0;

    if (type === 'In') {
      let limit = selectedShift === "7AM Shift" ? 7 : 8;
      if (selectedShift === "Sunday Shift") limit = 11;
      if (hours > limit || (hours === limit && mins > 0)) status = "Late Arrival";
    } else {
      const timeIn = existingRecord?.["Time In"] || timeString;
      const start = new Date(`${today}T${timeIn}`);
      const diffMs = now.getTime() - start.getTime();
      hoursWorked = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      status = "Shift Ended";
    }

    const record = {
      ...(existingRecord || {}),
      "Employee Id": staffMember["Employee Id"],
      "Employee Name": staffMember["Employee Name"],
      "Shop": SHOP_DATA[activeBranch!]?.name,
      "Date": today,
      "status": isOnline ? "Online" : "Offline",
      "lat": userCoords?.lat || 0,
      "lng": userCoords?.lng || 0,
      "Worked At": type === 'In' ? selectedShift : (existingRecord?.["Worked At"] || "Clock Out"),
      [type === 'In' ? "Time In" : "Time Out"]: timeString,
      "Total Hours": type === 'Out' ? hoursWorked : 0,
      "Notes": status
    };

    if (isOnline) {
      const { error } = await supabase.from('attendance').upsert(record, { onConflict: 'Employee Id, Date' });
      if (!error) {
        setPunchResult({ status, message: "Success", type });
        setStep(3);
      } else {
        toast.error("Cloud Sync Failed");
      }
    } else {
      const queue = JSON.parse(localStorage.getItem('kenstar_offline_queue') || '[]');
      const filteredQueue = queue.filter((r: any) => !(r["Employee Id"] === staffMember["Employee Id"] && r["Date"] === today));
      localStorage.setItem('kenstar_offline_queue', JSON.stringify([...filteredQueue, record]));
      setPunchResult({ status, message: "Offline Success", type });
      setStep(3);
    }
    setLoading(false);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className={`fixed top-6 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isOnline ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
        {isOnline ? <Globe size={12}/> : <WifiOff size={12}/>}
        {isOnline ? 'Network Online' : 'Offline Mode'}
      </div>

      <div className="w-full max-w-md bg-white rounded-[3.5rem] shadow-2xl p-10 min-h-[550px] flex flex-col justify-center relative overflow-hidden">
        
        {step === 0 && (
          <div className="space-y-6">
            <h1 className="text-2xl font-black text-center uppercase italic text-slate-900">Kenstar <span className="text-[#007a43]">Setup</span></h1>
            <div className="grid gap-3">
              {Object.entries(SHOP_DATA).map(([id, data]) => (
                <button key={id} onClick={() => selectBranch(id)} className="p-6 rounded-2xl border-2 border-slate-100 hover:border-[#007a43] font-black uppercase flex justify-between">
                  {data.name} <Settings2 className="text-[#007a43]" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-black uppercase italic text-slate-900">Kenstar <span className="text-[#007a43]">Uniforms</span></h1>
              <p className="text-[10px] font-black uppercase text-slate-400 mt-2 tracking-widest">{SHOP_DATA[activeBranch!]?.name}</p>
            </div>
            <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 font-black uppercase" placeholder="STAFF ID" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})} />
            <input type="password" placeholder="PIN" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-8 font-black text-center text-2xl" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value})} />
            <button onClick={handleVerify} disabled={loading} className="w-full bg-[#007a43] text-white py-6 rounded-2xl font-black uppercase flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin" /> : <UserCheck size={20} />} Identify Staff
            </button>
            <button onClick={() => setStep(0)} className="w-full text-[10px] font-black text-slate-300 uppercase underline mt-4">Switch Branch</button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center space-y-6">
            <div className="bg-green-50 py-4 rounded-2xl border-2 border-green-100">
              <h2 className="text-xl font-black text-slate-900 uppercase">{staffMember["Employee Name"]}</h2>
              <div className="flex items-center justify-center gap-2 mt-1">
                <MapPin size={12} className={geoError ? "text-red-500" : "text-green-600"} />
                <span className={`text-[10px] font-bold uppercase ${geoError ? "text-red-500" : "text-green-600"}`}>
                  {distanceInfo ? `${distanceInfo}m from shop` : "Locating..."} {geoError && "(Too Far)"}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {!isSunday ? (
                <>
                  <button onClick={() => setSelectedShift("7AM Shift")} className={`py-4 rounded-2xl font-black uppercase text-xs border-2 ${selectedShift === '7AM Shift' ? 'bg-[#007a43] text-white border-[#007a43]' : 'bg-white text-slate-400 border-slate-100'}`}>7:00 AM</button>
                  <button onClick={() => setSelectedShift("8AM Shift")} className={`py-4 rounded-2xl font-black uppercase text-xs border-2 ${selectedShift === '8AM Shift' ? 'bg-[#007a43] text-white border-[#007a43]' : 'bg-white text-slate-400 border-slate-100'}`}>8:00 AM</button>
                </>
              ) : (
                <button onClick={() => setSelectedShift("Sunday Shift")} className={`col-span-2 py-4 rounded-2xl font-black uppercase text-xs border-2 ${selectedShift === 'Sunday Shift' ? 'bg-[#007a43] text-white border-[#007a43]' : 'bg-white text-slate-400 border-slate-100'}`}>Sunday (11:00 AM)</button>
              )}
            </div>

            <div className="grid gap-4">
              <button 
                onClick={() => processClock('In')} 
                disabled={geoError || loading || !distanceInfo || !!existingRecord?.["Time In"]}
                className={`py-10 rounded-[2.5rem] font-black text-3xl uppercase transition-all ${ (geoError || !!existingRecord?.["Time In"]) ? 'bg-slate-100 text-slate-300' : 'bg-[#007a43] text-white shadow-xl active:scale-95'}`}
              >
                {existingRecord?.["Time In"] ? "Clocked In" : (geoError ? "Out of Range" : "Clock In")}
              </button>
              
              <button 
                onClick={() => processClock('Out')} 
                disabled={loading || !!existingRecord?.["Time Out"] || !existingRecord?.["Time In"]}
                className={`bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl uppercase ${ (!!existingRecord?.["Time Out"] || !existingRecord?.["Time In"]) ? 'opacity-20' : ''}`}
              >
                {existingRecord?.["Time Out"] ? "Shift Completed" : "Clock Out"}
              </button>
            </div>
            <button onClick={() => setStep(1)} className="text-slate-300 font-black uppercase underline text-[10px]">Cancel</button>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-6">
            {punchResult?.type === 'Out' ? (
               <CheckCircle2 size={80} className="text-slate-900 mx-auto animate-pulse" />
            ) : punchResult?.status === "On Time" ? (
               <CheckCircle2 size={80} className="text-green-500 mx-auto animate-bounce" />
            ) : (
               <AlertTriangle size={80} className="text-orange-500 mx-auto animate-pulse" />
            )}
            
            <div className="space-y-2">
              {punchResult?.type === 'In' && (
                <h2 className={`text-3xl font-black uppercase italic ${punchResult?.status === 'On Time' ? 'text-green-600' : 'text-orange-600'}`}>
                  {punchResult?.status}
                </h2>
              )}
              <p className="text-2xl font-black text-slate-800 uppercase leading-tight">
                {punchResult?.type === 'In' 
                  ? (punchResult.status === 'Late Arrival' ? "Please be on time tomorrow!" : "Have a good day!")
                  : "Goodbye & Stay Safe!"}
              </p>
            </div>
            <button onClick={resetTerminal} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase mt-4">Finish</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TerminalPage() {
  return (
    <Suspense fallback={<div className="text-white">Loading...</div>}>
      <TerminalContent />
    </Suspense>
  );
}