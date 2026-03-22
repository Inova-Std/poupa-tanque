"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LocateFixed, Fuel, List, ChevronDown, SortAsc, Navigation } from "lucide-react";
import { Button } from "./ui/button";
import { ReportPriceModal } from "./report-price-modal";

// --- Icons ---
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const GreenIcon = L.icon({
  ...DefaultIcon.options,
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
});

// --- Types ---
interface StationData {
  id?: string;
  name: string;
  lat: number;
  lng: number;
  priceReports?: any[];
  isOsm?: boolean;
}

// --- Utility ---
function getDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(m: number) {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

// --- Map Events ---
function MapEvents({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => onBoundsChange(map.getBounds()),
  });
  useEffect(() => { onBoundsChange(map.getBounds()); }, []);
  return null;
}

// --- Station Card ---
function StationCard({
  station,
  userLat,
  userLng,
  onSelect,
  onReportClick,
}: {
  station: StationData;
  userLat: number | null;
  userLng: number | null;
  onSelect: () => void;
  onReportClick: () => void;
}) {
  const dist = userLat && userLng ? getDistance(userLat, userLng, station.lat, station.lng) : null;
  const report = station.priceReports?.[0];

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl shadow-sm border border-zinc-100 p-3 active:scale-95 transition-transform">
      <button onClick={onSelect} className="flex-1 flex items-center gap-3 text-left min-w-0">
        <div className="bg-green-100 rounded-full p-2 shrink-0">
          <Fuel className="w-4 h-4 text-green-700" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-zinc-900 text-sm truncate">{station.name}</p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {dist != null && (
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Navigation className="w-3 h-3" />{formatDistance(dist)}
              </span>
            )}
            {report ? (
              <span className="text-xs font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                {report.fuelType.replace('_', ' ')}: R$ {Number(report.price).toFixed(2)}
              </span>
            ) : (
              <span className="text-xs text-zinc-400 italic">sem preço</span>
            )}
          </div>
        </div>
      </button>
      <Button
        size="sm"
        onClick={onReportClick}
        className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-3 shrink-0 rounded-lg"
      >
        + Preço
      </Button>
    </div>
  );
}

