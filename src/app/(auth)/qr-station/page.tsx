"use client";

import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Printer, MapPin, Smartphone, ChevronLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function QRStation() {
  const [selectedShop, setSelectedShop] = useState<any | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // PERMANENT FIX: All shops centered on Umoja 1 Market coordinates
  const shops = [
    { 
      id: '315', 
      name: 'Shop 315', 
      color: 'bg-blue-600', 
      lat: -1.2825, 
      lng: 36.8967 
    },
    { 
      id: '172', 
      name: 'Shop 172', 
      color: 'bg-slate-900', 
      lat: -1.2825, 
      lng: 36.8967 
    },
    { 
      id: 'Stage', 
      name: 'Stage Outlet', 
      color: 'bg-green-600', 
      lat: -1.2825, // Updated from -1.2845 to match market
      lng: 36.8967  // Updated from 36.8950 to match market
    }
  ];

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  const terminalUrl = (shop: any) => 
    `${baseUrl}/terminal?branch=${shop.id}&lat=${shop.lat}&lng=${shop.lng}`;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans selection:bg-blue-100">
      <div className="max-w-4xl mx-auto mb-12 print:hidden">
        <Link href="/admin" className="text-slate-400 hover:text-blue-600 flex items-center gap-2 font-black text-[10px] uppercase mb-8 transition-all group">
          <ChevronLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> 
          Back to Command Center
        </Link>
        
        <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-lg">
                <ShieldCheck size={24} />
            </div>
            <div>
                <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">QR Terminal Station</h1>
                <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Provisioning Authorized Branch Access</p>
            </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        {shops.map((shop) => (
          <button
            key={shop.id}
            onClick={() => setSelectedShop(shop)}
            className={`p-8 rounded-[3rem] border-4 transition-all text-left group flex flex-col items-start relative ${
              selectedShop?.id === shop.id 
                ? 'border-blue-600 bg-white shadow-2xl scale-105' 
                : 'border-white bg-white shadow-sm hover:border-slate-200 hover:shadow-xl'
            }`}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg ${shop.color} group-hover:rotate-6 transition-transform`}>
              <MapPin size={28} />
            </div>
            <h3 className="font-black uppercase text-lg text-slate-900 tracking-tighter">{shop.name}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest group-hover:text-blue-600 transition-colors">
              Prepare Poster
            </p>
          </button>
        ))}
      </div>

      {selectedShop && (
        <div className="mt-16 flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
          <button 
            onClick={() => window.print()}
            className="print:hidden mb-12 bg-blue-600 text-white px-12 py-6 rounded-[2rem] font-black uppercase text-xs flex items-center gap-4 hover:bg-slate-900 transition-all shadow-2xl shadow-blue-500/30 active:scale-95"
          >
            <Printer size={20} /> Print {selectedShop.name} Official Poster
          </button>

          {/* PRINTABLE POSTER AREA */}
          <div className="bg-white w-[210mm] min-h-[297mm] p-16 flex flex-col items-center justify-between border-[20px] border-slate-900 print:shadow-none print:border-[15px] print:m-0 shadow-[0_0_80px_rgba(0,0,0,0.1)] rounded-[4rem] print:rounded-none">
            <div className="text-center">
              <h2 className="text-8xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">KENSTAR <span className="text-blue-600">OPS</span></h2>
              <div className="h-4 w-48 bg-blue-600 mx-auto mt-8 rounded-full"></div>
              <p className="text-2xl font-black uppercase tracking-[0.4em] text-slate-400 mt-10">Authorized Staff Point</p>
            </div>

            <div className="flex flex-col items-center space-y-12">
               <div className="p-12 bg-white border-8 border-slate-50 rounded-[5rem] shadow-inner">
                  <QRCode 
                    value={terminalUrl(selectedShop)} 
                    size={420} 
                    level="H" 
                  />
               </div>
               <div className="text-center">
                  <div className="inline-block bg-slate-900 text-white px-10 py-4 rounded-3xl mb-6">
                    <p className="text-xl font-black uppercase tracking-[0.2em]">Live Branch Terminal</p>
                  </div>
                  <h3 className="text-8xl font-black uppercase text-slate-900 tracking-tighter italic drop-shadow-sm">{selectedShop.name}</h3>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-12 w-full border-t-8 border-slate-50 pt-20">
              <div className="flex flex-col items-center text-center">
                <Smartphone className="mb-6 text-blue-600" size={56} />
                <p className="text-sm font-black uppercase tracking-tighter text-slate-900">1. Scan with Phone</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 h-14 flex items-center justify-center">
                  <span className="text-5xl font-black text-blue-600 italic">PIN</span>
                </div>
                <p className="text-sm font-black uppercase tracking-tighter text-slate-900">2. Enter Secret PIN</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <CheckCircle2 className="text-blue-600" size={56} />
                <p className="text-sm font-black uppercase tracking-tighter text-slate-900">3. Log Attendance</p>
              </div>
            </div>
            
            <p className="text-[12px] font-black text-slate-300 uppercase tracking-[0.5em] mt-10">
              Kenstar Enterprise Security Protocol v3.0
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}