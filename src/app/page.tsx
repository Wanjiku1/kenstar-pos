"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShoppingCart, Factory, Package, ShieldCheck } from "lucide-react";

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true); // Hydration fix for Next.js
  }, []);

  if (!isMounted) return <div className="min-h-screen bg-slate-50" />;

  return (
    <main className="p-8 max-w-6xl mx-auto min-h-screen font-sans bg-[#f8fafc]">
      
      {/* 🟢 KENSTAR BRANDED HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-12">
        <div className="flex items-center gap-6">
          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200">
            <ShieldCheck size={28} className="text-[#007a43]" />
          </div>
          <div>
            <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 uppercase leading-none">
              Kenstar <span className="text-[#007a43]">Operations</span>
            </h1>
            <p className="text-muted-foreground font-bold uppercase text-xs tracking-widest mt-1">
              Kenstar Uniforms Manufacturing & Retail System
            </p>
          </div>
        </div>
      </div>

      <div className="h-px bg-slate-200 mb-12" />

      {/* 🚀 NAVIGATION TILES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <ModuleCard 
          title="POS Terminal" 
          desc="POINT OF SALE" 
          icon={<ShoppingCart className="w-6 h-6" />} 
          href="/pos" 
        />
        <ModuleCard 
          title="Inventory Terminal" 
          desc="STOCK MANAGEMENT,OPERATIONS & ANALYTICS" 
          icon={<Package className="w-6 h-6" />} 
          href="/inventory" 
        />
        <ModuleCard 
          title="Factory Terminal" 
          desc="PRODUCT DESIGN, PRODUCTION PLANNING & FACTORY MANAGEMENT" 
          icon={<Factory className="w-6 h-6" />} 
          href="/factory" 
        />
      </div>
    </main>
  );
}

function ModuleCard({ title, desc, icon, href }: { title: string; desc: string; icon: React.ReactNode; href: string }) {
  return (
    <Card className="border-t-4 border-t-[#007a43] hover:shadow-xl transition-all rounded-[2.5rem] bg-white shadow-sm flex flex-col justify-between h-[260px]">
      <CardHeader>
        <div className="mb-2 p-3 bg-slate-50 w-fit rounded-xl border border-slate-100 text-[#007a43]">{icon}</div>
        <CardTitle className="font-black uppercase tracking-tight text-lg text-slate-900">{title}</CardTitle>
        <CardDescription className="text-[11px] font-bold text-slate-400 uppercase tracking-tight leading-snug">
          {desc}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8">
        <Link href={href}>
          <Button className="w-full font-black uppercase text-[10px] tracking-widest py-6 rounded-2xl text-white bg-[#007a43] hover:bg-[#005c32] shadow-md shadow-green-900/10 transition-all">
            Enter {title.split(' ')[0]} Hub
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}