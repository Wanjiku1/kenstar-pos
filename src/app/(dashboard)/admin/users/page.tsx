"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Search, Fingerprint, ShieldCheck, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';
import { RoleGate } from "@/components/auth/role-gate";

export default function UserManagementPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchStaff = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('staff')
      .select('*')
      .order('role', { ascending: true });
    if (data) setStaff(data);
    setLoading(false);
  };

  const updateRole = async (id: string, newRole: string) => {
    const { error } = await supabase
      .from('staff')
      .update({ role: newRole })
      .eq('id', id);

    if (error) {
      toast.error("Security Protocol Failed: Could not update Rites");
    } else {
      toast.success(`Access level updated to ${newRole.toUpperCase()}`);
      fetchStaff();
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const filteredStaff = staff.filter(s => 
    s.name?.toLowerCase().includes(search.toLowerCase()) || 
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <RoleGate allowedRoles={['founder', 'admin']}>
      <div className="p-8 max-w-6xl mx-auto space-y-8 min-h-screen">
        {/* HEADER */}
        <header className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={16} className="text-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">Security Clearance</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Staff Rites</h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Personnel Access Control</p>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input 
              placeholder="Filter by name or email..."
              className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all w-80 shadow-sm"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        {/* STAFF TABLE */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.15em]">Employee Profile</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.15em]">Current Rite</th>
                <th className="p-6 text-[10px] font-black uppercase text-slate-400 tracking-[0.15em] text-right">Assign Authority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-20 text-center">
                    <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={32} />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Querying Personnel Database...</p>
                  </td>
                </tr>
              ) : filteredStaff.map((person) => (
                <tr key={person.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm ${
                        person.role === 'founder' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {person.name?.[0] || <Fingerprint size={20}/>}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm tracking-tight">{person.name}</p>
                        <p className="text-xs text-slate-400 font-medium">{person.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      person.role === 'founder' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                      person.role === 'admin' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      person.role === 'manager' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {person.role}
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <select 
                      value={person.role}
                      disabled={person.role === 'founder'} 
                      onChange={(e) => updateRole(person.id, e.target.value)}
                      className={`bg-white border border-slate-200 rounded-xl text-xs font-black p-2.5 outline-none focus:ring-4 focus:ring-blue-500/10 cursor-pointer transition-all ${
                        person.role === 'founder' ? 'opacity-50 cursor-not-allowed border-none bg-transparent' : 'hover:border-slate-400'
                      }`}
                    >
                      <option value="sales">SALES</option>
                      <option value="cashier">CASHIER</option>
                      <option value="tailor">TAILOR</option>
                      <option value="operator">OPERATOR</option>
                      <option value="manager">MANAGER</option>
                      <option value="admin">ADMIN</option>
                      {person.role === 'founder' && <option value="founder">FOUNDER</option>}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Kenstar Ops Security Framework • All changes are logged to the audit trail
        </p>
      </div>
    </RoleGate>
  );
}