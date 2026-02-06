"use client";

import React, { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, User, Lock, Loader2, Clock } from 'lucide-react'; 

function TerminalContent() {
  const searchParams = useSearchParams();
  const branch = searchParams.get('branch') || 'General';
  const targetLat = parseFloat(searchParams.get('lat') || '0');
  const targetLng = parseFloat(searchParams.get('lng') || '0');

  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [geoError, setGeoError] = useState(false);
  const [formData, setFormData] = useState({ staffId: '', pin: '' });
  const [staffMember, setStaffMember] = useState<any>(null);
  
  // --- LIVE CLOCK STATE ---
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- BOOSTED AUDIO LOGIC ---
  const playBoostedAlert = async (isLate: boolean) => {
    try {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') await audioCtx.resume();

      const soundFile = isLate ? '/sounds/warning.mp3' : '/sounds/success.mp3';
      const response = await fetch(soundFile);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = 3.5; 

      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      source.start(0);
    } catch (err) {
      console.error("Audio failed:", err);
    }
  };

  // --- GEO-FENCE CHECK ---
  useEffect(() => {
    if (targetLat === 0) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const R = 6371e3; 
      const dLat = (targetLat - pos.coords.latitude) * Math.PI / 180;
      const dLon = (targetLng - pos.coords.longitude) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(pos.coords.latitude * Math.PI/180) * Math.cos(targetLat * Math.PI/180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      if (distance > 60) setGeoError(true); 
    }, () => setGeoError(true));
  }, [targetLat, targetLng]);

  const handleVerify = async () => {
    if (geoError) {
      alert("⚠️ ACCESS DENIED: Out of range.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('staff') 
      .select('*')
      .eq('Employee Id', formData.staffId)
      .eq('pin', formData.pin)
      .single();

    if (error || !data) {
      alert("⚠️ Incorrect ID or PIN");
    } else {
      setStaffMember(data);
      setStep(2);
    }
    setLoading(false);
  };

  const processClock = async (type: 'In' | 'Out') => {
    setLoading(true);
    const now = new Date();
    const day = now.getDay(); 
    const hours = now.getHours();
    const mins = now.getMinutes();
    
    let isLate = false;
    if (type === 'In') {
      if (day === 0) { // Sunday 11:00 AM
        if (hours > 11 || (hours === 11 && mins > 5)) isLate = true;
      } else { 
        if (hours === 7 && mins > 5) isLate = true;
        if (hours >= 8 && mins > 5) isLate = true;
      }
    }

    await playBoostedAlert(isLate);

    const timeString = now.toTimeString().split(' ')[0];
    const today = now.toISOString().split('T')[0];

    const payload = {
      "Employee Id": staffMember["Employee Id"],
      "Employee Name": staffMember["Employee Name"],
      "Shop": branch,
      "Date": today,
      "status": isLate ? "Late" : "Present",
      "Is Paid": false,
      [type === 'In' ? "Time In" : "Time Out"]: timeString
    };

    const { error } = await supabase
      .from('attendance')
      .upsert(payload, { onConflict: 'Employee Id, Date' });

    if (error) {
      alert("Database Error: " + error.message);
    } else {
      alert(isLate ? "🚨 MARKED LATE" : `✅ Clocked ${type} successfully!`);
      setStep(1);
      setFormData({ staffId: '', pin: '' });
    }
    setLoading(false);
  };

  if (geoError) return (
    <div className="min-h-screen bg-red-950 flex items-center justify-center p-6 text-center">
       <div className="bg-white p-10 rounded-[3rem] shadow-2xl">
         <MapPinOff size={64} className="text-red-600 mx-auto mb-4" />
         <h1 className="text-2xl font-black uppercase text-slate-900">Out of Range</h1>
         <p className="text-slate-500 font-bold mt-2">Move closer to the shop entrance.</p>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
        
        {/* HEADER WITH LIVE CLOCK */}
        <div className="bg-blue-600 p-8 text-center text-white">
          <ShieldCheck className="mx-auto mb-2" size={32} />
          <h1 className="text-xl font-black uppercase italic tracking-tighter">Kenstar Uniforms</h1>
          <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest mb-4">Shop Branch: {branch}</p>
          
          {/* DIGITAL CLOCK UI */}
          <div className="bg-blue-700/50 rounded-2xl py-3 px-4 inline-flex items-center gap-3 border border-blue-400/30">
            <Clock size={20} className="text-blue-200" />
            <span className="text-2xl font-mono font-black tracking-widest">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
          </div>
        </div>

        <div className="p-8">
          {step === 1 ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Staff ID</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 font-bold uppercase"
                    placeholder="KU001"
                    value={formData.staffId}
                    onChange={(e) => setFormData({...formData, staffId: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Secret PIN</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input 
                    type="password" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 font-bold tracking-[0.5em]"
                    value={formData.pin}
                    onChange={(e) => setFormData({...formData, pin: e.target.value})}
                  />
                </div>
              </div>
              <button onClick={handleVerify} disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">
                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Log In to Shift'}
              </button>
            </div>
          ) : (
            <div className="text-center space-y-8 py-4">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{staffMember["Employee Name"]}</h2>
              <div className="grid grid-cols-1 gap-4">
                <button onClick={() => processClock('In')} className="bg-green-500 text-white py-8 rounded-[2rem] font-black uppercase text-lg shadow-xl active:scale-95 transition-all">Clock In</button>
                <button onClick={() => processClock('Out')} className="bg-red-500 text-white py-8 rounded-[2rem] font-black uppercase text-lg shadow-xl active:scale-95 transition-all">Clock Out</button>
              </div>
              <button onClick={() => setStep(1)} className="text-[10px] font-bold text-slate-300 uppercase underline">Switch User</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TerminalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <TerminalContent />
    </Suspense>
  );
}

function MapPinOff(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.75 18a5 5 0 0 1-5.63-8.47" /><path d="m2 2 20 20" /><path d="M8.13 8.13A5 5 0 0 0 7 11c0 5.25 7 11 7 11s1.31-1.07 2.87-3.13" /><circle cx="12" cy="11" r="3" />
    </svg>
  );
}