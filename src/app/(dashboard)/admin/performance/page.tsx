"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RoleGate } from "@/components/auth/role-gate";
import { 
  Award, ChevronLeft, TrendingUp, Download 
} from "lucide-react";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function PerformanceManager() {
  const router = useRouter();
  const [staff, setStaff] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [selectedStaff, setSelectedStaff] = useState("");
  const [ratings, setRatings] = useState({ duty: 10, relations: 10, notes: "" });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: staffData } = await supabase.from('staff').select('*');
      const startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
      const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0];

      const { data: perfData } = await supabase.from('staff_performance')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (staffData) {
        setStaff(staffData);
        const board = staffData.map(member => {
          const records = perfData?.filter(p => p.employee_id === member["Employee Id"]) || [];
          if (records.length === 0) return { name: member["Employee Name"], id: member["Employee Id"], avgScore: "0.0", count: 0 };
          const sum = records.reduce((acc, r) => acc + ((r.punctuality_score * 0.3) + (r.duty_score * 0.4) + (r.relations_score * 0.3)), 0);
          const rawAvg = sum / records.length;
          return { name: member["Employee Name"], id: member["Employee Id"], avgScore: rawAvg.toFixed(1), count: records.length };
        }).sort((a, b) => Number(b.avgScore) - Number(a.avgScore));
        setLeaderboard(board);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [selectedMonth, selectedYear]);

  const handleDownload = () => {
    if (leaderboard.every(e => e.count === 0)) return toast.error("No data for this month to download");
    window.print();
  };

  const submitScore = async () => {
    if (!selectedStaff) return toast.error("Select a staff member first");
    setSubmitting(true);
    const today = new Date().toISOString().split('T')[0];
    const { data: attendance } = await supabase.from('attendance').select('Notes').eq('Employee Id', selectedStaff).eq('Date', today).single();
    const punctuality = attendance?.Notes === 'Late Arrival' ? 5 : 10;

    const { error } = await supabase.from('staff_performance').insert([{
      employee_id: selectedStaff, punctuality_score: punctuality,
      duty_score: ratings.duty, relations_score: ratings.relations,
      notes: ratings.notes, date: today
    }]);

    if (!error) {
      toast.success("Score Recorded");
      setRatings({ duty: 10, relations: 10, notes: "" });
      setSelectedStaff("");
      fetchData();
    }
    setSubmitting(false);
  };

  return (
    <RoleGate allowedRoles={['founder', 'admin']}>
      <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-12 font-sans">
        
        {/* COMPACT PRINTABLE ONE-PAGE CARD */}
        <div className="hidden print:flex flex-col bg-white border-[10px] border-double border-emerald-900 min-h-[296mm] w-[210mm] mx-auto overflow-hidden box-border">
            
            <div className="p-[10mm] flex-1 flex flex-col">
                {/* Header - Very Compact */}
                <div className="text-center mb-4">
                    <h1 className="text-4xl font-black italic uppercase text-emerald-900 tracking-tighter mb-1">kenstar Staff Performance</h1>
                    <p className="text-lg font-bold text-slate-500 uppercase tracking-[0.4em]">{months[selectedMonth]} {selectedYear}</p>
                    <div className="h-1 bg-emerald-800 w-40 mx-auto mt-2"></div>
                </div>

                {/* Metrics Info - Tightened */}
                <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Evaluation Metrics:</p>
                    <p className="text-[10px] font-bold text-slate-800 leading-relaxed uppercase">
                        The performance card below is based on :
                        Punctuality & Attendance • Duty Performance • Teamwork • Customer Service 
                    </p>
                </div>

                {/* Table - py-2.5 to fit all 10 members easily */}
                <div className="flex-1">
                    <table className="w-full table-fixed border-collapse">
                        <tbody>
                            {leaderboard
                              .filter(entry => entry.name.toLowerCase() !== 'betty')
                              .map((entry, i) => (
                                <tr key={entry.id} className="border-b border-slate-100">
                                    <td className="py-2.5 w-14 text-2xl font-black italic text-emerald-800">
                                        {i + 1}
                                    </td>
                                    <td className="py-2.5">
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-black uppercase text-slate-900 tracking-tight">
                                                {entry.name}
                                            </span>
                                            {i === 0 && <Award size={20} className="text-amber-500 fill-amber-500 shrink-0" />}
                                        </div>
                                    </td>
                                    <td className="py-2.5 w-28 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="text-2xl font-black text-slate-900 tabular-nums leading-none">
                                                {entry.avgScore}
                                            </span>
                                            <span className="text-[7px] font-black uppercase text-slate-400 tracking-[0.1em]">Quality Index</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Signature - Compact Layout */}
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-end">
                    <div className="flex-1">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Management Signature:</p>
                        {/* INSERT NAME HERE */}
                        <p className="text-sm font-bold uppercase text-slate-900 mb-1 ml-2">Teresa </p>
                        <div className="w-56 h-0.5 bg-slate-900"></div>
                    </div>
                    <div className="text-right flex-1">
                        <p className="text-[11px] font-black uppercase text-slate-900 tracking-widest">Kenstar Uniforms Ltd</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase italic">
                            Generated {new Date().toLocaleDateString('en-GB')}
                        </p>
                    </div>
                </div>
            </div>
        </div>

        {/* SCREEN UI */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 print:hidden">
          <div className="flex items-center gap-6">
            <button onClick={() => router.push('/admin')} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200">
                <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <div>
                <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">Performance Card</h1>
                <div className="flex gap-2 mt-2">
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase px-3 py-1 rounded-lg cursor-pointer">
                        {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase px-3 py-1 rounded-lg cursor-pointer">
                        {[2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            </div>
          </div>
          <button onClick={handleDownload} className="bg-slate-900 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-emerald-700 transition-all shadow-xl shadow-slate-200">
            <Download size={16}/> Download {months[selectedMonth]} Card
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 print:hidden">
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 h-fit">
            <h3 className="text-xl font-black uppercase italic text-slate-900 mb-8">Daily Scoring</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-2">
                {staff.map(s => (
                  <button key={s["Employee Id"]} onClick={() => setSelectedStaff(s["Employee Id"])} className={`p-3 rounded-xl border-2 text-[9px] font-black uppercase transition-all ${selectedStaff === s["Employee Id"] ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-slate-50 border-slate-50 text-slate-400'}`}>
                    {s["Employee Name"]}
                  </button>
                ))}
              </div>
              <Slider label="Punctuality & Duty" value={ratings.duty} onChange={(v: number) => setRatings({...ratings, duty: v})} />
              <Slider label="Customer Relations" value={ratings.relations} onChange={(v: number) => setRatings({...ratings, relations: v})} />
              <textarea placeholder="Notes..." className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl text-xs font-bold uppercase min-h-[100px] outline-none" value={ratings.notes} onChange={(e) => setRatings({...ratings, notes: e.target.value})} />
              <button onClick={submitScore} disabled={submitting} className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black uppercase text-xs shadow-lg hover:bg-slate-900 transition-all">
                {submitting ? "Syncing..." : "Sync Score"}
              </button>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center"><TrendingUp size={20}/></div>
              <h3 className="text-xl font-black uppercase italic text-slate-900">{months[selectedMonth]} Rankings</h3>
            </div>
            <div className="space-y-3">
              {leaderboard.map((entry, i) => (
                <div key={entry.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-black italic text-slate-200">{i+1}</span>
                    <p className="font-black text-slate-800 text-xs uppercase">{entry.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-900 tabular-nums">{entry.avgScore}</p>
                    <p className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">{entry.count} Days</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <style jsx global>{`
        @media print {
            @page { 
                size: A4; 
                margin: 0mm !important; 
            }
            body { 
                margin: 0; 
                padding: 0; 
                background: white; 
                overflow: hidden;
            }
            body * { visibility: hidden; }
            .print\:flex, .print\:flex * { visibility: visible; }
            .print\:flex { 
                display: flex !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 210mm !important;
                height: 297mm !important;
                max-height: 297mm !important;
                margin: 0 !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                page-break-after: avoid;
            }
        }
      `}</style>
    </RoleGate>
  );
}

function Slider({ label, value, onChange }: any) {
  return (
    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
      <div className="flex justify-between mb-2">
        <span className="text-[9px] font-black uppercase text-slate-500">{label}</span>
        <span className="text-xs font-black text-slate-900">{value}/10</span>
      </div>
      <input type="range" min="0" max="10" value={value} onChange={(e) => onChange(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600" />
    </div>
  );
}