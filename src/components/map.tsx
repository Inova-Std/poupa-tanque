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

function LocationControl({ onLocate }: { onLocate?: (lat: number, lng: number) => void }) {
  const map = useMap();
  const controlRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (controlRef.current) {
      L.DomEvent.disableClickPropagation(controlRef.current);
      L.DomEvent.disableScrollPropagation(controlRef.current);
    }
  }, []);
  
  const locateUser = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          map.flyTo([latitude, longitude], 15, { duration: 1.5 });
          if (onLocate) onLocate(latitude, longitude);
        },
        (err) => {
          alert("Erro ao buscar localização. Verifique as permissões de GPS/Localização do seu navegador.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert("Geolocalização não suportada no seu dispositivo.");
    }
  };

  return (
    <div 
      ref={controlRef}
      className="leaflet-top leaflet-right mt-4 mr-4 pointer-events-auto" 
      style={{ zIndex: 1000, position: 'absolute', top: 10, right: 10 }}
    >
      <Button type="button" variant="secondary" size="icon" onClick={locateUser} className="shadow-md bg-white hover:bg-zinc-100">
        <LocateFixed className="w-5 h-5 text-green-600" />
      </Button>
    </div>
  );
}

export default function Map({ stations }: { stations: any[] }) {
  // Center of Brazil roughly or a default location
  const defaultPosition: [number, number] = [-15.7801, -47.9292];
  
  return (
    <div className="w-full h-full relative">
      <MapContainer
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
        
        <LocationControl />
      </MapContainer>
    </div>
  );
}
