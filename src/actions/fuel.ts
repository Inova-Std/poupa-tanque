"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { FuelType } from "@prisma/client"

export async function getGasStations() {
  return await prisma.gasStation.findMany({
    include: {
      priceReports: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
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
}) {
  // Mock authentication logic for MVP - create an anonymous user if none exists
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: { email: `anonimo_${Date.now()}@poupatanque.app`, name: "Usuário Colaborador", score: 0 }
    });
  }

  // Award the user points for their collaboration
  await prisma.user.update({
    where: { id: user.id },
    data: { score: { increment: 50 } } // 50 points per report
  });

  // Find or create the Gas Station
  let station = await prisma.gasStation.findFirst({
    where: { name: data.stationName } // Real system would use geofencing distance
  });

  if (!station) {
    station = await prisma.gasStation.create({
      data: {
        name: data.stationName,
        address: "Endereço Automático do GPS",
        lat: data.lat,
        lng: data.lng,
      }
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
