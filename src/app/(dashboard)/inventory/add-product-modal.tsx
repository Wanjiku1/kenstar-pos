"use client";
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function AddProductModal({ isOpen, onClose, onSuccess }: any) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [price, setPrice] = useState("");
  const [size, setSize] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Function to clear form
  const resetForm = () => {
    setName("");
    setSku("");
    setPrice("");
    setSize("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // 1. Create/Update the base product
      const { data: product, error: pError } = await supabase
        .from('products')
        .upsert({ name: name, category: 'Uniform' }, { onConflict: 'name' })
        .select()
        .single();

      if (pError) throw pError;

      // 2. Create the Variant
      const { error: vError } = await supabase
        .from('product_variants')
        .insert([{
          product_id: product.id,
          sku: sku.toUpperCase(), // Best practice: SKUs should be uppercase
          size: size,
          price: parseFloat(price),
          stock: 0 
        }]);

      if (vError) throw vError;

      toast.success("Product variant added successfully");
      resetForm();
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-black mb-6 text-slate-900 tracking-tight">Add New Uniform</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Full Product Name</label>
            <input 
              placeholder="e.g. Boys Secondary Blazer" 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-slate-900 transition-all"
              value={name} onChange={e => setName(e.target.value)} required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">SKU Code</label>
              <input 
                placeholder="BLZ-001" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-slate-900"
                value={sku} onChange={e => setSku(e.target.value)} required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Size</label>
              <input 
                placeholder="24, 26, L, XL" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold outline-none focus:border-slate-900"
                value={size} onChange={e => setSize(e.target.value)} required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Retail Price (KES)</label>
            <input 
              type="number" placeholder="0.00" 
              className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-xl font-black text-blue-600 text-xl outline-none focus:border-slate-900"
              value={price} onChange={e => setPrice(e.target.value)} required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button 
              type="button" 
              onClick={() => { resetForm(); onClose(); }} 
              className="flex-1 p-4 font-bold text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 p-4 bg-slate-900 text-white rounded-2xl font-black shadow-lg hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}