"use client";

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Zap, FileSpreadsheet, AlertTriangle, Eye, EyeOff, ChevronDown, ChevronRight, PackageCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CSVUploader } from '@/components/CSVUploader';
import { BulkAddTool } from './bulk-add-tool';

interface ProductVariant {
  id: string;
  sku: string;
  size: string;
  price: number;
  stock_quantity: number;
  image_url?: string;
  barcode?: string;
  school_name?: string;
  color?: string;
  products: {
    name: string;
  };
}

export function StockTable({ items, onRefresh }: { items: ProductVariant[]; onRefresh: () => void }) {
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [expandedLowGroups, setExpandedLowGroups] = useState<string[]>([]);

  const lowStockItems = items.filter(item => (item.stock_quantity || 0) < 10);

  // Grouping engine
  const groupedLowStock = lowStockItems.reduce((acc: any, item) => {
    const prodName = item.products?.name || "Unknown Product";
    if (!acc[prodName]) {
      acc[prodName] = { name: prodName, variants: [], totalQuantity: 0 };
    }
    acc[prodName].variants.push(item);
    acc[prodName].totalQuantity += item.stock_quantity;
    return acc;
  }, {});

  const toggleLowGroup = (groupName: string) => {
    setExpandedLowGroups(prev =>
      prev.includes(groupName) ? prev.filter(p => p !== groupName) : [...prev, groupName]
    );
  };

  return (
    <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-200">
      
      {/* 🚀 Sleek Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">
            Terminal Stock Inventory
          </h3>
          <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase tracking-wider">
            {showLowStockOnly ? `${Object.keys(groupedLowStock).length} Families Running Low` : `${items.length} Active SKUs`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Low Stock Toggle button (Color turns Alert Red when active) */}
          <button 
            onClick={() => {
              setShowLowStockOnly(!showLowStockOnly);
              setExpandedLowGroups([]);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-sm ${
              showLowStockOnly ? "bg-red-600 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            {showLowStockOnly ? <EyeOff size={14} /> : <AlertTriangle size={14} className="text-red-500" />}
            {showLowStockOnly ? "Show All View" : "Alert Toggle"}
          </button>

          {/* Action 1: Auto Gen */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black uppercase transition-all shadow-sm">
                <Zap size={14} className="text-amber-500" /> Auto-Gen
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-[2.5rem] p-8 bg-white border border-slate-200 shadow-2xl">
              <DialogHeader className="border-b pb-4 mb-4">
                <DialogTitle className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                  <Zap size={16} className="text-amber-500" /> Auto-Generate Variant Specifications
                </DialogTitle>
              </DialogHeader>
              <BulkAddTool onSuccess={onRefresh} />
            </DialogContent>
          </Dialog>

          {/* Action 2: CSV Import */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase transition-all shadow-sm">
                <FileSpreadsheet size={14} className="text-emerald-400" /> Import CSV
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg rounded-[2.5rem] p-8 bg-white border border-slate-200 shadow-2xl">
              <DialogHeader className="border-b pb-4 mb-4">
                <DialogTitle className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-emerald-500" /> Master CSV Data Stream Link
                </DialogTitle>
              </DialogHeader>
              <CSVUploader onSuccess={onRefresh} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow className="hover:bg-transparent border-slate-100">
              {showLowStockOnly && <TableHead className="w-[40px]"></TableHead>}
              <TableHead className="font-black text-slate-400 text-[10px] uppercase">Uniform Item</TableHead>
              <TableHead className="font-black text-slate-400 text-[10px] uppercase">SKU</TableHead>
              <TableHead className="font-black text-slate-400 text-[10px] uppercase">Size/Qty</TableHead>
              <TableHead className="font-black text-slate-400 text-[10px] uppercase text-right">Price (KES)</TableHead>
              <TableHead className="font-black text-slate-400 text-[10px] uppercase text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            
            {showLowStockOnly ? (
              // 🔴 BEST OF THE BEST VIEW: Sleek Collapsible High Priority Group Drawer
              Object.values(groupedLowStock).map((group: any, index: number) => {
                const isExpanded = expandedLowGroups.includes(group.name);

                return (
                  <React.Fragment key={`low-group-${index}`}>
                    <TableRow 
                      onClick={() => toggleLowGroup(group.name)}
                      className="border-slate-50 hover:bg-red-50/50 transition-colors cursor-pointer"
                    >
                      <TableCell className="py-4">
                        {isExpanded ? <ChevronDown size={16} className="text-red-500" /> : <ChevronRight size={16} className="text-slate-400" />}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center border border-red-200">
                            <PackageCheck size={18} className="text-red-600" />
                          </div>
                          <div>
                            <p className="font-black text-red-900 text-sm uppercase tracking-tight">{group.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-mono font-bold">Grouped Stock Context</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[10px] font-bold text-slate-500 uppercase">
                        MULTIPLE_SKUs
                      </TableCell>
                      <TableCell>
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-[10px] font-black uppercase">
                          {group.variants.length} Variance Types
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-black text-slate-900">
                        {group.totalQuantity} total units
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-tight bg-red-100 text-red-600 animate-pulse">
                          Restock Due
                        </span>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="bg-slate-50/30 hover:bg-slate-50/30">
                        <TableCell colSpan={6} className="p-0">
                          <div className="p-6 bg-white rounded-xl mx-4 mb-4 border border-slate-100 shadow-md">
                            <Table>
                              <TableHeader className="bg-slate-50/50">
                                <TableRow className="border-none hover:bg-transparent">
                                  <TableHead className="text-[9px] font-black uppercase text-slate-400">Variant SKU</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase text-slate-400">Size Context</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase text-slate-400 text-right">Units Remaining</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {group.variants.map((v: any, vIndex: number) => (
                                  <TableRow key={v.id || `v-low-${vIndex}`} className="border-slate-50 hover:bg-slate-50 transition-all">
                                    <TableCell className="py-2 font-mono text-[10px] font-bold text-slate-600 uppercase">
                                      {v.sku}
                                    </TableCell>
                                    <TableCell className="py-2">
                                      <span className="bg-white border text-slate-800 px-2 py-1 rounded text-[10px] font-black uppercase">
                                        Size: {v.size} {v.color ? `(${v.color})` : ''}
                                      </span>
                                    </TableCell>
                                    <TableCell className="py-2 text-right">
                                      <span className="font-black text-xs text-red-600 flex items-center justify-end gap-1">
                                        <AlertTriangle size={12} className="text-red-500 animate-pulse" />
                                        {v.stock_quantity} Left
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              // 📊 BEST OF THE BEST VIEW: Clean, Flat-List Master View (No Dropdowns)
              items.map((item, index) => (
                <TableRow key={item.id || `stock-item-${index}`} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <TableCell className="py-4">
                    <div>
                      <p className="font-black text-slate-800 text-sm uppercase tracking-tight">
                        {item.products?.name} 
                        {item.color && item.school_name === 'Plain' ? ` (${item.color})` : ''}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase font-mono tracking-tight font-bold">{item.barcode || 'SYSTEM NO_BARCODE'}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-[10px] font-bold text-slate-600 uppercase">
                    {item.sku}
                  </TableCell>
                  <TableCell>
                    <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-[10px] font-black uppercase">
                      Size {item.size}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-black text-slate-900">
                    {item.price.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tight ${
                      (item.stock_quantity || 0) < 10 
                        ? "bg-red-100 text-red-600 animate-pulse" 
                        : "bg-[#007a43]/10 text-[#007a43]"
                    }`}>
                      {item.stock_quantity || 0} IN STOCK
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}