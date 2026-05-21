import { ExternalLink, FileWarning } from "lucide-react";
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
      {/* Mobile-only prominent open button — iframes for PDFs are unreliable on iOS Safari */}
      <div className="md:hidden border-b bg-white p-3">
        <Button asChild size="lg" className="w-full">
          <a href={src} target="_blank" rel="noreferrer">
            <ExternalLink className="size-4" />
            Abrir {title} en pantalla completa
          </a>
        </Button>
      </div>
      <iframe
        src={src}
        title={title}
        className={cn(
          "w-full flex-1",
          frameClassName ?? "h-[60vh] sm:h-[70vh] lg:h-[78vh]",
        )}
        loading="lazy"
      />
    </div>
  );
}
