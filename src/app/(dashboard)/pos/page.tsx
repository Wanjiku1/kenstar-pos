"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import { 
  ShoppingCart, X, Plus, Trash2, Search, ArrowLeft,
  Box, Printer, Ruler, Calendar, User, Clock, Percent, 
  ShieldCheck, Layers, ClipboardList, PhoneCall, AlertTriangle, Truck, Package, Image as ImageIcon, CheckCircle2, RotateCcw
} from "lucide-react";
import { toast } from 'sonner';
import { printReceipt } from "@/lib/printService";

const VALID_STAFF_IDS = ["KU001", "KU003", "KU004", "KU007", "KU008", "KU009"];

export default function KenstarPOS() {
  // Navigation / Workspace Tabs
  const [activeTab, setActiveTab] = useState<'pos' | 'orders' | 'stock'>('pos');
  const [currentScreen, setCurrentScreen] = useState<'catalog' | 'checkout'>('catalog');
  const [orderFilter, setOrderFilter] = useState<'all' | 'to_collect' | 'ready'>('to_collect');
  
  // Data State Arrays
  const [items, setItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  const [dbOrders, setDbOrders] = useState<any[]>([]);
  const [heldSales, setHeldSales] = useState<any[]>([]);

  // Form Inputs & Cashier Matrix
  const [staffId, setStaffId] = useState('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'mpesa'>('cash');
  const [mpesaGatewayMode, setMpesaGatewayMode] = useState<'stk' | 'till_listener'>('stk');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amountPaid, setAmountPaid] = useState(''); 
  const [discount, setDiscount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pollingStatus, setPollingStatus] = useState<'idle' | 'waiting_stk' | 'listening_till'>('idle');
  const [activeIntervalId, setActiveIntervalId] = useState<any>(null);

  // Custom Fast Entry Row
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  // Sourcing & Material Check Filters
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [requiresProcurement, setRequiresProcurement] = useState(false);
  
  // Custom Material Creation Fallback
  const [isNewMaterialFallback, setIsNewMaterialFallback] = useState(false);
  const [fallbackMaterialName, setFallbackMaterialName] = useState('');

  // Visual Attachments & Specification Metrics
  const [materialImageFile, setMaterialImageFile] = useState<File | null>(null);
  const [materialImagePreview, setMaterialImagePreview] = useState<string | null>(null);
  const [productionDetails, setProductionDetails] = useState({
    measurements: '',
    customerContact: '',
    collectionDate: '',
    notes: ''
  });

  // --- MOVED UP: Derived Computation Variables to satisfy scope visibility ---
  const isCustomOrder = cart.some(item => 
    item.products?.name?.includes('[C]') || item.item_name?.includes('[C]')
  );
  const subtotal = cart.reduce((acc, i) => acc + (i.price * i.quantity), 0);
  const total = subtotal - discount;
  const currentEntry = parseFloat(amountPaid) || 0;
  const balanceRemaining = isCustomOrder ? Math.max(0, total - currentEntry) : 0;
  const changeDue = !isCustomOrder ? Math.max(0, currentEntry - total) : 0;

  const filteredMaterials = materialSearchQuery.trim() === "" ? [] : rawMaterials.filter(m => 
    m.name?.toLowerCase().includes(materialSearchQuery.toLowerCase())
  );
  const matchedMaterial = rawMaterials.find(m => m.id === selectedMaterialId);
  // ----------------------------------------------------------------------------

  useEffect(() => { 
    loadData(); 
    loadOrders();
    return () => { if (activeIntervalId) clearInterval(activeIntervalId); };
  }, [activeIntervalId]);

  // Global Keyboard Enter Listener for Checkout Screen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentScreen !== 'checkout') return;
      if (e.key === 'Enter') {
        e.preventDefault();
        triggerSubmitFlow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScreen, paymentMode, mpesaGatewayMode, staffId, total, amountPaid, customerPhone, productionDetails, selectedMaterialId, isNewMaterialFallback, fallbackMaterialName, pollingStatus]);

  const triggerSubmitFlow = () => {
    if (pollingStatus !== 'idle') return; 
    if (paymentMode === 'cash') {
      handleCashSale();
    } else if (paymentMode === 'mpesa' && mpesaGatewayMode === 'stk') {
      triggerMpesaPush();
    } else if (paymentMode === 'mpesa' && mpesaGatewayMode === 'till_listener') {
      startLiveTillListener();
    }
  };

  const loadData = async () => {
    const { data: prods } = await supabase.from('product_variants').select('*, products(name)');
    const { data: raw } = await supabase.from('raw_materials').select('*').order('name', { ascending: true });
    if (prods) setItems(prods);
    if (raw) setRawMaterials(raw);
  };

  const loadOrders = async () => {
    const { data: salesOrders } = await supabase
      .from('sales')
      .select('*')
      .eq('is_custom_order', true)
      .order('created_at', { ascending: false });
    if (salesOrders) setDbOrders(salesOrders);
  };

  const addToCart = (item: any) => {
    const existingIndex = cart.findIndex(i => i.id === item.id);
    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += 1;
      setCart(newCart);
    } else {
      setCart([...cart, { ...item, cartId: Date.now(), quantity: 1 }]);
    }
  };

  // Hold Sale Engine Functions
  const handleHoldSale = () => {
    if (cart.length === 0) return toast.error("Basket container is currently empty.");
    const holdPayload = {
      id: Date.now(),
      cart,
      discount,
      productionDetails,
      selectedMaterialId,
      requiresProcurement,
      isNewMaterialFallback,
      fallbackMaterialName,
      materialImagePreview,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setHeldSales([...heldSales, holdPayload]);
    setCart([]);
    setDiscount(0);
    setSelectedMaterialId('');
    setMaterialSearchQuery('');
    setRequiresProcurement(false);
    setIsNewMaterialFallback(false);
    setFallbackMaterialName('');
    setMaterialImageFile(null);
    setMaterialImagePreview(null);
    toast.success("Transaction successfully backed up to Hold memory");
  };

  const handleResumeSale = (basket: any) => {
    if (cart.length > 0) return toast.error("Please clear or hold your current live basket context first!");
    setCart(basket.cart);
    setDiscount(basket.discount);
    setProductionDetails(basket.productionDetails);
    setSelectedMaterialId(basket.selectedMaterialId || '');
    setRequiresProcurement(basket.requiresProcurement || false);
    setIsNewMaterialFallback(basket.isNewMaterialFallback || false);
    setFallbackMaterialName(basket.fallbackMaterialName || '');
    setMaterialImagePreview(basket.materialImagePreview || null);
    setHeldSales(heldSales.filter(h => h.id !== basket.id));
    toast.success("Transaction successfully re-hydrated to screen");
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMaterialImageFile(file);
      setMaterialImagePreview(URL.createObjectURL(file));
      toast.success("Design pattern image queued successfully");
    }
  };

  const finalizeTransaction = async (confirmedSaleData: any) => {
    try {
      for (const item of cart) {
        if (item.id && !item.item_name?.includes('[C]')) {
          const currentQty = item.stock_quantity || 0;
          await supabase.from('product_variants').update({ stock_quantity: Math.max(0, currentQty - item.quantity) }).eq('id', item.id);
        }
      }

      printReceipt(confirmedSaleData, cart, total, staffId);
      toast.success(`POS Terminal Finished. Code: ${confirmedSaleData.payment_ref}`);
      
      setCart([]);
      setCurrentScreen('catalog');
      setAmountPaid('');
      setDiscount(0);
      setCustomerPhone('');
      setSelectedMaterialId('');
      setMaterialSearchQuery('');
      setRequiresProcurement(false);
      setIsNewMaterialFallback(false);
      setFallbackMaterialName('');
      setMaterialImageFile(null);
      setMaterialImagePreview(null);
      setIsProcessing(false);
      setPollingStatus('idle');
      loadData();
      loadOrders();
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
    }
  };

  const processSaleInDB = async (paymentRef: string, method: 'cash' | 'mpesa') => {
    if (!VALID_STAFF_IDS.includes(staffId)) throw new Error("Invalid Cashier ID Token Configuration");

    let uploadedImageUrl = null;
    if (materialImageFile) {
      const fileExt = materialImageFile.name.split('.').pop();
      const fileName = `${Date.now()}_custom_material.${fileExt}`;
      const { data: uploadData } = await supabase.storage.from('material_attachments').upload(fileName, materialImageFile);
      if (uploadData) {
        const { data: urlData } = supabase.storage.from('material_attachments').getPublicUrl(fileName);
        uploadedImageUrl = urlData?.publicUrl;
      }
    }

    const combinedSpecs = {
      ...productionDetails,
      allocatedMaterial: isNewMaterialFallback ? `[NEW] ${fallbackMaterialName}` : (matchedMaterial ? matchedMaterial.name : 'None Specified'),
      allocatedMaterialId: isNewMaterialFallback ? 'NEW_SOURCED' : selectedMaterialId,
      procurementAlertSent: requiresProcurement,
      attachmentUrl: uploadedImageUrl
    };

    const { data: sale, error: saleError } = await supabase.from('sales').insert([{
      payment_method: method,
      total_amount: total,
      deposit_amount: isCustomOrder ? currentEntry : total,
      balance_amount: balanceRemaining,
      payment_ref: paymentRef, 
      processed_by: staffId,
      discount_amount: discount,
      original_total: subtotal,
      is_custom_order: isCustomOrder,
      collection_status: isCustomOrder ? 'to_collect' : 'ready',
      collection_date: productionDetails.collectionDate || null,
      production_specs: isCustomOrder ? JSON.stringify(combinedSpecs) : null
    }]).select().single();

    if (saleError) throw saleError;

    for (const item of cart) {
      const itemName = item.products?.name || item.item_name;
      const { data: sItem } = await supabase.from('sale_items').insert([{
        sale_id: sale.id,
        variant_id: item.id || null,
        quantity: item.quantity,
        unit_price: item.price,
        item_name: itemName
      }]).select().single();

      if (sItem && itemName.includes('[C]')) {
        await supabase.from('production_tasks').insert([{
          sale_item_id: sItem.id,
          status: requiresProcurement ? 'awaiting_materials' : 'pending',
          department: 'workshop',
          estimated_collection_date: productionDetails.collectionDate,
          measurements: { detail: productionDetails.measurements }
        }]);

        if (requiresProcurement) {
          await supabase.from('procurement_requests').insert([{
            material_id: isNewMaterialFallback ? null : matchedMaterial?.id,
            custom_material_name: isNewMaterialFallback ? fallbackMaterialName : null,
            requested_by: staffId,
            status: 'pending',
            quantity_needed: 10, 
            notes: `Auto-generated procurement task. Customer line: ${productionDetails.customerContact}.`
          }]);
        }
      }
    }
    return sale;
  };

  const handleCashSale = async () => {
    if (!VALID_STAFF_IDS.includes(staffId)) return toast.error("Please choose a valid cashier ID token");
    if (isCustomOrder && !productionDetails.collectionDate) return toast.error("Target delivery deadline tracking date is required");
    if (isCustomOrder && !selectedMaterialId && !isNewMaterialFallback) return toast.error("Please match a fabric or configure a missing raw log profile description");
    if (!isCustomOrder && currentEntry < total) return toast.error("Insufficient hard cash provided");

    setIsProcessing(true);
    try {
      const sale = await processSaleInDB(`CASH_${Date.now()}`, 'cash');
      finalizeTransaction({ ...sale, amount_paid: currentEntry, change: changeDue });
    } catch (err: any) {
      setIsProcessing(false);
      toast.error(err.message);
    }
  };

  const handleCancelGatewayPolling = () => {
    if (activeIntervalId) {
      clearInterval(activeIntervalId);
      setActiveIntervalId(null);
    }
    setIsProcessing(false);
    setPollingStatus('idle');
    toast.error("M-Pesa validation monitoring stream disconnected successfully.");
  };

  const triggerMpesaPush = async () => {
    if (!VALID_STAFF_IDS.includes(staffId)) return toast.error("Cashier Staff verification required");
    if (!customerPhone) return toast.error("Target payload transmission phone number is empty");

    setIsProcessing(true);
    const toastId = toast.loading("Broadcasting prompt messaging stack to Safaricom endpoint...");
    try {
      const targetAmount = isCustomOrder ? (currentEntry || total) : total;
      const res = await fetch('/api/stkpush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(targetAmount), phone: customerPhone.replace(/^0/, '254') })
      });
      const mpesaData = await res.json();

      if (mpesaData.ResponseCode === "0") {
        const sale = await processSaleInDB(mpesaData.CheckoutRequestID, 'mpesa');
        toast.success("STK push broadcast complete. Awaiting validation loop...", { id: toastId });
        setPollingStatus('waiting_stk');
        startPollingSTK(sale.id, mpesaData.CheckoutRequestID);
      } else {
        throw new Error(mpesaData.CustomerMessage);
      }
    } catch (e: any) {
      setIsProcessing(false);
      toast.error(e.message, { id: toastId });
    }
  };

  const startPollingSTK = (saleId: string, checkoutID: string) => {
    const interval = setInterval(async () => {
      const { data: sale } = await supabase.from('sales').select('*').eq('id', saleId).single();
      if (sale && sale.payment_ref !== checkoutID) {
        clearInterval(interval);
        setActiveIntervalId(null);
        finalizeTransaction(sale); 
      }
    }, 3000);
    setActiveIntervalId(interval);

    setTimeout(() => { 
      clearInterval(interval); 
      setPollingStatus('idle'); 
      setIsProcessing(false); 
    }, 90000);
  };

  const startLiveTillListener = async () => {
    if (!VALID_STAFF_IDS.includes(staffId)) return toast.error("Operator token authentication required");
    if (isCustomOrder && !productionDetails.collectionDate) return toast.error("Target collection calendar date tracking is required");
    
    const targetValue = isCustomOrder ? currentEntry : total;
    if (targetValue <= 0) return toast.error("Invalid transaction total value setup processing failed");

    setIsProcessing(true);
    setPollingStatus('listening_till');
    toast.info(`POS terminal listening for KES ${targetValue} payment received at Till...`);

    const interval = setInterval(async () => {
      const { data: receivedLogs } = await supabase
        .from('mpesa_received_payments')
        .select('*')
        .eq('amount', targetValue)
        .eq('is_matched', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (receivedLogs && receivedLogs.length > 0) {
        const targetPaymentRow = receivedLogs[0];
        clearInterval(interval);
        setActiveIntervalId(null);
        
        try {
          await supabase.from('mpesa_received_payments').update({ is_matched: true }).eq('id', targetPaymentRow.id);
          const sale = await processSaleInDB(targetPaymentRow.mpesa_code, 'mpesa');
          finalizeTransaction(sale);
        } catch (e: any) {
          setIsProcessing(false);
          setPollingStatus('idle');
          toast.error(`Database tracking collision match failure: ${e.message}`);
        }
      }
    }, 4000);
    setActiveIntervalId(interval);

    setTimeout(() => {
      clearInterval(interval);
      if (pollingStatus === 'listening_till') {
         setPollingStatus('idle');
         setIsProcessing(false);
         toast.error("Till listener check window expired.");
      }
    }, 120000);
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-900 font-sans overflow-hidden">
      
      {/* Primary Navigation Shell */}
      <aside className="w-20 bg-slate-900 flex flex-col items-center py-8 gap-6 flex-shrink-0">
        <button onClick={() => { setActiveTab('pos'); setCurrentScreen('catalog'); }} className={`p-3 rounded-2xl transition-all ${activeTab === 'pos' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><ShoppingCart size={24}/></button>
        <button onClick={() => { setActiveTab('orders'); }} className={`p-3 rounded-2xl transition-all ${activeTab === 'orders' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><ClipboardList size={24}/></button>
        <button onClick={() => { setActiveTab('stock'); }} className={`p-3 rounded-2xl transition-all ${activeTab === 'stock' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}><Box size={24}/></button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Universal Top Header Container component */}
        <header className="h-20 bg-white border-b px-10 flex justify-between items-center shadow-sm flex-shrink-0">
          <h1 className="text-xl font-black italic tracking-tighter">KENSTAR <span className="text-emerald-600">OPS</span></h1>
          {activeTab === 'pos' && currentScreen === 'catalog' && (
            <div className="relative w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input placeholder="Search catalog items..." className="w-full bg-slate-100 rounded-2xl pl-12 pr-4 py-3 outline-none font-medium text-sm" onChange={(e) => setSearch(e.target.value)} />
            </div>
          )}
          <div className="flex items-center gap-3 bg-slate-100 px-4 py-2 rounded-xl border">
             <ShieldCheck size={16} className="text-emerald-600"/>
             <span className="text-xs font-black tracking-widest">{staffId || "WORKSTATION ACTIVE"}</span>
          </div>
        </header>

        {/* Tab Subsystem Routing Panels */}
        {activeTab === 'stock' && (
          <div className="flex-1 p-8 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto">
            <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-4 border-b pb-3">
                <Package className="text-emerald-600" size={20}/>
                <h3 className="font-black text-sm uppercase tracking-tight">Active Retail Counter Stock</h3>
              </div>
              <div className="divide-y overflow-y-auto flex-1">
                {items.map(item => (
                  <div key={item.id} className="py-3 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-black uppercase text-xs text-slate-800">{item.products?.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold">SIZE ASSIGNMENT: {item.size}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-900">KES {item.price.toLocaleString()}</p>
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded ${item.stock_quantity <= 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>{item.stock_quantity} units remaining</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border shadow-sm flex flex-col">
              <div className="flex items-center gap-2 mb-4 border-b pb-3">
                <Layers className="text-blue-600" size={20}/>
                <h3 className="font-black text-sm uppercase tracking-tight">Workshop Raw Materials Registry</h3>
              </div>
              <div className="divide-y overflow-y-auto flex-1">
                {rawMaterials.map(mat => (
                  <div key={mat.id} className="py-3 flex justify-between items-center text-sm">
                    <div>
                      <p className="font-black uppercase text-xs text-slate-700">{mat.name}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">Cost/unit: KES {mat.cost_per_unit}</p>
                    </div>
                    <span className={`text-xs font-black px-3 py-1 rounded-lg ${parseFloat(mat.current_stock) <= 0 ? 'bg-red-100 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                      {mat.current_stock} {mat.unit || 'meters'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="flex-1 p-8 space-y-6 overflow-y-auto">
            <h2 className="text-lg font-black uppercase tracking-tight">Active Workshop Custom Blueprint Production Logs</h2>
            <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b text-[10px] font-black uppercase text-slate-400">
                  <tr>
                    <th className="p-6">Target Timeline</th>
                    <th className="p-6">Dimensions / Specs</th>
                    <th className="p-6">Financial Balance Matrix</th>
                    <th className="p-6">Status Log</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {dbOrders.map(order => {
                    const specs = order.production_specs ? JSON.parse(order.production_specs) : {};
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/50">
                        <td className="p-6 font-black text-slate-800">{order.collection_date || "Not set"}</td>
                        <td className="p-6">
                          <p className="font-bold text-slate-700 uppercase text-xs">{specs.measurements || "No measurements structured"}</p>
                          <p className="text-xs text-slate-400 mt-0.5 font-bold uppercase">Component Fabric allocation: {specs.allocatedMaterial}</p>
                          <span className="text-emerald-600 font-black text-xs block mt-1">📞 {specs.customerContact || "None"}</span>
                        </td>
                        <td className="p-6 font-black text-slate-900">KES {order.total_amount.toLocaleString()}</td>
                        <td className="p-6">
                          <span className="text-[10px] font-black px-3 py-1 bg-amber-100 text-amber-800 rounded-full uppercase">{order.collection_status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'pos' && currentScreen === 'catalog' && (
          <div className="flex-1 flex p-6 gap-6 overflow-hidden">
            <div className="flex-[1.5] flex flex-col gap-6 overflow-hidden">
              
              <div className="bg-white p-4 rounded-3xl border shadow-sm flex gap-4 items-center flex-shrink-0">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Ruler size={20}/></div>
                <input placeholder="Custom Item (e.g., [C] Tailored Uniform Set Shirt)" className="flex-1 bg-slate-50 rounded-xl px-4 py-3 outline-none text-sm font-semibold" value={customName} onChange={e => setCustomName(e.target.value)} />
                <input placeholder="Price KES" className="w-36 bg-slate-50 rounded-xl px-4 py-3 outline-none text-sm font-black text-emerald-600" type="number" value={customPrice} onChange={e => setCustomPrice(e.target.value)} />
                <button onClick={() => {
                  if(!customName || !customPrice) return;
                  setCart([...cart, { cartId: Date.now(), item_name: customName.startsWith('[C]') ? customName : `[C] ${customName}`, price: parseFloat(customPrice), quantity: 1 }]);
                  setCustomName(''); setCustomPrice('');
                }} className="bg-slate-900 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all">Add Design</button>
              </div>

              {heldSales.length > 0 && (
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-3xl flex flex-wrap gap-3 items-center flex-shrink-0">
                  <span className="text-[10px] font-black text-orange-800 uppercase flex items-center gap-1"><Layers size={14}/> Saved Orders Waiting ({heldSales.length}):</span>
                  {heldSales.map(basket => (
                    <button key={basket.id} onClick={() => handleResumeSale(basket)} className="bg-white px-4 py-2 rounded-xl border border-orange-200 text-xs font-bold hover:border-orange-500 transition-all shadow-sm">Basket @ {basket.timestamp}</button>
                  ))}
                </div>
              )}

              <div className="bg-white rounded-3xl border shadow-sm flex-1 overflow-auto p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 auto-rows-max">
                {items.filter(i => i.products?.name.toLowerCase().includes(search.toLowerCase())).map(item => (
                  <div key={item.id} className="border rounded-2xl p-5 flex flex-col justify-between bg-white hover:border-slate-400 transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-black text-xs uppercase text-slate-800 tracking-tight line-clamp-2">{item.products?.name}</h4>
                        <span className="bg-slate-100 text-[9px] font-black px-2 py-0.5 rounded text-slate-600 uppercase flex-shrink-0">SZ {item.size}</span>
                      </div>
                      <p className="text-base font-black text-emerald-600 mb-4">KES {item.price.toLocaleString()}</p>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-[10px] font-bold text-slate-400">In Counter: {item.stock_quantity} units</span>
                      <button onClick={() => addToCart(item)} className="bg-slate-900 text-white p-2 rounded-xl hover:bg-emerald-600 transition-colors"><Plus size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-[400px] bg-white border rounded-[2.5rem] shadow-xl flex flex-col overflow-hidden flex-shrink-0">
              <div className="p-8 flex-1 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-400">Basket Check</h3>
                  <button onClick={handleHoldSale} disabled={cart.length === 0} className="text-[9px] font-black tracking-wider bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1.5 rounded-xl uppercase transition-all disabled:opacity-50">Hold Sale</button>
                </div>
                <div className="space-y-3">
                  {cart.map(i => (
                    <div key={i.cartId} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border">
                      <div className="truncate text-xs font-black uppercase max-w-[180px]">{i.quantity}x {i.products?.name || i.item_name}</div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-800">KES {(i.price * i.quantity).toLocaleString()}</span>
                        <button onClick={() => setCart(cart.filter(x => x.cartId !== i.cartId))} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t space-y-4">
                 <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black uppercase text-slate-400">Discount </span>
                   <input className="w-24 bg-white border rounded-lg px-2 py-1 text-right font-black text-xs" type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
                 </div>
                <p className="text-2xl font-black text-slate-900 text-right tracking-tight">KES {total.toLocaleString()}</p>
                <button onClick={() => setCurrentScreen('checkout')} disabled={cart.length === 0} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs hover:bg-emerald-600 transition-all shadow-md">Complete Sale</button>
              </div>
            </div>
          </div>
        )}

        {/* 🚀 Dedicated Full-Screen Scrollable Configurator & Checkout Module Workspace */}
        {activeTab === 'pos' && currentScreen === 'checkout' && (
          <div className="flex-1 bg-white overflow-y-auto p-12 space-y-8 animate-in slide-in-from-bottom duration-200">
             
             <div className="flex items-center justify-between border-b pb-6">
                <button onClick={() => setCurrentScreen('catalog')} className="flex items-center gap-2 text-xs font-black uppercase text-slate-500 hover:text-slate-900 bg-slate-100 px-4 py-2 rounded-xl transition-all">
                   <ArrowLeft size={14}/> Back to Catalog Screen
                </button>
                <div className="text-right">
                   <span className="text-[10px] font-black uppercase text-slate-400 block">Net Grand Total</span>
                   <h2 className="text-3xl font-black text-emerald-600">KES {total.toLocaleString()}</h2>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                <div className="lg:col-span-2 space-y-8">
                   
                   <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-3 shadow-md">
                      <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">Verified Cashier Signature Identity Token</label>
                      <div className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-1 border border-slate-700">
                        <User className="text-emerald-400" size={18}/>
                        <select className="bg-transparent text-white font-bold text-sm w-full outline-none py-3" value={staffId} onChange={e => setStaffId(e.target.value)}>
                          <option value="" className="text-slate-900">-- Select Cashier ID --</option>
                          {VALID_STAFF_IDS.map(id => <option key={id} value={id} className="text-slate-900">{id}</option>)}
                        </select>
                      </div>
                   </div>

                   {isCustomOrder && (
                     <div className="p-8 bg-slate-50 rounded-3xl border space-y-6">
                        <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center gap-2 border-b pb-3"><Ruler size={16} className="text-emerald-600"/> WORKSHOP CUSTOM CONFIG & SCHEDULING</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-1">
                             <label className="text-[10px] font-black text-slate-500 uppercase">Customer Phone / Identification</label>
                             <input placeholder="07XXXXXXXX" className="w-full bg-white p-3.5 rounded-xl text-sm font-bold border outline-none focus:border-slate-900 shadow-sm" value={productionDetails.customerContact} onChange={e => setProductionDetails({...productionDetails, customerContact: e.target.value})} />
                           </div>
                           <div className="space-y-1">
                             <label className="text-[10px] font-black text-slate-500 uppercase">Measurements Structure</label>
                             <input placeholder="Enter specific dimensions..." className="w-full bg-white p-3.5 rounded-xl text-sm font-bold border outline-none focus:border-slate-900 shadow-sm" value={productionDetails.measurements} onChange={e => setProductionDetails({...productionDetails, measurements: e.target.value})} />
                           </div>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border space-y-3 shadow-sm">
                           <label className="text-[10px] font-black text-slate-500 uppercase block tracking-wider">Upload Reference Material / Blueprint Design Image</label>
                           <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black uppercase text-[10px] px-4 py-3 rounded-xl cursor-pointer transition-all border border-dashed border-slate-300">
                                 <ImageIcon size={14}/> {materialImageFile ? 'Change Image File' : 'Choose Snapshot File'}
                                 <input type="file" accept="image/*" className="hidden" onChange={handleImageFileChange} />
                              </label>
                              {materialImagePreview && (
                                 <div className="relative w-16 h-16 rounded-xl border overflow-hidden bg-slate-100">
                                    <img src={materialImagePreview} className="w-full h-full object-cover" alt="Preview blueprint" />
                                    <button onClick={() => { setMaterialImageFile(null); setMaterialImagePreview(null); }} className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl"><X size={10}/></button>
                                 </div>
                              )}
                           </div>
                        </div>

                        <div className="space-y-3 bg-white p-5 rounded-2xl border shadow-sm">
                           <div className="flex justify-between items-center">
                              <label className="text-[10px] font-black text-slate-600 uppercase tracking-tight block">Material Search Lookup Console</label>
                              <button type="button" onClick={() => {
                                 setIsNewMaterialFallback(!isNewMaterialFallback);
                                 setSelectedMaterialId('');
                              }} className="text-[10px] font-black text-blue-600 uppercase underline">
                                 {isNewMaterialFallback ? 'Back to Database Lookup' : 'Enter Custom New Material'}
                              </button>
                           </div>

                           {!isNewMaterialFallback ? (
                              <div className="space-y-3">
                                 <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                    <input placeholder="Type to search fabric components or material profiles..." className="w-full bg-slate-50 border p-3 pl-10 rounded-xl text-xs font-semibold outline-none focus:border-slate-800" value={materialSearchQuery} onChange={e => setMaterialSearchQuery(e.target.value)} />
                                 </div>

                                 {filteredMaterials.length > 0 && (
                                    <div className="border rounded-xl divide-y bg-slate-50/50 max-h-40 overflow-y-auto">
                                       {filteredMaterials.map(mat => (
                                          <div key={mat.id} onClick={() => {
                                             setSelectedMaterialId(mat.id);
                                             setMaterialSearchQuery(mat.name);
                                             setRequiresProcurement(parseFloat(mat.current_stock) <= 0);
                                          }} className={`p-3 text-xs flex justify-between items-center cursor-pointer hover:bg-emerald-50/40 transition-all ${selectedMaterialId === mat.id ? 'bg-emerald-50 font-bold' : ''}`}>
                                             <span className="uppercase font-black text-slate-700">{mat.name}</span>
                                             <span className={`text-[11px] font-black ${parseFloat(mat.current_stock) <= 0 ? 'text-red-600' : 'text-slate-500'}`}>{mat.current_stock} {mat.unit || 'meters'}</span>
                                          </div>
                                       ))}
                                    </div>
                                 )}
                              </div>
                           ) : (
                              <div className="space-y-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                                 <label className="text-[10px] font-black text-blue-800 uppercase block">Specify Brand New Ad-Hoc Material Profile Name</label>
                                 <input placeholder="e.g. Premium Heavyweight Maroon Wool Mix" className="w-full bg-white border p-3 rounded-xl text-xs font-bold outline-none" value={fallbackMaterialName} onChange={e => {
                                    setFallbackMaterialName(e.target.value);
                                    setRequiresProcurement(true);
                                 }} />
                              </div>
                           )}
                        </div>

                        {requiresProcurement && (
                          <div className="p-5 rounded-2xl border bg-red-50 border-red-200 flex flex-col gap-3 transition-all animate-in fade-in duration-200">
                             <div className="flex justify-between items-center text-xs">
                                <span className="font-bold uppercase text-red-700 flex items-center gap-1"><AlertTriangle size={14}/> LOGISTICS ALERT INITIATED:</span>
                                <span className="font-black px-2 py-0.5 rounded uppercase bg-red-100 text-red-700">MATERIAL OUT OF STOCK / MISSING</span>
                             </div>
                             <div className="pt-2 border-t border-red-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <p className="text-[11px] text-red-800 font-medium tracking-tight">Manufacturing fabric unavailable. Append fulfillment request to the procurement desk?</p>
                                <span className="bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 select-none shadow-md">
                                   <Truck size={12}/> ALERT PROCUREMENT AUTO-ROUTED
                                </span>
                             </div>
                          </div>
                        )}

                        <div className="space-y-2 bg-white p-5 rounded-2xl border shadow-sm">
                           <label className="text-[10px] font-black text-slate-400 uppercase block">COLLECTION DATE TARGET TIME-LINE</label>
                           <input type="date" className="w-full bg-slate-50 p-3.5 rounded-xl font-bold text-sm border outline-none" value={productionDetails.collectionDate} onChange={e => setProductionDetails({...productionDetails, collectionDate: e.target.value})} />
                        </div>
                     </div>
                   )}
                </div>

                <div className="space-y-6">
                   <div className="p-6 bg-slate-50 rounded-3xl border space-y-4 shadow-sm">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Tender System Selector</label>
                      <div className="flex bg-slate-200 p-1 rounded-xl">
                        <button onClick={() => setPaymentMode('cash')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${paymentMode === 'cash' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Hard Cash</button>
                        <button onClick={() => setPaymentMode('mpesa')} className={`flex-1 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all ${paymentMode === 'mpesa' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>M-Pesa Multi-Gate</button>
                      </div>

                      {paymentMode === 'mpesa' ? (
                         <div className="space-y-4 pt-2">
                            <div className="flex gap-2 bg-slate-200/60 p-1 rounded-lg">
                               <button onClick={() => setMpesaGatewayMode('stk')} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded ${mpesaGatewayMode === 'stk' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>STK Push Prompt</button>
                               <button onClick={() => setMpesaGatewayMode('till_listener')} className={`flex-1 py-1.5 text-[9px] font-black uppercase rounded ${mpesaGatewayMode === 'till_listener' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Listen to Direct Till Payment</button>
                            </div>

                            {mpesaGatewayMode === 'stk' ? (
                               <div className="space-y-3">
                                  {pollingStatus === 'waiting_stk' ? (
                                     <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200 text-center space-y-4">
                                        <p className="font-black text-amber-800 text-[10px] tracking-widest uppercase animate-pulse">Awaiting Client PIN validation...</p>
                                        <button onClick={handleCancelGatewayPolling} className="w-full bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-black uppercase py-2 rounded-xl flex items-center justify-center gap-1 transition-all">
                                           <RotateCcw size={12}/> Cancel & Retry
                                        </button>
                                     </div>
                                  ) : (
                                     <>
                                        {isCustomOrder && (
                                           <div className="space-y-1">
                                              <label className="text-[10px] font-black text-slate-400 uppercase">Deposit Value Collected</label>
                                              <input placeholder="Deposit Price KES" className="w-full bg-white p-3.5 rounded-xl font-black text-center text-sm border outline-none" type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
                                           </div>
                                        )}
                                        <input placeholder="Phone Line (07XXXXXXXX)" className="w-full bg-white p-4 rounded-xl font-black text-center text-base border outline-none focus:border-slate-900" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                                        <button onClick={triggerMpesaPush} className="w-full bg-emerald-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-md tracking-wider">Send STK Push [Enter]</button>
                                     </>
                                  )}
                               </div>
                            ) : (
                               <div className="space-y-3">
                                  {isCustomOrder && (
                                     <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Deposit Value Collected</label>
                                        <input placeholder="Deposit Amount Value KES" className="w-full bg-white p-3.5 rounded-xl font-black text-center text-sm border outline-none" type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
                                     </div>
                                  )}

                                  {pollingStatus === 'listening_till' ? (
                                     <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-4">
                                        <div className="flex justify-center text-emerald-600"><Clock className="animate-spin" size={24}/></div>
                                        <p className="font-black text-emerald-800 text-[10px] tracking-wider uppercase">Listening to Incoming Till Payments Ledger...</p>
                                        <p className="text-[11px] font-bold text-slate-500">Ask client to pay KES {isCustomOrder ? currentEntry : total} to Buy Goods Till Number.</p>
                                        <button onClick={handleCancelGatewayPolling} className="w-full bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-black uppercase py-2 rounded-xl flex items-center justify-center gap-1 transition-all">
                                           <RotateCcw size={12}/> Abort Listener
                                        </button>
                                     </div>
                                  ) : (
                                     <div className="space-y-2">
                                        <div className="p-4 bg-blue-50 text-blue-900 border border-blue-100 rounded-xl text-center">
                                           <p className="text-xs font-medium">System hooks live updates and automatically matches transaction upon hitting the trigger hook below.</p>
                                        </div>
                                        <button onClick={startLiveTillListener} className="w-full bg-slate-900 hover:bg-emerald-600 text-white py-4 rounded-xl font-black uppercase text-xs shadow-md tracking-wider flex items-center justify-center gap-2 transition-all">
                                           <CheckCircle2 size={14}/> Start Till Listener [Enter]
                                        </button>
                                     </div>
                                  )}
                               </div>
                            )}
                         </div>
                      ) : (
                         <div className="space-y-4 pt-2">
                            <div>
                               <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Tendered Cash Value</label>
                               <input placeholder="0.00" className="w-full bg-white p-4 rounded-xl font-black text-xl text-center border outline-none focus:border-emerald-600 text-slate-900" type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} />
                            </div>
                            <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-between items-center">
                               <span className="text-[9px] font-black uppercase text-slate-400">{isCustomOrder ? 'Balance Outstanding' : 'Change Due Back'}</span>
                               <span className="text-sm font-black">KES {(isCustomOrder ? balanceRemaining : changeDue).toLocaleString()}</span>
                            </div>
                         </div>
                      )}
                   </div>

                   {paymentMode === 'cash' && (
                      <button onClick={handleCashSale} disabled={isProcessing} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2 shadow-lg transition-all">
                         <Printer size={16}/> {isCustomOrder ? 'PRINT & FINISH [Enter]' : 'Complete Counter Sale [Enter]'}
                      </button>
                   )}
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}