"use client";

import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { Printer, MapPin, Smartphone, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function QRStation() {
  const [selectedShop, setSelectedShop] = useState<any | null>(null);
  
  // Updated with your provided coordinates
  const shops = [
    { 
      id: '315', 
      name: 'Shop 315', 
      color: 'bg-blue-600', 
      lat: -1.2841054429337717, 
      lng: 36.88731212229706 
    },
    { 
      id: '172', 
      name: 'Shop 172', 
      color: 'bg-slate-900', 
      lat: -1.2841054429337717, // Same as 315
      lng: 36.88731212229706 
    },
    { 
      id: 'Stage', 
      name: 'Stage Outlet', 
      color: 'bg-green-600', 
      lat: -1.2838701169767366, 
      lng: 36.88786582236666 
    }
  ];

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  
  // Updated URL: Passes the branch ID and the coordinates required for the fence
  const terminalUrl = (shop: any) => 
    `${baseUrl}/terminal?branch=${shop.id}&lat=${shop.lat}&lng=${shop.lng}`;

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto mb-12 print:hidden">
        <Link href="/" className="text-slate-400 hover:text-slate-900 flex items-center gap-2 font-bold text-[10px] uppercase mb-8 transition-colors">
          <ChevronLeft size={14} /> Back to Manager Dashboard
        </Link>
        <h1 className="text-4xl font-black italic uppercase tracking-tighter text-slate-900">QR Terminal Station</h1>
        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Generate and print branch-specific clock-in posters</p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        {shops.map((shop) => (
          <button
            key={shop.id}
            onClick={() => setSelectedShop(shop)}
            className={`p-8 rounded-[2.5rem] border-2 transition-all text-left group flex flex-col items-start ${
              selectedShop?.id === shop.id 
                ? 'border-blue-600 bg-white shadow-2xl scale-105' 
                : 'border-transparent bg-white shadow-sm hover:border-slate-200 hover:shadow-md'
            }`}
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg ${shop.color}`}>
              <MapPin size={24} />
            </div>
            <h3 className="font-black uppercase text-sm text-slate-900">{shop.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider group-hover:text-blue-500 transition-colors">
              Click to View Poster
            </p>
          </button>
        ))}
      </div>

      {selectedShop && (
        <div className="mt-16 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => window.print()}
            className="print:hidden mb-8 bg-slate-900 text-white px-10 py-5 rounded-2xl font-black uppercase text-xs flex items-center gap-3 hover:bg-blue-600 transition-all shadow-xl active:scale-95"
          >
            <Printer size={18} /> Print {selectedShop.name} Poster
          </button>

          <div className="bg-white w-[210mm] h-[297mm] p-16 flex flex-col items-center justify-between border-[24px] border-slate-900 print:shadow-none print:border-[15px] print:m-0 shadow-2xl">
            <div className="text-center">
              <h2 className="text-7xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">KENSTAR OPS</h2>
              <div className="h-3 w-40 bg-blue-600 mx-auto mt-6"></div>
              <p className="text-2xl font-black uppercase tracking-[0.3em] text-slate-400 mt-8">Official Staff Terminal</p>
            </div>

            <div className="flex flex-col items-center space-y-10">
               <div className="p-10 bg-white border-[2px] border-slate-100 rounded-[4rem] shadow-sm">
                  <QRCode 
                    value={terminalUrl(selectedShop)} 
                    size={380} 
                    level="H" 
                  />
               </div>
               <div className="text-center">
                 <h3 className="text-6xl font-black uppercase text-slate-900 tracking-tighter italic">{selectedShop.name}</h3>
                 <p className="text-xl font-bold text-slate-400 uppercase mt-4 tracking-widest italic">Authorized Personnel Only</p>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-12 w-full border-t-4 border-slate-100 pt-16">
              <div className="flex flex-col items-center text-center">
                <Smartphone className="mb-4 text-blue-600" size={48} />
                <p className="text-xs font-black uppercase tracking-tighter">1. Scan with Phone</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 flex items-center justify-center mb-4">
                  <span className="text-3xl font-black text-blue-600 italic">PIN</span>
                </div>
                <p className="text-xs font-black uppercase tracking-tighter">2. Enter Staff PIN</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <CheckCircle2 className="text-blue-600" size={48} />
                <p className="text-xs font-black uppercase tracking-tighter">3. Record Shift</p>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-4">
              System Powered by KenstarOps ERP v2.0
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckCircle2(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}