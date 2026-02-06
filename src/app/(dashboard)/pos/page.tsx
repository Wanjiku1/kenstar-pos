"use client";

import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import { printReceipt } from "@/lib/printService";
import { CategoryFilters } from "@/components/pos/CategoryFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plus, Tag, Ruler, AlertCircle, Printer, Calendar } from "lucide-react";
import { toast } from 'sonner';
import { RoleGate } from "@/components/auth/role-gate";

export default function POSPage() {
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [category, setCategory] = useState('all');
  
  // Custom Routing States
  const [isCustomOrder, setIsCustomOrder] = useState(false);
  const [needsBranding, setNeedsBranding] = useState(false);
  const [customNotes, setCustomNotes] = useState('');
  const [estCollectionDate, setEstCollectionDate] = useState<string>('');

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | null>(null);
  const [amountPaid, setAmountPaid] = useState<string>(''); 
  const [todayRevenue, setTodayRevenue] = useState(0);

  const KENSTAR_ORG_ID = '67c3b288-a233-4104-b769-2c0f60ec3ffb';
  
  // --- WORKLOAD LOGIC ---
  const calculateCollectionDate = async (items: any[]) => {
    // If no production is needed, collection is today
    if (!isCustomOrder && !needsBranding) {
        setEstCollectionDate('Ready Now');
        return;
    }

    // Example logic: Find the "heaviest" item (e.g., Tracksuit)
    const mainItem = items[0]?.products?.name || "";
    
    // Check Jane's capacity for this item type
    const { data: capacity } = await supabase
      .from('staff_capacity')
      .select('daily_limit')
      .ilike('specialty', `%${mainItem}%`)
      .single();

    const { count } = await supabase
      .from('production_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const limit = capacity?.daily_limit || 5;
    const daysOut = Math.ceil(((count || 0) + 1) / limit);
    
    const date = new Date();
    date.setDate(date.getDate() + daysOut);
    setEstCollectionDate(date.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'short' }));
  };

  useEffect(() => {
    if (cart.length > 0) calculateCollectionDate(cart);
  }, [cart, isCustomOrder, needsBranding]);

  // --- STANDARD FETCHERS ---
  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('sales').select('deposit_amount').eq('org_id', KENSTAR_ORG_ID).gte('created_at', today);
    if (data) setTodayRevenue(data.reduce((sum, s) => sum + Number(s.deposit_amount), 0));
  };

  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    const getProducts = async () => {
      let query = supabase.from('product_variants').select('*, products(name, category)');
      if (search.length > 0) query = query.ilike('sku', `%${search}%`); 
      else if (category !== 'all') query = query.eq('products.category', category);
      else query = query.limit(20);
      const { data } = await query;
      if (data) setProducts(data);
    };
    getProducts();
  }, [search, category]);

  const addToCart = (p: any) => {
    setCart([...cart, { ...p, quantity: 1, originalPrice: p.price, finalPrice: p.price }]);
    setSearch(''); 
  };

  const total = cart.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
  const balance = total - Number(amountPaid || 0);

  // --- ADVANCED CHECKOUT ---
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const isPartial = Number(amountPaid) < total;

    try {
      const { data: sale, error: saleError } = await supabase.from('sales').insert([{
        total_amount: total,
        deposit_amount: Number(amountPaid) || total,
        balance_amount: balance > 0 ? balance : 0,
        payment_method: paymentMethod,
        collection_status: (isCustomOrder || needsBranding || isPartial) ? 'to_collect' : 'collected',
        is_custom_order: isCustomOrder,
        org_id: KENSTAR_ORG_ID
      }]).select().single();

      if (saleError) throw saleError;

      // Determine starting department
      // 1. If Workshop is needed (custom), start there.
      // 2. If ONLY branding is needed (stock item + logo), start branding.
      const startDept = isCustomOrder ? 'workshop' : (needsBranding ? 'branding' : 'completed');
      const totalStages = (isCustomOrder && needsBranding) ? 2 : 1;

      if (startDept !== 'completed') {
        await supabase.from('production_tasks').insert([{
          sale_id: sale.id,
          status: 'pending',
          department: startDept,
          current_stage: 1,
          total_stages: totalStages,
          estimated_collection_date: new Date(estCollectionDate),
          notes: `${needsBranding ? "[BRANDING NEEDED] " : ""}${customNotes}`
        }]);
      }

      toast.success(`Success! Collection: ${estCollectionDate}`);
      setCart([]); setIsCustomOrder(false); setNeedsBranding(false); setAmountPaid(''); setPaymentMethod(null);
      fetchStats();

    } catch (error: any) {
      toast.error("Checkout Failed: " + error.message);
    }
  };

  return (
    <RoleGate allowedRoles={['founder', 'admin', 'manager', 'sales', 'cashier']}>
      <div className="flex flex-col h-screen bg-slate-100 overflow-hidden font-sans">
        
        {/* HEADER */}
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
          <h1 className="text-2xl font-black text-blue-700 italic uppercase">Kenstar <span className="text-slate-400">Terminal</span></h1>
          <div className="bg-slate-900 text-white px-6 py-2 rounded-2xl flex items-center gap-4">
             <div className="text-right">
                <p className="text-[8px] uppercase font-black opacity-50 tracking-widest">Est. Collection</p>
                <p className="text-xs font-black text-orange-400">{estCollectionDate || '---'}</p>
             </div>
             <div className="h-8 w-[1px] bg-white/10" />
             <div className="text-right">
                <p className="text-[8px] uppercase font-black opacity-50 tracking-widest">Today</p>
                <p className="text-sm font-black text-blue-400">KES {todayRevenue.toLocaleString()}</p>
             </div>
          </div>
        </header>

        <div className="flex-grow grid grid-cols-12 gap-6 p-6 overflow-hidden">
          
          {/* SEARCH & PRODUCTS */}
          <div className="col-span-8 flex flex-col gap-4 overflow-hidden">
            <Input 
                placeholder="SEARCH UNIFORMS..." 
                value={search} onChange={(e) => setSearch(e.target.value)} 
                className="py-7 text-lg font-black bg-white border-none shadow-sm rounded-2xl"
            />
            <CategoryFilters activeCategory={category} setCategory={setCategory} />
            
            <div className="flex-grow overflow-y-auto grid grid-cols-4 gap-4 pb-20 scrollbar-hide">
              {products.map(p => (
                <Card key={p.id} className="cursor-pointer hover:border-blue-500 rounded-2xl shadow-sm" onClick={() => addToCart(p)}>
                  <CardContent className="p-4">
                    <p className="font-black text-slate-800 uppercase text-xs truncate">{p.products?.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{p.size} • KES {p.price}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CHECKOUT SIDEBAR */}
          <div className="col-span-4 bg-white rounded-[2.5rem] border shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b flex justify-between gap-2">
              <button 
                onClick={() => setIsCustomOrder(!isCustomOrder)} 
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black transition-all ${isCustomOrder ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-slate-100 text-slate-400'}`}>
                <Ruler size={14}/> WORKSHOP
              </button>
              <button 
                onClick={() => setNeedsBranding(!needsBranding)} 
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black transition-all ${needsBranding ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                <Printer size={14}/> BRANDING
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-4 space-y-3">
              {cart.map((item, i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="font-black text-slate-800 text-xs uppercase">{item.products?.name}</p>
                  <input 
                      type="number"
                      className="mt-2 w-full text-xs font-black bg-transparent border-b border-slate-200 outline-none focus:border-blue-500"
                      value={item.finalPrice}
                      onChange={(e) => {
                         const price = Number(e.target.value);
                         setCart(cart.map(c => c.id === item.id ? { ...c, finalPrice: price } : c));
                      }}
                    />
                </div>
              ))}
            </div>

            {(isCustomOrder || needsBranding) && (
              <div className="px-6 pb-4">
                <textarea 
                  placeholder="Tailoring measurements or Branding details (Logo size, etc)..."
                  className="w-full p-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-blue-500"
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                />
              </div>
            )}

            {/* PAYMENT */}
            <div className="p-8 bg-slate-900 text-white rounded-t-[2.5rem] space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Total KES</span>
                <span className="text-3xl font-black text-blue-400">{total.toLocaleString()}</span>
              </div>

              <input 
                type="text" placeholder="Deposit Amount" 
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-xl font-black outline-none focus:border-blue-500"
                value={amountPaid} onChange={(e) => setAmountPaid(e.target.value.replace(/\D/g, ''))}
              />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button onClick={() => setPaymentMethod('cash')} className={`h-14 rounded-2xl font-black ${paymentMethod === 'cash' ? 'bg-blue-600' : 'bg-white/5'}`}>CASH</Button>
                <Button onClick={() => setPaymentMethod('mpesa')} className={`h-14 rounded-2xl font-black ${paymentMethod === 'mpesa' ? 'bg-green-600' : 'bg-white/5'}`}>M-PESA</Button>
              </div>

              {paymentMethod && (
                <Button onClick={handleCheckout} className="w-full bg-white text-slate-900 h-14 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all">
                  Confirm Order
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}