"use client";

import React, { useState, useEffect } from 'react';
import { Clock, LogOut, CheckCircle2, Smartphone, Timer, UserX } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const StaffManagement = ({ initialStaff }: { initialStaff: any[] }) => {
  const [activeShop, setActiveShop] = useState('315');
  const [attendance, setAttendance] = useState<any[]>([]);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchTodayAttendance();

    const channel = supabase
      .channel('live_attendance')
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'attendance', 
          filter: `Date=eq.${today}` 
        }, 
        () => fetchTodayAttendance()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [today]);

  const fetchTodayAttendance = async () => {
    const { data } = await supabase
      .from('attendance')
      .select('*')
      .eq('Date', today);
    if (data) setAttendance(data);
  };

  const handleAction = async (member: any, actionType: string) => {
    const staffId = member["Employee ID"] || member["Employee Id"] || member.id;
    const now = new Date().toTimeString().split(' ')[0];

    // UPDATED: Using "Time In" and "Time Out" to match your DB schema
    let updateData: any = {
      "Employee Id": staffId,
      "Employee Name": member["Employee Name"] || member.name,
      "Shop": activeShop,
      "Date": today,
      "Is Paid": false,
      "status": "Present"
    };

    if (actionType === 'Clock In') {
        updateData["Time In"] = now;
    }
    if (actionType === 'Clock Out') {
        updateData["Time Out"] = now;
    }
    if (actionType === 'Unpaid') { 
        updateData["Time In"] = "0"; 
        updateData["status"] = "Absent";
        updateData["Daily Pay"] = 0;
    }
    if (actionType === 'Excused') { 
        updateData["Time In"] = "Excused"; 
        updateData["status"] = "Absent (Excused)";
        updateData["Daily Pay"] = 0;
    }

    const { error } = await supabase.from('attendance').upsert(updateData, { 
      onConflict: 'Employee Id, Date' 
    });

    if (error) alert("Error: " + error.message);
    else fetchTodayAttendance();
  };

  const filteredStaff = initialStaff.filter(s => String(s.Shop || s.shop) === String(activeShop));

  return (
    <div className="relative z-50 pointer-events-auto p-4 space-y-6">
      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit border border-slate-200">
        {['315', '172', 'Stage'].map((shop) => (
          <button 
            key={shop} 
            onClick={() => setActiveShop(shop)}
            className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all ${
              activeShop === shop ? 'bg-white text-blue-600 shadow-md' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Shop {shop}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((member) => {
          const record = attendance.find(a => a["Employee Id"] === (member["Employee ID"] || member["Employee Id"] || member.id));
          // UPDATED: Logic now looks at "Time In" and "Time Out"
          const isClockedIn = record?.["Time In"] && !record?.["Time Out"] && !["0", "Excused"].includes(record?.["Time In"]);
          const isFinished = record?.["Time Out"];
          const isAbsent = record?.["Time In"] === "0" || record?.["Time In"] === "Excused";

          return (
            <div key={member.id} className={`bg-white rounded-[2.5rem] p-8 border transition-all duration-300 ${isClockedIn ? 'border-blue-500 ring-4 ring-blue-50 bg-blue-50/10' : 'border-slate-100 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">{member["Employee Name"] || member.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    {isClockedIn ? (
                      <span className="flex items-center gap-1 text-[9px] font-black text-blue-600 uppercase">
                        <Smartphone size={10} className="animate-pulse" /> Live on Mobile
                      </span>
                    ) : isFinished ? (
                      <span className="text-[9px] font-black text-green-600 uppercase">Shift Completed</span>
                    ) : isAbsent ? (
                      <span className="text-[9px] font-black text-red-500 uppercase">{record?.status}</span>
                    ) : (
                      <span className="text-[9px] font-black text-slate-400 uppercase">Offline</span>
                    )}
                  </div>
                </div>
                {isClockedIn && <Timer className="text-blue-500 animate-pulse" size={20} />}
                {isFinished && <CheckCircle2 className="text-green-500" size={20} />}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <button onClick={() => handleAction(member, isClockedIn ? 'Clock Out' : 'Clock In')}
                  className={`py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${isClockedIn ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                  {isClockedIn ? 'Force Out' : 'Manual In'}
                </button>
                <button onClick={() => handleAction(member, 'Unpaid')}
                  className="bg-slate-100 text-slate-400 py-4 rounded-2xl text-[10px] font-black uppercase hover:bg-red-50 hover:text-red-600">
                  Unpaid
                </button>
              </div>

              <button onClick={() => handleAction(member, 'Excused')}
                className="w-full bg-blue-50 text-blue-600 py-3 rounded-2xl text-[9px] font-black uppercase hover:bg-blue-100">
                Mark Excused
              </button>

              {record && (
                <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>In: {record["Time In"]}</span>
                  <span>Out: {record["Time Out"] || '--:--'}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};