"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Scissors, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  RefreshCcw,
  Package,
  Printer,
  ArrowRightLeft
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
        sales(is_custom_order, balance_amount)
      `)
      .eq('department', dept) // Filter by the active department
      .order('created_at', { ascending: true });

    if (data) setTasks(data);
    setLoading(false);
  };

  const handleTaskAction = async (task: any, nextStatus: 'in_progress' | 'completed') => {
    // LOGIC: If finishing in Workshop but needs Branding, move department instead of completing
    if (nextStatus === 'completed' && dept === 'workshop' && task.total_stages > task.current_stage) {
      const { error } = await supabase
        .from('production_tasks')
        .update({ 
          department: 'branding', 
          current_stage: 2,
          status: 'pending' // Reset to pending for the next team
        })
        .eq('id', task.id);

      if (!error) {
        toast.success("Item moved to Branding Dept");
        fetchWorkOrders();
      }
      return;
    }

    // Standard Status Update
    const { error } = await supabase
      .from('production_tasks')
      .update({ status: nextStatus })
      .eq('id', task.id);

    if (error) {
      toast.error("Update failed");
    } else {
      toast.success(`Task is now ${nextStatus.replace('_', ' ')}`);
      fetchWorkOrders();
    }
  };

  useEffect(() => { fetchWorkOrders(); }, [dept]);

  return (
    <RoleGate allowedRoles={['tailor', 'operator', 'manager', 'admin', 'founder']}>
      <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen bg-slate-50">
        
        {/* DEPARTMENT SWITCHER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-md ${dept === 'workshop' ? 'bg-orange-600' : 'bg-blue-600'} text-white`}>
                {dept === 'workshop' ? <Scissors size={14} /> : <Printer size={14} />}
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                Live Feed: {dept}
              </span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">
              {dept === 'workshop' ? 'Tailoring Floor' : 'Branding Dept'}
            </h1>
          </div>

          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => setDept('workshop')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dept === 'workshop' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              Workshop
            </button>
            <button 
              onClick={() => setDept('branding')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dept === 'branding' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              Branding
            </button>
            <button onClick={fetchWorkOrders} className="ml-2 p-2 text-slate-300 hover:text-blue-600">
              <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {/* TASK BOARD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* QUEUED */}
          <Column title="Queued" color="slate" count={tasks.filter(t => t.status === 'pending').length}>
            {tasks.filter(t => t.status === 'pending').map(task => (
              <TaskCard key={task.id} task={task} onAction={() => handleTaskAction(task, 'in_progress')} />
            ))}
          </Column>

          {/* ACTIVE */}
          <Column title="In Progress" color="orange" count={tasks.filter(t => t.status === 'in_progress').length}>
            {tasks.filter(t => t.status === 'in_progress').map(task => (
              <TaskCard key={task.id} task={task} active onAction={() => handleTaskAction(task, 'completed')} />
            ))}
          </Column>

          {/* FINISHED */}
          <Column title="Finished Today" color="emerald" count={tasks.filter(t => t.status === 'completed').length}>
            {tasks.filter(t => t.status === 'completed').map(task => (
              <TaskCard key={task.id} task={task} finished />
            ))}
          </Column>

        </div>
      </div>
    </RoleGate>
  );
}

function Column({ title, color, count, children }: any) {
  const colorMap: any = {
    slate: 'text-slate-400 bg-slate-200',
    orange: 'text-orange-500 bg-orange-100',
    emerald: 'text-emerald-500 bg-emerald-100'
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className={`text-[10px] font-black uppercase tracking-widest ${colorMap[color].split(' ')[0]}`}>{title}</h3>
        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${colorMap[color]}`}>{count}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function TaskCard({ task, onAction, active, finished }: any) {
  const needsBrandingNext = task.department === 'workshop' && task.total_stages > task.current_stage;

  return (
    <div className={`bg-white border p-5 rounded-[2rem] shadow-sm transition-all ${active ? 'border-orange-500 ring-4 ring-orange-500/5 shadow-lg' : 'border-slate-100'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="font-black text-slate-900 text-sm uppercase leading-tight">
            {task.product_variants?.products?.name || "Bespoke Order"}
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Size: {task.product_variants?.size || 'Custom'} • #{task.sale_id?.slice(0,5)}
          </p>
        </div>
        <div className={`p-2 rounded-xl ${active ? 'bg-orange-50 text-orange-500' : 'bg-slate-50 text-slate-400'}`}>
          {active ? <Clock size={18} className="animate-pulse" /> : <Package size={18} />}
        </div>
      </div>

      {task.notes && (
        <div className="bg-blue-50 p-3 rounded-xl mb-4 border border-blue-100">
          <p className="text-[9px] font-black text-blue-700 uppercase mb-1 flex items-center gap-1">
            <AlertCircle size={10} /> Instructions:
          </p>
          <p className="text-[11px] font-bold text-blue-900 leading-relaxed">{task.notes}</p>
        </div>
      )}

      {!finished && (
        <button
          onClick={onAction}
          className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 ${
            active 
            ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
            : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {active ? (
            needsBrandingNext ? (
              <><ArrowRightLeft size={14}/> Send to Branding</>
            ) : (
              'Mark as Finished'
            )
          ) : 'Start Task'}
        </button>
      )}

      {finished && (
        <div className="flex items-center justify-center gap-2 py-2 text-emerald-600">
          <CheckCircle2 size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Done</span>
        </div>
      )}
    </div>
  );
}