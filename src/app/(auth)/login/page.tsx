"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ShieldCheck, Wifi } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("Authentication Failed", { description: error.message });
      setLoading(false);
    } else if (data.user) {
      try {
        // FETCH USER ROLE TO DETERMINE REDIRECT
        const { data: profile, error: profileError } = await supabase
          .from('users') // Change to 'profiles' if that's your table name
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) throw profileError;

        toast.success("Login Successful", { description: `Welcome back, ${profile?.role}` });

        // ROLE-BASED REDIRECT LOGIC
        if (profile?.role === 'founder' || profile?.role === 'admin') {
          router.push('/admin'); // Managers go to HQ
        } else {
          router.push('/pos'); // Staff go to POS
        }

        router.refresh();
      } catch (err) {
        console.error("Role Fetch Error:", err);
        // Fallback to POS if role fetch fails
        router.push('/pos');
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-700 via-blue-500 to-slate-200" />
      
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-700 rounded-3xl shadow-xl shadow-blue-200 mb-4 transform -rotate-6 transition-transform hover:rotate-0 cursor-pointer">
             <span className="text-white text-4xl font-black italic">K</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
            Kenstar <span className="text-blue-700">Ops</span>
          </h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2 flex items-center justify-center gap-2">
            <Wifi size={14} className="text-green-500" /> Hybrid ERP System v1.0
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Work Email</label>
              <div className="relative mt-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:border-blue-600 focus:bg-white transition-all font-medium"
                  placeholder="name@kenstar.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Password</label>
              <div className="relative mt-1">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:border-blue-600 focus:bg-white transition-all font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Enter Terminal"}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-slate-400 text-[10px] font-bold uppercase flex items-center justify-center gap-2">
            <ShieldCheck size={14} /> Secure AES-256 Encrypted Connection
          </p>
        </div>
      </div>
    </div>
  );
}