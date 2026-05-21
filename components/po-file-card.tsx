"use client";

import { useState, useTransition } from "react";
import {
  ExternalLink,
  FileImage,
  FileText,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { deletePurchaseOrder } from "@/app/(dashboard)/facturas/actions";
import { PoDropzone } from "@/components/po-dropzone";

function fileNameFromPath(path: string | null | undefined): string {
  if (!path) return "Orden de compra";
  return decodeURIComponent(path.split("/").pop() ?? "Orden de compra");
}

function isImage(path: string | null | undefined): boolean {
  if (!path) return false;
  return /\.(png|jpe?g)$/i.test(path);
}

export function PoFileCard({
  invoiceId,
  poUrl,
  poStoragePath,
  poUploadedAt,
  canManage,
}: {
  invoiceId: string;
  poUrl: string;
  poStoragePath: string | null;
  poUploadedAt: string | null;
  canManage: boolean;
}) {
  const [replacing, setReplacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fileName = fileNameFromPath(poStoragePath);
  const Icon = isImage(poStoragePath) ? FileImage : FileText;

  function onDelete() {
    if (!confirm("¿Eliminar la orden de compra adjunta?")) return;
    setError(null);
    startTransition(async () => {
      const res = await deletePurchaseOrder(invoiceId);
      if ("error" in res) setError(res.error);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border bg-white p-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-neutral-900 truncate">
            {fileName}
          </div>
          {poUploadedAt ? (
            <div className="text-xs text-muted-foreground mt-0.5">
              Subida el {formatDateTime(poUploadedAt)}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-1 mt-2">
            <Button asChild variant="outline" size="xs">
              <a href={poUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-3" />
                Abrir en nueva pestaña
              </a>
            </Button>
            {canManage ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setReplacing((v) => !v)}
                  disabled={pending}
                >
                  <RefreshCw className="size-3" />
                  Reemplazar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={onDelete}
                  disabled={pending}
                  className="text-rose-700 hover:text-rose-800 hover:bg-rose-50"
                >
                  {pending ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Trash2 className="size-3" />
                  )}
                  Eliminar
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">
          {error}
        </p>
      ) : null}

      {replacing && canManage ? (
        <PoDropzone
          invoiceId={invoiceId}
          variant="compact"
          onCancel={() => setReplacing(false)}
          onUploaded={() => setReplacing(false)}
        />
      ) : null}
    </div>
  );
}
