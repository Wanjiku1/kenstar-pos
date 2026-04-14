"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Zap, PackageCheck, Loader2 } from 'lucide-react';

// 🎯 Kenstar Uniforms Exact Sizing Profiles
const SIZE_GROUPS = {
  Shirts: ["XS", "S", "M", "L", "L (Youth)", "XL", "XXL", "Custom"],
  "Trousers/Shorts/Dresses/Sweaters": ["22", "24", "26", "28", "30", "32", "34", "36", "38", "40", "42"],
  Tshirts: ["60", "65", "70", "75", "80", "85", "90"],
  "Socks/Ties": ["S", "M", "L", "XL", "XXL", "Elastic", "Long", "Bowtie"]
};

export function BulkAddTool({ onSuccess }: { onSuccess: () => void }) {
  const [productName, setProductName] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<keyof typeof SIZE_GROUPS>("Shirts");
  
  // New: Laser Precision toggles
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [quantityType, setQuantityType] = useState<'singles' | 'dozen'>('singles'); 
  const [quantityValue, setQuantityValue] = useState('1'); 
  const [loading, setLoading] = useState(false);

  const handleGroupChange = (group: keyof typeof SIZE_GROUPS) => {
    setSelectedGroup(group);
    setSelectedSizes([]); // Reset selections when category swaps
  };

  const handleSizeToggle = (size: string) => {
    setSelectedSizes(prev => 
      prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]
    );
  };

  const handleBulkGenerate = async () => {
    if (!productName || !basePrice) return toast.error("Missing product details");
    if (selectedSizes.length === 0) return toast.error("Please select at least one size");

    setLoading(true);

    try {
      // 📐 Multiply for packets of 12!
      const multiplier = quantityType === 'dozen' ? 12 : 1;
      const finalQuantityPerSize = (parseInt(quantityValue) || 1) * multiplier;

      let { data: product, error: pError } = await supabase
        .from('products')
        .select('id')
        .eq('name', productName)
        .single();

      if (!product) {
        const { data: newProd, error: insertError } = await supabase
          .from('products')
          .insert([{ name: productName, category: 'Uniform' }])
          .select()
          .single();

        if (insertError) throw insertError;
        product = newProd;
      }

      // Prepare variants ONLY for the checked checkboxes!
      const variants = selectedSizes.map(size => {
        const generatedSku = `${productName.replace(/\s+/g, '').substring(0,4).toUpperCase()}-${size.replace(/\s+/g, '')}-${Math.floor(Math.random() * 1000)}`;
        return {
          product_id: product?.id,
          size: size,
          sku: generatedSku,
          barcode: generatedSku.replace(/-/g, ''), 
          price: parseFloat(basePrice),
          stock_quantity: finalQuantityPerSize, // Push pieces or packets!
          image_url: `https://placeholder.com/150?text=${encodeURIComponent(productName)}`
        };
      });

      const { error: vError } = await supabase.from('product_variants').insert(variants);
      if (vError) throw vError;

      toast.success(`Generated ${variants.length} variances for ${productName}`);
      setProductName("");
      setBasePrice("");
      setSelectedSizes([]);
      setQuantityValue("1");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-slate-200 h-full flex flex-col justify-between font-sans">
      <div className="space-y-5">
        <h3 className="font-black flex items-center gap-2 text-slate-700 text-sm uppercase">
          <Zap className="text-amber-500" size={18} /> Kenstar Bulk Specifications
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Uniform Item</label>
            <input 
              placeholder="e.g. Primary Boys Shorts"
              className="w-full mt-1 p-3 bg-slate-50 rounded-xl border font-bold text-sm focus:ring-4 focus:ring-[#007a43]/10 focus:border-[#007a43] outline-none transition-all"
              value={productName} 
              onChange={e => setProductName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Unit Selling Price</label>
            <input 
              type="number" 
              placeholder="Unit Price (KES)"
              className="w-full mt-1 p-3 bg-slate-50 rounded-xl border font-bold text-blue-600 text-sm focus:ring-4 focus:ring-[#007a43]/10 focus:border-[#007a43] outline-none transition-all"
              value={basePrice} 
              onChange={e => setBasePrice(e.target.value)}
            />
          </div>
        </div>

        {/* 🗂️ Step 1: Click the Category */}
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Category Line</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {Object.keys(SIZE_GROUPS).map((group) => (
              <button
                key={group}
                onClick={() => handleGroupChange(group as any)}
                className={`px-3 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                  selectedGroup === group ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {group}
              </button>
            ))}
          </div>
        </div>

        {/* 📏 Step 2: Check off exactly what you have */}
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex justify-between">
            <span>Choose Sizes to generate</span>
            {selectedSizes.length > 0 && <span className="text-[#007a43]">{selectedSizes.length} Selected</span>}
          </label>
          <div className="mt-1 bg-slate-50 p-3 rounded-2xl border flex flex-wrap gap-2 max-h-36 overflow-y-auto">
            {SIZE_GROUPS[selectedGroup].map(size => (
              <button
                key={size}
                onClick={() => handleSizeToggle(size)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all border ${
                  selectedSizes.includes(size) ? "bg-[#007a43] text-white border-[#007a43] shadow-sm" : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* 📦 Step 3: Piece conversion vs Packet (Dozen Multipliers) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Metric Type</label>
            <div className="grid grid-cols-2 mt-1 bg-slate-100 p-1 rounded-xl gap-2 items-center h-12">
              <button
                onClick={() => setQuantityType('singles')}
                className={`h-10 rounded-lg text-xs font-black uppercase transition-all ${
                  quantityType === 'singles' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                Single Units
              </button>
              <button
                onClick={() => setQuantityType('dozen')}
                className={`h-10 rounded-lg text-xs font-black uppercase flex items-center justify-center gap-1 transition-all ${
                  quantityType === 'dozen' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                <PackageCheck size={14} className={quantityType === 'dozen' ? "text-amber-500" : ""} /> Packet (x12)
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Load Count</label>
            <input 
              type="number" 
              min={1}
              className="w-full mt-1 p-3 bg-slate-50 rounded-xl border font-bold text-sm h-12"
              value={quantityValue} 
              onChange={e => setQuantityValue(e.target.value)}
            />
          </div>
        </div>
      </div>

      <button 
        onClick={handleBulkGenerate}
        disabled={loading || selectedSizes.length === 0}
        className="w-full mt-6 bg-[#007a43] hover:bg-[#005c32] text-white p-4 rounded-xl font-black transition-all shadow-lg active:scale-95 disabled:opacity-50 text-xs tracking-wide flex justify-center items-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={16} /> PUSHING VARIANT ARRAY...
          </>
        ) : (
          "GENERATE CHOSEN SHIFT TO INVENTORY"
        )}
      </button>
    </div>
  );
}