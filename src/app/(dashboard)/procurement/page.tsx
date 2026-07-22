"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Package, AlertCircle, ArrowLeft, RefreshCcw, 
  Plus, ClipboardList, CheckCircle2, Truck, User, 
  ImageIcon, MessageSquare, X, Eye
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function RestockTerminal() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'requests' | 'inventory'>('requests');
  const [procurementRequests, setProcurementRequests] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Lightbox Media Preview State
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // New Material Registry Modal Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ name: '', current_stock: '', cost_per_unit: '', unit: 'meters' });

  // Load unified operational matrix logs from Supabase
  const loadProcurementSystemData = async () => {
    setLoading(true);
    try {
      // 1. Fetch incoming procurement pipelines triggered across modules
      const { data: requests, error: reqErr } = await supabase
        .from('procurement_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (reqErr) throw reqErr;

      // 2. Fetch full operational raw material stock lines
      const { data: materials, error: matErr } = await supabase
        .from('raw_materials')
        .select('*')
        .order('name', { ascending: true });

      if (matErr) throw matErr;
      if (materials) setRawMaterials(materials);

      if (requests && materials) {
        const enrichedRequests = requests.map(req => {
          let systemSource = 'POS Terminal';
          let itemMetadata: any = {};
          
          if (req.notes) {
            try {
              if (req.notes.trim().startsWith('{')) {
                itemMetadata = JSON.parse(req.notes);
                systemSource = itemMetadata.source || systemSource;
              }
            } catch (e) {
              // Gracefully treat as a regular raw text note line
            }
          }

          return {
            ...req,
            systemSource,
            itemMetadata,
            matchedMaterial: materials.find(m => m.id === req.material_id)
          };
        });
        setProcurementRequests(enrichedRequests);
      }

    } catch (err: any) {
      toast.error(`Ecosystem Sync failure: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProcurementSystemData();
  }, []);

  // Update pipeline lifecycle state and auto-sync physical workshop storage units
  const handleUpdateStatus = async (request: any, newStatus: 'ordered' | 'received') => {
    try {
      if (newStatus === 'received') {
        const addedQty = parseFloat(request.quantity_needed) || 10;
        let targetMaterialId = request.material_id;

        // Auto-Onboard unrecognized fabric profiles into your permanent raw inventory registry
        if (!targetMaterialId && request.custom_material_name) {
          const { data: existingMat } = await supabase
            .from('raw_materials')
            .select('id')
            .eq('name', request.custom_material_name)
            .maybeSingle();

          if (existingMat) {
            targetMaterialId = existingMat.id;
          } else {
            const { data: generatedMat, error: insertMatErr } = await supabase
              .from('raw_materials')
              .insert([{
                name: request.custom_material_name,
                current_stock: 0,
                cost_per_unit: 0,
                unit: 'meters'
              }])
              .select()
              .single();

            if (insertMatErr) throw insertMatErr;
            targetMaterialId = generatedMat.id;
          }
        }

        const { data: materialProfile } = await supabase
          .from('raw_materials')
          .select('current_stock')
          .eq('id', targetMaterialId)
          .single();

        const adjustedStock = parseFloat(materialProfile?.current_stock || 0) + addedQty;

        const { error: stockUpdateErr } = await supabase
          .from('raw_materials')
          .update({ current_stock: adjustedStock })
          .eq('id', targetMaterialId);

        if (stockUpdateErr) throw stockUpdateErr;

        // HARMONIZATION LOOP: Free dependent tailor lines waiting on material allocations
        await supabase
          .from('production_tasks')
          .update({ status: 'pending' })
          .eq('status', 'awaiting_materials');
      }

      const { error: reqUpdateErr } = await supabase
        .from('procurement_requests')
        .update({ status: newStatus })
        .eq('id', request.id);

      if (reqUpdateErr) throw reqUpdateErr;

      toast.success(`Pipeline ticket item marked as successfully ${newStatus}`);
      loadProcurementSystemData();
    } catch (err: any) {
      toast.error(`State update execution block aborted: ${err.message}`);
    }
  };

  const handleAddNewMaterialLine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMaterial.name || !newMaterial.current_stock) return toast.error("Please supply valid configuration elements.");

    try {
      const { error } = await supabase.from('raw_materials').insert([{
        name: newMaterial.name,
        current_stock: parseFloat(newMaterial.current_stock),
        cost_per_unit: parseFloat(newMaterial.cost_per_unit) || 0,
        unit: newMaterial.unit
      }]);

      if (error) throw error;
      toast.success("New operational catalog asset initialized successfully.");
      setShowAddModal(false);
      setNewMaterial({ name: '', current_stock: '', cost_per_unit: '', unit: 'meters' });
      loadProcurementSystemData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const lowStockCount = rawMaterials.filter(m => parseFloat(m.current_stock) < 10).length;
  const pendingRequestsCount = procurementRequests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans text-slate-900 overflow-hidden h-screen">
      
      {/* SEAMLESS BRANDED SIDEBAR TERMINAL */}
      <aside className="w-80 bg-slate-900 p-8 text-white flex flex-col flex-shrink-0">
        <div className="mb-10">
          <h2 className="text-xl font-black italic uppercase tracking-tighter">Kenstar<span className="text-emerald-500">Ops</span></h2>
          <span className="text-[9px] bg-slate-800 text-slate-400 font-black tracking-widest px-2.5 py-1 rounded-md uppercase block mt-1 w-max">Unified Sourcing Hub</span>
        </div>
        
        <nav className="space-y-3 flex-1">
          <button 
            onClick={() => setActiveTab('requests')}
            className={`w-full text-left p-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-between transition-all ${activeTab === 'requests' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <span className="flex items-center gap-3"><ClipboardList size={16}/> Central Alerts Feed</span>
            {pendingRequestsCount > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">{pendingRequestsCount}</span>}
          </button>
          
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`w-full text-left p-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-between transition-all ${activeTab === 'inventory' ? 'bg-emerald-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <span className="flex items-center gap-3"><Package size={16}/> Raw Fabric Storage</span>
            {lowStockCount > 0 && <span className="bg-amber-500 text-slate-900 text-[10px] px-2 py-0.5 rounded-full font-black">{lowStockCount} LOW</span>}
          </button>
        </nav>
        
        <button onClick={() => router.back()} className="p-4 text-slate-500 hover:text-white font-bold text-sm flex items-center gap-2 mt-auto transition-colors">
          <ArrowLeft size={16}/> Return to Desktop
        </button>
      </aside>

      {/* CORE WORKSPACE ENTRY POINT */}
      <main className="flex-1 p-10 overflow-y-auto flex flex-col">
        
        <header className="flex justify-between items-center mb-10 flex-shrink-0">
          <div>
            <h1 className="text-3xl font-black tracking-tight uppercase text-slate-900">
              {activeTab === 'requests' ? 'Omni-Channel Alerts' : 'Warehouse Inventory'}{' '}
              <span className="text-emerald-600">{activeTab === 'requests' ? 'Grid' : 'Ledger'}</span>
            </h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-1.5">
              <RefreshCcw size={12} className={loading ? 'animate-spin text-emerald-600' : ''}/> 
              Aggregating live pipelines from checkout terminals, tailors, and sales systems
            </p>
          </div>
          
          <div className="flex gap-4">
            <Button onClick={loadProcurementSystemData} variant="outline" className="h-14 px-5 rounded-xl border bg-white shadow-sm font-bold text-xs uppercase">
               <RefreshCcw size={14}/>
            </Button>
            <Button onClick={() => setShowAddModal(true)} className="bg-slate-900 hover:bg-slate-800 text-white h-14 px-8 rounded-xl font-black uppercase text-xs shadow-md">
              <Plus size={16} className="mr-2"/> Add Raw Profile
            </Button>
          </div>
        </header>

        {/* WORKSPACE SWITCHER VIEWS */}
        <div className="flex-1">
          {activeTab === 'requests' ? (
            <div className="space-y-4">
              {procurementRequests.length === 0 ? (
                <div className="bg-white rounded-3xl border border-dashed p-16 text-center text-slate-400">
                   <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-3"/>
                   <p className="font-black text-xs uppercase tracking-wider">All supply pipelines clear. No outstanding logs found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {procurementRequests.map(req => {
                    const isAdHoc = !req.material_id;
                    const materialLabel = isAdHoc ? req.custom_material_name : req.matchedMaterial?.name;
                    
                    // Unpack structural attachment nodes passed across terminals
                    const attachmentUrl = req.itemMetadata?.attachmentUrl || null;
                    const collectionDate = req.itemMetadata?.collectionDate || req.itemMetadata?.dueDate || null;
                    const customMeasurements = req.itemMetadata?.measurements || null;
                    const displayMessage = req.itemMetadata?.message || (req.notes?.trim().startsWith('{') ? 'Custom order configuration spec' : req.notes);
                    
                    const sourceColors: Record<string, string> = {
                      'POS Terminal': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                      'Factory Line': 'bg-blue-100 text-blue-800 border-blue-200',
                      'Tracker Terminal': 'bg-purple-100 text-purple-800 border-purple-200',
                      'Sales Feed': 'bg-orange-100 text-orange-800 border-orange-200'
                    };

                    return (
                      <div key={req.id} className={`bg-white border p-6 rounded-3xl shadow-sm flex flex-col justify-between transition-all ${req.status === 'pending' ? 'border-amber-200 bg-amber-50/20' : 'border-slate-100'}`}>
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider ${
                              req.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                              req.status === 'ordered' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {req.status}
                            </span>
                            
                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 border rounded-md tracking-wider ${sourceColors[req.systemSource] || 'bg-slate-100 text-slate-800'}`}>
                              {req.systemSource}
                            </span>
                          </div>

                          <div className="flex gap-4 items-start">
                            {/* MATERIAL REFERENCE BLUEPRINT BLOCK */}
                            {attachmentUrl ? (
                              <button 
                                onClick={() => setPreviewImageUrl(attachmentUrl)}
                                className="w-20 h-20 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-400 transition-all flex-shrink-0 group overflow-hidden relative shadow-sm"
                                type="button"
                              >
                                <img src={attachmentUrl} className="w-full h-full object-cover absolute inset-0 group-hover:scale-110 transition-transform" alt="Material Snapshot" />
                                <div className="absolute inset-0 bg-slate-900/30 group-hover:bg-slate-900/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye size={18} className="text-white" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-20 h-20 rounded-2xl border border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-300 flex-shrink-0">
                                <ImageIcon size={24} />
                                <span className="text-[8px] font-black uppercase mt-1">No Image</span>
                              </div>
                            )}

                            <div className="flex-1">
                              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight line-clamp-2">{materialLabel}</h3>
                              <p className="text-xs text-slate-500 font-bold mt-0.5 uppercase">Volume Needed: {req.quantity_needed} {req.matchedMaterial?.unit || 'meters'}</p>
                              
                              {/* TIMELINE DUE ACTION INSIGNIA */}
                              {collectionDate && (
                                <div className="mt-2 text-[11px] font-black uppercase tracking-tight flex items-center gap-1 text-orange-600">
                                  <span className="bg-orange-100 px-2 py-0.5 rounded">COLLECT ON: {collectionDate}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {displayMessage && (
                            <div className="bg-slate-50 p-3 rounded-xl border text-[11px] font-medium text-slate-600 mt-4 flex items-start gap-2">
                               <MessageSquare size={14} className="text-slate-400 flex-shrink-0 mt-0.5"/>
                               <span className="break-words">{displayMessage}</span>
                            </div>
                          )}

                          {customMeasurements && (
                            <div className="mt-2 bg-slate-900 text-slate-300 p-2.5 rounded-xl font-mono text-[10px] uppercase">
                              <div>SPECS / MEASUREMENTS: <span className="text-white font-bold">{customMeasurements}</span></div>
                            </div>
                          )}
                        </div>

                        {/* DISPATCH ACTION LOG Matrix */}
                        <div className="border-t pt-4 mt-6 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-1.5 text-slate-400">
                             <User size={12}/>
                             <span className="text-[10px] font-black uppercase">Issuer: {req.requested_by || 'Terminal Agent'}</span>
                          </div>

                          <div className="flex gap-2">
                            {req.status === 'pending' && (
                              <Button size="sm" onClick={() => handleUpdateStatus(req, 'ordered')} className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase h-9 rounded-lg">
                                <Truck size={12} className="mr-1"/> Confirm Order
                              </Button>
                            )}
                            {(req.status === 'pending' || req.status === 'ordered') && (
                              <Button size="sm" onClick={() => handleUpdateStatus(req, 'received')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase h-9 rounded-lg">
                                <CheckCircle2 size={12} className="mr-1"/> Arrived at Workshop
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* WAREHOUSE CONTROL LEDGER MATRIX */
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-6">Component Specification</th>
                    <th className="p-6">Cost Value</th>
                    <th className="p-6">Physical Level Stock</th>
                    <th className="p-6">Status Indicator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {rawMaterials.map(mat => {
                    const isLow = parseFloat(mat.current_stock) < 10;
                    return (
                      <tr key={mat.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-6 font-black text-slate-900 uppercase text-xs">{mat.name}</td>
                        <td className="p-6 text-xs font-mono font-bold">KES {parseFloat(mat.cost_per_unit).toLocaleString()}</td>
                        <td className="p-6">
                          <span className={`font-black text-xs px-2.5 py-1 rounded ${isLow ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                            {mat.current_stock} {mat.unit || 'meters'}
                          </span>
                        </td>
                        <td className="p-6">
                          {isLow ? (
                            <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full uppercase flex items-center gap-1 w-max">
                              <AlertCircle size={12}/> Shortage Alert
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full uppercase flex items-center gap-1 w-max">
                              <CheckCircle2 size={12}/> Stabilized
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* HIGH-RES LIGHTBOX BLUEPRINT MODAL */}
        {previewImageUrl && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <button onClick={() => setPreviewImageUrl(null)} className="absolute top-6 right-6 text-white bg-slate-800 p-3 rounded-full hover:bg-slate-700 transition-colors shadow-xl">
              <X size={24}/>
            </button>
            <div className="max-w-3xl max-h-[80vh] bg-white p-3 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 border">
              <img src={previewImageUrl} className="w-full h-full max-h-[75vh] object-contain rounded-2xl" alt="Custom Design Pattern Snapshot" />
            </div>
            <p className="text-slate-400 font-bold text-xs uppercase mt-4 tracking-widest">Custom Material Design Reference Canvas</p>
          </div>
        )}

        {/* ONBOARD NEW MATERIAL SPEC SHEET MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <div className="bg-white rounded-[2rem] shadow-2xl border max-w-md w-full p-8 animate-in zoom-in-95 duration-150">
              <div className="border-b pb-4 mb-6">
                <h3 className="text-lg font-black uppercase text-slate-900">Register Warehouse <span className="text-emerald-600">Component</span></h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Append base component logs into master storage registry</p>
              </div>

              <form onSubmit={handleAddNewMaterialLine} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Material Description</label>
                  <input required placeholder="e.g. Super-Khaki Maroon Mix" className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold outline-none" value={newMaterial.name} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Opening Stock</label>
                    <input required type="number" placeholder="0.00" className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold outline-none" value={newMaterial.current_stock} onChange={e => setNewMaterial({...newMaterial, current_stock: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Unit Type</label>
                    <input placeholder="meters" className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold outline-none" value={newMaterial.unit} onChange={e => setNewMaterial({...newMaterial, unit: e.target.value})} />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Unit Purchase Cost (KES)</label>
                  <input type="number" placeholder="0" className="w-full bg-slate-50 border p-3 rounded-xl text-xs font-bold outline-none" value={newMaterial.cost_per_unit} onChange={e => setNewMaterial({...newMaterial, cost_per_unit: e.target.value})} />
                </div>

                <div className="pt-4 flex gap-3 border-t">
                  <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="flex-1 h-12 rounded-xl text-xs uppercase font-black tracking-wider">
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-12 rounded-xl text-xs uppercase font-black tracking-wider">
                    Save Asset
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}