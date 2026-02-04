"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export function RoleGate({ children, allowedRoles }: { 
  children: React.ReactNode, 
  allowedRoles: string[] 
}) {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
        setRole(data?.role || 'cashier');
      }
      setLoading(false);
    }
    checkRole();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center font-bold">Kenstar Ops: Loading Permissions...</div>;

  if (!role || !allowedRoles.includes(role)) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-4xl font-black text-red-600">UNAUTHORIZED</h1>
        <p className="mt-2 text-slate-500">Your role ({role}) does not have access to this module.</p>
        <button onClick={() => router.push('/pos')} className="mt-6 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold">
          Return to POS
        </button>
      </div>
    );
  }

  return <>{children}</>;
}