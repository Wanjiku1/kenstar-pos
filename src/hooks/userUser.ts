"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>('cashier'); // Default role
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUserData() {
      // 1. Get the authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (user) {
        setUser(user);
        
        // 2. Fetch the role from our new 'profiles' table
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile) {
          setRole(profile.role);
        }
      }
      setLoading(false);
    }

    getUserData();
  }, []);

  return { user, role, loading };
}