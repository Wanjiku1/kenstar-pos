"use client";

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Users, Landmark, Search, Plus, Wallet, Loader2 } from 'lucide-react'; 
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RoleGate } from "@/components/auth/role-gate";

// Components
import { StockTable } from './stock-table';
import { StaffManagement } from './staff-tab';
import { InventoryStats } from './inventory-stats';
import { AccountingView } from './accounting-view';
import { AddProductModal } from './add-product-modal';
import { AddStaffModal } from './add-staff-modal';
import { PayoutHub } from './payroll-summary';

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
      const { data: invData } = await supabase.from('product_variants').select('*, products(name)');
      const { data: staffData } = await supabase.from('staff').select('*');
      const { data: salesData } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
      
      // Fetch ONLY unpaid attendance
      const { data: attData } = await supabase
        .from('attendance')
        .select('*')
        .eq('Is Paid', false);

      // CRITICAL MERGE: Link Attendance to Staff via "Employee Id" string
      if (attData && staffData) {
        const merged = attData.map(record => {
          const staffMember = staffData.find(s => s["Employee Id"] === record["Employee Id"]);
          return {
            ...record,
            "Payment Cycle": staffMember?.["Payment Cycle"] || "Monthly" // Defaulting to your schema default
          };
        });
        setPayroll(merged);
      }

      if (invData) setItems(invData);
      if (staffData) setStaff(staffData);
      if (salesData) setSales(salesData);
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const filteredItems = items.filter(item => 
    item.products?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <RoleGate allowedRoles={['founder', 'admin', 'manager']}>
      <div className="p-8 bg-[#f8fafc] min-h-screen space-y-8 relative z-10 font-sans">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200">
              <Package size={20} className="text-[#007a43]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">KENSTAR OPS</h1>
              <p className="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-1 mt-1">HQ Command Center</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsProductModalOpen(true)} className="bg-slate-900 text-white rounded-xl font-black text-xs uppercase h-11 px-6 shadow-sm">
              <Plus size={16} className="mr-2" /> Product
            </Button>
            <Button onClick={() => setIsStaffModalOpen(true)} className="bg-[#007a43] text-white rounded-xl font-black text-xs uppercase h-11 px-6 shadow-sm">
              <Plus size={16} className="mr-2" /> Staff
            </Button>
          </div>
        </header>

        <InventoryStats items={items} staffCount={staff.length} />

        <Tabs defaultValue="stock" className="w-full">
          <TabsList className="bg-slate-200/50 mb-8 p-1.5 h-auto rounded-2xl border border-slate-200 shadow-inner">
            <TabsTrigger value="stock" className="px-6 py-3 rounded-xl font-black text-[10px] uppercase data-[state=active]:bg-[#007a43] data-[state=active]:text-white">Stock</TabsTrigger>
            <TabsTrigger value="staff" className="px-6 py-3 rounded-xl font-black text-[10px] uppercase data-[state=active]:bg-[#007a43] data-[state=active]:text-white">Operations</TabsTrigger>
            <TabsTrigger value="payout" className="px-6 py-3 rounded-xl font-black text-[10px] uppercase data-[state=active]:bg-[#007a43] data-[state=active]:text-white">Payouts</TabsTrigger>
            <TabsTrigger value="accounting" className="px-6 py-3 rounded-xl font-black text-[10px] uppercase data-[state=active]:bg-[#007a43] data-[state=active]:text-white">Accounting</TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="py-20 flex flex-col items-center"><Loader2 className="animate-spin text-[#007a43] mb-4" /></div>
          ) : (
            <>
              <TabsContent value="stock"><StockTable items={filteredItems} onRefresh={fetchAllData} /></TabsContent>
              <TabsContent value="staff"><StaffManagement initialStaff={staff} /></TabsContent>
              <TabsContent value="payout"><PayoutHub data={payroll} onRefresh={fetchAllData} /></TabsContent>
              <TabsContent value="accounting"><AccountingView salesData={sales} /></TabsContent>
            </>
          )}
        </Tabs>

        <AddProductModal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} onSuccess={fetchAllData} />
        <AddStaffModal isOpen={isStaffModalOpen} onClose={() => setIsStaffModalOpen(false)} onSuccess={fetchAllData} />
      </div>
    </RoleGate>
  );
}