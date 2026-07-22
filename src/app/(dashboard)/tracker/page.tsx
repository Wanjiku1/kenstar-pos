"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import { 
  Search, ChevronRight, Package, AlertTriangle, Send, Box, 
  ArrowLeft, User, Info, X, Tags, Truck, Scissors, 
  Layers, RefreshCcw, ShieldCheck, CheckCircle2, PlusCircle
} from "lucide-react";
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

const LOGISTICS_STAFF = [
  { id: "KU004", name: "Quinter" },
  { id: "KU009", name: "Tabitha" }
];

const WORKSHOP_TAILORS = ["Ibrah", "Sinthia", "Jane", "Eugene","Alphonce"];
const STEPS = ['making', 'trimming', 'buttons', 'ironing', 'branding', 'ready'];

export default function FullySyncedEnterpriseTracker() {
  const router = useRouter(); 
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [activeRequests, setActiveRequests] = useState<any[]>([]); 
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null); 
  const [loading, setLoading] = useState(false);

  // States for the Dedicated Custom Material Form
  const [customMaterialName, setCustomMaterialName] = useState('');
  const [customMaterialQty, setCustomMaterialQty] = useState(15);
  const [customMaterialUnit, setCustomMaterialUnit] = useState('meters');
  const [customFormLoading, setCustomFormLoading] = useState(false);

  // Layout View States
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [activeStaffId, setActiveStaffId] = useState('');
  const [currentStaff, setCurrentStaff] = useState<any>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('all');
  const [todayStaffName, setTodayStaffName] = useState('');

  const getSupervisorForDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "Quinter"; 
    const targetDate = new Date(dateString);
    const dayCount = Math.floor(targetDate.getTime() / (1000 * 60 * 60 * 24));
    return dayCount % 2 === 0 ? "Quinter" : "Tabitha";
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      setTodayStaffName(getSupervisorForDate(todayStr));

      const { data: ords, error: ordsError } = await supabase
        .from('production_tasks')
        .select(`
          *,
          sale_items (
            id,
            sales (
              id,
              payment_ref,
              is_custom_order,
              production_specs,
              branding_specs,
              balance_amount,
              collection_status
            )
          ),
          product_variants (
            id,
            size,
            products (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (ordsError) console.error("Query structural error:", ordsError);

      const { data: inv } = await supabase.from('raw_materials').select('*').order('name', { ascending: true });
      
      const { data: reqs } = await supabase
        .from('procurement_requests')
        .select('*')
        .in('status', ['pending', 'ordered']);

      if (ords) setOrders(ords);
      if (inv) setInventory(inv);
      if (reqs) setActiveRequests(reqs);
    } catch (err) {
      toast.error("Failed to sync live server records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  useEffect(() => {
    const matched = LOGISTICS_STAFF.find(s => s.id === activeStaffId);
    setCurrentStaff(matched || null);
    setFilterMode(matched ? 'mine' : 'all');
  }, [activeStaffId]);

  const handleAllocateTailor = async (taskId: string, tailorName: string) => {
    const { error } = await supabase.from('production_tasks').update({ assigned_tailor: tailorName }).eq('id', taskId);
    if (!error) {
      toast.success(`Job successfully allocated to ${tailorName}`);
      fetchData();
    }
  };

  const handleMilestoneClick = async (taskId: string, stageName: string) => {
    const { error } = await supabase.from('production_tasks').update({ current_stage: stageName }).eq('id', taskId);
    if (!error) {
      toast.success(`Stage advanced to ${stageName.toUpperCase()}`);
      fetchData();
    }
  };

  // Standard Catalog Replenishment
  const toggleProcurementStatus = async (materialItem: any) => {
    const existingRequest = activeRequests.find(r => r.material_id === materialItem.id);

    if (!existingRequest) {
      const metaEnvelope = {
        source: 'Tracker Terminal',
        message: `🚨 DEPLETED INVENTORY: Production line core requires restocking for standard item: ${materialItem.name}.`
      };

      const { error } = await supabase
        .from('procurement_requests')
        .insert([
          {
            material_id: materialItem.id,
            custom_material_name: materialItem.name,
            quantity_needed: 15, 
            status: 'pending',
            requested_by: currentStaff?.name || 'Logistics Tracker',
            notes: JSON.stringify(metaEnvelope)
          }
        ]);
      
      if (error) {
        toast.error(`Database Rejected Alert: ${error.message}`);
      } else {
        toast.success(`Replenishment alert dispatched for catalog item ${materialItem.name}`);
        fetchData(); 
      }
    } else {
      const adjustedStock = parseFloat(materialItem.current_stock || 0) + parseFloat(existingRequest.quantity_needed || 15);

      await supabase.from('raw_materials').update({ current_stock: adjustedStock }).eq('id', materialItem.id);

      const { error } = await supabase
        .from('procurement_requests')
        .update({ status: 'received' })
        .eq('id', existingRequest.id);

      if (error) {
        toast.error(`Update error: ${error.message}`);
      } else {
        toast.success(`✅ Material stock arrival acknowledged for ${materialItem.name}!`);
        fetchData();
      }
    }
  };

  // Launch Clean One-Off Request
  const handleCreateCustomMaterialRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMaterialName.trim()) {
      toast.error("Please specify an explicit custom material identifier name.");
      return;
    }

    setCustomFormLoading(true);
    try {
      const metaEnvelope = {
        source: 'Tracker Terminal (Custom Entry Form)',
        message: `🛠️ WORKSHOP SPECIAL ORDER: Dedicated request for unlisted item.`
      };

      const { error } = await supabase
        .from('procurement_requests')
        .insert([
          {
            material_id: null, 
            custom_material_name: customMaterialName.trim().toUpperCase(),
            quantity_needed: customMaterialQty,
            status: 'pending',
            requested_by: currentStaff?.name || 'Logistics Tracker',
            notes: JSON.stringify(metaEnvelope)
          }
        ]);

      if (error) throw error;

      toast.success(`🎯 Custom Request for "${customMaterialName.toUpperCase()}" launched safely!`);
      setCustomMaterialName('');
      setCustomMaterialQty(15);
      fetchData();
    } catch (err: any) {
      toast.error(`Failed to dispatch custom request: ${err.message}`);
    } finally {
      setCustomFormLoading(false);
    }
  };

  const handlePushToPOSFloor = async (order: any) => {
    try {
      await supabase.from('production_tasks').update({ current_stage: 'ready', status: 'completed' }).eq('id', order.id);
      if (order.sale_items?.sales?.id) {
        await supabase.from('sales').update({ collection_status: 'ready' }).eq('id', order.sale_items.sales.id);
      }
      toast.success("Job completed. Sent to front counter distribution queues!");
      setSelectedOrder(null);
      fetchData();
    } catch (err) {
      toast.error("Database status sync exception error.");
    }
  };

  const filteredOrders = orders.filter(order => {
    const paymentRef = order.sale_items?.sales?.payment_ref || '';
    const productName = order.product_variants?.products?.name || order.notes || 'Custom Apparel Piece';
    const matchesSearch = paymentRef.toLowerCase().includes(search.toLowerCase()) || productName.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filterMode === 'all') return true;
    return getSupervisorForDate(order.created_at) === currentStaff?.name;
  });

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      
      {/* SIDEBAR NAVIGATION - BRANDS PERFECTLY WITH BRAND VALUES */}
      <aside className="w-80 bg-slate-900 text-slate-200 p-8 flex flex-col justify-between flex-shrink-0">
        <div className="space-y-8">
          <div>
            <div className="flex items-center gap-3">
              <button onClick={() => router.back()} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-all text-white">
                <ArrowLeft size={16}/>
              </button>
              <div>
                <h1 className="text-lg font-black uppercase tracking-tight text-white">Kenstar<span className="text-emerald-500">Ops</span></h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Logistics Desk</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700/60 p-5 rounded-2xl space-y-3">
            <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">Logged In Agent</label>
            <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-700">
              <User size={14} className="text-slate-400 ml-1"/>
              <select 
                className="bg-transparent text-white font-bold text-xs outline-none w-full cursor-pointer"
                value={activeStaffId}
                onChange={e => setActiveStaffId(e.target.value)}
              >
                <option value="" className="text-slate-900">-- View Mode: Unassigned --</option>
                {LOGISTICS_STAFF.map(s => <option key={s.id} value={s.id} className="text-slate-900">{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <button 
              onClick={() => setFilterMode('mine')}
              disabled={!currentStaff}
              className={`w-full p-3.5 rounded-xl text-left text-xs font-black uppercase tracking-wider flex items-center justify-between transition-all ${filterMode === 'mine' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30'}`}
            >
              <span>🎯 My Day's Orders</span>
              <ShieldCheck size={14}/>
            </button>

            <button 
              onClick={() => setFilterMode('all')}
              className={`w-full p-3.5 rounded-xl text-left text-xs font-black uppercase tracking-wider flex items-center justify-between transition-all ${filterMode === 'all' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              <span>🌐 View All Orders ({orders.length})</span>
              <Layers size={14}/>
            </button>

            <button 
              onClick={() => setIsInventoryOpen(true)}
              className="w-full mt-4 p-3.5 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-200 hover:text-white rounded-xl text-left text-xs font-black uppercase tracking-wider flex items-center justify-between transition-all shadow-sm"
            >
              <span>📦 Check Inventory Stock</span>
              <Box size={14} className="text-emerald-400"/>
            </button>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Today's Duty Roster Active</p>
          <div className="text-sm font-black text-white mt-1 uppercase tracking-wide">
             ⭐ <span className="text-emerald-400">{todayStaffName || "Calculating..."}</span>
          </div>
        </div>
      </aside>
      
      {/* MAIN CONSOLE AREA */}
      <main className="flex-1 overflow-y-auto p-10 bg-slate-50">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Production Tracker Deck</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Spacious wide monitoring lanes tracking direct factory workshop assignments</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                placeholder="Search Payment Ref or Product..." 
                className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold outline-none text-slate-800 focus:border-emerald-500 transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button onClick={fetchData} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600 shadow-sm">
              <RefreshCcw size={14} className={loading ? 'animate-spin text-emerald-600' : ''}/>
            </button>
          </div>
        </header>

        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-24 bg-white border border-dashed border-slate-200 rounded-2xl text-slate-400">
              <Package size={40} className="mx-auto mb-2 text-slate-300"/>
              <p className="text-xs font-black uppercase tracking-wider">No active fabric tasks found matching workspace filters.</p>
            </div>
          ) : (
            filteredOrders.map(order => {
              const currentStage = order.current_stage || 'making';
              const orderAssignedSupervisor = getSupervisorForDate(order.created_at);
              const calculatedItemName = order.product_variants?.products?.name || order.notes || "Custom Tailored Apparel Item";
              const isCustomOrder = order.sale_items?.sales?.is_custom_order;

              return (
                <div 
                  key={order.id} 
                  className="bg-white p-6 rounded-2xl border border-slate-200/70 hover:border-slate-300 shadow-sm flex items-center justify-between gap-8 transition-all"
                >
                  <div className="w-72 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono font-black text-slate-600 bg-slate-100 px-2 py-0.5 border border-slate-200 rounded">
                        {order.sale_items?.sales?.payment_ref || 'CUSTOM_REF'}
                      </span>
                      {isCustomOrder && (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[8px] font-black tracking-wider">Custom</span>
                      )}
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${orderAssignedSupervisor === 'Quinter' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                        Owner: {orderAssignedSupervisor}
                      </span>
                    </div>
                    <h3 className="text-sm font-black uppercase text-slate-900 truncate">{calculatedItemName}</h3>
                    <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                      SIZE: {order.product_variants?.size || 'Custom Measure'} • Ingested: {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'Today'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex-shrink-0">
                    <Scissors size={12} className="text-slate-400 ml-1"/>
                    <select 
                      className="bg-transparent text-slate-700 font-black text-[10px] uppercase outline-none cursor-pointer w-36"
                      value={order.assigned_tailor || 'Unallocated'}
                      onChange={e => handleAllocateTailor(order.id, e.target.value)}
                    >
                      <option value="Unallocated">-- Allocate Tailor --</option>
                      {WORKSHOP_TAILORS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="flex-1 flex gap-2 px-2">
                    {STEPS.map((stepName, i) => {
                      const stageIndex = STEPS.indexOf(currentStage);
                      const isDone = i <= stageIndex;
                      const isCurrent = i === stageIndex;

                      return (
                        <div 
                          key={stepName} 
                          className="flex-1 flex flex-col gap-1.5 cursor-pointer group"
                          onClick={() => handleMilestoneClick(order.id, stepName)}
                        >
                          <div className={`h-2 rounded-full transition-all duration-300 ${isDone ? 'bg-emerald-500' : 'bg-slate-200'} ${isCurrent ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`} />
                          <span className={`text-[9px] font-black uppercase text-center tracking-tight ${isCurrent ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`}>
                            {stepName}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex-shrink-0 pl-2">
                    <button onClick={() => setSelectedOrder(order)} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-all text-slate-700 shadow-sm">
                      <ChevronRight size={14}/>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* INVENTORY DRAWER - MATED PERFECTLY TO EMERALD BRANDING RULES */}
      {isInventoryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-xs flex justify-end">
          <div className="w-100 bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 border-l border-slate-200">
            
            <div className="p-6 border-b flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2.5">
                <Box size={18} className="text-emerald-400"/>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide">Material Hub</h3>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Procurement Connected</p>
                </div>
              </div>
              <button onClick={() => setIsInventoryOpen(false)} className="p-2 bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-all">
                <X size={16}/>
              </button>
            </div>

            {/* INTEGRATED CLEAN FORM FOR ONE-OFF FABRIC / ACCESSORY ENTRIES */}
            <div className="p-5 bg-white border-b border-slate-200/80 space-y-3">
              <div className="flex items-center gap-1.5 text-slate-800 text-[10px] font-black uppercase tracking-widest">
                <PlusCircle size={12} className="text-emerald-500" /> Request One-Off / Unlisted Fabric Item
              </div>
              
              <form onSubmit={handleCreateCustomMaterialRequest} className="space-y-2">
                <input
                  type="text"
                  placeholder="EXACT material name (e.g., BLACK THREAD)"
                  value={customMaterialName}
                  onChange={e => setCustomMaterialName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 placeholder:text-slate-400 transition-all"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={customMaterialQty}
                    onChange={e => setCustomMaterialQty(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 transition-all"
                  />
                  <select
                    value={customMaterialUnit}
                    onChange={e => setCustomMaterialUnit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 cursor-pointer text-left"
                  >
                    <option value="meters">Meters</option>
                    <option value="rolls">Rolls</option>
                    <option value="boxes">Boxes</option>
                    <option value="pieces">Pieces</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={customFormLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-wider text-[10px] h-9 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40"
                >
                  <Send size={12}/> Dispatch Special Request
                </button>
              </form>
            </div>

            {/* CATALOG REPLENISHMENT LANES */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3.5 bg-slate-50">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">Standard Catalog Items</div>
              {inventory.map(item => {
                const stockLevel = parseFloat(item.current_stock || 0);
                const lowStock = stockLevel < 10;
                
                const activeReq = activeRequests.find(r => r.material_id === item.id);

                return (
                  <div key={item.id} className={`p-4 rounded-xl border transition-all bg-white shadow-xs ${lowStock ? 'border-amber-200' : 'border-slate-200/60'}`}>
                    <div className="flex justify-between items-start mb-2.5">
                      <div>
                        <p className="text-xs font-black uppercase text-slate-800 truncate w-44">{item.name}</p>
                        <p className={`text-[10px] font-black mt-0.5 uppercase ${lowStock ? 'text-amber-600' : 'text-slate-400'}`}>
                          {stockLevel} {item.unit || 'meters'} available
                        </p>
                      </div>

                      <button 
                        onClick={() => toggleProcurementStatus(item)}
                        className={`p-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-white ${
                          activeReq 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                      >
                        {activeReq ? (
                          <>
                            <CheckCircle2 size={12}/> {activeReq.status === 'ordered' ? 'En Route' : 'Pending'}
                          </>
                        ) : (
                          <>
                            <RefreshCcw size={12}/> Restock
                          </>
                        )}
                      </button>
                    </div>
                    
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${lowStock ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                        style={{ width: `${Math.min(100, (stockLevel / 50) * 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PRODUCTION PARAMETERS MODAL OVERLAY */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start border-b pb-4">
                <div className="flex gap-3 items-center">
                  <div className="p-2.5 bg-slate-100 rounded-xl text-slate-800"><User size={16}/></div>
                  <div>
                    <h2 className="text-base font-black uppercase text-slate-900">Custom Order Parameters</h2>
                    <p className="text-[10px] font-mono font-bold text-slate-400">REF ID: {selectedOrder.sale_items?.sales?.payment_ref || 'N/A'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all text-slate-600">
                  <X size={14}/>
                </button>
              </div>

              <div className="space-y-4">
                {Number(selectedOrder.sale_items?.sales?.balance_amount) > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2 text-amber-800 text-[11px] font-bold">
                    <AlertTriangle size={14} className="text-amber-600 flex-shrink-0"/>
                    <span>Collectable Balance Pending: KES {selectedOrder.sale_items.sales.balance_amount} required at front counter.</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-xl border">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Info size={10}/> Tailoring Specs</p>
                    <p className="text-xs font-bold font-mono uppercase text-slate-700 bg-white p-2.5 border rounded h-40 overflow-y-auto whitespace-pre-wrap">
                      {selectedOrder.sale_items?.sales?.production_specs || "No custom sizing metrics recorded."}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1 flex items-center gap-1"><Tags size={10}/> Branding Specs</p>
                    <p className="text-xs font-bold font-mono uppercase text-slate-700 bg-white p-2.5 border rounded h-40 overflow-y-auto whitespace-pre-wrap">
                      {selectedOrder.sale_items?.sales?.branding_specs || "Standard Branding Parameters."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex flex-col gap-2">
                <button 
                  onClick={() => handlePushToPOSFloor(selectedOrder)}
                  className="w-full bg-emerald-600 h-12 rounded-xl font-black uppercase tracking-wider text-xs text-white shadow-md hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  <Truck size={14}/> Complete Job & Dispatch to POS Floor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}