
"use client";
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShoppingCart, Factory, Package, Banknote, TrendingUp } from "lucide-react";
import { AlertTriangle } from "lucide-react"; // Add this import

export default function Home() {
  const [todaySales, setTodaySales] = useState(0);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getDashboardData() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Fetch Sales
      const { data: salesData } = await supabase
        .from('sales')
        .select('total_amount')
        .gte('created_at', today.toISOString());

      if (salesData) {
        const total = salesData.reduce((sum, sale) => sum + (sale.total_amount || 0), 0);
        setTodaySales(total);
      }

      // 2. Fetch Low Stock Items (less than 10 units)
      const { data: stockData } = await supabase
        .from('product_variants')
        .select('*, products(name)')
        .lt('stock_quantity', 10);

      if (stockData) setLowStockItems(stockData);
      
      setLoading(false);
    }
    getDashboardData();
  }, []);

  return (
    <main className="p-8 max-w-6xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Kenstar Operations</h1>
          <p className="text-muted-foreground italic">Uniform Manufacturing & Retail System</p>
        </div>
        
        {/* REVENUE STAT CARD */}
        <div className="bg-white border shadow-sm p-5 rounded-2xl flex items-center gap-5 min-w-[240px]">
          <div className="bg-green-100 p-3 rounded-xl">
            <Banknote className="text-green-600 w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue Today</p>
            <p className="text-2xl font-black text-slate-900">
              {loading ? "..." : `KES ${todaySales.toLocaleString()}`}
            </p>
          </div>
        </div>
      </div>

{/* LOW STOCK ALERTS */}
{lowStockItems.length > 0 && (
  <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
    <div className="flex items-center gap-2 mb-3 text-amber-800 font-bold">
      <AlertTriangle className="w-5 h-5" />
      <span>Production Warnings: {lowStockItems.length} items low on stock</span>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {lowStockItems.map((item) => (
        <div key={item.id} className="bg-white p-3 rounded-lg border border-amber-100 flex justify-between items-center shadow-sm">
          <div>
            <p className="text-sm font-medium">{item.products?.name}</p>
            <p className="text-xs text-slate-500">Size: {item.size} | SKU: {item.sku}</p>
          </div>
          <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded text-xs">
            {item.stock_quantity} left
          </span>
        </div>
      ))}
    </div>
  </div>
)}

      {/* NAVIGATION GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* POS CARD */}
        <Card className="border-t-4 border-t-blue-600 hover:shadow-lg transition-all">
          <CardHeader>
            <ShoppingCart className="w-10 h-10 text-blue-600 mb-2" />
            <CardTitle>Sales Terminal</CardTitle>
            <CardDescription>Process new customer orders</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/pos">
              <Button className="w-full bg-blue-600 hover:bg-blue-700">Open POS</Button>
            </Link>
          </CardContent>
        </Card>

        {/* INVENTORY CARD */}
        <Card className="border-t-4 border-t-emerald-600 hover:shadow-lg transition-all">
          <CardHeader>
            <Package className="w-10 h-10 text-emerald-600 mb-2" />
            <CardTitle>Inventory</CardTitle>
            <CardDescription>Manage stock & variants</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/inventory">
              <Button variant="outline" className="w-full border-emerald-200 hover:bg-emerald-50">View Stock</Button>
            </Link>
          </CardContent>
        </Card>

        {/* FACTORY CARD */}
        <Card className="border-t-4 border-t-orange-600 hover:shadow-lg transition-all">
          <CardHeader>
            <Factory className="w-10 h-10 text-orange-600 mb-2" />
            <CardTitle>Factory Admin</CardTitle>
            <CardDescription>Raw materials & production</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/factory">
              <Button variant="outline" className="w-full border-orange-200 hover:bg-orange-50">Manage Factory</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}