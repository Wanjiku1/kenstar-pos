"use client";

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { printReceipt } from '../../lib/printService';
import { CategoryFilters } from '../../components/pos/CategoryFilters';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Search, Receipt, Smartphone, Plus } from "lucide-react";
import { toast } from 'sonner';

export default function POSPage() {
  // --- STATE MANAGEMENT ---
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [category, setCategory] = useState('all');
  
  // Payment States
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mpesa' | null>(null);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [matchingStatus, setMatchingStatus] = useState<'idle' | 'waiting' | 'matched'>('idle');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [matchedRef, setMatchedRef] = useState('');
  
  // Stats
  const [todayRevenue, setTodayRevenue] = useState(0);

  // CONSTANTS
  const KENSTAR_ORG_ID = '67c3b288-a233-4104-b769-2c0f60ec3ffb';
  
  // Inside your POSPage component
const quickItems = [
  { 
    id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', // This matches the Bag ID in SQL
    products: { name: '🛍️ Carrier Bag' }, 
    size: 'L', 
    price: 20, 
    sku: 'BAG-L' 
  },
  { 
    id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', // This matches the Alteration ID in SQL
    products: { name: '✂️ Alteration' }, 
    size: 'Std', 
    price: 100, 
    sku: 'SERV-ALT' 
  }
];
  // --- LOGIC: FETCH STATS ---
  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('sales').select('total_amount').eq('org_id', KENSTAR_ORG_ID).gte('created_at', today);
    if (data) setTodayRevenue(data.reduce((sum, s) => sum + s.total_amount, 0));
  };
  useEffect(() => { fetchStats(); }, []);

  // --- LOGIC: SEARCH & FILTER ---
  useEffect(() => {
    const getProducts = async () => {
      let query = supabase.from('product_variants').select('*, products(name, category)');

      if (search.length > 0) {
        query = query.ilike('sku', `%${search}%`); // Search by SKU
      } else if (category !== 'all') {
        query = query.eq('products.category', category); // Filter by Category
      } else {
        query = query.limit(20); // Default view
      }

      const { data } = await query;
      if (data) setProducts(data);
    };
    getProducts();
  }, [search, category]);

  // --- LOGIC: CART ---
  const addToCart = (p: any) => {
    // Check if item already exists
    const existing = cart.find(item => item.id === p.id);
    if (existing) {
      setCart(cart.map(item => item.id === p.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { ...p, quantity: 1 }]);
    }
    setSearch(''); // Clear search to be ready for next scan
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // --- LOGIC: M-PESA ---
  const startMatching = () => {
    if (!phoneNumber) return alert("Please enter a phone number");
    setMatchingStatus('waiting');
    
    const channel = supabase.channel('mpesa_check')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mpesa_transactions' }, (payload) => {
        // Check if phone matches and payment is unclaimed
        if (payload.new.phone_number.includes(phoneNumber) && !payload.new.is_claimed) {
          setMatchedRef(payload.new.receipt_number);
          setMatchingStatus('matched');
          // Optional: Auto-select payment method if matched
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };
 const handleCheckout = async () => {
    if (cart.length === 0) return;
    const calculatedChange = Number(amountPaid) - total;
    toast.success("Sale Completed Successfully", {
  description: `KES ${total.toLocaleString()} - Receipt Printed`,
});

    try {
    const { data: sale, error: saleError } = await supabase.from('sales').insert([{
      total_amount: total,
      payment_method: paymentMethod,
      payment_ref: matchedRef || null,
      org_id: KENSTAR_ORG_ID
    }]).select().single();
    if (saleError || !sale) throw new Error("Failed to save sale record");
      for (const item of cart) {
        await supabase.from('sale_items').insert([{ sale_id: sale.id, variant_id: item.id, quantity: item.quantity, unit_price: item.price }]);
        await supabase.rpc('decrement_stock', { row_id: item.id, amount: item.quantity });
      }

      const receiptData = {
      payment_method: paymentMethod,
      payment_ref: matchedRef || null,
      amount_paid: paymentMethod === 'cash' ? Number(amountPaid) : total,
      change: paymentMethod === 'cash' ? (Number(amountPaid) - total) : 0
    };
      printReceipt({ 
  payment_method: paymentMethod, 
  amount_paid: amountPaid, 
  change: (Number(amountPaid) - total),
  payment_ref: matchedRef 
}, cart, total);
     setCart([]);             // Empties the shopping cart
    setAmountPaid('');       // Clears the cash received box
    setPaymentMethod(null);  // Resets payment buttons
    setSearch('');           // Clears search bar
    setPhoneNumber('');      // Clears M-Pesa phone
    setMatchedRef('');       // Clears M-Pesa ref
    setMatchingStatus('idle');
    await fetchStats();
    
    toast.success("Sale Completed", {
      description: `KES ${total.toLocaleString()} collected. System ready.`,
      duration: 2000, // This stays on screen for 2 seconds then vanishes
    });

  } catch (error: any) {
    console.error("Checkout failed:", error);
    alert("Error: " + error.message);
  }
};
  // --- RENDER ---
  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden font-sans">
      
      {/* 1. TOP BAR */}
      <header className="bg-white border-b px-6 py-4 shadow-sm z-10 flex justify-between items-center">
        <div className="flex items-center gap-6 w-full max-w-4xl">
          <h1 className="text-2xl font-black text-blue-700 tracking-tighter">KENSTAR<span className="text-slate-400">POS</span></h1>
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <Input 
              placeholder="SCAN BARCODE OR SEARCH PRODUCT..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="pl-12 py-6 text-lg font-bold bg-slate-50 border-slate-200 focus:ring-2 ring-blue-500 rounded-xl"
            />
          </div>
        </div>
        
        <div className="bg-slate-900 text-white px-5 py-2 rounded-xl text-right shadow-lg">
          <p className="text-[10px] uppercase font-bold opacity-60">Revenue Today</p>
          <p className="text-xl font-black">KES {todayRevenue.toLocaleString()}</p>
        </div>
      </header>

      <div className="flex-grow grid grid-cols-12 gap-6 p-6 overflow-hidden">
        
        {/* 2. LEFT: DISCOVERY */}
        <div className="col-span-8 flex flex-col gap-4 overflow-hidden">
          <CategoryFilters activeCategory={category} setCategory={setCategory} />

          {/* Quick Add Bar */}
          <div className="grid grid-cols-3 gap-3">
            {quickItems.map((item, idx) => (
              <button 
                key={idx} 
                onClick={() => addToCart(item)}
                className="flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group"
              >
                <div className="text-left">
                  <p className="font-bold text-slate-700 text-sm">{item.products.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold">KES {item.price}</p>
                </div>
                <div className="bg-slate-100 p-1 rounded-full group-hover:bg-blue-100 text-slate-400 group-hover:text-blue-600"><Plus size={16}/></div>
              </button>
            ))}
          </div>

          {/* Product Grid */}
          <div className="flex-grow overflow-y-auto grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20 pr-2">
            {products.map(p => (
              <Card 
                key={p.id} 
                className="cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all active:scale-95 group border-transparent shadow-sm"
                onClick={() => addToCart(p)}
              >
                <CardContent className="p-4 flex flex-col h-full justify-between">
                  <div>
                    <p className="font-bold text-slate-800 leading-tight mb-1">{p.products?.name}</p>
                    <p className="text-xs text-slate-400 font-medium uppercase">{p.size} | SKU: {p.sku}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-end">
                    <p className="text-lg font-black text-blue-600">KES {p.price}</p>
                    <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={18} strokeWidth={3} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 3. RIGHT: CHECKOUT SIDEBAR */}
        <div className="col-span-4 bg-white rounded-3xl border shadow-xl flex flex-col overflow-hidden">
          <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
            <h2 className="font-black text-slate-700 flex items-center gap-2"><ShoppingCart className="text-blue-600"/> CURRENT SALE</h2>
            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">{cart.length} ITEMS</span>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-2">
            {cart.map((item, i) => (
              <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex-grow">
                  <p className="font-bold text-slate-800 text-sm">{item.products?.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Size: {item.size}</p>
                </div>
                <div className="text-right mr-3">
                  <p className="font-bold text-slate-900">KES {item.price}</p>
                  <p className="text-[10px] text-slate-400">Qty: {item.quantity}</p>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-slate-300 hover:text-red-500 p-2">×</button>
              </div>
            ))}
          </div>

          {/* PAYMENT SECTION */}
          <div className="p-6 bg-slate-900 text-white space-y-4">
            <div className="flex justify-between items-end pb-4 border-b border-slate-700">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Amount</span>
              <span className="text-3xl font-black">KES {total.toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => setPaymentMethod('cash')}
                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                className={`h-12 font-bold ${paymentMethod === 'cash' ? 'bg-blue-600' : 'bg-transparent border-slate-600 text-slate-300'}`}
              >
                CASH
              </Button>
              <Button 
                onClick={() => { setPaymentMethod('mpesa'); setAmountPaid(''); }}
                variant={paymentMethod === 'mpesa' ? 'default' : 'outline'}
                className={`h-12 font-bold ${paymentMethod === 'mpesa' ? 'bg-green-600' : 'bg-transparent border-slate-600 text-slate-300'}`}
              >
                M-PESA
              </Button>
            </div>

            {paymentMethod === 'cash' && (
              <div className="mt-3 p-3 bg-white border-2 border-blue-500 rounded-xl shadow-lg text-black">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">KES</span>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      autoFocus
                      className="w-full pl-12 p-3 text-2xl font-mono font-black border-2 border-slate-200 rounded-lg bg-slate-50 text-black outline-none focus:border-blue-500"
                      placeholder="Amount"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={Number(amountPaid) < total}
                    className={`px-6 rounded-lg font-black ${Number(amountPaid) >= total ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-400'}`}
                  >
                    DONE
                  </button>
                </div>
                {Number(amountPaid) > total && (
                  <div className="mt-2 text-right">
                    <span className="text-lg font-black text-green-700">Change: KES {(Number(amountPaid) - total).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'mpesa' && (
              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 space-y-3">
                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <Input 
                      placeholder="07..." 
                      value={phoneNumber} 
                      onChange={(e) => setPhoneNumber(e.target.value)} 
                      className="pl-9 bg-slate-900 border-slate-600 text-white h-10"
                    />
                  </div>
                  <Button onClick={startMatching} size="sm" className="bg-green-600 h-10">
                    {matchingStatus === 'waiting' ? '...' : 'Match'}
                  </Button>
                </div>
                {matchingStatus === 'matched' && (
                  <div className="pt-2 border-t border-slate-700">
                     <p className="text-center text-xs font-bold text-green-400 mb-2">✅ Verified: {matchedRef}</p>
                     <Button onClick={handleCheckout} className="w-full bg-green-600 font-black">COMPLETE M-PESA SALE</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}