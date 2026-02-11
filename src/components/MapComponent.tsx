"use client";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Users, Store } from "lucide-react";

// EXACT Umoja 1 Market Coordinates
const UMOJA_MARKET: [number, number] = [-1.2825, 36.8967];

const customIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-6 h-6 bg-blue-500/20 rounded-full animate-pulse"></div>
      <div class="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-sm"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function MapComponent({ staffLocations = [] }: { staffLocations: any[] }) {
  
  // 1. FILTER: Only show staff within a 5km radius of Umoja to prevent "Out of Range" jumps
  const validStaff = (staffLocations || []).map(staff => ({
    ...staff,
    lat: parseFloat(String(staff.lat)),
    lng: parseFloat(String(staff.lng))
  })).filter(staff => 
    !isNaN(staff.lat) && 
    !isNaN(staff.lng) &&
    staff.lat >= -1.35 && staff.lat <= -1.20 && // Narrow Umoja/Eastlands Lat
    staff.lng >= 36.80 && staff.lng <= 37.00    // Narrow Umoja/Eastlands Lng
  );

  if (typeof window === "undefined") return null;

  return (
    <div className="h-full w-full bg-[#f8fafc] relative overflow-hidden">
      
      {/* STATUS BADGE */}
      <div className="absolute top-6 right-6 z-[500]">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Shop Feed</span>
            <span className="text-xl font-black text-blue-600 leading-none">{validStaff.length}</span>
          </div>
          <Users size={18} className="text-blue-600" />
        </div>
      </div>

      <MapContainer 
        center={UMOJA_MARKET} 
        zoom={16} 
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={true}
        // This is the "Safety Box" - the map cannot be dragged away from Umoja
        maxBounds={[[-1.35, 36.80], [-1.20, 37.00]]} 
        className="h-full w-full grayscale contrast-[1.1] opacity-70"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; KENSTAR'
        />

        {/* Static Marker for the Shop Location */}
        <Marker position={UMOJA_MARKET}>
            <Popup>
                <div className="flex items-center gap-2 font-black text-blue-600 text-[10px] uppercase">
                    <Store size={12} /> Kenstar Uniforms HQ
                </div>
            </Popup>
        </Marker>

        {validStaff.map((staff, idx) => (
          <Marker 
            key={`staff-${idx}`} 
            position={[staff.lat, staff.lng]} 
            icon={customIcon}
          >
            <Popup>
              <div className="p-1 font-bold text-slate-800 text-[10px] uppercase">
                {staff.name || "Active Staff"}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Frame overlays to maintain dashboard look */}
      <div className="absolute inset-0 pointer-events-none border-[12px] border-white z-[400]" />
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_50px_rgba(255,255,255,1)] z-[400]" />
    </div>
  );
}