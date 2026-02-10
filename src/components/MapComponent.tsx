"use client";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icons
const icon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

export default function MapComponent({ staffLocations }: { staffLocations: any[] }) {
  const nairobiCenter: [number, number] = [-1.286389, 36.817223];

  // SAFETY FILTER: Remove any staff that don't have valid Lat/Lng
  const validStaff = staffLocations?.filter(staff => 
    staff.lat && 
    staff.lng && 
    Math.abs(staff.lat) <= 90 && 
    Math.abs(staff.lng) <= 180
  ) || [];

  return (
    <MapContainer 
      center={nairobiCenter} 
      zoom={14} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {validStaff.map((staff, idx) => (
        <Marker 
          key={`${staff.name}-${idx}`} 
          position={[staff.lat, staff.lng]} 
          icon={icon}
        >
          <Popup>
            <div className="text-center p-1">
              <p className="font-black text-[10px] uppercase">{staff.name}</p>
              <p className="text-[9px] text-green-600 font-bold uppercase">At Workplace</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}