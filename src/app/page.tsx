import { MapLoader } from "@/components/map-loader";
import { getGasStations } from "@/actions/fuel";

export const dynamic = "force-dynamic";

export default async function Home() {
  const stations = await getGasStations();

  return (
    <main className="flex h-[100dvh] w-full bg-zinc-50 overflow-hidden">
      <MapLoader stations={stations} />
    </main>
  );
}
