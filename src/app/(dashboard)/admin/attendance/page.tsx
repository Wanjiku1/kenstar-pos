"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, ChevronLeft, Loader2, Printer, Clock, AlertCircle, CheckCircle, Search } from 'lucide-react';
import Link from 'next/link';
import { AttendanceReport } from "@/components/AttendanceReport"; // Import your component

export default function AttendanceArchive() {
  const [searchId, setSearchId] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false); // State to show the modal

  const getRecords = async () => {
    if (!searchId) return;
    setLoading(true);
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('Employee Id', searchId.toUpperCase())
      .order('Date', { ascending: false });
    
    setRecords(data || []);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12 font-sans">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin" className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 mb-8 transition-all">
          <ChevronLeft size={14} /> Dashboard
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Attendance Archive</h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Strict Shift & Overtime Tracking</p>
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="STAFF ID (K-000)" 
              className="bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:border-blue-600 w-48 shadow-sm text-slate-900"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
            />
            <button onClick={getRecords} className="bg-slate-900 text-white px-8 rounded-2xl font-black uppercase text-xs hover:bg-blue-600 transition-all shadow-lg">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            </button>
          </div>
        </div>

        {records.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* STATS HEADER */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Days</p>
                  <p className="text-3xl font-black text-slate-900">{records.length}</p>
               </div>
               <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Late Records</p>
                  <p className="text-3xl font-black text-red-600">{records.filter(r => r.status === 'Late').length}</p>
               </div>
               <div className="bg-white p-6 rounded-[2rem] border-2 border-blue-100 shadow-sm">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Overtime Days</p>
                  <p className="text-3xl font-black text-blue-600">{records.filter(r => r.status === 'Overtime').length}</p>
               </div>
            </div>

            <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                  <tr>
                    <th className="p-6">Date</th>
                    <th className="p-6">Clock In</th>
                    <th className="p-6">Clock Out</th>
                    <th className="p-6">Final Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {records.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="p-6 font-bold text-slate-900">{r.Date}</td>
                      <td className="p-6 font-mono text-xs">{r["Time In"]}</td>
                      <td className="p-6 font-mono text-xs">{r["Time Out"] || '--:--'}</td>
                      <td className="p-6">
                        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          r.status === 'On Time' ? 'bg-green-100 text-green-600' :
                          r.status === 'Late' ? 'bg-red-100 text-red-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {r.status === 'On Time' && <CheckCircle size={10} />}
                          {r.status === 'Late' && <AlertCircle size={10} />}
                          {r.status === 'Overtime' && <Clock size={10} />}
                          {r.status}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* OPEN MODAL BUTTON */}
            <button 
              onClick={() => setShowReport(true)} 
              className="w-full bg-white border-2 border-slate-200 py-6 rounded-[2rem] font-black uppercase text-xs flex items-center justify-center gap-3 hover:bg-slate-900 hover:text-white transition-all shadow-md active:scale-[0.98]"
            >
              <Printer size={16} /> Generate Official WhatsApp Report
            </button>
          </div>
        )}

        {/* INVISIBLE OR MODAL REPORT */}
        {showReport && (
          <AttendanceReport 
            staffName={records[0]?.["Employee Name"] || "Staff"}
            staffId={searchId.toUpperCase()}
            records={records}
            onClose={() => setShowReport(false)}
          />
        )}
      </div>
    </div>
  );
}