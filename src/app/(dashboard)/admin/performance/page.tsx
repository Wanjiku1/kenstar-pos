"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RoleGate } from "@/components/auth/role-gate";
import { 
  Award, Zap, Users, ClipboardCheck, ArrowUpRight, 
  ChevronLeft, Loader2, Star, TrendingUp
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function PerformanceManager() {
  const router = useRouter();
  const [staff, setStaff] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedStaff, setSelectedStaff] = useState("");
  const [ratings, setRatings] = useState({ duty: 10, relations: 10, notes: "" });

  const fetchData = async () => {
    try {
      const { data: staffData } = await supabase.from('staff').select('*');
      const { data: perfData } = await supabase.from('staff_performance').select('*');

      if (staffData) {
        setStaff(staffData);
        
        // --- NAN PROTECTION LOGIC ---
        const board = staffData.map(member => {
          const records = perfData?.filter(p => p.employee_id === member["Employee Id"]) || [];
          if (records.length === 0) {
            return { name: member["Employee Name"], id: member["Employee Id"], avgScore: "0.0" };
          }
          
          const sum = records.reduce((acc, r) => 
            acc + ((r.punctuality_score * 0.4) + (r.duty_score * 0.4) + (r.relations_score * 0.2)), 0
          );
          const rawAvg = sum / records.length;
          
          return { 
            name: member["Employee Name"], 
            id: member["Employee Id"], 
            avgScore: isNaN(rawAvg) ? "0.0" : rawAvg.toFixed(1) // Force string casting
          };
        }).sort((a, b) => Number(b.avgScore) - Number(a.avgScore));

        setLeaderboard(board);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const submitScore = async () => {
    if (!selectedStaff) return toast.error("Select a staff member first");
    setSubmitting(true);
    
    const today = new Date().toISOString().split('T')[0];
    const { data: attendance } = await supabase.from('attendance')
      .select('Notes').eq('Employee Id', selectedStaff).eq('Date', today).single();
    
    const punctuality = attendance?.Notes === 'Late Arrival' ? 5 : 10;

    const { error } = await supabase.from('staff_performance').insert([{
      employee_id: selectedStaff,
      punctuality_score: punctuality,
      duty_score: ratings.duty,
      relations_score: ratings.relations,
      notes: ratings.notes,
      date: today
    }]);

    if (!error) {
      toast.success("Score synced to HQ");
      setRatings({ duty: 10, relations: 10, notes: "" });
      setSelectedStaff("");
      fetchData();
    }
    setSubmitting(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-black uppercase text-[10px] tracking-widest animate-pulse">Syncing Scores...</div>;

  return (
    <RoleGate allowedRoles={['founder', 'admin']}>
      <div className="min-h-screen bg-[#f8fafc] p-10 font-sans">
        <header className="flex items-center gap-6 mb-12">
          <button onClick={() => router.push('/admin')} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200 hover:bg-slate-50 transition-all">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Performance Card</h1>
            <p className="text-[10px] font-bold text-[#007a43] uppercase tracking-widest mt-1">Staff Quality Monitoring</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* FORM */}
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-green-50 text-[#007a43] rounded-2xl flex items-center justify-center"><ClipboardCheck size={24}/></div>
              <h3 className="text-xl font-black uppercase italic text-slate-900">Daily Scorecard</h3>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3">
                {staff.map(s => (
                  <button 
                    key={s["Employee Id"]} 
                    onClick={() => setSelectedStaff(s["Employee Id"])}
                    className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase transition-all ${selectedStaff === s["Employee Id"] ? 'bg-green-50 border-[#007a43] text-[#007a43]' : 'bg-slate-50 border-slate-50 text-slate-400'}`}
                  >
                    {s["Employee Name"]}
                  </button>
                ))}
              </div>

              <Slider label="Duty & Ownership" value={ratings.duty} onChange={(v: number) => setRatings({...ratings, duty: v})} />
              <Slider label="Customer Relations" value={ratings.relations} onChange={(v: number) => setRatings({...ratings, relations: v})} />

              <textarea 
                placeholder="Manager Observations..." 
                className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-bold uppercase min-h-[100px] outline-none"
                value={ratings.notes}
                onChange={(e) => setRatings({...ratings, notes: e.target.value})}
              />

              <button 
                onClick={submitScore} 
                disabled={submitting}
                className="w-full bg-[#007a43] text-white py-6 rounded-[2rem] font-black uppercase text-xs shadow-lg flex items-center justify-center gap-2 hover:bg-slate-900 transition-all"
              >
                {submitting ? "Syncing..." : "Commit Daily Grade"} <ArrowUpRight size={18}/>
              </button>
            </div>
          </div>

          {/* LEADERBOARD */}
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center"><TrendingUp size={24}/></div>
              <h3 className="text-xl font-black uppercase italic text-slate-900">Power Rankings</h3>
            </div>
            
            <div className="space-y-4">
              {leaderboard.map((entry, i) => (
                <div key={entry.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-black italic text-slate-200">#{i+1}</span>
                    <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{entry.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-900 leading-none">{entry.avgScore}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">Quality Index</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}

function Slider({ label, value, onChange }: any) {
  return (
    <div className="p-5 bg-slate-50 border border-slate-100 rounded-3xl">
      <div className="flex justify-between mb-3">
        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{label}</span>
        <span className="text-xs font-black text-slate-900">{value}/10</span>
      </div>
      <input 
        type="range" min="0" max="10" value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))} 
        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#007a43]" 
      />
    </div>
  );
}