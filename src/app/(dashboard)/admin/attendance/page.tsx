"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ChevronLeft, Loader2, Printer, Search, Calendar, CreditCard, Layers } from 'lucide-react';
import Link from 'next/link';
import { AttendanceReport } from "@/components/AttendanceReport";

type ReportType = 'sunday' | 'weekly' | 'monthly' | 'all';

export default function AttendanceArchive() {
  const [searchId, setSearchId] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [staffDetails, setStaffDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // CORE DATA FETCHING - High Performance Mapping
  const getRecords = async () => {
    if (!searchId) return;
    setLoading(true);
    
    // FETCH STAFF DETAILS FIRST
    const { data: staffData } = await supabase
      .from('staff')
      .select('*')
      .eq('Employee Id', searchId.toUpperCase())
      .single();
    
    setStaffDetails(staffData);

    // FETCH ATTENDANCE WITH EXACT COLUMN MAPPING
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('*')
      .eq('Employee Id', searchId.toUpperCase())
      .order('Date', { ascending: false });
    
    // DATA TRANSFORMATION - Cleans "Daily Pay" to ensure it's a valid number
    const formattedData = (attendanceData || []).map(r => {
      const rawPay = r["Daily Pay"];
      // This regex removes any currency symbols or commas before parsing
      const cleanedPay = typeof rawPay === 'string' 
        ? parseFloat(rawPay.replace(/[^\d.]/g, '')) 
        : parseFloat(rawPay);

      return {
        ...r,
        earned: cleanedPay || 0 
      };
    });

    setRecords(formattedData);
    setLoading(false);
  };

  // HIGH PERFORMANCE FILTERING ENGINE
  useEffect(() => {
    const applyFilters = () => {
      if (records.length === 0) {
        setFilteredRecords([]);
        return;
      }

      if (reportType === 'all') {
        setFilteredRecords(records);
        return;
      }

      const target = new Date(selectedDate);
      const targetMonth = target.getMonth();
      const targetYear = target.getFullYear();

      const filtered = records.filter(r => {
        const recordDate = new Date(r.Date);
        
        if (reportType === 'sunday') {
          return r.Date === selectedDate; 
        } 
        
        if (reportType === 'weekly') {
          const end = new Date(selectedDate);
          const start = new Date(selectedDate);
          start.setDate(end.getDate() - 6);
          return recordDate >= start && recordDate <= end;
        } 
        
        if (reportType === 'monthly') {
          return recordDate.getMonth() === targetMonth && recordDate.getFullYear() === targetYear;
        }

        return true;
      });

      setFilteredRecords(filtered);
    };

    applyFilters();
  }, [reportType, selectedDate, records]);

  const totalPay = filteredRecords.reduce((sum, r) => sum + (r.earned || 0), 0);

  return (
    <div className="min-h-screen bg-[#FDFDFF] p-6 md:p-12 font-sans selection:bg-emerald-100">
      <div className="max-w-6xl mx-auto">
        
        {/* NAV HEADER */}
        <div className="flex justify-between items-center mb-12">
            <Link href="/admin" className="flex items-center gap-2 text-[11px] font-black uppercase text-slate-400 hover:text-slate-900 transition-all tracking-[0.2em]">
                <ChevronLeft size={16} /> Hub Terminal
            </Link>
            <div className="h-2 w-32 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-2/3"></div>
            </div>
        </div>

        <h1 className="text-5xl font-black italic text-slate-900 tracking-tighter mb-12 uppercase leading-none">
          Attendance <span className="text-emerald-600">Archive.</span>
        </h1>

        {/* SEARCH CONSOLE */}
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-50 mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Employee Serial</label>
              <input 
                type="text" 
                placeholder="E.G. K-001" 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black uppercase outline-none focus:border-emerald-600 focus:bg-white transition-all text-slate-900"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Filter Scope</label>
              <select 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black uppercase outline-none appearance-none focus:border-emerald-600 focus:bg-white transition-all cursor-pointer"
                value={reportType}
                onChange={(e) => setReportType(e.target.value as ReportType)}
              >
                <option value="all">Full History</option>
                <option value="sunday">Specific Day</option>
                <option value="weekly">Weekly Range</option>
                <option value="monthly">Monthly Cycle</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Reference Date</label>
              <input 
                type="date" 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black outline-none focus:border-emerald-600 focus:bg-white transition-all"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <button 
                onClick={getRecords} 
                className="w-full bg-slate-950 text-white h-[66px] rounded-2xl font-black uppercase text-xs hover:bg-emerald-600 transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                Locate Records
              </button>
            </div>
          </div>
        </div>

        {/* SUMMARY & RESULTS */}
        {filteredRecords.length > 0 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="md:col-span-2 bg-emerald-950 p-10 rounded-[3rem] text-white flex flex-col md:flex-row justify-between items-center relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 p-8 opacity-10 rotate-45"><Layers size={150} /></div>
                  <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
                    <p className="text-[11px] font-black uppercase text-emerald-400 tracking-[0.3em] mb-2">Calculated Total Earnings</p>
                    <h2 className="text-5xl font-black italic tracking-tighter">Ksh {totalPay.toLocaleString()}</h2>
                    <p className="text-[10px] font-bold text-emerald-400/50 uppercase mt-2 tracking-widest leading-none">Aggregate for {filteredRecords.length} validated entries</p>
                  </div>
                  <button 
                    onClick={() => setShowReport(true)}
                    className="relative z-10 bg-white text-slate-900 px-12 py-5 rounded-[1.5rem] font-black uppercase text-[10px] flex items-center gap-3 hover:bg-emerald-400 hover:text-white transition-all shadow-2xl active:scale-95 tracking-widest"
                  >
                    <Printer size={18} /> Generate PDF Statement
                  </button>
               </div>

               <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl flex flex-col justify-center text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Average Daily Rate</p>
                  <h3 className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none">
                    Ksh {(totalPay / filteredRecords.length).toFixed(0)}
                  </h3>
               </div>
            </div>

            {/* DATA TABLE */}
            <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/40">
                <table className="w-full">
                    <thead className="bg-slate-50/50 border-b border-slate-100">
                        <tr className="text-left text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">
                            <th className="px-10 py-6">Service Date</th>
                            <th className="px-10 py-6 text-center">Log Status</th>
                            <th className="px-10 py-6 text-right">Daily Credit (Ksh)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredRecords.map((r, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-10 py-7">
                                    <p className="text-sm font-black text-slate-900 mb-1">{r.Date}</p>
                                    <div className="flex items-center gap-1.5 uppercase font-black text-[9px] text-slate-400">
                                       <Calendar size={10} /> {reportType === 'monthly' ? 'Monthly Log' : 'General Log'}
                                    </div>
                                </td>
                                <td className="px-10 py-7 text-center">
                                    <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${r.status === 'Late' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                        {r.status || 'Verified'}
                                    </span>
                                </td>
                                <td className="px-10 py-7 text-right">
                                    <p className="text-sm font-black text-slate-900 italic leading-none mb-1">+{r.earned.toLocaleString()}</p>
                                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Base Payout</p>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
            <div className="w-full h-80 bg-white rounded-[3rem] flex flex-col items-center justify-center gap-6 border border-dashed border-slate-200 animate-pulse">
                <Loader2 className="animate-spin text-emerald-600" size={50} strokeWidth={3} />
                <div className="text-center">
                   <p className="text-[12px] font-black uppercase text-slate-900 tracking-[0.4em]">Establishing Secure Connection</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Scanning Kenstar Terminal Database...</p>
                </div>
            </div>
        ) || (!loading && filteredRecords.length === 0 && searchId && (
            <div className="w-full py-20 text-center">
               <p className="text-[11px] font-black uppercase text-slate-300 tracking-[0.5em]">No records located for identity {searchId}</p>
            </div>
        ))}

        {/* THE FLOATING REPORT MODAL */}
        {showReport && (
          <AttendanceReport 
            staffName={staffDetails?.["Employee Name"] || "Unknown Staff"}
            staffId={searchId.toUpperCase()}
            records={filteredRecords}
            reportType={reportType}
            totalPay={totalPay}
            selectedDate={selectedDate}
            onClose={() => setShowReport(false)}
          />
        )}
      </div>
    </div>
  );
}