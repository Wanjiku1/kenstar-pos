"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Package, AlertCircle, TrendingDown, ArrowLeft, RefreshCcw, Plus, ShoppingCart } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';

export default function RestockTerminal() {
  const router = useRouter();
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLowStock = async () => {
    setLoading(true);
    // Fetch items where current stock < reorder level
    const { data } = await supabase.from('material_inventory').select('*').lt('current_stock', 10);
    if (data) setLowStock(data);
    setLoading(false);
  };

  useEffect(() => { fetchLowStock(); }, []);

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex">
      {/* SIDEBAR SIDEBAR */}
      <aside className="w-72 bg-slate-900 p-8 text-white flex flex-col">
        <h2 className="text-xl font-black italic uppercase mb-10">Kenstar<span className="text-orange-500">Logistics</span></h2>
        <nav className="space-y-2 flex-1">
          <button className="w-full text-left p-4 rounded-xl bg-orange-600 font-bold flex items-center gap-3"><TrendingDown size={18}/> Low Stock</button>
          <button className="w-full text-left p-4 rounded-xl hover:bg-slate-800 text-slate-400 flex items-center gap-3"><Package size={18}/> Full Inventory</button>
        </nav>
        <button onClick={() => router.back()} className="p-4 text-slate-500 flex items-center gap-2"><ArrowLeft size={18}/> Back</button>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-black italic text-slate-900 uppercase">Restock <span className="text-orange-600">Needed</span></h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
              <AlertCircle size={14} className="text-red-500"/> {lowStock.length} Items are below critical level
            </p>
          </div>
          <Button onClick={() => {}} className="bg-[#007a43] hover:bg-[#005c32] h-16 px-10 rounded-2xl font-black uppercase text-xs shadow-lg shadow-emerald-900/20">
            <Plus className="mr-2"/> New Inventory Entry
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lowStock.map(item => (
            <div key={item.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-red-100 flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black text-red-500 uppercase mb-2">Critical Stock</p>
                <h3 className="text-xl font-black text-slate-900 uppercase">{item.material_name}</h3>
                <div className="mt-4 flex gap-4">
                  <div className="bg-slate-50 p-3 rounded-2xl flex-1 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Current</p>
                    <p className="text-lg font-black">{item.current_stock}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl flex-1 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Target</p>
                    <p className="text-lg font-black">50+</p>
                  </div>
                </div>
              </div>
              <Button className="mt-8 w-full h-14 bg-slate-900 rounded-2xl font-black uppercase text-[10px]">Restock Item</Button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}