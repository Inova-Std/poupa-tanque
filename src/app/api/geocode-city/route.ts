import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const NOMINATIM = "https://nominatim.openstreetmap.org";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function geocodeAddress(address: string, city: string, state: string): Promise<{ lat: number; lng: number } | null> {
  const q = encodeURIComponent(`${address}, ${city}, ${state}, Brasil`);
  const url = `${NOMINATIM}/search?q=${q}&format=json&limit=1&countrycodes=br`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "PoupaTanque/1.0 (poupatanque.app)" },
    });
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    // silently skip failures
  }
  return null;
}

async function runGeocoding(city: string, state: string, limit: number) {
  const stations = await prisma.gasStation.findMany({
    where: { city: { equals: city, mode: "insensitive" }, state: { equals: state, mode: "insensitive" }, lat: null },
    take: limit,
  });

  for (const station of stations) {
    await sleep(1100); // Nominatim policy: 1 req/sec
    const coords = await geocodeAddress(station.address, city, state);
    if (coords) {
      await prisma.gasStation.update({
        where: { id: station.id },
        data: { lat: coords.lat, lng: coords.lng },
      });
    }
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const city = searchParams.get("city")?.trim().toUpperCase() ?? "";
  const state = searchParams.get("state")?.trim().toUpperCase() ?? "";

  if (!city || !state) {
    return NextResponse.json({ error: "city and state required" }, { status: 400 });
  }

  // Count how many are already geocoded in this city
  const [total, coded] = await Promise.all([
    prisma.gasStation.count({ where: { city: { equals: city, mode: "insensitive" }, state: { equals: state, mode: "insensitive" } } }),
    prisma.gasStation.count({ where: { city: { equals: city, mode: "insensitive" }, state: { equals: state, mode: "insensitive" }, lat: { not: null } } }),
  ]);

  const pending = total - coded;

  // Fire geocoding in background (don't await — respond immediately)
  if (pending > 0) {
    const batchSize = Math.min(pending, 30); // up to 30 per trigger (~33 seconds)
    runGeocoding(city, state, batchSize).catch(() => {});
  }

  return NextResponse.json({ city, state, total, coded, pending });
}
