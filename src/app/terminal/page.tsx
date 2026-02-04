"use client";

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, User, Lock, Loader2, Smartphone } from 'lucide-react';

function TerminalContent() {
  const searchParams = useSearchParams();
  const branch = searchParams.get('branch') || 'General';

  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ staffId: '', pin: '' });
  const [staffMember, setStaffMember] = useState<any>(null);

  const handleVerify = async () => {
    setLoading(true);
    // Querying your public.staff table
    const { data, error } = await supabase
      .from('staff') 
      .select('*')
      .eq('Employee Id', formData.staffId) // Text ID (e.g., "KU001")
      .eq('pin', formData.pin)
      .single();

    if (error || !data) {
      alert("⚠️ Access Denied: Incorrect ID or PIN");
    } else {
      setStaffMember(data);
      setStep(2);
    }
    setLoading(false);
  };

  const processClock = async (type: 'In' | 'Out') => {
    setLoading(true);
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0];
    const today = now.toISOString().split('T')[0];

    // Payload matches public.attendance definition
    const payload: any = {
      "Employee Id": staffMember["Employee Id"], // Using the unique text ID
      "Employee Name": staffMember["Employee Name"],
      "Shop": branch,
      "Date": today,
      "status": "Present",
      "Is Paid": false
    };

    if (type === 'In') payload["Time In"] = currentTime;
    if (type === 'Out') payload["Time Out"] = currentTime;

    const { error } = await supabase
      .from('attendance')
      .upsert(payload, { onConflict: 'Employee Id, Date' });

    if (error) {
      alert("Database Error: " + error.message);
    } else {
      alert(`✅ ${staffMember["Employee Name"]} Clocked ${type} successfully!`);
      // Auto-reset for the next person
      setStep(1);
      setFormData({ staffId: '', pin: '' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-2xl overflow-hidden">
        
        <div className="bg-blue-600 p-8 text-center text-white">
          <ShieldCheck className="mx-auto mb-2" size={32} />
          <h1 className="text-xl font-black uppercase italic tracking-tighter">Kenstar Uniforms</h1>
          <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Shop Branch: {branch}</p>
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
                    placeholder="e.g. KU001"
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
                    placeholder="••••"
                    value={formData.pin}
                    onChange={(e) => setFormData({...formData, pin: e.target.value})}
                  />
                </div>
              </div>

              <button 
                onClick={handleVerify}
                disabled={loading}
                className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Log In to Shift'}
              </button>
            </div>
          ) : (
            <div className="text-center space-y-8 py-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Logged in as</p>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{staffMember["Employee Name"]}</h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button 
                  onClick={() => processClock('In')}
                  disabled={loading}
                  className="bg-green-500 text-white py-8 rounded-[2rem] font-black uppercase text-lg shadow-xl active:scale-95 transition-all"
                >
                  Clock In
                </button>
                <button 
                  onClick={() => processClock('Out')}
                  disabled={loading}
                  className="bg-red-500 text-white py-8 rounded-[2rem] font-black uppercase text-lg shadow-xl active:scale-95 transition-all"
                >
                  Clock Out
                </button>
              </div>

              <button onClick={() => setStep(1)} className="text-[10px] font-bold text-slate-300 uppercase underline">
                Switch User
              </button>
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