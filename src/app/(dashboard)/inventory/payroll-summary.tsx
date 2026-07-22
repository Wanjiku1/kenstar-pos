"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle, Loader2, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const PayoutHub = ({ data, onRefresh }: { data: any[], onRefresh?: () => void }) => {
  const [view, setView] = useState<'Weekly' | 'Sunday' | 'Monthly' | 'History'>('Weekly');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    if (view === 'History') fetchHistory();
  }, [view]);

  const fetchHistory = async () => {
    setHistLoading(true);
    try {
      const { data: hist } = await supabase
        .from('payout_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setHistoryData(hist || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistLoading(false);
    }
  };

  const handleMarkAsPaid = async (item: any) => {
    if (!window.confirm(`Mark ${item["Employee Name"]} as paid?`)) return;

    try {
      // 1. Archive to history (Make sure this table exists)
      await supabase.from('payout_history').insert([{
        "Employee Id": item["Employee Id"],
        "Employee Name": item["Employee Name"],
        "Amount Paid": item.total_due,
        "Cycle Type": view,
        "Shop": item["Shop"]
      }]);

      // 2. Update all pending records for this staff member
      await supabase
        .from('attendance')
        .update({ "Is Paid": true })
        .match({ "Employee Id": item["Employee Id"], "Is Paid": false });

      alert("Payout Successful");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // --- FILTERING LOGIC BASED ON YOUR SCHEMA ---
  const filteredData = (data || []).filter(item => {
    // 1. Sunday View: Logic based on your "Sunday Hours" column
    if (view === 'Sunday') {
      return Number(item["Sunday Hours"]) > 0;
    }

    // 2. Standard Views (Weekly/Monthly)
    // Exclude records that have Sunday Hours from the main cycle tabs
    if (Number(item["Sunday Hours"]) > 0) return false;

    return item["Payment Cycle"] === view;
  });

  // --- SUMMATION ---
  const groupedData = filteredData.reduce((acc: any[], current: any) => {
    const staffId = current["Employee Id"];
    const existing = acc.find(item => item["Employee Id"] === staffId);
    
    const dailyPay = Number(current["Daily Pay"]) || 0;
    const hours = Number(current["Total Hours"]) || 0;

    if (existing) {
      existing.total_due += dailyPay;
      existing.total_hours += hours;
    } else {
      acc.push({ ...current, total_due: dailyPay, total_hours: hours });
    }
    return acc;
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-8 rounded-[2rem] flex flex-col md:flex-row justify-between items-center text-white shadow-xl">
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-tighter">Kenstar Payouts</h2>
          <p className="text-green-400 text-[9px] font-black uppercase tracking-widest mt-1">{view} Terminal</p>
        </div>
        <div className="flex gap-1 bg-white/10 p-1 rounded-xl">
          {['Weekly', 'Sunday', 'Monthly', 'History'].map(v => (
            <button key={v} onClick={() => setView(v as any)} 
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${view === v ? 'bg-white text-slate-900' : 'text-slate-400'}`}>
              {v}
            </button>
          ))}
        </div>
      </div>

      {view !== 'History' ? (
        <>
          <div className="bg-blue-600 p-8 rounded-[2rem] text-white shadow-2xl max-w-sm border-l-8 border-white/20">
            <p className="text-[10px] font-black uppercase opacity-70 mb-1">{view} Accumulation</p>
            <h3 className="text-4xl font-black italic tracking-tighter">
              KSh {groupedData.reduce((sum, i) => sum + i.total_due, 0).toLocaleString()}
            </h3>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50 border-b">
                <tr className="text-[10px] font-black uppercase text-slate-400">
                  <th className="p-6">Staff Member</th>
                  <th className="p-6 text-center">Hours</th>
                  <th className="p-6 text-right">KSh Due</th>
                  <th className="p-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {groupedData.length === 0 ? (
                  <tr><td colSpan={4} className="p-20 text-center font-black text-slate-300 uppercase text-xs">No pending {view} payouts</td></tr>
                ) : groupedData.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="p-6">
                      <div className="font-black text-slate-900 uppercase text-sm">{item["Employee Name"]}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">{item["Shop"]}</div>
                    </td>
                    <td className="p-6 text-center font-bold text-slate-600">{item.total_hours.toFixed(1)}h</td>
                    <td className="p-6 text-right font-black text-slate-900 text-lg">KSh {item.total_due.toLocaleString()}</td>
                    <td className="p-6 text-right">
                      <button onClick={() => handleMarkAsPaid(item)} className="p-3 text-green-600 bg-green-50 rounded-2xl hover:bg-green-600 hover:text-white transition-all">
                        <CheckCircle size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-[2rem] p-6 divide-y border shadow-sm">
          {histLoading ? (
            <div className="p-20 flex justify-center"><Loader2 className="animate-spin text-[#007a43]" /></div>
          ) : historyData.length === 0 ? (
            <div className="p-20 text-center text-xs font-black text-slate-300 uppercase">Archive Empty</div>
          ) : historyData.map((h, i) => (
            <div key={i} className="p-6 flex justify-between items-center">
              <div>
                <div className="font-black text-slate-800 uppercase text-sm">{h["Employee Name"]}</div>
                <div className="text-[9px] text-slate-400 font-bold uppercase">{h.created_at ? new Date(h.created_at).toLocaleDateString() : ''} • {h["Cycle Type"]}</div>
              </div>
              <div className="font-black text-green-600 text-lg">KSh {h["Amount Paid"]?.toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};