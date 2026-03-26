"use client";

import { useState } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Upload, Loader2 } from 'lucide-react';

export function CSVUploader({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLog(["🔍 Reading Excel/CSV file..."]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: any) => {
        const data = results.data as any[];
        setLog(prev => [...prev, `📂 Found ${data.length} items to evaluate...`]);

        try {
          // Compute final product names (School or Plain Color)
          const getFinalName = (row: any) => {
            const baseName = row.product_name || row.Product;
            const schoolName = row.school_name || row.School;
            const colorName = row.color || row.Color;

            if (schoolName && schoolName.toLowerCase() !== 'plain') {
              return `${baseName} - ${schoolName}`;
            } else if (colorName) {
              return `${baseName} - ${colorName} (Plain)`;
            }
            return `${baseName} - Plain`;
          };

          const uniqueProducts = Array.from(new Set(data.map(getFinalName).filter(Boolean)));
          const productMap: { [key: string]: string } = {};

          setLog(prev => [...prev, `📊 Consolidating ${uniqueProducts.length} unique product lines...`]);

          // Sync Base Products
          for (const pName of uniqueProducts as string[]) {
            let { data: product } = await supabase
              .from('products')
              .select('id')
              .eq('name', pName)
              .single();

            if (!product) {
              const { data: newProd, error: pError } = await supabase
                .from('products')
                .insert([{ name: pName, category: 'Uniform' }])
                .select()
                .single();

              if (pError) throw pError;
              product = newProd;
              setLog(prev => [...prev, `🆕 Created base line: ${pName}`]);
            }
            if (product) productMap[pName] = product.id;
          }

          setLog(prev => [...prev, `🚀 Preparing variants and cross-checking stock levels...`]);
          const seenSkus = new Set();

          const variantsToInsert = data.map(row => {
            const rawSku = (row.sku || row.SKU || '').toUpperCase();
            if (seenSkus.has(rawSku)) return null; // local duplicate deduplication
            if (rawSku) seenSkus.add(rawSku);

            const finalProductName = getFinalName(row);

            return {
              product_id: productMap[finalProductName],
              sku: rawSku,
              size: row.size || row.Size,
              color: row.color || row.Color,
              price: parseFloat(row.price || row.Price) || 0,
              stock_quantity: parseInt(row.stock_quantity || row.Quantity || row.Stock) || 0,
              school_name: row.school_name || row.School,
              has_logo: row.has_logo?.toUpperCase() === 'TRUE' || row.has_logo === true,
              from_workshop: row.from_workshop?.toUpperCase() === 'TRUE' || row.from_workshop === true,
              image_url: `https://placeholder.com/150?text=${encodeURIComponent(finalProductName)}`
            };
          }).filter(Boolean);

          const chunkSize = 50;
          for (let i = 0; i < variantsToInsert.length; i += chunkSize) {
            const chunk = variantsToInsert.slice(i, i + chunkSize);
            const { error: vError } = await supabase
              .from('product_variants')
              .insert(chunk);

            if (vError) {
              setLog(prev => [...prev, `❌ Error syncing batch. Make sure SKUs are unique!`]);
            } else {
              setLog(prev => [...prev, `✅ Synced ${Math.min(i + chunk.length, variantsToInsert.length)} items successfully`]);
            }
          }

          toast.success("Sync complete!");
          onSuccess();
        } catch (error: any) {
          toast.error("Upload error: " + error.message);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="bg-slate-50 p-6 rounded-2xl border border-dashed mb-4 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-100 transition-all relative h-32">
        <Upload size={32} className="text-slate-400 mb-2" />
        <p className="font-black text-sm text-slate-700">Drop your file or Click to Upload</p>
        <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Auto-organizes colors and schools</p>
        <input type="file" accept=".csv" disabled={loading} onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
      </div>

      {log.length > 0 && (
        <div className="bg-slate-900 p-4 rounded-xl h-40 overflow-y-auto font-mono text-[11px] text-emerald-400 tracking-tight">
          {log.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}
    </div>
  );
}