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

const SHOP_DATA: Record<string, { lat: number; lng: number; name: string; color: string }> = {
  '315': { lat: -1.2825, lng: 36.8967, name: 'Shop 315', color: 'bg-blue-600' },
  '172': { lat: -1.2825, lng: 36.8967, name: 'Shop 172', color: 'bg-slate-900' },
  'Stage': { lat: -1.2825, lng: 36.8967, name: 'Stage Outlet', color: 'bg-green-600' }
};

function TerminalContent() {
  const searchParams = useSearchParams();
  const [activeBranch, setActiveBranch] = useState<string | null>(null);
  const [targetCoords, setTargetCoords] = useState<{lat: number, lng: number} | null>(null);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [distanceInfo, setDistanceInfo] = useState<number | null>(null);
  const [formData, setFormData] = useState({ staffId: '', pin: '' });
  const [staffMember, setStaffMember] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
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

  useEffect(() => {
    if (mounted && targetCoords) checkLocation();
  }, [mounted, targetCoords]);

  const checkLocation = () => {
    if (!targetCoords) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat1 = pos.coords.latitude;
      const lon1 = pos.coords.longitude;
      const R = 6371e3; 
      const dLat = (targetCoords.lat - lat1) * Math.PI / 180;
      const dLon = (targetCoords.lng - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI/180) * Math.cos(targetCoords.lat * Math.PI/180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const roundedDistance = Math.round(distance);
      setDistanceInfo(roundedDistance);
      setGeoError(roundedDistance > 1500);
    }, () => setGeoError(true), { enableHighAccuracy: true });
  };

  const handleManualBranchSelect = (id: string) => {
    const shop = SHOP_DATA[id];
    setActiveBranch(id);
    setTargetCoords({ lat: shop.lat, lng: shop.lng });
    localStorage.setItem('kenstar_saved_branch', id);
  };

  const resetTerminal = () => {
    localStorage.removeItem('kenstar_saved_branch');
    setActiveBranch(null);
    setTargetCoords(null);
    setStep(1);
  };

  const handleVerify = async () => {
    if (!formData.staffId || !formData.pin) return toast.error("Enter credentials");
    setLoading(true);
    const { data, error } = await supabase.from('staff')
      .select('*')
      .eq('Employee Id', formData.staffId.toUpperCase())
      .eq('pin', formData.pin)
      .single();

    if (error || !data) {
      toast.error("Invalid ID or PIN");
    } else {
      setStaffMember(data);
      setStep(2);
    }
    setLoading(false);
  };

  const processClock = async (type: 'In' | 'Out') => {
    setLoading(true);
    const now = new Date();
    const day = now.getDay(); // 0 is Sunday
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const timeString = now.toLocaleTimeString('en-GB', { hour12: false });
    const dateString = now.toISOString().split('T')[0];

    let status = "On Time";

    if (type === 'In') {
      // 1. Sunday Check (11am)
      if (day === 0) {
        if (hours > 11 || (hours === 11 && minutes > 0)) status = "Late";
      } 
      // 2. Early Shift Check (7am) - Assuming Early Shift IDs start with "K-"
      else if (staffMember["Employee Id"].startsWith('K')) {
        if (hours > 7 || (hours === 7 && minutes > 0)) status = "Late";
      }
      // 3. Regular Shift Check (8am)
      else {
        if (hours > 8 || (hours === 8 && minutes > 0)) status = "Late";
      }
    }

    const { error } = await supabase.from('attendance').upsert({
      "Employee Id": staffMember["Employee Id"],
      "Employee Name": staffMember["Employee Name"],
      "Shop": SHOP_DATA[activeBranch!]?.name,
      "Date": dateString,
      "status": status,
      [type === 'In' ? "Time In" : "Time Out"]: timeString,
      "Is Paid": false
    }, { onConflict: 'Employee Id, Date' });

    if (error) {
      toast.error("Cloud Error - Check Connection");
    } else {
      toast.success(`${type} Recorded: ${status}`);
      setStep(1);
      setFormData({ staffId: '', pin: '' });
    }
    setLoading(false);
  };

  if (!mounted) return null;

  if (geoError) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm border-b-8 border-red-600">
          <MapPinOff size={64} className="text-red-600 mx-auto mb-6" />
          <h1 className="text-3xl font-black uppercase text-slate-900 tracking-tighter">Out of Range</h1>
          <p className="text-4xl font-black text-red-600 mt-4">{distanceInfo}m</p>
          <button onClick={() => window.location.reload()} className="mt-8 w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px]">Retry GPS</button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[3.5rem] shadow-2xl overflow-hidden relative border-t-8 border-blue-600">
        <div className="bg-white p-10 text-center border-b border-slate-50">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">
            Kenstar <span className="text-blue-600">Terminal</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-3">{SHOP_DATA[activeBranch!]?.name}</p>
          <div className="mt-6 bg-slate-900 rounded-[2rem] py-4 px-8 inline-block">
            <span className="text-3xl font-mono font-black text-white">{currentTime.toLocaleTimeString('en-KE', { hour12: false })}</span>
          </div>
        </div>

        <div className="p-10">
          {step === 1 ? (
            <div className="space-y-6">
              <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-5 px-8 font-black uppercase" placeholder="Staff ID" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})} />
              <input type="password" placeholder="PIN" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-5 px-8 font-black tracking-[0.5em]" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value})} />
              <button onClick={handleVerify} disabled={loading} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-xs">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Enter Terminal'}
              </button>
              <button onClick={resetTerminal} className="w-full text-[9px] font-black text-slate-300 uppercase tracking-widest pt-4 block text-center underline">Switch Branch</button>
            </div>
          ) : (
            <div className="text-center space-y-8 py-4">
                <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">{staffMember["Employee Name"]}</h2>
                <div className="grid grid-cols-1 gap-4">
                    <button onClick={() => processClock('In')} disabled={loading} className="bg-green-500 text-white py-12 rounded-[2.5rem] font-black uppercase text-2xl shadow-xl active:scale-95">Clock In</button>
                    <button onClick={() => processClock('Out')} disabled={loading} className="bg-red-600 text-white py-12 rounded-[2.5rem] font-black uppercase text-2xl shadow-xl active:scale-95">Clock Out</button>
                </div>
                <button onClick={() => setStep(1)} className="text-[10px] font-black text-slate-300 uppercase tracking-widest pt-6 block mx-auto">← Exit Session</button>
            </div>
          )}
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