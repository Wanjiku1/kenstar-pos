"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Users, Landmark, Search, Plus, Wallet, Loader2 } from 'lucide-react'; 
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/auth/role-gate";

// Modular Components
import { StockTable } from './stock-table';
import { StaffManagement } from './staff-tab';
import { InventoryStats } from './inventory-stats';
import { AccountingView } from './accounting-view';
import { AddProductModal } from './add-product-modal';
import { AddStaffModal } from './add-staff-modal';
import { PayoutHub as PayrollSummary } from './payroll-summary';

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false); 
  const [payroll, setPayroll] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: invData } = await supabase
        .from('product_variants')
        .select('*, products(name)')
        .order('stock_quantity', { ascending: false });

      const { data: staffData } = await supabase.from('staff').select('*');
      const { data: salesData } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
      const { data: payrollData } = await supabase.from('payroll_calculations').select('*');

      if (payrollData) setPayroll(payrollData);
      if (invData) setItems(invData);
      if (staffData) setStaff(staffData);
      if (salesData) setSales(salesData);
    } catch (error) {
      console.error("Data Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const filteredItems = items.filter(item => 
    item.products?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.school_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <RoleGate allowedRoles={['founder', 'admin', 'manager']}>
      <div className="p-8 bg-[#f8fafc] min-h-screen space-y-8 relative z-10 font-sans">
        
        {/* Kenstar Branded Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200">
              <Package size={20} className="text-[#007a43]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">KENSTAR OPS</h1>
              <p className="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse mr-2" /> Kenstar Inventory Feed
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setIsProductModalOpen(true)} className="bg-slate-900 text-white rounded-xl font-black text-xs uppercase h-11 px-6 shadow-sm hover:bg-slate-800 transition-all">
              <Plus size={16} className="mr-2" /> Add Product
            </Button>
            <Button onClick={() => setIsStaffModalOpen(true)} className="bg-[#007a43] text-white rounded-xl font-black text-xs uppercase h-11 px-6 shadow-sm hover:bg-[#006235] transition-all">
              <Plus size={16} className="mr-2" /> Add Staff
            </Button>
          </div>
        </header>

        {/* Search Bar matching HQ Analytics toggle aesthetics */}
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#007a43] transition-colors" size={18} />
          <Input 
            placeholder="Search uniforms, SKUs, or Schools..." 
            className="pl-12 bg-white border-slate-200 rounded-2xl h-14 font-bold text-slate-700 shadow-sm focus:ring-4 focus:ring-[#007a43]/10 focus:border-[#007a43] outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <InventoryStats items={items} staffCount={staff.length} />

        {/* Kenstar Active Tabs matching Admin sidebar selectors! */}
        <Tabs defaultValue="stock" className="w-full">
          <TabsList className="bg-slate-200/50 mb-8 p-1.5 h-auto gap-1 rounded-2xl border border-slate-200 shadow-inner">
            <TabsTrigger value="stock" className="gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase data-[state=active]:bg-[#007a43] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all text-slate-500">
              <Package size={14}/> Stock
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase data-[state=active]:bg-[#007a43] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all text-slate-500">
              <Users size={14}/> Operations
            </TabsTrigger>
            <TabsTrigger value="payout" className="gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase data-[state=active]:bg-[#007a43] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all text-slate-500">
              <Wallet size={14}/> Payouts
            </TabsTrigger>
            <TabsTrigger value="accounting" className="gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase data-[state=active]:bg-[#007a43] data-[state=active]:text-white data-[state=active]:shadow-lg transition-all text-slate-500">
              <Landmark size={14}/> Accounting
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-slate-200 shadow-xl">
              <Loader2 className="animate-spin text-[#007a43] mb-4" size={32} />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waking HQ Nodes...</p>
            </div>
          ) : (
            <>
              <TabsContent value="stock" className="outline-none">
                <StockTable items={filteredItems} onRefresh={fetchAllData} />
              </TabsContent>

              <TabsContent value="staff" className="outline-none">
                <StaffManagement initialStaff={staff} />
              </TabsContent>

              <TabsContent value="payout" className="outline-none">
                <PayrollSummary data={payroll} onRefresh={fetchAllData} />
              </TabsContent>

              <TabsContent value="accounting" className="outline-none">
                <AccountingView salesData={sales} />
              </TabsContent>
            </>
          )}
        </Tabs>

        <AddProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSuccess={fetchAllData} />
        <AddStaffModal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} onSuccess={fetchAllData} />
      </div>
    </RoleGate>
  );
}