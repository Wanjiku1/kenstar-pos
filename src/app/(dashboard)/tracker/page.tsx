"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import { 
  Search, CheckCircle2, ChevronRight, Package, 
  AlertTriangle, Send, Box, ArrowLeft, Phone, User, 
  Info, MessageSquare, DollarSign, X, Tags, Clock, Truck
} from "lucide-react";
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

// 1. Define the Component
function OrderTracker() {
  const router = useRouter(); 
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null); 

  const fetchData = async () => {
    const { data: ords } = await supabase.from('production_tasks').select(`
      *, 
      sales(*), 
      product_variants(size, products(name))
    `).order('created_at', { ascending: false });
    
    const { data: inv } = await supabase.from('material_inventory').select('*');
    
    if (ords) setOrders(ords);
    if (inv) setInventory(inv);
  };

  useEffect(() => { fetchData(); }, []);

  const pushProcurementAlert = async (materialName: string) => {
    const { error } = await supabase.from('production_alerts').insert([{
      material_name: materialName,
      priority: 'urgent',
      status: 'pending',
      notes: 'Logistics: Critical for fulfilling orders'
    }]);
    if (!error) toast.success(`Restock request sent for ${materialName}`);
  };

  return (
    <div className="flex h-screen bg-[#020617] text-slate-200 overflow-hidden font-sans">
      
      {/* MAIN TRACKING AREA */}
      <main className="flex-1 overflow-y-auto p-10">
        <header className="mb-10 flex justify-between items-center bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-800/50 shadow-2xl">
          <div className="flex items-center gap-5">
            <button onClick={() => router.back()} className="p-3 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-all">
              <ArrowLeft size={20}/>
            </button>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Kenstar <span className="text-emerald-500">Logistics</span></h1>
              <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Fulfillment Control Center</p>
            </div>
          </div>
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18}/>
            <input 
              placeholder="Search Customer or Ref..." 
              className="w-full bg-black/40 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-emerald-500 outline-none transition-all"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        <div className="space-y-4">
          {orders.filter(o => o.sales?.payment_ref?.toLowerCase().includes(search.toLowerCase())).map(order => (
             <div 
               key={order.id} 
               onClick={() => setSelectedOrder(order)}
               className="bg-slate-900/40 p-8 rounded-[3rem] border border-slate-800 flex items-center justify-between group hover:border-emerald-500/30 transition-all cursor-pointer shadow-sm"
             >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">#{order.sales?.payment_ref || 'TRK-99'}</span>
                    {order.sales?.discount_amount > 0 && <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded text-[8px] font-black">BARGAIN</span>}
                  </div>
                  <h3 className="text-xl font-black uppercase italic text-white leading-none">{order.product_variants?.products?.name}</h3>
                  <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase">SIZE {order.product_variants?.size} • {new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                
                {/* 6-STAGE TRACKER */}
                <div className="flex-[1.5] flex gap-2 px-10">
                   {['making', 'trimming', 'buttons', 'ironing', 'branding', 'ready'].map((s, i) => {
                     const stages = ['making', 'trimming', 'buttons', 'ironing', 'branding', 'ready'];
                     const stageIndex = stages.indexOf(order.current_stage);
                     const isCurrent = i === stageIndex;
                     return (
                       <div key={s} className="flex-1 flex flex-col gap-2">
                         <div className={`h-1.5 rounded-full transition-all duration-700 ${i <= stageIndex ? 'bg-emerald-500' : 'bg-slate-800'} ${isCurrent ? 'animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.6)]' : ''}`} />
                         <span className={`text-[7px] font-black uppercase text-center ${isCurrent ? 'text-white' : 'text-slate-600'}`}>{s}</span>
                       </div>
                     );
                   })}
                </div>

                <div className="flex-1 text-right">
                  <button className="p-4 bg-slate-800 rounded-2xl group-hover:bg-emerald-600 transition-all text-white">
                    <ChevronRight size={20}/>
                  </button>
                </div>
             </div>
          ))}
        </div>
      </main>

      {/* MATERIAL SIDEBAR */}
      <aside className="w-[400px] bg-black border-l border-slate-800 p-10 flex flex-col">
        <div className="flex items-center gap-4 mb-10">
           <div className="p-4 bg-emerald-500/10 rounded-[1.5rem] text-emerald-500"><Box size={24}/></div>
           <div>
             <h2 className="text-sm font-black uppercase tracking-widest text-white">Fabric Inventory</h2>
             <p className="text-[9px] font-bold text-slate-500 uppercase">Workshop Check</p>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {inventory.map(item => (
            <div key={item.id} className={`p-6 rounded-[2rem] border transition-all ${item.current_stock < 5 ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-900/30 border-slate-800'}`}>
               <div className="flex justify-between items-start mb-4">
                 <div>
                   <p className="text-xs font-black uppercase text-white truncate w-40">{item.material_name}</p>
                   <p className={`text-[10px] font-black mt-1 ${item.current_stock < 5 ? 'text-red-500' : 'text-slate-500'}`}>
                     {item.current_stock} {item.unit} LEFT
                   </p>
                 </div>
                 {item.current_stock < 5 && (
                   <button 
                    onClick={() => pushProcurementAlert(item.material_name)}
                    className="p-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all"
                   >
                     <Send size={16}/>
                   </button>
                 )}
               </div>
               <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                 <div 
                   className={`h-full transition-all duration-1000 ${item.current_stock < 5 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                   style={{ width: `${Math.min(100, (item.current_stock / 50) * 100)}%` }}
                 />
               </div>
            </div>
          ))}
        </div>
      </aside>

      {/* MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="bg-[#0f172a] w-full max-w-3xl rounded-[4rem] border border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-12 space-y-8">
              <div className="flex justify-between items-start">
                <div className="flex gap-4 items-center text-white">
                  <div className="p-5 bg-white rounded-3xl text-black"><User size={28}/></div>
                  <div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">Order Detail</h2>
                    <p className="text-xs font-bold text-slate-500">Ref: {selectedOrder.sales?.payment_ref}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-4 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-all text-white">
                  <X size={20}/>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 text-white">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2"><Phone size={12}/> Contact</p>
                    <p className="text-lg font-black">07XX XXX XXX</p>
                    <button className="mt-3 text-[9px] font-black text-emerald-500 uppercase flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                      <MessageSquare size={12}/> SMS Notification
                    </button>
                  </div>
                  <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 text-white">
                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3 flex items-center gap-2"><DollarSign size={12}/> Bargain Summary</p>
                    <div className="space-y-2">
                       <div className="flex justify-between text-xs font-bold"><span className="text-slate-400">Discount:</span> <span className="text-orange-500">KES {selectedOrder.sales?.discount_amount}</span></div>
                       <div className="flex justify-between text-sm pt-2 border-t border-slate-800 font-black"><span className="text-white uppercase">Balance Due:</span> <span className="text-white font-mono">KES {selectedOrder.sales?.balance_amount}</span></div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 p-8 rounded-[3rem] border border-white/5 text-white">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Info size={12}/> Tailoring</p>
                  <p className="text-sm font-bold text-slate-300 italic leading-relaxed">
                    {selectedOrder.sales?.production_specs || "No tailoring notes."}
                  </p>
                  <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest mt-6 mb-4 flex items-center gap-2"><Tags size={12}/> Branding</p>
                  <p className="text-sm font-bold text-slate-300 italic leading-relaxed">
                    {selectedOrder.sales?.branding_specs || "Standard Branding"}
                  </p>
                </div>
              </div>

              <button className="w-full bg-emerald-600 h-24 rounded-[3rem] font-black uppercase tracking-[0.3em] text-xs text-white shadow-2xl hover:bg-emerald-500 transition-all">
                 Mark as Dispatched / Ready for Pickup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 2. The Final Export Rule (CRITICAL for Next.js 16)
export default OrderTracker;