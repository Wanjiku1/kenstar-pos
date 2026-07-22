"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Scissors, CheckCircle2, RefreshCcw, Printer, 
  ArrowRightLeft, Hammer, Timer, BarChart3,
  Sparkles, User, Users, ChevronRight, UserPlus,
  Eye, ImageIcon, X, Calendar, Phone, FileText, Ruler,
  Package // Added the missing Package icon import
} from 'lucide-react';
import { toast } from 'sonner';
import { RoleGate } from "@/components/auth/role-gate";

const WORKSHOP_TAILORS = ["Ibrah", "Sinthia", "Jane", "Eugene", "Alphonce"];
const BRANDING_OPERATORS = ["Quinter", "Tabitha"];

export default function LightFloorConsole() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dept, setDept] = useState<'workshop' | 'branding'>('workshop');
  const [activeWorker, setActiveWorker] = useState<string>('');
  const [showSharedPool, setShowSharedPool] = useState<boolean>(false);
  
  // High-Res Media Lightbox Preview State Modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('production_tasks')
        .select(`
          *,
          product_variants (
            id,
            size,
            products (
              name
            )
          ),
          sale_items (
            id,
            sales (
              id,
              is_custom_order,
              balance_amount,
              created_at,
              branding_specs,
              production_specs
            )
          )
        `)
        .eq('department', dept)
        .order('created_at', { ascending: true });

      if (error) {
        console.error("Supabase Query Structural Error: ", error);
        throw error;
      }
      if (data) setTasks(data);
    } catch (err) {
      toast.error("Failed to sync factory floor records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    setActiveWorker('');
    setShowSharedPool(false);
    fetchWorkOrders(); 
  }, [dept]);

  const handleStartTask = async (task: any) => {
    if (!activeWorker) {
      toast.error("Please identify yourself by selecting your name from the terminal first.");
      return;
    }

    const now = new Date().toISOString();
    const updateData: any = {
      status: 'in_progress',
      started_at: now,
      current_stage: dept === 'workshop' ? 'making' : 'branding',
      assigned_tailor: activeWorker
    };

    try {
      const { error } = await supabase
        .from('production_tasks')
        .update(updateData)
        .eq('id', task.id);

      if (error) throw error;
      toast.success(`Job claimed by ${activeWorker}! Timer started.`, { icon: <Timer size={16} className="text-emerald-600" /> });
      fetchWorkOrders();
    } catch (err) {
      toast.error("Live sync failure initializing ticket.");
    }
  };

  const handleReallocateTask = async (task: any, newTailor: string) => {
    if (!newTailor) return;
    try {
      const { error } = await supabase
        .from('production_tasks')
        .update({ assigned_tailor: newTailor })
        .eq('id', task.id);

      if (error) throw error;
      toast.success(`Task re-allocated to ${newTailor}`);
      fetchWorkOrders();
    } catch (err) {
      toast.error("Failed to re-allocate task.");
    }
  };

  const handleCompleteWorkshopTask = async (task: any) => {
    const now = new Date().toISOString();
    let updateData: any = {
      status: 'completed',
      completed_at: now
    };

    if (task.started_at) {
      const start = new Date(task.started_at).getTime();
      const end = new Date(now).getTime();
      updateData.duration_minutes = Math.round((end - start) / 60000);
    }

    const rawBrandingSpecs = task.sale_items?.sales?.branding_specs || '';
    const requiresBranding = rawBrandingSpecs.trim().length > 0;

    if (requiresBranding) {
      updateData.department = 'branding';
      updateData.status = 'pending';
      updateData.current_stage = 'branding';
      toast.success("Fabric work complete! Transferred straight to Branding.", { icon: <ArrowRightLeft size={16} className="text-blue-600" /> });
    } else {
      updateData.current_stage = 'ready';
      toast.success("Garment production complete! Dispatched for collection.", { icon: <CheckCircle2 size={16} className="text-emerald-600" /> });
    }

    try {
      const { error } = await supabase
        .from('production_tasks')
        .update(updateData)
        .eq('id', task.id);

      if (error) throw error;
      fetchWorkOrders();
    } catch (err) {
      toast.error("Failed executing complete route workflow.");
    }
  };

  const handleCompleteBranding = async (task: any) => {
    const now = new Date().toISOString();
    let updateData: any = {
      status: 'completed',
      current_stage: 'ready',
      completed_at: now
    };

    if (task.started_at) {
      const start = new Date(task.started_at).getTime();
      const end = new Date(now).getTime();
      updateData.duration_minutes = Math.round((end - start) / 60000);
    }

    try {
      const { error } = await supabase
        .from('production_tasks')
        .update(updateData)
        .eq('id', task.id);

      if (error) throw error;
      toast.success("Branding cycle complete!");
      fetchWorkOrders();
    } catch (err) {
      toast.error("Database connection failure recording metric.");
    }
  };

  const visibleTasks = tasks.filter(task => {
    if (dept !== 'workshop') return true; 
    if (!activeWorker) return true; 

    if (showSharedPool) {
      return task.assigned_tailor !== activeWorker;
    }
    
    return task.assigned_tailor === activeWorker;
  });

  return (
    <RoleGate allowedRoles={['tailor', 'operator', 'manager', 'admin', 'founder']}>
      <div className="min-h-screen bg-slate-50 text-slate-700 p-4 md:p-8 font-sans">
        
        {/* LIGHT CONTROL HUB HEADER */}
        <header className="max-w-[1600px] mx-auto mb-8 flex flex-col lg:flex-row justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="p-3.5 rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
              {dept === 'workshop' ? <Scissors size={24} /> : <Printer size={24} />}
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                Kenstar<span className="text-emerald-600">Ops</span> Production Floor
              </h1>
              <div className="flex bg-slate-100 p-1 border border-slate-200 rounded-xl gap-1 mt-2">
                <button 
                  onClick={() => setDept('workshop')} 
                  className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${dept === 'workshop' ? 'bg-white text-emerald-600 shadow-xs border border-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Workshop Floor
                </button>
                <button 
                  onClick={() => setDept('branding')} 
                  className={`px-4 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${dept === 'branding' ? 'bg-white text-emerald-600 shadow-xs border border-slate-200' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Branding Deck
                </button>
              </div>
            </div>
          </div>

          {/* ACCESS CONTROLS SECTION */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            {dept === 'workshop' && activeWorker && (
              <button
                onClick={() => setShowSharedPool(!showSharedPool)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  showSharedPool 
                    ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-inner' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Users size={14} />
                <span>{showSharedPool ? "View My Work Only" : "Share Work Pool"}</span>
              </button>
            )}

            <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl border border-slate-200">
              <User size={14} className="text-emerald-600 ml-1" />
              <select
                value={activeWorker}
                onChange={e => setActiveWorker(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-800 outline-none cursor-pointer pr-4"
              >
                <option value="">-- View Entire Floor --</option>
                {dept === 'workshop' 
                  ? WORKSHOP_TAILORS.map(t => <option key={t} value={t}>Tailor: {t}</option>)
                  : BRANDING_OPERATORS.map(o => <option key={o} value={o}>Operator: {o}</option>)
                }
              </select>
            </div>

            <button 
              onClick={fetchWorkOrders} 
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-white shadow-xs transition-colors"
            >
              <RefreshCcw size={14} className={loading ? "animate-spin text-emerald-600" : ""} />
            </button>
          </div>
        </header>

        {/* MONITORING LANES */}
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <Column 
            title={showSharedPool ? "Shared Backlog Pool" : activeWorker ? `My Waiting Line` : "Unallocated Pool Queue"} 
            color="slate" 
            count={visibleTasks.filter(t => t.status === 'pending').length}
          >
            {visibleTasks.filter(t => t.status === 'pending').map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                dept={dept} 
                onAction={() => handleStartTask(task)}
                onReallocate={(targetTailor: string) => handleReallocateTask(task, targetTailor)}
                onPreviewImage={(url: string) => setPreviewImageUrl(url)}
                isSharedView={showSharedPool}
              />
            ))}
          </Column>

          <Column 
            title={showSharedPool ? "Shared Work-In-Progress" : activeWorker ? `My Active Progress` : "Floor Work in Progress"} 
            color="emerald" 
            count={visibleTasks.filter(t => t.status === 'in_progress').length}
          >
            {visibleTasks.filter(t => t.status === 'in_progress').map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                dept={dept} 
                active 
                onAction={dept === 'workshop' ? () => handleCompleteWorkshopTask(task) : () => handleCompleteBranding(task)} 
                onReallocate={(targetTailor: string) => handleReallocateTask(task, targetTailor)}
                onPreviewImage={(url: string) => setPreviewImageUrl(url)}
                isSharedView={showSharedPool}
              />
            ))}
          </Column>

          <Column 
            title="Completed Units" 
            color="completed" 
            count={visibleTasks.filter(t => t.status === 'completed').length}
          >
            {visibleTasks.filter(t => t.status === 'completed').map(task => (
              <TaskCard key={task.id} task={task} dept={dept} finished 
                onPreviewImage={(url: string) => setPreviewImageUrl(url)}
              />
            ))}
          </Column>
        </div>

        {/* HIGH-RES LIGHTBOX BLUEPRINT MODAL */}
        {previewImageUrl && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-4 z-50 animate-in fade-in duration-150">
            <button 
              onClick={() => setPreviewImageUrl(null)} 
              className="absolute top-6 right-6 text-white bg-slate-800 p-3 rounded-full hover:bg-slate-700 transition-colors shadow-xl"
            >
              <X size={24}/>
            </button>
            <div className="max-w-4xl max-h-[85vh] bg-white p-2 rounded-2xl shadow-2xl overflow-hidden border">
              <img src={previewImageUrl} className="w-full h-full max-h-[80vh] object-contain rounded-xl" alt="Design Blueprint" />
            </div>
            <p className="text-white/80 font-black text-xs uppercase mt-4 tracking-widest bg-slate-900/60 px-4 py-2 rounded-full">Garment Assembly Pattern Snapshot</p>
          </div>
        )}

      </div>
    </RoleGate>
  );
}

function Column({ title, color, count, children }: any) {
  const colors: any = { 
    slate: 'text-slate-500 border-l-2 border-slate-300 pl-2', 
    emerald: 'text-emerald-600 border-l-2 border-emerald-500 pl-2', 
    completed: 'text-blue-600 border-l-2 border-blue-400 pl-2' 
  };
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className={`text-[11px] font-black uppercase tracking-wider ${colors[color]}`}>{title}</h3>
        <span className="bg-white border border-slate-200 shadow-2xs px-2.5 py-0.5 rounded-md text-[10px] font-mono text-slate-500">{count}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function TaskCard({ task, onAction, onReallocate, onPreviewImage, active, finished, dept, isSharedView }: any) {
  const [elapsed, setElapsed] = useState('00:00');

  useEffect(() => {
    let interval: any;
    if (active && task.started_at) {
      interval = setInterval(() => {
        const start = new Date(task.started_at).getTime();
        const now = new Date().getTime();
        const diff = now - start;
        const mins = Math.floor(diff / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setElapsed(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [active, task.started_at]);

  const isCustom = task.sale_items?.sales?.is_custom_order;
  const rawBrandingSpecs = task.sale_items?.sales?.branding_specs?.toLowerCase() || '';
  const isEmbroidery = rawBrandingSpecs.includes('embroidery') || rawBrandingSpecs.includes('stitch');
  const isPrinting = rawBrandingSpecs.includes('print') || rawBrandingSpecs.includes('screen') || (!isEmbroidery && rawBrandingSpecs.length > 0);

  // ARCHITECTURAL PARSER FIX: Dynamically decode specifications JSON strings into layout modules
  let parsedSpecs: any = null;
  let parsedAttachmentUrl: string | null = null;
  const rawProductionSpecs = task.sale_items?.sales?.production_specs || '';

  if (rawProductionSpecs.trim().startsWith('{')) {
    try {
      parsedSpecs = JSON.parse(rawProductionSpecs);
      parsedAttachmentUrl = parsedSpecs.attachmentUrl || null;
    } catch (e) {
      console.error("Failed parsing production specs JSON object envelope node", e);
    }
  }

  return (
    <div className={`group relative transition-all duration-200 rounded-xl border bg-white p-5 ${active ? 'border-emerald-500 shadow-md shadow-emerald-100' : 'border-slate-200 hover:border-slate-300 shadow-2xs'}`}>
      
      {finished && task.duration_minutes && (
        <div className="absolute top-4 right-4 flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
          <BarChart3 size={11} className="text-emerald-600" />
          <span className="text-[9px] font-mono text-slate-500">{task.duration_minutes}m</span>
        </div>
      )}

      <div className="flex flex-col gap-1.5 mb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
            Ref: {task.id?.substring(0, 7).toUpperCase() || 'TASK'}
          </span>
          {isCustom && (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={8}/> Custom
            </span>
          )}
          <span className={`border px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${task.assigned_tailor === 'Unallocated' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>
            👤 {task.assigned_tailor || 'Unallocated'}
          </span>
        </div>
        
        <h4 className="text-base font-black text-slate-900 uppercase tracking-tight">
          {task.product_variants?.products?.name || "Bespoke Garment Variant"}
        </h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase">
          Base Size Spec: <span className="text-slate-700 font-mono font-black">{task.product_variants?.size || 'Bespoke measure'}</span>
        </p>
      </div>

      {/* RENDER DYNAMIC FABRIC IMAGES DIRECT FROM POS BLOCKS */}
      {parsedAttachmentUrl && (
        <div className="mb-3.5 relative rounded-lg border overflow-hidden bg-slate-50 group/img h-32 flex items-center justify-center">
          <img src={parsedAttachmentUrl} className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200" alt="Blueprint Source" />
          <button 
            type="button"
            onClick={() => onPreviewImage(parsedAttachmentUrl)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 font-black text-xs uppercase"
          >
            <Eye size={14} /> View Blueprint
          </button>
        </div>
      )}

      {dept === 'branding' && (
        <div className="mb-3 flex gap-1">
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${isEmbroidery ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
            🧵 Embroidery
          </span>
          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${isPrinting ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
            🎨 Printed
          </span>
        </div>
      )}

      {active && (
        <div className="flex items-center gap-2.5 bg-slate-50 border border-slate-200 p-2.5 rounded-lg mb-3">
          <Timer className="text-emerald-600 animate-pulse" size={14} />
          <div>
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Elapsed Production Time</p>
            <p className="text-sm font-black font-mono text-slate-800 tracking-wide tabular-nums">{elapsed}</p>
          </div>
        </div>
      )}

      {/* DYNAMIC METRICS LAYOUT: UNPACKED FOR HUMAN TAILORS TO GRAB INSTANTLY */}
      {dept === 'workshop' && (
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl mb-3 space-y-2.5 shadow-3xs">
          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest border-b pb-1 flex items-center gap-1">
            <Scissors size={12}/> Workshop Specifications
          </p>
          
          {parsedSpecs ? (
            <div className="grid grid-cols-1 gap-2 text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 border rounded-lg">
                <Ruler size={12} className="text-slate-400 flex-shrink-0" />
                <span>Measurements: <strong className="text-slate-900 uppercase">{parsedSpecs.measurements || "Standard Fit"}</strong></span>
              </div>

              {parsedSpecs.allocatedMaterial && (
                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 border rounded-lg">
                  <Package size={12} className="text-slate-400 flex-shrink-0" />
                  <span className="truncate">Material: <strong className="text-slate-900 uppercase">{parsedSpecs.allocatedMaterial}</strong></span>
                </div>
              )}

              {parsedSpecs.collectionDate && (
                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 border rounded-lg">
                  <Calendar size={12} className="text-slate-400 flex-shrink-0" />
                  <span>Due Date: <strong className="text-orange-600">{parsedSpecs.collectionDate}</strong></span>
                </div>
              )}

              {parsedSpecs.customerContact && (
                <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 border rounded-lg">
                  <Phone size={12} className="text-slate-400 flex-shrink-0" />
                  <span>Contact: <strong className="text-slate-900">{parsedSpecs.customerContact}</strong></span>
                </div>
              )}

              {parsedSpecs.notes && parsedSpecs.notes.trim() !== "" && (
                <div className="flex items-start gap-2 bg-amber-50/50 px-2.5 py-1.5 border border-amber-100 rounded-lg text-[11px] text-amber-900 italic">
                  <FileText size={12} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <span>Note: "{parsedSpecs.notes}"</span>
                </div>
              )}
            </div>
          ) : (
            // Fallback plain-text block layout pattern
            <p className="text-xs font-semibold text-slate-600 leading-relaxed whitespace-pre-wrap">
              {rawProductionSpecs || "No execution measurements specified."}
            </p>
          )}
        </div>
      )}

      {dept === 'branding' && task.sale_items?.sales?.branding_specs && (
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-lg mb-3">
          <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest mb-1">Logo Placement Details</p>
          <p className="text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{task.sale_items.sales.branding_specs}</p>
        </div>
      )}

      {/* BALANCING DELEGATION OPTIONS BUTTON */}
      {dept === 'workshop' && isSharedView && !finished && (
        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1.5">
          <p className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <UserPlus size={10} /> Shift/Delegate Order:
          </p>
          <select
            onChange={(e) => onReallocate(e.target.value)}
            defaultValue=""
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[11px] font-bold text-slate-700 outline-none"
          >
            <option value="" disabled>Choose alternative team member...</option>
            {WORKSHOP_TAILORS.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      )}

      {/* ACTION TRIGGERS STRIP */}
      {!finished && (!isSharedView || active) && (
        <button
          onClick={onAction}
          className={`w-full mt-2 py-2.5 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border ${
            active 
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs hover:bg-emerald-700' 
              : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 shadow-2xs'
          }`}
        >
          {active ? (
            <>
              <CheckCircle2 size={13}/> Complete & Hand Off Piece
            </>
          ) : (
            <>
              <Hammer size={13}/> {isSharedView ? "Take Over Order Ticket" : "Start Production Run"}
            </>
          )}
        </button>
      )}

      {finished && (
        <div className="flex items-center justify-center gap-1.5 py-1.5 mt-2 text-slate-500 font-black uppercase text-[10px] tracking-wider bg-slate-50 border border-slate-200 rounded-lg">
          <CheckCircle2 size={13} className="text-emerald-600" /> Completed
        </div>
      )}
    </div>
  );
}