"use client";

import { useState } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight, CreditCard, Wallet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AccountingView({ salesData }: { salesData: any[] }) {
  // Simple math for the view
  const totalRevenue = salesData.reduce((acc, sale) => acc + sale.total_amount, 0);
  const mpesaTotal = salesData.filter(s => s.payment_method === 'mpesa').reduce((acc, s) => acc + s.total_amount, 0);
  const cashTotal = salesData.filter(s => s.payment_method === 'cash').reduce((acc, s) => acc + s.total_amount, 0);

  return (
    <div className="space-y-6">
      {/* 1. FINANCIAL BREAKDOWN CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-green-50">
          <CardContent className="pt-6 flex justify-between">
            <div>
              <p className="text-green-600 text-xs font-black uppercase">M-Pesa Collections</p>
              <h3 className="text-3xl font-black text-slate-900">KES {mpesaTotal.toLocaleString()}</h3>
            </div>
            <CreditCard className="text-green-200" size={48} />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-blue-50">
          <CardContent className="pt-6 flex justify-between">
            <div>
              <p className="text-blue-600 text-xs font-black uppercase">Cash in Drawer</p>
              <h3 className="text-3xl font-black text-slate-900">KES {cashTotal.toLocaleString()}</h3>
            </div>
            <Wallet className="text-blue-200" size={48} />
          </CardContent>
        </Card>
      </div>

      {/* 2. TRANSACTION LEDGER */}
      <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="font-black text-slate-700 uppercase text-sm">Recent Ledger Entries</h3>
          <span className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold">LIVE SYNC</span>
        </div>
        <table className="w-full">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400">DATE</th>
              <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400">DESCRIPTION</th>
              <th className="px-6 py-3 text-left text-[10px] font-black text-slate-400">METHOD</th>
              <th className="px-6 py-3 text-right text-[10px] font-black text-slate-400">AMOUNT</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {salesData.map((sale) => (
              <tr key={sale.id} className="text-sm">
                <td className="px-6 py-4 text-slate-500 font-mono">
                  {new Date(sale.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 font-bold text-slate-700">Sale #{sale.id.slice(0,8)}</td>
                <td className="px-6 py-4">
                  <span className={`uppercase text-[10px] font-black px-2 py-1 rounded ${
                    sale.payment_method === 'mpesa' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {sale.payment_method}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-black text-slate-900">
                  KES {sale.total_amount.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}