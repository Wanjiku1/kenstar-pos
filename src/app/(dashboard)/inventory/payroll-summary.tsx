"use client";

import React, { useState, useEffect } from 'react';
import { Wallet, CheckCircle, Clock, History, Search, RotateCcw, Download, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const PayoutHub = ({ data, onRefresh }: { data: any[], onRefresh?: () => void }) => {
  const [view, setView] = useState<'Weekly' | 'Sunday' | 'Monthly' | 'History'>('Weekly');
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (view === 'History') {
      fetchHistory();
    }
  }, [view]);

  const fetchHistory = async () => {
    setLoading(true);
    const { data: hist, error } = await supabase
      .from('payout_history')
      .select('*')
      .order('settlement_date', { ascending: false })
      .limit(100);
    
    if (!error) setHistoryData(hist);
    setLoading(false);
  };

  const handleMarkAsPaid = async (item: any) => {
    const confirmPay = window.confirm(`Confirm payment of KSh ${Math.round(item.total_due).toLocaleString()} to ${item["Employee Name"]}?`);
    if (!confirmPay) return;

    try {
      const { error: histError } = await supabase.from('payout_history').insert([{
        "Employee Id": item["Employee Id"],
        "Employee Name": item["Employee Name"],
        "Shop": item["Shop"],
        "Amount Paid": item.total_due,
        "Cycle Type": view,
        "Period End": new Date().toISOString().split('T')[0]
      }]);

      if (histError) throw histError;

      const { error: attError } = await supabase
        .from('attendance')
        .update({ "Is Paid": true })
        .match({ "Employee Id": item["Employee Id"], "Is Paid": false });

      if (attError) throw attError;

      alert("Payment finalized and archived.");
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // CLEANUP TOOL: REVERT PAYMENT
  const handleRevertPayment = async (past: any) => {
    const confirmRevert = window.confirm(
      `REVERT PAYMENT: This will delete this history record and move ${past["Employee Name"]} back to the pending due list. Continue?`
    );
    if (!confirmRevert) return;

    try {
      const { error: delError } = await supabase.from('payout_history').delete().eq('id', past.id);
      if (delError) throw delError;

      // Note: This logic assumes you want to revert all "Paid" status for this specific employee
      const { error: attError } = await supabase
        .from('attendance')
        .update({ "Is Paid": false })
        .match({ "Employee Id": past["Employee Id"], "Is Paid": true });

      if (attError) throw attError;

      alert("Record deleted and staff returned to due list.");
      fetchHistory();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert("Revert failed: " + err.message);
    }
  };

  // EXPORT TO CSV
  const exportToCSV = () => {
    const headers = ["Employee Name,Shop,Amount Paid,Date,Cycle\n"];
    const rows = historyData.map(h => 
      `${h["Employee Name"]},${h["Shop"]},${h["Amount Paid"]},${h.settlement_date},${h["Cycle Type"]}\n`
    );
    const blob = new Blob([headers.concat(rows).join("")], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Kenstar_Payout_History_${new Date().toLocaleDateString()}.csv`;
    a.click();
  };

  const filteredHistory = historyData.filter(h => 
    h["Employee Name"]?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    h["Shop"]?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const payrollList = data || [];
  const filteredData = payrollList.filter(item => {
    if (view === 'Sunday') return item.is_sunday_today === true; 
    return item["Payment Cycle"] === view;
  });

  return (
    <div className="relative z-50 space-y-6 p-4">
      {/* HEADER SECTION */}
      <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col md:flex-row justify-between items-center shadow-lg border-b-4 border-green-500 gap-4">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Kenstar Payouts</h2>
          <p className="text-green-400 text-[10px] font-black uppercase tracking-widest mt-1">
            {view === 'History' ? "Past Settlement Archives" : "Pending Payroll Terminal"}
          </p>
        </div>
        
        <div className="flex bg-white/10 p-1 rounded-xl overflow-x-auto">
          {['Weekly', 'Sunday', 'Monthly', 'History'].map((type: any) => (
            <button 
              key={type}
              onClick={() => setView(type)} 
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap ${view === type ? 'bg-white text-slate-900' : 'text-slate-400'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {view === 'History' ? (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 bg-slate-50 border-b flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-64">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search history..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all">
              <Download size={14}/> Export CSV
            </button>
          </div>

          <div className="divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
            {loading ? <p className="p-10 text-center text-xs font-bold text-slate-400">Loading archives...</p> : 
             filteredHistory.map((past, i) => (
              <div key={i} className="p-6 flex justify-between items-center hover:bg-slate-50 group">
                <div>
                  <div className="font-black text-slate-800 uppercase text-sm">{past["Employee Name"]}</div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase">
                    {past["Shop"]} • Paid {new Date(past.settlement_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-black text-green-600 text-lg">KSh {past["Amount Paid"]?.toLocaleString()}</div>
                    <div className="text-[8px] bg-slate-100 px-2 py-0.5 rounded font-black uppercase text-slate-500">{past["Cycle Type"]}</div>
                  </div>
                  <button 
                    onClick={() => handleRevertPayment(past)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                    title="Revert Payment"
                  >
                    <RotateCcw size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="bg-blue-600 p-6 rounded-[2rem] text-white shadow-xl max-w-sm">
            <p className="text-[10px] font-black uppercase opacity-80">{view} Total Due</p>
            <h3 className="text-3xl font-black italic">
              KSh {filteredData.reduce((acc, curr) => acc + (curr.total_due || 0), 0).toLocaleString()}
            </h3>
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase">Staff Member</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase text-center">Hours</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase text-right">KSh Due</th>
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.length === 0 ? (
                  <tr><td colSpan={4} className="p-10 text-center text-xs font-bold text-slate-400">No pending payouts.</td></tr>
                ) : filteredData.map((item, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="p-6">
                      <div className="font-black text-slate-800 uppercase text-sm">{item["Employee Name"]}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase">{item["Shop"]} • {item["Roles"]}</div>
                    </td>
                    <td className="p-6 text-center font-bold text-slate-600">{item.total_hours?.toFixed(1)}h</td>
                    <td className="p-6 text-right font-black text-slate-900 text-lg">
                      KSh {item.total_due?.toLocaleString()}
                    </td>
                    <td className="p-6 text-right">
                      <button onClick={() => handleMarkAsPaid(item)} className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-all shadow-sm">
                        <CheckCircle size={18}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};