"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import { 
  ShoppingCart, X, Plus, Trash2, Search, Smartphone, 
  Banknote, Box, Printer, Settings, Percent 
} from "lucide-react";
import { toast } from 'sonner';
import { printReceipt } from "@/lib/printService";

export default function KenstarPOS() {
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [showMaterialCheck, setShowMaterialCheck] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'mpesa'>('cash');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [discount, setDiscount] = useState(0);
  const [inventory, setInventory] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'waiting'>('idle');
  
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: prods } = await supabase.from('product_variants').select('*, products(name)');
    const { data: inv } = await supabase.from('material_inventory').select('*');
    if (prods) setItems(prods);
    if (inv) setInventory(inv);
  };

  const addToCart = (item: any) => {
    if ((item.stock_quantity || 0) <= 0) return toast.error("Out of stock");
    const existingIndex = cart.findIndex(i => i.id === item.id);
    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { ...item, cartId: Date.now(), quantity: 1 }]);
    }
  };

  const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const total = subtotal - discount;
  const change = (parseFloat(amountPaid) || 0) - total;

  const finalizeTransaction = async (confirmedSaleData: any) => {
    try {
      for (const item of cart) {
        if (item.id) {
          const newStock = Math.max(0, (item.stock_quantity || 0) - item.quantity);
          await supabase.from('product_variants').update({ stock_quantity: newStock }).eq('id', item.id);
        }
      }
      printReceipt(confirmedSaleData, cart, total, "Manager");
      toast.success("Transaction Complete");
      setCart([]);
      setShowPayModal(false);
      setAmountPaid('');
      setDiscount(0);
      setCustomerPhone('');
      setIsProcessing(false);
      setPollingStatus('idle');
      loadData();
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  const startPolling = (saleId: string, checkoutID: string) => {
    setPollingStatus('waiting');
    const interval = setInterval(async () => {
      const { data } = await supabase.from('sales').select('*').eq('id', saleId).single();
      
      // Success check
      if (data && data.payment_ref !== checkoutID) {
        clearInterval(interval);
        finalizeTransaction(data);
      }
      
      // Failure check (from callback)
      if (data && data.collection_status === 'failed') {
        clearInterval(interval);
        setPollingStatus('idle');
        setIsProcessing(false);
        toast.error("M-Pesa Payment Failed or Cancelled");
      }
    }, 3000);

    setTimeout(() => { 
      clearInterval(interval); 
      if (pollingStatus === 'waiting') {
        setIsProcessing(false);
        setPollingStatus('idle');
        toast.error("M-Pesa Polling Timed Out");
      }
    }, 120000);
  };

  const triggerMpesaPush = async () => {
    if (!customerPhone) return toast.error("Enter phone");
    setIsProcessing(true);
    const toastId = toast.loading("Sending STK Push...");
    
    try {
      const res = await fetch('/api/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(total), phone: customerPhone.replace(/^0/, '254') })
      });
      const data = await res.json();

      if (data.ResponseCode === "0") {
        const { data: sale, error } = await supabase.from('sales').insert([{
          payment_method: 'mpesa',
          total_amount: total,
          payment_ref: data.CheckoutRequestID,
          discount_amount: discount,
          original_total: subtotal,
          collection_status: 'pending'
        }]).select().single();

        if (error) throw error;
        toast.success("PIN Prompt Sent", { id: toastId });
        startPolling(sale.id, data.CheckoutRequestID);
      } else {
        setIsProcessing(false);
        toast.error("Push Failed", { id: toastId });
      }
    } catch (e) {
      setIsProcessing(false);
      toast.error("Error", { id: toastId });
    }
  };

  const handleCashSale = async () => {
    if (change < 0) return toast.error("Insufficient cash");
    setIsProcessing(true);
    
    // Fix: removed 'amount_paid' if column missing, and added 'collection_status'
    const { data: sale, error } = await supabase.from('sales').insert([{
      payment_method: 'cash',
      total_amount: total,
      payment_ref: `CASH_${Date.now()}`,
      discount_amount: discount,
      original_total: subtotal,
      collection_status: 'ready' 
    }]).select().single();

    if (error) { 
      console.error(error);
      toast.error("DB Error: " + error.message); 
      setIsProcessing(false); 
      return; 
    }

    // Attach local data for receipt printing only
    const saleForReceipt = { ...sale, amount_paid: parseFloat(amountPaid), change: change };
    finalizeTransaction(saleForReceipt);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <aside className="w-20 bg-white border-r flex flex-col items-center py-8 gap-8">
        <div className="p-3 bg-emerald-600 rounded-2xl text-white"><ShoppingCart size={24}/></div>
        <button onClick={() => setShowMaterialCheck(true)} className="p-3 text-slate-400 hover:text-emerald-600"><Box size={24}/></button>
      </aside>

      <main className="flex-1 flex flex-col">
        <header className="h-20 bg-white border-b px-10 flex justify-between items-center">
          <h1 className="text-xl font-black italic">KENSTAR <span className="text-emerald-600">RETAIL</span></h1>
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input placeholder="Search products..." className="w-full bg-slate-100 rounded-2xl pl-12 pr-4 py-3 outline-none" onChange={(e) => setSearch(e.target.value)} />
          </div>
        </header>

        <div className="flex-1 flex p-8 gap-8 overflow-hidden">
          <div className="flex-[1.5] flex flex-col gap-6 overflow-hidden">
            <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm flex gap-4">
              <input placeholder="Item" className="flex-1 bg-slate-50 rounded-xl px-4 py-3 outline-none" value={customName} onChange={e => setCustomName(e.target.value)} />
              <input placeholder="Price" className="w-32 bg-slate-50 rounded-xl px-4 py-3 outline-none" type="number" value={customPrice} onChange={e => setCustomPrice(e.target.value)} />
              <button onClick={() => {
                if(!customName || !customPrice) return;
                setCart([...cart, { cartId: Date.now(), products: { name: `[C] ${customName}` }, price: parseFloat(customPrice), quantity: 1 }]);
                setCustomName(''); setCustomPrice('');
              }} className="bg-slate-900 text-white px-6 rounded-xl font-bold uppercase text-[10px]">Add Custom</button>
            </div>

            <div className="bg-white rounded-[2.5rem] border shadow-sm flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-10 border-b">
                  <tr className="text-[10px] font-black uppercase text-slate-400">
                    <th className="p-6">Product & Size</th>
                    <th className="p-6 text-center">In Stock</th>
                    <th className="p-6">Price</th>
                    <th className="p-6 text-right pr-10">Add</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.filter(i => i.products?.name.toLowerCase().includes(search.toLowerCase())).map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-6 font-bold text-sm uppercase">{item.products?.name} <span className="text-slate-400 ml-2">SZ {item.size}</span></td>
                      <td className="p-6 text-center">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full ${item.stock_quantity <= 5 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{item.stock_quantity} Left</span>
                      </td>
                      <td className="p-6 font-black text-emerald-600">KES {item.price}</td>
                      <td className="p-6 text-right pr-10">
                        <button onClick={() => addToCart(item)} className="p-3 border rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><Plus size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="w-[420px] bg-white border rounded-[3rem] shadow-xl flex flex-col overflow-hidden">
            <div className="p-10 flex-1 overflow-y-auto">
              <h3 className="text-xl font-black italic tracking-tighter mb-8 uppercase">Cart</h3>
              <div className="space-y-3">
                {cart.map(i => (
                  <div key={i.cartId} className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border">
                    <div className="truncate pr-4">
                      <p className="text-[10px] font-black uppercase truncate">{i.quantity}x {i.products?.name || i.item_name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">KES {(i.price * i.quantity).toLocaleString()}</p>
                    </div>
                    <button onClick={() => setCart(cart.filter(x => x.cartId !== i.cartId))} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-10 bg-slate-50 border-t space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-orange-600">Discount</span>
                <input className="w-24 bg-white border rounded-lg px-3 py-2 text-right font-black outline-none" type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="pt-4 border-t text-right">
                 <p className="text-4xl font-black text-slate-900 tracking-tighter">KES {total.toLocaleString()}</p>
              </div>
              <button onClick={() => setShowPayModal(true)} disabled={cart.length === 0} className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-xs hover:bg-emerald-600 transition-all">Collect Payment</button>
            </div>
          </div>
        </div>
      </main>

      {showPayModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl space-y-10">
              <div className="flex justify-between items-center">
                 <h2 className="text-3xl font-black italic">PROCESS <span className="text-emerald-600">SALE</span></h2>
                 <button onClick={() => setShowPayModal(false)} className="p-4 bg-slate-100 rounded-2xl"><X size={20}/></button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <button onClick={() => setPaymentMode('cash')} className={`p-6 rounded-[2.5rem] border flex flex-col items-center gap-3 transition-all ${paymentMode === 'cash' ? 'bg-emerald-600 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400'}`}><Banknote size={24}/> CASH</button>
                 <button onClick={() => setPaymentMode('mpesa')} className={`p-6 rounded-[2.5rem] border flex flex-col items-center gap-3 transition-all ${paymentMode === 'mpesa' ? 'bg-emerald-600 text-white shadow-xl scale-105' : 'bg-slate-50 text-slate-400'}`}><Smartphone size={24}/> M-PESA</button>
              </div>

              <div className="space-y-6">
                 {paymentMode === 'mpesa' ? (
                    <div className="space-y-4">
                        {pollingStatus === 'waiting' ? (
                          <div className="space-y-4">
                            <div className="p-10 bg-emerald-50 rounded-3xl border-2 border-dashed border-emerald-200 text-center animate-pulse">
                              <p className="font-black text-emerald-800">WAITING FOR M-PESA...</p>
                              <p className="text-xs text-emerald-600 mt-2">Check the phone for the PIN prompt</p>
                            </div>
                            <button 
                              onClick={() => { setPollingStatus('idle'); setIsProcessing(false); }} 
                              className="w-full bg-slate-100 text-slate-500 py-3 rounded-2xl font-bold text-[10px] uppercase"
                            >
                              Cancel & Retry
                            </button>
                          </div>
                        ) : (
                          <>
                            <input placeholder="07XXXXXXXX" className="w-full bg-slate-100 p-6 rounded-3xl font-black text-2xl text-center outline-none" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                            <button onClick={triggerMpesaPush} disabled={isProcessing} className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black uppercase">
                              {isProcessing ? "Processing..." : "Send STK Push"}
                            </button>
                          </>
                        )}
                    </div>
                 ) : (
                    <div className="space-y-4">
                        <input autoFocus placeholder="Amount Paid" className="w-full bg-slate-100 p-6 rounded-3xl font-black text-4xl text-center outline-none" type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
                        <div className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl border">
                            <span className="text-[10px] font-black uppercase text-slate-400">Change</span>
                            <span className={`text-2xl font-black ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>KES {change.toLocaleString()}</span>
                        </div>
                        <button onClick={handleCashSale} disabled={isProcessing} className="w-full bg-slate-900 text-white h-24 rounded-3xl font-black uppercase flex items-center justify-center gap-4 hover:bg-emerald-600 transition-all"><Printer size={18}/> Print Receipt</button>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      {showMaterialCheck && (
        <div className="fixed inset-0 z-[110] bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowMaterialCheck(false)}>
            <div className="absolute right-0 top-0 h-full w-[450px] bg-white shadow-2xl p-12 border-l" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-10">
                    <h2 className="text-xl font-black italic">INVENTORY <span className="text-emerald-600">STOCK</span></h2>
                    <button onClick={() => setShowMaterialCheck(false)} className="p-3 bg-slate-100 rounded-xl"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                    {inventory.map(mat => (
                        <div key={mat.id} className="p-6 bg-slate-50 rounded-3xl border flex justify-between items-center">
                            <div><p className="text-xs font-black uppercase">{mat.material_name}</p><p className="text-[10px] text-slate-400">{mat.unit}</p></div>
                            <span className={`text-sm font-black ${mat.current_stock < 5 ? 'text-red-500' : 'text-emerald-600'}`}>{mat.current_stock}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}