"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Pantalla de error del dashboard: mantiene el layout (sidebar) y ofrece
// reintentar en vez del error crudo de Next.
export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
        <AlertCircle className="size-6" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          Algo salió mal
        </h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          Ocurrió un error al cargar esta página. Intenta de nuevo; si el
          problema persiste, avisa al administrador.
        </p>
      </div>
      <Button onClick={reset}>
        <RotateCcw className="size-4" />
        Reintentar
      </Button>
    </div>
  );
}
