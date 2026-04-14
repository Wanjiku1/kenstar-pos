"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Scissors, CheckCircle2, Clock, AlertTriangle, RefreshCcw, 
  Package, Printer, ArrowRightLeft, Hammer, Timer, BarChart3,
  Activity // <--- FIXED: Added Activity import
} from 'lucide-react';
import { toast } from 'sonner';
import { RoleGate } from "@/components/auth/role-gate";

export default function FactoryConsole() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dept, setDept] = useState<'workshop' | 'branding'>('workshop');

  const fetchWorkOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('production_tasks')
      .select(`
        *,
        product_variants(size, products(name)),
        sales(is_custom_order, balance_amount, created_at)
      `)
      .eq('department', dept)
      .neq('status', 'collected')
      .order('created_at', { ascending: true });

    if (data) setTasks(data);
    setLoading(false);
  };

  const handleTaskAction = async (task: any, nextStatus: 'in_progress' | 'completed') => {
    const now = new Date().toISOString();
    let updateData: any = { status: nextStatus, updated_at: now };

    if (nextStatus === 'in_progress') {
      updateData.started_at = now;
    }

    if (nextStatus === 'completed') {
      updateData.completed_at = now;
      if (task.started_at) {
        const start = new Date(task.started_at).getTime();
        const end = new Date(now).getTime();
        const diffMinutes = Math.round((end - start) / 60000);
        updateData.duration_minutes = diffMinutes;
      }

      // Routing Logic
      if (dept === 'workshop' && task.needs_branding) {
        updateData.department = 'branding';
        updateData.status = 'pending';
      }
    }

    try {
      const { error } = await supabase
        .from('production_tasks')
        .update(updateData)
        .eq('id', task.id);

      if (error) throw error;
      toast.success(nextStatus === 'in_progress' ? "Timer Started!" : "Task Completed!", { icon: <Timer size={16}/> });
      fetchWorkOrders();
    } catch (err) {
      toast.error("Sync Error");
    }
  };

  useEffect(() => { fetchWorkOrders(); }, [dept]);

  return (
    <RoleGate allowedRoles={['tailor', 'operator', 'manager', 'admin', 'founder']}>
      <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans">
        
        <header className="max-w-[1600px] mx-auto mb-10 flex flex-col lg:flex-row justify-between items-center bg-slate-900/40 p-6 rounded-[2.5rem] border border-slate-800/50 backdrop-blur-xl">
          <div className="flex items-center gap-6">
            <div className={`p-5 rounded-3xl shadow-2xl ${dept === 'workshop' ? 'bg-orange-600 shadow-orange-900/40' : 'bg-blue-600 shadow-blue-900/40'}`}>
              {dept === 'workshop' ? <Scissors size={32} className="text-white" /> : <Printer size={32} className="text-white" />}
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3 text-white">
                Kenstar <span className={dept === 'workshop' ? 'text-orange-500' : 'text-blue-500'}>{dept}</span>
              </h1>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mt-1 flex items-center gap-2">
                <Activity size={12} className="text-emerald-500" /> Performance Tracking Active
              </p>
            </div>
          </div>

          <div className="flex bg-black/40 p-2 rounded-3xl border border-slate-800 mt-4 lg:mt-0">
            <button onClick={() => setDept('workshop')} className={`px-10 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${dept === 'workshop' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>Workshop</button>
            <button onClick={() => setDept('branding')} className={`px-10 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${dept === 'branding' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>Branding</button>
            <button onClick={fetchWorkOrders} className="px-4 text-slate-600 hover:text-white"><RefreshCcw size={20} className={loading ? "animate-spin" : ""} /></button>
          </div>
        </header>

        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
          <Column title="Waiting to Start" color="slate" count={tasks.filter(t => t.status === 'pending').length}>
            {tasks.filter(t => t.status === 'pending').map(task => (
              <TaskCard key={task.id} task={task} dept={dept} onAction={() => handleTaskAction(task, 'in_progress')} />
            ))}
          </Column>

          <Column title="Active Work" color="orange" count={tasks.filter(t => t.status === 'in_progress').length}>
            {tasks.filter(t => t.status === 'in_progress').map(task => (
              <TaskCard key={task.id} task={task} dept={dept} active onAction={() => handleTaskAction(task, 'completed')} />
            ))}
          </Column>

          <Column title="Completed" color="emerald" count={tasks.filter(t => t.status === 'completed').length}>
            {tasks.filter(t => t.status === 'completed').map(task => (
              <TaskCard key={task.id} task={task} dept={dept} finished />
            ))}
          </Column>
        </div>
      </div>
    </RoleGate>
  );
}

function Column({ title, color, count, children }: any) {
  const colors: any = { slate: 'text-slate-500', orange: 'text-orange-500', emerald: 'text-emerald-500' };
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${colors[color]}`}>{title}</h3>
        <span className="bg-slate-900 px-3 py-1 rounded-full text-[10px] font-black text-slate-500">{count}</span>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// FIXED: Added 'dept' to the props interface here
function TaskCard({ task, onAction, active, finished, dept }: any) {
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

  return (
    <div className={`group relative transition-all duration-300 rounded-[2.5rem] border-2 overflow-hidden ${active ? 'bg-slate-900 border-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.1)]' : 'bg-slate-900/40 border-slate-800/50'}`}>
      
      {finished && task.duration_minutes && (
        <div className="absolute top-4 right-6 flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          <BarChart3 size={10} className="text-emerald-500" />
          <span className="text-[10px] font-black text-emerald-500 uppercase">{task.duration_minutes} MINS</span>
        </div>
      )}

      <div className="p-8">
        <div className="flex flex-col gap-1 mb-6">
          <p className="text-2xl font-black text-white uppercase italic tracking-tighter leading-tight">
            {task.product_variants?.products?.name || "Bespoke Design"}
          </p>
          <div className="flex gap-2">
            <span className="text-[9px] font-black bg-white/5 text-slate-400 px-2 py-1 rounded uppercase tracking-widest">
              SIZE {task.product_variants?.size || 'CUST'}
            </span>
          </div>
        </div>

        {active && (
          <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl mb-6">
            <Timer className="text-orange-500 animate-pulse" size={20} />
            <div>
              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Live Time</p>
              <p className="text-xl font-black text-white tabular-nums">{elapsed}</p>
            </div>
          </div>
        )}

        {task.notes && (
          <div className="bg-blue-500/5 border border-blue-500/10 p-5 rounded-2xl mb-6">
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">Worker Instructions</p>
            <p className="text-sm font-bold text-slate-300 leading-relaxed italic">{task.notes}</p>
          </div>
        )}

        {!finished && (
          <button
            onClick={onAction}
            className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-white text-black hover:bg-slate-200'}`}
          >
            {active ? (
              // FIXED: 'dept' is now available here to check workshop vs branding
              task.needs_branding && dept === 'workshop' ? <><ArrowRightLeft size={18}/> Push to Branding</> : <><CheckCircle2 size={18}/> Finish Task</>
            ) : <><Hammer size={18}/> Start Sewing</>}
          </button>
        )}

        {finished && (
          <div className="flex items-center justify-center gap-2 py-2 text-slate-500 font-black uppercase text-[10px] tracking-widest">
             <CheckCircle2 size={16} className="text-emerald-500" /> Task Ready for Collection
          </div>
        )}
      </div>
    </div>
  );
}