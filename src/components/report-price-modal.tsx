"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Camera, Plus } from "lucide-react";

export function ReportPriceModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="rounded-full shadow-lg h-14 px-6 bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-semibold">
          <Plus className="w-5 h-5" />
          Informar Preço
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md w-[95vw] rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Informar Preço</DialogTitle>
          <DialogDescription>
            Ajude a comunidade atualizando o preço de um posto próximo.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4 py-4" onSubmit={(e) => { e.preventDefault(); setOpen(false); }}>
          <div className="space-y-2">
            <Label htmlFor="station">Nome do Posto</Label>
            <Input id="station" placeholder="Ex: Posto BR da Esquina" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fuelType">Combustível</Label>
              <select id="fuelType" className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" required>
                <option value="GASOLINA">Gasolina</option>
                <option value="ETANOL">Etanol</option>
                <option value="DIESEL">Diesel</option>
                <option value="GASOLINA_ADITIVADA">Aditivada</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input id="price" type="number" step="0.01" placeholder="5,99" required />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label>Selo de Preço Verificado (Opcional)</Label>
            <p className="text-xs text-muted-foreground mb-2">Envie uma foto da Nota Fiscal (NFC-e/SAT) para ganhar mais pontos no ranking!</p>
            <div className="border-2 border-dashed border-zinc-200 rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-zinc-50 transition-colors cursor-pointer">
              <div className="bg-indigo-100 p-3 rounded-full">
                <Camera className="w-6 h-6 text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-zinc-900">Anexar foto da Nota Fiscal</span>
              <span className="text-xs text-zinc-500">Toque ou clique para selecionar</span>
            </div>
          </div>

          <div className="pt-4 w-full">
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11">
              Enviar Preço
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
