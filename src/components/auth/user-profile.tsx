"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    async function getProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setRole(data?.role || 'staff');
      }
    }
    getProfile();
  }, []);

  if (!user) return <div className="h-8 w-8 animate-pulse bg-slate-200 rounded-full" />;

  return (
    <div className="flex items-center gap-3 bg-slate-50 p-2 pr-4 rounded-full border border-slate-200">
      <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-black">
        {user.email?.charAt(0).toUpperCase()}
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-black uppercase text-blue-600 leading-none">
          {role}
        </span>
        <span className="text-xs font-bold text-slate-700">
          {user.email}
        </span>
      </div>
    </div>
  );
}