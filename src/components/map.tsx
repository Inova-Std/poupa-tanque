"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LocateFixed } from "lucide-react";
import { Button } from "./ui/button";

// Fix for default Leaflet marker icon in Next-js
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function Map({ stations }: { stations: any[] }) {
  const [map, setMap] = useState<L.Map | null>(null);
  const defaultPosition: [number, number] = [-15.7801, -47.9292];
  
  const locateUser = () => {
    if (!map) return;
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { duration: 1.5 });
        },
        (err) => {
          console.warn("Geolocalização não permitida ou falhou na inicialização.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  // Center automatically when the map is ready
  useEffect(() => {
    if (map) {
      locateUser();
    }
  }, [map]);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        ref={setMap}
        center={defaultPosition}
        zoom={4}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {stations?.map((station) => (
          <Marker key={station.id} position={[station.lat, station.lng]}>
            <Popup>
              <div className="flex flex-col gap-1">
                <span className="font-bold text-zinc-900">{station.name}</span>
                {station.priceReports && station.priceReports.length > 0 ? (
                  <span className="text-zinc-600 text-sm">
                    {station.priceReports[0].fuelType}: R$ {station.priceReports[0].price.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-zinc-500 text-xs italic">Sem preços reportados</span>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Control Button OUTSIDE MapContainer DOM so Leaflet cannot interfere with pointer events */}
      <div className="absolute top-4 right-4 z-[9999] pointer-events-auto">
        <Button type="button" variant="secondary" size="icon" onClick={locateUser} className="shadow-xl bg-white hover:bg-zinc-100 flex items-center justify-center h-10 w-10 border border-zinc-200">
          <LocateFixed className="w-5 h-5 text-green-600" />
        </Button>
      </div>
    </div>
  );
}
