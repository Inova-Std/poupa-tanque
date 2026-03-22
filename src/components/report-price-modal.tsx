"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Camera } from "lucide-react";
import { submitPrice } from "@/actions/fuel";
import { FuelType } from "@prisma/client";

interface StationData {
  id?: string;
  name: string;
  lat: number;
  lng: number;
}

export function ReportPriceModal({ 
  station, 
  open, 
  onClose 
}: { 
  station: StationData | null, 
  open: boolean, 
  onClose: () => void 
}) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!station) return;
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const fuelType = formData.get("fuelType") as FuelType;
      const priceStr = formData.get("price") as string;
      const price = parseFloat(priceStr.replace(',', '.')); // standard safe conversion
      
      await submitPrice({
        stationName: station.name,
        fuelType,
        price,
        lat: station.lat,
        lng: station.lng
      });
      
      setLoading(false);
      onClose();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-xl max-h-[90vh] overflow-y-auto z-[99999]" style={{ zIndex: 99999 }}>
        <DialogHeader>
          <DialogTitle className="text-xl">Informar Preço</DialogTitle>
          <DialogDescription>
            Atualizando: <strong>{station?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4 py-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fuelType">Combustível</Label>
              <select id="fuelType" name="fuelType" className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:cursor-not-allowed disabled:opacity-50" required>
                <option value="GASOLINA">Gasolina</option>
                <option value="ETANOL">Etanol</option>
                <option value="DIESEL">Diesel</option>
                <option value="GASOLINA_ADITIVADA">Aditivada</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input id="price" name="price" type="number" step="0.01" placeholder="5.99" required />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label>Selo de Preço Verificado (Opcional)</Label>
            <div className="border-2 border-dashed border-zinc-200 rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 transition-colors cursor-pointer">
              <div className="bg-green-100 p-3 rounded-full">
                <Camera className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-zinc-900">Anexar foto da Nota Fiscal</span>
            </div>
          </div>

          <div className="pt-4 w-full">
            <Button disabled={loading} type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-11">
              {loading ? "Enviando..." : "Confirmar Preço"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
