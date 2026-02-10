"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShoppingCart, Factory, Package, Banknote, AlertTriangle } from "lucide-react";

export default function Home() {
  const [todaySales, setTodaySales] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false); // NEW: Fixes Hydration

  useEffect(() => {
    setIsMounted(true); // Tell React we are safely in the browser
    
    async function getDashboardData() {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch Sales
        const { data: salesData } = await supabase
          .from('sales')
          .select('total_amount')
          .gte('created_at', today.toISOString());

        if (salesData) {
          const total = salesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
          setTodaySales(total);
        }

        // Fetch Low Stock
        const { data: stockData } = await supabase
          .from('product_variants')
          .select('*, products(name)')
          .lt('stock_quantity', 10);

        if (stockData) setLowStockItems(stockData);
      } catch (error) {
        console.error("Dashboard Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    }
    
    getDashboardData();
  }, []);

  // IMPORTANT: Show nothing (or a spinner) until mounted to prevent UI breaks
  if (!isMounted) return <div className="min-h-screen bg-slate-50" />;

  return (
    <main className="p-8 max-w-6xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-slate-900 uppercase">
            Kenstar <span className="text-blue-600">Operations</span>
          </h1>
          <p className="text-muted-foreground font-medium uppercase text-xs tracking-widest mt-1">
            Uniform Manufacturing & Retail System
          </p>
        </div>
        
        {/* REVENUE STAT CARD */}
        <div className="bg-white border shadow-sm p-5 rounded-3xl flex items-center gap-5 min-w-[240px]">
          <div className="bg-green-100 p-3 rounded-2xl">
            <Banknote className="text-green-600 w-7 h-7" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Revenue Today</p>
            <p className="text-2xl font-black text-slate-900">
              {loading ? "..." : `KES ${todaySales.toLocaleString()}`}
            </p>
          </div>
        </div>
      </div>

      {/* LOW STOCK ALERTS */}
      {lowStockItems.length > 0 && (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-[2rem] shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-amber-800 font-black uppercase text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <span>Production Warnings: {lowStockItems.length} items low</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-2xl border border-amber-100 flex justify-between items-center shadow-sm">
                <div>
                  <p className="text-xs font-black text-slate-900 uppercase">{item.products?.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Size: {item.size}</p>
                </div>
                <span className="text-red-600 font-black bg-red-50 px-3 py-1 rounded-lg text-[10px] uppercase">
                  {item.stock_quantity} Left
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NAVIGATION GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ModuleCard 
          title="Sales Terminal" 
          desc="Process new customer orders" 
          icon={<ShoppingCart />} 
          color="blue" 
          href="/pos" 
        />
        <ModuleCard 
          title="Inventory" 
          desc="Manage stock & variants" 
          icon={<Package />} 
          color="emerald" 
          href="/inventory" 
        />
        <ModuleCard 
          title="Factory Admin" 
          desc="Raw materials & production" 
          icon={<Factory />} 
          color="orange" 
          href="/factory" 
        />
      </div>
    </main>
  );
}

// Reusable Module Card for cleaner code
function ModuleCard({ title, desc, icon, color, href }: any) {
  const colors: any = {
    blue: "border-t-blue-600 text-blue-600",
    emerald: "border-t-emerald-600 text-emerald-600",
    orange: "border-t-orange-600 text-orange-600"
  };

  return (
    <Card className={`border-t-4 ${colors[color]} hover:shadow-xl transition-all rounded-[2rem]`}>
      <CardHeader>
        <div className="mb-2">{icon}</div>
        <CardTitle className="font-black uppercase tracking-tight">{title}</CardTitle>
        <CardDescription className="text-[10px] font-bold uppercase">{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={href}>
          <Button className="w-full font-black uppercase text-[10px] tracking-widest py-6 rounded-2xl">
            Open {title.split(' ')[0]}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}