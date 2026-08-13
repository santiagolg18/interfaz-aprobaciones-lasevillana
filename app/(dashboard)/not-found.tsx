import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

// notFound() dentro del dashboard (p. ej. una factura inexistente) cae aquí,
// conservando el sidebar y con una salida clara.
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
        <FileQuestion className="size-6" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">
          No encontramos esta página
        </h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          El registro que buscas no existe o fue eliminado.
        </p>
      </div>
      <Button asChild>
        <Link href="/facturas">Ir a Facturas</Link>
      </Button>
    </div>
  );
}
