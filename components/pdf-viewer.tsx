import { FileWarning } from "lucide-react";

export function PdfViewer({ src, title = "PDF" }: { src: string | null; title?: string }) {
  if (!src) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center rounded-lg border border-dashed bg-muted/40 text-muted-foreground">
        <FileWarning className="mb-2 size-6" />
        <p className="text-sm">No hay PDF disponible</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-neutral-50">
      <iframe
        src={src}
        title={title}
        className="h-[80vh] w-full"
        loading="lazy"
      />
    </div>
  );
}
