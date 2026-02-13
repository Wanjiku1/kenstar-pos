"use client";

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { Download, MapPin, Smartphone, ChevronLeft, ShieldCheck, Printer, Info, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function QRStation() {
  const [selectedShop, setSelectedShop] = useState<any | null>(null);
  const [mounted, setMounted] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const shops = [
    { id: '315', name: 'Kenstar 315', color: 'bg-[#007a43]', lat: -1.283519, lng: 36.887452 },
    { id: '172', name: 'Kenstar 172', color: 'bg-slate-900', lat: -1.283215, lng: 36.887374 },
    { id: 'Stage', name: 'Stage Outlet', color: 'bg-[#007a43]', lat: -1.283971, lng: 36.887177 }
  ];

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  const terminalUrl = (shop: any) => 
    `${baseUrl}/terminal?branch=${shop.id}`;

  const downloadPDF = async () => {
    if (!posterRef.current) return;
    const canvas = await html2canvas(posterRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save(`Kenstar-QR-${selectedShop.id}.pdf`);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans selection:bg-green-100">
      <div className="max-w-4xl mx-auto mb-12 print:hidden">
        <Link href="/admin" className="text-slate-400 hover:text-[#007a43] flex items-center gap-2 font-black text-[10px] uppercase mb-8 transition-all group">
          <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
          Back to Command Center
        </Link>
        
        <div className="flex items-center gap-4">
            <div className="bg-[#007a43] p-3 rounded-2xl text-white shadow-lg">
                <ShieldCheck size={24} />
            </div>
            <div>
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">QR Terminal Station</h1>
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Provisioning Authorized Branch Access</p>
            </div>
        </div>
      </div>

      {/* SHOP SELECTION GRID */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        {shops.map((shop) => (
          <button
            key={shop.id}
            onClick={() => setSelectedShop(shop)}
            className={`p-8 rounded-[3rem] border-4 transition-all text-left group flex flex-col items-start relative ${
              selectedShop?.id === shop.id 
                ? 'border-[#007a43] bg-white shadow-2xl scale-105' 
                : 'border-white bg-white shadow-sm hover:border-slate-200 hover:shadow-xl'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg ${shop.color}`}>
              <MapPin size={28} />
            </div>
            <h3 className="font-black uppercase text-lg text-slate-900 tracking-tighter">{shop.name}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest group-hover:text-[#007a43]">Select Branch</p>
          </button>
        ))}
      </div>

      {selectedShop && (
        <div className="mt-16 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8">
          <div className="flex gap-4 print:hidden mb-12">
            <button 
              onClick={() => window.print()}
              className="bg-slate-900 text-white px-8 py-5 rounded-2xl font-black uppercase text-xs flex items-center gap-3 hover:bg-black transition-all"
            >
              <Printer size={18} /> Print Now
            </button>
            <button 
              onClick={downloadPDF}
              className="bg-[#007a43] text-white px-8 py-5 rounded-2xl font-black uppercase text-xs flex items-center gap-3 hover:bg-green-800 transition-all shadow-xl shadow-green-500/20"
            >
              <Download size={18} /> Download PDF
            </button>
          </div>

          {/* POSTER PREVIEW */}
          <div 
            ref={posterRef}
            className="bg-white w-[210mm] min-h-[297mm] p-16 flex flex-col items-center justify-between border-[16px] border-[#007a43] shadow-2xl rounded-3xl print:rounded-none print:border-[10px]"
          >
            <div className="text-center">
              <h2 className="text-7xl font-black italic uppercase tracking-tighter text-slate-900">
                KENSTAR <span className="text-[#007a43]">UNIFORMS</span>
              </h2>
              <p className="text-xl font-black uppercase tracking-[0.4em] text-slate-400 mt-4">Authorized Staff Terminal</p>
            </div>

            <div className="flex flex-col items-center">
               <div className="p-10 bg-white border-[12px] border-slate-50 rounded-[4rem]">
                  <QRCode 
                    value={terminalUrl(selectedShop)} 
                    size={380} 
                    level="H"
                  />
               </div>
               <h3 className="text-7xl font-black uppercase text-slate-900 tracking-tighter italic mt-8">{selectedShop.name}</h3>
            </div>

            {/* STEP BY STEP GUIDE */}
            <div className="w-full grid grid-cols-3 gap-8 border-t-4 border-slate-100 pt-12">
              <div className="text-center space-y-3">
                <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-[#007a43] font-black">1</div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Step One</p>
                <p className="text-sm font-black uppercase text-slate-800">Scan QR Code with Phone</p>
              </div>
              <div className="text-center space-y-3">
                <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-[#007a43] font-black">2</div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Step Two</p>
                <p className="text-sm font-black uppercase text-slate-800">Enter Staff ID & Secret PIN</p>
              </div>
              <div className="text-center space-y-3">
                <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-[#007a43] font-black">3</div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Step Three</p>
                <p className="text-sm font-black uppercase text-slate-800">Select Shift & Clock In</p>
              </div>
            </div>

            <div className="w-full flex justify-between items-center mt-10 p-6 bg-slate-50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Info size={20} className="text-[#007a43]"/>
                <p className="text-[9px] font-bold uppercase text-slate-500 leading-tight">
                  Must be within 50m of shop.<br/>Records sync automatically.
                </p>
              </div>
              <p className="text-[10px] font-black text-slate-300 uppercase italic">Kenstar Ops v3.0</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}