// --- Main Map Component ---
export default function Map({ stations: dbStations }: { stations: any[] }) {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [osmStations, setOsmStations] = useState<StationData[]>([]);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [loadingOSM, setLoadingOSM] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"distance" | "price">("distance");
  const fetchedBoundsRef = useRef<Set<string>>(new Set());

  const defaultPosition: [number, number] = [-15.7801, -47.9292];

  // Locate + fly + set pin
  const locateUser = useCallback(() => {
    if (!mapInstance) return;
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        setUserPos({ lat, lng });
        mapInstance.flyTo([lat, lng], 15, { duration: 1.5 });
      },
      () => alert("Ative a permissão de localização no navegador."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [mapInstance]);

  // Auto-locate on map ready
  useEffect(() => { if (mapInstance) locateUser(); }, [mapInstance]);

  // Fetch OSM stations whenever bounds change (no zoom floor — any zoom)
  const fetchOSM = useCallback(async (bounds: L.LatLngBounds) => {
    const key = bounds.toBBoxString();
    if (fetchedBoundsRef.current.has(key)) return;
    fetchedBoundsRef.current.add(key);

    setLoadingOSM(true);
    try {
      const { _southWest: sw, _northEast: ne } = bounds as any;
      const q = `[out:json][timeout:25];node["amenity"="fuel"](${sw.lat},${sw.lng},${ne.lat},${ne.lng});out body;`;
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: `data=${encodeURIComponent(q)}`,
      });
      const data = await res.json();
      const nodes: StationData[] = (data.elements || []).map((el: any) => ({
        id: `osm-${el.id}`,
        name: el.tags?.name || el.tags?.brand || "Posto de Combustível",
        lat: el.lat,
        lng: el.lon,
        isOsm: true,
      }));
      setOsmStations((prev) => {
        const ids = new Set(prev.map((s) => s.id));
        return [...prev, ...nodes.filter((n) => !ids.has(n.id))];
      });
    } catch (e) {
      console.error("OSM fetch failed:", e);
    } finally {
      setLoadingOSM(false);
    }
  }, []);

  // Merge DB + OSM
  const mergedStations: StationData[] = [
    ...(dbStations || []),
    ...osmStations.filter(
      (osm) => !dbStations.some(
        (db) => Math.hypot(db.lat - osm.lat, db.lng - osm.lng) < 0.0006
      )
    ),
  ];

  // Sorted list for bottom sheet
  const sortedList = [...mergedStations].sort((a, b) => {
    if (sortBy === "distance" && userPos) {
      return getDistance(userPos.lat, userPos.lng, a.lat, a.lng) -
             getDistance(userPos.lat, userPos.lng, b.lat, b.lng);
    }
    if (sortBy === "price") {
      const pa = a.priceReports?.[0]?.price ?? Infinity;
      const pb = b.priceReports?.[0]?.price ?? Infinity;
      return pa - pb;
    }
    return 0;
  });

  const flyToStation = (s: StationData) => {
    mapInstance?.flyTo([s.lat, s.lng], 17, { duration: 1 });
    setListOpen(false);
  };

  return (
    <>
      <div className="w-full h-full relative">
        {/* OSM loading badge */}
        {loadingOSM && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[9999] bg-yellow-50 text-yellow-800 text-xs px-3 py-1 font-bold rounded-full shadow border border-yellow-200 flex items-center gap-1 animate-pulse">
            <Fuel className="w-3 h-3" /> Carregando postos...
          </div>
        )}

        <MapContainer
          ref={setMapInstance as any}
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

          {/* User Location Pin */}
          {userPos && (
            <>
              <Circle
                center={[userPos.lat, userPos.lng]}
                radius={80}
                pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.25, weight: 2 }}
              />
              <Circle
                center={[userPos.lat, userPos.lng]}
                radius={10}
                pathOptions={{ color: "#1d4ed8", fillColor: "#2563eb", fillOpacity: 0.9, weight: 2 }}
              />
            </>
          )}

          {/* Station Markers */}
          {mergedStations.map((station) => (
            <Marker
              key={station.id}
              position={[station.lat, station.lng]}
              icon={station.isOsm ? GreenIcon : DefaultIcon}
            >
              <Popup>
                <div className="flex flex-col gap-2 min-w-[200px] py-1">
                  <span className="font-bold text-zinc-900 text-sm leading-tight break-words">{station.name}</span>
                  {station.priceReports?.length ? (
                    <div className="bg-green-50 rounded-md p-2 border border-green-100">
                      <span className="text-green-800 text-xs font-bold">
                        {station.priceReports[0].fuelType.replace('_',' ')}: R$ {Number(station.priceReports[0].price).toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-zinc-400 text-xs italic">Sem preços ainda</span>
                  )}
                  <Button
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedStation(station); }}
                  >
                    Informar Preço
                  </Button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* GPS Button */}
        <div className="absolute bottom-6 right-4 z-[9999]">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            onClick={locateUser}
            className="shadow-2xl bg-white hover:bg-zinc-100 h-12 w-12 border border-zinc-200 rounded-full"
          >
            <LocateFixed className="w-6 h-6 text-green-600" />
          </Button>
        </div>

        {/* List Toggle Button */}
        <div className="absolute bottom-6 left-4 z-[9999]">
          <Button
            type="button"
            onClick={() => setListOpen((v) => !v)}
            className="shadow-2xl bg-green-600 hover:bg-green-700 text-white h-12 px-4 rounded-full font-semibold flex items-center gap-2"
          >
            <List className="w-5 h-5" />
            {mergedStations.length > 0 ? `${mergedStations.length} Postos` : "Ver Postos"}
            <ChevronDown className={`w-4 h-4 transition-transform ${listOpen ? "rotate-180" : ""}`} />
          </Button>
        </div>

        {/* Bottom Sheet List */}
        {listOpen && (
          <div className="absolute bottom-0 left-0 right-0 z-[9998] bg-zinc-50 rounded-t-2xl shadow-2xl border-t border-zinc-200 flex flex-col"
               style={{ maxHeight: "60dvh" }}>
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-zinc-300 rounded-full" />
            </div>

            {/* Header + Sort */}
            <div className="flex items-center justify-between px-4 py-2">
              <span className="font-bold text-zinc-900 text-base">
                {mergedStations.length} Postos na Área
              </span>
              <div className="flex items-center gap-1">
                <SortAsc className="w-4 h-4 text-zinc-400" />
                <button
                  onClick={() => setSortBy("distance")}
                  className={`text-xs px-2 py-1 rounded-full font-semibold transition-colors ${
                    sortBy === "distance"
                      ? "bg-green-600 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  Distância
                </button>
                <button
                  onClick={() => setSortBy("price")}
                  className={`text-xs px-2 py-1 rounded-full font-semibold transition-colors ${
                    sortBy === "price"
                      ? "bg-green-600 text-white"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                  }`}
                >
                  Menor Preço
                </button>
              </div>
            </div>

            {/* Station Cards */}
            <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-2">
              {sortedList.length === 0 && (
                <p className="text-center text-zinc-400 text-sm py-8">
                  Nenhum posto na área visível. Aproxime o zoom ou navegue pelo mapa.
                </p>
              )}
              {sortedList.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  userLat={userPos?.lat ?? null}
                  userLng={userPos?.lng ?? null}
                  onSelect={() => flyToStation(station)}
                  onReportClick={() => { setSelectedStation(station); setListOpen(false); }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <ReportPriceModal
        station={selectedStation}
        open={!!selectedStation}
        onClose={() => setSelectedStation(null)}
      />
    </>
  );
}
