"use client";
import React from "react";
import { Printer, X, ShieldCheck, Wallet, CheckCircle2 } from "lucide-react";

export const AttendanceReport = ({ staffName, staffId, records, reportType, totalPay, selectedDate, onClose }: any) => {
  
  const handlePrint = () => {
    window.print();
  };

  const getReportTitle = () => {
    const d = new Date(selectedDate);
    if (reportType === 'sunday') return `Sunday Payout Statement`;
    if (reportType === 'weekly') return `Weekly Earnings Summary`;
    return `Monthly Statement: ${d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-xl flex items-center justify-center p-4 print:p-0 print:static print:bg-white animate-in fade-in duration-300">
      {/* CRITICAL: Force visibility for print engines with !important */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          #printable-report-container, #printable-report-container * { visibility: visible !important; }
          #printable-report-container { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important;
            height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}} />

      <div id="printable-report-container" className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:rounded-none border border-white/20">
        
        {/* ACTION BAR (Hidden on Print) */}
        <div className="p-6 bg-slate-900 flex justify-between items-center print:hidden border-b border-slate-800 no-print">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 bg-emerald-500 rounded-2xl flex items-center justify-center text-white">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-white font-black text-xs uppercase tracking-[0.2em]">Verified Terminal</h3>
              <p className="text-emerald-400 text-[9px] font-bold uppercase tracking-widest">Document Authenticated</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handlePrint} className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 transition-all active:scale-95">
              <Printer size={16} /> Print / Save as PDF
            </button>
            <button onClick={onClose} className="p-3 bg-slate-800 text-slate-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PRINTABLE AREA */}
        <div className="p-16 overflow-y-auto print:overflow-visible print:p-8">
          {/* HEADER */}
          <div className="flex justify-between items-start mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-2xl italic">K</div>
                <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 uppercase">
                  Kenstar <span className="text-emerald-600">Ops</span>
                </h1>
              </div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.4em]">Payroll Terminal</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">Official Record</div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Issued: {new Date().toLocaleDateString('en-GB')}</p>
            </div>
          </div>

          {/* TOTAL PAY CARD */}
          <div className="bg-slate-900 rounded-[2.5rem] p-10 mb-10 text-white relative overflow-hidden">
             <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div>
                   <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Beneficiary</p>
                   <h2 className="text-4xl font-black uppercase tracking-tight italic">{staffName}</h2>
                   <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">Employee ID: {staffId}</p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 text-center md:text-right min-w-[200px]">
                   <p className="text-emerald-400 text-[9px] font-black uppercase tracking-[0.2em] mb-1">{getReportTitle()}</p>
                   <p className="text-4xl font-black italic tracking-tighter text-white">
                     <span className="text-lg mr-1 text-white/30 font-normal">Ksh</span>{Number(totalPay || 0).toLocaleString()}
                   </p>
                </div>
             </div>
          </div>

          {/* TABLE */}
          <div className="space-y-6">
            <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-widest border-b-2 border-slate-100 pb-3">Session Activity</h4>
            <table className="w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-[9px] font-black uppercase text-slate-400 tracking-widest">
                  <th className="px-4 pb-2">Date</th>
                  <th className="px-4 pb-2">Log</th>
                  <th className="px-4 pb-2 text-right">Earned</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r: any, i: number) => (
                  <tr key={i} className="bg-slate-50/80">
                    <td className="px-4 py-4 rounded-l-2xl border-y border-l border-slate-100">
                      <p className="text-xs font-black text-slate-900 uppercase">{r.Date}</p>
                    </td>
                    <td className="px-4 py-4 border-y border-slate-100">
                       <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                          <span>{r["Time In"] || '--:--'}</span>
                          <span className="text-slate-300">→</span>
                          <span>{r["Time Out"] || '--:--'}</span>
                       </div>
                    </td>
                    <td className="px-4 py-4 rounded-r-2xl text-right border-y border-r border-slate-100">
                      <p className="text-xs font-black text-emerald-700 italic">
                        {Number(r.earned || 0).toLocaleString()}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* FOOTER */}
          <div className="mt-16 flex justify-between items-end border-t border-slate-200 pt-8">
             <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ref: KS-SYSTEM-{staffId}</p>
             </div>
             <div className="text-right">
                <p className="text-[11px] font-black uppercase text-slate-900 italic tracking-tighter">Kenstar Uniforms Ltd</p>
                <p className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md inline-block uppercase mt-1">Verified Digital Transcript</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};