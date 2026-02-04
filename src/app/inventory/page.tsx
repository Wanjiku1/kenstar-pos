"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Users, Landmark, Search, Plus, Wallet } from 'lucide-react'; 
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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

  // FETCH ALL DATA FROM SUPABASE
  const fetchAllData = useCallback(async () => {
    // 1. Fetch Products
    const { data: invData } = await supabase.from('product_variants').select('*, products(name)').order('stock');
    
    // 2. Fetch Staff (Pulling from 'staff' table with Text IDs)
    const { data: staffData } = await supabase.from('staff').select('*');
    
    // 3. Fetch Sales Data
    const { data: salesData } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
    
    // 4. Fetch Payroll Calculations (The Weekly/Monthly view)
    // This view now automatically excludes "Paid" records and handles Kenstar Sunday rules
    const { data: payrollData } = await supabase.from('payroll_calculations').select('*');

    if (payrollData) setPayroll(payrollData);
    if (invData) setItems(invData);
    if (staffData) setStaff(staffData);
    if (salesData) setSales(salesData);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const filteredItems = items.filter(item => 
    item.products?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen space-y-8 relative z-50 pointer-events-auto">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">KENSTAR OPS</h1>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Manager Terminal • Kenya HQ</p>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={() => setIsProductModalOpen(true)}
            className="bg-slate-900 text-white rounded-xl font-black text-xs uppercase h-11 px-6 shadow-sm"
          >
            <Plus size={16} className="mr-2" /> Add Product
          </Button>
          <Button 
            onClick={() => setIsStaffModalOpen(true)}
            className="bg-blue-600 text-white rounded-xl font-black text-xs uppercase h-11 px-6 shadow-sm"
          >
            <Plus size={16} className="mr-2" /> Add Staff
          </Button>
        </div>
      </header>

      {/* SEARCH BAR SECTION */}
      <div className="relative w-full md:w-96 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600" size={18} />
        <Input 
          placeholder="Search uniforms or SKUs..." 
          className="pl-12 bg-white border-slate-200 rounded-2xl h-14 font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-100"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* STATS SECTION */}
      <InventoryStats items={items} staffCount={staff.length} />

      {/* TABS SECTION */}
      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="bg-slate-200/50 mb-8 p-1.5 h-auto gap-1 rounded-2xl border border-slate-200 shadow-inner">
          <TabsTrigger value="stock" className="gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
            <Package size={14}/> Stock
          </TabsTrigger>
          <TabsTrigger value="staff" className="gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
            <Users size={14}/> Operations
          </TabsTrigger>
          <TabsTrigger value="payout" className="gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
            <Wallet size={14}/> Payouts
          </TabsTrigger>
          <TabsTrigger value="accounting" className="gap-2 px-6 py-3 rounded-xl font-black text-[10px] uppercase data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
            <Landmark size={14}/> Accounting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="outline-none">
          <StockTable items={filteredItems} />
        </TabsContent>

        <TabsContent value="staff" className="outline-none">
          {/* Operations Hub: Clock In/Out, Absences, Shop Transfers */}
          <StaffManagement initialStaff={staff} />
        </TabsContent>

        <TabsContent value="payout" className="outline-none">
          {/* Payout Hub: Updated with onRefresh to reset totals after payment */}
          <PayrollSummary data={payroll} onRefresh={fetchAllData} />
        </TabsContent>

        <TabsContent value="accounting" className="outline-none">
          <AccountingView salesData={sales} />
        </TabsContent>
      </Tabs>

      {/* MODAL SECTION */}
      <AddProductModal 
        isOpen={isProductModalOpen} 
        onClose={() => setIsProductModalOpen(false)} 
        onSuccess={fetchAllData} 
      />
      
      <AddStaffModal 
        isOpen={isStaffModalOpen} 
        onClose={() => setIsStaffModalOpen(false)} 
        onSuccess={fetchAllData} 
      />
    </div>
  );
}