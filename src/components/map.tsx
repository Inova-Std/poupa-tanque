"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { LocateFixed, Fuel, List, X, SortAsc, Navigation, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import { ReportPriceModal } from "./report-price-modal";

// ── Icons ───────────────────────────────────────────────────────────────────
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

const GreenIcon = L.icon({
  ...DefaultIcon.options,
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  iconRetinaUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
});

// ── Types ────────────────────────────────────────────────────────────────────
interface StationData {
  id?: string;
  name: string;
  lat: number;
  lng: number;
  priceReports?: any[];
  isOsm?: boolean;
}

// ── Utils ────────────────────────────────────────────────────────────────────
function getDistanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fmtDist(m: number) {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}

// ── MapEvents (fire on move) ─────────────────────────────────────────────────
function MapMoveHandler({ onMove }: { onMove: (bounds: L.LatLngBounds) => void }) {
  const map = useMapEvents({ moveend: () => onMove(map.getBounds()) });
  useEffect(() => { onMove(map.getBounds()); }, []);
  return null;
}

// ── Station sidebar card ─────────────────────────────────────────────────────
function StationCard({
  station, userLat, userLng, onFly, onReport,
}: {
  station: StationData;
  userLat: number | null; userLng: number | null;
  onFly: () => void; onReport: () => void;
}) {
  const dist = userLat && userLng ? getDistanceM(userLat, userLng, station.lat, station.lng) : null;
  const report = station.priceReports?.[0];
  return (
    <div className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow">
      <button onClick={onFly} className="text-left">
        <p className="font-semibold text-zinc-900 text-sm leading-tight truncate">{station.name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {dist != null && (
            <span className="text-xs text-zinc-500 flex items-center gap-0.5">
              <Navigation className="w-3 h-3" /> {fmtDist(dist)}
            </span>
          )}
          {report ? (
            <span className="text-xs font-bold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
              {report.fuelType.replace("_", " ")}: R$ {Number(report.price).toFixed(2)}
            </span>
          ) : (
            <span className="text-xs text-zinc-400 italic">sem preço</span>
          )}
        </div>
      </button>
      <Button
        size="sm"
        onClick={onReport}
        className="w-full bg-green-600 hover:bg-green-700 text-white text-xs h-7 rounded-lg"
      >
        + Informar Preço
      </Button>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Map({ stations: dbStations }: { stations: any[] }) {
  const [mapInst, setMapInst] = useState<L.Map | null>(null);
  const [osmStations, setOsmStations] = useState<StationData[]>([]);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [selectedStation, setSelectedStation] = useState<StationData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sortBy, setSortBy] = useState<"distance" | "price">("distance");
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef<Set<string>>(new Set());
  const watchIdRef = useRef<number | null>(null);

  const defaultCenter: [number, number] = [-15.7801, -47.9292];

  // ── Continuous precise GPS watch ──────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setUserPos({ lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy });
      },
      (err) => console.warn("Geolocation error:", err.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // ── Fly to user once map + position are both ready ───────────────────────
  useEffect(() => {
    if (mapInst && userPos) {
      mapInst.flyTo([userPos.lat, userPos.lng], 15, { duration: 1.5 });
    }
  }, [mapInst, userPos?.lat, userPos?.lng]);

  const flyToUser = useCallback(() => {
    if (mapInst && userPos) {
      mapInst.flyTo([userPos.lat, userPos.lng], 16, { duration: 1 });
    }
  }, [mapInst, userPos]);

  // ── Overpass: radius-based query from map centre ──────────────────────────
  const fetchOSM = useCallback(async (bounds: L.LatLngBounds) => {
    const center = bounds.getCenter();
    // radius = half diagonal of the visible bounding box, max 10 km
    const halfDiag = getDistanceM(
      bounds.getSouth(), bounds.getWest(),
      bounds.getNorth(), bounds.getEast()
    ) / 2;
    const radius = Math.min(halfDiag, 10000);

    // Round key to ~1 km precision so only unique areas trigger fetches
    const key = `${(center.lat).toFixed(2)},${(center.lng).toFixed(2)}`;
    if (fetchedRef.current.has(key)) return;
    fetchedRef.current.add(key);

    setLoading(true);
    try {
      const q = [
        "[out:json][timeout:25];",
        `(node["amenity"="fuel"](around:${Math.round(radius)},${center.lat},${center.lng});`,
        ` way["amenity"="fuel"](around:${Math.round(radius)},${center.lat},${center.lng});`,
        `);out center;`
      ].join("");

      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: `data=${encodeURIComponent(q)}`,
      });
      const data = await res.json();

      const nodes: StationData[] = (data.elements || []).map((el: any) => ({
        id: `osm-${el.id}`,
        name: el.tags?.name || el.tags?.brand || "Posto de Combustível",
        lat: el.lat ?? el.center?.lat,
        lng: el.lon ?? el.center?.lon,
        isOsm: true,
      })).filter((s: StationData) => s.lat && s.lng);

      setOsmStations((prev) => {
        const ids = new Set(prev.map((s) => s.id));
        return [...prev, ...nodes.filter((n) => !ids.has(n.id))];
      });
    } catch (e) {
      console.error("OSM fetch failed:", e);
      // retry by removing from cache so it tries again on next move
      fetchedRef.current.delete(key);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Merge DB + OSM (deduplicate within ~60 m) ────────────────────────────
  const mergedStations: StationData[] = [
    ...(dbStations || []),
    ...osmStations.filter(
      (osm) => !(dbStations || []).some(
        (db) => Math.hypot(db.lat - osm.lat, db.lng - osm.lng) < 0.0006
      )
    ),
  ];

  // ── Sort list ─────────────────────────────────────────────────────────────
  const sortedList = [...mergedStations].sort((a, b) => {
    if (sortBy === "distance" && userPos) {
      return (
        getDistanceM(userPos.lat, userPos.lng, a.lat, a.lng) -
        getDistanceM(userPos.lat, userPos.lng, b.lat, b.lng)
      );
    }
    if (sortBy === "price") {
      const pa = a.priceReports?.[0]?.price ?? Infinity;
      const pb = b.priceReports?.[0]?.price ?? Infinity;
      return Number(pa) - Number(pb);
    }
    return 0;
  });

  const flyTo = (s: StationData) => mapInst?.flyTo([s.lat, s.lng], 17, { duration: 1 });

  return (
    <>
      <div className="w-full h-full flex">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div
          className={`flex-none bg-zinc-50 border-r border-zinc-200 flex flex-col transition-all duration-300 overflow-hidden ${
            sidebarOpen ? "w-72" : "w-0"
          }`}
          style={{ minWidth: sidebarOpen ? 288 : 0 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-white">
            <div>
              <p className="font-bold text-zinc-900 text-sm leading-tight">
                {loading ? "Carregando..." : `${mergedStations.length} Postos`}
              </p>
              <p className="text-[11px] text-zinc-400">na área visível</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSortBy("distance")}
                className={`text-[11px] px-2 py-1 rounded-full font-semibold transition-colors ${
                  sortBy === "distance"
                    ? "bg-green-600 text-white"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                Dist.
              </button>
              <button
                onClick={() => setSortBy("price")}
                className={`text-[11px] px-2 py-1 rounded-full font-semibold transition-colors ${
                  sortBy === "price"
                    ? "bg-green-600 text-white"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                Preço
              </button>
            </div>
          </div>

          {/* Cards */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {sortedList.length === 0 && !loading && (
              <p className="text-center text-zinc-400 text-xs py-8">
                Navegue pelo mapa para carregar os postos da área.
              </p>
            )}
            {loading && (
              <p className="text-center text-green-600 text-xs py-4 animate-pulse flex items-center justify-center gap-1">
                <Fuel className="w-3 h-3" /> Buscando postos...
              </p>
            )}
            {sortedList.map((s) => (
              <StationCard
                key={s.id}
                station={s}
                userLat={userPos?.lat ?? null}
                userLng={userPos?.lng ?? null}
                onFly={() => flyTo(s)}
                onReport={() => setSelectedStation(s)}
              />
            ))}
          </div>
        </div>

        {/* ── Map area ────────────────────────────────────────────────────── */}
        <div className="flex-1 relative">
          {/* Sidebar toggle tab */}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="absolute top-1/2 -translate-y-1/2 left-0 z-[9999] bg-white border border-zinc-200 shadow-md rounded-r-xl p-1.5 hover:bg-zinc-50 transition-colors"
            style={{ transform: "translateY(-50%)" }}
          >
            <ChevronRight
              className={`w-4 h-4 text-zinc-500 transition-transform ${sidebarOpen ? "rotate-180" : ""}`}
            />
          </button>

          <MapContainer
            ref={setMapInst as any}
            center={defaultCenter}
            zoom={4}
            className="w-full h-full z-0"
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapMoveHandler onMove={fetchOSM} />

            {/* User location — accuracy ring + precise dot */}
            {userPos && (
              <>
                <Circle
                  center={[userPos.lat, userPos.lng]}
                  radius={userPos.accuracy}
                  pathOptions={{ color: "#3b82f6", fillColor: "#93c5fd", fillOpacity: 0.25, weight: 1 }}
                />
                <CircleMarker
                  center={[userPos.lat, userPos.lng]}
                  radius={8}
                  pathOptions={{ color: "#fff", fillColor: "#2563eb", fillOpacity: 1, weight: 3 }}
                />
              </>
            )}

            {/* Station markers */}
            {mergedStations.map((s) => (
              <Marker key={s.id} position={[s.lat, s.lng]} icon={s.isOsm ? GreenIcon : DefaultIcon}>
                <Popup>
                  <div className="flex flex-col gap-2 min-w-[190px] py-1">
                    <span className="font-bold text-zinc-900 text-sm leading-tight">{s.name}</span>
                    {s.priceReports?.length ? (
                      <div className="bg-green-50 rounded-md p-2 border border-green-100">
                        <span className="text-green-800 text-xs font-bold">
                          {s.priceReports[0].fuelType.replace("_", " ")}: R$ {Number(s.priceReports[0].price).toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-zinc-400 text-xs italic">Sem preços ainda</span>
                    )}
                    <Button
                      size="sm"
                      className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedStation(s); }}
                    >
                      Informar Preço
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* GPS button */}
          <div className="absolute bottom-6 right-4 z-[9999]">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={flyToUser}
              className="shadow-2xl bg-white hover:bg-zinc-100 h-12 w-12 border border-zinc-200 rounded-full"
            >
              <LocateFixed className="w-6 h-6 text-green-600" />
            </Button>
          </div>
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
