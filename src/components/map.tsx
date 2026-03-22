"use client";

import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LocateFixed, Fuel } from "lucide-react";
import { Button } from "./ui/button";
import { ReportPriceModal } from "./report-price-modal";

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

// Custom Green Icon for OSM live stations
const OsmIcon = L.icon({
  ...DefaultIcon.options,
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
});

interface StationData {
  id?: string;
  name: string;
  lat: number;
  lng: number;
  priceReports?: any[];
  isOsm?: boolean;
}

function MapEvents({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds());
    }
  });
  
  useEffect(() => {
    // Initial fetch once map loads
    onBoundsChange(map.getBounds());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return null;
}

export default function Map({ stations: dbStations }: { stations: any[] }) {
  const [map, setMap] = useState<L.Map | null>(null);
  const [osmStations, setOsmStations] = useState<StationData[]>([]);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [loadingMap, setLoadingMap] = useState(false);
  
  const defaultPosition: [number, number] = [-15.7801, -47.9292];
  
  const locateUser = () => {
    if (!map) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { duration: 1.5 });
        },
        (err) => console.warn("Geolocation denied or unavailable."),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };
  
  useEffect(() => {
    if (map) locateUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  const fetchOSM = useCallback(async (bounds: L.LatLngBounds) => {
    if (!map) return;
    
    // Zoom limit so it doesn't try to query all of Brazil and crash the browser
    if (map.getZoom() < 13) {
      setOsmStations([]);
      return;
    }

    setLoadingMap(true);
    try {
      const s = bounds.getSouth();
      const w = bounds.getWest();
      const n = bounds.getNorth();
      const e = bounds.getEast();
      
      const query = `[out:json][timeout:15];node["amenity"="fuel"](${s},${w},${n},${e});out body;`;
      
      const res = await fetch(`https://overpass-api.de/api/interpreter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      });
      
      const data = await res.json();
      
      if (data.elements) {
        const nodes: StationData[] = data.elements.map((el: any) => ({
          id: `osm-${el.id}`,
          name: el.tags.name || el.tags.brand || "Posto Registrado via Satélite (Sem Nome)",
          lat: el.lat,
          lng: el.lon,
          isOsm: true
        }));
        
        setOsmStations((prev) => {
          // Keep old nodes + add new, deduplicating by ID
          const existingIds = new Set(prev.map(p => p.id));
          const newNodes = nodes.filter(n => !existingIds.has(n.id));
          return [...prev, ...newNodes];
        });
      }
    } catch(e) {
      console.error("Failed fetching live OSM map stations:", e);
    } finally {
      setLoadingMap(false);
    }
  }, [map]);

  // Combine DB stations with Live Map Stations, deduplicating close proximity (same gas station)
  const mergedStations = [...(dbStations || [])];
  for (const osm of osmStations) {
    const isDuplicate = dbStations.some(db => 
      // Approximate 60 meters merge radius around DB recorded stations
      Math.hypot(db.lat - osm.lat, db.lng - osm.lng) < 0.0006 
    );
    if (!isDuplicate) {
      mergedStations.push(osm);
    }
  }

  return (
    <>
      <div className="w-full h-full relative">
        {loadingMap && (
           <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[9999] bg-yellow-100 text-yellow-800 text-xs px-3 py-1 font-bold rounded-full shadow-sm animate-pulse border border-yellow-200 flex items-center gap-1">
             <Fuel className="w-3 h-3"/> Atualizando mapa de postos...
           </div>
        )}
        <MapContainer
          ref={setMap as any}
          center={defaultPosition}
          zoom={4}
          className="w-full h-full z-0"
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapEvents onBoundsChange={fetchOSM} />
          
          {mergedStations.map((station) => {
            const iconToUse = station.isOsm ? OsmIcon : DefaultIcon;
            return (
              <Marker key={station.id} position={[station.lat, station.lng]} icon={iconToUse}>
                <Popup className="shadcn-map-popup">
                  <div className="flex flex-col gap-2 min-w-[200px] py-1">
                    <span className="font-bold text-zinc-900 text-[15px] leading-tight break-words">{station.name}</span>
                    
                    {station.priceReports && station.priceReports.length > 0 ? (
                      <div className="bg-green-50 rounded-md p-2 border border-green-200 mb-1 shadow-inner">
                        <span className="text-green-800 text-[13px] font-bold block">
                          {station.priceReports[0].fuelType}: R$ {station.priceReports[0].price.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-500 text-xs italic mb-2">Ainda sem preços reportados pela comunidade.</span>
                    )}

                    <Button 
                      size="sm" 
                      className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md font-semibold mt-1 rounded-lg"
                      onClick={(e) => {
                         // Leaflet popup event blocker wrapper 
                         e.preventDefault(); 
                         e.stopPropagation(); 
                         setSelectedStation(station); 
                      }}
                    >
                      Informar Preço
                    </Button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Global GPS Locate Control placed safely OUTSIDE Map Container DOM */}
        <div className="absolute bottom-6 right-4 z-[9999] pointer-events-auto">
          <Button type="button" variant="secondary" size="icon" onClick={locateUser} className="shadow-2xl bg-white hover:bg-zinc-100 flex items-center justify-center h-12 w-12 border border-zinc-200 rounded-full">
            <LocateFixed className="w-6 h-6 text-green-600" />
          </Button>
        </div>
      </div>

      <ReportPriceModal 
        station={selectedStation} 
        open={!!selectedStation} 
        onClose={() => setSelectedStation(null)} 
      />
    </>
  );
}
