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

export function SupplierFilters() {
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
      params.delete("page");
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `/proveedores?${qs}` : "/proveedores", {
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
    params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/proveedores?${qs}` : "/proveedores", {
        scroll: false,
      });
    });
  }

  const hasAny = ["q", "tipo", "approvers"].some((k) => sp.get(k));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_180px_auto] lg:items-end">
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
            placeholder="NIT, nombre, email, contacto..."
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
        <Label className="text-xs">Tipo</Label>
        <Select
          value={sp.get("tipo") ?? ALL}
          onValueChange={(v) => setParam("tipo", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="P">P — Permanente</SelectItem>
            <SelectItem value="O">O — Ocasional</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Aprobadores</Label>
        <Select
          value={sp.get("approvers") ?? ALL}
          onValueChange={(v) => setParam("approvers", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            <SelectItem value="with">Con aprobadores</SelectItem>
            <SelectItem value="without">Sin aprobadores</SelectItem>
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
                router.replace("/proveedores", { scroll: false }),
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
