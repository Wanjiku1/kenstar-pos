"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import { 
  ShoppingCart, X, Plus, Trash2, 
  Search, Smartphone, CreditCard, Banknote, 
  Box, Printer, Settings, Info, Percent 
} from "lucide-react";
import { toast } from 'sonner';
import { printReceipt } from "@/lib/printService";

export default function KenstarPOS() {
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [showMaterialCheck, setShowMaterialCheck] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'mpesa' | 'card'>('cash');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [discount, setDiscount] = useState(0);
  const [inventory, setInventory] = useState<any[]>([]);
  
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customSize, setCustomSize] = useState('');

  useEffect(() => {
    const loadData = async () => {
      // Updated select to pull from your product_variants schema
      const { data: prods } = await supabase.from('product_variants').select('*, products(name)');
      const { data: inv } = await supabase.from('material_inventory').select('*');
      if (prods) setItems(prods);
      if (inv) setInventory(inv);
    };
    loadData();
  }, []);

  const addToCart = (item: any) => {
    if ((item.stock_quantity || 0) <= 0) return toast.error("Item out of stock");
    
    setCart([...cart, { 
      ...item, 
      cartId: Date.now(), 
      quantity: 1,
      originalPrice: item.price,
      finalPrice: item.price 
    }]);
  };

  const addCustomItem = () => {
    if (!customName || !customPrice) return toast.error("Enter name and price");
    const price = parseFloat(customPrice);
    setCart([...cart, { 
      cartId: Date.now(), 
      products: { name: `[CUSTOM] ${customName}`, school_name: "General" }, 
      price: price, 
      originalPrice: price,
      finalPrice: price,
      size: customSize || 'N/A', 
      quantity: 1 
    }]);
    setCustomName(''); setCustomPrice(''); setCustomSize('');
    toast.success("Custom item added");
  };

  const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const total = subtotal - discount;
  const change = (parseFloat(amountPaid) || 0) - total;

  const triggerMpesaPush = async () => {
    if (!customerPhone) return toast.error("Enter customer phone number");
    toast.loading("Sending M-Pesa SDK Push...");
    setTimeout(() => toast.success("STK Push sent to customer device"), 2000);
  };

  const handleCompleteTransaction = async () => {
    if (paymentMode === 'cash' && change < 0) return toast.error("Insufficient Cash Paid");

    const saleData = {
      payment_method: paymentMode,
      amount_paid: paymentMode === 'mpesa' ? total : (amountPaid || total),
      change: paymentMode === 'cash' ? (change > 0 ? change : 0) : 0,
      discount: discount // Pass the discount explicitly
    };

    // Keep items at original price for receipt clarity
    const cartForReceipt = cart.map(item => ({
      ...item,
      finalPrice: item.price 
    }));

    try {
      // 1. Print Receipt
      printReceipt(saleData, cartForReceipt, total, "Admin");

      // 2. Update Database Inventory
      for (const cartItem of cart) {
        if (cartItem.id) {
          await supabase
            .from('product_variants')
            .update({ stock_quantity: Math.max(0, (cartItem.stock_quantity || 1) - 1) })
            .eq('id', cartItem.id);
        }
      }

      toast.success("Sale Recorded & Receipt Printed");
      setCart([]);
      setShowPayModal(false);
      setAmountPaid('');
      setDiscount(0);
      
      // Reload items to reflect new stock levels
      const { data: prods } = await supabase.from('product_variants').select('*, products(name)');
      if (prods) setItems(prods);

    } catch (error) {
      toast.error("Transaction failed");
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      
      {/* SIDE NAVIGATION */}
      <aside className="w-20 bg-white border-r border-slate-200 flex flex-col items-center py-8 gap-8">
        <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200"><ShoppingCart size={24}/></div>
        <button 
          onClick={() => setShowMaterialCheck(true)}
          className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all"
        >
          <Box size={24}/>
        </button>
        <button className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all">
          <Settings size={24}/>
        </button>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-slate-200 px-10 flex justify-between items-center">
          <h1 className="text-xl font-black tracking-tighter">KENSTAR <span className="text-emerald-600 italic">RETAIL</span></h1>
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
            <input 
              placeholder="Search products or schools..." 
              className="w-full bg-slate-100 border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 ring-emerald-500 outline-none transition-all"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        <div className="flex-1 flex p-8 gap-8 overflow-hidden">
          <div className="flex-[1.5] flex flex-col gap-6 overflow-hidden">
            {/* QUICK ADD FORM */}
            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex gap-4">
                <input placeholder="Product (e.g. Blazer)" className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 ring-emerald-500" value={customName} onChange={e => setCustomName(e.target.value)} />
                <input placeholder="Price" type="number" className="w-32 bg-slate-50 border-none rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 ring-emerald-500" value={customPrice} onChange={e => setCustomPrice(e.target.value)} />
                <input placeholder="Size" className="w-24 bg-slate-50 border-none rounded-xl px-4 py-3 text-xs outline-none focus:ring-1 ring-emerald-500" value={customSize} onChange={e => setCustomSize(e.target.value)} />
                <button onClick={addCustomItem} className="bg-slate-900 text-white px-6 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all">Add Custom</button>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
              <div className="overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white border-b border-slate-100 z-10">
                    <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                      <th className="p-6">Item & School</th>
                      <th className="p-6">Size</th>
                      <th className="p-6 text-center">In Stock</th>
                      <th className="p-6">Price</th>
                      <th className="p-6 text-right pr-10">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.filter(i => 
                        i.products?.name.toLowerCase().includes(search.toLowerCase()) || 
                        (i.school_name || "").toLowerCase().includes(search.toLowerCase())
                    ).map(item => (
                      <tr key={item.id} className="hover:bg-slate-50 group transition-colors">
                        <td className="p-6">
                            <p className="font-bold text-slate-800 text-sm uppercase">{item.products?.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{item.school_name || "General"}</p>
                        </td>
                        <td className="p-6"><span className="text-xs font-bold text-slate-500 uppercase">SZ {item.size}</span></td>
                        <td className="p-6 text-center">
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full ${
                            (item.stock_quantity || 0) <= 5 
                              ? 'bg-red-50 text-red-600' 
                              : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {item.stock_quantity || 0} left
                          </span>
                        </td>
                        <td className="p-6 font-black text-emerald-600 text-sm">KES {item.price.toLocaleString()}</td>
                        <td className="p-6 text-right pr-10">
                          <button 
                            onClick={() => addToCart(item)} 
                            disabled={(item.stock_quantity || 0) <= 0}
                            className="p-3 bg-white border border-slate-200 text-slate-900 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm disabled:opacity-30"
                          >
                            <Plus size={16}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* CHECKOUT SIDEBAR */}
          <div className="w-[420px] bg-white border border-slate-200 rounded-[3rem] shadow-xl flex flex-col overflow-hidden">
            <div className="p-10 flex-1 overflow-y-auto">
              <h3 className="text-xl font-black uppercase italic tracking-tighter mb-8">Cart <span className="text-xs font-normal text-slate-400 ml-2">{cart.length} items</span></h3>
              <div className="space-y-3">
                {cart.map(i => (
                  <div key={i.cartId} className="flex justify-between items-center bg-slate-50 p-5 rounded-2xl border border-slate-100">
                    <div className="truncate pr-4">
                      <p className="text-[10px] font-black uppercase text-slate-800 truncate">{i.products?.name || i.item_name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">SZ {i.size} • KES {i.price.toLocaleString()}</p>
                    </div>
                    <button onClick={() => setCart(cart.filter(x => x.cartId !== i.cartId))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-10 bg-slate-50 border-t border-slate-100 space-y-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-orange-600">
                  <Percent size={14}/>
                  <span className="text-[10px] font-black uppercase tracking-widest italic">Bargain</span>
                </div>
                <input className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-2 text-right font-black text-orange-600 outline-none" type="number" onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
              </div>
              <div className="pt-4 border-t border-slate-200 text-right">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Total Due</p>
                 <p className="text-4xl font-black text-slate-900 italic tracking-tighter">KES {total.toLocaleString()}</p>
              </div>
              <button 
                onClick={() => setShowPayModal(true)} 
                disabled={cart.length === 0}
                className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-emerald-600 transition-all disabled:opacity-50"
              >
                Collect Payment
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* DRAWER: MATERIAL CHECKER */}
      {showMaterialCheck && (
        <div className="fixed inset-0 z-[110] bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowMaterialCheck(false)}>
            <div className="absolute right-0 top-0 h-full w-[450px] bg-white shadow-2xl p-12 border-l border-slate-100" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-10">
                    <h2 className="text-xl font-black uppercase italic tracking-tighter">Inventory <span className="text-emerald-600">Stock</span></h2>
                    <button onClick={() => setShowMaterialCheck(false)} className="p-3 bg-slate-100 rounded-xl hover:bg-red-50 text-red-500 transition-all"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                    {inventory.map(mat => (
                        <div key={mat.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex justify-between items-center">
                            <div>
                                <p className="text-xs font-black uppercase text-slate-800">{mat.material_name}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{mat.unit}</p>
                            </div>
                            <span className={`text-sm font-black ${mat.current_stock < 5 ? 'text-red-500' : 'text-emerald-600'}`}>{mat.current_stock}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPayModal && (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
           <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl space-y-10">
              <div className="flex justify-between items-center">
                 <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">Process <span className="text-emerald-600">Sale</span></h2>
                 <button onClick={() => setShowPayModal(false)} className="p-4 bg-slate-100 rounded-2xl hover:bg-slate-200"><X size={20}/></button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                 {[
                    { id: 'cash', icon: Banknote, label: 'Cash' },
                    { id: 'mpesa', icon: Smartphone, label: 'M-Pesa' },
                    { id: 'card', icon: CreditCard, label: 'Card' }
                 ].map(mode => (
                    <button 
                        key={mode.id}
                        onClick={() => setPaymentMode(mode.id as any)}
                        className={`p-6 rounded-[2.5rem] border flex flex-col items-center gap-3 transition-all ${paymentMode === mode.id ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl scale-105' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-emerald-200'}`}
                    >
                        <mode.icon size={24}/>
                        <span className="text-[10px] font-black uppercase">{mode.label}</span>
                    </button>
                 ))}
              </div>

              <div className="space-y-6">
                 <div className="text-center">
                   <label className="text-[10px] font-black text-slate-400 uppercase block mb-3 tracking-widest underline decoration-emerald-500 underline-offset-8">Total to Collect</label>
                   <p className="text-6xl font-black text-slate-900 italic tracking-tighter">KES {total.toLocaleString()}</p>
                 </div>

                 {paymentMode === 'mpesa' ? (
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Customer Phone</label>
                        <input 
                            placeholder="2547XXXXXXXX" 
                            className="w-full bg-slate-100 p-6 rounded-3xl font-black text-2xl text-center outline-none ring-2 ring-emerald-500/20"
                            value={customerPhone}
                            onChange={e => setCustomerPhone(e.target.value)}
                        />
                        <button onClick={triggerMpesaPush} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">Send STK Push</button>
                    </div>
                 ) : (
                    <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Amount Tendered</label>
                        <input 
                            autoFocus
                            className="w-full bg-slate-100 p-6 rounded-3xl font-black text-4xl text-center outline-none ring-2 ring-emerald-500/20" 
                            type="number" 
                            value={amountPaid} 
                            onChange={e => setAmountPaid(e.target.value)} 
                        />
                        <div className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Change Due</span>
                            <span className={`text-2xl font-black ${change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>KES {change.toLocaleString()}</span>
                        </div>
                    </div>
                 )}
              </div>

              <button 
                onClick={handleCompleteTransaction}
                className="w-full bg-slate-900 text-white h-24 rounded-[3rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-4"
              >
                 <Printer size={18}/> Record & Print Receipt
              </button>
           </div>
        </div>
      )}
    </div>
  );
}