"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadPurchaseOrder } from "@/app/(dashboard)/facturas/actions";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"];
const ACCEPT_ATTR = ALLOWED_MIME.join(",");

function validate(file: File): string | null {
  if (!ALLOWED_MIME.includes(file.type)) return "El archivo debe ser PDF, JPG o PNG";
  if (file.size > MAX_BYTES) return "El archivo supera el límite de 10 MB";
  return null;
}

export function PoDropzone({
  invoiceId,
  variant = "full",
  onCancel,
  onUploaded,
}: {
  invoiceId: string;
  variant?: "full" | "compact";
  onCancel?: () => void;
  onUploaded?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    const err = validate(file);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setUploadingName(file.name);
    const fd = new FormData();
    fd.append("file", file);
    startTransition(async () => {
      const res = await uploadPurchaseOrder(invoiceId, fd);
      setUploadingName(null);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      onUploaded?.();
    });
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) upload(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  const padding = variant === "full" ? "p-8 sm:p-10" : "p-5";
  const iconSize = variant === "full" ? "size-10" : "size-7";
  const titleSize = variant === "full" ? "text-sm" : "text-[13px]";

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={onDrop}
        className={cn(
          "group relative flex flex-col items-center justify-center text-center",
          "rounded-lg border-2 border-dashed border-border bg-white transition-colors",
          "hover:bg-muted/50 hover:border-neutral-300 cursor-pointer",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          padding,
          dragOver && "border-primary/50 bg-primary/5",
          pending && "pointer-events-none opacity-70",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="sr-only"
          onChange={onChange}
          disabled={pending}
        />

        <div
          className={cn(
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground mb-3",
            variant === "full" ? "size-14" : "size-10",
            dragOver && "bg-primary/10 text-primary",
          )}
        >
          {pending ? (
            <Loader2 className={cn(iconSize, "animate-spin")} />
          ) : (
            <UploadCloud className={iconSize} />
          )}
        </div>

        {pending && uploadingName ? (
          <>
            <p className={cn("font-medium text-neutral-900", titleSize)}>
              Subiendo {uploadingName}…
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Esto puede tardar unos segundos
            </p>
          </>
        ) : (
          <>
            <p className={cn("font-medium text-neutral-900", titleSize)}>
              Arrastra la orden de compra o haz click para seleccionar
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, JPG o PNG · máx 10 MB
            </p>
          </>
        )}

        {onCancel && !pending ? (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="absolute top-2 right-2 text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onCancel();
            }}
          >
            <X className="size-3.5" />
            Cancelar
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
