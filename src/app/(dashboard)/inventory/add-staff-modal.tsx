"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  X, 
  UserPlus, 
  Shield, 
  Store, 
  CreditCard, 
  Hash 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AddStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddStaffModal = ({ isOpen, onClose, onSuccess }: AddStaffModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employee_name: '',
    employee_id: '',
    pin: '',
    role: 'Cashier',
    shop: '315',
    payment_cycle: 'Weekly',
    hourly_rate: 0
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('staff').insert([{
      "Employee Name": formData.employee_name,
      "Employee Id": formData.employee_id,
      "pin": formData.pin,
      "role": formData.role,
      "Shop": formData.shop,
      "Payment Cycle": formData.payment_cycle,
      "Hourly Rate": formData.hourly_rate,
      "Seq": 99 // Default to end of list
    }]);

    setLoading(false);
    if (error) {
      alert("Error adding staff: " + error.message);
    } else {
      onSuccess();
      onClose();
      setFormData({ employee_name: '', employee_id: '', pin: '', role: 'Cashier', shop: '315', payment_cycle: 'Weekly', hourly_rate: 0 });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="p-8 bg-slate-50 border-b flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-2xl text-white">
              <UserPlus size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Register New Staff</h2>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Kenstar Operations HQ</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Full Name</label>
              <Input 
                required
                placeholder="e.g. John Kamau"
                className="rounded-xl h-12 border-slate-200"
                value={formData.employee_name}
                onChange={e => setFormData({...formData, employee_name: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Employee ID</label>
              <Input 
                required
                placeholder="KU001"
                className="rounded-xl h-12 border-slate-200"
                value={formData.employee_id}
                onChange={e => setFormData({...formData, employee_id: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Terminal PIN (4 Digits)</label>
              <Input 
                required
                maxLength={4}
                placeholder="1234"
                className="rounded-xl h-12 border-slate-200 font-mono tracking-[1em] text-center"
                value={formData.pin}
                onChange={e => setFormData({...formData, pin: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Default Shop</label>
              <select 
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.shop}
                onChange={e => setFormData({...formData, shop: e.target.value as any})}
              >
                <option value="315">Shop 315 (HQ)</option>
                <option value="172">Shop 172</option>
                <option value="Shop Stage">Shop Stage</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Pay Cycle</label>
              <select 
                className="w-full h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.payment_cycle}
                onChange={e => setFormData({...formData, payment_cycle: e.target.value as any})}
              >
                <option value="Weekly">Weekly (Saturday)</option>
                <option value="Monthly">Monthly</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1 h-12 rounded-xl font-bold border-slate-200"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {loading ? "Registering..." : "Add to Staff List"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};