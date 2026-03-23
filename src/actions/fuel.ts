"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { FuelType } from "@prisma/client"

export async function getGasStations() {
  return await prisma.gasStation.findMany({
    where: {
      NOT: { lat: null }, // only return stations with coordinates
    },
    include: {
      priceReports: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    },
    take: 200,
  })
}

export async function getRanking() {
  return await prisma.user.findMany({
    orderBy: { score: 'desc' },
    take: 10,
    include: {
      _count: {
        select: { priceReports: true }
      }
    }
  })
}

export async function submitPrice(data: {
  stationName: string,
  fuelType: FuelType,
  price: number,
  lat: number,
  lng: number,
  city?: string,
  state?: string,
  cnpj?: string,
}) {
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { email: `anonimo_${Date.now()}@poupatanque.app`, name: "Usuário Colaborador", score: 0 }
    });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { score: { increment: 50 } }
  });

  // 1. Match by CNPJ (most precise)
  let station = data.cnpj
    ? await prisma.gasStation.findUnique({ where: { cnpj: data.cnpj } })
    : null;

  // 2. Match by name + city
  if (!station && data.city) {
    station = await prisma.gasStation.findFirst({
      where: {
        name: { contains: data.stationName, mode: "insensitive" },
        city: { equals: data.city.toUpperCase(), mode: "insensitive" },
        ...(data.state ? { state: { equals: data.state.toUpperCase(), mode: "insensitive" } } : {}),
      },
    });
  }

  // 3. Match by name only
  if (!station) {
    station = await prisma.gasStation.findFirst({
      where: { name: { contains: data.stationName, mode: "insensitive" } },
    });
  }

  // 4. Create new record
  if (!station) {
    station = await prisma.gasStation.create({
      data: {
        name: data.stationName,
        address: "Endereço via GPS",
        lat: data.lat,
        lng: data.lng,
        city: data.city?.toUpperCase(),
        state: data.state?.toUpperCase(),
        cnpj: data.cnpj ?? null,
      }
    });
  } else if (!station.lat && data.lat) {
    // Fill coordinates for ANP records that had none
    await prisma.gasStation.update({
      where: { id: station.id },
      data: { lat: data.lat, lng: data.lng },
    });
  }

  await prisma.priceReport.create({
    data: {
      price: data.price,
      fuelType: data.fuelType,
      isVerified: false,
      userId: user.id,
      gasStationId: station.id,
    }
  });

  revalidatePath('/');
  revalidatePath('/ranking');
  return { success: true };
}
