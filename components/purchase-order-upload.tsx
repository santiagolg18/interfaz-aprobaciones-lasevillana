"use client";

import { useRef, useState, useTransition } from "react";
import { ExternalLink, FileText, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/format";
import {
  deletePurchaseOrder,
  uploadPurchaseOrder,
} from "@/app/(dashboard)/facturas/actions";

const MAX_BYTES = 10 * 1024 * 1024;

export function PurchaseOrderUpload({
  invoiceId,
  poUrl,
  poUploadedAt,
}: {
  invoiceId: string;
  poUrl: string | null;
  poUploadedAt: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Selecciona un PDF");
      return;
    }
    if (file.type !== "application/pdf") {
      setError("El archivo debe ser PDF");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("El archivo supera el límite de 10 MB");
      return;
    }

    startTransition(async () => {
      const res = await uploadPurchaseOrder(invoiceId, formData);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      if (fileRef.current) fileRef.current.value = "";
    });
  }

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deletePurchaseOrder(invoiceId);
      if ("error" in res) setError(res.error);
    });
  }

  return (
    <div className="rounded-lg border bg-white p-4 space-y-3">
      <h2 className="text-sm font-semibold">Orden de compra</h2>

      {poUrl ? (
        <div className="space-y-2">
          <a
            href={poUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium underline-offset-2 hover:underline"
          >
            <FileText className="size-4 text-muted-foreground" />
            Ver OC
            <ExternalLink className="size-3 text-muted-foreground" />
          </a>
          {poUploadedAt ? (
            <p className="text-xs text-muted-foreground">
              Subida el {formatDateTime(poUploadedAt)}
            </p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={pending}
            className="text-rose-700 hover:text-rose-800 -ml-2"
          >
            <Trash2 className="size-4" />
            Eliminar OC
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Aún no se ha subido orden de compra para esta factura.
        </p>
      )}

      <form action={onSubmit} className="space-y-2">
        <Input
          ref={fileRef}
          type="file"
          name="file"
          accept="application/pdf"
          required
          disabled={pending}
        />
        <Button type="submit" size="sm" disabled={pending} className="w-full">
          <Upload className="size-4" />
          {pending ? "Subiendo..." : poUrl ? "Reemplazar OC" : "Subir OC"}
        </Button>
      </form>

      {error ? (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-inset ring-rose-200">
          {error}
        </p>
      ) : null}
      <p className="text-[11px] text-muted-foreground">PDF, máximo 10 MB.</p>
    </div>
  );
}
