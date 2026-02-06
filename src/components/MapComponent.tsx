"use client";

import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';

interface MapProps {
  staffLocations: any[];
}

const MapComponent = ({ staffLocations }: MapProps) => {
  const center: [number, number] = [-1.286389, 36.817223]; // Nairobi HQ

  return (
    <div className="h-full w-full">
      {/* @ts-ignore */}
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        {/* @ts-ignore */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; Kenstar ERP'
        />
        {staffLocations && staffLocations.map((staff, idx) => (
          staff.lat && staff.lng && (
            <Marker key={idx} position={[staff.lat, staff.lng]}>
              <Popup>
                <div className="text-xs font-bold uppercase">
                  {staff.name}
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );
};

// VERCEL REQUIREMENT: This line must be exactly like this
export default MapComponent;