"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Added for navigation
import { supabase } from "@/lib/supabase";
import { printReceipt } from "@/lib/printService";
import { CategoryFilters } from "@/components/pos/CategoryFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, Plus, Tag, Ruler, AlertCircle, Printer, 
  Calendar, LogOut, ChevronLeft, Trash2, Loader2 
} from "lucide-react";
import { toast } from 'sonner';
import { RoleGate } from "@/components/auth/role-gate";

export default function POSPage() {
  const router = useRouter(); // Initialize router
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

  // EXIT SYSTEM HANDLER
  const handleExit = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  // --- WORKLOAD LOGIC ---
  const calculateCollectionDate = async (items: any[]) => {
    if (!isCustomOrder && !needsBranding) {
        setEstCollectionDate('Ready Now');
        return;
    }

    const mainItem = items[0]?.products?.name || "";
    
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
        
        {/* ENHANCED HEADER */}
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-200 hover:bg-slate-100 transition-all"
            >
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <h1 className="text-2xl font-black text-blue-700 italic uppercase leading-none">
              Kenstar <span className="text-slate-400 font-bold">Terminal</span>
            </h1>
          </div>

          <div className="flex items-center gap-6">
            <div className="bg-slate-900 text-white px-6 py-2 rounded-2xl flex items-center gap-4 shadow-lg shadow-blue-900/10">
               <div className="text-right">
                  <p className="text-[8px] uppercase font-black opacity-50 tracking-widest leading-none">Ready By</p>
                  <p className="text-xs font-black text-orange-400 mt-1">{estCollectionDate || '---'}</p>
               </div>
               <div className="h-8 w-[1px] bg-white/10" />
               <div className="text-right">
                  <p className="text-[8px] uppercase font-black opacity-50 tracking-widest leading-none">Today Rev</p>
                  <p className="text-sm font-black text-blue-400 mt-1">KES {todayRevenue.toLocaleString()}</p>
               </div>
            </div>

            {/* EXIT BUTTON */}
            <button 
              onClick={handleExit}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 font-black rounded-xl hover:bg-red-600 hover:text-white transition-all text-[10px] uppercase tracking-widest border border-red-100"
            >
              <LogOut size={16} /> Exit System
            </button>
          </div>
        </header>

        <div className="flex-grow grid grid-cols-12 gap-6 p-6 overflow-hidden">
          
          {/* SEARCH & PRODUCTS */}
          <div className="col-span-8 flex flex-col gap-4 overflow-hidden">
            <div className="relative">
              <Input 
                  placeholder="SCAN OR SEARCH UNIFORMS..." 
                  value={search} onChange={(e) => setSearch(e.target.value)} 
                  className="py-7 pl-12 text-lg font-black bg-white border-none shadow-md rounded-2xl"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            </div>
            
            <CategoryFilters activeCategory={category} setCategory={setCategory} />
            
            <div className="flex-grow overflow-y-auto grid grid-cols-4 gap-4 pb-20 scrollbar-hide">
              {products.map(p => (
                <Card key={p.id} className="cursor-pointer hover:border-blue-500 rounded-2xl shadow-sm hover:shadow-md transition-all group" onClick={() => addToCart(p)}>
                  <CardContent className="p-4">
                    <p className="font-black text-slate-800 uppercase text-xs truncate group-hover:text-blue-600">{p.products?.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tight">{p.size} • KES {p.price.toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* CHECKOUT SIDEBAR */}
          <div className="col-span-4 bg-white rounded-[2.5rem] border shadow-2xl flex flex-col overflow-hidden border-slate-200">
            <div className="p-6 border-b flex justify-between gap-2 bg-slate-50/50">
              <button 
                onClick={() => setIsCustomOrder(!isCustomOrder)} 
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black transition-all ${isCustomOrder ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-white text-slate-400 border border-slate-200'}`}>
                <Ruler size={14}/> WORKSHOP
              </button>
              <button 
                onClick={() => setNeedsBranding(!needsBranding)} 
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black transition-all ${needsBranding ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-slate-400 border border-slate-200'}`}>
                <Printer size={14}/> BRANDING
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-5 space-y-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cart Items</h3>
                {cart.length > 0 && (
                  <button onClick={() => setCart([])} className="text-red-500 flex items-center gap-1 text-[10px] font-black uppercase">
                    <Trash2 size={12} /> Clear
                  </button>
                )}
              </div>
              
              {cart.map((item, i) => (
                <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center group">
                  <div className="flex-1">
                    <p className="font-black text-slate-800 text-xs uppercase">{item.products?.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-bold text-slate-400">PRICE: </span>
                      <input 
                        type="number"
                        className="w-20 text-[11px] font-black bg-transparent border-b border-slate-200 outline-none focus:border-blue-500"
                        value={item.finalPrice}
                        onChange={(e) => {
                           const price = Number(e.target.value);
                           setCart(cart.map((c, idx) => idx === i ? { ...c, finalPrice: price } : c));
                        }}
                      />
                    </div>
                  </div>
                  <button 
                    onClick={() => setCart(cart.filter((_, idx) => idx !== i))}
                    className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              
              {cart.length === 0 && (
                <div className="h-40 flex flex-col items-center justify-center text-slate-300 opacity-50 italic">
                   <ShoppingCart size={32} className="mb-2" />
                   <p className="text-[10px] font-bold uppercase tracking-widest">Terminal Empty</p>
                </div>
              )}
            </div>

            {(isCustomOrder || needsBranding) && (
              <div className="px-6 pb-4">
                <textarea 
                  placeholder="Tailoring measurements or Branding details..."
                  className="w-full p-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-blue-500/20"
                  rows={2}
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                />
              </div>
            )}

            {/* PAYMENT SECTION */}
            <div className="p-8 bg-slate-900 text-white rounded-t-[3rem] shadow-[0_-20px_50px_rgba(0,0,0,0.2)]">
              <div className="flex justify-between items-end mb-4">
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Subtotal KES</span>
                <span className="text-3xl font-black text-blue-400 tracking-tighter">{total.toLocaleString()}</span>
              </div>

              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-500 uppercase">Paid</span>
                <input 
                  type="text" 
                  placeholder="0.00" 
                  className="w-full bg-white/5 border border-white/10 p-4 pl-14 rounded-2xl text-xl font-black outline-none focus:border-blue-500 transition-all"
                  value={amountPaid} onChange={(e) => setAmountPaid(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <Button 
                  onClick={() => setPaymentMethod('cash')} 
                  className={`h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${paymentMethod === 'cash' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400'}`}
                >
                  CASH
                </Button>
                <Button 
                  onClick={() => setPaymentMethod('mpesa')} 
                  className={`h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all ${paymentMethod === 'mpesa' ? 'bg-green-600 text-white' : 'bg-white/5 text-slate-400'}`}
                >
                  M-PESA
                </Button>
              </div>

              {paymentMethod && cart.length > 0 && (
                <Button 
                  onClick={handleCheckout} 
                  className="w-full bg-blue-500 text-white h-16 rounded-2xl font-black uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all shadow-xl shadow-blue-500/20"
                >
                  Confirm & Finalize
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </RoleGate>
  );
}

// Inline missing icon
function ShoppingCart({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" width={size} height={size} 
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" 
      strokeLinecap="round" strokeLinejoin="round" className={className}
    >
      <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
    </svg>
  );
}