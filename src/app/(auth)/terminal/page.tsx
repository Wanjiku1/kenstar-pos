"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Lock, Loader2, MapPinOff, CheckCircle2, Clock } from 'lucide-react'; 
import { toast } from 'sonner';

const SHOP_DATA: Record<string, { lat: number; lng: number; name: string; color: string }> = {
  '315': { lat: -1.283519, lng: 36.887452, name: 'Shop 315', color: 'bg-blue-600' },
  '172': { lat: -1.283215, lng: 36.887374, name: 'Shop 172', color: 'bg-slate-900' },
  'Stage': { lat: -1.283971, lng: 36.887177, name: 'Stage Outlet', color: 'bg-green-600' }
};

export default function TerminalPage() {
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
  const [selectedShift, setSelectedShift] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const params = new URLSearchParams(window.location.search);
    const urlBranch = params.get('branch');
    
    if (urlBranch && SHOP_DATA[urlBranch]) {
      setActiveBranch(urlBranch);
      setTargetCoords({ lat: SHOP_DATA[urlBranch].lat, lng: SHOP_DATA[urlBranch].lng });
    } else {
      const saved = localStorage.getItem('kenstar_saved_branch');
      if (saved && SHOP_DATA[saved]) {
        setActiveBranch(saved);
        setTargetCoords({ lat: SHOP_DATA[saved].lat, lng: SHOP_DATA[saved].lng });
      }
    }
    return () => clearInterval(timer);
  }, []);

  const handleVerify = async () => {
    if (!formData.staffId || !formData.pin) return toast.error("Enter credentials");
    setLoading(true);
    try {
      const { data, error } = await supabase.from('staff').select('*').eq('Employee Id', formData.staffId.trim().toUpperCase()).eq('pin', formData.pin.trim()).single();
      if (error || !data) {
        toast.error("Invalid ID or PIN");
      } else {
        setStaffMember(data);
        setStep(2);
        toast.success(`Welcome ${data["Employee Name"]}`);
        checkLocation();
      }
    } catch (err) { toast.error("Network Error"); } finally { setLoading(false); }
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
    }, () => setGeoError(true));
  };

  const processClock = async (type: 'In' | 'Out') => {
    if (type === 'In' && !selectedShift) return toast.error("Please select a shift first");
    
    setLoading(true);
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { hour12: false });
    const dateString = now.toISOString().split('T')[0];
    
    let statusValue = "On Time";
    if (type === 'In') {
      const hrs = now.getHours();
      const mins = now.getMinutes();
      const secs = now.getSeconds();
      
      if (selectedShift === '7AM Shift') {
        if (hrs > 7 || (hrs === 7 && (mins > 0 || secs > 0))) statusValue = "Late";
      } else if (selectedShift === '8AM Shift') {
        if (hrs > 8 || (hrs === 8 && (mins > 0 || secs > 0))) statusValue = "Late";
      } else if (selectedShift === 'Sunday Shift') {
        if (hrs > 11 || (hrs === 11 && (mins > 0 || secs > 0))) statusValue = "Late";
      }
    }

    // Build record matching your EXACT schema
    const record: any = {
      "Employee Id": staffMember["Employee Id"],
      "Employee Name": staffMember["Employee Name"],
      "Shop": SHOP_DATA[activeBranch!]?.name,
      "Date": dateString,
      "status": statusValue,
      "lat": userCoords?.lat || 0,
      "lng": userCoords?.lng || 0,
      "Worked At": selectedShift || "Clock Out", // Store shift here since column 'shift' doesn't exist
    };

    if (type === 'In') {
      record["Time In"] = timeString;
    } else {
      record["Time Out"] = timeString;
    }

    // UPSERT is required because of your unique_staff_attendance constraint
    const { error } = await supabase
      .from('attendance')
      .upsert(record, { onConflict: 'Employee Id, Date' });

    if (!error) {
      toast.custom((t) => (
        <div className={`bg-white border-l-8 ${statusValue === 'Late' && type === 'In' ? 'border-red-600' : 'border-green-500'} p-6 rounded-2xl shadow-2xl flex items-center gap-4`}>
          {statusValue === 'Late' && type === 'In' ? <Clock className="text-red-600" /> : <CheckCircle2 className="text-green-500" />}
          <div>
            <p className="font-black text-slate-900 uppercase tracking-tighter">{type} RECORDED</p>
            <p className="text-xs font-bold text-slate-500 uppercase">
              {type === 'In' ? `${statusValue} for ${selectedShift}` : 'Shift Ended'}
            </p>
          </div>
        </div>
      ), { duration: 5000 });

      setStep(1);
      setFormData({ staffId: '', pin: '' });
      setSelectedShift(null);
    } else { 
      console.error("Supabase Error:", error);
      toast.error(`Error: ${error.message}`); 
    }
    setLoading(false);
  };

  if (!mounted) return null;

  const isSunday = currentTime.getDay() === 0;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {geoError && (
        <div className="fixed inset-0 bg-slate-950 z-50 flex items-center justify-center p-6">
           <div className="bg-white p-10 rounded-[3rem] text-center max-w-sm">
              <MapPinOff size={60} className="text-red-600 mx-auto mb-4" />
              <h1 className="text-2xl font-black uppercase text-slate-900 leading-none">Access Denied</h1>
              <p className="text-5xl font-black text-red-600 my-6">{distanceInfo}m</p>
              <button onClick={() => window.location.reload()} className="bg-slate-900 text-white w-full py-4 rounded-2xl font-black">REFRESH GPS</button>
           </div>
        </div>
      )}

      <div className="w-full max-w-md bg-white rounded-[3.5rem] shadow-2xl p-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black uppercase italic text-slate-900">Kenstar <span className="text-blue-600">Ops</span></h1>
          <p className="text-[10px] font-black uppercase text-slate-400 mt-2">{SHOP_DATA[activeBranch!]?.name || "Terminal"}</p>
          <div className="mt-4 bg-slate-900 text-white py-4 px-8 rounded-3xl inline-block font-mono text-3xl font-black shadow-lg">
            {currentTime.toLocaleTimeString('en-KE', { hour12: false })}
          </div>
        </div>

        {step === 1 ? (
          <div className="space-y-6">
            <input type="text" className="w-full bg-slate-100 rounded-2xl py-6 px-8 font-black uppercase border-none outline-none focus:ring-2 ring-blue-600" placeholder="STAFF ID" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})} />
            <input type="password" placeholder="PIN" className="w-full bg-slate-100 rounded-2xl py-6 px-8 font-black border-none outline-none focus:ring-2 ring-blue-600" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value})} />
            <button onClick={handleVerify} disabled={loading} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase shadow-xl hover:bg-slate-800 transition-all">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Identify Staff'}
            </button>
            <button onClick={() => { localStorage.removeItem('kenstar_saved_branch'); setActiveBranch(null); }} className="w-full text-[10px] font-black text-slate-300 uppercase underline">Change Branch</button>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="bg-blue-50 py-4 rounded-2xl">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{staffMember["Employee Name"]}</h2>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Your Shift</p>
              <div className="grid grid-cols-1 gap-3">
                {isSunday ? (
                  <button onClick={() => setSelectedShift("Sunday Shift")} className={`py-4 rounded-2xl font-black uppercase transition-all ${selectedShift === 'Sunday Shift' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>Sunday (11AM)</button>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setSelectedShift("7AM Shift")} className={`py-4 rounded-2xl font-black uppercase transition-all ${selectedShift === '7AM Shift' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>7AM Shift</button>
                    <button onClick={() => setSelectedShift("8AM Shift")} className={`py-4 rounded-2xl font-black uppercase transition-all ${selectedShift === '8AM Shift' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>8AM Shift</button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 pt-4">
              <button onClick={() => processClock('In')} className="bg-green-500 text-white py-10 rounded-[2rem] font-black text-2xl uppercase shadow-xl hover:bg-green-600 active:scale-95 transition-all">Clock In</button>
              <button onClick={() => { setSelectedShift("Clocking Out"); processClock('Out'); }} className="bg-red-600 text-white py-6 rounded-[2rem] font-black text-xl uppercase shadow-lg hover:bg-red-700 active:scale-95 transition-all">Clock Out</button>
            </div>
            <button onClick={() => setStep(1)} className="text-slate-300 font-black uppercase underline text-[10px]">Back</button>
          </div>
        )}
      </div>
    </div>
  );
}