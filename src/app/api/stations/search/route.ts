import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim() ?? "";
  const city = searchParams.get("city")?.trim().toUpperCase() ?? "";
  const state = searchParams.get("state")?.trim().toUpperCase() ?? "";

  if (!q && !city) {
    return NextResponse.json({ stations: [] });
  }

  const stations = await prisma.gasStation.findMany({
    where: {
      AND: [
        q ? { name: { contains: q, mode: "insensitive" } } : {},
        city ? { city: { equals: city, mode: "insensitive" } } : {},
        state ? { state: { equals: state, mode: "insensitive" } } : {},
      ],
    },
    include: {
      priceReports: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    take: 50,
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ stations });
}
