"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const ALL = "__all__";

type Supplier = { id: string; nombre: string };

export function InvoiceFilters({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "" || value === ALL) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/facturas?${qs}` : "/facturas", { scroll: false });
    });
  }

  const hasAny = ["status", "supplier_id", "from", "to"].some((k) => sp.get(k));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-1.5">
        <Label className="text-xs">Estado</Label>
        <Select
          value={sp.get("status") ?? ALL}
          onValueChange={(v) => setParam("status", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="approved">Aprobada</SelectItem>
            <SelectItem value="rejected">Rechazada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Proveedor</Label>
        <Select
          value={sp.get("supplier_id") ?? ALL}
          onValueChange={(v) => setParam("supplier_id", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {suppliers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Desde</Label>
        <Input
          type="date"
          defaultValue={sp.get("from") ?? ""}
          onChange={(e) => setParam("from", e.target.value || null)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Hasta</Label>
        <Input
          type="date"
          defaultValue={sp.get("to") ?? ""}
          onChange={(e) => setParam("to", e.target.value || null)}
        />
      </div>

      <div className="flex items-end">
        {hasAny ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={pending}
            onClick={() =>
              startTransition(() => router.replace("/facturas", { scroll: false }))
            }
          >
            <X className="size-4" />
            Limpiar filtros
          </Button>
        ) : null}
      </div>
    </div>
  );
}
