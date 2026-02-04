"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If no session and NOT on the login page, redirect to login
      if (!session && pathname !== '/login') {
  router.push('/login');
} else {
        setAuthenticated(true);
      }
      setLoading(false);
    };

    checkUser();
  }, [pathname, router]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
       <div className="animate-pulse font-black text-blue-700">KENSTAR OPS: SECURING SESSION...</div>
    </div>
  );

  return <>{children}</>;
}