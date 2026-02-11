"use client";

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Users } from "lucide-react";

/**
 * Custom Indicator Marker
 * Designed to look like a high-tech "ping" on a radar rather than a street pin.
 */
const customIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="absolute w-8 h-8 bg-blue-500/10 rounded-full animate-ping"></div>
      <div class="absolute w-5 h-5 bg-blue-500/20 rounded-full"></div>
      <div class="w-3 h-3 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export default function MapComponent({ staffLocations = [] }: { staffLocations: any[] }) {
  // Default center set to Nairobi HQ area
  const center: [number, number] = [-1.286389, 36.817223];

  /**
   * Final Safety Filter:
   * Ensures only valid numeric coordinates within global ranges are rendered.
   * This is the final shield against "Out of Range" errors.
   */
  const validStaff = staffLocations.filter(staff => 
    typeof staff.lat === 'number' && 
    typeof staff.lng === 'number' &&
    Math.abs(staff.lat) <= 90 && 
    Math.abs(staff.lng) <= 180 &&
    staff.lat !== 0 && 
    staff.lng !== 0
  );

  return (
    <div className="h-full w-full bg-[#f8fafc] relative overflow-hidden">
      
      {/* LIVE COUNT BADGE - Inspired by your Total Points UI */}
      <div className="absolute top-6 right-6 z-[500] flex flex-col items-end">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Total Points</span>
            <span className="text-2xl font-black text-blue-600 leading-tight">
              {validStaff.length}
            </span>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
            <Users size={20} />
          </div>
        </div>
      </div>

      <MapContainer 
        center={center} 
        zoom={14} 
        scrollWheelZoom={false}
        zoomControl={false}
        dragging={false} // Prevents users from dragging map into invalid coordinate ranges
        touchZoom={false}
        doubleClickZoom={false}
        className="h-full w-full grayscale contrast-[1.1] opacity-60"
      >
        {/* Minimalist Light Tile Layer for a clean "Whiteboard" aesthetic */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; KENSTAR OPS'
        />

        {validStaff.map((staff, idx) => (
          <Marker 
            key={`${staff.id || idx}`} 
            position={[staff.lat, staff.lng]} 
            icon={customIcon}
          >
            <Popup className="custom-popup">
              <div className="p-2 font-black text-slate-800 text-[10px] uppercase tracking-wider">
                {staff.name || "Active Unit"}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Frame Overlays: Enhances the "Dashboard Indicator" look by softening the map edges */}
      <div className="absolute inset-0 pointer-events-none border-[16px] border-white z-[400]" />
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(255,255,255,1)] z-[400]" />
      
      {/* Bottom Signal Branding */}
      <div className="absolute bottom-6 right-6 z-[400] opacity-20 pointer-events-none">
        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-900 italic">
          Kenstar Presence Feed
        </h4>
      </div>
    </div>
  );
}