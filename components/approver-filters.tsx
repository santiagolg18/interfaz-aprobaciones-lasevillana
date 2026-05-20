"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
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

const ALL = "__all__";

export function ApproverFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [q, setQ] = useState(sp.get("q") ?? "");

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams(sp.toString());
      const current = sp.get("q") ?? "";
      if (q === current) return;
      if (q) params.set("q", q);
      else params.delete("q");
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `/aprobadores?${qs}` : "/aprobadores", {
          scroll: false,
        });
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [q, sp, router]);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "" || value === ALL) params.delete(key);
    else params.set(key, value);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/aprobadores?${qs}` : "/aprobadores", {
        scroll: false,
      });
    });
  }

  const hasAny = ["q", "estado", "asignacion"].some((k) => sp.get(k));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_200px_auto] lg:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="q" className="text-xs">
          Buscar
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            id="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nombre o email..."
            className="pl-9"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-neutral-100"
              aria-label="Limpiar búsqueda"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Estado</Label>
        <Select
          value={sp.get("estado") ?? ALL}
          onValueChange={(v) => setParam("estado", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="activos">Activos</SelectItem>
            <SelectItem value="inactivos">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Proveedores asignados</Label>
        <Select
          value={sp.get("asignacion") ?? ALL}
          onValueChange={(v) => setParam("asignacion", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="con">Con proveedores</SelectItem>
            <SelectItem value="sin">Sin proveedores</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end">
        {hasAny ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            disabled={pending}
            onClick={() => {
              setQ("");
              startTransition(() =>
                router.replace("/aprobadores", { scroll: false }),
              );
            }}
          >
            <X className="size-4" />
            Limpiar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
