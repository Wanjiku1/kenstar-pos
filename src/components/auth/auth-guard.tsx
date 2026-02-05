"use client";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. THE LOOP BREAKER
    // If we are on login or terminal, STOP EVERYTHING. 
    // Do not check Supabase. Do not redirect. Just show the page.
    if (pathname === '/login' || pathname === '/terminal' || pathname.startsWith('/qr-station')) {
      setLoading(false);
      return;
    }

    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Use replace to avoid messiness in browser history
          router.replace('/login');
        }
      } catch (error) {
        console.error("Auth Error:", error);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [pathname, router]);

  // 2. ONLY show the loading screen for PROTECTED pages
  const isPublic = pathname === '/login' || pathname === '/terminal' || pathname.startsWith('/qr-station');
  
  if (loading && !isPublic) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
         <div className="animate-pulse font-black text-blue-700">KENSTAR OPS: SECURING...</div>
      </div>
    );
  }

  return <>{children}</>;
}