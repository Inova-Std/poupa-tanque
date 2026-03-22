import { MapLoader } from "@/components/map-loader";
import { ReportPriceModal } from "@/components/report-price-modal";
import { getGasStations } from "@/actions/fuel";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stations = await getGasStations();

  return (
    <main className="flex h-[100dvh] w-full flex-col bg-zinc-50 relative overflow-hidden">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 w-full z-10 p-4 pointer-events-none mt-2">
        <div className="bg-white/90 backdrop-blur-md shadow-sm rounded-lg p-3 inline-flex items-center gap-2 pointer-events-auto">
          <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
            Poupa Tanque
          </span>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Beta</span>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 w-full bg-zinc-200 relative z-0">
        <MapLoader stations={stations} />
      </div>

      {/* Floating Action Component */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <ReportPriceModal />
      </div>
    </main>
  );
}
