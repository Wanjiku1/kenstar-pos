"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  price: number;
  stock_quantity: number;
  image_url?: string; // Add this
  barcode?: string;   // Add this
  products: {
    name: string;
  };
}

export function StockTable({ items }: { items: ProductVariant[] }) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">
          Current Stock Inventory
        </h3>
        <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase">
          {items.length} Variants Total
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-50">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-transparent border-slate-100">
              <TableHead className="font-black text-slate-400 text-[10px] uppercase">Uniform Item</TableHead>
              <TableHead className="font-black text-slate-400 text-[10px] uppercase">SKU</TableHead>
              <TableHead className="font-black text-slate-400 text-[10px] uppercase">Size</TableHead>
              <TableHead className="font-black text-slate-400 text-[10px] uppercase text-right">Price (KES)</TableHead>
              <TableHead className="font-black text-slate-400 text-[10px] uppercase text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                <TableCell className="py-4">
  <div className="flex items-center gap-3">
    <div className="h-12 w-12 rounded-lg bg-slate-100 overflow-hidden border">
      <img 
        src={item.image_url || '/placeholder-uniform.png'} 
        alt={item.sku} 
        className="h-full w-full object-cover"
      />
    </div>
    <div>
      <p className="font-bold text-slate-800">{item.products?.name}</p>
      <p className="text-[10px] text-slate-400 uppercase font-mono">{item.barcode}</p>
    </div>
  </div>
</TableCell>
                <TableCell className="py-4">
                  <p className="font-bold text-slate-800">{item.products?.name}</p>
                </TableCell>
                <TableCell className="font-mono text-[10px] text-slate-400 uppercase">
                  {item.sku}
                </TableCell>
                <TableCell>
                  <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">
                    {item.size}
                  </span>
                </TableCell>
                <TableCell className="text-right font-bold text-slate-900">
                  {item.price.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${
                      (item.stock_quantity || 0) < 10 
                        ? "bg-red-100 text-red-600 animate-pulse" 
                        : "bg-green-100 text-green-700"
                    }`}>
                      {item.stock_quantity || 0} IN STOCK
                    </span>
                    {(item.stock_quantity || 0) < 10 && (
                      <p className="text-[9px] font-bold text-red-400 uppercase">Restock Soon</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {items.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-slate-400 font-medium italic">No products found in database.</p>
        </div>
      )}
    </div>
  );
}