import { ExternalLink, FileText, FileWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PdfViewer({
  src,
  title = "PDF",
  heading,
  actions,
  className,
  frameClassName,
}: {
  src: string | null;
  title?: string;
  heading?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  frameClassName?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex h-[60vh] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/40 text-muted-foreground",
          className,
        )}
      >
        <FileWarning className="mb-2 size-6" />
        <p className="text-sm">No hay PDF disponible</p>
      </div>
    );
  }

  const hasHeader = Boolean(heading || actions);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-neutral-50",
        className,
      )}
    >
      {hasHeader ? (
        <div className="flex items-center justify-between gap-2 border-b bg-white px-3 py-2">
          <div className="min-w-0 text-sm font-medium text-neutral-900 truncate">
            {heading}
          </div>
          {actions ? (
            <div className="flex items-center gap-1.5 shrink-0">{actions}</div>
          ) : null}
        </div>
      ) : null}
      {/* Mobile: card limpia con botón. Iframes de PDF son inconsistentes en iOS Safari y Chrome móvil. */}
      <div className="md:hidden flex flex-col items-center gap-3 bg-white p-5">
        <div className="flex size-12 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
          <FileText className="size-6" />
        </div>
        <div className="text-center text-sm font-medium text-neutral-900 break-all">
          {title}
        </div>
        <Button asChild size="lg" className="w-full h-12">
          <a href={src} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" />
            Abrir en pantalla completa
          </a>
        </Button>
      </div>
      <iframe
        src={src}
        title={title}
        className={cn(
          "hidden md:block w-full flex-1",
          frameClassName ?? "h-[60vh] sm:h-[70vh] lg:h-[78vh]",
        )}
        loading="lazy"
      />
    </div>
  );
}
