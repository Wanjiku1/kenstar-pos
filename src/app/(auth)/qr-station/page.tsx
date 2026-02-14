"use client";

import React, { useState, useEffect, useRef } from 'react';
// Changed to QRCodeCanvas for better print/PDF support
import { QRCodeCanvas } from 'qrcode.react'; 
import { Download, MapPin, ChevronLeft, ShieldCheck, Printer, Info } from 'lucide-react';
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

  const getBaseUrl = () => (typeof window !== 'undefined' ? window.location.origin : '');

  // --- UPDATED DOWNLOAD LOGIC ---
  const downloadPDF = async () => {
    if (!posterRef.current || !selectedShop) return;
    
    try {
      // Small delay to ensure the Canvas is fully painted before capturing
      await new Promise(r => setTimeout(r, 200));

      const canvas = await html2canvas(posterRef.current, { 
        scale: 3, // Scale 3 is the perfect balance of sharp and reliable
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        // Force the capture to match the element size exactly
        width: posterRef.current.offsetWidth,
        height: posterRef.current.offsetHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, width, height);
      pdf.save(`KENSTAR-POSTER-${selectedShop.id.toUpperCase()}.pdf`);
    } catch (err) {
      console.error("PDF Generation Error:", err);
      alert("Could not generate PDF. Please use 'Print Now' and select 'Save as PDF' in the printer settings.");
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans selection:bg-green-100">
      {/* UI HEADER - Hidden during print */}
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
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Terminal Provisioning</h1>
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Generate physical posters for branch walls</p>
            </div>
        </div>
      </div>

      {/* SHOP SELECTION - Hidden during print */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        {shops.map((shop) => (
          <button
            key={shop.id}
            onClick={() => setSelectedShop(shop)}
            className={`p-8 rounded-[3rem] border-4 transition-all text-left group flex flex-col items-start relative ${
              selectedShop?.id === shop.id 
                ? 'border-[#007a43] bg-white shadow-2xl scale-105' 
                : 'border-white bg-white shadow-sm hover:border-slate-200'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg ${shop.color}`}>
              <MapPin size={28} />
            </div>
            <h3 className="font-black uppercase text-lg text-slate-900 tracking-tighter">{shop.name}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-1">Generate Poster</p>
          </button>
        ))}
      </div>

      {selectedShop && (
        <div className="mt-16 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8">
          {/* ACTION BUTTONS - Hidden during print */}
          <div className="flex gap-4 print:hidden mb-12">
            <button 
              onClick={() => window.print()}
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-3 hover:bg-black transition-all shadow-lg"
            >
              <Printer size={18} /> Print Now
            </button>
            <button 
              onClick={downloadPDF}
              className="bg-[#007a43] text-white px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-3 hover:bg-green-800 transition-all shadow-xl shadow-green-500/20"
            >
              <Download size={18} /> Download PDF
            </button>
          </div>

          {/* PHYSICAL POSTER - Optimized for A4 printing */}
          <div 
            ref={posterRef}
            className="bg-white w-[210mm] min-h-[297mm] p-16 flex flex-col items-center justify-between border-[20px] border-[#007a43] shadow-2xl rounded-3xl print:rounded-none print:border-[15px] print:shadow-none"
          >
            <div className="text-center">
              <h2 className="text-7xl font-black italic uppercase tracking-tighter text-slate-900">
                KENSTAR <span className="text-[#007a43]">UNIFORMS</span>
              </h2>
              <p className="text-xl font-black uppercase tracking-[0.4em] text-slate-400 mt-4">Authorized Staff Terminal</p>
            </div>

            <div className="flex flex-col items-center">
               <div className="p-12 bg-white border-[1px] border-slate-100 rounded-[4rem] shadow-2xl">
                 {/* UPDATED TO QRCodeCanvas - Printers and PDF generators prefer this over SVG */}
                 <QRCodeCanvas 
                    key={selectedShop.id}
                    value={`${getBaseUrl()}/terminal?branch=${selectedShop.id}&lat=${selectedShop.lat}&lng=${selectedShop.lng}`} 
                    size={400} 
                    level="H"
                    includeMargin={true}
                  />
               </div>
               <h3 className="text-8xl font-black uppercase text-slate-900 tracking-tighter italic mt-12">
                 {selectedShop.name}
               </h3>
               <div className="mt-4 flex items-center gap-2 text-slate-400 font-bold uppercase tracking-widest text-sm">
                 <MapPin size={16} /> GPS Check Enabled
               </div>
            </div>

            {/* INSTRUCTIONS FOR STAFF */}
            <div className="w-full grid grid-cols-3 gap-8 border-t-8 border-slate-50 pt-16">
              <div className="text-center space-y-4">
                <div className="bg-[#007a43] w-14 h-14 rounded-full flex items-center justify-center mx-auto text-white text-2xl font-black">1</div>
                <p className="text-lg font-black uppercase text-slate-800">Scan QR<br/><span className="text-xs text-slate-400 font-bold">Using Phone Camera</span></p>
              </div>
              <div className="text-center space-y-4">
                <div className="bg-[#007a43] w-14 h-14 rounded-full flex items-center justify-center mx-auto text-white text-2xl font-black">2</div>
                <p className="text-lg font-black uppercase text-slate-800">Enter PIN<br/><span className="text-xs text-slate-400 font-bold">Standard Staff ID</span></p>
              </div>
              <div className="text-center space-y-4">
                <div className="bg-[#007a43] w-14 h-14 rounded-full flex items-center justify-center mx-auto text-white text-2xl font-black">3</div>
                <p className="text-lg font-black uppercase text-slate-800">Done<br/><span className="text-xs text-slate-400 font-bold">Auto-Logged</span></p>
              </div>
            </div>

            <div className="w-full flex justify-between items-center p-8 bg-slate-50 rounded-3xl">
              <div className="flex items-center gap-4">
                <Info size={24} className="text-[#007a43]"/>
                <p className="text-xs font-bold uppercase text-slate-500 leading-tight">
                  Geo-fencing active. Staff must be on-site to clock in.<br/>Unauthorized scans are flagged to management.
                </p>
              </div>
              <p className="text-xs font-black text-slate-300 uppercase italic">Kenstar Management System v3.2</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}