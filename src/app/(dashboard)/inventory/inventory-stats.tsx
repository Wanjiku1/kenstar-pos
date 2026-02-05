"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Package, Users, TrendingUp } from 'lucide-react';

interface InventoryStatsProps {
  items: any[];
  staffCount: number;
}

export function InventoryStats({ items, staffCount }: InventoryStatsProps) {
  const totalValue = items.reduce((acc, item) => acc + (item.price * (item.stock || 0)), 0);
  const lowStock = items.filter(item => (item.stock || 0) < 10).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="bg-blue-600 text-white border-none shadow-lg">
        <CardContent className="pt-6 flex justify-between items-center">
          <div>
            <p className="text-blue-100 text-[10px] font-black uppercase">Total Inventory Value</p>
            <h3 className="text-2xl font-black">KES {totalValue.toLocaleString()}</h3>
          </div>
          <TrendingUp size={32} className="opacity-30" />
        </CardContent>
      </Card>

      <Card className="bg-white border shadow-sm">
        <CardContent className="pt-6 flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase">Team Size</p>
            <h3 className="text-2xl font-black text-slate-800">{staffCount} Members</h3>
          </div>
          <Users size={32} className="text-slate-200" />
        </CardContent>
      </Card>

      <Card className="bg-white border shadow-sm">
        <CardContent className="pt-6 flex justify-between items-center">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase">Low Stock Alerts</p>
            <h3 className="text-2xl font-black text-amber-600">{lowStock} Items</h3>
          </div>
          <Package size={32} className="text-slate-200" />
        </CardContent>
      </Card>
    </div>
  );
}