"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Camera, Plus } from "lucide-react";
import { submitPrice } from "@/actions/fuel";
import { FuelType } from "@prisma/client";

export function ReportPriceModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const stationName = formData.get("station") as string;
      const fuelType = formData.get("fuelType") as FuelType;
      const price = parseFloat(formData.get("price") as string);
      
      // Request geolocation before submission
      navigator.geolocation.getCurrentPosition(async (pos) => {
        await submitPrice({
          stationName,
          fuelType,
          price,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        });
        setLoading(false);
        setOpen(false);
      }, (err) => {
        // User denied geolocation, we can fallback to default logic or show err
        alert("Foi necessário ativar a localização para relatar um preço.");
        setLoading(false);
      });

    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex outline-none items-center justify-center rounded-full shadow-lg h-14 px-6 bg-green-600 hover:bg-green-700 text-white gap-2 font-semibold whitespace-nowrap">
        <Plus className="w-5 h-5" />
        Informar Preço
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md w-[95vw] rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Informar Preço</DialogTitle>
          <DialogDescription>
            Ajude a comunidade atualizando o preço de um posto próximo usando sua permissão de Localização.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4 py-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="station">Nome do Posto</Label>
            <Input id="station" name="station" placeholder="Ex: Posto da Esquina" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fuelType">Combustível</Label>
              <select id="fuelType" name="fuelType" className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" required>
                <option value="GASOLINA">Gasolina</option>
                <option value="ETANOL">Etanol</option>
                <option value="DIESEL">Diesel</option>
                <option value="GASOLINA_ADITIVADA">Aditivada</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input id="price" name="price" type="number" step="0.01" placeholder="5,99" required />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label>Selo de Preço Verificado (Opcional)</Label>
            <p className="text-xs text-muted-foreground mb-2">Envie uma foto da Nota Fiscal (NFC-e/SAT) para ganhar mais pontos no ranking!</p>
            <div className="border-2 border-dashed border-zinc-200 rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 transition-colors cursor-pointer">
              <div className="bg-green-100 p-3 rounded-full">
                <Camera className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm font-medium text-zinc-900">Anexar foto da Nota Fiscal</span>
            </div>
          </div>

          <div className="pt-4 w-full">
            <Button disabled={loading} type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-11">
              {loading ? "Enviando e Buscando Localização..." : "Enviar Preço"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
