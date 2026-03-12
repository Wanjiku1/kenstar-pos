"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Store, 
  User, 
  RefreshCcw 
} from 'lucide-react';
import { toast } from 'sonner';

// Define the shape of our data for TypeScript
interface TerminalIssue {
  id: number;
  created_at: string;
  employee_id: string;
  issue_type: string;
  resolved: boolean;
  shop: string;
  staff_name: string;
  issue_description: string;
}

export default function TerminalIssuesAdmin() {
  const [issues, setIssues] = useState<TerminalIssue[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch Issues & Setup Real-time Listener
  useEffect(() => {
    fetchIssues();

    // LISTEN LIVE: Automatically refresh the list when a staff member submits a ticket
    const channel = supabase
      .channel('terminal-issue-updates')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'terminal_issues' }, 
        () => {
          fetchIssues();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchIssues = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('terminal_issues')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Could not load tickets");
    } else {
      setIssues(data || []);
    }
    setLoading(false);
  };

  const resolveIssue = async (id: number) => {
    const { error } = await supabase
      .from('terminal_issues')
      .update({ resolved: true })
      .eq('id', id);

    if (!error) {
      toast.success("Issue marked as resolved");
      // fetchIssues() is called automatically by the Real-time listener above
    }
  };

  // Helper to format Nairobi Time correctly
  const formatNairobiTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-KE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black uppercase italic text-slate-900">
            Terminal <span className="text-[#007a43]">Support</span>
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Live Staff Reports from Kenstar Branches
          </p>
        </div>
        
        <button 
          onClick={fetchIssues} 
          className="p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
        >
          <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="grid gap-4">
        {issues.length === 0 && !loading && (
          <div className="text-center py-20 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
            <CheckCircle2 className="mx-auto text-slate-300 mb-2" size={40} />
            <p className="text-slate-400 font-black uppercase text-xs">All clear! No pending issues.</p>
          </div>
        )}

        {issues.map((issue) => (
          <div 
            key={issue.id} 
            className={`group p-6 rounded-[2rem] border-2 transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
              issue.resolved 
                ? 'bg-slate-50 border-slate-100 opacity-60 grayscale' 
                : 'bg-white border-white shadow-xl hover:border-red-100'
            }`}
          >
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="flex items-center gap-1 bg-slate-900 text-white text-[9px] font-black px-2 py-1 rounded-md uppercase">
                  <Store size={10} /> {issue.shop}
                </span>
                <span className="flex items-center gap-1 bg-blue-50 text-blue-600 text-[9px] font-black px-2 py-1 rounded-md uppercase">
                  <Clock size={10} /> {formatNairobiTime(issue.created_at)}
                </span>
                {!issue.resolved && (
                  <span className="animate-pulse flex items-center gap-1 bg-red-100 text-red-600 text-[9px] font-black px-2 py-1 rounded-md uppercase">
                    <AlertTriangle size={10} /> Urgent
                  </span>
                )}
              </div>

              <h3 className="text-xl font-black uppercase text-slate-900 mb-1">
                {issue.issue_type}
              </h3>
              
              <div className="flex items-center gap-2 text-slate-600">
                <User size={14} className="text-slate-400" />
                <p className="text-sm font-bold uppercase tracking-tight">
                  {issue.staff_name} <span className="text-slate-300 ml-1">({issue.employee_id})</span>
                </p>
              </div>

              {issue.issue_description && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 italic text-slate-700 text-sm">
                  "{issue.issue_description}"
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-2 min-w-[150px]">
              {!issue.resolved ? (
                <button 
                  onClick={() => resolveIssue(issue.id)}
                  className="w-full bg-[#007a43] hover:bg-[#005e34] text-white px-6 py-4 rounded-2xl font-black uppercase text-xs shadow-lg shadow-green-200 transition-all active:scale-95"
                >
                  Resolve Issue
                </button>
              ) : (
                <div className="flex items-center gap-2 text-green-600 font-black uppercase text-[10px] pr-4">
                  <CheckCircle2 size={16} /> Resolved
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}