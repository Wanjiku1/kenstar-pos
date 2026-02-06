"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldAlert, LogOut } from 'lucide-react';

export function RoleGate({ children, allowedRoles }: { 
  children: React.ReactNode, 
  allowedRoles: string[] 
}) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. Check the 'staff' table using your specific column name: "Roles"
      const { data: staffData } = await supabase
        .from('staff')
        .select('"Roles"') // Double quotes handle the capitalization in Postgres
        .eq('email', user.email)
        .single();

      // 2. Check the 'profiles' table as backup
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      // Logic: Prioritize staff Roles, then profile role, then default to cashier
      const finalRole = (staffData?.Roles || profileData?.role || 'cashier').toLowerCase();
      
      setRole(finalRole);
      setLoading(false);
    }
    checkRole();
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="font-black text-slate-900 tracking-tight uppercase text-xs text-center">
          KENSTAR OPS<br/><span className="text-slate-400 font-bold">Verifying Rites...</span>
        </p>
      </div>
    );
  }

  // Founder has master access. 
  // We also check if the role is 'admin' (your profile default)
  const isAuthorized = 
    role === 'founder' || 
    role === 'admin' || 
    (role && allowedRoles.includes(role));

  if (!isAuthorized) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-center p-8 bg-slate-100">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl max-w-md border border-slate-200">
            <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldAlert className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Access Denied</h1>
            <p className="mt-4 text-slate-500 font-bold text-xs uppercase tracking-widest leading-loose">
                Current Role: <span className="text-red-600">[{role}]</span><br/>
                Your account does not have the rites <br/>required for this department.
            </p>
            
            <div className="mt-8 space-y-3">
                <button 
                    onClick={() => router.push('/pos')} 
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 transition-all"
                >
                    Back to POS Terminal
                </button>
                
                <button 
                    onClick={handleLogout}
                    className="w-full bg-white border border-slate-200 text-slate-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
                >
                    <LogOut size={14} /> Switch Account
                </button>
            </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}