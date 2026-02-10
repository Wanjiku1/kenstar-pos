"use client";
import { Printer, X, FileText, CheckCircle2, AlertCircle, Package, Clock } from "lucide-react";

export const AttendanceReport = ({ staffName, staffId, records, onClose }: any) => {
  // --- CALCULATIONS FOR SUMMARY ---
  const totalDays = records.length;
  const lates = records.filter((r: any) => r.status === 'Late').length;
  // Count both 'On Time' and 'Overtime' as successful attendance
  const onTime = records.filter((r: any) => r.status === 'On Time').length;
  const overtimes = records.filter((r: any) => r.status === 'Overtime').length;

  // --- CSV DOWNLOAD LOGIC ---
  const downloadCSV = () => {
    const headers = ["Date", "Status", "Time In", "Time Out"];
    const rows = records.map((r: any) => [
      r.Date,
      r.status,
      r["Time In"] || "-",
      r["Time Out"] || "-"
    ].join(","));

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Kenstar_${staffId}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:max-h-none print:shadow-none print:rounded-none">
        
        {/* ACTION BAR - Hidden on Print */}
        <div className="p-6 bg-slate-50 border-b flex justify-between items-center print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-xl text-white">
              <FileText size={20} />
            </div>
            <h3 className="font-black uppercase text-xs tracking-widest text-slate-900">Admin Archive Report</h3>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={downloadCSV}
              className="bg-white border border-slate-200 text-slate-600 px-4 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 hover:bg-slate-100 transition-all"
            >
              <Package size={14} /> CSV
            </button>
            <button 
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg transition-all"
            >
              <Printer size={14} /> WhatsApp PDF
            </button>
            <button onClick={onClose} className="p-3 bg-slate-200 text-slate-600 rounded-2xl hover:bg-red-100 hover:text-red-600 transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* THE ACTUAL REPORT CONTENT */}
        <div className="p-10 overflow-y-auto print:overflow-visible" id="printable-report">
          {/* LOGO & HEADER */}
          <div className="flex justify-between items-start mb-10 border-b-4 border-slate-900 pb-8">
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter text-slate-900 leading-none">
                KENSTAR <span className="text-blue-600">OPS</span>
              </h1>
              <p className="text-[10px] font-bold uppercase text-slate-500 tracking-[0.3em] mt-1">Verified Attendance Log</p>
            </div>
            <div className="text-right">
              <p className="font-black uppercase text-xs text-slate-900">Attendance Archive</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed">Generated: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* STAFF INFO BOX */}
          <div className="bg-slate-50 rounded-3xl p-6 mb-8 border border-slate-100 flex justify-between items-center">
            <div>
              <p className="text-[9px] font-black text-blue-600 uppercase mb-1">Employee Name</p>
              <p className="text-xl font-black text-slate-900 uppercase">{staffName}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-blue-600 uppercase mb-1">Staff ID</p>
              <p className="text-xl font-black text-slate-900 uppercase">{staffId}</p>
            </div>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-3 gap-4 mb-8">
             <div className="bg-green-50 border border-green-100 p-4 rounded-3xl flex flex-col items-center text-center">
                <CheckCircle2 size={20} className="text-green-600 mb-2" />
                <p className="text-[8px] font-black text-green-600 uppercase">On Time</p>
                <p className="text-xl font-black text-slate-900">{onTime}</p>
             </div>
             <div className="bg-red-50 border border-red-100 p-4 rounded-3xl flex flex-col items-center text-center">
                <AlertCircle size={20} className="text-red-600 mb-2" />
                <p className="text-[8px] font-black text-red-600 uppercase">Lates</p>
                <p className="text-xl font-black text-slate-900">{lates}</p>
             </div>
             <div className="bg-blue-50 border border-blue-100 p-4 rounded-3xl flex flex-col items-center text-center">
                <Clock size={20} className="text-blue-600 mb-2" />
                <p className="text-[8px] font-black text-blue-600 uppercase">Overtime</p>
                <p className="text-xl font-black text-slate-900">{overtimes}</p>
             </div>
          </div>

          {/* TABLE */}
          <table className="w-full">
            <thead>
              <tr className="text-left border-b-2 border-slate-100">
                <th className="py-4 text-[10px] font-black uppercase text-slate-400">Date</th>
                <th className="py-4 text-[10px] font-black uppercase text-slate-400 text-center">Status</th>
                <th className="py-4 text-[10px] font-black uppercase text-slate-400 text-right">In / Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.map((r: any, i: number) => (
                <tr key={i} className="group">
                  <td className="py-4 text-xs font-bold text-slate-700">
                    {new Date(r.Date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-4 text-center">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${
                      r.status === 'On Time' ? 'bg-green-100 text-green-700' : 
                      r.status === 'Late' ? 'bg-red-100 text-red-700' : 
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-4 text-right text-xs font-black text-slate-900 font-mono">
                    {r["Time In"] || "--:--"} / {r["Time Out"] || "--:--"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* FOOTER */}
          <div className="mt-12 pt-8 border-t border-dashed border-slate-200 text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic leading-relaxed">
              Strict 7AM/8AM Shift Enforcement.<br/>
              System Powered by KenstarOps ERP v3.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};