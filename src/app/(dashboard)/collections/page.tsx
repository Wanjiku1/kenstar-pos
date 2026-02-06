"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  UserCheck, 
  Wallet, 
  Clock, 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle,
  ShoppingBag
} from 'lucide-react';
import { toast } from 'sonner';
import { RoleGate } from "@/components/auth/role-gate";
import { Input } from "@/components/ui/input";

export default function CollectionsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCollections = async () => {
    setLoading(true);
    // Fetch sales that are NOT yet collected
    const { data, error } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items(quantity, unit_price, product_variants(size, products(name))),
        production_tasks(status)
      `)
      .neq('collection_status', 'collected')
      .order('created_at', { ascending: false });

    if (data) setOrders(data);
    setLoading(false);
  };

  const handleClearCollection = async (saleId: string, balance: number) => {
    if (balance > 0) {
      const confirmed = confirm(`Customer still owes KES ${balance}. Have they paid this now?`);
      if (!confirmed) return;
    }

    const { error } = await supabase
      .from('sales')
      .update({ 
        collection_status: 'collected',
        balance_amount: 0,
        deposit_amount: orders.find(o => o.id === saleId).total_amount 
      })
      .eq('id', saleId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success("Order marked as COLLECTED and CLEARED");
      fetchCollections();
    }
  };

  useEffect(() => { fetchCollections(); }, []);

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(search.toLowerCase()) || 
    (o.payment_ref && o.payment_ref.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <RoleGate allowedRoles={['manager', 'admin', 'founder', 'cashier']}>
      <div className="p-8 max-w-6xl mx-auto space-y-8 min-h-screen bg-slate-50">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Collections & Debts</h1>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Pending Pickups • Unpaid Balances</p>
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder="Search by Order ID or M-Pesa Ref..." 
              className="pl-12 py-6 rounded-2xl border-slate-200 bg-white shadow-sm font-bold"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Total Debt Owed</p>
            <p className="text-3xl font-black text-red-600">KES {orders.reduce((sum, o) => sum + Number(o.balance_amount), 0).toLocaleString()}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Ready for Pickup</p>
            <p className="text-3xl font-black text-emerald-600">
              {orders.filter(o => o.production_tasks?.every((t:any) => t.status === 'completed')).length} Orders
            </p>
          </div>
        </div>

        {/* LIST SECTION */}
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isReady = order.production_tasks?.every((t: any) => t.status === 'completed');
            const hasDebt = order.balance_amount > 0;

            return (
              <div key={order.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-xl transition-all group">
                
                {/* INFO */}
                <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className={`p-4 rounded-3xl ${isReady ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-500'}`}>
                    {isReady ? <ShoppingBag size={24} /> : <Clock size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-slate-900 uppercase">Order #{order.id.slice(0, 8)}</p>
                      {order.is_custom_order && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded text-[8px] font-black uppercase">Custom</span>}
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                      {order.sale_items?.map((i: any) => `${i.quantity}x ${i.product_variants?.products?.name}`).join(', ')}
                    </p>
                  </div>
                </div>

                {/* STATUS & PAYMENT */}
                <div className="flex flex-col md:flex-row items-center gap-8 w-full md:w-auto">
                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Payment Status</p>
                    {hasDebt ? (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle size={14} />
                        <p className="font-black">OWES KES {order.balance_amount.toLocaleString()}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 size={14} />
                        <p className="font-black uppercase text-xs tracking-tight">Fully Paid</p>
                      </div>
                    )}
                  </div>

                  <div className="text-center md:text-right">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Production</p>
                    <p className={`font-black uppercase text-xs ${isReady ? 'text-emerald-600' : 'text-orange-500'}`}>
                      {isReady ? 'Ready for Collection' : 'In Factory'}
                    </p>
                  </div>

                  {/* ACTION BUTTON */}
                  <button 
                    onClick={() => handleClearCollection(order.id, order.balance_amount)}
                    className={`px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all w-full md:w-auto shadow-lg
                      ${isReady 
                        ? 'bg-slate-900 text-white hover:bg-blue-600 hover:-translate-y-1' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'}
                    `}
                    disabled={!isReady}
                  >
                    {hasDebt ? 'Clear Balance & Release' : 'Mark Collected'}
                  </button>
                </div>
              </div>
            );
          })}

          {filteredOrders.length === 0 && (
            <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
              <UserCheck size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="font-black text-slate-400 uppercase tracking-widest">No pending collections found</p>
            </div>
          )}
        </div>
      </div>
    </RoleGate>
  );
}