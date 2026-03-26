"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ShieldCheck, Wifi, Loader2 } from 'lucide-react';
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
      toast.error("Login Failed", { description: error.message });
      setLoading(false);
    } else if (data.user) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('users') 
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) throw profileError;

        toast.success("Welcome Back!");

        if (profile?.role === 'founder' || profile?.role === 'admin') {
          router.push('/admin'); 
        } else {
          router.push('/pos'); 
        }

        router.refresh();
      } catch (err) {
        console.error("Role Fetch Error:", err);
        router.push('/'); 
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-6 relative font-sans overflow-hidden">
      
      {/* 🟢 Top Kenstar Green Bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-[#007a43]" />

      <div className="w-full max-w-md relative z-10">
        
        {/* Simple Branding Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#007a43] rounded-[2rem] shadow-xl shadow-green-900/20 mb-5 transform -rotate-6 transition-transform hover:rotate-0 cursor-pointer">
             <span className="text-white text-4xl font-black italic">K</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
            Kenstar <span className="text-[#007a43]">Ops</span>
          </h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2 flex items-center justify-center gap-2">
            <Wifi size={14} className="text-[#007a43]" /> ERP System v1.0
          </p>
        </div>

        {/* Login Form Container */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
          <form onSubmit={handleLogin} className="space-y-6">
            
            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-wider">Work Email</label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#007a43]/10 focus:border-[#007a43] focus:bg-white transition-all font-bold text-slate-800 text-sm placeholder-slate-400"
                  placeholder="name@kenstar.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-wider">Password</label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#007a43]/10 focus:border-[#007a43] focus:bg-white transition-all font-bold text-slate-800 text-sm placeholder-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-[#007a43] transition-all duration-300 shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Logging in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Security Footer */}
        <div className="mt-8 text-center">
          <p className="text-slate-400 text-[9px] font-black uppercase flex items-center justify-center gap-2 tracking-widest">
            <ShieldCheck size={14} className="text-slate-500" /> Secure Encryption Active
          </p>
        </div>
      </div>
    </div>
  );
}