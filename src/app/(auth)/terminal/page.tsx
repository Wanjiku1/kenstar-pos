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

// Master Shop Registry
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
    
    // Check URL first (Priority/QR Scan)
    const urlBranch = searchParams.get('branch');
    const urlLat = searchParams.get('lat');
    const urlLng = searchParams.get('lng');

    if (urlBranch && SHOP_DATA[urlBranch]) {
      // If scanned via QR, update and save
      handleManualBranchSelect(urlBranch);
    } else {
      // Otherwise, load from memory
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
      // Using your successful 1500m buffer
      setGeoError(roundedDistance > 1500);
    }, () => setGeoError(true), { enableHighAccuracy: true });
  };

  const handleManualBranchSelect = (id: string) => {
    const shop = SHOP_DATA[id];
    setActiveBranch(id);
    setTargetCoords({ lat: shop.lat, lng: shop.lng });
    localStorage.setItem('kenstar_saved_branch', id);
    toast.info(`Terminal switched to ${shop.name}`);
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

  if (!mounted) return null;

  // VIEW 1: SHOP SELECTION (When no branch is saved)
  if (!activeBranch) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-[3rem] p-10 w-full max-w-sm text-center shadow-2xl">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <MapPin className="text-blue-600" size={32} />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Branch Setup</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-8 mt-2">Which shop is this phone located in?</p>
          <div className="space-y-3">
            {Object.keys(SHOP_DATA).map((id) => (
              <button 
                key={id} 
                onClick={() => handleManualBranchSelect(id)}
                className="w-full bg-slate-50 hover:bg-slate-900 hover:text-white py-5 rounded-2xl font-black uppercase text-xs transition-all border-2 border-slate-100 flex items-center justify-between px-8 group"
              >
                {SHOP_DATA[id].name}
                <div className={`w-2 h-2 rounded-full ${SHOP_DATA[id].color}`} />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // VIEW 2: DISTANCE ERROR
  if (geoError) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-sm border-b-8 border-red-600">
          <MapPinOff size={64} className="text-red-600 mx-auto mb-6 animate-pulse" />
          <h1 className="text-3xl font-black uppercase text-slate-900 tracking-tighter">Out of Range</h1>
          <div className="mt-6 p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Calculated Distance</p>
             <p className="text-4xl font-black text-red-600 tracking-tighter">{distanceInfo !== null ? `${distanceInfo}m` : 'Checking...'}</p>
          </div>
          <button onClick={() => window.location.reload()} className="mt-8 w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2">
            <RefreshCw size={14} /> Refresh GPS
          </button>
          <button onClick={resetTerminal} className="mt-4 text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-red-600">Switch Branch Setting</button>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-[3.5rem] shadow-2xl overflow-hidden relative border-t-8 border-blue-600">
        
        {/* Branch Info Header */}
        <div className="bg-white p-10 text-center border-b border-slate-50">
          <div className="bg-blue-600 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
             <ShieldCheck className="text-white" size={24} />
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
            Kenstar <span className="text-blue-600">Terminal</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mt-3">{SHOP_DATA[activeBranch]?.name}</p>
          
          <div className="mt-6 bg-slate-900 rounded-[2rem] py-4 px-8 inline-block shadow-xl">
            <span className="text-3xl font-mono font-black text-white tracking-widest">
                {currentTime.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </span>
          </div>
        </div>

        <div className="p-10">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <input type="text" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-5 px-8 font-black uppercase outline-none focus:border-blue-600 transition-all text-slate-900" placeholder="Staff ID" value={formData.staffId} onChange={(e) => setFormData({...formData, staffId: e.target.value})} />
                <input type="password" placeholder="PIN" className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-5 px-8 font-black tracking-[0.5em] outline-none focus:border-blue-600 transition-all text-slate-900" value={formData.pin} onChange={(e) => setFormData({...formData, pin: e.target.value})} />
              </div>
              
              <button onClick={handleVerify} disabled={loading} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95 hover:bg-blue-600 transition-all">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Enter Terminal'}
              </button>

              <button onClick={resetTerminal} className="w-full flex items-center justify-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-900 pt-4">
                <Settings2 size={12} /> Switch Branch Setting
              </button>
            </div>
          ) : (
            <div className="text-center space-y-8 py-4 animate-in zoom-in duration-300">
                <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Authenticated</p>
                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">{staffMember["Employee Name"]}</h2>
                </div>
                
                <div className="grid grid-cols-1 gap-4 pt-4">
                    <button onClick={() => { toast.success("In Recorded"); setStep(1); }} className="bg-green-500 text-white py-12 rounded-[2.5rem] font-black uppercase text-2xl shadow-xl active:scale-95">Clock In</button>
                    <button onClick={() => { toast.success("Out Recorded"); setStep(1); }} className="bg-red-600 text-white py-12 rounded-[2.5rem] font-black uppercase text-2xl shadow-xl active:scale-95">Clock Out</button>
                </div>

                <button onClick={() => setStep(1)} className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-900 pt-6 block mx-auto">← Exit Session</button>
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