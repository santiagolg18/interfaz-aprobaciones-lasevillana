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

export function HistoryFilters() {
  const router = useRouter();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(sp.toString());
    if (value === null || value === "" || value === ALL) params.delete(key);
    else params.set(key, value);
    if (params.has("page")) params.delete("page");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/mis-aprobaciones?${qs}` : "/mis-aprobaciones", {
        scroll: false,
      });
    });
  }

  const hasAny =
    sp.get("history_status") || sp.get("history_from") || sp.get("history_to");

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[160px_160px_160px_auto] sm:items-end rounded-lg border border-dashed border-neutral-200 bg-neutral-50/60 p-3">
      <div className="col-span-2 space-y-1.5 sm:col-span-1">
        <Label className="text-xs font-medium text-muted-foreground">
          Decisión
        </Label>
        <Select
          value={sp.get("history_status") ?? ALL}
          onValueChange={(v) => setParam("history_status", v)}
        >
          <SelectTrigger className="h-11 w-full sm:h-9">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas</SelectItem>
            <SelectItem value="approved">Aprobadas</SelectItem>
            <SelectItem value="rejected">Rechazadas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Desde
        </Label>
        <Input
          type="date"
          className="h-11 sm:h-8"
          defaultValue={sp.get("history_from") ?? ""}
          onChange={(e) => setParam("history_from", e.target.value || null)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">
          Hasta
        </Label>
        <Input
          type="date"
          className="h-11 sm:h-8"
          defaultValue={sp.get("history_to") ?? ""}
          onChange={(e) => setParam("history_to", e.target.value || null)}
        />
      </div>

      {hasAny ? (
        <Button
          variant="ghost"
          size="sm"
          className="col-span-2 text-muted-foreground sm:col-span-1"
          onClick={() => {
            const params = new URLSearchParams(sp.toString());
            params.delete("history_status");
            params.delete("history_from");
            params.delete("history_to");
            params.delete("page");
            const qs = params.toString();
            startTransition(() =>
              router.replace(
                qs ? `/mis-aprobaciones?${qs}` : "/mis-aprobaciones",
                { scroll: false },
              ),
            );
          }}
        >
          <X className="size-4" />
          Limpiar
        </Button>
      ) : null}
    </div>
  );
}
