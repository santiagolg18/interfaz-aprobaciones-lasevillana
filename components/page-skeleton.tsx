import { Skeleton } from "@/components/ui/skeleton";

// Esqueleto genérico para las páginas de listado del dashboard, mostrado por
// los loading.tsx de cada ruta mientras el servidor arma la página.
export function PageSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Cargando…">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="surface space-y-3 p-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}
