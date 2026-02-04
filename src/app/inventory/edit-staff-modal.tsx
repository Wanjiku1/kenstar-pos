"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, UserPlus, Shield, MapPin, Wallet } from 'lucide-react';

export const AddStaffModal = ({ isOpen, onClose, onSuccess }: any) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    shop: '315',
    roles: 'Staff',
    rate: 400,
    cycle: 'Weekly'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Matches your exact database column names found in the SQL errors
    const { error } = await supabase
      .from('staff')
      .insert([{
       "Employee Id": formData.id, // Text-based ID
        "Employee Name": formData.name,
        "Shop": formData.shop,
        "Roles": formData.roles,        // Plural as per your SQL
        "hourly_rate": formData.rate,
        "Payment Cycle": formData.cycle
      }]);

    if (error) {
      alert("Error adding staff: " + error.message);
    } else {
      alert("Staff registered successfully!");
      onSuccess(); // Refresh the list in page.tsx
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 relative my-auto">
        {/* CLOSE BUTTON */}
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={24} />
        </button>

        {/* HEADER */}
        <div className="flex items-center gap-4 mb-10">
          <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg shadow-blue-200">
            <UserPlus size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Register Staff</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Kenstar Ops Management</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* STAFF ID */}
          <div className="md:col-span-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">Staff ID (Text)</label>
            <input required placeholder="e.g. KS-101" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
              onChange={e => setFormData({...formData, id: e.target.value})} />
          </div>

          {/* NAME */}
          <div className="md:col-span-1">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">Full Name</label>
            <input required placeholder="Enter Name" className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-100 outline-none transition-all" 
              onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          {/* ROLE & RATE */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">Role</label>
            <div className="relative">
              <Shield size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select className="w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 appearance-none outline-none focus:ring-2 focus:ring-blue-100"
                onChange={e => setFormData({...formData, roles: e.target.value})}>
                <option value="Staff">Standard Staff</option>
                <option value="Operator">Operator</option>
                <option value="Manager">Manager</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">Daily Rate (KSh)</label>
            <div className="relative">
              <Wallet size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="number" placeholder="400" className="w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-100" 
                onChange={e => setFormData({...formData, rate: Number(e.target.value)})} />
            </div>
          </div>

          {/* SHOP & CYCLE */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">Assigned Shop</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select className="w-full p-4 pl-12 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 appearance-none outline-none focus:ring-2 focus:ring-blue-100"
                onChange={e => setFormData({...formData, shop: e.target.value})}>
                <option value="315">Shop 315</option>
                <option value="172">Shop 172</option>
                <option value="Stage">Shop Stage</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-2 block">Pay Cycle</label>
            <select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-slate-800 appearance-none outline-none focus:ring-2 focus:ring-blue-100"
              onChange={e => setFormData({...formData, cycle: e.target.value})}>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
            </select>
          </div>

          {/* SUBMIT */}
          <div className="md:col-span-2 pt-4">
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-blue-600 active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Registering..." : "Register Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};